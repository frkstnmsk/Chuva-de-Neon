// =====================================================================
// CHUVA DE NEON — Motor de regras
// =====================================================================
// Tudo que é fórmula do manual mora aqui. Se uma regra mudar numa
// próxima edição do manual, é só ajustar este arquivo.

// Atributos primários (definidos livremente na criação/evolução)
export const ATRIBUTOS_PRIMARIOS = [
    { key: "forca", label: "Força" },
    { key: "constituicao", label: "Constituição" },
    { key: "destreza", label: "Destreza" },
    { key: "sabedoria", label: "Sabedoria" },
    { key: "inteligencia", label: "Inteligência" },
    { key: "raciocinio", label: "Raciocínio" },
    { key: "carisma", label: "Carisma" },
    { key: "manipulacao", label: "Manipulação" }
];

// Atributos secundários: todos calculados a partir dos primários,
// e todos podem receber modificadores estruturados de qualquer entidade.
export const ATRIBUTOS_SECUNDARIOS = [
    { key: "velocidade", label: "Velocidade", formula: d => (d.destreza + d.constituicao) / 2 },
    { key: "agilidade", label: "Agilidade", formula: d => (d.raciocinio + d.destreza) / 2 },
    { key: "percepcao", label: "Percepção", formula: d => (d.inteligencia + d.sabedoria) / 2 },
    { key: "massa_corporea", label: "Massa Corpórea", formula: d => d.forca + d.constituicao },
    { key: "forca_vontade", label: "Força de Vontade", formula: d => d.sabedoria + d.inteligencia }
];

// Recursos: têm um "máximo calculado" e um valor atual editável (ex: PV atual de 80/96)
export const RECURSOS = [
    { key: "pv", label: "PV", formula: d => 50 + (d.constituicao * 4) },
    { key: "energia", label: "Energia", formula: d => 6 + d.constituicao },
    { key: "carga", label: "Capacidade de carga (kg)", formula: d => 6 + (d.constituicao * 2) }
];

// Todos os "alvos" que um modificador pode afetar — usados pra popular os
// seletores do modal e pra rotular o efeito de cada modificador na lista.
export function listaAlvosModificador(pericias = []) {
    const alvosFixos = [
        ...ATRIBUTOS_PRIMARIOS.map(a => ({ value: `atributo:${a.key}`, label: a.label })),
        ...ATRIBUTOS_SECUNDARIOS.map(a => ({ value: `secundario:${a.key}`, label: a.label })),
        { value: "recurso:pv", label: "PV (máximo)" },
        { value: "recurso:energia", label: "Energia (máxima)" },
        { value: "recurso:carga", label: "Capacidade de carga" },
        { value: "dano", label: "Dano causado (geral)" },
        { value: "defesa", label: "Defesa / redução de dano" },
        { value: "testes_sociais", label: "Testes sociais (geral)" },
        { value: "testes_mentais", label: "Testes mentais (geral)" },
        { value: "testes_fisicos", label: "Testes físicos (geral)" }
    ];
    const alvosPericias = pericias.map((p, i) => ({
        value: `pericia:${p.nome}`,
        label: `Perícia: ${p.nome || "(sem nome)"}`
    }));
    return [...alvosFixos, ...alvosPericias];
}

export function rotuloAlvo(alvo, pericias = []) {
    const encontrado = listaAlvosModificador(pericias).find(a => a.value === alvo);
    if (encontrado) return encontrado.label;
    if (alvo && alvo.startsWith("pericia:")) return `Perícia: ${alvo.slice(8)}`;
    return alvo || "—";
}

// ---------------------------------------------------------------------
// Coleta todos os modificadores estruturados de todas as fontes da ficha.
// Cada fonte é uma lista de entidades { nome, modificadores: [{alvo, valor}] }.
// Retorna um array plano: [{ alvo, valor, origem }]
// ---------------------------------------------------------------------
export function coletarModificadores(ficha) {
    const fontes = [
        { lista: ficha.inventario, tipo: "Item" },
        { lista: ficha.vantagens, tipo: "Vantagem" },
        { lista: ficha.desvantagens, tipo: "Desvantagem" },
        { lista: ficha.especializacoes, tipo: "Especialização" },
        { lista: ficha.fatosUniversais, tipo: "Fato universal" }
    ];
    const todos = [];
    for (const fonte of fontes) {
        const lista = fonte.lista || {};
        for (const id of Object.keys(lista)) {
            const entidade = lista[id];
            const mods = entidade.modificadores || [];
            for (const m of mods) {
                if (!m.alvo || !m.valor) continue;
                todos.push({
                    alvo: m.alvo,
                    valor: Number(m.valor) || 0,
                    origem: `${fonte.tipo}: ${entidade.nome || "(sem nome)"}`
                });
            }
        }
    }
    return todos;
}

export function somaModificadoresPara(alvo, modificadoresPlanos) {
    return modificadoresPlanos
        .filter(m => m.alvo === alvo)
        .reduce((acc, m) => acc + m.valor, 0);
}

export function modificadoresQueAfetam(alvo, modificadoresPlanos) {
    return modificadoresPlanos.filter(m => m.alvo === alvo);
}

// ---------------------------------------------------------------------
// Calcula o pacote completo de derivados (secundários + recursos),
// já considerando todos os modificadores. Retorna também o "breakdown"
// (base + lista de ajustes) pra exibir no tooltip/expansível.
// ---------------------------------------------------------------------
export function calcularDerivados(dadosPrimarios, modificadoresPlanos) {
    const d = {};
    for (const a of ATRIBUTOS_PRIMARIOS) d[a.key] = Number(dadosPrimarios[a.key]) || 0;

    const resultado = { secundarios: {}, recursos: {} };

    for (const sec of ATRIBUTOS_SECUNDARIOS) {
        const base = sec.formula(d);
        const ajustes = modificadoresQueAfetam(`secundario:${sec.key}`, modificadoresPlanos);
        const somaAjustes = ajustes.reduce((acc, m) => acc + m.valor, 0);
        resultado.secundarios[sec.key] = {
            base,
            ajustes,
            total: base + somaAjustes
        };
    }

    for (const rec of RECURSOS) {
        const base = rec.formula(d);
        const ajustes = modificadoresQueAfetam(`recurso:${rec.key}`, modificadoresPlanos);
        const somaAjustes = ajustes.reduce((acc, m) => acc + m.valor, 0);
        resultado.recursos[rec.key] = {
            base,
            ajustes,
            total: base + somaAjustes
        };
    }

    return resultado;
}

// Total de rolagem de uma perícia: nível da perícia + atributo-base + modificadores estruturados que apontam pra ela.
export function calcularTotalPericia(pericia, dadosPrimarios, modificadoresPlanos) {
    const nivel = Number(pericia.nivel) || 0;
    const atributoValor = Number(dadosPrimarios[pericia.atributo]) || 0;
    const ajustes = modificadoresQueAfetam(`pericia:${pericia.nome}`, modificadoresPlanos);
    const somaAjustes = ajustes.reduce((acc, m) => acc + m.valor, 0);
    return {
        nivel,
        atributoValor,
        ajustes,
        total: nivel + atributoValor + somaAjustes
    };
}
