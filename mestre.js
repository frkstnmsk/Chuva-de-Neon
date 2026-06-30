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
// Causar dano — subtrai PV atual de um jogador ou NPC.
// ---------------------------------------------------------------------
export async function causarDanoJogador(fichaId, valor) {
    const snap = await get(ref(db, `fichas/${fichaId}/dados/pvAtual`));
    const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
    await update(ref(db, `fichas/${fichaId}/dados`), { pvAtual: atual - Number(valor) });
}

export async function causarDanoNpc(npcId, valor) {
    const snap = await get(ref(db, `npcs/${npcId}/pvAtual`));
    const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
    await update(ref(db, `npcs/${npcId}`), { pvAtual: atual - Number(valor) });
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

export async function criarNpc({ nome, pvs, periciasResumo, itensEssenciais, atributos, atributosSecundarios }) {
    const novaRef = push(ref(db, "npcs"));
    await set(novaRef, {
        nome: nome || "NPC sem nome",
        pvs: Number(pvs) || 0,
        pvAtual: Number(pvs) || 0,
        periciasResumo: periciasResumo || "",
        itensEssenciais: itensEssenciais || "",
        atributos: atributos || "",
        atributosSecundarios: atributosSecundarios || "",
        criadoEm: Date.now()
    });
}

export async function excluirNpc(npcId) {
    await remove(ref(db, `npcs/${npcId}`));
}

// ---------------------------------------------------------------------
// Passar o Dia — avança o calendário, dispara aviso de Domingo, e
// dispara o popup de treinamento pra cada ficha com treino ativo.
// ---------------------------------------------------------------------
export async function passarODia(calendarioAtual, fichasAtivas) {
    const { calendario, virouDomingo } = await passarUmDia(calendarioAtual);

    if (virouDomingo) {
        await dispararAvisoCustoVida();
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
// Mestre ao responder o aviso de Domingo), debitando do saldo escolhido.
// ---------------------------------------------------------------------
export async function pagarCustoSemanal(fichaId, fichaAtual, origem) {
    const custoBase = custoSemanalPadraoDeVida(fichaAtual.dados.padraoDeVida);
    const extras = Object.values(fichaAtual.gastosExtras || {}).reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
    const total = custoBase + extras;
    const campo = origem === "sujo" ? "dinheiroSujo" : "dinheiroLimpo";
    const atual = Number(fichaAtual.dados[campo]) || 0;
    await update(ref(db, `fichas/${fichaId}/dados`), { [campo]: atual - total, ultimoPagamentoCustoVida: Date.now() });
    return total;
}
