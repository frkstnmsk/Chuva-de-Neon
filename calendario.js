// =====================================================================
// CHUVA DE NEON — Calendário e Log de Dados (estado global da mesa)
// =====================================================================
// Diferente da ficha (que é por jogador), o calendário e o log de dados
// vivem na raiz do banco (`calendario`, `logDados`), compartilhados por
// todos que estão olhando a tela — Mestre e jogadores.

import { db } from "./firebase-config.js";
import { ref, set, get, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CLIMAS = ["Limpo", "Nublado", "Chuva ácida", "Garoa de neon", "Smog", "Tempestade elétrica", "Calor sufocante"];

export function diasSemana() { return DIAS_SEMANA; }
export function climas() { return CLIMAS; }

export async function garantirCalendarioInicial(isMestre) {
    try {
        const snap = await get(ref(db, caminhoMesa("calendario")));
        if (!snap.exists() && isMestre) {
            // Data de partida fixa da campanha: Sexta-feira, 29/10/2077.
            await set(ref(db, caminhoMesa("calendario")), {
                dataLabel: "29/10/2077",
                diaSemana: "Sexta",
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
    return onValue(ref(db, caminhoMesa("calendario")), (snap) => {
        callback(snap.exists() ? snap.val() : null);
    });
}

export async function salvarCalendario(novoCalendario) {
    await set(ref(db, caminhoMesa("calendario")), novoCalendario);
}

// Avança 1 dia. Retorna { calendario, viroudomingo }.
export async function passarUmDia(calendarioAtual) {
    const idxAtual = DIAS_SEMANA.indexOf(calendarioAtual.diaSemana);
    const novoIdx = (idxAtual + 1) % 7;
    const novoCalendario = {
        ...calendarioAtual,
        diaSemana: DIAS_SEMANA[novoIdx],
        diaIndice: (calendarioAtual.diaIndice || 0) + 1,
        dataLabel: avancarDataLabel(calendarioAtual.dataLabel)
    };
    await salvarCalendario(novoCalendario);
    return { calendario: novoCalendario, virouDomingo: novoIdx === 0 };
}

// Avança 1 dia numa data no formato "DD/MM/AAAA", lidando com virada de
// mês e de ano (considerando anos bissextos). Se o formato vier
// inesperado/vazio, devolve a string original sem quebrar o calendário.
function avancarDataLabel(dataLabel) {
    if (!dataLabel || typeof dataLabel !== "string") return dataLabel;
    const partes = dataLabel.split("/");
    if (partes.length !== 3) return dataLabel;

    let [dia, mes, ano] = partes.map(n => parseInt(n, 10));
    if (Number.isNaN(dia) || Number.isNaN(mes) || Number.isNaN(ano)) return dataLabel;

    const diasNoMes = new Date(ano, mes, 0).getDate(); // dia 0 do próximo mês = último dia deste mês
    dia += 1;
    if (dia > diasNoMes) {
        dia = 1;
        mes += 1;
        if (mes > 12) {
            mes = 1;
            ano += 1;
        }
    }

    const pad = n => String(n).padStart(2, "0");
    return `${pad(dia)}/${pad(mes)}/${ano}`;
}

// ---------------------------------------------------------------------
// Log de dados — visível por todos, fixo no canto inferior direito.
// Guardamos só as últimas N entradas pra não inchar o banco.
// ---------------------------------------------------------------------
const LIMITE_LOG = 30;

export async function registrarRolagem({ quem, modificador, resultado, detalhe }) {
    await push(ref(db, caminhoMesa("logDados")), {
        quem, modificador: modificador ?? 0, resultado, detalhe: detalhe || "", timestamp: Date.now()
    });
}

export function ouvirLogDados(callback) {
    const q = query(ref(db, caminhoMesa("logDados")), limitToLast(LIMITE_LOG));
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
    await set(ref(db, caminhoMesa("avisoCustoVida")), { ativo: true, timestamp: Date.now() });
}

export function ouvirAvisoCustoVida(callback) {
    return onValue(ref(db, caminhoMesa("avisoCustoVida")), (snap) => {
        callback(snap.exists() ? snap.val() : null);
    });
}

export async function limparAvisoCustoVida() {
    await set(ref(db, caminhoMesa("avisoCustoVida")), { ativo: false, timestamp: Date.now() });
}
