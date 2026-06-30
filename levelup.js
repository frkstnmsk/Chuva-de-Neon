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

import { xpNecessariaProximoNivel, rolarDadoVida } from "./regras.js";

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

export function gastarPontoPericiaLevelUp(fichaAtual, periciaId) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 3 || lvl.pontosPericia <= 0) return false;
    const p = fichaAtual.pericias[periciaId];
    if (!p) return false;
    if (p.nivel >= 5) return false; // limite geral de perícia (0-5) já validado em ficha.js
    p.nivel += 1;
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
