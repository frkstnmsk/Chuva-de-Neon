// =====================================================================
// CHUVA DE NEON — Saúde e Ferimentos
// =====================================================================
// Sistema de feridas persistentes (ver plano-sistema-saude-ferimentos.txt).
// Escopo desta fase: só fichas de JOGADOR (npcs/{id}/feridas fica pra
// depois). Regras puras (dificuldades, perícias aceitas, penalidade de
// item) ficam em regras.js — aqui só a leitura/escrita no Firebase e a
// resolução de cada rolagem de tratamento.
//
// Etapa 1 do plano: só a base (schema + criar/tratar ferida). Ainda SEM
// UI (aba Saúde) e SEM o gatilho automático que cria a ferida na hora
// do golpe — isso entra nas próximas etapas, por cima do que está aqui.
// ---------------------------------------------------------------------

import { db } from "./firebase-config.js";
import { ref, get, set, update, remove, push, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";
import { normalizarFicha } from "./normalizacao.js";
import {
    rolarD20, coletarModificadores, calcularDificuldadeDefesaJogador,
    TRATAMENTOS_FERIDA, feridaAceitaSutura, feridaEstaFechada, modificadorPorSituacaoItem
} from "./regras.js";
import { aplicarDano } from "./mestre.js";

// Nível de uma perícia pelo nome, direto do objeto `pericias` da ficha
// (mesmo helper que já existe, sem exportar, dentro de mestre.js —
// duplicado aqui pra não criar uma dependência circular entre os dois
// módulos de orquestração).
function nivelDaPericia(pericias, nome) {
    const entrada = Object.values(pericias || {}).find(p => p.nome === nome);
    return entrada ? (Number(entrada.nivel) || 0) : 0;
}

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

// Listener em tempo real das feridas de UMA ficha — usado pela aba
// Saúde (quando existir) pra manter a lista sempre atualizada.
export function ouvirFeridas(fichaId, callback) {
    return onValue(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)), (snap) => {
        const valores = snap.exists() ? snap.val() : {};
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

// Leitura única (sem listener) — usada dentro de tratarFerida/testarInfeccaoFerida
// pra pegar o estado atual da ferida antes de decidir o que fazer.
async function obterFerida(fichaId, feridaId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)));
    return snap.exists() ? { id: feridaId, ...snap.val() } : null;
}

// Constituição efetiva (atributo + modificadores estruturados) de uma
// ficha, direto pelo fichaId — versão sem depender de participante de
// combate (diferente de obterConstituicaoParticipante em mestre.js, que
// só funciona com um Gerenciador de Combate ativo). É essa versão que
// o teste de Infecção por ferida usa, já que agora ele roda de dentro
// da aba Saúde, fora de combate.
export async function obterConstituicaoFicha(fichaId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}`)));
    if (!snap.exists()) return 0;
    const ficha = normalizarFicha(snap.val());
    const modificadoresPlanos = coletarModificadores(ficha);
    return calcularDificuldadeDefesaJogador(ficha.dados, "constituicao", modificadoresPlanos, 0);
}

// ---------------------------------------------------------------------
// Criação de ferida
// ---------------------------------------------------------------------

// `estadoInicial` deixa o chamador decidir (o gatilho automático da
// etapa 2 vai passar "aberta" na maioria dos casos, mas fica explícito
// aqui em vez de assumido, já que cada tipo de ferida pode nascer num
// estado diferente no futuro).
export async function criarFerida(fichaId, { tipo, local, origem, estadoInicial = "aberta" }) {
    if (!fichaId || !tipo) throw new Error("criarFerida: fichaId e tipo são obrigatórios.");
    const novaRef = push(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)));
    const ferida = {
        tipo,
        local: local || null,
        origem: origem || "",
        criadaEm: Date.now(),
        estado: estadoInicial,
        infeccaoAtiva: false,
        infeccaoGarantida: false,
        historico: []
    };
    await set(novaRef, ferida);
    return { id: novaRef.key, ...ferida };
}

// Remoção manual de uma ferida (ex: Mestre corrigindo um lançamento
// errado, ou limpando uma ferida totalmente cicatrizada depois de um
// tempo narrativo). Tratamento normal NÃO remove a ferida — só muda o
// estado pra "tratada" (fica no histórico do personagem).
export async function removerFerida(fichaId, feridaId) {
    await remove(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)));
    await sincronizarFlagInfeccaoAgregada(fichaId);
}

// ---------------------------------------------------------------------
// Infecção — agora por ferida, em vez de flag solta na ficha.
// dados.infeccao continua existindo (calcularTempoRecuperacaoPV lê de
// lá), mas passa a ser um espelho AGREGADO: ativo se qualquer ferida
// da ficha tiver infeccaoAtiva true.
// ---------------------------------------------------------------------
export async function sincronizarFlagInfeccaoAgregada(fichaId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)));
    const feridas = snap.exists() ? Object.values(snap.val()) : [];
    const infectadas = feridas.filter(f => f && f.infeccaoAtiva);
    const caminho = caminhoMesa(`fichas/${fichaId}/dados/infeccao`);
    if (!infectadas.length) {
        await remove(ref(db, caminho));
        return;
    }
    const garantida = infectadas.some(f => f.infeccaoGarantida);
    const origens = infectadas.map(f => f.origem).filter(Boolean).join("; ");
    await set(ref(db, caminho), { ativo: true, garantida, origem: origens });
}

// Marca infecção GARANTIDA numa ferida específica, sem rolar teste —
// caso do manual: falha com complicação em Remover Projétil.
async function marcarInfeccaoGarantida(fichaId, feridaId) {
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)), {
        infeccaoAtiva: true,
        infeccaoGarantida: true
    });
    await sincronizarFlagInfeccaoAgregada(fichaId);
}

// Teste de Constituição vs. Infecção, vinculado a UMA ferida (Mestre
// escolhe a dificuldade dentro da faixa do manual — 18 fixa pra
// tratamento malfeito/ambiente sujo, 18-22 pra ferimento profundo/grave
// — ver dificuldadeInfeccao/DIFICULDADE_INFECCAO_MINIMA/MAXIMA em
// regras.js, reaproveitadas aqui do jeito que já eram usadas no modal
// antigo). `modificadorItens` é o mesmo tipo de modificador manual que
// já existia (ex: Soro Fisiológico -2 na dificuldade).
export async function testarInfeccaoFerida(fichaId, feridaId, dificuldade, modificadorItens, origem) {
    const ferida = await obterFerida(fichaId, feridaId);
    if (!ferida) throw new Error("Ferida não encontrada.");
    const constituicaoAlvo = await obterConstituicaoFicha(fichaId);
    const dif = (Number(dificuldade) || 18) - (Number(modificadorItens) || 0);
    const bruto = rolarD20();
    const resultado = bruto + constituicaoAlvo;
    const sucesso = resultado >= dif;
    const detalhe = sucesso
        ? `Teste de Constituição vs. Infecção (dif ${dif}): d20 (${bruto}) ${constituicaoAlvo >= 0 ? "+" : ""}${constituicaoAlvo} = ${resultado} — RESISTIU, não infeccionou.`
        : `Teste de Constituição vs. Infecção (dif ${dif}): d20 (${bruto}) ${constituicaoAlvo >= 0 ? "+" : ""}${constituicaoAlvo} = ${resultado} — FALHOU, o ferimento INFECCIONOU.`;
    if (!sucesso) {
        await marcarInfeccaoGarantida(fichaId, feridaId);
    }
    await registrarHistorico(fichaId, feridaId, { acao: "Testar Infecção", resultado: detalhe });
    return { dificuldade: dif, bruto, modConstituicao: constituicaoAlvo, resultado, sucesso, detalhe };
}

// ---------------------------------------------------------------------
// Histórico (registro simples por ferida, mostrado na aba Saúde)
// ---------------------------------------------------------------------
async function registrarHistorico(fichaId, feridaId, { acao, quem, resultado }) {
    const historicoRef = push(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}/historico`)));
    await set(historicoRef, { acao, quem: quem || "", resultado, data: Date.now() });
}

// ---------------------------------------------------------------------
// Tratamento — função genérica que cobre as 5 ações (Estancar
// Sangramento / Remover Projétil / Suturar Ferimento / Tratar Fratura /
// Tratar Queimadura). Cada uma tem sua config (perícias aceitas, faixa
// de dificuldade, o que o sucesso faz com o estado) em
// TRATAMENTOS_FERIDA (regras.js).
//
// `tratadorPericias` = objeto `pericias` de quem está tratando (pode
// ser a própria ficha ou a de outro jogador — a etapa 4 do plano é que
// vai montar essa chamada a partir do modal "Tratar outro jogador";
// por enquanto a função só recebe o que precisa pra rolar e aplicar,
// sem se importar de onde veio).
// `situacaoItem`: "adequado" | "improvisado" | "nenhum" (penalidade 0/-1/-2
// — ver PENALIDADE_ITEM_TRATAMENTO em regras.js).
// `dificuldadeEscolhida`: valor dentro da faixa do manual pra essa ação,
// escolhido por quem está tratando conforme a gravidade narrativa.
// `modificadorExtra`: bônus manual do item específico usado (ex: Kit de
// Sutura nível 3 = +2), preenchido à mão por quem está tratando.
// ---------------------------------------------------------------------
export async function tratarFerida(fichaId, feridaId, {
    acao, tratadorPericias, tratadorNome, situacaoItem = "nenhum",
    dificuldadeEscolhida, modificadorExtra = 0
}) {
    const config = TRATAMENTOS_FERIDA[acao];
    if (!config) throw new Error(`Ação de tratamento desconhecida: ${acao}`);

    const ferida = await obterFerida(fichaId, feridaId);
    if (!ferida) throw new Error("Ferida não encontrada.");
    if (!config.tiposFerida.includes(ferida.tipo)) {
        throw new Error(`${config.label} não se aplica a uma ferida do tipo "${ferida.tipo}".`);
    }
    if (acao === "suturar_ferimento" && !feridaAceitaSutura(ferida)) {
        throw new Error("Esse ferimento ainda não pode ser suturado (projétil precisa ser removido antes).");
    }

    // Maior nível entre as perícias aceitas pra essa ação (ex: Suturar
    // aceita Primeiros Socorros OU Medicina — usa a maior das duas que
    // o tratador tiver).
    const nivelPericia = Math.max(0, ...config.pericias.map(p => nivelDaPericia(tratadorPericias, p)));

    const penalidadeItem = modificadorPorSituacaoItem(situacaoItem);
    const dificuldade = Math.min(config.dificuldadeMax, Math.max(config.dificuldadeMin,
        Number(dificuldadeEscolhida) || config.dificuldadeMin));

    const bruto = rolarD20();
    const totalModificador = nivelPericia + penalidadeItem + (Number(modificadorExtra) || 0);
    const resultado = bruto + totalModificador;
    const sucesso = resultado >= dificuldade;
    // "Falha com complicação" (manual): o d20 BRUTO saiu 1-3, não o
    // resultado total — mesma leitura usada pro resto do sistema.
    const complicacao = !sucesso && bruto <= 3;

    const atualizacoesFerida = {};
    let danoExtra = null;
    let detalheExtra = "";

    if (sucesso) {
        atualizacoesFerida.estado = config.efeitoSucesso;
    } else if (complicacao) {
        // Cada ação tem sua própria complicação (manual):
        if (acao === "estancar_sangramento") {
            const dano = 10 + Math.floor(Math.random() * 21); // 10-30
            danoExtra = await aplicarDano("ficha", fichaId, dano, null);
            detalheExtra = ` O ferimento piorou: ${dano} de dano adicional.`;
        } else if (acao === "remover_projetil") {
            const dano = 20 + Math.floor(Math.random() * 21); // 20-40
            danoExtra = await aplicarDano("ficha", fichaId, dano, null);
            atualizacoesFerida.infeccaoAtiva = true;
            atualizacoesFerida.infeccaoGarantida = true;
            detalheExtra = ` O projétil permanece alojado e causou ${dano} de dano adicional — infecção garantida.`;
        }
    }

    const detalhe = `${config.label} (dif ${dificuldade}): d20 (${bruto}) + ${nivelPericia} perícia `
        + `${penalidadeItem ? `${penalidadeItem} item ` : ""}${modificadorExtra ? `+${modificadorExtra} item específico ` : ""}`
        + `= ${resultado} — ${sucesso ? "SUCESSO" : (complicacao ? "FALHOU COM COMPLICAÇÃO" : "FALHOU")}.${detalheExtra}`;

    if (Object.keys(atualizacoesFerida).length) {
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)), atualizacoesFerida);
    }
    await registrarHistorico(fichaId, feridaId, { acao: config.label, quem: tratadorNome, resultado: detalhe });
    if (atualizacoesFerida.infeccaoAtiva) {
        await sincronizarFlagInfeccaoAgregada(fichaId);
    }

    return {
        acao, dificuldade, bruto, nivelPericia, penalidadeItem, modificadorExtra,
        resultado, sucesso, complicacao, danoExtra, detalhe,
        novoEstado: atualizacoesFerida.estado || ferida.estado
    };
}

// ---------------------------------------------------------------------
// Recuperação de PV — trava por ferida aberta (usada pelo painel de
// Recursos Vitais em ficha.js). Retorna true só se TODAS as feridas da
// ficha estiverem "tratada" (ou não houver nenhuma).
// ---------------------------------------------------------------------
export async function todasFeridasFechadas(fichaId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)));
    if (!snap.exists()) return true;
    return Object.values(snap.val()).every(feridaEstaFechada);
}
