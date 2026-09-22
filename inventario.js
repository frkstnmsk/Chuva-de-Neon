// =====================================================================
// CHUVA DE NEON — Inventário (tags, peso/carga, categorias, armas)
// =====================================================================

import {
    TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS,
    ehArma, ehArmaOuExplosivo, ehCarregador, ehProjetil, ehContainer, tagTemNivel, rotuloTag, calibresCompativeis,
    TAMANHOS_ITEM, rotuloTamanho, tamanhoCabe, tagTemQuantidadeGeral,
    SUBTIPOS_PORTE, rotuloSubtipoPorte, subtipoPorteOcupaMao, subtipoPorteExclusivo, itemOcupaMao
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
