// =====================================================================
// CHUVA DE NEON — Level Up
// =====================================================================
// Modal inadiável de 3 passos ao atingir a XP necessária:
// 1) alocar 1 ponto em atributo
// 2) rolar dado de vida extra (automático, baseado na Constituição)
// 3) liberar 2 pontos de perícia
//
// O estado fica em fichaAtual.levelUpPendente, sincronizado no Firebase,
// pra sobreviver a um reload de página no meio do processo.

import { xpNecessariaProximoNivel, rolarDadoVida, MAX_ATRIBUTO_JOGO } from "./regras.js";

export function precisaSubirNivel(fichaAtual) {
    const xp = Number(fichaAtual.dados.xp) || 0;
    const nivel = Number(fichaAtual.dados.nivel) || 1;
    return xp >= xpNecessariaProximoNivel(nivel);
}

export function iniciarLevelUpSeNecessario(fichaAtual) {
    if (fichaAtual.levelUpPendente && fichaAtual.levelUpPendente.ativo) return true;
    if (precisaSubirNivel(fichaAtual)) {
        fichaAtual.levelUpPendente = { ativo: true, passo: 1, pontosAtributo: 1, pontosPericia: 2, dadoVidaRolado: null };
        return true;
    }
    return false;
}

export function confirmarPassoAtributo(fichaAtual, atributoKey) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 1) return;
    // Trava de novo aqui (não só no botão desabilitado da UI) — mesmo
    // padrão já usado em gastarPontoPericiaLevelUp pro limite de perícia.
    if ((Number(fichaAtual.dados[atributoKey]) || 0) >= MAX_ATRIBUTO_JOGO) return;
    fichaAtual.dados[atributoKey] = (Number(fichaAtual.dados[atributoKey]) || 0) + 1;
    lvl.passo = 2;
}

export function executarPassoDadoVida(fichaAtual) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 2) return null;
    const constituicao = Number(fichaAtual.dados.constituicao) || 0;
    const resultado = rolarDadoVida(constituicao);
    lvl.dadoVidaRolado = resultado;
    // PV atual sobe junto com o máximo (o jogador "ganhou" PV de verdade).
    const pvAtualAntes = fichaAtual.dados.pvAtual;
    if (pvAtualAntes !== null && pvAtualAntes !== undefined) {
        fichaAtual.dados.pvAtual = Number(pvAtualAntes) + resultado.total;
    }
    lvl.passo = 3;
    return resultado;
}

// Gasta 1 ponto de perícia do Level Up na perícia identificada por
// `nome` (não por id): se o personagem já tem essa perícia, incrementa
// o nível existente; senão, cria uma entrada nova com nível 1. Isso
// permite escolher qualquer perícia do manual no Level Up, não só as
// que já estão na ficha (mesmo comportamento do wizard de criação e do
// Treinamento, que também deixam escolher perícias novas por nome).
export function gastarPontoPericiaLevelUp(fichaAtual, nome, gerarId) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 3 || lvl.pontosPericia <= 0) return false;
    const entrada = Object.entries(fichaAtual.pericias).find(([, p]) => p.nome === nome);
    if (entrada) {
        const [, p] = entrada;
        if (p.nivel >= 5) return false; // limite geral de perícia (0-5) já validado em ficha.js
        p.nivel += 1;
    } else {
        const id = gerarId();
        fichaAtual.pericias[id] = { nome, nivel: 1, descricao: "", modificadores: [], legado: false };
    }
    lvl.pontosPericia -= 1;
    return true;
}

export function finalizarLevelUp(fichaAtual) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 3 || lvl.pontosPericia > 0) return false;
    fichaAtual.dados.nivel = (Number(fichaAtual.dados.nivel) || 1) + 1;
    fichaAtual.dados.xp = (Number(fichaAtual.dados.xp) || 0) - xpNecessariaProximoNivel(Number(fichaAtual.dados.nivel) - 1);
    if (fichaAtual.dados.xp < 0) fichaAtual.dados.xp = 0;
    fichaAtual.levelUpPendente = null;
    return true;
}
