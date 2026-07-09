// =====================================================================
// CHUVA DE NEON — Inventário (tags, peso/carga, categorias, armas)
// =====================================================================

import {
    TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS,
    ehArma, ehCarregador, ehProjetil, tagTemNivel, rotuloTag
} from "./dados-manual.js";
import { calcularCarga } from "./regras.js";

const CATEGORIAS_FIXAS = [
    { id: "levando", nome: "Levando consigo", fixa: true },
    { id: "casa", nome: "Em casa", fixa: true }
];

export function listaCategorias(fichaAtual) {
    const custom = Object.keys(fichaAtual.categoriasInventario || {}).map(id => ({
        id, nome: fichaAtual.categoriasInventario[id].nome, fixa: false
    }));
    return [...CATEGORIAS_FIXAS, ...custom];
}

export function nomeCategoria(fichaAtual, categoriaId) {
    const todas = listaCategorias(fichaAtual);
    const achada = todas.find(c => c.id === categoriaId);
    return achada ? achada.nome : categoriaId;
}

export function criarCategoriaCustom(fichaAtual, nome) {
    const id = "cat_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    if (!fichaAtual.categoriasInventario) fichaAtual.categoriasInventario = {};
    fichaAtual.categoriasInventario[id] = { nome };
    return id;
}

export function pesoTotalPorCategoria(fichaAtual, categoriaId) {
    const itens = Object.values(fichaAtual.inventario || {});
    return itens
        .filter(it => it.categoria === categoriaId)
        .reduce((acc, it) => acc + (Number(it.peso) || 0), 0);
}

// Carga só considera o peso do que está "Levando consigo" — é o que
// pesa fisicamente no personagem; o que fica em casa não conta.
// Modificadores do alvo "carga_extra" (vantagens, especializações, etc)
// somam ao limite base calculado pela Constituição.
export function calcularCargaAtual(fichaAtual, modificadoresPlanos = []) {
    const constituicao = Number(fichaAtual.dados.constituicao) || 0;
    const pesoLevando = pesoTotalPorCategoria(fichaAtual, "levando");
    const base = calcularCarga(constituicao, pesoLevando);
    const bonusExtra = modificadoresPlanos
        .filter(m => m.alvo === "carga_extra")
        .reduce((acc, m) => acc + m.valor, 0);
    const limiteFinal = base.limite + bonusExtra;
    const pct = limiteFinal > 0 ? pesoLevando / limiteFinal : 0;
    let penalidadeVelocidade = 0;
    if (pct > 0.9) penalidadeVelocidade = -3;
    else if (pct > 0.75) penalidadeVelocidade = -2;
    else if (pct > 0.6) penalidadeVelocidade = -1;
    return {
        limite: limiteFinal,
        limiteBase: base.limite,
        bonusExtra,
        pesoTotal: pesoLevando,
        percentual: limiteFinal > 0 ? (pesoLevando / limiteFinal) * 100 : 0,
        penalidadeVelocidade
    };
}

export function itemPodeUsar(item) {
    // Regra de ouro do inventário: só dá pra "usar" item/arma que está
    // na categoria "levando consigo".
    return item.categoria === "levando";
}

export function listaArmasInventario(fichaAtual) {
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => ehArma(it.tag))
        .map(([id, it]) => ({ id, ...it }));
}

// Carregadores/projéteis do inventário de um determinado calibre — usado
// pra popular o select de "Carregador anexado" na arma e pra encontrar
// projéteis compatíveis na hora de "Carregar" um carregador.
export function listaCarregadoresInventario(fichaAtual, calibre) {
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => ehCarregador(it.tag) && (!calibre || it.classeProtecao === calibre))
        .map(([id, it]) => ({ id, ...it }));
}

export function listaProjeteisInventario(fichaAtual, calibre) {
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => ehProjetil(it.tag) && (!calibre || it.classeProtecao === calibre))
        .map(([id, it]) => ({ id, ...it }));
}

export { TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS, ehArma, ehCarregador, ehProjetil, tagTemNivel, rotuloTag };
