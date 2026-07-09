// =====================================================================
// CHUVA DE NEON — Normalização / migração de ficha
// =====================================================================
// Toda ficha que vem do Firebase passa por aqui antes de ser usada.
// Fichas antigas (criadas antes dos módulos novos) ganham os campos
// que faltam com valores padrão, sem perder nada que já existia.
// Perícias antigas com nome livre (fora da lista fechada do manual)
// são migradas: o nome é preservado, mas passam a contar como perícia
// "livre legada" — não aparecem mais pra criação de novas, mas o
// registro existente continua editável/visível.

import { buscarPericiaPorNome } from "./dados-manual.js";

// Saldos fixos padrão de toda ficha nova. `fixo: true` marca os que não
// podem ser renomeados/excluídos pelo jogador — só os customizados
// (criados via "Criar novo saldo") têm fixo: false.
const SALDOS_FIXOS_PADRAO = {
    sujo: { nome: "Dinheiro sujo em casa", valor: 0, fixo: true },
    limpo: { nome: "Dinheiro limpo na conta", valor: 0, fixo: true },
    bolso: { nome: "No bolso", valor: 0, fixo: true }
};

export function normalizarFicha(raw) {
    const dados = raw.dados || {};
    const ficha = {
        config: raw.config || {},
        dados: {
            nome: dados.nome ?? "", vulgo: dados.vulgo ?? "", idade: dados.idade ?? "",
            nacionalidade: dados.nacionalidade ?? "", funcao: dados.funcao ?? "",
            maldade: dados.maldade ?? 0, remorso: dados.remorso ?? 0, status: dados.status ?? 0,
            dm: dados.dm ?? "", void: dados.void ?? "", p2k: dados.p2k ?? "",
            rabbithole: dados.rabbithole ?? "", p2c: dados.p2c ?? "", creators: dados.creators ?? "",
            nivel: dados.nivel ?? 1, xp: dados.xp ?? 0,
            forca: dados.forca ?? 0, constituicao: dados.constituicao ?? 0, destreza: dados.destreza ?? 0,
            sabedoria: dados.sabedoria ?? 0, inteligencia: dados.inteligencia ?? 0,
            raciocinio: dados.raciocinio ?? 0, carisma: dados.carisma ?? 0, manipulacao: dados.manipulacao ?? 0,
            pvAtual: dados.pvAtual ?? null, energiaAtual: dados.energiaAtual ?? null,
            pvBonusExtra: dados.pvBonusExtra ?? 0,
            padraoDeVida: dados.padraoDeVida ?? "",
            ganhoFixo: dados.ganhoFixo ?? 0,
            ultimoPagamentoCustoVida: dados.ultimoPagamentoCustoVida ?? 0,
            criacaoConcluida: dados.criacaoConcluida ?? false
        },
        saldos: normalizarSaldos(raw.saldos, dados),
        pericias: normalizarPericias(raw.pericias || {}),
        inventario: normalizarInventario(raw.inventario || {}),
        categoriasInventario: raw.categoriasInventario || {},
        gastosExtras: raw.gastosExtras || {},
        vantagens: raw.vantagens || {},
        desvantagens: raw.desvantagens || {},
        especializacoes: raw.especializacoes || {},
        fatosUniversais: raw.fatosUniversais || {},
        criacao: normalizarCriacao(raw.criacao, dados),
        treinamento: normalizarTreinamento(raw.treinamento),
        levelUpPendente: raw.levelUpPendente || null,
        determinacoes: raw.determinacoes || "",
        notas: raw.notas || ""
    };
    return ficha;
}

// Migra o antigo par fixo `dados.dinheiroLimpo` / `dados.dinheiroSujo`
// (fichas criadas antes da refatoração financeira) pro novo modelo de
// saldos livres, preservando os valores já jogados. Fichas novas (sem
// `raw.saldos` e sem os campos antigos) recebem os 3 saldos fixos
// zerados. Saldos customizados criados pelos jogadores são preservados
// como estão.
function normalizarSaldos(saldosRaw, dadosAntigos) {
    const out = {};
    for (const [id, padrao] of Object.entries(SALDOS_FIXOS_PADRAO)) {
        out[id] = { ...padrao };
    }
    // Migração de fichas antigas: só roda se ainda não existe um objeto
    // `saldos` salvo (ou seja, a ficha nunca passou por este código).
    if (!saldosRaw) {
        if (dadosAntigos && dadosAntigos.dinheiroLimpo !== undefined) {
            out.limpo.valor = Number(dadosAntigos.dinheiroLimpo) || 0;
        }
        if (dadosAntigos && dadosAntigos.dinheiroSujo !== undefined) {
            out.sujo.valor = Number(dadosAntigos.dinheiroSujo) || 0;
        }
        return out;
    }
    for (const [id, s] of Object.entries(saldosRaw)) {
        const ehFixo = Object.prototype.hasOwnProperty.call(SALDOS_FIXOS_PADRAO, id);
        out[id] = {
            nome: s.nome || (ehFixo ? SALDOS_FIXOS_PADRAO[id].nome : "(sem nome)"),
            valor: Number(s.valor) || 0,
            fixo: ehFixo
        };
    }
    return out;
}

function normalizarCriacao(c, dados) {
    c = c || {};
    return {
        etapa: c.etapa ?? 1,
        funcaoEscolhida: c.funcaoEscolhida ?? "",
        escolhaAtributoFuncao: c.escolhaAtributoFuncao ?? "",
        etapa1JaConfirmadaAntes: c.etapa1JaConfirmadaAntes ?? false,
        pontosAtributosRestantes: c.pontosAtributosRestantes ?? 7,
        pontosPericiasRestantes: c.pontosPericiasRestantes ?? 5,
        pontosFuncaoRestantes: c.pontosFuncaoRestantes ?? 0,
        pontosBonusDesvantagens: c.pontosBonusDesvantagens ?? 0,
        bonusGasto: c.bonusGasto ?? 0,
        bonusGastoDetalhe: c.bonusGastoDetalhe ?? {},
        concluida: c.concluida ?? (dados.criacaoConcluida ?? false)
    };
}

function normalizarTreinamento(t) {
    t = t || {};
    return {
        ativo: t.ativo ?? false,
        periciaFisica: t.periciaFisica ?? null,
        periciaMental: t.periciaMental ?? null,
        atributoFisico: t.atributoFisico ?? null,
        atributoMental: t.atributoMental ?? null
    };
}

function normalizarPericias(lista) {
    const out = {};
    for (const id of Object.keys(lista)) {
        const p = lista[id];
        const oficial = buscarPericiaPorNome(p.nome);
        out[id] = {
            nome: p.nome || "",
            nivel: p.nivel ?? 0,
            descricao: p.descricao || "",
            modificadores: p.modificadores || [],
            especializacoes: Array.isArray(p.especializacoes) ? p.especializacoes : [],
            legado: !oficial // marca perícias fora da lista fechada (criadas antes da migração)
        };
    }
    return out;
}

function normalizarInventario(lista) {
    const out = {};
    for (const id of Object.keys(lista)) {
        const it = lista[id];
        out[id] = {
            nome: it.nome || "",
            descricao: it.descricao || "",
            modificadores: it.modificadores || [],
            tag: it.tag || "geral",
            nivelTag: it.nivelTag ?? null,
            peso: it.peso ?? 0,
            categoria: it.categoria || "levando",
            arma: it.arma || null,
            periciaUso: it.periciaUso || null,
            classeProtecao: it.classeProtecao || null,
            reducoesDano: Array.isArray(it.reducoesDano) ? it.reducoesDano : [],
            carregador: it.carregador || null,
            projetil: it.projetil || null
        };
    }
    return out;
}

export function fichaVaziaPadrao(nomeExibicao) {
    return {
        dados: {
            nome: nomeExibicao, vulgo: "", idade: "", nacionalidade: "", funcao: "",
            maldade: 0, remorso: 0, status: 0,
            dm: "", void: "", p2k: "", rabbithole: "", p2c: "", creators: "",
            nivel: 1, xp: 0,
            forca: 0, constituicao: 0, destreza: 0, sabedoria: 0,
            inteligencia: 0, raciocinio: 0, carisma: 0, manipulacao: 0,
            pvAtual: null, energiaAtual: null,
            pvBonusExtra: 0,
            padraoDeVida: "",
            ganhoFixo: 0,
            ultimoPagamentoCustoVida: 0,
            criacaoConcluida: false
        },
        saldos: {
            sujo: { nome: "Dinheiro sujo em casa", valor: 0, fixo: true },
            limpo: { nome: "Dinheiro limpo na conta", valor: 0, fixo: true },
            bolso: { nome: "No bolso", valor: 0, fixo: true }
        },
        pericias: {},
        inventario: {},
        categoriasInventario: {},
        gastosExtras: {},
        vantagens: {},
        desvantagens: {},
        especializacoes: {},
        fatosUniversais: {},
        criacao: {
            etapa: 1, funcaoEscolhida: "", escolhaAtributoFuncao: "", etapa1JaConfirmadaAntes: false,
            pontosAtributosRestantes: 7, pontosPericiasRestantes: 5,
            pontosFuncaoRestantes: 0, pontosBonusDesvantagens: 0,
            bonusGasto: 0, bonusGastoDetalhe: {},
            concluida: false
        },
        treinamento: { ativo: false, periciaFisica: null, periciaMental: null, atributoFisico: null, atributoMental: null },
        levelUpPendente: null,
        determinacoes: "",
        notas: ""
    };
}
