// =====================================================================
// CHUVA DE NEON — Treinamento / Estudo
// =====================================================================
// O jogador escolhe simultaneamente: 1 perícia física, 1 perícia mental,
// 1 atributo físico e 1 atributo mental pra treinar. Cada característica
// tem seu próprio contador de progresso em dias. O Mestre avança esse
// progresso manualmente (com confirmação, via popup) ao clicar "Passar
// o Dia" no calendário.

import {
    ATRIBUTOS_FISICOS_TREINO, ATRIBUTOS_MENTAIS_TREINO,
    tempoTreinoAtributo, tempoTreinoPericia
} from "./regras.js";
import { listaPericiasPorCategoria } from "./dados-manual.js";
import { ATRIBUTOS_PRIMARIOS } from "./regras.js";

export function estadoInicialTreinamento() {
    return { ativo: false, periciaFisica: null, periciaMental: null, atributoFisico: null, atributoMental: null };
}

export function labelAtributo(key) {
    const a = ATRIBUTOS_PRIMARIOS.find(a => a.key === key);
    return a ? a.label : key;
}

export function opcoesAtributoFisico() {
    return ATRIBUTOS_PRIMARIOS.filter(a => ATRIBUTOS_FISICOS_TREINO.includes(a.key));
}

export function opcoesAtributoMental() {
    return ATRIBUTOS_PRIMARIOS.filter(a => ATRIBUTOS_MENTAIS_TREINO.includes(a.key));
}

export function opcoesPericiaFisica() {
    return listaPericiasPorCategoria("fisica");
}

// Perícias mentais e sociais contam pra "perícia mental" de treino? O
// manual só fala em "perícias mentais" — usamos a categoria Mental.
export function opcoesPericiaMental() {
    return listaPericiasPorCategoria("mental");
}

// Inicia o treino de uma característica, calculando o total de dias
// necessário a partir do NOVO nível (nível atual + 1). Retorna false (e
// não inicia nada) se a característica já está no limite máximo.
export function iniciarTreinoCaracteristica(fichaAtual, tipo, chave) {
    const treino = fichaAtual.treinamento;
    if (tipo === "periciaFisica" || tipo === "periciaMental") {
        const pericia = Object.entries(fichaAtual.pericias).find(([, p]) => p.nome === chave);
        const nivelAtual = pericia ? pericia[1].nivel : 0;
        if (nivelAtual >= 5) return false;
        const novoNivel = nivelAtual + 1;
        treino[tipo] = { nome: chave, nivelAtual, novoNivel, progressoDias: 0, totalDias: tempoTreinoPericia(novoNivel) };
    } else if (tipo === "atributoFisico" || tipo === "atributoMental") {
        const nivelAtual = Number(fichaAtual.dados[chave]) || 0;
        if (nivelAtual >= 7) return false;
        const novoNivel = nivelAtual + 1;
        treino[tipo] = { nome: chave, nivelAtual, novoNivel, progressoDias: 0, totalDias: tempoTreinoAtributo(novoNivel) };
    }
    treino.ativo = temAlgumTreinoAtivo(treino);
    return true;
}

export function cancelarTreinoCaracteristica(fichaAtual, tipo) {
    fichaAtual.treinamento[tipo] = null;
    fichaAtual.treinamento.ativo = temAlgumTreinoAtivo(fichaAtual.treinamento);
}

function temAlgumTreinoAtivo(treino) {
    return !!(treino.periciaFisica || treino.periciaMental || treino.atributoFisico || treino.atributoMental);
}

// Chamado pelo Mestre (após confirmar no popup) — avança +1 dia em TODAS
// as características em treino dessa ficha, e aplica o aumento quando o
// progresso bate o total.
export function avancarUmDiaTreinamento(fichaAtual) {
    const treino = fichaAtual.treinamento;
    const tipos = ["periciaFisica", "periciaMental", "atributoFisico", "atributoMental"];
    const concluidos = [];

    for (const tipo of tipos) {
        const t = treino[tipo];
        if (!t) continue;
        t.progressoDias += 1;
        if (t.progressoDias >= t.totalDias) {
            aplicarAumentoCaracteristica(fichaAtual, tipo, t);
            concluidos.push({ tipo, nome: t.nome, novoNivel: t.novoNivel });
            treino[tipo] = null;
        }
    }
    treino.ativo = temAlgumTreinoAtivo(treino);
    return concluidos;
}

function aplicarAumentoCaracteristica(fichaAtual, tipo, t) {
    if (tipo === "periciaFisica" || tipo === "periciaMental") {
        const entrada = Object.entries(fichaAtual.pericias).find(([, p]) => p.nome === t.nome);
        if (entrada) {
            const [, pericia] = entrada;
            pericia.nivel = Math.min(5, t.novoNivel); // respeita limite geral 0-5
        }
    } else {
        const atual = Number(fichaAtual.dados[t.nome]) || 0;
        fichaAtual.dados[t.nome] = Math.max(atual, Math.min(7, t.novoNivel)); // respeita limite humano 7
    }
}
