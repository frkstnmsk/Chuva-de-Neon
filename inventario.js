// =====================================================================
// CHUVA DE NEON — Inventário (tags, peso/carga, categorias, armas)
// =====================================================================

import {
    TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS,
    ehArma, ehCarregador, ehProjetil, ehContainer, tagTemNivel, rotuloTag, calibresCompativeis
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

// Item "equipável": armas SEMPRE são (ehArma(tag)), e qualquer outro
// item pode ganhar a mesma trava marcando o checkbox "Item equipável"
// no modal (item.equipavel) — mesmo mecanismo do inventário: precisa
// estar "Levando consigo" E equipado pra poder ser "usado".
export function itemEhEquipavel(item) {
    return ehArma(item.tag) || !!item.equipavel;
}

export function itemPodeUsar(item) {
    // Regra de ouro do inventário: só dá pra "usar" item/arma que está
    // na categoria "levando consigo". Itens equipáveis (armas ou
    // qualquer item marcado como tal — ver itemEhEquipavel acima) têm
    // uma trava a mais: precisam estar EQUIPADOS (item.equipada) —
    // carregar algo na mochila não é o mesmo que estar com ele
    // equipado e pronto pra usar. É o que permite a manobra "Desarmar"
    // ter algo de verdade pra tirar do alvo (ver resolverDesarmar em
    // ficha.js — continua restrito a armas de verdade lá). Itens não
    // equipáveis (kit médico, gadgets, etc.) não passam por essa
    // trava — só precisam estar "levando consigo".
    if (item.categoria !== "levando") return false;
    if (itemEhEquipavel(item) && !item.equipada) return false;
    return true;
}

// Só faz sentido equipar/desequipar um item equipável (arma ou
// qualquer item marcado como tal) que está "levando consigo" (não dá
// pra equipar algo que ficou em casa).
export function itemPodeEquipar(item) {
    return itemEhEquipavel(item) && item.categoria === "levando";
}

// Um carregador "anexado" (dentro de uma arma) some da lista principal
// do inventário — ele deixou de ser um item solto pra virar parte da
// arma. Continua existindo normalmente nos dados (fichaAtual.inventario),
// só não aparece mais na lista; a munição dele é mostrada junto da
// própria arma. Percorre todas as armas do inventário procurando qual
// delas tem esse carregador anexado (arma.carregadorId).
export function carregadorEstaAnexado(fichaAtual, carregadorId) {
    if (!carregadorId) return false;
    return Object.values(fichaAtual.inventario || {})
        .some(it => ehArma(it.tag) && it.arma && it.arma.carregadorId === carregadorId);
}

export function listaArmasInventario(fichaAtual) {
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => ehArma(it.tag))
        .map(([id, it]) => ({ id, ...it }));
}

// Carregadores/projéteis do inventário de um determinado calibre — usado
// pra popular o select de "Carregador anexado" na arma e pra encontrar
// projéteis compatíveis na hora de "Carregar" um carregador. Passa pelo
// grupo de calibres compatíveis (calibresCompativeis) em vez de exigir
// igualdade exata — pra calibre comum isso não muda nada (o grupo é só
// ele mesmo), mas pra calibre de escopeta (12 gauge) faz buckshot e
// slug casarem com a mesma arma/carregador.
export function listaCarregadoresInventario(fichaAtual, calibre) {
    const compat = calibre ? calibresCompativeis(calibre) : null;
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => ehCarregador(it.tag) && (!compat || compat.includes(it.calibre)))
        .map(([id, it]) => ({ id, ...it }));
}

export function listaProjeteisInventario(fichaAtual, calibre) {
    const compat = calibre ? calibresCompativeis(calibre) : null;
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => ehProjetil(it.tag) && (!compat || compat.includes(it.calibre)))
        .map(([id, it]) => ({ id, ...it }));
}

// =====================================================================
// Itens-recipiente (ex: mochila) — outros itens guardados "dentro"
// (item.dentroDe = id do item-recipiente). Um item recipiente some da
// hierarquia (não pode virar filho de si mesmo nem de um dos seus
// próprios descendentes) — verificado por itemDescendeDe abaixo antes
// de deixar o jogador escolher onde guardar algo no modal.
// =====================================================================

// Itens que estão guardados dentro de um recipiente específico.
export function itensDentroDe(fichaAtual, containerId) {
    if (!containerId) return [];
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => it.dentroDe === containerId)
        .map(([id, it]) => ({ id, ...it }));
}

// Sobe a cadeia de "dentroDe" a partir de itemId — true se em algum
// ponto encontrar possivelAncestralId (inclusive o próprio itemId).
// Usado pra impedir guardar um recipiente dentro de si mesmo ou dentro
// de algo que já está guardado dentro dele (ciclo).
export function itemDescendeDe(fichaAtual, itemId, possivelAncestralId) {
    if (!itemId || !possivelAncestralId) return false;
    let atualId = itemId;
    let guarda = 0; // trava de segurança contra loop infinito por dado corrompido
    while (atualId && guarda < 100) {
        if (atualId === possivelAncestralId) return true;
        const atual = (fichaAtual.inventario || {})[atualId];
        atualId = atual ? atual.dentroDe : null;
        guarda++;
    }
    return false;
}

// Recipientes disponíveis pra guardar um item dentro — todos os
// recipientes da ficha, de qualquer categoria (guardar um item move ele
// pra categoria do recipiente automaticamente — ver salvarItemDoModal e
// o select-guardar-dentro em ficha.js), menos os que formariam um ciclo
// (não pode ser o próprio item sendo editado nem um descendente dele).
export function listaContainersDisponiveis(fichaAtual, idItemAtual) {
    return Object.entries(fichaAtual.inventario || {})
        .filter(([id, it]) =>
            ehContainer(it.tag) &&
            id !== idItemAtual &&
            !(idItemAtual && itemDescendeDe(fichaAtual, id, idItemAtual))
        )
        .map(([id, it]) => ({ id, ...it }));
}

export { TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS, ehArma, ehCarregador, ehProjetil, ehContainer, tagTemNivel, rotuloTag };
