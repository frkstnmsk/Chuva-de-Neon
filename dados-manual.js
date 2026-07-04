// =====================================================================
// CHUVA DE NEON — Dados fixos do manual
// =====================================================================
// Tudo que é "lista fechada" do livro mora aqui: perícias por categoria,
// funções e seus bônus de criação, manobras de combate, tags de item.
// Separado de regras.js (que guarda fórmulas) pra facilitar manutenção.

// ---------------------------------------------------------------------
// Perícias — lista fechada, dividida por categoria (Física/Mental/Social)
// Cada perícia carrega o(s) atributo(s) sugerido(s) pelo manual (só
// informativo aqui; o atributo-base real de cálculo é fixo por perícia,
// usando o primeiro da lista).
// ---------------------------------------------------------------------
export const CATEGORIAS_PERICIA = [
    { key: "fisica", label: "Física" },
    { key: "mental", label: "Mental" },
    { key: "social", label: "Social" }
];

export const PERICIAS_MANUAL = [
    // ---------- Físicas ----------
    { nome: "Briga de Rua", categoria: "fisica", atributo: "forca" },
    { nome: "Arremessar", categoria: "fisica", atributo: "forca" },
    { nome: "Armas de Fogo de Pequeno Porte", categoria: "fisica", atributo: "destreza" },
    { nome: "Armas de Fogo de Médio Porte", categoria: "fisica", atributo: "destreza" },
    { nome: "Armas de Fogo de Grande Porte", categoria: "fisica", atributo: "destreza" },
    { nome: "Lâminas Curtas", categoria: "fisica", atributo: "destreza" },
    { nome: "Lâminas Longas", categoria: "fisica", atributo: "destreza" },
    { nome: "Contundentes Curtas", categoria: "fisica", atributo: "destreza" },
    { nome: "Contundentes Longas", categoria: "fisica", atributo: "destreza" },
    { nome: "Armas Brancas Exóticas", categoria: "fisica", atributo: "destreza" },
    { nome: "Furtividade", categoria: "fisica", atributo: "destreza" },
    { nome: "Dirigir Veículos", categoria: "fisica", atributo: "destreza" },
    { nome: "Dirigir Veículos Exóticos", categoria: "fisica", atributo: "destreza" },
    { nome: "Resistência Imunológica", categoria: "fisica", atributo: "constituicao" },
    { nome: "Tolerância", categoria: "fisica", atributo: "constituicao" },
    { nome: "Mecânica Automotiva", categoria: "fisica", atributo: "destreza" },
    { nome: "Armeiro", categoria: "fisica", atributo: "destreza" },
    { nome: "Ofícios Utilitários", categoria: "fisica", atributo: "destreza" },
    { nome: "Manobras", categoria: "fisica", atributo: "forca" },
    { nome: "Mão Leve", categoria: "fisica", atributo: "destreza" },
    { nome: "Arrombamento", categoria: "fisica", atributo: "destreza" },
    { nome: "Força Bruta", categoria: "fisica", atributo: "forca" },
    { nome: "Jiu Jitsu", categoria: "fisica", atributo: "destreza" },
    { nome: "Muay Thai", categoria: "fisica", atributo: "forca" },
    { nome: "Boxe", categoria: "fisica", atributo: "forca" },
    { nome: "Karatê Cobra Kai", categoria: "fisica", atributo: "destreza" },
    { nome: "CQC", categoria: "fisica", atributo: "destreza" },

    // ---------- Mentais ----------
    { nome: "Camuflar", categoria: "mental", atributo: "inteligencia" },
    { nome: "Cultura Popular", categoria: "mental", atributo: "inteligencia" },
    { nome: "Explosivos", categoria: "mental", atributo: "inteligencia" },
    { nome: "Eletrônica", categoria: "mental", atributo: "inteligencia" },
    { nome: "Investigação", categoria: "mental", atributo: "inteligencia" },
    { nome: "Procurar", categoria: "mental", atributo: "sabedoria" },
    { nome: "Resistência Mental", categoria: "mental", atributo: "sabedoria" },
    { nome: "Rastreio", categoria: "mental", atributo: "inteligencia" },
    { nome: "Hacking", categoria: "mental", atributo: "inteligencia" },
    { nome: "Programação", categoria: "mental", atributo: "inteligencia" },
    { nome: "Controle Remoto", categoria: "mental", atributo: "raciocinio" },
    { nome: "Desenvolvimento de IA", categoria: "mental", atributo: "inteligencia" },
    { nome: "Cozinhar", categoria: "mental", atributo: "sabedoria" },
    { nome: "Artes", categoria: "mental", atributo: "sabedoria" },
    { nome: "Química", categoria: "mental", atributo: "sabedoria" },
    { nome: "Concentração", categoria: "mental", atributo: "sabedoria" },
    { nome: "Primeiros Socorros", categoria: "mental", atributo: "sabedoria" },
    { nome: "Medicina", categoria: "mental", atributo: "sabedoria" },
    { nome: "Biomecânica", categoria: "mental", atributo: "sabedoria" },
    { nome: "Cirurgia", categoria: "mental", atributo: "sabedoria" },
    { nome: "Engenharia", categoria: "mental", atributo: "sabedoria" },

    // ---------- Sociais ----------
    { nome: "Convencimento", categoria: "social", atributo: "carisma" },
    { nome: "Diplomacia", categoria: "social", atributo: "carisma" },
    { nome: "Intimidação", categoria: "social", atributo: "manipulacao" },
    { nome: "Sentir Motivação", categoria: "social", atributo: "sabedoria" },
    { nome: "Mentir", categoria: "social", atributo: "carisma" },
    { nome: "Sedução", categoria: "social", atributo: "carisma" }
];

export function listaPericiasPorCategoria(categoria) {
    return PERICIAS_MANUAL.filter(p => p.categoria === categoria);
}

export function buscarPericiaPorNome(nome) {
    return PERICIAS_MANUAL.find(p => p.nome === nome);
}

// ---------------------------------------------------------------------
// Artes Marciais — tecnicamente perícias físicas de combate corpo a
// corpo, listadas em separado no manual. Entram na categoria Física,
// mas guardamos a lista pra uso na aba de Combate (filtragem de manobra).
// ---------------------------------------------------------------------
export const ARTES_MARCIAIS = ["Jiu Jitsu", "Muay Thai", "Boxe", "Karatê Cobra Kai", "CQC"];

// ---------------------------------------------------------------------
// Funções — bônus de criação de personagem.
// atributosFixos: { atributo: pontos } sempre aplicados, sem escolha.
// atributosEscolha: { grupo: [opções], pontos } — jogador escolhe 1 do
//   grupo pra receber os pontos indicados.
// pontosLivresAtributo: pontos extras pra distribuir em qualquer atributo
//   (além dos 7 padrão da criação), por causa da função.
// periciasFixas: { nome: pontos } sempre aplicados, sem escolha (perícia
//   de função "pronta").
// periciasEscolha: { pontos, opções: [nomes] } — pontos exclusivos da
//   função, o jogador distribui livremente entre as perícias listadas.
// itemInicial: descrição do item que a função já começa com.
// ---------------------------------------------------------------------
export const FUNCOES = {
    nerd: {
        key: "nerd",
        label: "Nerd",
        descricao: "Criminosos cibernéticos: clonam cartões, quebram firewalls, exploram falhas de segurança no webworld.",
        atributosFixos: { raciocinio: 3, inteligencia: 3, sabedoria: 3 },
        pontosLivresAtributo: 0,
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: ["Hacking", "Programação"] },
        itemInicial: "Notebook"
    },
    paulada: {
        key: "paulada",
        label: "Paulada",
        descricao: "Malucos agressivos que \"dão lições\" por dinheiro, como mercenários ou em nome de uma causa.",
        atributosFixos: { forca: 3, destreza: 3, constituicao: 3 },
        pontosLivresAtributo: 0,
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: null, categoriaOpcoes: "fisica" }, // qualquer perícia física
        itemInicial: "Arma nível 2"
    },
    mecanico: {
        key: "mecanico",
        label: "Mecânico",
        descricao: "Nerds práticos que ganham a vida consertando, desmontando ou criando itens ao juntar peças.",
        atributosFixos: { inteligencia: 3, destreza: 3, sabedoria: 3 },
        pontosLivresAtributo: 0,
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: ["Mecânica Automotiva", "Armeiro", "Ofícios Utilitários", "Eletrônica"] },
        itemInicial: "Kit de ferramentas nível 2"
    },
    pilantra: {
        key: "pilantra",
        label: "Pilantra",
        descricao: "Trombadinha, 155: furtam ou destravam portas (ou os dois) com suas mãos habilidosas.",
        atributosFixos: { raciocinio: 3, destreza: 4, inteligencia: 2 },
        pontosLivresAtributo: 0,
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: ["Mão Leve", "Arrombamento"] },
        itemInicial: "Destrave nível 2"
    },
    mercador: {
        key: "mercador",
        label: "Mercador",
        descricao: "Narcotraficantes — apenas dois atributos obrigatórios, com pontos extras pra distribuir livremente.",
        atributosFixos: { raciocinio: 3 },
        atributosEscolha: { grupo: ["carisma", "manipulacao"], pontos: 3 },
        pontosLivresAtributo: 3, // livres em qualquer atributo
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: null, categoriaOpcoes: "social" },
        itemInicial: "Contato: Fornecedor de drogas"
    },
    piloto: {
        key: "piloto",
        label: "Piloto",
        descricao: "Usam seu veículo para correr em corridas ilegais ou transportar cargas e pessoas.",
        atributosFixos: { destreza: 4 },
        pontosLivresAtributo: 5,
        periciasFixas: { "Dirigir Veículos": 2 },
        periciasEscolha: { pontos: 1, opcoes: null, categoriaOpcoes: null }, // 1 ponto livre em qualquer perícia
        itemInicial: "Veículo nível 2"
    },
    vagabundo: {
        key: "vagabundo",
        label: "Vagabundo",
        descricao: "Sem habilidades específicas — vive por conta própria, sem função fixa no jogo dos outros.",
        atributosFixos: {},
        pontosLivresAtributo: 7, // extras, além dos 7 padrão
        periciasFixas: {},
        periciasEscolha: null, // não escolhe perícia de função
        itemInicial: "Dois itens de até nível 2"
    }
};

export function listaFuncoes() {
    return Object.values(FUNCOES);
}

// ---------------------------------------------------------------------
// Tags de item — categorias fechadas usadas no Inventário.
// Tags de arma têm nível (1 a 5), correspondendo à letalidade/preço do
// manual. Outras tags são qualitativas, sem nível.
// ---------------------------------------------------------------------
export const NIVEIS_ARMA = [1, 2, 3, 4, 5];

export const TAGS_ITEM = [
    { key: "arma", label: "Arma", temNivel: true },
    { key: "carregador", label: "Carregador", temNivel: false },
    { key: "projetil", label: "Projétil / munição", temNivel: false },
    { key: "colete", label: "Colete / proteção balística", temNivel: true },
    { key: "destrave", label: "Destrave", temNivel: true },
    { key: "ferramenta_criacao", label: "Ferramenta de criação (geral)", temNivel: true },
    { key: "ferramenta_criacao_quimica", label: "Ferramenta de criação química", temNivel: true },
    { key: "eletronico", label: "Eletrônico", temNivel: false },
    { key: "drone", label: "Drone", temNivel: false },
    { key: "veiculo", label: "Veículo", temNivel: true },
    { key: "biomecanica", label: "Biomecânica / prótese", temNivel: false },
    { key: "mecanito", label: "Mecânito", temNivel: false },
    { key: "droga", label: "Droga / químico", temNivel: false },
    { key: "equipamento_medico", label: "Equipamento médico", temNivel: false },
    { key: "explosivo", label: "Explosivo", temNivel: false },
    { key: "material", label: "Material de criação", temNivel: false },
    { key: "geral", label: "Geral / diverso", temNivel: false }
];

export function rotuloTag(tagKey) {
    const t = TAGS_ITEM.find(t => t.key === tagKey);
    return t ? t.label : tagKey;
}

export function tagTemNivel(tagKey) {
    const t = TAGS_ITEM.find(t => t.key === tagKey);
    return t ? t.temNivel : false;
}

export function ehArma(tagKey) {
    return tagKey === "arma";
}

export function ehCarregador(tagKey) {
    return tagKey === "carregador";
}

export function ehProjetil(tagKey) {
    return tagKey === "projetil";
}

// Carregador, quando criado, define quantos projéteis cabem nele.
export function tagExigeCapacidadeCarregador(tagKey) {
    return ehCarregador(tagKey);
}

// Projétil é um item "de estoque": guarda quantos projéteis daquele
// calibre esse item representa (o que entra no carregador ao carregar).
export function tagExigeQuantidadeProjetil(tagKey) {
    return ehProjetil(tagKey);
}

// ---------------------------------------------------------------------
// Classes de Proteção Balística (manual pg. 53) — indicam até qual
// calibre um colete aguenta com eficácia, e (aqui) também o calibre de
// uma arma de fogo, pra confronto direto arma x colete na hora do dano.
// ---------------------------------------------------------------------
export const CLASSES_PROTECAO = [
    { key: "I", label: "Classe I — .22 LR, .380 ACP (baixo poder)" },
    { key: "II", label: "Classe II — 9mm, .40 S&W, .45 ACP" },
    { key: "III", label: "Classe III — .357 Magnum, .44 Magnum" },
    { key: "IIIA", label: "Classe IIIA — 5.56x45mm, 7.62x39mm (fuzis leves)" },
    { key: "IV", label: "Classe IV — 7.62x51mm (.308), .30-06" },
    { key: "V", label: "Classe V — .338 Lapua, .50 BMG (pesado)" }
];

export function rotuloClasseProtecao(classeKey) {
    const c = CLASSES_PROTECAO.find(c => c.key === classeKey);
    return c ? c.label : classeKey;
}

// Só armas de fogo (não brancas) usam classe de proteção — é o calibre
// delas que determina contra qual colete elas são eficazes.
export function ehArmaDeFogo(periciaUso) {
    return PERICIAS_ARMA_FOGO.includes(periciaUso);
}

export function tagExigeClasseProtecao(tagKey, periciaUso) {
    // Armas de fogo pararam de usar Classe de Proteção pra confronto de
    // combate (agora usam Dificuldade de Acerto própria, pg. 95-97), mas
    // o mesmo select de CLASSES_PROTECAO virou o campo de CALIBRE:
    // colete pergunta até que calibre ele aguenta; carregador e projétil
    // perguntam de que calibre eles são; e arma de fogo pergunta que
    // calibre ela dispara — é isso que casa arma, carregador e projétil.
    if (tagKey === "colete") return true;
    if (ehCarregador(tagKey) || ehProjetil(tagKey)) return true;
    if (ehArma(tagKey) && ehArmaDeFogo(periciaUso)) return true;
    return false;
}

// Rótulo do campo acima: mesmo select de CLASSES_PROTECAO, mas o texto
// muda conforme o tipo do item.
export function rotuloCampoCalibre(tagKey) {
    return tagKey === "colete" ? "Classe de Proteção (obrigatória)" : "Calibre (obrigatório)";
}

// ---------------------------------------------------------------------
// Armas de Fogo — Alcance e Recuo (manual pg. 95-97). Recuo tem efeito
// mecânico direto: penalidade acumulada nos disparos seguintes no mesmo
// turno do personagem.
// ---------------------------------------------------------------------
export const ALCANCES_ARMA_FOGO = [
    { key: "curtissimo", label: "Curtíssimo" },
    { key: "curtissimo_curto", label: "Curtíssimo/Curto" },
    { key: "curto", label: "Curto" },
    { key: "curto_medio", label: "Curto/Médio" },
    { key: "medio", label: "Médio" },
    { key: "medio_longo", label: "Médio/Longo" },
    { key: "longo", label: "Longo" }
];

// Padrões de recuo do manual — cada arma cadastrada escolhe um destes.
// O modificador é calculado por número do disparo dentro do turno atual
// do personagem (1º, 2º, 3º...), não pelo total de turnos do combate.
export const PADROES_RECUO = [
    { key: "comum", label: "Comum (–1 no 2º tiro, –2 no 3º em diante)" },
    { key: "forte", label: "Forte (1º tiro sem penalidade, –2 do 2º em diante)" },
    { key: "bipe", label: "Só controlável com bipé/apoio (–3 em todos os disparos sem apoio)" }
];

export function rotuloPadraoRecuo(key) {
    const p = PADROES_RECUO.find(p => p.key === key);
    return p ? p.label : key;
}

export function rotuloAlcanceArmaFogo(key) {
    const a = ALCANCES_ARMA_FOGO.find(a => a.key === key);
    return a ? a.label : key;
}

// Modificador de recuo pro N-ésimo disparo desta arma no turno atual
// (numeroDoTiro começa em 1, pro primeiro disparo do turno).
export function modificadorRecuo(padraoKey, numeroDoTiro) {
    const n = Number(numeroDoTiro) || 1;
    if (n <= 1) return padraoKey === "bipe" ? -3 : 0;
    switch (padraoKey) {
        case "comum": return n === 2 ? -1 : -2;
        case "forte": return -2;
        case "bipe": return -3;
        default: return 0;
    }
}

// ---------------------------------------------------------------------
// Golpes desarmados que causam dano automatizável (manual pg. 49-50):
// todos seguem a fórmula "1dForça + Força [escala]" — o dado tem faces
// iguais ao valor de Força do personagem, e a escala é sempre sobre
// Força (independente de qual perícia física foi usada pra rolar o
// golpe, ex: Karatê Cobra Kai usa Destreza pra rolar, mas o dano
// continua escalando com Força, como o manual descreve).
// ---------------------------------------------------------------------
export const ESCALA_MULT_DESARMADO = {
    "Soco": 1,       // Escala D
    "Chute": 1,      // Escala D
    "Joelhada": 2,   // Escala C
    "Cotovelada": 2  // Escala C
};

export function ehGolpeDesarmadoComDano(nomeManobra) {
    return Object.prototype.hasOwnProperty.call(ESCALA_MULT_DESARMADO, nomeManobra);
}

// ---------------------------------------------------------------------
// Especificidades das perícias de combate desarmado (manual pg. 22).
// A escala/dado padrão de cada golpe (ESCALA_MULT_DESARMADO) é a mesma
// pra qualquer perícia usada pra rolá-lo, mas algumas perícias mudam
// isso quando é ELA que está sendo usada pra rolar o golpe:
//
// - Muay Thai: nos níveis 3 e 5 aumenta a escala de Chute e Joelhada.
// - Boxe: multiplica o dado de dano do Soco (1dForça) pelo valor da
//   perícia.
// - Karatê Cobra Kai: dispensa a rolagem do dado, usando sempre dano
//   máximo (o valor de Força vira o dano do dado direto).
// - Força Bruta: também sempre com dano máximo, e adiciona um bônus de
//   escala (D no nível 1, C no nível 3, B no nível 5) que SUBSTITUI a
//   escala padrão do golpe, não soma a ela.
//
// Perícias fora dessa lista (Briga de Rua, CQC, etc.) usam a escala
// padrão do golpe sem alteração.
// ---------------------------------------------------------------------
export function calcularEspecificidadeGolpe(nomeManobra, nomePericia, nivelPericia) {
    const nivel = Number(nivelPericia) || 0;
    let escalaMult = ESCALA_MULT_DESARMADO[nomeManobra] || 0;
    let dadoMultiplicador = 1;
    let danoMaximoSemRolar = false;

    switch (nomePericia) {
        case "Muay Thai":
            if (nomeManobra === "Chute") {
                if (nivel >= 5) escalaMult = 4;       // Escala B
                else if (nivel >= 3) escalaMult = 2;  // Escala C
            } else if (nomeManobra === "Joelhada") {
                if (nivel >= 5) escalaMult = 5;       // Escala A
                else if (nivel >= 3) escalaMult = 4;  // Escala B
            }
            break;

        case "Boxe":
            // Técnica baseada em socos — só se aplica ao Soco, que é o
            // golpe que essa perícia de fato cobre.
            if (nomeManobra === "Soco" && nivel > 0) {
                dadoMultiplicador = nivel;
            }
            break;

        case "Karatê Cobra Kai":
            danoMaximoSemRolar = true;
            break;

        case "Força Bruta":
            danoMaximoSemRolar = true;
            if (nivel >= 5) escalaMult = 4;       // adicional Força B
            else if (nivel >= 3) escalaMult = 2;  // adicional Força C
            else if (nivel >= 1) escalaMult = 1;  // adicional Força D
            break;

        default:
            break;
    }

    return { escalaMult, dadoMultiplicador, danoMaximoSemRolar };
}

// Boxe também dá um bônus passivo pra esquivar desarmado (manual pg. 22):
// +2 contra golpes desarmados, +1 contra armas brancas — independe do
// nível, basta ter a perícia. Usado pra mostrar o bônus na manobra
// "Esquivar", que não tem rolagem automatizada (é Agilidade vs. a
// pontuação do ataque sofrido).
export function bonusEsquivaBoxe(nivelBoxe) {
    const nivel = Number(nivelBoxe) || 0;
    if (nivel <= 0) return null;
    return { desarmado: 2, armaBranca: 1 };
}

// ---------------------------------------------------------------------
// Perícia vinculada por tag — usada pelo botão "Usar" do inventário pra
// saber qual perícia rolar quando o jogador usa o item. Reaproveita
// agrupamentos que já existem no manual (as mesmas opções de perícia de
// função do Mecânico e do Pilantra) em vez de inventar listas novas.
// ---------------------------------------------------------------------
export const PERICIAS_ELETRONICO = ["Hacking"];
// Ferramenta de Criação "geral" (manual pg. 71): usada nas perícias de
// Ofícios Utilitários, Armeiro, Mecânica Automotiva, Explosivos e
// Eletrônica. Química fica de fora de propósito — ela usa um item
// próprio (Ferramentas de Criação Química, pg. 92), com receita igual
// ao kit convencional mas item distinto no inventário.
export const PERICIAS_FERRAMENTA_CRIACAO = ["Mecânica Automotiva", "Armeiro", "Ofícios Utilitários", "Explosivos", "Eletrônica"];
export const PERICIAS_FERRAMENTA_CRIACAO_QUIMICA = ["Química"];
export const PERICIAS_DESTRAVE = ["Mão Leve", "Arrombamento"];
export const PERICIAS_ARMA_FOGO = ["Armas de Fogo de Pequeno Porte", "Armas de Fogo de Médio Porte", "Armas de Fogo de Grande Porte"];
export const PERICIAS_ARMA_COMBATE = [
    "CQC", "Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas", "Contundentes Longas",
    "Armas Brancas Exóticas", ...PERICIAS_ARMA_FOGO
];

// Tags cujo item precisa de uma perícia vinculada pra ter ação de "Usar"
// com rolagem automática (armas, eletrônicos, ferramentas de criação —
// geral e química — e destraves — manual pg. 49-50 e regras de teste de
// perícia).
export function tagExigePericiaUso(tagKey) {
    return tagKey === "arma" || tagKey === "eletronico" || tagKey === "ferramenta_criacao" ||
        tagKey === "ferramenta_criacao_quimica" || tagKey === "destrave";
}

export function periciasVinculaveisPorTag(tagKey) {
    switch (tagKey) {
        // "Sem Perícia" fica só aqui (não entra em PERICIAS_ARMA_COMBATE
        // nem em PERICIAS_MANUAL) — é uma opção de vínculo de arma, não
        // uma perícia de personagem de verdade. Como nenhuma perícia da
        // ficha se chama "Sem Perícia", modificadorDePericiaComPenalidade
        // (ficha.js) nunca encontra uma correspondência e aplica a
        // penalidade padrão de manobra sem treinamento (-1 fixo) — a
        // mesma regra já usada em qualquer perícia no nível 0/ausente.
        case "arma": return [...PERICIAS_ARMA_COMBATE, "Sem Perícia"];
        case "eletronico": return PERICIAS_ELETRONICO;
        case "ferramenta_criacao": return PERICIAS_FERRAMENTA_CRIACAO;
        case "ferramenta_criacao_quimica": return PERICIAS_FERRAMENTA_CRIACAO_QUIMICA;
        case "destrave": return PERICIAS_DESTRAVE;
        default: return [];
    }
}

// Tipos de dano físico, usados na configuração de armas.
export const TIPOS_DANO = [
    { key: "contusao", label: "Contusão" },
    { key: "perfuracao_comum", label: "Perfuração comum" },
    { key: "perfuracao_especial", label: "Perfuração especial (tiro)" },
    { key: "corte", label: "Corte" },
    { key: "explosao", label: "Explosão" },
    { key: "fogo", label: "Fogo" },
    { key: "eletrico", label: "Elétrico" },
    { key: "frio", label: "Frio / gelo" },
    { key: "especial", label: "Especial (ácido, mental, outro)" }
];

// Tags cujo item pode ter redução de dano configurada (coletes, placas
// balísticas, etc — manual pg. 52-53). Um mesmo item pode reduzir vários
// tipos de dano diferentes, cada um com seu próprio valor de redução.
export const TAGS_REDUCAO_DANO = ["colete"];
export function tagPodeReduzirDano(tagKey) {
    return TAGS_REDUCAO_DANO.includes(tagKey);
}

// Escalas de arma corpo a corpo (bônus sobre o atributo).
export const ESCALAS_ARMA = [
    { key: "E", label: "Escala E (metade do atributo)", mult: 0.5 },
    { key: "D", label: "Escala D (1x o atributo)", mult: 1 },
    { key: "C", label: "Escala C (2x o atributo)", mult: 2 },
    { key: "B", label: "Escala B (4x o atributo)", mult: 4 },
    { key: "A", label: "Escala A (5x o atributo)", mult: 5 },
    { key: "S", label: "Escala S (7x o atributo)", mult: 7 }
];

// Modificações comuns de arma (manual, pg. 65) — usadas como sugestão
// no modal de configuração de arma; o jogador pode digitar outras.
export const MODIFICACOES_ARMA_SUGERIDAS = [
    "Aumento de dano (+1/4 do dano)",
    "Aumento de escala",
    "Maior cadência (+1/3 disparos por turno)",
    "Counter",
    "Duelista",
    "Sedenta por Sangue"
];

// ---------------------------------------------------------------------
// Manobras de combate (golpes) — manual pg. 49-50. Cada manobra carrega
// alcance, a lista de perícias que podem testá-la, a fórmula textual de
// dificuldade e o efeito. São fixas: o jogador não cria manobras novas,
// só visualiza essa lista fixa na aba de Combate.
// ---------------------------------------------------------------------
export const MANOBRAS_COMBATE = [
    {
        nome: "Soco",
        alcance: "Médio",
        pericias: ["Boxe", "Força Bruta", "Briga de Rua", "Karatê Cobra Kai"],
        dificuldade: "8 + Agilidade do alvo",
        efeito: "Dano 1dForça + Força D"
    },
    {
        nome: "Chute",
        alcance: "Longo",
        pericias: ["Briga de Rua", "Karatê Cobra Kai", "Força Bruta", "Muay Thai"],
        dificuldade: "9 + Agilidade do alvo",
        efeito: "Dano 1dForça + Força D"
    },
    {
        nome: "Joelhada",
        alcance: "Curto",
        pericias: ["Briga de Rua", "Muay Thai", "Força Bruta"],
        dificuldade: "10 + Agilidade do alvo",
        efeito: "Dano 1dForça + Força C"
    },
    {
        nome: "Cotovelada",
        alcance: "Curto",
        pericias: ["Briga de Rua", "Karatê Cobra Kai", "Força Bruta"],
        dificuldade: "10 + Agilidade do alvo",
        efeito: "Dano 1dForça + Força C"
    },
    {
        nome: "Arma branca",
        alcance: "Longo",
        pericias: ["Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas", "Contundentes Longas", "Armas Brancas Exóticas"],
        dificuldade: "9 + Agilidade do alvo",
        efeito: "Dano variável (de acordo com a arma)"
    },
    {
        nome: "Agarrar",
        alcance: "Médio",
        pericias: ["Briga de Rua", "Jiu Jitsu", "Força Bruta", "CQC"],
        dificuldade: "10 + Força do alvo",
        efeito: "Impossibilita golpes de alcance médio e longo, reduz pela metade os danos da vítima"
    },
    {
        nome: "Desarmar",
        alcance: "Médio",
        pericias: ["Briga de Rua", "Força Bruta", "CQC", "Jiu Jitsu", "Karatê Cobra Kai", "Lâminas Curtas", "Lâminas Longas"],
        dificuldade: "10 + perícia da vítima",
        efeito: "Retira uma arma equipada do alvo"
    },
    {
        nome: "Derrubar",
        alcance: "Curto",
        pericias: ["Briga de Rua", "Jiu Jitsu", "Força Bruta", "CQC", "Karatê Cobra Kai"],
        dificuldade: "10 + Constituição do alvo",
        efeito: "Derruba o alvo; dif. pra acertá-lo cai -3; precisa gastar ação pra se levantar"
    },
    {
        nome: "Aparar",
        alcance: "Curto/Longo",
        pericias: ["Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas", "Contundentes Longas", "Karatê Cobra Kai", "Jiu Jitsu", "Força Bruta", "CQC"],
        dificuldade: "Igual à pontuação do atacante no teste de ataque",
        efeito: "Anula o golpe recebido; pode atacar imediatamente com modificador -1. Não dá pra aparar arma branca desarmado"
    },
    {
        nome: "Bloquear",
        alcance: "Curto",
        pericias: ["Constituição"],
        dificuldade: "10 + perícia do alvo",
        efeito: "Reduz o dano recebido pela metade. Se o dano for perfurante, não reduz nada"
    },
    {
        nome: "Esquivar",
        alcance: "Variável",
        pericias: ["Agilidade"],
        dificuldade: "Igual à pontuação do ataque sofrido",
        efeito: "Anula o golpe recebido"
    },
    {
        nome: "Delimitar alcance",
        alcance: "Variável",
        pericias: ["Perícia corpo a corpo", "Armas Brancas"],
        dificuldade: "11 + perícia corpo a corpo do alvo",
        efeito: "Escolhe um alcance único pra ser utilizado nesse combate"
    },
    {
        nome: "Retomar alcance",
        alcance: "Variável",
        pericias: ["Perícia corpo a corpo", "Armas Brancas"],
        dificuldade: "Igual à pontuação da delimitação de alcance do adversário",
        efeito: "Retira a limitação de alcance imposta pelo oponente"
    }
];

export function listaManobrasCombate() {
    return MANOBRAS_COMBATE;
}
