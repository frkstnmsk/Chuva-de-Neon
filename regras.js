// =====================================================================
// CHUVA DE NEON — Motor de regras
// =====================================================================
// Tudo que é fórmula do manual mora aqui. Se uma regra mudar numa
// próxima edição do manual, é só ajustar este arquivo.

import { buscarPericiaPorNome, ATRIBUTOS_VEICULO, nivelVeiculo, precoNivelVeiculo, periodicidadeManutencaoVeiculo } from "./dados-manual.js";

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
// ---------------------------------------------------------------------
// PV máximo "final" de uma ficha (base da fórmula + modificadores
// estruturados + bônus de dado de vida do Level Up + override manual do
// Mestre, se houver) — mesma conta repetida em vários pontos de
// ficha.js/mestre.js pra exibir PV de alvo/participante; centralizada
// aqui pra ser reaproveitada pela Recuperação de PVs (avancarRecuperacaoPV
// abaixo, chamado durante o Timeskip em mestre.js, onde não há acesso
// direto aos elementos da UI que normalmente fazem essa conta).
// ---------------------------------------------------------------------
export function calcularPvMaximo(ficha, diaIndiceAtual) {
    const dados = (ficha && ficha.dados) || {};
    const modificadoresPlanos = coletarModificadores(ficha || {}, diaIndiceAtual);
    const base = Math.round(calcularDerivados(dados, modificadoresPlanos).recursos.pv.total) + (Number(dados.pvBonusExtra) || 0);
    const override = dados.pvMaximoOverride;
    const temOverride = override !== null && override !== undefined && override !== "";
    return temOverride ? (Number(override) || 0) : base;
}

export function coletarModificadores(ficha, diaIndiceAtual, horaAtualTexto) {
    // Item com tag "droga" NUNCA contribui com seus modificadores só por
    // estar na mochila — esse é o mesmo campo "Modificadores automáticos"
    // editável do item (ver modal), mas pra uma droga ele descreve o
    // efeito de QUANDO CONSUMIDA (ver consumirDroga em ficha.js), não um
    // bônus passivo por carregar o item. O efeito de verdade entra pela
    // fonte de baixo (calcularModificadoresDrogasAtivas), só enquanto
    // durar o efeito ativo.
    const inventarioSemDrogas = {};
    for (const [id, it] of Object.entries(ficha.inventario || {})) {
        if (it && it.tag === "droga") continue;
        inventarioSemDrogas[id] = it;
    }
    const fontes = [
        { lista: inventarioSemDrogas, tipo: "Item" },
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
            // Entidade desligada (botão ativo/desativado) não contribui com
            // nenhum modificador — mas continua cadastrada normalmente.
            // `ativo` ausente (fichas antigas, antes desse campo existir)
            // conta como ativo, pra não desligar tudo retroativamente.
            if (entidade.ativo === false) continue;
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
    // Abstinência (manual, cap. Drogas) + efeito ativo de droga consumida:
    // diferente das fontes acima, o valor não fica gravado direto no
    // `modificadores` da entidade — é calculado na hora. Só entra na
    // conta se quem chamou souber o dia atual (`diaIndiceAtual`); chamadas
    // antigas que não passam esse parâmetro continuam funcionando exatamente
    // como antes, sem quebrar nada.
    if (diaIndiceAtual !== undefined && diaIndiceAtual !== null) {
        todos.push(...calcularModificadoresAbstinencia(ficha, diaIndiceAtual));
        todos.push(...calcularModificadoresDrogasAtivas(ficha, diaIndiceAtual, horaAtualTexto));
    }
    return todos;
}

// ---------------------------------------------------------------------
// Abstinência (manual, cap. Drogas, pág. 58).
//
// "Após três dias sem contato com o objeto de dependência, o personagem
// começa a sofrer de abstinência. -1 em todos os testes para cada semana
// em abstinência e ao alcançar -3 o efeito negativo também afeta os PVs;
// -4 PVs máximos para cada semana em abstinência."
//
// Leitura adotada aqui (a mais direta do texto): a partir do 3º dia sem
// uso já conta como "semana 1" de abstinência (-1 em testes); a cada 7
// dias completos depois disso, mais uma semana (-2, -3...). Quando a
// contagem chega na semana 3 (malus -3), o corpo também começa a perder
// PV máximo: -4 por semana, contados a partir dessa 3ª semana em diante.
// `diaIndiceAtual`/`vicio.diaIndiceUltimoUso` usam o contador de dias
// corridos do calendário da mesa (ver calendario.js, campo `diaIndice`),
// não uma data em texto — assim não precisa parsear "DD/MM/AAAA".
//
// A ORIGEM do vício não é mais um nó próprio da ficha — é a Desvantagem
// "Vício" (qualquer desvantagem com um campo `substancia` preenchido, ver
// modal-campo-substancia-vicio em ficha.js), e quem zera a contagem é o
// botão "Consumir" de um item de inventário com a tag "droga" (ver
// consumirDroga em ficha.js).
// ---------------------------------------------------------------------
export function calcularAbstinenciaVicio(vicio, diaIndiceAtual) {
    const vazio = { diasDesdeUltimoUso: 0, semanas: 0, malusTestes: 0, malusPV: 0 };
    if (!vicio || vicio.ativo === false || !vicio.substancia) return vazio;
    if (diaIndiceAtual === undefined || diaIndiceAtual === null) return vazio;

    const diaUso = Number(vicio.diaIndiceUltimoUso);
    if (!Number.isFinite(diaUso)) return vazio;

    const dias = Math.max(0, Number(diaIndiceAtual) - diaUso);
    if (dias < 3) return { ...vazio, diasDesdeUltimoUso: dias };

    const semanas = Math.floor((dias - 3) / 7) + 1;
    const malusTestes = -semanas;
    const malusPV = semanas >= 3 ? -4 * (semanas - 2) : 0;
    return { diasDesdeUltimoUso: dias, semanas, malusTestes, malusPV };
}

// Modificadores estruturados (mesmo formato de coletarModificadores)
// gerados pelas Desvantagens "Vício" ativas de uma ficha, prontos pra
// plugar em testes_fisicos/mentais/sociais (geral) e recurso:pv (máximo).
export function calcularModificadoresAbstinencia(ficha, diaIndiceAtual) {
    const desvantagens = ficha.desvantagens || {};
    const todos = [];
    for (const id of Object.keys(desvantagens)) {
        const vicio = desvantagens[id];
        if (!vicio || !vicio.substancia) continue;
        const { semanas, malusTestes, malusPV } = calcularAbstinenciaVicio(vicio, diaIndiceAtual);
        if (semanas <= 0) continue;
        const origem = `Abstinência: ${vicio.substancia}`;
        todos.push({ alvo: "testes_fisicos", valor: malusTestes, origem });
        todos.push({ alvo: "testes_mentais", valor: malusTestes, origem });
        todos.push({ alvo: "testes_sociais", valor: malusTestes, origem });
        if (malusPV) todos.push({ alvo: "recurso:pv", valor: malusPV, origem });
    }
    return todos;
}

// ---------------------------------------------------------------------
// Duração em horas de um efeito, lida do texto livre da descrição do
// item (campo "Descrição / efeito narrativo" do modal — ver
// configurarAutocompleteItemBanco em ficha.js, que já sugere esse texto
// a partir do Catálogo de Drogas, mas continua 100% editável). Procura
// o primeiro padrão "<número>h" ou "<número> hora(s)" no texto — ex:
// "por 4h", "dura 2 horas", "duração: 6h" — e devolve o número de horas.
// `null` quando não encontra nenhum padrão (item sem duração explícita
// na descrição).
// ---------------------------------------------------------------------
export function extrairDuracaoHorasDaDescricao(texto) {
    if (!texto) return null;
    const m = String(texto).match(/(\d+(?:[.,]\d+)?)\s*h(?:oras?)?\b/i);
    if (!m) return null;
    const valor = Number(m[1].replace(",", "."));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
}

// Converte o texto livre de "hora" do calendário (ex: "08:00", "23:30")
// pra um número decimal de horas (8, 23.5). Texto ausente/mal formatado
// (o Mestre edita isso à mão, ver configurarCalendario em ficha.js) cai
// pra 0, sem quebrar a conta de quem chamou.
export function horaParaDecimal(horaTexto) {
    const m = String(horaTexto || "").match(/(\d{1,2}):(\d{2})/);
    if (!m) return 0;
    const h = Number(m[1]) || 0;
    const min = Number(m[2]) || 0;
    return h + (min / 60);
}

// "Timestamp" contínuo em horas desde o início da campanha (diaIndice
// vira horas cheias + a hora do dia, já decimal) — usado só pra saber
// se um efeito de droga (com duração em horas) já expirou ou não, sem
// precisar de nenhum campo novo de data/hora combinada no banco.
export function horasTotaisCalendario(diaIndiceAtual, horaTexto) {
    const dia = Number(diaIndiceAtual);
    if (!Number.isFinite(dia)) return null;
    return dia * 24 + horaParaDecimal(horaTexto);
}

// ---------------------------------------------------------------------
// Efeito ativo de droga consumida. Gravado em `ficha.efeitosDrogas` por
// consumirDroga (ficha.js) ao clicar "Consumir" num item com tag
// "droga" — a duração usada é a que estiver escrita na descrição do
// próprio item (ver extrairDuracaoHorasDaDescricao acima); sem nenhum
// padrão "Xh" no texto, cai no comportamento antigo de "até acabar o
// dia em jogo em que foi consumida". O efeito guarda `horasExpira`
// (timestamp contínuo em horas — ver horasTotaisCalendario) calculado
// na hora do consumo; a partir daí só compara com a hora atual, sem
// precisar de nenhuma limpeza/expiração ativa no banco.
// ---------------------------------------------------------------------
export function calcularModificadoresDrogasAtivas(ficha, diaIndiceAtual, horaAtualTexto) {
    const efeitos = ficha.efeitosDrogas || {};
    const horasAtuais = horasTotaisCalendario(diaIndiceAtual, horaAtualTexto);
    const todos = [];
    for (const chave of Object.keys(efeitos)) {
        const efeito = efeitos[chave];
        if (!efeito) continue;
        // Fichas/efeitos gravados antes da duração em horas existir só
        // tinham `diaIndiceConsumido` — continuam valendo "até acabar o
        // dia" (compatibilidade retroativa), sem precisar re-consumir.
        const aindaAtivo = (efeito.horasExpira !== undefined && efeito.horasExpira !== null && horasAtuais !== null)
            ? horasAtuais < efeito.horasExpira
            : efeito.diaIndiceConsumido === diaIndiceAtual;
        if (!aindaAtivo) continue;
        const origem = `Sob efeito: ${efeito.nome || "(droga)"}`;
        for (const m of (efeito.modificadores || [])) {
            if (!m.alvo || !m.valor) continue;
            todos.push({ alvo: m.alvo, valor: Number(m.valor) || 0, origem });
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
        // Fórmulas como Velocidade/Agilidade/Percepção somam dois
        // atributos primários e dividem por 2 — com soma ímpar isso dá
        // fração (ex.: Inteligência 2 + Sabedoria 1 = 3 / 2 = 1.5).
        // Manual: arredonda pra baixo, não pro inteiro mais próximo.
        // Math.floor não afeta as fórmulas que já somam sem dividir
        // (Massa Corpórea, Força de Vontade), então é seguro aplicar
        // pra todas aqui de uma vez.
        const base = Math.floor(sec.formula(d));
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

// Mapa categoria de perícia (dados-manual.js) -> alvo de modificador
// "genérico por categoria" (ver listaAlvosModificador acima). Existia
// no seletor do modal de Vantagem/Desvantagem/Item desde sempre, mas
// não estava ligado em lugar nenhum — uma Vantagem tipo "Instinto
// Animal" (+2 em testes físicos) não fazia nada de verdade. Corrigido
// aqui, no único lugar por onde toda rolagem de perícia passa.
const ALVO_TESTES_POR_CATEGORIA = { fisica: "testes_fisicos", mental: "testes_mentais", social: "testes_sociais" };
export { ALVO_TESTES_POR_CATEGORIA };

// Total de rolagem de uma perícia: SOMENTE o nível da perícia + modificadores
// estruturados que apontam pra ela. O manual trata perícia e atributo como
// rolagens distintas — somar o atributo aqui duplicaria o bônus quando o
// jogador já testa "perícia OU atributo" em testes disputados/golpes.
// `penalidadeSaude` é o desconto vindo do estado de saúde atual (ver
// calcularEstadoSaude abaixo): 0 normalmente, -2 se Machucado, -4 se
// Muito Machucado. Parâmetro opcional (default 0) pra não quebrar
// nenhuma chamada existente que ainda não repassa esse valor.
export function calcularTotalPericia(pericia, dadosPrimarios, modificadoresPlanos, penalidadeSaude = 0) {
    const nivel = Number(pericia.nivel) || 0;
    const ajustesPericia = modificadoresQueAfetam(`pericia:${pericia.nome}`, modificadoresPlanos);
    // Perícia "legado" (fora da lista fechada do manual — ver `legado`
    // em normalizacao.js) não tem categoria conhecida, então não recebe
    // bônus genérico de categoria — só o ajuste direto por nome acima.
    const infoPericia = buscarPericiaPorNome(pericia.nome);
    const alvoCategoria = infoPericia ? ALVO_TESTES_POR_CATEGORIA[infoPericia.categoria] : null;
    const ajustesCategoria = alvoCategoria ? modificadoresQueAfetam(alvoCategoria, modificadoresPlanos) : [];
    const ajustes = [...ajustesPericia, ...ajustesCategoria];
    const somaAjustes = ajustes.reduce((acc, m) => acc + m.valor, 0);
    const penalidade = Number(penalidadeSaude) || 0;
    return {
        nivel,
        ajustes,
        penalidadeSaude: penalidade,
        total: nivel + somaAjustes + penalidade
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
// Estado de saúde por PV atual (regra de ferimentos).
//
// "Machucado": ao chegar a 1/2 do PV máximo — Velocidade -2 e -2 em
// todos os testes.
// "Muito Machucado": ao chegar a 1/3 do PV máximo — Velocidade cai pela
// metade e -4 em todos os testes. Os dois estados NÃO se acumulam: ao
// atingir "Muito Machucado" (que por definição também está a 1/2 ou
// menos do PV), só o efeito mais severo vale.
//
// Perícia Tolerância (CON, manual): resistência maior a dor física e
// desconforto. Quando TREINADA (nível >= 1), empurra o limiar de "Muito
// Machucado" de 1/3 pra 1/4 do PV máximo — o personagem aguenta mais
// dano antes de ficar realmente incapacitado. Não muda o limiar de
// "Machucado" (continua 1/2) nem os valores das penalidades.
// ---------------------------------------------------------------------
export const LIMIAR_MACHUCADO = 1 / 2;
export const LIMIAR_MUITO_MACHUCADO_PADRAO = 1 / 3;
export const LIMIAR_MUITO_MACHUCADO_COM_TOLERANCIA = 1 / 4;

// Perícia com nível 0 (ou ausente da ficha) não conta como treinada —
// mesma convenção usada em modificadorDePericiaComPenalidade (ficha.js).
export function temPericiaTreinada(pericias, nomePericia) {
    return Object.values(pericias || {}).some(p => p.nome === nomePericia && (Number(p.nivel) || 0) > 0);
}

// `ignorarPenalidade` (default false): quando o Godmode do Mestre está
// ativo (ver mestre.js/ficha.js), o estado de Machucado/Muito Machucado
// (e a Morte por PV — ver abaixo) deixa de ter qualquer efeito mecânico
// — mesma filosofia de "Godmode ignora tudo" já usada pra trava de
// edição. Devolve o mesmo formato "vazio" do caso de PV máximo 0 (sem
// estado, sem badge, sem penalidade).
export function calcularEstadoSaude(pvAtual, pvMaximo, temTolerancia = false, ignorarPenalidade = false) {
    const max = Number(pvMaximo) || 0;
    const vazio = { estado: null, label: null, penalidadeTestes: 0, penalidadeVelocidade: 0, metadeVelocidade: false, morte: false };
    if (max <= 0) return vazio;
    if (ignorarPenalidade) return vazio;

    // PV atual ainda não definido (ficha nova/NPC recém-criado) conta
    // como PV cheio — não há ferimento registrado ainda.
    const atual = (pvAtual === null || pvAtual === undefined) ? max : (Number(pvAtual) || 0);

    // Em 0 PV (ou menos) o personagem morre — mesma regra de "Morte" já
    // usada pra Energia em calcularEstadoEnergia (ver abaixo). É checado
    // ANTES de Muito Machucado porque 0 sempre está dentro daquele
    // limiar também — só o efeito mais severo (morte) deve valer.
    if (atual <= 0) {
        return {
            estado: "morte",
            label: "Morte",
            penalidadeTestes: 0,
            penalidadeVelocidade: 0,
            metadeVelocidade: false,
            morte: true
        };
    }

    const limiarMuitoMachucado = temTolerancia ? LIMIAR_MUITO_MACHUCADO_COM_TOLERANCIA : LIMIAR_MUITO_MACHUCADO_PADRAO;

    if (atual <= max * limiarMuitoMachucado) {
        return {
            estado: "muito_machucado",
            label: "Muito Machucado",
            penalidadeTestes: -4,
            penalidadeVelocidade: 0,
            metadeVelocidade: true,
            morte: false
        };
    }
    if (atual <= max * LIMIAR_MACHUCADO) {
        return {
            estado: "machucado",
            label: "Machucado",
            penalidadeTestes: -2,
            penalidadeVelocidade: -2,
            metadeVelocidade: false,
            morte: false
        };
    }
    return vazio;
}

// ---------------------------------------------------------------------
// Desmaio Genérico (item 4 do plano de saúde/complicações): gatilho pra
// virar Ação Pendente pro Mestre quando um golpe único é grande E a
// ficha já está machucada DEPOIS de levar esse golpe. Não decide nada
// sozinha — só sinaliza a condição; quem confirma/rejeita é sempre o
// Mestre (ver criarAcaoPendente "confirmar_desmaio" em mestre.js).
export function deveConfirmarDesmaio(danoFinal, novoPv, pvMaximo, temTolerancia = false) {
    const max = Number(pvMaximo) || 0;
    if (max <= 0) return false;
    if ((Number(danoFinal) || 0) < max / 5) return false;
    const estado = calcularEstadoSaude(novoPv, max, temTolerancia, false);
    return estado.estado === "machucado" || estado.estado === "muito_machucado";
}

// ---------------------------------------------------------------------
// Amputação por Limiar de Dano (item 5 do plano de saúde/complicações):
// dois limiares de dano ÚNICO, independentes de golpe mirado (que já
// tem sua própria regra obrigatória — ver notaEfeitoLocal em mestre.js
// — as duas podem coexistir/dobrar no mesmo golpe). Só acha o limiar
// batido; não decide NADA sozinha — quem confirma/valida é sempre o
// Mestre (ver criarAcaoPendente "confirmar_amputacao" em mestre.js), já
// que a ficha não tem hoje um sistema de "membros" pra remover
// automaticamente.
export function limiarAmputacaoPorDano(danoFinal, pvMaximo) {
    const max = Number(pvMaximo) || 0;
    const dano = Number(danoFinal) || 0;
    if (max <= 0 || dano <= 0) return null;
    if (dano >= max / 5) return "membro";
    if (dano >= max / 10) return "dedo_orelha";
    return null;
}

// ---------------------------------------------------------------------
// Dilaceração (item 7 do plano de saúde/complicações): decide se ESSE
// golpe específico dilacera. Três fontes independentes (manual):
//   a) dano de EXPLOSÃO ≥ metade do PV total do alvo — automático por
//      tipo de dano, não depende de checkbox nenhum;
//   b) arma (fogo OU branca) marcada `dilacera: true` + ACERTO
//      CRÍTICO;
//   c) arma BRANCA marcada `dilacera: true` E
//      `dilaceraEmGolpeNormal: true` — dilacera em qualquer acerto,
//      não só crítico.
// ---------------------------------------------------------------------
export function golpeDilacera({ ehExplosao = false, danoFinal = 0, pvMaximo = 0, dilacera = false, dilaceraEmGolpeNormal = false, criticoPositivo = false, ehArmaBranca = false } = {}) {
    if (ehExplosao) {
        const max = Number(pvMaximo) || 0;
        return max > 0 && (Number(danoFinal) || 0) >= max / 2;
    }
    if (!dilacera) return false;
    if (criticoPositivo) return true;
    return ehArmaBranca && dilaceraEmGolpeNormal;
}

// Sangramento Profundo (item 7): só roda se o golpe dilacerou (ver
// golpeDilacera acima) E o dano final bateu 1/3 do PV total do alvo —
// dif e dano ficam a cargo de testarSangramentoProfundo em mestre.js.
export function deveTestarSangramentoProfundo(dilacerou, danoFinal, pvMaximo) {
    const max = Number(pvMaximo) || 0;
    if (!dilacerou || max <= 0) return false;
    return (Number(danoFinal) || 0) >= max / 3;
}

// ---------------------------------------------------------------------
// Recuperação de PVs (manual, seção "Saúde e PVs").
//
// O tempo de recuperação NÃO é fixo por PV perdido — é proporcional à
// porcentagem de PVs perdidos em relação ao total do personagem, numa
// escala de 30 dias pra recuperar 100% do PV:
//
//   Tempo Base (dias) = (PVs Perdidos / PVs Totais) × 30
//
// Exemplo do manual: Victor tem 200 PVs totais e perdeu 150.
//   Tempo Base = (150/200) × 30 = 22,5 dias → arredondado pra baixo: 22 dias.
//
// A recuperação só começa DEPOIS que o Mestre autoriza o pedido na fila
// de Ações Pendentes (ver criarAcaoPendente "iniciar_recuperacao_pv" /
// confirmarAcaoPendente em mestre.js) — o jogador não pode simplesmente
// setar isso sozinho.
//
// Infecção (manual, "Complicações de ferimentos" — ver aplicarInfeccao
// em mestre.js): personagem com infecção ativa tem esse tempo de
// repouso aumentado em 50%. O multiplicador é aplicado ANTES do
// arredondamento final pra baixo, não depois — senão "Tempo Base
// arredondado × 1.5" poderia dar um resultado diferente de "Tempo Base
// × 1.5, arredondado".
// ---------------------------------------------------------------------
export function calcularTempoRecuperacaoPV(pvPerdidos, pvTotal, infectado = false) {
    const perdidos = Number(pvPerdidos) || 0;
    const total = Number(pvTotal) || 0;
    if (total <= 0 || perdidos <= 0) return 0;
    let tempoBase = (perdidos / total) * 30;
    if (infectado) tempoBase *= 1.5;
    return Math.floor(tempoBase);
}

// Avança uma recuperação de PV em andamento pelos dias de um Timeskip
// (ver passarVariosDias em mestre.js — é lá que isso é chamado pra CADA
// ficha com recuperação ativa, uma vez por Timeskip confirmado).
//
// `rec` é o estado salvo em fichas/{id}/dados/recuperacaoPV:
//   { ativa, pvPerdidosInicial, diasNecessarios, diasDecorridos }
// `diasPassados` é a quantidade de dias que o Timeskip avançou.
//
// A recuperação é tratada como linear ao longo dos `diasNecessarios`
// (mesma taxa de PV/dia do início ao fim) — não há como recuperar mais
// dias do que os que ainda faltavam pra completar, então se o Timeskip
// for maior do que o necessário, o excedente "sobra" (diasSobrando) em
// vez de se perder ou de recuperar PV além do que a ficha perdeu.
//
// Retorna null se não havia recuperação ativa pra essa ficha. Caso
// contrário: { pvRecuperadosNestaLeva, diasUsados, diasSobrando,
// novoDiasDecorridos, completo }.
export function avancarRecuperacaoPV(rec, diasPassados) {
    if (!rec || !rec.ativa) return null;
    const diasNecessarios = Number(rec.diasNecessarios) || 0;
    const pvPerdidosInicial = Number(rec.pvPerdidosInicial) || 0;
    if (diasNecessarios <= 0 || pvPerdidosInicial <= 0) return null;

    const diasJa = Number(rec.diasDecorridos) || 0;
    const passados = Math.max(0, Math.trunc(diasPassados) || 0);
    const diasFaltantes = Math.max(0, diasNecessarios - diasJa);
    const diasUsados = Math.min(passados, diasFaltantes);
    const diasSobrando = passados - diasUsados;
    const novoDiasDecorridos = diasJa + diasUsados;
    const completo = novoDiasDecorridos >= diasNecessarios;

    // PV recuperado é a diferença entre o total acumulado "até agora" e
    // o total acumulado "até antes desta leva de dias" — assim, se o
    // Timeskip cruzar vários avanços em sequência (não é o caso hoje,
    // mas evita erro de arredondamento acumulado caso venha a ser
    // chamado mais de uma vez pro mesmo período), a soma das levas nunca
    // ultrapassa pvPerdidosInicial.
    const pvAcumuladoAntes = Math.floor((diasJa / diasNecessarios) * pvPerdidosInicial);
    const pvAcumuladoAgora = completo ? pvPerdidosInicial : Math.floor((novoDiasDecorridos / diasNecessarios) * pvPerdidosInicial);
    const pvRecuperadosNestaLeva = pvAcumuladoAgora - pvAcumuladoAntes;

    return { pvRecuperadosNestaLeva, diasUsados, diasSobrando, novoDiasDecorridos, completo };
}

// Aplica o efeito do estado de saúde em cima de uma Velocidade já
// calculada (base do manual + modificadores estruturados, ex: carga —
// ver calcularCarga acima). Recebe/retorna o mesmo formato de
// `resultado.secundarios.velocidade` de calcularDerivados, com o efeito
// entrando como um "ajuste" a mais (pra aparecer no detalhamento), mesmo
// no caso de Muito Machucado, onde o efeito real é multiplicativo
// (metade) — o ajuste registrado é só o delta equivalente, pra manter o
// tooltip consistente (base + ajustes = total).
export function aplicarEstadoSaudeVelocidade(infoVelocidade, estadoSaude) {
    if (!estadoSaude || !estadoSaude.estado) return infoVelocidade;
    const antes = infoVelocidade.total;
    const depois = estadoSaude.metadeVelocidade ? Math.floor(antes / 2) : antes + estadoSaude.penalidadeVelocidade;
    return {
        ...infoVelocidade,
        ajustes: [...infoVelocidade.ajustes, { valor: depois - antes, origem: `Estado de saúde: ${estadoSaude.label}` }],
        total: depois
    };
}

// ---------------------------------------------------------------------
// Estado de Energia (gasto ao usar poderes/habilidades — manual).
// Energia = 6 + Constituição (ver RECURSOS acima).
//
// Em 1/2 da Energia máxima ou menos: -2 em testes físicos.
// Em 1/3 da Energia máxima ou menos: -3 em testes físicos e -2 em
// testes mentais. Os dois limiares NÃO se acumulam: ao atingir 1/3
// (que por definição também está em 1/2 ou menos), só o efeito mais
// severo vale — mesma filosofia de calcularEstadoSaude acima.
// Em 0 de Energia: Morte.
// ---------------------------------------------------------------------
export const LIMIAR_ENERGIA_BAIXA = 1 / 2;
export const LIMIAR_ENERGIA_CRITICA = 1 / 3;

// `ignorarPenalidade` (default false): mesma lógica de Godmode usada em
// calcularEstadoSaude — quando ativo, o estado de Energia deixa de ter
// qualquer efeito mecânico, inclusive a morte em 0.
export function calcularEstadoEnergia(energiaAtual, energiaMaxima, ignorarPenalidade = false) {
    const max = Number(energiaMaxima) || 0;
    const vazio = { estado: null, label: null, penalidadeFisica: 0, penalidadeMental: 0, morte: false };
    if (max <= 0) return vazio;
    if (ignorarPenalidade) return vazio;

    // Energia atual ainda não definida (ficha nova/NPC recém-criado)
    // conta como Energia cheia — mesma convenção do PV em calcularEstadoSaude.
    const atual = (energiaAtual === null || energiaAtual === undefined) ? max : (Number(energiaAtual) || 0);

    if (atual <= 0) {
        return {
            estado: "morte",
            label: "Morte",
            penalidadeFisica: 0,
            penalidadeMental: 0,
            morte: true
        };
    }
    if (atual <= max * LIMIAR_ENERGIA_CRITICA) {
        return {
            estado: "energia_critica",
            label: "Energia Crítica",
            penalidadeFisica: -3,
            penalidadeMental: -2,
            morte: false
        };
    }
    if (atual <= max * LIMIAR_ENERGIA_BAIXA) {
        return {
            estado: "energia_baixa",
            label: "Energia Baixa",
            penalidadeFisica: -2,
            penalidadeMental: 0,
            morte: false
        };
    }
    return vazio;
}

// Limite de atributo fora da criação (level up), diferente do limite de
// criação (5, em criacao.js). Usado tanto pela UI de level up quanto,
// agora, validado de novo aqui no backend antes de gastar o ponto.
export const MAX_ATRIBUTO_JOGO = 7;

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
    // Regra de mínimo: o resultado não pode ser menor que metade do
    // valor do dado + 1. Em vez de travar nesse mínimo, rerola o dado
    // (naturalmente, de novo) até sair um valor >= mínimo — `rerolagens`
    // guarda cada tentativa descartada, pro log poder mostrar o
    // caminho completo até o valor final válido.
    const minimo = Math.floor(faces / 2) + 1;
    const rerolagens = [];
    let valorFinal = 1 + Math.floor(Math.random() * faces);
    while (valorFinal < minimo) {
        rerolagens.push(valorFinal);
        valorFinal = 1 + Math.floor(Math.random() * faces);
    }
    return { faces, bonus, minimo, rerolagens, valorFinal, total: valorFinal + bonus };
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
// Teste de reanimação — ao morrer (0 PV ou 0 Energia), o jogador tem
// uma última chance: rola 3d20, precisa de 11+ em CADA um dos três
// dados pra sobreviver (volta a 1 PV). Errar qualquer um dos três é
// morte definitiva — ver verificarMorte()/tentarReanimacao() em
// ficha.js, que trava a edição da ficha inteira depois disso (só o
// Mestre em Godmode continua conseguindo mexer).
// ---------------------------------------------------------------------
export const DIFICULDADE_REANIMACAO = 11;

export function rolarTesteReanimacao() {
    const dados = [rolarD20(), rolarD20(), rolarD20()];
    const sucessos = dados.map(d => d >= DIFICULDADE_REANIMACAO);
    return {
        dados,
        sucessos,
        sucessoTotal: sucessos.every(Boolean)
    };
}

// ---------------------------------------------------------------------
// Teste de Constituição contra Sangramento (Golpe Perfurante) — decide
// SE o ferimento sangra (a rolagem em mestre.js só entra em
// aplicarSangramento se este teste FALHAR). dificuldade = 10 + nível da
// arma + agravante do local mirado (difExtra — manual: Torso +1,
// Cabeça +2, Membro/Extremidade sem agravante extra). Continua sendo a
// rolagem "d20 + Constituição do alvo" comparada contra essa
// dificuldade — ver testarSangramento em mestre.js, que faz a rolagem
// de verdade e decide se chama aplicarSangramento.
// ---------------------------------------------------------------------
export function dificuldadeSangramento(nivelArma, difExtra = 0) {
    return 10 + (Number(nivelArma) || 0) + (Number(difExtra) || 0);
}

// ---------------------------------------------------------------------
// Teste de Desmaio (regra padrão da mesa, não automatizada — o sistema
// só avisa o Mestre pra resolver manualmente): PRA ACORDAR de um
// desmaio, quando não houver nenhuma regra mais específica cobrindo o
// caso (ex.: Desacordado do Jiu Jitsu nível 3 é inconsciência mas SEM
// teste pra se libertar sozinho — regra específica do manual, não usa
// isto aqui), o padrão é um teste de Constituição, dificuldade 15.
// Agravantes (como o +4 do golpe contundente na Cabeça — ver
// LOCAIS_MIRA em dados-manual.js) somam em cima dessa base.
// ---------------------------------------------------------------------
export const DIFICULDADE_BASE_DESMAIO = 15;

export function dificuldadeDesmaio(difExtra = 0) {
    return DIFICULDADE_BASE_DESMAIO + (Number(difExtra) || 0);
}

// ---------------------------------------------------------------------
// Infecção — Complicações de ferimentos (manual, seção "Saúde e PVs" /
// "Complicações"). O manual descreve DOIS gatilhos pro mesmo teste de
// Constituição vs. Infecção, ambos usando esta função:
//
// 1) Tratamento malfeito: ficar em ambiente sujo, não isolar o
//    ferimento exposto, ou receber tratamento em local não higienizado
//    / com equipamento não esterilizado — dificuldade FIXA 18. Falha:
//    aumenta o tempo de repouso necessário em 50%.
// 2) Ferimento profundo/traumático: mantém risco de infecção mesmo com
//    tratamento ADEQUADO — dificuldade VARIÁVEL entre 18 e 22 (a
//    critério do Mestre, conforme gravidade/exposição). Esse teste se
//    repete uma vez por cena até o personagem receber tratamento
//    médico (incluindo a própria cena do tratamento).
//
// Itens/tratamento reduzem a dificuldade na hora do teste (ex.: Soro
// Fisiológico: -2 — manual, Equipamentos médicos). `modificadorItens`
// é sempre um valor a SUBTRAIR da dificuldade base (positivo = mais
// fácil resistir). Falha em Remover Projétil com complicação deixa o
// projétil alojado — infecção GARANTIDA, sem rolar este teste (ver
// aplicarInfeccao em mestre.js, chamada direto nesse caso).
// ---------------------------------------------------------------------
export const DIFICULDADE_INFECCAO_MINIMA = 18;
export const DIFICULDADE_INFECCAO_MAXIMA = 22;

export function dificuldadeInfeccao(dificuldadeBase = DIFICULDADE_INFECCAO_MINIMA, modificadorItens = 0) {
    return (Number(dificuldadeBase) || DIFICULDADE_INFECCAO_MINIMA) - (Number(modificadorItens) || 0);
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
// ataque: baseDificuldade + o atributo indicado (primário ou
// secundário), já com modificadores estruturados aplicados.
// `baseDificuldade` varia por manobra (manual pg. 49-50: Soco = 8,
// Chute/Arma branca = 9, Joelhada/Cotovelada = 10) — o padrão é 10 pra
// manter compatibilidade com manobras que já usam essa base (Agarrar,
// Derrubar etc.) ou pra chamadas que não informam uma manobra específica.
export function calcularDificuldadeDefesaJogador(dadosPrimarios, atributoChave, modificadoresPlanos, baseDificuldade = 10) {
    const base10 = Number(baseDificuldade) || 0;
    const ehSecundario = ATRIBUTOS_SECUNDARIOS.some(a => a.key === atributoChave);
    if (ehSecundario) {
        const derivados = calcularDerivados(dadosPrimarios, modificadoresPlanos);
        const sec = derivados.secundarios[atributoChave];
        return base10 + (sec ? sec.total : 0);
    }
    const base = Number(dadosPrimarios[atributoChave]) || 0;
    const ajustes = modificadoresQueAfetam(`atributo:${atributoChave}`, modificadoresPlanos).reduce((acc, m) => acc + m.valor, 0);
    return base10 + base + ajustes;
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
// `opcoes` carrega as especificidades de perícia de combate (manual pg.
// 22, ver calcularEspecificidadeGolpe em dados-manual.js):
// - dadoMultiplicador: multiplica o resultado do dado (Boxe multiplica
//   pelo valor da perícia).
// - danoMaximoSemRolar: em vez de rolar o dado, usa o valor máximo
//   (faces) direto — golpes desarmados de Karatê Cobra Kai e Força
//   Bruta não precisam de rolagem de Força.
export function calcularDanoDesarmado(forcaValor, escalaMult, opcoes = {}) {
    const { dadoMultiplicador = 1, danoMaximoSemRolar = false } = opcoes;
    const forca = Math.max(1, Number(forcaValor) || 1);
    const dado = danoMaximoSemRolar ? forca : rolarDado(forca);
    const mult = Number(dadoMultiplicador) || 1;
    const dadoTotal = dado * mult;
    const bonusEscala = calcularDanoTotalArma({ danoBase: 0, escalaMult }, forca);
    return { faces: forca, dado, dadoMultiplicador: mult, dadoTotal, bonusEscala, total: dadoTotal + bonusEscala };
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

// =====================================================================
// VEÍCULOS (manual pg. 36-43) — Fase 1 do plano (ver plano-veiculos.txt):
// modificadores derivados dos 5 atributos com escala fixa
// (ESCALAS_VEICULO em dados-manual.js) + cálculo de manutenção.
// Acessórios/Armamento fica de fora por enquanto — ver nota em
// dados-manual.js.
// =====================================================================

// ---------------------------------------------------------------------
// Proteção: PVs máximos e redução de dano do veículo, direto da escala
// (manual pg. 37). Não tem fórmula — é tabela pura — mas fica aqui (e
// não só em dados-manual.js) porque é "regra derivada" igual as outras
// funções deste arquivo: quem monta a ficha/UI não deveria precisar
// saber que por baixo é uma lookup em ESCALAS_VEICULO.
// ---------------------------------------------------------------------
export function pvMaxVeiculo(protecao) {
    return nivelVeiculo("protecao", protecao)?.pv ?? 0;
}

export function reducaoDanoVeiculo(protecao) {
    return nivelVeiculo("protecao", protecao)?.reducaoDano ?? 0;
}

// A cada dois pontos em Proteção, o veículo sofre -1 em Velocidade
// (manual pg. 37). Sempre negativo ou zero.
export function penalidadeVelocidadePorProtecao(protecao) {
    // `|| 0` normaliza o -0 que -Math.floor(0/2) produziria — mesmo
    // valor numérico, mas -0 aparece feio se for exibido direto na UI.
    return (-Math.floor((Number(protecao) || 0) / 2)) || 0;
}

// ---------------------------------------------------------------------
// Velocidade: km/h máximo e ações por turno. O nível EFETIVO de
// Velocidade já desconta a penalidade de Proteção (ver acima) antes de
// consultar a escala de km/h — por isso nunca deve ficar negativo (o
// carro só fica parado, nível 0, não "menos que parado").
//
// Ações por turno: "cada ponto determina o número de ações que podem
// ser realizadas em um turno... limitado pelo atributo Raciocínio do
// piloto" (manual pg. 36) — usa o mesmo nível efetivo (o carro
// detonado pela Proteção baixa também fica mais lento pra agir, não só
// mais lento em km/h).
// ---------------------------------------------------------------------
export function nivelVelocidadeEfetivo(velocidade, protecao) {
    const nivelBase = Number(velocidade) || 0;
    return Math.max(0, Math.min(5, nivelBase + penalidadeVelocidadePorProtecao(protecao)));
}

export function kmhMaxVeiculo(nivelVelocidadeEfetivoValor) {
    return nivelVeiculo("velocidade", nivelVelocidadeEfetivoValor)?.kmhMax ?? 0;
}

export function acoesPorTurnoVeiculo(nivelVelocidadeEfetivoValor, raciocinioPiloto) {
    const limitePiloto = Math.max(0, Math.floor(Number(raciocinioPiloto) || 0));
    return Math.min(Math.max(0, Number(nivelVelocidadeEfetivoValor) || 0), limitePiloto);
}

// ---------------------------------------------------------------------
// Eficiência: turnos até atingir a velocidade máxima — tabela pura
// (manual pg. 36), sem modificador de outro atributo.
// ---------------------------------------------------------------------
export function turnosAteVelocidadeMaximaVeiculo(eficiencia) {
    return nivelVeiculo("eficiencia", eficiencia)?.turnosAteVelMax ?? 8;
}

// ---------------------------------------------------------------------
// Capacidade de Carga: kg máximo + penalidade em Contabilidade a
// partir do nível 3 (manual pg. 37: "cada nível a partir daqui dá -1
// em Contabilidade" — ou seja, nível 3 = -1, nível 4 = -2, nível 5 = -3).
// ---------------------------------------------------------------------
export function kgMaxVeiculo(capacidadeCarga) {
    return nivelVeiculo("capacidadeCarga", capacidadeCarga)?.kgMax ?? 0;
}

export function penalidadeContabilidadeCarga(capacidadeCarga) {
    const nivel = Number(capacidadeCarga) || 0;
    return nivel >= 3 ? -(nivel - 2) : 0;
}

// ---------------------------------------------------------------------
// Controle: bônus/penalidade em drift e em rolagens de fuga/corrida,
// além de duas capacidades binárias (manobrar, drift) — ver escala
// completa em ESCALAS_VEICULO.controle.niveis (manual pg. 37-38):
//   nível 0: -3 em TODAS as rolagens (não só drift/fuga)
//   nível 1: sem bônus, mas incapaz de realizar manobras
//   nível 2: pronto pra drift, ainda sem bônus numérico
//   nível 3-5: +1/+2/+3 em drift e em fuga/corrida
// ---------------------------------------------------------------------
export function modificadoresControleVeiculo(controle) {
    const nivel = Math.max(0, Math.min(5, Number(controle) || 0));
    return {
        nivel,
        penalidadeRolagensGerais: nivel === 0 ? -3 : 0,
        podeRealizarManobras: nivel >= 2,
        bonusDrift: nivel >= 3 ? nivel - 2 : 0,
        bonusFugaCorrida: nivel >= 3 ? nivel - 2 : 0
    };
}

// ---------------------------------------------------------------------
// Pacote único com todos os modificadores derivados dos 5 atributos —
// pensado pra UI da ficha (fase 4) chamar de uma vez só e ter tudo que
// precisa pra desenhar o card do veículo, sem repetir lookups.
// `raciocinioPiloto` é opcional (usa 0 se não vier, zerando ações por
// turno) — normalmente é o Raciocínio (já com modificadores) de quem
// está dirigindo, resolvido pela ficha.js.
// ---------------------------------------------------------------------
export function calcularModificadoresVeiculo(atributos = {}, raciocinioPiloto = 0) {
    const velocidade = Number(atributos.velocidade) || 0;
    const eficiencia = Number(atributos.eficiencia) || 0;
    const protecao = Number(atributos.protecao) || 0;
    const capacidadeCarga = Number(atributos.capacidadeCarga) || 0;
    const controle = Number(atributos.controle) || 0;

    const penalidadeVelocidade = penalidadeVelocidadePorProtecao(protecao);
    const nivelVelEfetivo = nivelVelocidadeEfetivo(velocidade, protecao);

    return {
        velocidade: {
            nivel: velocidade,
            nivelEfetivo: nivelVelEfetivo,
            penalidadePorProtecao: penalidadeVelocidade,
            kmhMax: kmhMaxVeiculo(nivelVelEfetivo),
            acoesPorTurno: acoesPorTurnoVeiculo(nivelVelEfetivo, raciocinioPiloto)
        },
        eficiencia: {
            nivel: eficiencia,
            turnosAteVelocidadeMaxima: turnosAteVelocidadeMaximaVeiculo(eficiencia)
        },
        protecao: {
            nivel: protecao,
            pvMaximo: pvMaxVeiculo(protecao),
            reducaoDano: reducaoDanoVeiculo(protecao)
        },
        capacidadeCarga: {
            nivel: capacidadeCarga,
            kgMax: kgMaxVeiculo(capacidadeCarga),
            penalidadeContabilidade: penalidadeContabilidadeCarga(capacidadeCarga)
        },
        controle: modificadoresControleVeiculo(controle)
    };
}

// ---------------------------------------------------------------------
// Manutenção (manual pg. 41): "determinado por 1/20 do valor de cada
// atributo. Cada atributo tem um valor de manutenção; você deve pagar
// todos eles somados." O "valor" de um atributo é o preço de mercado
// do nível atual (ESCALAS_VEICULO); cada fração é arredondada pra
// baixo — mesma regra geral de arredondamento do sistema — antes de
// somar, não depois (senão dois atributos "baratos" que juntos
// fechariam outro vigésimo perderiam esse centavo).
//
// Acessórios/Armamento não entra na soma: não tem tabela de preço fixa
// por nível (cada item tem seu próprio custo) — ver nota em
// dados-manual.js.
// ---------------------------------------------------------------------
export function valorTotalVeiculo(atributos = {}) {
    return ATRIBUTOS_VEICULO.reduce((soma, chave) => soma + precoNivelVeiculo(chave, atributos[chave]), 0);
}

export function valorManutencaoVeiculo(atributos = {}) {
    return ATRIBUTOS_VEICULO.reduce((soma, chave) => soma + Math.floor(precoNivelVeiculo(chave, atributos[chave]) / 20), 0);
}

// ---------------------------------------------------------------------
// Chave física do veículo (ver plano-veiculos.txt, adendo "chave"):
// todo veículo criado pelo Mestre nasce trancado (ver `trancado` em
// normalizarVeiculos, normalizacao.js) e vem com um item-chave criado
// junto no inventário da MESMA ficha (ver salvarVeiculoDoModal em
// ficha.js). Só dá pra destrancar se a ficha tiver, no inventário, um
// item tag "chave" cujo veiculoId aponte pra esse veículo — não
// importa qual item exatamente (cópia perdida e recriada pelo Mestre
// também serve), por isso é uma busca e não uma comparação direta de
// id. Fora do escopo por enquanto: chave "sumir" da ficha de quem
// destrancou pra ficha de quem furtou o carro (isso já existe como
// mecanismo genérico de troca de item entre fichas — "dar_item" — só
// não tem nenhuma trava especial de veículo em cima disso ainda).
// ---------------------------------------------------------------------
export function veiculoTemChaveDisponivel(fichaAtual, veiculoId) {
    const inventario = (fichaAtual && fichaAtual.inventario) || {};
    return Object.values(inventario).some(it => it && it.tag === "chave" && it.veiculoId === veiculoId);
}

// Periodicidade (manual pg. 41): corrida = semanal, carga = quinzenal,
// pessoal = mensal. Convertido pra dias só como apoio a uma eventual
// integração futura com o calendário (fila automática, nos moldes do
// Custo de Vida semanal já existente) — por enquanto o pagamento é
// manual, sob demanda do jogador (ver plano-veiculos.txt, item 5).
export const DIAS_POR_PERIODICIDADE_MANUTENCAO = { semanal: 7, quinzenal: 14, mensal: 30 };

export function diasParaProximaManutencaoVeiculo(tipoVeiculo) {
    const periodicidade = periodicidadeManutencaoVeiculo(tipoVeiculo);
    return DIAS_POR_PERIODICIDADE_MANUTENCAO[periodicidade] || DIAS_POR_PERIODICIDADE_MANUTENCAO.mensal;
}

// =====================================================================
// SAÚDE — Ferimentos (ver plano-sistema-saude-ferimentos.txt)
// =====================================================================
// Regras puras (dificuldades, perícias aceitas, penalidade de item) do
// sistema de feridas persistentes. A orquestração de leitura/escrita no
// Firebase (criar ferida, aplicar tratamento, sincronizar a flag
// agregada de infecção) fica em saude.js — aqui só ficam os números e
// tabelas que vêm direto do manual, igual ao resto deste arquivo.
//
// Cada ação de tratamento tem uma FAIXA de dificuldade no manual (ex:
// Suturar Ferimento: 14 corte simples a 18 corte profundo/área de
// movimento) — quem está tratando escolhe o valor dentro da faixa
// conforme a gravidade narrativa do ferimento, igual já acontece hoje
// no modal de Testar Infecção (dificuldadeInfeccao acima).
// ---------------------------------------------------------------------

// Tipos de ferida possíveis (criados automaticamente pelo golpe, ou
// lançados manualmente pelo Mestre no caso de fratura/queimadura — o
// manual não dá uma fórmula de "dano X vira fratura/queimadura").
export const TIPOS_FERIDA = ["sangramento", "corte", "projetil", "fratura", "queimadura"];

// Ações de tratamento disponíveis, cada uma associada ao(s) tipo(s) de
// ferida em que se aplica, à(s) perícia(s) que servem pra rolar o
// teste, e à faixa de dificuldade do manual.
export const TRATAMENTOS_FERIDA = {
    estancar_sangramento: {
        label: "Estancar Sangramento (Estabilização)",
        tiposFerida: ["sangramento"],
        pericias: ["Primeiros Socorros", "Medicina"],
        dificuldadeMin: 12,
        dificuldadeMax: 18,
        itensSugeridos: "Atadura, pano limpo, ou Kit de Primeiros Socorros",
        efeitoSucesso: "estancada"
    },
    remover_projetil: {
        label: "Remover Projétil",
        tiposFerida: ["projetil"],
        pericias: ["Medicina", "Cirurgia"],
        dificuldadeMin: 15,
        dificuldadeMax: 20,
        itensSugeridos: "Pinça esterilizada, bisturi, ou Kit Cirúrgico (nível 3+)",
        efeitoSucesso: "sem_sangramento"
    },
    suturar_ferimento: {
        label: "Suturar Ferimento (Fechar)",
        // Corte fecha direto; sangramento pode suturar de "aberta" ou
        // já "estancada"; projétil só depois de "sem_sangramento"
        // (projétil já removido) — ver feridaAceitaSutura abaixo.
        tiposFerida: ["corte", "sangramento", "projetil"],
        pericias: ["Primeiros Socorros", "Medicina"],
        dificuldadeMin: 14,
        dificuldadeMax: 18,
        itensSugeridos: "Agulha cirúrgica, fio cirúrgico, ou Kit de Sutura",
        efeitoSucesso: "tratada"
    },
    tratar_fratura: {
        label: "Tratar Fratura",
        tiposFerida: ["fratura"],
        pericias: ["Medicina"],
        dificuldadeMin: 16,
        dificuldadeMax: 22,
        itensSugeridos: "Talas, ataduras, gesso, ou Kit de Imobilização",
        efeitoSucesso: "tratada"
    },
    tratar_queimadura: {
        label: "Tratar Queimadura",
        tiposFerida: ["queimadura"],
        pericias: ["Primeiros Socorros"],
        dificuldadeMin: 12,
        dificuldadeMax: 20,
        itensSugeridos: "Soro fisiológico, pomada (queimadura), gaze não aderente",
        efeitoSucesso: "tratada"
    },
    // Cirurgia de Campo (Emergência) — item 8 do plano de saúde/
    // complicações: diferente das outras 5 ações, o SUCESSO não tem um
    // efeito fixo predefinido pro estado da ferida (efeitoSucesso: null
    // — tratado como caso especial em saude.js, que NÃO sobrescreve
    // atualizacoesFerida.estado sozinho). O Mestre lê o histórico e, se
    // fizer sentido na cena, aplica manualmente em Godmode (reverter
    // coma, estabilizar, etc.). Disponível pra qualquer tipo de ferida
    // ainda "aberta" (é uma medida de emergência, não amarrada a um
    // tipo específico de ferimento).
    cirurgia_de_campo: {
        label: "Cirurgia de Campo (Emergência)",
        tiposFerida: ["sangramento", "corte", "projetil", "fratura", "queimadura"],
        pericias: ["Cirurgia"],
        dificuldadeMin: 20,
        dificuldadeMax: 25,
        itensSugeridos: "Kit Cirúrgico completo, ambiente estéril improvisado",
        efeitoSucesso: null
    }
};

// Suturar é permitido em: ferida "corte" direto ("aberta"); ferida
// "sangramento" tanto "aberta" quanto já "estancada" (plano, seção 3 —
// os dois caminhos levam a "tratada"); ou "projetil" já com estado
// "sem_sangramento" (projétil removido primeiro) — ver
// plano-sistema-saude-ferimentos.txt, seção 3.
export function feridaAceitaSutura(ferida) {
    if (!ferida) return false;
    if (ferida.tipo === "corte") return ferida.estado === "aberta";
    if (ferida.tipo === "sangramento") return ferida.estado === "aberta" || ferida.estado === "estancada";
    if (ferida.tipo === "projetil") return ferida.estado === "sem_sangramento";
    return false;
}

// Situação do item usado no tratamento (decisão da mesa, ver plano):
// item adequado (o que o manual pede) não penaliza e ainda pode ganhar
// bônus específico do item (preenchido à mão pelo tratador, igual ao
// campo de modificador livre já usado em Testar Infecção); item
// improvisado (serve, mas não é o ideal) penaliza -1; sem item nenhum
// penaliza -2.
export const PENALIDADE_ITEM_TRATAMENTO = {
    adequado: 0,
    improvisado: -1,
    nenhum: -2
};

export function modificadorPorSituacaoItem(situacao) {
    return PENALIDADE_ITEM_TRATAMENTO[situacao] ?? 0;
}

// ---------------------------------------------------------------------
// Tratamento em hospital (item 3 do plano de saúde/complicações):
// reduz em 1/10 o tempo de recuperação de PV da FICHA INTEIRA
// (diasNecessarios), não só o risco de infecção da ferida tratada.
// Sinal armazenado como flag simples em fichas/{id}/dados/tratamentoHospital
// (ver tratarFerida em saude.js) — não empilha, um novo tratamento em
// hospital só sobrescreve o anterior. Aplicado DEPOIS do arredondamento
// de calcularTempoRecuperacaoPV (é um desconto "em cima" do valor já
// calculado, não parte da fórmula base como o +50% de infecção).
// ---------------------------------------------------------------------
export function aplicarReducaoTratamentoHospital(diasNecessarios, tratadoEmHospital) {
    const dias = Number(diasNecessarios) || 0;
    if (!tratadoEmHospital || dias <= 0) return dias;
    return Math.max(0, Math.floor(dias - dias / 10));
}

// ---------------------------------------------------------------------
// Dano por margem de falha em teste de tratamento (manual, "Regras
// gerais de tratamento"): em QUALQUER falha (não só falha com
// complicação), o paciente perde 5 PVs para cada ponto que o
// resultado ficou abaixo da dificuldade. É a perda BASE de toda falha
// — a falha com complicação (d20 bruto 1-3, ver o teste `bruto <= 3`
// em tratarFerida, saude.js) soma efeitos adicionais específicos da
// ação EM CIMA desse valor, não substitui.
// Exemplo: dificuldade 18, resultado 15 -> 3 pontos abaixo -> 15 PVs.
// Sucesso (resultado >= dificuldade) não perde nada (retorna 0).
// ---------------------------------------------------------------------
export function danoPorMargemFalha(resultado, dificuldade) {
    const margem = (Number(dificuldade) || 0) - (Number(resultado) || 0);
    if (margem <= 0) return 0;
    return margem * 5;
}

// Uma ferida só é considerada FECHADA (não bloqueia mais recuperação de
// PV) quando seu estado chega em "tratada" — ver bloqueio no painel de
// Recuperação de PVs (ficha.js).
export function feridaEstaFechada(ferida) {
    return !!ferida && ferida.estado === "tratada";
}

// ---------------------------------------------------------------------
// Ferida por dano (regra de mesa, independente de Golpe Mirado): todo
// golpe que causa MAIS QUE 1/10 do PV MÁXIMO do alvo tem uma chance de
// abrir uma ferida persistente (corte/perfuração vira ferida "corte",
// contusão vira ferida "fratura" — quem decide o tipo é quem chama
// essa função, com base no tipo de dano; ver uso em mestre.js/ficha.js).
// Chance BASE de 20% assim que o dano ultrapassa esse mínimo de 1/10;
// pra cada 1/10 ADICIONAL de dano além do mínimo requerido, a chance
// sobe mais 20% (sempre limitada a 100%). Exemplos com PV máximo 100
// (mínimo = 10):
//   dano 11-19  -> 0 "décimos extras"  -> 20% de chance
//   dano 20-29  -> 1 "décimo extra"    -> 40% de chance
//   dano 30-39  -> 2 "décimos extras"  -> 60% de chance
//   dano >= 50  -> 4+ "décimos extras" -> 100% de chance (limite)
// Dano igual ou menor que o mínimo não tem chance nenhuma (retorna 0).
// ---------------------------------------------------------------------
export function chanceFeridaPorDano(danoFinal, pvMaximo) {
    const minimo = (Number(pvMaximo) || 0) / 10;
    const dano = Number(danoFinal) || 0;
    if (minimo <= 0 || dano <= minimo) return 0;
    const decimosExtras = Math.floor(dano / minimo) - 1;
    return Math.min(100, 20 + Math.max(0, decimosExtras) * 20);
}

// ---------------------------------------------------------------------
// Redução do Dano por Colete x Calibre (manual pg. 53, "Proteção
// Balística" > "Redução do dano") — passo 2 do plano
// (plano-reducao-dano-colete.txt). Duas funções pequenas, porque o
// multiplicador entra POR ITEM (cada peça de armadura pode ter sua
// própria classeProtecao, dentro do loop que soma reducoesDano em
// mestre.js) e o piso de dano mínimo entra UMA VEZ só, em cima do
// total já somado — ver Passo 3 (mestre.js/aplicarDano).
//
// 1) Multiplicador da redução DE UM ITEM, pela diferença de classe
//    (ver diferencaClasseCalibreVsColete em dados-manual.js):
//      diferencaClasse == null -> 1  (sem classe pra comparar; mantém
//                                      o comportamento de sempre, sem
//                                      essa regra nova)
//      diferencaClasse <= 0    -> 1  (calibre igual/inferior à classe)
//      diferencaClasse == 1    -> 0.5 (calibre uma classe acima)
//      diferencaClasse >= 2    -> 0  (duas classes acima ou mais —
//                                      o tiro atravessa liso)
// ---------------------------------------------------------------------
export function multiplicadorReducaoPorClasse(diferencaClasse) {
    if (diferencaClasse === null || diferencaClasse === undefined) return 1;
    if (diferencaClasse <= 0) return 1;
    if (diferencaClasse === 1) return 0.5;
    return 0;
}

// 2) Piso de dano mínimo contundente, aplicado UMA VEZ sobre o total
//    já reduzido (soma de todos os itens de armadura que cobrem o
//    local, cada um já com seu próprio multiplicador aplicado — ver
//    função acima). Só existe quando ALGUM item efetivamente freou o
//    tiro, nem que seja em parte (coleteFreouAlgumaParte = alguma
//    peça teve multiplicador > 0 nesse acerto — ver Passo 3). Se
//    nenhuma peça freou nada (ou não havia colete no local, ou todas
//    tiveram multiplicador 0), o dano segue 100% Perfuração Especial,
//    sem piso — não existe "impacto" pra virar contundente.
export function aplicarPisoDanoContundenteColete({ danoOriginal, danoAposReducao, coleteFreouAlgumaParte }) {
    const original = Number(danoOriginal) || 0;
    const reduzido = Math.max(0, Number(danoAposReducao) || 0);
    if (!coleteFreouAlgumaParte) {
        return { danoFinal: original, tipoDanoFinal: "perfuracao_especial", pisoAplicado: false };
    }
    const pisoContundente = Math.floor(original / 4);
    if (pisoContundente > reduzido) {
        return { danoFinal: pisoContundente, tipoDanoFinal: "contusao", pisoAplicado: true };
    }
    return { danoFinal: reduzido, tipoDanoFinal: "perfuracao_especial", pisoAplicado: false };
}
