// =====================================================================
// CHUVA DE NEON — Criação de Personagem (wizard)
// =====================================================================
// Implementa a "regra de ouro": o jogador só toca em pontos de atributo
// e perícia durante este wizard (ou em Level Up / Treinamento). Depois
// de "criacao.concluida = true", os campos de atributo primário e
// perícia ficam travados pro jogador na ficha normal.

import {
    ATRIBUTOS_PRIMARIOS
} from "./regras.js";
import {
    FUNCOES, listaFuncoes, PERICIAS_MANUAL, listaPericiasPorCategoria,
    CATEGORIAS_PERICIA, buscarPericiaPorNome
} from "./dados-manual.js";

const MAX_ATRIBUTO_CRIACAO = 5;
const MAX_PERICIA_CRIACAO = 3;
const PONTOS_ATRIBUTOS_BASE = 7;
const PONTOS_PERICIAS_BASE = 5;
const PONTOS_DETERMINACAO = 3;
const PONTOS_POR_DESVANTAGEM = 3;
const MAX_PONTOS_DESVANTAGENS = 9;

// ---------------------------------------------------------------------
// Estado do wizard. Tudo isso fica em fichaAtual.criacao, sincronizado
// no Firebase como qualquer outro campo (assim o jogador pode fechar a
// aba no meio da criação e continuar depois).
// ---------------------------------------------------------------------
export function estadoInicialCriacao() {
    return {
        etapa: 1, // 1 = função, 2 = atributos, 3 = perícias, 4 = perícias de função, 5 = desvantagens/bônus, 6 = revisão
        funcaoEscolhida: "",
        escolhaAtributoFuncao: "", // pra Mercador: "carisma" ou "manipulacao"
        pontosAtributosRestantes: PONTOS_ATRIBUTOS_BASE,
        pontosPericiasRestantes: PONTOS_PERICIAS_BASE,
        pontosFuncaoRestantes: 0,
        pontosBonusDesvantagens: 0,
        concluida: false
    };
}

export function funcaoDe(key) {
    return FUNCOES[key] || null;
}

// Aplica os atributos fixos + pontos livres de função, retornando o total
// de pontos de atributo disponíveis nesta criação (base 7 + bônus de função).
export function calcularPontosAtributoTotais(funcaoKey) {
    const f = funcaoDe(funcaoKey);
    if (!f) return PONTOS_ATRIBUTOS_BASE;
    return PONTOS_ATRIBUTOS_BASE + (f.pontosLivresAtributo || 0);
}

// Zera os atributos e aplica os fixos da função escolhida (chamar 1x ao
// confirmar a função, antes do jogador distribuir os pontos livres).
export function aplicarAtributosFixosFuncao(fichaAtual, funcaoKey, escolhaGrupo) {
    const f = funcaoDe(funcaoKey);
    for (const a of ATRIBUTOS_PRIMARIOS) fichaAtual.dados[a.key] = 0;
    if (!f) return;
    for (const [attr, pts] of Object.entries(f.atributosFixos || {})) {
        fichaAtual.dados[attr] = (fichaAtual.dados[attr] || 0) + pts;
    }
    if (f.atributosEscolha && escolhaGrupo) {
        fichaAtual.dados[escolhaGrupo] = (fichaAtual.dados[escolhaGrupo] || 0) + f.atributosEscolha.pontos;
    }
}

export function aplicarItemPericiaInicialFuncao(fichaAtual, funcaoKey) {
    const f = funcaoDe(funcaoKey);
    if (!f) return;
    // Perícia "de fábrica" (ex: Piloto ganha Dirigir Veículos 2 sem gastar
    // os pontos de escolha de função).
    for (const [nomePericia, nivel] of Object.entries(f.periciasFixas || {})) {
        const idExistente = Object.keys(fichaAtual.pericias).find(id => fichaAtual.pericias[id].nome === nomePericia);
        if (idExistente) {
            fichaAtual.pericias[idExistente].nivel = Math.max(fichaAtual.pericias[idExistente].nivel, nivel);
        } else {
            const id = gerarIdLocal();
            fichaAtual.pericias[id] = { nome: nomePericia, nivel, descricao: "", modificadores: [], legado: false };
        }
    }
}

function gerarIdLocal() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

// Opções de perícia válidas pros pontos exclusivos de função.
export function opcoesPericiaFuncao(funcaoKey) {
    const f = funcaoDe(funcaoKey);
    if (!f || !f.periciasEscolha) return [];
    const esc = f.periciasEscolha;
    if (esc.opcoes) return esc.opcoes.map(nome => buscarPericiaPorNome(nome)).filter(Boolean);
    if (esc.categoriaOpcoes) return listaPericiasPorCategoria(esc.categoriaOpcoes);
    return PERICIAS_MANUAL; // qualquer perícia (caso do Piloto, "onde quiser")
}

export function pontosFuncaoDe(funcaoKey) {
    const f = funcaoDe(funcaoKey);
    return f && f.periciasEscolha ? f.periciasEscolha.pontos : 0;
}

// ---------------------------------------------------------------------
// Validação de limites (criação): atributo ≤ 5, perícia ≤ 3.
// (Limites diferentes do jogo em andamento, que usa 7 e 5 — ver README.)
// ---------------------------------------------------------------------
export function validarLimiteAtributoCriacao(valor) {
    return Math.max(0, Math.min(MAX_ATRIBUTO_CRIACAO, valor));
}

export function validarLimitePericiaCriacao(valor) {
    return Math.max(0, Math.min(MAX_PERICIA_CRIACAO, valor));
}

export const LIMITES_CRIACAO = {
    maxAtributo: MAX_ATRIBUTO_CRIACAO,
    maxPericia: MAX_PERICIA_CRIACAO,
    pontosAtributosBase: PONTOS_ATRIBUTOS_BASE,
    pontosPericiasBase: PONTOS_PERICIAS_BASE,
    pontosDeterminacao: PONTOS_DETERMINACAO,
    pontosPorDesvantagem: PONTOS_POR_DESVANTAGEM,
    maxPontosDesvantagens: MAX_PONTOS_DESVANTAGENS
};

// Pontos bônus liberados pelas desvantagens já escolhidas nesta ficha
// (3 por desvantagem, até 9 no total — manual pg. 19).
export function pontosBonusPorDesvantagens(fichaAtual) {
    const qtd = Object.keys(fichaAtual.desvantagens || {}).length;
    return Math.min(qtd * PONTOS_POR_DESVANTAGEM, MAX_PONTOS_DESVANTAGENS);
}

export { listaFuncoes, CATEGORIAS_PERICIA, listaPericiasPorCategoria };
