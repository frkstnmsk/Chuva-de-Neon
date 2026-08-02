// =====================================================================
// CHUVA DE NEON — Painel exclusivo do Mestre
// =====================================================================
// Tudo que só o Mestre pode fazer: dar XP, ativar godmode (ignora a
// trava de edição), rolar dado, causar dano, gerenciar NPCs, avançar o
// dia (com a regra de Domingo) e confirmar avanço de treinamento.

import { db } from "./firebase-config.js";
import { ref, set, get, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";
import {
    rolarD20, rolarDado, calcularDerivados, coletarModificadores, somaModificadoresPara,
    calcularEstadoSaude, aplicarEstadoSaudeVelocidade, temPericiaTreinada,
    calcularEstadoEnergia, dificuldadeSangramento, dificuldadeDesmaio, DIFICULDADE_BASE_DESMAIO
} from "./regras.js";
import { registrarRolagem, passarUmDia, dispararAvisoCustoVida } from "./calendario.js";
import { avancarUmDiaTreinamento } from "./treinamento.js";
import { calcularSecundariosNpc } from "./npc-detalhado.js";
import { normalizarFicha } from "./normalizacao.js";
import { PERICIAS_ARMA_BRANCA, ehDanoPerfurante, ehDanoCortante, ehDanoContundente, bonusCobraKaiIniciativa, ehIdSaldoDeItem, idItemDoSaldo } from "./dados-manual.js";

// Nível de uma perícia pelo nome, direto do objeto `pericias` da ficha
// (jogador) ou `pericias`/`periciasNpc` de um NPC — 0 se não tiver.
function nivelDaPericia(pericias, nome) {
    const entrada = Object.values(pericias || {}).find(p => p.nome === nome);
    return entrada ? (Number(entrada.nivel) || 0) : 0;
}

// Normaliza texto pra comparação tolerante a acento/caixa (ex.: "Frágil",
// "fragil", "FRÁGIL" batem todos igual).
function normalizarTexto(txt) {
    return String(txt || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

// Desvantagem "Frágil" (manual pg. 18): cadastrada como entrada
// freeform em `desvantagens` (sem código/id fixo — o jogador digita o
// nome), então a detecção é por texto normalizado, batendo tanto
// "Frágil" quanto variações de caixa/acento. Só conta entradas ativas
// (`ativo !== false` — mesma regra usada em coletarModificadores, ver
// regras.js).
const MULTIPLICADOR_DANO_FRAGIL = 2; // dobro do dano recebido (manual pg. 18: +100%)
function temDesvantagemFragil(desvantagens) {
    return Object.values(desvantagens || {}).some(
        (d) => d && d.ativo !== false && normalizarTexto(d.nome) === "fragil"
    );
}

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
    return onValue(ref(db, caminhoMesa("fichas")), (snap) => {
        callback(snap.exists() ? snap.val() : {});
    });
}

// ---------------------------------------------------------------------
// Dar XP
// ---------------------------------------------------------------------
export async function darXp(fichaId, quantidade) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/dados/xp`)));
    const xpAtual = snap.exists() ? Number(snap.val()) : 0;
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), { xp: xpAtual + Number(quantidade) });
}

// ---------------------------------------------------------------------
// Godmode — toggle global. Quando ativo, a trava de edição (atributos/
// perícias só na criação/levelup/treino) é ignorada pro Mestre em
// QUALQUER ficha que ele esteja olhando.
// ---------------------------------------------------------------------
export function ouvirGodmode(callback) {
    return onValue(ref(db, caminhoMesa("godmode")), (snap) => callback(snap.exists() ? !!snap.val() : false));
}

export async function definirGodmode(ativo) {
    await set(ref(db, caminhoMesa("godmode")), !!ativo);
}

// Sub-opção do Godmode (ver acima): por padrão, Godmode ligado NÃO
// desliga a penalidade de Machucado/Muito Machucado sozinho — só quando
// esse toggle também estiver marcado. Guardado à parte (não dentro de
// "godmode") justamente pra poder ficar marcado/desmarcado independente
// do Godmode estar ativo ou não no momento em que for usado.
export function ouvirIgnorarPenalidadeSaude(callback) {
    return onValue(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")), (snap) => callback(snap.exists() ? !!snap.val() : false));
}

export async function definirIgnorarPenalidadeSaude(ativo) {
    await set(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")), !!ativo);
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
// ---------------------------------------------------------------------
// Causar dano — resolve dano contra jogador ou NPC, já descontando a
// redução de armadura equipada (manual pg. 52-53). Golpes Mirados
// (manual): a redução só conta os itens de Proteção cujo localProtegido
// bate com `localArmadura` (o local mirado do golpe — ver LOCAIS_MIRA
// em dados-manual.js). `localArmadura` null/omitido = comportamento
// antigo, sem filtrar por local (usado por ferramentas manuais do
// Mestre que não têm noção de golpe mirado). Retorna o resumo completo
// pro Mestre/automação montarem a mensagem do Log de Dados.
// ---------------------------------------------------------------------
export async function aplicarDano(alvoTipo, alvoId, danoBruto, tipoDanoKey, localArmadura = null, ignorarArmaduraPontos = 0) {
    const brutoNum = Number(danoBruto) || 0;
    const ignorarArmadura = Math.max(0, Number(ignorarArmaduraPontos) || 0);

    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoId}`)));
        if (!snap.exists()) throw new Error("Ficha do alvo não encontrada.");
        const raw = snap.val();
        const nomeAlvo = (raw.config && raw.config.nomeExibicao) || alvoId;
        // Quando pvAtual ainda não foi definido (ficha nova/em criação,
        // ainda sem dano registrado), o padrão tem que ser o PV MÁXIMO
        // calculado — nunca 0. Usar 0 aqui fazia qualquer dano aplicado
        // a um personagem ainda em criação "matar" ele na hora, mesmo
        // sem nunca ter perdido PV de verdade (a mesma convenção de
        // "sem dano registrado = PV cheio" já usada em toda parte,
        // ex: calcularEstadoSaude em regras.js).
        const dadosRaw = raw.dados || {};
        // Precisamos dos modificadores estruturados da ficha do alvo em
        // qualquer caso agora (não só quando pvAtual está indefinido):
        // o alvo "defesa" (Vantagem/Item/Especialização — ver
        // listaAlvosModificador em regras.js) é uma redução de dano
        // GENÉRICA (não filtrada por tipo de dano nem por local
        // mirado, ao contrário da armadura), então precisa entrar em
        // toda aplicação de dano.
        const fichaNormalizada = normalizarFicha(raw);
        const modificadoresAlvo = coletarModificadores(fichaNormalizada);
        const bonusDefesaGenerica = Math.max(0, somaModificadoresPara("defesa", modificadoresAlvo));
        let pvMaximoRaw = 0;
        if (dadosRaw.pvAtual === null || dadosRaw.pvAtual === undefined) {
            const derivadosRaw = calcularDerivados(fichaNormalizada.dados, modificadoresAlvo);
            const bonusExtraRaw = Number(dadosRaw.pvBonusExtra) || 0;
            const totalCalculadoRaw = Math.round(derivadosRaw.recursos.pv.total) + bonusExtraRaw;
            const overrideRaw = dadosRaw.pvMaximoOverride;
            pvMaximoRaw = (overrideRaw !== null && overrideRaw !== undefined && overrideRaw !== "") ? (Number(overrideRaw) || 0) : totalCalculadoRaw;
        }
        const pvAtual = (dadosRaw.pvAtual !== null && dadosRaw.pvAtual !== undefined) ? Number(dadosRaw.pvAtual) : pvMaximoRaw;
        const inventario = raw.inventario || {};
        // Desvantagem Frágil (manual pg. 18): dobra o dano recebido de
        // qualquer tipo de ataque. Aplicada sobre o dano BRUTO do golpe
        // (mesmo ponto do pipeline em que o Acerto Crítico dobra o dano
        // em ficha.js, ANTES da redução de armadura), pra empilhar de
        // forma consistente com qualquer outro multiplicador de dano já
        // embutido em danoBruto (crítico, queima-roupa, etc.).
        const ehFragil = temDesvantagemFragil(raw.desvantagens);
        const brutoComFragil = ehFragil ? brutoNum * MULTIPLICADOR_DANO_FRAGIL : brutoNum;
        const reducaoBruta = tipoDanoKey ? Object.values(inventario)
            .filter(it => it.categoria === "levando" && it.ativo !== false && Array.isArray(it.reducoesDano)
                && (localArmadura == null || it.localProtegido === localArmadura))
            .reduce((acc, it) => {
                const entrada = it.reducoesDano.find(r => r.tipo === tipoDanoKey);
                return acc + (entrada ? Number(entrada.valor) || 0 : 0);
            }, 0) : 0;
        // Força Bruta nível 2/4 (manual pg. 22): "golpes ignoram armadura
        // em pontos igual [ao dobro de] sua Força" — subtrai da redução
        // de armadura do alvo ANTES de aplicar no dano (nunca deixa a
        // redução negativa).
        const reducao = Math.max(0, reducaoBruta - ignorarArmadura) + bonusDefesaGenerica;
        const brutoComFragilArredondado = Math.round(brutoComFragil);
        const danoFinal = Math.max(0, brutoComFragilArredondado - reducao);
        const novoPv = pvAtual - danoFinal;
        await update(ref(db, caminhoMesa(`fichas/${alvoId}/dados`)), { pvAtual: novoPv });
        // danoBruto exibido já inclui o +50% de Frágil (quando aplicável),
        // pra bater com a conta "bruto - redução = final" mostrada no Log.
        return { nomeAlvo, danoBruto: brutoComFragilArredondado, fragil: ehFragil, reducao, danoFinal, novoPv };
    }

    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoId}`)));
    if (!snap.exists()) throw new Error("NPC alvo não encontrado.");
    const npc = snap.val();
    const nomeAlvo = npc.nome || "NPC";
    // Mesma correção do ramo de ficha logo acima: sem pvAtual definido,
    // o padrão é o PV máximo do NPC (npc.pvs), não 0.
    const pvAtual = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : (Number(npc.pvs) || 0);
    // NPCs não têm armadura detalhada por parte do corpo — reducoesDano
    // deles continua valendo pra qualquer local mirado (simplificação;
    // só a ficha de jogador tem localProtegido por item).
    const reducoesNpc = (npc.reducoesDano && npc.reducoesDano.length)
        ? npc.reducoesDano
        : (npc.protecaoTipo ? [{ tipo: npc.protecaoTipo, valor: npc.protecaoValor || 0 }] : []);
    const reducaoBrutaNpc = tipoDanoKey
        ? reducoesNpc.reduce((acc, r) => acc + (r.tipo === tipoDanoKey ? (Number(r.valor) || 0) : 0), 0)
        : 0;
    // Vantagem "defesa" (redução de dano genérica, ver aplicarDano pro
    // ramo de ficha acima) também vale pra NPC — mesmo alvo, mesma regra.
    const bonusDefesaGenericaNpc = Math.max(0, somaModificadoresPara("defesa", coletarModificadores({ vantagens: npc.vantagens })));
    const reducao = Math.max(0, reducaoBrutaNpc - ignorarArmadura) + bonusDefesaGenericaNpc;
    const danoFinal = Math.max(0, brutoNum - reducao);
    const novoPv = pvAtual - danoFinal;
    await update(ref(db, caminhoMesa(`npcs/${alvoId}`)), { pvAtual: novoPv });
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
// Status por turno (Tick System) — efeitos que ficam "grudados" num
// participante do Gerenciador de Combate e se resolvem sozinhos a cada
// troca de turno, com contagem regressiva própria. Guardados em
// combateAtivo/participantes/{id}/statusAtivos/{chave} — cada chave é
// um efeito independente (dá pra ter mais de um ativo ao mesmo tempo).
// Processados em processarStatusInicioTurno(), chamada de dentro de
// avancarTurnoCombate() logo abaixo.
// ---------------------------------------------------------------------

// Sangramento por Golpe Perfurante (manual): dura 2 ou 3 turnos
// conforme o local mirado, com dano fixo por turno igual a uma fração
// do dano causado pelo golpe que sangrou (1/4 em Torso/Membro/
// Extremidade, 1/3 na Cabeça — SEM rolar dado, o mesmo valor se repete
// em cada turno). Cada golpe que causa Sangramento entra como uma
// entrada NOVA e independente (não sobrescreve/renova a anterior) —
// vários golpes seguidos empilham vários sangramentos simultâneos,
// cada um com sua própria contagem e seu próprio dano fixo, todos
// tickando juntos a cada turno (ver processarStatusInicioTurno abaixo).
export async function aplicarSangramento(participanteId, danoPorTurno, turnos, origem) {
    if (!participanteId) return;
    const novaRef = push(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/statusAtivos`)));
    await set(novaRef, {
        tipo: "sangramento",
        label: "Sangramento",
        turnosRestantes: turnos,
        danoPorTurno,
        origem
    });
    return { danoPorTurno, turnos };
}

// Teste de Constituição contra Sangramento (manual): rolado uma vez por
// Golpe Mirado PERFURANTE que causou dano de verdade (golpe "Padrão",
// sem mirar, nunca sangra — manual: "sem efeitos extras") OU por
// qualquer tiro de arma de fogo perfurante (mirado ou não — manual pg.
// 57: "ao ser atingido por um projétil, role um teste de
// Constituição"), ANTES de decidir se aplicarSangramento entra em
// ação. dificuldade = 10 + nível da arma + agravante do local
// (regraLocal.difExtra — dificuldadeSangramento em regras.js; o manual
// não dá uma dificuldade separada pra pág. 57, então a mesma fórmula é
// reaproveitada pra ambos os casos). Sucesso (d20 + Constituição do
// alvo >= dificuldade) resiste — o ferimento não sangra, sem nenhum
// efeito mecânico.
//
// Falha entra como uma entrada nova de Sangramento, mas o CÁLCULO do
// dano/duração muda conforme a origem (ehProjetil):
// - Golpe Mirado corpo a corpo/arma branca (manual pg. 51): dano FIXO
//   = fração do dano original (regraLocal.fracaoDano), por
//   regraLocal.turnos turnos (2 ou 3, conforme o local).
// - Tiro de arma de fogo (manual pg. 57): "1d metade do dano recebido
//   [...] sempre arredondado pra baixo" — um ÚNICO dado é rolado (o
//   próprio tamanho do dado é metade do dano causado, ex.: 20 de dano
//   → 1d10) e o RESULTADO dessa rolagem vale como dano fixo pelos
//   próximos 3 turnos (não é rerolado a cada turno — mesmo padrão do
//   exemplo do manual: "rolou 1d10, resultado 7 [...] receberá por três
//   turnos 7 de dano").
export async function testarSangramento(participanteId, constituicaoAlvo, nivelArma, danoOriginalBruto, regraLocal, ehProjetil = false) {
    if (!participanteId || !regraLocal) return null;
    const dificuldade = dificuldadeSangramento(nivelArma, regraLocal.difExtra);
    const bruto = rolarD20();
    const modConstituicao = Number(constituicaoAlvo) || 0;
    const resultado = bruto + modConstituicao;
    const sucesso = resultado >= dificuldade;
    let sangramento = null;
    let detalheDano = "";
    if (!sucesso) {
        let danoPorTurno, turnos;
        if (ehProjetil) {
            const facesDado = Math.max(1, Math.floor((Number(danoOriginalBruto) || 0) / 2));
            danoPorTurno = rolarDado(facesDado);
            turnos = 3;
            detalheDano = ` (1d${facesDado}: ${danoPorTurno})`;
        } else {
            danoPorTurno = Math.max(0, Math.floor((Number(danoOriginalBruto) || 0) * regraLocal.fracaoDano));
            turnos = regraLocal.turnos;
        }
        sangramento = await aplicarSangramento(participanteId, danoPorTurno, turnos, ehProjetil ? "Tiro de arma de fogo" : "Golpe Mirado perfurante");
    }
    return {
        dificuldade, bruto, modConstituicao, resultado, sucesso, sangramento,
        detalhe: sucesso
            ? `Teste de Constituição vs. Sangramento (dif ${dificuldade}): d20 (${bruto}) ${modConstituicao >= 0 ? "+" : ""}${modConstituicao} = ${resultado} — RESISTIU, não sangrou.`
            : `Teste de Constituição vs. Sangramento (dif ${dificuldade}): d20 (${bruto}) ${modConstituicao >= 0 ? "+" : ""}${modConstituicao} = ${resultado} — FALHOU, começou a SANGRAR${detalheDano} (${sangramento.danoPorTurno} de dano fixo por turno, por ${sangramento.turnos} turnos).`
    };
}

// Resolve os status ativos de quem está prestes a agir (chamada com o
// PRÓXIMO turnoAtual, antes do recálculo de PV/Velocidade/estado de
// saúde de avancarTurnoCombate — assim o dano do tick já entra nesse
// mesmo recálculo). Cada entrada em statusAtivos é resolvida
// independente — se houver mais de um Sangramento empilhado, cada um
// causa seu próprio dano fixo no mesmo turno (e a soma total é logada
// à parte, pra ficar claro no Log de Dados). Retorna as notas de log
// (uma por efeito resolvido, + o total combinado se houver mais de
// um) pro chamador registrar.
async function processarStatusInicioTurno(participanteId, participante) {
    const statusAtivos = participante && participante.statusAtivos;
    if (!statusAtivos) return { statusFinal: null, notas: [] };

    const statusFinal = {};
    const notas = [];
    let totalDanoTurno = 0;
    let sangramentosAtivos = 0;

    for (const [chave, status] of Object.entries(statusAtivos)) {
        if (!status || (Number(status.turnosRestantes) || 0) <= 0) continue;

        if (status.tipo === "sangramento") {
            sangramentosAtivos++;
            const dano = Number(status.danoPorTurno) || 0;
            const resultado = await aplicarDano(participante.tipo, participante.refId, dano, null);
            totalDanoTurno += dano;
            notas.push(`${resultado.nomeAlvo} sangrou (${status.turnosRestantes} turno(s) restante(s)): ${dano} de dano fixo. PV restante: ${resultado.novoPv}.`);
        }

        const restante = (Number(status.turnosRestantes) || 0) - 1;
        if (restante > 0) {
            statusFinal[chave] = { ...status, turnosRestantes: restante };
        } else {
            statusFinal[chave] = null; // expira — update() remove a chave
            notas.push(`${participante.nome || participanteId}: ${status.label || status.tipo} terminou.`);
        }
    }

    if (sangramentosAtivos > 1) {
        notas.push(`${participante.nome || participanteId}: ${sangramentosAtivos} sangramentos empilhados causaram ${totalDanoTurno} de dano combinado neste turno.`);
    }

    return { statusFinal, notas };
}

// ---------------------------------------------------------------------
// NPCs — gerador rápido de ficha de combate.
// ---------------------------------------------------------------------
export function ouvirNpcs(callback) {
    return onValue(ref(db, caminhoMesa("npcs")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

// Retorna o id do NPC recém-criado (usado pelo Gerenciador de Combate
// pra já entrar direto na lista de participantes, sem passo extra).
export async function criarNpc({ nome, pvs, periciasResumo, itensEssenciais, atributos, atributosSecundarios, agilidade, constituicao, reducoesDano }) {
    const novaRef = push(ref(db, caminhoMesa("npcs")));
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
        // Array multi-tipo (mesmo modelo dos itens de proteção do
        // jogador): [{ tipo: "corte", valor: 2 }, { tipo: "perfurante", valor: 4 }, ...]
        reducoesDano: Array.isArray(reducoesDano) ? reducoesDano : [],
        criadoEm: Date.now()
    });
    return novaRef.key;
}

export async function excluirNpc(npcId) {
    await remove(ref(db, caminhoMesa(`npcs/${npcId}`)));
}

// ---------------------------------------------------------------------
// NPCs — Mini-Ficha Detalhada (Módulo 2). Sem pontos iniciais fixos e
// sem restrição de Função/Desvantagens: o Mestre digita os atributos
// primários livremente e o sistema calcula os secundários (ver
// npc-detalhado.js), com opção de sobrescrever qualquer um na mão.
// Reaproveita o mesmo nó `npcs/{id}` do gerador rápido — os dois
// convivem na mesma lista, diferenciados pelo campo `modoDetalhado`.
// ---------------------------------------------------------------------
export async function criarNpcDetalhado({ nome, npcDetalhado, reducoesDano }) {
    const secundarios = secundariosDoNpc(npcDetalhado);
    const novaRef = push(ref(db, caminhoMesa("npcs")));
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
        // Array multi-tipo (mesmo modelo dos itens de proteção do
        // jogador): [{ tipo: "corte", valor: 2 }, { tipo: "perfurante", valor: 4 }, ...]
        reducoesDano: Array.isArray(reducoesDano) ? reducoesDano : [],
        criadoEm: Date.now(),
        modoDetalhado: true,
        vulgo: npcDetalhado.vulgo || "",
        idade: npcDetalhado.idade || "",
        funcaoNarrativa: npcDetalhado.funcaoNarrativa || "",
        atributosPrimarios: npcDetalhado.atributosPrimarios,
        secundariosOverride: npcDetalhado.secundariosOverride,
        periciasNpc: npcDetalhado.periciasNpc || {},
        // Ficha completa (Módulo 3) — ver normalizarNpcComoFicha em
        // normalizacao.js. Só existe pra NPC modoDetalhado.
        inventario: npcDetalhado.inventario || {},
        categoriasInventario: npcDetalhado.categoriasInventario || {},
        energiaAtual: npcDetalhado.energiaAtual ?? null
    });
    return novaRef.key;
}

export async function atualizarNpcDetalhado(npcId, { nome, npcDetalhado, reducoesDano, pvAtual }) {
    const secundarios = secundariosDoNpc(npcDetalhado);
    await update(ref(db, caminhoMesa(`npcs/${npcId}`)), {
        nome: nome || "NPC sem nome",
        pvs: secundarios.recursos.pv.valor,
        pvAtual: pvAtual !== undefined && pvAtual !== null ? Number(pvAtual) : secundarios.recursos.pv.valor,
        periciasResumo: resumoPericiasNpc(npcDetalhado),
        atributos: resumoAtributosPrimariosNpc(npcDetalhado),
        atributosSecundarios: resumoSecundariosNpc(secundarios),
        agilidade: secundarios.secundarios.agilidade.valor,
        constituicao: Number(npcDetalhado.atributosPrimarios?.constituicao) || 0,
        reducoesDano: Array.isArray(reducoesDano) ? reducoesDano : [],
        // Limpa os campos antigos (1 tipo só) assim que o NPC é salvo de
        // novo no modelo atual, pra não deixar dado fantasma que possa
        // confundir o fallback de compatibilidade em aplicarDano().
        protecaoTipo: null,
        protecaoValor: null,
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
    return onValue(ref(db, caminhoMesa("combateAtivo")), (snap) => {
        callback(snap.exists() ? snap.val() : { ativo: false, participantes: {} });
    });
}

// Se o combate ainda não teve a iniciativa rolada (Mestre só está
// montando a lista de participantes antes de clicar "Iniciar Combate"),
// mantém o comportamento de sempre: entra na lista pelada, sem
// iniciativa, e rola junto com todo mundo quando o Mestre iniciar.
//
// Mas se o combate JÁ está rolando (ordemTurnos existe e não está
// vazio) — ex: um jogador entra na cena no meio do tiroteio, ou o
// Mestre traz um NPC de reforço no meio da rodada — o recém-chegado
// precisa da própria rolagem de iniciativa (1d20 + Agilidade, mesma
// fórmula/stats de iniciarIniciativaCombate) pra já entrar na fila de
// turnos, em vez de ficar parado esperando o próximo combate pra agir.
export async function adicionarParticipanteCombate({ tipo, refId, nome }) {
    const snapAtual = await get(ref(db, caminhoMesa("combateAtivo")));
    const estadoAtual = snapAtual.exists() ? snapAtual.val() : {};
    const iniciativaJaRolada = !!(estadoAtual.ativo && Array.isArray(estadoAtual.ordemTurnos) && estadoAtual.ordemTurnos.length);

    await update(ref(db, caminhoMesa("combateAtivo")), { ativo: true });
    const novaRef = push(ref(db, caminhoMesa("combateAtivo/participantes")));
    const participanteId = novaRef.key;
    const base = { tipo, refId, nome: nome || refId };

    if (!iniciativaJaRolada) {
        await set(novaRef, base);
        return { id: participanteId, entrouComIniciativa: false };
    }

    // Mesma combinação Godmode + "ignorar penalidade de saúde" usada em
    // iniciarIniciativaCombate/avancarTurnoCombate — a rolagem tardia
    // tem que respeitar o mesmo Godmode que já vale pro resto do combate.
    const [snapGodmode, snapIgnorarSaude] = await Promise.all([
        get(ref(db, caminhoMesa("godmode"))),
        get(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")))
    ]);
    const godmodeAtivo = snapGodmode.exists() ? !!snapGodmode.val() : false;
    const ignorarPenalidadeSaude = godmodeAtivo && (snapIgnorarSaude.exists() ? !!snapIgnorarSaude.val() : false);

    const stats = await calcularStatsCombateParticipante(base, ignorarPenalidadeSaude);
    const rolagemBruta = rolarD20();
    const acoesMax = calcularAcoesMax(stats.velocidade);
    // Bônus automático de Karatê Cobra Kai (manual pg. 22) continua
    // valendo pra quem entra depois. Os bônus condicionais de CQC
    // (nível 2/4 — dependem de uma escolha narrativa feita ANTES da
    // rolagem, ver participantesElegiveisCQCIniciativa) ficam de fora
    // dessa entrada tardia, já que ela não passa pela modal de
    // pré-iniciativa; o Mestre pode ajustar na mão se for o caso.
    const bonusCobraKai = bonusCobraKaiIniciativa(stats.nivelCobraKai);
    // Mesma regra da "iniciativa travada" de iniciarIniciativaCombate:
    // tirou 1 no d20? Perde esse primeiro turno (0 ações). Rerrola ao
    // encerrar o turno, dentro de avancarTurnoCombate.
    const perdeuPrimeiroTurno = rolagemBruta === 1;

    const participanteCompleto = {
        ...base,
        ...stats,
        rolagemBruta,
        iniciativa: rolagemBruta + stats.modAgilidade + bonusCobraKai,
        bonusCQCIniciativa: false,
        bonusCobraKaiIniciativa: bonusCobraKai,
        acoesMax,
        acoes: perdeuPrimeiroTurno ? 0 : acoesMax,
        iniciativaTravada: perdeuPrimeiroTurno,
        dispararAvancarDisponivel: false,
        dispararAvancarUsado: false,
        acoesExtraCQCMax: 0,
        acoesExtraCQC: 0,
        esquivasDisponiveis: 0,
        acoesGuardadas: 0
    };

    await set(novaRef, participanteCompleto);

    // Reordena a fila inteira com o recém-chegado incluído (mesmo
    // critério de ordenarPorIniciativa: maior iniciativa age primeiro,
    // empate decide pelo modAgilidade). `turnoAtual` é guardado pelo id,
    // não pelo índice, então quem já estava agindo não perde a vez só
    // porque a lista mudou de posição.
    const participantesAtualizados = { ...(estadoAtual.participantes || {}), [participanteId]: participanteCompleto };
    const novaOrdem = ordenarPorIniciativa(participantesAtualizados);
    await update(ref(db, caminhoMesa("combateAtivo")), { ordemTurnos: novaOrdem });

    return { id: participanteId, entrouComIniciativa: true, iniciativa: participanteCompleto.iniciativa };
}

export async function removerParticipanteCombate(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}`)));
}

export async function encerrarCombate() {
    await set(ref(db, caminhoMesa("combateAtivo")), { ativo: false, participantes: {} });
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
// `ignorarPenalidadeSaude` (default false): já vem combinado — só é true
// quando o Godmode está ativo E o sub-toggle "ignorar penalidade de
// saúde" também está marcado (ver ouvirGodmode/ouvirIgnorarPenalidadeSaude
// acima e iniciarIniciativaCombate abaixo, que monta essa combinação).
// Quando true, a penalidade de Machucado/Muito Machucado é ignorada pra
// todo mundo no combate — jogadores e NPCs — igual ao que já acontece na
// ficha (ver ficha.js).
async function calcularStatsCombateParticipante(participante, ignorarPenalidadeSaude = false) {
    if (participante.tipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
        if (!snap.exists()) return statsCombatePadrao();
        const ficha = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(ficha);
        const derivados = calcularDerivados(ficha.dados, modificadoresPlanos);
        // Soma o bônus permanente de PV ganho em Level Up (dado de vida),
        // guardado em dados.pvBonusExtra — mesma regra usada em ficha.js
        // pra mostrar o PV máximo na ficha. Sem isso o Gerenciador de
        // Combate mostrava um PV máximo desatualizado pro jogador que já
        // tinha subido de nível. dados.pvMaximoOverride (ajustado em
        // Godmode direto na ficha) tem prioridade sobre o cálculo, se
        // estiver definido.
        const pvMaxCalculado = Math.round(derivados.recursos.pv.total) + (Number(ficha.dados.pvBonusExtra) || 0);
        const overridePv = ficha.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalculado;
        const pvAtual = (ficha.dados.pvAtual !== null && ficha.dados.pvAtual !== undefined)
            ? Number(ficha.dados.pvAtual) : pvMax;
        // Machucado/Muito Machucado (ver regras.js) também valem pra
        // Velocidade e Agilidade DENTRO do combate — ações extras por
        // turno (calcularAcoesMax) e iniciativa (1d20+Agilidade) usam os
        // valores já penalizados, igual a qualquer outro teste.
        const temTolerancia = temPericiaTreinada(ficha.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, ignorarPenalidadeSaude);
        const velocidadeAjustada = aplicarEstadoSaudeVelocidade(derivados.secundarios.velocidade, estadoSaude).total;
        // Karatê Cobra Kai (manual pg. 22): "a cada dois pontos na
        // perícia bônus +1 na iniciativa" — automático, sem checkbox
        // (ver bonusCobraKaiIniciativa em dados-manual.js), somado na
        // rolagem de iniciativa em iniciarIniciativaCombate abaixo.
        const nivelCobraKai = nivelDaPericia(ficha.pericias, "Karatê Cobra Kai");
        // Energia — mesma automação da Ficha (ver regras.js): Energia
        // Baixa/Crítica penaliza modAgilidade (teste físico) igual ao
        // estado de saúde; em 0 de Energia, o participante está morto.
        const energiaMax = Math.round(derivados.recursos.energia.total);
        const energiaAtual = (ficha.dados.energiaAtual !== null && ficha.dados.energiaAtual !== undefined)
            ? Number(ficha.dados.energiaAtual) : energiaMax;
        const estadoEnergia = calcularEstadoEnergia(energiaAtual, energiaMax, ignorarPenalidadeSaude);
        return {
            modAgilidade: Math.round(derivados.secundarios.agilidade.total) + estadoSaude.penalidadeTestes + estadoEnergia.penalidadeFisica,
            velocidade: Math.round(velocidadeAjustada),
            pv: pvAtual,
            pvMax,
            estadoSaude: estadoSaude.estado,
            estadoSaudeLabel: estadoSaude.label,
            energia: energiaAtual,
            energiaMax,
            estadoEnergia: estadoEnergia.estado,
            estadoEnergiaLabel: estadoEnergia.label,
            nivelCobraKai
        };
    }

    // NPC
    const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
    if (!snap.exists()) return statsCombatePadrao();
    const npc = snap.val();

    if (npc.modoDetalhado) {
        const modificadoresVantagensNpc = coletarModificadores({ vantagens: npc.vantagens });
        const secundarios = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride, modificadoresVantagensNpc);
        const pvMax = secundarios.recursos.pv.valor;
        const pvAtual = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(npc.periciasNpc, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, ignorarPenalidadeSaude);
        const velocidadeAjustada = aplicarEstadoSaudeVelocidade({ total: secundarios.secundarios.velocidade.valor, ajustes: [] }, estadoSaude).total;
        const energiaMax = secundarios.recursos.energia.valor;
        const energiaAtual = (npc.energiaAtual !== null && npc.energiaAtual !== undefined) ? Number(npc.energiaAtual) : energiaMax;
        const estadoEnergia = calcularEstadoEnergia(energiaAtual, energiaMax, ignorarPenalidadeSaude);
        // Karatê Cobra Kai (manual pg. 22): mesmo bônus de iniciativa
        // da ficha de jogador, agora pro NPC detalhado (que tem
        // perícias próprias em npc.periciasNpc).
        const nivelCobraKai = nivelDaPericia(npc.periciasNpc, "Karatê Cobra Kai");
        return {
            modAgilidade: Math.round(secundarios.secundarios.agilidade.valor) + estadoSaude.penalidadeTestes + estadoEnergia.penalidadeFisica,
            velocidade: Math.round(velocidadeAjustada),
            pv: pvAtual,
            pvMax,
            estadoSaude: estadoSaude.estado,
            estadoSaudeLabel: estadoSaude.label,
            energia: energiaAtual,
            energiaMax,
            estadoEnergia: estadoEnergia.estado,
            estadoEnergiaLabel: estadoEnergia.label,
            nivelCobraKai
        };
    }

    // NPC "rápido" (gerador simples) só guarda Agilidade solta, sem
    // Velocidade separada — usamos a própria Agilidade como Velocidade
    // Total pra fins de ações extras. Pra um cálculo fiel de Velocidade
    // ((Destreza+Constituição)/2), cadastre o NPC no modo detalhado. Sem
    // perícias cadastradas, não há como ter Tolerância treinada — limiar
    // de "Muito Machucado" fica sempre em 1/3 aqui.
    const pvMaxRapido = Number(npc.pvs) || 0;
    const pvAtualRapido = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : pvMaxRapido;
    const estadoSaudeRapido = calcularEstadoSaude(pvAtualRapido, pvMaxRapido, false, ignorarPenalidadeSaude);
    const agilidadeBase = Number(npc.agilidade) || 0;
    const velocidadeAjustadaRapido = aplicarEstadoSaudeVelocidade({ total: agilidadeBase, ajustes: [] }, estadoSaudeRapido).total;
    // Energia — o gerador rápido não tem atributos primários separados,
    // só a Constituição solta; usamos a mesma fórmula do manual (6 +
    // Constituição) pro máximo. Sem campo pra editar a Energia atual
    // aqui, conta sempre como cheia (sem penalidade) até esse NPC ser
    // recadastrado no modo detalhado.
    const energiaMaxRapido = 6 + (Number(npc.constituicao) || 0);
    const energiaAtualRapido = (npc.energiaAtual !== null && npc.energiaAtual !== undefined) ? Number(npc.energiaAtual) : energiaMaxRapido;
    const estadoEnergiaRapido = calcularEstadoEnergia(energiaAtualRapido, energiaMaxRapido, ignorarPenalidadeSaude);
    return {
        modAgilidade: agilidadeBase + estadoSaudeRapido.penalidadeTestes + estadoEnergiaRapido.penalidadeFisica,
        velocidade: Math.round(velocidadeAjustadaRapido),
        pv: pvAtualRapido,
        pvMax: pvMaxRapido,
        estadoSaude: estadoSaudeRapido.estado,
        estadoSaudeLabel: estadoSaudeRapido.label,
        energia: energiaAtualRapido,
        energiaMax: energiaMaxRapido,
        estadoEnergia: estadoEnergiaRapido.estado,
        estadoEnergiaLabel: estadoEnergiaRapido.label
    };
}

function statsCombatePadrao() {
    return {
        modAgilidade: 0, velocidade: 0, pv: 0, pvMax: 0, estadoSaude: null, estadoSaudeLabel: null,
        energia: 0, energiaMax: 0, estadoEnergia: null, estadoEnergiaLabel: null
    };
}

// Ordena por iniciativa decrescente; empate é decidido pelo maior
// modificador de Agilidade (regra caseira de dificuldade defensiva
// do módulo de regras — combateAtivo é a única fonte de estado de
// combate deste sistema).
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
// ---------------------------------------------------------------------
// CQC nível 2 (manual): "Avançar em direção a oponentes armados e
// derrubá-los tem modificador +1 em sua iniciativa [...]" — é
// condicional a uma escolha narrativa (nem todo personagem com CQC
// nível 2 está necessariamente fazendo esse avanço quando a iniciativa
// é rolada), então não dá pra aplicar automático feito o resto dos
// bônus de CQC. Em vez disso, ficha.js pergunta ao Mestre via checkbox
// ANTES de rolar (ver abrirModalBonusIniciativaCQC/iniciarIniciativaCombate
// mais abaixo). Esta função varre os participantes cadastrados no
// combate e devolve só quem TEM o nível pra oferecer a escolha —
// funciona pra ficha de jogador e NPC detalhado (NPC "rápido" não tem
// perícias cadastradas, então nunca aparece na lista).
//
// Mesma lista é reaproveitada em ficha.js pra oferecer o checkbox de
// CQC nível 4 ("Disparar e Avançar" — filtra pra nivel >= 4 na hora de
// montar a modal), já que os dois bônus são perguntados no mesmo passo
// pré-rolagem de iniciativa.
// ---------------------------------------------------------------------
export async function participantesElegiveisCQCIniciativa() {
    const snap = await get(ref(db, caminhoMesa("combateAtivo/participantes")));
    const participantesBase = snap.exists() ? snap.val() : {};
    const elegiveis = [];
    for (const [id, base] of Object.entries(participantesBase)) {
        let pericias = null;
        let nome = base.nome;
        if (base.tipo === "ficha") {
            const s = await get(ref(db, caminhoMesa(`fichas/${base.refId}`)));
            if (s.exists()) {
                const f = s.val();
                pericias = f.pericias || null;
                nome = (f.config && f.config.nomeExibicao) || nome;
            }
        } else {
            const s = await get(ref(db, caminhoMesa(`npcs/${base.refId}`)));
            if (s.exists()) {
                const n = s.val();
                if (n.modoDetalhado) pericias = n.pericias || null;
                nome = n.nome || nome;
            }
        }
        if (!pericias) continue;
        const entradaCQC = Object.values(pericias).find(p => p.nome === "CQC");
        const nivel = entradaCQC ? (Number(entradaCQC.nivel) || 0) : 0;
        if (nivel >= 2) elegiveis.push({ id, nome, nivel });
    }
    return elegiveis;
}

export async function iniciarIniciativaCombate(bonusIniciativaCQC = {}, dispararAvancarCQC = {}, acaoExtraCQC = {}) {
    const snap = await get(ref(db, caminhoMesa("combateAtivo/participantes")));
    const participantesBase = snap.exists() ? snap.val() : {};
    const ids = Object.keys(participantesBase);
    if (!ids.length) {
        throw new Error("Adicione ao menos um participante antes de iniciar o combate.");
    }

    // Lida uma única vez, antes do loop — com Godmode ativo E o
    // sub-toggle "ignorar penalidade de saúde" marcado, a penalidade de
    // Machucado/Muito Machucado sai zerada pra todos os participantes
    // (jogadores e NPCs) já no cálculo de iniciativa.
    const [snapGodmode, snapIgnorarSaude] = await Promise.all([
        get(ref(db, caminhoMesa("godmode"))),
        get(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")))
    ]);
    const godmodeAtivo = snapGodmode.exists() ? !!snapGodmode.val() : false;
    const ignorarPenalidadeSaude = godmodeAtivo && (snapIgnorarSaude.exists() ? !!snapIgnorarSaude.val() : false);

    const participantesAtualizados = {};
    for (const id of ids) {
        const base = participantesBase[id];
        const stats = await calcularStatsCombateParticipante(base, ignorarPenalidadeSaude);
        const rolagemBruta = rolarD20();
        const acoesMax = calcularAcoesMax(stats.velocidade);
        // CQC nível 2: +1 na iniciativa, só pra quem o Mestre marcou no
        // checkbox de abrirModalBonusIniciativaCQC (ver comentário em
        // participantesElegiveisCQCIniciativa acima) — bonusCQCIniciativa
        // fica salvo no participante só pra exibir a origem do +1 na UI
        // (badge "🥋 +1 CQC" no Gerenciador de Combate).
        const bonusCQC = bonusIniciativaCQC[id] ? 1 : 0;
        // Karatê Cobra Kai (manual pg. 22): +1 na iniciativa a cada 2
        // pontos na perícia — automático (sem checkbox, diferente do
        // +1 de CQC nível 2 acima, que É condicional a uma escolha
        // narrativa). Ver bonusCobraKaiIniciativa em dados-manual.js e
        // nivelCobraKai calculado em calcularStatsCombateParticipante.
        const bonusCobraKai = bonusCobraKaiIniciativa(stats.nivelCobraKai);
        // CQC nível 4 ("Disparar e Avançar" — manual pg. 23): quem foi
        // marcado no checkbox de abrirModalBonusIniciativaCQC reserva já
        // AGORA 1 ação do próprio 1º turno (o manual: "utilizando uma
        // ação do seu primeiro turno") — fica marcado como já gasta no
        // contador de ações, e dispararAvancarDisponivel libera o botão
        // "Disparar e Avançar" em ficha.js (resolverDispararAvancar),
        // que resolve os 2 disparos fora da ordem de turno. Como
        // avancarTurnoCombate só RESTAURA `acoes` pro máximo cheio ao
        // virar rodada (nunca no meio dela), essa reserva persiste até
        // o próprio 1º turno de quem marcou chegar.
        const dispararAvancar = !!dispararAvancarCQC[id];
        // CQC nível 5 ("Agente Impossível" — manual: "recebe uma ação
        // extra em seu turno para rolagens de CQC"). Diferente do nível
        // 2/4, não é condicional a nenhuma escolha narrativa — é sempre
        // ativo pra quem tem o nível, então ficha.js já manda esse mapa
        // pronto (filtrando nivel >= 5 na mesma lista de elegiveis que
        // monta os outros dois mapas), sem checkbox de confirmação.
        // Guardado num contador SEPARADO de `acoes` (acoesExtraCQC),
        // porque só serve pra rolagens de CQC (ver checarConsumoDeAcao/
        // ehCQC em ficha.js) — resetado a cada rodada em
        // avancarTurnoCombate, igual `acoes`.
        const temAcaoExtraCQC = !!acaoExtraCQC[id];
        // Regra da "iniciativa travada": quem tira 1 no d20 da própria
        // rolagem de iniciativa perde o primeiro turno inteiro (0 ações,
        // não age). Ao encerrar esse turno (ver avancarTurnoCombate),
        // rerrola o d20 e reordena a fila com a nova iniciativa — se
        // tirar 1 de novo, perde o turno seguinte também, e assim por
        // diante.
        const perdeuPrimeiroTurno = rolagemBruta === 1;
        participantesAtualizados[id] = {
            ...base,
            ...stats,
            rolagemBruta,
            iniciativa: rolagemBruta + stats.modAgilidade + bonusCQC + bonusCobraKai,
            bonusCQCIniciativa: !!bonusCQC,
            bonusCobraKaiIniciativa: bonusCobraKai,
            acoesMax,
            acoes: perdeuPrimeiroTurno ? 0 : (dispararAvancar ? Math.max(0, acoesMax - 1) : acoesMax),
            iniciativaTravada: perdeuPrimeiroTurno,
            dispararAvancarDisponivel: dispararAvancar,
            dispararAvancarUsado: false,
            acoesExtraCQCMax: temAcaoExtraCQC ? 1 : 0,
            acoesExtraCQC: temAcaoExtraCQC ? 1 : 0,
            // Ações de Esquiva/Bloqueio guardadas (manual pg. ~48): só
            // ficam disponíveis DEPOIS que o personagem já teve seu
            // próprio turno na rodada. Por isso começa em 0 pra todo
            // mundo — se alguém agir antes de você na primeira rodada,
            // você ainda não tem ação carregada e não pode
            // esquivar/bloquear. É um CONTADOR (não mais um booleano):
            // normalmente vale 1 (a guarda automática de fim de turno),
            // mas pode acumular mais se o personagem usar a manobra
            // "Esquivar" no próprio turno (ver adicionarEsquivaExtra),
            // permitindo esquivar de mais de um golpe na mesma rodada.
            esquivasDisponiveis: 0,
            // Ações guardadas (ver avancarTurnoCombate/confirmarAcaoPendente,
            // tipo "guardar_acao_combate"): começa em 0 — só ganha
            // conteúdo quando o Mestre aprova guardar ação(ões) sobrando
            // do fim de um turno.
            acoesGuardadas: 0
        };
    }

    const ordemTurnos = ordenarPorIniciativa(participantesAtualizados);

    await update(ref(db, caminhoMesa("combateAtivo")), {
        ativo: true,
        rodada: 1,
        ordemTurnos,
        turnoAtual: ordemTurnos[0],
        participantes: participantesAtualizados
    });

    return { ordemTurnos, participantes: participantesAtualizados };
}

// Passa a vez pro próximo participante na ordem de iniciativa. A cada
// troca de turno (não só ao virar rodada), RECALCULA a Velocidade Total
// (e portanto o teto de ações) de todo mundo a partir do PV atual — e
// só ao voltar ao início da ordem restaura o contador de ações pro novo
// máximo cheio.
//
// Isso importa porque Machucado/Muito Machucado cortam Velocidade, e o
// PV de alguém pode mudar no meio da própria rodada (levou dano antes
// da vez dele agir) depois que "Iniciar Combate" já tinha calculado as
// ações máximas uma vez lá atrás. Sem recalcular a cada troca de turno,
// o Gerenciador de Combate continuava oferecendo ações de antes de o
// personagem ficar Machucado/Muito Machucado.
export async function avancarTurnoCombate() {
    const snap = await get(ref(db, caminhoMesa("combateAtivo")));
    const estado = snap.val();

    if (!estado?.ativo || !estado.ordemTurnos?.length) {
        throw new Error("Não há combate com iniciativa em andamento.");
    }

    const { ordemTurnos, turnoAtual, participantes, rodada } = estado;
    const indiceAtual = ordemTurnos.indexOf(turnoAtual);
    const proximoIndice = (indiceAtual + 1) % ordemTurnos.length;
    const novoTurno = ordemTurnos[proximoIndice];
    const virouRodada = proximoIndice === 0;

    const atualizacoes = { turnoAtual: novoTurno };

    // Quem estava agindo agora "guarda" mais uma ação de Esquiva/Bloqueio
    // pro próximo golpe que receber, até usá-la (ver usarEsquivaBloqueio).
    // É somado (não sobrescrito) porque o personagem pode já ter
    // acumulado esquivas extras usando a manobra "Esquivar" no próprio
    // turno (ver adicionarEsquivaExtra) — a guarda automática de fim de
    // turno não deve zerar esse estoque.
    if (participantes[turnoAtual]) {
        const esquivasAtuais = Number(participantes[turnoAtual].esquivasDisponiveis) || 0;
        atualizacoes[`participantes/${turnoAtual}/esquivasDisponiveis`] = esquivasAtuais + 1;
    }

    // Guardar ação: se quem está encerrando o turno ainda tem ação(ões)
    // do turno sobrando (não gastou tudo), isso vira uma pergunta pro
    // Mestre na fila de Ações Pendentes ("guardar_acao_combate" — ver
    // confirmarAcaoPendente abaixo) em vez de simplesmente perder as
    // ações. Se o Mestre aprovar, elas viram "ações guardadas"
    // (acoesGuardadas) que o personagem pode gastar depois, MESMO fora
    // do seu próprio turno — ver consumirAcaoCombate, que recorre a
    // acoesGuardadas quando `acoes` já está zerado, e
    // checarConsumoDeAcao em ficha.js, que libera a rolagem fora do
    // turno quando há acoesGuardadas disponíveis. Se o Mestre rejeitar,
    // nada muda — as ações que sobraram simplesmente se perdem, igual
    // já acontecia antes dessa funcionalidade existir.
    if (participantes[turnoAtual]) {
        const acoesSobrando = Number(participantes[turnoAtual].acoes) || 0;
        if (acoesSobrando > 0) {
            const nomeQuemEncerrou = participantes[turnoAtual].nome || turnoAtual;
            await criarAcaoPendente({
                tipo: "guardar_acao_combate",
                fichaId: turnoAtual,
                nomeJogador: nomeQuemEncerrou,
                detalhe: `${nomeQuemEncerrou} encerrou o turno com ${acoesSobrando} ação(ões) sobrando. Guardar para usar fora do turno?`,
                payload: { participanteId: turnoAtual, quantidade: acoesSobrando }
            });
        }
    }

    if (virouRodada) {
        atualizacoes.rodada = (rodada || 1) + 1;
    }

    // Tick System (Sangramento e outros efeitos por turno): processa os
    // status de quem está prestes a agir ANTES do recálculo de PV/
    // Velocidade/estado de saúde logo abaixo — assim o dano do tick já
    // entra nesse mesmo recálculo, e não só na próxima troca de turno.
    let notasStatus = [];
    if (participantes[novoTurno]) {
        const { statusFinal, notas } = await processarStatusInicioTurno(novoTurno, participantes[novoTurno]);
        if (statusFinal) {
            atualizacoes[`participantes/${novoTurno}/statusAtivos`] = statusFinal;
            // Já aplicado direto no nó da ficha/NPC por aplicarDano() lá
            // dentro — refletir aqui também pra não ler o PV velho da
            // rodada passada no loop de recálculo abaixo.
            participantes[novoTurno] = { ...participantes[novoTurno], statusAtivos: statusFinal };
        }
        notasStatus = notas;
    }

    // Regra da "iniciativa travada" (ver iniciarIniciativaCombate e
    // adicionarParticipanteCombate): quem tirou 1 no d20 da iniciativa
    // perdeu o turno que está terminando agora (ficou com 0 ações,
    // travado, sem poder agir). Ao encerrar esse turno — ou seja, agora,
    // na troca pra quem vem a seguir — rerrola o d20 dele. Se tirar 1 de
    // novo, o próximo turno dele TAMBÉM fica travado; senão, destrava
    // (some o iniciativaTravada) e a fila inteira é reordenada com a
    // nova iniciativa. `novoTurno` já foi decidido acima a partir da
    // ordem ATUAL da fila, então reordenar aqui não atropela quem é o
    // próximo a agir agora — só muda a partir de onde a fila continua
    // dali pra frente.
    let precisaReordenarFila = false;
    if (participantes[turnoAtual] && participantes[turnoAtual].iniciativaTravada) {
        const travado = participantes[turnoAtual];
        const novaRolagem = rolarD20();
        const bonusCQCAtual = travado.bonusCQCIniciativa ? 1 : 0;
        const bonusCobraKaiAtual = Number(travado.bonusCobraKaiIniciativa) || 0;
        const novaIniciativa = novaRolagem + (Number(travado.modAgilidade) || 0) + bonusCQCAtual + bonusCobraKaiAtual;
        const aindaTravado = novaRolagem === 1;
        atualizacoes[`participantes/${turnoAtual}/rolagemBruta`] = novaRolagem;
        atualizacoes[`participantes/${turnoAtual}/iniciativa`] = novaIniciativa;
        atualizacoes[`participantes/${turnoAtual}/iniciativaTravada`] = aindaTravado;
        // Atualiza a cópia local também, pra tanto o recálculo de ações
        // do loop abaixo (que usa Math.min contra o valor atual de
        // `acoes`) quanto o reordenamento da fila usarem o valor novo.
        participantes[turnoAtual] = { ...travado, rolagemBruta: novaRolagem, iniciativa: novaIniciativa, iniciativaTravada: aindaTravado, acoes: aindaTravado ? 0 : travado.acoesMax };
        precisaReordenarFila = true;
        notasStatus = [
            ...notasStatus,
            `${travado.nome} tinha perdido o turno (rolou 1 na iniciativa) e rerrolou ao encerrá-lo: novo resultado ${novaRolagem}, iniciativa ${novaIniciativa}.${aindaTravado ? " Tirou 1 de novo — perde o próximo turno também." : " Destravado, volta a agir normalmente no próximo turno."}`
        ];
    }

    // Mesma combinação Godmode + "ignorar penalidade de saúde" usada em
    // iniciarIniciativaCombate — recalcular tem que respeitar o mesmo
    // Godmode que já vale pro resto do combate.
    const [snapGodmode, snapIgnorarSaude] = await Promise.all([
        get(ref(db, caminhoMesa("godmode"))),
        get(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")))
    ]);
    const godmodeAtivo = snapGodmode.exists() ? !!snapGodmode.val() : false;
    const ignorarPenalidadeSaude = godmodeAtivo && (snapIgnorarSaude.exists() ? !!snapIgnorarSaude.val() : false);

    for (const id of ordemTurnos) {
        if (!participantes[id]) continue;
        const statsAtualizados = await calcularStatsCombateParticipante(participantes[id], ignorarPenalidadeSaude);
        const acoesMaxAtualizado = calcularAcoesMax(statsAtualizados.velocidade);
        atualizacoes[`participantes/${id}/modAgilidade`] = statsAtualizados.modAgilidade;
        atualizacoes[`participantes/${id}/velocidade`] = statsAtualizados.velocidade;
        atualizacoes[`participantes/${id}/pv`] = statsAtualizados.pv;
        atualizacoes[`participantes/${id}/pvMax`] = statsAtualizados.pvMax;
        atualizacoes[`participantes/${id}/estadoSaude`] = statsAtualizados.estadoSaude;
        atualizacoes[`participantes/${id}/estadoSaudeLabel`] = statsAtualizados.estadoSaudeLabel;
        atualizacoes[`participantes/${id}/energia`] = statsAtualizados.energia;
        atualizacoes[`participantes/${id}/energiaMax`] = statsAtualizados.energiaMax;
        atualizacoes[`participantes/${id}/estadoEnergia`] = statsAtualizados.estadoEnergia;
        atualizacoes[`participantes/${id}/estadoEnergiaLabel`] = statsAtualizados.estadoEnergiaLabel;
        atualizacoes[`participantes/${id}/acoesMax`] = acoesMaxAtualizado;
        // Rodada virando: reseta pro novo máximo cheio (comportamento de
        // sempre). Meio da rodada: só TRAVA o contador de ações restantes
        // no novo teto se ele tiver caído (ex: tinha 3/3 guardadas,
        // machucou e o novo máximo é 1 — trava em 1); nunca aumenta o
        // que já foi gasto de volta.
        atualizacoes[`participantes/${id}/acoes`] = virouRodada
            ? acoesMaxAtualizado
            : Math.min(Number(participantes[id].acoes) || 0, acoesMaxAtualizado);
        // CQC nível 5: mesma lógica de reset/trava do `acoes` normal,
        // só que baseada em acoesExtraCQCMax (0 pra quem não tem o
        // nível — nunca escreve nada além de 0 nesse caso).
        const acoesExtraCQCMax = Number(participantes[id].acoesExtraCQCMax) || 0;
        if (acoesExtraCQCMax > 0) {
            atualizacoes[`participantes/${id}/acoesExtraCQC`] = virouRodada
                ? acoesExtraCQCMax
                : Math.min(Number(participantes[id].acoesExtraCQC) || 0, acoesExtraCQCMax);
        }
    }

    if (precisaReordenarFila) {
        atualizacoes.ordemTurnos = ordenarPorIniciativa(participantes);
    }

    await update(ref(db, caminhoMesa("combateAtivo")), atualizacoes);

    for (const nota of notasStatus) {
        await registrarRolagem({ quem: "Tick de status", modificador: 0, resultado: nota, detalhe: nota });
    }

    return { turnoAtual: novoTurno, nome: (participantes[novoTurno] && participantes[novoTurno].nome) || novoTurno, notasStatus };
}

// Consome 1 ação do turno do participante (chamar isso na hora de uma
// rolagem/ataque durante o combate ativo). Nunca deixa negativo.
export async function consumirAcaoCombate(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoes`));
    const snap = await get(caminho);
    const atual = snap.exists() ? Number(snap.val()) : 0;

    if (atual > 0) {
        const novo = atual - 1;
        await set(caminho, novo);
        return novo;
    }

    // Sem ação do turno atual sobrando: tenta gastar de uma ação
    // guardada (ver "guardar_acao_combate" em avancarTurnoCombate/
    // confirmarAcaoPendente) — é isso que permite ao personagem agir
    // fora do seu próprio turno, desde que o Mestre já tenha aprovado
    // guardar a ação antes. Se também não houver ação guardada, não faz
    // nada (mesmo comportamento de antes: nunca fica negativo).
    const caminhoGuardadas = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoesGuardadas`));
    const snapGuardadas = await get(caminhoGuardadas);
    const guardadasAtual = snapGuardadas.exists() ? Number(snapGuardadas.val()) : 0;
    if (guardadasAtual > 0) {
        await set(caminhoGuardadas, guardadasAtual - 1);
    }
    return 0;
}

// Consome 1 ação EXTRA de CQC (nível 5, "Agente Impossível" — manual:
// "recebe uma ação extra em seu turno para rolagens de CQC"). Separada
// de consumirAcaoCombate porque essa ação só serve pra rolagens
// especificamente de CQC (ver checarConsumoDeAcao/ehCQC em ficha.js,
// que só recorre a este contador quando o normal já zerou) — nunca é
// somada ao `acoes` normal, senão viraria uma ação genérica igual
// qualquer outra. Nunca deixa negativo.
export async function consumirAcaoExtraCQC(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoesExtraCQC`));
    const snap = await get(caminho);
    const atual = snap.exists() ? Number(snap.val()) : 0;
    const novo = Math.max(0, atual - 1);
    await set(caminho, novo);
    return novo;
}

// Marca que o "Disparar e Avançar" de CQC nível 4 (ver iniciarIniciativaCombate
// acima, que reserva a ação) já foi usado nesta rodada — chamado por
// resolverDispararAvancar em ficha.js depois de resolver os 2 disparos,
// só pra sumir com o botão (a ação em si já tinha sido descontada na
// hora de rolar a iniciativa, não aqui).
export async function marcarDispararAvancarUsado(participanteId) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/dispararAvancarUsado`)), true);
}

// Reseta o Recuo de UMA arma específica de UM personagem/NPC específico
// (combateAtivo/disparosPorFicha/{idDisparo}/{itemId}) — chamado assim
// que a ação de disparo é efetivamente gasta (consumida na hora ou
// validada depois pelo Mestre, ver confirmarAcaoPendente abaixo).
// Regra: dá pra puxar o gatilho até 3 vezes por ação (mais, com
// especializações que aumentem esse limite); o modificador de Recuo só
// vale pros disparos SUBSEQUENTES dentro da MESMA sequência de disparos
// de UMA ação — uma vez que a ação acaba (é gasta), a próxima sequência
// de disparos (próxima ação) começa do zero, sem penalidade.
export async function resetarRecuoArma(idDisparo, itemId) {
    if (!idDisparo || !itemId) return;
    await remove(ref(db, caminhoMesa(`combateAtivo/disparosPorFicha/${idDisparo}/${itemId}`)));
}

// Usa UMA das ações de Esquiva/Bloqueio guardadas do alvo pra anular (ou
// reduzir) um golpe recebido (manual: "no seu turno, você tem uma ação
// de bloqueio/esquiva que fica guardada para quando receber um golpe").
// Só funciona se houver ao menos 1 disponível no estoque (o alvo já
// teve seu turno nesta rodada, ou usou a manobra "Esquivar" no próprio
// turno pra guardar uma extra — ver adicionarEsquivaExtra). Cada golpe
// recebido consome no máximo 1 do estoque, nunca mais — mesmo tendo 2+
// esquivas guardadas, um único golpe só "gasta" uma; o resto fica
// guardado pro PRÓXIMO golpe que vier a acertar o personagem (isso já
// é garantido pela própria mecânica: responderReacaoPendente só chama
// esta função uma vez por golpe). Retorna true se conseguiu consumir
// (golpe anulado/reduzido) ou false se o alvo não tinha nenhuma
// esquiva guardada.
export async function usarEsquivaBloqueio(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/esquivasDisponiveis`));
    const snap = await get(caminho);
    const disponivel = snap.exists() ? Number(snap.val()) || 0 : 0;
    if (disponivel <= 0) return false;
    await set(caminho, disponivel - 1);
    return true;
}

// Concede uma esquiva extra guardada a um participante quando ele usa a
// manobra "Esquivar" no próprio turno (ver renderizarManobrasCombate em
// ficha.js), em vez de só contar com a guarda automática de fim de
// turno. Empilha em cima do que já estiver guardado — permite anular
// mais de um golpe recebido na mesma rodada (cada golpe ainda consome
// só 1, ver usarEsquivaBloqueio).
export async function adicionarEsquivaExtra(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/esquivasDisponiveis`));
    const snap = await get(caminho);
    const atual = snap.exists() ? Number(snap.val()) || 0 : 0;
    const novo = atual + 1;
    await set(caminho, novo);
    return novo;
}

// ---------------------------------------------------------------------
// Contra-ataque imediato do Aparar (manual: "pode atacar imediatamente
// com modificador -1"). Fica guardado por participante — quem aparou
// tem até seu próximo ataque (não precisa esperar o próprio turno) pra
// usá-lo; ficha.js consome isso sozinho no fluxo normal de "Usar" arma,
// aplicando o modificador e mirando automaticamente em quem atacou.
// ---------------------------------------------------------------------
export async function definirContraAtaquePendente(participanteId, dados) {
    await set(ref(db, caminhoMesa(`combateAtivo/contraAtaquePendente/${participanteId}`)), dados);
}

export async function consumirContraAtaquePendente(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/contraAtaquePendente/${participanteId}`));
    const snap = await get(caminho);
    if (!snap.exists()) return null;
    await remove(caminho);
    return snap.val();
}

// ---------------------------------------------------------------------
// Agarrar (manual: "impossibilita golpes de alcance médio e longo e
// reduz pela metade os danos da vítima"). Fica guardado no próprio
// participante agarrado — ficha.js consulta isso pra bloquear golpes de
// alcance médio/longo da vítima e pra cortar o dano dela pela metade
// enquanto durar. Sem mecânica de "quebrar o agarrão" definida no
// manual além disso, então é solto manualmente (Mestre ou a própria
// vítima) — ver soltarAgarrado.
// ---------------------------------------------------------------------
export async function definirAgarrado(participanteId, porPid, porNome) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/agarrado`)), { ativo: true, porPid, porNome });
}

export async function soltarAgarrado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/agarrado`)));
}

// ---------------------------------------------------------------------
// Derrubar (manual: "derruba; dificuldade pra ser acertado diminuída em
// -3 e tem de gastar uma ação para se levantar"). Fica guardado no
// próprio participante derrubado — resolverAtaque desconta -3 da
// dificuldade de quem tenta acertá-lo enquanto durar, e "Levantar" (ver
// consumirAcaoCombate em ficha.js) gasta 1 ação do turno da vítima pra
// remover o status. `porPid`/`porNome` só ficam registrados pra
// referência no Log/badge, igual Agarrar.
// ---------------------------------------------------------------------
export async function definirDerrubado(participanteId, porPid, porNome) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/derrubado`)), { ativo: true, porPid, porNome });
}

export async function levantarDerrubado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/derrubado`)));
}

// ---------------------------------------------------------------------
// Imobilizar (CQC nível 4, manual pg. 23: "Após derrubar pode imobilizar
// o alvo, impedindo completamente ataques e movimentação [...] Para o
// alvo se livrar, teste Destreza, dif igual ao valor do agente CQC no
// teste de derrubar"). Usamos o resultado do próprio teste de Imobilizar
// (não o de Derrubar de antes, que o manual não deixa claro se ainda
// está disponível pra referência) como essa dificuldade de escape —
// guardado em `dificuldadeEscape` na hora de imobilizar (ver
// resolverImobilizar em ficha.js). Igual a Agarrar/Derrubar: fica
// guardado no próprio participante, sem mecânica de "quebrar"
// automática além do teste de Destreza no próprio turno da vítima (ver
// tentarLibertarImobilizado em ficha.js). Diferente de Agarrar, o
// bloqueio é TOTAL — resolverAtaque nega QUALQUER golpe de quem estiver
// imobilizado, não só alcance médio/longo.
// ---------------------------------------------------------------------
export async function definirImobilizado(participanteId, porPid, porNome, dificuldadeEscape) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/imobilizado`)), { ativo: true, porPid, porNome, dificuldadeEscape });
}

export async function soltarImobilizado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/imobilizado`)));
}

// ---------------------------------------------------------------------
// Desacordado (Jiu Jitsu nível 3, manual pg. 22: "Ao vencer no teste
// disputado [de Imobilizar], a vítima é desacordada se for da vontade
// do usuário"). Diferente de Imobilizado, é inconsciência de verdade:
// bloqueia tudo igual (ver checagem em resolverAtaque, mesmo padrão de
// meuStatusImobilizado), mas o manual não dá à vítima nenhum teste pra
// se libertar sozinha — por isso não guarda `dificuldadeEscape` nem tem
// um "tentarLibertar" equivalente; só volta com soltarDesacordado, de
// dentro do Gerenciador de Combate do Mestre (botão "Acordar").
// ---------------------------------------------------------------------
export async function definirDesacordado(participanteId, porPid, porNome) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/desacordado`)), { ativo: true, porPid, porNome });
}

export async function soltarDesacordado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/desacordado`)));
}

// ---------------------------------------------------------------------
// Ossos quebrados (Jiu Jitsu níveis 4/5, manual pg. 22: "Com o alvo
// imobilizado, [...] reduz em um/dois pontos qualquer ação física e
// caso seja em um membro inferior, impossibilita correr. Caso ambas
// pernas sejam quebradas, apenas pode se arrastar, testando Tolerância,
// dificuldade 15"). O dano em si é aplicado direto via aplicarDano (ver
// resolverQuebrarOssosJiuJitsu em ficha.js) — isso aqui só guarda o
// status textual/contador pra exibir como badge (🦴) no Gerenciador de
// Combate; a penalidade de "-X em qualquer ação física" e o "só se
// arrasta" ficam com o Mestre aplicar manualmente (o sistema não tem
// uma trava genérica de penalidade por participante pra testes físicos
// de terceiros — só o dono da ficha calcula o próprio estado de saúde/
// energia), igual a outras notas só-narrativas do CQC nível 4.
// ---------------------------------------------------------------------
export async function definirOssosQuebrados(participanteId, { pontosPenalidade, membroInferior, porNome }) {
    const caminho = caminhoMesa(`combateAtivo/participantes/${participanteId}/ossosQuebrados`);
    const snap = await get(ref(db, caminho));
    const atual = snap.exists() ? snap.val() : { pernasQuebradas: 0 };
    const pernasQuebradas = Math.min(2, (Number(atual.pernasQuebradas) || 0) + (membroInferior ? 1 : 0));
    await set(ref(db, caminho), {
        ativo: true,
        pontosPenalidade: Math.max(Number(atual.pontosPenalidade) || 0, Number(pontosPenalidade) || 0),
        pernasQuebradas,
        arrastaSomente: pernasQuebradas >= 2,
        porNome
    });
}

export async function curarOssosQuebrados(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/ossosQuebrados`)));
}

// ---------------------------------------------------------------------
// Delimitar alcance / Retomar alcance (manual): a vítima só pode usar
// golpes do alcance escolhido pelo atacante (exceto Médio, que sempre
// pode ser usado "de perto", a metade do dano — ver checagem em
// ficha.js). `pontuacao` é o resultado do teste de Delimitar alcance
// que valeu — é a dificuldade que Retomar alcance precisa bater pra
// remover a limitação (manual: "dificuldade igual à pontuação da
// delimitação de alcance colocada pelo adversário").
// ---------------------------------------------------------------------
export async function definirAlcanceLimitado(participanteId, dados) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/alcanceLimitado`)), { ativo: true, ...dados });
}

export async function soltarAlcanceLimitado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/alcanceLimitado`)));
}

// ---------------------------------------------------------------------
// Reação pendente (Esquiva/Bloqueio) — quem escolhe é quem RECEBE o
// golpe, não quem ataca. Como os dois jogadores estão em telas/sessões
// diferentes, a escolha não pode ser um prompt() síncrono na tela de
// quem atacou (aquilo fazia o ATACANTE responder no lugar do alvo).
// Em vez disso: o ataque, ao acertar um alvo com esquivasDisponiveis > 0,
// grava aqui tudo que falta pra fechar o golpe (dano já calculado, sem
// aplicar ainda) — visível em tempo real pra todo mundo via
// ouvirCombateAtivo(). A UI do jogador-alvo (ou do Mestre, se o alvo
// for NPC) mostra um modal com as opções assim que detectar que
// `participanteId` bate com ele, e chama responderReacaoPendente().
// ---------------------------------------------------------------------
export async function abrirReacaoPendente(dados) {
    await set(ref(db, caminhoMesa("combateAtivo/reacaoPendente")), { ...dados, timestamp: Date.now() });
}

// escolha: "esquivar" | "bloquear" | "aparar" | "nenhuma".
// "esquivar" anula o golpe (dano 0). "bloquear" reduz o dano pela
// metade, exceto se o tipo de dano for perfurante (comum ou especial),
// que ignora bloqueio. "aparar" é a única que exige teste: `dadosExtra`
// já vem com o resultado da rolagem (feita no cliente de quem defende,
// que tem acesso aos próprios dados/perícias) — dificuldade = pontuação
// do atacante no teste de ataque (r.resultadoAtaque, manual). Sucesso
// anula o golpe (como Esquivar) E guarda um contra-ataque imediato
// (modificador -1) pro personagem que aparou, contra quem atacou (ver
// definirContraAtaquePendente/consumirContraAtaquePendente). Todas as
// três (exceto "nenhuma") consomem a ação de Esquiva/Bloqueio guardada.
// "nenhuma" (ou a ação já ter sido gasta antes de responder) deixa
// passar o golpe cheio e NÃO consome a ação guardada.
export async function responderReacaoPendente(escolha, dadosExtra = null) {
    const snap = await get(ref(db, caminhoMesa("combateAtivo/reacaoPendente")));
    if (!snap.exists()) return null;
    const r = snap.val();

    // Não dá pra esquivar/aparar de tiro (só de golpes corpo a corpo/
    // arma branca) — a UI já não oferece os botões "Esquivar"/"Aparar"
    // quando o golpe veio de arma de fogo (r.ehArmaFogo), mas
    // revalidamos aqui também pra não dar pra burlar chamando esta
    // função diretamente.
    if ((escolha === "esquivar" || escolha === "aparar") && r.ehArmaFogo) {
        escolha = "nenhuma";
    }
    // Manual: "não é possível aparar ataques de armas brancas estando
    // desarmado" — revalida no servidor (mesma regra já aplicada na UI,
    // que só oferece perícias desarmadas quando o golpe recebido não é
    // de arma branca).
    if (escolha === "aparar" && r.ataqueArmaBranca && dadosExtra && !PERICIAS_ARMA_BRANCA.includes(dadosExtra.periciaEscolhida)) {
        escolha = "nenhuma";
    }

    let consumiu = false;
    if (escolha === "esquivar" || escolha === "bloquear" || escolha === "aparar") {
        consumiu = await usarEsquivaBloqueio(r.participanteId);
    }

    let danoParaAplicar = r.danoTotal;
    let notaEscolha;
    let apararConseguiu = false;
    if (escolha === "esquivar" && consumiu && dadosExtra) {
        // Esquivar (manual): teste de Agilidade vs. dificuldade = a
        // pontuação do ataque sofrido (r.resultadoAtaque) — mesmo
        // padrão de "aparar" logo abaixo. dadosExtra já vem calculado
        // do lado do cliente (ver calcularModEsquivarParticipante em
        // ficha.js), com o bônus de Boxe (+2 desarmado/+1 arma branca)
        // já embutido no modDado quando aplicável.
        const { brutoDado, modDado, resultadoDado } = dadosExtra;
        const esquivouConseguiu = resultadoDado >= r.resultadoAtaque;
        const detalheDado = `d20 (${brutoDado}) ${modDado >= 0 ? "+" : ""}${modDado} = ${resultadoDado}`;
        if (esquivouConseguiu) {
            danoParaAplicar = 0;
            notaEscolha = `${r.nomeAlvo} ESQUIVOU (${detalheDado}) vs. ${r.resultadoAtaque} do ataque — ANULOU o golpe.`;
        } else {
            notaEscolha = `${r.nomeAlvo} tentou ESQUIVAR (${detalheDado}) vs. ${r.resultadoAtaque} do ataque — FALHOU. Ação guardada consumida mesmo assim.`;
        }
    } else if (escolha === "bloquear" && consumiu) {
        if (r.tipoDanoKey === "perfuracao_comum" || r.tipoDanoKey === "perfuracao_especial") {
            notaEscolha = `${r.nomeAlvo} tentou BLOQUEAR, mas dano perfurante não é reduzido por bloqueio. Ação guardada consumida mesmo assim.`;
        } else if (r.bloqueioForcaBruta && r.bloqueioForcaBruta.impossivel) {
            // Força Bruta nível 5 (manual pg. 22): "não é possível
            // bloquear golpes" — passa o dano cheio mesmo assim, a ação
            // guardada é consumida do mesmo jeito que uma tentativa
            // fracassada de bloquear dano perfurante logo acima.
            notaEscolha = `${r.nomeAlvo} tentou BLOQUEAR, mas esse golpe veio de Força Bruta nível 5 — impossível bloquear. Ação guardada consumida mesmo assim.`;
        } else if (r.bloqueioForcaBruta && r.bloqueioForcaBruta.fracaoDanoRestante) {
            // Força Bruta nível 4 (manual pg. 22): "bloquear seus golpes
            // diminui apenas em 1/4 o dano" — em vez da metade normal.
            danoParaAplicar = Math.floor(danoParaAplicar * r.bloqueioForcaBruta.fracaoDanoRestante);
            notaEscolha = `${r.nomeAlvo} usou a ação guardada pra BLOQUEAR, mas esse golpe veio de Força Bruta nível 4 — só reduziu 1/4 do dano.`;
        } else {
            danoParaAplicar = Math.floor(danoParaAplicar / 2);
            notaEscolha = `${r.nomeAlvo} usou a ação guardada pra BLOQUEAR e reduziu o dano pela metade.`;
        }
    } else if (escolha === "aparar" && consumiu && dadosExtra) {
        const { periciaEscolhida, brutoDado, modDado, resultadoDado } = dadosExtra;
        apararConseguiu = resultadoDado >= r.resultadoAtaque;
        const detalheDado = `d20 (${brutoDado}) ${modDado >= 0 ? "+" : ""}${modDado} = ${resultadoDado}`;
        if (apararConseguiu) {
            danoParaAplicar = 0;
            notaEscolha = `${r.nomeAlvo} APAROU com ${periciaEscolhida} (${detalheDado}) vs. ${r.resultadoAtaque} do ataque — ANULOU o golpe e pode contra-atacar imediatamente (modificador -1).`;
            if (r.atacanteTipo && r.atacanteRefId && r.atacantePid) {
                await definirContraAtaquePendente(r.participanteId, {
                    contraAlvoPid: r.atacantePid,
                    contraAlvoTipo: r.atacanteTipo,
                    contraAlvoRefId: r.atacanteRefId,
                    contraAlvoNome: r.nomeAtacante,
                    modificador: -1
                });
            }
        } else {
            notaEscolha = `${r.nomeAlvo} tentou APARAR com ${periciaEscolhida} (${detalheDado}) vs. ${r.resultadoAtaque} do ataque — FALHOU. Ação guardada consumida mesmo assim.`;
        }
    } else {
        notaEscolha = `${r.nomeAlvo} não usou Esquiva/Bloqueio/Aparar e recebeu o golpe cheio.`;
    }

    // Golpes Mirados (manual): a redução de armadura do alvo só conta
    // itens de Proteção cujo localProtegido bate com o local mirado
    // (r.localArmaduraAtual — ver LOCAIS_MIRA em dados-manual.js/
    // resolverAtaque em ficha.js). Ausente (reação antiga, de antes
    // dessa mudança) cai em `null`, preservando o comportamento antigo
    // de não filtrar por local.
    const resultadoDano = await aplicarDano(r.alvoTipo, r.alvoRefId, danoParaAplicar, r.tipoDanoKey, r.localArmaduraAtual ?? null, r.ignorarArmaduraPontos ?? 0);

    // Golpes Mirados (manual): Golpe Perfurante testa Sangramento, Golpe
    // Cortante aplica obrigatoriamente a regra de Amputação, e Golpe
    // Contundente na Cabeça agrava o teste de Desmaio — só quando o
    // golpe teve um local mirado de verdade (não "Padrão", que o manual
    // define como "sem efeitos extras") e causou dano de verdade. Tiro
    // de arma de fogo nunca passa por aqui (ver comentário abaixo), só
    // golpes corpo a corpo/arma branca que atravessaram a reação.
    //
    // Teste de Desmaio (regra padrão da mesa, não automatizado — o
    // sistema só anota o aviso pro Mestre resolver): pra ACORDAR de um
    // desmaio, quando não houver outra regra mais específica pro caso
    // (ex.: Desacordado do Jiu Jitsu nível 3, que o manual já diz que
    // NÃO tem teste pra se libertar sozinho — ver definirDesacordado
    // acima), o padrão é um teste de Constituição, dificuldade 15. O
    // agravante de +4 do golpe contundente na Cabeça soma em cima dessa
    // base (dificuldade 19 no total).
    let notaSangramento = "";
    let notaEfeitoLocal = "";
    if (danoParaAplicar > 0 && r.localMiraKey && r.localMiraKey !== "padrao") {
        if (ehDanoPerfurante(r.tipoDanoKey) && r.regraSangramentoLocal) {
            const resultadoSangramento = await testarSangramento(r.participanteId, r.constituicaoAlvo, r.nivelArma, danoParaAplicar, r.regraSangramentoLocal);
            if (resultadoSangramento) notaSangramento = ` ${resultadoSangramento.detalhe}`;
        }
        if (ehDanoCortante(r.tipoDanoKey)) {
            notaEfeitoLocal += ` ⚠️ Golpe cortante mirado em ${r.localMiraLabel || "local específico"}: aplica-se a regra de Amputação (resolva com o Mestre).`;
        }
        if (ehDanoContundente(r.tipoDanoKey) && r.localMiraKey === "cabeca") {
            notaEfeitoLocal += ` ⚠️ Golpe contundente na Cabeça: +4 na dificuldade do teste de Desmaio do alvo — teste de Constituição, dificuldade ${dificuldadeDesmaio(4)} (base ${DIFICULDADE_BASE_DESMAIO} +4 da Cabeça), pra acordar (resolva com o Mestre).`;
        }
    }

    // Nenhum tratamento de Sangramento/Amputação/Desmaio de tiro aqui:
    // disparo de arma de fogo não pode ser esquivado, aparado NEM
    // bloqueado (manual) — por isso resolverAtaque (ficha.js) nunca abre
    // esta reação pendente pra um tiro (r.ehArmaFogo nunca chega true
    // neste ponto). O teste de Sangramento de um tiro na Cabeça
    // acontece direto no caminho sem reação, logo depois de aplicarDano
    // — ver testarSangramento acima.

    // r.danoTotal já chega dobrado do Acerto Crítico (ver resolverAtaque
    // em ficha.js, que dobra ANTES de abrir a reação pendente) — aqui só
    // repetimos a nota textual pro Log e sinalizamos critico:"acerto"
    // pro destaque visual, sem mexer de novo no valor do dano.
    const efeitoTexto = r.efeitoTexto || "";
    const danoDadoTexto = r.danoDadoTexto || "";
    const notaCritico = r.notaCritico || "";
    const notaLocalMira = r.notaLocalMira || "";
    const detalheRolagemTexto = r.detalheRolagem ? `\n${r.detalheRolagem}` : "";
    const detalheDano = resultadoDano.reducao > 0
        ? `${r.nomeAtacante} atacou ${r.nomeAlvo} com ${r.nomeArma}. ACERTO! vs. dificuldade ${r.dificuldade}.${notaLocalMira} ${notaEscolha} Dano${danoDadoTexto}: ${resultadoDano.danoBruto} (${r.tipoDanoLabel}) - ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} de dano aplicado.${notaCritico} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaSangramento}${notaEfeitoLocal}${detalheRolagemTexto}`
        : `${r.nomeAtacante} atacou ${r.nomeAlvo} com ${r.nomeArma}. ACERTO! vs. dificuldade ${r.dificuldade}.${notaLocalMira} ${notaEscolha} Dano${danoDadoTexto}: ${resultadoDano.danoFinal} (${r.tipoDanoLabel}) aplicado.${notaCritico} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaSangramento}${notaEfeitoLocal}${detalheRolagemTexto}`;

    await registrarRolagem({ quem: r.nomeAtacante, modificador: r.modAtaque, resultado: resultadoDano.danoFinal, detalhe: detalheDano, critico: r.criticoPositivo ? "acerto" : null });
    await remove(ref(db, caminhoMesa("combateAtivo/reacaoPendente")));
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
                await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/limpo`)), { valor: atual + ganhoFixo });
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
        await set(ref(db, caminhoMesa("popupTreinamento")), Object.fromEntries(popups.map((p, i) => [`p${i}_${Date.now()}`, { ...p, timestamp: Date.now() }])));
    }

    return { calendario, virouDomingo, popups };
}

export function ouvirPopupTreinamento(callback) {
    return onValue(ref(db, caminhoMesa("popupTreinamento")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

export async function confirmarAvancoTreinamento(fichaId, popupId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}`)));
    if (!snap.exists()) return [];
    const ficha = snap.val();
    if (!ficha.treinamento) return [];
    const concluidos = avancarUmDiaTreinamento(ficha);
    await update(ref(db, caminhoMesa(`fichas/${fichaId}`)), { treinamento: ficha.treinamento, dados: ficha.dados, pericias: ficha.pericias });
    if (popupId) await remove(ref(db, caminhoMesa(`popupTreinamento/${popupId}`)));
    return concluidos;
}

export async function descartarPopupTreinamento(popupId) {
    await remove(ref(db, caminhoMesa(`popupTreinamento/${popupId}`)));
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
    if (ehIdSaldoDeItem(saldoId)) {
        const itemId = idItemDoSaldo(saldoId);
        const item = (fichaAtual.inventario && fichaAtual.inventario[itemId]) || { saldoValor: 0 };
        const atual = Number(item.saldoValor) || 0;
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}`)), { saldoValor: atual - total });
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), { ultimoPagamentoCustoVida: Date.now() });
        return total;
    }
    const saldo = (fichaAtual.saldos && fichaAtual.saldos[saldoId]) || { valor: 0 };
    const atual = Number(saldo.valor) || 0;
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}`)), { valor: atual - total });
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), { ultimoPagamentoCustoVida: Date.now() });
    return total;
}

// ---------------------------------------------------------------------
// Sistema de Aprovação do Mestre — nenhuma ação "destrutiva" do jogador
// (remover item, mudar categoria, gastar dinheiro, dar item pra outro
// jogador) acontece na hora. Ela entra numa fila compartilhada, o
// Mestre vê em tempo real e só executa de fato quando confirma.
// ---------------------------------------------------------------------
export function ouvirAcoesPendentes(callback) {
    return onValue(ref(db, caminhoMesa("acoesPendentes")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0)));
    });
}

// tipo: "remover_item" | "mover_item" | "gastar_dinheiro" | "mover_dinheiro" | "dar_item"
export async function criarAcaoPendente({ tipo, fichaId, nomeJogador, detalhe, payload }) {
    const novaRef = push(ref(db, caminhoMesa("acoesPendentes")));
    await set(novaRef, { tipo, fichaId, nomeJogador: nomeJogador || fichaId, detalhe: detalhe || "", payload: payload || {}, criadoEm: Date.now() });
    return novaRef.key;
}

export async function rejeitarAcaoPendente(acaoId) {
    await remove(ref(db, caminhoMesa(`acoesPendentes/${acaoId}`)));
}

// Executa de fato a ação pendente no banco e remove da fila. Só deve
// ser chamada pelo Mestre (a UI já restringe isso).
export async function confirmarAcaoPendente(acao) {
    const { tipo, fichaId, payload } = acao;

    if (tipo === "remover_item") {
        await remove(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));

    } else if (tipo === "mover_item") {
        const dadosMover = { categoria: payload.categoriaNova };
        // Arma que sai de "Levando consigo" não pode continuar equipada
        // (ver itemPodeUsar/itemPodeEquipar em inventario.js).
        if (payload.categoriaNova !== "levando") dadosMover.equipada = false;
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)), dadosMover);

    } else if (tipo === "gastar_dinheiro") {
        const saldoId = payload.saldoId;
        if (ehIdSaldoDeItem(saldoId)) {
            const itemId = idItemDoSaldo(saldoId);
            const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}/saldoValor`)));
            const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}`)), { saldoValor: atual - Number(payload.valor || 0) });
        } else {
            const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}/valor`)));
            const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}`)), { valor: atual - Number(payload.valor || 0) });
        }

    } else if (tipo === "mover_dinheiro") {
        // Move um valor de um saldo pra outro da MESMA ficha — soma da
        // ficha não muda, só a distribuição entre saldos (ex.: tirar
        // dinheiro da carteira digital e guardar no cofre do
        // esconderijo). Mesma infra de leitura/escrita do gastar_dinheiro
        // acima, aplicada duas vezes (subtrai na origem, soma no destino);
        // cada lado pode ser um saldo normal (fichaAtual.saldos) ou a
        // carteira digital de um item (ver ehIdSaldoDeItem/idItemDoSaldo).
        const valor = Number(payload.valor || 0);
        const origemId = payload.saldoOrigemId;
        const destinoId = payload.saldoDestinoId;

        if (ehIdSaldoDeItem(origemId)) {
            const itemId = idItemDoSaldo(origemId);
            const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}/saldoValor`)));
            const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}`)), { saldoValor: atual - valor });
        } else {
            const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${origemId}/valor`)));
            const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${origemId}`)), { valor: atual - valor });
        }

        if (ehIdSaldoDeItem(destinoId)) {
            const itemId = idItemDoSaldo(destinoId);
            const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}/saldoValor`)));
            const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}`)), { saldoValor: atual + valor });
        } else {
            const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${destinoId}/valor`)));
            const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${destinoId}`)), { valor: atual + valor });
        }

    } else if (tipo === "dar_item") {
        const snapItem = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));
        if (snapItem.exists()) {
            const item = snapItem.val();
            const novaRefItem = push(ref(db, caminhoMesa(`fichas/${payload.fichaDestinoId}/inventario`)));
            await set(novaRefItem, { ...item, categoria: "levando" });
            await remove(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));
        }

    } else if (tipo === "gastar_acao_combate") {
        // Toda rolagem em combate com iniciativa ativo pede aprovação do
        // Mestre antes de gastar a ação do turno (o dado já foi rolado e
        // registrado no Log na hora — só o CONSUMO da ação espera o
        // Mestre confirmar). Rejeitar a pendência simplesmente não gasta
        // a ação, sem desfazer a rolagem já registrada.
        // CQC nível 5: se a rolagem usou a ação extra (payload.extraCQC,
        // ver checarConsumoDeAcao em ficha.js), o gasto vai pro contador
        // separado acoesExtraCQC, não pro `acoes` normal.
        if (payload.extraCQC && payload.participanteId) {
            await consumirAcaoExtraCQC(payload.participanteId);
        } else if (payload.participanteId) {
            await consumirAcaoCombate(payload.participanteId);
        }
        // Se essa ação validada era um disparo de arma de fogo, a ação
        // acaba de ser efetivamente gasta — reseta o Recuo dessa arma
        // (ver resetarRecuoArma acima) pra que o PRÓXIMO disparo (já
        // numa ação nova) comece sem penalidade acumulada.
        if (payload.ehArmaFogo && payload.idDisparo && payload.itemIdDisparo) {
            await resetarRecuoArma(payload.idDisparo, payload.itemIdDisparo);
        }

    } else if (tipo === "guardar_acao_combate") {
        // Confirma o pedido criado em avancarTurnoCombate: converte as
        // ações do turno que sobraram em "ações guardadas"
        // (acoesGuardadas), somando ao que já estiver guardado (dá pra
        // acumular de rodada em rodada se o Mestre for aprovando).
        // Zera `acoes` porque elas já viraram guardadas — sem isso o
        // contador normal do turno passado ficaria contando pra sempre
        // além do que a rodada atual permite.
        const participanteId = payload.participanteId;
        const quantidade = Number(payload.quantidade) || 0;
        if (participanteId && quantidade > 0) {
            const caminhoGuardadas = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoesGuardadas`));
            const snapGuardadas = await get(caminhoGuardadas);
            const guardadasAtual = snapGuardadas.exists() ? Number(snapGuardadas.val()) : 0;
            await set(caminhoGuardadas, guardadasAtual + quantidade);
            await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoes`)), 0);
        }
    }

    await remove(ref(db, caminhoMesa(`acoesPendentes/${acao.id}`)));
}
