// =====================================================================
// CHUVA DE NEON — Calendário e Log de Dados (estado global da mesa)
// =====================================================================
// Diferente da ficha (que é por jogador), o calendário e o log de dados
// vivem na raiz do banco (`calendario`, `logDados`), compartilhados por
// todos que estão olhando a tela — Mestre e jogadores.

import { db } from "./firebase-config.js";
import { ref, set, get, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CLIMAS = ["Limpo", "Nublado", "Chuva ácida", "Garoa de neon", "Smog", "Tempestade elétrica", "Calor sufocante"];

export function diasSemana() { return DIAS_SEMANA; }
export function climas() { return CLIMAS; }

export async function garantirCalendarioInicial(isMestre) {
    try {
        const snap = await get(ref(db, "calendario"));
        if (!snap.exists() && isMestre) {
            const hoje = new Date();
            await set(ref(db, "calendario"), {
                dataLabel: "01/01/2077",
                diaSemana: DIAS_SEMANA[hoje.getDay()],
                hora: "08:00",
                temperatura: 24,
                clima: CLIMAS[0],
                diaIndice: 0
            });
        }
    } catch (e) {
        // Jogadores podem não ter permissão de leitura do calendário ainda
        // (se as regras do banco não cobrirem esse nó). Falha silenciosa é ok.
        console.warn("Calendário: sem permissão ou nó inexistente.", e.message);
    }
}

export function ouvirCalendario(callback) {
    return onValue(ref(db, "calendario"), (snap) => {
        callback(snap.exists() ? snap.val() : null);
    });
}

export async function salvarCalendario(novoCalendario) {
    await set(ref(db, "calendario"), novoCalendario);
}

// Avança 1 dia. Retorna { calendario, viroudomingo }.
export async function passarUmDia(calendarioAtual) {
    const idxAtual = DIAS_SEMANA.indexOf(calendarioAtual.diaSemana);
    const novoIdx = (idxAtual + 1) % 7;
    const novoCalendario = {
        ...calendarioAtual,
        diaSemana: DIAS_SEMANA[novoIdx],
        diaIndice: (calendarioAtual.diaIndice || 0) + 1
    };
    await salvarCalendario(novoCalendario);
    return { calendario: novoCalendario, virouDomingo: novoIdx === 0 };
}

// ---------------------------------------------------------------------
// Log de dados — visível por todos, fixo no canto inferior direito.
// Guardamos só as últimas N entradas pra não inchar o banco.
// ---------------------------------------------------------------------
const LIMITE_LOG = 30;

export async function registrarRolagem({ quem, modificador, resultado, detalhe }) {
    await push(ref(db, "logDados"), {
        quem, modificador: modificador ?? 0, resultado, detalhe: detalhe || "", timestamp: Date.now()
    });
}

export function ouvirLogDados(callback) {
    const q = query(ref(db, "logDados"), limitToLast(LIMITE_LOG));
    return onValue(q, (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        const lista = Object.entries(valores)
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.timestamp - a.timestamp);
        callback(lista);
    });
}

// ---------------------------------------------------------------------
// Aviso de custo de vida (disparado quando o dia avança pra Domingo).
// ---------------------------------------------------------------------
export async function dispararAvisoCustoVida() {
    await set(ref(db, "avisoCustoVida"), { ativo: true, timestamp: Date.now() });
}

export function ouvirAvisoCustoVida(callback) {
    return onValue(ref(db, "avisoCustoVida"), (snap) => {
        callback(snap.exists() ? snap.val() : null);
    });
}

export async function limparAvisoCustoVida() {
    await set(ref(db, "avisoCustoVida"), { ativo: false, timestamp: Date.now() });
}
