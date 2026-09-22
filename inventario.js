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
    return id;
}

// =====================================================================
// Subcategorias (livres, criadas pelo jogador/Mestre) — só fazem
// sentido fora de "Levando consigo": lá a divisão já é fixa e
// automática (Mãos x Equipados — calculada de itemOcupaMao na hora de
// renderizar, ver renderizarInventario em abas/inventario.js, sem
// precisar de dado nenhum salvo). Em qualquer outra categoria ("Em
// casa" ou customizada), o jogador pode criar quantas quiser, do jeito
// que fizer sentido pra ele (por local, por urgência, etc.) — mesmo
// padrão de categoriasInventario/criarCategoriaCustom acima, só que
// chaveado também pela categoria (fichaAtual.subcategoriasInventario =
// { <categoriaId>: { <subId>: { nome } } }).
// =====================================================================

export function listaSubcategorias(fichaAtual, categoriaId) {
    const todas = (fichaAtual.subcategoriasInventario || {})[categoriaId] || {};
    return Object.keys(todas).map(id => ({ id, nome: todas[id].nome }));
}

export function nomeSubcategoria(fichaAtual, categoriaId, subcategoriaId) {
    if (!subcategoriaId) return "";
    const achada = listaSubcategorias(fichaAtual, categoriaId).find(s => s.id === subcategoriaId);
    return achada ? achada.nome : subcategoriaId;
}

export function criarSubcategoriaCustom(fichaAtual, categoriaId, nome) {
    const id = "sub_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    if (!fichaAtual.subcategoriasInventario) fichaAtual.subcategoriasInventario = {};
    if (!fichaAtual.subcategoriasInventario[categoriaId]) fichaAtual.subcategoriasInventario[categoriaId] = {};
    fichaAtual.subcategoriasInventario[categoriaId][id] = { nome };
    return id;
}

export function pesoTotalPorCategoria(fichaAtual, categoriaId) {
    const itens = Object.values(fichaAtual.inventario || {});
    return itens
        .filter(it => it.categoria === categoriaId)
        .reduce((acc, it) => acc + (Number(it.peso) || 0), 0);
}

// Peso de um item SOMADO ao de tudo que está guardado dentro dele
// (recursivo — mochila dentro de mochila, se algum dia existir). Usado
// pelos blocos "Mãos"/"Equipados" de "Levando consigo" (ver
// renderizarInventario): pesoTotalPorCategoria acima soma cada item
// individualmente não importa onde esteja aninhado (serve pro total
// da categoria/carga), mas pra mostrar "quanto pesa o que está na mão"
// vs "quanto pesa o que está equipado" precisa somar cada item de
// TOPO com tudo que carrega dentro, senão o peso do que está guardado
// numa mochila equipada não apareceria em lugar nenhum dessa conta.
export function pesoComFilhos(fichaAtual, itemId) {
    const it = (fichaAtual.inventario || {})[itemId];
    if (!it) return 0;
    let total = Number(it.peso) || 0;
    Object.entries(fichaAtual.inventario || {}).forEach(([id, filho]) => {
        if (filho.dentroDe === itemId) total += pesoComFilhos(fichaAtual, id);
    });
    return total;
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

// Item "equipável": armas e explosivos SEMPRE são (ehArmaOuExplosivo),
// e qualquer outro item pode ganhar a mesma trava marcando o checkbox
// "Item equipável" no modal (item.equipavel) — mesmo mecanismo do
// inventário: precisa estar "Levando consigo" E equipado pra poder ser
// "usado".
export function itemEhEquipavel(item) {
    return ehArmaOuExplosivo(item.tag) || !!item.equipavel;
}

// Ferramentas de criação e eletrônicos são o tipo de item que também
// faz sentido ficar parado "Em casa" e ser usado de lá direto (kit de
// bancada, notebook, PC gamer etc.) — sem precisar do vai-e-volta de
// mover pra "Levando consigo" só pra rolar e devolver depois. Arma,
// explosivo, produto químico e implante ficam de fora de propósito:
// esses têm um efeito físico/de combate que só faz sentido com o item
// realmente em mãos (ver itemPodeUsar abaixo).
const TAGS_USAVEIS_EM_CASA = ["ferramenta_criacao", "ferramenta_criacao_quimica", "ferramenta_criacao_biomecanica", "eletronico"];

export function itemPodeUsarEmCasa(item) {
    return item.categoria === "casa" && TAGS_USAVEIS_EM_CASA.includes(item.tag);
}

export function itemPodeUsar(item) {
    // Exceção: ferramenta/eletrônico "Em casa" pode ser usado direto de
    // lá (ver itemPodeUsarEmCasa acima) — pula a regra de baixo.
    if (itemPodeUsarEmCasa(item)) return true;
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

// Trava de mão (ver itemPodeSerLevadoSolto/maosDisponiveis abaixo):
// QUALQUER item comum (não-container) que está "levando consigo" pode
// ir pra uma mão do personagem — não só arma ou item marcado
// "equipável". "Equipável" (itemEhEquipavel) é uma trava SEPARADA, só
// sobre PODER USAR o item (itemPodeUsar exige equipada=true pra isso);
// um item comum sem essa marcação continua usável direto, mas ainda
// precisa de um lugar físico (mão) pra existir solto em "levando" —
// é essa segunda necessidade que esta função resolve, e por isso ela
// não olha mais pra itemEhEquipavel. Container (mochila/roupa/etc.)
// não passa por aqui — tem seu próprio fluxo de vestir/carregar (ver
// itemPodeEquiparContainer).
export function itemPodeEquipar(item) {
    return !ehContainer(item.tag) && item.categoria === "levando";
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
        .filter(([, it]) => ehArmaOuExplosivo(it.tag))
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

// Itens que estão guardados dentro de um recipiente específico. Com o
// Sistema de Slots de Porte (Fase 8), um container pode ter mais de um
// compartimento — passar compartimentoId filtra só o que está NESSE
// compartimento. Quando compartimentoId vem undefined, mantém o
// comportamento antigo: agrega tudo que está dentro do container,
// não importa o compartimento (usado em telas que só querem "o que
// tem dentro", tipo o resumo do item na lista).
export function itensDentroDe(fichaAtual, containerId, compartimentoId) {
    if (!containerId) return [];
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => it.dentroDe === containerId &&
            (compartimentoId === undefined || it.compartimentoId === compartimentoId))
        .map(([id, it]) => ({ id, ...it }));
}

// Soma o volume (item.volume) de tudo que está guardado dentro de um
// recipiente (ou, se compartimentoId for informado, só dentro DESSE
// compartimento). idExcluir tira um item específico da soma — usado
// quando o item sendo checado JÁ está guardado ali (edição: não faz
// sentido contar o volume dele duas vezes contra a própria capacidade
// do compartimento onde ele já mora).
export function volumeTotalDentroDe(fichaAtual, containerId, compartimentoId, idExcluir) {
    return itensDentroDe(fichaAtual, containerId, compartimentoId)
        .filter(it => it.id !== idExcluir)
        .reduce((acc, it) => acc + (Number(it.volume) || 0), 0);
}

// A checagem central de "cabe ou não cabe" — agora por compartimento
// específico dentro do container (Sistema de Slots de Porte, Fase 8),
// não mais por container inteiro. Duas travas independentes, na ordem
// que faz mais sentido explicar pro jogador (tamanho primeiro, é o
// motivo mais "óbvio" fisicamente; capacidade depois, é aritmética):
//   0. Compartimento precisa existir de fato no container (proteção
//      contra dado desatualizado — ex: compartimento removido depois
//      que o item já apontava pra ele).
//   1. Tamanho: item "Comprido" não entra num compartimento que só
//      aceita até "Médio", nem que sobre capacidade numérica (ver
//      tamanhoCabe em dados-manual.js).
//   2. Capacidade: soma do que já está guardado nesse compartimento +
//      o volume do item não pode passar da capacidadeVolume dele.
// Retorna { cabe, motivo } — motivo é null quando cabe, senão
// "compartimento_invalido", "tamanho" ou "capacidade" (pra montar a
// mensagem de erro certa em ficha.js).
export function itemCabeNoContainer(fichaAtual, containerId, compartimentoId, itemVolume, itemTamanho, idExcluir) {
    const container = (fichaAtual.inventario || {})[containerId];
    if (!container || !ehContainer(container.tag)) return { cabe: true, motivo: null };

    const compartimento = (container.compartimentos || []).find(c => c.id === compartimentoId);
    if (!compartimento) {
        // Mensagem amigável (seção 3.2 do doc de projeto): o compartimento
        // que esse item apontava não existe mais nesse container (foi
        // removido no modal, por ex.).
        return { cabe: false, motivo: "compartimento_invalido" };
    }

    if (!tamanhoCabe(itemTamanho, compartimento.tamanhoMaximoAceito)) {
        return { cabe: false, motivo: "tamanho" };
    }

    const capacidade = Number(compartimento.capacidadeVolume);
    if (capacidade > 0) {
        const jaOcupado = volumeTotalDentroDe(fichaAtual, containerId, compartimentoId, idExcluir);
        const volumeItem = Number(itemVolume) || 0;
        if (jaOcupado + volumeItem > capacidade) {
            return { cabe: false, motivo: "capacidade" };
        }
    }

    return { cabe: true, motivo: null };
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

// Compartimentos disponíveis pra guardar um item dentro — Sistema de
// Slots de Porte (Fase 8): agora cada container pode ter mais de um
// compartimento, então a lista é "achatada" (uma entrada por
// COMPARTIMENTO, não por container inteiro). No <select> do modal
// aparece como "Calça → Bolso frente esq.". Continua filtrando ciclos
// com itemDescendeDe (na base do containerId, não do compartimento —
// um item não pode ser guardado dentro de si mesmo nem de um
// descendente dele, não importa em qual compartimento).
export function listaContainersDisponiveis(fichaAtual, idItemAtual) {
    const containers = Object.entries(fichaAtual.inventario || {})
        .filter(([id, it]) =>
            ehContainer(it.tag) &&
            id !== idItemAtual &&
            !(idItemAtual && itemDescendeDe(fichaAtual, id, idItemAtual))
        );

    const out = [];
    for (const [containerId, container] of containers) {
        const compartimentos = listaCompartimentos(container);
        for (const comp of compartimentos) {
            out.push({
                containerId,
                containerNome: container.nome,
                compartimentoId: comp.id,
                compartimentoNome: comp.nome,
                capacidadeVolume: comp.capacidadeVolume,
                tamanhoMaximoAceito: comp.tamanhoMaximoAceito
            });
        }
    }
    return out;
}

// Helper simples — devolve os compartimentos de um item, protegendo
// contra dado antigo/corrompido que ainda não passou pela migração de
// normalizarCompartimentos (ver normalizacao.js).
export function listaCompartimentos(item) {
    return (item && item.compartimentos) || [];
}

// =====================================================================
// Sistema de Slots de Porte (Fase 8) — mãos, exclusividade de roupa/
// cinto, e a trava central de "todo item solto precisa de um lugar
// físico" (mão, corpo, ou compartimento). Ver projeto-slots-porte.txt,
// seções 3 e 3.1/3.2 pro detalhamento das regras.
// =====================================================================

// Quantas mãos livres o personagem tem agora. Base sempre 2. Cada item
// "levando consigo", equipado (item.equipada), SEM estar guardado
// dentro de outra coisa, que ocupa mão — seja QUALQUER item comum
// (arma, item marcado equipável, ou item comum qualquer segurado solto
// — ver itemPodeSerLevadoSolto) ou um container cujo subtipoPorte
// ocupa mão (só bolsa_mao hoje) — consome item.maosNecessarias
// (default 1) do total. Nunca deixa negativo (a UI trava ANTES de
// deixar equipar algo que estouraria — ver
// itemPodeEquiparContainer/seção 5.2 do doc de projeto).
export function maosDisponiveis(fichaAtual) {
    const base = 2;
    const itens = Object.entries(fichaAtual.inventario || {});
    const ocupadas = itens.reduce((acc, [id, it]) => {
        if (it.categoria !== "levando") return acc;
        if (!it.equipada) return acc;
        if (it.dentroDe) return acc;
        // Carregador anexado a uma arma virou parte dela (ver
        // carregadorEstaAnexado) — não ocupa mão própria, mesmo que
        // tenha ficado marcado como "levando"/equipado por engano (dado
        // legado); a mão gasta é só a da própria arma.
        if (ehCarregador(it.tag) && carregadorEstaAnexado(fichaAtual, id)) return acc;
        const ocupaMao = itemOcupaMao(it.tag, it.subtipoPorte);
        if (!ocupaMao) return acc;
        return acc + (Number(it.maosNecessarias) || 1);
    }, 0);
    return Math.max(0, base - ocupadas);
}

// Checa exclusividade antes de marcar um container como equipada=true:
// subtipos marcados exclusivo=true em SUBTIPOS_PORTE (dados-manual.js)
// só podem ter 1 item equipado por vez daquele subtipo. Hoje NENHUM
// subtipo é exclusivo (dá pra vestir cinto + jaqueta + mochila + colete
// à vontade, sem trava — ver comentário em SUBTIPOS_PORTE), então esta
// função sempre retorna true na prática; ela fica pronta caso a mesa
// queira religar o limite pra algum subtipo específico no futuro.
// idItemAtual exclui o próprio item da busca (pra não bloquear o item
// verificando contra si mesmo quando ele já está equipado e a checagem
// é só re-validação).
//
// PREPARADO PRA FUTURO — quando o sistema de Slots de Equipamento
// existir (ver nota grande em SUBTIPOS_PORTE, dados-manual.js), é AQUI
// que a exclusividade passa a ser "por slot" em vez de "por
// subtipoPorte": troca a comparação `it.subtipoPorte === item.subtipoPorte`
// abaixo por `it.slot === item.slot` (mantendo o resto igual).
export function itemPodeEquiparContainer(fichaAtual, item, idItemAtual) {
    if (!ehContainer(item.tag)) return true;
    if (!subtipoPorteExclusivo(item.subtipoPorte)) return true;
    return !Object.entries(fichaAtual.inventario || {}).some(([id, it]) =>
        id !== idItemAtual &&
        it.equipada &&
        it.subtipoPorte === item.subtipoPorte
    );
}

// A regra de validação central (seção 3 do doc de projeto): um item na
// categoria "levando" e SEM item.dentroDe só é válido se estiver:
//   a) container roupa/cinto equipada (vestindo)
//   b) container mochila equipada (carregando nas costas)
//   c) container bolsa_mao equipada (segurando — consome mão, mas essa
//      checagem de recurso é feita à parte por maosDisponiveis)
//   d) QUALQUER item comum (não-container) segurado na mão
//      (item.equipada) — não precisa mais estar marcado "equipável"
//      pra isso: essa marcação (itemEhEquipavel) é uma trava separada,
//      só sobre PODER USAR o item (ver itemPodeUsar), não sobre ter um
//      lugar físico válido. Um item qualquer (lanterna, garrafa,
//      celular) pode ficar "na mão" (equipada=true) sem nunca ter sido
//      marcado equipável — ele só não ganha a exigência extra de
//      "precisa equipar pra usar" que arma/item equipável tem.
// Qualquer outra coisa solta nessas condições NÃO é permitida — a UI
// deve bloquear salvar o item nesse estado (ver seção 5.4 do doc).
// Item guardado dentro de algo (item.dentroDe) ou fora da categoria
// "levando" não passa por essa regra (sempre válido aqui).
export function itemPodeSerLevadoSolto(fichaAtual, item) {
    if (item.categoria !== "levando") return true;
    if (item.dentroDe) return true;

    if (ehContainer(item.tag)) {
        const subtipo = item.subtipoPorte;
        const subtipoValido = subtipo === "roupa" || subtipo === "cinto" ||
            subtipo === "mochila" || subtipo === "bolsa_mao";
        return subtipoValido && !!item.equipada;
    }

    return !!item.equipada;
}

// Correção do "catch-22 de Levando Consigo": itemPodeSerLevadoSolto (acima)
// só aceita um item recém-movido pra "levando" se ele já estiver
// equipado — mas o botão de equipar (itemPodeEquipar/podeEquiparCategoria,
// ver ficha.js) só aparece DEPOIS que o item já está em "levando". Sem
// essa função, nenhum item novo (roupa, arma, item comum) conseguia
// entrar em "Levando consigo" pela primeira vez — só um Mestre editando
// o item direto no modal conseguia burlar isso setando os dois campos
// (categoria + equipada) de uma vez.
//
// Esta função resolve o mover-pra-"levando" tentando automaticamente
// colocar o item num lugar físico válido (na mão, vestido, ou carregado
// nas costas) igual um "equipar" faria — respeitando os mesmos limites
// de mãos livres e exclusividade de subtipoPorte. Devolve:
//   { ok: true, equipar: true|false } — pode mover; `equipar` diz se
//     deve gravar equipada:true junto (false quando o item já está
//     guardado dentro de outra coisa via dentroDe, que dispensa isso).
//   { ok: false, motivo: "<frase pra completar a mensagem de erro>" }
// idItemAtual exclui o próprio item da checagem de exclusividade (mesmo
// uso de itemPodeEquiparContainer).
export function resolverEntradaLevandoConsigo(fichaAtual, item, idItemAtual) {
    // Guardado dentro de outra coisa (mochila etc.) já é válido — não
    // precisa de mão nem de estar "vestido" por si só.
    if (item.dentroDe) return { ok: true, equipar: false };

    if (ehContainer(item.tag)) {
        const subtipo = item.subtipoPorte;
        const subtipoValido = subtipo === "roupa" || subtipo === "cinto" ||
            subtipo === "mochila" || subtipo === "bolsa_mao";
        if (!subtipoValido) {
            return { ok: false, motivo: `ficaria sem lugar físico válido em "Levando consigo" — esse tipo de recipiente não dá pra vestir/carregar direto; guarde-o dentro de outro container antes de mover.` };
        }
        if (subtipoPorteExclusivo(subtipo) && !itemPodeEquiparContainer(fichaAtual, item, idItemAtual)) {
            return { ok: false, motivo: `não pode ir pra "Levando consigo" agora — já tem outra peça de "${rotuloSubtipoPorte(subtipo)}" equipada; desequipe-a antes.` };
        }
        if (subtipoPorteOcupaMao(subtipo)) {
            const maosNecessarias = Number(item.maosNecessarias) || 1;
            if (maosDisponiveis(fichaAtual) < maosNecessarias) {
                return { ok: false, motivo: `não pode ir pra "Levando consigo" agora — sem mãos livres pra segurar; libere uma mão antes.` };
            }
        }
        return { ok: true, equipar: true };
    }

    // Item comum (arma ou não) vai pra mão — exceto o carregador que já
    // está anexado a uma arma (virou parte dela, não precisa de mão
    // própria — ver carregadorEstaAnexado).
    if (ehCarregador(item.tag) && carregadorEstaAnexado(fichaAtual, idItemAtual)) return { ok: true, equipar: true };
    const maosNecessarias = Number(item.maosNecessarias) || 1;
    if (maosDisponiveis(fichaAtual) < maosNecessarias) {
        return { ok: false, motivo: `não pode ir pra "Levando consigo" agora — sem mãos livres pra segurar; libere uma mão antes.` };
    }
    return { ok: true, equipar: true };
}

// =====================================================================
// Compra em Lojas (Etapas 5, 7 e 8 — ver planejamento-lojas.txt): decide
// se o item comprado tem onde ficar guardado, ANTES de cobrar/gravar
// qualquer coisa. A mesma função é usada pela Etapa 5 (só calcula, pra
// mostrar o aviso na caixa de compra) e pelas Etapas 7/8 (decidem de
// verdade onde o item — ou a Caixa que o guarda — entra) — assim o
// aviso prévio nunca diverge do que vai acontecer na entrega real.
// =====================================================================

// Sobe a cadeia de dentroDe a partir de um container: só é válido se,
// em algum ponto, chegar a um container "equipado" de um subtipo que
// pode ser levado solto (roupa/cinto/mochila/bolsa_mão) — mesma regra
// de itemPodeSerLevadoSolto/resolverEntradaLevandoConsigo, olhando só
// pro lado dos containers. "Em casa" nunca conta (chamado só com
// containers da categoria "levando" — ver listaContainersValidosParaCompra).
function containerTemLugarFisicoValido(fichaAtual, containerId, visitados) {
    if (visitados.has(containerId)) return false; // ciclo — dado corrompido
    visitados.add(containerId);
    const it = (fichaAtual.inventario || {})[containerId];
    if (!it) return false;
    if (it.dentroDe) return containerTemLugarFisicoValido(fichaAtual, it.dentroDe, visitados);
    const subtipo = it.subtipoPorte;
    const subtipoValido = subtipo === "roupa" || subtipo === "cinto" || subtipo === "mochila" || subtipo === "bolsa_mao";
    return subtipoValido && !!it.equipada;
}

// Containers válidos pra RECEBER item comprado (regra "a" da decisão
// tomada no plano de lojas): estar na categoria "levando" E ter lugar
// físico válido. Devolve uma entrada por COMPARTIMENTO (mesmo padrão
// de listaContainersDisponiveis), na ordem em que aparecem no
// inventário — regra "c": o primeiro que comportar vence.
export function listaContainersValidosParaCompra(fichaAtual) {
    const out = [];
    Object.entries(fichaAtual.inventario || {}).forEach(([id, it]) => {
        if (!ehContainer(it.tag) || it.categoria !== "levando") return;
        if (!containerTemLugarFisicoValido(fichaAtual, id, new Set())) return;
        listaCompartimentos(it).forEach(comp => {
            out.push({ containerId: id, compartimentoId: comp.id, compartimento: comp });
        });
    });
    return out;
}

// =====================================================================
// Caixa (Etapa 8 — ver planejamento-lojas.txt): quando a compra gera
// VÁRIAS unidades SEPARADAS (item não empilhável — tagTemQuantidadeGeral
// falso — com quantidade > 1), elas não se espalham em containers
// diferentes do jogador: todas vão dentro de uma Caixa nova, e só a
// CAIXA precisa de um lugar físico. Item empilhável nunca usa Caixa (já
// vira uma única entrada — regra 3 do plano) e comprar 1 unidade também
// não (vai direto pro container, sem Caixa — regra da Etapa 8).
// =====================================================================

// Sentinel usado no `containerId` dos destinos de uma compra em Caixa —
// abas/lojas.js troca pelo id de verdade assim que a Caixa é criada no
// Firebase (só ali um id é gerado). Fica isolado numa constante pra não
// espalhar esse "valor mágico" pelo código.
export const DENTRO_DA_CAIXA = "__caixa_comprada__";
const COMPARTIMENTO_DA_CAIXA = "principal";

// Decide (SEM gravar nada) onde a CAIXA de uma compra de várias
// unidades vai ficar — mesma prioridade "mão primeiro" do item único
// (ver decidirDestinoDoItemComprado): a caixa é subtipo bolsa_mao, ou
// seja, ocupa mão igual qualquer bolsa de mão; se tiver mão livre, vai
// pra lá direto (não precisa estar DENTRO de outro container, só
// ficar equipada). Só cai pra procurar um container do jogador que
// comporte a caixa (mesma checagem itemCabeNoContainer de qualquer
// item) quando não sobra mão livre; se nem isso, devolve null (compra
// bloqueada).
function decidirDestinoDaCaixa(fichaAtual, tamanhoCaixa, volumeCaixa) {
    if (maosDisponiveis(fichaAtual) >= 1) return { containerId: null, compartimentoId: null, naMao: true };
    const containers = listaContainersValidosParaCompra(fichaAtual);
    const escolhido = containers.find(c =>
        itemCabeNoContainer(fichaAtual, c.containerId, c.compartimentoId, volumeCaixa, tamanhoCaixa).cabe
    );
    if (escolhido) return { containerId: escolhido.containerId, compartimentoId: escolhido.compartimentoId, naMao: false };
    return null;
}

// Decide (SEM gravar nada) ONDE `quantidade` unidades de um item do
// Banco/loja vão ficar guardadas, usando os containers válidos do
// jogador (regra "a" da decisão tomada). `itemBanco` precisa dos
// campos do molde (tag, volume, volumeUnitario, tamanho — mesmo
// formato de itensGlobais). Devolve:
//   { ok: false, motivo: "sem_container" | "sem_espaco" }
//   { ok: true, destinos: [...], caixa: null | {...} }
//
// Item empilhável (tagTemQuantidadeGeral) vira UMA entrada só no
// inventário (regra 3 do plano): `destinos` tem um único elemento com
// unidades = qtd e volume = o total das qtd unidades — nunca usa Caixa.
//
// Item não empilhável com quantidade 1 vai PRA MÃO se tiver uma livre
// (prioridade 1 — mesma regra de "pra onde vai ao equipar", ver
// itemOcupaMao/maosDisponiveis: item comum sempre ocupa mão; container
// só ocupa mão se for bolsa_mao; roupa/cinto/mochila NUNCA vão pra mão,
// pulam direto pra prioridade 2). Só quando não sobra mão livre (ou o
// item não é do tipo que vai pra mão) é que cai pro container — regra
// da Etapa 8: "compra de 1 unidade continua indo direto ao container,
// sem Caixa", agora com a mão testada primeiro. `destinos` tem um
// único elemento e `caixa` fica null nos dois casos.
//
// Item não empilhável com quantidade > 1 (Etapa 8): TODAS as unidades
// vão para dentro de uma Caixa nova — `destinos` tem um elemento por
// unidade, cada um com containerId = DENTRO_DA_CAIXA (sentinel — quem
// grava de verdade troca pelo id real da caixa recém-criada), e `caixa`
// descreve a caixa em si: tamanho/capacidadeVolume calculados a partir
// do que foi comprado (tamanhoMaximoAceito = maior tamanho entre as
// unidades — hoje sempre o próprio tamanho do item, já que uma compra é
// sempre do mesmo item; capacidadeVolume = soma dos volumes
// comprados), e `destino` é o resultado de decidirDestinoDaCaixa acima
// (onde a caixa em si vai ficar: outro container, ou na mão).
//
// Esta é a ÚNICA função que decide isso — Etapa 5 (aviso prévio, via
// simularEncaixeCompra abaixo) e Etapas 7/8 (entrega de verdade, em
// abas/lojas.js) chamam exatamente a mesma, pra nunca divergir.
export function decidirDestinoDoItemComprado(fichaAtual, itemBanco, quantidade) {
    const qtd = Math.max(1, Math.floor(Number(quantidade) || 0));
    const tamanho = itemBanco.tamanho || null;
    const volumeUnitario = Number(itemBanco.volumeUnitario ?? itemBanco.volume) || 0;

    if (tagTemQuantidadeGeral(itemBanco.tag)) {
        const containers = listaContainersValidosParaCompra(fichaAtual);
        if (!containers.length) return { ok: false, motivo: "sem_container" };
        const volumeTotal = volumeUnitario * qtd;
        const escolhido = containers.find(c =>
            itemCabeNoContainer(fichaAtual, c.containerId, c.compartimentoId, volumeTotal, tamanho).cabe
        );
        if (!escolhido) return { ok: false, motivo: "sem_espaco" };
        return {
            ok: true,
            caixa: null,
            destinos: [{
                containerId: escolhido.containerId,
                compartimentoId: escolhido.compartimentoId,
                unidades: qtd,
                volume: volumeTotal
            }]
        };
    }

    if (qtd === 1) {
        const maosNecessarias = Number(itemBanco.maosNecessarias) || 1;
        const podeIrPraMao = itemOcupaMao(itemBanco.tag, itemBanco.subtipoPorte) &&
            maosDisponiveis(fichaAtual) >= maosNecessarias;
        if (podeIrPraMao) {
            return {
                ok: true,
                caixa: null,
                destinos: [{
                    containerId: null,
                    compartimentoId: null,
                    naMao: true,
                    unidades: 1,
                    volume: volumeUnitario
                }]
            };
        }

        const containers = listaContainersValidosParaCompra(fichaAtual);
        if (!containers.length) return { ok: false, motivo: "sem_container" };
        const escolhido = containers.find(c =>
            itemCabeNoContainer(fichaAtual, c.containerId, c.compartimentoId, volumeUnitario, tamanho).cabe
        );
        if (!escolhido) return { ok: false, motivo: "sem_espaco" };
        return {
            ok: true,
            caixa: null,
            destinos: [{
                containerId: escolhido.containerId,
                compartimentoId: escolhido.compartimentoId,
                naMao: false,
                unidades: 1,
                volume: volumeUnitario
            }]
        };
    }

    // Etapa 8 — várias unidades separadas: tudo vai pra dentro de uma
    // Caixa nova; só a CAIXA precisa de um lugar físico (regra "f").
    const capacidadeVolume = volumeUnitario * qtd;
    // Mesmo item em todas as unidades desta compra, então "o maior
    // tamanho entre elas" hoje é sempre o próprio tamanho do item —
    // fica escrito como um cálculo (em vez de só `= tamanho`) só pra
    // deixar a regra explícita, caso um dia a Caixa passe a aceitar
    // itens de origens diferentes na mesma compra.
    const tamanhoMaximoAceito = tamanho;
    // Tamanho/volume EXTERNO da própria Caixa (pra saber se ELA cabe
    // dentro de outro container do jogador): aproximação provisória —
    // a caixa ocupa, por fora, tanto espaço quanto carrega por dentro
    // (mesmo tamanho/volume que a capacidade interna dela). Ponto em
    // aberto, igual o resto do plano: se depois a mesa quiser uma
    // Caixa com tamanho/peso físico próprio (independente do que
    // carrega), é só mudar estas duas linhas.
    const tamanhoDaCaixa = tamanhoMaximoAceito;
    const volumeDaCaixa = capacidadeVolume;

    const destinoCaixa = decidirDestinoDaCaixa(fichaAtual, tamanhoDaCaixa, volumeDaCaixa);
    if (!destinoCaixa) return { ok: false, motivo: "sem_espaco" };

    const destinos = [];
    for (let i = 0; i < qtd; i++) {
        destinos.push({
            containerId: DENTRO_DA_CAIXA,
            compartimentoId: COMPARTIMENTO_DA_CAIXA,
            unidades: 1,
            volume: volumeUnitario
        });
    }
    return {
        ok: true,
        destinos,
        caixa: {
            tamanho: tamanhoDaCaixa,
            volume: volumeDaCaixa,
            capacidadeVolume,
            tamanhoMaximoAceito,
            compartimentoId: COMPARTIMENTO_DA_CAIXA,
            destino: destinoCaixa
        }
    };
}

// Simula (SEM gravar nada) se `quantidade` unidades cabem — mesma
// checagem de decidirDestinoDoItemComprado (Etapa 5, usada pela caixa de
// compra pra mostrar o aviso prévio; já cobre o caso de precisar de uma
// Caixa — Etapa 8), só que devolvendo apenas { cabe, motivo } em vez dos
// destinos escolhidos (a tela ainda não precisa saber ONDE vai cair, só
// SE cabe).
export function simularEncaixeCompra(fichaAtual, itemBanco, quantidade) {
    const resultado = decidirDestinoDoItemComprado(fichaAtual, itemBanco, quantidade);
    return resultado.ok ? { cabe: true, motivo: null } : { cabe: false, motivo: resultado.motivo };
}

export { TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS, ehArma, ehCarregador, ehProjetil, ehContainer, tagTemNivel, rotuloTag, TAMANHOS_ITEM, rotuloTamanho, tamanhoCabe, SUBTIPOS_PORTE, rotuloSubtipoPorte, subtipoPorteOcupaMao, subtipoPorteExclusivo };
