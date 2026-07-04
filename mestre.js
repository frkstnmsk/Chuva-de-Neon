// =====================================================================
// CHUVA DE NEON — Painel exclusivo do Mestre
// =====================================================================
// Tudo que só o Mestre pode fazer: dar XP, ativar godmode (ignora a
// trava de edição), rolar dado, causar dano, gerenciar NPCs, avançar o
// dia (com a regra de Domingo) e confirmar avanço de treinamento.

import { db } from "./firebase-config.js";
import { ref, set, get, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { rolarD20, rolarDado, calcularDerivados, coletarModificadores } from "./regras.js";
import { registrarRolagem, passarUmDia, dispararAvisoCustoVida } from "./calendario.js";
import { avancarUmDiaTreinamento } from "./treinamento.js";
import { calcularSecundariosNpc } from "./npc-detalhado.js";
import { normalizarFicha } from "./normalizacao.js";

// ---------------------------------------------------------------------
// Padrão de vida — valores semanais fixos do manual (pg. 105-106).
// ---------------------------------------------------------------------
export const PADROES_DE_VIDA = [
    { key: "miseravel", label: "Miserável", custoSemanal: 100 },
    { key: "pobre", label: "Pobre", custoSemanal: 200 },
    { key: "tranquilo", label: "Tranquilo", custoSemanal: 400 },
    { key: "playboy", label: "Playboy", custoSemanal: 1000 },
    { key: "rico", label: "Rico", custoSemanal: 2000 }
];

export function custoSemanalPadraoDeVida(key) {
    const p = PADROES_DE_VIDA.find(p => p.key === key);
    return p ? p.custoSemanal : 0;
}

export function custoSemanalTotal(fichaAtual) {
    const base = custoSemanalPadraoDeVida(fichaAtual.dados.padraoDeVida);
    const extras = Object.values(fichaAtual.gastosExtras || {}).reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
    return base + extras;
}

// ---------------------------------------------------------------------
// Lista de fichas ativas (dashboard do Mestre).
// ---------------------------------------------------------------------
export function ouvirTodasAsFichas(callback) {
    return onValue(ref(db, "fichas"), (snap) => {
        callback(snap.exists() ? snap.val() : {});
    });
}

// ---------------------------------------------------------------------
// Dar XP
// ---------------------------------------------------------------------
export async function darXp(fichaId, quantidade) {
    const snap = await get(ref(db, `fichas/${fichaId}/dados/xp`));
    const xpAtual = snap.exists() ? Number(snap.val()) : 0;
    await update(ref(db, `fichas/${fichaId}/dados`), { xp: xpAtual + Number(quantidade) });
}

// ---------------------------------------------------------------------
// Godmode — toggle global. Quando ativo, a trava de edição (atributos/
// perícias só na criação/levelup/treino) é ignorada pro Mestre em
// QUALQUER ficha que ele esteja olhando.
// ---------------------------------------------------------------------
export function ouvirGodmode(callback) {
    return onValue(ref(db, "godmode"), (snap) => callback(snap.exists() ? !!snap.val() : false));
}

export async function definirGodmode(ativo) {
    await set(ref(db, "godmode"), !!ativo);
}

// ---------------------------------------------------------------------
// Rolar dado (Mestre) — vai direto pro Log de Dados.
// ---------------------------------------------------------------------
export async function mestreRolarDado({ faces = 20, modificador = 0, quem = "Mestre", detalhe = "" }) {
    const bruto = rolarDado(faces);
    const resultado = bruto + Number(modificador || 0);
    await registrarRolagem({ quem, modificador, resultado, detalhe: detalhe || `d${faces}: ${bruto}${modificador ? (modificador >= 0 ? "+" : "") + modificador : ""}` });
    return { bruto, resultado };
}

// ---------------------------------------------------------------------
// Causar dano — resolve dano contra jogador ou NPC, já descontando a
// redução de armadura equipada (colete/placa com reducoesDano casando
// com o tipo de dano recebido — manual pg. 52-53). Retorna o resumo
// completo pro Mestre/automação montarem a mensagem do Log de Dados.
// ---------------------------------------------------------------------
export async function aplicarDano(alvoTipo, alvoId, danoBruto, tipoDanoKey) {
    const brutoNum = Number(danoBruto) || 0;

    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, `fichas/${alvoId}`));
        if (!snap.exists()) throw new Error("Ficha do alvo não encontrada.");
        const raw = snap.val();
        const nomeAlvo = (raw.config && raw.config.nomeExibicao) || alvoId;
        const pvAtual = (raw.dados && raw.dados.pvAtual !== null && raw.dados.pvAtual !== undefined) ? Number(raw.dados.pvAtual) : 0;
        const inventario = raw.inventario || {};
        const reducao = tipoDanoKey ? Object.values(inventario)
            .filter(it => it.categoria === "levando" && Array.isArray(it.reducoesDano))
            .reduce((acc, it) => {
                const entrada = it.reducoesDano.find(r => r.tipo === tipoDanoKey);
                return acc + (entrada ? Number(entrada.valor) || 0 : 0);
            }, 0) : 0;
        const danoFinal = Math.max(0, brutoNum - reducao);
        const novoPv = pvAtual - danoFinal;
        await update(ref(db, `fichas/${alvoId}/dados`), { pvAtual: novoPv });
        return { nomeAlvo, danoBruto: brutoNum, reducao, danoFinal, novoPv };
    }

    const snap = await get(ref(db, `npcs/${alvoId}`));
    if (!snap.exists()) throw new Error("NPC alvo não encontrado.");
    const npc = snap.val();
    const nomeAlvo = npc.nome || "NPC";
    const pvAtual = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : 0;
    // NPCs usam um modelo de proteção simplificado (1 tipo + 1 valor, em
    // vez do array multi-tipo dos itens de jogador) pra manter o gerador
    // rápido de NPC realmente rápido.
    const reducao = (tipoDanoKey && npc.protecaoTipo === tipoDanoKey) ? (Number(npc.protecaoValor) || 0) : 0;
    const danoFinal = Math.max(0, brutoNum - reducao);
    const novoPv = pvAtual - danoFinal;
    await update(ref(db, `npcs/${alvoId}`), { pvAtual: novoPv });
    return { nomeAlvo, danoBruto: brutoNum, reducao, danoFinal, novoPv };
}

// Mantidas por compatibilidade com qualquer chamada antiga — agora só
// delegam pra aplicarDano() sem tipo de dano (ou seja, sem redução).
export async function causarDanoJogador(fichaId, valor) {
    return aplicarDano("ficha", fichaId, valor, null);
}

export async function causarDanoNpc(npcId, valor) {
    return aplicarDano("npc", npcId, valor, null);
}

// ---------------------------------------------------------------------
// NPCs — gerador rápido de ficha de combate.
// ---------------------------------------------------------------------
export function ouvirNpcs(callback) {
    return onValue(ref(db, "npcs"), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

// Retorna o id do NPC recém-criado (usado pelo Gerenciador de Combate
// pra já entrar direto na lista de participantes, sem passo extra).
export async function criarNpc({ nome, pvs, periciasResumo, itensEssenciais, atributos, atributosSecundarios, agilidade, constituicao, protecaoTipo, protecaoValor }) {
    const novaRef = push(ref(db, "npcs"));
    await set(novaRef, {
        nome: nome || "NPC sem nome",
        pvs: Number(pvs) || 0,
        pvAtual: Number(pvs) || 0,
        periciasResumo: periciasResumo || "",
        itensEssenciais: itensEssenciais || "",
        atributos: atributos || "",
        atributosSecundarios: atributosSecundarios || "",
        // Campos numéricos usados pelo Gerenciador de Combate pra calcular
        // dificuldade defensiva (10 + Agilidade/Constituição) e redução de
        // dano automaticamente — separados dos campos de texto livre acima,
        // que continuam só pra referência do Mestre.
        agilidade: Number(agilidade) || 0,
        constituicao: Number(constituicao) || 0,
        protecaoTipo: protecaoTipo || null,
        protecaoValor: Number(protecaoValor) || 0,
        criadoEm: Date.now()
    });
    return novaRef.key;
}

export async function excluirNpc(npcId) {
    await remove(ref(db, `npcs/${npcId}`));
}

// ---------------------------------------------------------------------
// NPCs — Mini-Ficha Detalhada (Módulo 2). Sem pontos iniciais fixos e
// sem restrição de Função/Desvantagens: o Mestre digita os atributos
// primários livremente e o sistema calcula os secundários (ver
// npc-detalhado.js), com opção de sobrescrever qualquer um na mão.
// Reaproveita o mesmo nó `npcs/{id}` do gerador rápido — os dois
// convivem na mesma lista, diferenciados pelo campo `modoDetalhado`.
// ---------------------------------------------------------------------
export async function criarNpcDetalhado({ nome, npcDetalhado, protecaoTipo, protecaoValor }) {
    const secundarios = secundariosDoNpc(npcDetalhado);
    const novaRef = push(ref(db, "npcs"));
    await set(novaRef, {
        nome: nome || "NPC sem nome",
        pvs: secundarios.recursos.pv.valor,
        pvAtual: secundarios.recursos.pv.valor,
        periciasResumo: resumoPericiasNpc(npcDetalhado),
        itensEssenciais: "",
        atributos: resumoAtributosPrimariosNpc(npcDetalhado),
        atributosSecundarios: resumoSecundariosNpc(secundarios),
        agilidade: secundarios.secundarios.agilidade.valor,
        constituicao: Number(npcDetalhado.atributosPrimarios?.constituicao) || 0,
        protecaoTipo: protecaoTipo || null,
        protecaoValor: Number(protecaoValor) || 0,
        criadoEm: Date.now(),
        modoDetalhado: true,
        vulgo: npcDetalhado.vulgo || "",
        idade: npcDetalhado.idade || "",
        funcaoNarrativa: npcDetalhado.funcaoNarrativa || "",
        atributosPrimarios: npcDetalhado.atributosPrimarios,
        secundariosOverride: npcDetalhado.secundariosOverride,
        periciasNpc: npcDetalhado.periciasNpc || {}
    });
    return novaRef.key;
}

export async function atualizarNpcDetalhado(npcId, { nome, npcDetalhado, protecaoTipo, protecaoValor, pvAtual }) {
    const secundarios = secundariosDoNpc(npcDetalhado);
    await update(ref(db, `npcs/${npcId}`), {
        nome: nome || "NPC sem nome",
        pvs: secundarios.recursos.pv.valor,
        pvAtual: pvAtual !== undefined && pvAtual !== null ? Number(pvAtual) : secundarios.recursos.pv.valor,
        periciasResumo: resumoPericiasNpc(npcDetalhado),
        atributos: resumoAtributosPrimariosNpc(npcDetalhado),
        atributosSecundarios: resumoSecundariosNpc(secundarios),
        agilidade: secundarios.secundarios.agilidade.valor,
        constituicao: Number(npcDetalhado.atributosPrimarios?.constituicao) || 0,
        protecaoTipo: protecaoTipo || null,
        protecaoValor: Number(protecaoValor) || 0,
        modoDetalhado: true,
        vulgo: npcDetalhado.vulgo || "",
        idade: npcDetalhado.idade || "",
        funcaoNarrativa: npcDetalhado.funcaoNarrativa || "",
        atributosPrimarios: npcDetalhado.atributosPrimarios,
        secundariosOverride: npcDetalhado.secundariosOverride,
        periciasNpc: npcDetalhado.periciasNpc || {}
    });
}

function secundariosDoNpc(npcDetalhado) {
    return calcularSecundariosNpc(npcDetalhado.atributosPrimarios, npcDetalhado.secundariosOverride);
}

function resumoPericiasNpc(npcDetalhado) {
    const pericias = Object.values(npcDetalhado.periciasNpc || {});
    if (!pericias.length) return "";
    return pericias.map(p => `${p.nome} ${p.nivel}`).join(", ");
}

function resumoAtributosPrimariosNpc(npcDetalhado) {
    const ap = npcDetalhado.atributosPrimarios || {};
    const rotulos = { forca: "For", constituicao: "Con", destreza: "Des", sabedoria: "Sab", inteligencia: "Int", raciocinio: "Rac", carisma: "Car", manipulacao: "Man" };
    return Object.entries(rotulos).map(([k, r]) => `${r} ${ap[k] || 0}`).join(", ");
}

function resumoSecundariosNpc(secundarios) {
    const partes = [
        ...Object.values(secundarios.secundarios).map(s => `${s.label} ${s.valor}`),
        ...Object.values(secundarios.recursos).map(r => `${r.label} ${r.valor}`)
    ];
    return partes.join(", ");
}

// ---------------------------------------------------------------------
// Gerenciador de Combate — lista compartilhada de participantes ativos
// (jogadores e/ou NPCs), usada pra alimentar o seletor de alvo no botão
// "Usar" das armas na ficha do jogador.
// ---------------------------------------------------------------------
export function ouvirCombateAtivo(callback) {
    return onValue(ref(db, "combateAtivo"), (snap) => {
        callback(snap.exists() ? snap.val() : { ativo: false, participantes: {} });
    });
}

export async function adicionarParticipanteCombate({ tipo, refId, nome }) {
    await update(ref(db, "combateAtivo"), { ativo: true });
    const novaRef = push(ref(db, "combateAtivo/participantes"));
    await set(novaRef, { tipo, refId, nome: nome || refId });
    return novaRef.key;
}

export async function removerParticipanteCombate(participanteId) {
    await remove(ref(db, `combateAtivo/participantes/${participanteId}`));
}

export async function encerrarCombate() {
    await set(ref(db, "combateAtivo"), { ativo: false, participantes: {} });
}

// ---------------------------------------------------------------------
// Iniciativa / ordem de turnos (manual: 1d20 + Agilidade decide a ordem;
// 1 ação por turno + 1 ação extra a cada 5 pontos de Velocidade Total).
//
// Reaproveita a MESMA lista de participantes do Gerenciador de Combate
// acima (combateAtivo/participantes) — não cria uma fila separada.
// Ao "Iniciar Combate", cada participante ganha: iniciativa (rolagem +
// Agilidade), velocidade total, PV atual/máximo e ações do turno. Esses
// campos ficam gravados dentro do próprio nó `combateAtivo`, junto com
// `rodada`, `ordemTurnos` (array de ids na ordem de agir) e `turnoAtual`.
// ---------------------------------------------------------------------

// Regra de ações extras: 1 ação base + 1 a cada 5 pontos de Velocidade
// Total (modificadores negativos não geram ações extras, mas também não
// derrubam abaixo da ação base).
export function calcularAcoesMax(velocidadeTotal) {
    const v = Math.max(Number(velocidadeTotal) || 0, 0);
    return 1 + Math.floor(v / 5);
}

// Busca Agilidade, Velocidade e PV (atual/máximo) de um participante já
// existente em combateAtivo/participantes — seja ele ficha de jogador ou
// NPC (detalhado ou "rápido"). Usa as MESMAS fórmulas de regras.js que o
// resto da ficha usa, já com modificadores estruturados aplicados.
async function calcularStatsCombateParticipante(participante) {
    if (participante.tipo === "ficha") {
        const snap = await get(ref(db, `fichas/${participante.refId}`));
        if (!snap.exists()) return statsCombatePadrao();
        const ficha = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(ficha);
        const derivados = calcularDerivados(ficha.dados, modificadoresPlanos);
        const pvMax = Math.round(derivados.recursos.pv.total);
        const pvAtual = (ficha.dados.pvAtual !== null && ficha.dados.pvAtual !== undefined)
            ? Number(ficha.dados.pvAtual) : pvMax;
        return {
            modAgilidade: Math.round(derivados.secundarios.agilidade.total),
            velocidade: Math.round(derivados.secundarios.velocidade.total),
            pv: pvAtual,
            pvMax
        };
    }

    // NPC
    const snap = await get(ref(db, `npcs/${participante.refId}`));
    if (!snap.exists()) return statsCombatePadrao();
    const npc = snap.val();

    if (npc.modoDetalhado) {
        const secundarios = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride);
        return {
            modAgilidade: Math.round(secundarios.secundarios.agilidade.valor),
            velocidade: Math.round(secundarios.secundarios.velocidade.valor),
            pv: (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : secundarios.recursos.pv.valor,
            pvMax: secundarios.recursos.pv.valor
        };
    }

    // NPC "rápido" (gerador simples) só guarda Agilidade solta, sem
    // Velocidade separada — usamos a própria Agilidade como Velocidade
    // Total pra fins de ações extras. Pra um cálculo fiel de Velocidade
    // ((Destreza+Constituição)/2), cadastre o NPC no modo detalhado.
    return {
        modAgilidade: Number(npc.agilidade) || 0,
        velocidade: Number(npc.agilidade) || 0,
        pv: (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : (Number(npc.pvs) || 0),
        pvMax: Number(npc.pvs) || 0
    };
}

function statsCombatePadrao() {
    return { modAgilidade: 0, velocidade: 0, pv: 0, pvMax: 0 };
}

// Ordena por iniciativa decrescente; empate é decidido pelo maior
// modificador de Agilidade (regra caseira, igual à usada na dificuldade
// defensiva de combate.js do módulo de regras).
function ordenarPorIniciativa(participantes) {
    return Object.keys(participantes).sort((a, b) => {
        const A = participantes[a], B = participantes[b];
        if (B.iniciativa !== A.iniciativa) return B.iniciativa - A.iniciativa;
        return (B.modAgilidade ?? 0) - (A.modAgilidade ?? 0);
    });
}

// Inicia o combate: rola 1d20 + Agilidade pra cada participante já
// cadastrado em combateAtivo/participantes, calcula ações do turno e
// grava a ordem de iniciativa. Chamar DEPOIS de montar a lista de
// participantes pelo painel existente (adicionarParticipanteCombate).
export async function iniciarIniciativaCombate() {
    const snap = await get(ref(db, "combateAtivo/participantes"));
    const participantesBase = snap.exists() ? snap.val() : {};
    const ids = Object.keys(participantesBase);
    if (!ids.length) {
        throw new Error("Adicione ao menos um participante antes de iniciar o combate.");
    }

    const participantesAtualizados = {};
    for (const id of ids) {
        const base = participantesBase[id];
        const stats = await calcularStatsCombateParticipante(base);
        const rolagemBruta = rolarD20();
        const acoesMax = calcularAcoesMax(stats.velocidade);
        participantesAtualizados[id] = {
            ...base,
            ...stats,
            rolagemBruta,
            iniciativa: rolagemBruta + stats.modAgilidade,
            acoesMax,
            acoes: acoesMax,
            // Ação de Esquiva/Bloqueio guardada (manual pg. ~48): só fica
            // disponível DEPOIS que o personagem já teve seu próprio
            // turno na rodada. Por isso começa falsa pra todo mundo — se
            // alguém agir antes de você na primeira rodada, você ainda
            // não tem a ação carregada e não pode esquivar/bloquear.
            esquivaDisponivel: false
        };
    }

    const ordemTurnos = ordenarPorIniciativa(participantesAtualizados);

    await update(ref(db, "combateAtivo"), {
        ativo: true,
        rodada: 1,
        ordemTurnos,
        turnoAtual: ordemTurnos[0],
        participantes: participantesAtualizados
    });

    return { ordemTurnos, participantes: participantesAtualizados };
}

// Passa a vez pro próximo participante na ordem de iniciativa. Ao voltar
// ao início da ordem, inicia uma nova rodada e restaura as ações de
// todo mundo pro respectivo máximo.
export async function avancarTurnoCombate() {
    const snap = await get(ref(db, "combateAtivo"));
    const estado = snap.val();

    if (!estado?.ativo || !estado.ordemTurnos?.length) {
        throw new Error("Não há combate com iniciativa em andamento.");
    }

    const { ordemTurnos, turnoAtual, participantes, rodada } = estado;
    const indiceAtual = ordemTurnos.indexOf(turnoAtual);
    const proximoIndice = (indiceAtual + 1) % ordemTurnos.length;
    const novoTurno = ordemTurnos[proximoIndice];

    const atualizacoes = { turnoAtual: novoTurno };

    // Quem estava agindo agora "guarda" a ação de Esquiva/Bloqueio pro
    // próximo golpe que receber, até usá-la (ver usarEsquivaBloqueio) ou
    // até guardar de novo no próximo turno dele.
    if (participantes[turnoAtual]) {
        atualizacoes[`participantes/${turnoAtual}/esquivaDisponivel`] = true;
    }

    if (proximoIndice === 0) {
        atualizacoes.rodada = (rodada || 1) + 1;
        for (const id of ordemTurnos) {
            if (participantes[id]) {
                atualizacoes[`participantes/${id}/acoes`] = participantes[id].acoesMax;
            }
        }
    }

    await update(ref(db, "combateAtivo"), atualizacoes);
    return { turnoAtual: novoTurno, nome: (participantes[novoTurno] && participantes[novoTurno].nome) || novoTurno };
}

// Consome 1 ação do turno do participante (chamar isso na hora de uma
// rolagem/ataque durante o combate ativo). Nunca deixa negativo.
export async function consumirAcaoCombate(participanteId) {
    const caminho = ref(db, `combateAtivo/participantes/${participanteId}/acoes`);
    const snap = await get(caminho);
    const atual = snap.exists() ? Number(snap.val()) : 0;
    const novo = Math.max(0, atual - 1);
    await set(caminho, novo);
    return novo;
}

// Usa a ação de Esquiva/Bloqueio guardada do alvo pra anular um golpe
// recebido (manual: "no seu turno, você tem uma ação de bloqueio/esquiva
// que fica guardada para quando receber um golpe"). Só funciona se ela
// estiver disponível (ou seja, o alvo já teve seu turno nesta rodada e
// ainda não gastou a ação em outro golpe). Retorna true se conseguiu
// consumir (golpe anulado) ou false se o alvo não tinha a ação guardada.
export async function usarEsquivaBloqueio(participanteId) {
    const caminho = ref(db, `combateAtivo/participantes/${participanteId}/esquivaDisponivel`);
    const snap = await get(caminho);
    const disponivel = snap.exists() ? !!snap.val() : false;
    if (!disponivel) return false;
    await set(caminho, false);
    return true;
}

// ---------------------------------------------------------------------
// Reação pendente (Esquiva/Bloqueio) — quem escolhe é quem RECEBE o
// golpe, não quem ataca. Como os dois jogadores estão em telas/sessões
// diferentes, a escolha não pode ser um prompt() síncrono na tela de
// quem atacou (aquilo fazia o ATACANTE responder no lugar do alvo).
// Em vez disso: o ataque, ao acertar um alvo com esquivaDisponivel,
// grava aqui tudo que falta pra fechar o golpe (dano já calculado, sem
// aplicar ainda) — visível em tempo real pra todo mundo via
// ouvirCombateAtivo(). A UI do jogador-alvo (ou do Mestre, se o alvo
// for NPC) mostra um modal com as opções assim que detectar que
// `participanteId` bate com ele, e chama responderReacaoPendente().
// ---------------------------------------------------------------------
export async function abrirReacaoPendente(dados) {
    await set(ref(db, "combateAtivo/reacaoPendente"), { ...dados, timestamp: Date.now() });
}

// escolha: "esquivar" | "bloquear" | "nenhuma".
// "esquivar" anula o golpe (dano 0). "bloquear" reduz o dano pela
// metade, exceto se o tipo de dano for perfurante (comum ou especial),
// que ignora bloqueio. As duas consomem a ação de Esquiva/Bloqueio
// guardada. "nenhuma" (ou a ação já ter sido gasta antes de responder)
// deixa passar o golpe cheio e NÃO consome a ação guardada.
export async function responderReacaoPendente(escolha) {
    const snap = await get(ref(db, "combateAtivo/reacaoPendente"));
    if (!snap.exists()) return null;
    const r = snap.val();

    let consumiu = false;
    if (escolha === "esquivar" || escolha === "bloquear") {
        consumiu = await usarEsquivaBloqueio(r.participanteId);
    }

    let danoParaAplicar = r.danoTotal;
    let notaEscolha;
    if (escolha === "esquivar" && consumiu) {
        danoParaAplicar = 0;
        notaEscolha = `${r.nomeAlvo} usou a ação guardada pra ESQUIVAR e ANULOU o golpe.`;
    } else if (escolha === "bloquear" && consumiu) {
        if (r.tipoDanoKey === "perfuracao_comum" || r.tipoDanoKey === "perfuracao_especial") {
            notaEscolha = `${r.nomeAlvo} tentou BLOQUEAR, mas dano perfurante não é reduzido por bloqueio. Ação guardada consumida mesmo assim.`;
        } else {
            danoParaAplicar = Math.floor(danoParaAplicar / 2);
            notaEscolha = `${r.nomeAlvo} usou a ação guardada pra BLOQUEAR e reduziu o dano pela metade.`;
        }
    } else {
        notaEscolha = `${r.nomeAlvo} não usou Esquiva/Bloqueio e recebeu o golpe cheio.`;
    }

    const resultadoDano = await aplicarDano(r.alvoTipo, r.alvoRefId, danoParaAplicar, r.tipoDanoKey);

    const efeitoTexto = r.efeitoTexto || "";
    const danoDadoTexto = r.danoDadoTexto || "";
    const detalheDano = resultadoDano.reducao > 0
        ? `${r.nomeAtacante} atacou ${r.nomeAlvo} com ${r.nomeArma}. ACERTO! (${r.resultadoAtaque} vs. dificuldade ${r.dificuldade}${r.recuoTexto || ""}${r.precisaoTexto || ""}) ${notaEscolha} Dano${danoDadoTexto}: ${resultadoDano.danoBruto} (${r.tipoDanoLabel}) - ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} de dano aplicado. PV restante: ${resultadoDano.novoPv}.${efeitoTexto}`
        : `${r.nomeAtacante} atacou ${r.nomeAlvo} com ${r.nomeArma}. ACERTO! (${r.resultadoAtaque} vs. dificuldade ${r.dificuldade}${r.recuoTexto || ""}${r.precisaoTexto || ""}) ${notaEscolha} Dano${danoDadoTexto}: ${resultadoDano.danoFinal} (${r.tipoDanoLabel}) aplicado. PV restante: ${resultadoDano.novoPv}.${efeitoTexto}`;

    await registrarRolagem({ quem: r.nomeAtacante, modificador: r.modAtaque, resultado: resultadoDano.danoFinal, detalhe: detalheDano });
    await remove(ref(db, "combateAtivo/reacaoPendente"));
    return { ...resultadoDano, detalhe: detalheDano };
}

// ---------------------------------------------------------------------
// Passar o Dia — avança o calendário, dispara aviso de Domingo, e
// dispara o popup de treinamento pra cada ficha com treino ativo.
// ---------------------------------------------------------------------
export async function passarODia(calendarioAtual, fichasAtivas) {
    const { calendario, virouDomingo } = await passarUmDia(calendarioAtual);

    if (virouDomingo) {
        await dispararAvisoCustoVida();
        // Ganho fixo semanal — creditado automaticamente (sem precisar de
        // confirmação do jogador, diferente do custo semanal, que continua
        // exigindo confirmação via aviso). Vai sempre pro saldo "limpo"
        // (Dinheiro limpo na conta).
        for (const [fichaId, ficha] of Object.entries(fichasAtivas)) {
            const ganhoFixo = Number(ficha.dados && ficha.dados.ganhoFixo) || 0;
            if (ganhoFixo > 0) {
                const atual = Number(ficha.saldos && ficha.saldos.limpo && ficha.saldos.limpo.valor) || 0;
                await update(ref(db, `fichas/${fichaId}/saldos/limpo`), { valor: atual + ganhoFixo });
            }
        }
    }

    // Sinaliza popup de treinamento pro Mestre, por ficha com treino ativo.
    const popups = [];
    for (const [fichaId, ficha] of Object.entries(fichasAtivas)) {
        if (ficha.treinamento && ficha.treinamento.ativo) {
            popups.push({ fichaId, nomeFicha: (ficha.config && ficha.config.nomeExibicao) || fichaId });
        }
    }
    if (popups.length) {
        await set(ref(db, "popupTreinamento"), Object.fromEntries(popups.map((p, i) => [`p${i}_${Date.now()}`, { ...p, timestamp: Date.now() }])));
    }

    return { calendario, virouDomingo, popups };
}

export function ouvirPopupTreinamento(callback) {
    return onValue(ref(db, "popupTreinamento"), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

export async function confirmarAvancoTreinamento(fichaId, popupId) {
    const snap = await get(ref(db, `fichas/${fichaId}`));
    if (!snap.exists()) return [];
    const ficha = snap.val();
    if (!ficha.treinamento) return [];
    const concluidos = avancarUmDiaTreinamento(ficha);
    await update(ref(db, `fichas/${fichaId}`), { treinamento: ficha.treinamento, dados: ficha.dados, pericias: ficha.pericias });
    if (popupId) await remove(ref(db, `popupTreinamento/${popupId}`));
    return concluidos;
}

export async function descartarPopupTreinamento(popupId) {
    await remove(ref(db, `popupTreinamento/${popupId}`));
}

// ---------------------------------------------------------------------
// Aplica o custo de vida semanal de uma ficha (chamado pelo jogador ou
// Mestre ao responder o aviso de Domingo), debitando do saldo escolhido
// (por id, ex: "limpo", "sujo", "bolso" ou um saldo customizado).
// ---------------------------------------------------------------------
export async function pagarCustoSemanal(fichaId, fichaAtual, saldoId) {
    const custoBase = custoSemanalPadraoDeVida(fichaAtual.dados.padraoDeVida);
    const extras = Object.values(fichaAtual.gastosExtras || {}).reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
    const total = custoBase + extras;
    const saldo = (fichaAtual.saldos && fichaAtual.saldos[saldoId]) || { valor: 0 };
    const atual = Number(saldo.valor) || 0;
    await update(ref(db, `fichas/${fichaId}/saldos/${saldoId}`), { valor: atual - total });
    await update(ref(db, `fichas/${fichaId}/dados`), { ultimoPagamentoCustoVida: Date.now() });
    return total;
}

// ---------------------------------------------------------------------
// Sistema de Aprovação do Mestre — nenhuma ação "destrutiva" do jogador
// (remover item, mudar categoria, gastar dinheiro, dar item pra outro
// jogador) acontece na hora. Ela entra numa fila compartilhada, o
// Mestre vê em tempo real e só executa de fato quando confirma.
// ---------------------------------------------------------------------
export function ouvirAcoesPendentes(callback) {
    return onValue(ref(db, "acoesPendentes"), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0)));
    });
}

// tipo: "remover_item" | "mover_item" | "gastar_dinheiro" | "dar_item"
export async function criarAcaoPendente({ tipo, fichaId, nomeJogador, detalhe, payload }) {
    const novaRef = push(ref(db, "acoesPendentes"));
    await set(novaRef, { tipo, fichaId, nomeJogador: nomeJogador || fichaId, detalhe: detalhe || "", payload: payload || {}, criadoEm: Date.now() });
    return novaRef.key;
}

export async function rejeitarAcaoPendente(acaoId) {
    await remove(ref(db, `acoesPendentes/${acaoId}`));
}

// Executa de fato a ação pendente no banco e remove da fila. Só deve
// ser chamada pelo Mestre (a UI já restringe isso).
export async function confirmarAcaoPendente(acao) {
    const { tipo, fichaId, payload } = acao;

    if (tipo === "remover_item") {
        await remove(ref(db, `fichas/${fichaId}/inventario/${payload.itemId}`));

    } else if (tipo === "mover_item") {
        await update(ref(db, `fichas/${fichaId}/inventario/${payload.itemId}`), { categoria: payload.categoriaNova });

    } else if (tipo === "gastar_dinheiro") {
        const saldoId = payload.saldoId;
        const snap = await get(ref(db, `fichas/${fichaId}/saldos/${saldoId}/valor`));
        const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
        await update(ref(db, `fichas/${fichaId}/saldos/${saldoId}`), { valor: atual - Number(payload.valor || 0) });

    } else if (tipo === "dar_item") {
        const snapItem = await get(ref(db, `fichas/${fichaId}/inventario/${payload.itemId}`));
        if (snapItem.exists()) {
            const item = snapItem.val();
            const novaRefItem = push(ref(db, `fichas/${payload.fichaDestinoId}/inventario`));
            await set(novaRefItem, { ...item, categoria: "levando" });
            await remove(ref(db, `fichas/${fichaId}/inventario/${payload.itemId}`));
        }

    } else if (tipo === "gastar_acao_combate") {
        // Toda rolagem em combate com iniciativa ativo pede aprovação do
        // Mestre antes de gastar a ação do turno (o dado já foi rolado e
        // registrado no Log na hora — só o CONSUMO da ação espera o
        // Mestre confirmar). Rejeitar a pendência simplesmente não gasta
        // a ação, sem desfazer a rolagem já registrada.
        if (payload.participanteId) {
            await consumirAcaoCombate(payload.participanteId);
        }
    }

    await remove(ref(db, `acoesPendentes/${acao.id}`));
}
