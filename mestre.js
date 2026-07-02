// =====================================================================
// CHUVA DE NEON — Painel exclusivo do Mestre
// =====================================================================
// Tudo que só o Mestre pode fazer: dar XP, ativar godmode (ignora a
// trava de edição), rolar dado, causar dano, gerenciar NPCs, avançar o
// dia (com a regra de Domingo) e confirmar avanço de treinamento.

import { db } from "./firebase-config.js";
import { ref, set, get, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { rolarD20, rolarDado } from "./regras.js";
import { registrarRolagem, passarUmDia, dispararAvisoCustoVida } from "./calendario.js";
import { avancarUmDiaTreinamento } from "./treinamento.js";
import { calcularSecundariosNpc } from "./npc-detalhado.js";

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
    }

    await remove(ref(db, `acoesPendentes/${acao.id}`));
}
