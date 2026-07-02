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
    { key: "energia", label: "Energia", formula: d => 6 + d.constituicao }
];

// Limite de carga "teórico" (sem considerar peso real do inventário) — usado
// só como referência rápida fora da aba de Inventário, se necessário.
export function limiteCargaTeorico(constituicao) {
    return 6 + (Number(constituicao) || 0) * 2;
}

// Todos os "alvos" que um modificador pode afetar — usados pra popular os
// seletores do modal e pra rotular o efeito de cada modificador na lista.
export function listaAlvosModificador(pericias = []) {
    const alvosFixos = [
        ...ATRIBUTOS_PRIMARIOS.map(a => ({ value: `atributo:${a.key}`, label: a.label })),
        ...ATRIBUTOS_SECUNDARIOS.map(a => ({ value: `secundario:${a.key}`, label: a.label })),
        { value: "recurso:pv", label: "PV (máximo)" },
        { value: "recurso:energia", label: "Energia (máxima)" },
        { value: "carga_extra", label: "Capacidade de carga (bônus em kg)" },
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

// Total de rolagem de uma perícia: SOMENTE o nível da perícia + modificadores
// estruturados que apontam pra ela. O manual trata perícia e atributo como
// rolagens distintas — somar o atributo aqui duplicaria o bônus quando o
// jogador já testa "perícia OU atributo" em testes disputados/golpes.
export function calcularTotalPericia(pericia, dadosPrimarios, modificadoresPlanos) {
    const nivel = Number(pericia.nivel) || 0;
    const ajustes = modificadoresQueAfetam(`pericia:${pericia.nome}`, modificadoresPlanos);
    const somaAjustes = ajustes.reduce((acc, m) => acc + m.valor, 0);
    return {
        nivel,
        ajustes,
        total: nivel + somaAjustes
    };
}

// ---------------------------------------------------------------------
// Capacidade de carga e penalidade de velocidade (manual pg. 16).
// limite = 6 + Constituição x 2. Sem penalidade até 60% do limite.
// ---------------------------------------------------------------------
export function calcularCarga(constituicao, pesoTotal) {
    const limite = 6 + (Number(constituicao) || 0) * 2;
    const pct = limite > 0 ? pesoTotal / limite : 0;
    let penalidadeVelocidade = 0;
    if (pct > 0.9) penalidadeVelocidade = -3;
    else if (pct > 0.75) penalidadeVelocidade = -2;
    else if (pct > 0.6) penalidadeVelocidade = -1;
    return {
        limite,
        pesoTotal,
        percentual: limite > 0 ? (pesoTotal / limite) * 100 : 0,
        semPenalidadeAte: limite * 0.6,
        penalidadeVelocidade
    };
}

// ---------------------------------------------------------------------
// XP necessária para o próximo nível: nível atual x 100 (manual pg. 31).
// ---------------------------------------------------------------------
export function xpNecessariaProximoNivel(nivelAtual) {
    return (Number(nivelAtual) || 1) * 100;
}

// ---------------------------------------------------------------------
// Dado de vida extra ao subir de nível, baseado na Constituição ATUAL
// (manual pg. 31): Constituição 1 → 1d18+1, 2 → 1d20+2, 3 → 1d22+3, ...
// Padrão: dado = d(16 + 2*CON), bônus fixo = CON.
// ---------------------------------------------------------------------
export function dadoVidaPorConstituicao(constituicao) {
    const con = Math.max(1, Number(constituicao) || 1);
    return { faces: 16 + (con * 2), bonus: con };
}

export function rolarDadoVida(constituicao) {
    const { faces, bonus } = dadoVidaPorConstituicao(constituicao);
    const rolagem = 1 + Math.floor(Math.random() * faces);
    return { faces, bonus, rolagem, total: rolagem + bonus };
}

// ---------------------------------------------------------------------
// Tempo de treinamento/estudo (manual pg. 31):
// Atributos físicos (Destreza/Força/Constituição): novo nível x 9 dias.
// Atributos mentais (Sabedoria/Inteligência): novo nível x 9 dias.
// Perícias físicas e mentais: novo nível x 8 dias.
// ---------------------------------------------------------------------
export const ATRIBUTOS_FISICOS_TREINO = ["forca", "constituicao", "destreza"];
export const ATRIBUTOS_MENTAIS_TREINO = ["sabedoria", "inteligencia"];

export function tempoTreinoAtributo(novoNivel) {
    return (Number(novoNivel) || 0) * 9;
}

export function tempoTreinoPericia(novoNivel) {
    return (Number(novoNivel) || 0) * 8;
}

// ---------------------------------------------------------------------
// Dado de rolagem genérico (d20 padrão pra testes do Mestre / Log).
// ---------------------------------------------------------------------
export function rolarD20() {
    return 1 + Math.floor(Math.random() * 20);
}

export function rolarDado(faces) {
    return 1 + Math.floor(Math.random() * Number(faces || 20));
}

// ---------------------------------------------------------------------
// Gerenciador de Combate — dificuldade defensiva do alvo.
//
// O manual não define uma fórmula fechada pra "esquivar/resistir" a um
// ataque, então esta é uma regra caseira adotada pro Gerenciador de
// Combate automatizado: dificuldade = 10 + o atributo defensivo ligado
// ao TIPO de ataque recebido. Ataques de precisão/agilidade (armas de
// fogo, lâminas, CQC) usam Agilidade (esquiva); ataques de força bruta
// contundente usam Constituição (encaixar o golpe). Ajuste o mapa
// abaixo se a sua mesa usar outra convenção.
// ---------------------------------------------------------------------
export const ATRIBUTO_DEFESA_POR_PERICIA = {
    "Armas de Fogo de Pequeno Porte": "agilidade",
    "Armas de Fogo de Médio Porte": "agilidade",
    "Armas de Fogo de Grande Porte": "agilidade",
    "Lâminas Curtas": "agilidade",
    "Lâminas Longas": "agilidade",
    "Armas Brancas Exóticas": "agilidade",
    "CQC": "agilidade",
    "Contundentes Curtas": "constituicao",
    "Contundentes Longas": "constituicao"
};

export function atributoDefesaPorPericia(periciaUso) {
    return ATRIBUTO_DEFESA_POR_PERICIA[periciaUso] || "agilidade";
}

// Dificuldade defensiva de um jogador (ficha completa) contra um
// ataque: 10 + o atributo indicado (primário ou secundário), já com
// modificadores estruturados aplicados.
export function calcularDificuldadeDefesaJogador(dadosPrimarios, atributoChave, modificadoresPlanos) {
    const ehSecundario = ATRIBUTOS_SECUNDARIOS.some(a => a.key === atributoChave);
    if (ehSecundario) {
        const derivados = calcularDerivados(dadosPrimarios, modificadoresPlanos);
        const sec = derivados.secundarios[atributoChave];
        return 10 + (sec ? sec.total : 0);
    }
    const base = Number(dadosPrimarios[atributoChave]) || 0;
    const ajustes = modificadoresQueAfetam(`atributo:${atributoChave}`, modificadoresPlanos).reduce((acc, m) => acc + m.valor, 0);
    return 10 + base + ajustes;
}

// Dano total de uma arma (base + escala, se corpo a corpo): usado pelo
// Gerenciador de Combate pra resolver dano automaticamente. O atributo
// de escala é o mesmo atributo-base da perícia vinculada à arma (ex:
// Força pra Boxe, Destreza pra Lâminas Curtas).
export function calcularDanoTotalArma(armaConfig, atributoEscalaValor) {
    const base = Number(armaConfig?.danoBase) || 0;
    const mult = armaConfig?.escalaMult || 0;
    const bonusEscala = mult ? Math.floor(mult * (Number(atributoEscalaValor) || 0)) : 0;
    return base + bonusEscala;
}

// ---------------------------------------------------------------------
// Dano desarmado (Soco/Chute/Joelhada/Cotovelada — manual pg. 49-50):
// "1dForça + Força [escala]". O dado tem faces iguais ao valor de Força
// do personagem (mínimo 1 face, pra não quebrar com Força 0), e o bônus
// de escala usa a mesma fórmula de calcularDanoTotalArma (base 0 aqui,
// porque golpe desarmado não tem "dano base" fixo de arma).
// ---------------------------------------------------------------------
export function calcularDanoDesarmado(forcaValor, escalaMult) {
    const forca = Math.max(1, Number(forcaValor) || 1);
    const dado = rolarDado(forca);
    const bonusEscala = calcularDanoTotalArma({ danoBase: 0, escalaMult }, forca);
    return { faces: forca, dado, bonusEscala, total: dado + bonusEscala };
}

// ---------------------------------------------------------------------
// Dificuldade de acerto de Arma de Fogo (manual pg. 95-97): cada arma
// tem uma dificuldade base impressa (14 a 19), subtraída da Percepção
// do ATACANTE (mira/instinto — quanto mais perceptivo, mais fácil
// acertar). Diferente da dificuldade defensiva de combate corpo a
// corpo (10 + atributo do ALVO), que continua em
// calcularDificuldadeDefesaJogador.
// ---------------------------------------------------------------------
export function calcularDificuldadeArmaFogo(dificuldadeBase, percepcaoAtacante) {
    return (Number(dificuldadeBase) || 0) - (Number(percepcaoAtacante) || 0);
}
