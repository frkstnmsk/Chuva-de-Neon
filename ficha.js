// =====================================================================
// CHUVA DE NEON — Ficha (orquestração principal)
// =====================================================================

import { db } from "./firebase-config.js";
import { ref, set, get, update, remove, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";
import {
    ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS,
    listaAlvosModificador, rotuloAlvo, modificadoresQueAfetam,
    coletarModificadores, calcularDerivados, calcularTotalPericia,
    rolarD20, rolarDado,
    atributoDefesaPorPericia, calcularDificuldadeDefesaJogador, calcularDanoTotalArma,
    calcularDanoDesarmado, calcularDificuldadeArmaFogo, MAX_ATRIBUTO_JOGO,
    calcularEstadoSaude, aplicarEstadoSaudeVelocidade, temPericiaTreinada,
    calcularEstadoEnergia, rolarTesteReanimacao, DIFICULDADE_REANIMACAO
} from "./regras.js";
import {
    PERICIAS_MANUAL, CATEGORIAS_PERICIA, listaPericiasPorCategoria, buscarPericiaPorNome,
    TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS,
    ehArma, ehCarregador, ehProjetil, tagTemNivel, rotuloTag, MANOBRAS_COMBATE,
    tagExigePericiaUso, tagTemPericiaUso, periciasVinculaveisPorTag,
    ehTagMultiPericia, periciaUsoComoArray, tagTemQuantidadeGeral,
    ehTagQuePodeSerSaldo, ehIdSaldoDeItem, idItemDoSaldo, todosOsSaldos,
    CLASSES_PROTECAO, rotuloClasseProtecao, ehArmaDeFogo, tagExigeClasseProtecao,
    CALIBRES, calibresPorClasse, rotuloCalibre, tagUsaCalibreEspecifico,
    ehCalibreEscopeta,
    tagExigeCapacidadeCarregador, tagExigeQuantidadeProjetil,
    tagPodeReduzirDano,
    LOCAIS_PROTECAO, rotuloLocalProtecao, tagExigeLocalProtegido,
    ALCANCES_ARMA_FOGO, PADROES_RECUO, rotuloAlcanceArmaFogo, rotuloPadraoRecuo,
    modificadorRecuo, ESCALA_MULT_DESARMADO, ehGolpeDesarmadoComDano,
    calcularEspecificidadeGolpe, bonusEsquivaBoxe, baseDificuldadeAtaque,
    atendeRequisitoPericia, PERICIAS_ARMA_BRANCA, PERICIAS_APARAR,
    LOCAIS_MIRA, localMiraPorKey, difModLocalMira, bonusDanoFracaoLocalMira,
    ehDanoPerfurante, ehDanoCortante, ehDanoContundente,
    bonusCQC1x1, ehFacaOuAdaga, bonusCQCFacaAdaga, bonusCQCDesarmar, MANOBRA_ARREMESSAR_CQC,
    cobraKaiCriticoAutomatico,
    MANOBRA_IMOBILIZAR_CQC, PERICIAS_IMOBILIZAR_CQC,
    danoQuedaJiuJitsu, MANOBRA_IMOBILIZAR_JIUJITSU, MANOBRA_QUEBRAR_OSSOS_JIUJITSU,
    danoQuebrarOssosJiuJitsu,
    PERICIAS_CRIACAO_ITEM, MATERIAIS_CRIACAO, qualidadesDoMaterial,
    ehFerramentaCriacaoGeral, PERICIAS_FERRAMENTA_CRIACAO
} from "./dados-manual.js";
import { normalizarFicha, fichaVaziaPadrao, normalizarNpcComoFicha } from "./normalizacao.js";
import {
    listaCategorias, nomeCategoria, criarCategoriaCustom, pesoTotalPorCategoria,
    calcularCargaAtual, itemPodeUsar, itemPodeEquipar, itemEhEquipavel, listaArmasInventario,
    listaCarregadoresInventario, listaProjeteisInventario, carregadorEstaAnexado
} from "./inventario.js";
import {
    estadoInicialCriacao, funcaoDe, calcularPontosAtributoTotais,
    aplicarAtributosFixosFuncao, aplicarItemPericiaInicialFuncao,
    opcoesPericiaFuncao, pontosFuncaoDe, validarLimiteAtributoCriacao,
    validarLimitePericiaCriacao, LIMITES_CRIACAO, pontosBonusPorDesvantagens,
    podeAdicionarDesvantagem, quantidadeDesvantagens, MAX_DESVANTAGENS,
    listaFuncoes
} from "./criacao.js";
import {
    precisaSubirNivel, iniciarLevelUpSeNecessario, confirmarPassoAtributo,
    executarPassoDadoVida, gastarPontoPericiaLevelUp, finalizarLevelUp,
    proximaEspecializacaoDisponivel, podeComprarEspecializacao, gastarPontoEspecializacaoLevelUp
} from "./levelup.js";
import {
    estadoInicialTreinamento, labelAtributo, opcoesAtributoFisico, opcoesAtributoMental,
    opcoesPericiaFisica, opcoesPericiaMental, iniciarTreinoCaracteristica,
    cancelarTreinoCaracteristica, avancarUmDiaTreinamento
} from "./treinamento.js";
import {
    garantirCalendarioInicial, ouvirCalendario, salvarCalendario, passarUmDia,
    diasSemana, climas, registrarRolagem, ouvirLogDados,
    ouvirAvisoCustoVida, limparAvisoCustoVida
} from "./calendario.js";
import {
    PADROES_DE_VIDA, custoSemanalPadraoDeVida, custoSemanalTotal,
    ouvirTodasAsFichas, darXp, ouvirGodmode, definirGodmode,
    ouvirIgnorarPenalidadeSaude, definirIgnorarPenalidadeSaude,
    mestreRolarDado, aplicarDano, testarSangramento,
    ouvirNpcs, excluirNpc, passarODia,
    criarNpcDetalhado, atualizarNpcDetalhado,
    ouvirPopupTreinamento, confirmarAvancoTreinamento, descartarPopupTreinamento,
    pagarCustoSemanal,
    ouvirCombateAtivo, adicionarParticipanteCombate, removerParticipanteCombate, encerrarCombate,
    ouvirAcoesPendentes, criarAcaoPendente, rejeitarAcaoPendente, confirmarAcaoPendente,
    iniciarIniciativaCombate, avancarTurnoCombate, consumirAcaoCombate, consumirAcaoExtraCQC, resetarRecuoArma,
    participantesElegiveisCQCIniciativa,
    abrirReacaoPendente, responderReacaoPendente, adicionarEsquivaExtra,
    consumirContraAtaquePendente, definirAgarrado, soltarAgarrado,
    definirDerrubado, levantarDerrubado,
    definirImobilizado, soltarImobilizado, marcarDispararAvancarUsado,
    definirAlcanceLimitado, soltarAlcanceLimitado,
    definirDesacordado, soltarDesacordado, definirOssosQuebrados, curarOssosQuebrados
} from "./mestre.js";
import {
    ouvirItensGlobais, buscarItensGlobaisPorNome, salvarItemNoBanco,
    atualizarItemBanco, excluirItemBanco, autopreencherItemDoBanco, buscarItemBancoPorId
} from "./itens-globais.js";
import {
    ouvirReceitasGlobais, salvarReceitaNoBanco, atualizarReceitaBanco, excluirReceitaBanco
} from "./receitas-globais.js";
import {
    estadoInicialNpcDetalhado, calcularSecundariosNpc,
    adicionarPericiaNpc, removerPericiaNpc
} from "./npc-detalhado.js";

// ---------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------
const sessaoRaw = localStorage.getItem("cdn_session");
let sessao = null;
if (sessaoRaw) {
    try {
        const parsed = JSON.parse(sessaoRaw);
        if (parsed && parsed.role && parsed.mesaId) sessao = parsed;
    } catch (e) {
        sessao = null;
    }
}
if (!sessao) {
    // Também cai aqui pra sessões salvas ANTES da mesa existir (sem
    // mesaId) — precisam logar de novo pra escolher/confirmar a mesa.
    localStorage.removeItem("cdn_session");
    window.location.href = "index.html";
    throw new Error("Sem sessão válida — redirecionando para o login."); // interrompe a execução do módulo
}

const isMestre = sessao.role === "mestre";

// Campos que só o Mestre pode editar diretamente na ficha de um jogador.
// Saldos (dinheiro) não entram mais aqui — viraram uma lista dinâmica
// em fichaAtual.saldos, com a própria trava aplicada em renderizarSaldos().
const CAMPOS_SO_MESTRE = ["nivel", "xp"];

// Campos de atributo/perícia: só editáveis durante Criação, Level Up ou
// Treinamento (a "regra de ouro" do sistema). Godmode do Mestre ignora.
const CAMPOS_PERICIA_BLOQUEADOS_FORA_DE_EDICAO = true;

// ---------------------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------------------
let fichaAtualId = isMestre ? "" : sessao.idLimpo;
let fichaAtual = null; // snapshot completo vindo do Firebase
// "Atuar como NPC" (só Mestre): quando ativo, a tela inteira da Ficha
// passa a ler/escrever em `npcs/{npcAtualId}` em vez de `fichas/{id}`
// — ver caminhoBase() e ativarSincronizacao(). Permite ao Mestre usar a
// MESMA interface de perícias/manobras de combate/itens do jogador pra
// agir por um NPC (modoDetalhado) durante o combate.
let modoNpc = false;
let npcAtualId = null;
let npcRawAtual = null; // último snapshot cru vindo de `npcs/{id}` (formato nativo, não o de ficha)
let listenerAtivo = null;
let listenerAtivoTipo = null; // "fichas" | "npcs" — pra desligar o onValue certo
let salvandoDebounce = null;
let modalContexto = null; // { lista: "inventario", id: "..." } | null = criando nova
let godmodeAtivo = false;
// Sub-opção do Godmode: só some a penalidade de Machucado/Muito
// Machucado quando ESSA também estiver marcada (ver configurarGodmode).
let ignorarPenalidadeSaudeAtivo = false;
let calendarioAtual = null;
let todasAsFichasCache = {};
// Cache local do Banco Global de Itens — carregado pra todo mundo (jogador
// e Mestre), já que o autocompletar do modal de item precisa dele em
// qualquer ficha, não só na Biblioteca do Painel do Mestre.
let itensGlobaisCache = [];
let receitasGlobaisCache = [];
let categoriaInventarioAtiva = "levando";
let ultimoAvisoCustoVida = null; // último valor visto de `avisoCustoVida` no Firebase
let combateAtivoCache = { ativo: false, participantes: {} }; // Gerenciador de Combate (compartilhado)
let combateNpcFormVisivel = false; // controla se o formulário de "Criar novo NPC" está aberto dentro do Gerenciador de Combate
let painelIniciativaJogadorAberto = false; // controla se o modal "Gerenciador de Combate do Jogador" está na tela
let pendentesCache = []; // fila de Ações Pendentes (compartilhada)
let contadorPendentesAnterior = 0; // pra detectar chegada de pedido novo e disparar alerta

// Semáforo: quando > 0, o listener onValue de ativarSincronizacao ignora
// os snapshots recebidos, pra evitar que o Firebase re-entregue um estado
// parcialmente escrito durante uma sequência de múltiplos updates.
// Incrementar antes de qualquer update composto, decrementar ao final.
let _pausarListener = 0;

// Constantes usadas dentro de funções de renderização chamadas a partir
// de init() (via callback do Firebase) — ficam aqui no topo, antes de
// qualquer chamada, pra evitar erro de "acesso antes da inicialização"
// (temporal dead zone) caso o SDK do Firebase entregue algum snapshot
// de forma síncrona (cache local) em vez de assíncrona.
const CAMPOS_PERFIL_SIMPLES = ["nome", "vulgo", "idade", "nacionalidade",
    "maldade", "remorso", "status", "nivel", "xp"];
const CAMPOS_DARKNET_NOTAS = ["dm", "void", "p2k", "rabbithole", "p2c", "creators"];
const TITULOS_MODAL = {
    pericias: "Perícia", inventario: "Item de inventário", vantagens: "Vantagem",
    desvantagens: "Desvantagem", fatosUniversais: "Fato universal",
    especializacoes: "Especialização", gastosExtras: "Gasto semanal extra",
    itensGlobais: "Item do Banco Global"
};
const TIPOS_TREINO = [
    { tipo: "periciaFisica", label: "Perícia física", opcoes: () => opcoesPericiaFisica().map(p => p.nome) },
    { tipo: "periciaMental", label: "Perícia mental", opcoes: () => opcoesPericiaMental().map(p => p.nome) },
    { tipo: "atributoFisico", label: "Atributo físico", opcoes: () => opcoesAtributoFisico().map(a => a.key) },
    { tipo: "atributoMental", label: "Atributo mental", opcoes: () => opcoesAtributoMental().map(a => a.key) }
];
// Vantagens, Desvantagens e Fatos Universais só podem ser adicionados,
// editados ou removidos livremente pelo jogador durante a Criação de
// Personagem — depois disso, só o Mestre mexe (correção de exploit).
const LISTAS_CARACTERISTICA_NARRATIVA = ["vantagens", "desvantagens", "fatosUniversais"];

// ---------------------------------------------------------------------
// Elementos
// ---------------------------------------------------------------------
const el = {
    carregando: document.getElementById("tela-carregando"),
    app: document.getElementById("app"),
    nomeFichaAtiva: document.getElementById("nome-ficha-ativa"),
    userRole: document.getElementById("user-role"),
    mesaIndicador: document.getElementById("mesa-indicador"),
    godmodeIndicador: document.getElementById("godmode-indicador"),
    painelMestreSeletor: document.getElementById("painel-mestre-seletor"),
    selectFicha: document.getElementById("select-ficha"),
    selectNpcAtuar: document.getElementById("select-npc-atuar"),
    syncIndicator: document.getElementById("sync-indicator"),
    btnLogout: document.getElementById("btn-logout"),
    btnAbrirMapa: document.getElementById("btn-abrir-mapa"),
    btnAbrirMestre: document.getElementById("btn-abrir-mestre"),
    badgePendentes: document.getElementById("badge-pendentes"),
    btnAbrirCombate: document.getElementById("btn-abrir-combate"),
    modalCombateMestre: document.getElementById("modal-combate-mestre"),
    combateMestreCorpo: document.getElementById("combate-mestre-corpo"),
    combateMestreFechar: document.getElementById("combate-mestre-fechar"),
    btnSalvar: document.getElementById("btn-salvar"),
    saveStatus: document.getElementById("save-status"),
    tabsNav: document.getElementById("tabs-nav"),
    gridAtributosPrimarios: document.getElementById("grid-atributos-primarios"),
    gridAtributosSecundarios: document.getElementById("grid-atributos-secundarios"),
    gridRecursos: document.getElementById("grid-recursos"),
    estadoSaudeBadge: document.getElementById("estado-saude-badge"),
    estadoEnergiaBadge: document.getElementById("estado-energia-badge"),
    overlayMorte: document.getElementById("overlay-morte"),
    overlayMorteTitulo: document.getElementById("overlay-morte-titulo"),
    overlayMorteTexto: document.getElementById("overlay-morte-texto"),
    btnNaoQueroMorrer: document.getElementById("btn-nao-quero-morrer"),
    overlayMorteResultado: document.getElementById("overlay-morte-resultado"),
    btnReviverGodmode: document.getElementById("btn-reviver-godmode"),
    btnEasterEgg: document.getElementById("btn-easter-egg"),
    overlayEasterEgg: document.getElementById("overlay-easter-egg"),
    listaPericias: document.getElementById("lista-pericias"),
    btnAddPericia: document.getElementById("btn-add-pericia"),
    listaVantagens: document.getElementById("lista-vantagens"),
    btnAddVantagem: document.getElementById("btn-add-vantagem"),
    listaDesvantagens: document.getElementById("lista-desvantagens"),
    btnAddDesvantagem: document.getElementById("btn-add-desvantagem"),
    listaFatos: document.getElementById("lista-fatos"),
    btnAddFato: document.getElementById("btn-add-fato"),
    bonusDesvantagensArea: document.getElementById("bonus-desvantagens-area"),
    listaEspecializacoes: document.getElementById("lista-especializacoes"),
    listaGastosExtras: document.getElementById("lista-gastos-extras"),
    resumoCustoSemanal: document.getElementById("resumo-custo-semanal"),
    fPadraoVida: document.getElementById("f-padrao-vida"),
    financasSaldoHint: document.getElementById("financas-saldo-hint"),
    financasSaldosGrid: document.getElementById("financas-saldos-grid"),
    btnAddSaldo: document.getElementById("btn-add-saldo"),
    financasGastarBloco: document.getElementById("financas-gastar-bloco"),
    financasGastarOrigem: document.getElementById("financas-gastar-origem"),
    financasGastarValor: document.getElementById("financas-gastar-valor"),
    financasGastarBtn: document.getElementById("financas-gastar-btn"),
    financasGanhoFixo: document.getElementById("financas-ganho-fixo"),
    financasGanhoFixoSalvar: document.getElementById("financas-ganho-fixo-salvar"),
    resumoCarga: document.getElementById("resumo-carga"),
    inventarioCategoriasNav: document.getElementById("inventario-categorias-nav"),
    inventarioListas: document.getElementById("inventario-listas"),
    listaArmasCombate: document.getElementById("lista-armas-combate"),
    listaManobrasCombate: document.getElementById("lista-manobras-combate"),
    treinoGrid: document.getElementById("treino-grid"),
    receitasLista: document.getElementById("receitas-lista"),
    hintNivelXp: document.getElementById("hint-nivel-xp"),
    avisoCriacaoPendente: document.getElementById("aviso-criacao-pendente"),
    btnContinuarCriacao: document.getElementById("btn-continuar-criacao"),
    modal: document.getElementById("modal-entidade"),
    modalTitulo: document.getElementById("modal-titulo"),
    modalNome: document.getElementById("modal-nome"),
    modalItemBancoOpcoes: document.getElementById("modal-item-banco-opcoes"),
    modalCampoSalvarBanco: document.getElementById("modal-campo-salvar-banco"),
    modalSalvarBanco: document.getElementById("modal-salvar-banco"),
    modalCampoCategoriaPericia: document.getElementById("modal-campo-categoria-pericia"),
    modalCategoriaPericia: document.getElementById("modal-categoria-pericia"),
    modalCampoPericiaBusca: document.getElementById("modal-campo-pericia-busca"),
    modalPericiaBusca: document.getElementById("modal-pericia-busca"),
    modalPericiaOpcoes: document.getElementById("modal-pericia-opcoes"),
    modalPericiaValor: document.getElementById("modal-pericia-valor"),
    modalCampoNivel: document.getElementById("modal-campo-nivel"),
    modalNivel: document.getElementById("modal-nivel"),
    modalCampoTag: document.getElementById("modal-campo-tag"),
    modalTag: document.getElementById("modal-tag"),
    modalCampoEquipavel: document.getElementById("modal-campo-equipavel"),
    modalEquipavel: document.getElementById("modal-equipavel"),
    modalCampoNivelTag: document.getElementById("modal-campo-nivel-tag"),
    modalNivelTag: document.getElementById("modal-nivel-tag"),
    modalCampoPericiaUso: document.getElementById("modal-campo-pericia-uso"),
    hintFerramentaCriacaoGeral: document.getElementById("hint-ferramenta-criacao-geral"),
    modalLabelPericiaUso: document.getElementById("modal-label-pericia-uso"),
    modalPericiaUso: document.getElementById("modal-pericia-uso"),
    modalPericiaUsoCheckboxes: document.getElementById("modal-pericia-uso-checkboxes"),
    hintPericiaUsoMultipla: document.getElementById("hint-pericia-uso-multipla"),
    modalCampoItemSaldo: document.getElementById("modal-campo-item-saldo"),
    modalItemEhSaldo: document.getElementById("modal-item-eh-saldo"),
    modalItemSaldoValorBloco: document.getElementById("modal-item-saldo-valor-bloco"),
    modalItemSaldoValor: document.getElementById("modal-item-saldo-valor"),
    modalCampoClasseProtecao: document.getElementById("modal-campo-classe-protecao"),
    modalLabelClasseProtecao: document.getElementById("modal-label-classe-protecao"),
    modalClasseProtecao: document.getElementById("modal-classe-protecao"),
    modalCampoLocalProtegido: document.getElementById("modal-campo-local-protegido"),
    modalLocalProtegido: document.getElementById("modal-local-protegido"),
    modalCampoCalibre: document.getElementById("modal-campo-calibre"),
    modalCalibre: document.getElementById("modal-calibre"),
    modalCampoCarregadorCapacidade: document.getElementById("modal-campo-carregador-capacidade"),
    modalCarregadorCapacidade: document.getElementById("modal-carregador-capacidade"),
    modalCampoProjetilQuantidade: document.getElementById("modal-campo-projetil-quantidade"),
    modalProjetilQuantidade: document.getElementById("modal-projetil-quantidade"),
    modalCampoMaterialTipo: document.getElementById("modal-campo-material-tipo"),
    modalMaterialTipo: document.getElementById("modal-material-tipo"),
    modalCampoMaterialQualidade: document.getElementById("modal-campo-material-qualidade"),
    modalMaterialQualidade: document.getElementById("modal-material-qualidade"),
    modalCampoMaterialQuantidade: document.getElementById("modal-campo-material-quantidade"),
    modalMaterialQuantidade: document.getElementById("modal-material-quantidade"),
    modalCampoPeso: document.getElementById("modal-campo-peso"),
    modalLabelPeso: document.getElementById("modal-label-peso"),
    modalPeso: document.getElementById("modal-peso"),
    modalCampoQuantidade: document.getElementById("modal-campo-quantidade"),
    modalQuantidade: document.getElementById("modal-quantidade"),
    modalQuantidadePesoTotal: document.getElementById("modal-quantidade-peso-total"),
    modalCampoCategoriaItem: document.getElementById("modal-campo-categoria-item"),
    modalCategoriaItem: document.getElementById("modal-categoria-item"),
    modalConfigArma: document.getElementById("modal-config-arma"),
    modalArmaDanoBase: document.getElementById("modal-arma-dano-base"),
    modalArmaTipoDano: document.getElementById("modal-arma-tipo-dano"),
    modalCampoTipoDanoExtra: document.getElementById("modal-campo-tipo-dano-extra"),
    modalArmaTipoDanoExtra: document.getElementById("modal-arma-tipo-dano-extra"),
    modalCampoEscala: document.getElementById("modal-campo-escala"),
    modalArmaEscala: document.getElementById("modal-arma-escala"),
    modalConfigArmaFogo: document.getElementById("modal-config-arma-fogo"),
    modalArmaCapacidade: document.getElementById("modal-arma-capacidade"),
    modalArmaDisparosTurno: document.getElementById("modal-arma-disparos-turno"),
    modalArmaPrecisao: document.getElementById("modal-arma-precisao"),
    modalArmaDificuldadeAcerto: document.getElementById("modal-arma-dificuldade-acerto"),
    modalArmaAlcance: document.getElementById("modal-arma-alcance"),
    modalArmaRecuo: document.getElementById("modal-arma-recuo"),
    modalArmaEfeitoExtra: document.getElementById("modal-arma-efeito-extra"),
    modalCampoArmaCarregador: document.getElementById("modal-campo-arma-carregador"),
    modalArmaCarregador: document.getElementById("modal-arma-carregador"),
    modalArmaModificacoesLista: document.getElementById("modal-arma-modificacoes-lista"),
    modalArmaAddModificacao: document.getElementById("modal-arma-add-modificacao"),
    modalConfigReducaoDano: document.getElementById("modal-config-reducao-dano"),
    modalReducaoDanoLista: document.getElementById("modal-reducao-dano-lista"),
    modalDescricao: document.getElementById("modal-descricao"),
    modalListaModificadores: document.getElementById("modal-lista-modificadores"),
    modalAddModificador: document.getElementById("modal-add-modificador"),
    modalCancelar: document.getElementById("modal-cancelar"),
    modalExcluir: document.getElementById("modal-excluir"),
    modalSalvar: document.getElementById("modal-salvar"),
    templateModificador: document.getElementById("template-modificador"),
    templateModificacaoArma: document.getElementById("template-modificacao-arma"),
    // calendário
    calData: document.getElementById("cal-data"),
    calDiaSemana: document.getElementById("cal-dia-semana"),
    calHora: document.getElementById("cal-hora"),
    calTemperatura: document.getElementById("cal-temperatura"),
    calClima: document.getElementById("cal-clima"),
    calendarioEdicaoMestre: document.getElementById("calendario-edicao-mestre"),
    calEditData: document.getElementById("cal-edit-data"),
    calEditDiaSemana: document.getElementById("cal-edit-dia-semana"),
    calEditHora: document.getElementById("cal-edit-hora"),
    calEditTemp: document.getElementById("cal-edit-temp"),
    calEditClima: document.getElementById("cal-edit-clima"),
    btnSalvarCalendario: document.getElementById("btn-salvar-calendario"),
    btnPassarDia: document.getElementById("btn-passar-dia"),
    // log de dados
    logDados: document.getElementById("log-dados"),
    logDadosLista: document.getElementById("log-dados-lista"),
    btnToggleLog: document.getElementById("btn-toggle-log"),
    logRolarMod: document.getElementById("log-rolar-mod"),
    logRolarBtn: document.getElementById("log-rolar-btn"),
    // modais especiais
    modalCriacao: document.getElementById("modal-criacao"),
    criacaoCorpo: document.getElementById("criacao-corpo"),
    criacaoBotoes: document.getElementById("criacao-botoes"),
    modalLevelup: document.getElementById("modal-levelup"),
    levelupCorpo: document.getElementById("levelup-corpo"),
    levelupBotoes: document.getElementById("levelup-botoes"),
    modalMestre: document.getElementById("modal-mestre"),
    mestreCorpo: document.getElementById("mestre-corpo"),
    mestreFechar: document.getElementById("mestre-fechar"),
    chkGodmode: document.getElementById("chk-godmode"),
    chkGodmodeIgnorarSaude: document.getElementById("chk-godmode-ignorar-saude"),
    modalCustoVida: document.getElementById("modal-custo-vida"),
    custoVidaResumo: document.getElementById("custo-vida-resumo"),
    custoVidaOrigem: document.getElementById("custo-vida-origem"),
    custoVidaConfirmar: document.getElementById("custo-vida-confirmar"),
    modalPopupTreino: document.getElementById("modal-popup-treino"),
    popupTreinoTexto: document.getElementById("popup-treino-texto"),
    popupTreinoNao: document.getElementById("popup-treino-nao"),
    popupTreinoSim: document.getElementById("popup-treino-sim"),
    modalSelecionarAlvo: document.getElementById("modal-selecionar-alvo"),
    alvoTitulo: document.getElementById("alvo-titulo"),
    modalReacaoDefesa: document.getElementById("modal-reacao-defesa"),
    reacaoDefesaCorpo: document.getElementById("reacao-defesa-corpo"),
    reacaoDefesaBotoes: document.getElementById("reacao-defesa-botoes"),
    alvoSelect: document.getElementById("alvo-select"),
    alvoCampoExtra: document.getElementById("alvo-campo-extra"),
    alvoCancelar: document.getElementById("alvo-cancelar"),
    alvoConfirmar: document.getElementById("alvo-confirmar"),
    modalDarItem: document.getElementById("modal-dar-item"),
    darItemTitulo: document.getElementById("dar-item-titulo"),
    darItemSelect: document.getElementById("dar-item-select"),
    darItemCancelar: document.getElementById("dar-item-cancelar"),
    darItemConfirmar: document.getElementById("dar-item-confirmar")
};

// ---------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------
function toast(msg, tipo = "ok") {
    const container = document.getElementById("toast");
    const div = document.createElement("div");
    div.className = "toast-msg" + (tipo && tipo !== "ok" ? ` ${tipo}` : "");
    div.innerText = msg;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3600);
}

// ---------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------
init();

async function init() {
    el.userRole.innerText = isMestre ? "Mestre" : (sessao.nome || "Jogador").toUpperCase();
    el.userRole.classList.add(isMestre ? "mestre" : "jogador");
    if (el.mesaIndicador) el.mesaIndicador.innerText = `Mesa: ${sessao.mesaId || "?"}`;

    montarGridsEstaticas();
    montarAbas();
    montarSelectsFixos();

    // Regra de ouro financeira/inventário: só o Mestre pode adicionar
    // item novo direto no inventário. O jogador usa "Usar"/"Mover"/"Dar",
    // e remoção/transferência sempre passam pelo Sistema de Aprovação.
    document.getElementById("btn-add-item").style.display = isMestre ? "inline-block" : "none";

    el.btnLogout.addEventListener("click", () => {
        localStorage.removeItem("cdn_session");
        window.location.href = "index.html";
    });

    el.btnAbrirMapa.addEventListener("click", () => {
        window.open("mapa.html", "_blank", "noopener");
    });

    el.btnSalvar.addEventListener("click", () => salvarTudo(true));

    el.btnNaoQueroMorrer.addEventListener("click", tentarReanimacao);
    el.btnReviverGodmode.addEventListener("click", reviverGodmode);

    // Easter egg: botão invisível no canto inferior esquerdo. Sem
    // confirmação, sem toast — só mostra o overlay. Não existe handler
    // pra escondê-lo de novo de propósito (ver overlay-easter-egg em
    // ficha.html): a única saída é atualizar a página.
    if (el.btnEasterEgg && el.overlayEasterEgg) {
        el.btnEasterEgg.addEventListener("click", () => {
            el.overlayEasterEgg.style.display = "flex";
        });
    }

    if (isMestre) {
        el.painelMestreSeletor.style.display = "flex";
        el.btnAbrirMestre.style.display = "inline-block";
        el.btnAbrirCombate.style.display = "inline-block";
        el.calendarioEdicaoMestre.style.display = "block";
        ouvirListaDeFichas();
        ouvirListaDeNpcsParaAtuar();
        el.selectFicha.addEventListener("change", (e) => {
            if (e.target.value) {
                modoNpc = false;
                npcAtualId = null;
                if (el.selectNpcAtuar) el.selectNpcAtuar.value = "";
                fichaAtualId = e.target.value;
                ativarSincronizacao();
            }
        });
        if (el.selectNpcAtuar) {
            el.selectNpcAtuar.addEventListener("change", (e) => {
                if (e.target.value) {
                    modoNpc = true;
                    npcAtualId = e.target.value;
                    // fichaAtualId de uma ficha de jogador escolhida antes
                    // (ou nunca escolhida) precisa ser zerado aqui — senão
                    // ele fica "grudado" na memória e o filtro de auto-alvo
                    // do Gerenciador de Combate (abrirModalSelecionarAlvo)
                    // passa a excluir, por engano, o participante que tem
                    // esse id antigo, mesmo sem ter nada a ver com o NPC
                    // que o Mestre está controlando agora.
                    fichaAtualId = "";
                    el.selectFicha.value = "";
                    ativarSincronizacao();
                }
            });
        }
        el.app.style.display = "flex";
        el.carregando.style.display = "none";
        renderTudoVazio();
        configurarPainelMestre();
    } else {
        ativarSincronizacao();
    }

    // Cada chamada abaixo é isolada: se uma falhar (ex: permissão negada
    // num nó do banco), as outras continuam configurando seus listeners
    // normalmente, em vez de travar a inicialização inteira da página.
    await tentarOuAvisar("calendário inicial", () => garantirCalendarioInicial(isMestre));
    tentarOuAvisar("calendário (listener)", configurarCalendario);
    tentarOuAvisar("log de dados", configurarLogDados);
    tentarOuAvisar("aviso de custo de vida", configurarAvisoCustoVida);
    tentarOuAvisar("popup de treinamento", configurarPopupTreinamento);
    tentarOuAvisar("godmode", configurarGodmode);
    tentarOuAvisar("gerenciador de combate", configurarCombateAtivo);
    tentarOuAvisar("modal de alvo", configurarModalSelecionarAlvo);
    tentarOuAvisar("finanças", configurarFinancas);
    tentarOuAvisar("ações pendentes", configurarAcoesPendentes);
    tentarOuAvisar("dar item", configurarDarItem);
    tentarOuAvisar("cache de fichas", () => {
        ouvirTodasAsFichas((todas) => { todasAsFichasCache = todas || {}; });
    });
    tentarOuAvisar("banco global de itens", () => {
        ouvirItensGlobais((itens) => {
            itensGlobaisCache = itens || [];
            // Se a aba "Biblioteca de Itens" do Painel do Mestre estiver
            // aberta, atualiza a lista em tempo real (mesmo padrão usado
            // pelo Gerenciador de Combate e Ações Pendentes).
            if (isMestre && el.mestreCorpo && el.mestreCorpo.dataset.acaoAberta === "biblioteca") {
                abrirAcaoMestre("biblioteca");
            }
        });
    });

    // Banco Global de Receitas (receitas-globais.js) — mesma ideia do de
    // itens acima, só que pra receitas de criação. Alimenta tanto a aba
    // "Receitas" da ficha quanto a "Biblioteca de Receitas" do Mestre.
    tentarOuAvisar("banco global de receitas", () => {
        ouvirReceitasGlobais((receitas) => {
            receitasGlobaisCache = receitas || [];
            if (fichaAtual) renderizarReceitas();
            if (isMestre && el.mestreCorpo && el.mestreCorpo.dataset.acaoAberta === "biblioteca-receitas") {
                abrirAcaoMestre("biblioteca-receitas");
            }
        });
    });

    tentarOuAvisar("botões de adicionar", configurarBotoesAdicionar);
    tentarOuAvisar("modal genérico", configurarModal);
    tentarOuAvisar("busca de perícia", configurarBuscaPericia);
    tentarOuAvisar("modificações de arma", configurarModificacoesArma);
    tentarOuAvisar("modificadores genéricos", configurarModificadoresGenerico);
}

// Roda uma função de setup isoladamente: se ela lançar erro (síncrono ou
// numa Promise), registra no console e segue pro próximo passo, em vez de
// travar o resto da inicialização da página.
function tentarOuAvisar(nome, fn) {
    try {
        const resultado = fn();
        if (resultado && typeof resultado.catch === "function") {
            resultado.catch(e => console.error(`Falha ao configurar "${nome}":`, e));
        }
    } catch (e) {
        console.error(`Falha ao configurar "${nome}":`, e);
    }
}

function renderTudoVazio() {
    el.nomeFichaAtiva.innerText = "Selecione uma ficha";
}

// ---------------------------------------------------------------------
// Lista de fichas pro Mestre escolher
// ---------------------------------------------------------------------
function ouvirListaDeFichas() {
    onValue(ref(db, caminhoMesa("fichas")), (snapshot) => {
        const valorAntigo = el.selectFicha.value;
        el.selectFicha.innerHTML = '<option value="">-- Escolha uma ficha da rede --</option>';
        if (snapshot.exists()) {
            const todas = snapshot.val();
            Object.keys(todas).forEach(id => {
                const nomeExibicao = (todas[id].config && todas[id].config.nomeExibicao) || id;
                const opt = document.createElement("option");
                opt.value = id;
                opt.innerText = nomeExibicao;
                el.selectFicha.appendChild(opt);
            });
            if (valorAntigo && todas[valorAntigo]) {
                el.selectFicha.value = valorAntigo;
            }
        }
    });
}

// Lista de NPCs "modo detalhado" pro Mestre escolher em "Atuar como NPC".
// NPCs do gerador rápido não entram aqui — eles não têm atributos
// primários estruturados o bastante pra virar uma Ficha completa.
function ouvirListaDeNpcsParaAtuar() {
    if (!el.selectNpcAtuar) {
        console.warn('[Chuva de Neon] #select-npc-atuar não existe no HTML — o ficha.html em uso está desatualizado (não tem o seletor "Atuar como NPC").');
        return;
    }
    ouvirNpcs((lista) => {
        const valorAntigo = el.selectNpcAtuar.value;
        el.selectNpcAtuar.innerHTML = '<option value="">-- Ou atue como um NPC --</option>';
        const detalhados = (lista || []).filter(n => n.modoDetalhado);
        detalhados.forEach(n => {
            const opt = document.createElement("option");
            opt.value = n.id;
            opt.innerText = n.nome || n.id;
            el.selectNpcAtuar.appendChild(opt);
        });
        // Diagnóstico: se existem NPCs mas nenhum é "mini-ficha" (modoDetalhado),
        // deixa isso visível em vez de uma caixa silenciosamente vazia — é a causa
        // mais comum de "não aparece nada nessa caixa".
        if (lista && lista.length && !detalhados.length) {
            const optAviso = document.createElement("option");
            optAviso.value = ""; optAviso.disabled = true;
            optAviso.innerText = `(${lista.length} NPC(s) existem, mas nenhum é mini-ficha completa)`;
            el.selectNpcAtuar.appendChild(optAviso);
        }
        if (valorAntigo && (lista || []).some(n => n.id === valorAntigo)) {
            el.selectNpcAtuar.value = valorAntigo;
        }
    });
}

// Prefixo do caminho no Firebase pra ficha ativa: `fichas/{id}` no modo
// normal, `npcs/{id}` quando o Mestre está "atuando como" um NPC. Toda
// escrita da tela da Ficha passa por aqui, pra funcionar sem duplicar
// lógica pros dois casos.
function caminhoBase() {
    return caminhoMesa(modoNpc ? `npcs/${npcAtualId}` : `fichas/${fichaAtualId}`);
}

// Id do registro ativo, seja ficha de jogador ou NPC (modo "atuar
// como"). Usado nos vários guards genéricos "!fichaAtualId" que na
// verdade só querem checar "há uma ficha carregada pra editar" — sem
// isso, esses guards ficavam presos ao id da última ficha de JOGADOR
// escolhida (ou vazio, se o Mestre nunca escolheu nenhuma) e bloqueavam
// edições enquanto o Mestre estivesse atuando só como NPC.
function idAtivo() {
    return modoNpc ? npcAtualId : fichaAtualId;
}

// A lista de perícias do NPC mora em `periciasNpc` (nó também usado pelo
// mini-editor de NPC do Mestre), não em `pericias` como na ficha de
// jogador — todo o resto dos nós (inventario, categoriasInventario,
// vantagens, etc.) tem o mesmo nome nos dois lados.
function caminhoLista(lista) {
    return (modoNpc && lista === "pericias") ? "periciasNpc" : lista;
}

// ---------------------------------------------------------------------
// Sincronização em tempo real com a ficha ativa
// ---------------------------------------------------------------------
function ativarSincronizacao() {
    if (listenerAtivo) {
        off(ref(db, caminhoMesa(`${listenerAtivoTipo}/${listenerAtivo}`)));
    }
    if (modoNpc) {
        if (!npcAtualId) return;
        listenerAtivo = npcAtualId;
        listenerAtivoTipo = "npcs";
    } else {
        if (!fichaAtualId) return;
        listenerAtivo = fichaAtualId;
        listenerAtivoTipo = "fichas";
    }

    onValue(ref(db, caminhoBase()), (snapshot) => {
        if (_pausarListener > 0) return; // operação composta em andamento, ignorar
        el.carregando.style.display = "none";
        el.app.style.display = "flex";

        if (!snapshot.exists()) {
            toast(modoNpc ? "Esse NPC não existe mais na rede." : "Essa ficha não existe mais na rede.", "erro");
            return;
        }

        if (modoNpc) {
            npcRawAtual = snapshot.val();
            fichaAtual = normalizarNpcComoFicha(npcAtualId, npcRawAtual);
        } else {
            fichaAtual = normalizarFicha(snapshot.val());
        }
        el.nomeFichaAtiva.innerText = ((fichaAtual.config.nomeExibicao || fichaAtualId).toUpperCase()) + (modoNpc ? " (NPC)" : "");

        aplicarVisibilidadeAbasNpc();

        verificarCriacaoPendente();
        verificarLevelUpPendente();
        avaliarAvisoCustoVida();

        renderizarTudo();

        // Se o wizard de criação estiver aberto (ex: jogador foi pra aba
        // "Vantagens / Desvantagens" cadastrar uma desvantagem, como o
        // hint da Etapa 5 sugere, e voltou), reconstrói a etapa atual pra
        // refletir o novo total de pontos bônus. Sem isso, o wizard ficava
        // "congelado" com o valor de antes até o jogador navegar manualmente
        // entre as etapas — e, pior, os botões +/- desse congelamento
        // mexiam numa cópia antiga de fichaAtual.criacao que não ia mais
        // pro Firebase quando salva (a causa raiz do dessincronismo).
        if (el.modalCriacao && el.modalCriacao.classList.contains("active")) {
            renderEtapaCriacao();
        }

        marcarSincronizado();
    }, (error) => {
        console.error(error);
        el.syncIndicator.classList.add("offline");
        toast("Falha ao sincronizar com a rede.", "erro");
    });
}

function marcarSincronizado() {
    el.syncIndicator.classList.remove("offline");
    el.saveStatus.innerText = "sincronizado em tempo real";
}

// Pausa o listener do onValue durante uma sequência de múltiplos updates
// pro Firebase, evitando que cada update intermediário dispare uma
// re-renderização com estado parcial. Sempre usar em par com retornarSync().
function pausarSync() { _pausarListener++; }
function retornarSync() { if (_pausarListener > 0) _pausarListener--; }

// =====================================================================
// MONTAGEM ESTÁTICA (uma vez, no load)
// =====================================================================

function montarAbas() {
    const botoes = el.tabsNav.querySelectorAll(".tab-btn");
    botoes.forEach(btn => {
        btn.addEventListener("click", () => {
            botoes.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
            document.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"]`).classList.add("active");
        });
    });
}

// Abas que não fazem sentido pra um NPC (finanças, treinamento/estudo,
// dark net) somem enquanto o Mestre estiver "atuando como" ele — o
// resto (Perfil, Atributos, Perícias, Inventário, Combate, Vantagens/
// Desvantagens, Especializações, Notas) continua igual à ficha normal.
const ABAS_OCULTAS_NPC = ["financas", "treinamento", "darknet"];
function aplicarVisibilidadeAbasNpc() {
    if (!el.tabsNav) return;
    const abaAtivaOculta = modoNpc && ABAS_OCULTAS_NPC.includes(
        el.tabsNav.querySelector(".tab-btn.active")?.dataset.tab
    );
    ABAS_OCULTAS_NPC.forEach(tab => {
        const btn = el.tabsNav.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (btn) btn.style.display = modoNpc ? "none" : "";
    });
    if (abaAtivaOculta) {
        const btnPericias = el.tabsNav.querySelector('.tab-btn[data-tab="pericias"]');
        if (btnPericias) btnPericias.click();
    }
}

function montarGridsEstaticas() {
    // ---- Atributos primários ----
    el.gridAtributosPrimarios.innerHTML = "";
    ATRIBUTOS_PRIMARIOS.forEach(attr => {
        const card = document.createElement("div");
        card.className = "attr-card";
        card.dataset.attr = attr.key;
        card.innerHTML = `
            <label for="attr-${attr.key}">${attr.label}</label>
            <div class="attr-acoes">
                <button type="button" class="btn-rolar btn-blue" data-rolar-attr="${attr.key}" title="Rolar d20 + ${attr.label}">🎲</button>
                <input type="number" id="attr-${attr.key}" min="0" max="7" data-attr-primario="${attr.key}">
            </div>
        `;
        card.querySelector(`[data-rolar-attr="${attr.key}"]`).addEventListener("click", async () => {
            if (!fichaAtual) { toast("Nenhuma ficha carregada ainda.", "erro"); return; }
            const valor = Number(fichaAtual.dados[attr.key]) || 0;
            await rolarERegistrar(attr.label, valor);
        });
        el.gridAtributosPrimarios.appendChild(card);
    });

    // ---- Recursos vitais (PV, Energia...) ----
    el.gridRecursos.innerHTML = "";
    RECURSOS.forEach(rec => {
        const card = document.createElement("div");
        card.className = "attr-card recurso";
        card.dataset.recurso = rec.key;
        card.innerHTML = `
            <label>${rec.label}</label>
            <div class="attr-valor-wrap">
                <input type="number" data-recurso-atual="${rec.key}">
                <span class="max-label">/ <span data-recurso-max="${rec.key}">0</span><input type="number" data-recurso-max-input="${rec.key}" style="display:none;" title="Godmode: sobrescreve o máximo calculado"></span>
            </div>
        `;
        el.gridRecursos.appendChild(card);
    });

    // ---- Atributos secundários (calculados) ----
    el.gridAtributosSecundarios.innerHTML = "";
    ATRIBUTOS_SECUNDARIOS.forEach(attr => {
        const card = document.createElement("div");
        card.className = "attr-card calculado";
        card.dataset.attrSecundario = attr.key;
        card.title = "Clique no valor pra ver o detalhamento";
        card.innerHTML = `
            <label>${attr.label}</label>
            <div class="attr-acoes">
                <button type="button" class="btn-rolar btn-blue" data-rolar-secundario="${attr.key}" title="Rolar d20 + ${attr.label}">🎲</button>
                <span class="attr-valor" data-attr-secundario-valor="${attr.key}">0</span>
            </div>
        `;
        card.querySelector(".attr-valor").addEventListener("click", (e) => { e.stopPropagation(); mostrarDetalheSecundario(attr.key); });
        card.querySelector(`[data-rolar-secundario="${attr.key}"]`).addEventListener("click", async (e) => {
            e.stopPropagation();
            const total = window._ultimosDerivados ? Math.round(window._ultimosDerivados.secundarios[attr.key].total) : 0;
            await rolarERegistrar(attr.label, total);
        });
        el.gridAtributosSecundarios.appendChild(card);
    });
}

function montarSelectsFixos() {
    // ---- Padrão de vida (Perfil) ----
    el.fPadraoVida.innerHTML = '<option value="">-- escolha --</option>';
    PADROES_DE_VIDA.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.key;
        opt.innerText = `${p.label} (CN$ ${p.custoSemanal}/semana)`;
        el.fPadraoVida.appendChild(opt);
    });

    // ---- Categoria de perícia (modal) ----
    el.modalCategoriaPericia.innerHTML = '<option value="">-- escolha a categoria --</option>';
    CATEGORIAS_PERICIA.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key;
        opt.innerText = c.label;
        el.modalCategoriaPericia.appendChild(opt);
    });

    // ---- Tags de item (modal) ----
    el.modalTag.innerHTML = '<option value="">-- escolha a tag --</option>';
    TAGS_ITEM.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        el.modalTag.appendChild(opt);
    });

    // ---- Local protegido (modal — só pra itens de Proteção) ----
    el.modalLocalProtegido.innerHTML = '<option value="">-- escolha o que este item protege --</option>';
    LOCAIS_PROTECAO.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.key;
        opt.innerText = l.label;
        el.modalLocalProtegido.appendChild(opt);
    });

    // ---- Nível de tag (modal) ----
    el.modalNivelTag.innerHTML = "";
    NIVEIS_ARMA.forEach(n => {
        const opt = document.createElement("option");
        opt.value = n;
        opt.innerText = `Nível ${n}`;
        el.modalNivelTag.appendChild(opt);
    });

    // ---- Tipo de dano (modal) ----
    el.modalArmaTipoDano.innerHTML = "";
    TIPOS_DANO.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        el.modalArmaTipoDano.appendChild(opt);
    });

    // ---- Tipo de dano EXTRA (modal — arma branca com dois tipos de
    // dano, ex.: machadinha corte+perfurante): "Nenhum" some o campo de
    // escolha na hora de atacar (ver abrirModalSelecionarAlvo).
    el.modalArmaTipoDanoExtra.innerHTML = '<option value="">-- nenhum --</option>';
    TIPOS_DANO.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        el.modalArmaTipoDanoExtra.appendChild(opt);
    });

    // ---- Escala de arma (modal) ----
    el.modalArmaEscala.innerHTML = '<option value="">-- não se aplica --</option>';
    ESCALAS_ARMA.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.key;
        opt.innerText = e.label;
        el.modalArmaEscala.appendChild(opt);
    });

    // ---- Alcance de arma de fogo (modal) ----
    el.modalArmaAlcance.innerHTML = "";
    ALCANCES_ARMA_FOGO.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.key;
        opt.innerText = a.label;
        el.modalArmaAlcance.appendChild(opt);
    });

    // ---- Recuo de arma de fogo (modal) ----
    el.modalArmaRecuo.innerHTML = "";
    PADROES_RECUO.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.key;
        opt.innerText = p.label;
        el.modalArmaRecuo.appendChild(opt);
    });

    // ---- Clima (calendário, edição do Mestre) ----
    el.calEditClima.innerHTML = "";
    climas().forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.innerText = c;
        el.calEditClima.appendChild(opt);
    });

    // ---- Dia da semana (calendário, edição do Mestre) ----
    el.calEditDiaSemana.innerHTML = "";
    diasSemana().forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.innerText = d;
        el.calEditDiaSemana.appendChild(opt);
    });
}

// =====================================================================
// RENDERIZAÇÃO — chamada a cada snapshot novo do Firebase
// =====================================================================

function podeEditarPericiaAtributo() {
    if (!fichaAtual) return false;
    // O Mestre pode sempre editar a ficha de um NPC que ele controla —
    // não é uma trapaça, é o dono legítimo daquele registro.
    if (isMestre && modoNpc) return true;
    // Godmode do mestre ignora tudo
    if (isMestre && godmodeAtivo) return true;
    // "Regra de ouro" — os 3 momentos legítimos de edição:
    // 1. Criação de personagem em andamento
    if (!fichaAtual.criacao.concluida) return true;
    // 2. Level Up pendente
    if (fichaAtual.levelUpPendente && fichaAtual.levelUpPendente.ativo) return true;
    // 3. Treinamento ativo
    if (fichaAtual.treinamento && fichaAtual.treinamento.ativo) return true;
    return false;
}

// Vantagens, Desvantagens e Fatos Universais: características escolhidas
// na criação do personagem (parte do pano de fundo narrativo). O jogador
// só pode cadastrá-las enquanto a criação estiver em andamento; depois
// de "criacaoConcluida", só o Mestre pode adicionar, editar ou remover
// (correção de exploit — regra 2 do pedido de refatoração).
function podeEditarCaracteristicaNarrativa() {
    if (!fichaAtual) return false;
    if (isMestre) return true;
    return !fichaAtual.criacao.concluida;
}

// ---------------------------------------------------------------------
// Receitas CONHECIDAS pelo personagem (diferente do Banco Global de
// Receitas em si — ver receitas-globais.js): cada perícia de criação de
// item dá direito a exatamente 1 receita GRÁTIS por nível, do nível 1
// até o nível atual da perícia (perícia nível 3 → 1 receita nível 1, 1
// nível 2, 1 nível 3). O jogador escolhe livremente entre as receitas já
// cadastradas no Banco Global pra aquele nível — mas, uma vez escolhida,
// o slot fica travado: nem o próprio jogador pode trocar ou remover essa
// escolha depois (só o Mestre). Qualquer receita ALÉM dessas gratuitas
// só entra na ficha se o Mestre adicionar (representando algo achado,
// comprado ou ensinado durante o jogo) — ver renderizarReceitas.
function receitaLivreDoSlot(periciaNome, nivel) {
    const entrada = Object.entries(fichaAtual.receitasConhecidas || {})
        .find(([, c]) => c.periciaVinculada === periciaNome && Number(c.nivel) === nivel && c.origem === "livre");
    return entrada ? { id: entrada[0], ...entrada[1] } : null;
}

function receitasExtrasDaPericia(periciaNome) {
    return Object.entries(fichaAtual.receitasConhecidas || {})
        .filter(([, c]) => c.periciaVinculada === periciaNome && c.origem === "mestre")
        .map(([id, c]) => ({ id, ...c }))
        .sort((a, b) => (Number(a.nivel) || 0) - (Number(b.nivel) || 0));
}

// Concede uma receita já existente no Banco Global ao personagem atual.
// origem "livre" só deve ser chamado quando o slot daquele nível ainda
// estiver vazio (ver renderizarReceitas, que só mostra o controle de
// escolha nesse caso) — mas revalida aqui também, pra não dar pra burlar
// clicando duas vezes rápido ou com duas abas abertas.
async function concederReceitaConhecida(periciaNome, nivel, receitaGlobalId, origem) {
    if (!fichaAtual.receitasConhecidas) fichaAtual.receitasConhecidas = {};
    if (origem === "livre" && receitaLivreDoSlot(periciaNome, nivel)) {
        toast(`Esse personagem já tem a receita gratuita de nível ${nivel} dessa perícia.`, "erro");
        return;
    }
    const nomeAutor = fichaAtual?.config?.nomeExibicao || sessao?.nome || (isMestre ? "Mestre" : "Jogador");
    const id = gerarIdLocal();
    fichaAtual.receitasConhecidas[id] = {
        receitaGlobalId,
        periciaVinculada: periciaNome,
        nivel,
        origem,
        adicionadoPorNome: nomeAutor,
        adicionadoEm: Date.now()
    };
    await update(ref(db, `${caminhoBase()}/receitasConhecidas`), fichaAtual.receitasConhecidas);
    toast(origem === "livre" ? "Receita gratuita adicionada à ficha." : "Receita adicionada à ficha pelo Mestre.");
}

// Remover uma receita conhecida (gratuita ou extra) — travado pro
// jogador: depois de escolhida, só o Mestre pode desfazer.
async function removerReceitaConhecida(id) {
    if (!isMestre) { toast("Só o Mestre pode remover uma receita já adquirida.", "erro"); return; }
    if (!confirm("Remover essa receita da ficha do personagem?")) return;
    delete fichaAtual.receitasConhecidas[id];
    await remove(ref(db, `${caminhoBase()}/receitasConhecidas/${id}`));
    toast("Receita removida da ficha.");
}


function renderizarTudo() {
    if (!fichaAtual) return;
    const modificadoresPlanos = coletarModificadores(fichaAtual);

    renderizarPerfil();
    renderizarFinancas();
    renderizarAtributos(modificadoresPlanos);
    verificarMorte();
    renderizarPericias(modificadoresPlanos);
    renderizarInventario(modificadoresPlanos);
    renderizarCombate();
    renderizarVantagensDesvantagens();
    renderizarEspecializacoes();
    renderizarTreinamento();
    renderizarReceitas();
    renderizarDarknetENotas();
}

// ---------------------------------------------------------------------
// PERFIL
// ---------------------------------------------------------------------
function renderizarPerfil() {
    const d = fichaAtual.dados;
    CAMPOS_PERFIL_SIMPLES.forEach(campo => {
        const input = document.querySelector(`[data-field="${campo}"]`);
        if (!input) return;
        if (document.activeElement !== input) input.value = d[campo] ?? "";
        const soMestre = CAMPOS_SO_MESTRE.includes(campo);
        input.disabled = soMestre && !isMestre;
    });
    el.hintNivelXp.style.display = isMestre ? "none" : "block";

    const inputFuncao = document.querySelector('[data-field="funcao"]');
    const funcaoKey = d.funcao || fichaAtual.criacao.funcaoEscolhida || "";
    const f = funcaoDe(funcaoKey);
    inputFuncao.value = f ? f.label : (funcaoKey || "—");

    if (document.activeElement !== el.fPadraoVida) {
        el.fPadraoVida.value = d.padraoDeVida || "";
    }

    const custoBase = custoSemanalPadraoDeVida(d.padraoDeVida);
    const extras = Object.values(fichaAtual.gastosExtras || {}).reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
    el.resumoCustoSemanal.innerText = d.padraoDeVida
        ? `CN$ ${custoBase + extras} (padrão CN$ ${custoBase} + extras CN$ ${extras})`
        : "defina um padrão de vida";

    renderizarListaSimples(el.listaGastosExtras, fichaAtual.gastosExtras || {}, (id, g) => ({
        nome: g.nome || "(sem nome)",
        sub: g.descricao || "",
        direita: `CN$ ${g.valor || 0}`
    }), "gastosExtras");
}

// ---------------------------------------------------------------------
// FINANÇAS — saldos (Mestre edita direto, jogador só vê + solicita
// gasto), padrão de vida/gastos semanais (herdado do Perfil) e ganho
// fixo semanal (jogador declara livremente; creditado automático todo
// Domingo pelo Mestre, sem precisar de aprovação — não mexe em saldo
// alheio, só declara um valor).
// ---------------------------------------------------------------------
function renderizarFinancas() {
    el.financasSaldoHint.innerText = isMestre
        ? "você pode editar os saldos diretamente acima"
        : "apenas o Mestre pode editar os saldos — use \"Gastar dinheiro\" abaixo pra remover";
    el.financasGastarBloco.style.display = isMestre ? "none" : "block";

    renderizarSaldos();
    renderizarOpcoesOrigemGasto();

    if (document.activeElement !== el.financasGanhoFixo) {
        el.financasGanhoFixo.value = fichaAtual.dados.ganhoFixo ?? 0;
    }
}

// Desenha um campo numérico por saldo (fixo ou customizado). Só o
// Mestre pode digitar direto aqui — jogador só vê o valor e usa
// "Gastar dinheiro" (que vira pedido de aprovação).
function renderizarSaldos() {
    const saldos = todosOsSaldos(fichaAtual);
    el.financasSaldosGrid.innerHTML = "";
    saldos.forEach((s) => {
        const domId = s.id.replace(/[^a-zA-Z0-9_-]/g, "_");
        const campo = document.createElement("div");
        campo.className = "campo";
        campo.innerHTML = `
            <label for="saldo-${domId}">${escapeHtml(s.nome)}</label>
            <input type="number" id="saldo-${domId}" data-saldo-id="${s.id}">
        `;
        const input = campo.querySelector("input");
        if (document.activeElement !== input) input.value = s.valor ?? 0;
        input.disabled = !isMestre;
        el.financasSaldosGrid.appendChild(campo);
    });
}

// Popula o dropdown "de onde sai" (gastar dinheiro) com os saldos
// atuais da ficha, preservando a escolha atual quando possível.
function renderizarOpcoesOrigemGasto() {
    const saldos = todosOsSaldos(fichaAtual);
    const escolhaAnterior = el.financasGastarOrigem.value;
    el.financasGastarOrigem.innerHTML = "";
    saldos.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.nome;
        el.financasGastarOrigem.appendChild(opt);
    });
    if (saldos.some(s => s.id === escolhaAnterior)) el.financasGastarOrigem.value = escolhaAnterior;
}

function configurarFinancas() {
    // Edição direta de saldo — só o Mestre (delegado, igual aos
    // atributos primários).
    document.addEventListener("input", (e) => {
        const saldoId = e.target.dataset && e.target.dataset.saldoId;
        if (!saldoId || !fichaAtualId || !isMestre) return;
        const valor = Number(e.target.value) || 0;
        if (ehIdSaldoDeItem(saldoId)) {
            const itemId = idItemDoSaldo(saldoId);
            if (!fichaAtual.inventario || !fichaAtual.inventario[itemId]) return;
            fichaAtual.inventario[itemId].saldoValor = valor;
            agendarSalvamento(`inventario/${itemId}/saldoValor`, valor);
            return;
        }
        if (!fichaAtual.saldos || !fichaAtual.saldos[saldoId]) return;
        fichaAtual.saldos[saldoId].valor = valor;
        agendarSalvamento(`saldos/${saldoId}/valor`, valor);
    });

    // Criar novo saldo — carteira/local personalizado. Disponível pro
    // jogador (e pro Mestre); respeita as mesmas regras de aprovação
    // pra retirada, por ser um saldo igual aos demais.
    el.btnAddSaldo.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId) return;
        const nome = (prompt("Nome do novo saldo (ex: Cofre do esconderijo, Debaixo do colchão):") || "").trim();
        if (!nome) return;
        const id = "saldo_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        if (!fichaAtual.saldos) fichaAtual.saldos = {};
        fichaAtual.saldos[id] = { nome, valor: 0, fixo: false };
        await update(ref(db, `${caminhoBase()}/saldos`), fichaAtual.saldos);
        toast(`Saldo "${nome}" criado.`);
    });

    // Ganho fixo — declaração livre do jogador, não mexe em saldo agora,
    // só fica registrado pro crédito automático de Domingo. Não passa
    // pelo sistema de aprovação (não é uma transação, é uma "promessa").
    el.financasGanhoFixoSalvar.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId) return;
        const valor = Math.max(0, Number(el.financasGanhoFixo.value) || 0);
        fichaAtual.dados.ganhoFixo = valor;
        await update(ref(db, `${caminhoBase()}/dados`), { ganhoFixo: valor });
        toast(`Ganho fixo semanal definido: CN$ ${valor}.`);
    });

    // Gastar dinheiro — jogador nunca subtrai na hora; vira pedido pro
    // Mestre aprovar (regra 4). Funciona pra qualquer saldo, inclusive
    // os customizados criados pelo próprio jogador.
    el.financasGastarBtn.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId || isMestre) return;
        const valor = Number(el.financasGastarValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor de gasto maior que zero.", "erro"); return; }
        const saldoId = el.financasGastarOrigem.value;
        const saldo = todosOsSaldos(fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const saldoAtual = Number(saldo.valor) || 0;
        if (valor > saldoAtual) { toast("Valor maior que o saldo disponível.", "erro"); return; }
        const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
        await criarAcaoPendente({
            tipo: "gastar_dinheiro",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer gastar CN$ ${valor} (${saldo.nome}).`,
            payload: { valor, saldoId }
        });
        toast("Pedido de gasto enviado ao Mestre.");
        el.financasGastarValor.value = 0;
    });
}

// ---------------------------------------------------------------------
// Helper genérico: renderiza uma <ul> de entidades simples (vantagem,
// desvantagem, fato, gasto extra...). `mapeador(id, item)` retorna
// { nome, sub, direita }. `listaChave` identifica de qual campo da
// ficha vieram (pra abrir o modal de edição certo).
// ---------------------------------------------------------------------
function renderizarListaSimples(container, objeto, mapeador, listaChave) {
    container.innerHTML = "";
    const ids = Object.keys(objeto || {});
    if (!ids.length) {
        container.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nada cadastrado ainda.</li>`;
        return;
    }
    ids.forEach(id => {
        const item = objeto[id];
        const { nome, sub, direita } = mapeador(id, item);
        // Só entidades com modificadores estruturados ganham o botão de
        // ativo/desativado — o resto (ex: gastos extras) não tem "efeito"
        // pra ligar/desligar.
        const temEfeito = !!(item.modificadores && item.modificadores.length);
        const ativo = item.ativo !== false;
        const li = document.createElement("li");
        li.className = temEfeito && !ativo ? "entidade-desativada" : "";
        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(nome)}</span>
                ${sub ? `<span class="entity-sub">${escapeHtml(sub)}</span>` : ""}
            </div>
            <div class="entity-badges">
                ${direita ? `<span class="entity-sub">${escapeHtml(direita)}</span>` : ""}
                ${temEfeito ? `<button type="button" class="btn-toggle-ativo ${ativo ? "ligado" : "desligado"}" title="${ativo ? "Efeito ativo agora — clique pra desativar" : "Efeito desativado agora — clique pra ativar"}">${ativo ? "● Ativo" : "○ Inativo"}</button>` : ""}
            </div>
        `;
        if (temEfeito) {
            li.querySelector(".btn-toggle-ativo").addEventListener("click", (e) => {
                e.stopPropagation();
                alternarAtivoEntidade(listaChave, id, !ativo);
            });
        }
        li.addEventListener("click", () => abrirModalEdicao(listaChave, id));
        container.appendChild(li);
    });
}

// ---------------------------------------------------------------------
// Liga/desliga o efeito (modificadores) de uma entidade qualquer — item,
// vantagem, desvantagem, fato universal ou especialização — sem mexer
// no resto do seu cadastro. `coletarModificadores` (regras.js) ignora
// modificadores de qualquer entidade com `ativo: false`. A sincronização
// em tempo real (ativarSincronizacao) já re-renderiza a ficha inteira
// assim que o Firebase confirma a escrita, então não precisamos chamar
// nenhuma função de render manualmente aqui.
// ---------------------------------------------------------------------
async function alternarAtivoEntidade(lista, id, novoValor) {
    if (!idAtivo()) return;
    try {
        await update(ref(db, `${caminhoBase()}/${caminhoLista(lista)}/${id}`), { ativo: novoValor });
    } catch (e) {
        toast("Não foi possível atualizar o efeito. Tente de novo.", "erro");
    }
}

// Equipar/desequipar um item do inventário — só item equipado pode ser
// usado (ver itemPodeUsar em inventario.js); pra armas, também é o que
// a manobra "Desarmar" de fato retira do alvo (ver resolverDesarmar).
//
// EQUIPAR (não desequipar) durante combate com iniciativa ativo gasta 1
// ação do turno — mesmo Sistema de Aprovação do Mestre usado pro resto
// das ações (ver checarConsumoDeAcao/criarAcaoPendente): jogador manda
// o gasto pro Mestre aprovar, e Mestre (controlando a própria ficha ou
// um NPC em modoNpc) gasta na hora. Fora de combate com iniciativa, ou
// desequipar, continua sendo ação livre.
async function alternarEquipadaItem(id, novoValor, nomeItem) {
    if (!idAtivo()) return;

    let consumo = { participanteId: null, direto: false, extraCQC: false };
    if (novoValor) {
        consumo = checarConsumoDeAcao(true, false);
        if (!consumo) return;
    }

    try {
        await update(ref(db, `${caminhoBase()}/inventario/${id}`), { equipada: novoValor });
    } catch (e) {
        toast("Não foi possível atualizar o item. Tente de novo.", "erro");
        return;
    }

    if (!consumo.participanteId) {
        toast(novoValor ? "Item equipado." : "Item desequipado.");
        return;
    }

    if (consumo.direto) {
        await consumirAcaoCombate(consumo.participanteId);
        toast("Item equipado — 1 ação consumida.");
    } else {
        const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} equipou ${nomeItem || "um item"} e quer gastar 1 ação do turno.`,
            payload: { participanteId: consumo.participanteId, extraCQC: false, ehArmaFogo: false }
        });
        toast("Item equipado — gasto de ação enviado pro Mestre aprovar.");
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------------------------------------------------------------
// Texto de detalhamento (hover) — "como cheguei nesse valor": base +
// cada modificador com a origem (item/vantagem/desvantagem/etc.) + total.
// Usado como `title` (tooltip nativo) em atributos, perícias, PV/Energia
// e qualquer outro valor calculado da ficha. `title` nativo já quebra
// linha em "\n" (mesmo truque já usado no tooltip do carregador).
// ---------------------------------------------------------------------
function textoDetalhamento(label, baseValor, baseLabel, ajustes, totalValor) {
    const fmt = n => {
        const r = Math.round((Number(n) || 0) * 10) / 10;
        return Number.isInteger(r) ? r : r.toFixed(1);
    };
    let texto = `${label}\n${baseLabel}: ${fmt(baseValor)}`;
    (ajustes || []).forEach(a => {
        texto += `\n${a.valor >= 0 ? "+" : ""}${fmt(a.valor)} — ${a.origem}`;
    });
    if (!ajustes || !ajustes.length) texto += "\nSem modificadores ativos.";
    texto += `\n\nTotal: ${fmt(totalValor)}`;
    return texto;
}

// ---------------------------------------------------------------------
// ATRIBUTOS
// ---------------------------------------------------------------------
function renderizarAtributos(modificadoresPlanos) {
    const d = fichaAtual.dados;
    const podeEditar = podeEditarPericiaAtributo();

    ATRIBUTOS_PRIMARIOS.forEach(attr => {
        const input = document.querySelector(`[data-attr-primario="${attr.key}"]`);
        if (!input) return;
        if (document.activeElement !== input) input.value = d[attr.key] ?? 0;
        input.disabled = !podeEditar;
        input.closest(".attr-card").classList.toggle("locked", !podeEditar);
        // Limite normal de 7 (manual pg. 21) — mas o godmode do Mestre pode
        // ultrapassar isso, porque existem formas legítimas dentro do jogo
        // de passar de 7 num atributo (ex.: Esteroide e outros itens/efeitos
        // do manual). Sem essa liberação, nem digitando manualmente dava pra
        // registrar o valor porque o <input type="number" max="7"> travava.
        if (isMestre && godmodeAtivo) {
            input.removeAttribute("max");
        } else {
            input.max = "7";
        }
        // Tooltip: atributo primário é editável diretamente (o número no
        // campo já É a base), mas alguns efeitos (vantagens, itens etc.)
        // podem mirar `atributo:X` e só entram em jogo em cálculos
        // específicos (ex: dificuldade de defesa) — o hover deixa isso
        // visível mesmo sem mudar o valor exibido no campo.
        const baseAttr = Number(d[attr.key]) || 0;
        const ajustesAttr = modificadoresQueAfetam(`atributo:${attr.key}`, modificadoresPlanos);
        const totalAttr = baseAttr + ajustesAttr.reduce((acc, m) => acc + m.valor, 0);
        input.closest(".attr-card").title = textoDetalhamento(attr.label, baseAttr, "Base (valor cadastrado)", ajustesAttr, totalAttr);
    });

    // Recursos (PV, Energia) — máximo calculado, atual editável por qualquer um.
    // Máximo normalmente travado (só span), mas em Godmode vira um input
    // editável (ver maximoComOverride) — sem isso não tinha NENHUMA forma
    // de ajustar o PV máximo de um jogador na mão, mesmo com Godmode ligado.
    const derivados = calcularDerivados(d, modificadoresPlanos);
    const godmodeRecursos = isMestre && godmodeAtivo;
    let pvMaximoTotal = 0;
    let energiaMaximoTotal = 0;
    RECURSOS.forEach(rec => {
        const maxLabel = document.querySelector(`[data-recurso-max="${rec.key}"]`);
        const maxInput = document.querySelector(`[data-recurso-max-input="${rec.key}"]`);
        const atualInput = document.querySelector(`[data-recurso-atual="${rec.key}"]`);
        // PV ganho no Level Up (dado de vida) é um bônus PERMANENTE somado
        // por cima da fórmula (constituição/nível) — guardado em
        // dados.pvBonusExtra, incrementado em executarPassoDadoVida
        // (levelup.js). Sem isso o ganho só existia enquanto o PV atual
        // não descia abaixo do máximo antigo.
        const bonusExtra = rec.key === "pv" ? (Number(d.pvBonusExtra) || 0) : 0;
        const infoRecurso = derivados.recursos[rec.key];
        const totalCalculado = Math.round(infoRecurso.total) + bonusExtra;
        const total = maximoComOverride(rec.key, d, totalCalculado);
        if (rec.key === "pv") pvMaximoTotal = total;
        if (rec.key === "energia") energiaMaximoTotal = total;
        // Tooltip do máximo: fórmula base + modificadores estruturados +
        // bônus de dado de vida (Level Up) + override manual (Godmode),
        // cada um só aparecendo se realmente existir.
        const ajustesRecurso = [...infoRecurso.ajustes];
        if (bonusExtra) ajustesRecurso.push({ valor: bonusExtra, origem: "Dado de vida (Level Up)" });
        const override = d[rec.key + "MaximoOverride"];
        const temOverride = override !== null && override !== undefined && override !== "";
        if (temOverride) ajustesRecurso.push({ valor: total - (Math.round(infoRecurso.base) + ajustesRecurso.reduce((a, m) => a + m.valor, 0)), origem: "Override manual do Mestre (Godmode)" });
        const cardRecurso = document.querySelector(`[data-recurso="${rec.key}"]`);
        if (cardRecurso) cardRecurso.title = textoDetalhamento(rec.label, infoRecurso.base, "Base (fórmula do manual)", ajustesRecurso, total);
        if (maxLabel) {
            maxLabel.innerText = total;
            maxLabel.style.display = godmodeRecursos ? "none" : "";
        }
        if (maxInput) {
            maxInput.style.display = godmodeRecursos ? "" : "none";
            if (godmodeRecursos && document.activeElement !== maxInput) maxInput.value = total;
        }
        if (atualInput) {
            const valorSalvo = d[rec.key + "Atual"];
            if (document.activeElement !== atualInput) {
                atualInput.value = (valorSalvo === null || valorSalvo === undefined) ? total : valorSalvo;
            }
            atualInput.dataset.recursoKey = rec.key;
        }
    });

    // Estado de saúde (Machucado / Muito Machucado — ver regras.js) a
    // partir do PV atual x PV máximo já com bônus de Level Up. A perícia
    // Tolerância, quando treinada, empurra o limiar de "Muito Machucado"
    // de 1/3 pra 1/4 do PV máximo. O efeito em Velocidade entra direto
    // no total do secundário (aplicarEstadoSaudeVelocidade); o efeito
    // em testes (-2/-4) é lido depois por penalidadeTestesAtual() em
    // toda rolagem de perícia. A penalidade só é totalmente desligada —
    // pra qualquer ficha, jogador ou Mestre — com o Godmode ativo E o
    // sub-toggle "ignorar penalidade de saúde" também marcado (ver
    // configurarGodmode); Godmode sozinho não mexe mais nisso.
    const temTolerancia = temPericiaTreinada(fichaAtual.pericias, "Tolerância");
    const ignorarPenalidadeSaude = godmodeAtivo && ignorarPenalidadeSaudeAtivo;
    const estadoSaude = calcularEstadoSaude(d.pvAtual, pvMaximoTotal, temTolerancia, ignorarPenalidadeSaude);
    derivados.secundarios.velocidade = aplicarEstadoSaudeVelocidade(derivados.secundarios.velocidade, estadoSaude);
    renderizarEstadoSaude(estadoSaude);

    // Estado de Energia (Energia Baixa / Energia Crítica / Morte — ver
    // regras.js) a partir da Energia atual x Energia máxima. Mesma
    // filosofia do estado de saúde: o efeito em testes (físicos/mentais)
    // é lido depois por penalidadeEnergiaParaPericia() em toda rolagem
    // de perícia. Reaproveita o mesmo toggle de Godmode que já ignora a
    // penalidade de saúde — "ignorar penalidade" no Godmode passa a
    // valer pros dois recursos vitais de uma vez.
    const estadoEnergia = calcularEstadoEnergia(d.energiaAtual, energiaMaximoTotal, ignorarPenalidadeSaude);
    renderizarEstadoEnergia(estadoEnergia);

    // Secundários calculados
    ATRIBUTOS_SECUNDARIOS.forEach(attr => {
        const span = document.querySelector(`[data-attr-secundario-valor="${attr.key}"]`);
        if (span) span.innerText = Math.round(derivados.secundarios[attr.key].total * 10) / 10;
        const cardSecundario = document.querySelector(`[data-attr-secundario="${attr.key}"]`);
        if (cardSecundario) {
            const infoSec = derivados.secundarios[attr.key];
            cardSecundario.title = textoDetalhamento(attr.label, infoSec.base, "Base (fórmula do manual)", infoSec.ajustes, infoSec.total);
        }
    });

    window._ultimosDerivados = derivados; // usado pelo detalhamento ao clicar
    window._ultimosModificadores = modificadoresPlanos;
    window._estadoSaudeAtual = estadoSaude; // usado por penalidadeTestesAtual() nas rolagens
    window._estadoEnergiaAtual = estadoEnergia; // usado por penalidadeEnergiaParaPericia() nas rolagens
}

// Atualiza o badge de aviso "Machucado"/"Muito Machucado" (some quando o
// personagem está saudável).
function renderizarEstadoSaude(estadoSaude) {
    if (!el.estadoSaudeBadge) return;
    if (!estadoSaude || !estadoSaude.estado) {
        el.estadoSaudeBadge.style.display = "none";
        el.estadoSaudeBadge.innerHTML = "";
        return;
    }
    el.estadoSaudeBadge.style.display = "block";
    el.estadoSaudeBadge.classList.toggle("muito-machucado", estadoSaude.estado === "muito_machucado");
    const efeitoVelocidade = estadoSaude.metadeVelocidade ? "Velocidade cai pela metade" : `Velocidade ${estadoSaude.penalidadeVelocidade}`;
    el.estadoSaudeBadge.innerHTML = `<strong>${escapeHtml(estadoSaude.label)}</strong> — ${efeitoVelocidade} · ${estadoSaude.penalidadeTestes} em todos os testes`;
}

// Penalidade de todos os testes por causa do estado de saúde atual
// (0, -2 ou -4 — ver calcularEstadoSaude). Lida do último cálculo feito
// em renderizarAtributos, que sempre roda antes das demais seções.
function penalidadeTestesAtual() {
    return (window._estadoSaudeAtual && window._estadoSaudeAtual.penalidadeTestes) || 0;
}

// Atualiza o badge de aviso "Energia Baixa"/"Energia Crítica"/"Morte"
// (some quando a Energia atual está saudável) — mesmo padrão visual de
// renderizarEstadoSaude acima.
function renderizarEstadoEnergia(estadoEnergia) {
    if (!el.estadoEnergiaBadge) return;
    if (!estadoEnergia || !estadoEnergia.estado) {
        el.estadoEnergiaBadge.style.display = "none";
        el.estadoEnergiaBadge.innerHTML = "";
        return;
    }
    el.estadoEnergiaBadge.style.display = "block";
    el.estadoEnergiaBadge.classList.toggle("energia-critica", estadoEnergia.estado === "energia_critica");
    el.estadoEnergiaBadge.classList.toggle("morte", estadoEnergia.estado === "morte");
    if (estadoEnergia.morte) {
        el.estadoEnergiaBadge.innerHTML = `<strong>${escapeHtml(estadoEnergia.label)}</strong> — Energia chegou a 0. O personagem não sobrevive ao esgotamento.`;
        return;
    }
    el.estadoEnergiaBadge.innerHTML = `<strong>${escapeHtml(estadoEnergia.label)}</strong> — ${estadoEnergia.penalidadeFisica} em testes físicos${estadoEnergia.penalidadeMental ? ` · ${estadoEnergia.penalidadeMental} em testes mentais` : ""}`;
}

// Penalidade extra (além do estado de saúde) que o estado de Energia
// atual aplica sobre uma categoria de teste específica ("fisica" ou
// "mental" — ver CATEGORIAS_PERICIA em dados-manual.js). Testes sociais
// e perícias "legado" sem categoria conhecida não são afetados.
function penalidadeEnergiaPara(categoria) {
    const estado = window._estadoEnergiaAtual;
    if (!estado || !estado.estado) return 0;
    if (categoria === "fisica") return estado.penalidadeFisica || 0;
    if (categoria === "mental") return estado.penalidadeMental || 0;
    return 0;
}

// Mesma ideia acima, mas resolvendo a categoria a partir do nome da
// perícia (consulta a lista fechada do manual em dados-manual.js).
function penalidadeEnergiaParaPericia(nomePericia) {
    const info = buscarPericiaPorNome(nomePericia);
    return info ? penalidadeEnergiaPara(info.categoria) : 0;
}

// Badge de "Machucado"/"Muito Machucado"/"Morte" pra uma linha de
// participante do Gerenciador de Combate — mesmo helper compartilhado
// que badgeEstadoEnergiaCombate() logo abaixo.
function badgeEstadoSaudeCombate(p) {
    if (!p.estadoSaude) return "";
    const titulo = p.estadoSaude === "morte"
        ? "PV chegou a 0"
        : `-${p.estadoSaude === "muito_machucado" ? "4" : "2"} em todos os testes`;
    return ` <span class="mod-pill negativo" title="${titulo}">${escapeHtml(p.estadoSaudeLabel)}</span>`;
}

// Badge de "Energia Baixa"/"Energia Crítica"/"Morte" pra uma linha de
// participante do Gerenciador de Combate (painel do jogador e painel
// do Mestre reaproveitam esta mesma função) — mesmo padrão visual do
// badge de estado de saúde já usado nessas listas.
function badgeEstadoEnergiaCombate(p) {
    if (!p.estadoEnergia) return "";
    const titulo = p.estadoEnergia === "morte"
        ? "Energia esgotada"
        : (p.estadoEnergia === "energia_critica" ? "-3 em testes físicos, -2 em testes mentais" : "-2 em testes físicos");
    return ` <span class="mod-pill negativo" title="${titulo}">${escapeHtml(p.estadoEnergiaLabel)}</span>`;
}

// Badges de status ativos por turno (Tick System — ex: Sangramento) pra
// uma linha de participante do Gerenciador de Combate. Um badge por
// efeito ativo, mostrando quantos turnos faltam — ver
// aplicarSangramento/processarStatusInicioTurno em mestre.js.
function badgeStatusAtivosCombate(p) {
    if (!p.statusAtivos) return "";
    return Object.values(p.statusAtivos)
        .filter(s => s && (Number(s.turnosRestantes) || 0) > 0)
        .map(s => ` <span class="mod-pill negativo" title="${escapeHtml(s.origem || "")} — ${s.danoPorTurno ?? `1d${s.faces || 1}`} de dano fixo por turno">🩸 ${escapeHtml(s.label || s.tipo)} (${s.turnosRestantes})</span>`)
        .join("");
}

// ---------------------------------------------------------------------
// Overlay de Morte (0 PV ou 0 Energia — ver calcularEstadoSaude e
// calcularEstadoEnergia em regras.js). Chamada a cada renderizarTudo(),
// depois que renderizarAtributos() já recalculou window._estadoSaudeAtual
// e window._estadoEnergiaAtual pro ciclo atual.
//
// Godmode do Mestre ignora a trava por completo (mesma filosofia usada
// em podeEditarPericiaAtributo() etc.) — é a única forma de mexer numa
// ficha morta depois da falha na reanimação.
// ---------------------------------------------------------------------
function verificarMorte() {
    if (isMestre && godmodeAtivo) {
        el.overlayMorte.style.display = "none";
        // Godmode ignora o overlay cheio (pra não travar a edição), mas
        // se a ficha ainda estiver morta por baixo, deixa um botão
        // pequeno no canto pra reverter sem precisar mexer no Firebase
        // na mão.
        const definitivaGodmode = !!(fichaAtual.dados && fichaAtual.dados.mortoDeVez);
        const morreuAgoraGodmode = !!((window._estadoSaudeAtual && window._estadoSaudeAtual.morte) || (window._estadoEnergiaAtual && window._estadoEnergiaAtual.morte));
        el.btnReviverGodmode.style.display = (definitivaGodmode || morreuAgoraGodmode) ? "block" : "none";
        return;
    }
    el.btnReviverGodmode.style.display = "none";

    const definitiva = !!(fichaAtual.dados && fichaAtual.dados.mortoDeVez);
    const morreuAgora = !!((window._estadoSaudeAtual && window._estadoSaudeAtual.morte) || (window._estadoEnergiaAtual && window._estadoEnergiaAtual.morte));

    if (!definitiva && !morreuAgora) {
        el.overlayMorte.style.display = "none";
        el.overlayMorte.classList.remove("definitiva");
        el.overlayMorteResultado.innerHTML = "";
        el.overlayMorteResultado.className = "overlay-morte-resultado";
        el.btnNaoQueroMorrer.disabled = false;
        return;
    }

    el.overlayMorte.style.display = "flex";
    el.overlayMorte.classList.toggle("definitiva", definitiva);
    if (definitiva) {
        el.overlayMorteTitulo.innerText = "VOCÊ MORREU!";
        el.overlayMorteTexto.innerText = "A reanimação falhou. Não tem mais volta — só o Mestre pode mexer nessa ficha agora.";
    } else {
        el.overlayMorteTitulo.innerText = "VOCÊ MORREU!";
        el.overlayMorteTexto.innerText = "Role 3d20 contra dificuldade 11. Acerte os três pra voltar com 1 PV.";
    }
}

// Rola o teste de reanimação (3d20, dif 11, precisa dos três) ao
// clicar em "AAAAA NÃO QUERO MORRER". Sucesso total: pvAtual volta a 1
// (e energiaAtual também, se estava em 0, pra não reabrir o overlay na
// hora). Qualquer falha: mortoDeVez fica marcado pra sempre — ver
// verificarMorte() acima.
async function tentarReanimacao() {
    if (el.btnNaoQueroMorrer.disabled) return;
    el.btnNaoQueroMorrer.disabled = true;

    const resultado = rolarTesteReanimacao();
    const detalheDados = resultado.dados
        .map((d, i) => `${d}${resultado.sucessos[i] ? " ✓" : " ✗"}`)
        .join(" · ");

    el.overlayMorteResultado.className = `overlay-morte-resultado ${resultado.sucessoTotal ? "sucesso" : "falha"}`;
    el.overlayMorteResultado.innerText = `${detalheDados} — ${resultado.sucessoTotal ? "sobreviveu!" : "não resistiu."}`;

    await registrarRolagem({
        quem: `${fichaAtual.dados.nome || fichaAtualId} (reanimação)`,
        modificador: 0,
        resultado: detalheDados,
        detalhe: `Teste de reanimação (dif ${DIFICULDADE_REANIMACAO}, precisa dos 3): ${resultado.sucessoTotal ? "SUCESSO" : "FALHA"}`,
        critico: resultado.sucessoTotal ? "acerto" : "falha"
    });

    if (resultado.sucessoTotal) {
        const atualizacoes = { pvAtual: 1 };
        // energiaAtual null/undefined = Energia cheia por convenção (ver
        // calcularEstadoEnergia) — só mexe se realmente estava em 0 ou
        // menos, pra não zerar a Energia de quem morreu só por causa do PV.
        const energiaAtual = fichaAtual.dados.energiaAtual;
        if (energiaAtual !== null && energiaAtual !== undefined && Number(energiaAtual) <= 0) {
            atualizacoes.energiaAtual = 1;
        }
        await update(ref(db, `${caminhoBase()}/dados`), atualizacoes);
        toast("Reanimação bem-sucedida — voltou com 1 PV.", "sucesso");
    } else {
        await update(ref(db, `${caminhoBase()}/dados`), { mortoDeVez: true });
        toast("A reanimação falhou. Morte definitiva.", "erro");
    }
}

// "Reviver (Godmode)": botão de emergência só visível pro Mestre com
// Godmode ativo (ver verificarMorte() acima), pra destravar uma ficha
// morta sem precisar editar o Firebase na mão. Zera mortoDeVez e
// devolve 1 PV (e 1 Energia, se estava zerada também).
async function reviverGodmode() {
    if (!(isMestre && godmodeAtivo)) return;
    const atualizacoes = { pvAtual: 1, mortoDeVez: false };
    const energiaAtual = fichaAtual.dados.energiaAtual;
    if (energiaAtual !== null && energiaAtual !== undefined && Number(energiaAtual) <= 0) {
        atualizacoes.energiaAtual = 1;
    }
    await update(ref(db, `${caminhoBase()}/dados`), atualizacoes);
    toast("Ficha revivida via Godmode.", "sucesso");
}

// Máximo "de verdade" de um recurso (PV/Energia): normalmente é só o
// valor calculado pela fórmula do manual (+ bônus de Level Up no caso
// do PV — ver pvBonusExtra), mas em Godmode o Mestre pode sobrescrever
// esse teto na hora — ex: um jogador MUITO acima ou abaixo da curva
// normal do jogo. Guardado em dados.{recursoKey}MaximoOverride; null/
// vazio significa "sem override", volta a usar o valor calculado.
function maximoComOverride(recursoKey, dados, totalCalculado) {
    const override = dados[recursoKey + "MaximoOverride"];
    return (override !== null && override !== undefined && override !== "") ? (Number(override) || 0) : totalCalculado;
}

// Rótulo do estado de saúde atual (ex: "Machucado"/"Muito Machucado"),
// lido do mesmo cálculo acima — usado só pra nomear a penalidade no
// detalhamento da rolagem de ataque (ver formatarPenalidadesAtaque).
function estadoSaudeLabelAtual() {
    return (window._estadoSaudeAtual && window._estadoSaudeAtual.label) || "";
}

// Lista, em texto, cada penalidade/bônus não-zero que entrou na rolagem
// de ataque (estado de saúde, recuo, precisão) — ex: "-4 muito machucado,
// -1 recuo, -1 precisão". Devolve "—" quando não há nenhuma.
function formatarPenalidadesAtaque(penalidadeSaude, modRecuo, modPrecisao, modificadorExtra = 0, modMovimento = 0, modCQC = 0) {
    const partes = [];
    if (penalidadeSaude) {
        const rotulo = estadoSaudeLabelAtual().toLowerCase() || "estado de saúde";
        partes.push(`${penalidadeSaude >= 0 ? "+" : ""}${penalidadeSaude} ${rotulo}`);
    }
    if (modRecuo) partes.push(`${modRecuo >= 0 ? "+" : ""}${modRecuo} recuo`);
    if (modPrecisao) partes.push(`${modPrecisao >= 0 ? "+" : ""}${modPrecisao} precisão`);
    if (modificadorExtra) partes.push(`${modificadorExtra >= 0 ? "+" : ""}${modificadorExtra} contra-ataque (Aparar)`);
    if (modMovimento) partes.push(`${modMovimento >= 0 ? "+" : ""}${modMovimento} movimento`);
    if (modCQC) partes.push(`${modCQC >= 0 ? "+" : ""}${modCQC} CQC (1x1)`);
    return partes.length ? partes.join(", ") : "—";
}

// Bloco de 4 linhas com o detalhamento completo de uma rolagem de
// ataque (ver resolverAtaque): rolagem bruta do d20, modificador de
// perícia isolado (perícia + ajustes estruturados, ou -1 se destreinada
// — SEM o estado de saúde embutido), penalidades separadas (estado de
// saúde/recuo/precisão/movimento) e o resultado final. Falha crítica
// (nat 1 OU resultado final <= 1) mostra "CRÍTICO NEGATIVO" no lugar do
// número; acerto crítico (resultado final exatamente 20 — dobra o dano,
// ver resolverAtaque) mostra "CRÍTICO POSITIVO" — só destaques visuais;
// não mudam se o ataque acerta ou erra, que continua comparando
// resultadoAtaque com a dificuldade.
function formatarDetalheRolagemAtaque({ brutoAtaque, periciaBase, penalidadeSaude, modRecuo, modPrecisao, resultadoAtaque, modificadorExtra = 0, modMovimento = 0, modCQC = 0, criticoPositivo = false, criticoNegativo = false }) {
    const penalidadesTexto = formatarPenalidadesAtaque(penalidadeSaude, modRecuo, modPrecisao, modificadorExtra, modMovimento, modCQC);
    const resultadoTexto = criticoNegativo
        ? "CRÍTICO NEGATIVO"
        : (criticoPositivo ? `${resultadoAtaque} — CRÍTICO POSITIVO` : `${resultadoAtaque}`);
    return `rolagem: ${brutoAtaque}\n`
        + `modificador de perícia: ${periciaBase >= 0 ? "+" : ""}${periciaBase}\n`
        + `penalidades: ${penalidadesTexto}\n`
        + `resultado: ${resultadoTexto}`;
}

function mostrarDetalheSecundario(key) {
    const attr = ATRIBUTOS_SECUNDARIOS.find(a => a.key === key);
    const d = window._ultimosDerivados;
    if (!attr || !d) return;
    const info = d.secundarios[key];
    let texto = `${attr.label}\nBase (fórmula do manual): ${Math.round(info.base * 10) / 10}`;
    if (info.ajustes.length) {
        texto += "\n\nModificadores:";
        info.ajustes.forEach(a => { texto += `\n  ${a.valor >= 0 ? "+" : ""}${a.valor} — ${a.origem}`; });
    } else {
        texto += "\n\nSem modificadores ativos.";
    }
    texto += `\n\nTotal: ${Math.round(info.total * 10) / 10}`;
    alert(texto);
}

// ---------------------------------------------------------------------
// PERÍCIAS
// ---------------------------------------------------------------------
function renderizarPericias(modificadoresPlanos) {
    const podeEditar = podeEditarPericiaAtributo();
    el.btnAddPericia.style.display = podeEditar ? "inline-block" : "none";
    const ids = Object.keys(fichaAtual.pericias || {});
    el.listaPericias.innerHTML = "";

    if (!ids.length) {
        el.listaPericias.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nenhuma perícia cadastrada ainda.</li>`;
        return;
    }

    ids.sort((a, b) => fichaAtual.pericias[a].nome.localeCompare(fichaAtual.pericias[b].nome));

    ids.forEach(id => {
        const p = fichaAtual.pericias[id];
        const calc = calcularTotalPericia(p, fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(p.nome));
        const li = document.createElement("li");
        if (!podeEditar) li.classList.add("locked-visual");
        const textoSaude = calc.penalidadeSaude ? ` · ${calc.penalidadeSaude} (estado de saúde)` : "";
        const ajustesPericia = calc.penalidadeSaude
            ? [...calc.ajustes, { valor: calc.penalidadeSaude, origem: "Estado de saúde" }]
            : calc.ajustes;
        li.title = textoDetalhamento(p.nome, calc.nivel, "Nível da perícia", ajustesPericia, calc.total);
        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(p.nome)}${p.legado ? ' <span class="mod-pill">legado</span>' : ""}</span>
                <span class="entity-sub">nível ${p.nivel}${calc.ajustes.length ? ` + ${calc.ajustes.reduce((a, m) => a + m.valor, 0)} de modificadores` : ""}${textoSaude}</span>
            </div>
            <div class="entity-badges">
                <button type="button" class="btn-rolar btn-blue" title="Rolar d20 + ${calc.total}">🎲 ${calc.total >= 0 ? "+" : ""}${calc.total}</button>
                <span class="total-rolagem">${calc.total}</span>
            </div>
        `;
        li.querySelector(".btn-rolar").addEventListener("click", async (e) => {
            e.stopPropagation();
            await rolarERegistrar(p.nome, calc.total, p.nome === "CQC");
        });
        li.addEventListener("click", () => abrirModalEdicao("pericias", id));
        el.listaPericias.appendChild(li);
    });
}

// Rola 1d20 + modificador e registra no Log de Dados, identificando quem
// rolou pelo nome da ficha ativa (jogador) ou "Mestre".
// ehCQC (default false): se esta rolagem usa especificamente a perícia
// CQC — só importa pro CQC nível 5 (ver checarConsumoDeAcao/extraCQC).
async function rolarERegistrar(nomeAlvo, modificador, ehCQC = false) {
    // Trava de ações: com combate com iniciativa ativo, uma rolagem só
    // acontece se for o turno de quem está agindo (jogador OU o NPC que
    // o Mestre estiver controlando) E ainda houver ação sobrando nesse
    // turno. A rolagem em si acontece na hora (o dado é rolado e
    // registrado no Log normalmente); o CONSUMO da ação SEMPRE entra na
    // fila do Sistema de Aprovação, mesmo com o Mestre controlando o NPC
    // que rolou — rolarERegistrar cobre perícia solta/atributo (ex.:
    // Percepção, Constituição) e qualquer rolagem de arma de fogo feita
    // fora do fluxo de ataque completo, e nenhuma dessas gasta ação
    // automaticamente (só golpe corpo a corpo/arma branca em
    // resolverAtaque faz isso — ver checarConsumoDeAcao).
    const consumo = checarConsumoDeAcao(false, ehCQC);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const bruto = rolarD20();
    const resultado = bruto + Number(modificador || 0);
    // Acerto Crítico: o RESULTADO FINAL (d20 + modificador) precisa ser
    // exatamente 20 — d20 natural 20 sozinho NÃO garante crítico se o
    // modificador derrubar o resultado (ex.: d20=20, modificador -1,
    // resultado final 19 → não é crítico). Falha Crítica (d20 natural 1
    // ou resultado final <= 1) — aqui é só sinalização pro Log de Dados
    // e resolução manual do Mestre; não há "dano" pra dobrar numa
    // rolagem genérica de perícia/atributo (isso é exclusivo de
    // resolverAtaque, que também aplica a dobra de dano de verdade).
    const criticoPositivo = resultado === 20;
    // Falha Crítica: d20 natural 1, OU resultado final <= 1 — este
    // segundo caso só é matematicamente possível com modificador
    // negativo (ex: d20=2, modificador -1, resultado final = 1),
    // já que o d20 sozinho nunca é menor que 1.
    const criticoNegativo = bruto === 1 || resultado <= 1;
    const notaCritico = criticoNegativo
        ? " 🔥 FALHA CRÍTICA — Fogo Amigo/Desastre! Resolução rápida pelo Mestre."
        : (criticoPositivo ? " ⚡ ACERTO CRÍTICO!" : "");
    const quem = isMestre ? `Mestre (${modoNpc ? (fichaAtual?.config?.nomeExibicao || npcAtualId) : (nomeDeFicha(fichaAtualId) || "—")})` : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");
    await registrarRolagem({
        quem, modificador, resultado,
        detalhe: `${nomeAlvo}: d20 (${bruto}) ${modificador >= 0 ? "+" : ""}${modificador}${notaCritico}`,
        critico: criticoNegativo ? "falha" : (criticoPositivo ? "acerto" : null)
    });
    toast(`${nomeAlvo}: ${resultado} (d20: ${bruto} ${modificador >= 0 ? "+" : ""}${modificador})${notaCritico}`, criticoNegativo ? "critico-falha" : (criticoPositivo ? "critico-acerto" : "ok"));

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: quem,
                detalhe: `${quem} rolou "${nomeAlvo}" (resultado ${resultado}) e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }
}

// Manobra "Esquivar" usada proativamente no PRÓPRIO turno (diferente da
// Esquiva/Bloqueio reativa que já existe pro golpe recebido, guardada
// automaticamente no fim do turno — ver mestre.js). Rola d20 + Agilidade
// (não é perícia treinável) e, se realmente for o turno de quem rolou
// (checarConsumoDeAcao só devolve um participanteId nesse caso), guarda
// mais uma esquiva pro personagem — empilha em cima da guarda
// automática, permitindo anular mais de um golpe recebido na mesma
// rodada. Cada golpe recebido ainda só consome 1 esquiva por vez (ver
// usarEsquivaBloqueio em mestre.js): se a primeira tentativa "falhar"
// (o Mestre/alvo decidir não esquivar daquele golpe específico, ou o
// golpe ser de arma de fogo, que não pode ser esquivado), a esquiva
// guardada não é perdida — ela continua disponível pro próximo golpe.
async function executarManobraEsquivar(modificadoresPlanos) {
    const consumo = checarConsumoDeAcao();
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const derivados = calcularDerivados(fichaAtual.dados, modificadoresPlanos);
    const modAgilidade = derivados.secundarios.agilidade.total + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica");
    const bruto = rolarD20();
    const resultado = bruto + modAgilidade;
    const quem = isMestre
        ? `Mestre (${modoNpc ? (fichaAtual?.config?.nomeExibicao || npcAtualId) : (nomeDeFicha(fichaAtualId) || "—")})`
        : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");

    await registrarRolagem({
        quem, modificador: modAgilidade, resultado,
        detalhe: `Esquivar (Agilidade): d20 (${bruto}) ${modAgilidade >= 0 ? "+" : ""}${modAgilidade}`
    });
    toast(`Esquivar (Agilidade): ${resultado} (d20: ${bruto} ${modAgilidade >= 0 ? "+" : ""}${modAgilidade})`);

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await consumirAcaoCombate(participanteIdParaGastarAcao);
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: quem,
                detalhe: `${quem} usou "Esquivar" no próprio turno (resultado ${resultado}) e quer gastar 1 ação do turno.`,
                payload: { participanteId: participanteIdParaGastarAcao }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }

        // Usada no próprio turno (é isso que participanteIdParaGastarAcao
        // != null garante) — guarda uma esquiva extra pro personagem.
        await adicionarEsquivaExtra(participanteIdParaGastarAcao);
        toast("Esquiva extra guardada — dá pra esquivar de mais de um golpe agora.");
    }
}

// Calcula o modificador de perícia a aplicar numa rolagem de uso/ataque,
// já respeitando a regra global: nível 0 (ou perícia inexistente na
// ficha) vira -1 fixo, em vez do total calculado normalmente.
function modificadorDePericiaComPenalidade(nomePericia, dadosPrimarios, pericias, modificadoresPlanos, penalidadeSaude = 0) {
    const entrada = Object.entries(pericias || {}).find(([, p]) => p.nome === nomePericia);
    const penalidadeTotal = (Number(penalidadeSaude) || 0) + penalidadeEnergiaParaPericia(nomePericia);
    if (!entrada || (Number(entrada[1].nivel) || 0) <= 0) return -1 + penalidadeTotal;
    return calcularTotalPericia(entrada[1], dadosPrimarios, modificadoresPlanos, penalidadeTotal).total;
}

// Só armas de fogo de verdade (não golpe desarmado nem arma branca) tem
// carregador — precisam de um carregador anexado com munição pra disparar.
function ehArmaComCarregador(it) {
    return ehArma(it.tag) && ehArmaDeFogo(it.periciaUso) && !(it.arma && it.arma.desarmado);
}

// Desconta 1 projétil do carregador (usado a cada disparo bem-sucedido de
// "Usar"). Some primeiro do grupo de projéteis carregados que ainda tiver
// saldo, só pra manter a lista de "o que tá dentro" (tooltip) coerente —
// o valor que manda mesmo é municaoAtual.
function descontarUmProjetil(carregadorCfg) {
    const lista = (carregadorCfg.projeteisCarregados || []).map(p => ({ ...p }));
    for (const grupo of lista) {
        if (grupo.quantidade > 0) { grupo.quantidade -= 1; break; }
    }
    return {
        ...carregadorCfg,
        municaoAtual: Math.max(0, (Number(carregadorCfg.municaoAtual) || 0) - 1),
        projeteisCarregados: lista.filter(g => g.quantidade > 0)
    };
}

// Soma toda a munição 12 gauge (buckshot + slug) que o personagem está
// levando consigo — usado só pra exibição (não há "carregador" pra
// mostrar munição atual/máxima numa escopeta).
function municaoEscopetaDisponivel(calibreArma) {
    return listaProjeteisInventario(fichaAtual, calibreArma)
        .filter(p => p.categoria === "levando")
        .reduce((acc, p) => acc + (Number(p.projetil?.quantidade) || 0), 0);
}

// Desconta 1 projétil direto do estoque no inventário (sem carregador) —
// usado só por armas de calibre 12 gauge. Pega o primeiro item de
// projétil compatível (buckshot ou slug, o que tiver estoque) que
// estiver em "Levando consigo"; apaga o item se a quantidade zerar.
async function descontarProjetilDiretoDoEstoque(calibreArma) {
    const candidatos = listaProjeteisInventario(fichaAtual, calibreArma)
        .filter(p => p.categoria === "levando" && (Number(p.projetil?.quantidade) || 0) > 0);
    if (!candidatos.length) return false;

    const proj = candidatos[0];
    const restante = (Number(proj.projetil.quantidade) || 0) - 1;
    if (restante > 0) {
        const atualizado = { ...proj.projetil, quantidade: restante };
        fichaAtual.inventario[proj.id] = { ...fichaAtual.inventario[proj.id], projetil: atualizado };
        await update(ref(db, `${caminhoBase()}/inventario/${proj.id}/projetil`), atualizado);
    } else {
        // update() só apaga uma chave se ela vier explicitamente como null
        // no payload (mesmo motivo documentado em carregarCarregador).
        delete fichaAtual.inventario[proj.id];
        await update(ref(db, `${caminhoBase()}/inventario`), { [proj.id]: null });
    }
    return true;
}

// Antes de disparar: exige carregador anexado e com munição — exceto
// pra escopeta (12 gauge), que dispara direto do estoque de projéteis
// no inventário, sem carregador. Se puder disparar, já desconta 1
// projétil (do carregador ou do estoque, conforme o caso).
async function consumirMunicaoSeArmaDeFogo(it) {
    if (!ehArmaComCarregador(it)) return true;

    if (ehCalibreEscopeta(it.calibre)) {
        const descontou = await descontarProjetilDiretoDoEstoque(it.calibre);
        if (!descontou) {
            toast("Sem munição 12 gauge (buckshot ou slug) em \"Levando consigo\" pra disparar esta arma.", "erro");
            return false;
        }
        return true;
    }

    const carregadorId = it.arma && it.arma.carregadorId;
    const carregador = carregadorId ? fichaAtual.inventario?.[carregadorId] : null;
    if (!carregadorId || !carregador || !carregador.carregador) {
        toast("Esta arma está sem carregador anexado. Anexe um carregador (editando a arma) antes de atirar.", "erro");
        return false;
    }
    if ((Number(carregador.carregador.municaoAtual) || 0) <= 0) {
        toast("Carregador vazio. Use \"Recarregar\" pra trocar por um carregador com munição.", "erro");
        return false;
    }
    const carregadorAtualizado = descontarUmProjetil(carregador.carregador);
    fichaAtual.inventario[carregadorId] = { ...carregador, carregador: carregadorAtualizado };
    await update(ref(db, `${caminhoBase()}/inventario/${carregadorId}/carregador`), carregadorAtualizado);
    return true;
}

// ---------------------------------------------------------------------
// "Carregar" um carregador: pega projéteis do mesmo calibre que estiverem
// no inventário (categoria "levando") e enche o carregador até a
// capacidade máxima, descontando (ou apagando) os itens "projétil" que
// forem usados. Uma vez dentro do carregador, o projétil some da lista
// principal do inventário — só aparece na dica (hover) do carregador.
// ---------------------------------------------------------------------
async function carregarCarregador(carregadorId, carregadorItem) {
    if (!itemPodeUsar(carregadorItem)) { toast("O carregador precisa estar em \"Levando consigo\".", "erro"); return; }
    const cfg = carregadorItem.carregador;
    if (!cfg) return;
    let espacoLivre = Math.max(0, (cfg.capacidadeMax || 0) - (cfg.municaoAtual || 0));
    if (espacoLivre <= 0) { toast("Este carregador já está cheio.", "erro"); return; }

    const candidatos = listaProjeteisInventario(fichaAtual, carregadorItem.calibre)
        .filter(p => p.categoria === "levando");
    if (!candidatos.length) { toast("Não há projéteis desse calibre no inventário.", "erro"); return; }

    const projeteisCarregados = (cfg.projeteisCarregados || []).map(p => ({ ...p }));
    const inventarioAtualizado = { ...fichaAtual.inventario };
    let carregouAlgo = false;

    for (const proj of candidatos) {
        if (espacoLivre <= 0) break;
        const disponivel = Number(proj.projetil?.quantidade) || 0;
        if (disponivel <= 0) continue;
        const movido = Math.min(disponivel, espacoLivre);
        espacoLivre -= movido;
        carregouAlgo = true;

        const restante = disponivel - movido;
        if (restante > 0) {
            inventarioAtualizado[proj.id] = { ...proj, projetil: { ...proj.projetil, quantidade: restante } };
        } else {
            // update() só apaga uma chave se ela vier explicitamente como
            // null no payload — remover a chave do objeto local (delete)
            // não é suficiente, porque update() simplesmente ignora
            // qualquer chave ausente e deixa o valor antigo intacto no
            // Firebase (e o listener em tempo real trazia o item de volta
            // com a quantidade não descontada).
            inventarioAtualizado[proj.id] = null;
        }

        const grupoExistente = projeteisCarregados.find(g => g.nome === proj.nome);
        if (grupoExistente) grupoExistente.quantidade += movido;
        else projeteisCarregados.push({ nome: proj.nome, quantidade: movido });
    }

    if (!carregouAlgo) { toast("Não havia projéteis disponíveis pra carregar.", "erro"); return; }

    const capacidadeMax = cfg.capacidadeMax || 0;
    const carregadorAtualizado = {
        ...cfg,
        municaoAtual: capacidadeMax - espacoLivre,
        projeteisCarregados
    };
    inventarioAtualizado[carregadorId] = { ...carregadorItem, carregador: carregadorAtualizado };

    // O payload que vai pro Firebase mantém os `null` (é o que apaga a
    // chave de fato); o estado local só deve refletir itens que ainda
    // existem, senão qualquer código que iterar o inventário local ia
    // encontrar um item `null` no meio da lista.
    const inventarioLocal = {};
    for (const [itId, itVal] of Object.entries(inventarioAtualizado)) {
        if (itVal !== null) inventarioLocal[itId] = itVal;
    }
    fichaAtual.inventario = inventarioLocal;
    await update(ref(db, `${caminhoBase()}/inventario`), inventarioAtualizado);
    toast(`${carregadorItem.nome} carregado (${carregadorAtualizado.municaoAtual}/${capacidadeMax}).`);
}

// ---------------------------------------------------------------------
// "Recarregar" uma arma: troca o carregador anexado por outro carregador
// do mesmo calibre, no inventário, que tenha mais munição do que o atual.
// Escolhe o de maior munição entre os candidatos.
// ---------------------------------------------------------------------
async function recarregarArma(armaId, armaItem) {
    if (!itemPodeUsar(armaItem)) { toast("A arma precisa estar em \"Levando consigo\".", "erro"); return; }
    if (ehCalibreEscopeta(armaItem.calibre)) {
        toast("Escopeta (12 gauge) não usa carregador — ela dispara direto do estoque de munição.", "erro");
        return;
    }
    const calibre = armaItem.calibre;
    const carregadorAtualId = armaItem.arma && armaItem.arma.carregadorId;
    const municaoAtualAnexada = (carregadorAtualId && fichaAtual.inventario?.[carregadorAtualId]?.carregador?.municaoAtual) || 0;

    const candidatos = listaCarregadoresInventario(fichaAtual, calibre)
        .filter(c => c.categoria === "levando" && c.id !== carregadorAtualId)
        .filter(c => (Number(c.carregador?.municaoAtual) || 0) > municaoAtualAnexada)
        .sort((a, b) => (b.carregador?.municaoAtual || 0) - (a.carregador?.municaoAtual || 0));

    if (!candidatos.length) {
        toast("Não há outro carregador desse calibre com mais munição pra recarregar.", "erro");
        return;
    }

    const novoCarregador = candidatos[0];
    const armaAtualizada = { ...armaItem, arma: { ...armaItem.arma, carregadorId: novoCarregador.id } };
    fichaAtual.inventario[armaId] = armaAtualizada;
    await update(ref(db, `${caminhoBase()}/inventario/${armaId}/arma`), armaAtualizada.arma);
    toast(`${armaItem.nome} recarregada com ${novoCarregador.nome} (${novoCarregador.carregador.municaoAtual}/${novoCarregador.carregador.capacidadeMax}).`);
}

// ---------------------------------------------------------------------
// "Retirar carregador" de uma arma: apenas desanexa o carregador atual
// (arma.carregadorId volta pra null) sem trocar por outro. O carregador
// em si nunca deixou de existir no inventário — ele só ficava escondido
// da lista principal enquanto estava anexado (ver carregadorEstaAnexado
// em inventario.js); ao desanexar, ele volta a aparecer normalmente,
// já com a munição que tinha dentro dele.
// ---------------------------------------------------------------------
async function retirarCarregadorArma(armaId, armaItem) {
    if (!itemPodeUsar(armaItem)) { toast("A arma precisa estar em \"Levando consigo\".", "erro"); return; }
    if (ehCalibreEscopeta(armaItem.calibre)) {
        toast("Escopeta (12 gauge) não usa carregador — ela dispara direto do estoque de munição.", "erro");
        return;
    }
    const carregadorId = armaItem.arma && armaItem.arma.carregadorId;
    const carregador = carregadorId ? fichaAtual.inventario?.[carregadorId] : null;
    if (!carregadorId || !carregador) {
        toast("Esta arma já está sem carregador anexado.", "erro");
        return;
    }

    const armaAtualizada = { ...armaItem, arma: { ...armaItem.arma, carregadorId: null } };
    fichaAtual.inventario[armaId] = armaAtualizada;
    await update(ref(db, `${caminhoBase()}/inventario/${armaId}/arma`), armaAtualizada.arma);

    const municao = carregador.carregador?.municaoAtual ?? 0;
    const capacidade = carregador.carregador?.capacidadeMax ?? 0;
    toast(`${carregador.nome} retirado de ${armaItem.nome} e devolvido ao inventário (${municao}/${capacidade}).`);
}

// "Usar" um item/arma do inventário: rola d20 + o total da perícia
// vinculada a ele (nível + modificadores estruturados que apontam pra
// essa perícia). Regra global: por ser um teste de perícia, se o
// personagem estiver no nível 0 naquela perícia (ou nem tiver o
// registro dela), o modificador aplicado é -1, não o total calculado.
// Rola de fato a perícia vinculada ao uso de um item — extraído de
// rolarUsoItem pra poder ser chamado tanto direto (item com periciaUso
// fixo) quanto depois de escolher qual perícia usar (Kit de Ferramentas
// de Criação geral — ver abrirModalEscolherPericiaItem).
async function rolarComPericiaDoItem(it, nomePericia, modificadoresPlanos) {
    const modificadorFinal = modificadorDePericiaComPenalidade(nomePericia, fichaAtual.dados, fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual());
    await rolarERegistrar(`${it.nome} (${nomePericia})`, modificadorFinal, nomePericia === "CQC");
}

async function rolarUsoItem(it, modificadoresPlanos) {
    // Kit de Ferramentas de Criação (geral — manual pg. 71): o mesmo kit
    // serve pra Explosivos, Mecânica Automotiva, Armeiro, Ofícios
    // Utilitários e Eletrônica (ver ehFerramentaCriacaoGeral em
    // dados-manual.js) — por isso não fica travado numa perícia só na
    // criação do item; a escolha é feita aqui, na hora de usar.
    if (ehFerramentaCriacaoGeral(it.tag) && !it.periciaUso) {
        abrirModalEscolherPericiaItem(it, PERICIAS_FERRAMENTA_CRIACAO, modificadoresPlanos, "Kit de Ferramentas de Criação (geral) — serve pra Explosivos, Mecânica Automotiva, Armeiro, Ofícios Utilitários e Eletrônica. Escolha qual perícia rolar agora.");
        return;
    }
    // Eletrônico pode ficar vinculado a mais de uma perícia ao mesmo
    // tempo (Hacking e Programação — ver ehTagMultiPericia em
    // dados-manual.js). Com as duas marcadas, pergunta qual rolar agora,
    // igual ao Kit de Ferramentas de Criação geral acima.
    const periciasItem = periciaUsoComoArray(it.periciaUso);
    if (periciasItem.length > 1) {
        abrirModalEscolherPericiaItem(it, periciasItem, modificadoresPlanos, "Este item está vinculado a mais de uma perícia. Escolha qual rolar agora.");
        return;
    }
    const nomePericia = periciasItem[0];
    if (!nomePericia) { toast("Este item não tem perícia vinculada.", "erro"); return; }
    await rolarComPericiaDoItem(it, nomePericia, modificadoresPlanos);
}

// Escolha de qual perícia rolar quando um item serve pra mais de uma
// ao mesmo tempo — usado tanto pelo Kit de Ferramentas de Criação
// (geral) quanto por itens Eletrônico com Hacking + Programação
// vinculados (ver rolarUsoItem acima).
function abrirModalEscolherPericiaItem(it, opcoes, modificadoresPlanos, textoAjuda) {
    let modal = document.getElementById("modal-escolher-pericia-kit");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-escolher-pericia-kit";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Usar ${escapeHtml(it.nome)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha a perícia</h4>
        <p class="hint">${escapeHtml(textoAjuda)}</p>
        <div class="combate-lista" id="kit-pericia-opcoes"></div>
    `;
    const opcoesDiv = modal.querySelector("#kit-pericia-opcoes");
    opcoes.forEach(nome => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-lime";
        btn.style.width = "100%";
        btn.style.marginBottom = "6px";
        btn.innerText = nome;
        btn.addEventListener("click", async () => {
            modal.remove();
            await rolarComPericiaDoItem(it, nome, modificadoresPlanos);
        });
        opcoesDiv.appendChild(btn);
    });
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
}

// Ponto de entrada único do botão "Usar" em armas: se houver combate
// ativo no Gerenciador do Mestre, abre o seletor de alvo e resolve o
// ataque automaticamente (acerto x defesa, dano x redução de armadura).
// Sem combate ativo (ou fora de uma arma), cai no comportamento simples
// de sempre: só rola a perícia, sem alvo. Arma de fogo de verdade exige
// carregador anexado com munição — puxar o gatilho gasta 1 projétil na
// hora, acerte ou erre.
async function iniciarUsoItem(it, modificadoresPlanos) {
    if (ehArmaComCarregador(it)) {
        const podeDisparar = await consumirMunicaoSeArmaDeFogo(it);
        if (!podeDisparar) return;
    }
    if (ehArma(it.tag) && combateTemParticipantes()) {
        // Contra-ataque imediato do Aparar (manual: "pode atacar
        // imediatamente com modificador -1") — se este personagem tem um
        // guardado, o próximo "Usar" de uma arma/manobra já mira
        // automaticamente em quem atacou, sem passar pela seleção manual
        // de alvo, e some sozinho depois de usado (é de 1 uso só).
        const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
        const contraAtaque = meuPid ? await consumirContraAtaquePendente(meuPid) : null;
        if (contraAtaque) {
            const participanteAlvo = (combateAtivoCache.participantes || {})[contraAtaque.contraAlvoPid];
            if (participanteAlvo) {
                toast(`Contra-ataque do Aparar: atacando ${contraAtaque.contraAlvoNome} com modificador ${contraAtaque.modificador}.`);
                await resolverAtaque(it, modificadoresPlanos, { ...participanteAlvo, _pid: contraAtaque.contraAlvoPid }, { modificadorExtra: contraAtaque.modificador, ehContraAtaque: true });
                return;
            }
        }
        abrirModalSelecionarAlvo(it, modificadoresPlanos);
    } else {
        await rolarUsoItem(it, modificadoresPlanos);
    }
}

let contextoAtaque = null;
let contextoAgarrar = null;
let contextoDesarmar = null;
let contextoDerrubar = null;
let contextoDelimitar = null;
let contextoRetomar = null;
let contextoImobilizar = null;
let contextoImobilizarJJ = null;
let contextoQuebrarOssosJJ = null;

function abrirModalSelecionarAlvo(it, modificadoresPlanos) {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    // Não deixa o atacante se selecionar como alvo de si mesmo (ficha OU
    // o NPC que o Mestre estiver controlando no momento).
    const opcoes = Object.entries(participantes).filter(([, p]) =>
        !(p.tipo === "ficha" && p.refId === fichaAtualId) &&
        !(modoNpc && p.tipo === "npc" && p.refId === npcAtualId)
    );
    if (!opcoes.length) { toast("Não há outros participantes no combate pra atacar.", "erro"); return; }

    contextoAtaque = { item: it, modificadoresPlanos };
    el.alvoTitulo.innerText = `Atacar com ${it.nome}`;
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (${p.tipo === "ficha" ? "jogador" : "NPC"})`;
        el.alvoSelect.appendChild(opt);
    });

    // Golpes Mirados (manual): todo golpe pode ser mirado — a Cabeça
    // muda de dificuldade conforme o tipo de golpe (arma de fogo x
    // corpo a corpo/arma branca), mas continua disponível pros dois —
    // ver LOCAIS_MIRA/difModLocalMira em dados-manual.js.
    const ehFogoItem = ehArma(it.tag) && ehArmaDeFogo(it.periciaUso) && !(it.arma && it.arma.desarmado);
    // Dano extra (arma branca — ver campo "Tipo de dano extra" no modal
    // de criação de item): se o item tem os dois tipos cadastrados,
    // oferece a escolha AQUI, junto do resto das opções do golpe — o
    // valor do dano não muda, só o tipo (afeta redução de armadura e
    // regras específicas por tipo).
    const tipoDanoExtraItem = (it.arma && it.arma.tipoDanoExtra) || null;
    const seletorTipoDanoHtml = tipoDanoExtraItem ? `
        <label for="alvo-tipo-dano-select">Tipo de dano</label>
        <select id="alvo-tipo-dano-select">
            <option value="padrao">${escapeHtml(TIPOS_DANO.find(t => t.key === it.arma.tipoDano)?.label || it.arma.tipoDano)} (padrão)</option>
            <option value="extra">${escapeHtml(TIPOS_DANO.find(t => t.key === tipoDanoExtraItem)?.label || tipoDanoExtraItem)}</option>
        </select>
    ` : "";
    el.alvoCampoExtra.style.display = "block";
    el.alvoCampoExtra.innerHTML = `
        ${seletorTipoDanoHtml}
        <label for="alvo-local-mira-select">Mirar em</label>
        <select id="alvo-local-mira-select">
            ${LOCAIS_MIRA.map(l => {
                const dif = difModLocalMira(l, ehFogoItem);
                return `<option value="${l.key}">${escapeHtml(l.label)}${dif ? ` (dificuldade +${dif})` : ""}</option>`;
            }).join("")}
        </select>
        ${ehFogoItem ? `
        <label for="alvo-movimento-select" style="margin-top:10px;">Movimento (combate à distância)</label>
        <select id="alvo-movimento-select">
            <option value="nenhum">Nenhum</option>
            <option value="alvoMovimento">Alvo em movimento (-2)</option>
            <option value="alvoCarro">Alvo dentro de carro em movimento (-3)</option>
            <option value="ambosMovimento">Ambos em movimento (-4)</option>
        </select>
        <label class="checkbox-inline" style="margin-top:10px;">
            <input type="checkbox" id="alvo-escuro-check"> Escuro (-5 na dificuldade)
        </label>
        <label class="checkbox-inline" style="margin-top:6px;">
            <input type="checkbox" id="alvo-queima-roupa-check"> Tiro à queima-roupa em alvo dominado/agarrado (dano quadruplicado)
        </label>
        <label for="alvo-combatentes-input" style="margin-top:10px;">Combatentes adicionais na linha de tiro (+1 dificuldade cada)</label>
        <input type="number" id="alvo-combatentes-input" min="0" step="1" value="0">
        ` : ""}
    `;
    el.modalSelecionarAlvo.classList.add("active");
}

// Preenche o <select> de alvos do modal compartilhado — usado por todas
// as variantes (ataque, Agarrar, Delimitar/Retomar alcance).
function preencherOpcoesDeAlvo() {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) =>
        !(p.tipo === "ficha" && p.refId === fichaAtualId) &&
        !(modoNpc && p.tipo === "npc" && p.refId === npcAtualId)
    );
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (${p.tipo === "ficha" ? "jogador" : "NPC"})`;
        el.alvoSelect.appendChild(opt);
    });
    return opcoes.length;
}

// Mesma modal de seleção de alvo, reaproveitada pra manobra "Agarrar"
// (contexto separado de contextoAtaque, já que não usa item de arma).
function abrirModalSelecionarAlvoAgarrar(nomePericia, modificador) {
    contextoAgarrar = { nomePericia, modificador };
    el.alvoTitulo.innerText = `Agarrar com ${nomePericia}`;
    el.alvoCampoExtra.style.display = "none";
    el.alvoCampoExtra.innerHTML = "";
    if (!preencherOpcoesDeAlvo()) { toast("Não há outros participantes no combate pra agarrar.", "erro"); contextoAgarrar = null; return; }
    el.modalSelecionarAlvo.classList.add("active");
}

// Mesma modal de seleção de alvo, reaproveitada pra manobra "Desarmar"
// (contexto separado, igual Agarrar — sem campo extra, só escolhe o alvo).
function abrirModalSelecionarAlvoDesarmar(nomePericia, modificador) {
    contextoDesarmar = { nomePericia, modificador };
    el.alvoTitulo.innerText = `Desarmar com ${nomePericia}`;
    el.alvoCampoExtra.style.display = "none";
    el.alvoCampoExtra.innerHTML = "";
    if (!preencherOpcoesDeAlvo()) { toast("Não há outros participantes no combate pra desarmar.", "erro"); contextoDesarmar = null; return; }
    el.modalSelecionarAlvo.classList.add("active");
}

// Mesma modal de seleção de alvo, reaproveitada pra manobra "Derrubar"
// (contexto separado, igual Agarrar/Desarmar). CQC nível 2 ("derrubar
// uma vez. Causa dano contundente Destreza D") é condicional a estar
// avançando contra um oponente armado pra derrubá-lo — não dá pra
// detectar isso automaticamente, então aparece como checkbox no campo
// extra da modal (mesma ideia de abrirModalBonusIniciativaCQC pra
// iniciativa), só quando o personagem TEM o nível.
function abrirModalSelecionarAlvoDerrubar(nomePericia, modificador, nivelCQC = 0) {
    contextoDerrubar = { nomePericia, modificador };
    el.alvoTitulo.innerText = `Derrubar com ${nomePericia}`;
    if (nivelCQC >= 2) {
        el.alvoCampoExtra.style.display = "block";
        el.alvoCampoExtra.innerHTML = `
            <label style="display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="alvo-cqc-derrubar-check">
                <span>Avançando contra oponente armado pra derrubá-lo (CQC nível ${nivelCQC}) — causa dano contundente extra (Destreza escala D) se acertar</span>
            </label>
        `;
    } else {
        el.alvoCampoExtra.style.display = "none";
        el.alvoCampoExtra.innerHTML = "";
    }
    if (!preencherOpcoesDeAlvo()) { toast("Não há outros participantes no combate pra derrubar.", "erro"); contextoDerrubar = null; return; }
    el.modalSelecionarAlvo.classList.add("active");
}

// "Imobilizar" (CQC nível 4, manual pg. 23 — ver MANOBRA_IMOBILIZAR_CQC
// em dados-manual.js): só faz sentido contra quem JÁ está Derrubado
// ("Após derrubar pode imobilizar o alvo"), então a lista de alvos é
// filtrada aqui em vez de reaproveitar preencherOpcoesDeAlvo() (que
// mostra todo mundo).
function abrirModalSelecionarAlvoImobilizar(nomePericia, modificador) {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) => p.derrubado && p.derrubado.ativo);
    if (!opcoes.length) { toast("Ninguém no combate está Derrubado agora — Imobilizar só funciona depois de Derrubar o alvo.", "erro"); return; }

    contextoImobilizar = { nomePericia, modificador };
    el.alvoTitulo.innerText = `Imobilizar com ${nomePericia}`;
    el.alvoCampoExtra.style.display = "none";
    el.alvoCampoExtra.innerHTML = "";
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (Derrubado)`;
        el.alvoSelect.appendChild(opt);
    });
    el.modalSelecionarAlvo.classList.add("active");
}

// "Imobilizar (Jiu Jitsu)" (Jiu Jitsu nível 2, manual pg. 22 — ver
// MANOBRA_IMOBILIZAR_JIUJITSU em dados-manual.js): mesma ideia de
// abrirModalSelecionarAlvoImobilizar acima (só quem está Derrubado),
// mas com um campo extra pra oferecer o checkbox "Desacordar" (Jiu
// Jitsu nível 3) quando o personagem tem o nível.
function abrirModalSelecionarAlvoImobilizarJJ(nomeBase, modificador, nivelJJ) {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) => p.derrubado && p.derrubado.ativo);
    if (!opcoes.length) { toast("Ninguém no combate está Derrubado agora — Imobilizar só funciona depois de Derrubar o alvo.", "erro"); return; }

    contextoImobilizarJJ = { nomeBase, modificador, nivelJJ };
    el.alvoTitulo.innerText = `Imobilizar (Jiu Jitsu) com ${nomeBase}`;
    if (Number(nivelJJ) >= 3) {
        el.alvoCampoExtra.style.display = "block";
        el.alvoCampoExtra.innerHTML = `
            <label style="display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="alvo-jj-desacordar-check">
                <span>Desacordar o alvo em vez de só imobilizar (Jiu Jitsu nível 3) — inconsciente, sem teste pra se libertar sozinho</span>
            </label>
        `;
    } else {
        el.alvoCampoExtra.style.display = "none";
        el.alvoCampoExtra.innerHTML = "";
    }
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (Derrubado)`;
        el.alvoSelect.appendChild(opt);
    });
    el.modalSelecionarAlvo.classList.add("active");
}

// "Quebrar ossos" (Jiu Jitsu níveis 4/5, manual pg. 22 — ver
// MANOBRA_QUEBRAR_OSSOS_JIUJITSU em dados-manual.js): só faz sentido
// contra quem EU já estou imobilizando agora ("Com o alvo imobilizado
// [...]") — filtra por imobilizado.porPid === meuPid, diferente de
// Imobilizar (CQC/Jiu Jitsu) que filtra por Derrubado.
function abrirModalQuebrarOssosJJ(modificadorNaoUsado, nivelJJ) {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const opcoes = Object.entries(participantes).filter(([, p]) => p.imobilizado && p.imobilizado.ativo && meuPid && p.imobilizado.porPid === meuPid);
    if (!opcoes.length) { toast("Você precisa estar Imobilizando alguém agora pra Quebrar ossos.", "erro"); return; }

    contextoQuebrarOssosJJ = { nivelJJ };
    el.alvoTitulo.innerText = "Quebrar ossos (Jiu Jitsu)";
    el.alvoCampoExtra.style.display = "block";
    el.alvoCampoExtra.innerHTML = Number(nivelJJ) >= 5
        ? `
            <label style="display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="alvo-jj-membro-inferior-check">
                <span>Atingir um membro inferior (Jiu Jitsu nível 5) — impossibilita correr; ambas as pernas quebradas, só dá pra se arrastar (teste de Tolerância, dificuldade 15)</span>
            </label>
        `
        : "";
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (Imobilizado por você)`;
        el.alvoSelect.appendChild(opt);
    });
    el.modalSelecionarAlvo.classList.add("active");
}

// CQC nível 2 e nível 4 (manual): checkbox pré-rolagem de iniciativa —
// nível 2 pergunta quem está avançando contra oponentes armados pra
// derrubá-los (+1 na iniciativa); nível 4 (Disparar e Avançar, filtra
// `elegiveis` pra nivel >= 4) pergunta quem vai reservar 1 ação do
// próprio 1º turno pra disparar 2x fora da ordem de turno (ver
// iniciarIniciativaCombate em mestre.js). Só chamada quando
// participantesElegiveisCQCIniciativa() já achou pelo menos 1
// personagem nivel >= 2 — devolve uma Promise que resolve com
// {bonusMap, dispararMap} (mapas {participanteId: true} dos marcados em
// cada seção), ou `null` se o Mestre fechar/cancelar sem confirmar (o
// botão então não rola a iniciativa de ninguém, pra não perder a chance
// de aplicar os bônus).
function abrirModalBonusIniciativaCQC(elegiveis) {
    return new Promise((resolve) => {
        let modal = document.getElementById("modal-bonus-cqc-iniciativa");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "modal-bonus-cqc-iniciativa";
            modal.className = "panel combate-painel-jogador";
            document.body.appendChild(modal);
        }
        const linhas = elegiveis.map(e => `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                <input type="checkbox" data-cqc-iniciativa="${e.id}">
                <span>${escapeHtml(e.nome)} — CQC nível ${e.nivel}</span>
            </label>
        `).join("");
        const elegiveisNivel4 = elegiveis.filter(e => e.nivel >= 4);
        const linhasNivel4 = elegiveisNivel4.map(e => `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                <input type="checkbox" data-cqc-disparar="${e.id}">
                <span>${escapeHtml(e.nome)} — CQC nível ${e.nivel}</span>
            </label>
        `).join("");
        const blocoNivel4 = elegiveisNivel4.length ? `
            <h4 style="margin-top:14px;">Disparar e Avançar (nível 4)</h4>
            <p class="hint">Marque quem vai reservar 1 ação do 1º turno pra disparar 2x fora da ordem de turno (libera um botão próprio no Gerenciador de Combate).</p>
            <div class="combate-lista">${linhasNivel4}</div>
        ` : "";
        modal.innerHTML = `
            <div class="combate-painel-topo">
                <span class="eyebrow">CQC nível 2 e 4</span>
                <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
            </div>
            <h4>Bônus de iniciativa (+1)</h4>
            <p class="hint">Marque quem está avançando contra oponentes armados pra derrubá-los antes de rolar a iniciativa.</p>
            <div class="combate-lista">${linhas}</div>
            ${blocoNivel4}
            <button type="button" class="btn-lime" id="btn-confirmar-bonus-cqc-iniciativa" style="margin-top:10px;width:100%;">Rolar iniciativa</button>
        `;
        const fechar = (resultado) => { modal.remove(); resolve(resultado); };
        modal.querySelector(".combate-fechar").addEventListener("click", () => fechar(null));
        modal.querySelector("#btn-confirmar-bonus-cqc-iniciativa").addEventListener("click", () => {
            const bonusMap = {};
            modal.querySelectorAll("[data-cqc-iniciativa]").forEach(chk => {
                if (chk.checked) bonusMap[chk.dataset.cqcIniciativa] = true;
            });
            const dispararMap = {};
            modal.querySelectorAll("[data-cqc-disparar]").forEach(chk => {
                if (chk.checked) dispararMap[chk.dataset.cqcDisparar] = true;
            });
            fechar({ bonusMap, dispararMap });
        });
    });
}

// "Disparar e Avançar" (CQC nível 4, manual pg. 23): dispara 2x com uma
// pistola (Armas de Fogo de Pequeno Porte) equipada contra um único
// alvo, fora da ordem de turno — cada disparo reaproveita resolverAtaque
// (mesmas modais/penalidades/dano de um tiro normal), só com
// ehDisparoAvancarCQC:true pra pular o consumo de ação (já foi
// reservada na hora de rolar a iniciativa, ver iniciarIniciativaCombate
// em mestre.js) — igual ao contra-ataque do Aparar, que já faz esse
// mesmo bypass. Só chamada quando dispararAvancarDisponivel &&
// !dispararAvancarUsado (ver badge/botão no Gerenciador de Combate).
function abrirModalDispararAvancar() {
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const meuParticipante = meuPid && combateAtivoCache.participantes && combateAtivoCache.participantes[meuPid];
    if (!meuParticipante || !meuParticipante.dispararAvancarDisponivel || meuParticipante.dispararAvancarUsado) {
        toast("Disparar e Avançar não está disponível agora.", "erro");
        return;
    }
    const itemPistola = listaArmasInventario(fichaAtual).find(a => a.periciaUso === "Armas de Fogo de Pequeno Porte" && a.equipada);
    if (!itemPistola) {
        toast("Equipe uma pistola (Armas de Fogo de Pequeno Porte) pra poder Disparar e Avançar.", "erro");
        return;
    }

    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([pid]) => pid !== meuPid);
    if (!opcoes.length) { toast("Não há outros participantes no combate pra disparar.", "erro"); return; }

    let modal = document.getElementById("modal-disparar-avancar-cqc");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-disparar-avancar-cqc";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const opts = opcoes.map(([pid, p]) => `<option value="${pid}">${escapeHtml(p.nome)} (${p.tipo === "ficha" ? "jogador" : "NPC"})</option>`).join("");
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Disparar e Avançar — CQC nível 4</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha o alvo</h4>
        <p class="hint">2 disparos com "${escapeHtml(itemPistola.nome)}", fora da ordem de turno, usando a ação já reservada do seu 1º turno.</p>
        <label for="disparar-avancar-alvo-select">Alvo</label>
        <select id="disparar-avancar-alvo-select">${opts}</select>
        <button type="button" class="btn-lime" id="btn-confirmar-disparar-avancar" style="margin-top:10px;width:100%;">Disparar (2x)</button>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-disparar-avancar").addEventListener("click", async () => {
        const alvoId = document.getElementById("disparar-avancar-alvo-select").value;
        modal.remove();
        await resolverDispararAvancar(alvoId, itemPistola);
    });
}

async function resolverDispararAvancar(alvoId, itemPistola) {
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const meuParticipante = meuPid && combateAtivoCache.participantes && combateAtivoCache.participantes[meuPid];
    if (!meuParticipante || !meuParticipante.dispararAvancarDisponivel || meuParticipante.dispararAvancarUsado) {
        toast("Disparar e Avançar não está disponível agora.", "erro");
        return;
    }
    const alvo = combateAtivoCache.participantes && combateAtivoCache.participantes[alvoId];
    if (!alvo) { toast("Alvo inválido — pode ter saído do combate.", "erro"); return; }

    const modificadoresPlanos = coletarModificadores(fichaAtual);
    toast(`CQC nível 4 — Disparar e Avançar: 2 disparos em ${alvo.nome}, fora da ordem de turno.`);
    await resolverAtaque(itemPistola, modificadoresPlanos, { ...alvo, _pid: alvoId }, { ehDisparoAvancarCQC: true });
    await resolverAtaque(itemPistola, modificadoresPlanos, { ...alvo, _pid: alvoId }, { ehDisparoAvancarCQC: true });
    await marcarDispararAvancarUsado(meuPid);
    toast(`Disparar e Avançar concluído — pode avançar com sua movimentação livre (igual à Velocidade) em direção aos inimigos restantes.`);
}

// "Arremessar" (CQC nível 3+): escolhe de 1 a 3 alvos entre os
// participantes do combate (exceto o próprio atacante) — diferente do
// resto das manobras, que sempre miram um único alvo, por isso usa uma
// modal própria em vez do modal compartilhado (el.modalSelecionarAlvo).
// Devolve void — chama resolverArremessar direto ao confirmar.
function abrirModalArremessar(nomePericia, modificadorBase, itemFaca) {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) =>
        !(p.tipo === "ficha" && p.refId === fichaAtualId) &&
        !(modoNpc && p.tipo === "npc" && p.refId === npcAtualId)
    );
    if (!opcoes.length) { toast("Não há outros participantes no combate pra arremessar.", "erro"); return; }

    let modal = document.getElementById("modal-arremessar-cqc");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-arremessar-cqc";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const linhas = opcoes.map(([pid, p]) => `
        <label style="display:flex;align-items:center;gap:8px;padding:4px 0;">
            <input type="checkbox" data-arremessar-alvo="${pid}">
            <span>${escapeHtml(p.nome)} (${p.tipo === "ficha" ? "jogador" : "NPC"})</span>
        </label>
    `).join("");
    const tipoDanoExtraItem = (itemFaca.arma && itemFaca.arma.tipoDanoExtra) || null;
    const seletorTipoDanoHtml = tipoDanoExtraItem ? `
        <div class="modal-field" style="margin-top:6px;">
            <label for="arremessar-tipo-dano-select">Tipo de dano</label>
            <select id="arremessar-tipo-dano-select">
                <option value="padrao">${escapeHtml(TIPOS_DANO.find(t => t.key === itemFaca.arma.tipoDano)?.label || itemFaca.arma.tipoDano)} (padrão)</option>
                <option value="extra">${escapeHtml(TIPOS_DANO.find(t => t.key === tipoDanoExtraItem)?.label || tipoDanoExtraItem)}</option>
            </select>
        </div>
    ` : "";
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Arremessar — CQC nível 3+</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha até 3 alvos</h4>
        <p class="hint">Arremessa "${escapeHtml(itemFaca.nome)}" em cada alvo marcado. Cada alvo extra (além do 1º) dá +1 no ataque contra TODOS os alvos desta ação.</p>
        ${seletorTipoDanoHtml}
        <div class="combate-lista">${linhas}</div>
        <button type="button" class="btn-lime" id="btn-confirmar-arremessar" style="margin-top:10px;width:100%;">Arremessar</button>
    `;
    const checks = () => Array.from(modal.querySelectorAll("[data-arremessar-alvo]"));
    checks().forEach(chk => {
        chk.addEventListener("change", () => {
            const marcados = checks().filter(c => c.checked);
            if (marcados.length > 3) chk.checked = false; // trava em 3 alvos (manual)
        });
    });
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-arremessar").addEventListener("click", async () => {
        const alvosIds = checks().filter(c => c.checked).map(c => c.dataset.arremessarAlvo);
        if (!alvosIds.length) { toast("Marque pelo menos 1 alvo.", "erro"); return; }
        const tipoDanoSelect = document.getElementById("arremessar-tipo-dano-select");
        const tipoDanoEscolhido = tipoDanoSelect ? tipoDanoSelect.value : "padrao";
        modal.remove();
        await resolverArremessar(nomePericia, modificadorBase, itemFaca, alvosIds, tipoDanoEscolhido);
    });
}

// Delimitar alcance (manual): além do alvo, escolhe QUAL alcance vai
// ficar disponível pra vítima (Curto/Médio/Longo) — usa o campo extra
// do modal compartilhado pra isso.
function abrirModalSelecionarAlvoDelimitar(nomePericia, modificador) {
    contextoDelimitar = { nomePericia, modificador };
    el.alvoTitulo.innerText = `Delimitar alcance com ${nomePericia}`;
    if (!preencherOpcoesDeAlvo()) { toast("Não há outros participantes no combate pra delimitar o alcance.", "erro"); contextoDelimitar = null; return; }
    el.alvoCampoExtra.style.display = "block";
    el.alvoCampoExtra.innerHTML = `
        <label for="alvo-alcance-select">Alcance a impor no alvo</label>
        <select id="alvo-alcance-select">
            <option value="Curto">Curto</option>
            <option value="Médio">Médio</option>
            <option value="Longo">Longo</option>
        </select>
    `;
    el.modalSelecionarAlvo.classList.add("active");
}

// Retomar alcance (manual): só precisa do alvo — a dificuldade já é
// fixa (pontuação da delimitação de alcance que o alvo colocou nele).
// Só faz sentido em quem JÁ está com o alcance limitado agora — inclui
// você mesmo (o caso normal: tirar a própria limitação) e também
// permite "retomar" o alcance de um aliado limitado, se fizer sentido
// na mesa.
function abrirModalSelecionarAlvoRetomar(nomePericia, modificador) {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) => p.alcanceLimitado && p.alcanceLimitado.ativo);
    if (!opcoes.length) { toast("Ninguém no combate está com o alcance limitado agora.", "erro"); return; }

    contextoRetomar = { nomePericia, modificador };
    el.alvoTitulo.innerText = `Retomar alcance com ${nomePericia}`;
    el.alvoCampoExtra.style.display = "none";
    el.alvoCampoExtra.innerHTML = "";
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (limitado a ${p.alcanceLimitado.valor})`;
        el.alvoSelect.appendChild(opt);
    });
    el.modalSelecionarAlvo.classList.add("active");
}

function configurarModalSelecionarAlvo() {
    const limparContextos = () => {
        contextoAtaque = null;
        contextoAgarrar = null;
        contextoDesarmar = null;
        contextoDerrubar = null;
        contextoDelimitar = null;
        contextoRetomar = null;
        contextoImobilizar = null;
        contextoImobilizarJJ = null;
        contextoQuebrarOssosJJ = null;
    };
    el.alvoCancelar.addEventListener("click", () => {
        el.modalSelecionarAlvo.classList.remove("active");
        limparContextos();
    });
    el.modalSelecionarAlvo.addEventListener("click", (e) => {
        if (e.target === el.modalSelecionarAlvo) {
            el.modalSelecionarAlvo.classList.remove("active");
            limparContextos();
        }
    });
    el.alvoConfirmar.addEventListener("click", async () => {
        if (!contextoAtaque && !contextoAgarrar && !contextoDesarmar && !contextoDerrubar && !contextoDelimitar && !contextoRetomar && !contextoImobilizar && !contextoImobilizarJJ && !contextoQuebrarOssosJJ) return;
        const pid = el.alvoSelect.value;
        const participante = combateAtivoCache.participantes && combateAtivoCache.participantes[pid];
        if (!participante) { toast("Alvo inválido — pode ter saído do combate.", "erro"); return; }
        el.modalSelecionarAlvo.classList.remove("active");
        if (contextoAtaque) {
            const { item, modificadoresPlanos } = contextoAtaque;
            const tipoDanoSelect = document.getElementById("alvo-tipo-dano-select");
            const tipoDanoEscolhido = tipoDanoSelect ? tipoDanoSelect.value : "padrao";
            const localMiraSelect = document.getElementById("alvo-local-mira-select");
            const localMira = localMiraSelect ? localMiraSelect.value : "padrao";
            // Modificadores Situacionais Rápidos de Combate à Distância —
            // só existem no modal quando a arma é de fogo (ver
            // abrirModalSelecionarAlvo). Ausentes (arma corpo a corpo/arma
            // branca) caem nos padrões neutros abaixo.
            const movimentoSelect = document.getElementById("alvo-movimento-select");
            const escuroCheck = document.getElementById("alvo-escuro-check");
            const queimaRoupaCheck = document.getElementById("alvo-queima-roupa-check");
            const combatentesInput = document.getElementById("alvo-combatentes-input");
            const situacional = {
                movimento: movimentoSelect ? movimentoSelect.value : "nenhum",
                escuro: escuroCheck ? escuroCheck.checked : false,
                queimaRoupa: queimaRoupaCheck ? queimaRoupaCheck.checked : false,
                combatentesAdicionais: combatentesInput ? Math.max(0, Number(combatentesInput.value) || 0) : 0
            };
            limparContextos();
            await resolverAtaque(item, modificadoresPlanos, { ...participante, _pid: pid }, { localMira, situacional, tipoDanoEscolhido });
        } else if (contextoAgarrar) {
            const { nomePericia, modificador } = contextoAgarrar;
            limparContextos();
            await resolverAgarrar(nomePericia, modificador, { ...participante, _pid: pid });
        } else if (contextoDesarmar) {
            const { nomePericia, modificador } = contextoDesarmar;
            limparContextos();
            await resolverDesarmar(nomePericia, modificador, { ...participante, _pid: pid });
        } else if (contextoDerrubar) {
            const { nomePericia, modificador } = contextoDerrubar;
            const cqcCheck = document.getElementById("alvo-cqc-derrubar-check");
            const usarBonusCQCDano = cqcCheck ? cqcCheck.checked : false;
            limparContextos();
            await resolverDerrubar(nomePericia, modificador, { ...participante, _pid: pid }, usarBonusCQCDano);
        } else if (contextoDelimitar) {
            const { nomePericia, modificador } = contextoDelimitar;
            const alcanceSelect = document.getElementById("alvo-alcance-select");
            const alcanceEscolhido = alcanceSelect ? alcanceSelect.value : "Curto";
            limparContextos();
            await resolverDelimitarAlcance(nomePericia, modificador, alcanceEscolhido, { ...participante, _pid: pid });
        } else if (contextoRetomar) {
            const { nomePericia, modificador } = contextoRetomar;
            limparContextos();
            await resolverRetomarAlcance(nomePericia, modificador, { ...participante, _pid: pid });
        } else if (contextoImobilizar) {
            const { nomePericia, modificador } = contextoImobilizar;
            limparContextos();
            await resolverImobilizar(nomePericia, modificador, { ...participante, _pid: pid });
        } else if (contextoImobilizarJJ) {
            const { nomeBase, modificador, nivelJJ } = contextoImobilizarJJ;
            const desacordarCheck = document.getElementById("alvo-jj-desacordar-check");
            const desacordar = desacordarCheck ? desacordarCheck.checked : false;
            limparContextos();
            await resolverImobilizarJiuJitsu(nomeBase, modificador, nivelJJ, { ...participante, _pid: pid }, desacordar);
        } else if (contextoQuebrarOssosJJ) {
            const { nivelJJ } = contextoQuebrarOssosJJ;
            const membroInferiorCheck = document.getElementById("alvo-jj-membro-inferior-check");
            const membroInferior = membroInferiorCheck ? membroInferiorCheck.checked : false;
            limparContextos();
            await resolverQuebrarOssosJiuJitsu(nivelJJ, { ...participante, _pid: pid }, membroInferior);
        }
    });
}

// "Dar Item" — só disponível pro jogador, e só pra itens que estão em
// "Levando consigo". A transferência de verdade só acontece depois que
// o Mestre confirma o pedido (Sistema de Aprovação, regra 4/5).
let contextoDarItem = null;

function abrirModalDarItem(itemId, item) {
    const outras = Object.entries(todasAsFichasCache || {}).filter(([id]) => id !== fichaAtualId);
    if (!outras.length) { toast("Não há outras fichas ativas na rede pra receber o item.", "erro"); return; }

    contextoDarItem = { itemId, item };
    el.darItemTitulo.innerText = `Dar "${item.nome}"`;
    el.darItemSelect.innerHTML = "";
    outras.forEach(([id, f]) => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.innerText = (f.config && f.config.nomeExibicao) || id;
        el.darItemSelect.appendChild(opt);
    });
    el.modalDarItem.classList.add("active");
}

function configurarDarItem() {
    el.darItemCancelar.addEventListener("click", () => {
        el.modalDarItem.classList.remove("active");
        contextoDarItem = null;
    });
    el.modalDarItem.addEventListener("click", (e) => {
        if (e.target === el.modalDarItem) {
            el.modalDarItem.classList.remove("active");
            contextoDarItem = null;
        }
    });
    el.darItemConfirmar.addEventListener("click", async () => {
        if (!contextoDarItem || !fichaAtualId) return;
        const fichaDestinoId = el.darItemSelect.value;
        if (!fichaDestinoId) { toast("Escolha pra quem dar o item.", "erro"); return; }
        const { itemId, item } = contextoDarItem;
        const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
        const nomeDestino = (todasAsFichasCache[fichaDestinoId] && todasAsFichasCache[fichaDestinoId].config && todasAsFichasCache[fichaDestinoId].config.nomeExibicao) || fichaDestinoId;
        await criarAcaoPendente({
            tipo: "dar_item",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer dar "${item.nome}" para ${nomeDestino}.`,
            payload: { itemId, itemNome: item.nome, fichaDestinoId, fichaDestinoNome: nomeDestino }
        });
        toast("Pedido de transferência enviado ao Mestre.");
        el.modalDarItem.classList.remove("active");
        contextoDarItem = null;
    });
}

// Conta o disparo desta arma nesta ficha dentro do "turno" atual (ver
// resetarDisparosTurno) e devolve o número dele (1 = primeiro disparo).
// Persiste em combateAtivo/disparosPorFicha/{fichaId}/{itemId} pra que
// o modificador de Recuo acumule corretamente entre disparos seguidos
// do mesmo personagem, mesmo se ele reabrir a ficha no meio do turno.
async function proximoNumeroDisparo(itemId) {
    const chave = String(itemId || "sem_id");
    const idDisparo = modoNpc ? `npc_${npcAtualId}` : fichaAtualId;
    pausarSync();
    try {
        const snap = await get(ref(db, caminhoMesa(`combateAtivo/disparosPorFicha/${idDisparo}/${chave}`)));
        const atual = snap.exists() ? (Number(snap.val()) || 0) : 0;
        const proximo = atual + 1;
        await update(ref(db, caminhoMesa(`combateAtivo/disparosPorFicha/${idDisparo}`)), { [chave]: proximo });
        return proximo;
    } finally {
        retornarSync();
    }
}

// "Novo turno" pro Recuo: zera a contagem de disparos de todo mundo.
// O sistema de combate atual (combateAtivo) não tem ordem de turno
// automática, então isso fica como um botão manual do Mestre — chame
// sempre que a rodada avançar pro próximo personagem/turno.
async function resetarDisparosTurno() {
    pausarSync();
    try {
        await remove(ref(db, caminhoMesa("combateAtivo/disparosPorFicha")));
        toast("Recuo resetado — contagem de disparos zerada pra todo mundo.");
    } finally {
        retornarSync();
    }
}

// Fluxo completo de ataque automatizado: rola d20 + perícia do
// atacante (+ Precisão e penalidade de Recuo, se for arma de fogo),
// compara com a dificuldade de acerto (Dificuldade de Acerto da arma de
// fogo − Percepção do atacante, ou base da manobra + Agilidade/Constituição
// do alvo pra corpo a corpo/desarmado — base varia por golpe, ver
// baseDificuldadeAtaque em dados-manual.js), e se acertar, resolve o dano (arma ou
// golpe desarmado) descontando a redução de armadura do alvo — tudo
// registrado numa única linha explícita de ACERTO/ERRO no Log de Dados.
async function resolverAtaque(it, modificadoresPlanosAtacante, participante, opcoes = {}) {
    const modificadorExtra = opcoes.modificadorExtra || 0;
    const ehContraAtaque = !!opcoes.ehContraAtaque;
    const ehDisparoAvancarCQC = !!opcoes.ehDisparoAvancarCQC;
    const nomePericia = it.periciaUso;
    if (!nomePericia) { toast("Esta arma não tem perícia vinculada.", "erro"); return; }

    // Desacordado (Jiu Jitsu nível 3, manual): inconsciente — bloqueia
    // TUDO igual Imobilizado, mas sem teste pra se libertar sozinho (só
    // o Mestre "Acorda" pelo Gerenciador de Combate). Verifica antes de
    // tudo, igual Imobilizado logo abaixo.
    const statusDesacordado = meuStatusDesacordado();
    if (statusDesacordado && statusDesacordado.ativo) {
        toast(`Você está DESACORDADO por ${statusDesacordado.porNome} — inconsciente, não consegue agir enquanto durar. Só o Mestre pode te acordar.`, "erro");
        return;
    }

    // Imobilizar (CQC nível 4, manual): "impedindo completamente ataques
    // e movimentação" enquanto durar — diferente de Agarrar, bloqueia
    // QUALQUER golpe (não só alcance médio/longo). Verifica antes de tudo,
    // igual Agarrar.
    const statusImobilizado = meuStatusImobilizado();
    if (statusImobilizado && statusImobilizado.ativo) {
        toast(`Você está IMOBILIZADO por ${statusImobilizado.porNome} — não consegue atacar nem se mover enquanto durar. Teste Destreza no seu turno pra se libertar.`, "erro");
        return;
    }

    // Agarrar (manual): quem está agarrado não consegue golpes de
    // alcance médio/longo — só curto — enquanto durar. Verifica ANTES de
    // gastar qualquer ação (o golpe nem chega a acontecer).
    const statusAgarrado = meuStatusAgarrado();
    if (statusAgarrado && statusAgarrado.ativo && golpeBloqueadoPorAgarrar(it.nome, nomePericia)) {
        toast(`Você está AGARRADO por ${statusAgarrado.porNome} — só dá pra atacar com golpes de alcance curto enquanto isso durar.`, "erro");
        return;
    }

    // Delimitar alcance (manual): golpe de alcance diferente do imposto
    // (e não-Médio) fica bloqueado; Médio sempre passa, mas com dano pela
    // metade — ver verificarAlcanceLimitado. Igual ao Agarrar, verifica
    // antes de gastar a ação.
    const statusAlcance = meuStatusAlcanceLimitado();
    const alcanceGolpe = alcanceDoGolpe(it.nome, nomePericia);
    const verifAlcance = verificarAlcanceLimitado(statusAlcance, alcanceGolpe);
    if (verifAlcance.bloqueado) {
        toast(`Seu alcance está limitado a ${statusAlcance.valor} por ${statusAlcance.porNome} — esse golpe (alcance ${alcanceGolpe}) não pode ser usado. Use "Retomar alcance" pra tirar a limitação.`, "erro");
        return;
    }

    const armaConfig = it.arma || {};
    const ehFogo = ehArmaDeFogo(nomePericia) && !armaConfig.desarmado;

    // Contra-ataque do Aparar é imediato (manual: "pode atacar
    // imediatamente com modificador -1") — não espera o próprio turno
    // nem gasta a ação normal do turno, então pula a trava de
    // "é seu turno?/tem ação sobrando?" que vale pro ataque comum.
    // Disparar e Avançar (CQC nível 4) é igual nesse ponto: a ação já foi
    // reservada do 1º turno na hora de rolar a iniciativa (ver
    // iniciarIniciativaCombate em mestre.js), então os 2 disparos daqui
    // também pulam essa trava — resolverDispararAvancar chama isso 2x.
    //
    // Gasto automático (direto, sem passar pelo Mestre) só é permitido
    // pra golpe corpo a corpo/arma branca (ehFogo === false). Disparo de
    // arma de fogo NUNCA gasta a ação na hora, mesmo sendo o Mestre
    // controlando o NPC que atirou — sempre entra na fila de Ações
    // Pendentes pra ele decidir (ver checarConsumoDeAcao).
    let consumo, participanteIdParaGastarAcao;
    if (ehContraAtaque || ehDisparoAvancarCQC) {
        consumo = { participanteId: null, direto: false };
        participanteIdParaGastarAcao = null;
    } else {
        consumo = checarConsumoDeAcao(!ehFogo, nomePericia === "CQC");
        if (!consumo) return;
        participanteIdParaGastarAcao = consumo.participanteId;
    }

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";

    // Golpes Mirados (manual): local do corpo escolhido pra mirar —
    // todo golpe pode ser mirado (a Cabeça muda de dificuldade e ganha
    // bônus de dano só quando o golpe é especificamente um tiro de arma
    // de fogo — ver LOCAIS_MIRA/difModLocalMira/bonusDanoFracaoLocalMira
    // em dados-manual.js).
    let localMira = localMiraPorKey(opcoes.localMira);
    const difMiraAtual = difModLocalMira(localMira, ehFogo);
    const bonusDanoMiraAtual = bonusDanoFracaoLocalMira(localMira, ehFogo);
    const notaLocalMira = localMira.key !== "padrao"
        ? ` Mirando: ${localMira.label} (dificuldade +${difMiraAtual}${bonusDanoMiraAtual ? `, dano +${Math.round(bonusDanoMiraAtual * 100)}%` : ""}).`
        : "";

    // Modificadores Situacionais Rápidos de Combate à Distância — só
    // fazem sentido (e só aparecem no modal) pra disparo de arma de
    // fogo de verdade. "Movimento" é um modificador direto no ATAQUE
    // (some com modPrecisao/modRecuo/modificadorExtra, igual qualquer
    // outra penalidade de pontaria); Escuro e Combatentes adicionais
    // mexem na DIFICULDADE em vez do ataque (aplicados mais abaixo,
    // depois que a dificuldade base/do local mirado é calculada);
    // Tiro à queima-roupa em alvo dominado/agarrado quadruplica o dano
    // (aplicado lá embaixo, junto do resto do pipeline de dano). A lista
    // notasSituacionaisLista/notaSituacional é reaproveitada mais abaixo
    // pros bônus de CQC também (nem todo item dela é "de arma de fogo").
    const situacional = ehFogo ? (opcoes.situacional || {}) : {};
    const MOD_MOVIMENTO = { alvoMovimento: -2, alvoCarro: -3, ambosMovimento: -4 };
    const modMovimentoAtaque = MOD_MOVIMENTO[situacional.movimento] || 0;
    const difEscuro = situacional.escuro ? -5 : 0;
    const combatentesAdicionais = Math.max(0, Number(situacional.combatentesAdicionais) || 0);
    const difCombatentes = combatentesAdicionais * 1;
    const queimaRoupaAgarrado = !!situacional.queimaRoupa;
    const notasSituacionaisLista = [];
    if (situacional.movimento === "alvoMovimento") notasSituacionaisLista.push(`alvo em movimento (${modMovimentoAtaque})`);
    if (situacional.movimento === "alvoCarro") notasSituacionaisLista.push(`alvo em carro em movimento (${modMovimentoAtaque})`);
    if (situacional.movimento === "ambosMovimento") notasSituacionaisLista.push(`ambos em movimento (${modMovimentoAtaque})`);
    if (situacional.escuro) notasSituacionaisLista.push(`escuro (${difEscuro} na dificuldade)`);
    if (combatentesAdicionais > 0) notasSituacionaisLista.push(`+${difCombatentes} na dificuldade (${combatentesAdicionais} combatente${combatentesAdicionais > 1 ? "s" : ""} indesejado${combatentesAdicionais > 1 ? "s" : ""} na linha de tiro)`);
    if (queimaRoupaAgarrado) notasSituacionaisLista.push("queima-roupa em alvo dominado/agarrado: dano quadruplicado");

    // CQC (manual pg. 20-21): nível da perícia do atacante, usado pros
    // bônus abaixo — independe de qual perícia está sendo rolada NESTE
    // golpe (ver bonusCQCFacaAdaga, que vale mesmo golpeando de Lâminas
    // Curtas). "1x1" = só o atacante e mais um participante cadastrados
    // no Gerenciador de Combate com iniciativa ativa.
    const entradaCQC = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
    const nivelCQC = entradaCQC ? (Number(entradaCQC[1].nivel) || 0) : 0;
    // Karatê Cobra Kai (manual pg. 22): "No nível 5 todos os ataques
    // desarmados são críticos" — só vale pra golpe desarmado ROLADO COM
    // a perícia Karatê Cobra Kai (mesma leitura usada pro dano máximo
    // sem rolar em calcularEspecificidadeGolpe/danoMaximoSemRolar).
    // Aplicado mais abaixo, assim que o ataque é confirmado como
    // acerto — ver cobraKaiCriticoAutomatico em dados-manual.js.
    const entradaCobraKai = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "Karatê Cobra Kai");
    const nivelCobraKai = entradaCobraKai ? (Number(entradaCobraKai[1].nivel) || 0) : 0;
    const cobraKaiCriticoElegivel = armaConfig.desarmado && nomePericia === "Karatê Cobra Kai" && cobraKaiCriticoAutomatico(nivelCobraKai);
    const numParticipantesCombate = (combateAtivoCache && combateAtivoCache.participantes) ? Object.keys(combateAtivoCache.participantes).length : 0;
    const ehCombate1x1 = combateComIniciativaAtivo() && numParticipantesCombate === 2;
    // Nível 1: +1 EM ROLAGENS DE CQC (só quando a perícia usada pra
    // rolar ESTE golpe é CQC de verdade) contra alvo único 1x1.
    const modCQC1x1 = (nomePericia === "CQC" && ehCombate1x1) ? bonusCQC1x1(nivelCQC) : 0;
    if (modCQC1x1) notasSituacionaisLista.push(`CQC nível ${nivelCQC} — combate 1x1 (+${modCQC1x1})`);
    // Nível 3: faca/adaga golpeia com dificuldade -1 e ganha dano extra
    // de Destreza [escala D] — detectado pelo NOME do item (ver
    // ehFacaOuAdaga), não pela perícia usada pra rolar.
    const bonusCQCFaca = (!armaConfig.desarmado && ehFacaOuAdaga(it.nome)) ? bonusCQCFacaAdaga(nivelCQC) : null;
    if (bonusCQCFaca) notasSituacionaisLista.push(`CQC nível ${nivelCQC} — faca/adaga (dificuldade ${bonusCQCFaca.difAjuste}, dano extra de Destreza)`);

    // Recuo — só disparos de arma de fogo de verdade contam (golpe
    // desarmado nunca é "arma de fogo" mesmo se a perícia usada fosse
    // uma perícia de tiro, o que nem é o caso aqui). idDisparoAtual/chave
    // usam a MESMA convenção de proximoNumeroDisparo, guardados aqui pra
    // dar pra resetar esse contador específico (arma+personagem) assim
    // que o Mestre validar o gasto da ação — ver mais abaixo.
    let modRecuo = 0;
    const idDisparoAtual = modoNpc ? `npc_${npcAtualId}` : fichaAtualId;
    const chaveDisparoAtual = String(it.id || "sem_id");
    if (ehFogo) {
        const numeroDisparo = await proximoNumeroDisparo(it.id);
        modRecuo = modificadorRecuo(armaConfig.recuo, numeroDisparo);
    }
    const modPrecisao = ehFogo ? (Number(armaConfig.precisao) || 0) : 0;

    // periciaBase = só perícia + ajustes estruturados (ou -1 se
    // destreinada), SEM o estado de saúde embutido — separado assim pra
    // poder discriminar cada modificador na mensagem do ataque (ver
    // formatarDetalheRolagemAtaque). penalidadeSaude entra depois, soma
    // igual, então modPericia/modAtaque abaixo dão exatamente o mesmo
    // resultado de antes.
    const penalidadeSaude = penalidadeTestesAtual();
    const periciaBase = modificadorDePericiaComPenalidade(nomePericia, fichaAtual.dados, fichaAtual.pericias, modificadoresPlanosAtacante, 0);
    const modPericia = periciaBase + penalidadeSaude;
    const modAtaque = modPericia + modPrecisao + modRecuo + modificadorExtra + modMovimentoAtaque + modCQC1x1;
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modAtaque;
    // Acerto Crítico (manual): o RESULTADO FINAL (d20 + modificadores)
    // precisa ser exatamente 20 — d20 natural 20 sozinho NÃO garante
    // crítico se os modificadores derrubarem o resultado (ex.: d20=20,
    // modificador -1, resultado final 19 → acerto normal, não crítico).
    // Dobra o dano do ataque (aplicado mais abaixo, sobre danoTotal,
    // antes de reduções de armadura/agarrado/alcance). Falha Crítica:
    // d20 natural 1, OU resultado final <= 1 (possível com modificador
    // negativo, ex: d20=2, modificador -1, resultado final = 1) —
    // sempre sinalizada no Log como "Fogo Amigo/Desastre" pra resolução
    // rápida do Mestre, independente do resultado final ter batido a
    // dificuldade ou não.
    let criticoPositivo = resultadoAtaque === 20;
    const criticoNegativo = brutoAtaque === 1 || resultadoAtaque <= 1;
    let detalheRolagem = formatarDetalheRolagemAtaque({ brutoAtaque, periciaBase, penalidadeSaude, modRecuo, modPrecisao, resultadoAtaque, modificadorExtra, modMovimento: modMovimentoAtaque, modCQC: modCQC1x1, criticoPositivo, criticoNegativo });

    // constituicaoAlvo agora é sempre preenchida (usada mais abaixo,
    // depois do dano aplicado, pro teste de Constituição que decide SE
    // o sangramento acontece — golpes mirados perfurantes sangram tanto
    // no tiro quanto no corpo a corpo/arma branca, ver comentário lá
    // embaixo).
    let dificuldade, nomeAlvo, constituicaoAlvo = 0;
    try {
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            const fichaAlvo = normalizarFicha(snap.val());
            nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
            const modsAlvo = coletarModificadores(fichaAlvo);
            // Constituição é atributo primário (não um secundário
            // calculado) — reaproveita calcularDificuldadeDefesaJogador
            // com base 0 só pra somar valor bruto + modificadores
            // estruturados ("atributo:constituicao").
            constituicaoAlvo = calcularDificuldadeDefesaJogador(fichaAlvo.dados, "constituicao", modsAlvo, 0);
            if (ehFogo) {
                const percepcaoAtacante = calcularDerivados(fichaAtual.dados, modificadoresPlanosAtacante).secundarios.percepcao.total;
                dificuldade = calcularDificuldadeArmaFogo(armaConfig.dificuldadeAcerto, percepcaoAtacante);
            } else {
                const atributoDefesaChave = atributoDefesaPorPericia(nomePericia);
                const baseDif = baseDificuldadeAtaque(it.nome, nomePericia);
                dificuldade = calcularDificuldadeDefesaJogador(fichaAlvo.dados, atributoDefesaChave, modsAlvo, baseDif);
            }
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
            constituicaoAlvo = Number(npc.constituicao) || 0;
            if (ehFogo) {
                const percepcaoAtacante = calcularDerivados(fichaAtual.dados, modificadoresPlanosAtacante).secundarios.percepcao.total;
                dificuldade = calcularDificuldadeArmaFogo(armaConfig.dificuldadeAcerto, percepcaoAtacante);
            } else {
                const atributoDefesaChave = atributoDefesaPorPericia(nomePericia);
                const valorAtributo = atributoDefesaChave === "constituicao" ? (Number(npc.constituicao) || 0) : (Number(npc.agilidade) || 0);
                const baseDif = baseDificuldadeAtaque(it.nome, nomePericia);
                dificuldade = baseDif + valorAtributo;
            }
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    // Golpes Mirados: agravante de dificuldade do local escolhido soma
    // em cima da dificuldade normal (de acerto da arma de fogo, ou de
    // defesa do alvo pra corpo a corpo/desarmado).
    dificuldade += difMiraAtual;

    // Modificadores Situacionais Rápidos de Combate à Distância: Escuro
    // reduz a dificuldade em 5 (favorece o atacante — ambush/mira às
    // cegas em ambiente escuro, ver ficha.html modal de ataque);
    // Combatentes adicionais indesejados na linha de tiro aumentam a
    // dificuldade em 1 por combatente.
    dificuldade += difEscuro + difCombatentes;

    // CQC nível 3: faca/adaga golpeia com dificuldade -1.
    if (bonusCQCFaca) dificuldade += bonusCQCFaca.difAjuste;

    // Derrubar (manual): alvo derrubado tem a dificuldade pra ser
    // acertado diminuída em -3 até se levantar (gastando 1 ação — ver
    // "Levantar" no Gerenciador de Combate).
    const statusDerrubadoAlvo = participante.derrubado;
    if (statusDerrubadoAlvo && statusDerrubadoAlvo.ativo) {
        dificuldade -= 3;
        notasSituacionaisLista.push(`${nomeAlvo} está DERRUBADO (-3 na dificuldade)`);
    }

    const notaSituacional = notasSituacionaisLista.length ? ` Situacional: ${notasSituacionaisLista.join("; ")}.` : "";

    const acertou = resultadoAtaque >= dificuldade;

    // Karatê Cobra Kai nível 5 (manual): "todos os ataques desarmados
    // são críticos" — não depende do resultado final ser 20 (ver
    // cobraKaiCriticoElegivel acima), só de ter acertado. Aplicado
    // aqui, ANTES da mensagem de erro/acerto e de qualquer uso de
    // criticoPositivo mais abaixo (dobra de dano, nota no Log, badge de
    // crítico no toast e na tela de Esquiva/Bloqueio/Aparar pendente).
    if (acertou && cobraKaiCriticoElegivel && !criticoPositivo) {
        criticoPositivo = true;
        detalheRolagem = formatarDetalheRolagemAtaque({ brutoAtaque, periciaBase, penalidadeSaude, modRecuo, modPrecisao, resultadoAtaque, modificadorExtra, modMovimento: modMovimentoAtaque, modCQC: modCQC1x1, criticoPositivo, criticoNegativo });
    }

    // A rolagem do ataque já aconteceu e vai ser registrada de qualquer
    // forma (acerto ou erro) — só o gasto da ação do turno entra na fila
    // do Sistema de Aprovação (jogador) ou é consumido na hora (Mestre
    // agindo por um NPC), igual em qualquer outra rolagem. Em QUALQUER
    // dos dois casos, uma vez que a ação é efetivamente gasta (consumida
    // na hora, ou validada depois pelo Mestre — ver confirmarAcaoPendente
    // em mestre.js), o Recuo dessa arma+personagem é resetado: o próximo
    // disparo começa uma nova sequência de disparos (nova ação), sem a
    // penalidade acumulada da ação anterior.
    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
            if (ehFogo) await resetarRecuoArma(idDisparoAtual, chaveDisparoAtual);
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
                payload: {
                    participanteId: participanteIdParaGastarAcao,
                    extraCQC: consumo.extraCQC,
                    ehArmaFogo: ehFogo,
                    idDisparo: idDisparoAtual,
                    itemIdDisparo: chaveDisparoAtual
                }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    if (!acertou) {
        const notaFalhaCritica = criticoNegativo ? " 🔥 FALHA CRÍTICA — Fogo Amigo/Desastre! Resolução rápida pelo Mestre." : "";
        const detalhe = `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaFalhaCritica}\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador: modAtaque, resultado: resultadoAtaque, detalhe, critico: criticoNegativo ? "falha" : null });
        toast(detalhe, criticoNegativo ? "critico-falha" : "erro");
        return;
    }

    // Resolve dano primeiro. Golpe desarmado usa 1dForça + Força [escala]
    // (manual pg. 49-50); arma cadastrada usa dano base + bônus de escala
    // corpo a corpo (armas de fogo não têm escala, só dano base).
    let danoTotal, tipoDanoKey, danoDadoTexto = "";
    if (armaConfig.desarmado) {
        const forcaAtacante = Number(fichaAtual.dados.forca) || 0;
        const danoCalc = calcularDanoDesarmado(forcaAtacante, armaConfig.escalaMult, {
            dadoMultiplicador: armaConfig.dadoMultiplicador,
            danoMaximoSemRolar: armaConfig.danoMaximoSemRolar
        });
        danoTotal = danoCalc.total;
        tipoDanoKey = "contusao";
        danoDadoTexto = danoCalc.dadoMultiplicador > 1
            ? ` [1d${danoCalc.faces}×${danoCalc.dadoMultiplicador}: ${danoCalc.dado}×${danoCalc.dadoMultiplicador}=${danoCalc.dadoTotal} + Força ${danoCalc.bonusEscala}]`
            : ` [1d${danoCalc.faces}: ${danoCalc.dado} + Força ${danoCalc.bonusEscala}]`;
    } else {
        let bonusEscala = 0;
        if (armaConfig.escala) {
            const escalaInfo = ESCALAS_ARMA.find(e => e.key === armaConfig.escala);
            const periciaInfo = buscarPericiaPorNome(nomePericia);
            const valorAtributo = periciaInfo ? (Number(fichaAtual.dados[periciaInfo.atributo]) || 0) : 0;
            bonusEscala = calcularDanoTotalArma({ danoBase: 0, escalaMult: escalaInfo?.mult }, valorAtributo);
        }
        danoTotal = (Number(armaConfig.danoBase) || 0) + bonusEscala;
        // Dano extra (arma branca — ver montarReducaoDanoChecklist... não,
        // ver campo "Tipo de dano extra" no modal de item): quando o item
        // tem um segundo tipo de dano cadastrado, o jogador escolhe na
        // hora do ataque (select "Tipo de dano" na modal de alvo, ver
        // abrirModalSelecionarAlvo) qual dos dois usar nesse golpe — o
        // valor do dano continua o mesmo, só muda o TIPO (afeta redução
        // de armadura e regras específicas por tipo, ex.: Amputação em
        // corte, Sangramento em perfurante).
        tipoDanoKey = (opcoes.tipoDanoEscolhido === "extra" && armaConfig.tipoDanoExtra)
            ? armaConfig.tipoDanoExtra
            : armaConfig.tipoDano;
    }
    const tipoDanoLabel = TIPOS_DANO.find(t => t.key === tipoDanoKey)?.label || tipoDanoKey || "—";

    // Golpes Mirados (manual): Cabeça a tiro de arma de fogo aumenta o
    // dano em 1/3 — aplicado sobre o dano "base" do golpe, ANTES do
    // Acerto Crítico (que dobra o valor já com esse bônus embutido).
    if (bonusDanoMiraAtual > 0) {
        const bonusMira = Math.floor(danoTotal * bonusDanoMiraAtual);
        danoTotal += bonusMira;
        danoDadoTexto += ` [+${bonusMira} por mirar ${localMira.label}]`;
    }

    // CQC nível 3: golpe com faca/adaga ganha +Destreza [escala D] de
    // dano extra, em cima do dano base da arma.
    if (bonusCQCFaca) {
        const destrezaAtacante = Number(fichaAtual.dados.destreza) || 0;
        const bonusCQCDano = calcularDanoTotalArma({ danoBase: 0, escalaMult: bonusCQCFaca.escalaMultDano }, destrezaAtacante);
        danoTotal += bonusCQCDano;
        danoDadoTexto += ` [+${bonusCQCDano} CQC nível ${nivelCQC} — faca/adaga]`;
    }

    // Modificador Situacional: tiro à queima-roupa contra alvo
    // dominado/agarrado quadruplica o dano do disparo (efeito bruto,
    // aplicado sobre o dano já com bônus de mira embutido, ANTES do
    // Acerto Crítico — se também for crítico, dobra em cima do valor já
    // quadruplicado).
    if (queimaRoupaAgarrado) {
        danoTotal *= 4;
        danoDadoTexto += ` [×4 queima-roupa em alvo dominado/agarrado]`;
    }

    // Acerto Crítico (manual): dobra o dano do ataque. Aplicado ANTES
    // das reduções de Agarrado/alcance limitado (que também mexem em
    // danoTotal logo abaixo) e ANTES da redução de armadura do alvo
    // (que fica a cargo de aplicarDano) — assim o crítico dobra o dano
    // "bruto" do ataque, e o resto do pipeline de reduções continua
    // valendo normalmente em cima do valor já dobrado.
    let notaCritico = "";
    if (criticoPositivo) {
        danoTotal *= 2;
        notaCritico = cobraKaiCriticoElegivel
            ? " ⚡ ACERTO CRÍTICO (Karatê Cobra Kai nível 5 — todo golpe desarmado acertado é crítico) — dano dobrado!"
            : " ⚡ ACERTO CRÍTICO — dano dobrado!";
    }
    // Falha Crítica (nat 1) que, apesar de tudo, ainda bateu a
    // dificuldade (modificador alto o bastante) — caso raro, mas o
    // manual não isenta o nat 1 de ser sinalizado só porque acertou;
    // fica só como aviso pro Mestre, sem nenhum efeito mecânico aqui
    // (a Falha Crítica não afeta dano/acerto, só pede resolução manual).
    if (criticoNegativo) {
        const motivo = brutoAtaque === 1 ? "d20 natural 1" : `resultado final ${resultadoAtaque}`;
        notaCritico += ` 🔥 (${motivo} — Falha Crítica sinalizada mesmo tendo acertado; resolução a critério do Mestre.)`;
    }

    // Agarrar (manual): dano causado PELA vítima do agarrão é reduzido
    // pela metade enquanto durar — golpes de alcance curto ainda são
    // permitidos (checagem lá em cima), só saem mais fracos. Delimitar
    // alcance: golpe Médio "forçado" pra dentro de outro alcance também
    // sai pela metade (mesma checagem). As duas reduções empilham se as
    // duas condições valerem ao mesmo tempo.
    let notaAgarrado = "";
    if (statusAgarrado && statusAgarrado.ativo) {
        danoTotal = Math.floor(danoTotal / 2);
        notaAgarrado += ` (dano reduzido pela metade — AGARRADO por ${statusAgarrado.porNome})`;
    }
    if (verifAlcance.meioDano) {
        danoTotal = Math.floor(danoTotal / 2);
        notaAgarrado += ` (dano reduzido pela metade — alcance Médio usado "de perto" com alcance limitado a ${statusAlcance.valor})`;
    }

    // Esquiva/Bloqueio (manual: só disponível depois que o alvo já teve
    // seu próprio turno na rodada). É UMA ação só, mas quem decide qual
    // manobra fazer com ela é o ALVO (na tela dele, ou o Mestre, se o
    // alvo for NPC) — não quem ataca. Por isso, em vez de resolver o
    // dano na hora, grava uma "reação pendente" no combate ativo (visível
    // em tempo real pra todo mundo) com tudo que falta pra fechar o
    // golpe, e devolve o controle: quem responde é quem recebeu o golpe,
    // via responderReacaoPendente() — ver mestre.js.
    // Disparo de arma de fogo NUNCA passa por aqui (manual: não dá pra
    // esquivar, aparar NEM bloquear tiro — só golpes corpo a corpo/arma
    // branca têm essa reação). Um tiro que acerta sempre vai direto pro
    // caminho de dano logo abaixo.
    if (!ehFogo && combateComIniciativaAtivo() && Number(participante.esquivasDisponiveis) > 0) {
        const atacanteTipo = modoNpc ? "npc" : "ficha";
        const atacanteRefId = modoNpc ? npcAtualId : fichaAtualId;
        const atacantePid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
        await abrirReacaoPendente({
            participanteId: participante._pid,
            nomeAtacante, nomeAlvo, nomeArma: it.nome,
            danoTotal, tipoDanoKey, tipoDanoLabel, danoDadoTexto,
            criticoPositivo, notaCritico,
            alvoTipo: participante.tipo, alvoRefId: participante.refId,
            resultadoAtaque, dificuldade, modAtaque,
            // Sempre false neste ponto (golpe de arma de fogo já retornou
            // mais acima) — mantido só por compatibilidade com o que a
            // tela de reação em mestre.js/ficha.js ainda espera receber.
            ehArmaFogo: false,
            // Golpes Mirados (manual): local escolhido, só pra exibir a
            // nota no Log final, e os dados que responderReacaoPendente
            // (mestre.js) precisa pra aplicar a redução de armadura por
            // local e testar Sangramento de golpes perfurantes que
            // atravessaram a reação (esquiva/bloqueio/aparar não anulam
            // o golpe sempre — ver LOCAIS_MIRA em dados-manual.js).
            notaLocalMira,
            localMiraKey: localMira.key,
            localMiraLabel: localMira.label,
            localArmaduraAtual: localMira.localArmadura,
            regraSangramentoLocal: localMira.sangramento,
            constituicaoAlvo,
            nivelArma: it.nivelTag ?? 0,
            // Manual do Aparar: "não é possível aparar ataques de arma
            // branca estando desarmado" — a tela de reação usa isso pra
            // só oferecer perícias de arma branca (não as desarmadas)
            // quando o golpe recebido também veio de uma perícia de
            // arma branca.
            ataqueArmaBranca: PERICIAS_ARMA_BRANCA.includes(nomePericia),
            // Identidade de quem atacou — só usada se o Aparar for bem
            // sucedido, pra saber em quem mirar o contra-ataque imediato
            // (ver definirContraAtaquePendente em mestre.js).
            atacanteTipo, atacanteRefId, atacantePid,
            detalheRolagem, efeitoTexto:
                (armaConfig.efeitoExtra && armaConfig.efeitoExtra.trim()) ? ` Efeito extra: ${armaConfig.efeitoExtra.trim()}.` : ""
        });
        const detalheAguardando = `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaCritico} Aguardando ${nomeAlvo} decidir entre Esquivar/Bloquear/Aparar/Levar o golpe.${notaAgarrado}\n${detalheRolagem}`;
        toast(detalheAguardando, criticoPositivo ? "critico-acerto" : "ok");
        return;
    }

    let resultadoDano;
    try {
        // Golpes Mirados: a redução de armadura do alvo só conta itens
        // de Proteção cujo localProtegido bate com o local mirado (ver
        // LOCAIS_MIRA em dados-manual.js e aplicarDano em mestre.js).
        resultadoDano = await aplicarDano(participante.tipo, participante.refId, danoTotal, tipoDanoKey, localMira.localArmadura);
    } catch (err) {
        console.error(err);
        toast("Ataque acertou, mas falhou ao aplicar o dano no alvo.", "erro");
        return;
    }

    // Golpes Mirados (manual pg. 51): Golpe Perfurante testa Sangramento,
    // Golpe Cortante aplica obrigatoriamente a regra de Amputação, e
    // Golpe Contundente na Cabeça agrava o teste de Desmaio.
    // Corpo a corpo/arma branca: só quando o golpe teve um local mirado
    // de verdade ("Padrão" é "sem efeitos extras", manual) — nenhuma
    // outra circunstância de corpo a corpo sangra. Arma de fogo (manual
    // pg. 57): "todo projétil" pode causar sangramento — TODO tiro que
    // causou dano testa, mirado ou não, cai na mesma regra do Torso
    // (mesmo localArmadura do golpe "Padrão") quando não há um local
    // mirado escolhido, e usa a fórmula própria da pág. 57 (1d[metade
    // do dano], sempre 3 turnos — ver ehProjetil em
    // testarSangramento/mestre.js), diferente da fração fixa por local
    // usada em corpo a corpo. O teste de Sangramento só faz
    // sentido dentro do Gerenciador de Combate com iniciativa (é lá que
    // existe a noção de "turno" pra decrementar — ver
    // processarStatusInicioTurno em mestre.js) — o ferimento só sangra
    // de fato se o teste de Constituição falhar (ver testarSangramento
    // em mestre.js, que já decide isso e só chama aplicarSangramento
    // internamente quando o teste falha).
    let notaSangramento = "";
    let notaEfeitoLocal = "";
    if (danoTotal > 0 && (ehFogo || ehDanoPerfurante(tipoDanoKey)) && participante._pid && combateComIniciativaAtivo()) {
        const regraSangramentoAplicavel = ehFogo
            ? (localMira.sangramento || localMiraPorKey("torso").sangramento)
            : (ehDanoPerfurante(tipoDanoKey) && localMira.key !== "padrao" ? localMira.sangramento : null);
        if (regraSangramentoAplicavel) {
            const resultadoSangramento = await testarSangramento(participante._pid, constituicaoAlvo, it.nivelTag, danoTotal, regraSangramentoAplicavel, ehFogo);
            if (resultadoSangramento) notaSangramento = ` ${resultadoSangramento.detalhe}`;
        }
    }
    if (danoTotal > 0 && localMira.key !== "padrao") {
        if (ehDanoCortante(tipoDanoKey)) {
            notaEfeitoLocal += ` ⚠️ Golpe cortante mirado em ${localMira.label}: aplica-se a regra de Amputação (resolva com o Mestre).`;
        }
        if (ehDanoContundente(tipoDanoKey) && localMira.key === "cabeca") {
            notaEfeitoLocal += ` ⚠️ Golpe contundente na Cabeça: +4 na dificuldade do teste de Desmaio do alvo (resolva com o Mestre).`;
        }
    }

    // Tiro de arma de fogo não pode ser esquivado, aparado NEM bloqueado
    // (manual) — por isso o golpe que acerta vai sempre direto pro dano
    // cheio, sem reação nenhuma do alvo. "🔫 X foi baleado!" deixa isso
    // bem claro no Log/tela pra quem está acompanhando o combate.
    const notaBaleado = ehFogo ? ` 🔫 ${nomeAlvo} foi baleado!` : "";
    // Desvantagem Frágil (manual pg. 18): já aplicada dentro de
    // aplicarDano (mestre.js) sobre o dano bruto, antes da redução de
    // armadura — aqui só sinaliza no Log que o multiplicador entrou.
    const notaFragil = resultadoDano.fragil ? ` 🩹 ${nomeAlvo} é FRÁGIL — dano recebido dobrado!` : "";

    const efeitoTexto = (armaConfig.efeitoExtra && armaConfig.efeitoExtra.trim()) ? ` Efeito extra: ${armaConfig.efeitoExtra.trim()}.` : "";
    const detalheDano = resultadoDano.reducao > 0
        ? `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaBaleado} Dano${danoDadoTexto}: ${resultadoDano.danoBruto} (${tipoDanoLabel}) - ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} de dano aplicado.${notaCritico}${notaFragil}${notaAgarrado} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaSangramento}${notaEfeitoLocal}\n${detalheRolagem}`
        : `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaBaleado} Dano${danoDadoTexto}: ${resultadoDano.danoFinal} (${tipoDanoLabel}) aplicado.${notaCritico}${notaFragil}${notaAgarrado} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaSangramento}${notaEfeitoLocal}\n${detalheRolagem}`;

    await registrarRolagem({ quem: nomeAtacante, modificador: modAtaque, resultado: resultadoDano.danoFinal, detalhe: detalheDano, critico: criticoPositivo ? "acerto" : null });
    toast(detalheDano, criticoPositivo ? "critico-acerto" : "ok");
}

// Agarrar (manual pg. 49-50): teste de Briga de Rua/Jiu Jitsu/Força
// Bruta/CQC vs. "10 + Força do alvo" — sem dano, sem Esquiva/Bloqueio/
// Aparar contra ela (o manual não prevê reação pra isso, diferente de
// golpe que causa dano). Sucesso deixa o alvo Agarrado (ver
// definirAgarrado em mestre.js): golpes de alcance médio/longo da
// vítima ficam bloqueados e o dano dela sai pela metade, até alguém
// soltar o agarrão (botão "Soltar" na lista de combate).
async function resolverAgarrar(nomePericia, modificador, participante) {
    const consumo = checarConsumoDeAcao(true, nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            const fichaAlvo = normalizarFicha(snap.val());
            nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
            dificuldade = 10 + (Number(fichaAlvo.dados.forca) || 0);
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
            // NPC "rápido" (sem mini-ficha detalhada) não tem Força
            // cadastrada — usa Constituição como aproximação (mesma que
            // o resto do sistema já usa pra esses NPCs mais simples).
            const forcaAlvo = npc.modoDetalhado ? (Number(npc.atributosPrimarios?.forca) || 0) : (Number(npc.constituicao) || 0);
            dificuldade = 10 + forcaAlvo;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} tentou Agarrar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Agarrar ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    if (meuPid) {
        await definirAgarrado(participante._pid, meuPid, nomeAtacante);
    }
    const detalhe = `${nomeAtacante} AGARROU ${nomeAlvo} (${nomePericia}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} não consegue golpes de alcance médio/longo e causa metade do dano enquanto estiver agarrado.\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Desarmar (manual pg. 49-50): teste vs. "10 + perícia da vítima" (usa
// a MELHOR das perícias corpo a corpo/arma branca do alvo, mesma lógica
// de Delimitar alcance — o manual não especifica QUAL perícia). Sucesso
// retira uma arma EQUIPADA do alvo (ver itemPodeEquipar/itemPodeUsar em
// inventario.js — só arma equipada pode ser usada em combate, e é isso
// que Desarmar de fato tira: desequipa o item, não some com ele). Se o
// alvo não tiver nenhuma arma equipada, o teste ainda pode ser vencido,
// mas não tem o que desarmar — o Log deixa isso claro.
async function resolverDesarmar(nomePericia, modificador, participante) {
    const consumo = checarConsumoDeAcao(true, nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo, caminhoInventarioAlvo;
    try {
        const melhorPericiaAlvo = await calcularMelhorModCorpoACorpoParticipante(participante.tipo, participante.refId);
        dificuldade = 10 + melhorPericiaAlvo;
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            nomeAlvo = (snap.val().config && snap.val().config.nomeExibicao) || participante.nome;
            caminhoInventarioAlvo = `fichas/${participante.refId}/inventario`;
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            nomeAlvo = snap.val().nome || participante.nome;
            caminhoInventarioAlvo = `npcs/${participante.refId}/inventario`;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} tentou Desarmar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Desarmar ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    // Acerto: procura a PRIMEIRA arma equipada do alvo pra desequipar.
    // Não há critério de "melhor arma" no manual — se o alvo tiver mais
    // de uma equipada (dupla empunhadura, por ex.), pega a primeira
    // encontrada e deixa claro qual foi no Log.
    let nomeArmaDesarmada = null;
    try {
        const snapInv = await get(ref(db, caminhoMesa(caminhoInventarioAlvo)));
        if (snapInv.exists()) {
            const inv = snapInv.val();
            const entradaArma = Object.entries(inv).find(([, it]) => ehArma(it.tag) && it.categoria === "levando" && it.equipada);
            if (entradaArma) {
                const [itemId, item] = entradaArma;
                await update(ref(db, caminhoMesa(`${caminhoInventarioAlvo}/${itemId}`)), { equipada: false });
                nomeArmaDesarmada = item.nome;
            }
        }
    } catch (err) {
        console.error(err);
        toast("Teste de Desarmar venceu, mas falhou ao atualizar o inventário do alvo — resolva manualmente.", "erro");
    }

    const efeitoTexto = nomeArmaDesarmada
        ? ` ${nomeAlvo} ficou desarmado — "${nomeArmaDesarmada}" foi desequipada e precisa ser reequipada (ou pega do chão) antes de voltar a ser usada.`
        : ` ${nomeAlvo} não tinha nenhuma arma equipada pra desarmar — teste vencido sem efeito.`;
    const detalhe = `${nomeAtacante} DESARMOU ${nomeAlvo} (${nomePericia}) — vs. dificuldade ${dificuldade}.${efeitoTexto}\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Derrubar (manual pg. 49-50): teste vs. "10 + Constituição do alvo".
// Sucesso derruba a vítima — ver definirDerrubado em mestre.js: enquanto
// durar, a dificuldade pra acertá-la cai -3 (aplicado em resolverAtaque
// via participante.derrubado) e ela precisa gastar 1 ação do turno pra
// se levantar (ver tentarLevantarDerrubado, chamado pelo botão
// "Levantar" no Gerenciador de Combate).
//
// CQC nível 2 ("Avançar em direção a oponentes armados e derrubá-los
// tem [...] e derrubar uma vez. Causa dano contundente Destreza D"):
// `usarBonusCQCDano` vem do checkbox da modal de alvo (só aparece pra
// quem TEM o nível — ver abrirModalSelecionarAlvoDerrubar), porque é
// condicional a uma escolha narrativa que o sistema não consegue
// detectar sozinho. O +1 de iniciativa do MESMO nível é oferecido em
// outro momento (ao rolar iniciativa — ver participantesElegiveisCQCIniciativa
// em mestre.js), não aqui; o manual não deixa claro se as duas partes
// do bônus têm que ser usadas juntas na mesma ação, então ficam
// desacopladas — cabe ao Mestre decidir quando cada uma se aplica.
async function resolverDerrubar(nomePericia, modificador, participante, usarBonusCQCDano = false) {
    const consumo = checarConsumoDeAcao(true, nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            const fichaAlvo = normalizarFicha(snap.val());
            nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
            dificuldade = 10 + (Number(fichaAlvo.dados.constituicao) || 0);
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
            const constituicaoAlvo = npc.modoDetalhado ? (Number(npc.atributosPrimarios?.constituicao) || 0) : (Number(npc.constituicao) || 0);
            dificuldade = 10 + constituicaoAlvo;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} tentou Derrubar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Derrubar ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    await definirDerrubado(participante._pid, meuPid, nomeAtacante);

    let notaBonusCQC = "";
    if (usarBonusCQCDano) {
        try {
            const destrezaAtacante = Number(fichaAtual.dados.destreza) || 0;
            const danoBonus = calcularDanoTotalArma({ danoBase: 0, escalaMult: 1 }, destrezaAtacante);
            const resultadoDanoBonus = await aplicarDano(participante.tipo, participante.refId, danoBonus, "contusao", null);
            notaBonusCQC = ` CQC nível 2 (avançou pra derrubar): +${danoBonus} de dano contundente extra — ${resultadoDanoBonus.reducao} (redução) = ${resultadoDanoBonus.danoFinal} aplicado, PV restante: ${resultadoDanoBonus.novoPv}.`;
        } catch (err) {
            console.error(err);
            notaBonusCQC = " Bônus de dano do CQC nível 2 marcado, mas falhou ao aplicar — resolva manualmente.";
        }
    }

    // Jiu Jitsu (manual pg. 22): "Ao derrubar alguém que não tenha Jiu
    // Jitsu, cause 1/10 do total de PV da vítima" — bônus automático
    // (não é uma escolha como o de CQC acima), só quando a manobra foi
    // de fato rolada com a perícia Jiu Jitsu e o atacante tem nível >= 1
    // nela. Usa o PV MÁXIMO do participante (já calculado no Gerenciador
    // de Combate, ver p.pvMax) — ver danoQuedaJiuJitsu em dados-manual.js.
    let notaQuedaJJ = "";
    if (nomePericia === "Jiu Jitsu") {
        try {
            const entradaJJ = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "Jiu Jitsu");
            const nivelJJAtacante = entradaJJ ? (Number(entradaJJ[1].nivel) || 0) : 0;
            const alvoTemJJ = await alvoTemJiuJitsuTreinado(participante.tipo, participante.refId);
            const danoQueda = danoQuedaJiuJitsu(nivelJJAtacante, alvoTemJJ, participante.pvMax);
            if (danoQueda > 0) {
                const resultadoDanoQueda = await aplicarDano(participante.tipo, participante.refId, danoQueda, null, null);
                notaQuedaJJ = ` Jiu Jitsu (alvo sem a perícia): +${danoQueda} de dano extra (1/10 do PV total do alvo) — ${resultadoDanoQueda.danoFinal} aplicado, PV restante: ${resultadoDanoQueda.novoPv}.`;
            }
        } catch (err) {
            console.error(err);
            notaQuedaJJ = " Bônus de dano do Jiu Jitsu (queda) falhou ao aplicar — resolva manualmente.";
        }
    }

    const detalhe = `${nomeAtacante} DERRUBOU ${nomeAlvo} (${nomePericia}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} está derrubado: dificuldade pra ser acertado cai -3 e precisa gastar 1 ação pra se levantar.${notaBonusCQC}${notaQuedaJJ}\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// "Levantar" (efeito de Derrubar — manual: "gastar uma ação para se
// levantar"). Igual ao resto do sistema de ações: o efeito (remover o
// status Derrubado) acontece na hora — só o CONSUMO da ação em si segue
// o Sistema de Aprovação do Mestre quando quem levanta é um jogador (ver
// checarConsumoDeAcao/criarAcaoPendente). Só faz sentido no PRÓPRIO
// turno de quem está derrubado (não dá pra "gastar a ação de alguém" —
// por isso não usa checarConsumoDeAcao, que sempre resolve pra "eu" —
// aqui o alvo é um participanteId explícito, vindo do botão "Levantar").
async function tentarLevantarDerrubado(participanteId) {
    if (!combateComIniciativaAtivo()) {
        // Sem sistema de turnos ativo não há como controlar economia de
        // ações — levanta direto.
        await levantarDerrubado(participanteId);
        toast("Levantou.");
        return;
    }
    if (combateAtivoCache.turnoAtual !== participanteId) {
        toast("Só é possível se levantar no próprio turno.", "erro");
        return;
    }
    const p = combateAtivoCache.participantes[participanteId];
    if (p && Number(p.acoes) <= 0) {
        toast("Sem ações restantes neste turno pra se levantar.", "erro");
        return;
    }
    await levantarDerrubado(participanteId);
    if (isMestre) {
        await consumirAcaoCombate(participanteId);
        toast("Levantou — 1 ação consumida.");
    } else {
        const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} se levantou e quer gastar 1 ação do turno.`,
            payload: { participanteId, ehArmaFogo: false }
        });
        toast("Levantou — gasto de ação enviado pro Mestre aprovar.");
    }
}

// Imobilizar (CQC nível 4, manual pg. 23 — ver MANOBRA_IMOBILIZAR_CQC em
// dados-manual.js): teste vs. "10 + melhor perícia do alvo entre Jiu
// Jitsu, CQC ou Briga de Rua" (PERICIAS_IMOBILIZAR_CQC), igual em
// espírito ao Desarmar (mesma função calcularMelhorModCorpoACorpoParticipante,
// só que com outra lista de perícias). A modal de alvo já filtra pra só
// mostrar quem está Derrubado (ver abrirModalSelecionarAlvoImobilizar).
// Sucesso trava o alvo (ver definirImobilizado em mestre.js), guardando
// o RESULTADO deste próprio teste como a dificuldade que a vítima vai
// precisar bater num teste de Destreza (no próprio turno dela, ver
// tentarLibertarImobilizado abaixo) pra se libertar — o manual fala em
// "o valor do agente CQC no teste de derrubar", mas como Imobilizar é
// uma ação separada e posterior ao Derrubar, usamos o teste que de fato
// prende o alvo agora.
async function resolverImobilizar(nomePericia, modificador, participante) {
    const consumo = checarConsumoDeAcao(true, true); // Imobilizar só rola CQC (MANOBRA_IMOBILIZAR_CQC)
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        const melhorPericiaAlvo = await calcularMelhorModCorpoACorpoParticipante(participante.tipo, participante.refId, PERICIAS_IMOBILIZAR_CQC);
        dificuldade = 10 + melhorPericiaAlvo;
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            nomeAlvo = (snap.val().config && snap.val().config.nomeExibicao) || participante.nome;
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            nomeAlvo = snap.val().nome || participante.nome;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} tentou Imobilizar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Imobilizar ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    if (meuPid) {
        await definirImobilizado(participante._pid, meuPid, nomeAtacante, resultadoAtaque);
    }
    const detalhe = `${nomeAtacante} IMOBILIZOU ${nomeAlvo} (${nomePericia}, CQC nível 4) — vs. dificuldade ${dificuldade}. ${nomeAlvo} não consegue atacar nem se mover enquanto durar; pra se libertar, precisa testar Destreza (dificuldade ${resultadoAtaque}) no próprio turno.\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Melhor entre a Força (atributo) e a perícia Jiu Jitsu (nível) do
// alvo — usado na dificuldade de "Imobilizar (Jiu Jitsu)" (manual:
// "teste disputado de Força ou Jiu Jitsu", ver MANOBRA_IMOBILIZAR_JIUJITSU
// em dados-manual.js). Mesma convenção do resto do sistema pra "teste
// disputado" (10 + o melhor dos dois valores do alvo). NPC "rápido"
// (sem mini-ficha detalhada) não tem Força cadastrada — usa Constituição
// como aproximação, igual resolverAgarrar já faz, e não tem perícia
// Jiu Jitsu pra comparar.
async function calcularMelhorForcaOuJiuJitsuAlvo(alvoTipo, alvoRefId) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return -1;
        const fichaAlvo = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(fichaAlvo);
        const pvMaxCalc = Math.round(calcularDerivados(fichaAlvo.dados, modificadoresPlanos).recursos.pv.total) + (Number(fichaAlvo.dados.pvBonusExtra) || 0);
        const overridePv = fichaAlvo.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalc;
        const pvAtual = (fichaAlvo.dados.pvAtual !== null && fichaAlvo.dados.pvAtual !== undefined) ? Number(fichaAlvo.dados.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(fichaAlvo.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        const forcaAlvo = Number(fichaAlvo.dados.forca) || 0;
        const jjAlvo = modificadorDePericiaComPenalidade("Jiu Jitsu", fichaAlvo.dados, fichaAlvo.pericias, modificadoresPlanos, estadoSaude.penalidadeTestes);
        return Math.max(forcaAlvo, jjAlvo);
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return -1;
    const npc = snap.val();
    const forcaAlvo = npc.modoDetalhado ? (Number(npc.atributosPrimarios?.forca) || 0) : (Number(npc.constituicao) || 0);
    let jjAlvo = -1;
    if (npc.modoDetalhado && npc.periciasNpc) {
        const entrada = Object.values(npc.periciasNpc).find(p => p.nome === "Jiu Jitsu");
        jjAlvo = entrada ? (Number(entrada.nivel) || 0) : -1;
    }
    return Math.max(forcaAlvo, jjAlvo);
}

// Verifica se o alvo já tem a perícia Jiu Jitsu treinada (nível > 0) —
// usado no bônus de dano base da manobra Derrubar (manual: "Ao derrubar
// alguém que NÃO TENHA Jiu Jitsu [...]", ver danoQuedaJiuJitsu em
// dados-manual.js e o hook em resolverDerrubar).
async function alvoTemJiuJitsuTreinado(alvoTipo, alvoRefId) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return false;
        const fichaAlvo = normalizarFicha(snap.val());
        const entrada = Object.values(fichaAlvo.pericias || {}).find(p => p.nome === "Jiu Jitsu");
        return !!(entrada && Number(entrada.nivel) > 0);
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return false;
    const npc = snap.val();
    if (!npc.modoDetalhado || !npc.periciasNpc) return false;
    const entrada = Object.values(npc.periciasNpc).find(p => p.nome === "Jiu Jitsu");
    return !!(entrada && Number(entrada.nivel) > 0);
}

// "Imobilizar (Jiu Jitsu)" (Jiu Jitsu nível 2, manual pg. 22 — ver
// MANOBRA_IMOBILIZAR_JIUJITSU em dados-manual.js): mesmo espírito do
// resolverImobilizar (CQC) logo acima — reaproveita a MESMA mecânica de
// status (definirImobilizado/soltarImobilizado, badges, bloqueio em
// resolverAtaque) — só muda a rolagem/dificuldade (ver
// calcularMelhorForcaOuJiuJitsuAlvo acima) e, com sucesso e Jiu Jitsu
// nível 3+, a opção de Desacordar o alvo em vez de só imobilizar.
async function resolverImobilizarJiuJitsu(nomeBase, modificador, nivelJJ, participante, desacordar) {
    const consumo = checarConsumoDeAcao(true, false);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        const melhorDoAlvo = await calcularMelhorForcaOuJiuJitsuAlvo(participante.tipo, participante.refId);
        dificuldade = 10 + melhorDoAlvo;
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            nomeAlvo = (snap.val().config && snap.val().config.nomeExibicao) || participante.nome;
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            nomeAlvo = snap.val().nome || participante.nome;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador (${nomeBase}): ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;
    const desacordarValido = desacordar && Number(nivelJJ) >= 3;

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await consumirAcaoCombate(participanteIdParaGastarAcao);
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} tentou Imobilizar (Jiu Jitsu) ${nomeAlvo} e quer gastar 1 ação do turno.\n${detalheRolagem}`,
                payload: { participanteId: participanteIdParaGastarAcao, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Imobilizar (Jiu Jitsu) ${nomeAlvo} (${nomeBase}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    if (meuPid && desacordarValido) {
        await definirDesacordado(participante._pid, meuPid, nomeAtacante);
        const detalhe = `${nomeAtacante} venceu o teste disputado e DESACORDOU ${nomeAlvo} (${nomeBase}, Jiu Jitsu nível ${nivelJJ}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} está inconsciente: não age nem se defende, e não tem teste pra se libertar sozinho — só o Mestre pode acordá-lo.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe);
        return;
    }

    if (meuPid) {
        await definirImobilizado(participante._pid, meuPid, nomeAtacante, resultadoAtaque);
    }
    const detalhe = `${nomeAtacante} IMOBILIZOU ${nomeAlvo} (${nomeBase}, Jiu Jitsu nível ${nivelJJ}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} não consegue atacar nem se mover enquanto durar; pra se libertar, precisa testar Destreza (dificuldade ${resultadoAtaque}) no próprio turno.\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// "Quebrar ossos" (Jiu Jitsu níveis 4/5, manual pg. 22 — ver
// MANOBRA_QUEBRAR_OSSOS_JIUJITSU/danoQuebrarOssosJiuJitsu em
// dados-manual.js): sem rolagem — é automático contra quem você já
// está Imobilizando (ver abrirModalQuebrarOssosJJ). Aplica o dano
// (Destreza C/B) direto com aplicarDano (mesmo helper do bônus de dano
// do CQC nível 2 em resolverDerrubar) e registra o status ossosQuebrados
// (ver definirOssosQuebrados em mestre.js) só pra exibir a nota da
// penalidade — o Mestre decide como aplicar "-X em qualquer ação
// física" nos testes seguintes da vítima.
async function resolverQuebrarOssosJiuJitsu(nivelJJ, participante, membroInferior) {
    const consumo = checarConsumoDeAcao(true, false);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const info = danoQuebrarOssosJiuJitsu(nivelJJ);
    if (!info) { toast("Jiu Jitsu nível 4+ é necessário pra Quebrar ossos.", "erro"); return; }

    const destrezaAtacante = Number(fichaAtual.dados.destreza) || 0;
    const dano = calcularDanoTotalArma({ danoBase: 0, escalaMult: info.escalaMult }, destrezaAtacante);

    let resultadoDano, nomeAlvo;
    try {
        resultadoDano = await aplicarDano(participante.tipo, participante.refId, dano, "contusao", null);
        nomeAlvo = resultadoDano.nomeAlvo;
    } catch (err) {
        console.error(err);
        toast("Falha ao aplicar dano no alvo.", "erro");
        return;
    }

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await consumirAcaoCombate(participanteIdParaGastarAcao);
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} usou Quebrar ossos em ${nomeAlvo} e quer gastar 1 ação do turno.`,
                payload: { participanteId: participanteIdParaGastarAcao, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    await definirOssosQuebrados(participante._pid, {
        pontosPenalidade: info.pontosPenalidade,
        membroInferior: membroInferior && Number(nivelJJ) >= 5,
        porNome: nomeAtacante
    });

    const notaMembro = (membroInferior && Number(nivelJJ) >= 5)
        ? " Atingiu um membro inferior: impossibilita correr (se ambas as pernas forem quebradas, só dá pra se arrastar, testando Tolerância dificuldade 15)."
        : "";
    const detalhe = `${nomeAtacante} QUEBROU OSSOS de ${nomeAlvo} (Jiu Jitsu nível ${nivelJJ}, ${info.label}): +${dano} de dano contundente — ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} aplicado, PV restante: ${resultadoDano.novoPv}. Reduz em ${info.pontosPenalidade} ponto(s) qualquer ação física da vítima enquanto durar (a critério do Mestre).${notaMembro}`;
    await registrarRolagem({ quem: nomeAtacante, modificador: 0, resultado: dano, detalhe });
    toast(detalhe);
}


// Destreza, dif igual ao valor do agente CQC no teste de [Imobilizar]").
// Mesma lógica de ação do "Levantar" (tentarLevantarDerrubado): só no
// próprio turno de quem está imobilizado, gasta 1 ação. Diferente de
// Levantar, aqui tem uma rolagem de verdade (Destreza, o ATRIBUTO
// puro — o manual não pede uma perícia) contra a dificuldade guardada
// em definirImobilizado.
async function tentarLibertarImobilizado(participanteId) {
    if (!combateComIniciativaAtivo()) {
        await soltarImobilizado(participanteId);
        toast("Livrou-se do Imobilizado.");
        return;
    }
    if (combateAtivoCache.turnoAtual !== participanteId) {
        toast("Só é possível tentar se libertar no próprio turno.", "erro");
        return;
    }
    const p = combateAtivoCache.participantes[participanteId];
    const statusImobilizado = p && p.imobilizado;
    if (!statusImobilizado || !statusImobilizado.ativo) return;
    if (Number(p.acoes) <= 0) {
        toast("Sem ações restantes neste turno pra tentar se libertar.", "erro");
        return;
    }

    const dificuldade = Number(statusImobilizado.dificuldadeEscape) || 10;
    const modDestreza = Number(fichaAtual?.dados?.destreza) || 0;
    const penalidade = penalidadeTestesAtual();
    const bruto = rolarD20();
    const modTotal = modDestreza + penalidade;
    const resultado = bruto + modTotal;
    const detalheRolagem = `rolagem: ${bruto}\nDestreza: ${modDestreza >= 0 ? "+" : ""}${modDestreza}${penalidade ? ` ${penalidade >= 0 ? "+" : ""}${penalidade} (penalidade de saúde/energia)` : ""}\nresultado: ${resultado}`;
    const conseguiu = resultado >= dificuldade;

    const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    if (isMestre) {
        await consumirAcaoCombate(participanteId);
    } else {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} testou Destreza pra se libertar do Imobilizado e quer gastar 1 ação do turno.\n${detalheRolagem}`,
            payload: { participanteId, ehArmaFogo: false }
        });
    }

    if (conseguiu) {
        await soltarImobilizado(participanteId);
        const detalhe = `${nomeJogador} testou Destreza vs. dificuldade ${dificuldade} e se LIBERTOU do Imobilizado.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeJogador, modificador: modTotal, resultado, detalhe });
        toast(detalhe);
    } else {
        const detalhe = `${nomeJogador} testou Destreza vs. dificuldade ${dificuldade} e continua Imobilizado.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeJogador, modificador: modTotal, resultado, detalhe });
        toast(detalhe, "erro");
    }
}

// Arremessar (CQC nível 3+, manual pg. 20-21, dentro de "Esfaquear e
// Arremessar"): joga a faca/adaga equipada em até 3 alvos numa única
// ação. "Para cada inimigo a mais até um máximo de 3, você recebe
// modificador +1 para arremessá-los ou derrubá-los" — interpretado como
// bônus cumulativo aplicado à rolagem inteira (não escalonado alvo a
// alvo), já que o manual não detalha outra forma de dividir isso.
// Reaproveita a dificuldade -1 do "golpear com faca" (nível 3, já
// embutida no "9 +" abaixo em vez de "10 +"), mas o dano aqui escala
// com FORÇA [escala C] — diferente do golpe corpo a corpo, que escala
// com Destreza [D] (ver bonusCQCFacaAdaga). Cada acerto ainda testa
// Derrubar contra aquele alvo específico, com dificuldade +2 (mais
// difícil que o Derrubar corpo a corpo comum), usando a mesma
// infraestrutura de definirDerrubado/resolverDerrubar.
async function resolverArremessar(nomePericia, modificadorBase, itemFaca, alvosIds, tipoDanoEscolhido = "padrao") {
    const consumo = checarConsumoDeAcao(true, true); // Arremessar só rola CQC (MANOBRA_ARREMESSAR_CQC)
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const bonusPorAlvoExtra = Math.max(0, alvosIds.length - 1);
    const modificadorAtaque = modificadorBase + bonusPorAlvoExtra;
    const forcaAtacante = Number(fichaAtual.dados.forca) || 0;
    const danoArremesso = calcularDanoTotalArma({ danoBase: 0, escalaMult: 2 }, forcaAtacante); // escala C = 2x Força
    // Dano extra (arma branca — ver "Tipo de dano extra" no modal de
    // item, e o seletor equivalente na modal de Arremessar): mesma ideia
    // do ataque comum (ver resolverAtaque) — a escolha só troca o TIPO,
    // não o valor do dano.
    const tipoDanoKey = (tipoDanoEscolhido === "extra" && itemFaca.arma && itemFaca.arma.tipoDanoExtra)
        ? itemFaca.arma.tipoDanoExtra
        : ((itemFaca.arma && itemFaca.arma.tipoDano) || "corte");

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} arremessou ${itemFaca.nome} em ${alvosIds.length} alvo(s) e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    const linhasLog = [];
    for (const pid of alvosIds) {
        const participante = combateAtivoCache.participantes && combateAtivoCache.participantes[pid];
        if (!participante) { linhasLog.push("Alvo inválido (saiu do combate)."); continue; }

        let dificuldade, nomeAlvo, constituicaoAlvo = 0;
        try {
            if (participante.tipo === "ficha") {
                const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
                if (!snap.exists()) { linhasLog.push(`${participante.nome}: ficha não encontrada.`); continue; }
                const fichaAlvo = normalizarFicha(snap.val());
                nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
                const modsAlvo = coletarModificadores(fichaAlvo);
                const agilidadeAlvo = calcularDificuldadeDefesaJogador(fichaAlvo.dados, "agilidade", modsAlvo, 0);
                constituicaoAlvo = calcularDificuldadeDefesaJogador(fichaAlvo.dados, "constituicao", modsAlvo, 0);
                dificuldade = 9 + agilidadeAlvo; // 10 base -1 (CQC nível 3)
            } else {
                const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
                if (!snap.exists()) { linhasLog.push(`${participante.nome}: NPC não encontrado.`); continue; }
                const npc = snap.val();
                nomeAlvo = npc.nome || participante.nome;
                dificuldade = 9 + (Number(npc.agilidade) || 0);
                constituicaoAlvo = Number(npc.constituicao) || 0;
            }
        } catch (err) {
            console.error(err);
            linhasLog.push(`${participante.nome}: falha ao buscar dados do alvo.`);
            continue;
        }

        const brutoAtaque = rolarD20();
        const resultadoAtaque = brutoAtaque + modificadorAtaque;
        if (resultadoAtaque < dificuldade) {
            linhasLog.push(`${nomeAlvo}: ERRO (${brutoAtaque}+${modificadorAtaque}=${resultadoAtaque} vs. dificuldade ${dificuldade}).`);
            continue;
        }

        let resultadoDano;
        try {
            resultadoDano = await aplicarDano(participante.tipo, participante.refId, danoArremesso, tipoDanoKey, null);
        } catch (err) {
            console.error(err);
            linhasLog.push(`${nomeAlvo}: ACERTO (${resultadoAtaque} vs. ${dificuldade}), mas falhou ao aplicar o dano — resolva manualmente.`);
            continue;
        }

        // Teste de Derrubar embutido (dificuldade +2) — só em quem foi
        // de fato acertado pelo arremesso.
        const dificuldadeDerrubar = 10 + constituicaoAlvo + 2;
        const brutoDerrubar = rolarD20();
        const resultadoDerrubar = brutoDerrubar + modificadorAtaque;
        let notaDerrubar;
        if (resultadoDerrubar >= dificuldadeDerrubar) {
            await definirDerrubado(pid, meuPid, nomeAtacante);
            notaDerrubar = ` DERRUBADO (${brutoDerrubar}+${modificadorAtaque}=${resultadoDerrubar} vs. ${dificuldadeDerrubar}).`;
        } else {
            notaDerrubar = ` não derrubou (${brutoDerrubar}+${modificadorAtaque}=${resultadoDerrubar} vs. ${dificuldadeDerrubar}).`;
        }

        linhasLog.push(`${nomeAlvo}: ACERTO (${resultadoAtaque} vs. ${dificuldade}) — dano ${danoArremesso}, ${resultadoDano.reducao} de redução = ${resultadoDano.danoFinal} aplicado, PV restante ${resultadoDano.novoPv}.${notaDerrubar}`);
    }

    const notaBonus = bonusPorAlvoExtra ? ` (base ${modificadorBase >= 0 ? "+" : ""}${modificadorBase} +${bonusPorAlvoExtra} por alvo extra)` : "";
    const detalhe = `${nomeAtacante} ARREMESSOU ${itemFaca.nome} (CQC nível 3+) em ${alvosIds.length} alvo(s) — modificador ${modificadorAtaque >= 0 ? "+" : ""}${modificadorAtaque}${notaBonus}:\n${linhasLog.map(l => `• ${l}`).join("\n")}`;
    await registrarRolagem({ quem: nomeAtacante, modificador: modificadorAtaque, resultado: `${alvosIds.length} alvo(s)`, detalhe });
    toast(detalhe);
}

// Delimitar alcance (manual): teste vs. "11 + perícia corpo a corpo do
// alvo" (usa a MELHOR das perícias corpo a corpo/arma branca do alvo —
// ver calcularMelhorModCorpoACorpoParticipante). Sucesso trava a vítima
// num único alcance (ver verificarAlcanceLimitado em resolverAtaque).
async function resolverDelimitarAlcance(nomePericia, modificador, alcanceEscolhido, participante) {
    const consumo = checarConsumoDeAcao(true, nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        const melhorPericiaAlvo = await calcularMelhorModCorpoACorpoParticipante(participante.tipo, participante.refId);
        dificuldade = 11 + melhorPericiaAlvo;
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            nomeAlvo = (snap.exists() && snap.val().config && snap.val().config.nomeExibicao) || participante.nome;
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            nomeAlvo = (snap.exists() && snap.val().nome) || participante.nome;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} tentou Delimitar o alcance (${alcanceEscolhido}) de ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Delimitar o alcance de ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    await definirAlcanceLimitado(participante._pid, { valor: alcanceEscolhido, pontuacao: resultadoAtaque, porPid: meuPid, porNome: nomeAtacante });
    const detalhe = `${nomeAtacante} DELIMITOU o alcance de ${nomeAlvo} pra ${alcanceEscolhido} (${nomePericia}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} só consegue usar golpes de alcance ${alcanceEscolhido} (Médio sempre passa, com metade do dano, se não for o escolhido).\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Retomar alcance (manual): dificuldade fixa = pontuação do teste de
// Delimitar alcance que travou a vítima (já guardada em
// participante.alcanceLimitado.pontuacao — sem precisar buscar nada,
// vem direto do combateAtivo).
async function resolverRetomarAlcance(nomePericia, modificador, participante) {
    if (!participante.alcanceLimitado || !participante.alcanceLimitado.ativo) {
        toast(`${participante.nome} não está com o alcance limitado.`, "erro");
        return;
    }
    const consumo = checarConsumoDeAcao(true, nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const nomeAlvo = participante.nome;
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;
    const dificuldade = Number(participante.alcanceLimitado.pontuacao) || 0;
    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await (consumo.extraCQC ? consumirAcaoExtraCQC(participanteIdParaGastarAcao) : consumirAcaoCombate(participanteIdParaGastarAcao));
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: nomeAtacante,
                detalhe: `${nomeAtacante} tentou Retomar o alcance de ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Retomar o alcance de ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    await soltarAlcanceLimitado(participante._pid);
    const detalhe = `${nomeAtacante} RETOMOU o alcance de ${nomeAlvo} (${nomePericia}) — vs. dificuldade ${dificuldade}. Limitação de alcance removida.\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}


// ---------------------------------------------------------------------
function renderizarInventario(modificadoresPlanos) {
    const carga = calcularCargaAtual(fichaAtual, modificadoresPlanos);
    const pct = Math.round(carga.percentual);
    let avisoPenalidade = "";
    if (carga.penalidadeVelocidade < 0) {
        avisoPenalidade = ` · penalidade de velocidade: ${carga.penalidadeVelocidade}`;
    }
    const detalheBonus = carga.bonusExtra ? ` (base ${carga.limiteBase.toFixed(1)} + ${carga.bonusExtra >= 0 ? "+" : ""}${carga.bonusExtra} de modificadores)` : "";
    el.resumoCarga.innerText = `${carga.pesoTotal.toFixed(1)} kg / ${carga.limite.toFixed(1)} kg carregados (${pct}%)${detalheBonus}${avisoPenalidade}`;
    const ajustesCarga = modificadoresQueAfetam("carga_extra", modificadoresPlanos);
    el.resumoCarga.title = textoDetalhamento("Limite de carga", carga.limiteBase, "Base (Constituição)", ajustesCarga, carga.limite);

    const categorias = listaCategorias(fichaAtual);
    el.inventarioCategoriasNav.innerHTML = "";
    categorias.forEach(cat => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "inventario-categoria-btn" + (cat.id === categoriaInventarioAtiva ? " active" : "");
        btn.innerText = cat.nome;
        btn.addEventListener("click", () => { categoriaInventarioAtiva = cat.id; renderizarInventario(modificadoresPlanos); });
        el.inventarioCategoriasNav.appendChild(btn);
    });

    const itens = Object.entries(fichaAtual.inventario || {});
    // Carregador anexado a uma arma some da lista principal — ele virou
    // parte da arma (ver carregadorEstaAnexado em inventario.js); a
    // munição dele continua aparecendo junto da própria arma.
    const itensCategoria = itens.filter(([id, it]) =>
        it.categoria === categoriaInventarioAtiva &&
        !(ehCarregador(it.tag) && carregadorEstaAnexado(fichaAtual, id))
    );
    const pesoCategoria = pesoTotalPorCategoria(fichaAtual, categoriaInventarioAtiva);

    el.inventarioListas.innerHTML = "";
    const bloco = document.createElement("div");
    bloco.className = "categoria-bloco";
    const titulo = document.createElement("div");
    titulo.className = "categoria-bloco-titulo";
    titulo.innerHTML = `${nomeCategoria(fichaAtual, categoriaInventarioAtiva)} <span class="peso-total">${pesoCategoria.toFixed(1)} kg</span>`;
    bloco.appendChild(titulo);

    const lista = document.createElement("ul");
    lista.className = "entity-list";

    if (!itensCategoria.length) {
        lista.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nenhum item aqui ainda.</li>`;
    } else {
        itensCategoria.forEach(([id, it]) => {
            const li = document.createElement("li");
            // Item com modificadores estruturados (ex: colete que dá +Defesa)
            // ganha o mesmo botão de ativo/desativado das vantagens/etc —
            // pra "vestir/tirar" o efeito sem removê-lo do inventário.
            const temEfeitoItem = !!(it.modificadores && it.modificadores.length);
            const ativoItem = it.ativo !== false;
            if (temEfeitoItem && !ativoItem) li.classList.add("entidade-desativada");
            const kitGeral = ehFerramentaCriacaoGeral(it.tag);
            const periciasUsoItem = periciaUsoComoArray(it.periciaUso);
            const podeUsar = itemPodeUsar(it) && (!!periciasUsoItem.length || kitGeral);
            const ehFogo = ehArma(it.tag) && ehArmaDeFogo(it.periciaUso);
            const escopeta = ehFogo && ehCalibreEscopeta(it.calibre);
            const ehArmaItem = ehArma(it.tag);
            const ehEquipavelItem = itemEhEquipavel(it);
            const equipadaItem = !!it.equipada;
            const podeEquipar = itemPodeEquipar(it);
            const tagLabel = rotuloTag(it.tag) + (it.nivelTag ? ` nível ${it.nivelTag}` : "");
            const periciaLabel = periciasUsoItem.length
                ? ` · Usa: ${escapeHtml(periciasUsoItem.join(", "))}`
                : (kitGeral ? ` · Usa: ${PERICIAS_FERRAMENTA_CRIACAO.join(", ")} (escolhe ao usar)` : "");
            const classeLabel = it.classeProtecao ? ` · Classe de Proteção ${escapeHtml(rotuloClasseProtecao(it.classeProtecao))}` : "";
            const saldoLabel = it.ehSaldo ? ` · Saldo: CN$ ${Number(it.saldoValor) || 0}` : "";
            const quantidadeLabel = (it.quantidade && it.quantidade > 1) ? ` (x${it.quantidade})` : "";
            const calibreLabel = it.calibre ? ` · Calibre ${escapeHtml(rotuloCalibre(it.calibre))}` : "";
            const reducaoLabel = (it.reducoesDano && it.reducoesDano.length)
                ? ` · Reduz: ${it.reducoesDano.map(r => `${TIPOS_DANO.find(t => t.key === r.tipo)?.label || r.tipo} -${r.valor}`).join(", ")}`
                : "";
            const localProtegidoLabel = it.localProtegido ? ` · Protege: ${escapeHtml(rotuloLocalProtecao(it.localProtegido))}` : "";
            const carregadorLabel = it.carregador
                ? ` · Munição: ${it.carregador.municaoAtual || 0}/${it.carregador.capacidadeMax || 0}`
                : "";
            const projetilLabel = it.projetil ? ` · Quantidade: ${it.projetil.quantidade || 0}` : "";
            const carregadorAnexadoIdItem = (it.arma && it.arma.carregadorId) || null;
            const carregadorAnexadoObjItem = carregadorAnexadoIdItem ? fichaAtual.inventario?.[carregadorAnexadoIdItem] : null;
            const armaEstaCarregadaItem = ehFogo && !escopeta && !!carregadorAnexadoObjItem;
            const carregadorAnexadoLabel = (ehFogo && it.arma)
                ? (escopeta
                    ? ` · Munição em estoque: ${municaoEscopetaDisponivel(it.calibre)} (sem carregador)`
                    : (carregadorAnexadoObjItem
                        ? ` · Carregador: ${escapeHtml(carregadorAnexadoObjItem.nome)} (${carregadorAnexadoObjItem.carregador?.municaoAtual || 0}/${carregadorAnexadoObjItem.carregador?.capacidadeMax || 0})`
                        : " · Sem carregador anexado"))
                : "";
            // Tooltip do carregador: só aparece ao passar o mouse por cima,
            // listando os projéteis carregados dentro dele.
            const tooltipCarregador = it.carregador
                ? (it.carregador.projeteisCarregados && it.carregador.projeteisCarregados.length
                    ? it.carregador.projeteisCarregados.map(p => `${p.nome} x${p.quantidade}`).join("\n")
                    : "Carregador vazio.")
                : "";

            li.innerHTML = `
                <div class="entity-main" ${tooltipCarregador ? `title="${escapeHtml(tooltipCarregador)}"` : ""}>
                    <span class="entity-nome">${escapeHtml(it.nome)}</span>
                    <span class="entity-sub">${tagLabel} · ${it.peso || 0} kg${quantidadeLabel}${periciaLabel}${saldoLabel}${classeLabel}${calibreLabel}${localProtegidoLabel}${reducaoLabel}${carregadorLabel}${projetilLabel}${carregadorAnexadoLabel}</span>
                </div>
                <div class="entity-badges">
                    ${armaEstaCarregadaItem ? `<span class="mod-pill positivo" title="Tem um carregador anexado">🔵 Carregada</span>` : ""}
                    ${temEfeitoItem ? `<button type="button" class="btn-toggle-ativo ${ativoItem ? "ligado" : "desligado"}" title="${ativoItem ? "Efeito ativo agora — clique pra desativar" : "Efeito desativado agora — clique pra ativar"}">${ativoItem ? "● Ativo" : "○ Inativo"}</button>` : ""}
                    ${ehEquipavelItem ? `<button type="button" class="btn-toggle-equipada ${equipadaItem ? "ligado" : "desligado"}" ${podeEquipar ? "" : "disabled"} title="${podeEquipar ? (equipadaItem ? "Equipado agora — clique pra desequipar" : "Desequipado — clique pra equipar e poder usar") : "Precisa estar em 'Levando consigo' pra equipar"}">${equipadaItem ? (ehArmaItem ? "🗡️ Equipada" : "✅ Equipado") : "○ Desequipado"}</button>` : ""}
                    <button type="button" class="btn-usar-item btn-blue" ${podeUsar ? "" : "disabled"} title="${podeUsar ? (kitGeral ? "Escolher qual perícia rolar (Explosivos, Mecânica Automotiva, Armeiro, Ofícios Utilitários ou Eletrônica)" : (periciasUsoItem.length > 1 ? `Escolher qual perícia rolar (${periciasUsoItem.join(", ")})` : `Rolar d20 + ${periciasUsoItem[0]}`)) : (ehEquipavelItem && !equipadaItem ? "Equipe o item pra poder usá-lo" : "Sem perícia vinculada")}">Usar</button>
                    ${(ehFogo && !escopeta) ? `<button type="button" class="btn-recarregar-item btn-blue" ${itemPodeUsar(it) ? "" : "disabled"} title="Trocar o carregador anexado por um com mais munição">Recarregar</button>` : ""}
                    ${(ehFogo && !escopeta) ? `<button type="button" class="btn-retirar-carregador-item btn-ghost" ${(itemPodeUsar(it) && armaEstaCarregadaItem) ? "" : "disabled"} title="Retirar o carregador anexado e devolvê-lo ao inventário">Retirar carregador</button>` : ""}
                    ${ehCarregador(it.tag) ? `<button type="button" class="btn-carregar-item btn-blue" ${itemPodeUsar(it) ? "" : "disabled"} title="Carregar projéteis do mesmo calibre que estiverem no inventário">Carregar</button>` : ""}
                    ${(!isMestre && it.categoria === "levando") ? `<button type="button" class="btn-dar-item btn-ghost">Dar item</button>` : ""}
                    <select class="select-transferir"></select>
                </div>
            `;
            if (temEfeitoItem) {
                li.querySelector(".btn-toggle-ativo").addEventListener("click", (e) => {
                    e.stopPropagation();
                    alternarAtivoEntidade("inventario", id, !ativoItem);
                });
            }
            const btnToggleEquipada = li.querySelector(".btn-toggle-equipada");
            if (btnToggleEquipada) {
                btnToggleEquipada.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (!podeEquipar) return;
                    alternarEquipadaItem(id, !equipadaItem, it.nome);
                });
            }
            const selectTransferir = li.querySelector(".select-transferir");
            categorias.forEach(cat => {
                if (cat.id === it.categoria) return;
                const opt = document.createElement("option");
                opt.value = cat.id;
                opt.innerText = `→ ${cat.nome}`;
                selectTransferir.appendChild(opt);
            });
            const optPlaceholder = document.createElement("option");
            optPlaceholder.value = "";
            optPlaceholder.innerText = "Mover para...";
            optPlaceholder.selected = true;
            optPlaceholder.disabled = true;
            selectTransferir.prepend(optPlaceholder);

            selectTransferir.addEventListener("click", (e) => e.stopPropagation());
            selectTransferir.addEventListener("change", async (e) => {
                e.stopPropagation();
                const novaCategoria = e.target.value;
                if (!novaCategoria) return;
                if (isMestre) {
                    const dados = { categoria: novaCategoria };
                    if (novaCategoria !== "levando" && ehEquipavelItem && equipadaItem) dados.equipada = false;
                    await update(ref(db, `${caminhoBase()}/inventario/${id}`), dados);
                    toast(`${it.nome} movido.`);
                } else {
                    const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
                    const nomeCatNova = nomeCategoria(fichaAtual, novaCategoria);
                    await criarAcaoPendente({
                        tipo: "mover_item",
                        fichaId: fichaAtualId,
                        nomeJogador,
                        detalhe: `${nomeJogador} quer mover "${it.nome}" para "${nomeCatNova}".`,
                        payload: { itemId: id, itemNome: it.nome, categoriaAtual: it.categoria, categoriaNova: novaCategoria }
                    });
                    toast("Pedido de movimentação enviado ao Mestre.");
                    selectTransferir.value = "";
                }
            });

            li.querySelector(".btn-usar-item").addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!podeUsar) return;
                await iniciarUsoItem({ id, ...it }, modificadoresPlanos);
            });

            const btnRecarregar = li.querySelector(".btn-recarregar-item");
            if (btnRecarregar) {
                btnRecarregar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await recarregarArma(id, it);
                });
            }

            const btnRetirarCarregador = li.querySelector(".btn-retirar-carregador-item");
            if (btnRetirarCarregador) {
                btnRetirarCarregador.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (!armaEstaCarregadaItem) return;
                    await retirarCarregadorArma(id, it);
                });
            }

            const btnCarregar = li.querySelector(".btn-carregar-item");
            if (btnCarregar) {
                btnCarregar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await carregarCarregador(id, it);
                });
            }

            const btnDarItem = li.querySelector(".btn-dar-item");
            if (btnDarItem) {
                btnDarItem.addEventListener("click", (e) => {
                    e.stopPropagation();
                    abrirModalDarItem(id, it);
                });
            }

            li.addEventListener("click", () => abrirModalEdicao("inventario", id));
            lista.appendChild(li);
        });
    }
    bloco.appendChild(lista);
    el.inventarioListas.appendChild(bloco);
}

// ---------------------------------------------------------------------
// COMBATE
// ---------------------------------------------------------------------
function renderizarCombate() {
    const modificadoresPlanos = coletarModificadores(fichaAtual);
    const armas = listaArmasInventario(fichaAtual);
    el.listaArmasCombate.innerHTML = "";
    if (!armas.length) {
        el.listaArmasCombate.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nenhuma arma no inventário ainda.</li>`;
    } else {
        armas.forEach(arma => {
            const li = document.createElement("li");
            const cfg = arma.arma || {};
            const tipoDano = TIPOS_DANO.find(t => t.key === cfg.tipoDano);
            const tipoDanoExtraInfo = cfg.tipoDanoExtra ? TIPOS_DANO.find(t => t.key === cfg.tipoDanoExtra) : null;
            const escala = ESCALAS_ARMA.find(e => e.key === cfg.escala);
            const mods = (cfg.modificacoesArma || []).join(", ");
            const podeUsar = itemPodeUsar(arma) && !!arma.periciaUso;
            const equipadaArma = !!arma.equipada;
            const podeEquiparArma = itemPodeEquipar(arma);
            const periciaLabel = arma.periciaUso ? ` · Perícia: ${escapeHtml(arma.periciaUso)}` : " · Sem perícia vinculada";
            const classeLabel = arma.classeProtecao ? ` · Classe de Proteção ${escapeHtml(rotuloClasseProtecao(arma.classeProtecao))}` : "";
            const calibreLabel = arma.calibre ? ` · Calibre ${escapeHtml(rotuloCalibre(arma.calibre))}` : "";
            const ehFogo = ehArmaDeFogo(arma.periciaUso);
            const escopeta = ehFogo && ehCalibreEscopeta(arma.calibre);
            const carregadorAnexado = (ehFogo && cfg.carregadorId) ? fichaAtual.inventario?.[cfg.carregadorId] : null;
            const municaoLabel = ehFogo
                ? (escopeta
                    ? ` · Munição em estoque: ${municaoEscopetaDisponivel(arma.calibre)} (sem carregador)`
                    : (carregadorAnexado
                        ? ` · Munição: ${carregadorAnexado.carregador?.municaoAtual || 0}/${carregadorAnexado.carregador?.capacidadeMax || 0}`
                        : " · Sem carregador anexado"))
                : "";
            const fogoLabel = ehFogo
                ? ` · Dif. acerto ${cfg.dificuldadeAcerto ?? "—"} · Alcance ${rotuloAlcanceArmaFogo(cfg.alcance)} · Recuo: ${rotuloPadraoRecuo(cfg.recuo)}${cfg.precisao ? ` · Precisão ${cfg.precisao >= 0 ? "+" : ""}${cfg.precisao}` : ""}${municaoLabel}`
                : "";
            li.innerHTML = `
                <div class="entity-main">
                    <span class="entity-nome">${escapeHtml(arma.nome)} <span class="mod-pill tag">nível ${arma.nivelTag || "?"}</span></span>
                    <span class="entity-sub">Dano base: ${cfg.danoBase ?? 0}${tipoDano ? " · " + tipoDano.label : ""}${escala ? " · " + escala.label : ""}${tipoDanoExtraInfo ? ` · ou ${tipoDanoExtraInfo.label} (escolhido no ataque)` : ""}${periciaLabel}${classeLabel}${calibreLabel}${fogoLabel}</span>
                    ${mods ? `<span class="entity-sub">Modificações: ${escapeHtml(mods)}</span>` : ""}
                    ${cfg.efeitoExtra ? `<span class="entity-sub">Efeito extra: ${escapeHtml(cfg.efeitoExtra)}</span>` : ""}
                </div>
                <div class="entity-badges">
                    ${(ehFogo && !escopeta && carregadorAnexado) ? `<span class="mod-pill positivo" title="Tem um carregador anexado">🔵 Carregada</span>` : ""}
                    <button type="button" class="btn-toggle-equipada ${equipadaArma ? "ligado" : "desligado"}" ${podeEquiparArma ? "" : "disabled"} title="${podeEquiparArma ? (equipadaArma ? "Empunhada agora — clique pra desequipar" : "Desequipada — clique pra empunhar e poder usar em combate") : "Precisa estar em 'Levando consigo' pra equipar"}">${equipadaArma ? "🗡️ Equipada" : "○ Desequipada"}</button>
                    <button type="button" class="btn-usar-item btn-blue" ${podeUsar ? "" : "disabled"} title="${podeUsar ? `Rolar d20 + ${arma.periciaUso}` : (equipadaArma ? "Precisa estar em 'Levando consigo' e ter perícia vinculada" : "Equipe a arma pra poder usá-la em combate")}">Usar</button>
                    ${(ehFogo && !escopeta) ? `<button type="button" class="btn-recarregar-item btn-blue" ${podeUsar ? "" : "disabled"} title="Trocar o carregador anexado por um com mais munição">Recarregar</button>` : ""}
                    ${(ehFogo && !escopeta) ? `<button type="button" class="btn-retirar-carregador-item btn-ghost" ${(podeUsar && carregadorAnexado) ? "" : "disabled"} title="Retirar o carregador anexado e devolvê-lo ao inventário">Retirar carregador</button>` : ""}
                </div>
            `;
            li.querySelector(".btn-toggle-equipada").addEventListener("click", (e) => {
                e.stopPropagation();
                if (!podeEquiparArma) return;
                alternarEquipadaItem(arma.id, !equipadaArma, arma.nome);
            });
            li.querySelector(".btn-usar-item").addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!podeUsar) return;
                await iniciarUsoItem(arma, modificadoresPlanos);
            });
            const btnRecarregarCombate = li.querySelector(".btn-recarregar-item");
            if (btnRecarregarCombate) {
                btnRecarregarCombate.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await recarregarArma(arma.id, arma);
                });
            }
            const btnRetirarCarregadorCombate = li.querySelector(".btn-retirar-carregador-item");
            if (btnRetirarCarregadorCombate) {
                btnRetirarCarregadorCombate.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (!carregadorAnexado) return;
                    await retirarCarregadorArma(arma.id, arma);
                });
            }
            li.addEventListener("click", () => abrirModalEdicao("inventario", arma.id));
            el.listaArmasCombate.appendChild(li);
        });
    }

    renderizarManobrasCombate();
}

// Manobras de combate (lista fixa do manual). Cada perícia listada na
// manobra que o jogador de fato possui na ficha vira um botão — clicar
// nela rola d20 + o total daquela perícia e registra no Log de Dados.
// Perícias que o jogador não tem ficam só como texto (não clicáveis).
function renderizarManobrasCombate() {
    if (!el.listaManobrasCombate) return;
    const modificadoresPlanos = coletarModificadores(fichaAtual);
    el.listaManobrasCombate.innerHTML = "";

    // "Arremessar" (CQC nível 3+) e "Imobilizar" (CQC nível 4+) não são
    // manobras "de qualquer perícia" do manual — são exclusivas de quem
    // tem o nível, por isso só entram na lista quando o personagem
    // atende o requisito (ver MANOBRA_ARREMESSAR_CQC/MANOBRA_IMOBILIZAR_CQC
    // em dados-manual.js).
    const entradaCQCLista = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
    const nivelCQCLista = entradaCQCLista ? (Number(entradaCQCLista[1].nivel) || 0) : 0;
    // Mesma ideia acima, pra Jiu Jitsu (manual pg. 22 — ver
    // MANOBRA_IMOBILIZAR_JIUJITSU/MANOBRA_QUEBRAR_OSSOS_JIUJITSU em
    // dados-manual.js): "Imobilizar (Jiu Jitsu)" nível 2+, "Quebrar
    // ossos" nível 4+.
    const entradaJJLista = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "Jiu Jitsu");
    const nivelJJLista = entradaJJLista ? (Number(entradaJJLista[1].nivel) || 0) : 0;
    const manobrasParaExibir = [...MANOBRAS_COMBATE];
    if (nivelCQCLista >= 3) manobrasParaExibir.push(MANOBRA_ARREMESSAR_CQC);
    if (nivelCQCLista >= 4) manobrasParaExibir.push(MANOBRA_IMOBILIZAR_CQC);
    if (nivelJJLista >= 2) manobrasParaExibir.push(MANOBRA_IMOBILIZAR_JIUJITSU);
    if (nivelJJLista >= 4) manobrasParaExibir.push(MANOBRA_QUEBRAR_OSSOS_JIUJITSU);

    manobrasParaExibir.forEach(m => {
        const li = document.createElement("li");

        // "Esquivar" não usa uma perícia treinável — é Agilidade (o
        // atributo secundário) contra a pontuação do ataque sofrido.
        // Por isso tem um botão fixo próprio em vez de percorrer
        // m.pericias (que ficaria em branco/"Sem Perícia", já que
        // "Agilidade" nunca bate com o nome de nenhuma perícia
        // cadastrada) e sem o fallback "Sem Perícia" (não existe
        // "Agilidade destreinada" — todo personagem tem o atributo).
        const ehEsquivar = m.nome === "Esquivar";
        // "Arremessar" também não tem fallback "Sem Perícia" — é
        // exclusiva de CQC nível 3+, não existe "versão destreinada".
        const ehArremessar = m.nome === "Arremessar";
        // "Imobilizar" também não tem fallback "Sem Perícia" — é
        // exclusiva de CQC nível 4+, não existe "versão destreinada".
        const ehImobilizar = m.nome === "Imobilizar";
        // "Imobilizar (Jiu Jitsu)" — exclusiva de Jiu Jitsu nível 2+
        // (manual: "usuário pode escolher entre usar a perícia Jiu
        // Jitsu, Força ou Destreza"), por isso 3 botões em vez de 1.
        const ehImobilizarJJ = m.nome === "Imobilizar (Jiu Jitsu)";
        // "Quebrar ossos" — exclusiva de Jiu Jitsu nível 4+, sem
        // rolagem (automática contra quem já está Imobilizado por você).
        const ehQuebrarOssosJJ = m.nome === "Quebrar ossos";
        const periciasHtml = ehEsquivar
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Agilidade" title="Rolar d20 + Agilidade">Agilidade 🎲</button>`
            : (ehArremessar || ehImobilizar)
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="CQC" title="Rolar d20 + CQC">CQC 🎲</button>`
            : ehImobilizarJJ
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Jiu Jitsu" title="Rolar d20 + Jiu Jitsu">Jiu Jitsu 🎲</button>
               <button type="button" class="btn-pericia-golpe" data-pericia-golpe="Força" title="Rolar d20 + Força">Força 🎲</button>
               <button type="button" class="btn-pericia-golpe" data-pericia-golpe="Destreza" title="Rolar d20 + Destreza">Destreza 🎲</button>`
            : ehQuebrarOssosJJ
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Quebrar Ossos" title="Aplicar dano automático de Quebrar ossos">Quebrar ossos 🦴</button>`
            : m.pericias.map(nomePericia => {
                const entrada = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === nomePericia);
                if (!entrada) return `<span class="manobra-pericia-texto">${escapeHtml(nomePericia)}</span>`;
                return `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="${escapeHtml(nomePericia)}" title="Rolar d20 + ${nomePericia}">${escapeHtml(nomePericia)} 🎲</button>`;
            }).join(", ") + ` <button type="button" class="btn-pericia-golpe btn-ghost" data-pericia-golpe="Sem Perícia" title="Rolar sem perícia treinada (-1 fixo)">Sem Perícia 🎲</button>`;

        // Boxe dá bônus passivo pra esquivar desarmado (+2) e contra
        // armas brancas (+1) — manual pg. 22. Mostramos o bônus já
        // calculado pra referência (a rolagem em si soma Agilidade, ver
        // botão acima; o bônus de Boxe entra como parte do modificador
        // de Agilidade se você já tiver isso configurado como
        // modificador estruturado — aqui é só o texto informativo).
        let efeitoTexto = m.efeito;
        if (m.nome === "Esquivar") {
            const entradaBoxe = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "Boxe");
            const bonus = entradaBoxe ? bonusEsquivaBoxe(entradaBoxe[1].nivel) : null;
            if (bonus) {
                efeitoTexto += ` · Bônus de Boxe: +${bonus.desarmado} vs. golpe desarmado, +${bonus.armaBranca} vs. arma branca`;
            }
        }
        if (m.nome === "Desarmar") {
            const entradaCQC = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
            const nivelCQC = entradaCQC ? (Number(entradaCQC[1].nivel) || 0) : 0;
            const bonusCQC = bonusCQCDesarmar(nivelCQC);
            if (bonusCQC) {
                efeitoTexto += ` · CQC nível ${nivelCQC}: +${bonusCQC} rolando com CQC`;
            }
        }

        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(m.nome)}</span>
                <span class="entity-sub manobra-pericias-linha">${periciasHtml} · dif.: ${escapeHtml(m.dificuldade)}</span>
                <span class="entity-sub">${escapeHtml(efeitoTexto)}</span>
            </div>
            <span class="manobra-alcance">${escapeHtml(m.alcance)}</span>
        `;

        li.querySelectorAll("[data-pericia-golpe]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();

                if (ehEsquivar) {
                    await executarManobraEsquivar(modificadoresPlanos);
                    return;
                }

                // Imobilizar (Jiu Jitsu) — nível 2+ (manual: "usuário
                // pode escolher entre usar a perícia Jiu Jitsu, Força ou
                // Destreza"). Força/Destreza são ATRIBUTOS puros, não
                // batem com nenhuma entrada de fichaAtual.pericias, por
                // isso trata antes do lookup/early-return padrão logo
                // abaixo (que mataria o clique nesses dois botões).
                if (ehImobilizarJJ) {
                    if (!combateTemParticipantes()) {
                        toast("Imobilizar (Jiu Jitsu) precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const nomeBase = btn.dataset.periciaGolpe;
                    let modificador;
                    if (nomeBase === "Jiu Jitsu") {
                        const entradaJJ = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "Jiu Jitsu");
                        if (!entradaJJ) return;
                        modificador = calcularTotalPericia(entradaJJ[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia("Jiu Jitsu")).total;
                    } else {
                        const atributo = nomeBase === "Força" ? "forca" : "destreza";
                        modificador = (Number(fichaAtual.dados[atributo]) || 0) + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica");
                    }
                    abrirModalSelecionarAlvoImobilizarJJ(nomeBase, modificador, nivelJJLista);
                    return;
                }

                // Quebrar ossos (Jiu Jitsu nível 4+) — sem rolagem, só
                // precisa de um alvo já Imobilizado por você (ver
                // abrirModalQuebrarOssosJJ).
                if (ehQuebrarOssosJJ) {
                    abrirModalQuebrarOssosJJ(null, nivelJJLista);
                    return;
                }

                const nomePericia = btn.dataset.periciaGolpe;
                const semPericia = nomePericia === "Sem Perícia";
                const entrada = semPericia ? null : Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === nomePericia);
                if (!semPericia && !entrada) return;

                // Agarrar (manual): teste vs. "10 + Força do alvo", sem
                // dano — resolve num fluxo próprio (resolverAgarrar), não
                // no de dano/Esquiva-Bloqueio-Aparar que vale pro resto
                // das manobras.
                if (m.nome === "Agarrar") {
                    if (!combateTemParticipantes()) {
                        toast("Agarrar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalSelecionarAlvoAgarrar(nomePericia, modificador);
                    return;
                }

                // Desarmar (manual): mesma ideia do Agarrar — resolve num
                // fluxo próprio (resolverDesarmar), sem dano direto.
                // CQC nível 1 dá +1 quando a perícia rolada é CQC de
                // verdade (ver bonusCQCDesarmar em dados-manual.js).
                if (m.nome === "Desarmar") {
                    if (!combateTemParticipantes()) {
                        toast("Desarmar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    let modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    if (nomePericia === "CQC") {
                        const entradaCQC = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
                        const nivelCQC = entradaCQC ? (Number(entradaCQC[1].nivel) || 0) : 0;
                        modificador += bonusCQCDesarmar(nivelCQC);
                    }
                    abrirModalSelecionarAlvoDesarmar(nomePericia, modificador);
                    return;
                }

                // Derrubar (manual): mesma ideia do Agarrar/Desarmar —
                // resolve num fluxo próprio (resolverDerrubar), sem dano
                // direto (a menos que o Mestre confirme o bônus de CQC
                // nível 2, marcado como checkbox na modal de alvo — ver
                // abrirModalSelecionarAlvoDerrubar). O +1 de iniciativa
                // do mesmo nível é oferecido em outro momento (ao rolar
                // iniciativa — ver abrirModalBonusIniciativaCQC), não aqui.
                if (m.nome === "Derrubar") {
                    if (!combateTemParticipantes()) {
                        toast("Derrubar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    const entradaCQCDerrubar = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
                    const nivelCQCDerrubar = entradaCQCDerrubar ? (Number(entradaCQCDerrubar[1].nivel) || 0) : 0;
                    abrirModalSelecionarAlvoDerrubar(nomePericia, modificador, nivelCQCDerrubar);
                    return;
                }

                // Arremessar (CQC nível 3+, exclusiva — ver
                // MANOBRA_ARREMESSAR_CQC em dados-manual.js): precisa de
                // uma faca/adaga EQUIPADA (ver itemPodeEquipar em
                // inventario.js) e escolhe até 3 alvos numa modal própria
                // (resolve tudo em resolverArremessar).
                if (m.nome === "Arremessar") {
                    if (!combateTemParticipantes()) {
                        toast("Arremessar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const itemFaca = Object.values(fichaAtual.inventario || {}).find(it => ehFacaOuAdaga(it.nome) && it.categoria === "levando" && it.equipada);
                    if (!itemFaca) {
                        toast("Equipe uma faca ou adaga (Levando consigo + Equipada) pra poder arremessar.", "erro");
                        return;
                    }
                    const modificador = calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalArremessar(nomePericia, modificador, itemFaca);
                    return;
                }

                // Imobilizar (CQC nível 4, manual — ver
                // MANOBRA_IMOBILIZAR_CQC em dados-manual.js): igual
                // Agarrar/Desarmar, resolve num fluxo próprio
                // (resolverImobilizar), sem dano direto. A modal de
                // alvo (abrirModalSelecionarAlvoImobilizar) já filtra
                // pra só mostrar quem está Derrubado.
                if (m.nome === "Imobilizar") {
                    if (!combateTemParticipantes()) {
                        toast("Imobilizar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalSelecionarAlvoImobilizar(nomePericia, modificador);
                    return;
                }

                // Delimitar alcance / Retomar alcance (manual): mesma
                // ideia do Agarrar — resolvem num fluxo próprio, sem
                // dano direto. Delimitar ainda pede pra escolher QUAL
                // alcance impor (campo extra no modal de alvo).
                if (m.nome === "Delimitar alcance") {
                    if (!combateTemParticipantes()) {
                        toast("Delimitar alcance precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalSelecionarAlvoDelimitar(nomePericia, modificador);
                    return;
                }
                if (m.nome === "Retomar alcance") {
                    if (!combateTemParticipantes()) {
                        toast("Retomar alcance precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalSelecionarAlvoRetomar(nomePericia, modificador);
                    return;
                }

                // Soco/Chute/Joelhada/Cotovelada têm dano automatizável
                // (1dForça + Força [escala], manual pg. 49-50) sem precisar
                // de item no inventário. Com combate ativo, resolve o
                // ataque completo (acerto x defesa + dano no alvo); sem
                // combate ativo, só mostra o dano potencial junto da
                // rolagem de perícia, pra referência.
                if (ehGolpeDesarmadoComDano(m.nome)) {
                    // Especificidades de perícia (manual pg. 22): Muay Thai
                    // aumenta a escala de Chute/Joelhada em níveis mais
                    // altos, Boxe multiplica o dado do Soco, Karatê Cobra
                    // Kai e Força Bruta dispensam a rolagem (dano máximo).
                    // "Sem Perícia" (golpe sem treinamento) usa a escala
                    // padrão do golpe, sem nenhuma especificidade — e o d20
                    // rola com -1 fixo, igual a qualquer perícia ausente.
                    const nivelPericia = semPericia ? 0 : (Number(entrada[1].nivel) || 0);
                    const especificidade = calcularEspecificidadeGolpe(m.nome, nomePericia, nivelPericia);
                    const itemDesarmado = {
                        nome: m.nome,
                        periciaUso: nomePericia,
                        arma: {
                            danoBase: 0, escala: null, tipoDano: "contusao", desarmado: true,
                            escalaMult: especificidade.escalaMult,
                            dadoMultiplicador: especificidade.dadoMultiplicador,
                            danoMaximoSemRolar: especificidade.danoMaximoSemRolar
                        }
                    };
                    if (combateTemParticipantes()) {
                        abrirModalSelecionarAlvo(itemDesarmado, modificadoresPlanos);
                    } else {
                        const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                        const forcaAtual = Number(fichaAtual.dados.forca) || 0;
                        const danoCalc = calcularDanoDesarmado(forcaAtual, especificidade.escalaMult, especificidade);
                        const dadoTexto = danoCalc.dadoMultiplicador > 1
                            ? `1d${danoCalc.faces}×${danoCalc.dadoMultiplicador}: ${danoCalc.dado}×${danoCalc.dadoMultiplicador}=${danoCalc.dadoTotal}`
                            : `1d${danoCalc.faces}: ${danoCalc.dado}`;
                        await rolarERegistrar(`${m.nome} (${nomePericia}) · dano potencial ${danoCalc.total} (${dadoTexto} + ${danoCalc.bonusEscala})`, modificador, nomePericia === "CQC");
                    }
                    return;
                }

                const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                await rolarERegistrar(`${m.nome} (${nomePericia})`, modificador, nomePericia === "CQC");
            });
        });

        el.listaManobrasCombate.appendChild(li);
    });
}

// ---------------------------------------------------------------------
// VANTAGENS / DESVANTAGENS / FATOS UNIVERSAIS
// ---------------------------------------------------------------------
function renderizarVantagensDesvantagens() {
    const podeEditar = podeEditarCaracteristicaNarrativa();
    // Botões "+ Adicionar" só ficam visíveis durante a Criação (ou pro
    // Mestre, a qualquer momento) — correção do exploit de edição livre.
    el.btnAddVantagem.style.display = podeEditar ? "inline-block" : "none";
    el.btnAddFato.style.display = podeEditar ? "inline-block" : "none";

    // Desvantagem: além da trava normal de edição, tem o limite de no
    // máximo MAX_DESVANTAGENS (3) cadastradas. Pro Mestre (que pode
    // editar characterísticas a qualquer momento) o limite não se aplica,
    // já que NPCs/exceções narrativas ficam a critério dele.
    const jaNoLimite = !isMestre && !podeAdicionarDesvantagem(fichaAtual);
    el.btnAddDesvantagem.style.display = podeEditar ? "inline-block" : "none";
    el.btnAddDesvantagem.disabled = jaNoLimite;
    el.btnAddDesvantagem.title = jaNoLimite
        ? `Limite de ${MAX_DESVANTAGENS} desvantagens atingido.`
        : "";

    renderizarListaSimples(el.listaVantagens, fichaAtual.vantagens || {}, (id, v) => ({
        nome: v.nome || "(sem nome)", sub: v.descricao || "", direita: resumoModificadores(v)
    }), "vantagens");

    renderizarListaSimples(el.listaDesvantagens, fichaAtual.desvantagens || {}, (id, v) => ({
        nome: v.nome || "(sem nome)", sub: v.descricao || "", direita: resumoModificadores(v)
    }), "desvantagens");

    renderizarAreaBonusDesvantagens();

    renderizarListaSimples(el.listaFatos, fichaAtual.fatosUniversais || {}, (id, v) => ({
        nome: v.nome || "(sem nome)", sub: v.descricao || "", direita: resumoModificadores(v)
    }), "fatosUniversais");
}

function renderizarAreaBonusDesvantagens() {
    const c = fichaAtual.criacao;
    const bonusTotal = pontosBonusPorDesvantagens(fichaAtual);
    const restante = Math.max(0, bonusTotal - (c.bonusGasto || 0));
    c.pontosBonusDesvantagens = restante;

    el.bonusDesvantagensArea.innerHTML = "";
    if (bonusTotal === 0) return;

    const header = document.createElement("div");
    header.className = "section-header";
    header.innerText = "Pontos bônus de desvantagens";
    el.bonusDesvantagensArea.appendChild(header);

    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos bônus disponíveis</span><strong>${restante}</strong>`;
    el.bonusDesvantagensArea.appendChild(banner);

    if (restante <= 0) {
        const hint = document.createElement("p");
        hint.className = "hint";
        hint.innerText = "Todos os pontos bônus já foram gastos.";
        el.bonusDesvantagensArea.appendChild(hint);
        return;
    }

    montarDistribuidorBonus(c, () => renderizarVantagensDesvantagens(), el.bonusDesvantagensArea);
}

function resumoModificadores(entidade) {
    const mods = entidade.modificadores || [];
    if (!mods.length) return "";
    return mods.map(m => `${rotuloAlvo(m.alvo)} ${m.valor >= 0 ? "+" : ""}${m.valor}`).join(" · ");
}

// ---------------------------------------------------------------------
// ESPECIALIZAÇÕES
// ---------------------------------------------------------------------
function renderizarEspecializacoes() {
    renderizarListaSimples(el.listaEspecializacoes, fichaAtual.especializacoes || {}, (id, v) => ({
        nome: v.nome || "(sem nome)", sub: v.descricao || "", direita: resumoModificadores(v)
    }), "especializacoes");
}

// ---------------------------------------------------------------------
// TREINAMENTO
// ---------------------------------------------------------------------
function renderizarTreinamento() {
    el.treinoGrid.innerHTML = "";
    const treino = fichaAtual.treinamento;

    TIPOS_TREINO.forEach(({ tipo, label, opcoes }) => {
        const atual = treino[tipo];
        const card = document.createElement("div");
        card.className = "treino-card";

        if (atual) {
            const pct = atual.totalDias > 0 ? Math.min(100, Math.round((atual.progressoDias / atual.totalDias) * 100)) : 0;
            const nomeExibido = tipo.startsWith("atributo") ? labelAtributo(atual.nome) : atual.nome;
            card.innerHTML = `
                <span class="treino-card-titulo">${label}</span>
                <span class="entity-nome">${escapeHtml(nomeExibido)} → nível ${atual.novoNivel}</span>
                <div class="treino-progresso-bar"><div class="treino-progresso-fill" style="width:${pct}%;"></div></div>
                <span class="treino-progresso-texto">${atual.progressoDias} / ${atual.totalDias} dias</span>
                <button type="button" class="btn-ghost btn-cancelar-treino">Cancelar treino</button>
            `;
            card.querySelector(".btn-cancelar-treino").addEventListener("click", async () => {
                cancelarTreinoCaracteristica(fichaAtual, tipo);
                await salvarTreinamento();
            });
        } else {
            const select = document.createElement("select");
            select.innerHTML = `<option value="">-- escolha --</option>`;
            const ehAtributo = tipo.startsWith("atributo");
            const limite = ehAtributo ? 7 : 5;
            opcoes().forEach(nome => {
                const nivelAtual = ehAtributo
                    ? (Number(fichaAtual.dados[nome]) || 0)
                    : ((Object.values(fichaAtual.pericias).find(p => p.nome === nome) || {}).nivel || 0);
                if (nivelAtual >= limite) return; // já no limite, não oferece pra treinar
                const opt = document.createElement("option");
                opt.value = nome;
                const nomeExibido = ehAtributo ? labelAtributo(nome) : nome;
                opt.innerText = `${nomeExibido} (atual: ${nivelAtual})`;
                select.appendChild(opt);
            });
            const btn = document.createElement("button");
            btn.className = "btn-lime";
            btn.type = "button";
            btn.innerText = "Iniciar treino";
            card.innerHTML = `<span class="treino-card-titulo">${label}</span>`;
            card.appendChild(select);
            card.appendChild(btn);
            btn.addEventListener("click", async () => {
                if (!select.value) { toast("Escolha uma opção antes.", "erro"); return; }
                if (tipo === "periciaFisica" || tipo === "periciaMental") {
                    const jaTem = Object.values(fichaAtual.pericias).find(p => p.nome === select.value);
                    if (!jaTem) {
                        const requisito = atendeRequisitoPericia(select.value, fichaAtual.dados, fichaAtual.pericias);
                        if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
                    }
                }
                const iniciou = iniciarTreinoCaracteristica(fichaAtual, tipo, select.value);
                if (!iniciou) { toast("Essa característica já está no limite máximo.", "erro"); return; }
                await salvarTreinamento();
            });
        }
        el.treinoGrid.appendChild(card);
    });
}

async function salvarTreinamento() {
    await update(ref(db, `${caminhoBase()}/treinamento`), fichaAtual.treinamento);
}

// ---------------------------------------------------------------------
// RECEITAS — uma seção pra cada perícia de criação de item (Ferramenta
// de Criação geral ou química, ver PERICIAS_CRIACAO_ITEM em
// dados-manual.js) que estiver cadastrada na ficha, com a lista de
// receitas daquela perícia — vindas do Banco Global de Receitas
// (receitas-globais.js), compartilhado entre TODAS as mesas, igual o
// Banco Global de Itens. O botão "+ Criar receita" no fim da aba
// funciona tanto pro jogador quanto pro Mestre (ver abrirModalCriarReceita).
// ---------------------------------------------------------------------
// Formata a lista estruturada de ingredientes (r.ingredientes, cada um
// { material, quantidade }) num texto tipo "2x Metal leve, 1x Propelente".
// Fichas antigas podem ter só o campo legado `materiais` (texto livre,
// de antes dessa lista existir) — nesse caso mostra o texto legado.
function formatarIngredientes(r) {
    if (Array.isArray(r?.ingredientes) && r.ingredientes.length) {
        return r.ingredientes.map(ing => `${ing.quantidade}x ${ing.material}${ing.qualidade ? ` (${ing.qualidade})` : ""}`).join(", ");
    }
    if (r?.materiais) return r.materiais;
    return null;
}

// Índice do tier de qualidade escolhido dentro da lista de qualidades
// daquele material (0 = a mais baixa). -1 se o material não tem
// variação de qualidade, ou se a qualidade não foi informada.
function indiceQualidade(materialNome, qualidade) {
    const qualidades = qualidadesDoMaterial(materialNome);
    if (!qualidades || !qualidade) return -1;
    return qualidades.indexOf(qualidade);
}

// Nível do item → tier mínimo de qualidade de material exigido pelo
// manual: nível 1-2 pede a qualidade mais baixa, 3-4 pede a do meio, 5
// só com a mais alta (ver seção "Criar e modificar itens").
function tierMinimoExigidoPeloNivel(nivelItem) {
    if (nivelItem >= 5) return 2;
    if (nivelItem >= 3) return 1;
    return 0;
}

// Trava dura do manual: materialABAIXO do tier mínimo do nível não pode
// ser usado NESSA receita, ponto (não é só "sem bônus" — é inutilizável).
// Baixa só cria nível 1-2, Média cria 2-4, só Alta cria nível 5. Material
// sem variação de qualidade (Material bélico, Material especial) não tem
// esse conceito de tier — sempre qualifica. Item de material antigo sem
// qualidade marcada (herdado de antes desse campo existir) é tratado como
// a qualidade mais baixa (tier 0) só pra essa checagem — não ganha bônus
// (ver indiceQualidade), mas também não fica travado sem explicação.
function materialQualificaParaNivel(materialNome, qualidade, tierMinimo) {
    const qualidades = qualidadesDoMaterial(materialNome);
    if (!qualidades) return true;
    const idx = qualidade ? qualidades.indexOf(qualidade) : 0;
    return idx >= tierMinimo;
}

// Itens do inventário do personagem que servem como este ingrediente:
// tag "material" e mesmo tipo (materialTipo) — ou, pra itens antigos
// cadastrados antes desse campo existir, mesmo nome do material.
function materiaisDisponiveisNoInventario(materialNome) {
    const alvo = materialNome.trim().toLowerCase();
    return Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => it.tag === "material" && (it.materialTipo === materialNome || (!it.materialTipo && (it.nome || "").trim().toLowerCase() === alvo)))
        .map(([id, it]) => ({ id, ...it }));
}

// Agrupa os itens de material do inventário por qualidade, somando a
// quantidade em estoque de cada tier (materialQuantidade — itens antigos
// sem esse campo contam como 1 unidade cada, pra não quebrar fichas de
// antes dessa mudança). Cada grupo guarda as entradas de onde descontar
// (id + quantidade), em ordem — é o que abrirModalEscolherMateriais usa
// pra consumir estoque de verdade ao confirmar a criação. Ordenado da
// qualidade mais alta pra mais baixa (material sem variação de qualidade
// vira um grupo único, "qualidade: null").
function materiaisAgregadosPorQualidade(materialNome) {
    const entradas = materiaisDisponiveisNoInventario(materialNome);
    const grupos = new Map();
    entradas.forEach(it => {
        const qtd = Math.max(0, Number(it.materialQuantidade ?? 1) || 0);
        if (qtd <= 0) return;
        const chave = it.materialQualidade || "";
        if (!grupos.has(chave)) grupos.set(chave, { qualidade: it.materialQualidade || null, disponivel: 0, entradas: [] });
        const grupo = grupos.get(chave);
        grupo.disponivel += qtd;
        grupo.entradas.push({ id: it.id, quantidade: qtd });
    });
    const qualidades = qualidadesDoMaterial(materialNome);
    return Array.from(grupos.values()).sort((a, b) => {
        const ia = qualidades && a.qualidade ? qualidades.indexOf(a.qualidade) : -1;
        const ib = qualidades && b.qualidade ? qualidades.indexOf(b.qualidade) : -1;
        return ib - ia;
    });
}

// Desconta `quantidadeNecessaria` unidades de material a partir dos
// grupos (na ordem em que vierem — normalmente com o grupo escolhido
// pelo jogador primeiro, depois os demais como "troco" se faltar).
// Retorna as atualizações de inventário a aplicar (id -> materialQuantidade
// restante, ou null pra apagar o item quando a quantidade zera) e quanto
// sobrou sem descontar (0 se conseguiu cobrir tudo).
function planejarConsumoMaterial(grupos, quantidadeNecessaria) {
    let faltando = quantidadeNecessaria;
    const atualizacoes = {};
    for (const grupo of grupos) {
        if (faltando <= 0) break;
        for (const entrada of grupo.entradas) {
            if (faltando <= 0) break;
            const usar = Math.min(entrada.quantidade, faltando);
            const restante = entrada.quantidade - usar;
            atualizacoes[entrada.id] = restante > 0 ? restante : null;
            faltando -= usar;
        }
    }
    return { atualizacoes, faltando };
}

// Modal de "Criar": antes de rolar, escolhe (opcionalmente) qual tier de
// qualidade usar pra cada ingrediente da receita — o desconto do
// inventário é automático e cobre a quantidade exigida puxando de outros
// tiers QUALIFICADOS como troco se o escolhido não tiver o suficiente
// sozinho. O botão "🎲 Rolar" fica travado se não houver material com
// qualidade suficiente (ver materialQualificaParaNivel — nível 1-2 só
// aceita Baixa+, 3-4 só Média+, 5 só Alta) pra algum ingrediente, MESMO
// que haja estoque de qualidade inferior sobrando (esse estoque não
// serve pra essa receita e não conta). Qualidade ACIMA do mínimo exigido
// reduz -1 na dificuldade da receita por tipo de material usado acima do
// mínimo (regra do manual) — aplicado direto na dificuldade dentro de
// resolverCriacaoReceita, não no modificador do teste (ver lá o motivo).
function abrirModalEscolherMateriais(receita, periciaNome, modificadorBase) {
    let modal = document.getElementById("modal-escolher-materiais");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-escolher-materiais";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const ingredientes = Array.isArray(receita.ingredientes) ? receita.ingredientes : [];
    const nivelItem = Number(receita.nivel) || 1;
    const tierMinimo = tierMinimoExigidoPeloNivel(nivelItem);

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Criar — ${escapeHtml(receita.nome || "item")}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        ${!ingredientes.length
            ? `<p class="hint">Essa receita não tem materiais cadastrados — pode rolar direto.</p>`
            : `<p class="hint">Materiais são descontados automaticamente do inventário ao confirmar. Material abaixo da qualidade mínima do nível ${nivelItem} não pode ser usado nesta receita; qualidade ACIMA do mínimo reduz -1 na dificuldade por tipo de material usado.</p>
               <div id="materiais-escolha-lista"></div>`
        }
        <div class="modal-btns">
            <button type="button" class="btn-ghost" id="btn-ir-inventario">Ir pro Inventário</button>
            <button type="button" class="btn-lime" id="btn-confirmar-materiais">🎲 Rolar</button>
        </div>
    `;

    const lista = modal.querySelector("#materiais-escolha-lista");
    const btnConfirmar = modal.querySelector("#btn-confirmar-materiais");

    // Reavalia se dá pra rolar: precisa ter, pra CADA ingrediente, estoque
    // de qualidade QUALIFICADA (>= mínimo do nível) suficiente pra cobrir
    // a quantidade exigida — estoque de qualidade inferior não conta.
    function atualizarEstadoBotao() {
        if (!lista) { btnConfirmar.disabled = false; btnConfirmar.title = ""; return; }
        const linhas = [...lista.querySelectorAll(".material-escolha-linha")];
        const faltando = linhas.filter(linha => linha.dataset.suficiente === "0");
        btnConfirmar.disabled = faltando.length > 0;
        btnConfirmar.title = faltando.length
            ? `Falta material: ${faltando.map(l => l.dataset.material).join(", ")}`
            : "";
    }

    ingredientes.forEach((ing, idx) => {
        const qualidades = qualidadesDoMaterial(ing.material);
        const grupos = materiaisAgregadosPorQualidade(ing.material);
        const gruposQualificados = grupos.filter(g => materialQualificaParaNivel(ing.material, g.qualidade, tierMinimo));
        const gruposInsuficientes = grupos.filter(g => !gruposQualificados.includes(g));
        const totalQualificado = gruposQualificados.reduce((acc, g) => acc + g.disponivel, 0);
        const totalInsuficiente = gruposInsuficientes.reduce((acc, g) => acc + g.disponivel, 0);
        const suficiente = totalQualificado >= ing.quantidade;

        const linha = document.createElement("div");
        linha.className = "receita-ingrediente-linha material-escolha-linha";
        linha.dataset.idx = idx;
        linha.dataset.material = ing.material;
        linha.dataset.suficiente = suficiente ? "1" : "0";

        const avisoQualidadeBaixa = totalInsuficiente > 0
            ? `<span class="entity-sub" style="color:var(--neon-red);">+ ${totalInsuficiente}x de qualidade abaixo do mínimo — não servem pra nível ${nivelItem}</span>`
            : "";
        const statusEstoque = suficiente
            ? `<span class="entity-sub">Em estoque (qualidade suficiente): ${totalQualificado}x</span>`
            : `<span class="entity-sub" style="color:var(--neon-red);">Faltam materiais — em estoque com qualidade suficiente: ${totalQualificado}x, precisa de ${ing.quantidade}x</span>`;

        const cabecalho = document.createElement("div");
        cabecalho.className = "entity-main";
        cabecalho.innerHTML = `
            <span class="entity-nome">${ing.quantidade}x ${escapeHtml(ing.material)}</span>
            ${qualidades ? `<span class="entity-sub">Mínimo pro nível ${nivelItem}: ${qualidades[tierMinimo]}</span>` : ""}
            ${statusEstoque}
            ${avisoQualidadeBaixa}
        `;
        linha.appendChild(cabecalho);

        // Só mostra o select de tier se houver mais de um tier QUALIFICADO
        // com estoque (material abaixo do mínimo nem aparece aqui — não
        // dá pra escolher usar algo que a receita não aceita).
        if (gruposQualificados.length > 1) {
            const selectQualidade = document.createElement("select");
            selectQualidade.className = "material-escolha-tier";
            gruposQualificados.forEach(g => {
                const opt = document.createElement("option");
                opt.value = g.qualidade || "";
                opt.innerText = `${g.qualidade || "Sem qualidade marcada"} — ${g.disponivel}x disponível`;
                selectQualidade.appendChild(opt);
            });
            linha.appendChild(selectQualidade);
        }

        lista.appendChild(linha);
    });

    atualizarEstadoBotao();

    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-ir-inventario").addEventListener("click", () => {
        modal.remove();
        document.querySelector('.tab-btn[data-tab="inventario"]')?.click();
    });

    btnConfirmar.addEventListener("click", async () => {
        if (btnConfirmar.disabled) return;
        // Não desconta nada do inventário ainda — só decide QUAL estoque
        // (tier + entradas) cobriria cada ingrediente. O desconto de
        // verdade só acontece depois de rolar, em resolverCriacaoReceita,
        // porque a QUANTIDADE gasta de cada material depende do desfecho
        // do teste (sucesso gasta tudo, falha só uma fração, falha
        // crítica gasta tudo — ver regras do manual em resolverCriacaoReceita).
        let bonusQualidade = 0;
        const escolhas = [];

        if (lista) lista.querySelectorAll(".material-escolha-linha").forEach(linha => {
            const material = linha.dataset.material;
            const ing = ingredientes.find(i => i.material === material);
            if (!ing) return;
            const grupos = materiaisAgregadosPorQualidade(material)
                .filter(g => materialQualificaParaNivel(material, g.qualidade, tierMinimo));
            if (!grupos.length) return;

            const selectTier = linha.querySelector(".material-escolha-tier");
            const qualidadeEscolhida = selectTier ? (selectTier.value || null) : (grupos[0].qualidade || null);

            // Puxa primeiro do tier escolhido; se não tiver o suficiente
            // sozinho, completa com os demais tiers QUALIFICADOS como
            // troco (nunca com material abaixo do mínimo — esse já foi
            // filtrado acima e não entra nem como troco).
            const grupoEscolhido = grupos.find(g => (g.qualidade || null) === qualidadeEscolhida);
            const gruposOrdenados = grupoEscolhido
                ? [grupoEscolhido, ...grupos.filter(g => g !== grupoEscolhido)]
                : grupos;

            const idx = indiceQualidade(material, qualidadeEscolhida);
            if (idx > tierMinimo) bonusQualidade += 1;
            escolhas.push({ material, qualidade: qualidadeEscolhida, quantidade: ing.quantidade, gruposOrdenados });
        });

        // O bônus de qualidade NÃO entra no modificador do teste — ele
        // reduz a DIFICULDADE diretamente (ver resolverCriacaoReceita),
        // exatamente como o manual descreve ("-1 na dificuldade por tipo
        // de material de nível maior usado"). Isso importa porque o
        // modificador do teste de perícia tem um teto (+10) que essa
        // redução não deve competir com nem ficar sujeita.
        modal.remove();
        await resolverCriacaoReceita(receita, escolhas, bonusQualidade, modificadorBase);
    });
}

// Rola o teste de criação da receita e resolve sucesso/falha comparando
// o resultado (d20 + modificador) com a dificuldade cadastrada na
// receita, aplicando as regras do manual:
//   - Sucesso (resultado >= dificuldade): gasta todo o material
//     escolhido e gera o item — direto no inventário, se a receita
//     estiver vinculada a um item do Banco Global (itemGlobalId); senão
//     cria um item básico com o nome da receita.
//   - Falha (resultado < dificuldade, sem ser falha crítica): a cada 3
//     pontos abaixo da dificuldade, perde 1/3 dos materiais escolhidos
//     (arredondando pra cima, então uma falha registra pelo menos 1
//     unidade perdida por ingrediente assim que cruzar o primeiro
//     limiar de 3 pontos) — até no máximo perder tudo (3/3). O que não
//     é perdido continua no inventário, intacto.
//   - Falha Crítica (d20 natural 1, ou resultado final <= 1): perde
//     todo o material escolhido, sem gerar item.
//   - Receita sem dificuldade cadastrada: não dá pra resolver
//     sucesso/falha automaticamente — só registra a rolagem normal e
//     gasta o material integralmente (comportamento antigo), deixando
//     a resolução a critério do Mestre.
async function resolverCriacaoReceita(receita, escolhas, bonusQualidade, modificadorFinal) {
    const consumo = checarConsumoDeAcao(false, false);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const bruto = rolarD20();
    const resultado = bruto + Number(modificadorFinal || 0);
    // Acerto/Falha Crítica olham só pro d20 puro + modificador de
    // perícia — a redução de dificuldade por qualidade NÃO participa
    // disso (ela mexe na dificuldade, não no resultado do teste).
    const criticoPositivo = resultado === 20;
    const criticoNegativo = bruto === 1 || resultado <= 1;
    const temDificuldade = receita.dificuldade || receita.dificuldade === 0;
    const dificuldadeBase = temDificuldade ? Number(receita.dificuldade) : null;
    // "-1 na dificuldade por tipo de material de nível maior usado" —
    // aplicado aqui em vez de somar no teste, pra não competir com o
    // teto de +10 do modificador de perícia. Não deixa a dificuldade
    // ajustada ficar negativa (sem efeito prático usar mais bônus do
    // que a própria dificuldade já cadastrada).
    const dificuldade = dificuldadeBase !== null ? Math.max(0, dificuldadeBase - bonusQualidade) : null;

    // fracaoPerdida: proporção do material escolhido que é de fato
    // descontada do inventário (0 a 1). Sem dificuldade cadastrada,
    // mantém o comportamento antigo (gasta tudo, sem julgar desfecho).
    let desfecho = "sem-dificuldade";
    let fracaoPerdida = 1;
    if (dificuldade !== null) {
        if (criticoNegativo) {
            desfecho = "falha-critica";
            fracaoPerdida = 1;
        } else if (resultado >= dificuldade) {
            desfecho = "sucesso";
            fracaoPerdida = 1;
        } else {
            desfecho = "falha";
            const deficit = dificuldade - resultado;
            const tercosPerdidos = Math.min(3, Math.floor(deficit / 3));
            fracaoPerdida = tercosPerdidos / 3;
        }
    }

    // Aplica o desconto de material proporcional ao desfecho — só agora
    // que já sabemos quanto de fato se perde de cada ingrediente.
    const usadosTexto = [];
    const atualizacoesInventario = {};
    escolhas.forEach(({ material, qualidade, quantidade, gruposOrdenados }) => {
        // Arredonda pra perto (não pra cima): "1/3 de 4" é ~1,33, então
        // perde 1, não 2 — mas garante ao menos 1 unidade perdida
        // sempre que fracaoPerdida > 0, pra uma falha nunca sair de
        // graça mesmo com ingrediente de quantidade baixa.
        const quantidadeGasta = fracaoPerdida <= 0
            ? 0
            : Math.min(quantidade, Math.max(1, Math.round(quantidade * fracaoPerdida)));
        if (fracaoPerdida > 0 && fracaoPerdida < 1) {
            usadosTexto.push(`${quantidadeGasta}/${quantidade}x ${material}${qualidade ? ` (${qualidade})` : ""}`);
        } else {
            usadosTexto.push(`${quantidade}x ${material}${qualidade ? ` (${qualidade})` : ""}`);
        }
        if (quantidadeGasta <= 0) return;
        const { atualizacoes } = planejarConsumoMaterial(gruposOrdenados, quantidadeGasta);
        Object.entries(atualizacoes).forEach(([id, valor]) => {
            atualizacoesInventario[id] = valor === null ? null : { ...fichaAtual.inventario[id], materialQuantidade: valor };
        });
    });

    if (Object.keys(atualizacoesInventario).length) {
        const payload = {};
        Object.entries(atualizacoesInventario).forEach(([id, valor]) => {
            fichaAtual.inventario[id] = valor;
            if (valor === null) delete fichaAtual.inventario[id];
            payload[id] = valor;
        });
        await update(ref(db, `${caminhoBase()}/inventario`), payload);
    }

    // Sucesso: gera o item de verdade no inventário — reaproveita o
    // molde do Banco Global se a receita estiver vinculada
    // (itemGlobalId); senão cria um item básico só com nome/descrição.
    let itemCriadoNome = null;
    if (desfecho === "sucesso") {
        if (!fichaAtual.inventario) fichaAtual.inventario = {};
        let registroItem = null;
        if (receita.itemGlobalId) {
            try {
                const itemBanco = await buscarItemBancoPorId(receita.itemGlobalId);
                if (itemBanco) registroItem = autopreencherItemDoBanco(itemBanco, "levando");
            } catch (e) {
                // Se o Banco falhar por qualquer motivo, cai pro item
                // básico abaixo em vez de travar a criação.
            }
        }
        if (!registroItem) {
            registroItem = {
                nome: receita.nome || "Item criado",
                descricao: receita.descricao || `Criado via receita${receita.dificuldade || receita.dificuldade === 0 ? ` (dif. ${receita.dificuldade})` : ""}.`,
                modificadores: [],
                ativo: true,
                tag: null,
                nivelTag: null,
                peso: 0,
                categoria: "levando",
                periciaUso: null,
                classeProtecao: null,
                calibre: null,
                reducoesDano: [],
                localProtegido: null,
                arma: null,
                carregador: null,
                projetil: null,
                materialTipo: null,
                materialQualidade: null,
                materialQuantidade: null
            };
        }
        const idNovoItem = gerarIdLocal();
        fichaAtual.inventario[idNovoItem] = registroItem;
        await update(ref(db, `${caminhoBase()}/inventario/${idNovoItem}`), registroItem);
        itemCriadoNome = registroItem.nome;
    }

    const notaCritico = criticoNegativo
        ? " 🔥 FALHA CRÍTICA — Fogo Amigo/Desastre! Resolução rápida pelo Mestre."
        : (criticoPositivo ? " ⚡ ACERTO CRÍTICO!" : "");

    const notaDesfecho = desfecho === "sucesso"
        ? ` ✅ Sucesso — "${itemCriadoNome}" criado e adicionado ao inventário.`
        : desfecho === "falha-critica"
            ? " 🔥 Falha Crítica — todo o material foi perdido."
            : desfecho === "falha"
                ? (fracaoPerdida > 0 ? ` ❌ Falha — perdeu ${Math.round(fracaoPerdida * 100)}% dos materiais usados.` : " ❌ Falha — nenhum material perdido.")
                : " (receita sem dificuldade cadastrada — resolução manual pelo Mestre.)";

    const listaTexto = usadosTexto.length ? ` — materiais: ${usadosTexto.join(", ")}` : "";
    const notaDificuldade = dificuldade !== null
        ? (bonusQualidade
            ? ` (dif. ${dificuldadeBase} -${bonusQualidade} por qualidade = ${dificuldade})`
            : ` (dif. ${dificuldade})`)
        : "";
    const rotulo = `Criar: ${receita.nome || "item"}${notaDificuldade}`;
    const quem = isMestre ? `Mestre (${modoNpc ? (fichaAtual?.config?.nomeExibicao || npcAtualId) : (nomeDeFicha(fichaAtualId) || "—")})` : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");

    await registrarRolagem({
        quem, modificador: modificadorFinal, resultado,
        detalhe: `${rotulo}: d20 (${bruto}) ${modificadorFinal >= 0 ? "+" : ""}${modificadorFinal}${notaCritico}${notaDesfecho}${listaTexto}`,
        critico: criticoNegativo ? "falha" : (criticoPositivo ? "acerto" : null)
    });

    const tipoToast = desfecho === "sucesso" ? "critico-acerto" : (desfecho === "falha-critica" || criticoNegativo ? "critico-falha" : "ok");
    toast(`${rotulo}: ${resultado} (d20: ${bruto} ${modificadorFinal >= 0 ? "+" : ""}${modificadorFinal})${notaDesfecho}`, tipoToast);

    if (participanteIdParaGastarAcao) {
        if (consumo.direto) {
            await consumirAcaoCombate(participanteIdParaGastarAcao);
        } else {
            await criarAcaoPendente({
                tipo: "gastar_acao_combate",
                fichaId: fichaAtualId,
                nomeJogador: quem,
                detalhe: `${quem} rolou "${rotulo}" (resultado ${resultado}) e quer gastar 1 ação do turno.`,
                payload: { participanteId: participanteIdParaGastarAcao, extraCQC: false }
            });
            toast("Gasto de ação enviado pro Mestre aprovar.");
        }
    }
}

function renderizarReceitas() {
    if (!el.receitasLista) return;
    const entradasCriacao = Object.values(fichaAtual.pericias || {})
        .filter(p => PERICIAS_CRIACAO_ITEM.includes(p.nome));
    const modificadoresPlanos = coletarModificadores(fichaAtual);

    const corpoHtml = !entradasCriacao.length
        ? `<p class="entity-list-empty" style="cursor:default;">Nenhuma perícia de criação de item (Mecânica Automotiva, Armeiro, Ofícios Utilitários, Explosivos, Eletrônica ou Química) cadastrada nesta ficha ainda.</p>`
        : entradasCriacao.map(p => {
            const nivelPericia = Number(p.nivel) || 0;
            const calcPericia = calcularTotalPericia(p, fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(p.nome));

            // Um "slot" por nível de 1 até o nível atual da perícia — cada
            // um comporta exatamente 1 receita gratuita (origem "livre").
            const slotsHtml = [];
            for (let nivel = 1; nivel <= nivelPericia; nivel++) {
                const livre = receitaLivreDoSlot(p.nome, nivel);
                if (livre) {
                    const r = receitasGlobaisCache.find(g => g.id === livre.receitaGlobalId);
                    const detalhes = r ? [
                        (r.dificuldade || r.dificuldade === 0) ? `Dificuldade ${r.dificuldade}` : null,
                        (r.dificuldadeArmar || r.dificuldadeArmar === 0) ? `Dificuldade de armar ${r.dificuldadeArmar}` : null,
                        r.tempoCriacao ? `Tempo: ${escapeHtml(r.tempoCriacao)}` : null,
                        formatarIngredientes(r) ? `Materiais: ${escapeHtml(formatarIngredientes(r))}` : null,
                        (r.custo || r.custo === 0) ? `Custo: CN$ ${r.custo}` : null
                    ].filter(Boolean).join(" · ") : null;
                    slotsHtml.push(`
                        <li class="receita-slot receita-slot-preenchido" style="cursor:default;">
                            <div class="entity-main">
                                <span class="entity-nome">Nível ${nivel} · ${escapeHtml(r ? (r.nome || "(receita sem nome)") : "(receita removida do Banco Global)")}</span>
                                ${detalhes ? `<span class="entity-sub">${detalhes}</span>` : ""}
                                ${r?.descricao ? `<span class="entity-sub">${escapeHtml(r.descricao)}</span>` : ""}
                            </div>
                            <div class="entity-badges">
                                ${r ? `<button type="button" class="btn-rolar btn-blue receita-criar" data-receita-id="${r.id}" data-pericia="${escapeHtml(p.nome)}" data-modificador="${calcPericia.total}" title="Rolar ${p.nome} (${calcPericia.total >= 0 ? "+" : ""}${calcPericia.total}) pra criar">🎲 Criar</button>` : ""}
                            </div>
                            <span class="hint-inline">Gratuita — travada${isMestre ? "" : " (só o Mestre pode trocar)"}</span>
                            ${isMestre ? `<button type="button" class="btn-red receita-remover" data-id="${livre.id}">Remover</button>` : ""}
                        </li>
                    `);
                } else {
                    const opcoes = receitasGlobaisCache.filter(r => r.periciaVinculada === p.nome && (Number(r.nivel) || 1) === nivel);
                    if (opcoes.length) {
                        slotsHtml.push(`
                            <li class="receita-slot receita-slot-vazio" data-pericia="${escapeHtml(p.nome)}" data-nivel="${nivel}">
                                <label>Nível ${nivel} — escolha sua receita gratuita</label>
                                <select class="receita-slot-select">
                                    ${opcoes.map(r => `<option value="${r.id}">${escapeHtml(r.nome || "(sem nome)")}</option>`).join("")}
                                </select>
                                <button type="button" class="btn-lime receita-slot-confirmar">Adquirir</button>
                            </li>
                        `);
                    } else {
                        slotsHtml.push(`
                            <li class="receita-slot receita-slot-vazio" data-pericia="${escapeHtml(p.nome)}" data-nivel="${nivel}">
                                <p class="hint">Nenhuma receita de nível ${nivel} cadastrada ainda no Banco Global pra ${escapeHtml(p.nome)}.</p>
                                <button type="button" class="btn-ghost receita-slot-criar">+ Criar receita nível ${nivel}</button>
                            </li>
                        `);
                    }
                }
            }

            // Se o nível da perícia CAIU depois de uma receita gratuita já
            // ter sido concedida num nível mais alto (ex: penalidade,
            // ajuste do Mestre), essa receita não é apagada — só some da
            // lista de slots ativos (o for acima só vai até nivelPericia).
            // Mostra ela aqui, marcada como "guardada", pra não parecer que
            // sumiu: se a perícia voltar a esse nível, ela reaparece no
            // slot normalmente (mesmo registro, mesmo id).
            const guardadas = Object.entries(fichaAtual.receitasConhecidas || {})
                .filter(([, c]) => c.periciaVinculada === p.nome && c.origem === "livre" && Number(c.nivel) > nivelPericia)
                .map(([id, c]) => ({ id, ...c }))
                .sort((a, b) => a.nivel - b.nivel);
            const guardadasHtml = guardadas.length
                ? `<div class="hint-inline" style="margin-top:10px;">Guardadas (nível acima do atual da perícia — voltam a ficar disponíveis se a perícia subir de novo)</div>
                   <ul class="entity-list">${guardadas.map(x => {
                       const r = receitasGlobaisCache.find(g => g.id === x.receitaGlobalId);
                       return `
                        <li class="entidade-desativada" style="cursor:default;">
                            <div class="entity-main">
                                <span class="entity-nome">Nível ${x.nivel} · ${escapeHtml(r ? (r.nome || "(sem nome)") : "(receita removida do Banco Global)")}</span>
                            </div>
                            ${isMestre ? `<button type="button" class="btn-red receita-remover" data-id="${x.id}">Remover</button>` : ""}
                        </li>`;
                   }).join("")}</ul>`
                : "";

            const extras = receitasExtrasDaPericia(p.nome);
            const extrasHtml = extras.length
                ? `<div class="hint-inline" style="margin-top:10px;">Receitas adquiridas em jogo (adicionadas pelo Mestre)</div>
                   <ul class="entity-list">${extras.map(x => {
                       const r = receitasGlobaisCache.find(g => g.id === x.receitaGlobalId);
                       const podeCriar = r && Number(x.nivel) <= nivelPericia;
                       return `
                        <li style="cursor:default;">
                            <div class="entity-main">
                                <span class="entity-nome">Nível ${x.nivel} · ${escapeHtml(r ? (r.nome || "(sem nome)") : "(receita removida do Banco Global)")}</span>
                                ${r?.descricao ? `<span class="entity-sub">${escapeHtml(r.descricao)}</span>` : ""}
                                ${!podeCriar && r ? `<span class="entity-sub">Perícia ainda não chegou no nível ${x.nivel} pra criar isso.</span>` : ""}
                            </div>
                            <div class="entity-badges">
                                ${podeCriar ? `<button type="button" class="btn-rolar btn-blue receita-criar" data-receita-id="${r.id}" data-pericia="${escapeHtml(p.nome)}" data-modificador="${calcPericia.total}" title="Rolar ${p.nome} (${calcPericia.total >= 0 ? "+" : ""}${calcPericia.total}) pra criar">🎲 Criar</button>` : ""}
                            </div>
                            <span class="hint-inline">adicionada por ${escapeHtml(x.adicionadoPorNome || "—")}</span>
                            ${isMestre ? `<button type="button" class="btn-red receita-remover" data-id="${x.id}">Remover</button>` : ""}
                        </li>`;
                   }).join("")}</ul>`
                : "";

            // Mestre pode adicionar qualquer receita já cadastrada no Banco
            // Global a este personagem específico, fora dos slots gratuitos
            // (representa algo adquirido/ensinado durante a sessão).
            const todasDaPericia = receitasGlobaisCache.filter(r => r.periciaVinculada === p.nome);
            const formExtraMestre = isMestre && todasDaPericia.length
                ? `
                    <li class="receita-slot receita-extra-form" data-pericia="${escapeHtml(p.nome)}">
                        <label>Adicionar receita extra a este personagem (Mestre)</label>
                        <select class="receita-extra-select">
                            ${todasDaPericia.map(r => `<option value="${r.id}" data-nivel="${Number(r.nivel) || 1}">Nível ${Number(r.nivel) || 1} — ${escapeHtml(r.nome || "(sem nome)")}</option>`).join("")}
                        </select>
                        <button type="button" class="btn-ghost receita-extra-confirmar">+ Adicionar ao personagem</button>
                    </li>
                `
                : "";

            return `
                <div class="section-header">${escapeHtml(p.nome)} <span class="hint-inline">nível ${nivelPericia}</span></div>
                ${nivelPericia < 1 ? `<p class="hint">Perícia ainda em nível 0 — nenhuma receita gratuita disponível.</p>` : `<ul class="entity-list">${slotsHtml.join("")}${formExtraMestre}</ul>`}
                ${extrasHtml}
                ${guardadasHtml}
            `;
        }).join("");

    el.receitasLista.innerHTML = `${corpoHtml}<button type="button" class="btn-lime" id="btn-add-receita" style="margin-top:12px;">+ Cadastrar nova receita no Banco Global</button>`;
    document.getElementById("btn-add-receita")?.addEventListener("click", () => abrirModalCriarReceita());

    // Escolher a receita gratuita de um slot vazio (dentre as já
    // cadastradas no Banco Global pra aquele nível/perícia).
    el.receitasLista.querySelectorAll(".receita-slot-confirmar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const li = btn.closest(".receita-slot");
            const periciaNome = li.dataset.pericia;
            const nivel = Number(li.dataset.nivel);
            const select = li.querySelector(".receita-slot-select");
            if (!select || !select.value) return;
            await concederReceitaConhecida(periciaNome, nivel, select.value, "livre");
        });
    });

    // Nenhuma receita cadastrada ainda nesse nível: cria uma nova no
    // Banco Global já pré-preenchida com perícia/nível, e ao salvar ela
    // já vira automaticamente a receita gratuita desse slot.
    el.receitasLista.querySelectorAll(".receita-slot-criar").forEach(btn => {
        btn.addEventListener("click", () => {
            const li = btn.closest(".receita-slot");
            abrirModalCriarReceita(null, {
                periciaVinculada: li.dataset.pericia,
                nivel: Number(li.dataset.nivel),
                origem: "livre"
            });
        });
    });

    // Mestre: adicionar receita extra (fora do slot gratuito) a este personagem.
    el.receitasLista.querySelectorAll(".receita-extra-confirmar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const li = btn.closest(".receita-slot");
            const periciaNome = li.dataset.pericia;
            const select = li.querySelector(".receita-extra-select");
            if (!select || !select.value) return;
            const nivel = Number(select.selectedOptions[0]?.dataset.nivel) || 1;
            await concederReceitaConhecida(periciaNome, nivel, select.value, "mestre");
        });
    });

    // Mestre: remover uma receita conhecida (gratuita ou extra).
    el.receitasLista.querySelectorAll(".receita-remover").forEach(btn => {
        btn.addEventListener("click", () => removerReceitaConhecida(btn.dataset.id));
    });

    // Criar o item da receita: primeiro escolhe quais materiais do
    // inventário vai usar (a qualidade deles influencia a rolagem — ver
    // abrirModalEscolherMateriais), depois rola a perícia vinculada e
    // registra no Log de Dados.
    el.receitasLista.querySelectorAll(".receita-criar").forEach(btn => {
        btn.addEventListener("click", () => {
            const receita = receitasGlobaisCache.find(g => g.id === btn.dataset.receitaId);
            if (!receita) { toast("Receita não encontrada no Banco Global.", "erro"); return; }
            abrirModalEscolherMateriais(receita, btn.dataset.pericia, Number(btn.dataset.modificador) || 0);
        });
    });
}

// Modal própria (fora do sistema genérico modal-item, que já é
// complexo demais pra emprestar campos de receita sem confundir tudo)
// pra cadastrar uma nova receita no Banco Global — usável tanto pelo
// jogador (de dentro da ficha) quanto pelo Mestre (de dentro de
// qualquer ficha ou da "Biblioteca de Receitas" no Painel do Mestre,
// ver montarPainelBibliotecaReceitas). "O item a ser criado" é
// representado pelo nome + (opcional) vínculo com um item já existente
// no Banco Global de Itens, via autocompletar — se não achar nada,
// segue como texto livre mesmo (a receita não depende de o item já
// estar cadastrado lá).
// opcoesSlot (opcional): { periciaVinculada, nivel, origem } — quando a
// modal é aberta a partir de um slot vazio na aba Receitas (nenhuma
// receita daquele nível cadastrada ainda no Banco Global), pra já
// pré-preencher e travar perícia/nível, e, ao salvar, conceder
// automaticamente essa receita recém-criada ao personagem que estava
// com o slot aberto (ver concederReceitaConhecida).
function abrirModalCriarReceita(receitaExistente, opcoesSlot) {
    let modal = document.getElementById("modal-criar-receita");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-criar-receita";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const r = receitaExistente || {};
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">${receitaExistente ? "Editar receita" : "Nova receita"} — Banco Global</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <div class="modal-field">
            <label for="receita-nome">Nome do item a ser criado</label>
            <input type="text" id="receita-nome" value="${escapeHtml(r.nome || "")}" autocomplete="off">
            <div id="receita-item-opcoes" class="searchable-options" style="display:none;"></div>
            <span class="hint-inline" id="receita-item-vinculo-hint">${r.itemGlobalId ? "Vinculada a um item do Banco Global de Itens." : "Digite pra buscar um item já cadastrado no Banco Global de Itens (opcional)."}</span>
        </div>
        <div class="modal-field">
            <label for="receita-pericia">Perícia de criação vinculada</label>
            <select id="receita-pericia"></select>
        </div>
        <div class="modal-field">
            <label for="receita-nivel">Nível do item (nível mínimo da perícia pra criar)</label>
            <select id="receita-nivel"></select>
        </div>
        <div class="modal-field">
            <label for="receita-dificuldade">Dificuldade (opcional)</label>
            <input type="number" id="receita-dificuldade" min="0" step="1" value="${r.dificuldade ?? ""}">
        </div>
        <div class="modal-field">
            <label for="receita-dificuldade-armar">Dificuldade de armar (opcional — manual: só Explosivos tem teste separado de criar e armar, pg. 81)</label>
            <input type="number" id="receita-dificuldade-armar" min="0" step="1" value="${r.dificuldadeArmar ?? ""}">
        </div>
        <div class="modal-field">
            <label for="receita-tempo">Tempo de criação (opcional)</label>
            <input type="text" id="receita-tempo" placeholder="ex.: 2 horas, 1 dia..." value="${escapeHtml(r.tempoCriacao || "")}">
        </div>
        <div class="modal-field">
            <label>Materiais necessários (ingredientes)</label>
            <span class="hint-inline">Só materiais válidos do Manual — escolha o tipo e a quantidade.</span>
            <div id="receita-ingredientes-lista"></div>
            <button type="button" class="btn-ghost" id="btn-add-ingrediente" style="margin-top:6px;">+ Adicionar material</button>
        </div>
        <div class="modal-field">
            <label for="receita-custo">Custo em CN$ (opcional)</label>
            <input type="number" id="receita-custo" min="0" step="1" value="${r.custo ?? ""}">
        </div>
        <div class="modal-field">
            <label for="receita-descricao">Descrição / efeito (opcional)</label>
            <textarea id="receita-descricao" rows="3">${escapeHtml(r.descricao || "")}</textarea>
        </div>
        <div class="modal-btns">
            <button type="button" class="btn-lime" id="btn-confirmar-receita">${receitaExistente ? "Salvar alterações" : "Criar receita"}</button>
        </div>
    `;

    const selectPericia = modal.querySelector("#receita-pericia");
    PERICIAS_CRIACAO_ITEM.forEach(nome => {
        const opt = document.createElement("option");
        opt.value = nome;
        opt.innerText = nome;
        selectPericia.appendChild(opt);
    });
    selectPericia.value = opcoesSlot?.periciaVinculada
        ? opcoesSlot.periciaVinculada
        : (PERICIAS_CRIACAO_ITEM.includes(r.periciaVinculada) ? r.periciaVinculada : PERICIAS_CRIACAO_ITEM[0]);
    selectPericia.disabled = !!opcoesSlot?.periciaVinculada;

    // Nível do item = nível mínimo que a perícia de criação precisa ter
    // pra essa receita poder ser usada (perícia vai de 0 a 5, mas nível
    // 0 não cria nada — por isso a receita começa em 1). É esse campo
    // que permite a aba "Receitas" da ficha organizar/filtrar as
    // receitas de cada perícia por nível (ver renderizarReceitas).
    const selectNivel = modal.querySelector("#receita-nivel");
    for (let n = 1; n <= 5; n++) {
        const opt = document.createElement("option");
        opt.value = String(n);
        opt.innerText = `Nível ${n}`;
        selectNivel.appendChild(opt);
    }
    selectNivel.value = String(opcoesSlot?.nivel || (r.nivel && r.nivel >= 1 && r.nivel <= 5 ? r.nivel : 1));
    selectNivel.disabled = !!opcoesSlot?.nivel;

    // Autocompletar pelo nome, contra o Banco Global de Itens já
    // carregado (itensGlobaisCache) — mesmo padrão usado no modal de
    // item (configurarAutocompleteItemBanco), simplificado pra só
    // guardar o vínculo (itemGlobalId), sem preencher outros campos.
    let itemGlobalIdVinculado = r.itemGlobalId || null;
    const inputNome = modal.querySelector("#receita-nome");
    const opcoesDiv = modal.querySelector("#receita-item-opcoes");
    const vinculoHint = modal.querySelector("#receita-item-vinculo-hint");
    inputNome.addEventListener("input", () => {
        itemGlobalIdVinculado = null;
        vinculoHint.innerText = "Digite pra buscar um item já cadastrado no Banco Global de Itens (opcional).";
        const texto = inputNome.value.trim().toLowerCase();
        if (!texto) { opcoesDiv.style.display = "none"; return; }
        const encontrados = itensGlobaisCache.filter(it => (it.nome || "").toLowerCase().includes(texto)).slice(0, 8);
        if (!encontrados.length) { opcoesDiv.style.display = "none"; return; }
        opcoesDiv.innerHTML = "";
        encontrados.forEach(it => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = `${it.nome} — ${rotuloTag(it.tag)}`;
            div.addEventListener("click", () => {
                inputNome.value = it.nome;
                itemGlobalIdVinculado = it.id;
                vinculoHint.innerText = "Vinculada a um item do Banco Global de Itens.";
                opcoesDiv.style.display = "none";
            });
            opcoesDiv.appendChild(div);
        });
        opcoesDiv.style.display = "block";
    });

    // Ingredientes: cada linha é { material, quantidade }, com o material
    // restrito à lista fechada MATERIAIS_CRIACAO (seção "Materiais" do
    // Manual) — nada de texto livre, pra manter a receita sempre
    // referenciando um tipo de material que existe de verdade no jogo.
    const listaIngredientes = modal.querySelector("#receita-ingredientes-lista");
    const nomesMateriais = MATERIAIS_CRIACAO.map(m => m.nome);
    function adicionarLinhaIngrediente(materialSelecionado, qualidadeSelecionada, quantidade) {
        const linha = document.createElement("div");
        linha.className = "receita-ingrediente-linha";
        const selectMaterial = document.createElement("select");
        nomesMateriais.forEach(nome => {
            const opt = document.createElement("option");
            opt.value = nome;
            opt.innerText = nome;
            selectMaterial.appendChild(opt);
        });
        selectMaterial.value = nomesMateriais.includes(materialSelecionado) ? materialSelecionado : nomesMateriais[0];

        // Qualidade só aparece pros materiais que realmente têm essa
        // variação no manual (a maioria — Material bélico e Materiais
        // especiais não têm tiers de qualidade, então ficam sem esse
        // select), e usa os nomes exatos daquele material (a maioria é
        // Baixa/Média/Boa, mas alguns variam — ver qualidadesDoMaterial).
        const selectQualidade = document.createElement("select");
        function atualizarOpcoesQualidade() {
            selectQualidade.innerHTML = "";
            const qualidades = qualidadesDoMaterial(selectMaterial.value);
            if (qualidades) {
                qualidades.forEach(q => {
                    const opt = document.createElement("option");
                    opt.value = q;
                    opt.innerText = q;
                    selectQualidade.appendChild(opt);
                });
                selectQualidade.value = qualidades.includes(qualidadeSelecionada) ? qualidadeSelecionada : qualidades[0];
                selectQualidade.style.display = "";
            } else {
                selectQualidade.style.display = "none";
            }
        }
        atualizarOpcoesQualidade();
        selectMaterial.addEventListener("change", atualizarOpcoesQualidade);

        const inputQtd = document.createElement("input");
        inputQtd.type = "number";
        inputQtd.min = "1";
        inputQtd.step = "1";
        inputQtd.value = quantidade || 1;
        const btnRemover = document.createElement("button");
        btnRemover.type = "button";
        btnRemover.className = "btn-red";
        btnRemover.innerText = "×";
        btnRemover.title = "Remover este material";
        btnRemover.addEventListener("click", () => linha.remove());
        linha.append(selectMaterial, selectQualidade, inputQtd, btnRemover);
        listaIngredientes.appendChild(linha);
    }
    if (Array.isArray(r.ingredientes) && r.ingredientes.length) {
        r.ingredientes.forEach(ing => adicionarLinhaIngrediente(ing.material, ing.qualidade, ing.quantidade));
    } else {
        adicionarLinhaIngrediente();
    }
    modal.querySelector("#btn-add-ingrediente").addEventListener("click", () => adicionarLinhaIngrediente());


    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-receita").addEventListener("click", async () => {
        const nome = inputNome.value.trim();
        if (!nome) { toast("Dê um nome ao item a ser criado.", "erro"); return; }
        const nomeCriador = fichaAtual?.config?.nomeExibicao || sessao?.nome || (isMestre ? "Mestre" : "Jogador");
        const receita = {
            nome,
            periciaVinculada: selectPericia.value,
            nivel: Number(selectNivel.value) || 1,
            dificuldade: modal.querySelector("#receita-dificuldade").value !== "" ? Number(modal.querySelector("#receita-dificuldade").value) || 0 : null,
            dificuldadeArmar: modal.querySelector("#receita-dificuldade-armar").value !== "" ? Number(modal.querySelector("#receita-dificuldade-armar").value) || 0 : null,
            tempoCriacao: modal.querySelector("#receita-tempo").value.trim(),
            ingredientes: Array.from(listaIngredientes.querySelectorAll(".receita-ingrediente-linha")).map(linha => {
                const selects = linha.querySelectorAll("select");
                const materialNome = selects[0].value;
                return {
                    material: materialNome,
                    qualidade: qualidadesDoMaterial(materialNome) ? selects[1].value : null,
                    quantidade: Number(linha.querySelector("input").value) || 1
                };
            }),
            custo: modal.querySelector("#receita-custo").value !== "" ? Number(modal.querySelector("#receita-custo").value) || 0 : null,
            descricao: modal.querySelector("#receita-descricao").value.trim(),
            itemGlobalId: itemGlobalIdVinculado,
            criadoPorNome: nomeCriador,
            criadoPorTipo: isMestre ? "mestre" : "jogador"
        };
        try {
            if (receitaExistente) {
                await atualizarReceitaBanco(receitaExistente.id, receita);
                toast(`Receita "${nome}" atualizada no Banco Global.`);
            } else {
                const novoId = await salvarReceitaNoBanco(receita);
                toast(`Receita "${nome}" criada no Banco Global.`);
                if (opcoesSlot?.periciaVinculada && fichaAtual) {
                    await concederReceitaConhecida(receita.periciaVinculada, receita.nivel, novoId, opcoesSlot.origem || "livre");
                }
            }
            modal.remove();
        } catch (err) {
            console.error(err);
            toast("Falha ao salvar a receita.", "erro");
        }
    });

    document.body.appendChild(modal);
}

// ---------------------------------------------------------------------
// DARK NET / NOTAS
// ---------------------------------------------------------------------
function renderizarDarknetENotas() {
    CAMPOS_DARKNET_NOTAS.forEach(campo => {
        const input = document.querySelector(`[data-field="${campo}"]`);
        if (input && document.activeElement !== input) input.value = fichaAtual.dados[campo] || "";
    });
    const determinacoes = document.querySelector('[data-field="determinacoes"]');
    if (determinacoes && document.activeElement !== determinacoes) determinacoes.value = fichaAtual.determinacoes || "";
    const notas = document.querySelector('[data-field="notas"]');
    if (notas && document.activeElement !== notas) notas.value = fichaAtual.notas || "";
}

// =====================================================================
// SALVAMENTO (auto-save com debounce + botão manual)
// =====================================================================

// Alguns campos simples ("dados/pvAtual", "dados/nome"...) pensados pra
// `fichas/{id}` não têm exatamente o mesmo endereço em `npcs/{id}` (lá
// PV/Energia atuais moram na raiz, não dentro de "dados"). Os que têm
// um equivalente direto são traduzidos; o resto (campos que só fazem
// sentido pra ficha de jogador, como padrão de vida) é guardado num
// canto isolado — nunca lido de volta por normalizarNpcComoFicha, mas
// também nunca perdido — pra nunca gravar por cima de algo do NPC.
const CAMPOS_NPC_EQUIVALENTES = {
    "dados/pvAtual": "pvAtual",
    "dados/energiaAtual": "energiaAtual",
    "dados/nome": "nome",
    "dados/vulgo": "vulgo",
    "dados/idade": "idade",
    "dados/funcao": "funcaoNarrativa"
};
function caminhoCampoNpc(caminho) {
    return CAMPOS_NPC_EQUIVALENTES[caminho] || `fichaExtras/${caminho}`;
}

// Variante de agendarSalvamento() pra quando o chamador já monta o
// caminho nativo certo (ex: atributosPrimarios/forca no modo NPC) — sem
// passar pela tradução dados/X → equivalente de NPC.
function agendarSalvamentoBruto(caminho, valor) {
    el.saveStatus.innerText = "salvando...";
    clearTimeout(salvandoDebounce);
    salvandoDebounce = setTimeout(async () => {
        try {
            await set(ref(db, `${caminhoBase()}/${caminho}`), valor);
            el.saveStatus.innerText = "sincronizado em tempo real";
        } catch (e) {
            console.error(e);
            el.saveStatus.innerText = "erro ao salvar";
            toast("Não foi possível salvar agora.", "erro");
        }
    }, 500);
}

function agendarSalvamento(caminho, valor) {
    el.saveStatus.innerText = "salvando...";
    clearTimeout(salvandoDebounce);
    salvandoDebounce = setTimeout(async () => {
        try {
            // `caminho` aponta pro campo exato (ex: "dados/xp"); usamos set()
            // porque o valor é escalar — update() exige um objeto de pares
            // chave/valor relativos à ref, não serve pra sobrescrever uma
            // folha única da árvore.
            const caminhoFinal = modoNpc ? caminhoCampoNpc(caminho) : caminho;
            await set(ref(db, `${caminhoBase()}/${caminhoFinal}`), valor);
            el.saveStatus.innerText = "sincronizado em tempo real";
        } catch (e) {
            console.error(e);
            el.saveStatus.innerText = "erro ao salvar";
            toast("Não foi possível salvar agora.", "erro");
        }
    }, 500);
}

async function salvarTudo(manual) {
    if (!fichaAtual || !idAtivo()) return;
    // No modo NPC cada campo já é salvo individualmente (mesmo padrão da
    // ficha normal) — um "set" da fichaAtual inteira aqui sobrescreveria
    // `npcs/{id}` com o formato de FICHA (dados.forca, pericias...) em
    // vez do formato nativo de NPC (atributosPrimarios, periciasNpc...),
    // apagando o registro. Por segurança, o botão "Salvar" manual só
    // confirma que já está tudo sincronizado nesse modo.
    if (modoNpc) {
        if (manual) toast("Alterações do NPC já são salvas automaticamente.");
        return;
    }
    try {
        await set(ref(db, `${caminhoBase()}`), fichaAtual);
        if (manual) toast("Ficha salva.");
    } catch (e) {
        console.error(e);
        toast("Erro ao salvar a ficha.", "erro");
    }
}

// Listeners genéricos de campo simples ([data-field]) — dispara update
// pontual em fichas/{id}/dados/{campo} (ou raiz, pra determinacoes/notas).
document.addEventListener("input", (e) => {
    const campo = e.target.dataset && e.target.dataset.field;
    if (!campo || !idAtivo()) return;
    if (CAMPOS_SO_MESTRE.includes(campo) && !isMestre) return;

    if (campo === "determinacoes" || campo === "notas") {
        fichaAtual[campo] = e.target.value;
        agendarSalvamento(campo, e.target.value);
        return;
    }

    let valor = e.target.value;
    if (e.target.type === "number") valor = valor === "" ? 0 : Number(valor);
    fichaAtual.dados[campo] = valor;
    agendarSalvamento(`dados/${campo}`, valor);

    if (campo === "xp" || campo === "nivel") {
        setTimeout(() => verificarLevelUpPendente(), 600);
    }
});

document.addEventListener("change", (e) => {
    const campo = e.target.dataset && e.target.dataset.field;
    if (!campo || !idAtivo() || e.target.tagName !== "SELECT") return;
    fichaAtual.dados[campo] = e.target.value;
    agendarSalvamento(`dados/${campo}`, e.target.value);
});

// Atributos primários — só funcionam se podeEditarPericiaAtributo() (Mestre+godmode,
// ou Mestre atuando como NPC). No modo NPC grava direto em
// `atributosPrimarios/{attrKey}` (o campo real usado pros cálculos),
// não no equivalente "dados/X" da ficha de jogador.
document.addEventListener("input", (e) => {
    const attrKey = e.target.dataset && e.target.dataset.attrPrimario;
    if (!attrKey || !idAtivo() || !podeEditarPericiaAtributo()) return;
    const valor = Number(e.target.value) || 0;
    fichaAtual.dados[attrKey] = valor;
    if (modoNpc) {
        agendarSalvamentoBruto(`atributosPrimarios/${attrKey}`, valor);
    } else {
        agendarSalvamento(`dados/${attrKey}`, valor);
    }
});

// Recursos atuais (PV/Energia atual) — qualquer um pode editar (dano, cura...),
// mas nunca pode passar do máximo calculado (Constituição/fórmula do manual,
// ou do override de Godmode — ver maximoComOverride) nem ficar negativo. Sem
// essa trava, o campo aceitava qualquer número digitado (inclusive durante a
// Criação, antes de a ficha estar fechada), inflando o PV permanentemente.
document.addEventListener("input", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoKey;
    if (!recursoKey || !idAtivo()) return;
    let valor = e.target.value === "" ? null : Number(e.target.value);
    if (valor !== null && !Number.isNaN(valor)) {
        const modificadoresPlanos = coletarModificadores(fichaAtual);
        const derivados = calcularDerivados(fichaAtual.dados, modificadoresPlanos);
        const bonusExtra = recursoKey === "pv" ? (Number(fichaAtual.dados.pvBonusExtra) || 0) : 0;
        const totalCalculado = Math.round(derivados.recursos[recursoKey].total) + bonusExtra;
        const max = maximoComOverride(recursoKey, fichaAtual.dados, totalCalculado);
        if (valor > max) valor = max;
        if (valor < 0) valor = 0;
        if (Number(e.target.value) !== valor) e.target.value = valor; // reflete o clamp na tela
    }
    const campo = recursoKey + "Atual";
    fichaAtual.dados[campo] = valor;
    agendarSalvamento(`dados/${campo}`, valor);
});

// PV/Energia máximo — só aparece editável em Godmode (ver renderizarAtributos).
// Sobrescreve o valor calculado pela fórmula, guardado em
// dados.{recursoKey}MaximoOverride. Campo vazio remove o override e volta a
// usar o cálculo normal (Constituição/nível). Não reclampa o "Atual" aqui —
// se o novo máximo for menor que o PV atual, o próprio input do "Atual" se
// ajusta sozinho na próxima interação (mesmo comportamento de sempre).
document.addEventListener("input", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoMaxInput;
    if (!recursoKey || !idAtivo() || !(isMestre && godmodeAtivo)) return;
    const valor = e.target.value === "" ? null : (Number(e.target.value) || 0);
    const campo = recursoKey + "MaximoOverride";
    fichaAtual.dados[campo] = valor;
    agendarSalvamento(`dados/${campo}`, valor);
});

// =====================================================================
// BOTÕES "+ ADICIONAR" — abrem o modal genérico em modo criação
// =====================================================================

function configurarBotoesAdicionar() {
    document.getElementById("btn-add-pericia").addEventListener("click", () => abrirModalNovo("pericias"));
    document.getElementById("btn-add-item").addEventListener("click", () => abrirModalNovo("inventario"));
    document.getElementById("btn-add-vantagem").addEventListener("click", () => abrirModalNovo("vantagens"));
    document.getElementById("btn-add-desvantagem").addEventListener("click", () => abrirModalNovo("desvantagens"));
    document.getElementById("btn-add-fato").addEventListener("click", () => abrirModalNovo("fatosUniversais"));
    document.getElementById("btn-add-especializacao").addEventListener("click", () => abrirModalNovo("especializacoes"));
    document.getElementById("btn-add-gasto").addEventListener("click", () => abrirModalNovo("gastosExtras"));
    document.getElementById("btn-add-categoria").addEventListener("click", async () => {
        const nome = prompt("Nome da nova categoria de inventário:");
        if (!nome) return;
        const id = criarCategoriaCustom(fichaAtual, nome);
        await update(ref(db, `${caminhoBase()}/categoriasInventario`), fichaAtual.categoriasInventario);
        categoriaInventarioAtiva = id;
        toast(`Categoria "${nome}" criada.`);
    });
}

// =====================================================================
// MODAL GENÉRICO DE ENTIDADE
// =====================================================================
// Cobre: pericias, inventario, vantagens, desvantagens, fatosUniversais,
// especializacoes, gastosExtras. `modalContexto` guarda { lista, id } —
// id null/undefined = criando um registro novo.

function abrirModalNovo(lista) {
    if (lista !== "itensGlobais" && !fichaAtual) {
        toast("Selecione uma ficha (aba \"Fichas ativas\", se você for o Mestre) antes de adicionar isso.", "erro");
        return;
    }
    if (lista === "itensGlobais" && !isMestre) {
        toast("Só o Mestre gerencia a Biblioteca de Itens.", "erro");
        return;
    }
    if (LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa()) {
        toast("Só o Mestre pode adicionar isso depois da criação do personagem.", "erro");
        return;
    }
    // Trava de limite de Desvantagens (regra: no máximo 3, mesmo pro
    // Mestre editando durante a criação — a exceção de "sem limite" do
    // Mestre vale só pra edição narrativa fora da criação, não pra
    // burlar o teto de pontos bônus).
    if (lista === "desvantagens" && !podeAdicionarDesvantagem(fichaAtual)) {
        toast(`Limite de ${MAX_DESVANTAGENS} desvantagens atingido — não é possível adicionar mais.`, "erro");
        return;
    }
    modalContexto = { lista, id: null };
    prepararModalParaLista(lista, null);
    el.modal.classList.add("active");
}

function abrirModalEdicao(lista, id) {
    modalContexto = { lista, id };
    const objeto = lista === "itensGlobais"
        ? itensGlobaisCache.find(it => it.id === id)
        : fichaAtual[lista] && fichaAtual[lista][id];
    prepararModalParaLista(lista, objeto);
    el.modal.classList.add("active");
}

function fecharModal() {
    el.modal.classList.remove("active");
    modalContexto = null;
}

function esconderTodosCamposEspeciais() {
    el.modalItemBancoOpcoes.style.display = "none";
    el.modalCampoSalvarBanco.style.display = "none";
    el.modalCampoCategoriaPericia.style.display = "none";
    el.modalCampoPericiaBusca.style.display = "none";
    el.modalCampoNivel.style.display = "none";
    el.modalCampoTag.style.display = "none";
    el.modalCampoNivelTag.style.display = "none";
    el.modalCampoPericiaUso.style.display = "none";
    el.hintFerramentaCriacaoGeral.style.display = "none";
    el.modalCampoClasseProtecao.style.display = "none";
    el.modalCampoLocalProtegido.style.display = "none";
    el.modalCampoPeso.style.display = "none";
    el.modalCampoQuantidade.style.display = "none";
    el.modalCampoCategoriaItem.style.display = "none";
    el.modalCampoMaterialTipo.style.display = "none";
    el.modalCampoMaterialQualidade.style.display = "none";
    el.modalCampoMaterialQuantidade.style.display = "none";
    el.modalConfigArma.style.display = "none";
    el.modalConfigReducaoDano.style.display = "none";
    el.modalNome.parentElement.style.display = "flex";
    document.querySelector('label[for="modal-nivel"]').innerText = "Nível (0–5)";
    el.modalNivel.min = 0; el.modalNivel.max = 5;
}

function prepararModalParaLista(lista, objetoExistente) {
    esconderTodosCamposEspeciais();
    el.modalExcluir.style.display = objetoExistente ? "inline-block" : "none";
    el.modalTitulo.innerText = (objetoExistente ? "Editar " : "Novo: ") + TITULOS_MODAL[lista];
    el.modalDescricao.value = objetoExistente ? (objetoExistente.descricao || "") : "";
    montarListaModificadores(objetoExistente ? (objetoExistente.modificadores || []) : []);

    if (lista === "pericias") {
        prepararModalPericia(objetoExistente);
    } else if (lista === "inventario" || lista === "itensGlobais") {
        prepararModalItem(objetoExistente, lista === "itensGlobais");
    } else if (lista === "gastosExtras") {
        prepararModalGasto(objetoExistente);
    } else {
        // vantagens, desvantagens, fatosUniversais, especializacoes: nome + descrição + modificadores
        el.modalNome.value = objetoExistente ? (objetoExistente.nome || "") : "";
    }

    // Trava de edição de item (regra 3): jogador só pode VER um item que
    // já está no inventário — características, mods e status ficam
    // travados. Ele ainda pode pedir a remoção (vira um pedido pendente
    // pro Mestre aprovar, regra 4), mas não pode editar/salvar direto.
    const somenteLeituraItem = lista === "inventario" && !!objetoExistente && !isMestre;
    // Trava de edição de Vantagem/Desvantagem/Fato Universal (correção de
    // exploit): fora da Criação, só o Mestre edita ou remove — o jogador
    // só visualiza, sem nem a opção de pedir remoção.
    const somenteLeituraCaracteristica = LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa();
    const somenteLeitura = somenteLeituraItem || somenteLeituraCaracteristica;
    aplicarSomenteLeituraModal(somenteLeitura);
    if (somenteLeituraCaracteristica) {
        el.modalTitulo.innerText += " (somente leitura)";
        el.modalExcluir.style.display = "none";
    } else if (somenteLeituraItem) {
        el.modalTitulo.innerText += " (somente leitura)";
        el.modalExcluir.innerText = "Solicitar remoção";
    } else {
        el.modalExcluir.innerText = "Excluir";
    }
}

// Desabilita todos os campos do modal (exceto os botões de rodapé) —
// usado quando um jogador abre um item que já está no inventário, já
// que ele só pode visualizar, não editar.
function aplicarSomenteLeituraModal(somenteLeitura) {
    const modalContent = el.modal.querySelector(".modal-content");
    if (!modalContent) return;
    modalContent.querySelectorAll("input, select, textarea").forEach(campo => { campo.disabled = somenteLeitura; });
    modalContent.querySelectorAll("button").forEach(btn => {
        if (["modal-cancelar", "modal-excluir", "modal-salvar"].includes(btn.id)) return;
        btn.disabled = somenteLeitura;
    });
    el.modalSalvar.style.display = somenteLeitura ? "none" : "inline-block";
}

function configurarModal() {
    document.getElementById("modal-cancelar").addEventListener("click", fecharModal);
    document.getElementById("modal-excluir").addEventListener("click", excluirEntidadeAtual);
    document.getElementById("modal-salvar").addEventListener("click", salvarEntidadeAtual);
    el.modal.addEventListener("click", (e) => { if (e.target === el.modal) fecharModal(); });
}

// ---------------------------------------------------------------------
// Modal: PERÍCIA — dropdown de categoria + dropdown buscável + nível
// ---------------------------------------------------------------------
function prepararModalPericia(existente) {
    el.modalNome.parentElement.style.display = "none"; // nome vem só da lista fechada
    el.modalCampoCategoriaPericia.style.display = "flex";
    el.modalCampoPericiaBusca.style.display = "flex";
    el.modalCampoNivel.style.display = "flex";

    const podeEditar = podeEditarPericiaAtributo();
    el.modalCategoriaPericia.disabled = !podeEditar && !!existente; // categoria só trava se editando perícia já travada
    el.modalNivel.disabled = !podeEditar;

    if (existente) {
        const oficial = buscarPericiaPorNome(existente.nome);
        el.modalCategoriaPericia.value = oficial ? oficial.categoria : "";
        el.modalPericiaValor.value = existente.nome;
        el.modalPericiaBusca.value = existente.nome;
        el.modalPericiaBusca.disabled = true; // não dá pra trocar o nome de uma perícia já criada
        el.modalNivel.value = existente.nivel ?? 0;
        popularOpcoesPericia(oficial ? oficial.categoria : "");
    } else {
        el.modalCategoriaPericia.value = "";
        el.modalPericiaValor.value = "";
        el.modalPericiaBusca.value = "";
        el.modalPericiaBusca.disabled = false;
        el.modalPericiaBusca.placeholder = "Escolha a categoria primeiro";
        el.modalNivel.value = 0;
        el.modalPericiaOpcoes.innerHTML = "";
        el.modalPericiaOpcoes.style.display = "none";
    }

    if (!podeEditar && !existente) {
        // Jogador sem edição liberada não devia nem conseguir abrir "novo", mas
        // por segurança redundante: avisa que não vai salvar.
        toast("Edição de perícias só na Criação, Level Up ou Treinamento.", "erro");
    }
}

function popularOpcoesPericia(categoria) {
    el.modalPericiaOpcoes.innerHTML = "";
    if (!categoria) { el.modalPericiaOpcoes.style.display = "none"; return; }
    const todas = listaPericiasPorCategoria(categoria);
    const jaExistentes = new Set(Object.values(fichaAtual.pericias || {}).map(p => p.nome));
    renderOpcoesBusca(todas.filter(p => !jaExistentes.has(p.nome) || p.nome === el.modalPericiaValor.value), el.modalPericiaBusca.value);
}

function renderOpcoesBusca(lista, filtroTexto) {
    const filtro = (filtroTexto || "").toLowerCase();
    const filtradas = lista.filter(p => p.nome.toLowerCase().includes(filtro));
    el.modalPericiaOpcoes.innerHTML = "";
    if (!filtradas.length) {
        el.modalPericiaOpcoes.innerHTML = `<div class="opcao-vazia">Nenhuma perícia encontrada.</div>`;
    } else {
        filtradas.forEach(p => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = p.nome;
            div.addEventListener("click", () => {
                el.modalPericiaBusca.value = p.nome;
                el.modalPericiaValor.value = p.nome;
                el.modalPericiaOpcoes.style.display = "none";
            });
            el.modalPericiaOpcoes.appendChild(div);
        });
    }
    el.modalPericiaOpcoes.style.display = "block";
}

function configurarBuscaPericia() {
    el.modalCategoriaPericia.addEventListener("change", () => {
        el.modalPericiaValor.value = "";
        el.modalPericiaBusca.value = "";
        el.modalPericiaBusca.placeholder = "Digite pra buscar...";
        popularOpcoesPericia(el.modalCategoriaPericia.value);
    });
    el.modalPericiaBusca.addEventListener("input", () => {
        el.modalPericiaValor.value = ""; // obriga escolher da lista (sem texto livre)
        popularOpcoesPericia(el.modalCategoriaPericia.value);
    });
    el.modalPericiaBusca.addEventListener("focus", () => {
        if (el.modalCategoriaPericia.value) popularOpcoesPericia(el.modalCategoriaPericia.value);
    });
    document.addEventListener("click", (e) => {
        if (!el.modalCampoPericiaBusca.contains(e.target)) el.modalPericiaOpcoes.style.display = "none";
    });
}

// ---------------------------------------------------------------------
// Modal: ITEM DE INVENTÁRIO — tag, nível de tag, peso, categoria, arma
// ---------------------------------------------------------------------
function prepararModalItem(existente, ehBanco) {
    el.modalCampoTag.style.display = "flex";
    el.modalCampoPeso.style.display = "flex";
    // Item do Banco Global não tem "categoria" (levando/casa) — isso só
    // existe quando o item está de fato dentro de uma ficha.
    el.modalCampoCategoriaItem.style.display = ehBanco ? "none" : "flex";

    if (!ehBanco) {
        el.modalCategoriaItem.innerHTML = "";
        listaCategorias(fichaAtual).forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.innerText = cat.nome;
            el.modalCategoriaItem.appendChild(opt);
        });
    }

    // Checkbox "Salvar no Banco Global": só faz sentido ao adicionar/editar
    // um item DENTRO de uma ficha (o item do Banco em si já É o registro
    // salvo, marcar a caixa ali seria redundante).
    el.modalCampoSalvarBanco.style.display = (!ehBanco) ? "flex" : "none";
    el.modalSalvarBanco.checked = false;

    if (existente) {
        el.modalNome.value = existente.nome || "";
        el.modalTag.value = existente.tag || "";
        el.modalPeso.value = existente.pesoUnitario ?? existente.peso ?? 0;
        if (!ehBanco) el.modalCategoriaItem.value = existente.categoria || "levando";
        atualizarCamposPorTag(existente.tag, existente.nivelTag, existente.arma, existente.periciaUso, existente.classeProtecao, existente.calibre, existente.reducoesDano, existente.carregador, existente.projetil, existente.localProtegido, { tipo: existente.materialTipo, qualidade: existente.materialQualidade, quantidade: existente.materialQuantidade }, !!existente.ehSaldo, existente.saldoValor, existente.quantidade);
        el.modalEquipavel.checked = !!existente.equipavel;
    } else {
        el.modalNome.value = "";
        el.modalTag.value = "";
        el.modalPeso.value = 0;
        if (!ehBanco) el.modalCategoriaItem.value = categoriaInventarioAtiva || "levando";
        atualizarCamposPorTag("", null, null, null, null, null, null, null, null, null, null, false, 0, null);
        el.modalEquipavel.checked = false;
    }

    // Autocompletar pelo Banco Global — só ao CRIAR um item novo dentro
    // de uma ficha (não faz sentido nem no Banco em si, nem ao editar um
    // item que já existe: nesse caso o jogador está editando o que já
    // tem, não escolhendo um molde pra copiar).
    configurarAutocompleteItemBanco(!ehBanco && !existente);
}

// Liga/desliga o autocompletar de itens do Banco Global no campo Nome.
// Quando ligado, digitar no campo Nome mostra sugestões do banco; ao
// clicar numa sugestão, todos os outros campos do modal são preenchidos
// automaticamente a partir do molde salvo (tag, peso, perícia, arma...).
function configurarAutocompleteItemBanco(ativo) {
    el.modalItemBancoOpcoes.style.display = "none";
    el.modalItemBancoOpcoes.innerHTML = "";
    el.modalNome.oninput = null;
    el.modalNome.onfocus = null;
    if (!ativo) return;

    const renderSugestoes = () => {
        const encontrados = buscarItensGlobaisPorNome(itensGlobaisCache, el.modalNome.value);
        el.modalItemBancoOpcoes.innerHTML = "";
        if (!encontrados.length) { el.modalItemBancoOpcoes.style.display = "none"; return; }
        encontrados.forEach(it => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = `${it.nome} — ${rotuloTag(it.tag)}`;
            div.addEventListener("click", () => {
                el.modalNome.value = it.nome;
                el.modalTag.value = it.tag || "";
                el.modalPeso.value = it.pesoUnitario ?? it.peso ?? 0;
                el.modalDescricao.value = it.descricao || "";
                montarListaModificadores(it.modificadores || []);
                atualizarCamposPorTag(it.tag, it.nivelTag, it.arma, it.periciaUso, it.classeProtecao, it.calibre, it.reducoesDano, it.carregador, it.projetil, it.localProtegido, { tipo: it.materialTipo, qualidade: it.materialQualidade, quantidade: it.materialQuantidade }, !!it.ehSaldo, it.saldoValor, it.quantidade);
                el.modalEquipavel.checked = !!it.equipavel;
                el.modalItemBancoOpcoes.style.display = "none";
                toast(`Preenchido a partir do Banco Global: "${it.nome}".`);
            });
            el.modalItemBancoOpcoes.appendChild(div);
        });
        el.modalItemBancoOpcoes.style.display = "block";
    };

    el.modalNome.oninput = renderSugestoes;
    el.modalNome.onfocus = () => { if (el.modalNome.value.trim()) renderSugestoes(); };
    document.addEventListener("click", (e) => {
        if (!el.modalNome.contains(e.target) && !el.modalItemBancoOpcoes.contains(e.target)) {
            el.modalItemBancoOpcoes.style.display = "none";
        }
    });
}

function popularClassesProtecao(classeAtual) {
    el.modalClasseProtecao.innerHTML = "";
    CLASSES_PROTECAO.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key;
        opt.innerText = c.label;
        el.modalClasseProtecao.appendChild(opt);
    });
    el.modalClasseProtecao.value = (classeAtual && CLASSES_PROTECAO.some(c => c.key === classeAtual)) ? classeAtual : CLASSES_PROTECAO[0].key;
}

// Popula o select de Calibre com só os calibres da Classe de Proteção
// atualmente selecionada no campo acima.
function popularCalibres(classeKey, calibreAtual) {
    el.modalCalibre.innerHTML = "";
    const opcoes = calibresPorClasse(classeKey);
    opcoes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key;
        opt.innerText = c.label;
        el.modalCalibre.appendChild(opt);
    });
    el.modalCalibre.value = (calibreAtual && opcoes.some(c => c.key === calibreAtual)) ? calibreAtual : (opcoes[0]?.key || "");
}

// Reavalia se o campo "Classe de Proteção" deve aparecer, olhando o
// estado atual dos outros campos do modal (tag + perícia vinculada
// selecionada). Chamada tanto ao abrir o modal quanto sempre que a tag
// ou a perícia da arma mudam. Colete sempre exige; arma de fogo também
// exige (é o que determina contra qual colete ela é eficaz — dano x
// colete).
function atualizarVisibilidadeClasseProtecao(classeAtual) {
    const tagKey = el.modalTag.value;
    const periciaAtual = el.modalCampoPericiaUso.style.display !== "none" ? el.modalPericiaUso.value : null;
    const exige = tagExigeClasseProtecao(tagKey, periciaAtual);
    el.modalCampoClasseProtecao.style.display = exige ? "flex" : "none";
    if (exige) popularClassesProtecao(classeAtual);
}

// Reavalia se o campo "Calibre" (abaixo da Classe de Proteção) deve
// aparecer — só pra carregador, projétil e arma de fogo (colete usa só
// a Classe). As opções vêm filtradas pela Classe de Proteção escolhida
// no campo acima; ao trocar a classe, o calibre é repopulado do zero.
function atualizarVisibilidadeCalibre(calibreAtual) {
    const tagKey = el.modalTag.value;
    const periciaAtual = el.modalCampoPericiaUso.style.display !== "none" ? el.modalPericiaUso.value : null;
    const exige = tagUsaCalibreEspecifico(tagKey, periciaAtual);
    el.modalCampoCalibre.style.display = exige ? "flex" : "none";
    if (exige) popularCalibres(el.modalClasseProtecao.value, calibreAtual);
}

// Reavalia se o bloco "Características de Arma de Fogo" deve aparecer:
// só quando a tag é Arma E a perícia vinculada selecionada é uma das
// perícias de Arma de Fogo (pequeno/médio/grande porte). Chamada ao
// abrir o modal e sempre que a perícia vinculada mudar.
function atualizarVisibilidadeArmaFogo(armaConfig) {
    const tagKey = el.modalTag.value;
    const periciaAtual = el.modalCampoPericiaUso.style.display !== "none" ? el.modalPericiaUso.value : null;
    const ehFogo = ehArma(tagKey) && ehArmaDeFogo(periciaAtual);
    el.modalConfigArmaFogo.style.display = ehFogo ? "block" : "none";
    // Escala de arma é conceito de combate corpo a corpo — não faz
    // sentido pra arma de fogo, então some quando o bloco de fogo aparece.
    if (ehFogo) el.modalCampoEscala.style.display = "none";
    else if (ehArma(tagKey)) el.modalCampoEscala.style.display = "flex";

    if (ehFogo) {
        const cfg = armaConfig || {};
        el.modalArmaCapacidade.value = cfg.capacidade ?? 0;
        el.modalArmaDisparosTurno.value = cfg.disparosPorTurno ?? 1;
        el.modalArmaPrecisao.value = cfg.precisao ?? 0;
        el.modalArmaDificuldadeAcerto.value = cfg.dificuldadeAcerto ?? 14;
        el.modalArmaAlcance.value = (cfg.alcance && ALCANCES_ARMA_FOGO.some(a => a.key === cfg.alcance)) ? cfg.alcance : ALCANCES_ARMA_FOGO[0].key;
        el.modalArmaRecuo.value = (cfg.recuo && PADROES_RECUO.some(p => p.key === cfg.recuo)) ? cfg.recuo : PADROES_RECUO[0].key;
        el.modalArmaEfeitoExtra.value = cfg.efeitoExtra || "";

        const calibreArmaAtual = (el.modalCampoCalibre.style.display !== "none") ? el.modalCalibre.value : null;
        const ehEscopeta = ehCalibreEscopeta(calibreArmaAtual);
        // Escopeta (12 gauge) não usa carregador — some com o campo em
        // vez de mostrar um select que não se aplica a essa arma.
        if (el.modalCampoArmaCarregador) el.modalCampoArmaCarregador.style.display = ehEscopeta ? "none" : "flex";
        if (!ehEscopeta) popularCarregadorAnexado(cfg.carregadorId);
    }
}

// Popula o select "Carregador anexado" só com carregadores do inventário
// que casam com o Calibre específico selecionado na arma (campo próprio,
// abaixo da Classe de Proteção). Se o calibre ainda não tiver sido
// escolhido, mostra todos os carregadores do inventário.
function popularCarregadorAnexado(carregadorIdAtual) {
    if (!el.modalArmaCarregador) return;
    const calibreArma = (el.modalCampoCalibre.style.display !== "none") ? el.modalCalibre.value : null;
    const carregadores = listaCarregadoresInventario(fichaAtual, calibreArma);
    el.modalArmaCarregador.innerHTML = "";
    const optNenhum = document.createElement("option");
    optNenhum.value = "";
    optNenhum.innerText = "Nenhum (arma descarregada)";
    el.modalArmaCarregador.appendChild(optNenhum);
    carregadores.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        const municao = c.carregador?.municaoAtual ?? 0;
        const capacidade = c.carregador?.capacidadeMax ?? 0;
        opt.innerText = `${c.nome} (${municao}/${capacidade})`;
        el.modalArmaCarregador.appendChild(opt);
    });
    el.modalArmaCarregador.value = (carregadorIdAtual && carregadores.some(c => c.id === carregadorIdAtual)) ? carregadorIdAtual : "";
}

// Trocar a Classe de Proteção repopula as opções de Calibre (o calibre
// escolhido antes pode não pertencer mais à nova classe).
document.getElementById("modal-classe-protecao")?.addEventListener("change", () => {
    atualizarVisibilidadeCalibre(null);
});

// Trocar o Calibre da arma reavalia quais carregadores aparecem como
// compatíveis no select "Carregador anexado" — ou some com o campo, se
// o novo calibre for de escopeta (12 gauge não usa carregador).
document.getElementById("modal-calibre")?.addEventListener("change", (e) => {
    if (el.modalConfigArmaFogo.style.display === "none") return;
    const ehEscopeta = ehCalibreEscopeta(e.target.value);
    if (el.modalCampoArmaCarregador) el.modalCampoArmaCarregador.style.display = ehEscopeta ? "none" : "flex";
    if (!ehEscopeta) popularCarregadorAnexado(null);
});

// Monta a lista de checkboxes "Tipos de dano reduzidos" + valor de
// redução por tipo, pré-marcando os que já estavam salvos no item.
function montarReducaoDanoChecklist(reducoesAtuais) {
    const mapaAtual = {};
    (reducoesAtuais || []).forEach(r => { mapaAtual[r.tipo] = r.valor; });

    el.modalReducaoDanoLista.innerHTML = "";
    TIPOS_DANO.forEach(t => {
        const linha = document.createElement("div");
        linha.className = "reducao-dano-linha";
        const marcado = Object.prototype.hasOwnProperty.call(mapaAtual, t.key);
        linha.innerHTML = `
            <label>
                <input type="checkbox" class="reducao-dano-check" data-tipo="${t.key}" ${marcado ? "checked" : ""}>
                ${escapeHtml(t.label)}
            </label>
            <input type="number" class="reducao-dano-valor" data-tipo="${t.key}" min="0" step="1" value="${marcado ? mapaAtual[t.key] : 0}" ${marcado ? "" : "disabled"}>
        `;
        const chk = linha.querySelector(".reducao-dano-check");
        const valorInput = linha.querySelector(".reducao-dano-valor");
        chk.addEventListener("change", () => { valorInput.disabled = !chk.checked; });
        el.modalReducaoDanoLista.appendChild(linha);
    });
}

// Lê o checklist de redução de dano e monta o array pra salvar no item.
function lerReducaoDanoDoModal() {
    const linhas = el.modalReducaoDanoLista.querySelectorAll(".reducao-dano-linha");
    const resultado = [];
    linhas.forEach(linha => {
        const chk = linha.querySelector(".reducao-dano-check");
        const valorInput = linha.querySelector(".reducao-dano-valor");
        if (chk.checked) {
            const valor = Number(valorInput.value) || 0;
            if (valor > 0) resultado.push({ tipo: chk.dataset.tipo, valor });
        }
    });
    return resultado;
}

function atualizarCamposPorTag(tagKey, nivelTag, armaConfig, periciaUsoAtual, classeProtecaoAtual, calibreAtual, reducoesDanoAtuais, carregadorConfigAtual, projetilConfigAtual, localProtegidoAtual, materialConfigAtual, ehSaldoAtual, saldoValorAtual, quantidadeAtual) {
    // Equipável — checkbox independente da tag (qualquer item pode ser
    // marcado como equipável, não só armas). Some pra tag "Arma": arma
    // já é sempre equipável por natureza (ver ehArma em itemEhEquipavel,
    // inventario.js), então o checkbox ali seria redundante/confuso.
    // Some também sem tag nenhuma escolhida ainda.
    const podeMarcarEquipavel = !!tagKey && tagKey !== "arma";
    el.modalCampoEquipavel.style.display = podeMarcarEquipavel ? "flex" : "none";
    if (!podeMarcarEquipavel) el.modalEquipavel.checked = false;

    const temNivel = tagTemNivel(tagKey);
    el.modalCampoNivelTag.style.display = temNivel ? "flex" : "none";
    if (temNivel) el.modalNivelTag.value = nivelTag || 1;

    // Carregador — capacidade máxima é definida na criação do item.
    const exigeCapacidade = tagExigeCapacidadeCarregador(tagKey);
    el.modalCampoCarregadorCapacidade.style.display = exigeCapacidade ? "flex" : "none";
    if (exigeCapacidade) el.modalCarregadorCapacidade.value = (carregadorConfigAtual && carregadorConfigAtual.capacidadeMax) || 10;

    // Projétil/munição — quantidade de rounds que ESTE item representa.
    // Editável direto no modal: assim dá pra ter um único item "9mm"
    // com 60 unidades, por exemplo, em vez de precisar criar/duplicar
    // vários itens do mesmo calibre só pra empilhar munição.
    const exigeQuantidadeProjetil = tagExigeQuantidadeProjetil(tagKey);
    el.modalCampoProjetilQuantidade.style.display = exigeQuantidadeProjetil ? "flex" : "none";
    if (exigeQuantidadeProjetil) el.modalProjetilQuantidade.value = (projetilConfigAtual && projetilConfigAtual.quantidade) ?? 1;

    // Material de criação — tipo (obrigatório, lista fechada do manual),
    // qualidade (se aquele tipo tiver variação) e quantidade em estoque
    // (unidades). É isso que abrirModalEscolherMateriais usa pra saber
    // exatamente quanto tem de cada material na hora de criar um item.
    const ehMaterial = tagKey === "material";
    el.modalCampoMaterialTipo.style.display = ehMaterial ? "flex" : "none";
    el.modalCampoMaterialQuantidade.style.display = ehMaterial ? "flex" : "none";
    if (ehMaterial) {
        el.modalMaterialTipo.innerHTML = "";
        MATERIAIS_CRIACAO.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.nome;
            opt.innerText = m.nome;
            el.modalMaterialTipo.appendChild(opt);
        });
        const tipoAtual = (materialConfigAtual && materialConfigAtual.tipo && MATERIAIS_CRIACAO.some(m => m.nome === materialConfigAtual.tipo))
            ? materialConfigAtual.tipo
            : MATERIAIS_CRIACAO[0].nome;
        el.modalMaterialTipo.value = tipoAtual;
        atualizarCampoQualidadeMaterial(tipoAtual, materialConfigAtual && materialConfigAtual.qualidade);
        el.modalMaterialQuantidade.value = (materialConfigAtual && materialConfigAtual.quantidade) ?? 1;
    }

    // Perícia vinculada — o campo aparece em armas, eletrônicos,
    // ferramentas de criação (química e biomecânica) e destraves (é ela
    // que o botão "Usar" do inventário rola), mas só é OBRIGATÓRIA em
    // armas, ferramentas de criação química/biomecânica e destraves.
    // Eletrônico fica de fora da obrigatoriedade: nem todo item
    // eletrônico serve pra Hackear (uma lanterna, um carregador...) —
    // por isso ganha a opção "Nenhuma", deixando o item sem o botão
    // "Usar" com rolagem automática (ver tagExigePericiaUso em
    // dados-manual.js).
    const mostraPericia = tagTemPericiaUso(tagKey);
    const exigePericia = tagExigePericiaUso(tagKey);
    const multiPericia = ehTagMultiPericia(tagKey);
    el.modalCampoPericiaUso.style.display = mostraPericia ? "flex" : "none";
    if (mostraPericia) {
        if (el.modalLabelPericiaUso) el.modalLabelPericiaUso.textContent = exigePericia ? "Perícia vinculada (obrigatória)" : "Perícia vinculada (opcional)";
        const opcoes = periciasVinculaveisPorTag(tagKey);
        el.modalPericiaUso.style.display = multiPericia ? "none" : "";
        el.modalPericiaUsoCheckboxes.style.display = multiPericia ? "flex" : "none";
        el.hintPericiaUsoMultipla.style.display = multiPericia ? "block" : "none";
        if (multiPericia) {
            // Eletrônico: um item pode servir pra mais de uma perícia ao
            // mesmo tempo (ex.: Hacking e Programação juntos) — por isso
            // vira checkbox em vez de select de escolha única (ver
            // ehTagMultiPericia em dados-manual.js).
            const marcadasAtuais = periciaUsoComoArray(periciaUsoAtual);
            el.modalPericiaUsoCheckboxes.innerHTML = "";
            opcoes.forEach(nome => {
                const id = `modal-pericia-uso-cb-${nome.replace(/\s+/g, "-")}`;
                const label = document.createElement("label");
                label.className = "checkbox-inline";
                label.style.display = "block";
                const input = document.createElement("input");
                input.type = "checkbox";
                input.id = id;
                input.value = nome;
                input.checked = marcadasAtuais.includes(nome);
                label.appendChild(input);
                label.appendChild(document.createTextNode(` ${nome}`));
                el.modalPericiaUsoCheckboxes.appendChild(label);
            });
        } else {
            el.modalPericiaUso.innerHTML = "";
            if (!exigePericia) {
                const optNenhuma = document.createElement("option");
                optNenhuma.value = "";
                optNenhuma.innerText = "Nenhuma (sem rolagem automática de \"Usar\")";
                el.modalPericiaUso.appendChild(optNenhuma);
            }
            opcoes.forEach(nome => {
                const opt = document.createElement("option");
                opt.value = nome;
                opt.innerText = nome;
                el.modalPericiaUso.appendChild(opt);
            });
            el.modalPericiaUso.value = (periciaUsoAtual && opcoes.includes(periciaUsoAtual))
                ? periciaUsoAtual
                : (exigePericia ? opcoes[0] : "");
        }
    }

    // Carteira digital — só faz sentido em Eletrônico (um pendrive com
    // cripto, um celular com app de banco...). Independente da perícia
    // vinculada acima: um item pode guardar dinheiro sem servir pra
    // Hackear/Programar, e vice-versa. Ver ehTagQuePodeSerSaldo e
    // todosOsSaldos em dados-manual.js.
    const podeSerSaldo = ehTagQuePodeSerSaldo(tagKey);
    el.modalCampoItemSaldo.style.display = podeSerSaldo ? "flex" : "none";
    if (podeSerSaldo) {
        el.modalItemEhSaldo.checked = !!ehSaldoAtual;
        el.modalItemSaldoValor.value = saldoValorAtual ?? 0;
        el.modalItemSaldoValorBloco.style.display = ehSaldoAtual ? "block" : "none";
    }

    // Quantidade genérica ("tenho N desse item") — mesmo esquema que
    // munição já usa (Peso total = Peso unitário × Quantidade), agora
    // pra qualquer item (ver tagTemQuantidadeGeral em dados-manual.js).
    // Quando ativa, o campo "Peso" vira "Peso unitário" e o total é
    // recalculado ao vivo (ver listener de modal-peso/modal-quantidade
    // logo abaixo da função).
    const temQuantidade = tagKey && tagTemQuantidadeGeral(tagKey);
    el.modalCampoQuantidade.style.display = temQuantidade ? "flex" : "none";
    if (el.modalLabelPeso) el.modalLabelPeso.textContent = temQuantidade ? "Peso unitário (kg)" : "Peso (kg)";
    if (temQuantidade) {
        el.modalQuantidade.value = Math.max(1, Number(quantidadeAtual) || 1);
        atualizarPesoTotalModal();
    }

    // Ferramenta de Criação (geral) — ver ehFerramentaCriacaoGeral em
    // dados-manual.js: não tem select de perícia (não fica travada numa
    // só), só um aviso explicando que a escolha é feita ao usar o item.
    el.hintFerramentaCriacaoGeral.style.display = ehFerramentaCriacaoGeral(tagKey) ? "block" : "none";

    const arma = ehArma(tagKey);
    el.modalConfigArma.style.display = arma ? "block" : "none";
    if (arma) {
        el.modalArmaDanoBase.value = (armaConfig && armaConfig.danoBase) ?? 0;
        el.modalArmaTipoDano.value = (armaConfig && armaConfig.tipoDano) || TIPOS_DANO[0].key;
        el.modalArmaEscala.value = (armaConfig && armaConfig.escala) || "";
        montarModificacoesArma((armaConfig && armaConfig.modificacoesArma) || []);
    }
    // Tipo de dano extra — só faz sentido em arma branca (corpo a corpo,
    // não-fogo); arma de fogo dispara sempre o mesmo tipo de projétil.
    // Usa o valor JÁ POPULADO do select de perícia (acima) em vez do
    // parâmetro cru — assim fica certo mesmo quando a tag acabou de
    // mudar e a perícia caiu no primeiro item da lista por padrão.
    const ehArmaBranca = arma && exigePericia && !ehArmaDeFogo(el.modalPericiaUso.value);
    el.modalCampoTipoDanoExtra.style.display = ehArmaBranca ? "flex" : "none";
    if (ehArmaBranca) el.modalArmaTipoDanoExtra.value = (armaConfig && armaConfig.tipoDanoExtra) || "";

    // Redução de dano — só pra tags do tipo "colete/placa".
    const reduzDano = tagPodeReduzirDano(tagKey);
    el.modalConfigReducaoDano.style.display = reduzDano ? "block" : "none";
    if (reduzDano) montarReducaoDanoChecklist(reducoesDanoAtuais);

    // Parte do corpo protegida — obrigatória em itens de Proteção.
    const exigeLocalProtegido = tagExigeLocalProtegido(tagKey);
    el.modalCampoLocalProtegido.style.display = exigeLocalProtegido ? "flex" : "none";
    if (exigeLocalProtegido) el.modalLocalProtegido.value = localProtegidoAtual || "";

    // Classe de Proteção (colete e arma de fogo) e, abaixo dela, o
    // Calibre específico (carregador/projétil/arma de fogo — é o que
    // casa os três entre si).
    atualizarVisibilidadeClasseProtecao(classeProtecaoAtual);
    atualizarVisibilidadeCalibre(calibreAtual);
    // Características de Arma de Fogo — dependem da perícia vinculada
    // selecionada acima, então são avaliadas depois dela estar montada.
    atualizarVisibilidadeArmaFogo(armaConfig);
}

document.getElementById("modal-tag")?.addEventListener("change", (e) => {
    atualizarCamposPorTag(e.target.value, null, null, null, null, null, null, null, null, null, null, false, 0, null);
});

document.getElementById("modal-item-eh-saldo")?.addEventListener("change", (e) => {
    document.getElementById("modal-item-saldo-valor-bloco").style.display = e.target.checked ? "block" : "none";
});

// Recalcula e mostra o "Peso total" (Peso unitário × Quantidade) ao
// vivo, enquanto o jogador digita — ver tagTemQuantidadeGeral em
// dados-manual.js. Só é chamada quando o campo de quantidade está
// visível (item de uma tag que aceita quantidade genérica).
function atualizarPesoTotalModal() {
    const unitario = Math.max(0, Number(el.modalPeso.value) || 0);
    const quantidade = Math.max(1, Number(el.modalQuantidade.value) || 1);
    el.modalQuantidadePesoTotal.textContent = `Peso total: ${(unitario * quantidade).toFixed(2).replace(/\.?0+$/, "") || "0"} kg`;
}
document.getElementById("modal-peso")?.addEventListener("input", () => {
    if (el.modalCampoQuantidade.style.display !== "none") atualizarPesoTotalModal();
});
document.getElementById("modal-quantidade")?.addEventListener("input", () => {
    if (Number(el.modalQuantidade.value) < 1) el.modalQuantidade.value = 1;
    atualizarPesoTotalModal();
});

// Repopula o select de Qualidade conforme o Tipo de material escolhido
// (alguns materiais não têm variação de qualidade — ver MATERIAIS_CRIACAO
// em dados-manual.js — nesse caso o campo some).
function atualizarCampoQualidadeMaterial(tipoMaterial, qualidadeAtual) {
    const qualidades = qualidadesDoMaterial(tipoMaterial);
    el.modalCampoMaterialQualidade.style.display = qualidades ? "flex" : "none";
    if (!qualidades) { el.modalMaterialQualidade.innerHTML = ""; return; }
    el.modalMaterialQualidade.innerHTML = "";
    qualidades.forEach(q => {
        const opt = document.createElement("option");
        opt.value = q;
        opt.innerText = q;
        el.modalMaterialQualidade.appendChild(opt);
    });
    el.modalMaterialQualidade.value = qualidades.includes(qualidadeAtual) ? qualidadeAtual : qualidades[0];
}

document.getElementById("modal-material-tipo")?.addEventListener("change", (e) => {
    atualizarCampoQualidadeMaterial(e.target.value, null);
});

// Trocar a perícia vinculada de uma arma (ex: de "CQC" pra "Armas de
// Fogo de Pequeno Porte") pode ligar/desligar a exigência de Classe de
// Proteção, Calibre e o bloco de Arma de Fogo sem precisar trocar a tag
// — reavalia os três na hora.
document.getElementById("modal-pericia-uso")?.addEventListener("change", (e) => {
    atualizarVisibilidadeClasseProtecao(null);
    atualizarVisibilidadeCalibre(null);
    atualizarVisibilidadeArmaFogo(null);
    // Tipo de dano extra só aparece pra arma branca (ver atualizarCamposPorTag).
    const ehArmaBrancaAgora = ehArma(el.modalTag.value) && !ehArmaDeFogo(e.target.value);
    el.modalCampoTipoDanoExtra.style.display = ehArmaBrancaAgora ? "flex" : "none";
    if (!ehArmaBrancaAgora) el.modalArmaTipoDanoExtra.value = "";
});

// ---------------------------------------------------------------------
// Modal: GASTO EXTRA — nome, descrição, valor (reaproveita "nível" como valor)
// ---------------------------------------------------------------------
function prepararModalGasto(existente) {
    el.modalCampoNivel.style.display = "flex";
    document.querySelector('label[for="modal-nivel"]').innerText = "Valor (CN$)";
    el.modalNivel.min = 0; el.modalNivel.max = 99999;
    if (existente) {
        el.modalNome.value = existente.nome || "";
        el.modalNivel.value = existente.valor ?? 0;
    } else {
        el.modalNome.value = "";
        el.modalNivel.value = 0;
    }
}

// ---------------------------------------------------------------------
// Modificadores automáticos (linhas dinâmicas: alvo + valor)
// ---------------------------------------------------------------------
function montarListaModificadores(mods) {
    el.modalListaModificadores.innerHTML = "";
    mods.forEach(m => adicionarLinhaModificador(m.alvo, m.valor));
}

function adicionarLinhaModificador(alvoSelecionado, valorAtual) {
    const fragmento = el.templateModificador.content.cloneNode(true);
    const row = fragmento.querySelector(".modificador-row");
    const select = row.querySelector(".mod-alvo");
    const input = row.querySelector(".mod-valor");
    const btnRemover = row.querySelector(".mod-remover");

    const pericias = Object.values(fichaAtual.pericias || {});
    listaAlvosModificador(pericias).forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.value;
        opt.innerText = a.label;
        select.appendChild(opt);
    });
    if (alvoSelecionado) select.value = alvoSelecionado;
    input.value = valorAtual ?? 0;
    btnRemover.addEventListener("click", () => row.remove());

    el.modalListaModificadores.appendChild(row);
}

function configurarModificadoresGenerico() {
    document.getElementById("modal-add-modificador").addEventListener("click", () => adicionarLinhaModificador("", 0));
}

function lerModificadoresDoModal() {
    const linhas = el.modalListaModificadores.querySelectorAll(".modificador-row");
    const lista = [];
    linhas.forEach(row => {
        const alvo = row.querySelector(".mod-alvo").value;
        const valor = Number(row.querySelector(".mod-valor").value) || 0;
        if (alvo && valor !== 0) lista.push({ alvo, valor });
    });
    return lista;
}

// ---------------------------------------------------------------------
// Modificações de arma (linhas de texto livre, com sugestões do manual)
// ---------------------------------------------------------------------
function montarModificacoesArma(lista) {
    el.modalArmaModificacoesLista.innerHTML = "";
    lista.forEach(texto => adicionarLinhaModificacaoArma(texto));
}

function adicionarLinhaModificacaoArma(textoAtual) {
    const fragmento = el.templateModificacaoArma.content.cloneNode(true);
    const row = fragmento.querySelector(".modificacao-arma-row");
    const input = row.querySelector(".modarma-texto");
    const btnRemover = row.querySelector(".modarma-remover");
    input.value = textoAtual || "";
    input.setAttribute("list", "lista-sugestoes-modificacao-arma");
    btnRemover.addEventListener("click", () => row.remove());
    el.modalArmaModificacoesLista.appendChild(row);
}

function configurarModificacoesArma() {
    // datalist de sugestões (HTML5 nativo, leve)
    if (!document.getElementById("lista-sugestoes-modificacao-arma")) {
        const datalist = document.createElement("datalist");
        datalist.id = "lista-sugestoes-modificacao-arma";
        MODIFICACOES_ARMA_SUGERIDAS.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            datalist.appendChild(opt);
        });
        document.body.appendChild(datalist);
    }
    el.modalArmaAddModificacao.addEventListener("click", () => adicionarLinhaModificacaoArma(""));
}

function lerModificacoesArmaDoModal() {
    const linhas = el.modalArmaModificacoesLista.querySelectorAll(".modarma-texto");
    return Array.from(linhas).map(i => i.value.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------
// Salvar / Excluir entidade do modal
// ---------------------------------------------------------------------
function gerarIdLocal() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

async function salvarEntidadeAtual() {
    if (!modalContexto) return;
    const { lista, id } = modalContexto;

    // Item do Banco Global: não depende de nenhuma ficha estar aberta.
    if (lista === "itensGlobais") {
        await salvarItemBancoDoModal(id);
        return;
    }

    if (!fichaAtual || !idAtivo()) { toast("Nenhuma ficha selecionada.", "erro"); return; }

    if (lista === "pericias") {
        await salvarPericiaDoModal(id);
        return;
    }
    if (lista === "inventario") {
        await salvarItemDoModal(id);
        return;
    }
    if (lista === "gastosExtras") {
        await salvarGastoDoModal(id);
        return;
    }

    // vantagens, desvantagens, fatosUniversais, especializacoes
    if (LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa()) {
        toast("Só o Mestre pode editar isso depois da criação do personagem.", "erro");
        return;
    }
    // Revalidação no momento de salvar (não só ao abrir o modal): cobre
    // o caso de duas abas abertas ao mesmo tempo tentando cadastrar a
    // 4ª desvantagem em paralelo.
    if (lista === "desvantagens" && !id && !podeAdicionarDesvantagem(fichaAtual)) {
        toast(`Limite de ${MAX_DESVANTAGENS} desvantagens atingido — não é possível adicionar mais.`, "erro");
        fecharModal();
        return;
    }
    const nome = el.modalNome.value.trim();
    if (!nome) { toast("Dê um nome antes de salvar.", "erro"); return; }
    // Preserva o estado do botão ativo/desativado ao editar um registro
    // já existente (senão salvar a descrição, por exemplo, reativaria
    // sem querer um efeito que o jogador tinha desligado).
    const existente = (id && fichaAtual[lista] && fichaAtual[lista][id]) || {};
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        ativo: existente.ativo ?? true
    };
    const idFinal = id || gerarIdLocal();
    if (!fichaAtual[lista]) fichaAtual[lista] = {};
    fichaAtual[lista][idFinal] = registro;
    await update(ref(db, `${caminhoBase()}/${lista}`), fichaAtual[lista]);
    toast(`${TITULOS_MODAL[lista]} salvo${id ? "" : " (novo)"}.`);
    fecharModal();
}

async function salvarPericiaDoModal(id) {
    const podeEditar = podeEditarPericiaAtributo();
    if (!podeEditar) {
        toast("Edição de perícias só na Criação, Level Up ou Treinamento.", "erro");
        return;
    }
    const nome = el.modalPericiaValor.value;
    if (!nome) { toast("Escolha uma perícia da lista (categoria → busca).", "erro"); return; }
    // Impede duplicar a mesma perícia em dois registros.
    const duplicada = Object.entries(fichaAtual.pericias || {}).find(([pid, p]) => p.nome === nome && pid !== id);
    if (duplicada) { toast("Essa perícia já está cadastrada.", "erro"); return; }

    // Requisito de acesso (ex.: Força Bruta — manual pg. 22): só se aplica
    // a quem ainda não tem essa perícia cadastrada (id novo). Godmode do
    // Mestre ignora isso, igual ao resto das travas de edição.
    if (!id && !(isMestre && godmodeAtivo)) {
        const requisito = atendeRequisitoPericia(nome, fichaAtual.dados, fichaAtual.pericias);
        if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
    }

    const nivel = Math.max(0, Math.min(5, Number(el.modalNivel.value) || 0));
    const registro = {
        nome,
        nivel,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        legado: !buscarPericiaPorNome(nome)
    };
    const idFinal = id || gerarIdLocal();
    fichaAtual.pericias[idFinal] = registro;
    await update(ref(db, `${caminhoBase()}/${caminhoLista("pericias")}`), fichaAtual.pericias);
    toast("Perícia salva.");
    fecharModal();
}

// Monta o objeto `arma` a partir do modal — compartilhado entre item de
// inventário e item do Banco Global. Sempre grava danoBase (número) e
// tipoDano; escala só se não for arma de fogo; e as características de
// Arma de Fogo (capacidade, disparos por turno, precisão, dificuldade
// de acerto, alcance, recuo, efeito extra) só quando a perícia vinculada
// for uma perícia de Arma de Fogo.
function lerConfigArmaDoModal(periciaUso, calibre) {
    const ehFogo = ehArmaDeFogo(periciaUso);
    // Escopeta (12 gauge) não usa carregador — nunca grava carregadorId
    // pra ela, mesmo que o select escondido ainda tenha um valor antigo.
    const usaCarregador = ehFogo && !ehCalibreEscopeta(calibre);
    return {
        danoBase: Number(el.modalArmaDanoBase.value) || 0,
        tipoDano: el.modalArmaTipoDano.value,
        // Tipo de dano extra — só se salva em arma branca (não-fogo) e só
        // se algo de fato foi escolhido (select vazio = "-- nenhum --").
        // Ver escolha na hora de atacar em abrirModalSelecionarAlvo/
        // resolverAtaque e em abrirModalArremessar/resolverArremessar.
        tipoDanoExtra: (!ehFogo && el.modalArmaTipoDanoExtra.value) ? el.modalArmaTipoDanoExtra.value : null,
        escala: ehFogo ? null : (el.modalArmaEscala.value || null),
        modificacoesArma: lerModificacoesArmaDoModal(),
        capacidade: ehFogo ? (Number(el.modalArmaCapacidade.value) || 0) : null,
        disparosPorTurno: ehFogo ? (Number(el.modalArmaDisparosTurno.value) || 1) : null,
        precisao: ehFogo ? (Number(el.modalArmaPrecisao.value) || 0) : null,
        dificuldadeAcerto: ehFogo ? (Number(el.modalArmaDificuldadeAcerto.value) || 0) : null,
        alcance: ehFogo ? (el.modalArmaAlcance.value || null) : null,
        recuo: ehFogo ? (el.modalArmaRecuo.value || null) : null,
        efeitoExtra: ehFogo ? el.modalArmaEfeitoExtra.value.trim() : "",
        carregadorId: usaCarregador ? (el.modalArmaCarregador.value || null) : null
    };
}

// Lê o(s) valor(es) de perícia vinculada do modal do item — array (só
// as marcadas) pra tags multi-perícia (eletrônico, ver ehTagMultiPericia
// em dados-manual.js), string única (ou null) pras demais. Usada tanto
// na criação/edição de item de ficha quanto no Banco Global de Itens.
function lerPericiaUsoDoModal(tag) {
    if (!tagTemPericiaUso(tag)) return null;
    if (ehTagMultiPericia(tag)) {
        const marcadas = Array.from(el.modalPericiaUsoCheckboxes.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value);
        return marcadas.length ? marcadas : null;
    }
    return el.modalPericiaUso.value || null;
}

// Lê se o item foi marcado como carteira digital e, se sim, o saldo
// atual — só se aplica a tags que podem ser saldo (eletrônico, ver
// ehTagQuePodeSerSaldo em dados-manual.js). Retorna { ehSaldo, saldoValor }
// já prontos pra gravar no item (ehSaldo false/undefined não devem
// deixar saldoValor lixo sobrando de uma marcação anterior).
function lerSaldoDoItemDoModal(tag) {
    if (!ehTagQuePodeSerSaldo(tag) || !el.modalItemEhSaldo.checked) {
        return { ehSaldo: false, saldoValor: null };
    }
    return { ehSaldo: true, saldoValor: Number(el.modalItemSaldoValor.value) || 0 };
}

// Lê peso e quantidade do modal e devolve o trio pronto pra gravar no
// item: `peso` continua sendo o peso TOTAL do registro (é o que
// pesoTotalPorCategoria e o resto do código já somam/leem direto, sem
// precisar saber de quantidade) — pra tags sem quantidade genérica
// (projétil/material/carregador, ver tagTemQuantidadeGeral em
// dados-manual.js) ele é só o valor digitado, igual sempre foi.
function lerPesoEQuantidadeDoModal(tag) {
    const pesoDigitado = Math.max(0, Number(el.modalPeso.value) || 0);
    if (!tagTemQuantidadeGeral(tag)) {
        return { peso: pesoDigitado, pesoUnitario: null, quantidade: null };
    }
    const quantidade = Math.max(1, Math.round(Number(el.modalQuantidade.value)) || 1);
    return { peso: +(pesoDigitado * quantidade).toFixed(2), pesoUnitario: pesoDigitado, quantidade };
}

async function salvarItemDoModal(id) {
    const nome = el.modalNome.value.trim();
    const tag = el.modalTag.value;
    if (!nome) { toast("Dê um nome ao item.", "erro"); return; }
    if (!tag) { toast("Toda item precisa de uma tag do sistema.", "erro"); return; }

    const exigePericia = tagExigePericiaUso(tag);
    const periciaUso = lerPericiaUsoDoModal(tag);
    const { ehSaldo, saldoValor } = lerSaldoDoItemDoModal(tag);
    const { peso, pesoUnitario, quantidade } = lerPesoEQuantidadeDoModal(tag);
    if (exigePericia && !periciaUso) { toast("Escolha a perícia vinculada a este item.", "erro"); return; }

    const exigeClasseProtecao = tagExigeClasseProtecao(tag, periciaUso);
    const classeProtecao = exigeClasseProtecao ? el.modalClasseProtecao.value : null;
    if (exigeClasseProtecao && !classeProtecao) { toast("Escolha a classe de proteção deste item.", "erro"); return; }

    const exigeCalibre = tagUsaCalibreEspecifico(tag, periciaUso);
    const calibre = exigeCalibre ? el.modalCalibre.value : null;
    if (exigeCalibre && !calibre) { toast("Escolha o calibre deste item.", "erro"); return; }

    const exigeLocalProtegido = tagExigeLocalProtegido(tag);
    const localProtegido = exigeLocalProtegido ? el.modalLocalProtegido.value : null;
    if (exigeLocalProtegido && !localProtegido) { toast("Escolha o que este item protege.", "erro"); return; }

    // Carregador — preserva a munição já carregada (se estiver editando um
    // carregador existente); só a capacidade máxima é editável aqui.
    let carregador = null;
    if (tagExigeCapacidadeCarregador(tag)) {
        const capacidadeMax = Number(el.modalCarregadorCapacidade.value) || 0;
        if (capacidadeMax <= 0) { toast("Informe a capacidade do carregador.", "erro"); return; }
        const existenteCarregador = (id && fichaAtual.inventario && fichaAtual.inventario[id] && fichaAtual.inventario[id].carregador) || null;
        const municaoAtual = Math.min(existenteCarregador?.municaoAtual || 0, capacidadeMax);
        carregador = {
            capacidadeMax,
            municaoAtual,
            projeteisCarregados: existenteCarregador?.projeteisCarregados || []
        };
    }

    // Projétil — quantidade de rounds que esse item representa, editável
    // direto no modal (campo "Quantidade de projéteis"). Item novo usa o
    // que estiver no campo (padrão 1); editando um existente, começa
    // pré-preenchido com a quantidade já salva, então só muda se o
    // jogador realmente mexer no número.
    let projetil = null;
    if (tagExigeQuantidadeProjetil(tag)) {
        projetil = { quantidade: Math.max(0, Number(el.modalProjetilQuantidade.value) || 0) };
    }

    // Preserva o estado do botão ativo/desativado ao editar um item já
    // existente (senão editar peso/descrição, por exemplo, reativaria
    // sem querer um item que o jogador tinha desligado).
    const existenteItem = (id && fichaAtual.inventario && fichaAtual.inventario[id]) || {};
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        ativo: existenteItem.ativo ?? true,
        tag,
        nivelTag: tagTemNivel(tag) ? Number(el.modalNivelTag.value) : null,
        peso,
        pesoUnitario,
        quantidade,
        categoria: el.modalCategoriaItem.value || "levando",
        periciaUso,
        ehSaldo,
        saldoValor,
        classeProtecao,
        calibre,
        reducoesDano: tagPodeReduzirDano(tag) ? lerReducaoDanoDoModal() : [],
        localProtegido,
        arma: ehArma(tag) ? lerConfigArmaDoModal(periciaUso, calibre) : null,
        carregador,
        projetil,
        // Equipável (checkbox independente da tag — ver atualizarCamposPorTag):
        // arma já é sempre equipável por natureza, então o checkbox some e
        // fica implicitamente false aqui (itemEhEquipavel ainda cobre arma
        // via ehArma, ver inventario.js). "equipada" preserva o estado atual
        // (senão editar qualquer outro campo do item desequiparia sem querer).
        equipavel: tag !== "arma" ? !!el.modalEquipavel.checked : false,
        equipada: existenteItem.equipada ?? false,
        // Material de criação: tipo/qualidade/quantidade em estoque —
        // ver atualizarCamposPorTag. Itens antigos que só tinham a
        // marcação implícita (feita de leve em abrirModalEscolherMateriais,
        // antes desse campo existir no modal) continuam preservados aqui
        // se o item não for tag "material" nesta edição.
        materialTipo: tag === "material" ? el.modalMaterialTipo.value : (existenteItem.materialTipo ?? null),
        materialQualidade: tag === "material" ? (qualidadesDoMaterial(el.modalMaterialTipo.value) ? el.modalMaterialQualidade.value : null) : (existenteItem.materialQualidade ?? null),
        materialQuantidade: tag === "material" ? Math.max(0, Number(el.modalMaterialQuantidade.value) || 0) : (existenteItem.materialQuantidade ?? null)
    };
    const idFinal = id || gerarIdLocal();
    if (!fichaAtual.inventario) fichaAtual.inventario = {};
    fichaAtual.inventario[idFinal] = registro;
    await update(ref(db, `${caminhoBase()}/inventario`), fichaAtual.inventario);

    // "Save & Reuse": se o checkbox estiver marcado, o mesmo item também
    // vai pro Banco Global (sem o campo "categoria", que é específico de
    // onde ele está guardado nesta ficha). Isso é feito num try/catch
    // separado do resto: se o item já foi salvo na ficha (linha acima)
    // mas o envio pro Banco falhar (ex: permissão do Firebase), o
    // jogador precisa VER o erro — antes essa falha ficava muda (uma
    // promise rejeitada sem .catch), então o item ficava salvo só na
    // ficha e nunca aparecia na Biblioteca, sem nenhum aviso.
    if (el.modalCampoSalvarBanco.style.display !== "none" && el.modalSalvarBanco.checked) {
        const nomeJogador = fichaAtual?.config?.nomeExibicao || fichaAtualId;
        try {
            await salvarItemNoBanco(registro, nomeJogador);
            toast(`Item salvo na ficha e no Banco Global.`);
        } catch (erro) {
            console.error("Falha ao salvar item no Banco Global:", erro);
            toast(`Item salvo na ficha, mas FALHOU ao salvar no Banco Global (${erro.message || "erro desconhecido"}).`, "erro");
        }
    } else {
        toast("Item salvo.");
    }
    fecharModal();
}

// ---------------------------------------------------------------------
// Item do Banco Global — mesmo formulário do item de inventário
// (prepararModalItem com ehBanco=true), mas persiste direto em
// itensGlobais/{id} em vez de fichas/{id}/inventario. Usado pela aba
// "Biblioteca de Itens Salvos" do Painel do Mestre, tanto pra criar um
// item do zero quanto pra editar um já existente.
// ---------------------------------------------------------------------
async function salvarItemBancoDoModal(id) {
    if (!isMestre) { toast("Só o Mestre gerencia a Biblioteca de Itens.", "erro"); return; }
    const nome = el.modalNome.value.trim();
    const tag = el.modalTag.value;
    if (!nome) { toast("Dê um nome ao item.", "erro"); return; }
    if (!tag) { toast("Todo item precisa de uma tag do sistema.", "erro"); return; }

    const exigePericia = tagExigePericiaUso(tag);
    const periciaUso = lerPericiaUsoDoModal(tag);
    const { ehSaldo, saldoValor } = lerSaldoDoItemDoModal(tag);
    const { peso, pesoUnitario, quantidade } = lerPesoEQuantidadeDoModal(tag);
    if (exigePericia && !periciaUso) { toast("Escolha a perícia vinculada a este item.", "erro"); return; }

    const exigeClasseProtecao = tagExigeClasseProtecao(tag, periciaUso);
    const classeProtecao = exigeClasseProtecao ? el.modalClasseProtecao.value : null;
    if (exigeClasseProtecao && !classeProtecao) { toast("Escolha a classe de proteção deste item.", "erro"); return; }

    const exigeCalibre = tagUsaCalibreEspecifico(tag, periciaUso);
    const calibre = exigeCalibre ? el.modalCalibre.value : null;
    if (exigeCalibre && !calibre) { toast("Escolha o calibre deste item.", "erro"); return; }

    const exigeLocalProtegido = tagExigeLocalProtegido(tag);
    const localProtegido = exigeLocalProtegido ? el.modalLocalProtegido.value : null;
    if (exigeLocalProtegido && !localProtegido) { toast("Escolha o que este item protege.", "erro"); return; }

    // Molde do Banco Global: carregador/carregadorId nunca guardam estado
    // de munição de uma ficha específica — só a capacidade máxima serve
    // de template; o resto começa zerado/vazio.
    let carregador = null;
    if (tagExigeCapacidadeCarregador(tag)) {
        const capacidadeMax = Number(el.modalCarregadorCapacidade.value) || 0;
        if (capacidadeMax <= 0) { toast("Informe a capacidade do carregador.", "erro"); return; }
        carregador = { capacidadeMax, municaoAtual: 0, projeteisCarregados: [] };
    }
    // Molde do Banco Global — a quantidade agora é editável no mesmo
    // campo do item de ficha; item novo usa o que estiver lá (padrão 1).
    let projetil = null;
    if (tagExigeQuantidadeProjetil(tag)) {
        projetil = { quantidade: Math.max(0, Number(el.modalProjetilQuantidade.value) || 0) };
    }
    const armaConfig = ehArma(tag) ? lerConfigArmaDoModal(periciaUso, calibre) : null;
    if (armaConfig) armaConfig.carregadorId = null;

    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        tag,
        nivelTag: tagTemNivel(tag) ? Number(el.modalNivelTag.value) : null,
        peso,
        pesoUnitario,
        quantidade,
        periciaUso,
        ehSaldo,
        saldoValor,
        classeProtecao,
        calibre,
        reducoesDano: tagPodeReduzirDano(tag) ? lerReducaoDanoDoModal() : [],
        localProtegido,
        arma: armaConfig,
        carregador,
        projetil,
        // Equipável — molde do Banco Global; item criado a partir dele
        // já nasce com essa marcação (ver salvarItemDoModal).
        equipavel: tag !== "arma" ? !!el.modalEquipavel.checked : false,
        // Molde do Banco Global de material: guarda tipo/qualidade como
        // referência, mas a quantidade em estoque é zerada — ela é
        // específica de cada ficha, não faz sentido "herdar estoque"
        // de um molde compartilhado entre todas as mesas.
        materialTipo: tag === "material" ? el.modalMaterialTipo.value : null,
        materialQualidade: tag === "material" ? (qualidadesDoMaterial(el.modalMaterialTipo.value) ? el.modalMaterialQualidade.value : null) : null,
        materialQuantidade: null
    };

    try {
        if (id) {
            await atualizarItemBanco(id, registro);
            toast("Item do Banco Global atualizado.");
        } else {
            await salvarItemNoBanco(registro, null);
            toast("Item criado no Banco Global.");
        }
        fecharModal();
    } catch (erro) {
        console.error("Falha ao salvar item no Banco Global:", erro);
        toast(`Falha ao salvar no Banco Global (${erro.message || "erro desconhecido"}).`, "erro");
    }
}

async function salvarGastoDoModal(id) {
    const nome = el.modalNome.value.trim();
    if (!nome) { toast("Dê um nome ao gasto.", "erro"); return; }
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        valor: Number(el.modalNivel.value) || 0
    };
    const idFinal = id || gerarIdLocal();
    if (!fichaAtual.gastosExtras) fichaAtual.gastosExtras = {};
    fichaAtual.gastosExtras[idFinal] = registro;
    await update(ref(db, `${caminhoBase()}/gastosExtras`), fichaAtual.gastosExtras);
    toast("Gasto salvo.");
    fecharModal();
}

async function excluirEntidadeAtual() {
    if (!modalContexto || !modalContexto.id) return;
    const { lista, id } = modalContexto;

    if (lista === "itensGlobais") {
        if (!isMestre) { toast("Só o Mestre gerencia a Biblioteca de Itens.", "erro"); return; }
        if (!confirm("Excluir este item do Banco Global? Isso não afeta itens já copiados pra fichas.")) return;
        await excluirItemBanco(id);
        toast("Item removido do Banco Global.");
        fecharModal();
        return;
    }

    if (!fichaAtual || !idAtivo()) { toast("Nenhuma ficha selecionada.", "erro"); return; }

    if (lista === "pericias" && !podeEditarPericiaAtributo()) {
        toast("Edição de perícias só na Criação, Level Up ou Treinamento.", "erro");
        return;
    }

    if (LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa()) {
        toast("Só o Mestre pode remover isso depois da criação do personagem.", "erro");
        return;
    }

    // Item de inventário, pedido por um jogador: não apaga na hora — vira
    // um pedido pendente pro Mestre aprovar (regra 4).
    if (lista === "inventario" && !isMestre) {
        const item = fichaAtual.inventario[id];
        if (!item) return;
        if (!confirm(`Pedir ao Mestre pra remover "${item.nome}" do seu inventário?`)) return;
        const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
        await criarAcaoPendente({
            tipo: "remover_item",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer deletar "${item.nome}".`,
            payload: { itemId: id, itemNome: item.nome }
        });
        toast("Pedido de remoção enviado ao Mestre.");
        fecharModal();
        return;
    }

    if (!confirm("Excluir este registro? Essa ação não pode ser desfeita.")) return;

    delete fichaAtual[lista][id];
    await remove(ref(db, `${caminhoBase()}/${caminhoLista(lista)}/${id}`));
    toast("Excluído.");
    fecharModal();
}

// =====================================================================
// CALENDÁRIO
// =====================================================================

function configurarCalendario() {
    // Campo de texto (não type="number") de propósito — em boa parte dos
    // teclados numéricos de celular, o <input type="number"> não mostra
    // a tecla de "-", tornando impossível digitar temperatura negativa.
    // Aqui só filtra o que é digitado pra aceitar dígitos e um sinal de
    // menos opcional na frente (ex: "-5", "12").
    if (el.calEditTemp) {
        el.calEditTemp.addEventListener("input", () => {
            const negativo = el.calEditTemp.value.trim().startsWith("-");
            const digitos = el.calEditTemp.value.replace(/[^0-9]/g, "");
            el.calEditTemp.value = (negativo ? "-" : "") + digitos;
        });
    }

    ouvirCalendario((cal) => {
        if (!cal) return;
        calendarioAtual = cal;
        el.calData.innerText = cal.dataLabel || "—";
        el.calDiaSemana.innerText = cal.diaSemana || "—";
        el.calHora.innerText = cal.hora || "—";
        el.calTemperatura.innerText = (cal.temperatura ?? "—") + "°C";
        el.calClima.innerText = cal.clima || "—";

        if (isMestre) {
            if (document.activeElement !== el.calEditData) el.calEditData.value = cal.dataLabel || "";
            if (document.activeElement !== el.calEditHora) el.calEditHora.value = cal.hora || "";
            if (document.activeElement !== el.calEditTemp) el.calEditTemp.value = cal.temperatura ?? "";
            el.calEditClima.value = cal.clima || climas()[0];
            el.calEditDiaSemana.value = cal.diaSemana || diasSemana()[0];
        }
    });

    if (isMestre) {
        el.btnSalvarCalendario.addEventListener("click", async () => {
            const novo = {
                ...calendarioAtual,
                dataLabel: el.calEditData.value,
                diaSemana: el.calEditDiaSemana.value,
                hora: el.calEditHora.value,
                temperatura: Number(el.calEditTemp.value) || 0,
                clima: el.calEditClima.value
            };
            try {
                await salvarCalendario(novo);
                // Atualiza a variável local NA HORA, sem esperar o listener
                // ouvirCalendario ecoar de volta do servidor (assíncrono,
                // não é instantâneo). Sem isso, clicar em "Passar o dia"
                // logo depois de "Salvar calendário" corria o risco de
                // pegar calendarioAtual ainda com o valor ANTIGO (o de
                // antes deste salvamento) e avançar 1 dia a partir dele —
                // sobrescrevendo a data que acabou de ser salva com "data
                // antiga + 1 dia".
                calendarioAtual = novo;
                toast("Calendário atualizado.");
            } catch (err) {
                // Antes essa falha era silenciosa (sem try/catch, sem
                // toast nenhum) — dava a impressão de ter salvo (a tela
                // nem sempre refletia isso na hora) quando na verdade
                // NADA tinha ido pro banco, e "Passar o dia" continuava
                // avançando a partir da última data que realmente estava
                // salva lá (por isso "voltava" pra data antiga).
                console.error(err);
                toast(`Falha ao salvar o calendário: ${err.message || err}`, "erro");
            }
        });

        el.btnPassarDia.addEventListener("click", async () => {
            if (!calendarioAtual) return;
            try {
                const fichasParaPopup = todasAsFichasCache;
                const { calendario, virouDomingo, popups } = await passarODia(calendarioAtual, fichasParaPopup);
                // Mesmo motivo do handler de "Salvar calendário" acima:
                // evita que um segundo clique rápido em "Passar o dia" (ou
                // um clique em "Salvar calendário" logo em seguida) use a
                // versão antiga do dia, de antes deste avanço.
                calendarioAtual = calendario;
                toast(virouDomingo ? "Dia avançado — caiu Domingo!" : "Dia avançado.");
            } catch (err) {
                console.error(err);
                toast(`Falha ao passar o dia: ${err.message || err}`, "erro");
            }
        });
    }
}

// =====================================================================
// LOG DE DADOS
// =====================================================================

function configurarLogDados() {
    ouvirLogDados((lista) => {
        el.logDadosLista.innerHTML = "";
        if (!lista.length) {
            el.logDadosLista.innerHTML = `<li class="log-vazio">Nenhuma rolagem ainda. As próximas aparecem aqui em tempo real.</li>`;
            return;
        }
        // ouvirLogDados entrega mais recente primeiro; pra ler como chat
        // (mais antiga em cima, mais nova embaixo) invertemos a ordem.
        const cronologica = [...lista].reverse();
        cronologica.forEach(entrada => {
            const li = document.createElement("li");
            const classeCritico = entrada.critico === "acerto" ? " log-critico-acerto" : (entrada.critico === "falha" ? " log-critico-falha" : "");
            li.className = "log-bolha" + (entrada.quem && entrada.quem.toLowerCase().includes("mestre") ? " log-mestre" : "") + classeCritico;
            const modText = entrada.modificador ? ` (${entrada.modificador >= 0 ? "+" : ""}${entrada.modificador})` : "";
            const hora = entrada.timestamp ? new Date(entrada.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
            const badgeCritico = entrada.critico === "acerto"
                ? `<span class="log-badge-critico acerto">⚡ ACERTO CRÍTICO</span>`
                : (entrada.critico === "falha" ? `<span class="log-badge-critico falha">🔥 FALHA CRÍTICA</span>` : "");
            li.innerHTML = `
                <div class="log-linha-topo">
                    <span class="log-quem">${escapeHtml(entrada.quem || "—")}</span>
                    <span class="log-hora">${hora}</span>
                </div>
                ${badgeCritico}
                ${entrada.detalhe ? `<span class="log-detalhe">${escapeHtml(entrada.detalhe)}</span>` : ""}
                <div class="log-resultado-linha">
                    <span class="log-resultado">${entrada.resultado}</span>
                    <span class="log-detalhe">${modText.trim()}</span>
                </div>
            `;
            el.logDadosLista.appendChild(li);
        });
        // Rola pra última mensagem (como em qualquer chat).
        const wrap = el.logDadosLista.parentElement;
        wrap.scrollTop = wrap.scrollHeight;
    });

    el.btnToggleLog.addEventListener("click", () => {
        el.logDados.classList.toggle("minimizado");
    });

    el.logRolarBtn.addEventListener("click", async () => {
        const modificador = Number(el.logRolarMod.value) || 0;
        const quem = isMestre ? "Mestre" : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");
        const bruto = rolarD20();
        const resultado = bruto + modificador;
        await registrarRolagem({ quem, modificador, resultado, detalhe: `d20: ${bruto}` });
        el.logRolarMod.value = "0";
    });
}

// =====================================================================
// GODMODE
// =====================================================================

function configurarGodmode() {
    ouvirGodmode((ativo) => {
        godmodeAtivo = ativo;
        el.godmodeIndicador.style.display = ativo ? "inline-block" : "none";
        if (isMestre) el.chkGodmode.checked = ativo;
        if (fichaAtual) renderizarTudo();
    });

    el.chkGodmode.addEventListener("change", async (e) => {
        await definirGodmode(e.target.checked);
    });

    // Sub-opção: só existe e só tem efeito com o Godmode ativo, mas fica
    // guardada à parte (ver ouvirIgnorarPenalidadeSaude em mestre.js) pra
    // manter o estado marcado/desmarcado entre uma sessão de Godmode e
    // outra, em vez de resetar sozinha toda vez.
    if (el.chkGodmodeIgnorarSaude) {
        ouvirIgnorarPenalidadeSaude((ativo) => {
            ignorarPenalidadeSaudeAtivo = ativo;
            el.chkGodmodeIgnorarSaude.checked = ativo;
            if (fichaAtual) renderizarTudo();
        });

        el.chkGodmodeIgnorarSaude.addEventListener("change", async (e) => {
            await definirIgnorarPenalidadeSaude(e.target.checked);
        });
    }
}

// =====================================================================
// GERENCIADOR DE COMBATE (compartilhado — Mestre monta, jogador consome)
// =====================================================================

function configurarCombateAtivo() {
    ouvirCombateAtivo((estado) => {
        combateAtivoCache = estado || { ativo: false, participantes: {} };
        // Se o modal do Gerenciador de Combate estiver aberto no momento,
        // atualiza a lista em tempo real.
        if (isMestre && el.modalCombateMestre && el.modalCombateMestre.classList.contains("active")) {
            el.combateMestreCorpo.innerHTML = "";
            montarGerenciadorCombate(el.combateMestreCorpo);
        }
        if (!isMestre) {
            renderizarAlertaIniciativaCombate();
            travarAcoesForaDoTurno();
            if (painelIniciativaJogadorAberto) montarPainelIniciativaJogador();
        }
        avaliarReacaoPendente();
    });
}

// Mostra o modal de Esquiva/Bloqueio pra quem RECEBEU o golpe (não pra
// quem atacou) — é o mesmo estado de combate sincronizado em tempo real
// pra todo mundo, então cada cliente decide localmente se essa reação
// pendente é "sua" (participanteId bate com a própria ficha) ou se é de
// um NPC (nesse caso, o Mestre resolve). O Mestre também vê/responde
// como reforço, caso o jogador-alvo não esteja com a aba aberta.
function avaliarReacaoPendente() {
    const r = combateAtivoCache && combateAtivoCache.reacaoPendente;
    if (!r) {
        el.modalReacaoDefesa.classList.remove("active");
        return;
    }
    const souOAlvo = !isMestre && meuParticipanteIdCombate() === r.participanteId;
    if (!souOAlvo && !isMestre) {
        el.modalReacaoDefesa.classList.remove("active");
        return;
    }
    renderizarReacaoPendente(r);
}

function renderizarReacaoPendente(r) {
    const avisoBase = r.ehArmaFogo
        ? `${escapeHtml(r.nomeAlvo)} tem Esquiva/Bloqueio guardada, mas não dá pra esquivar/aparar de arma de fogo — só Bloquear ou levar o golpe cheio. Bloquear reduz o dano pela metade (não reduz dano perfurante).`
        : `${escapeHtml(r.nomeAlvo)} tem a ação de Esquiva/Bloqueio guardada. Esquivar rola Agilidade (+ bônus de Boxe, se tiver) contra o resultado do ataque — só anula o golpe se bater; Aparar (com teste de perícia contra o resultado do ataque) anula o golpe E permite contra-atacar na hora com -1; Bloquear reduz o dano pela metade (não reduz dano perfurante). Escolha uma opção, ou deixe passar o golpe cheio sem gastar a ação.`;
    el.reacaoDefesaCorpo.innerHTML = `
        <p class="hint">${escapeHtml(r.nomeAtacante)} acertou ${escapeHtml(r.nomeAlvo)} com ${escapeHtml(r.nomeArma)} (${r.resultadoAtaque} vs. dificuldade ${r.dificuldade}). Dano previsto${escapeHtml(r.danoDadoTexto || "")}: ${r.danoTotal} (${escapeHtml(r.tipoDanoLabel)}).</p>
        <p class="hint">${avisoBase}</p>
        <div id="reacao-aparar-painel" style="display:none;"></div>
    `;
    el.reacaoDefesaBotoes.innerHTML = "";
    const painelAparar = el.reacaoDefesaCorpo.querySelector("#reacao-aparar-painel");

    const responder = async (escolha, dadosExtra) => {
        el.reacaoDefesaBotoes.querySelectorAll("button").forEach(b => b.disabled = true);
        const resultado = await responderReacaoPendente(escolha, dadosExtra || null);
        if (resultado) toast(resultado.detalhe);
        el.modalReacaoDefesa.classList.remove("active");
    };

    // Não dá pra esquivar/aparar de tiro (só de golpes corpo a corpo/
    // arma branca) — os botões "Esquivar"/"Aparar" só aparecem pra
    // golpes que não vieram de arma de fogo.
    if (!r.ehArmaFogo) {
        const btnEsquivar = document.createElement("button");
        btnEsquivar.className = "btn-lime"; btnEsquivar.type = "button"; btnEsquivar.innerText = "Esquivar";
        btnEsquivar.addEventListener("click", async () => {
            btnEsquivar.disabled = true;
            const modDado = await calcularModEsquivarParticipante(r.alvoTipo, r.alvoRefId, r.ataqueArmaBranca);
            const brutoDado = rolarD20();
            const resultadoDado = brutoDado + modDado;
            await responder("esquivar", { brutoDado, modDado, resultadoDado });
        });
        el.reacaoDefesaBotoes.appendChild(btnEsquivar);

        // Manual: "não é possível aparar ataques de armas brancas
        // estando desarmado" — se o golpe recebido veio de uma perícia
        // de arma branca, só oferece perícias de arma branca pra aparar
        // (o alvo precisa estar armado com algo do mesmo tipo pra
        // aparar); golpe desarmado/CQC libera qualquer uma das 9.
        const opcoesPericiaAparar = r.ataqueArmaBranca ? PERICIAS_ARMA_BRANCA : PERICIAS_APARAR;
        const btnAparar = document.createElement("button");
        btnAparar.className = "btn-lime"; btnAparar.type = "button"; btnAparar.innerText = "Aparar";
        btnAparar.addEventListener("click", () => {
            painelAparar.style.display = "block";
            painelAparar.innerHTML = `
                <div class="modal-field">
                    <label>Aparar com qual perícia? (dificuldade = ${r.resultadoAtaque}, o resultado do ataque)</label>
                    <select id="reacao-aparar-select">
                        ${opcoesPericiaAparar.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("")}
                    </select>
                </div>
                <button id="reacao-aparar-confirmar" class="btn-lime" type="button">Rolar Aparar</button>
            `;
            painelAparar.querySelector("#reacao-aparar-confirmar").addEventListener("click", async () => {
                const periciaEscolhida = painelAparar.querySelector("#reacao-aparar-select").value;
                painelAparar.querySelector("#reacao-aparar-confirmar").disabled = true;
                const modDado = await calcularModApararParticipante(r.alvoTipo, r.alvoRefId, periciaEscolhida);
                const brutoDado = rolarD20();
                const resultadoDado = brutoDado + modDado;
                await responder("aparar", { periciaEscolhida, brutoDado, modDado, resultadoDado });
            });
        });
        el.reacaoDefesaBotoes.appendChild(btnAparar);
    }
    const btnBloquear = document.createElement("button");
    btnBloquear.className = "btn-blue"; btnBloquear.type = "button"; btnBloquear.innerText = "Bloquear";
    btnBloquear.addEventListener("click", () => responder("bloquear"));
    const btnNenhuma = document.createElement("button");
    btnNenhuma.className = "btn-ghost"; btnNenhuma.type = "button"; btnNenhuma.innerText = "Levar o golpe cheio";
    btnNenhuma.addEventListener("click", () => responder("nenhuma"));
    el.reacaoDefesaBotoes.appendChild(btnBloquear);
    el.reacaoDefesaBotoes.appendChild(btnNenhuma);
    el.modalReacaoDefesa.classList.add("active");
}

// Modificador (d20 + isso) do teste de Esquivar de quem RECEBEU o golpe
// (manual: Agilidade vs. dificuldade = pontuação do ataque sofrido).
// Mesma fórmula de Agilidade de combate usada em
// calcularStatsCombateParticipante (mestre.js) — penalidade de Machucado/
// Muito Machucado (estadoSaude) E de Exausto/Crítico (estadoEnergia), já
// que Agilidade é um teste físico igual iniciativa. Soma o bônus passivo
// de Boxe (manual pg. 22: +2 esquivando de golpe desarmado, +1 de arma
// branca — ver bonusEsquivaBoxe em dados-manual.js) quando o alvo tem a
// perícia, escolhendo o valor certo conforme `ataqueArmaBranca`. NPC
// "rápido" usa a Agilidade solta cadastrada nele (sem perícias, então
// nunca tem Boxe).
async function calcularModEsquivarParticipante(alvoTipo, alvoRefId, ataqueArmaBranca) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return 0;
        const fichaAlvo = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(fichaAlvo);
        const derivados = calcularDerivados(fichaAlvo.dados, modificadoresPlanos);
        const pvMaxCalc = Math.round(derivados.recursos.pv.total) + (Number(fichaAlvo.dados.pvBonusExtra) || 0);
        const overridePv = fichaAlvo.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalc;
        const pvAtual = (fichaAlvo.dados.pvAtual !== null && fichaAlvo.dados.pvAtual !== undefined) ? Number(fichaAlvo.dados.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(fichaAlvo.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        const energiaMax = Math.round(derivados.recursos.energia.total);
        const energiaAtual = (fichaAlvo.dados.energiaAtual !== null && fichaAlvo.dados.energiaAtual !== undefined) ? Number(fichaAlvo.dados.energiaAtual) : energiaMax;
        const estadoEnergia = calcularEstadoEnergia(energiaAtual, energiaMax, false);
        const modAgilidade = Math.round(derivados.secundarios.agilidade.total) + estadoSaude.penalidadeTestes + estadoEnergia.penalidadeFisica;
        const entradaBoxe = Object.entries(fichaAlvo.pericias || {}).find(([, p]) => p.nome === "Boxe");
        const bonusBoxe = entradaBoxe ? bonusEsquivaBoxe(entradaBoxe[1].nivel) : null;
        const extraBoxe = bonusBoxe ? (ataqueArmaBranca ? bonusBoxe.armaBranca : bonusBoxe.desarmado) : 0;
        return modAgilidade + extraBoxe;
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return 0;
    const npc = snap.val();
    if (npc.modoDetalhado && npc.atributosPrimarios) {
        const secundarios = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride);
        const pvMax = secundarios.recursos.pv.valor;
        const pvAtual = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(npc.periciasNpc, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        const energiaMax = secundarios.recursos.energia.valor;
        const energiaAtual = (npc.energiaAtual !== null && npc.energiaAtual !== undefined) ? Number(npc.energiaAtual) : energiaMax;
        const estadoEnergia = calcularEstadoEnergia(energiaAtual, energiaMax, false);
        const modAgilidade = Math.round(secundarios.secundarios.agilidade.valor) + estadoSaude.penalidadeTestes + estadoEnergia.penalidadeFisica;
        const entradaBoxe = npc.periciasNpc ? Object.entries(npc.periciasNpc).find(([, p]) => p.nome === "Boxe") : null;
        const bonusBoxe = entradaBoxe ? bonusEsquivaBoxe(entradaBoxe[1].nivel) : null;
        const extraBoxe = bonusBoxe ? (ataqueArmaBranca ? bonusBoxe.armaBranca : bonusBoxe.desarmado) : 0;
        return modAgilidade + extraBoxe;
    }
    return Number(npc.agilidade) || 0;
}

// Modificador (d20 + isso) do teste de Aparar de quem RECEBEU o golpe —
// busca os dados de perícia mais atuais direto do banco (funciona tanto
// pra um jogador quanto pra um NPC, detalhado ou "rápido"). Segue a
// MESMA regra de qualquer outro teste de perícia: nível 0/perícia
// ausente vira -1 fixo (destreinado), já com a penalidade de estado de
// saúde embutida (Machucado/Muito Machucado). NPC "rápido" (sem
// perícias estruturadas cadastradas) não tem como saber se está
// treinado — sempre conta como destreinado (-1).
async function calcularModApararParticipante(alvoTipo, alvoRefId, nomePericia) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return -1;
        const fichaAlvo = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(fichaAlvo);
        const pvMaxCalc = Math.round(calcularDerivados(fichaAlvo.dados, modificadoresPlanos).recursos.pv.total) + (Number(fichaAlvo.dados.pvBonusExtra) || 0);
        const overridePv = fichaAlvo.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalc;
        const pvAtual = (fichaAlvo.dados.pvAtual !== null && fichaAlvo.dados.pvAtual !== undefined) ? Number(fichaAlvo.dados.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(fichaAlvo.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        return modificadorDePericiaComPenalidade(nomePericia, fichaAlvo.dados, fichaAlvo.pericias, modificadoresPlanos, estadoSaude.penalidadeTestes);
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return -1;
    const npc = snap.val();
    if (npc.modoDetalhado && npc.periciasNpc) {
        const entrada = Object.values(npc.periciasNpc).find(p => p.nome === nomePericia);
        const nivel = entrada ? (Number(entrada.nivel) || 0) : 0;
        return nivel > 0 ? nivel : -1;
    }
    return -1;
}

// Melhor perícia do alvo dentro de uma lista fechada — usado pra
// dificuldade de Delimitar alcance ("11 + perícia corpo a corpo do
// alvo", lista padrão PERICIAS_APARAR, já que o manual não especifica
// QUAL perícia) e reaproveitado pra Imobilizar (CQC nível 4, lista
// PERICIAS_IMOBILIZAR_CQC — aí o manual É específico: "Jiu Jitsu, CQC
// ou Briga de Rua do alvo"). Busca tudo de uma vez (não chama
// calcularModApararParticipante em loop) pra economizar leituras.
async function calcularMelhorModCorpoACorpoParticipante(alvoTipo, alvoRefId, listaPericias = PERICIAS_APARAR) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return -1;
        const fichaAlvo = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(fichaAlvo);
        const pvMaxCalc = Math.round(calcularDerivados(fichaAlvo.dados, modificadoresPlanos).recursos.pv.total) + (Number(fichaAlvo.dados.pvBonusExtra) || 0);
        const overridePv = fichaAlvo.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalc;
        const pvAtual = (fichaAlvo.dados.pvAtual !== null && fichaAlvo.dados.pvAtual !== undefined) ? Number(fichaAlvo.dados.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(fichaAlvo.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        let melhor = -1;
        for (const nome of listaPericias) {
            const mod = modificadorDePericiaComPenalidade(nome, fichaAlvo.dados, fichaAlvo.pericias, modificadoresPlanos, estadoSaude.penalidadeTestes);
            if (mod > melhor) melhor = mod;
        }
        return melhor;
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return -1;
    const npc = snap.val();
    if (npc.modoDetalhado && npc.periciasNpc) {
        let melhor = -1;
        Object.values(npc.periciasNpc).forEach(p => {
            if (listaPericias.includes(p.nome)) {
                const nivel = Number(p.nivel) || 0;
                if (nivel > melhor) melhor = nivel;
            }
        });
        return melhor;
    }
    return -1;
}

function combateTemParticipantes() {
    return !!(combateAtivoCache && combateAtivoCache.ativo && combateAtivoCache.participantes && Object.keys(combateAtivoCache.participantes).length);
}

// Combate "com iniciativa" (ordem de turnos) ativo = tem ordemTurnos
// gravada, diferente de combateTemParticipantes() (que só checa se há
// alvos cadastrados pro botão "Usar").
function combateComIniciativaAtivo() {
    return !!(combateAtivoCache && combateAtivoCache.ativo && Array.isArray(combateAtivoCache.ordemTurnos) && combateAtivoCache.ordemTurnos.length);
}

// Acha o id do participante (chave dentro de combateAtivo/participantes)
// que corresponde à ficha atualmente logada, se ela estiver no combate.
function meuParticipanteIdCombate() {
    if (isMestre || !fichaAtualId) return null;
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const entrada = Object.entries(participantes).find(([, p]) => p.tipo === "ficha" && p.refId === fichaAtualId);
    return entrada ? entrada[0] : null;
}

// Equivalente a meuParticipanteIdCombate(), pro NPC que o Mestre está
// "atuando como" no momento (ver caminhoBase()/modoNpc).
function npcParticipanteIdCombate() {
    if (!modoNpc || !npcAtualId) return null;
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const entrada = Object.entries(participantes).find(([, p]) => p.tipo === "npc" && p.refId === npcAtualId);
    return entrada ? entrada[0] : null;
}

// Status de Agarrado (manual) de quem está sendo controlado nesta tela
// agora — a própria ficha do jogador, ou o NPC que o Mestre estiver
// atuando como. `null` se não estiver agarrado ou fora de combate.
function meuStatusAgarrado() {
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    return (participantes[meuPid] && participantes[meuPid].agarrado) || null;
}

// Status de Imobilizado (CQC nível 4) de quem está sendo controlado
// nesta tela agora. Diferente de Agarrado, bloqueia QUALQUER golpe
// (ver checagem em resolverAtaque) — não só alcance médio/longo.
function meuStatusImobilizado() {
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    return (participantes[meuPid] && participantes[meuPid].imobilizado) || null;
}

// Status de Desacordado (Jiu Jitsu nível 3) de quem está sendo
// controlado nesta tela agora — inconsciente, bloqueia TUDO igual
// Imobilizado (ver checagem em resolverAtaque), mas sem teste pra se
// libertar sozinho (ver definirDesacordado/soltarDesacordado em
// mestre.js).
function meuStatusDesacordado() {
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    return (participantes[meuPid] && participantes[meuPid].desacordado) || null;
}

// Agarrar (manual): "impossibilita golpes de alcance médio e longo".
// Pra manobras desarmadas com dano (Soco/Chute/Joelhada/Cotovelada), o
// alcance vem direto da própria manobra (MANOBRAS_COMBATE). Pra uma
// arma equipada, o sistema não guarda "alcance" por item — só a perícia
// vinculada — então o alcance é inferido a partir dela: perícias de
// combate bem próximo (curtas/desarmadas) liberam o golpe; arma de fogo
// e armas de alcance longo continuam bloqueadas.
const PERICIAS_ALCANCE_CURTO_AGARRADO = [
    "CQC", "Karatê Cobra Kai", "Jiu Jitsu", "Força Bruta", "Briga de Rua",
    "Muay Thai", "Boxe", "Lâminas Curtas", "Contundentes Curtas"
];
function golpeBloqueadoPorAgarrar(nomeAtaque, nomePericia) {
    const manobra = MANOBRAS_COMBATE.find(m => m.nome === nomeAtaque);
    if (manobra && manobra.alcance && manobra.alcance !== "Variável") {
        return manobra.alcance === "Médio" || manobra.alcance === "Longo";
    }
    return !PERICIAS_ALCANCE_CURTO_AGARRADO.includes(nomePericia);
}

// Status de Alcance Limitado (Delimitar alcance) de quem está sendo
// controlado nesta tela agora. Mesma ideia de meuStatusAgarrado().
function meuStatusAlcanceLimitado() {
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    return (participantes[meuPid] && participantes[meuPid].alcanceLimitado) || null;
}

// Alcance (Curto/Médio/Longo) de um golpe — mesma inferência usada em
// golpeBloqueadoPorAgarrar, mas distinguindo Médio de Longo (importa
// pra a exceção do Médio no Delimitar alcance). Prioriza o alcance
// cadastrado na própria manobra (Soco/Chute/etc); pra arma equipada,
// sem "alcance" próprio no banco, infere pela perícia vinculada — sem
// como saber Médio nesse caso (só via manobra explícita), então cai
// pra Longo se não for uma das perícias de combate bem próximo.
function alcanceDoGolpe(nomeAtaque, nomePericia) {
    const manobra = MANOBRAS_COMBATE.find(m => m.nome === nomeAtaque);
    if (manobra && ["Curto", "Médio", "Longo"].includes(manobra.alcance)) {
        return manobra.alcance;
    }
    return PERICIAS_ALCANCE_CURTO_AGARRADO.includes(nomePericia) ? "Curto" : "Longo";
}

// Delimitar alcance (manual): "escolha um alcance único pra poder ser
// utilizado. Alcance médio sempre pode ser utilizado em limite de curta
// distância causando metade do dano." — ou seja: só o alcance escolhido
// vale cheio; Médio (se não for o escolhido) ainda é permitido, mas com
// dano pela metade; qualquer outro alcance fica bloqueado.
function verificarAlcanceLimitado(statusAlcance, alcanceGolpe) {
    if (!statusAlcance || !statusAlcance.ativo) return { bloqueado: false, meioDano: false };
    if (alcanceGolpe === statusAlcance.valor) return { bloqueado: false, meioDano: false };
    if (alcanceGolpe === "Médio") return { bloqueado: false, meioDano: true };
    return { bloqueado: true, meioDano: false };
}

// ---------------------------------------------------------------------
// Trava de ações do turno, compartilhada entre toda rolagem em combate
// (perícia solta, manobra de combate, ataque com arma/item):
//   - Jogador: precisa ser o turno dele E ter ação sobrando; o gasto em
//     si entra na fila de Aprovação do Mestre (regra de ouro existente).
//   - Mestre atuando como NPC: mesma checagem de turno/ações, mas o
//     gasto é consumido NA HORA — o Mestre já é a autoridade que
//     aprovaria o próprio pedido, então a fila de aprovação não faz
//     sentido aqui.
//   - Fora de combate com iniciativa, ou personagem fora da lista de
//     participantes: ação livre, sem gasto de turno.
// Retorna null se a ação não pode prosseguir (toast já disparado), ou
// um objeto { participanteId, direto } — participanteId é null quando
// não há economia de ação a aplicar.
//
// permiteDireto (default true): controla se o gasto do Mestre agindo por
// um NPC pode ser consumido NA HORA (direto: true) ou se, mesmo sendo o
// Mestre, o gasto ainda assim precisa passar pela fila de Ações
// Pendentes (direto: false). Regra (manual/pedido do Mestre da mesa):
// SÓ rolagens de ataque corpo a corpo/arma branca (resolverAtaque com
// ehFogo === false) gastam ação automaticamente. Qualquer outra
// rolagem — tiro de arma de fogo, perícia solta, atributo (Percepção,
// Constituição etc.) — precisa sempre ir pro gerenciador de Ações
// Pendentes, mesmo quando é o próprio Mestre controlando o NPC que
// rolou, pra ele decidir se quer mesmo gastar a ação.
//
// ehCQC (default false): identifica se a rolagem em questão usa
// especificamente a perícia CQC — só importa pro CQC nível 5 ("Agente
// Impossível", manual: "recebe uma ação extra em seu turno para
// rolagens de CQC"). Quando o `acoes` normal já zerou, MAS ehCQC e
// ainda sobra `acoesExtraCQC`, a ação prossegue mesmo assim, usando
// esse contador separado (ver consumirAcaoExtraCQC em mestre.js) — o
// resultado devolve `extraCQC: true` pra quem chamou saber qual contador
// gastar. Cada chamador que já sabe qual perícia está rolando (ver
// resolverAtaque/resolverAgarrar/resolverDesarmar/resolverDerrubar/
// resolverImobilizar/resolverArremessar/resolverDelimitarAlcance/
// resolverRetomarAlcance/rolarERegistrar) passa isso adiante.
function checarConsumoDeAcao(permiteDireto = true, ehCQC = false) {
    if (!combateComIniciativaAtivo()) return { participanteId: null, direto: false, extraCQC: false };

    if (!isMestre) {
        const meuId = meuParticipanteIdCombate();
        if (!meuId) return { participanteId: null, direto: false, extraCQC: false };
        if (combateAtivoCache.turnoAtual !== meuId) {
            toast("Não é o seu turno.", "erro");
            return null;
        }
        const p = combateAtivoCache.participantes[meuId];
        if (p && Number(p.acoes) <= 0) {
            if (ehCQC && Number(p.acoesExtraCQC) > 0) {
                return { participanteId: meuId, direto: false, extraCQC: true };
            }
            toast("Sem ações restantes neste turno.", "erro");
            return null;
        }
        return { participanteId: meuId, direto: false, extraCQC: false };
    }

    if (modoNpc) {
        const npcPid = npcParticipanteIdCombate();
        if (!npcPid) return { participanteId: null, direto: false, extraCQC: false };
        if (combateAtivoCache.turnoAtual !== npcPid) {
            toast("Não é o turno desse NPC.", "erro");
            return null;
        }
        const p = combateAtivoCache.participantes[npcPid];
        if (p && Number(p.acoes) <= 0) {
            if (ehCQC && Number(p.acoesExtraCQC) > 0) {
                return { participanteId: npcPid, direto: !!permiteDireto, extraCQC: true };
            }
            toast("Esse NPC não tem ações restantes neste turno.", "erro");
            return null;
        }
        return { participanteId: npcPid, direto: !!permiteDireto, extraCQC: false };
    }

    return { participanteId: null, direto: false, extraCQC: false };
}

// ---------------------------------------------------------------------
// Alerta fixo no topo pro jogador: "VOCÊ ESTÁ EM COMBATE!" / "SEU TURNO
// AGORA!". Some sozinho quando o combate com iniciativa acaba.
// ---------------------------------------------------------------------
function renderizarAlertaIniciativaCombate() {
    let alerta = document.getElementById("alerta-iniciativa-combate");
    const meuId = meuParticipanteIdCombate();
    const estouNoCombate = combateComIniciativaAtivo() && meuId;

    if (!estouNoCombate) {
        if (alerta) alerta.remove();
        return;
    }

    if (!alerta) {
        alerta = document.createElement("button");
        alerta.id = "alerta-iniciativa-combate";
        alerta.type = "button";
        alerta.className = "btn-red combate-alerta-fixo";
        alerta.addEventListener("click", () => {
            painelIniciativaJogadorAberto = true;
            montarPainelIniciativaJogador();
        });
        document.body.appendChild(alerta);
    }

    const meuTurno = combateAtivoCache.turnoAtual === meuId;
    alerta.classList.toggle("combate-meu-turno", meuTurno);
    alerta.textContent = meuTurno ? "SEU TURNO AGORA!" : "VOCÊ ESTÁ EM COMBATE!";
}

// Bloqueia rolagens/ações da ficha (perícias, atributos, armas, manobras)
// sempre que houver combate com iniciativa ativo e não for o turno do
// jogador. O Mestre nunca é travado.
function travarAcoesForaDoTurno() {
    if (isMestre) return;
    const meuId = meuParticipanteIdCombate();
    const emCombate = combateComIniciativaAtivo();
    const meuTurno = emCombate && combateAtivoCache.turnoAtual === meuId;
    const bloquear = emCombate && !!meuId && !meuTurno;
    document.body.classList.toggle("combate-bloqueio-ativo", bloquear);
}

// ---------------------------------------------------------------------
// "Gerenciador de Combate do Jogador" — modal com a ordem de iniciativa
// completa, destacando quem está no turno.
// ---------------------------------------------------------------------
function montarPainelIniciativaJogador() {
    let modal = document.getElementById("modal-iniciativa-jogador");

    if (!combateComIniciativaAtivo()) {
        if (modal) modal.remove();
        painelIniciativaJogadorAberto = false;
        return;
    }

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-iniciativa-jogador";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const { ordemTurnos = [], participantes = {}, turnoAtual, rodada } = combateAtivoCache;
    const meuId = meuParticipanteIdCombate();

    const linhas = ordemTurnos.map(pid => {
        const p = participantes[pid];
        if (!p) return "";
        const ativo = pid === turnoAtual;
        const marcadorVoce = pid === meuId ? " (você)" : "";
        const qtdEsquivas = Number(p.esquivasDisponiveis) || 0;
        const badgeEsquiva = qtdEsquivas > 0 ? ` <span title="Tem ${qtdEsquivas} ação(ões) de Esquiva/Bloqueio guardada(s)">🛡️${qtdEsquivas > 1 ? `×${qtdEsquivas}` : ""}</span>` : "";
        const temContraAtaque = !!(combateAtivoCache.contraAtaquePendente && combateAtivoCache.contraAtaquePendente[pid]);
        const badgeContraAtaque = temContraAtaque ? ` <span title="Aparou! Tem um contra-ataque imediato guardado (modificador -1)">🗡️</span>` : "";
        const badgeAgarrado = (p.agarrado && p.agarrado.ativo)
            ? ` <span class="mod-pill negativo" title="Agarrado por ${escapeHtml(p.agarrado.porNome)} — golpes de alcance médio/longo bloqueados, dano pela metade">🔗 Agarrado</span>${pid === meuId ? ` <button type="button" class="btn-ghost btn-soltar-agarrado" data-soltar-agarrado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Soltar</button>` : ""}`
            : "";
        const badgeAlcance = (p.alcanceLimitado && p.alcanceLimitado.ativo)
            ? ` <span class="mod-pill negativo" title="Alcance limitado a ${p.alcanceLimitado.valor} por ${escapeHtml(p.alcanceLimitado.porNome)} — use Retomar alcance pra tirar">📏 Alcance: ${p.alcanceLimitado.valor}</span>`
            : "";
        const badgeDerrubado = (p.derrubado && p.derrubado.ativo)
            ? ` <span class="mod-pill negativo" title="Derrubado por ${escapeHtml(p.derrubado.porNome)} — dificuldade pra ser acertado cai -3; gasta 1 ação pra se levantar">🔻 Derrubado</span>${pid === meuId ? ` <button type="button" class="btn-ghost btn-levantar-derrubado" data-levantar-derrubado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Levantar</button>` : ""}`
            : "";
        // Imobilizado (CQC nível 4 — ver definirImobilizado em mestre.js):
        // bloqueio TOTAL de ataque enquanto durar (diferente de Agarrado,
        // que só bloqueia alcance médio/longo) — só se solta testando
        // Destreza no próprio turno (ver tentarLibertarImobilizado).
        const badgeImobilizado = (p.imobilizado && p.imobilizado.ativo)
            ? ` <span class="mod-pill negativo" title="Imobilizado por ${escapeHtml(p.imobilizado.porNome)} — não consegue atacar nem se mover; teste Destreza (dificuldade ${p.imobilizado.dificuldadeEscape}) no próprio turno pra se libertar">🔒 Imobilizado</span>${pid === meuId ? ` <button type="button" class="btn-ghost btn-libertar-imobilizado" data-libertar-imobilizado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Testar Destreza</button>` : ""}`
            : "";
        // Desacordado (Jiu Jitsu nível 3 — ver definirDesacordado em
        // mestre.js): inconsciente, sem teste pra se libertar sozinho —
        // por isso sem botão aqui; só o Mestre acorda (Gerenciador de
        // Combate do Mestre).
        const badgeDesacordado = (p.desacordado && p.desacordado.ativo)
            ? ` <span class="mod-pill negativo" title="Desacordado por ${escapeHtml(p.desacordado.porNome)} (Jiu Jitsu nível 3) — inconsciente, não age nem se defende; só o Mestre pode acordá-lo">💤 Desacordado</span>`
            : "";
        // Ossos quebrados (Jiu Jitsu níveis 4/5 — ver definirOssosQuebrados
        // em mestre.js): a penalidade em testes físicos e o "só se
        // arrasta" com as duas pernas quebradas ficam a critério do
        // Mestre (ver comentário em MANOBRA_QUEBRAR_OSSOS_JIUJITSU).
        const badgeOssosQuebrados = (p.ossosQuebrados && p.ossosQuebrados.ativo)
            ? ` <span class="mod-pill negativo" title="Ossos quebrados por ${escapeHtml(p.ossosQuebrados.porNome)} — reduz ${p.ossosQuebrados.pontosPenalidade} ponto(s) qualquer ação física (a critério do Mestre)${p.ossosQuebrados.arrastaSomente ? "; ambas as pernas quebradas — só dá pra se arrastar, testando Tolerância dificuldade 15" : (p.ossosQuebrados.pernasQuebradas >= 1 ? "; perna quebrada — impossibilita correr" : "")}">🦴 Ossos quebrados</span>`
            : "";
        // Disparar e Avançar (CQC nível 4 — ver iniciarIniciativaCombate
        // em mestre.js, que reserva a ação): botão só aparece pro dono
        // do participante enquanto não tiver sido usado ainda na rodada.
        const podeDispararAvancar = pid === meuId && p.dispararAvancarDisponivel && !p.dispararAvancarUsado;
        const botaoDispararAvancar = podeDispararAvancar
            ? ` <button type="button" class="btn-ghost btn-disparar-avancar-cqc" data-disparar-avancar-cqc="${pid}" style="padding:2px 6px;font-size:0.7rem;" title="CQC nível 4 — 2 disparos com pistola, fora da ordem de turno">🔫 Disparar e Avançar</button>`
            : "";
        const badgeSaude = badgeEstadoSaudeCombate(p);
        const badgeEnergia = badgeEstadoEnergiaCombate(p);
        const badgeStatus = badgeStatusAtivosCombate(p);
        // Jogador não vê o PV de NPC (só o próprio e o de outros
        // jogadores) — só o Mestre tem essa informação, no Gerenciador de
        // Combate dele (montarGerenciadorCombate). Sem isso o painel do
        // jogador entregava de graça quanto PV um inimigo ainda tinha.
        const pvTexto = p.tipo === "npc" ? "" : `<span>${p.pv}/${p.pvMax} PV</span>`;
        // CQC nível 5: ação extra separada, só pra rolagens de CQC (ver
        // checarConsumoDeAcao/ehCQC) — mostrada à parte do contador
        // normal pra não confundir com uma ação genérica a mais.
        const acaoExtraCQCTexto = Number(p.acoesExtraCQCMax) > 0 ? ` <span title="CQC nível 5 (Agente Impossível) — ação extra só pra rolagens de CQC">🥋 ${p.acoesExtraCQC}/${p.acoesExtraCQCMax} ação CQC</span>` : "";
        return `
            <div class="combate-linha ${ativo ? "combate-linha-ativa" : ""}">
                <span class="combate-nome">${escapeHtml(p.nome)}${marcadorVoce}${badgeEsquiva}${badgeContraAtaque}${badgeAgarrado}${badgeAlcance}${badgeDerrubado}${badgeImobilizado}${badgeDesacordado}${badgeOssosQuebrados}${botaoDispararAvancar}${badgeSaude}${badgeEnergia}${badgeStatus}</span>
                <span>Iniciativa ${p.iniciativa}${p.bonusCQCIniciativa ? " (+1 CQC nível 2)" : ""}${p.bonusCobraKaiIniciativa ? ` (+${p.bonusCobraKaiIniciativa} Cobra Kai)` : ""}</span>
                ${pvTexto}
                <span>${p.acoes}/${p.acoesMax} ações${acaoExtraCQCTexto}</span>
            </div>`;
    }).join("");

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Rodada ${rodada || 1}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Gerenciador de Combate do Jogador</h4>
        <div class="combate-lista">${linhas}</div>
    `;

    modal.querySelectorAll("[data-soltar-agarrado]").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await soltarAgarrado(btn.dataset.soltarAgarrado);
        });
    });

    modal.querySelectorAll("[data-levantar-derrubado]").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await tentarLevantarDerrubado(btn.dataset.levantarDerrubado);
        });
    });

    modal.querySelectorAll("[data-libertar-imobilizado]").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await tentarLibertarImobilizado(btn.dataset.libertarImobilizado);
        });
    });

    modal.querySelectorAll("[data-disparar-avancar-cqc]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirModalDispararAvancar();
        });
    });

    modal.querySelector(".combate-fechar").addEventListener("click", () => {
        modal.remove();
        painelIniciativaJogadorAberto = false;
    });
}

// =====================================================================
// SISTEMA DE APROVAÇÃO DO MESTRE (fila de Ações Pendentes)
// =====================================================================

function configurarAcoesPendentes() {
    ouvirAcoesPendentes((lista) => {
        // Alerta em tempo real: se o número de pendências aumentou desde a
        // última vez (chegou pedido novo), avisa o Mestre com um toast —
        // mesmo que o painel de Ações Pendentes não esteja aberto.
        if (isMestre && lista.length > contadorPendentesAnterior) {
            const novos = lista.slice(contadorPendentesAnterior);
            novos.forEach(p => toast(p.detalhe || `${p.nomeJogador} tem uma solicitação pendente.`, "erro"));
        }
        contadorPendentesAnterior = lista.length;
        pendentesCache = lista;

        if (isMestre) {
            el.badgePendentes.style.display = lista.length ? "inline-flex" : "none";
            el.badgePendentes.innerText = String(lista.length);
        }

        if (isMestre && el.mestreCorpo && el.mestreCorpo.dataset.acaoAberta === "pendentes") {
            abrirAcaoMestre("pendentes");
        }
        // O Gerenciador de Combate tem a caixa lateral de Ações Pendentes
        // embutida — precisa re-renderizar também quando a lista de
        // pendentes mudar, não só quando o estado do combate mudar.
        if (isMestre && el.modalCombateMestre && el.modalCombateMestre.classList.contains("active")) {
            el.combateMestreCorpo.innerHTML = "";
            montarGerenciadorCombate(el.combateMestreCorpo);
        }
    });
}

function montarPainelAcoesPendentes(corpo) {
    if (!pendentesCache.length) {
        corpo.innerHTML = `<p class="hint">Nenhuma ação pendente no momento.</p>`;
        return;
    }
    pendentesCache.forEach(acao => {
        const card = document.createElement("div");
        card.className = "pendente-card";
        card.innerHTML = `<span>${escapeHtml(acao.detalhe || `${acao.nomeJogador}: ${acao.tipo}`)}</span>`;
        const botoes = document.createElement("div");
        botoes.className = "pendente-botoes";
        const btnConfirmar = document.createElement("button");
        btnConfirmar.className = "btn-lime"; btnConfirmar.type = "button"; btnConfirmar.innerText = "Confirmar";
        btnConfirmar.addEventListener("click", async () => {
            try {
                await confirmarAcaoPendente(acao);
                toast("Ação confirmada e aplicada.");
            } catch (err) {
                console.error(err);
                toast("Falha ao confirmar a ação.", "erro");
            }
        });
        const btnRejeitar = document.createElement("button");
        btnRejeitar.className = "btn-red"; btnRejeitar.type = "button"; btnRejeitar.innerText = "Rejeitar";
        btnRejeitar.addEventListener("click", async () => {
            await rejeitarAcaoPendente(acao.id);
            toast("Solicitação rejeitada.");
        });
        botoes.append(btnConfirmar, btnRejeitar);
        card.appendChild(botoes);
        corpo.appendChild(card);
    });
}

// =====================================================================
// AVISO DE CUSTO DE VIDA (Domingo)
// =====================================================================

function configurarAvisoCustoVida() {
    ouvirAvisoCustoVida((aviso) => {
        ultimoAvisoCustoVida = aviso;
        avaliarAvisoCustoVida();
    });

    el.custoVidaConfirmar.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId) return;
        const saldoId = el.custoVidaOrigem.value;
        const saldo = todosOsSaldos(fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const total = await pagarCustoSemanal(fichaAtualId, fichaAtual, saldoId);
        toast(`Pago CN$ ${total} (${saldo.nome}).`);
        el.modalCustoVida.classList.remove("active");
    });
}

function avaliarAvisoCustoVida() {
    if (!ultimoAvisoCustoVida || !ultimoAvisoCustoVida.ativo || isMestre || !fichaAtual) return;
    const jaPagouEsteAviso = (fichaAtual.dados.ultimoPagamentoCustoVida || 0) >= (ultimoAvisoCustoVida.timestamp || 0);
    if (jaPagouEsteAviso) return;
    abrirModalCustoVida();
}

function abrirModalCustoVida() {
    const total = custoSemanalTotal(fichaAtual);
    el.custoVidaResumo.innerText = fichaAtual.dados.padraoDeVida
        ? `Gasto semanal total: CN$ ${total}.`
        : `Defina um padrão de vida no Perfil antes de pagar (gasto atual considera só extras: CN$ ${total}).`;

    const saldos = todosOsSaldos(fichaAtual);
    el.custoVidaOrigem.innerHTML = "";
    saldos.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.nome;
        el.custoVidaOrigem.appendChild(opt);
    });

    el.modalCustoVida.classList.add("active");
}

// =====================================================================
// POPUP DE TREINAMENTO (Mestre)
// =====================================================================

function configurarPopupTreinamento() {
    if (!isMestre) return;
    let filaPopups = [];

    ouvirPopupTreinamento((popups) => {
        filaPopups = popups;
        if (popups.length && !el.modalPopupTreino.classList.contains("active")) {
            mostrarProximoPopupTreino();
        }
    });

    function mostrarProximoPopupTreino() {
        if (!filaPopups.length) { el.modalPopupTreino.classList.remove("active"); return; }
        const popup = filaPopups[0];
        el.popupTreinoTexto.innerText = `Pode subir o treinamento de ${popup.nomeFicha}?`;
        el.modalPopupTreino.dataset.popupId = popup.id;
        el.modalPopupTreino.dataset.fichaId = popup.fichaId;
        el.modalPopupTreino.classList.add("active");
    }

    el.popupTreinoNao.addEventListener("click", async () => {
        const popupId = el.modalPopupTreino.dataset.popupId;
        await descartarPopupTreinamento(popupId);
        filaPopups = filaPopups.filter(p => p.id !== popupId);
        el.modalPopupTreino.classList.remove("active");
        setTimeout(mostrarProximoPopupTreino, 300);
    });

    el.popupTreinoSim.addEventListener("click", async () => {
        const popupId = el.modalPopupTreino.dataset.popupId;
        const fichaId = el.modalPopupTreino.dataset.fichaId;
        const concluidos = await confirmarAvancoTreinamento(fichaId, popupId);
        if (concluidos.length) {
            toast(`Treinamento concluído: ${concluidos.map(c => c.nome).join(", ")}.`);
        } else {
            toast("Progresso de treino +1 dia.");
        }
        filaPopups = filaPopups.filter(p => p.id !== popupId);
        el.modalPopupTreino.classList.remove("active");
        setTimeout(mostrarProximoPopupTreino, 300);
    });
}

// =====================================================================
// PAINEL DO MESTRE
// =====================================================================

function configurarPainelMestre() {
    el.btnAbrirMestre.addEventListener("click", () => {
        el.modalMestre.classList.add("active");
        el.mestreCorpo.innerHTML = "";
    });
    el.mestreFechar.addEventListener("click", () => el.modalMestre.classList.remove("active"));
    el.modalMestre.addEventListener("click", (e) => { if (e.target === el.modalMestre) el.modalMestre.classList.remove("active"); });

    document.querySelectorAll(".mestre-acao").forEach(btn => {
        btn.addEventListener("click", () => abrirAcaoMestre(btn.dataset.acao));
    });

    // Gerenciador de Combate — agora é um botão/modal próprio no topo,
    // fora do Painel do Mestre (era só mais uma aba lá dentro antes).
    el.btnAbrirCombate.addEventListener("click", () => {
        el.modalCombateMestre.classList.add("active");
        el.combateMestreCorpo.innerHTML = "";
        montarGerenciadorCombate(el.combateMestreCorpo);
    });
    el.combateMestreFechar.addEventListener("click", () => el.modalCombateMestre.classList.remove("active"));
    el.modalCombateMestre.addEventListener("click", (e) => { if (e.target === el.modalCombateMestre) el.modalCombateMestre.classList.remove("active"); });
}

function nomeDeFicha(fichaId) {
    const f = todasAsFichasCache[fichaId];
    return f && f.config && f.config.nomeExibicao ? f.config.nomeExibicao : fichaId;
}

function abrirAcaoMestre(acao) {
    const corpo = el.mestreCorpo;
    corpo.innerHTML = "";
    corpo.dataset.acaoAberta = acao;

    if (acao === "xp") {
        montarPainelXpMultiplo(corpo);

    } else if (acao === "dado") {
        const inputFaces = document.createElement("input");
        inputFaces.type = "number"; inputFaces.value = 20; inputFaces.placeholder = "Faces (ex: 20)";
        const inputMod = document.createElement("input");
        inputMod.type = "number"; inputMod.value = 0; inputMod.placeholder = "Modificador";
        const btn = document.createElement("button");
        btn.className = "btn-blue"; btn.type = "button"; btn.innerText = "Rolar";
        btn.addEventListener("click", async () => {
            const r = await mestreRolarDado({ faces: Number(inputFaces.value) || 20, modificador: Number(inputMod.value) || 0, quem: "Mestre" });
            toast(`Resultado: ${r.resultado} (bruto ${r.bruto}).`);
        });
        corpo.append(inputFaces, inputMod, btn);

    } else if (acao === "dano") {
        const select = criarSelectFichas(true);
        const selectTipo = document.createElement("select");
        const optPlaceholder = document.createElement("option");
        optPlaceholder.value = ""; optPlaceholder.innerText = "Tipo de dano...";
        optPlaceholder.disabled = true; optPlaceholder.selected = true;
        selectTipo.appendChild(optPlaceholder);
        TIPOS_DANO.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.key; opt.innerText = t.label;
            selectTipo.appendChild(opt);
        });
        const input = document.createElement("input");
        input.type = "number"; input.placeholder = "Valor de dano"; input.value = 10;
        const btn = document.createElement("button");
        btn.className = "btn-red"; btn.type = "button"; btn.innerText = "Causar dano";
        btn.addEventListener("click", async () => {
            if (!select.value) { toast("Escolha um alvo.", "erro"); return; }
            if (!selectTipo.value) { toast("Escolha o tipo de dano.", "erro"); return; }
            const [tipo, id] = select.value.split("::");
            const resultado = await aplicarDano(tipo, id, Number(input.value) || 0, selectTipo.value);
            const tipoLabel = TIPOS_DANO.find(t => t.key === selectTipo.value)?.label || selectTipo.value;
            const detalhe = resultado.reducao > 0
                ? `Mestre causou ${resultado.danoBruto} (${tipoLabel}) em ${resultado.nomeAlvo}. Redução: ${resultado.reducao}. Dano aplicado: ${resultado.danoFinal} (PV: ${resultado.novoPv}).`
                : `Mestre causou ${resultado.danoFinal} (${tipoLabel}) em ${resultado.nomeAlvo} (PV: ${resultado.novoPv}).`;
            await registrarRolagem({ quem: "Mestre", modificador: 0, resultado: resultado.danoFinal, detalhe });
            toast(detalhe);
        });
        corpo.append(select, selectTipo, input, btn);

    } else if (acao === "npcs") {
        montarPainelNpcs(corpo);

    } else if (acao === "biblioteca") {
        montarPainelBibliotecaItens(corpo);

    } else if (acao === "biblioteca-receitas") {
        montarPainelBibliotecaReceitas(corpo);

    } else if (acao === "dashboard") {
        montarDashboardFichas(corpo);

    } else if (acao === "pendentes") {
        montarPainelAcoesPendentes(corpo);
    }
}

// Painel de "Dar XP" com seleção múltipla: cada ficha ativa vira uma
// linha com checkbox; o XP digitado é enviado pra todas as marcadas de
// uma vez (em paralelo), com feedback de quantas fichas foram atualizadas.
function montarPainelXpMultiplo(corpo) {
    const lista = document.createElement("div");
    lista.className = "xp-multiplo-lista";

    const ids = Object.keys(todasAsFichasCache).sort((a, b) => nomeDeFicha(a).localeCompare(nomeDeFicha(b)));
    if (!ids.length) {
        lista.innerHTML = `<p class="hint">Nenhuma ficha ativa na rede ainda.</p>`;
    } else {
        ids.forEach(id => {
            const linha = document.createElement("label");
            linha.className = "xp-multiplo-linha";
            const xpAtual = (todasAsFichasCache[id].dados && todasAsFichasCache[id].dados.xp) || 0;
            linha.innerHTML = `
                <input type="checkbox" class="xp-checkbox" value="${id}">
                <span class="xp-multiplo-nome">${escapeHtml(nomeDeFicha(id))}</span>
                <span class="xp-multiplo-atual">XP atual: ${xpAtual}</span>
            `;
            lista.appendChild(linha);
        });
    }

    const acoesTopo = document.createElement("div");
    acoesTopo.className = "xp-multiplo-acoes-topo";
    const btnTodos = document.createElement("button");
    btnTodos.className = "btn-ghost"; btnTodos.type = "button"; btnTodos.innerText = "Marcar todos";
    const btnNenhum = document.createElement("button");
    btnNenhum.className = "btn-ghost"; btnNenhum.type = "button"; btnNenhum.innerText = "Desmarcar todos";
    btnTodos.addEventListener("click", () => lista.querySelectorAll(".xp-checkbox").forEach(c => c.checked = true));
    btnNenhum.addEventListener("click", () => lista.querySelectorAll(".xp-checkbox").forEach(c => c.checked = false));
    acoesTopo.append(btnTodos, btnNenhum);

    const input = document.createElement("input");
    input.type = "number"; input.placeholder = "Quantidade de XP"; input.value = 50;

    const btnEnviar = document.createElement("button");
    btnEnviar.className = "btn-lime"; btnEnviar.type = "button"; btnEnviar.innerText = "Enviar XP às fichas marcadas";
    btnEnviar.addEventListener("click", async () => {
        const marcadas = [...lista.querySelectorAll(".xp-checkbox:checked")].map(c => c.value);
        if (!marcadas.length) { toast("Marque pelo menos uma ficha.", "erro"); return; }
        const quantidade = Number(input.value) || 0;
        await Promise.all(marcadas.map(id => darXp(id, quantidade)));
        toast(`XP enviado para ${marcadas.length} ficha${marcadas.length > 1 ? "s" : ""}.`);
    });

    corpo.append(acoesTopo, lista, input, btnEnviar);
}

function criarSelectFichas(incluirNpcs) {
    const select = document.createElement("select");
    select.innerHTML = '<option value="">-- escolha --</option>';
    Object.keys(todasAsFichasCache).forEach(id => {
        const opt = document.createElement("option");
        opt.value = incluirNpcs ? `ficha::${id}` : id;
        opt.innerText = nomeDeFicha(id);
        select.appendChild(opt);
    });
    if (incluirNpcs) {
        // NPCs carregados de forma assíncrona — popula via listener separado.
        ouvirNpcs((npcs) => {
            npcs.forEach(npc => {
                if (select.querySelector(`option[value="npc::${npc.id}"]`)) return;
                const opt = document.createElement("option");
                opt.value = `npc::${npc.id}`;
                opt.innerText = `[NPC] ${npc.nome}`;
                select.appendChild(opt);
            });
        });
    }
    return select;
}

function montarPainelNpcs(corpo) {
    const lista = document.createElement("div");
    lista.style.display = "flex";
    lista.style.flexDirection = "column";
    lista.style.gap = "8px";
    corpo.appendChild(lista);

    ouvirNpcs((npcs) => {
        lista.innerHTML = "";
        if (!npcs.length) {
            lista.innerHTML = `<p class="hint">Nenhum NPC criado ainda.</p>`;
        }
        npcs.forEach(npc => {
            const card = document.createElement("div");
            card.className = "npc-card";
            const reducoesParaExibir = (npc.reducoesDano && npc.reducoesDano.length)
                ? npc.reducoesDano
                : (npc.protecaoTipo ? [{ tipo: npc.protecaoTipo, valor: npc.protecaoValor || 0 }] : []);
            const protecaoLabel = reducoesParaExibir.length
                ? reducoesParaExibir.map(r => `${TIPOS_DANO.find(t => t.key === r.tipo)?.label || r.tipo} -${r.valor}`).join(", ")
                : "nenhuma";
            card.innerHTML = `
                <strong>${escapeHtml(npc.nome)}${npc.modoDetalhado ? ' <span class="hint-inline">(mini-ficha)</span>' : ""}</strong>
                ${npc.vulgo || npc.funcaoNarrativa ? `<span>${escapeHtml([npc.vulgo, npc.funcaoNarrativa].filter(Boolean).join(" · "))}</span>` : ""}
                <span>PV: ${npc.pvAtual ?? npc.pvs} / ${npc.pvs}</span>
                <span>Agilidade: ${npc.agilidade ?? 0} · Constituição: ${npc.constituicao ?? 0} · Proteção: ${escapeHtml(protecaoLabel)}</span>
                ${npc.atributos ? `<span>Atributos: ${escapeHtml(npc.atributos)}</span>` : ""}
                ${npc.atributosSecundarios ? `<span>Secundários: ${escapeHtml(npc.atributosSecundarios)}</span>` : ""}
                ${npc.periciasResumo ? `<span>Perícias: ${escapeHtml(npc.periciasResumo)}</span>` : ""}
                ${npc.itensEssenciais ? `<span>Itens: ${escapeHtml(npc.itensEssenciais)}</span>` : ""}
            `;
            const linhaBtns = document.createElement("div");
            linhaBtns.className = "modal-btns";
            if (npc.modoDetalhado) {
                const btnEditar = document.createElement("button");
                btnEditar.className = "btn-ghost"; btnEditar.type = "button"; btnEditar.innerText = "Editar mini-ficha";
                btnEditar.addEventListener("click", () => abrirEdicaoNpcDetalhado(npc));
                linhaBtns.appendChild(btnEditar);
            }
            const btnExcluir = document.createElement("button");
            btnExcluir.className = "btn-red"; btnExcluir.type = "button"; btnExcluir.innerText = "Excluir NPC";
            btnExcluir.addEventListener("click", async () => { await excluirNpc(npc.id); });
            linhaBtns.appendChild(btnExcluir);
            card.appendChild(linhaBtns);
            lista.appendChild(card);
        });
    });

    const formArea = document.createElement("div");
    corpo.appendChild(formArea);

    const secaoNovoNpc = document.createElement("div");
    secaoNovoNpc.className = "section-header";
    secaoNovoNpc.innerText = "Criar NPC (mini-ficha)";
    formArea.appendChild(secaoNovoNpc);
    const areaForm = document.createElement("div");
    formArea.appendChild(areaForm);
    const mostrarFormNovo = () => {
        areaForm.innerHTML = "";
        montarFormularioNpcDetalhado(areaForm, null, async () => { toast("NPC (mini-ficha) criado."); mostrarFormNovo(); });
    };
    mostrarFormNovo();
}

// Abre a Mini-Ficha Detalhada já preenchida com os dados de um NPC
// existente, dentro do próprio Painel do Mestre (reaproveita o modal
// genérico "modal-mestre" que já está aberto — só troca o conteúdo do
// corpo pelo formulário de edição).
function abrirEdicaoNpcDetalhado(npc) {
    const corpo = el.mestreCorpo;
    corpo.innerHTML = "";
    corpo.dataset.acaoAberta = "npcs";
    const voltar = document.createElement("button");
    voltar.className = "btn-ghost"; voltar.type = "button"; voltar.innerText = "← Voltar pra lista de NPCs";
    voltar.addEventListener("click", () => montarPainelNpcs(corpo));
    corpo.appendChild(voltar);
    const area = document.createElement("div");
    corpo.appendChild(area);
    montarFormularioNpcDetalhado(area, npc, async () => {
        toast("Mini-ficha atualizada.");
        montarPainelNpcs(corpo);
    });
}

// ---------------------------------------------------------------------
// Formulário da Mini-Ficha Detalhada de NPC (Módulo 2). Sem pontos
// fixos, sem Função, sem limite de Desvantagens — o Mestre digita os
// atributos primários livremente; os secundários/recursos são
// calculados automaticamente (mesmas fórmulas do jogador, regras.js),
// com opção de sobrescrever qualquer um na mão. Perícias são uma lista
// dinâmica com nível de 1 a 5, livre entre todas as perícias do manual.
// `npcExistente` = null pra criar um novo; passe o objeto do NPC (com
// `.id`) pra editar um já existente.
// ---------------------------------------------------------------------
function montarFormularioNpcDetalhado(container, npcExistente, onSalvo) {
    const npcDet = npcExistente && npcExistente.modoDetalhado
        ? {
            vulgo: npcExistente.vulgo || "",
            idade: npcExistente.idade || "",
            funcaoNarrativa: npcExistente.funcaoNarrativa || "",
            atributosPrimarios: { ...estadoInicialNpcDetalhado().atributosPrimarios, ...(npcExistente.atributosPrimarios || {}) },
            secundariosOverride: { ...estadoInicialNpcDetalhado().secundariosOverride, ...(npcExistente.secundariosOverride || {}) },
            periciasNpc: { ...(npcExistente.periciasNpc || {}) }
        }
        : estadoInicialNpcDetalhado();

    // ---- Informações básicas ----
    const secBasico = document.createElement("div");
    secBasico.className = "section-header";
    secBasico.innerText = "Informações básicas";
    container.appendChild(secBasico);

    const gridBasico = document.createElement("div");
    gridBasico.style.display = "grid";
    gridBasico.style.gridTemplateColumns = "1fr 1fr";
    gridBasico.style.gap = "8px";
    const inputNome = criarInput("text", "Nome");
    inputNome.value = npcExistente ? npcExistente.nome || "" : "";
    const inputVulgo = criarInput("text", "Vulgo");
    inputVulgo.value = npcDet.vulgo;
    const inputIdade = criarInput("text", "Idade");
    inputIdade.value = npcDet.idade;
    const inputFuncaoNarrativa = criarInput("text", "Função narrativa (ex: Capanga do Mercador)");
    inputFuncaoNarrativa.value = npcDet.funcaoNarrativa;
    gridBasico.append(inputNome, inputVulgo, inputIdade, inputFuncaoNarrativa);
    container.appendChild(gridBasico);

    // ---- Atributos primários ----
    const secAtributos = document.createElement("div");
    secAtributos.className = "section-header";
    secAtributos.innerText = "Atributos primários";
    container.appendChild(secAtributos);

    const gridAtributos = document.createElement("div");
    gridAtributos.style.display = "grid";
    gridAtributos.style.gridTemplateColumns = "1fr 1fr 1fr 1fr";
    gridAtributos.style.gap = "8px";
    const inputsAtributos = {};
    ATRIBUTOS_PRIMARIOS.forEach(a => {
        const campo = document.createElement("div");
        campo.className = "modal-field";
        const label = document.createElement("label");
        label.innerText = a.label;
        const input = document.createElement("input");
        input.type = "number";
        input.value = npcDet.atributosPrimarios[a.key] ?? 0;
        campo.append(label, input);
        gridAtributos.appendChild(campo);
        inputsAtributos[a.key] = input;
    });
    container.appendChild(gridAtributos);

    // ---- Atributos secundários calculados (com override manual) ----
    const secSecundarios = document.createElement("div");
    secSecundarios.className = "section-header";
    secSecundarios.innerText = "Secundários e recursos (calculados — marque pra sobrescrever)";
    container.appendChild(secSecundarios);

    const gridSecundarios = document.createElement("div");
    gridSecundarios.style.display = "grid";
    gridSecundarios.style.gridTemplateColumns = "1fr 1fr 1fr";
    gridSecundarios.style.gap = "8px";
    container.appendChild(gridSecundarios);

    const chavesSecundarias = [...ATRIBUTOS_SECUNDARIOS, ...RECURSOS];
    const inputsSecundarios = {};
    const checksOverride = {};

    function renderSecundarios() {
        const atuais = {};
        ATRIBUTOS_PRIMARIOS.forEach(a => { atuais[a.key] = Number(inputsAtributos[a.key].value) || 0; });
        const overrideAtual = {};
        chavesSecundarias.forEach(s => {
            overrideAtual[s.key] = checksOverride[s.key] && checksOverride[s.key].checked
                ? (inputsSecundarios[s.key] ? inputsSecundarios[s.key].value : null)
                : null;
        });
        const calc = calcularSecundariosNpc(atuais, overrideAtual);
        const todos = { ...calc.secundarios, ...calc.recursos };

        gridSecundarios.innerHTML = "";
        chavesSecundarias.forEach(s => {
            const info = todos[s.key];
            const bloco = document.createElement("div");
            bloco.className = "modal-field";
            const label = document.createElement("label");
            label.innerText = `${info.label} (calc: ${info.calculado})`;
            const linha = document.createElement("div");
            linha.style.display = "flex";
            linha.style.gap = "6px";
            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.title = "Sobrescrever valor calculado";
            chk.checked = npcDet.secundariosOverride[s.key] !== null && npcDet.secundariosOverride[s.key] !== undefined;
            const input = document.createElement("input");
            input.type = "number";
            input.value = info.valor;
            input.disabled = !chk.checked;
            chk.addEventListener("change", () => { input.disabled = !chk.checked; });
            linha.append(chk, input);
            bloco.append(label, linha);
            gridSecundarios.appendChild(bloco);
            inputsSecundarios[s.key] = input;
            checksOverride[s.key] = chk;
        });
    }
    renderSecundarios();
    Object.values(inputsAtributos).forEach(input => input.addEventListener("input", renderSecundarios));

    // ---- Perícias dinâmicas (1 a 5, qualquer perícia do manual) ----
    const secPericias = document.createElement("div");
    secPericias.className = "section-header";
    secPericias.innerText = "Perícias";
    container.appendChild(secPericias);

    const listaPericiasEl = document.createElement("div");
    listaPericiasEl.style.display = "flex";
    listaPericiasEl.style.flexDirection = "column";
    listaPericiasEl.style.gap = "6px";
    container.appendChild(listaPericiasEl);

    function renderListaPericias() {
        listaPericiasEl.innerHTML = "";
        Object.entries(npcDet.periciasNpc).forEach(([id, p]) => {
            const linha = document.createElement("div");
            linha.style.display = "flex";
            linha.style.justifyContent = "space-between";
            linha.style.alignItems = "center";
            linha.innerHTML = `<span>${escapeHtml(p.nome)} — nível ${p.nivel}</span>`;
            const btnRemover = document.createElement("button");
            btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "×";
            btnRemover.addEventListener("click", () => { removerPericiaNpc(npcDet, id); renderListaPericias(); });
            linha.appendChild(btnRemover);
            listaPericiasEl.appendChild(linha);
        });
        if (!Object.keys(npcDet.periciasNpc).length) {
            listaPericiasEl.innerHTML = `<p class="hint">Nenhuma perícia adicionada ainda.</p>`;
        }
    }
    renderListaPericias();

    const linhaAddPericia = document.createElement("div");
    linhaAddPericia.style.display = "grid";
    linhaAddPericia.style.gridTemplateColumns = "1fr 1fr 80px auto";
    linhaAddPericia.style.gap = "8px";
    const selectCategoriaPericia = document.createElement("select");
    CATEGORIAS_PERICIA.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key; opt.innerText = c.label;
        selectCategoriaPericia.appendChild(opt);
    });
    const selectPericiaNome = document.createElement("select");
    function popularSelectPericia() {
        selectPericiaNome.innerHTML = "";
        listaPericiasPorCategoria(selectCategoriaPericia.value).forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.nome; opt.innerText = p.nome;
            selectPericiaNome.appendChild(opt);
        });
    }
    popularSelectPericia();
    selectCategoriaPericia.addEventListener("change", popularSelectPericia);
    const inputNivelPericia = criarInput("number", "Nível (1–5)");
    inputNivelPericia.min = 1; inputNivelPericia.max = 5; inputNivelPericia.value = 3;
    const btnAddPericia = document.createElement("button");
    btnAddPericia.className = "btn-blue"; btnAddPericia.type = "button"; btnAddPericia.innerText = "+ Add";
    btnAddPericia.addEventListener("click", () => {
        adicionarPericiaNpc(npcDet, selectPericiaNome.value, inputNivelPericia.value);
        renderListaPericias();
    });
    linhaAddPericia.append(selectCategoriaPericia, selectPericiaNome, inputNivelPericia, btnAddPericia);
    container.appendChild(linhaAddPericia);

    // ---- Proteção contra dano (várias reduções ao mesmo tempo, mesmo modelo dos itens do jogador) ----
    const secProtecao = document.createElement("div");
    secProtecao.className = "section-header";
    secProtecao.innerText = "Proteção (opcional)";
    container.appendChild(secProtecao);
    const hintProtecao = document.createElement("div");
    hintProtecao.className = "hint";
    hintProtecao.innerText = "Marque quantos tipos de dano esse NPC reduzir precisar, cada um com seu próprio valor.";
    container.appendChild(hintProtecao);
    // Migra automaticamente NPC antigo (1 tipo só, protecaoTipo/Valor)
    // pro checklist assim que ele é aberto pra edição.
    const reducoesExistentes = (npcExistente?.reducoesDano && npcExistente.reducoesDano.length)
        ? npcExistente.reducoesDano
        : (npcExistente?.protecaoTipo ? [{ tipo: npcExistente.protecaoTipo, valor: npcExistente.protecaoValor || 0 }] : []);
    const checklistProtecao = montarChecklistReducaoNpc(reducoesExistentes);
    container.appendChild(checklistProtecao);

    if (npcExistente) {
        const campoPvAtual = document.createElement("div");
        campoPvAtual.className = "modal-field";
        campoPvAtual.style.marginTop = "8px";
        const label = document.createElement("label");
        label.innerText = "PV atual";
        const inputPvAtual = document.createElement("input");
        inputPvAtual.type = "number";
        inputPvAtual.value = npcExistente.pvAtual ?? npcExistente.pvs ?? 0;
        campoPvAtual.append(label, inputPvAtual);
        container.appendChild(campoPvAtual);
        var refInputPvAtual = inputPvAtual; // usado no salvar, abaixo
    }

    const btnSalvar = document.createElement("button");
    btnSalvar.className = "btn-lime"; btnSalvar.type = "button";
    btnSalvar.innerText = npcExistente ? "Salvar mini-ficha" : "Criar NPC (mini-ficha)";
    btnSalvar.style.marginTop = "12px";
    btnSalvar.addEventListener("click", async () => {
        if (!inputNome.value.trim()) { toast("Dê um nome ao NPC.", "erro"); return; }
        ATRIBUTOS_PRIMARIOS.forEach(a => { npcDet.atributosPrimarios[a.key] = Number(inputsAtributos[a.key].value) || 0; });
        chavesSecundarias.forEach(s => {
            npcDet.secundariosOverride[s.key] = checksOverride[s.key].checked
                ? Number(inputsSecundarios[s.key].value) || 0
                : null;
        });
        const payload = {
            nome: inputNome.value.trim(),
            npcDetalhado: {
                vulgo: inputVulgo.value.trim(),
                idade: inputIdade.value.trim(),
                funcaoNarrativa: inputFuncaoNarrativa.value.trim(),
                atributosPrimarios: npcDet.atributosPrimarios,
                secundariosOverride: npcDet.secundariosOverride,
                periciasNpc: npcDet.periciasNpc
            },
            reducoesDano: checklistProtecao.lerReducoes()
        };
        let novoId = null;
        if (npcExistente) {
            await atualizarNpcDetalhado(npcExistente.id, { ...payload, pvAtual: refInputPvAtual.value });
        } else {
            novoId = await criarNpcDetalhado(payload);
        }
        if (onSalvo) await onSalvo(novoId, payload.nome);
    });
    container.appendChild(btnSalvar);
}

// Monta um checklist de "Tipos de dano reduzidos" pro NPC — mesmo
// padrão visual/lógico do checklist usado nos itens de proteção do
// jogador (montarReducaoDanoChecklist), mas autocontido: o formulário
// de NPC é 100% montado via JS, sem elementos estáticos no HTML, então
// aqui o próprio elemento retornado carrega o método de leitura.
function montarChecklistReducaoNpc(reducoesAtuais) {
    const wrap = document.createElement("div");
    wrap.className = "reducao-dano-grid";
    const mapaAtual = {};
    (reducoesAtuais || []).forEach(r => { mapaAtual[r.tipo] = r.valor; });

    TIPOS_DANO.forEach(t => {
        const linha = document.createElement("div");
        linha.className = "reducao-dano-linha";
        const marcado = Object.prototype.hasOwnProperty.call(mapaAtual, t.key);
        linha.innerHTML = `
            <label>
                <input type="checkbox" class="reducao-dano-check" data-tipo="${t.key}" ${marcado ? "checked" : ""}>
                ${escapeHtml(t.label)}
            </label>
            <input type="number" class="reducao-dano-valor" data-tipo="${t.key}" min="0" step="1" value="${marcado ? mapaAtual[t.key] : 0}" ${marcado ? "" : "disabled"}>
        `;
        const chk = linha.querySelector(".reducao-dano-check");
        const valorInput = linha.querySelector(".reducao-dano-valor");
        chk.addEventListener("change", () => { valorInput.disabled = !chk.checked; });
        wrap.appendChild(linha);
    });

    // Lê o checklist e monta o array [{ tipo, valor }, ...] pra salvar.
    wrap.lerReducoes = () => {
        const resultado = [];
        wrap.querySelectorAll(".reducao-dano-linha").forEach(linha => {
            const chk = linha.querySelector(".reducao-dano-check");
            const valorInput = linha.querySelector(".reducao-dano-valor");
            if (chk.checked) {
                const valor = Number(valorInput.value) || 0;
                if (valor > 0) resultado.push({ tipo: chk.dataset.tipo, valor });
            }
        });
        return resultado;
    };
    return wrap;
}

function criarInput(tipo, placeholder) {
    const input = document.createElement("input");
    input.type = tipo;
    input.placeholder = placeholder;
    return input;
}

// ---------------------------------------------------------------------
// Painel do Mestre — "Biblioteca de Itens Salvos" (Banco Global).
// Lista todo mundo que já foi salvo (de dentro de uma ficha, com o
// checkbox marcado, ou criado direto aqui) e deixa criar um item do
// zero sem precisar estar dentro de nenhuma ficha.
// ---------------------------------------------------------------------
function montarPainelBibliotecaItens(corpo) {
    const busca = criarInput("text", "Buscar por nome...");
    busca.style.marginBottom = "10px";
    corpo.appendChild(busca);

    const lista = document.createElement("div");
    lista.style.display = "flex";
    lista.style.flexDirection = "column";
    lista.style.gap = "8px";
    corpo.appendChild(lista);

    const renderLista = () => {
        const filtro = busca.value.trim().toLowerCase();
        const itens = itensGlobaisCache
            .filter(it => !filtro || (it.nome || "").toLowerCase().includes(filtro))
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        lista.innerHTML = "";
        if (!itens.length) {
            lista.innerHTML = `<p class="hint">Nenhum item no Banco Global ainda.</p>`;
        }
        itens.forEach(it => {
            const card = document.createElement("div");
            card.className = "npc-card";
            const origem = it.origemFichaId ? `Salvo a partir da ficha de ${escapeHtml(it.origemFichaId)}` : "Cadastrado direto na Biblioteca";
            card.innerHTML = `
                <strong>${escapeHtml(it.nome)}</strong>
                <span>${escapeHtml(rotuloTag(it.tag))}${it.nivelTag ? ` (nível ${it.nivelTag})` : ""} · ${it.peso ?? 0} kg</span>
                ${it.arma ? `<span>Dano base: ${it.arma.danoBase ?? 0}</span>` : ""}
                <span class="hint-inline">${escapeHtml(origem)}</span>
            `;
            const linhaBtns = document.createElement("div");
            linhaBtns.className = "modal-btns";
            const btnEditar = document.createElement("button");
            btnEditar.className = "btn-ghost"; btnEditar.type = "button"; btnEditar.innerText = "Editar";
            btnEditar.addEventListener("click", () => abrirModalEdicao("itensGlobais", it.id));
            const btnExcluir = document.createElement("button");
            btnExcluir.className = "btn-red"; btnExcluir.type = "button"; btnExcluir.innerText = "Excluir";
            btnExcluir.addEventListener("click", async () => {
                if (!confirm(`Excluir "${it.nome}" do Banco Global?`)) return;
                await excluirItemBanco(it.id);
                toast("Item removido do Banco Global.");
            });
            linhaBtns.append(btnEditar, btnExcluir);
            card.appendChild(linhaBtns);
            lista.appendChild(card);
        });
    };
    busca.addEventListener("input", renderLista);
    renderLista();

    const btnNovo = document.createElement("button");
    btnNovo.className = "btn-lime"; btnNovo.type = "button"; btnNovo.innerText = "+ Criar Novo Item";
    btnNovo.style.marginTop = "12px";
    btnNovo.addEventListener("click", () => abrirModalNovo("itensGlobais"));
    corpo.appendChild(btnNovo);
}

// ---------------------------------------------------------------------
// Painel do Mestre — "Biblioteca de Receitas" (Banco Global de
// Receitas). Mesma ideia da Biblioteca de Itens acima, mas usando o
// modal próprio de receita (abrirModalCriarReceita) em vez do modal
// genérico de item — deixa o Mestre criar/editar/excluir qualquer
// receita sem precisar estar dentro de nenhuma ficha específica.
// ---------------------------------------------------------------------
function montarPainelBibliotecaReceitas(corpo) {
    const busca = criarInput("text", "Buscar por nome...");
    busca.style.marginBottom = "10px";
    corpo.appendChild(busca);

    const lista = document.createElement("div");
    lista.style.display = "flex";
    lista.style.flexDirection = "column";
    lista.style.gap = "8px";
    corpo.appendChild(lista);

    const renderLista = () => {
        const filtro = busca.value.trim().toLowerCase();
        const receitas = receitasGlobaisCache
            .filter(r => !filtro || (r.nome || "").toLowerCase().includes(filtro))
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        lista.innerHTML = "";
        if (!receitas.length) {
            lista.innerHTML = `<p class="hint">Nenhuma receita no Banco Global ainda.</p>`;
        }
        receitas.forEach(r => {
            const card = document.createElement("div");
            card.className = "npc-card";
            card.innerHTML = `
                <strong>${escapeHtml(r.nome)}</strong>
                <span>${escapeHtml(r.periciaVinculada || "—")} · Nível ${Number(r.nivel) || 1}${(r.dificuldade || r.dificuldade === 0) ? ` · Dificuldade ${r.dificuldade}` : ""}${(r.dificuldadeArmar || r.dificuldadeArmar === 0) ? ` · Dificuldade de armar ${r.dificuldadeArmar}` : ""}</span>
                ${formatarIngredientes(r) ? `<span class="hint-inline">Materiais: ${escapeHtml(formatarIngredientes(r))}</span>` : ""}
                <span class="hint-inline">Cadastrada por ${escapeHtml(r.criadoPorNome || "—")} (${r.criadoPorTipo === "mestre" ? "Mestre" : "jogador"})</span>
            `;
            const linhaBtns = document.createElement("div");
            linhaBtns.className = "modal-btns";
            const btnEditar = document.createElement("button");
            btnEditar.className = "btn-ghost"; btnEditar.type = "button"; btnEditar.innerText = "Editar";
            btnEditar.addEventListener("click", () => abrirModalCriarReceita(r));
            const btnExcluir = document.createElement("button");
            btnExcluir.className = "btn-red"; btnExcluir.type = "button"; btnExcluir.innerText = "Excluir";
            btnExcluir.addEventListener("click", async () => {
                if (!confirm(`Excluir a receita "${r.nome}" do Banco Global?`)) return;
                await excluirReceitaBanco(r.id);
                toast("Receita removida do Banco Global.");
            });
            linhaBtns.append(btnEditar, btnExcluir);
            card.appendChild(linhaBtns);
            lista.appendChild(card);
        });
    };
    busca.addEventListener("input", renderLista);
    renderLista();

    const btnNovo = document.createElement("button");
    btnNovo.className = "btn-lime"; btnNovo.type = "button"; btnNovo.innerText = "+ Criar Nova Receita";
    btnNovo.style.marginTop = "12px";
    btnNovo.addEventListener("click", () => abrirModalCriarReceita());
    corpo.appendChild(btnNovo);
}

function montarDashboardFichas(corpo) {
    Object.keys(todasAsFichasCache).forEach(id => {
        const f = todasAsFichasCache[id];
        const nome = (f.config && f.config.nomeExibicao) || id;
        const div = document.createElement("div");
        div.className = "mestre-dashboard-item";
        const pv = f.dados ? f.dados.pvAtual : "—";
        const nivel = f.dados ? f.dados.nivel : "—";
        div.innerHTML = `<span>${escapeHtml(nome)} — nível ${nivel}, PV ${pv ?? "—"}</span><span>Abrir →</span>`;
        div.addEventListener("click", () => {
            modoNpc = false;
            npcAtualId = null;
            if (el.selectNpcAtuar) el.selectNpcAtuar.value = "";
            el.selectFicha.value = id;
            fichaAtualId = id;
            ativarSincronizacao();
            el.modalMestre.classList.remove("active");
        });
        corpo.appendChild(div);
    });
}

// =====================================================================
// GERENCIADOR DE COMBATE (Mestre) — adicionar/remover participantes,
// criar NPC direto pra dentro do combate, encerrar a cena.
// =====================================================================
function montarGerenciadorCombate(corpoOriginal) {
    // Layout em duas colunas: a principal com tudo que já existia
    // (participantes, iniciativa etc.) e uma caixa lateral fixa com as
    // Ações Pendentes, pra o Mestre confirmar gasto de ação (e qualquer
    // outra pendência) sem sair da aba de Combate.
    const layout = document.createElement("div");
    layout.style.display = "flex";
    layout.style.gap = "16px";
    layout.style.alignItems = "flex-start";
    layout.style.flexWrap = "wrap";
    corpoOriginal.appendChild(layout);

    const colPrincipal = document.createElement("div");
    colPrincipal.style.flex = "2";
    colPrincipal.style.minWidth = "280px";
    layout.appendChild(colPrincipal);

    const colLateral = document.createElement("div");
    colLateral.style.flex = "1";
    colLateral.style.minWidth = "240px";
    colLateral.style.position = "sticky";
    colLateral.style.top = "10px";
    colLateral.className = "panel";
    layout.appendChild(colLateral);

    const tituloLateral = document.createElement("h4");
    tituloLateral.innerText = `Ações Pendentes${pendentesCache.length ? ` (${pendentesCache.length})` : ""}`;
    colLateral.appendChild(tituloLateral);

    const corpoLateral = document.createElement("div");
    colLateral.appendChild(corpoLateral);
    montarPainelAcoesPendentes(corpoLateral);

    // A partir daqui, o resto da função continua igual — só que
    // preenchendo a coluna principal em vez do corpo inteiro do modal.
    const corpo = colPrincipal;

    const aviso = document.createElement("p");
    aviso.className = "hint";
    aviso.innerText = "Participantes daqui aparecem como alvo no botão \"Usar\" de arma dos jogadores. Encerre o combate quando a cena acabar.";
    corpo.appendChild(aviso);

    const listaParticipantes = document.createElement("div");
    listaParticipantes.style.display = "flex";
    listaParticipantes.style.flexDirection = "column";
    listaParticipantes.style.gap = "8px";
    listaParticipantes.style.margin = "10px 0";
    corpo.appendChild(listaParticipantes);

    function renderParticipantes() {
        const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
        const ids = Object.keys(participantes);
        listaParticipantes.innerHTML = "";
        if (!ids.length) {
            listaParticipantes.innerHTML = `<p class="hint">Nenhum participante no combate ainda.</p>`;
            return;
        }
        ids.forEach(pid => {
            const p = participantes[pid];
            const linha = document.createElement("div");
            linha.className = "npc-card";
            linha.style.flexDirection = "row";
            linha.style.alignItems = "center";
            linha.style.justifyContent = "space-between";
            linha.innerHTML = `<span>${p.tipo === "ficha" ? "🧑" : "👤"} ${escapeHtml(p.nome)} <span class="entity-sub">(${p.tipo === "ficha" ? "jogador" : "NPC"})</span></span>`;
            const btnRemover = document.createElement("button");
            btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
            btnRemover.addEventListener("click", async () => { await removerParticipanteCombate(pid); });
            linha.appendChild(btnRemover);
            listaParticipantes.appendChild(linha);
        });
    }
    renderParticipantes();

    // ---- Adicionar ficha de jogador ----
    const secaoFicha = document.createElement("div");
    secaoFicha.className = "section-header";
    secaoFicha.innerText = "Adicionar ficha de jogador";
    corpo.appendChild(secaoFicha);
    const selectFichaAdd = criarSelectFichas(false);
    const btnAddFicha = document.createElement("button");
    btnAddFicha.className = "btn-lime"; btnAddFicha.type = "button"; btnAddFicha.innerText = "+ Adicionar ao combate";
    btnAddFicha.addEventListener("click", async () => {
        if (!selectFichaAdd.value) { toast("Escolha uma ficha.", "erro"); return; }
        const jaEsta = Object.values((combateAtivoCache && combateAtivoCache.participantes) || {}).some(p => p.tipo === "ficha" && p.refId === selectFichaAdd.value);
        if (jaEsta) { toast("Essa ficha já está no combate.", "erro"); return; }
        const resultado = await adicionarParticipanteCombate({ tipo: "ficha", refId: selectFichaAdd.value, nome: nomeDeFicha(selectFichaAdd.value) });
        toast(resultado && resultado.entrouComIniciativa
            ? `Jogador adicionado ao combate já em andamento — iniciativa ${resultado.iniciativa}, já entrou na fila.`
            : "Jogador adicionado ao combate.");
    });
    corpo.append(selectFichaAdd, btnAddFicha);

    // ---- Adicionar NPC já salvo ----
    const secaoNpcSalvo = document.createElement("div");
    secaoNpcSalvo.className = "section-header";
    secaoNpcSalvo.innerText = "Adicionar NPC salvo";
    corpo.appendChild(secaoNpcSalvo);
    const selectNpcAdd = document.createElement("select");
    selectNpcAdd.innerHTML = '<option value="">-- escolha --</option>';
    ouvirNpcs((npcs) => {
        const valorAtual = selectNpcAdd.value;
        selectNpcAdd.innerHTML = '<option value="">-- escolha --</option>';
        npcs.forEach(npc => {
            const opt = document.createElement("option");
            opt.value = npc.id;
            opt.innerText = npc.nome;
            selectNpcAdd.appendChild(opt);
        });
        selectNpcAdd.value = valorAtual;
    });
    const btnAddNpc = document.createElement("button");
    btnAddNpc.className = "btn-lime"; btnAddNpc.type = "button"; btnAddNpc.innerText = "+ Adicionar ao combate";
    btnAddNpc.addEventListener("click", async () => {
        if (!selectNpcAdd.value) { toast("Escolha um NPC.", "erro"); return; }
        const jaEsta = Object.values((combateAtivoCache && combateAtivoCache.participantes) || {}).some(p => p.tipo === "npc" && p.refId === selectNpcAdd.value);
        if (jaEsta) { toast("Esse NPC já está no combate.", "erro"); return; }
        const nomeOpt = selectNpcAdd.options[selectNpcAdd.selectedIndex].innerText;
        const resultado = await adicionarParticipanteCombate({ tipo: "npc", refId: selectNpcAdd.value, nome: nomeOpt });
        toast(resultado && resultado.entrouComIniciativa
            ? `NPC adicionado ao combate já em andamento — iniciativa ${resultado.iniciativa}, já entrou na fila.`
            : "NPC adicionado ao combate.");
    });
    corpo.append(selectNpcAdd, btnAddNpc);

    // ---- Criar novo NPC direto no combate ----
    // O formulário completo (nome, atributos, perícias, proteção etc.)
    // fica escondido até o Mestre clicar no botão — evita que o
    // Gerenciador de Combate fique poluído quando ele só quer
    // adicionar participantes já existentes.
    const secaoNovoNpc = document.createElement("div");
    secaoNovoNpc.className = "section-header";
    secaoNovoNpc.innerText = "Criar novo NPC";
    corpo.appendChild(secaoNovoNpc);

    const btnToggleNovoNpc = document.createElement("button");
    btnToggleNovoNpc.className = "btn-ghost";
    btnToggleNovoNpc.type = "button";
    const atualizarTextoToggle = () => {
        btnToggleNovoNpc.innerText = combateNpcFormVisivel
            ? "− Fechar formulário de novo NPC"
            : "+ Criar novo NPC (entra direto no combate)";
    };
    atualizarTextoToggle();
    corpo.appendChild(btnToggleNovoNpc);

    const areaNovoNpcCombate = document.createElement("div");
    areaNovoNpcCombate.style.display = combateNpcFormVisivel ? "block" : "none";
    areaNovoNpcCombate.style.marginTop = "10px";
    corpo.appendChild(areaNovoNpcCombate);

    const mostrarFormNovoNpcCombate = () => {
        areaNovoNpcCombate.innerHTML = "";
        montarFormularioNpcDetalhado(areaNovoNpcCombate, null, async (novoId, nome) => {
            if (novoId) {
                const resultado = await adicionarParticipanteCombate({ tipo: "npc", refId: novoId, nome });
                toast(resultado && resultado.entrouComIniciativa
                    ? `${nome} criado e adicionado ao combate já em andamento — iniciativa ${resultado.iniciativa}, já entrou na fila.`
                    : `${nome} criado e adicionado ao combate.`);
            }
            mostrarFormNovoNpcCombate();
        });
    };
    if (combateNpcFormVisivel) mostrarFormNovoNpcCombate();

    btnToggleNovoNpc.addEventListener("click", () => {
        combateNpcFormVisivel = !combateNpcFormVisivel;
        areaNovoNpcCombate.style.display = combateNpcFormVisivel ? "block" : "none";
        atualizarTextoToggle();
        if (combateNpcFormVisivel && !areaNovoNpcCombate.hasChildNodes()) {
            mostrarFormNovoNpcCombate();
        }
    });

    // ---- Iniciativa / ordem de turnos ----
    const secaoIniciativa = document.createElement("div");
    secaoIniciativa.className = "section-header";
    secaoIniciativa.innerText = "Iniciativa";
    corpo.appendChild(secaoIniciativa);

    const avisoIniciativa = document.createElement("p");
    avisoIniciativa.className = "hint";
    avisoIniciativa.innerText = "Ao iniciar, todo mundo na lista de participantes acima rola 1d20 + Agilidade automaticamente. Quem tiver o maior resultado age primeiro. Cada personagem ganha 1 ação por turno + 1 ação extra a cada 5 pontos de Velocidade Total.";
    corpo.appendChild(avisoIniciativa);

    const listaIniciativa = document.createElement("div");
    listaIniciativa.style.display = "flex";
    listaIniciativa.style.flexDirection = "column";
    listaIniciativa.style.gap = "6px";
    listaIniciativa.style.margin = "10px 0";
    corpo.appendChild(listaIniciativa);

    function renderIniciativa() {
        const { ativo, ordemTurnos = [], participantes = {}, turnoAtual, rodada } = combateAtivoCache || {};
        listaIniciativa.innerHTML = "";
        if (!ativo || !ordemTurnos.length) {
            listaIniciativa.innerHTML = `<p class="hint">Combate ainda não iniciado.</p>`;
            return;
        }
        const cabecalho = document.createElement("p");
        cabecalho.className = "eyebrow";
        cabecalho.innerText = `Rodada ${rodada || 1}`;
        listaIniciativa.appendChild(cabecalho);
        ordemTurnos.forEach(pid => {
            const p = participantes[pid];
            if (!p) return;
            const linha = document.createElement("div");
            linha.className = "combate-linha" + (pid === turnoAtual ? " combate-linha-ativa" : "");
            const qtdEsquivas = Number(p.esquivasDisponiveis) || 0;
            const badgeEsquiva = qtdEsquivas > 0 ? ` <span title="Tem ${qtdEsquivas} ação(ões) de Esquiva/Bloqueio guardada(s)">🛡️${qtdEsquivas > 1 ? `×${qtdEsquivas}` : ""}</span>` : "";
            const temContraAtaque = !!(combateAtivoCache.contraAtaquePendente && combateAtivoCache.contraAtaquePendente[pid]);
            const badgeContraAtaque = temContraAtaque ? ` <span title="Aparou! Tem um contra-ataque imediato guardado (modificador -1)">🗡️</span>` : "";
            const badgeAgarrado = (p.agarrado && p.agarrado.ativo)
                ? ` <span class="mod-pill negativo" title="Agarrado por ${escapeHtml(p.agarrado.porNome)} — golpes de alcance médio/longo bloqueados, dano pela metade">🔗 Agarrado</span> <button type="button" class="btn-ghost btn-soltar-agarrado" data-soltar-agarrado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Soltar</button>`
                : "";
            const badgeAlcance = (p.alcanceLimitado && p.alcanceLimitado.ativo)
                ? ` <span class="mod-pill negativo" title="Alcance limitado a ${p.alcanceLimitado.valor} por ${escapeHtml(p.alcanceLimitado.porNome)} — use Retomar alcance pra tirar">📏 Alcance: ${p.alcanceLimitado.valor}</span>`
                : "";
            const badgeDerrubado = (p.derrubado && p.derrubado.ativo)
                ? ` <span class="mod-pill negativo" title="Derrubado por ${escapeHtml(p.derrubado.porNome)} — dificuldade pra ser acertado cai -3; gasta 1 ação pra se levantar">🔻 Derrubado</span> <button type="button" class="btn-ghost btn-levantar-derrubado" data-levantar-derrubado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Levantar</button>`
                : "";
            const badgeImobilizado = (p.imobilizado && p.imobilizado.ativo)
                ? ` <span class="mod-pill negativo" title="Imobilizado por ${escapeHtml(p.imobilizado.porNome)} — não consegue atacar nem se mover; teste Destreza (dificuldade ${p.imobilizado.dificuldadeEscape}) no próprio turno pra se libertar">🔒 Imobilizado</span> <button type="button" class="btn-ghost btn-libertar-imobilizado" data-libertar-imobilizado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Testar Destreza</button>`
                : "";
            // Desacordado (Jiu Jitsu nível 3 — ver definirDesacordado em
            // mestre.js): sem teste de auto-libertação, então o único
            // jeito de tirar é o Mestre clicar em "Acordar" aqui.
            const badgeDesacordado = (p.desacordado && p.desacordado.ativo)
                ? ` <span class="mod-pill negativo" title="Desacordado por ${escapeHtml(p.desacordado.porNome)} (Jiu Jitsu nível 3) — inconsciente, não age nem se defende">💤 Desacordado</span> <button type="button" class="btn-ghost btn-acordar-desacordado" data-acordar-desacordado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Acordar</button>`
                : "";
            // Ossos quebrados (Jiu Jitsu níveis 4/5 — ver
            // definirOssosQuebrados em mestre.js): fica só como nota pro
            // Mestre aplicar a penalidade nos testes físicos seguintes;
            // não some sozinho (sem cura automática no sistema), então
            // tem um botão "Curar" pro Mestre limpar quando fizer sentido
            // na narrativa (primeiros socorros, cura, fim de cena etc.).
            const badgeOssosQuebrados = (p.ossosQuebrados && p.ossosQuebrados.ativo)
                ? ` <span class="mod-pill negativo" title="Ossos quebrados por ${escapeHtml(p.ossosQuebrados.porNome)} — reduz ${p.ossosQuebrados.pontosPenalidade} ponto(s) qualquer ação física (a critério do Mestre)${p.ossosQuebrados.arrastaSomente ? "; ambas as pernas quebradas — só dá pra se arrastar, testando Tolerância dificuldade 15" : (p.ossosQuebrados.pernasQuebradas >= 1 ? "; perna quebrada — impossibilita correr" : "")}">🦴 Ossos quebrados</span> <button type="button" class="btn-ghost btn-curar-ossos" data-curar-ossos="${pid}" style="padding:2px 6px;font-size:0.7rem;">Curar</button>`
                : "";
            // Disparar e Avançar só é acionável aqui pro NPC que o Mestre
            // estiver "atuando como" no momento (modoNpc) — precisa dos
            // dados de inventário/perícia daquele personagem carregados
            // como fichaAtual, igual as outras manobras de combate.
            const podeDispararAvancarNpc = modoNpc && pid === npcParticipanteIdCombate() && p.dispararAvancarDisponivel && !p.dispararAvancarUsado;
            const botaoDispararAvancar = podeDispararAvancarNpc
                ? ` <button type="button" class="btn-ghost btn-disparar-avancar-cqc" data-disparar-avancar-cqc="${pid}" style="padding:2px 6px;font-size:0.7rem;" title="CQC nível 4 — 2 disparos com pistola, fora da ordem de turno">🔫 Disparar e Avançar</button>`
                : "";
            const badgeSaude = badgeEstadoSaudeCombate(p);
            const badgeEnergia = badgeEstadoEnergiaCombate(p);
            const badgeStatus = badgeStatusAtivosCombate(p);
            const acaoExtraCQCTexto = Number(p.acoesExtraCQCMax) > 0 ? ` <span title="CQC nível 5 (Agente Impossível) — ação extra só pra rolagens de CQC">🥋 ${p.acoesExtraCQC}/${p.acoesExtraCQCMax} ação CQC</span>` : "";
            linha.innerHTML = `
                <span class="combate-nome">${escapeHtml(p.nome)}${badgeEsquiva}${badgeContraAtaque}${badgeAgarrado}${badgeAlcance}${badgeDerrubado}${badgeImobilizado}${badgeDesacordado}${badgeOssosQuebrados}${botaoDispararAvancar}${badgeSaude}${badgeEnergia}${badgeStatus}</span>
                <span>Iniciativa ${p.iniciativa} (1d20:${p.rolagemBruta} + Agi ${p.modAgilidade}${p.bonusCQCIniciativa ? " + 1 CQC nível 2" : ""}${p.bonusCobraKaiIniciativa ? ` + ${p.bonusCobraKaiIniciativa} Cobra Kai` : ""})</span>
                <span>${p.pv}/${p.pvMax} PV</span>
                <span>${p.acoes}/${p.acoesMax} ações${acaoExtraCQCTexto}</span>
            `;
            const btnSoltar = linha.querySelector("[data-soltar-agarrado]");
            if (btnSoltar) {
                btnSoltar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await soltarAgarrado(pid);
                });
            }
            const btnLevantar = linha.querySelector("[data-levantar-derrubado]");
            if (btnLevantar) {
                btnLevantar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await tentarLevantarDerrubado(pid);
                });
            }
            const btnLibertar = linha.querySelector("[data-libertar-imobilizado]");
            if (btnLibertar) {
                btnLibertar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await tentarLibertarImobilizado(pid);
                });
            }
            const btnAcordar = linha.querySelector("[data-acordar-desacordado]");
            if (btnAcordar) {
                btnAcordar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await soltarDesacordado(pid);
                });
            }
            const btnCurarOssos = linha.querySelector("[data-curar-ossos]");
            if (btnCurarOssos) {
                btnCurarOssos.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await curarOssosQuebrados(pid);
                });
            }
            const btnDispararAvancar = linha.querySelector("[data-disparar-avancar-cqc]");
            if (btnDispararAvancar) {
                btnDispararAvancar.addEventListener("click", (e) => {
                    e.stopPropagation();
                    abrirModalDispararAvancar();
                });
            }
            listaIniciativa.appendChild(linha);
        });
    }
    renderIniciativa();

    const btnIniciarIniciativa = document.createElement("button");
    btnIniciarIniciativa.className = "btn-lime"; btnIniciarIniciativa.type = "button";
    btnIniciarIniciativa.innerText = "Iniciar Combate (rolar iniciativa)";
    btnIniciarIniciativa.addEventListener("click", async () => {
        try {
            // CQC nível 2 e nível 4: antes de rolar, oferece o +1 de
            // iniciativa (nível 2) e a reserva de ação pra "Disparar e
            // Avançar" (nível 4) — os dois são condicionais a uma
            // escolha narrativa, então pergunta via checkbox em vez de
            // aplicar sozinho (ver participantesElegiveisCQCIniciativa
            // em mestre.js).
            //
            // CQC nível 5 ("Agente Impossível"): diferente dos outros
            // dois, é SEMPRE ativo pra quem tem o nível — sem checkbox,
            // sem escolha. Reaproveita a mesma lista `elegiveis` (já
            // inclui nivel >= 2, então nivel >= 5 também) pra montar o
            // mapa automaticamente.
            const elegiveis = await participantesElegiveisCQCIniciativa();
            let bonusMap = {};
            let dispararMap = {};
            if (elegiveis.length) {
                const resultado = await abrirModalBonusIniciativaCQC(elegiveis);
                if (resultado === null) return; // Mestre cancelou
                bonusMap = resultado.bonusMap;
                dispararMap = resultado.dispararMap;
            }
            const acaoExtraCQCMap = {};
            elegiveis.filter(e => e.nivel >= 5).forEach(e => { acaoExtraCQCMap[e.id] = true; });
            await iniciarIniciativaCombate(bonusMap, dispararMap, acaoExtraCQCMap);
            toast("Combate iniciado! Iniciativa rolada para todos.");
        } catch (e) {
            toast(e.message || "Falha ao iniciar o combate.", "erro");
        }
    });

    const btnAvancarTurno = document.createElement("button");
    btnAvancarTurno.className = "btn-blue"; btnAvancarTurno.type = "button";
    btnAvancarTurno.innerText = "Avançar Turno →";
    btnAvancarTurno.addEventListener("click", async () => {
        try {
            const { nome, notasStatus } = await avancarTurnoCombate();
            await resetarDisparosTurno(); // zera o Recuo acumulado junto com a virada de turno
            toast(`Turno de ${nome}.`);
            (notasStatus || []).forEach(nota => toast(nota, "erro"));
        } catch (e) {
            toast(e.message || "Falha ao avançar o turno.", "erro");
        }
    });

    corpo.append(btnIniciarIniciativa, btnAvancarTurno);

    // ---- Encerrar combate ----
    const secaoEncerrar = document.createElement("div");
    secaoEncerrar.className = "section-header";
    secaoEncerrar.innerText = "Fim de cena";
    corpo.appendChild(secaoEncerrar);
    const btnEncerrar = document.createElement("button");
    btnEncerrar.className = "btn-red"; btnEncerrar.type = "button"; btnEncerrar.innerText = "Encerrar Combate";
    btnEncerrar.addEventListener("click", async () => {
        if (!confirm("Remover todos os participantes do combate ativo?")) return;
        await encerrarCombate();
        toast("Combate encerrado.");
    });
    corpo.appendChild(btnEncerrar);
}

// =====================================================================
// CRIAÇÃO DE PERSONAGEM (wizard obrigatório)
// =====================================================================

function verificarCriacaoPendente() {
    if (isMestre) { el.avisoCriacaoPendente.style.display = "none"; return; }
    if (fichaAtual.criacao.concluida || fichaAtual.dados.criacaoConcluida) {
        el.avisoCriacaoPendente.style.display = "none";
        return;
    }
    el.avisoCriacaoPendente.style.display = "flex";
}

document.getElementById("btn-continuar-criacao").addEventListener("click", abrirWizardCriacao);

// Fecha o wizard sem perder progresso (tudo já foi salvo incrementalmente
// a cada "Avançar"/mudança de bônus). O aviso "Continuar Criação" na tela
// principal continua visível pra reabrir de onde parou. Isso corrige o
// bug de não conseguir cadastrar Desvantagem durante a criação: o modal
// cobria a tela inteira e não tinha nenhuma forma de saída além de
// terminar todo o wizard, então a aba "Vantagens / Desvantagens" (onde
// se cadastra a Desvantagem) ficava inacessível.
document.getElementById("btn-fechar-criacao-temporariamente").addEventListener("click", () => {
    el.modalCriacao.classList.remove("active");
    verificarCriacaoPendente();
});

function abrirWizardCriacao() {
    el.modalCriacao.classList.add("active");
    renderEtapaCriacao();
}

async function salvarEstadoCriacao() {
    pausarSync();
    try {
        await update(ref(db, `${caminhoBase()}/criacao`), fichaAtual.criacao);
    } finally {
        retornarSync();
    }
}

// Salva dados + perícias + criação em um único update atômico, disparando
// o listener do Firebase apenas uma vez (com o estado final completo).
// Usar sempre que o wizard precisar persistir múltiplos campos de uma vez.
async function salvarWizardStep() {
    pausarSync();
    try {
        await update(ref(db, `${caminhoBase()}`), {
            dados: fichaAtual.dados,
            pericias: fichaAtual.pericias,
            criacao: fichaAtual.criacao
        });
    } finally {
        retornarSync();
    }
}

function renderEtapaCriacao() {
    el.criacaoCorpo.innerHTML = "";
    el.criacaoBotoes.innerHTML = "";

    const c = fichaAtual.criacao;
    if (c.etapa === 1) renderEtapaFuncao();
    else if (c.etapa === 2) renderEtapaAtributos();
    else if (c.etapa === 3) renderEtapaPericiasLivres();
    else if (c.etapa === 4) renderEtapaPericiasFuncao();
    else if (c.etapa === 5) renderEtapaDesvantagensBonus();
    else if (c.etapa === 6) renderEtapaRevisao();
}

function botaoCriacao(texto, classe, onClick, desabilitado) {
    const btn = document.createElement("button");
    btn.className = classe; btn.type = "button"; btn.innerText = texto;
    btn.disabled = !!desabilitado;
    btn.addEventListener("click", onClick);
    el.criacaoBotoes.appendChild(btn);
    return btn;
}

// ---- Etapa 1: Função ----
function renderEtapaFuncao() {
    const c = fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 1 de 6 — Função</div>`;
    const grid = document.createElement("div");
    grid.className = "funcao-grid";
    listaFuncoes().forEach(f => {
        const card = document.createElement("div");
        card.className = "funcao-card" + (c.funcaoEscolhida === f.key ? " selecionada" : "");
        card.innerHTML = `<span class="funcao-nome">${f.label}</span><span class="funcao-desc">${f.descricao}</span><span class="funcao-desc">Item inicial: ${f.itemInicial}</span>`;
        card.addEventListener("click", () => { c.funcaoEscolhida = f.key; renderEtapaCriacao(); });
        grid.appendChild(card);
    });
    el.criacaoCorpo.appendChild(grid);

    const f = funcaoDe(c.funcaoEscolhida);
    if (f && f.atributosEscolha) {
        const wrap = document.createElement("div");
        wrap.className = "modal-field";
        wrap.innerHTML = `<label>Escolha o atributo extra (${f.atributosEscolha.grupo.map(a => a === "carisma" ? "Carisma" : "Manipulação").join(" ou ")})</label>`;
        const select = document.createElement("select");
        select.innerHTML = '<option value="">-- escolha --</option>' + f.atributosEscolha.grupo.map(a => `<option value="${a}">${a === "carisma" ? "Carisma" : "Manipulação"}</option>`).join("");
        select.value = c.escolhaAtributoFuncao || "";
        select.addEventListener("change", () => { c.escolhaAtributoFuncao = select.value; });
        wrap.appendChild(select);
        el.criacaoCorpo.appendChild(wrap);
    }

    const podeAvancar = !!c.funcaoEscolhida && (!f || !f.atributosEscolha || !!c.escolhaAtributoFuncao);
    botaoCriacao("Avançar →", "btn-lime", async () => {
        const totalAtributosJaDistribuidos = ATRIBUTOS_PRIMARIOS.reduce((acc, a) => acc + (fichaAtual.dados[a.key] || 0), 0);
        if (c.etapa1JaConfirmadaAntes && totalAtributosJaDistribuidos > 0) {
            if (!confirm("Trocar a função agora reinicia a distribuição de atributos e perícias já feita. Continuar?")) return;
        }
        c.etapa1JaConfirmadaAntes = true;
        aplicarAtributosFixosFuncao(fichaAtual, c.funcaoEscolhida, c.escolhaAtributoFuncao);
        aplicarItemPericiaInicialFuncao(fichaAtual, c.funcaoEscolhida);
        c.pontosAtributosRestantes = calcularPontosAtributoTotais(c.funcaoEscolhida);
        c.pontosFuncaoRestantes = pontosFuncaoDe(c.funcaoEscolhida);
        c.etapa = 2;
        await salvarWizardStep();
        renderEtapaCriacao();
    }, !podeAvancar);
}

// ---- Etapa 2: Atributos livres ----
function renderEtapaAtributos() {
    const c = fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 2 de 6 — Atributos</div>`;
    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos de atributo restantes</span><strong>${c.pontosAtributosRestantes}</strong>`;
    el.criacaoCorpo.appendChild(banner);

    const grid = document.createElement("div");
    grid.className = "distribuicao-grid";
    ATRIBUTOS_PRIMARIOS.forEach(attr => {
        const linha = document.createElement("div");
        linha.className = "distribuicao-linha";
        const valorAtual = fichaAtual.dados[attr.key] || 0;
        linha.innerHTML = `
            <span>${attr.label}</span>
            <div class="stepper">
                <button type="button" class="btn-ghost btn-menos">−</button>
                <span class="stepper-valor">${valorAtual}</span>
                <button type="button" class="btn-ghost btn-mais">+</button>
            </div>
        `;
        linha.querySelector(".btn-menos").addEventListener("click", () => {
            if (fichaAtual.dados[attr.key] > 0) {
                fichaAtual.dados[attr.key]--;
                c.pontosAtributosRestantes++;
                renderEtapaCriacao();
            }
        });
        linha.querySelector(".btn-mais").addEventListener("click", () => {
            if (c.pontosAtributosRestantes > 0 && fichaAtual.dados[attr.key] < LIMITES_CRIACAO.maxAtributo) {
                fichaAtual.dados[attr.key]++;
                c.pontosAtributosRestantes--;
                renderEtapaCriacao();
            }
        });
        grid.appendChild(linha);
    });
    el.criacaoCorpo.appendChild(grid);
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.innerText = `Limite por atributo na criação: ${LIMITES_CRIACAO.maxAtributo}.`;
    el.criacaoCorpo.appendChild(hint);

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 1; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Avançar →", "btn-lime", async () => {
        c.etapa = 3;
        await salvarWizardStep();
        renderEtapaCriacao();
    }, c.pontosAtributosRestantes > 0);
}

// ---- Etapa 3: Perícias livres (5 pontos) ----
function renderEtapaPericiasLivres() {
    const c = fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 3 de 6 — Perícias livres</div>`;
    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos de perícia restantes</span><strong>${c.pontosPericiasRestantes}</strong>`;
    el.criacaoCorpo.appendChild(banner);
    montarSeletorPericiasGenerico(c, "pontosPericiasRestantes", null);

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 2; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Avançar →", "btn-lime", async () => {
        c.etapa = 4;
        await salvarWizardStep();
        renderEtapaCriacao();
    }, c.pontosPericiasRestantes > 0);
}

// ---- Etapa 4: Perícias exclusivas da função ----
function renderEtapaPericiasFuncao() {
    const c = fichaAtual.criacao;
    const f = funcaoDe(c.funcaoEscolhida);
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 4 de 6 — Perícias da função (${f ? f.label : ""})</div>`;

    if (!f || !f.periciasEscolha || c.pontosFuncaoRestantes === 0) {
        el.criacaoCorpo.innerHTML += `<p class="hint">Sua função não tem pontos extras de perícia pra distribuir aqui.</p>`;
        botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 3; salvarEstadoCriacao(); renderEtapaCriacao(); });
        botaoCriacao("Avançar →", "btn-lime", async () => { c.etapa = 5; await salvarEstadoCriacao(); renderEtapaCriacao(); });
        return;
    }

    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos exclusivos de função restantes</span><strong>${c.pontosFuncaoRestantes}</strong>`;
    el.criacaoCorpo.appendChild(banner);

    const opcoes = opcoesPericiaFuncao(c.funcaoEscolhida);
    montarSeletorPericiasGenerico(c, "pontosFuncaoRestantes", opcoes.map(o => o.nome));

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 3; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Avançar →", "btn-lime", async () => {
        c.etapa = 5;
        await salvarWizardStep();
        renderEtapaCriacao();
    }, c.pontosFuncaoRestantes > 0);
}

// Monta um seletor de perícias com stepper, gastando de `campoPontos` em
// `c[campoPontos]`. Se `restricaoNomes` for um array, só essas perícias
// aparecem (pontos exclusivos de função); se null, mostra a lista toda.
// `onMudou`, se fornecido, é chamado após cada alteração em vez do
// comportamento padrão (re-renderizar a etapa atual do wizard) — usado
// pelo distribuidor de pontos bônus, que tem sua própria função de render.
function montarSeletorPericiasGenerico(c, campoPontos, restricaoNomes, onMudou, limitePericia, destinoContainer) {
    const rerender = onMudou || (() => renderEtapaCriacao());
    const limite = limitePericia || LIMITES_CRIACAO.maxPericia;
    const destino = destinoContainer || el.criacaoCorpo;
    const todasPericias = restricaoNomes
        ? PERICIAS_MANUAL.filter(p => restricaoNomes.includes(p.nome))
        : PERICIAS_MANUAL;

    const grid = document.createElement("div");
    grid.className = "distribuicao-grid";

    todasPericias.forEach(p => {
        const existente = Object.entries(fichaAtual.pericias).find(([, pr]) => pr.nome === p.nome);
        const nivelAtual = existente ? existente[1].nivel : 0;
        // Requisito de acesso (ex.: Força Bruta exige Força 9 e Briga de
        // Rua/Contundentes 5 — manual pg. 22): só entra em jogo pra quem
        // ainda não tem a perícia (nível 0). Quem já tem nível ≥ 1 nunca
        // é bloqueado por isso.
        const requisito = (nivelAtual === 0 && !(isMestre && godmodeAtivo))
            ? atendeRequisitoPericia(p.nome, fichaAtual.dados, fichaAtual.pericias)
            : { ok: true };
        const linha = document.createElement("div");
        linha.className = "distribuicao-linha";
        linha.innerHTML = `
            <span>${p.nome}</span>
            <div class="stepper">
                <button type="button" class="btn-ghost btn-menos">−</button>
                <span class="stepper-valor">${nivelAtual}</span>
                <button type="button" class="btn-ghost btn-mais"${requisito.ok ? "" : " disabled"} title="${requisito.ok ? "" : escapeHtml(requisito.motivo)}">+</button>
            </div>
        `;
        linha.querySelector(".btn-menos").addEventListener("click", () => {
            // Sempre lê/escreve em fichaAtual.criacao "ao vivo" (nunca no `c`
            // capturado no momento da renderização): como cada snapshot novo
            // do Firebase substitui fichaAtual inteiro por um objeto novo
            // (normalizarFicha), um `c` antigo guardado no closure do botão
            // fica "órfão" — mexer nele não afeta mais a ficha real, e o
            // gasto some silenciosamente ao salvar. Isso é o que causava o
            // desincronismo dos pontos bônus ao trocar de aba.
            const criacaoAtual = fichaAtual.criacao;
            if (nivelAtual > 0 && existente) {
                fichaAtual.pericias[existente[0]].nivel--;
                if (fichaAtual.pericias[existente[0]].nivel === 0) delete fichaAtual.pericias[existente[0]];
                criacaoAtual[campoPontos]++;
                rerender();
            }
        });
        linha.querySelector(".btn-mais").addEventListener("click", () => {
            const criacaoAtual = fichaAtual.criacao;
            if (criacaoAtual[campoPontos] <= 0) return;
            if (nivelAtual >= limite) return;
            if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
            if (existente) {
                fichaAtual.pericias[existente[0]].nivel++;
            } else {
                const id = gerarIdLocal();
                fichaAtual.pericias[id] = { nome: p.nome, nivel: 1, descricao: "", modificadores: [], especializacoes: [], legado: false };
            }
            criacaoAtual[campoPontos]--;
            rerender();
        });
        grid.appendChild(linha);
    });
    destino.appendChild(grid);
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.innerText = `Limite por perícia aqui: ${limite}.`;
    destino.appendChild(hint);
}

// ---- Etapa 5: Desvantagens + pontos bônus ----
function renderEtapaDesvantagensBonus() {
    const c = fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 5 de 6 — Desvantagens e pontos bônus</div>`;
    el.criacaoCorpo.innerHTML += `<p class="hint">Cadastre suas desvantagens na aba "Vantagens / Desvantagens" antes de avançar (3 pontos bônus por desvantagem, no máximo ${MAX_DESVANTAGENS} desvantagens, até ${MAX_DESVANTAGENS * 3} pontos bônus no total). Use o botão "Fechar temporariamente ✕" no topo desta janela pra acessar aquela aba — seu progresso na criação fica salvo.</p>`;

    // O pool de pontos bônus é recalculado a partir do nº de desvantagens
    // cadastradas, mas o que já foi GASTO fica guardado e persistido em
    // criacao.bonusGasto — assim o saldo nunca se perde num refresh, e o
    // jogador pode gastar tanto agora quanto depois (fora do wizard).
    const bonusTotal = pontosBonusPorDesvantagens(fichaAtual);
    const bonusJaGasto = c.bonusGasto || 0;
    c.pontosBonusDesvantagens = Math.max(0, bonusTotal - bonusJaGasto);

    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos bônus disponíveis (de desvantagens)</span><strong>${c.pontosBonusDesvantagens}</strong>`;
    el.criacaoCorpo.appendChild(banner);

    if (bonusTotal > 0) {
        montarDistribuidorBonus(c, () => { salvarEstadoCriacao(); renderEtapaCriacao(); });
        el.criacaoCorpo.innerHTML += `<p class="hint">Pontos bônus não gastos agora continuam disponíveis depois — dá pra gastar em Atributos ou Perícias a qualquer momento, mesmo fora da criação.</p>`;
    }

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 4; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Avançar →", "btn-lime", async () => {
        c.etapa = 6;
        await salvarWizardStep();
        renderEtapaCriacao();
    });
}

// Distribuidor de pontos bônus (atributo OU perícia), usado tanto no
// wizard (etapa 5) quanto na aba de Vantagens/Desvantagens fora da
// criação. `onMudou` é chamado depois de cada gasto/devolução, pra
// re-renderizar. `container`, se fornecido, é onde o distribuidor é
// desenhado (padrão: o corpo do wizard de criação).
function montarDistribuidorBonus(c, onMudou, container) {
    const destino = container || el.criacaoCorpo;
    const wrap = document.createElement("div");
    wrap.className = "distribuicao-grid";

    ATRIBUTOS_PRIMARIOS.forEach(attr => {
        const linha = document.createElement("div");
        linha.className = "distribuicao-linha";
        const valorAtual = fichaAtual.dados[attr.key] || 0;
        linha.innerHTML = `
            <span>${attr.label}</span>
            <div class="stepper">
                <button type="button" class="btn-ghost btn-menos">−</button>
                <span class="stepper-valor">${valorAtual}</span>
                <button type="button" class="btn-ghost btn-mais">+</button>
            </div>
        `;
        // Assim como no seletor de perícias, sempre lê/escreve em
        // fichaAtual.criacao "ao vivo" — nunca no `c` capturado no momento
        // da renderização — pra não perder o gasto quando um snapshot novo
        // do Firebase chega enquanto o wizard está aberto (ex: o jogador
        // cadastrou a desvantagem em outra aba, como o hint desta etapa pede).
        linha.querySelector(".btn-menos").addEventListener("click", async () => {
            const criacaoAtual = fichaAtual.criacao;
            const gastoNisso = (criacaoAtual.bonusGastoDetalhe && criacaoAtual.bonusGastoDetalhe[`attr:${attr.key}`]) || 0;
            if (valorAtual <= 0 || gastoNisso <= 0) return;
            fichaAtual.dados[attr.key]--;
            criacaoAtual.bonusGasto = (criacaoAtual.bonusGasto || 0) - 1;
            criacaoAtual.pontosBonusDesvantagens = (criacaoAtual.pontosBonusDesvantagens || 0) + 1;
            if (!criacaoAtual.bonusGastoDetalhe) criacaoAtual.bonusGastoDetalhe = {};
            criacaoAtual.bonusGastoDetalhe[`attr:${attr.key}`] = gastoNisso - 1;
            // Grava dados + criacao num update atômico só (salvarWizardStep),
            // com o sync pausado do início ao fim. Antes eram duas escritas
            // separadas (update(dados) e depois salvarEstadoCriacao()), e o
            // listener em tempo real podia disparar entre as duas, recarregar
            // fichaAtual.criacao com o bonusGasto ainda ANTIGO (o gasto não
            // tinha sido salvo ainda) e essa cópia velha acabava sendo o que
            // ia pro Firebase — desfazendo o débito silenciosamente e
            // deixando o jogador gastar o mesmo ponto bônus de novo.
            await salvarWizardStep();
            onMudou();
        });
        linha.querySelector(".btn-mais").addEventListener("click", async () => {
            const criacaoAtual = fichaAtual.criacao;
            if (criacaoAtual.pontosBonusDesvantagens <= 0) return;
            if (valorAtual >= LIMITES_CRIACAO.maxAtributo) return;
            fichaAtual.dados[attr.key]++;
            criacaoAtual.bonusGasto = (criacaoAtual.bonusGasto || 0) + 1;
            criacaoAtual.pontosBonusDesvantagens = (criacaoAtual.pontosBonusDesvantagens || 0) - 1;
            if (!criacaoAtual.bonusGastoDetalhe) criacaoAtual.bonusGastoDetalhe = {};
            criacaoAtual.bonusGastoDetalhe[`attr:${attr.key}`] = ((criacaoAtual.bonusGastoDetalhe[`attr:${attr.key}`]) || 0) + 1;
            await salvarWizardStep();
            onMudou();
        });
        wrap.appendChild(linha);
    });
    destino.appendChild(wrap);

    // Perícias — reaproveita o seletor genérico, mas descontando do pool
    // de bônus em vez do pool de criação normal. Limite por perícia na
    // criação é 3 (LIMITES_CRIACAO.maxPericia), igual ao resto do wizard —
    // não 5 (esse valor era o limite de NÍVEL geral pós-criação, não o
    // limite de criação, e tinha ficado grudado aqui por engano).
    const tituloPericias = document.createElement("p");
    tituloPericias.className = "hint";
    tituloPericias.innerText = "Ou gaste em perícias:";
    destino.appendChild(tituloPericias);

    montarSeletorPericiasGenerico(fichaAtual.criacao, "pontosBonusDesvantagens", null, async () => {
        const criacaoAtual = fichaAtual.criacao;
        criacaoAtual.bonusGasto = bonusTotalMenosRestante(criacaoAtual);
        // Mesmo problema do stepper de atributo acima: usar salvarWizardStep()
        // pra gravar pericias + dados + criacao numa escrita atômica só, em
        // vez de três updates separados. Com escritas separadas, o listener
        // em tempo real podia recarregar fichaAtual.criacao (com o bonusGasto
        // ainda antigo) entre uma escrita e outra, e esse valor velho acabava
        // sendo persistido por cima do débito real — permitindo gastar o
        // mesmo ponto bônus repetidas vezes.
        await salvarWizardStep();
        onMudou();
    }, LIMITES_CRIACAO.maxPericia, destino);
}

function bonusTotalMenosRestante(c) {
    const bonusTotal = pontosBonusPorDesvantagens(fichaAtual);
    return bonusTotal - c.pontosBonusDesvantagens;
}

// ---- Etapa 6: Revisão final ----
function renderEtapaRevisao() {
    const c = fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 6 de 6 — Revisão</div>`;
    const resumo = document.createElement("div");
    resumo.innerHTML = `
        <p class="hint">Função: <strong>${funcaoDe(c.funcaoEscolhida)?.label || "—"}</strong></p>
        <p class="hint">Atributos: ${ATRIBUTOS_PRIMARIOS.map(a => `${a.label} ${fichaAtual.dados[a.key] || 0}`).join(" · ")}</p>
        <p class="hint">Perícias: ${Object.values(fichaAtual.pericias).map(p => `${p.nome} ${p.nivel}`).join(" · ") || "nenhuma"}</p>
        <p class="hint">Confira tudo. Depois de confirmar, a edição de atributos e perícias fica travada até o próximo Level Up ou Treinamento.</p>
    `;
    el.criacaoCorpo.appendChild(resumo);

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 5; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Confirmar e começar a jogar", "btn-lime", async () => {
        c.concluida = true;
        fichaAtual.dados.criacaoConcluida = true;
        fichaAtual.dados.funcao = c.funcaoEscolhida; // persiste a função nos dados da ficha
        // PV/Energia atual começam no máximo calculado.
        const modificadoresPlanos = coletarModificadores(fichaAtual);
        const derivados = calcularDerivados(fichaAtual.dados, modificadoresPlanos);
        fichaAtual.dados.pvAtual = Math.round(derivados.recursos.pv.total);
        fichaAtual.dados.energiaAtual = Math.round(derivados.recursos.energia.total);
        // Mesma classe de bug do distribuidor de bônus: usar salvarWizardStep()
        // pra gravar dados + pericias + criacao numa escrita atômica só, com o
        // sync pausado do início ao fim. Antes eram duas escritas separadas
        // (update(dados) e depois salvarEstadoCriacao()), sem nunca regravar
        // pericias — e o listener em tempo real podia disparar bem nesse
        // intervalo, recarregando a ficha inteira com uma versão do banco
        // ainda sem o último ponto bônus de perícia (se aquela gravação
        // anterior, do passo 5, ainda não tivesse concluído por completo),
        // fazendo a perícia desaparecer na hora de confirmar.
        await salvarWizardStep();
        el.modalCriacao.classList.remove("active");
        toast("Personagem criado! Boa sorte na Chuva de Neon.");
        // Atualiza a UI imediatamente, sem esperar o próximo snapshot do
        // Firebase — o listener real eventualmente confirma o mesmo
        // estado, mas a resposta visual não deve depender desse roundtrip.
        verificarCriacaoPendente();
        renderizarTudo();
    });
}

// =====================================================================
// LEVEL UP (modal inadiável de 3 passos)
// =====================================================================

function verificarLevelUpPendente() {
    if (isMestre) return;
    // Aceita os dois campos que marcam "criação concluída" (podem estar
    // dessincronizados em fichas antigas): não interfere com a criação
    // em andamento, mas também não trava o level up se um dos dois já
    // foi marcado como concluído.
    if (!fichaAtual.criacao.concluida && !fichaAtual.dados.criacaoConcluida) return;
    const precisava = iniciarLevelUpSeNecessario(fichaAtual);
    if (precisava) {
        set(ref(db, `${caminhoBase()}/levelUpPendente`), fichaAtual.levelUpPendente);
    }
    if (fichaAtual.levelUpPendente && fichaAtual.levelUpPendente.ativo) {
        abrirModalLevelUp();
    } else {
        el.modalLevelup.classList.remove("active");
    }
}

function abrirModalLevelUp() {
    el.modalLevelup.classList.add("active");
    modoDistribuicaoPericiaLevelUp = "aumentar"; // reseta o toggle a cada abertura do modal
    renderPassoLevelUp();
}

// Estado puramente de UI (não é salvo na ficha): qual das duas opções
// do passo 3 está selecionada no momento — "aumentar" nível de perícia
// (comportamento já existente) ou "especializar" (nova opção). Trocar
// isso não gasta ponto nenhum, só decide qual lista o passo 3 mostra.
let modoDistribuicaoPericiaLevelUp = "aumentar";

// Salva dados + perícias + levelUpPendente num único update atômico,
// disparando o listener do Firebase apenas uma vez (mesmo padrão de
// salvarWizardStep). Evita que uma gravação intermediária (ex: dados já
// atualizados mas levelUpPendente ainda com o valor antigo) dispare o
// listener no meio do caminho: isso fazia verificarLevelUpPendente()
// regravar um levelUpPendente desatualizado por cima do que a gente
// tinha acabado de salvar/remover, travando o jogador na tela de level
// up (parecia "não sai da tela" / "pontos infinitos").
async function salvarEstadoLevelUp() {
    await update(ref(db, `${caminhoBase()}`), {
        dados: fichaAtual.dados,
        pericias: fichaAtual.pericias,
        levelUpPendente: fichaAtual.levelUpPendente
    });
}

function renderPassoLevelUp() {
    const lvl = fichaAtual.levelUpPendente;
    el.levelupCorpo.innerHTML = "";
    el.levelupBotoes.innerHTML = "";
    if (!lvl) return;

    if (lvl.passo === 1) {
        el.levelupCorpo.innerHTML = `<p class="hint">Passo 1 de 3 — Escolha 1 atributo para subir +1 ponto.</p>`;
        const grid = document.createElement("div");
        grid.className = "distribuicao-grid";
        ATRIBUTOS_PRIMARIOS.forEach(attr => {
            const btn = document.createElement("button");
            btn.className = "btn-ghost";
            btn.type = "button";
            btn.innerText = `${attr.label} (atual: ${fichaAtual.dados[attr.key] || 0})`;
            btn.disabled = (fichaAtual.dados[attr.key] || 0) >= MAX_ATRIBUTO_JOGO;
            btn.addEventListener("click", async () => {
                confirmarPassoAtributo(fichaAtual, attr.key);
                await salvarEstadoLevelUp();
                renderPassoLevelUp();
            });
            grid.appendChild(btn);
        });
        el.levelupCorpo.appendChild(grid);

    } else if (lvl.passo === 2) {
        el.levelupCorpo.innerHTML = `<p class="hint">Passo 2 de 3 — Role o dado de vida extra, baseado na sua Constituição (${fichaAtual.dados.constituicao || 0}).</p>`;
        if (!lvl.dadoVidaRolado) {
            const btn = document.createElement("button");
            btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Rolar dado de vida";
            btn.addEventListener("click", async () => {
                const r = executarPassoDadoVida(fichaAtual);
                await salvarEstadoLevelUp();
                if (r) {
                    const quem = isMestre ? `Mestre (${modoNpc ? (fichaAtual?.config?.nomeExibicao || npcAtualId) : (nomeDeFicha(fichaAtualId) || "—")})` : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");
                    const resultadoRolado = r.rerolagens.length
                        ? `${r.rerolagens.join(", ")} (abaixo do mínimo de ${r.minimo}, rerolado) → ${r.valorFinal}`
                        : `${r.valorFinal}`;
                    await registrarRolagem({
                        quem,
                        modificador: r.bonus,
                        resultado: r.total,
                        detalhe: `Rolagem de PV: ${resultadoRolado}. Valor mínimo exigido: ${r.minimo}. Bônus de CON: ${r.bonus}. Total aplicado ao HP: ${r.total}`
                    });
                }
                renderPassoLevelUp();
            });
            el.levelupCorpo.appendChild(btn);
        } else {
            const r = lvl.dadoVidaRolado;
            const detalheReroll = r.rerolagens && r.rerolagens.length
                ? ` (rerolado ${r.rerolagens.length}x, abaixo do mínimo de ${r.minimo}: ${r.rerolagens.join(", ")})`
                : "";
            el.levelupCorpo.innerHTML += `<p class="entity-nome">1d${r.faces} (${r.valorFinal}${detalheReroll}) + ${r.bonus} = +${r.total} PV</p>`;
            const btn = document.createElement("button");
            btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Continuar →";
            btn.addEventListener("click", () => renderPassoLevelUp());
            el.levelupCorpo.appendChild(btn);
        }

    } else if (lvl.passo === 3) {
        el.levelupCorpo.innerHTML = `<p class="hint">Passo 3 de 3 — Distribua ${lvl.pontosPericia} ponto(s) de perícia (pode ser em perícias novas).</p>`;

        // Toggle entre as duas opções de gasto do ponto de perícia:
        // aumentar o nível (comportamento já existente, intocado) ou
        // comprar uma especialização (nova opção, regras do manual:
        // nível 3+ da perícia, comprando em ordem 3 → 4 → 5).
        const toggle = document.createElement("div");
        toggle.className = "distribuicao-toggle";
        toggle.style.display = "flex";
        toggle.style.gap = "8px";
        toggle.style.marginBottom = "10px";
        const btnAumentar = document.createElement("button");
        btnAumentar.type = "button";
        btnAumentar.innerText = "Aumentar perícia";
        btnAumentar.className = modoDistribuicaoPericiaLevelUp === "aumentar" ? "btn-lime" : "btn-ghost";
        btnAumentar.addEventListener("click", () => {
            modoDistribuicaoPericiaLevelUp = "aumentar";
            renderPassoLevelUp();
        });
        const btnEspecializar = document.createElement("button");
        btnEspecializar.type = "button";
        btnEspecializar.innerText = "Comprar especialização";
        btnEspecializar.className = modoDistribuicaoPericiaLevelUp === "especializacao" ? "btn-lime" : "btn-ghost";
        btnEspecializar.addEventListener("click", () => {
            modoDistribuicaoPericiaLevelUp = "especializacao";
            renderPassoLevelUp();
        });
        toggle.appendChild(btnAumentar);
        toggle.appendChild(btnEspecializar);
        el.levelupCorpo.appendChild(toggle);

        if (lvl.pontosPericia === 0) {
            // Sem pontos restantes, não faz sentido mostrar nenhuma das duas
            // listas (mantém o comportamento de antes: só o botão de finalizar).
        } else if (modoDistribuicaoPericiaLevelUp === "especializacao") {
            const aviso = document.createElement("p");
            aviso.className = "hint";
            aviso.innerText = "Comprar uma especialização consome 1 ponto de perícia, mas não aumenta o nível da perícia. Só perícias com nível 3 ou mais são elegíveis.";
            el.levelupCorpo.appendChild(aviso);

            const grid = document.createElement("div");
            grid.className = "distribuicao-grid";
            const elegiveis = Object.entries(fichaAtual.pericias).filter(([, p]) => (Number(p.nivel) || 0) >= 3);
            if (elegiveis.length === 0) {
                const vazio = document.createElement("p");
                vazio.className = "hint";
                vazio.innerText = "Nenhuma perícia com nível 3 ou mais ainda. Aumente uma perícia até o nível 3 pra poder especializá-la.";
                grid.appendChild(vazio);
            }
            elegiveis
                .sort((a, b) => a[1].nome.localeCompare(b[1].nome))
                .forEach(([id, p]) => {
                    const check = podeComprarEspecializacao(p);
                    const linha = document.createElement("div");
                    linha.className = "distribuicao-linha";
                    const especializacoesTexto = (p.especializacoes && p.especializacoes.length)
                        ? `Especializações: ${p.especializacoes.slice().sort().join(", ")}`
                        : "Sem especializações ainda";
                    if (check.ok) {
                        linha.innerHTML = `
                            <span>${p.nome} (nível ${p.nivel}) — ${especializacoesTexto}</span>
                            <div class="stepper">
                                <button type="button" class="btn-ghost btn-comprar-especializacao">Comprar especialização nível ${check.proximoNivel}</button>
                            </div>
                        `;
                        linha.querySelector(".btn-comprar-especializacao").addEventListener("click", async () => {
                            if (gastarPontoEspecializacaoLevelUp(fichaAtual, p.nome)) {
                                await salvarEstadoLevelUp();
                                renderPassoLevelUp();
                            }
                        });
                    } else {
                        linha.innerHTML = `
                            <span>${p.nome} (nível ${p.nivel}) — ${especializacoesTexto}</span>
                            <div class="stepper">
                                <span class="hint">${check.motivo}</span>
                            </div>
                        `;
                    }
                    grid.appendChild(linha);
                });
            el.levelupCorpo.appendChild(grid);
        } else {
            const grid = document.createElement("div");
            grid.className = "distribuicao-grid";
            PERICIAS_MANUAL.forEach(p => {
                const existente = Object.entries(fichaAtual.pericias).find(([, pr]) => pr.nome === p.nome);
                const nivelAtual = existente ? existente[1].nivel : 0;
                const requisito = nivelAtual === 0 ? atendeRequisitoPericia(p.nome, fichaAtual.dados, fichaAtual.pericias) : { ok: true };
                const linha = document.createElement("div");
                linha.className = "distribuicao-linha";
                linha.innerHTML = `
                    <span>${p.nome}</span>
                    <div class="stepper">
                        <span class="stepper-valor">${nivelAtual}</span>
                        <button type="button" class="btn-ghost btn-mais"${requisito.ok ? "" : " disabled"} title="${requisito.ok ? "" : escapeHtml(requisito.motivo)}">+</button>
                    </div>
                `;
                linha.querySelector(".btn-mais").addEventListener("click", async () => {
                    if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
                    if (gastarPontoPericiaLevelUp(fichaAtual, p.nome, gerarIdLocal)) {
                        await salvarEstadoLevelUp();
                        renderPassoLevelUp();
                    }
                });
                grid.appendChild(linha);
            });
            el.levelupCorpo.appendChild(grid);
        }

        if (lvl.pontosPericia === 0) {
            const btn = document.createElement("button");
            btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Finalizar Level Up";
            btn.addEventListener("click", async () => {
                finalizarLevelUp(fichaAtual);
                await salvarEstadoLevelUp(); // levelUpPendente = null aqui apaga a chave no update()
                el.modalLevelup.classList.remove("active");
                toast("Nível aumentado!");
            });
            el.levelupBotoes.appendChild(btn);
        }
    }
}
