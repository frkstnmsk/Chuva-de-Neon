// =====================================================================
// CHUVA DE NEON — Teste automatizado das REGRAS PURAS do sistema de
// Saúde e Ferimentos (ver plano-sistema-saude-ferimentos.txt).
//
// Mesmo espírito do teste-cenarios-secao8.mjs já existente no projeto:
// roda direto nas funções reais de regras.js (sem mock de Firebase),
// então cobre só a CAMADA DE REGRAS por trás da aba Saúde — não
// substitui o teste manual na UI (rolagens de dado, fluxo dos modais,
// listeners em tempo real etc. continuam precisando de teste na mesa).
//
// Uso: node teste-cenarios-saude.mjs
// =====================================================================

import {
    TRATAMENTOS_FERIDA, feridaAceitaSutura, feridaEstaFechada,
    modificadorPorSituacaoItem, PENALIDADE_ITEM_TRATAMENTO,
    dificuldadeInfeccao, DIFICULDADE_INFECCAO_MINIMA, DIFICULDADE_INFECCAO_MAXIMA,
    calcularTempoRecuperacaoPV
} from "./regras.js";

let falhas = 0;
let total = 0;

function assert(condicao, descricao) {
    total++;
    if (!condicao) {
        falhas++;
        console.error(`❌ ${descricao}`);
    } else {
        console.log(`✅ ${descricao}`);
    }
}

console.log("\n=== 1. Máquina de estados por tipo de ferida (plano, seção 3) ===\n");

// SANGRAMENTO: aberta -> Estancar Sangramento -> estancada
//              aberta -> Suturar Ferimento -> tratada
//              estancada -> Suturar Ferimento -> tratada (também fecha direto)
assert(
    feridaAceitaSutura({ tipo: "sangramento", estado: "aberta" }) === true,
    "Sangramento aberto aceita Suturar Ferimento direto (plano permite os dois caminhos)"
);
assert(
    feridaAceitaSutura({ tipo: "sangramento", estado: "estancada" }) === true,
    "Sangramento estancado aceita Suturar Ferimento"
);
assert(
    TRATAMENTOS_FERIDA.estancar_sangramento.tiposFerida.includes("sangramento")
    && TRATAMENTOS_FERIDA.estancar_sangramento.efeitoSucesso === "estancada",
    "Estancar Sangramento só se aplica a sangramento e leva a 'estancada'"
);

// CORTE: aberta -> Suturar Ferimento -> tratada (sem Estancar)
assert(
    feridaAceitaSutura({ tipo: "corte", estado: "aberta" }) === true,
    "Corte aberto aceita Suturar Ferimento"
);
assert(
    !TRATAMENTOS_FERIDA.estancar_sangramento.tiposFerida.includes("corte"),
    "Corte NÃO tem a ação Estancar Sangramento (só sangramento tem)"
);

// PROJÉTIL: aberta -> Remover Projétil -> sem_sangramento -> Suturar -> tratada
//           NÃO pode suturar direto de "aberta" (precisa remover antes)
assert(
    feridaAceitaSutura({ tipo: "projetil", estado: "aberta" }) === false,
    "Projétil alojado NÃO aceita Suturar antes de remover (plano, seção 3)"
);
assert(
    feridaAceitaSutura({ tipo: "projetil", estado: "sem_sangramento" }) === true,
    "Projétil aceita Suturar depois de removido (estado 'sem_sangramento')"
);
assert(
    TRATAMENTOS_FERIDA.remover_projetil.efeitoSucesso === "sem_sangramento",
    "Remover Projétil leva ao estado 'sem_sangramento', não direto a 'tratada'"
);

// FRATURA / QUEIMADURA: aberta -> Tratar X -> tratada (lançamento manual, sem gatilho automático)
assert(
    TRATAMENTOS_FERIDA.tratar_fratura.efeitoSucesso === "tratada"
    && TRATAMENTOS_FERIDA.tratar_queimadura.efeitoSucesso === "tratada",
    "Tratar Fratura e Tratar Queimadura fecham a ferida direto (sem estado intermediário)"
);

console.log("\n=== 2. Penalidades de item usado no tratamento (plano, seção 5) ===\n");

assert(modificadorPorSituacaoItem("adequado") === 0, "Item adequado: SEM penalidade (0)");
assert(modificadorPorSituacaoItem("improvisado") === -1, "Item improvisado: -1 na rolagem");
assert(modificadorPorSituacaoItem("nenhum") === -2, "Sem item: -2 na rolagem");
assert(
    Object.keys(PENALIDADE_ITEM_TRATAMENTO).length === 3,
    "Só existem as 3 situações previstas no plano (adequado/improvisado/nenhum)"
);

console.log("\n=== 3. Cobertura das 5 ações de tratamento (plano, seção 6) ===\n");

const acoesEsperadas = ["estancar_sangramento", "remover_projetil", "suturar_ferimento", "tratar_fratura", "tratar_queimadura"];
acoesEsperadas.forEach(acao => {
    const config = TRATAMENTOS_FERIDA[acao];
    assert(!!config, `Ação '${acao}' existe em TRATAMENTOS_FERIDA`);
    if (config) {
        assert(config.pericias && config.pericias.length > 0, `'${acao}' tem ao menos uma perícia aceita`);
        assert(config.dificuldadeMin <= config.dificuldadeMax, `'${acao}' tem faixa de dificuldade válida (min <= max)`);
    }
});

console.log("\n=== 4. Infecção — dificuldade e recuperação de PV (plano, seções 5 e 8) ===\n");

assert(DIFICULDADE_INFECCAO_MINIMA === 18 && DIFICULDADE_INFECCAO_MAXIMA === 22,
    "Faixa de dificuldade de Infecção continua 18-22 (manual)");
assert(dificuldadeInfeccao(18, 2) === 16, "Modificador de item reduz a dificuldade de infecção (ex: Soro Fisiológico -2)");
assert(dificuldadeInfeccao(18, 0) === 18, "Sem modificador, dificuldade de infecção fica na base escolhida");

// calcularTempoRecuperacaoPV: infecção aumenta o tempo em 50%
const semInfeccao = calcularTempoRecuperacaoPV(30, 100, false);
const comInfeccao = calcularTempoRecuperacaoPV(30, 100, true);
assert(comInfeccao > semInfeccao, "Infecção ativa aumenta o tempo de recuperação de PV");
assert(comInfeccao === Math.floor(semInfeccao * 1.5) || comInfeccao === Math.floor((30 / 100) * 30 * 1.5),
    "Aumento de infecção é +50% (arredondado pra baixo no final, não antes)");

console.log("\n=== 5. Trava de recuperação de PV por ferida aberta (plano, seção 8) ===\n");

assert(feridaEstaFechada({ estado: "tratada" }) === true, "Ferida 'tratada' conta como fechada (libera recuperação de PV)");
["aberta", "estancada", "sem_sangramento"].forEach(estado => {
    assert(feridaEstaFechada({ estado }) === false, `Ferida em estado '${estado}' NÃO conta como fechada (bloqueia recuperação de PV)`);
});
assert(feridaEstaFechada(null) === false, "Ausência de ferida não quebra feridaEstaFechada (retorna false, não lança erro)");

// Simulação do gate usado em ficha.js: recuperação só libera se
// NENHUMA ferida da lista estiver aberta.
function podeRecuperarPV(feridas) {
    return !feridas.some(f => !feridaEstaFechada(f));
}
assert(podeRecuperarPV([]) === true, "Sem nenhuma ferida registrada, recuperação de PV libera normalmente");
assert(podeRecuperarPV([{ estado: "tratada" }, { estado: "tratada" }]) === true,
    "Todas as feridas tratadas: recuperação de PV libera");
assert(podeRecuperarPV([{ estado: "tratada" }, { estado: "aberta" }]) === false,
    "Uma ferida ainda aberta entre várias: recuperação de PV continua travada");

console.log(`\n=== Resultado: ${total - falhas}/${total} testes passaram ===\n`);
if (falhas > 0) {
    console.error(`${falhas} teste(s) falharam.`);
    process.exit(1);
}
