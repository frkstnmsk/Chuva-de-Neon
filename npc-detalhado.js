// =====================================================================
// CHUVA DE NEON — Mini-Ficha de NPC (criação detalhada, Painel do Mestre)
// =====================================================================
// Diferente da Criação de Personagem (criacao.js), o Mestre NÃO tem
// pontos iniciais fixos nem restrição de Função/Desvantagens ao montar
// um NPC — ele digita os atributos primários que quiser, de 0 a 99
// (sem o teto de 7 do jogador), e o sistema calcula os secundários e
// recursos automaticamente a partir das MESMAS fórmulas do jogador
// (regras.js), mas permite sobrescrever qualquer um manualmente.
//
// Estrutura no Firebase — nó `npcs/{npcId}`, com os campos ANTIGOS
// (nome, pvs, periciasResumo, itensEssenciais, atributos, agilidade,
// constituicao, protecaoTipo/Valor — texto livre, usados pelo
// Gerenciador de Combate simplificado) preservados por compatibilidade,
// mais os campos NOVOS da mini-ficha detalhada:
//
// npcs: {
//   "<npcId>": {
//     // ---- campos antigos (mantidos) ----
//     nome, pvs, pvAtual, periciasResumo, itensEssenciais,
//     atributos, atributosSecundarios,       // texto livre
//     agilidade, constituicao,               // números soltos, usados
//                                             // pelo Gerenciador de Combate
//     protecaoTipo, protecaoValor, criadoEm,
//
//     // ---- campos novos (mini-ficha detalhada) ----
//     modoDetalhado: true,
//     vulgo: "Faca", idade: "32", funcaoNarrativa: "Capanga do Mercador",
//     atributosPrimarios: {
//       forca: 4, constituicao: 5, destreza: 6, sabedoria: 2,
//       inteligencia: 3, raciocinio: 4, carisma: 1, manipulacao: 2
//     },
//     // Qualquer chave aqui com valor != null SOBRESCREVE o cálculo
//     // automático (regras.js) só pra esse NPC. Ausente/null = calculado.
//     secundariosOverride: {
//       velocidade: null, agilidade: null, percepcao: null,
//       massa_corporea: null, forca_vontade: null, pv: 80, energia: null
//     },
//     periciasNpc: {
//       "id1": { nome: "CQC", nivel: 4 },
//       "id2": { nome: "Intimidação", nivel: 3 }
//     }
//   }
// }
// =====================================================================

import { ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS, calcularDerivados } from "./regras.js";

export function estadoInicialAtributosPrimariosNpc() {
    const out = {};
    for (const a of ATRIBUTOS_PRIMARIOS) out[a.key] = 0;
    return out;
}

export function estadoInicialSecundariosOverrideNpc() {
    const out = {};
    for (const s of ATRIBUTOS_SECUNDARIOS) out[s.key] = null;
    for (const r of RECURSOS) out[r.key] = null;
    return out;
}

export function estadoInicialNpcDetalhado() {
    return {
        modoDetalhado: true,
        vulgo: "",
        idade: "",
        funcaoNarrativa: "",
        atributosPrimarios: estadoInicialAtributosPrimariosNpc(),
        secundariosOverride: estadoInicialSecundariosOverrideNpc(),
        periciasNpc: {},
        // ---- Ficha completa (Módulo 3) ----
        // Mesmo formato usado pela ficha de jogador (ver inventario.js /
        // normalizacao.js), pra que o Mestre possa "atuar como" esse NPC
        // na tela da Ficha e usar a MESMA interface de golpes/itens do
        // jogador durante o combate, em vez de só rolar dado à mão.
        inventario: {},
        categoriasInventario: {},
        energiaAtual: null
    };
}

// Calcula os secundários/recursos de um NPC a partir dos atributos
// primários (mesmas fórmulas do jogador, sem modificadores estruturados
// — NPC não tem inventário com bônus, é tudo digitado à mão), e então
// aplica qualquer override manual que o Mestre tenha definido por cima.
export function calcularSecundariosNpc(atributosPrimarios, secundariosOverride) {
    const derivados = calcularDerivados(atributosPrimarios || {}, []);
    const overrides = secundariosOverride || {};

    const secundarios = {};
    for (const s of ATRIBUTOS_SECUNDARIOS) {
        const calculado = derivados.secundarios[s.key]?.total ?? 0;
        const manual = overrides[s.key];
        secundarios[s.key] = {
            label: s.label,
            calculado,
            valor: (manual !== null && manual !== undefined && manual !== "") ? Number(manual) : calculado,
            sobrescrito: manual !== null && manual !== undefined && manual !== ""
        };
    }

    const recursos = {};
    for (const r of RECURSOS) {
        const calculado = derivados.recursos[r.key]?.total ?? 0;
        const manual = overrides[r.key];
        recursos[r.key] = {
            label: r.label,
            calculado,
            valor: (manual !== null && manual !== undefined && manual !== "") ? Number(manual) : calculado,
            sobrescrito: manual !== null && manual !== undefined && manual !== ""
        };
    }

    return { secundarios, recursos };
}

// Traduz os overrides manuais do Mestre (secundariosOverride) em
// modificadores estruturados equivalentes ({alvo, valor}), pra que a
// Ficha completa do NPC (que recalcula tudo via calcularDerivados, a
// mesma fórmula do jogador) chegue no MESMO número que o Mestre digitou
// manualmente no editor de NPC. Sem isso, um PV/Velocidade sobrescrito
// na mini-ficha "voltaria" ao valor calculado assim que o Mestre abrisse
// a Ficha completa do NPC pra agir em combate.
export function deltaModificadoresOverrideNpc(atributosPrimarios, secundariosOverride) {
    const overrides = secundariosOverride || {};
    const derivados = calcularDerivados(atributosPrimarios || {}, []);
    const deltas = [];
    for (const s of ATRIBUTOS_SECUNDARIOS) {
        const manual = overrides[s.key];
        if (manual === null || manual === undefined || manual === "") continue;
        const base = derivados.secundarios[s.key]?.total ?? 0;
        deltas.push({ alvo: `secundario:${s.key}`, valor: Number(manual) - base });
    }
    for (const r of RECURSOS) {
        const manual = overrides[r.key];
        if (manual === null || manual === undefined || manual === "") continue;
        const base = derivados.recursos[r.key]?.total ?? 0;
        deltas.push({ alvo: `recurso:${r.key}`, valor: Number(manual) - base });
    }
    return deltas;
}

export function adicionarPericiaNpc(npcDetalhado, nome, nivel) {

    if (!npcDetalhado.periciasNpc) npcDetalhado.periciasNpc = {};
    const id = "pnpc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    npcDetalhado.periciasNpc[id] = { nome, nivel: Math.max(1, Math.min(5, Number(nivel) || 1)) };
    return id;
}

export function removerPericiaNpc(npcDetalhado, periciaId) {
    if (npcDetalhado.periciasNpc) delete npcDetalhado.periciasNpc[periciaId];
}
