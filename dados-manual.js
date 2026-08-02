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
// Requisitos de acesso a perícia (manual pg. 22): algumas perícias só
// podem ser adquiridas (ir de nível 0 para 1) se o personagem já
// cumprir certas condições. Hoje só "Força Bruta" tem essa trava no
// manual — "necessário Força 9 para ter acesso à essa perícia e Briga
// de Rua 5 ou Contundentes [Curtas ou Longas] 5" — mas a estrutura é
// genérica pra caber outras perícias com requisito no futuro.
// ---------------------------------------------------------------------
export const REQUISITOS_PERICIA = {
    "Força Bruta": {
        atributoMinimo: { atributo: "forca", label: "Força", valor: 9 },
        // Precisa de UMA destas (nível mínimo indicado):
        periciaMinimaAlternativas: [
            { nome: "Briga de Rua", nivel: 5 },
            { nome: "Contundentes Curtas", nivel: 5 },
            { nome: "Contundentes Longas", nivel: 5 }
        ]
    }
};

// Verifica se a ficha (dados primários + perícias já cadastradas)
// cumpre o requisito de acesso à perícia `nomePericia`. Perícias sem
// requisito cadastrado em REQUISITOS_PERICIA sempre passam (ok: true).
// Só bloqueia ADQUIRIR a perícia (nível 0 → 1+); não se aplica a quem
// já tem nível ≥ 1, pra não confiscar retroativamente algo já obtido
// antes dessa trava existir ou por meio de vantagem/narrativa do Mestre.
export function atendeRequisitoPericia(nomePericia, dadosPrimarios, periciasFicha) {
    const req = REQUISITOS_PERICIA[nomePericia];
    if (!req) return { ok: true };

    if (req.atributoMinimo) {
        const valorAtual = Number(dadosPrimarios && dadosPrimarios[req.atributoMinimo.atributo]) || 0;
        if (valorAtual < req.atributoMinimo.valor) {
            return {
                ok: false,
                motivo: `Requer ${req.atributoMinimo.label} ${req.atributoMinimo.valor} (atual: ${valorAtual}).`
            };
        }
    }

    if (req.periciaMinimaAlternativas) {
        const lista = Object.values(periciasFicha || {});
        const atende = req.periciaMinimaAlternativas.some(alt => {
            const entrada = lista.find(p => p.nome === alt.nome);
            return (entrada ? Number(entrada.nivel) || 0 : 0) >= alt.nivel;
        });
        if (!atende) {
            const opcoes = req.periciaMinimaAlternativas.map(a => `${a.nome} ${a.nivel}`).join(" ou ");
            return { ok: false, motivo: `Requer ${opcoes}.` };
        }
    }

    return { ok: true };
}

// ---------------------------------------------------------------------
// Artes Marciais — tecnicamente perícias físicas de combate corpo a
// corpo, listadas em separado no manual. Entram na categoria Física,
// mas guardamos a lista pra uso na aba de Combate (filtragem de manobra).
// ---------------------------------------------------------------------
export const ARTES_MARCIAIS = ["Jiu Jitsu", "Muay Thai", "Boxe", "Karatê Cobra Kai", "CQC"];

// ---------------------------------------------------------------------
// "Uma arte marcial tem vantagem contra Briga de Rua. A dificuldade ao
// usar Briga de Rua contra uma arte marcial é 2 pontos maior" (manual
// pg. 22). Briga de Rua nunca é usada pra Aparar (manual: "Briga de rua
// não pode ser usada para aparar ataques"), então esse bônus só entra
// na hora de ATACAR com Briga de Rua contra um alvo com nível ≥ 1 em
// qualquer uma das 5 artes marciais — ver resolverAtaque em ficha.js.
// ---------------------------------------------------------------------
export function alvoTemArteMarcialTreinada(periciasAlvo) {
    return Object.values(periciasAlvo || {}).some(p => ARTES_MARCIAIS.includes(p && p.nome) && (Number(p.nivel) || 0) >= 1);
}

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
    { key: "colete", label: "Proteção", temNivel: true },
    { key: "destrave", label: "Destrave", temNivel: true },
    { key: "ferramenta_criacao", label: "Ferramenta de criação (geral)", temNivel: true },
    { key: "ferramenta_criacao_quimica", label: "Ferramenta de criação química", temNivel: true },
    { key: "ferramenta_criacao_biomecanica", label: "Ferramenta de criação biomecânica", temNivel: true },
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

// Quantidade genérica ("tenho 3 desse item") — igual a como munição já
// funciona (Peso total = Peso unitário × Quantidade), só que pra
// qualquer item, não só projétil. Fica de fora das tags que já têm o
// próprio jeito de contar "quanto tem": Projétil (rounds — reload é
// item por item, cada carregador puxa dali) e Material de criação
// (estoque com qualidade, ver materialQuantidade). Carregador também
// fica de fora: cada um guarda seu próprio estado de munição atual
// (municaoAtual), então "empilhar" vários no mesmo registro quebraria
// esse controle por unidade.
export function tagTemQuantidadeGeral(tagKey) {
    return !ehProjetil(tagKey) && tagKey !== "material" && !ehCarregador(tagKey);
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

// ---------------------------------------------------------------------
// Calibres (manual pg. 53) — cada calibre pertence a uma Classe de
// Proteção (é o calibre que a classe engloba). Colete usa só a Classe
// (campo único: até que calibre ele aguenta). Carregador, projétil e
// arma de fogo usam os DOIS campos: primeiro a Classe (restringe as
// opções abaixo), depois o Calibre específico dentro dela — é esse
// calibre específico que casa os três entre si (carregar/recarregar),
// não mais a classe inteira.
// ---------------------------------------------------------------------
export const CALIBRES = [
    { key: "22lr", label: ".22 LR", classeProtecao: "I" },
    { key: "380acp", label: ".380 ACP", classeProtecao: "I" },
    { key: "9mm", label: "9mm", classeProtecao: "II" },
    { key: "40sw", label: ".40 S&W", classeProtecao: "II" },
    { key: "45acp", label: ".45 ACP", classeProtecao: "II" },
    { key: "357mag", label: ".357 Magnum", classeProtecao: "III" },
    { key: "44mag", label: ".44 Magnum", classeProtecao: "III" },
    { key: "556x45", label: "5.56x45mm", classeProtecao: "IIIA" },
    { key: "762x39", label: "7.62x39mm", classeProtecao: "IIIA" },
    { key: "762x51", label: "7.62x51mm (.308)", classeProtecao: "IV" },
    { key: "3006", label: ".30-06", classeProtecao: "IV" },
    { key: "338lapua", label: ".338 Lapua", classeProtecao: "V" },
    { key: "50bmg", label: ".50 BMG", classeProtecao: "V" },
    // Escopeta 12 gauge — mesmo cano, duas munições bem diferentes:
    // buckshot (chumbo grosso, mais fraco contra colete) e slug (projétil
    // único, mais perfurante). Por isso entram como duas entradas de
    // CALIBRES em vez de uma só, cada uma na Classe de Proteção que
    // corresponde ao impacto real dela — é o mesmo padrão já usado pra
    // qualquer outro calibre aqui (1 calibre = 1 Classe).
    { key: "12gauge_buckshot", label: "12 Gauge — Buckshot", classeProtecao: "II" },
    { key: "12gauge_slug", label: "12 Gauge — Slug", classeProtecao: "III" }
];

export function calibresPorClasse(classeKey) {
    return CALIBRES.filter(c => c.classeProtecao === classeKey);
}

export function rotuloCalibre(calibreKey) {
    const c = CALIBRES.find(c => c.key === calibreKey);
    return c ? c.label : calibreKey;
}

// ---------------------------------------------------------------------
// Calibres de escopeta (munição 12 gauge) — regra própria: diferente de
// qualquer outra arma de fogo do sistema, uma arma nesse calibre NÃO usa
// carregador. Ela é carregada projétil a projétil, direto do estoque de
// munição no inventário (ver consumirMunicaoSeArmaDeFogo em ficha.js).
// Buckshot e slug saem do mesmo cano, então uma arma cadastrada em
// qualquer um dos dois aceita munição do outro também.
// ---------------------------------------------------------------------
export const CALIBRES_ESCOPETA = ["12gauge_buckshot", "12gauge_slug"];

export function ehCalibreEscopeta(calibreKey) {
    return CALIBRES_ESCOPETA.includes(calibreKey);
}

// Calibres que "casam" com o calibre informado pra fins de carregador/
// projétil compatível. Pra qualquer calibre comum isso é só ele mesmo;
// pra calibre de escopeta, os dois tipos (buckshot/slug) são
// intercambiáveis entre si, porque é a mesma arma física.
export function calibresCompativeis(calibreKey) {
    if (ehCalibreEscopeta(calibreKey)) return CALIBRES_ESCOPETA;
    return [calibreKey];
}

// Só carregador, projétil e arma de fogo têm o segundo campo (Calibre
// específico) — colete continua só com a Classe de Proteção (até que
// calibre ele aguenta, sem precisar dizer qual calibre exato).
export function tagUsaCalibreEspecifico(tagKey, periciaUso) {
    if (ehCarregador(tagKey) || ehProjetil(tagKey)) return true;
    if (ehArma(tagKey) && ehArmaDeFogo(periciaUso)) return true;
    return false;
}

// Rótulo do campo de Calibre (segundo campo, abaixo da Classe de
// Proteção). Só é exibido pra tags que passam em tagUsaCalibreEspecifico.
export function rotuloCampoCalibre() {
    return "Calibre (obrigatório)";
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
// Dificuldade base de acerto por manobra desarmada (manual pg. 49-50):
// "8 + Agilidade do alvo" (Soco), "9 + Agilidade do alvo" (Chute),
// "10 + Agilidade do alvo" (Joelhada/Cotovelada). Usada junto com
// calcularDificuldadeDefesaJogador (que soma a Agilidade do alvo por
// cima desse valor) — antes disso a base vinha fixa em 10 pra qualquer
// golpe, o que deixava Soco e Chute com dificuldade errada.
// ---------------------------------------------------------------------
export const BASE_DIFICULDADE_GOLPE_DESARMADO = {
    "Soco": 8,
    "Chute": 9,
    "Joelhada": 10,
    "Cotovelada": 10
};

// Perícias de arma branca corpo a corpo (manual pg. 49-50: "Arma
// branca" tem dificuldade "9 + Agilidade do alvo", não os 10 fixos que
// o sistema usava antes pra qualquer arma equipada não-de-fogo).
export const PERICIAS_ARMA_BRANCA = [
    "Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas",
    "Contundentes Longas", "Armas Brancas Exóticas"
];

// Perícias desarmadas que servem pra Aparar (manobra defensiva, manual):
// só as de combate corpo a corpo "de luta", não qualquer perícia física.
export const PERICIAS_APARAR_DESARMADO = ["Karatê Cobra Kai", "Jiu Jitsu", "Força Bruta", "CQC"];

// Todas as perícias com as quais dá pra tentar Aparar um golpe — arma
// branca (curto/longo alcance) OU luta desarmada. Manual: "não é
// possível aparar ataques de arma branca estando desarmado" — por isso
// o código só oferece as opções desarmadas quando o golpe recebido NÃO
// veio de uma perícia de arma branca (ver PERICIAS_ARMA_BRANCA acima).
export const PERICIAS_APARAR = [...PERICIAS_ARMA_BRANCA, ...PERICIAS_APARAR_DESARMADO];

// Devolve a dificuldade base (o número que soma com a Agilidade/Força
// do alvo) pra um ataque, a partir do nome da manobra (golpes
// desarmados clicados na lista de Manobras) ou da perícia usada
// (armas equipadas — arma branca corpo a corpo). Cai pra 10 se não
// achar nenhuma correspondência (mantém o valor genérico do manual
// pra outras manobras, como Agarrar/Derrubar).
export function baseDificuldadeAtaque(nomeManobra, periciaUso) {
    if (Object.prototype.hasOwnProperty.call(BASE_DIFICULDADE_GOLPE_DESARMADO, nomeManobra)) {
        return BASE_DIFICULDADE_GOLPE_DESARMADO[nomeManobra];
    }
    if (PERICIAS_ARMA_BRANCA.includes(periciaUso)) {
        return 9;
    }
    return 10;
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
// - Força Bruta: também sempre com dano máximo, e SOMA um bônus de
//   escala em cima da escala padrão do golpe — cumulativo entre níveis:
//   +D no nível 1, +C (adicional) no nível 3, +B (adicional) no nível 5.
//   Ex: Soco (escala D) com Força Bruta nível 5 fica com escala
//   D (do soco) + D + C + B = 1+1+2+4 = 8, não escala B sozinha.
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
            // O adicional de Força Bruta SOMA em cima da escala padrão do
            // golpe (ex: Soco já é escala D sozinho) e é cumulativo entre
            // os níveis — nível 5 já teve o bônus D do nível 1 e o C do
            // nível 3 antes de ganhar o B, não troca um pelo outro.
            // Nível 1: +1 (escala D) · Nível 3: +2 (escala C) · Nível 5: +4 (escala B)
            if (nivel >= 1) escalaMult += 1;
            if (nivel >= 3) escalaMult += 2;
            if (nivel >= 5) escalaMult += 4;
            break;

        default:
            break;
    }

    return { escalaMult, dadoMultiplicador, danoMaximoSemRolar };
}

// ---------------------------------------------------------------------
// Força Bruta — efeitos defensivos (manual pg. 22), além do dano máximo/
// escala já cobertos acima. Só valem quando o GOLPE ESTÁ SENDO ROLADO
// com a perícia Força Bruta (mesmo critério de danoMaximoSemRolar/
// escalaMult logo acima — é a perícia usada NESTE golpe que importa,
// não só ter o nível cadastrado na ficha):
//
// Nível 2: "seus golpes ignoram armadura em pontos igual a sua Força."
// Nível 4: "bloquear seus golpes diminui apenas em 1/4 o dano [em vez
// da metade normal]; para se esquivar [de você] tem penalidade -1;
// seus golpes ignoram armadura em pontos igual ao DOBRO de sua Força"
// (substitui o efeito do nível 2, não soma com ele).
// Nível 5: "esquivar [de você] tem penalidade -2; não é possível
// bloquear [seus] golpes."
// ---------------------------------------------------------------------

// Pontos de armadura ignorados pelo golpe — nível 4 já inclui (substitui)
// o efeito do nível 2, não é cumulativo.
export function ignorarArmaduraForcaBruta(nivelForcaBruta, forcaAtacante) {
    const nivel = Number(nivelForcaBruta) || 0;
    const forca = Number(forcaAtacante) || 0;
    if (nivel >= 4) return forca * 2;
    if (nivel >= 2) return forca;
    return 0;
}

// Penalidade (negativa) no teste de Esquivar de quem está tentando
// esquivar de um golpe rolado com Força Bruta nível 4/5.
export function penalidadeEsquivarContraForcaBruta(nivelForcaBruta) {
    const nivel = Number(nivelForcaBruta) || 0;
    if (nivel >= 5) return -2;
    if (nivel >= 4) return -1;
    return 0;
}

// Como a manobra "Bloquear" se comporta contra um golpe rolado com
// Força Bruta nível 4/5 — null = comportamento padrão (reduz pela
// metade, ver responderReacaoPendente em mestre.js).
export function bloqueioContraForcaBruta(nivelForcaBruta) {
    const nivel = Number(nivelForcaBruta) || 0;
    if (nivel >= 5) return { impossivel: true };
    if (nivel >= 4) return { fracaoDanoRestante: 0.75 }; // reduz só 1/4 (25%) do dano
    return null;
}

// ---------------------------------------------------------------------
// Karatê Cobra Kai (manual pg. 22): "a cada dois pontos na perícia
// bônus +1 na iniciativa e golpes desarmados causam o dano total, não
// sendo necessário rolar Força [dano máximo já coberto acima, em
// danoMaximoSemRolar]. No nível 5 todos os ataques desarmados são
// críticos." Os outros dois efeitos, faltantes até então:
//
// - bonusCobraKaiIniciativa: +1 na iniciativa a cada 2 pontos na
//   perícia (nível 2 → +1, nível 4 → +2 etc.) — automático pra quem
//   tem a perícia, sem depender de escolha narrativa (diferente do +1
//   de CQC nível 2, que É condicional). Somado direto em
//   iniciarIniciativaCombate (mestre.js), igual ao resto da iniciativa.
// - cobraKaiCriticoAutomatico: no nível 5, todo golpe desarmado
//   ROLADO COM Karatê Cobra Kai que acerta já é Acerto Crítico (dano
//   dobrado), sem precisar do resultado final ser exatamente 20 — ver
//   resolverAtaque em ficha.js, que soma essa condição em
//   criticoPositivo assim que o ataque é confirmado como acerto.
// ---------------------------------------------------------------------
export function bonusCobraKaiIniciativa(nivelCobraKai) {
    return Math.floor((Number(nivelCobraKai) || 0) / 2);
}

export function cobraKaiCriticoAutomatico(nivelCobraKai) {
    return Number(nivelCobraKai) >= 5;
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
export const PERICIAS_ELETRONICO = ["Hacking", "Programação"];
// Ferramenta de Criação "geral" (manual pg. 71): usada nas perícias de
// Ofícios Utilitários, Armeiro, Mecânica Automotiva, Explosivos e
// Eletrônica — TODAS elas de uma vez, é o que torna o kit "geral" (o
// mesmo kit físico serve pra qualquer uma das 5). Por isso o item NÃO
// trava numa perícia só na criação (ver ehFerramentaCriacaoGeral abaixo
// e tagExigePericiaUso/periciasVinculaveisPorTag logo a seguir) — quem
// escolhe é o jogador na hora de "Usar" o kit (ver
// abrirModalEscolherPericiaItem em ficha.js).
// Química e Biomecânica ficam de fora de propósito — cada uma usa um
// kit próprio (Ferramentas de Criação Química, pg. 92; e Ferramenta de
// Criação Biomecânica), com receita igual mas item/perícia distintos.
export const PERICIAS_FERRAMENTA_CRIACAO = ["Mecânica Automotiva", "Armeiro", "Ofícios Utilitários", "Explosivos", "Eletrônica"];
export const PERICIAS_FERRAMENTA_CRIACAO_QUIMICA = ["Química"];
export const PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA = ["Biomecânica"];

// ---------------------------------------------------------------------
// Receitas (aba "Receitas" da ficha): PERICIAS_CRIACAO_ITEM é a lista
// de perícias de CRIAÇÃO DE ITEM (as mesmas que usam Ferramenta de
// Criação geral, química ou biomecânica, ver PERICIAS_FERRAMENTA_CRIACAO/
// PERICIAS_FERRAMENTA_CRIACAO_QUIMICA/PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA
// acima) — usada tanto pra saber quais perícias mostrar seção na aba
// quanto pra popular o select de "Perícia de criação vinculada" no
// modal de criar receita. As receitas em si NÃO ficam numa lista
// estática aqui — elas são cadastradas pelo jogador ou pelo Mestre e
// guardadas no Banco Global de Receitas (receitas-globais.js),
// compartilhado entre todas as mesas, igual o Banco Global de Itens —
// ver renderizarReceitas/abrirModalCriarReceita em ficha.js.
// ---------------------------------------------------------------------
export const PERICIAS_CRIACAO_ITEM = [...PERICIAS_FERRAMENTA_CRIACAO, ...PERICIAS_FERRAMENTA_CRIACAO_QUIMICA, ...PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA];

// Materiais de criação (seção "Materiais" do Manual do Jogador) — a
// lista fechada de tipos de material que uma receita pode exigir como
// ingrediente. Cada receita guarda uma lista de
// { material, qualidade, quantidade } usando exatamente um destes nomes
// (ver abrirModalCriarReceita, em ficha.js, que restringe o seletor a
// esta lista — nada de texto livre). `qualidades` é a lista EXATA de
// tiers que aquele material tem no manual (a maioria é Baixa/Média/Boa;
// CEB e Material Químico usam Alta em vez de Boa); `null` pros materiais
// sem variação de qualidade (preço único no manual): Material bélico e
// Materiais especiais.
export const MATERIAIS_CRIACAO = [
    { nome: "Metal leve", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Metal pesado", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Material bélico", qualidades: null },
    { nome: "Propelente", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Carga Explosiva Bruta (CEB)", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Eletrônico", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Eletrônico avançado", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Material especial", qualidades: null },
    { nome: "Material Químico: Sedativo", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Tóxico", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Veículo de transporte", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Inflamável", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Explosivo", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Oxidante", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Corrosivo", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Catalizador", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Psicotrópico", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Bioquímico", qualidades: ["Baixa", "Média", "Alta"] }
];

export function qualidadesDoMaterial(nomeMaterial) {
    const m = MATERIAIS_CRIACAO.find(m => m.nome === nomeMaterial);
    return m ? m.qualidades : null;
}

export const PERICIAS_DESTRAVE = ["Mão Leve", "Arrombamento"];
export const PERICIAS_ARMA_FOGO = ["Armas de Fogo de Pequeno Porte", "Armas de Fogo de Médio Porte", "Armas de Fogo de Grande Porte"];
export const PERICIAS_ARMA_COMBATE = [
    "CQC", "Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas", "Contundentes Longas",
    "Armas Brancas Exóticas", ...PERICIAS_ARMA_FOGO
];

// Ferramenta de Criação "geral" — a única tag cujo item serve pra mais
// de uma perícia ao mesmo tempo (as 5 de PERICIAS_FERRAMENTA_CRIACAO).
// Usada em vários pontos pra tratar esse caso especial: não exigir (nem
// mostrar) um select de perícia única na criação do item, e deixar a
// escolha pra hora de "Usar" (ver ficha.js).
export function ehFerramentaCriacaoGeral(tagKey) {
    return tagKey === "ferramenta_criacao";
}

// Tags cujo item TEM a opção de perícia vinculada (mostra o campo no
// modal) — armas, eletrônicos, ferramentas de criação (química e
// biomecânica) e destraves.
export function tagTemPericiaUso(tagKey) {
    return tagKey === "arma" || tagKey === "eletronico" ||
        tagKey === "ferramenta_criacao_quimica" || tagKey === "ferramenta_criacao_biomecanica" ||
        tagKey === "destrave";
}

// Tags cujo item PRECISA de uma perícia vinculada pra ter ação de "Usar"
// com rolagem automática (armas, ferramentas de criação — química e
// biomecânica — e destraves — manual pg. 49-50 e regras de teste de
// perícia). Ferramenta de Criação GERAL fica de fora desta lista de
// propósito — ver ehFerramentaCriacaoGeral acima: ela não trava numa
// perícia só na criação, então não "exige" escolher uma aqui.
//
// Eletrônico também fica de fora: nem todo item eletrônico serve pra
// Hackear (ex.: uma lanterna, um carregador) — o campo continua
// disponível (ver tagTemPericiaUso acima) pra quem QUISER vincular
// Hacking a um item específico, mas deixar sem perícia vinculada
// também é válido (o item só não ganha o botão "Usar" com rolagem
// automática).
export function tagExigePericiaUso(tagKey) {
    return tagKey === "arma" ||
        tagKey === "ferramenta_criacao_quimica" || tagKey === "ferramenta_criacao_biomecanica" ||
        tagKey === "destrave";
}

// Eletrônico é a única tag (fora Ferramenta de Criação geral, que tem
// mecanismo próprio) cujo item pode ficar vinculado a MAIS DE UMA
// perícia ao mesmo tempo — um item pode servir tanto pra Hackear
// quanto pra Programar. periciaUso guarda um array quando é essa a
// tag; as demais tags continuam guardando uma string única (ou null).
// periciaUsoComoArray normaliza os dois formatos pra quem só quer
// iterar as perícias vinculadas, não importa a tag.
export function ehTagMultiPericia(tagKey) {
    return tagKey === "eletronico";
}

export function periciaUsoComoArray(periciaUso) {
    if (!periciaUso) return [];
    return Array.isArray(periciaUso) ? periciaUso.filter(Boolean) : [periciaUso];
}

// Alguns Eletrônicos guardam dinheiro digital (moedas e notas virtuais
// — um pendrive com cripto, um celular com app de banco). Esses itens
// podem ser marcados (it.ehSaldo) pra funcionar como mais uma "conta"
// de dinheiro da ficha, com valor próprio (it.saldoValor), ao lado dos
// saldos fixos (sujo/limpo/bolso) e customizados. Os ids desses saldos
// "de item" usam o prefixo PREFIXO_SALDO_ITEM pra não colidir com os
// ids normais e pra dar pra rastrear de volta o item de origem — ver
// idSaldoDeItem / ehIdSaldoDeItem / idItemDoSaldo e todosOsSaldos.
export function ehTagQuePodeSerSaldo(tagKey) {
    return tagKey === "eletronico";
}

export const PREFIXO_SALDO_ITEM = "item:";

export function idSaldoDeItem(itemId) {
    return `${PREFIXO_SALDO_ITEM}${itemId}`;
}

export function ehIdSaldoDeItem(saldoId) {
    return typeof saldoId === "string" && saldoId.startsWith(PREFIXO_SALDO_ITEM);
}

export function idItemDoSaldo(saldoId) {
    return ehIdSaldoDeItem(saldoId) ? saldoId.slice(PREFIXO_SALDO_ITEM.length) : null;
}

// Lista unificada de saldos pra exibir/escolher em qualquer lugar da
// ficha (grid de Finanças, dropdown de "de onde sai" o gasto, origem do
// pagamento semanal): junta os saldos normais (fichaAtual.saldos) com
// os saldos guardados em itens marcados como carteira digital.
export function todosOsSaldos(fichaAtual) {
    const saldosFicha = Object.entries(fichaAtual.saldos || {}).map(([id, s]) => ({
        id, nome: s.nome, valor: Number(s.valor) || 0, fixo: !!s.fixo, deItem: false
    }));
    const saldosItem = Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => it.ehSaldo)
        .map(([itemId, it]) => ({
            id: idSaldoDeItem(itemId), nome: `${it.nome} (carteira digital)`,
            valor: Number(it.saldoValor) || 0, fixo: false, deItem: true, itemId
        }));
    return [...saldosFicha, ...saldosItem];
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
        case "ferramenta_criacao_biomecanica": return PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA;
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

// ---------------------------------------------------------------------
// Golpes Mirados (manual): todo golpe pode ser mirado num local do
// corpo, cada um com seu próprio agravante de dificuldade — mas só
// alguns têm efeitos extras (sangramento, amputação, desmaio). Não
// mirar (golpe "Padrão") é narrado aleatoriamente, sem nenhum efeito
// extra, e é sempre reduzido pelo equipamento de TORSO.
//
// localArmadura: qual "slot" de Proteção (ver LOCAIS_PROTECAO) reduz o
// dano recebido nesse local — cada item de Proteção só reduz dano de
// golpes mirados (ou não mirados) na MESMA parte do corpo que ele
// protege (ver localProtegido no item, dados-manual.js).
//
// sangramento: regra de Golpes Perfurantes (manual) — null quando o
// local não tem regra própria (Padrão). difExtra soma em cima da
// dificuldade base do teste de Constituição (10 + nível da arma, ver
// dificuldadeSangramento em regras.js); turnos e fracaoDano definem a
// duração e o dano fixo por turno (fração do dano causado pelo golpe
// que sangrou — SEM rolar dado, valor fixo).
// ---------------------------------------------------------------------
export const LOCAIS_MIRA = [
    { key: "padrao", label: "Padrão (sem mirar)", difMod: 0, localArmadura: "torso", sangramento: null },
    { key: "torso", label: "Torso", difMod: 1, localArmadura: "torso", sangramento: { difExtra: 1, turnos: 3, fracaoDano: 1 / 4 } },
    { key: "membro", label: "Membro (braço ou perna)", difMod: 2, localArmadura: "membro", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    { key: "extremidade", label: "Extremidade (mão ou pé)", difMod: 3, localArmadura: "extremidade", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    // Cabeça: dificuldade normal +2 (corpo a corpo/arma branca); só um
    // TIRO de arma de fogo especificamente na cabeça usa +4 — e é o
    // único caso que aumenta o dano em 1/3 (ver difModLocalMira e
    // bonusDanoFracaoLocalMira abaixo).
    { key: "cabeca", label: "Cabeça", difMod: 2, difModArmaFogo: 4, localArmadura: "cabeca", sangramento: { difExtra: 2, turnos: 3, fracaoDano: 1 / 3 } }
];

export function localMiraPorKey(key) {
    return LOCAIS_MIRA.find(l => l.key === key) || LOCAIS_MIRA[0];
}

// Dificuldade efetiva de mirar num local: só a Cabeça muda conforme o
// tipo de ataque (manual: "Atirar com arma de fogo especificamente na
// cabeça tem dificuldade aumentada em +4"); os demais locais (e a
// própria Cabeça em golpe corpo a corpo/arma branca) usam o difMod normal.
export function difModLocalMira(local, ehFogo) {
    if (ehFogo && local.difModArmaFogo != null) return local.difModArmaFogo;
    return local.difMod;
}

// Bônus de dano (manual): só dispara quando o golpe é um TIRO de arma
// de fogo especificamente na Cabeça.
export function bonusDanoFracaoLocalMira(local, ehFogo) {
    return (local.key === "cabeca" && ehFogo) ? 1 / 3 : 0;
}

// ---------------------------------------------------------------------
// Tipos de dano com efeitos obrigatórios de Golpe Mirado (manual):
// perfurante sangra, cortante amputa, contundente (na Cabeça) agrava o
// teste de desmaio.
// ---------------------------------------------------------------------
export function ehDanoPerfurante(tipoDanoKey) {
    return tipoDanoKey === "perfuracao_comum" || tipoDanoKey === "perfuracao_especial";
}

export function ehDanoCortante(tipoDanoKey) {
    return tipoDanoKey === "corte";
}

export function ehDanoContundente(tipoDanoKey) {
    return tipoDanoKey === "contusao";
}

// Tags cujo item pode ter redução de dano configurada (coletes, placas
// balísticas, etc — manual pg. 52-53). Um mesmo item pode reduzir vários
// tipos de dano diferentes, cada um com seu próprio valor de redução.
export const TAGS_REDUCAO_DANO = ["colete"];
export function tagPodeReduzirDano(tagKey) {
    return TAGS_REDUCAO_DANO.includes(tagKey);
}

// Parte do corpo que um item de Proteção cobre — escolhida na criação
// do item. Reaproveita as mesmas 4 regiões dos Golpes Mirados (ver
// LOCAIS_MIRA acima), sem o local "Padrão" (que não é uma parte
// específica do corpo).
export const LOCAIS_PROTECAO = [
    { key: "cabeca", label: "Cabeça" },
    { key: "torso", label: "Torso" },
    { key: "membro", label: "Membros (braços ou pernas)" },
    { key: "extremidade", label: "Extremidades (pés ou mãos)" }
];

export function rotuloLocalProtecao(key) {
    const l = LOCAIS_PROTECAO.find(l => l.key === key);
    return l ? l.label : key;
}

// Tags que exigem escolher a parte do corpo protegida — hoje, as mesmas
// que podem ter redução de dano configurada.
export function tagExigeLocalProtegido(tagKey) {
    return tagPodeReduzirDano(tagKey);
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
        pericias: [...PERICIAS_APARAR],
        dificuldade: "11 + perícia corpo a corpo do alvo",
        efeito: "Escolhe um alcance único pra ser utilizado nesse combate"
    },
    {
        nome: "Retomar alcance",
        alcance: "Variável",
        pericias: [...PERICIAS_APARAR],
        dificuldade: "Igual à pontuação da delimitação de alcance do adversário",
        efeito: "Retira a limitação de alcance imposta pelo oponente"
    }
];

// ---------------------------------------------------------------------
// "Arremessar" (manual pg. 23, dentro da descrição de CQC nível 3) é
// uma manobra EXCLUSIVA de quem tem CQC nível 3+ — por isso não mora na
// tabela MANOBRAS_COMBATE (que é a lista "aberta pra qualquer perícia"
// do manual, pg. 49-50): só aparece na lista de manobras de ficha.js
// quando o personagem tem o nível (ver renderizarManobrasCombate).
// Guardada separada só pra reaproveitar o mesmo formato de exibição
// (nome/alcance/perícias/dificuldade/efeito) das outras linhas.
//
// IMPORTANTE: isso NÃO é arremessar uma arma (faca/adaga) — é arremessar
// o(s) PRÓPRIO ALVO. Texto do manual: "Para cada inimigo a mais até um
// máximo de 3, você recebe modificador +1 para arremessá-los ou
// derrubá-los. Arremessar causa Força C, teste de derrubar, porém com
// dificuldade aumentada em +2." Não há menção a arma equipada — é
// manobra desarmada (dano tratado como contusão, igual golpe desarmado).
// ---------------------------------------------------------------------
export const MANOBRA_ARREMESSAR_CQC = {
    nome: "Arremessar",
    alcance: "Longo",
    pericias: ["CQC"],
    dificuldade: "9 + agilidade do alvo (dificuldade -1 já embutida do nível 3)",
    efeito: "Exclusiva de CQC nível 3+. Arremessa o(s) alvo(s) (até 3, +1 no ataque por alvo extra); dano Força [escala C] (contusão); cada acerto testa Derrubar (dificuldade +2)"
};

// ---------------------------------------------------------------------
// "Imobilizar" (manual pg. 23, dentro da descrição de CQC nível 4
// "Disparar e Avançar") é outra manobra EXCLUSIVA — só aparece pra quem
// tem CQC nível 4+ (ver renderizarManobrasCombate em ficha.js), igual
// Arremessar acima. Só faz sentido contra um alvo já Derrubado (o
// manual: "Após derrubar pode imobilizar o alvo") — a lista de alvos é
// filtrada pra isso na hora de abrir a modal (ver
// abrirModalSelecionarAlvoImobilizar em ficha.js).
// ---------------------------------------------------------------------
export const MANOBRA_IMOBILIZAR_CQC = {
    nome: "Imobilizar",
    alcance: "Curto",
    pericias: ["CQC"],
    dificuldade: "10 + melhor perícia do alvo entre Jiu Jitsu, CQC ou Briga de Rua",
    efeito: "Exclusiva de CQC nível 4+, só pode ser usada contra um alvo já Derrubado. Sucesso IMOBILIZA o alvo: impede completamente ataques e movimentação até ele testar Destreza (no próprio turno, dificuldade = resultado deste teste de Imobilizar) pra se libertar"
};

// Melhor perícia elegível pra RESISTIR à manobra "Imobilizar" (CQC
// nível 4 — manual: "teste CQC resistido contra Jiu Jitsu, CQC ou Briga
// de Rua do alvo"). Lista fechada e diferente de PERICIAS_APARAR (que
// serve pra Desarmar/Delimitar alcance) porque o manual explicita quais
// perícias valem aqui.
export const PERICIAS_IMOBILIZAR_CQC = ["Jiu Jitsu", "CQC", "Briga de Rua"];

export function listaManobrasCombate() {
    return MANOBRAS_COMBATE;
}

// ---------------------------------------------------------------------
// CQC (manual pg. 20-21): tática militar com bônus progressivos por
// nível. Implementados por enquanto:
//
// Nível 1 (Desarmado): +1 em rolagens de CQC quando o combate é 1x1
// (só o atacante e mais um participante no Gerenciador de Combate), e
// +1 na manobra "Desarmar" quando rolada com CQC de verdade (ver
// resolverDesarmar em ficha.js).
//
// Nível 3 (Esfaquear e Arremessar): golpear com faca ou adaga tem
// dificuldade -1 e ganha +Destreza [escala D, 1x o atributo] de dano
// extra — vale mesmo rolando a perícia Lâminas Curtas em vez de CQC
// (é o NÍVEL de CQC que concede o bônus, não exige rolar com ele). A
// parte de arremessar (MANOBRA_ARREMESSAR_CQC acima) só aparece pra
// quem tem o nível — ver resolverArremessar em ficha.js.
//
// Nível 2 ("Avançar em direção a oponentes armados e derrubá-los tem
// modificador +1 em sua iniciativa e derrubar uma vez. Causa dano
// contundente Destreza D"): condicional a uma escolha narrativa (nem
// todo golpe de Derrubar de quem tem o nível é esse avanço específico),
// então não é automático feito o resto — o +1 de iniciativa e a
// variante de dano de Derrubar entram como checkbox condicional (ver
// participantesElegiveisCQCIniciativa/abrirModalBonusIniciativaCQC e o
// checkbox da modal de Derrubar em ficha.js).
//
// Nível 4 (Disparar e Avançar): duas partes.
// (1) "pode efetuar dois disparos em um alvo fora de seu turno com uma
// pistola, utilizando uma ação do seu primeiro turno" — oferecido igual
// ao bônus de iniciativa do nível 2, no mesmo checkbox pré-rolagem de
// iniciativa (ver abrirModalBonusIniciativaCQC). Marcar reserva 1 ação
// do 1º turno (iniciarIniciativaCombate em mestre.js) e libera um botão
// "Disparar e Avançar" (resolverDispararAvancar em ficha.js) que rola 2
// disparos de Armas de Fogo de Pequeno Porte contra o alvo escolhido,
// fora da ordem de turno normal (mesmo mecanismo de bypass da ação que
// o contra-ataque do Aparar já usa).
// (2) "Após derrubar pode imobilizar o alvo [...] Requer uma ação e
// teste CQC resistido contra Jiu Jitsu, CQC ou Briga de Rua do alvo" —
// vira a manobra exclusiva "Imobilizar" (MANOBRA_IMOBILIZAR_CQC acima),
// só disponível contra quem já está Derrubado. Sucesso trava o alvo
// (ver definirImobilizado em mestre.js): nenhum ataque passa enquanto
// durar (bloqueio TOTAL, mais forte que Agarrar, que só bloqueia
// alcance médio/longo), até um teste de Destreza no próprio turno da
// vítima (ver tentarLibertarImobilizado em ficha.js).
// A "movimentação livre igual à Velocidade" pra avançar em inimigos
// distantes é só narrativa — o sistema não tem grade/posicionamento, só
// registra a nota no Log quando os disparos são resolvidos.
//
// Nível 5 (Agente Impossível): "Além de todos benefícios dos níveis
// anteriores, você recebe uma ação extra em seu turno para rolagens de
// CQC." Diferente do resto — não é condicional a nenhuma escolha
// narrativa, então é automático (nenhum checkbox), mas a restrição
// ("para rolagens de CQC") IMPORTA: não é uma ação genérica a mais, só
// serve quando a rolagem usa a perícia CQC especificamente. Por isso é
// um contador SEPARADO (acoesExtraCQC/acoesExtraCQCMax), nunca somado
// ao `acoes` normal — ver iniciarIniciativaCombate/avancarTurnoCombate/
// consumirAcaoExtraCQC em mestre.js e checarConsumoDeAcao (parâmetro
// ehCQC) em ficha.js, que é quem decide se uma rolagem específica pode
// recorrer a esse contador quando o normal já zerou.
// ---------------------------------------------------------------------
export function bonusCQC1x1(nivelCQC) {
    return Number(nivelCQC) >= 1 ? 1 : 0;
}

// Nível 1: +1 pra desarmar oponentes — só quando a perícia usada pra
// rolar a manobra Desarmar é CQC de verdade (igual ao bônus 1x1 acima).
export function bonusCQCDesarmar(nivelCQC) {
    return Number(nivelCQC) >= 1 ? 1 : 0;
}

// Detecção simples por nome do item — cobre "Faca", "Faca de combate",
// "Adaga ritual" etc. Itens de faca/adaga customizados que fujam desse
// padrão de nome não são detectados automaticamente.
export function ehFacaOuAdaga(nomeItem) {
    return /\bfacas?\b|\badagas?\b/i.test(String(nomeItem || ""));
}

export function bonusCQCFacaAdaga(nivelCQC) {
    if (Number(nivelCQC) < 3) return null;
    return { difAjuste: -1, escalaMultDano: 1 }; // escala D = 1x Destreza
}

// ---------------------------------------------------------------------
// Jiu Jitsu (manual pg. 22): "Técnica baseada em derrubar, imobilizar e
// quebrar ossos." Implementado por completo:
//
// Base (qualquer nível, exige ao menos nível 1): "Ao derrubar alguém
// que não tenha Jiu Jitsu, cause 1/10 do total de PV da vítima." — bônus
// automático de dano na manobra "Derrubar" (manual pg. 49-50) quando
// rolada com a perícia Jiu Jitsu, contra alvo sem a perícia. Ver
// danoQuedaJiuJitsu abaixo e o hook em resolverDerrubar (ficha.js) — o
// "PV total" usado é o PV MÁXIMO do alvo (participante.pvMax, já
// calculado no Gerenciador de Combate), não o atual.
//
// Nível 1 (Quedas): é o próprio nível que HABILITA o bônus acima — o
// manual não descreve nada além do título "Quedas" nesse nível, e o
// parágrafo-base já cobre o efeito (Derrubar é a manobra "de qualquer
// perícia" padrão da lista MANOBRAS_COMBATE, sem exigir nível pra
// existir — só o BÔNUS de dano extra por não-ter-Jiu-Jitsu depende do
// atacante ter pelo menos nível 1 na perícia).
//
// Nível 2 (Imobilização): igual em espírito ao "Imobilizar" do CQC
// nível 4 (MANOBRA_IMOBILIZAR_CQC acima) — por isso REAPROVEITA toda a
// mecânica de status já pronta (definirImobilizado/soltarImobilizado em
// mestre.js, badges 🔒 Imobilizado, bloqueio de ataque em resolverAtaque,
// teste de Destreza pra se libertar). A diferença é só na ROLAGEM: o
// manual diz "vítima não pode fazer nenhuma ação até vencer em um teste
// disputado de Força ou Jiu Jitsu. O usuário pode escolher entre usar a
// perícia Jiu Jitsu, Força ou Destreza nesse teste" — ou seja, tabela
// própria (o atacante rola Jiu Jitsu OU o atributo Força OU o atributo
// Destreza, sua escolha; a dificuldade é 10 + o melhor entre Força e
// Jiu Jitsu do ALVO), diferente da lista fixa do CQC (10 + melhor entre
// Jiu Jitsu/CQC/Briga de Rua do alvo). Ver MANOBRA_IMOBILIZAR_JIUJITSU
// abaixo e resolverImobilizarJiuJitsu/calcularMelhorForcaOuJiuJitsuAlvo
// em ficha.js. Segue a mesma convenção do resto do sistema pra "teste
// disputado" (transformar em dificuldade estática 10 + atributo/perícia
// do alvo — igual Agarrar "10 + Força do alvo", Derrubar "10 +
// Constituição do alvo" etc.), e também exige alvo já Derrubado (mesma
// leitura usada pro Imobilizar do CQC — "imobilizar" no manual de Jiu
// Jitsu é sempre citado junto de "derrubar" no parágrafo-base da perícia).
//
// Nível 3 (Desacordar ao Imobilizar): "Ao vencer no teste disputado, a
// vítima é desacordada se for da vontade do usuário" — oferecido como
// checkbox opcional na mesma modal de alvo do Imobilizar-Jiu-Jitsu
// (só quando nível >= 3). Sucesso com a caixa marcada troca o resultado
// de Imobilizado por um status NOVO, "Desacordado" (definirDesacordado/
// soltarDesacordado em mestre.js) — inconsciente de verdade: bloqueia
// tudo igual Imobilizado, mas SEM teste de Destreza pra se libertar
// sozinho (o manual não dá esse recurso pra quem foi nocauteado) — só
// o Mestre pode "Acordar" a vítima (botão no Gerenciador de Combate).
//
// Níveis 4 e 5 (Quebrar pequenos ossos / Quebrar ossos): "Com o alvo
// imobilizado, o dano é de Destreza C [nível 4] / B [nível 5] e reduz
// em um [nível 4] / dois [nível 5] pontos qualquer ação física, e caso
// seja em um membro inferior, impossibilita correr [só nível 5; ambas
// pernas quebradas = só se arrasta, testando Tolerância dificuldade
// 15]." Vira a manobra exclusiva "Quebrar ossos" (MANOBRA_QUEBRAR_OSSOS_JIUJITSU
// abaixo), só disponível contra quem VOCÊ está imobilizando agora (ver
// abrirModalQuebrarOssosJiuJitsu/resolverQuebrarOssosJiuJitsu em
// ficha.js) — aplica o dano automaticamente (ver danoQuebrarOssosJiuJitsu
// abaixo) e registra o status ossosQuebrados (badge 🦴) com a nota
// textual da penalidade pro Mestre aplicar nos testes físicos seguintes
// da vítima — o sistema não tem uma trava genérica de "penalidade em
// qualquer ação física de um participante específico" (só o dono da
// ficha tem seu próprio estado de saúde/energia calculado), então essa
// parte final fica com o Mestre, igual outras notas só-narrativas já
// existentes no CQC nível 4 (ver comentário acima de MANOBRA_IMOBILIZAR_CQC).
// ---------------------------------------------------------------------

// Bônus de dano da manobra "Derrubar" quando rolada com Jiu Jitsu contra
// alvo sem a perícia — manual: "cause 1/10 do total de PV da vítima".
// pvMaxAlvo é o PV MÁXIMO do participante (não o atual).
export function danoQuedaJiuJitsu(nivelJJAtacante, alvoTemJiuJitsu, pvMaxAlvo) {
    if (Number(nivelJJAtacante) < 1) return 0;
    if (alvoTemJiuJitsu) return 0;
    return Math.floor((Number(pvMaxAlvo) || 0) / 10);
}

export const MANOBRA_IMOBILIZAR_JIUJITSU = {
    nome: "Imobilizar (Jiu Jitsu)",
    alcance: "Curto",
    pericias: ["Jiu Jitsu", "Força", "Destreza"],
    dificuldade: "Teste disputado — 10 + melhor entre Força ou Jiu Jitsu do alvo",
    efeito: "Exclusiva de Jiu Jitsu nível 2+, só pode ser usada contra um alvo já Derrubado. Escolha rolar com Jiu Jitsu, Força ou Destreza. Sucesso IMOBILIZA o alvo (mesmo efeito do CQC nível 4): impede completamente ataques e movimentação até testar Destreza pra se libertar. Jiu Jitsu nível 3: pode escolher Desacordar o alvo em vez disso (sem teste pra se libertar sozinho)."
};

export const MANOBRA_QUEBRAR_OSSOS_JIUJITSU = {
    nome: "Quebrar ossos",
    alcance: "Curto",
    pericias: ["Jiu Jitsu"],
    dificuldade: "Automático — só contra alvo que você já Imobilizou",
    efeito: "Exclusiva de Jiu Jitsu nível 4+, só pode ser usada contra um alvo que você esteja Imobilizando agora. Causa dano automático (Destreza C no nível 4, Destreza B no nível 5) e reduz em 1 (nível 4) ou 2 (nível 5) pontos qualquer ação física da vítima; se atingir um membro inferior (nível 5), impossibilita correr — ambas as pernas quebradas, só dá pra se arrastar (teste de Tolerância, dificuldade 15)."
};

// Escala/label de dano de "Quebrar ossos" por nível de Jiu Jitsu — null
// se o personagem não tem nível suficiente (< 4).
export function danoQuebrarOssosJiuJitsu(nivelJJ) {
    const nivel = Number(nivelJJ) || 0;
    if (nivel >= 5) return { escalaMult: 4, label: "Destreza B", pontosPenalidade: 2 }; // Escala B = 4x
    if (nivel >= 4) return { escalaMult: 2, label: "Destreza C", pontosPenalidade: 1 }; // Escala C = 2x
    return null;
}
