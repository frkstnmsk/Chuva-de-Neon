// =====================================================================
// CHUVA DE NEON — Ficha (orquestração principal)
// =====================================================================

import { db } from "./firebase-config.js";
import { ref, set, get, update, remove, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";
import {
    ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS,
    listaAlvosModificador, rotuloAlvo, modificadoresQueAfetam, somaModificadoresPara, ALVO_TESTES_POR_CATEGORIA,
    coletarModificadores, calcularDerivados, calcularTotalPericia,
    rolarD20, rolarDado,
    atributoDefesaPorPericia, calcularDificuldadeDefesaJogador, calcularDanoTotalArma,
    calcularDanoDesarmado, calcularDificuldadeArmaFogo, MAX_ATRIBUTO_JOGO,
    calcularEstadoSaude, aplicarEstadoSaudeVelocidade, temPericiaTreinada,
    calcularEstadoEnergia, rolarTesteReanimacao, DIFICULDADE_REANIMACAO,
    dificuldadeDesmaio, DIFICULDADE_BASE_DESMAIO,
    DIFICULDADE_INFECCAO_MINIMA, DIFICULDADE_INFECCAO_MAXIMA,
    calcularTempoRecuperacaoPV, aplicarReducaoTratamentoHospital, calcularAbstinenciaVicio,
    extrairDuracaoHorasDaDescricao, horasTotaisCalendario,
    calcularModificadoresVeiculo, valorManutencaoVeiculo, veiculoTemChaveDisponivel,
    TRATAMENTOS_FERIDA, feridaAceitaSutura, feridaEstaFechada, chanceFeridaPorDano,
    golpeDilacera, deveTestarSangramentoProfundo
} from "./regras.js";
import {
    PERICIAS_MANUAL, CATEGORIAS_PERICIA, listaPericiasPorCategoria, buscarPericiaPorNome,
    TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS,
    ehArma, ehExplosivo, ehArmaOuExplosivo, EXPLOSIVOS_PADRAO, MODULOS_DETONACAO,
    ehCarregador, ehProjetil, tagTemNivel, rotuloTag, MANOBRAS_COMBATE,
    tagExigePericiaUso, tagTemPericiaUso, periciasVinculaveisPorTag,
    ehTagMultiPericia, periciaUsoComoArray, tagTemQuantidadeGeral,
    ehTagQuePodeSerSaldo, ehIdSaldoDeItem, idItemDoSaldo, campoSaldoDoItem, todosOsSaldos,
    CLASSES_PROTECAO, rotuloClasseProtecao, ehArmaDeFogo, tagExigeClasseProtecao,
    CALIBRES, calibresPorClasse, rotuloCalibre, calibreSugereDilacera, tagUsaCalibreEspecifico,
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
    ignorarArmaduraForcaBruta, penalidadeEsquivarContraForcaBruta, bloqueioContraForcaBruta,
    alvoTemArteMarcialTreinada,
    MANOBRA_IMOBILIZAR_CQC, PERICIAS_IMOBILIZAR_CQC,
    danoQuedaJiuJitsu, MANOBRA_IMOBILIZAR_JIUJITSU, MANOBRA_QUEBRAR_OSSOS_JIUJITSU,
    danoQuebrarOssosJiuJitsu,
    PERICIAS_CRIACAO_ITEM, MATERIAIS_CRIACAO, qualidadesDoMaterial,
    ehFerramentaCriacaoGeral, PERICIAS_FERRAMENTA_CRIACAO,
    CATALOGO_DROGAS,
    rotuloTipoVeiculo, rotuloAtributoVeiculo, periodicidadeManutencaoVeiculo,
    ATRIBUTOS_VEICULO, TIPOS_VEICULO, escalaVeiculo, ehChaveVeiculo
} from "./dados-manual.js";
import { normalizarFicha, fichaVaziaPadrao, normalizarNpcComoFicha } from "./normalizacao.js";
import {
    listaCategorias, nomeCategoria, criarCategoriaCustom, pesoTotalPorCategoria,
    calcularCargaAtual, itemPodeUsar, itemPodeEquipar, itemEhEquipavel, listaArmasInventario,
    listaCarregadoresInventario, listaProjeteisInventario, carregadorEstaAnexado,
    ehContainer, itensDentroDe, itemDescendeDe, listaContainersDisponiveis,
    TAMANHOS_ITEM, rotuloTamanho, itemCabeNoContainer, volumeTotalDentroDe,
    SUBTIPOS_PORTE, rotuloSubtipoPorte, itemPodeSerLevadoSolto, listaCompartimentos,
    maosDisponiveis, itemPodeEquiparContainer, subtipoPorteOcupaMao, subtipoPorteExclusivo
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
    calcularAvancoDias, diasSemana, climas, registrarRolagem, ouvirLogDados,
    ouvirAvisoCustoVida
} from "./calendario.js";
import {
    PADROES_DE_VIDA, custoSemanalPadraoDeVida, custoSemanalTotal, limiteRecuperacaoSemTratamento,
    ouvirTodasAsFichas, darXp, ouvirGodmode, definirGodmode,
    ouvirIgnorarPenalidadeSaude, definirIgnorarPenalidadeSaude,
    mestreRolarDado, aplicarDano, testarSangramento, testarSangramentoProfundo,
    ouvirNpcs, excluirNpc, passarODia, passarVariosDias,
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
    definirDesacordado, soltarDesacordado, definirOssosQuebrados, curarOssosQuebrados,
    reverterComaGodmode, acordarDesmaioGodmode,
    ouvirCenarios, criarCenario, renomearCenario, excluirCenario,
    adicionarParticipanteCenario, removerParticipanteCenario,
    adicionarItemCenario, removerItemCenario,
    adicionarVeiculoCenario, removerVeiculoCenario, editarVeiculoCenario,
    adicionarDinheiroCenario, removerDinheiroCenario,
    adicionarExplosivoCenario, removerExplosivoCenario,
    detonarExplosivoCenario
} from "./mestre.js";
import {
    criarFerida, ouvirFeridas, tratarFerida, testarInfeccaoFerida
} from "./saude.js";
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
// Guarda o PV atual da última sincronização (e de qual ficha/NPC era)
// só pra detectar queda de PV entre um snapshot e outro e disparar o
// efeito de tela (flash + tremor) de "acabou de levar dano" — ver
// dispararEfeitoDanoSeCaiu() logo abaixo de ativarSincronizacao().
let pvAtualUltimaSync = undefined;
let idUltimaSyncEfeitoDano = null;
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

// Ponte entre o modal de receita e o modal de item: quando o Mestre/
// jogador clica em "+ Criar item no Banco Global" dentro do modal de
// receita, guardamos aqui o rascunho da receita (tudo que já tinha sido
// preenchido) e saímos pro modal de item. fecharModal() (chamado tanto
// ao salvar quanto ao cancelar o modal de item) reabre a receita sozinho
// — com o vínculo (itemGlobalId) se um item novo realmente foi criado
// no Banco, ou sem vínculo (mas com o rascunho intacto) se a pessoa
// cancelou. Ver retomarReceitaAoFecharModal.
let receitaAguardandoVinculo = null; // { receitaExistente, opcoesSlot, rascunho } | null
let idBancoParaRetomarReceita = null;
let godmodeAtivo = false;
// Sub-opção do Godmode: só some a penalidade de Machucado/Muito
// Machucado quando ESSA também estiver marcada (ver configurarGodmode).
let ignorarPenalidadeSaudeAtivo = false;
let calendarioAtual = null;
let todasAsFichasCache = {};
// Guarda { pvPerdidos, diasNecessarios } calculados no último render dos
// Recursos Vitais, pra o clique em "Solicitar recuperação de PVs" (ver
// configurarRecuperacaoPV) montar o pedido sem precisar recalcular tudo
// de novo — null quando não há PV perdido ou já existe recuperação ativa.
let pvRecuperacaoContexto = null;
// Último { d, pvMaximoTotal } passado pra renderizarRecuperacaoPV (Etapa
// 6 do plano de saúde) — guardado pra poder re-renderizar o painel de
// recuperação de PV quando as FERIDAS mudam (listener separado de
// ouvirFeridas, ver configurarSaude), sem precisar duplicar aqui todo o
// cálculo de pvMaximoTotal que já acontece em renderizarAtributos.
let ultimoContextoRecuperacaoPV = null;
// Cache local do Banco Global de Itens — carregado pra todo mundo (jogador
// e Mestre), já que o autocompletar do modal de item precisa dele em
// qualquer ficha, não só na Biblioteca do Painel do Mestre.
let itensGlobaisCache = [];
let receitasGlobaisCache = [];
let categoriaInventarioAtiva = "levando";
// IDs de itens-recipiente atualmente "abertos" (expandidos) na lista do
// Inventário — só existe em memória local, não é salvo na ficha; some
// ao recarregar a página. Ver renderizarInventario.
let containersInventarioAbertos = new Set();
let ultimoAvisoCustoVida = {}; // fila de pendentes de `avisoCustoVida/pendentes` no Firebase: { [pendenteId]: timestampDoDomingo }
let combateAtivoCache = { ativo: false, participantes: {} }; // Gerenciador de Combate (compartilhado)
let combateNpcFormVisivel = false; // controla se o formulário de "Criar novo NPC" está aberto dentro do Gerenciador de Combate
let painelIniciativaJogadorAberto = false; // controla se o modal "Gerenciador de Combate do Jogador" está na tela
let pendentesCache = []; // fila de Ações Pendentes (compartilhada)
let contadorPendentesAnterior = 0; // pra detectar chegada de pedido novo e disparar alerta
let cenariosCache = []; // lista de Cenários (compartilhada — ver ouvirCenarios em mestre.js)

// Feridas da ficha atualmente aberta (ver saude.js / aba "Saúde").
// Diferente de cenariosCache, não é compartilhado entre todo mundo — é
// específico da fichaAtualId, e por isso precisa de um listener próprio
// que é re-registrado sempre que a ficha ativa muda (ver configurarSaude).
// Escopo desta fase: só fichas de jogador (modoNpc fica de fora).
let feridasCache = [];
let unsubFeridas = null;
let feridasFichaIdOuvida = null;

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
// Sites da Dark Net previstos no manual — "The Corridor" fica de fora
// de propósito (não representado nesta ficha).
const DARKNET_SITES = [
    { id: "dm", nome: "Dm", placeholder: "www.dm.dn/..." },
    { id: "void", nome: "Void", placeholder: "www.void.dn/..." },
    { id: "p2k", nome: "P2K" },
    { id: "rabbithole", nome: "RabbitHole" },
    { id: "p2c", nome: "P2C" },
    { id: "creators", nome: "Creators" },
    { id: "darkart", nome: "DarkArt" },
    { id: "blackprint", nome: "BlackPrint" }
];
const CAMPOS_DARKNET_NOTAS = DARKNET_SITES.map(s => s.id);
const TITULOS_MODAL = {
    pericias: "Perícia", inventario: "Item de inventário", vantagens: "Vantagem",
    desvantagens: "Desvantagem", fatosUniversais: "Fato universal",
    especializacoes: "Especialização", gastosExtras: "Gasto semanal extra",
    itensGlobais: "Item do Banco Global", veiculos: "Veículo"
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

// Chaves de localStorage do layout das abas (ver gerenciarLayoutAbas mais
// abaixo) — precisam ficar definidas antes do init() ser chamado, senão
// dá erro de "Cannot access before initialization" (a const ainda não
// existe no momento em que gerenciarLayoutAbas() é executada).
const CHAVE_ABAS_MODO = "cdn_abas_modo";
const CHAVE_ABAS_FIXADAS = "cdn_abas_fixadas";
const CHAVE_ABAS_MAIS = "cdn_abas_mais_ordem";
const ABAS_FIXADAS_PADRAO = ["perfil", "atributos", "pericias", "inventario", "combate"];

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
    // btnAbrirMestre / badgePendentes não existem mais: o Painel do
    // Mestre deixou de ser um painel que se abre por botão e passou a
    // morar embutido direto na gaveta de Ações Pendentes (ver
    // drawer-pendentes-secao-mestre em ficha.html).
    btnPendentesLateral: document.getElementById("btn-pendentes-lateral"),
    badgePendentesLateral: document.getElementById("badge-pendentes-lateral"),
    drawerPendentes: document.getElementById("drawer-pendentes"),
    drawerPendentesCorpo: document.getElementById("drawer-pendentes-corpo"),
    drawerPendentesFechar: document.getElementById("drawer-pendentes-fechar"),
    btnAbrirCombate: document.getElementById("btn-abrir-combate"),
    modalCombateMestre: document.getElementById("modal-combate-mestre"),
    combateMestreCorpo: document.getElementById("combate-mestre-corpo"),
    combateMestreFechar: document.getElementById("combate-mestre-fechar"),
    btnAbrirCenario: document.getElementById("btn-abrir-cenario"),
    modalCenarioMestre: document.getElementById("modal-cenario-mestre"),
    cenarioMestreCorpo: document.getElementById("cenario-mestre-corpo"),
    cenarioMestreFechar: document.getElementById("cenario-mestre-fechar"),
    topbar: document.querySelector(".topbar"),
    btnAbrirInfoTopo: document.getElementById("btn-abrir-info-topo"),
    painelInfoTopo: document.getElementById("painel-info-topo"),
    btnSalvar: document.getElementById("btn-salvar"),
    saveStatus: document.getElementById("save-status"),
    tabsNav: document.getElementById("tabs-nav"),
    tabsFixadas: document.getElementById("tabs-fixadas"),
    tabsMaisWrap: document.getElementById("tabs-mais-wrap"),
    tabsMaisBtn: document.getElementById("tabs-mais-btn"),
    tabsMaisMenu: document.getElementById("tabs-mais-menu"),
    tabsEditarBtn: document.getElementById("tabs-editar-btn"),
    tabsModoBtn: document.getElementById("tabs-modo-btn"),
    gridAtributosPrimarios: document.getElementById("grid-atributos-primarios"),
    gridAtributosSecundarios: document.getElementById("grid-atributos-secundarios"),
    gridRecursos: document.getElementById("grid-recursos"),
    estadoSaudeBadge: document.getElementById("estado-saude-badge"),
    comaBadge: document.getElementById("coma-badge"),
    desmaioBadge: document.getElementById("desmaio-badge"),
    estadoEnergiaBadge: document.getElementById("estado-energia-badge"),
    vitalPvFill: document.getElementById("vital-pv-fill"),
    vitalPvNumero: document.getElementById("vital-pv-numero"),
    vitalEnergiaFill: document.getElementById("vital-energia-fill"),
    vitalEnergiaNumero: document.getElementById("vital-energia-numero"),
    vitalEquipados: document.getElementById("vital-equipados"),
    vitalStatusCarrossel: document.getElementById("vital-status-carrossel"),
    vitalStatusIcone: document.getElementById("vital-status-icone"),
    vitalStatusTexto: document.getElementById("vital-status-texto"),
    efeitoDanoOverlay: document.getElementById("efeito-dano-overlay"),
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
    financasTransformarItemBtn: document.getElementById("financas-transformar-item-btn"),
    financasMoverBloco: document.getElementById("financas-mover-bloco"),
    financasMoverOrigem: document.getElementById("financas-mover-origem"),
    financasMoverDestino: document.getElementById("financas-mover-destino"),
    financasMoverValor: document.getElementById("financas-mover-valor"),
    financasMoverBtn: document.getElementById("financas-mover-btn"),
    financasGanhoFixo: document.getElementById("financas-ganho-fixo"),
    financasGanhoFixoSalvar: document.getElementById("financas-ganho-fixo-salvar"),
    resumoCarga: document.getElementById("resumo-carga"),
    resumoMaos: document.getElementById("resumo-maos"),
    inventarioCategoriasNav: document.getElementById("inventario-categorias-nav"),
    inventarioListas: document.getElementById("inventario-listas"),
    listaArmasCombate: document.getElementById("lista-armas-combate"),
    listaManobrasCombate: document.getElementById("lista-manobras-combate"),
    veiculosLista: document.getElementById("veiculos-lista"),
    btnAddVeiculo: document.getElementById("btn-add-veiculo"),
    cenarioLista: document.getElementById("cenario-lista"),
    saudeLista: document.getElementById("saude-lista"),
    mestreComaPainel: document.getElementById("mestre-coma-painel"),
    mestreDesmaioPainel: document.getElementById("mestre-desmaio-painel"),
    btnTratarOutroJogador: document.getElementById("btn-tratar-outro-jogador"),
    modalCampoTipoVeiculo: document.getElementById("modal-campo-tipo-veiculo"),
    modalTipoVeiculo: document.getElementById("modal-tipo-veiculo"),
    modalConfigVeiculo: document.getElementById("modal-config-veiculo"),
    modalVeiculoAtributos: document.getElementById("modal-veiculo-atributos"),
    modalSecaoNarrativa: document.getElementById("modal-secao-narrativa"),
    treinoGrid: document.getElementById("treino-grid"),
    receitasLista: document.getElementById("receitas-lista"),
    hintNivelXp: document.getElementById("hint-nivel-xp"),
    avisoCriacaoPendente: document.getElementById("aviso-criacao-pendente"),
    btnContinuarCriacao: document.getElementById("btn-continuar-criacao"),
    modal: document.getElementById("modal-entidade"),
    modalTitulo: document.getElementById("modal-titulo"),
    modalNome: document.getElementById("modal-nome"),
    modalCampoSubstanciaVicio: document.getElementById("modal-campo-substancia-vicio"),
    modalSubstanciaVicio: document.getElementById("modal-substancia-vicio"),
    modalSubstanciaVicioOpcoes: document.getElementById("modal-substancia-vicio-opcoes"),
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
    modalCampoMaosNecessarias: document.getElementById("modal-campo-maos-necessarias"),
    modalMaosNecessarias: document.getElementById("modal-maos-necessarias"),
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
    modalItemSaldoEletronicoBloco: document.getElementById("modal-item-saldo-eletronico-bloco"),
    modalItemSaldoNotas: document.getElementById("modal-item-saldo-notas"),
    modalItemSaldoMoedas: document.getElementById("modal-item-saldo-moedas"),
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
    modalProjetilVolumeTotal: document.getElementById("modal-projetil-volume-total"),
    modalCampoMaterialTipo: document.getElementById("modal-campo-material-tipo"),
    modalMaterialTipo: document.getElementById("modal-material-tipo"),
    modalCampoMaterialQualidade: document.getElementById("modal-campo-material-qualidade"),
    modalMaterialQualidade: document.getElementById("modal-material-qualidade"),
    modalCampoMaterialQuantidade: document.getElementById("modal-campo-material-quantidade"),
    modalMaterialQuantidade: document.getElementById("modal-material-quantidade"),
    modalCampoPeso: document.getElementById("modal-campo-peso"),
    modalLabelPeso: document.getElementById("modal-label-peso"),
    modalPeso: document.getElementById("modal-peso"),
    modalCampoVolume: document.getElementById("modal-campo-volume"),
    modalLabelVolume: document.getElementById("modal-label-volume"),
    modalVolume: document.getElementById("modal-volume"),
    modalCampoTamanho: document.getElementById("modal-campo-tamanho"),
    modalTamanho: document.getElementById("modal-tamanho"),
    modalCampoSubtipoPorte: document.getElementById("modal-campo-subtipo-porte"),
    modalSubtipoPorte: document.getElementById("modal-subtipo-porte"),
    modalCampoCompartimentos: document.getElementById("modal-campo-compartimentos"),
    modalListaCompartimentos: document.getElementById("modal-lista-compartimentos"),
    modalCampoQuantidade: document.getElementById("modal-campo-quantidade"),
    modalQuantidade: document.getElementById("modal-quantidade"),
    modalQuantidadePesoTotal: document.getElementById("modal-quantidade-peso-total"),
    modalQuantidadeVolumeTotal: document.getElementById("modal-quantidade-volume-total"),
    modalCampoCategoriaItem: document.getElementById("modal-campo-categoria-item"),
    modalCategoriaItem: document.getElementById("modal-categoria-item"),
    modalCampoJaEquipar: document.getElementById("modal-campo-ja-equipar"),
    modalJaEquipar: document.getElementById("modal-ja-equipar"),
    modalCampoGuardarDentro: document.getElementById("modal-campo-guardar-dentro"),
    modalGuardarDentro: document.getElementById("modal-guardar-dentro"),
    modalConfigArma: document.getElementById("modal-config-arma"),
    modalArmaDanoBase: document.getElementById("modal-arma-dano-base"),
    modalArmaTipoDano: document.getElementById("modal-arma-tipo-dano"),
    modalCampoTipoDanoExtra: document.getElementById("modal-campo-tipo-dano-extra"),
    modalArmaTipoDanoExtra: document.getElementById("modal-arma-tipo-dano-extra"),
    modalCampoDilacera: document.getElementById("modal-campo-dilacera"),
    modalArmaDilacera: document.getElementById("modal-arma-dilacera"),
    modalCampoDilaceraGolpeNormal: document.getElementById("modal-campo-dilacera-golpe-normal"),
    modalArmaDilaceraGolpeNormal: document.getElementById("modal-arma-dilacera-golpe-normal"),
    modalCampoEscala: document.getElementById("modal-campo-escala"),
    modalArmaEscala: document.getElementById("modal-arma-escala"),
    modalConfigExplosivo: document.getElementById("modal-config-explosivo"),
    modalExplosivoModelo: document.getElementById("modal-explosivo-modelo"),
    modalExplosivoDificuldadeArmar: document.getElementById("modal-explosivo-dificuldade-armar"),
    modalExplosivoRaio: document.getElementById("modal-explosivo-raio"),
    modalExplosivoModulo: document.getElementById("modal-explosivo-modulo"),
    modalConfigArmaFogo: document.getElementById("modal-config-arma-fogo"),
    modalArmaCapacidade: document.getElementById("modal-arma-capacidade"),
    modalArmaDisparosTurno: document.getElementById("modal-arma-disparos-turno"),
    modalArmaPrecisao: document.getElementById("modal-arma-precisao"),
    modalArmaDificuldadeAcerto: document.getElementById("modal-arma-dificuldade-acerto"),
    modalArmaAlcance: document.getElementById("modal-arma-alcance"),
    modalArmaRecuo: document.getElementById("modal-arma-recuo"),
    modalArmaEfeitoExtra: document.getElementById("modal-arma-efeito-extra"),
    modalArmaUsaCarregador: document.getElementById("modal-arma-usa-carregador"),
    modalCampoArmaCamaraExtra: document.getElementById("modal-campo-arma-camara-extra"),
    modalArmaTemCamaraExtra: document.getElementById("modal-arma-tem-camara-extra"),
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
    templateCompartimento: document.getElementById("template-compartimento"),
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
    btnTimeskip: document.getElementById("btn-timeskip"),
    modalTimeskip: document.getElementById("modal-timeskip"),
    timeskipDias: document.getElementById("timeskip-dias"),
    timeskipPreview: document.getElementById("timeskip-preview"),
    timeskipCancelar: document.getElementById("timeskip-cancelar"),
    timeskipConfirmar: document.getElementById("timeskip-confirmar"),
    // recuperação de PV
    recuperacaoPvPainel: document.getElementById("recuperacao-pv-painel"),
    recuperacaoPvStatus: document.getElementById("recuperacao-pv-status"),
    btnSolicitarRecuperacaoPv: document.getElementById("btn-solicitar-recuperacao-pv"),
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
    // modalMestre / mestreFechar não existem mais — mestreCorpo agora
    // mora dentro da gaveta de Ações Pendentes (#drawer-pendentes), que
    // já tem seu próprio botão de fechar (drawerPendentesFechar).
    mestreCorpo: document.getElementById("mestre-corpo"),
    mestreCorpoTopo: document.getElementById("mestre-corpo-topo"),
    mestreCorpoTitulo: document.getElementById("mestre-corpo-titulo"),
    mestreCorpoFechar: document.getElementById("mestre-corpo-fechar"),
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

// Lucide substitui cada <i data-lucide="nome"></i> por um <svg> — só
// precisa rodar de novo depois de qualquer innerHTML novo que tenha
// desses marcadores (ela ignora o que já foi processado, então chamar
// à toa não tem custo real).
function atualizarIcones() {
    if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ---------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------
// init() é chamado de forma adiada (setTimeout 0) de propósito: várias
// consts usadas logo no começo da função (ex.: CHAVE_ABAS_MODO,
// ABAS_OCULTAS_NPC) são declaradas mais abaixo no arquivo. Chamando
// init() direto aqui, ele roda ANTES dessas linhas serem executadas
// (o motor de JS ainda não chegou nelas), o que dá "Cannot access
// before initialization". Adiar pro próximo tick garante que o arquivo
// inteiro já terminou de rodar (todas as consts/functions do topo já
// existem) antes do init() de fato começar.
setTimeout(() => init(), 0);

async function init() {
    el.userRole.innerText = isMestre ? "Mestre" : (sessao.nome || "Jogador").toUpperCase();
    el.userRole.classList.add(isMestre ? "mestre" : "jogador");
    if (el.mesaIndicador) el.mesaIndicador.innerText = `Mesa: ${sessao.mesaId || "?"}`;

    montarGridsEstaticas();
    montarAbas();
    gerenciarLayoutAbas();
    montarSelectsFixos();

    // Regra de ouro financeira/inventário: só o Mestre pode adicionar
    // item novo direto no inventário. O jogador usa "Usar"/"Mover"/"Dar",
    // e remoção/transferência sempre passam pelo Sistema de Aprovação.
    document.getElementById("btn-add-item").style.display = isMestre ? "inline-block" : "none";

    // "Tratar outro jogador" (aba Saúde): só faz sentido pra quem tem
    // uma ficha própria pra rolar o teste (o Mestre não trata ninguém
    // por aqui — ver plano-sistema-saude-ferimentos.txt, seção 6).
    if (el.btnTratarOutroJogador) {
        el.btnTratarOutroJogador.style.display = isMestre ? "none" : "inline-block";
        el.btnTratarOutroJogador.addEventListener("click", abrirModalTratarOutroJogador);
    }

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
        el.btnPendentesLateral.style.display = "flex";
        el.btnAbrirCombate.style.display = "inline-block";
        if (el.btnAbrirCenario) el.btnAbrirCenario.style.display = "inline-block";
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
        configurarDrawerPendentes();
    } else {
        ativarSincronizacao();
    }
    configurarPainelInfoTopo();

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
    tentarOuAvisar("cenários", configurarCenarios);
    tentarOuAvisar("modal de alvo", configurarModalSelecionarAlvo);
    tentarOuAvisar("finanças", configurarFinancas);
    tentarOuAvisar("ações pendentes", configurarAcoesPendentes);
    tentarOuAvisar("recuperação de PV", configurarRecuperacaoPV);
    tentarOuAvisar("rolagem de determinações", configurarRolagemDeterminacoes);
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
    tentarOuAvisar("compartimentos de recipiente", configurarCompartimentosGenerico);
    tentarOuAvisar("campo substância (vício)", configurarCampoSubstanciaVicio);
    tentarOuAvisar("carrossel de status do topo", configurarStatusTopoCarrossel);
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

        dispararEfeitoDanoSeCaiu();

        aplicarVisibilidadeAbasNpc();
        configurarSaude();

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

// Compara o PV atual desta sincronização com o da anterior (mesma
// ficha/NPC) e, se caiu, dispara o efeito de tela de "acabou de levar
// dano" (flash vermelho + tremor — ver dispararEfeitoDano). Reseta a
// comparação sempre que troca de ficha/NPC (Mestre atuando por
// outro personagem, por exemplo) pra não disparar o efeito à toa na
// primeira carga.
function dispararEfeitoDanoSeCaiu() {
    const idAtual = modoNpc ? npcAtualId : fichaAtualId;
    if (idAtual !== idUltimaSyncEfeitoDano) {
        idUltimaSyncEfeitoDano = idAtual;
        pvAtualUltimaSync = Number(fichaAtual?.dados?.pvAtual);
        return;
    }
    const pvNovo = Number(fichaAtual?.dados?.pvAtual);
    if (Number.isFinite(pvAtualUltimaSync) && Number.isFinite(pvNovo) && pvNovo < pvAtualUltimaSync) {
        dispararEfeitoDano();
    }
    pvAtualUltimaSync = pvNovo;
}

// Efeito de tela rápido (flash vermelho + tremor) quando o personagem
// leva dano — além do texto que já aparece no Log de Dados/toast.
function dispararEfeitoDano() {
    if (el.efeitoDanoOverlay) {
        el.efeitoDanoOverlay.classList.remove("efeito-dano-ativo");
        void el.efeitoDanoOverlay.offsetWidth; // força reflow pra poder re-disparar a animação em dano seguido
        el.efeitoDanoOverlay.classList.add("efeito-dano-ativo");
    }
    if (el.app) {
        el.app.classList.remove("efeito-dano-tremor");
        void el.app.offsetWidth;
        el.app.classList.add("efeito-dano-tremor");
        setTimeout(() => el.app.classList.remove("efeito-dano-tremor"), 420);
    }
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
    const botoes = el.tabsNav.querySelectorAll(".tab-btn[data-tab]");
    botoes.forEach(btn => {
        btn.addEventListener("click", () => {
            botoes.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
            document.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"]`).classList.add("active");
        });
    });
}

// =====================================================================
// LAYOUT DAS ABAS: modo "fileira" (tudo visível, como sempre foi) vs.
// modo "compacto" (o jogador escolhe quais ficam sempre fixas e o resto
// vai pro menu "Mais"), com arrastar-e-soltar pra mover abas entre as
// duas zonas. Funciona com mouse e touch (Pointer Events). A escolha é
// salva no navegador (localStorage), por isso é por aparelho/navegador,
// não por personagem.
// =====================================================================
function gerenciarLayoutAbas() {
    if (!el.tabsNav || !el.tabsFixadas || !el.tabsMaisMenu || !el.tabsMaisWrap || !el.tabsEditarBtn || !el.tabsModoBtn) return;

    const todosBotoes = [...el.tabsNav.querySelectorAll(".tab-btn[data-tab]")];
    const mapaBotoes = {};
    todosBotoes.forEach(b => { mapaBotoes[b.dataset.tab] = b; });
    let modoAtual = "fileira";

    function lerLS(chave) {
        try { return localStorage.getItem(chave); } catch { return null; }
    }
    function lerListaSalva(chave, padrao) {
        const bruto = lerLS(chave);
        if (!bruto) return padrao;
        try {
            const lista = JSON.parse(bruto);
            return Array.isArray(lista) ? lista.filter(k => mapaBotoes[k]) : padrao;
        } catch { return padrao; }
    }
    function salvar() {
        try {
            localStorage.setItem(CHAVE_ABAS_MODO, modoAtual);
            localStorage.setItem(CHAVE_ABAS_FIXADAS, JSON.stringify([...el.tabsFixadas.children].map(b => b.dataset.tab)));
            localStorage.setItem(CHAVE_ABAS_MAIS, JSON.stringify([...el.tabsMaisMenu.children].map(b => b.dataset.tab)));
        } catch { /* localStorage indisponível (modo privado etc.) — só não persiste */ }
    }

    function atualizarVisibilidadeMais() {
        el.tabsMaisWrap.style.display = (modoAtual === "compacto" && el.tabsMaisMenu.children.length) ? "" : "none";
    }

    // A caixa "Mais", quando vazia, não tinha nenhum conteúdo visual
    // além do min-height do CSS — o que podia deixá-la sem área real
    // pra soltar uma aba (o elemento sob o ponteiro deixava de ser
    // ela). Esse placeholder garante que ela sempre tenha algo visível
    // e "pegável" mesmo com zero abas dentro.
    function atualizarPlaceholderMais() {
        const temAbas = !!el.tabsMaisMenu.querySelector(".tab-btn[data-tab]");
        let placeholder = el.tabsMaisMenu.querySelector(".tabs-mais-vazio");
        if (!temAbas) {
            if (!placeholder) {
                placeholder = document.createElement("span");
                placeholder.className = "tabs-mais-vazio";
                placeholder.textContent = "Arraste uma aba pra cá pra escondê-la no menu \"Mais\"";
                el.tabsMaisMenu.appendChild(placeholder);
            }
        } else if (placeholder) {
            placeholder.remove();
        }
    }

    function sairModoEdicao() {
        el.tabsNav.classList.remove("editando");
        el.tabsEditarBtn.innerHTML = '<i data-lucide="move"></i> Organizar';
        el.tabsEditarBtn.classList.remove("ativo");
        el.tabsMaisWrap.classList.remove("aberto");
        el.tabsMaisWrap.style.removeProperty("display");
        atualizarVisibilidadeMais();
        atualizarIcones();
    }

    function aplicarModo(modo) {
        modoAtual = modo;
        sairModoEdicao();

        if (modo === "fileira") {
            [...el.tabsMaisMenu.children].forEach(b => b.classList.contains("tab-btn") && el.tabsFixadas.appendChild(b));
            el.tabsEditarBtn.disabled = true;
            el.tabsModoBtn.innerHTML = '<i data-lucide="layout-grid"></i> Compacto';
            el.tabsModoBtn.classList.add("ativo");
        } else {
            const fixadasSalvas = lerListaSalva(CHAVE_ABAS_FIXADAS, ABAS_FIXADAS_PADRAO);
            const maisSalvas = lerListaSalva(
                CHAVE_ABAS_MAIS,
                todosBotoes.map(b => b.dataset.tab).filter(k => !fixadasSalvas.includes(k))
            );
            fixadasSalvas.forEach(k => mapaBotoes[k] && el.tabsFixadas.appendChild(mapaBotoes[k]));
            maisSalvas.forEach(k => { if (mapaBotoes[k] && !fixadasSalvas.includes(k)) el.tabsMaisMenu.appendChild(mapaBotoes[k]); });
            // Qualquer aba que não caiu em nenhuma das duas listas salvas
            // (ex.: uma aba nova que não existia quando o jogador salvou a
            // preferência) cai no "Mais" por padrão, pra não sumir.
            todosBotoes.forEach(b => {
                if (!el.tabsFixadas.contains(b) && !el.tabsMaisMenu.contains(b)) el.tabsMaisMenu.appendChild(b);
            });
            el.tabsEditarBtn.disabled = false;
            el.tabsModoBtn.innerHTML = '<i data-lucide="rows-3"></i> Fileira';
            el.tabsModoBtn.classList.remove("ativo");
        }
        atualizarPlaceholderMais();
        atualizarVisibilidadeMais();
        aplicarVisibilidadeAbasNpc();
        salvar();
        atualizarIcones();
    }

    el.tabsModoBtn.addEventListener("click", () => {
        aplicarModo(modoAtual === "fileira" ? "compacto" : "fileira");
    });

    el.tabsEditarBtn.addEventListener("click", () => {
        if (modoAtual !== "compacto") return;
        if (el.tabsNav.classList.contains("editando")) {
            sairModoEdicao();
            salvar();
        } else {
            el.tabsNav.classList.add("editando");
            el.tabsMaisWrap.classList.remove("aberto");
            // Força a exibição da caixa "Mais" direto via JS (em vez de
            // depender só da cascata do CSS) — remove qualquer chance
            // de ela ficar com display:none herdado do estado inicial.
            el.tabsMaisWrap.style.setProperty("display", "block", "important");
            atualizarPlaceholderMais();
            el.tabsEditarBtn.innerHTML = '<i data-lucide="check"></i> Concluir';
            el.tabsEditarBtn.classList.add("ativo");
            atualizarIcones();
        }
    });


    // Dropdown do "Mais" (só relevante fora do modo de organizar, onde a
    // caixa fica sempre aberta via CSS pra dar pra soltar abas nela).
    el.tabsMaisBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        el.tabsMaisWrap.classList.toggle("aberto");
    });
    el.tabsMaisMenu.addEventListener("click", (e) => {
        if (e.target.closest(".tab-btn")) el.tabsMaisWrap.classList.remove("aberto");
    });
    document.addEventListener("click", (e) => {
        if (!el.tabsMaisWrap.classList.contains("aberto")) return;
        if (el.tabsMaisWrap.contains(e.target)) return;
        el.tabsMaisWrap.classList.remove("aberto");
    });

    // ---- Arrastar-e-soltar (mouse + touch, via Pointer Events) ----
    let arrastando = null, arrastoIniciado = false, xInicial = 0, yInicial = 0;

    function containerNoPonto(x, y) {
        const alvo = document.elementFromPoint(x, y);
        if (!alvo) return null;
        if (alvo === el.tabsFixadas || alvo === el.tabsMaisMenu) return alvo;
        return alvo.closest(".tabs-fixadas, .tabs-mais-menu");
    }
    function posicaoDeInsercao(container, x, y) {
        const itens = [...container.children].filter(c => c !== arrastando && c.classList.contains("tab-btn"));
        if (!itens.length) return null;

        // Agrupa os itens por linha (mesmo "top" aproximado) antes de
        // comparar X. Sem isso, o item mais próximo em linha reta podia
        // estar numa linha diferente da que o ponteiro está sobre —
        // já que os containers usam flex-wrap — fazendo a aba pular
        // pra um lugar bem diferente de onde foi solta.
        const linhas = [];
        itens.forEach(item => {
            const r = item.getBoundingClientRect();
            let linha = linhas.find(l => Math.abs(l.top - r.top) < r.height / 2);
            if (!linha) { linha = { top: r.top, bottom: r.bottom, itens: [] }; linhas.push(linha); }
            linha.itens.push({ item, rect: r });
            linha.top = Math.min(linha.top, r.top);
            linha.bottom = Math.max(linha.bottom, r.bottom);
        });

        // Linha mais próxima do ponteiro no eixo Y: a que contém o Y,
        // ou (se estiver acima da primeira/abaixo da última) a mais
        // perto de todas.
        let linhaAlvo = linhas.find(l => y >= l.top && y <= l.bottom);
        if (!linhaAlvo) {
            linhaAlvo = linhas.reduce((melhor, l) => {
                const distAtual = Math.min(Math.abs(y - l.top), Math.abs(y - l.bottom));
                const distMelhor = Math.min(Math.abs(y - melhor.top), Math.abs(y - melhor.bottom));
                return distAtual < distMelhor ? l : melhor;
            }, linhas[0]);
        }

        // Dentro da linha escolhida, decide antes/depois de cada item
        // olhando só o X (ordem visual da esquerda pra direita).
        const itensLinha = linhaAlvo.itens.sort((a, b) => a.rect.left - b.rect.left);
        for (const { item, rect } of itensLinha) {
            const cx = rect.left + rect.width / 2;
            if (x < cx) return item;
        }
        return itensLinha[itensLinha.length - 1].item.nextElementSibling;
    }
    function onPointerMoveArrastar(e) {
        if (!arrastando) return;
        if (!arrastoIniciado) {
            if (Math.hypot(e.clientX - xInicial, e.clientY - yInicial) < 6) return;
            arrastoIniciado = true;
            arrastando.classList.add("arrastando");
        }
        const container = containerNoPonto(e.clientX, e.clientY) || arrastando.parentElement;
        const ref = posicaoDeInsercao(container, e.clientX, e.clientY);
        if (ref) container.insertBefore(arrastando, ref); else container.appendChild(arrastando);
        atualizarPlaceholderMais();
    }
    function onPointerUpArrastar(e) {
        if (!arrastando) return;
        const btn = arrastando;
        if (arrastoIniciado) {
            // Engole o próximo clique (soltar o botão dispara "click" em
            // seguida) pra não trocar de aba sem querer só por causa do arrasto.
            btn.addEventListener("click", (ce) => { ce.stopPropagation(); ce.preventDefault(); }, { once: true, capture: true });
        }
        btn.classList.remove("arrastando");
        btn.releasePointerCapture?.(e.pointerId);
        btn.removeEventListener("pointermove", onPointerMoveArrastar);
        btn.removeEventListener("pointerup", onPointerUpArrastar);
        btn.removeEventListener("pointercancel", onPointerUpArrastar);
        arrastando = null;
        arrastoIniciado = false;
        atualizarPlaceholderMais();
        atualizarVisibilidadeMais();
        salvar();
    }
    el.tabsNav.addEventListener("pointerdown", (e) => {
        if (!el.tabsNav.classList.contains("editando")) return;
        const btn = e.target.closest(".tab-btn[data-tab]");
        if (!btn) return;
        arrastando = btn;
        arrastoIniciado = false;
        xInicial = e.clientX;
        yInicial = e.clientY;
        btn.setPointerCapture(e.pointerId);
        btn.addEventListener("pointermove", onPointerMoveArrastar);
        btn.addEventListener("pointerup", onPointerUpArrastar);
        btn.addEventListener("pointercancel", onPointerUpArrastar);
    });

    aplicarModo(lerLS(CHAVE_ABAS_MODO) || "fileira");
}

// Abas que não fazem sentido pra um NPC (finanças, treinamento/estudo,
// dark net, veículos) somem enquanto o Mestre estiver "atuando como"
// ele — o resto (Perfil, Atributos, Perícias, Inventário, Combate,
// Vantagens/Desvantagens, Especializações, Notas) continua igual à
// ficha normal.
const ABAS_OCULTAS_NPC = ["financas", "treinamento", "darknet", "veiculos", "saude"];
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
    // "chave" (ver plano-veiculos.txt, adendo "chave") fica sempre na
    // lista — precisa continuar aqui pra uma chave já existente
    // conseguir mostrar/editar sua própria tag corretamente — mas o
    // option some na hora de CRIAR um item novo (ver prepararModalItem
    // abaixo), porque esse item só faz sentido com um veiculoId
    // apontando pra um veículo existente, e o modal genérico não tem
    // campo pra isso. Chave de verdade nasce em salvarVeiculoDoModal
    // (ao criar o veículo) ou em reporChaveVeiculo (Mestre repondo uma
    // perdida).
    el.modalTag.innerHTML = '<option value="">-- escolha a tag --</option>';
    TAGS_ITEM.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        if (ehChaveVeiculo(t.key)) opt.dataset.chaveVeiculo = "1";
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
    // "Regra de ouro" — os 2 momentos legítimos de edição livre:
    // 1. Criação de personagem em andamento
    if (!fichaAtual.criacao.concluida) return true;
    // 2. Level Up pendente
    if (fichaAtual.levelUpPendente && fichaAtual.levelUpPendente.ativo) return true;
    // Treinamento NÃO libera edição da ficha. O ganho da perícia/atributo
    // treinado é aplicado automaticamente pelo próprio sistema de
    // Treinamento (ver treinamento.js → aplicarAumentoCaracteristica,
    // chamada quando avancarUmDiaTreinamento bate o total de dias). Deixar
    // treinamento.ativo liberar esta função era um exploit: enquanto
    // qualquer característica estivesse em treino, o jogador podia editar
    // QUALQUER atributo/perícia da ficha livremente, não só a treinada.
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
function receitaLivreDoSlot(periciaNome, nivel, tipoSlot = "bomba") {
    const entrada = Object.entries(fichaAtual.receitasConhecidas || {})
        .find(([, c]) => c.periciaVinculada === periciaNome && Number(c.nivel) === nivel && c.origem === "livre" && (c.tipoSlot || "bomba") === tipoSlot);
    return entrada ? { id: entrada[0], ...entrada[1] } : null;
}

// Manual pg. 81: "Para cada ponto na perícia Explosivo, escolha uma
// receita de módulo de detonação" — slot GRÁTIS À PARTE do slot normal
// de bomba (mesmo nível 1..nivelPericia), só que a receita escolhida
// não é de Explosivos — é de Ofícios Utilitários ou Eletrônica (quem
// cria módulo de detonação, ver MODULOS_DETONACAO em dados-manual.js),
// filtrada aqui pelo item vinculado (itemGlobalId) ter a tag
// "modulo_detonacao". Ver renderizarReceitas (bloco "Explosivos") e o
// tipoSlot="modulo" em receitaLivreDoSlot/concederReceitaConhecida.
function receitasModuloDetonacaoDisponiveis(nivel) {
    return receitasGlobaisCache.filter(r => {
        if ((Number(r.nivel) || 1) !== nivel) return false;
        if (!r.itemGlobalId) return false;
        const item = itensGlobaisCache.find(it => it.id === r.itemGlobalId);
        return !!item && item.tag === "modulo_detonacao";
    });
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
async function concederReceitaConhecida(periciaNome, nivel, receitaGlobalId, origem, tipoSlot = "bomba") {
    if (!fichaAtual.receitasConhecidas) fichaAtual.receitasConhecidas = {};
    if (origem === "livre" && receitaLivreDoSlot(periciaNome, nivel, tipoSlot)) {
        toast(`Esse personagem já tem a receita gratuita de nível ${nivel}${tipoSlot === "modulo" ? " (módulo de detonação)" : ""} dessa perícia.`, "erro");
        return;
    }
    const nomeAutor = fichaAtual?.config?.nomeExibicao || sessao?.nome || (isMestre ? "Mestre" : "Jogador");
    const id = gerarIdLocal();
    fichaAtual.receitasConhecidas[id] = {
        receitaGlobalId,
        periciaVinculada: periciaNome,
        nivel,
        origem,
        tipoSlot,
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


// Igual coletarModificadores(fichaAtual), mas já injeta o dia atual do
// calendário da mesa — necessário pra calcular o malus de Abstinência
// (ver calcularModificadoresAbstinencia em regras.js). Único ponto usado
// por toda a ficha do jogador, pra não espalhar `calendarioAtual?.diaIndice`
// em cada chamada.
function modificadoresAtuais() {
    return coletarModificadores(fichaAtual, calendarioAtual ? calendarioAtual.diaIndice : null, calendarioAtual ? calendarioAtual.hora : null);
}

function renderizarTudo() {
    if (!fichaAtual) return;
    const modificadoresPlanos = modificadoresAtuais();

    renderizarPerfil();
    renderizarFinancas();
    renderizarAtributos(modificadoresPlanos);
    verificarMorte();
    renderizarPericias(modificadoresPlanos);
    renderizarInventario(modificadoresPlanos);
    renderizarItensEquipadosTopo();
    renderizarCombate();
    renderizarVeiculos();
    renderizarCenarios();
    renderizarVantagensDesvantagens();
    renderizarEspecializacoes();
    renderizarTreinamento();
    renderizarReceitas();
    renderizarDarknetENotas();

    // Reavalia o alerta "VOCÊ ESTÁ EM COMBATE!" (e o travamento de ações
    // fora do turno) sempre que a ficha terminar de carregar/atualizar —
    // não só quando o estado de combate muda (ver configurarCombateAtivo).
    // Sem isso, se o snapshot de combateAtivo chegar ANTES da ficha (caso
    // comum: fichaAtualId ainda vazio no primeiro disparo do listener),
    // meuParticipanteIdCombate() não encontra o participante e o alerta
    // nunca é recalculado depois, mesmo com a ficha já carregada.
    if (!isMestre) {
        renderizarAlertaIniciativaCombate();
        travarAcoesForaDoTurno();
    }
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
    el.financasMoverBloco.style.display = isMestre ? "none" : "block";

    renderizarSaldos();
    renderizarOpcoesOrigemGasto();
    renderizarOpcoesMoverDinheiro();

    if (document.activeElement !== el.financasGanhoFixo) {
        el.financasGanhoFixo.value = fichaAtual.dados.ganhoFixo ?? 0;
    }
    el.financasGanhoFixo.disabled = !isMestre;
    el.financasGanhoFixoSalvar.style.display = isMestre ? "inline-block" : "none";
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

// Popula os dois dropdowns ("De" / "Para") de "Mover dinheiro entre
// saldos" com os saldos atuais da ficha, preservando a escolha atual de
// cada um quando possível — mesma ideia de renderizarOpcoesOrigemGasto
// acima, só que duplicada pros dois lados da movimentação.
function renderizarOpcoesMoverDinheiro() {
    const saldos = todosOsSaldos(fichaAtual);
    [el.financasMoverOrigem, el.financasMoverDestino].forEach((select) => {
        const escolhaAnterior = select.value;
        select.innerHTML = "";
        saldos.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.innerText = s.nome;
            select.appendChild(opt);
        });
        if (saldos.some(s => s.id === escolhaAnterior)) select.value = escolhaAnterior;
    });
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
            const campo = campoSaldoDoItem(saldoId);
            if (!fichaAtual.inventario || !fichaAtual.inventario[itemId]) return;
            fichaAtual.inventario[itemId][campo] = valor;
            agendarSalvamento(`inventario/${itemId}/${campo}`, valor);
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

    // Ganho fixo — agora só o Mestre pode definir. Fica registrado pro
    // crédito automático de Domingo. Não passa pelo sistema de aprovação
    // (não é uma transação, é um valor fixo cadastrado pelo Mestre).
    el.financasGanhoFixoSalvar.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId) return;
        if (!isMestre) { toast("Só o Mestre pode definir o ganho fixo.", "erro"); return; }
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

    // Transformar valor em item — em vez de gastar o dinheiro, ele vira
    // um item físico ("Dinheiro") no inventário desta ficha, com o
    // valor embutido em saldoValor (mesmo esquema de "carteira digital",
    // só que representando uma grana física que pode ser dada a outro
    // personagem pelo fluxo normal de "Dar item"). Também passa pela
    // fila de aprovação do Mestre, igual "Gastar dinheiro" — só troca o
    // destino final (cria item em vez de simplesmente subtrair).
    el.financasTransformarItemBtn.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId || isMestre) return;
        const valor = Math.floor(Number(el.financasGastarValor.value)) || 0;
        if (valor <= 0) { toast("Informe um valor maior que zero.", "erro"); return; }
        const saldoId = el.financasGastarOrigem.value;
        const saldo = todosOsSaldos(fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const saldoAtual = Number(saldo.valor) || 0;
        if (valor > saldoAtual) { toast("Valor maior que o saldo disponível.", "erro"); return; }
        const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
        await criarAcaoPendente({
            tipo: "transformar_dinheiro_item",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer transformar CN$ ${valor} (${saldo.nome}) num item de dinheiro.`,
            payload: { valor, saldoId }
        });
        toast("Pedido enviado ao Mestre.");
        el.financasGastarValor.value = 0;
    });

    // Mover dinheiro entre saldos — igual "Gastar dinheiro", o jogador
    // nunca move na hora, vira pedido pro Mestre aprovar (regra 4). Não
    // altera a soma total da ficha, só a distribuição entre saldos (ex.:
    // sacar da conta bancária e guardar na carteira). Funciona pra
    // qualquer par de saldos, inclusive carteiras digitais de item (ver
    // ehIdSaldoDeItem em dados-manual.js) e saldos customizados.
    el.financasMoverBtn.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId || isMestre) return;
        const valor = Number(el.financasMoverValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor de movimentação maior que zero.", "erro"); return; }
        const origemId = el.financasMoverOrigem.value;
        const destinoId = el.financasMoverDestino.value;
        if (!origemId || !destinoId) { toast("Escolha os saldos de origem e destino.", "erro"); return; }
        if (origemId === destinoId) { toast("Escolha saldos diferentes pra origem e destino.", "erro"); return; }
        const saldos = todosOsSaldos(fichaAtual);
        const saldoOrigem = saldos.find(s => s.id === origemId);
        const saldoDestino = saldos.find(s => s.id === destinoId);
        if (!saldoOrigem || !saldoDestino) { toast("Escolha saldos válidos.", "erro"); return; }
        const saldoAtualOrigem = Number(saldoOrigem.valor) || 0;
        if (valor > saldoAtualOrigem) { toast("Valor maior que o saldo disponível na origem.", "erro"); return; }
        const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
        await criarAcaoPendente({
            tipo: "mover_dinheiro",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer mover CN$ ${valor} de "${saldoOrigem.nome}" pra "${saldoDestino.nome}".`,
            payload: { valor, saldoOrigemId: origemId, saldoDestinoId: destinoId }
        });
        toast("Pedido de movimentação enviado ao Mestre.");
        el.financasMoverValor.value = 0;
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
        consumo = checarConsumoDeAcao(false);
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

    renderizarBarrasVitaisTopo(d.pvAtual, pvMaximoTotal, estadoSaude, d.energiaAtual, energiaMaximoTotal, estadoEnergia);
    renderizarComaBadge(d);
    renderizarDesmaioBadge(d);
    ultimoContextoRecuperacaoPV = { d, pvMaximoTotal };
    renderizarRecuperacaoPV(d, pvMaximoTotal);

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

// Barrinhas de PV/Energia no topo da ficha (sempre visíveis, sem precisar
// rolar até "Recursos vitais"). A cor NÃO é um percentual solto — segue
// exatamente os mesmos estados de calcularEstadoSaude/calcularEstadoEnergia
// (regras.js) que já definem Machucado/Muito Machucado e Energia
// Baixa/Crítica em qualquer outro lugar da ficha: saudável = verde,
// Machucado/Energia Baixa = amarela, Muito Machucado/Energia
// Crítica/Morte = vermelha. Isso já embute o efeito da perícia
// Tolerância, que empurra o limiar de Muito Machucado de 1/3 pra 1/4 do
// PV máximo (ver LIMIAR_MUITO_MACHUCADO_COM_TOLERANCIA) — como o estado
// já vem calculado assim de fora, a barra automaticamente segue junto.
function renderizarBarrasVitaisTopo(pvAtual, pvMax, estadoSaude, energiaAtual, energiaMax, estadoEnergia) {
    const corPorEstado = estado => {
        if (!estado) return null;
        if (estado === "machucado" || estado === "energia_baixa") return "vital-cor-media";
        if (estado === "muito_machucado" || estado === "energia_critica" || estado === "morte") return "vital-cor-critica";
        return null;
    };
    const aplicarBarra = (fillEl, numeroEl, atualBruto, max, classeCor) => {
        if (!fillEl || !numeroEl) return;
        const atual = (atualBruto === null || atualBruto === undefined) ? max : Number(atualBruto);
        const maxSeguro = Number(max) || 0;
        const pct = maxSeguro > 0 ? Math.max(0, Math.min(100, (atual / maxSeguro) * 100)) : 0;
        fillEl.style.width = `${pct}%`;
        fillEl.classList.remove("vital-cor-media", "vital-cor-critica");
        if (classeCor) fillEl.classList.add(classeCor);
        numeroEl.innerText = `${Math.round(atual)}/${Math.round(maxSeguro)}`;
    };
    aplicarBarra(el.vitalPvFill, el.vitalPvNumero, pvAtual, pvMax, corPorEstado(estadoSaude && estadoSaude.estado));
    aplicarBarra(el.vitalEnergiaFill, el.vitalEnergiaNumero, energiaAtual, energiaMax, corPorEstado(estadoEnergia && estadoEnergia.estado));

    // Destaque de "muito ferido": a ficha inteira ganha uma borda vermelha
    // pulsando bem devagar quando o estado é grave (Muito Machucado ou
    // Energia Crítica) — mesma leitura das barras acima, só que dá pra
    // notar mesmo sem estar olhando pro topo. Morte já tem seu próprio
    // overlay cobrindo a tela, então não precisa duplicar o alerta aqui.
    const estadoGrave = (estadoSaude && estadoSaude.estado === "muito_machucado")
        || (estadoEnergia && estadoEnergia.estado === "energia_critica");
    if (el.app) el.app.classList.toggle("ficha-muito-ferido", !!estadoGrave);

    atualizarStatusTopoCarrossel();
}

// ---------------------------------------------------------------------
// Carrossel de status ativos no topo (ao lado das barras de PV/Energia).
// Junta TODO status que esteja acometendo quem está sendo controlado
// nesta tela agora (a própria ficha, ou o NPC que o Mestre estiver
// atuando como — mesmo critério de meuStatusAgarrado/meuStatusImobilizado/
// meuStatusDesacordado acima): estado de saúde (Machucado/Muito
// Machucado), estado de Energia, Abstinência de vício, Infecção, e — se
// estiver em combate — Derrubado, Agarrado, Imobilizado, Inconsciente
// (Desacordado), Ossos quebrados, Alcance limitado e Sangramento (Tick
// System). Cada item vira uma entrada { icone, texto, titulo }; o
// carrossel troca de entrada a cada 1s (ver configurarStatusTopoCarrossel
// mais abaixo). Quando não há nenhum status ativo, a caixinha some.
// ---------------------------------------------------------------------
function coletarStatusAtivosTopo() {
    const lista = [];
    if (!fichaAtual) return lista;

    // Estado de saúde (Machucado / Muito Machucado) — já calculado em
    // renderizarAtributos() e guardado em window._estadoSaudeAtual.
    const estadoSaude = window._estadoSaudeAtual;
    if (estadoSaude && estadoSaude.estado && estadoSaude.estado !== "morte") {
        const efeito = estadoSaude.metadeVelocidade ? "Velocidade pela metade" : `Velocidade ${estadoSaude.penalidadeVelocidade}`;
        lista.push({
            icone: estadoSaude.estado === "muito_machucado" ? "🤕" : "🩹",
            texto: estadoSaude.label,
            titulo: `${estadoSaude.label} — ${efeito} · ${estadoSaude.penalidadeTestes} em todos os testes`
        });
    }

    // Estado de Energia (Energia Baixa / Energia Crítica).
    const estadoEnergia = window._estadoEnergiaAtual;
    if (estadoEnergia && estadoEnergia.estado && estadoEnergia.estado !== "morte") {
        lista.push({
            icone: "🔋",
            texto: estadoEnergia.label,
            titulo: estadoEnergia.estado === "energia_critica"
                ? "-3 em testes físicos, -2 em testes mentais"
                : "-2 em testes físicos"
        });
    }

    // Abstinência (Desvantagem "Vício" com substância, ver
    // calcularAbstinenciaVicio em regras.js) — uma entrada por vício em
    // abstinência (dá pra ter mais de um vício cadastrado ao mesmo tempo).
    const diaAtual = calendarioAtual ? calendarioAtual.diaIndice : null;
    if (diaAtual !== null && diaAtual !== undefined) {
        const desvantagens = fichaAtual.desvantagens || {};
        Object.values(desvantagens).forEach(v => {
            if (!v || !v.substancia) return;
            const { semanas, malusTestes, malusPV } = calcularAbstinenciaVicio(v, diaAtual);
            if (semanas <= 0) return;
            lista.push({
                icone: "💉",
                texto: `Abstinência: ${v.substancia}`,
                titulo: `${semanas}ª semana em abstinência — ${malusTestes} em todos os testes${malusPV ? `, ${malusPV} PV máximo` : ""}`
            });
        });
    }

    // Infecção persistente (Complicações de ferimentos, manual) — flag
    // gravada em fichaAtual.dados.infeccao (ver aplicarInfeccao/mestre.js).
    if (fichaAtual.dados && fichaAtual.dados.infeccao && fichaAtual.dados.infeccao.ativo) {
        lista.push({ icone: "🦠", texto: "Infectado", titulo: "Tempo de repouso necessário +50% até tratamento médico" });
    }

    // Status só existentes durante combate (ver combateAtivoCache) —
    // lidos do mesmo participante usado por meuStatusAgarrado/
    // meuStatusImobilizado/meuStatusDesacordado acima.
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const participante = meuPid && combateAtivoCache.participantes ? combateAtivoCache.participantes[meuPid] : null;
    if (participante) {
        if (participante.derrubado && participante.derrubado.ativo) {
            lista.push({ icone: "🔻", texto: "Derrubado", titulo: `Derrubado por ${participante.derrubado.porNome || "?"} — dificuldade pra ser acertado cai -3` });
        }
        if (participante.desacordado && participante.desacordado.ativo) {
            lista.push({ icone: "💤", texto: "Inconsciente", titulo: "Desacordado — não age nem se defende; só o Mestre pode acordá-lo" });
        }
        if (participante.imobilizado && participante.imobilizado.ativo) {
            lista.push({ icone: "🔒", texto: "Imobilizado", titulo: `Imobilizado por ${participante.imobilizado.porNome || "?"} — não consegue atacar nem se mover` });
        }
        if (participante.agarrado && participante.agarrado.ativo) {
            lista.push({ icone: "🔗", texto: "Agarrado", titulo: `Agarrado por ${participante.agarrado.porNome || "?"} — golpes de alcance médio/longo bloqueados` });
        }
        if (participante.ossosQuebrados && participante.ossosQuebrados.ativo) {
            lista.push({ icone: "🦴", texto: "Ossos quebrados", titulo: `Reduz ${participante.ossosQuebrados.pontosPenalidade} ponto(s) qualquer ação física` });
        }
        if (participante.alcanceLimitado && participante.alcanceLimitado.ativo) {
            lista.push({ icone: "📏", texto: `Alcance limitado: ${participante.alcanceLimitado.valor}`, titulo: `Alcance limitado por ${participante.alcanceLimitado.porNome || "?"}` });
        }
        if (participante.statusAtivos) {
            Object.values(participante.statusAtivos)
                .filter(s => s && (Number(s.turnosRestantes) || 0) > 0)
                .forEach(s => {
                    lista.push({
                        icone: "🩸",
                        texto: `${s.label || "Sangrando"} (${s.turnosRestantes})`,
                        titulo: `${s.origem || ""} — ${s.danoPorTurno ?? `1d${s.faces || 1}`} de dano fixo por turno`
                    });
                });
        }
    }

    return lista;
}

let statusTopoLista = [];
let statusTopoIndice = 0;

// Recalcula a lista de status ativos (chamado sempre que os dados da
// ficha OU o estado de combate mudam) e mantém o índice atual do
// carrossel dentro dos limites da nova lista.
function atualizarStatusTopoCarrossel() {
    if (!el.vitalStatusCarrossel) return;
    statusTopoLista = coletarStatusAtivosTopo();
    if (statusTopoIndice >= statusTopoLista.length) statusTopoIndice = 0;
    renderizarStatusTopoAtual();
}

// Só troca o que é exibido na caixinha pro item atual da lista já
// calculada — chamado a cada 1s pelo setInterval de
// configurarStatusTopoCarrossel, sem precisar recalcular tudo de novo.
function renderizarStatusTopoAtual() {
    if (!el.vitalStatusCarrossel) return;
    if (!statusTopoLista.length) {
        el.vitalStatusCarrossel.style.display = "none";
        return;
    }
    const atual = statusTopoLista[statusTopoIndice] || statusTopoLista[0];
    el.vitalStatusCarrossel.style.display = "flex";
    el.vitalStatusCarrossel.title = atual.titulo || atual.texto;
    el.vitalStatusIcone.innerText = atual.icone;
    el.vitalStatusTexto.innerText = atual.texto;
}

// Liga o carrossel: a cada 1s avança pro próximo status ativo da lista
// (recalculada em atualizarStatusTopoCarrossel, chamada sempre que os
// dados da ficha ou o combate mudam). Um único setInterval, criado uma
// vez só na inicialização da página.
function configurarStatusTopoCarrossel() {
    if (!el.vitalStatusCarrossel) return;
    setInterval(() => {
        if (!statusTopoLista.length) return;
        statusTopoIndice = (statusTopoIndice + 1) % statusTopoLista.length;
        renderizarStatusTopoAtual();
    }, 1000);
}

// ---------------------------------------------------------------------
// Recuperação de PVs (manual) — painel logo abaixo dos badges de
// Machucado/Muito Machucado, em "Recursos vitais". Três estados:
//   1. Sem PV perdido: painel escondido (nada pra recuperar).
//   2. PV perdido, sem recuperação ativa: mostra o tempo estimado (ver
//      calcularTempoRecuperacaoPV em regras.js) e o botão de pedir ao
//      Mestre — o pedido em si vira uma Ação Pendente (ver
//      configurarRecuperacaoPV abaixo), só concretizado quando o Mestre
//      aprovar.
//   3. Recuperação já autorizada e em andamento: mostra o progresso
//      (dias decorridos / necessários) e some com o botão, já que só o
//      Mestre autoriza (não dá pra pedir de novo por cima).
// ---------------------------------------------------------------------
function renderizarRecuperacaoPV(d, pvMaximoTotal) {
    if (!el.recuperacaoPvPainel) return;
    const rec = d.recuperacaoPV;

    if (rec && rec.ativa) {
        pvRecuperacaoContexto = null;
        const diasNecessarios = Number(rec.diasNecessarios) || 0;
        const diasDecorridos = Math.min(diasNecessarios, Number(rec.diasDecorridos) || 0);
        const diasFaltando = Math.max(0, diasNecessarios - diasDecorridos);
        const notaInfeccao = rec.infectadoNoPedido ? " (+50% pela infecção ativa no momento do pedido)" : "";
        const notaHospital = rec.tratamentoHospitalNoPedido ? " (-1/10 pelo tratamento em hospital aprovado)" : "";
        const notaComa = rec.veioDoComaEm ? " (dobro pela saída de coma recente)" : "";
        el.recuperacaoPvPainel.style.display = "";
        el.recuperacaoPvStatus.innerText = `Recuperando PVs: ${diasDecorridos}/${diasNecessarios} dia(s)${notaInfeccao}${notaHospital}${notaComa} (faltam ${diasFaltando}). Avança sozinho a cada Timeskip do Mestre.`;
        if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "none";
        return;
    }

    const atual = (d.pvAtual === null || d.pvAtual === undefined) ? pvMaximoTotal : Number(d.pvAtual);
    const pvPerdidos = Math.max(0, Math.round(pvMaximoTotal - atual));

    if (pvPerdidos <= 0 || pvMaximoTotal <= 0) {
        pvRecuperacaoContexto = null;
        el.recuperacaoPvPainel.style.display = "none";
        return;
    }

    // Etapa 6 do plano de saúde: recuperação de PV fica bloqueada
    // enquanto existir ferida (fichas/{id}/feridas) em qualquer estado
    // diferente de "tratada" — reaproveita feridasCache, já mantido em
    // sincronia com a ficha atualmente aberta por configurarSaude
    // (ouvirFeridas em saude.js). Em modoNpc feridasCache fica sempre
    // vazio (NPCs ficam de fora do sistema de feridas nesta fase), então
    // nunca bloqueia.
    const feridaAberta = feridasCache.find(f => !feridaEstaFechada(f));
    if (feridaAberta) {
        pvRecuperacaoContexto = null;
        el.recuperacaoPvPainel.style.display = "";
        el.recuperacaoPvStatus.innerText = `${pvPerdidos} PV perdido(s) de ${pvMaximoTotal}. Trate os ferimentos antes de pedir recuperação de PV.`;
        if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "none";
        return;
    }

    // Padrão de Vida (manual, pg. 106-107): sem tratamento médico
    // especializado, a recuperação "natural" só cobre até um certo teto
    // de PV, conforme o Padrão de Vida do personagem (ver
    // limiteRecuperacaoSemTratamento em mestre.js). A fórmula de tempo
    // (perdidos/total × 30) continua igual — só muda o que entra como
    // "perdidos": em vez do total de PV perdido, usamos o quanto desse
    // total o Padrão de Vida cobre. O restante (pvSemRecuperar) fica de
    // fora do pedido e não é recuperado por esse caminho — só com
    // tratamento médico de verdade.
    const limite = limiteRecuperacaoSemTratamento(d.padraoDeVida);
    const pvRecuperavel = Math.min(pvPerdidos, limite);
    const pvSemRecuperar = pvPerdidos - pvRecuperavel;

    // Infecção (manual, "Complicações de ferimentos"): aumenta em 50% o
    // tempo de repouso necessário. A flag é persistente na própria ficha
    // (fichas/{id}/dados/infeccao — ver aplicarInfeccao/curarInfeccao em
    // mestre.js), não só durante o combate em que foi aplicada.
    const infectado = !!(d.infeccao && d.infeccao.ativo);
    const diasBase = calcularTempoRecuperacaoPV(pvRecuperavel, pvMaximoTotal, infectado);
    // Item 6 do plano (Coma): saída de coma dobra o tempo da PRÓXIMA
    // recuperação de PV (flag em dados.saiuDoComaPendente, setada só
    // manualmente pelo Mestre em Godmode — ver reverterComaGodmode em
    // mestre.js). Aplicado ANTES do desconto de hospital abaixo.
    const saiuDoComa = !!d.saiuDoComaPendente;
    const diasComComa = saiuDoComa ? diasBase * 2 : diasBase;
    // Item 3 do plano de saúde/complicações: tratamento em hospital
    // bem-sucedido (flag em dados.tratamentoHospital, ver saude.js)
    // reduz em 1/10 o tempo de recuperação da FICHA INTEIRA — aplicado
    // por cima do valor já calculado acima, não dentro da fórmula base.
    const tratadoEmHospital = !!d.tratamentoHospital;
    const diasNecessarios = aplicarReducaoTratamentoHospital(diasComComa, tratadoEmHospital);
    // diasBase (sem desconto de hospital nem dobro por coma) também é
    // guardado no contexto — é o que vai no payload da Ação Pendente,
    // pra confirmarAcaoPendente em mestre.js poder reaplicar as duas
    // flags em cima do que estiver VALENDO na hora em que o Mestre
    // aprovar (pode ter mudado entre o pedido e a aprovação), em vez de
    // confiar só no valor já calculado aqui no momento do pedido.
    pvRecuperacaoContexto = { pvPerdidos, pvRecuperavel, pvSemRecuperar, pvMaximoTotal, diasNecessarios, diasBase, infectado, tratadoEmHospital, saiuDoComa };
    el.recuperacaoPvPainel.style.display = "";
    const notaInfeccao = infectado ? " — infecção ativa: +50% no tempo de recuperação" : "";
    const notaHospital = tratadoEmHospital ? " — tratamento em hospital: -1/10 no tempo de recuperação" : "";
    const notaComa = saiuDoComa ? " — saiu do coma recentemente: dobro no tempo de recuperação" : "";

    if (pvRecuperavel <= 0) {
        // Padrão de Vida atual não cobre nada sem tratamento médico
        // especializado (ex.: Miserável, limite 0).
        el.recuperacaoPvStatus.innerText = `${pvPerdidos} PV perdido(s) de ${pvMaximoTotal}. Seu Padrão de Vida atual não cobre recuperação sem tratamento médico especializado — procure um médico.`;
        if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "none";
        return;
    }

    const padrao = PADROES_DE_VIDA.find(p => p.key === d.padraoDeVida);
    const labelPadrao = padrao ? padrao.label : "seu Padrão de Vida";
    const notaSemRecuperar = pvSemRecuperar > 0
        ? ` ${pvSemRecuperar} PV vão ficar sem recuperar por esse caminho.`
        : "";
    el.recuperacaoPvStatus.innerText = `${pvPerdidos} PV perdido(s). Seu Padrão de Vida (${labelPadrao}) cobre até ${limite} sem tratamento médico especializado — vai recuperar ${pvRecuperavel} em ${diasNecessarios} dia(s)${notaInfeccao}${notaHospital}${notaComa}.${notaSemRecuperar}`;
    if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "";
}

// Botão "Solicitar recuperação de PVs ao Mestre" — cria uma Ação
// Pendente (mesma fila de remover_item/gastar_dinheiro/etc, ver
// mestre.js) com o tempo já calculado (incluindo o +50% de infecção, se
// for o caso); só quando o Mestre confirmar essa pendência é que
// dados/recuperacaoPV vira ativa de fato (ver confirmarAcaoPendente,
// tipo "iniciar_recuperacao_pv").
function configurarRecuperacaoPV() {
    if (!el.btnSolicitarRecuperacaoPv) return;
    el.btnSolicitarRecuperacaoPv.addEventListener("click", async () => {
        if (!fichaAtual || !idAtivo() || !pvRecuperacaoContexto) return;
        const { pvRecuperavel, pvSemRecuperar, diasNecessarios, diasBase, infectado, tratadoEmHospital, saiuDoComa } = pvRecuperacaoContexto;
        const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
        const notaInfeccao = infectado ? " (já inclui +50% por infecção ativa)" : "";
        const notaHospital = tratadoEmHospital ? " (inclui -1/10 por tratamento em hospital, se ainda valer na hora da aprovação)" : "";
        const notaComa = saiuDoComa ? " (inclui dobro por saída de coma, se ainda valer na hora da aprovação)" : "";
        const notaSemRecuperar = pvSemRecuperar > 0
            ? ` (${pvSemRecuperar} PV fora do pedido — acima do que o Padrão de Vida cobre sem tratamento médico especializado)`
            : "";
        try {
            await criarAcaoPendente({
                tipo: "iniciar_recuperacao_pv",
                fichaId: fichaAtualId,
                nomeJogador,
                detalhe: `${nomeJogador} pede pra iniciar a recuperação de ${pvRecuperavel} PV perdido(s) — tempo estimado: ${diasNecessarios} dia(s)${notaInfeccao}${notaHospital}${notaComa}.${notaSemRecuperar}`,
                payload: { pvPerdidos: pvRecuperavel, diasNecessarios: diasBase, infectado }
            });
            toast("Pedido de recuperação de PVs enviado ao Mestre.");
        } catch (err) {
            console.error(err);
            toast("Falha ao enviar o pedido de recuperação de PVs.", "erro");
        }
    });
}

// Lista de itens equipados agora (armas equipadas + qualquer outro item
// marcado como equipável e equipado — ver itemEhEquipavel/inventario.js),
// mostrada como pilulazinhas ao lado das barras de PV/Energia no topo.
function renderizarItensEquipadosTopo() {
    if (!el.vitalEquipados) return;
    const inventario = (fichaAtual && fichaAtual.inventario) ? fichaAtual.inventario : {};
    const equipados = Object.values(inventario).filter(it => it && it.categoria === "levando" && itemEhEquipavel(it) && it.equipada);
    if (!equipados.length) {
        el.vitalEquipados.innerHTML = `<span class="vital-equipado-vazio">Nada equipado</span>`;
        return;
    }
    el.vitalEquipados.innerHTML = equipados
        .map(it => `<span class="vital-equipado-pill">${ehArma(it.tag) ? "🗡️" : (ehExplosivo(it.tag) ? "💣" : "✅")} ${escapeHtml(it.nome)}</span>`)
        .join("");
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

// Badge "Em coma" (item 6 do plano de saúde/complicações) — some sozinho
// quando dados.coma.ativo não está setado. A entrada em coma só acontece
// via Ação Pendente "confirmar_coma" (aplicarDano em mestre.js, quando
// PV cai abaixo de 1/10 do total, ou complicação da Cirurgia de Campo —
// ver saude.js); a SAÍDA é sempre manual, feita pelo Mestre em Godmode
// (botão "Reverter coma" no painel do Mestre — ver renderizarSaude e
// reverterComaGodmode em mestre.js), então esse badge é só leitura.
function renderizarComaBadge(d) {
    if (!el.comaBadge) return;
    if (!d.coma || !d.coma.ativo) {
        el.comaBadge.style.display = "none";
        el.comaBadge.innerHTML = "";
        return;
    }
    el.comaBadge.style.display = "block";
    el.comaBadge.innerHTML = `<strong>💤 Em coma</strong> — a saída só acontece manualmente, pelo Mestre (tratamento em hospital ou Cirurgia de Campo bem-sucedidos sinalizam a reversão).`;
}

// Badge "Desmaiado" (item 4 do plano de saúde/complicações) — só um
// aviso visual, sem nenhum efeito mecânico automático. Some sozinho
// quando dados.desmaiado não está setado; "acordar" é sempre manual,
// resolvido pela mesa (botão do Mestre — ver acordarDesmaioGodmode em
// mestre.js).
function renderizarDesmaioBadge(d) {
    if (!el.desmaioBadge) return;
    if (!d.desmaiado) {
        el.desmaioBadge.style.display = "none";
        el.desmaioBadge.innerHTML = "";
        return;
    }
    el.desmaioBadge.style.display = "block";
    el.desmaioBadge.innerHTML = `<strong>😵 Desmaiado</strong> — acordar é resolvido pela mesa (teste de Constituição narrado), o Mestre desliga o aviso quando fizer sentido na cena.`;
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

// Badge de Infecção (Complicações de ferimentos — manual; ver
// aplicarInfeccao/testarInfeccao em mestre.js). Flag persistente, sem
// contagem de turnos (diferente do Sangramento, abaixo): sozinha não
// causa dano, só aumenta em 50% o tempo de repouso necessário até o
// personagem receber tratamento médico de verdade — mesmo helper
// compartilhado entre o painel do jogador e o do Mestre.
function badgeInfeccaoCombate(p) {
    if (!p.infeccao || !p.infeccao.ativo) return "";
    const titulo = `Tempo de repouso necessário +50% até tratamento médico${p.infeccao.garantida ? " (infecção garantida)" : ""}${p.infeccao.origem ? ` — ${p.infeccao.origem}` : ""}`;
    return ` <span class="mod-pill negativo" title="${escapeHtml(titulo)}">🦠 Infectado</span>`;
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
// número; acerto crítico (resultado final 20 ou mais — dobra o dano,
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
// dificuldade (opcional): quando informada, o log e o toast passam a
// mostrar "✅ Sucesso" ou "❌ Falhou" comparando resultado x dificuldade
// (resultado >= dificuldade = sucesso), além do que já existia (crítico
// positivo/negativo). Chamadas antigas que não passam esse parâmetro
// continuam funcionando exatamente como antes (nenhuma sinalização de
// sucesso/falha). Retorna { resultado, bruto, criticoPositivo,
// criticoNegativo, sucesso } pra quem precisar decidir algo com o
// resultado da rolagem (sucesso é null se dificuldade não foi passada).
async function rolarERegistrar(nomeAlvo, modificador, ehCQC = false, dificuldade = null) {
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
    const consumo = checarConsumoDeAcao(ehCQC, false);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const bruto = rolarD20();
    const resultado = bruto + Number(modificador || 0);
    // Acerto Crítico: o RESULTADO FINAL (d20 + modificador) precisa
    // bater ou passar de 20 — d20 natural 20 sozinho NÃO garante crítico
    // se o modificador derrubar o resultado abaixo de 20 (ex.: d20=20,
    // modificador -1, resultado final 19 → não é crítico). Falha Crítica
    // (d20 natural 1 ou resultado final <= 1) — aqui é só sinalização
    // pro Log de Dados e resolução manual do Mestre; não há "dano" pra
    // dobrar numa rolagem genérica de perícia/atributo (isso é exclusivo
    // de resolverAtaque, que também aplica a dobra de dano de verdade).
    const criticoPositivo = resultado >= 20;
    // Falha Crítica: d20 natural 1, OU resultado final <= 1 — este
    // segundo caso só é matematicamente possível com modificador
    // negativo (ex: d20=2, modificador -1, resultado final = 1),
    // já que o d20 sozinho nunca é menor que 1.
    const criticoNegativo = bruto === 1 || resultado <= 1;
    const notaCritico = criticoNegativo
        ? " 🔥 FALHA CRÍTICA — Fogo Amigo/Desastre! Resolução rápida pelo Mestre."
        : (criticoPositivo ? " ⚡ ACERTO CRÍTICO!" : "");
    const temDificuldade = dificuldade !== null && dificuldade !== undefined;
    const sucesso = temDificuldade ? resultado >= Number(dificuldade) : null;
    const notaSucesso = temDificuldade ? (sucesso ? " · ✅ Sucesso" : " · ❌ Falhou") : "";
    const quem = isMestre ? `Mestre (${modoNpc ? (fichaAtual?.config?.nomeExibicao || npcAtualId) : (nomeDeFicha(fichaAtualId) || "—")})` : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");
    await registrarRolagem({
        quem, modificador, resultado,
        detalhe: `${nomeAlvo}: d20 (${bruto}) ${modificador >= 0 ? "+" : ""}${modificador}${notaCritico}${notaSucesso}`,
        critico: criticoNegativo ? "falha" : (criticoPositivo ? "acerto" : null)
    });
    toast(`${nomeAlvo}: ${resultado} (d20: ${bruto} ${modificador >= 0 ? "+" : ""}${modificador})${notaCritico}${notaSucesso}`, criticoNegativo ? "critico-falha" : (criticoPositivo ? "critico-acerto" : (temDificuldade && !sucesso ? "erro" : "ok")));

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: quem,
            detalhe: `${quem} rolou "${nomeAlvo}" (resultado ${resultado}) e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }
    return { resultado, bruto, criticoPositivo, criticoNegativo, sucesso };
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: quem,
            detalhe: `${quem} usou "Esquivar" no próprio turno (resultado ${resultado}) e quer gastar 1 ação do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");

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
    if (!entrada || (Number(entrada[1].nivel) || 0) <= 0) {
        // Sem treino: penalidade fixa -1, mas um bônus genérico por
        // categoria (ex.: Vantagem "Instinto Físico Apurado", testes_fisicos)
        // ainda ajuda — só o bônus específico por nome de perícia (que
        // não existe treinada) não entra.
        const infoPericiaDestreinada = buscarPericiaPorNome(nomePericia);
        const alvoCategoriaDestreinada = infoPericiaDestreinada ? ALVO_TESTES_POR_CATEGORIA[infoPericiaDestreinada.categoria] : null;
        const bonusCategoriaDestreinado = alvoCategoriaDestreinada ? somaModificadoresPara(alvoCategoriaDestreinada, modificadoresPlanos) : 0;
        return -1 + penalidadeTotal + bonusCategoriaDestreinado;
    }
    return calcularTotalPericia(entrada[1], dadosPrimarios, modificadoresPlanos, penalidadeTotal).total;
}

// Só armas de fogo de verdade (não golpe desarmado nem arma branca) tem
// carregador — precisam de um carregador anexado com munição pra disparar.
function ehArmaComCarregador(it) {
    return ehArma(it.tag) && ehArmaDeFogo(it.periciaUso) && !(it.arma && it.arma.desarmado);
}

// Se a arma usa carregador (magazine) removível ou dispara direto do
// estoque de munição no inventário (ex.: revólver, escopeta 12 gauge) —
// escolha explícita feita no modal (checkbox "Usa carregador?"), não mais
// automática só por calibre. Itens salvos antes dessa opção existir não
// têm `usaCarregador` gravado, então caem no fallback de sempre: só
// escopeta (12 gauge) não usava carregador.
function armaUsaCarregador(it) {
    if (!it || !it.arma) return true;
    if (typeof it.arma.usaCarregador === "boolean") return it.arma.usaCarregador;
    return !ehCalibreEscopeta(it.calibre);
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

// Soma toda a munição compatível (do calibre da arma) que o personagem
// está levando consigo — usado pra exibição de armas "sem carregador"
// (revólver, escopeta 12 gauge...), que não têm um carregador anexado
// pra mostrar munição atual/máxima.
function municaoEscopetaDisponivel(calibreArma) {
    return listaProjeteisInventario(fichaAtual, calibreArma)
        .filter(p => p.categoria === "levando")
        .reduce((acc, p) => acc + (Number(p.projetil?.quantidade) || 0), 0);
}

// Desconta 1 projétil direto do estoque no inventário (sem carregador) —
// usado por armas marcadas como "não usa carregador" (revólver, escopeta
// 12 gauge...) e pra carregar a câmara de armas com Capacidade +1. Pega
// o primeiro item de projétil compatível com o calibre (ex.: buckshot ou
// slug pra 12 gauge) que estiver em "Levando consigo"; apaga o item se a
// quantidade zerar.
async function descontarProjetilDiretoDoEstoque(calibreArma) {
    const candidatos = listaProjeteisInventario(fichaAtual, calibreArma)
        .filter(p => p.categoria === "levando" && (Number(p.projetil?.quantidade) || 0) > 0);
    if (!candidatos.length) return false;

    const proj = candidatos[0];
    const restante = (Number(proj.projetil.quantidade) || 0) - 1;
    if (restante > 0) {
        const atualizado = { ...proj.projetil, quantidade: restante };
        // volume precisa acompanhar a quantidade que sobrou (mesma fórmula
        // de sempre — Math.floor(volumeUnitario × quantidade), ver Fase 4);
        // senão o item fica com o volume "congelado" no valor de antes do
        // disparo, superestimando o quanto ele ocupa (ex.: num recipiente).
        const volumeAtualizado = Math.floor((Number(proj.volumeUnitario) || 0) * restante);
        fichaAtual.inventario[proj.id] = { ...fichaAtual.inventario[proj.id], projetil: atualizado, volume: volumeAtualizado };
        await update(ref(db, `${caminhoBase()}/inventario/${proj.id}`), { projetil: atualizado, volume: volumeAtualizado });
    } else {
        // update() só apaga uma chave se ela vier explicitamente como null
        // no payload (mesmo motivo documentado em carregarCarregador).
        delete fichaAtual.inventario[proj.id];
        await update(ref(db, `${caminhoBase()}/inventario`), { [proj.id]: null });
    }
    return true;
}

// Antes de disparar: exige carregador anexado e com munição — exceto pra
// arma marcada como "não usa carregador" (revólver, escopeta 12 gauge...),
// que dispara direto do estoque de projéteis no inventário. Se a arma tem
// Capacidade +1 (bala na agulha) e o carregador anexado está vazio, ainda
// dispara consumindo o round que estava só na câmara antes de bloquear.
async function consumirMunicaoSeArmaDeFogo(it) {
    if (!ehArmaComCarregador(it)) return true;

    if (!armaUsaCarregador(it)) {
        const descontou = await descontarProjetilDiretoDoEstoque(it.calibre);
        if (!descontou) {
            toast(`Sem munição ${rotuloCalibre(it.calibre) || "compatível"} em "Levando consigo" pra disparar esta arma.`, "erro");
            return false;
        }
        return true;
    }

    const carregadorId = it.arma && it.arma.carregadorId;
    const carregador = carregadorId ? fichaAtual.inventario?.[carregadorId] : null;
    const municaoCarregador = (carregador && carregador.carregador) ? (Number(carregador.carregador.municaoAtual) || 0) : 0;
    const temCamaraExtra = !!(it.arma && it.arma.temCamaraExtra);
    const camaraCarregada = temCamaraExtra && !!(it.arma && it.arma.camaraCarregada);

    if (municaoCarregador > 0) {
        const carregadorAtualizado = descontarUmProjetil(carregador.carregador);
        fichaAtual.inventario[carregadorId] = { ...carregador, carregador: carregadorAtualizado };
        await update(ref(db, `${caminhoBase()}/inventario/${carregadorId}/carregador`), carregadorAtualizado);
        return true;
    }

    if (camaraCarregada) {
        // Carregador vazio (ou nem anexado), mas ainda tem a bala que
        // tava só na agulha — dispara ela e esvazia a câmara. Persiste
        // no próprio item da arma (não no carregador), então sobrevive
        // à troca de carregador (ver recarregarArma/retirarCarregadorArma).
        const armaAtualizada = { ...it, arma: { ...it.arma, camaraCarregada: false } };
        fichaAtual.inventario[it.id] = armaAtualizada;
        await update(ref(db, `${caminhoBase()}/inventario/${it.id}/arma`), armaAtualizada.arma);
        toast("Disparou a bala que estava na agulha — câmara vazia agora.");
        return true;
    }

    if (!carregadorId || !carregador || !carregador.carregador) {
        toast("Esta arma está sem carregador anexado. Anexe um carregador (editando a arma) antes de atirar.", "erro");
        return false;
    }
    toast(`Carregador vazio. Use "Recarregar" pra trocar por um carregador com munição${temCamaraExtra ? ", ou carregue a câmara" : ""}.`, "erro");
    return false;
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
            // volume precisa acompanhar a quantidade que sobrou no estoque
            // (mesma fórmula de Math.floor(volumeUnitario × quantidade) da
            // Fase 4) — senão o item fica mostrando o volume de antes de
            // carregar o carregador, superestimando o espaço ocupado.
            const volumeAtualizado = Math.floor((Number(proj.volumeUnitario) || 0) * restante);
            inventarioAtualizado[proj.id] = { ...proj, projetil: { ...proj.projetil, quantidade: restante }, volume: volumeAtualizado };
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
    if (!armaUsaCarregador(armaItem)) {
        toast("Esta arma não usa carregador — ela dispara direto do estoque de munição.", "erro");
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
    if (!armaUsaCarregador(armaItem)) {
        toast("Esta arma não usa carregador — ela dispara direto do estoque de munição.", "erro");
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

// ---------------------------------------------------------------------
// "Colocar bala na agulha": carrega 1 projétil direto na câmara de uma
// arma com Capacidade +1, gastando 1 unidade do estoque de munição
// compatível em "Levando consigo" (mesma fonte que descontarProjetilDireto-
// DoEstoque usa pra disparar sem carregador). Fica marcado em arma.
// camaraCarregada — persiste trocando de carregador (ver recarregarArma/
// retirarCarregadorArma, que só mexem em carregadorId) e só é gasto
// quando o carregador anexado esvaziar (ver consumirMunicaoSeArmaDeFogo).
// ---------------------------------------------------------------------
async function carregarCamaraArma(armaId, armaItem) {
    if (!itemPodeUsar(armaItem)) { toast("A arma precisa estar em \"Levando consigo\".", "erro"); return; }
    if (!armaItem.arma || !armaItem.arma.temCamaraExtra) {
        toast("Esta arma não tem Capacidade +1 (bala na agulha).", "erro");
        return;
    }
    if (armaItem.arma.camaraCarregada) {
        toast("A câmara já está carregada.", "erro");
        return;
    }
    const descontou = await descontarProjetilDiretoDoEstoque(armaItem.calibre);
    if (!descontou) {
        toast(`Sem munição ${rotuloCalibre(armaItem.calibre) || "compatível"} em "Levando consigo" pra carregar a câmara.`, "erro");
        return;
    }
    const armaAtualizada = { ...armaItem, arma: { ...armaItem.arma, camaraCarregada: true } };
    fichaAtual.inventario[armaId] = armaAtualizada;
    await update(ref(db, `${caminhoBase()}/inventario/${armaId}/arma`), armaAtualizada.arma);
    toast(`${armaItem.nome}: bala colocada na agulha.`);
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

// ---------------------------------------------------------------------
// "Arrombar" veículo de cenário (ver plano-cenario.txt, Fase 5): reusa
// o mesmo mecanismo de "Usar item" acima, restrito a itens tag
// "destrave" — sem chave nunca gerada pra esses veículos (ver
// adicionarVeiculoCenario em mestre.js), trancar/destrancar/ligar
// sempre passam por este teste. A resolução de sucesso/falha fica a
// critério do Mestre, olhando o resultado no Log de Dados e alternando
// o cadeado pelo Gerenciador de Cenário (editarVeiculoCenario) — não
// tem dificuldade automática cadastrada por enquanto.
// ---------------------------------------------------------------------
async function arrombarVeiculoCenario(veiculoNome) {
    if (!fichaAtual || isMestre) return;
    const itensDestrave = Object.entries(fichaAtual.inventario || {})
        .filter(([, it]) => it && it.tag === "destrave")
        .map(([id, it]) => ({ id, ...it }));
    if (!itensDestrave.length) {
        toast("Você precisa de um item Destrave pra arrombar esse veículo.", "erro");
        return;
    }
    if (itensDestrave.length === 1) {
        await executarArrombamentoVeiculo(itensDestrave[0], veiculoNome);
        return;
    }
    abrirModalEscolherItemDestrave(itensDestrave, veiculoNome);
}

async function executarArrombamentoVeiculo(itemDestrave, veiculoNome) {
    const nomePericia = periciaUsoComoArray(itemDestrave.periciaUso)[0];
    if (!nomePericia) { toast("Esse item Destrave não tem perícia vinculada.", "erro"); return; }
    await rolarComPericiaDoItem(itemDestrave, nomePericia, modificadoresAtuais());
    toast(`Tentativa em "${veiculoNome}" registrada no Log de Dados — o Mestre decide o resultado.`);
}

// Escolha de qual item Destrave usar, quando o jogador tem mais de um
// (cada Destrave já nasce travado numa perícia só — Mão Leve ou
// Arrombamento — escolhida na criação do item, então aqui é só "qual
// item", não "qual perícia").
function abrirModalEscolherItemDestrave(itensDestrave, veiculoNome) {
    let modal = document.getElementById("modal-escolher-destrave");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-escolher-destrave";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Arrombar "${escapeHtml(veiculoNome)}"</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha o Destrave</h4>
        <p class="hint">Você tem mais de um item Destrave. Escolha qual usar.</p>
        <div class="combate-lista" id="destrave-opcoes"></div>
    `;
    const opcoesDiv = modal.querySelector("#destrave-opcoes");
    itensDestrave.forEach(it => {
        const nomePericia = periciaUsoComoArray(it.periciaUso)[0] || "?";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-lime";
        btn.style.width = "100%";
        btn.style.marginBottom = "6px";
        btn.innerText = `${it.nome} (${nomePericia})`;
        btn.addEventListener("click", async () => {
            modal.remove();
            await executarArrombamentoVeiculo(it, veiculoNome);
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
    // Explosivo (manual pg. 81-82): "Usar" = ARMAR — teste de dificuldade
    // FIXA gravada no próprio item (dificuldadeArmar), sem seleção de
    // alvo nem oposição de defesa (bem diferente de arma). Não depende
    // de combate ativo — dá pra armar/plantar uma bomba fora de combate
    // também. Ver abrirModalArmarExplosivo.
    if (ehExplosivo(it.tag)) {
        abrirModalArmarExplosivo(it, modificadoresPlanos);
        return;
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

// "Usar" um item Explosivo = ARMAR (manual pg. 81-82): diferente de
// arma, não é um ataque contra um alvo — é um teste de dificuldade FIXA
// (dificuldadeArmar, gravada no item desde a criação — ver
// lerConfigArmaDoModal) contra a perícia vinculada (normalmente
// Explosivos). Sem oposição de defesa, sem seleção de alvo. Ao confirmar,
// rola e registra no Log de Dados (o Mestre compara com a dificuldade
// mostrada aqui e decide o resultado) e narra a ativação do módulo de
// detonação acoplado ao item (se algum foi escolhido na criação — ver
// MODULOS_DETONACAO). Dano e raio ficam só como referência: o sistema
// não simula área/alcance, então aplicar o dano a quem estiver na área
// continua manual (ferramentas de combate normais, uma vítima de cada vez).
function abrirModalArmarExplosivo(it, modificadoresPlanos) {
    // Armar SEM estar em nenhum cenário ativo é bloqueado (ver
    // plano-explosivos-cenario.txt, decisão 3) — não tem onde gravar o
    // explosivo nem quem fica no raio de efeito depois.
    const cenario = cenarioAtualDoPersonagem();
    if (!cenario) {
        toast(`"${it.nome}" só pode ser armado dentro de um cenário — peça ao Mestre pra te colocar em um antes de usar.`, "erro");
        return;
    }
    let modal = document.getElementById("modal-armar-explosivo");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-armar-explosivo";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const cfg = it.arma || {};
    const modulo = MODULOS_DETONACAO.find(m => m.nome === cfg.moduloDetonacao);
    const nomePericia = it.periciaUso || "Explosivos";
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Armar ${escapeHtml(it.nome)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">
            ${cfg.danoBase ? `Dano: <strong>${cfg.danoBase}</strong>${cfg.raio ? ` em raio de <strong>${cfg.raio}m</strong>` : ""} — aplique manualmente a quem estiver na área quando detonar.<br>` : ""}
            Dificuldade de armar: <strong>${cfg.dificuldadeArmar || "não definida"}</strong> (perícia ${escapeHtml(nomePericia)}).<br>
            ${modulo
                ? `Módulo de detonação: <strong>${escapeHtml(modulo.nome)}</strong> — ${escapeHtml(modulo.efeito)}`
                : "Nenhum módulo de detonação cadastrado neste item — o Mestre decide como ele detona."}
        </p>
        <div class="modal-btns">
            <button type="button" class="btn-lime" id="btn-confirmar-armar-explosivo">Armar (rolar ${escapeHtml(nomePericia)})</button>
        </div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-armar-explosivo").addEventListener("click", async () => {
        modal.remove();
        const modificadorFinal = modificadorDePericiaComPenalidade(nomePericia, fichaAtual.dados, fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual());
        const rotuloDif = cfg.dificuldadeArmar ? ` (dif. armar: ${cfg.dificuldadeArmar})` : "";
        // dificuldadeArmar vai como 4º argumento pra rolarERegistrar
        // sinalizar Sucesso/Falhou no Log de Dados e no toast — não trava
        // nada automaticamente (o explosivo continua sendo gravado no
        // cenário mesmo numa falha, igual antes): quem decide o que
        // acontece numa falha de armar continua sendo o Mestre, só que
        // agora com o resultado já comparado contra a dificuldade em vez
        // de precisar fazer essa conta de cabeça.
        await rolarERegistrar(`${it.nome} — Armar${rotuloDif}`, modificadorFinal, false, cfg.dificuldadeArmar || null);

        // Grava o explosivo no cenário e tira o item do inventário DIRETO
        // — diferente de dar/remover item, "Armar" não passa pela fila de
        // aprovação do Mestre (decisão 4), mesmo sendo o jogador o autor.
        const nomeAtacanteOuNpc = fichaAtual?.config?.nomeExibicao || sessao?.nome || (modoNpc ? npcAtualId : fichaAtualId);
        await adicionarExplosivoCenario(cenario.id, {
            nome: it.nome,
            dano: cfg.danoBase || 0,
            raio: cfg.raio || 0,
            // "explosao" é a chave de TIPOS_DANO (dados-manual.js) que o
            // painel "Causar Dano" e aplicarDano esperam — não confundir
            // com a TAG do item "explosivo" (TAGS_ITEM). Bug corrigido:
            // gravar "explosivo" aqui deixava o select de tipo de dano
            // vazio ao pré-preencher o painel na Fase 4, e também não
            // batia com a checagem de Dilaceração por Explosão.
            tipoDano: "explosao",
            moduloDetonacaoNome: modulo ? modulo.nome : null,
            moduloDetonacaoEfeito: modulo ? modulo.efeito : null,
            armadoPorTipo: modoNpc ? "npc" : "ficha",
            armadoPorId: modoNpc ? npcAtualId : fichaAtualId,
            armadoPorNome: nomeAtacanteOuNpc,
            criadoEm: Date.now()
        });
        delete fichaAtual.inventario[it.id];
        await remove(ref(db, `${caminhoBase()}/inventario/${it.id}`));

        toast(modulo
            ? `💣 Módulo de detonação ativado: ${modulo.nome} — ${modulo.efeito}. Armado em "${cenario.titulo}".`
            : `💣 ${it.nome} armado em "${cenario.titulo}".`);
    });
    document.body.appendChild(modal);
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

// Infecção — Complicações de ferimentos (manual; ver dificuldadeInfeccao
// em regras.js). Etapa 5 do plano: o modal "Testar Infecção" saiu do
// Gerenciador de Combate e virou parte da aba Saúde, vinculado a uma
// FERIDA específica (abrirModalTestarInfeccaoFerida, junto com o resto
// da aba Saúde, mais abaixo neste arquivo) — em vez de um participante
// de combate solto. O caso "aplicar infecção direto, sem teste" (falha
// em Remover Projétil com complicação) já é automático dentro de
// tratarFerida (saude.js), então não precisa mais de um botão dedicado
// aqui.

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

    const modificadoresPlanos = modificadoresAtuais();
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
// Manobra desarmada: arremessa o(s) PRÓPRIO ALVO (manual pg. 23: "...
// modificador +1 para arremessá-los ou derrubá-los"), não uma arma —
// por isso não depende de item de inventário nenhum.
// Devolve void — chama resolverArremessar direto ao confirmar.
function abrirModalArremessar(nomePericia, modificadorBase) {
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
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Arremessar — CQC nível 3+</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha até 3 alvos</h4>
        <p class="hint">Arremessa cada alvo marcado (dano Força [escala C], contusão). Cada alvo extra (além do 1º) dá +1 no ataque contra TODOS os alvos desta ação.</p>
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
        modal.remove();
        await resolverArremessar(nomePericia, modificadorBase, alvosIds);
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
        consumo = checarConsumoDeAcao(nomePericia === "CQC");
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
    // Força Bruta (manual pg. 22): efeitos defensivos (ignora armadura,
    // bloqueio menos eficaz, penalidade pra esquivar) só valem quando
    // ESTE golpe está sendo rolado com a perícia Força Bruta — mesmo
    // critério já usado pro dano máximo/escala em calcularEspecificidadeGolpe.
    // Repassados pra abrirReacaoPendente pra a reação do alvo (Esquivar/
    // Bloquear) e a redução de armadura em aplicarDano já saírem certos.
    const entradaForcaBruta = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "Força Bruta");
    const nivelForcaBrutaAtaque = (armaConfig.desarmado && nomePericia === "Força Bruta" && entradaForcaBruta) ? (Number(entradaForcaBruta[1].nivel) || 0) : 0;
    const forcaAtacanteForcaBruta = Number(fichaAtual.dados.forca) || 0;
    const ignorarArmaduraPontos = ignorarArmaduraForcaBruta(nivelForcaBrutaAtaque, forcaAtacanteForcaBruta);
    const penalidadeEsquivaForcaBruta = penalidadeEsquivarContraForcaBruta(nivelForcaBrutaAtaque);
    const bloqueioForcaBruta = bloqueioContraForcaBruta(nivelForcaBrutaAtaque);
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
    // precisa bater ou passar de 20 — d20 natural 20 sozinho NÃO garante
    // crítico se os modificadores derrubarem o resultado abaixo de 20
    // (ex.: d20=20, modificador -1, resultado final 19 → acerto normal,
    // não crítico). Dobra o dano do ataque (aplicado mais abaixo, sobre
    // danoTotal, antes de reduções de armadura/agarrado/alcance). Falha
    // Crítica: d20 natural 1, OU resultado final <= 1 (possível com
    // modificador negativo, ex: d20=2, modificador -1, resultado final =
    // 1) — sempre sinalizada no Log como "Fogo Amigo/Desastre" pra
    // resolução rápida do Mestre, independente do resultado final ter
    // batido a dificuldade ou não.
    let criticoPositivo = resultadoAtaque >= 20;
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
                // Arte marcial vs. Briga de Rua (manual pg. 22).
                if (nomePericia === "Briga de Rua" && alvoTemArteMarcialTreinada(fichaAlvo.pericias)) {
                    dificuldade += 2;
                    notasSituacionaisLista.push(`${nomeAlvo} tem uma arte marcial — Briga de Rua contra arte marcial tem dificuldade +2`);
                }
            }
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
            // Agilidade/Constituição do alvo: recalculadas AO VIVO a partir
            // dos atributos primários + Vantagens (npc.vantagens) pro NPC
            // "detalhado" — mesmo padrão que calcularModEsquivarParticipante
            // já usa pra Esquivar — em vez dos campos soltos npc.agilidade/
            // npc.constituicao, que só são regravados quando o Mestre salva
            // a mini-ficha de novo (uma Vantagem de Agilidade recém-marcada
            // não mudava essa dificuldade até isso acontecer). NPC "rápido"
            // (sem atributosPrimarios) continua usando os campos soltos, que
            // são a única fonte que ele tem.
            let agilidadeAlvoNpc, constituicaoAlvoNpc;
            if (npc.modoDetalhado && npc.atributosPrimarios) {
                const modsNpcAlvo = coletarModificadores({ vantagens: npc.vantagens });
                const secundariosNpcAlvo = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride, modsNpcAlvo);
                agilidadeAlvoNpc = secundariosNpcAlvo.secundarios.agilidade.valor;
                constituicaoAlvoNpc = calcularDificuldadeDefesaJogador(npc.atributosPrimarios, "constituicao", modsNpcAlvo, 0);
            } else {
                agilidadeAlvoNpc = Number(npc.agilidade) || 0;
                constituicaoAlvoNpc = Number(npc.constituicao) || 0;
            }
            constituicaoAlvo = constituicaoAlvoNpc;
            if (ehFogo) {
                const percepcaoAtacante = calcularDerivados(fichaAtual.dados, modificadoresPlanosAtacante).secundarios.percepcao.total;
                dificuldade = calcularDificuldadeArmaFogo(armaConfig.dificuldadeAcerto, percepcaoAtacante);
            } else {
                const atributoDefesaChave = atributoDefesaPorPericia(nomePericia);
                const valorAtributo = atributoDefesaChave === "constituicao" ? constituicaoAlvoNpc : agilidadeAlvoNpc;
                const baseDif = baseDificuldadeAtaque(it.nome, nomePericia);
                dificuldade = baseDif + valorAtributo;
                // Arte marcial vs. Briga de Rua (manual pg. 22) — só NPC
                // "detalhado" tem perícias cadastradas (periciasNpc); NPC
                // "rápido" nunca aciona esse bônus.
                if (nomePericia === "Briga de Rua" && alvoTemArteMarcialTreinada(npc.periciasNpc)) {
                    dificuldade += 2;
                    notasSituacionaisLista.push(`${nomeAlvo} tem uma arte marcial — Briga de Rua contra arte marcial tem dificuldade +2`);
                }
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

    // Alvo genérico "dano" (Vantagem/Item/Especialização — ver
    // listaAlvosModificador em regras.js): bônus/penalidade fixa
    // somada em CIMA de qualquer dano já calculado (desarmado, arma,
    // mira, CQC), ANTES do Acerto Crítico dobrar — igual qualquer
    // outro bônus de dano deste pipeline.
    const bonusDanoGenerico = somaModificadoresPara("dano", modificadoresPlanosAtacante);
    if (bonusDanoGenerico) {
        danoTotal += bonusDanoGenerico;
        danoDadoTexto += ` [${bonusDanoGenerico > 0 ? "+" : ""}${bonusDanoGenerico} dano (Vantagem/Item)]`;
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
            // Dilaceração (item 7 do plano de saúde/complicações) — ver
            // golpeDilacera em regras.js, aplicado em
            // resolverReacaoPendente (mestre.js).
            dilacera: !!armaConfig.dilacera,
            dilaceraEmGolpeNormal: !!armaConfig.dilaceraEmGolpeNormal,
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
            // Força Bruta (manual pg. 22): repassa pra responderReacaoPendente
            // (mestre.js) decidir a redução de armadura e o comportamento
            // de Bloquear, e pro botão "Esquivar" aqui em ficha.js aplicar
            // a penalidade no teste de quem está se defendendo.
            ignorarArmaduraPontos,
            penalidadeEsquivaForcaBruta,
            bloqueioForcaBruta,
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
        // Redução do Dano por Colete x Calibre (manual pg. 53): só faz
        // sentido pra tiro de arma de fogo (it.calibre só existe pra
        // arma de fogo — arma branca/contundente manda null, e
        // aplicarDano já ignora a regra nova quando calibreProjetil é
        // null).
        resultadoDano = await aplicarDano(participante.tipo, participante.refId, danoTotal, tipoDanoKey, localMira.localArmadura, ignorarArmaduraPontos, it.calibre || null);
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
    // Feridas persistentes (ver plano-sistema-saude-ferimentos.txt) — só
    // pra fichas de JOGADOR nesta fase (NPC fica de fora por enquanto).
    // Local salvo na ferida usa a mesma chave de LOCAIS_MIRA, com
    // "padrao" convertido pra "torso" (mesma convenção já usada pro
    // Sangramento de tiro sem mira, logo abaixo).
    const criaFeridaHabilitado = danoTotal > 0 && participante.tipo === "ficha";
    const localFerida = localMira.key === "padrao" ? "torso" : localMira.key;
    if (danoTotal > 0 && (ehFogo || ehDanoPerfurante(tipoDanoKey)) && participante._pid && combateComIniciativaAtivo()) {
        const regraSangramentoAplicavel = ehFogo
            ? (localMira.sangramento || localMiraPorKey("torso").sangramento)
            : (ehDanoPerfurante(tipoDanoKey) && localMira.key !== "padrao" ? localMira.sangramento : null);
        if (regraSangramentoAplicavel) {
            const resultadoSangramento = await testarSangramento(participante._pid, constituicaoAlvo, it.nivelTag, danoTotal, regraSangramentoAplicavel, ehFogo);
            if (resultadoSangramento) notaSangramento = ` ${resultadoSangramento.detalhe}`;
            // Sangrou -> ferida "sangramento". Não sangrou E foi tiro ->
            // bala fica alojada (ferida "projetil" — precisa de Remover
            // Projétil antes de poder suturar). Não sangrou e foi corpo
            // a corpo -> resistiu, sem ferida nenhuma.
            if (criaFeridaHabilitado && resultadoSangramento) {
                if (resultadoSangramento.sangramento) {
                    await criarFerida(participante.refId, { tipo: "sangramento", local: localFerida, origem: `${it.nome} (${nomeAtacante})` });
                } else if (ehFogo) {
                    await criarFerida(participante.refId, { tipo: "projetil", local: localFerida, origem: `${it.nome} (${nomeAtacante})` });
                }
            }
        }
    }
    if (danoTotal > 0 && localMira.key !== "padrao") {
        if (ehDanoCortante(tipoDanoKey)) {
            notaEfeitoLocal += ` ⚠️ Golpe cortante mirado em ${localMira.label}: aplica-se a regra de Amputação (resolva com o Mestre).`;
        }
        if (ehDanoContundente(tipoDanoKey) && localMira.key === "cabeca") {
            notaEfeitoLocal += ` ⚠️ Golpe contundente na Cabeça: +4 na dificuldade do teste de Desmaio do alvo — teste de Constituição, dificuldade ${dificuldadeDesmaio(4)} (base ${DIFICULDADE_BASE_DESMAIO} +4 da Cabeça), pra acordar (resolva com o Mestre).`;
        }
    }

    // Dilaceração (item 7 do plano de saúde/complicações) — ver
    // golpeDilacera/deveTestarSangramentoProfundo em regras.js. Roda em
    // cima do dano JÁ aplicado (danoTotal), independente de Golpe
    // Mirado. Sangramento Profundo só entra dentro de combate com
    // iniciativa (é lá que existe "turno" pra decrementar), igual ao
    // Sangramento comum.
    let notaDilaceracao = "";
    if (danoTotal > 0) {
        const dilacerou = golpeDilacera({
            ehExplosao: tipoDanoKey === "explosao",
            danoFinal: danoTotal,
            pvMaximo: resultadoDano.pvMaximo,
            dilacera: !!armaConfig.dilacera,
            dilaceraEmGolpeNormal: !!armaConfig.dilaceraEmGolpeNormal,
            criticoPositivo,
            ehArmaBranca: PERICIAS_ARMA_BRANCA.includes(nomePericia)
        });
        if (dilacerou) {
            notaDilaceracao = " 🩸 DILACEROU!";
            if (participante._pid && combateComIniciativaAtivo() && deveTestarSangramentoProfundo(dilacerou, danoTotal, resultadoDano.pvMaximo)) {
                const resultadoSangramentoProfundo = await testarSangramentoProfundo(participante._pid, constituicaoAlvo, danoTotal);
                if (resultadoSangramentoProfundo) notaDilaceracao += ` ${resultadoSangramentoProfundo.detalhe}`;
            }
        }
    }

    // Ferida por dano acima de 1/10 do PV MÁXIMO — regra nova, roda em
    // TODO golpe que causou dano de verdade numa ficha de jogador,
    // mirado ou não (o bloco de Golpe Mirado acima continua exclusivo
    // de golpe mirado, por regra própria do manual). Corte e Perfuração
    // abrem ferida tipo "corte"; Contusão abre ferida tipo "fratura".
    // Chance base de 20% assim que o dano ultrapassa 1/10 do PV máximo
    // do alvo; a cada 1/10 ADICIONAL de dano além desse mínimo, +20% de
    // chance (limite 100%) — ver chanceFeridaPorDano em regras.js.
    if (criaFeridaHabilitado && (ehFogo || ehDanoPerfurante(tipoDanoKey) || ehDanoCortante(tipoDanoKey) || ehDanoContundente(tipoDanoKey))) {
        const chance = chanceFeridaPorDano(danoTotal, resultadoDano.pvMaximo);
        if (chance > 0) {
            const tipoFerida = ehDanoContundente(tipoDanoKey) ? "fratura" : "corte";
            const rotuloFerida = tipoFerida === "fratura" ? "Fratura" : "Corte/Perfuração";
            const sucessoFerida = (Math.random() * 100) < chance;
            notaEfeitoLocal += sucessoFerida
                ? ` 🩹 Chance de ferida por dano (${chance}%): ABRIU uma ferida de ${rotuloFerida}.`
                : ` 🩹 Chance de ferida por dano (${chance}%): não abriu ferida dessa vez.`;
            if (sucessoFerida) {
                await criarFerida(participante.refId, { tipo: tipoFerida, local: localFerida, origem: `${it.nome} (${nomeAtacante})` });
            }
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
    // Recuperação de PV em andamento (manual, "Saúde e PVs"): já
    // aplicada dentro de aplicarDano (mestre.js) sobre o dano bruto,
    // mesmo ponto que Frágil — aqui só sinaliza no Log.
    const notaRecuperacao = resultadoDano.emRecuperacao ? ` ⏳ ${nomeAlvo} está em recuperação de PV — dano recebido aumentado em 50%!` : "";

    const efeitoTexto = (armaConfig.efeitoExtra && armaConfig.efeitoExtra.trim()) ? ` Efeito extra: ${armaConfig.efeitoExtra.trim()}.` : "";
    // Redução do Dano por Colete x Calibre (manual pg. 53): quando o
    // piso de dano mínimo contundente vence a redução normal do
    // colete, aplicarDano (mestre.js) já embutiu isso no danoFinal e
    // devolveu tipoDanoFinalAjustado diferente do tipoDanoKey original
    // — aqui só avisa no Log qual foi o tipo de dano que realmente
    // valeu.
    const notaColete = (resultadoDano.tipoDanoFinalAjustado && resultadoDano.tipoDanoFinalAjustado !== tipoDanoKey)
        ? ` 🦺 O colete freou o tiro, mas o impacto ainda causou dano CONTUNDENTE (${TIPOS_DANO.find(t => t.key === resultadoDano.tipoDanoFinalAjustado)?.label || resultadoDano.tipoDanoFinalAjustado}), ignorando o resto da redução.`
        : "";
    const detalheDano = resultadoDano.reducao > 0
        ? `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaBaleado} Dano${danoDadoTexto}: ${resultadoDano.danoBruto} (${tipoDanoLabel}) - ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} de dano aplicado.${notaCritico}${notaFragil}${notaRecuperacao}${notaAgarrado} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaColete}${notaSangramento}${notaDilaceracao}${notaEfeitoLocal}\n${detalheRolagem}`
        : `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaBaleado} Dano${danoDadoTexto}: ${resultadoDano.danoFinal} (${tipoDanoLabel}) aplicado.${notaCritico}${notaFragil}${notaRecuperacao}${notaAgarrado} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaColete}${notaSangramento}${notaDilaceracao}${notaEfeitoLocal}\n${detalheRolagem}`;

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
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Agarrar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Desarmar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Derrubar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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
    {
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
    const consumo = checarConsumoDeAcao(true); // Imobilizar só rola CQC (MANOBRA_IMOBILIZAR_CQC)
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Imobilizar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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
    const consumo = checarConsumoDeAcao(false);
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Imobilizar (Jiu Jitsu) ${nomeAlvo} e quer gastar 1 ação do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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
    const consumo = checarConsumoDeAcao(false);
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} usou Quebrar ossos em ${nomeAlvo} e quer gastar 1 ação do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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
    await criarAcaoPendente({
        tipo: "gastar_acao_combate",
        fichaId: fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} testou Destreza pra se libertar do Imobilizado e quer gastar 1 ação do turno.\n${detalheRolagem}`,
        payload: { participanteId, ehArmaFogo: false }
    });

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

// Arremessar (CQC nível 3+, manual pg. 23, dentro de "Esfaquear e
// Arremessar"): arremessa o(s) PRÓPRIO ALVO (não uma arma) em até 3
// alvos numa única ação. "Para cada inimigo a mais até um máximo de 3,
// você recebe modificador +1 para arremessá-los ou derrubá-los" —
// interpretado como bônus cumulativo aplicado à rolagem inteira (não
// escalonado alvo a alvo), já que o manual não detalha outra forma de
// dividir isso. Reaproveita a dificuldade -1 do nível 3 (já embutida no
// "9 +" abaixo em vez de "10 +"). Dano escala com FORÇA [escala C]
// (manual: "Arremessar causa Força C") e é tratado como contusão, igual
// qualquer golpe desarmado — não há arma nem tipo de dano extra
// envolvido. Cada acerto ainda testa Derrubar contra aquele alvo
// específico, com dificuldade +2 (mais difícil que o Derrubar corpo a
// corpo comum), usando a mesma infraestrutura de
// definirDerrubado/resolverDerrubar.
async function resolverArremessar(nomePericia, modificadorBase, alvosIds) {
    const consumo = checarConsumoDeAcao(true); // Arremessar só rola CQC (MANOBRA_ARREMESSAR_CQC)
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const meuPid = modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const bonusPorAlvoExtra = Math.max(0, alvosIds.length - 1);
    const modificadorAtaque = modificadorBase + bonusPorAlvoExtra;
    const forcaAtacante = Number(fichaAtual.dados.forca) || 0;
    const danoArremesso = calcularDanoTotalArma({ danoBase: 0, escalaMult: 2 }, forcaAtacante); // escala C = 2x Força
    const tipoDanoKey = "contusao"; // arremessa o alvo, não uma arma — dano de impacto

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} arremessou ${alvosIds.length} alvo(s) e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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
                // Mesmo recálculo ao vivo do bloco de resolverAtaque acima —
                // ver comentário lá pra detalhes de por que não usa mais
                // npc.agilidade/npc.constituicao direto.
                if (npc.modoDetalhado && npc.atributosPrimarios) {
                    const modsNpcAlvo = coletarModificadores({ vantagens: npc.vantagens });
                    const secundariosNpcAlvo = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride, modsNpcAlvo);
                    dificuldade = 9 + secundariosNpcAlvo.secundarios.agilidade.valor;
                    constituicaoAlvo = calcularDificuldadeDefesaJogador(npc.atributosPrimarios, "constituicao", modsNpcAlvo, 0);
                } else {
                    dificuldade = 9 + (Number(npc.agilidade) || 0);
                    constituicaoAlvo = Number(npc.constituicao) || 0;
                }
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
    const detalhe = `${nomeAtacante} ARREMESSOU (CQC nível 3+) ${alvosIds.length} alvo(s) — modificador ${modificadorAtaque >= 0 ? "+" : ""}${modificadorAtaque}${notaBonus}:\n${linhasLog.map(l => `• ${l}`).join("\n")}`;
    await registrarRolagem({ quem: nomeAtacante, modificador: modificadorAtaque, resultado: `${alvosIds.length} alvo(s)`, detalhe });
    toast(detalhe);
}

// Delimitar alcance (manual): teste vs. "11 + perícia corpo a corpo do
// alvo" (usa a MELHOR das perícias corpo a corpo/arma branca do alvo —
// ver calcularMelhorModCorpoACorpoParticipante). Sucesso trava a vítima
// num único alcance (ver verificarAlcanceLimitado em resolverAtaque).
async function resolverDelimitarAlcance(nomePericia, modificador, alcanceEscolhido, participante) {
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Delimitar o alcance (${alcanceEscolhido}) de ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
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
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Retomar o alcance de ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
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

    // Indicador fixo de mãos livres (passo 16, seção 5.3 do
    // projeto-slots-porte.txt) — sempre visível no topo da aba de
    // inventário, recalculado a cada render (ver maosDisponiveis em
    // inventario.js: base 2, menos o que estiver "levando consigo",
    // equipado, fora de qualquer recipiente e que ocupe mão).
    const maosBase = 2;
    const maosLivres = maosDisponiveis(fichaAtual);
    const itensOcupandoMao = Object.values(fichaAtual.inventario || {}).filter(it2 => {
        if (it2.categoria !== "levando" || !it2.equipada || it2.dentroDe) return false;
        return ehContainer(it2.tag) ? subtipoPorteOcupaMao(it2.subtipoPorte) : true;
    });
    el.resumoMaos.innerText = `🖐️ Mãos livres: ${maosLivres}/${maosBase}`;
    el.resumoMaos.title = itensOcupandoMao.length
        ? `Ocupando mão:\n${itensOcupandoMao.map(it2 => `${it2.nome} (${Number(it2.maosNecessarias) || 1})`).join("\n")}`
        : "Nenhum item ocupando as mãos agora.";

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
    // Item que está guardado dentro de um recipiente (dentroDe aponta pra
    // um item que ainda existe) não aparece solto na lista principal —
    // ele é renderizado aninhado, abaixo do recipiente (ver
    // renderizarFilhosContainer). Se o recipiente-pai não existe mais
    // (dado órfão), o item volta a aparecer solto normalmente, como
    // rede de segurança. Carregador anexado a uma arma some da lista
    // pela mesma lógica de sempre (virou parte da arma).
    const estaDentroDeAlgo = (it) => !!(it.dentroDe && fichaAtual.inventario && fichaAtual.inventario[it.dentroDe]);
    const itensCategoria = itens.filter(([id, it]) =>
        it.categoria === categoriaInventarioAtiva &&
        !(ehCarregador(it.tag) && carregadorEstaAnexado(fichaAtual, id)) &&
        !estaDentroDeAlgo(it)
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
            lista.appendChild(criarLiItem(id, it, { categorias, modificadoresPlanos, nivel: 0 }));
        });
    }
    bloco.appendChild(lista);
    el.inventarioListas.appendChild(bloco);
}

// Monta o <li> de um item do inventário (usado tanto pros itens de topo
// quanto, recursivamente, pros itens guardados dentro de um recipiente —
// ver criarUlFilhosContainer abaixo). `nivel` é só a profundidade de
// aninhamento (0 = solto na categoria), usada pra indentar visualmente.
// Qual item de dinheiro físico está com a caixinha de "quanto
// depositar" aberta no inventário (só 1 por vez) — mesmo padrão de
// dinheiroCenarioAbertoId, ver renderizarCenarios.
let itemDinheiroCaixaAbertaId = null;

function criarLiItem(id, it, { categorias, modificadoresPlanos, nivel }) {
    const li = document.createElement("li");
    // Item com modificadores estruturados (ex: colete que dá +Defesa)
    // ganha o mesmo botão de ativo/desativado das vantagens/etc —
    // pra "vestir/tirar" o efeito sem removê-lo do inventário. Droga é
    // exceção: seu campo `modificadores` descreve o efeito de QUANDO
    // CONSUMIDA (botão "Consumir", ver consumirDroga) — não um efeito
    // passivo pra ligar/desligar, então não ganha esse botão.
    const temEfeitoItem = !!(it.modificadores && it.modificadores.length) && it.tag !== "droga";
    const ativoItem = it.ativo !== false;
    if (temEfeitoItem && !ativoItem) li.classList.add("entidade-desativada");
    const kitGeral = ehFerramentaCriacaoGeral(it.tag);
    const periciasUsoItem = periciaUsoComoArray(it.periciaUso);
    const podeUsar = itemPodeUsar(it) && (!!periciasUsoItem.length || kitGeral);
    const ehFogo = ehArma(it.tag) && ehArmaDeFogo(it.periciaUso);
    const semCarregador = ehFogo && !armaUsaCarregador(it);
    const temCamaraExtraItem = ehFogo && !!(it.arma && it.arma.temCamaraExtra);
    const camaraCarregadaItem = temCamaraExtraItem && !!(it.arma && it.arma.camaraCarregada);
    const ehArmaItem = ehArma(it.tag);
    const ehExplosivoItem = ehExplosivo(it.tag);
    const ehEquipavelItem = itemEhEquipavel(it);
    const equipadaItem = !!it.equipada;
    const podeEquipar = itemPodeEquipar(it);
    const tagLabel = rotuloTag(it.tag) + (it.nivelTag ? ` nível ${it.nivelTag}` : "");
    const periciaLabel = periciasUsoItem.length
        ? ` · Usa: ${escapeHtml(periciasUsoItem.join(", "))}`
        : (kitGeral ? ` · Usa: ${PERICIAS_FERRAMENTA_CRIACAO.join(", ")} (escolhe ao usar)` : "");
    const classeLabel = it.classeProtecao ? ` · Classe de Proteção ${escapeHtml(rotuloClasseProtecao(it.classeProtecao))}` : "";
    const saldoLabel = it.ehSaldo
        ? (it.tag === "eletronico"
            ? ` · Saldo: CN$ ${Number(it.saldoNotas) || 0} em notas + CN$ ${Number(it.saldoMoedas) || 0} em moedas`
            : ` · Saldo: CN$ ${Number(it.saldoValor) || 0}`)
        : "";
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
    const armaEstaCarregadaItem = ehFogo && !semCarregador && !!carregadorAnexadoObjItem;
    const carregadorAnexadoLabel = (ehFogo && it.arma)
        ? (semCarregador
            ? ` · Munição em estoque: ${municaoEscopetaDisponivel(it.calibre)} (sem carregador)`
            : (carregadorAnexadoObjItem
                ? ` · Carregador: ${escapeHtml(carregadorAnexadoObjItem.nome)} (${carregadorAnexadoObjItem.carregador?.municaoAtual || 0}/${carregadorAnexadoObjItem.carregador?.capacidadeMax || 0})`
                : " · Sem carregador anexado"))
        : "";
    const camaraLabel = temCamaraExtraItem ? ` · Câmara: ${camaraCarregadaItem ? "carregada (+1)" : "vazia"}` : "";
    // Tooltip do carregador: só aparece ao passar o mouse por cima,
    // listando os projéteis carregados dentro dele.
    const tooltipCarregador = it.carregador
        ? (it.carregador.projeteisCarregados && it.carregador.projeteisCarregados.length
            ? it.carregador.projeteisCarregados.map(p => `${p.nome} x${p.quantidade}`).join("\n")
            : "Carregador vazio.")
        : "";

    // Recipiente (mochila etc.): mostra quantos itens tem guardado
    // dentro e um botão de expandir/recolher — a lista de filhos (se
    // aberto) é montada à parte, em criarUlFilhosContainer, e anexada
    // logo depois deste <li> na lista principal.
    const ehContainerItem = ehContainer(it.tag);
    const filhosContainer = ehContainerItem ? itensDentroDe(fichaAtual, id) : [];
    const containerAberto = containersInventarioAbertos.has(id);
    const containerLabel = ehContainerItem
        ? ` · ${filhosContainer.length ? `${filhosContainer.length} item(ns) guardado(s)` : "Vazio"}`
        : "";
    // Botão "equipada" do container (passo 14, seção 5.2 do
    // projeto-slots-porte.txt): reaproveita o mesmo campo `equipada` das
    // armas/itens comuns, mas com rótulo de AÇÃO específico por
    // subtipoPorte em vez do genérico "Equipado/Desequipado" — reflete
    // melhor o que "vestir uma calça" ou "carregar uma mochila" significa
    // na hora de decidir. Container só pode ser (des)equipado estando em
    // "levando consigo" (mesma regra de itemPodeEquipar pra itens comuns).
    const podeEquiparContainerItem = ehContainerItem && it.categoria === "levando";
    const ROTULOS_BOTAO_EQUIPAR_CONTAINER = {
        roupa: { ligar: "👕 Vestir", desligar: "👕 Tirar", tituloLigar: "Vestir esta peça de roupa", tituloDesligar: "Vestindo agora — clique pra tirar" },
        cinto: { ligar: "👖 Vestir", desligar: "👖 Tirar", tituloLigar: "Vestir este cinto", tituloDesligar: "Vestindo agora — clique pra tirar" },
        mochila: { ligar: "🎒 Carregar nas costas", desligar: "🎒 Tirar", tituloLigar: "Carregar esta mochila nas costas", tituloDesligar: "Carregando nas costas agora — clique pra tirar" },
        bolsa_mao: { ligar: "✋ Segurar", desligar: "✋ Largar", tituloLigar: "Segurar esta bolsa/maleta (ocupa 1 mão)", tituloDesligar: "Segurando agora — clique pra largar" }
    };
    const rotuloContainerAtual = ehContainerItem ? (ROTULOS_BOTAO_EQUIPAR_CONTAINER[it.subtipoPorte] || ROTULOS_BOTAO_EQUIPAR_CONTAINER.mochila) : null;

    // Passo 15 (seção 5.2 do projeto-slots-porte.txt) — duas travas extras
    // que só importam na hora de LIGAR (equipar); desequipar sempre libera
    // recurso, então nunca é bloqueado por elas:
    //   a) Mão livre: item comum equipável (arma etc.) sempre ocupa mão;
    //      container só ocupa se subtipoPorteOcupaMao(subtipoPorte) — hoje
    //      só bolsa_mao. Ver maosDisponiveis em inventario.js (base 2).
    //   b) Exclusividade: subtipos com exclusivo=true (nenhum, por
    //      enquanto — ver SUBTIPOS_PORTE em dados-manual.js) não deixam
    //      equipar um segundo enquanto já existe outro do mesmo subtipo
    //      equipado — ver itemPodeEquiparContainer. Hoje dá pra vestir
    //      cinto + jaqueta + mochila + colete etc. tudo junto sem trava,
    //      já que a mesa é monitorada pelo Mestre item a item.
    // podeEquipar (inventario.js) já cobre QUALQUER item comum
    // (não-container) — arma, item marcado equipável, ou item comum
    // qualquer — pra poder ir pra mão; container segue seu próprio
    // fluxo de vestir/carregar (podeEquiparContainerItem).
    const podeEquiparCategoria = ehContainerItem ? podeEquiparContainerItem : podeEquipar;
    const ocupaMaoEsteItem = ehContainerItem ? subtipoPorteOcupaMao(it.subtipoPorte) : true;
    const maosNecessariasItem = Number(it.maosNecessarias) || 1;
    const maosLivresAtuais = maosDisponiveis(fichaAtual);
    const semMaosLivres = !equipadaItem && ocupaMaoEsteItem && maosLivresAtuais < maosNecessariasItem;
    const conflitoExclusividade = ehContainerItem && !equipadaItem && subtipoPorteExclusivo(it.subtipoPorte) && !itemPodeEquiparContainer(fichaAtual, it, id);
    // Variáveis finais consumidas no template abaixo: container usa seu
    // próprio texto/título por subtipoPorte; item comum/arma mantém o
    // rótulo genérico de sempre (✅ Equipado / ○ Desequipado / 🗡️ Equipada).
    // Todo item "levando" precisa de um lugar físico válido (mão ou
    // vestido/carregado) — então o botão sempre aparece pra qualquer
    // item que não esteja guardado dentro de outra coisa: equipável
    // (arma/marcado), container (vestir/carregar), ou item comum
    // qualquer (segurar/largar da mão — ver itemPodeSerLevadoSolto em
    // inventario.js).
    const mostrarBtnEquipar = true;
    const podeEquiparBtn = podeEquiparCategoria && !semMaosLivres && !conflitoExclusividade;
    const textoBtnEquipar = ehEquipavelItem
        ? (equipadaItem ? (ehArmaItem ? "🗡️ Equipada" : (ehExplosivoItem ? "💣 Equipada" : "✅ Equipado")) : "○ Desequipado")
        : (ehContainerItem
            ? (rotuloContainerAtual ? (equipadaItem ? rotuloContainerAtual.desligar : rotuloContainerAtual.ligar) : "")
            : (equipadaItem ? "🤚 Na mão" : "○ Solto"));
    const tituloBtnEquipar = !podeEquiparCategoria
        ? "Precisa estar em 'Levando consigo' pra equipar"
        : conflitoExclusividade
            ? `Já tem outra peça de "${rotuloSubtipoPorte(it.subtipoPorte)}" equipada — desequipe-a primeiro.`
            : semMaosLivres
                ? `Sem mãos livres (${maosLivresAtuais}/2)`
                : (ehEquipavelItem
                    ? (equipadaItem ? "Equipado agora — clique pra desequipar" : "Desequipado — clique pra equipar e poder usar")
                    : (ehContainerItem
                        ? (rotuloContainerAtual ? (equipadaItem ? rotuloContainerAtual.tituloDesligar : rotuloContainerAtual.tituloLigar) : "")
                        : (equipadaItem ? "Na mão agora — clique pra largar" : "Solto — clique pra segurar na mão")));

    // Chave de veículo (ver plano-veiculos.txt, adendo "chave"): mostra
    // qual carro ela destranca, pra não virar uma "Chave" solta sem
    // contexto na lista de inventário. Veículo pode ter sido excluído
    // depois — nesse caso não mostra nada em vez de quebrar o texto.
    const veiculoDaChave = it.tag === "chave" && it.veiculoId ? fichaAtual.veiculos?.[it.veiculoId] : null;
    const chaveLabel = veiculoDaChave ? ` · Destranca: ${escapeHtml(veiculoDaChave.nome || "(sem nome)")}` : "";

    // Explosivo fora de qualquer cenário ativo (ver
    // plano-explosivos-cenario.txt, Fase 5.2 — nice-to-have): avisa aqui
    // ANTES de clicar "Armar" e esbarrar no toast de bloqueio
    // (abrirModalArmarExplosivo). Vale tanto pro jogador quanto pro
    // Mestre atuando como NPC — o bloqueio em si não distingue os dois.
    const avisoArmarSemCenarioLabel = (ehExplosivoItem && !cenarioAtualDoPersonagem())
        ? ` · ⚠ precisa estar num cenário pra armar`
        : "";

    if (nivel > 0) li.classList.add("entity-item-aninhado");

    li.innerHTML = `
        <div class="entity-main" ${tooltipCarregador ? `title="${escapeHtml(tooltipCarregador)}"` : ""}>
            <span class="entity-nome">${ehContainerItem ? `<button type="button" class="btn-toggle-container" title="${containerAberto ? "Recolher" : "Expandir e ver o que tem guardado dentro"}">${containerAberto ? "▾" : "▸"}</button> 🎒 ` : ""}${escapeHtml(it.nome)}</span>
            <span class="entity-sub">${tagLabel} · ${it.peso || 0} kg · Volume: ${it.volume || 0}${quantidadeLabel}${periciaLabel}${saldoLabel}${classeLabel}${calibreLabel}${localProtegidoLabel}${reducaoLabel}${carregadorLabel}${projetilLabel}${carregadorAnexadoLabel}${camaraLabel}${containerLabel}${chaveLabel}${avisoArmarSemCenarioLabel}</span>
        </div>
        <div class="entity-badges">
            ${armaEstaCarregadaItem ? `<span class="mod-pill positivo" title="Tem um carregador anexado">🔵 Carregada</span>` : ""}
            ${camaraCarregadaItem ? `<span class="mod-pill positivo" title="Tem 1 bala na agulha, além do carregador">🔵 +1 na agulha</span>` : ""}
            ${temEfeitoItem ? `<button type="button" class="btn-toggle-ativo ${ativoItem ? "ligado" : "desligado"}" title="${ativoItem ? "Efeito ativo agora — clique pra desativar" : "Efeito desativado agora — clique pra ativar"}">${ativoItem ? "● Ativo" : "○ Inativo"}</button>` : ""}
            ${mostrarBtnEquipar ? `<button type="button" class="btn-toggle-equipada ${equipadaItem ? "ligado" : "desligado"}" ${podeEquiparBtn ? "" : "disabled"} title="${tituloBtnEquipar}">${textoBtnEquipar}</button>` : ""}
            <button type="button" class="btn-usar-item btn-blue" ${podeUsar ? "" : "disabled"} title="${podeUsar ? (kitGeral ? "Escolher qual perícia rolar (Explosivos, Mecânica Automotiva, Armeiro, Ofícios Utilitários ou Eletrônica)" : (periciasUsoItem.length > 1 ? `Escolher qual perícia rolar (${periciasUsoItem.join(", ")})` : `Rolar d20 + ${periciasUsoItem[0]}`)) : (ehEquipavelItem && !equipadaItem ? "Equipe o item pra poder usá-lo" : "Sem perícia vinculada")}">Usar</button>
            ${it.tag === "droga" ? `<button type="button" class="btn-consumir-droga btn-lime" title="Consome 1 unidade: aplica o efeito (modificadores do item) pelo tempo em horas escrito na descrição (ex: 'por 4h') — sem isso, dura até o fim do dia em jogo — e zera a abstinência do vício correspondente, se houver">Consumir</button>` : ""}
            ${(ehFogo && !semCarregador) ? `<button type="button" class="btn-recarregar-item btn-blue" ${itemPodeUsar(it) ? "" : "disabled"} title="Trocar o carregador anexado por um com mais munição">Recarregar</button>` : ""}
            ${(ehFogo && !semCarregador) ? `<button type="button" class="btn-retirar-carregador-item btn-ghost" ${(itemPodeUsar(it) && armaEstaCarregadaItem) ? "" : "disabled"} title="Retirar o carregador anexado e devolvê-lo ao inventário">Retirar carregador</button>` : ""}
            ${(ehFogo && temCamaraExtraItem) ? `<button type="button" class="btn-carregar-camara-item btn-ghost" ${(itemPodeUsar(it) && !camaraCarregadaItem) ? "" : "disabled"} title="Carregar 1 projétil direto na câmara, do estoque em 'Levando consigo'">Bala na agulha</button>` : ""}
            ${ehCarregador(it.tag) ? `<button type="button" class="btn-carregar-item btn-blue" ${itemPodeUsar(it) ? "" : "disabled"} title="Carregar projéteis do mesmo calibre que estiverem no inventário">Carregar</button>` : ""}
            ${(!isMestre && it.categoria === "levando") ? `<button type="button" class="btn-dar-item btn-ghost">Dar item</button>` : ""}
            ${(!isMestre && it.tag === "dinheiro" && it.categoria === "levando") ? `<button type="button" class="btn-adicionar-saldo-item btn-lime">Adicionar ao saldo</button>` : ""}
            <select class="select-guardar-dentro"></select>
            <select class="select-transferir"></select>
        </div>
        ${(!isMestre && it.tag === "dinheiro" && itemDinheiroCaixaAbertaId === id) ? `
        <div class="item-dinheiro-caixa" style="display:flex; gap:6px; margin-top:6px; padding:0 10px 8px;">
            <input type="number" class="input-item-depositar-valor" min="1" max="${Number(it.saldoValor) || 0}" step="1" placeholder="Quanto depositar? (máx. ${Number(it.saldoValor) || 0})" style="flex:1;">
            <button type="button" class="btn-lime btn-item-confirmar-depositar">Confirmar</button>
            <button type="button" class="btn-ghost btn-item-cancelar-depositar">Cancelar</button>
        </div>` : ""}
    `;
    if (temEfeitoItem) {
        li.querySelector(".btn-toggle-ativo").addEventListener("click", (e) => {
            e.stopPropagation();
            alternarAtivoEntidade("inventario", id, !ativoItem);
        });
    }
    const btnConsumirDroga = li.querySelector(".btn-consumir-droga");
    if (btnConsumirDroga) {
        btnConsumirDroga.addEventListener("click", (e) => {
            e.stopPropagation();
            consumirDroga(id);
        });
    }
    const btnToggleEquipada = li.querySelector(".btn-toggle-equipada");
    if (btnToggleEquipada) {
        btnToggleEquipada.addEventListener("click", (e) => {
            e.stopPropagation();
            const querEquipar = !equipadaItem;
            if (querEquipar) {
                if (!podeEquiparBtn) return;
            } else {
                // Passo 17 (seção 3 do projeto-slots-porte.txt) — tirar
                // (desequipar) um item que está solto em "levando consigo"
                // (sem dentroDe) só é permitido se ele continuar válido
                // depois: mesma trava central do modal (itemPodeSerLevadoSolto,
                // passo 12), aplicada aqui pro botão rápido da lista também,
                // pra não deixar o botão "Tirar/Largar" criar um item sem
                // lugar físico nenhum (nem mão, nem vestido, nem guardado).
                // Cobre tanto container (roupa/cinto/mochila/bolsa_mao)
                // quanto arma/item equipável comum, com a mesma regra.
                // Itens guardados DENTRO do recipiente (dentroDe apontando
                // pra ele) não são afetados — continuam guardados normalmente
                // (ver itensDentroDe/itemPodeSerLevadoSolto, que só olha o
                // próprio item, não filhos) e simplesmente deixam de contar
                // como "levando consigo ativo" enquanto a peça-mãe não
                // estiver equipada nem em "levando".
                if (!itemPodeSerLevadoSolto(fichaAtual, { ...it, equipada: false })) {
                    toast(`Pra tirar "${it.nome}" primeiro guarde-o dentro de outro recipiente ou mova-o pra outra categoria — solto em "Levando consigo" ele precisa continuar numa mão (ou equipado/vestido).`, "erro");
                    return;
                }
            }
            alternarEquipadaItem(id, querEquipar, it.nome);
        });
    }

    const btnToggleContainer = li.querySelector(".btn-toggle-container");
    if (btnToggleContainer) {
        btnToggleContainer.addEventListener("click", (e) => {
            e.stopPropagation();
            if (containerAberto) containersInventarioAbertos.delete(id);
            else containersInventarioAbertos.add(id);
            renderizarInventario(modificadoresPlanos);
        });
    }

    // "Guardar dentro de" — mover o item pra dentro de um COMPARTIMENTO
    // específico de um recipiente (ou soltá-lo, se já estiver guardado).
    // Lista achatada por compartimento (ver listaContainersDisponiveis,
    // seção 5.1 do projeto-slots-porte.txt) — o value do <option> carrega
    // "containerId::compartimentoId". Guardar move o item junto pra
    // categoria do recipiente automaticamente (ver salvarItemDoModal).
    const selectGuardarDentro = li.querySelector(".select-guardar-dentro");
    const compartimentosDisponiveis = listaContainersDisponiveis(fichaAtual, id);
    if (compartimentosDisponiveis.length || it.dentroDe) {
        const optForaPlaceholder = document.createElement("option");
        optForaPlaceholder.value = "__guardar__";
        optForaPlaceholder.innerText = "Guardar dentro de...";
        optForaPlaceholder.disabled = true;
        selectGuardarDentro.appendChild(optForaPlaceholder);
        if (it.dentroDe) {
            const optFora = document.createElement("option");
            optFora.value = "";
            optFora.innerText = "↩ Tirar do recipiente";
            selectGuardarDentro.appendChild(optFora);
        }
        compartimentosDisponiveis.forEach(comp => {
            const containerItem = fichaAtual.inventario[comp.containerId];
            const opt = document.createElement("option");
            opt.value = `${comp.containerId}::${comp.compartimentoId}`;
            opt.innerText = `🎒 ${comp.containerNome} → ${comp.compartimentoNome} (${nomeCategoria(fichaAtual, containerItem?.categoria)})`;
            selectGuardarDentro.appendChild(opt);
        });
        selectGuardarDentro.value = "__guardar__";
    } else {
        selectGuardarDentro.style.display = "none";
    }
    selectGuardarDentro.addEventListener("click", (e) => e.stopPropagation());
    selectGuardarDentro.addEventListener("change", async (e) => {
        e.stopPropagation();
        const valorEscolhido = e.target.value;
        if (valorEscolhido === "__guardar__") return;
        const [novoContainerId, novoCompartimentoId] = valorEscolhido ? valorEscolhido.split("::") : [null, null];
        const containerNovo = novoContainerId ? fichaAtual.inventario[novoContainerId] : null;
        const nomeContainerNovo = containerNovo?.nome || "";
        const compartimentoNovo = (containerNovo?.compartimentos || []).find(c => c.id === novoCompartimentoId);
        const nomeCompartimentoNovo = compartimentoNovo?.nome || "";
        const categoriaNova = containerNovo?.categoria || it.categoria;
        // "Cabe ou não cabe" (Fase 5) — mesma trava do modal, só que no
        // fluxo rápido do dropdown. Só se aplica ao GUARDAR (tirar do
        // recipiente, novoContainerId vazio, nunca é barrado por isso).
        // Vale tanto pro Mestre (aplicaria direto) quanto pro jogador
        // (nem chega a virar pedido pendente se já não couber).
        if (novoContainerId) {
            const resultado = itemCabeNoContainer(fichaAtual, novoContainerId, novoCompartimentoId, it.volume, it.tamanho, id);
            if (!resultado.cabe) {
                const msg = resultado.motivo === "tamanho"
                    ? `"${nomeContainerNovo}" não aceita item desse tamanho.`
                    : resultado.motivo === "compartimento_invalido"
                        ? `Esse compartimento não existe mais em "${nomeContainerNovo}".`
                        : `"${nomeContainerNovo}" não tem espaço sobrando (capacidade de volume estourada).`;
                toast(msg, "erro");
                selectGuardarDentro.value = "__guardar__";
                return;
            }
        }
        if (isMestre) {
            const dados = { dentroDe: novoContainerId || null, compartimentoId: novoContainerId ? novoCompartimentoId : null };
            // Guardar move o item junto pra categoria do recipiente;
            // tirar mantém a categoria atual dele (fica onde estava).
            if (novoContainerId) dados.categoria = categoriaNova;
            await update(ref(db, `${caminhoBase()}/inventario/${id}`), dados);
            toast(novoContainerId ? `${it.nome} guardado em ${nomeContainerNovo} → ${nomeCompartimentoNovo}.` : `${it.nome} tirado do recipiente.`);
        } else {
            const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
            const detalhe = novoContainerId
                ? `${nomeJogador} quer guardar "${it.nome}" dentro de "${nomeContainerNovo} → ${nomeCompartimentoNovo}".`
                : `${nomeJogador} quer tirar "${it.nome}" do recipiente em que está guardado.`;
            await criarAcaoPendente({
                tipo: "guardar_item",
                fichaId: fichaAtualId,
                nomeJogador,
                detalhe,
                payload: { itemId: id, itemNome: it.nome, containerIdAtual: it.dentroDe || null, containerIdNovo: novoContainerId || null, compartimentoIdNovo: novoContainerId ? novoCompartimentoId : null, containerNomeNovo: nomeContainerNovo, categoriaNova: novoContainerId ? categoriaNova : null }
            });
            toast("Pedido enviado ao Mestre.");
            selectGuardarDentro.value = "__guardar__";
        }
    });

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
            // Sai de "levando consigo" desequipa automaticamente — vale
            // tanto pra item comum/arma quanto pra container (mochila
            // guardada em casa não continua "vestida"/"nas costas").
            if (novaCategoria !== "levando" && (ehEquipavelItem || ehContainerItem) && equipadaItem) dados.equipada = false;
            // Item que muda de categoria não pode continuar "guardado"
            // dentro de um recipiente que ficou pra trás na categoria
            // antiga (mochila que ficou em casa não segura item que foi
            // "levado" sozinho, por exemplo).
            if (it.dentroDe) dados.dentroDe = null;
            // Trava central de "item não fica solto" (ver
            // itemPodeSerLevadoSolto em inventario.js, passo 12 do
            // projeto-slots-porte.txt): só entra em jogo ao mover PRA
            // "levando" — sair de "levando" já é sempre válido (não
            // passa pela regra). Sem essa checagem, mover um item
            // desequipado/sem container direto de "Em casa" pra
            // "Levando consigo" deixaria o item sem lugar físico nenhum.
            if (novaCategoria === "levando") {
                const itemPosMudanca = { ...it, ...dados };
                if (!itemPodeSerLevadoSolto(fichaAtual, itemPosMudanca)) {
                    toast(`"${it.nome}" precisa estar numa mão, vestido/carregado, ou guardado dentro de um compartimento pra ficar em "Levando consigo". Equipe-o ou guarde-o num container antes de mover.`, "erro");
                    selectTransferir.value = "";
                    return;
                }
            }
            await update(ref(db, `${caminhoBase()}/inventario/${id}`), dados);
            // Se o item movido é um recipiente, o que está guardado
            // dentro dele muda de categoria junto (continua guardado lá).
            if (ehContainer(it.tag)) {
                const filhos = itensDentroDe(fichaAtual, id);
                if (filhos.length) {
                    const payloadFilhos = {};
                    filhos.forEach(f => { payloadFilhos[`${f.id}/categoria`] = novaCategoria; });
                    Object.assign(fichaAtual.inventario, Object.fromEntries(filhos.map(f => [f.id, { ...fichaAtual.inventario[f.id], categoria: novaCategoria }])));
                    await update(ref(db, `${caminhoBase()}/inventario`), payloadFilhos);
                }
            }
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

    const btnCarregarCamara = li.querySelector(".btn-carregar-camara-item");
    if (btnCarregarCamara) {
        btnCarregarCamara.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (camaraCarregadaItem) return;
            await carregarCamaraArma(id, it);
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

    // "Adicionar ao saldo" — devolve (todo ou parte) do valor de um item
    // de dinheiro físico pra um saldo normal. Abre a mesma caixinha
    // inline usada pra "Pegar" dinheiro do cenário; quem escolhe o
    // saldo de destino é o Mestre, na hora de confirmar o pedido (ver
    // montarPainelAcoesPendentes).
    const btnAdicionarSaldo = li.querySelector(".btn-adicionar-saldo-item");
    if (btnAdicionarSaldo) {
        btnAdicionarSaldo.addEventListener("click", (e) => {
            e.stopPropagation();
            itemDinheiroCaixaAbertaId = id;
            renderizarInventario(modificadoresPlanos);
            const input = el.inventarioListas.querySelector(".input-item-depositar-valor");
            if (input) input.focus();
        });
    }
    const btnCancelarDepositar = li.querySelector(".btn-item-cancelar-depositar");
    if (btnCancelarDepositar) {
        btnCancelarDepositar.addEventListener("click", (e) => {
            e.stopPropagation();
            itemDinheiroCaixaAbertaId = null;
            renderizarInventario(modificadoresPlanos);
        });
    }
    const btnConfirmarDepositar = li.querySelector(".btn-item-confirmar-depositar");
    if (btnConfirmarDepositar) {
        btnConfirmarDepositar.addEventListener("click", async (e) => {
            e.stopPropagation();
            const input = li.querySelector(".input-item-depositar-valor");
            await depositarDinheiroItem(id, it, input ? input.value : "");
        });
    }

    li.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalEdicao("inventario", id);
    });

    // Se é um recipiente aberto (expandido), a lista de filhos entra
    // dentro do próprio <li> (nested <ul> — válido em HTML e garante que
    // o conteúdo "viaja" junto se o item pai for movido/filtrado).
    if (ehContainerItem && containerAberto) {
        // Badge de ocupação POR COMPARTIMENTO (passo 13, seção 5.2 do
        // projeto-slots-porte.txt) — cada compartimento tem sua própria
        // capacidade e ocupação (ex: "Bolso frente esq. 1/1 · Bolso de
        // trás 0/1"), não mais um volume total agregado do container
        // inteiro. Compartimento sem capacidadeVolume definida (0) não
        // mostra barra de progresso, só o total guardado — não tem
        // limite pra comparar. Fica vermelho/pisca se, por alguma
        // inconsistência de dados antigos, passar do limite (a
        // validação normal — modal e select-guardar-dentro — já impede
        // isso de acontecer em uso normal).
        const compartimentosContainer = listaCompartimentos(it);
        const painelCompartimentos = document.createElement("div");
        painelCompartimentos.className = "volume-bar-wrap";
        painelCompartimentos.innerHTML = compartimentosContainer.length
            ? compartimentosContainer.map(comp => {
                const usado = volumeTotalDentroDe(fichaAtual, id, comp.id);
                const capacidade = Number(comp.capacidadeVolume) || 0;
                const estourado = capacidade > 0 && usado > capacidade;
                const pct = capacidade > 0 ? Math.min(100, Math.round((usado / capacidade) * 100)) : 0;
                return `
                    <div class="compartimento-badge">
                        <span class="volume-bar-texto${estourado ? " volume-bar-texto-estourado" : ""}">🎒 ${escapeHtml(comp.nome || "Compartimento")}: ${usado}${capacidade > 0 ? `/${capacidade}` : " (sem limite definido)"}</span>
                        ${capacidade > 0 ? `<div class="volume-bar-track"><div class="volume-bar-fill${estourado ? " volume-bar-estourado" : ""}" style="width:${pct}%;"></div></div>` : ""}
                    </div>
                `;
            }).join("")
            // Defesa extra: container sem nenhum compartimento cadastrado
            // não devia acontecer em uso normal (o modal exige pelo menos
            // 1 — ver lerCompartimentosDoModal), mas evita tela quebrada
            // se algum dado antigo escapou da migração.
            : `<span class="volume-bar-texto volume-bar-texto-estourado">⚠️ Este recipiente não tem nenhum compartimento cadastrado.</span>`;
        li.appendChild(painelCompartimentos);

        const ulFilhos = document.createElement("ul");
        ulFilhos.className = "entity-list entity-list-nested";
        if (!filhosContainer.length) {
            ulFilhos.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nada guardado aqui ainda.</li>`;
        } else {
            filhosContainer.forEach(filho => {
                const { id: idFilho, ...itFilho } = filho;
                ulFilhos.appendChild(criarLiItem(idFilho, itFilho, { categorias, modificadoresPlanos, nivel: nivel + 1 }));
            });
        }
        li.appendChild(ulFilhos);
    }

    return li;
}

// ---------------------------------------------------------------------
// COMBATE
// ---------------------------------------------------------------------
function renderizarCombate() {
    const modificadoresPlanos = modificadoresAtuais();
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
            // Sistema de Slots de Porte (Fase 8) — este botão é um segundo
            // caminho pra equipar/desequipar a mesma arma (fora da lista
            // principal do Inventário), então precisa respeitar a mesma
            // trava de mãos livres que o botão de lá já respeita (ver
            // criarLiItem/semMaosLivres) — senão dava pra empunhar uma
            // arma de 2 mãos aqui mesmo sem mão livre sobrando.
            const maosNecessariasArma = Number(arma.maosNecessarias) || 1;
            const maosLivresCombate = maosDisponiveis(fichaAtual);
            const semMaosLivresArma = !equipadaArma && maosLivresCombate < maosNecessariasArma;
            const podeEquiparArma = itemPodeEquipar(arma) && !semMaosLivresArma;
            const periciaLabel = arma.periciaUso ? ` · Perícia: ${escapeHtml(arma.periciaUso)}` : " · Sem perícia vinculada";
            const classeLabel = arma.classeProtecao ? ` · Classe de Proteção ${escapeHtml(rotuloClasseProtecao(arma.classeProtecao))}` : "";
            const calibreLabel = arma.calibre ? ` · Calibre ${escapeHtml(rotuloCalibre(arma.calibre))}` : "";
            const ehFogo = ehArmaDeFogo(arma.periciaUso);
            const semCarregador = ehFogo && !armaUsaCarregador(arma);
            const carregadorAnexado = (ehFogo && cfg.carregadorId) ? fichaAtual.inventario?.[cfg.carregadorId] : null;
            const temCamaraExtraArma = ehFogo && !!cfg.temCamaraExtra;
            const camaraCarregadaArma = temCamaraExtraArma && !!cfg.camaraCarregada;
            const municaoLabel = ehFogo
                ? (semCarregador
                    ? ` · Munição em estoque: ${municaoEscopetaDisponivel(arma.calibre)} (sem carregador)`
                    : (carregadorAnexado
                        ? ` · Munição: ${carregadorAnexado.carregador?.municaoAtual || 0}/${carregadorAnexado.carregador?.capacidadeMax || 0}`
                        : " · Sem carregador anexado"))
                : "";
            const camaraLabelCombate = temCamaraExtraArma ? ` · Câmara: ${camaraCarregadaArma ? "carregada (+1)" : "vazia"}` : "";
            const fogoLabel = ehFogo
                ? ` · Dif. acerto ${cfg.dificuldadeAcerto ?? "—"} · Alcance ${rotuloAlcanceArmaFogo(cfg.alcance)} · Recuo: ${rotuloPadraoRecuo(cfg.recuo)}${cfg.precisao ? ` · Precisão ${cfg.precisao >= 0 ? "+" : ""}${cfg.precisao}` : ""}${municaoLabel}${camaraLabelCombate}`
                : "";
            li.innerHTML = `
                <div class="entity-main">
                    <span class="entity-nome">${escapeHtml(arma.nome)} <span class="mod-pill tag">nível ${arma.nivelTag || "?"}</span></span>
                    <span class="entity-sub">Dano base: ${cfg.danoBase ?? 0}${tipoDano ? " · " + tipoDano.label : ""}${escala ? " · " + escala.label : ""}${tipoDanoExtraInfo ? ` · ou ${tipoDanoExtraInfo.label} (escolhido no ataque)` : ""}${periciaLabel}${classeLabel}${calibreLabel}${fogoLabel}</span>
                    ${mods ? `<span class="entity-sub">Modificações: ${escapeHtml(mods)}</span>` : ""}
                    ${cfg.efeitoExtra ? `<span class="entity-sub">Efeito extra: ${escapeHtml(cfg.efeitoExtra)}</span>` : ""}
                </div>
                <div class="entity-badges">
                    ${(ehFogo && !semCarregador && carregadorAnexado) ? `<span class="mod-pill positivo" title="Tem um carregador anexado">🔵 Carregada</span>` : ""}
                    ${camaraCarregadaArma ? `<span class="mod-pill positivo" title="Tem 1 bala na agulha, além do carregador">🔵 +1 na agulha</span>` : ""}
                    <button type="button" class="btn-toggle-equipada ${equipadaArma ? "ligado" : "desligado"}" ${podeEquiparArma ? "" : "disabled"} title="${!itemPodeEquipar(arma) ? "Precisa estar em 'Levando consigo' pra equipar" : (semMaosLivresArma ? `Sem mãos livres (${maosLivresCombate}/2)` : (equipadaArma ? "Empunhada agora — clique pra desequipar" : "Desequipada — clique pra empunhar e poder usar em combate"))}">${equipadaArma ? "🗡️ Equipada" : "○ Desequipada"}</button>
                    <button type="button" class="btn-usar-item btn-blue" data-quick-key="arma:${escapeHtml(arma.id)}" ${podeUsar ? "" : "disabled"} title="${podeUsar ? `Rolar d20 + ${arma.periciaUso}` : (equipadaArma ? "Precisa estar em 'Levando consigo' e ter perícia vinculada" : "Equipe a arma pra poder usá-la em combate")}">Usar</button>
                    ${(ehFogo && !semCarregador) ? `<button type="button" class="btn-recarregar-item btn-blue" ${podeUsar ? "" : "disabled"} title="Trocar o carregador anexado por um com mais munição">Recarregar</button>` : ""}
                    ${(ehFogo && !semCarregador) ? `<button type="button" class="btn-retirar-carregador-item btn-ghost" ${(podeUsar && carregadorAnexado) ? "" : "disabled"} title="Retirar o carregador anexado e devolvê-lo ao inventário">Retirar carregador</button>` : ""}
                    ${(ehFogo && temCamaraExtraArma) ? `<button type="button" class="btn-carregar-camara-item btn-ghost" ${(podeUsar && !camaraCarregadaArma) ? "" : "disabled"} title="Carregar 1 projétil direto na câmara, do estoque em 'Levando consigo'">Bala na agulha</button>` : ""}
                </div>
            `;
            li.querySelector(".btn-toggle-equipada").addEventListener("click", (e) => {
                e.stopPropagation();
                const querEquiparArma = !equipadaArma;
                if (querEquiparArma) {
                    if (!podeEquiparArma) return;
                } else if (!itemPodeSerLevadoSolto(fichaAtual, { ...arma, equipada: false })) {
                    // Mesma trava do passo 17 (ver criarLiItem) — desequipar
                    // aqui é o mesmo botão do Painel de Combate pra essa arma.
                    toast(`Pra guardar "${arma.nome}" primeiro coloque-a dentro de outro recipiente ou mova-a pra outra categoria — solta em "Levando consigo" ela precisa continuar equipada.`, "erro");
                    return;
                }
                alternarEquipadaItem(arma.id, querEquiparArma, arma.nome);
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
            const btnCarregarCamaraCombate = li.querySelector(".btn-carregar-camara-item");
            if (btnCarregarCamaraCombate) {
                btnCarregarCamaraCombate.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (camaraCarregadaArma) return;
                    await carregarCamaraArma(arma.id, arma);
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
    const modificadoresPlanos = modificadoresAtuais();
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
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Agilidade" data-quick-key="manobra:${escapeHtml(m.nome)}:Agilidade" title="Rolar d20 + Agilidade">Agilidade 🎲</button>`
            : (ehArremessar || ehImobilizar)
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="CQC" data-quick-key="manobra:${escapeHtml(m.nome)}:CQC" title="Rolar d20 + CQC">CQC 🎲</button>`
            : ehImobilizarJJ
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Jiu Jitsu" data-quick-key="manobra:${escapeHtml(m.nome)}:Jiu Jitsu" title="Rolar d20 + Jiu Jitsu">Jiu Jitsu 🎲</button>
               <button type="button" class="btn-pericia-golpe" data-pericia-golpe="Força" data-quick-key="manobra:${escapeHtml(m.nome)}:Força" title="Rolar d20 + Força">Força 🎲</button>
               <button type="button" class="btn-pericia-golpe" data-pericia-golpe="Destreza" data-quick-key="manobra:${escapeHtml(m.nome)}:Destreza" title="Rolar d20 + Destreza">Destreza 🎲</button>`
            : ehQuebrarOssosJJ
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Quebrar Ossos" data-quick-key="manobra:${escapeHtml(m.nome)}:Quebrar Ossos" title="Aplicar dano automático de Quebrar ossos">Quebrar ossos 🦴</button>`
            : m.pericias.map(nomePericia => {
                const entrada = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === nomePericia);
                if (!entrada) return `<span class="manobra-pericia-texto">${escapeHtml(nomePericia)}</span>`;
                return `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="${escapeHtml(nomePericia)}" data-quick-key="manobra:${escapeHtml(m.nome)}:${escapeHtml(nomePericia)}" title="Rolar d20 + ${nomePericia}">${escapeHtml(nomePericia)} 🎲</button>`;
            }).join(", ") + ` <button type="button" class="btn-pericia-golpe btn-ghost" data-pericia-golpe="Sem Perícia" data-quick-key="manobra:${escapeHtml(m.nome)}:Sem Perícia" title="Rolar sem perícia treinada (-1 fixo)">Sem Perícia 🎲</button>`;

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
                // MANOBRA_ARREMESSAR_CQC em dados-manual.js): manobra
                // DESARMADA, arremessa o(s) PRÓPRIO ALVO (não uma arma —
                // manual pg. 23 não menciona faca/adaga aqui, isso é o
                // "Esfaquear" do mesmo nível, uma manobra separada) e
                // escolhe até 3 alvos numa modal própria (resolve tudo em
                // resolverArremessar).
                if (m.nome === "Arremessar") {
                    if (!combateTemParticipantes()) {
                        toast("Arremessar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalArremessar(nomePericia, modificador);
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
// VEÍCULOS (manual pg. 36-43) — Fase 4 do plano (ver plano-veiculos.txt):
// visão do jogador, somente leitura. Um card por veículo com os 5
// atributos já calculados (ver calcularModificadoresVeiculo em
// regras.js) + o valor de manutenção. Criar/editar os atributos fica
// pro formulário do Mestre (fase 5) — aqui é só exibição.
// ---------------------------------------------------------------------
function linhasAtributoVeiculo(chave, infoAtributo) {
    switch (chave) {
        case "velocidade":
            return [
                `${infoAtributo.kmhMax} km/h máx.`,
                `${infoAtributo.acoesPorTurno} ação(ões)/turno (limitado ao Raciocínio do piloto)`,
                infoAtributo.penalidadePorProtecao ? `nível efetivo ${infoAtributo.nivelEfetivo} (${infoAtributo.penalidadePorProtecao} pela Proteção)` : null
            ];
        case "eficiencia":
            return [`${infoAtributo.turnosAteVelocidadeMaxima} turno(s) até a velocidade máxima`];
        case "protecao":
            return [
                `${infoAtributo.pvMaximo} PV`,
                infoAtributo.reducaoDano ? `reduz ${infoAtributo.reducaoDano} de dano` : "sem redução de dano"
            ];
        case "capacidadeCarga":
            return [
                `${infoAtributo.kgMax} kg suportados`,
                infoAtributo.penalidadeContabilidade ? `${infoAtributo.penalidadeContabilidade} em Contabilidade` : null
            ];
        case "controle":
            return [
                infoAtributo.penalidadeRolagensGerais ? `${infoAtributo.penalidadeRolagensGerais} em todas as rolagens` : null,
                !infoAtributo.podeRealizarManobras ? "incapaz de fazer manobras" : (infoAtributo.bonusDrift ? `+${infoAtributo.bonusDrift} em drift` : "pronto pra drift"),
                infoAtributo.bonusFugaCorrida ? `+${infoAtributo.bonusFugaCorrida} em fuga/corrida` : null
            ];
        default:
            return [];
    }
}

function renderizarVeiculos() {
    if (!el.veiculosLista) return;

    if (el.btnAddVeiculo) el.btnAddVeiculo.style.display = isMestre ? "inline-block" : "none";

    // Ações por turno (Velocidade) dependem do Raciocínio do piloto — na
    // visão da ficha, "o piloto" é o dono da própria ficha, já com
    // modificadores estruturados aplicados (mesma lógica de
    // renderizarAtributos pra atributo primário).
    const modificadoresPlanos = modificadoresAtuais();
    const raciocinioBase = Number(fichaAtual.dados.raciocinio) || 0;
    const ajustesRaciocinio = modificadoresQueAfetam("atributo:raciocinio", modificadoresPlanos).reduce((acc, m) => acc + m.valor, 0);
    const raciocinioPiloto = raciocinioBase + ajustesRaciocinio;

    const veiculos = fichaAtual.veiculos || {};
    const ids = Object.keys(veiculos);

    if (!ids.length) {
        el.veiculosLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">Nenhum veículo cadastrado ainda.</p>`;
        return;
    }

    el.veiculosLista.innerHTML = ids.map(id => {
        const v = veiculos[id];
        const atributos = v.atributos || {};
        const mods = calcularModificadoresVeiculo(atributos, raciocinioPiloto);
        const manutencao = valorManutencaoVeiculo(atributos);
        const periodicidade = periodicidadeManutencaoVeiculo(v.tipo);

        const blocosHtml = ATRIBUTOS_VEICULO.map(chave => {
            const linhas = linhasAtributoVeiculo(chave, mods[chave]).filter(Boolean);
            return `
                <div class="veiculo-atributo-item">
                    <div class="veiculo-atributo-label">
                        <span>${escapeHtml(rotuloAtributoVeiculo(chave))}</span>
                        <span class="veiculo-atributo-nivel">${mods[chave].nivel}</span>
                    </div>
                    ${linhas.map(l => `<div class="veiculo-atributo-linha">${escapeHtml(l)}</div>`).join("")}
                </div>
            `;
        }).join("");

        // Pagamento de manutenção: só o jogador pede (regra 4, mesma fila
        // de Ações Pendentes já usada por "Gastar dinheiro" em Finanças —
        // ver solicitarManutencaoVeiculo). O Mestre edita os saldos direto,
        // então não precisa desse fluxo de aprovação.
        const saldosDisponiveis = isMestre ? [] : todosOsSaldos(fichaAtual);
        const manutencaoHtml = isMestre ? "" : `
            <div class="veiculo-manutencao-pedido">
                <select class="veiculo-manutencao-origem" data-veiculo-manutencao-origem>
                    ${saldosDisponiveis.map(s => `<option value="${s.id}">${escapeHtml(s.nome)}</option>`).join("")}
                </select>
                <button type="button" class="btn-ghost veiculo-manutencao-btn" data-veiculo-manutencao-btn ${saldosDisponiveis.length ? "" : "disabled"}>Solicitar pagamento de manutenção</button>
            </div>
        `;

        // Trava (ver plano-veiculos.txt, adendo "chave"): destrancar é
        // ação direta do próprio jogador (não passa pela fila de Ações
        // Pendentes — usar a própria chave não precisa de aprovação do
        // Mestre), mas só fica disponível se a ficha tiver, no
        // inventário, uma chave apontando pra este veículo. Trancar de
        // novo também é livre (não precisa da chave pra fechar a
        // porta). Mestre não vê esse bloco — ele edita `trancado` direto
        // no modal, se precisar.
        const temChave = veiculoTemChaveDisponivel(fichaAtual, id);
        const trancaHtml = isMestre ? "" : (v.trancado
            ? `<button type="button" class="btn-ghost veiculo-tranca-btn" data-veiculo-destrancar ${temChave ? "" : "disabled"} title="${temChave ? "" : "Você não tem a chave deste veículo."}">🔒 Destrancar${temChave ? "" : " (sem chave)"}</button>`
            : `<button type="button" class="btn-ghost veiculo-tranca-btn" data-veiculo-trancar>🔓 Trancar</button>`);

        return `
            <div class="veiculo-card${isMestre ? " editavel" : ""}" data-veiculo-id="${id}">
                <div class="veiculo-header">
                    <div>
                        <span class="veiculo-nome">${escapeHtml(v.nome || "(sem nome)")}</span>
                        <span class="veiculo-tipo">${escapeHtml(rotuloTipoVeiculo(v.tipo))}</span>
                        ${isMestre ? `<span class="veiculo-tranca-estado">${v.trancado ? "🔒 Trancado" : "🔓 Destrancado"}</span>` : ""}
                    </div>
                    <div class="veiculo-manutencao">
                        <span class="veiculo-manutencao-valor">CN$ ${manutencao}</span>
                        <span class="hint-inline">manutenção ${escapeHtml(periodicidade)}${isMestre ? " · clique pra editar" : ""}</span>
                    </div>
                </div>
                <div class="veiculo-atributos">${blocosHtml}</div>
                ${trancaHtml}
                ${manutencaoHtml}
            </div>
        `;
    }).join("");

    if (isMestre) {
        el.veiculosLista.querySelectorAll(".veiculo-card[data-veiculo-id]").forEach(card => {
            card.addEventListener("click", () => abrirModalEdicao("veiculos", card.dataset.veiculoId));
        });
    } else {
        el.veiculosLista.querySelectorAll(".veiculo-card[data-veiculo-id]").forEach(card => {
            const btnManutencao = card.querySelector("[data-veiculo-manutencao-btn]");
            if (btnManutencao) btnManutencao.addEventListener("click", () => solicitarManutencaoVeiculo(card.dataset.veiculoId));
            const btnDestrancar = card.querySelector("[data-veiculo-destrancar]");
            if (btnDestrancar) btnDestrancar.addEventListener("click", () => alternarTrancaVeiculo(card.dataset.veiculoId, false));
            const btnTrancar = card.querySelector("[data-veiculo-trancar]");
            if (btnTrancar) btnTrancar.addEventListener("click", () => alternarTrancaVeiculo(card.dataset.veiculoId, true));
        });
    }
}

// ---------------------------------------------------------------------
// CENÁRIO (ver plano-cenario.txt, Fase 4) — mostra os cenários
// compartilhados (cenariosCache, alimentado por configurarCenarios)
// filtrados por ficha: jogador só vê os cenários onde a própria ficha
// está em `participantes`; o Mestre vê todos. Só leitura por enquanto —
// os botões "Pegar" (item) e "Arrombar" (veículo) entram nas próximas
// fases do plano (Fase 3 e Fase 5). A edição do cenário em si (criar,
// adicionar participante/item/veículo) continua só no Gerenciador de
// Cenário (Fase 6), não aqui.
// ---------------------------------------------------------------------

// Em qual cenário o personagem/NPC atualmente carregado na tela está
// participando agora (ficha OU NPC, conforme modoNpc) — usado pelo
// "Armar" de explosivo (ver plano-explosivos-cenario.txt, Fase 2) pra
// bloquear armar fora de cenário, e pra saber em qual nó
// cenarios/{id}/explosivos gravar. Mesmo critério de filtro usado em
// renderizarCenarios logo abaixo, só que sem depender de isMestre —
// funciona tanto pro jogador quanto pro Mestre atuando como NPC.
function cenarioAtualDoPersonagem() {
    const idAtual = modoNpc ? npcAtualId : fichaAtualId;
    const tipoAtual = modoNpc ? "npc" : "ficha";
    if (!idAtual) return null;
    return cenariosCache.find(c =>
        Object.values(c.participantes || {}).some(p => p.tipo === tipoAtual && p.refId === idAtual)
    ) || null;
}

// Qual linha de dinheiro está com a caixinha de "quanto pegar" aberta
// no momento (só 1 por vez, pra não poluir a tela) — guarda o id do
// saldo de dinheiro do cenário (push key, único mesmo entre cenários
// diferentes).
let dinheiroCenarioAbertoId = null;

function renderizarCenarios() {
    if (!el.cenarioLista || !fichaAtualId) return;

    const cenariosVisiveis = isMestre
        ? cenariosCache
        : cenariosCache.filter(c => Object.values(c.participantes || {}).some(p => p.tipo === "ficha" && p.refId === fichaAtualId));

    if (!cenariosVisiveis.length) {
        el.cenarioLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">${isMestre ? "Nenhum cenário ativo no momento." : "Você não está em nenhum cenário no momento."}</p>`;
        return;
    }

    el.cenarioLista.innerHTML = cenariosVisiveis.map(cenario => {
        const participantes = Object.values(cenario.participantes || {});
        const itens = Object.entries(cenario.itens || {});
        const veiculos = Object.entries(cenario.veiculos || {});
        const explosivos = Object.entries(cenario.explosivos || {});

        const participantesHtml = participantes.length
            ? participantes.map(p => `<span class="mod-pill">${p.tipo === "ficha" ? "🧑" : "👤"} ${escapeHtml(p.nome)}</span>`).join(" ")
            : `<span class="hint">Ninguém marcado ainda.</span>`;

        const itensHtml = itens.length
            ? itens.map(([itemId, it]) => `
                <div class="cenario-item-linha" data-cenario-item-id="${itemId}">
                    <span>📦 ${escapeHtml(it.nome || "(sem nome)")}${it.observacao ? ` <span class="entity-sub">— ${escapeHtml(it.observacao)}</span>` : ""}</span>
                    ${isMestre ? "" : `<button type="button" class="btn-lime btn-cenario-pegar-item" data-cenario-id="${cenario.id}" data-item-id="${itemId}" data-item-nome="${escapeHtml(it.nome || "item")}">Pegar</button>`}
                </div>`).join("")
            : `<p class="hint">Nenhum item solto neste cenário.</p>`;

        const veiculosHtml = veiculos.length
            ? veiculos.map(([veiculoId, v]) => `
                <div class="cenario-veiculo-linha" data-cenario-veiculo-id="${veiculoId}">
                    <span>🚗 ${escapeHtml(v.nome || "(sem nome)")} <span class="entity-sub">(${rotuloTipoVeiculo(v.tipo)}, ${v.trancado ? "🔒 Trancado" : "🔓 Destrancado"})</span></span>
                    ${isMestre ? "" : `<button type="button" class="btn-ghost btn-cenario-arrombar" data-veiculo-nome="${escapeHtml(v.nome || "veículo")}">🔨 Arrombar</button>`}
                </div>`).join("")
            : `<p class="hint">Nenhum veículo neste cenário.</p>`;

        // Só informativo pro jogador (decisão 5, plano-explosivos-cenario.txt)
        // — sem botão de Detonar nem Remover aqui, isso é exclusivo do
        // Mestre (montarDetalheCenario, Gerenciador de Cenário).
        const explosivosHtml = explosivos.length
            ? explosivos.map(([explosivoId, exp]) => `
                <div class="cenario-explosivo-linha" data-cenario-explosivo-id="${explosivoId}">
                    <span>💣 ${escapeHtml(exp.nome || "(sem nome)")} — dano ${exp.dano}, raio ${exp.raio}m
                        ${exp.status === "detonado" ? " · <strong>já detonado</strong>" : ""}
                    </span>
                </div>`).join("")
            : `<p class="hint">Nenhum explosivo armado neste cenário.</p>`;

        const dinheiro = Object.entries(cenario.dinheiro || {});
        const dinheiroHtml = dinheiro.length
            ? dinheiro.map(([dinheiroId, d]) => {
                const valorAtual = Number(d.valor) || 0;
                const caixaAberta = dinheiroCenarioAbertoId === dinheiroId;
                return `
                <div class="cenario-dinheiro-linha" data-cenario-dinheiro-id="${dinheiroId}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>💰 ${escapeHtml(d.nome || "Grana")} <span class="entity-sub">(saldo: ${valorAtual})</span></span>
                        ${isMestre || valorAtual <= 0 ? "" : `<button type="button" class="btn-lime btn-cenario-pegar-dinheiro" data-cenario-id="${cenario.id}" data-dinheiro-id="${dinheiroId}" data-dinheiro-nome="${escapeHtml(d.nome || "Grana")}" data-valor-max="${valorAtual}">Pegar</button>`}
                    </div>
                    ${!isMestre && caixaAberta ? `
                    <div class="cenario-dinheiro-caixa" style="display:flex; gap:6px; margin-top:6px;">
                        <input type="number" class="input-cenario-pegar-valor" min="1" max="${valorAtual}" step="1" placeholder="Quanto? (máx. ${valorAtual})" style="flex:1;">
                        <button type="button" class="btn-lime btn-cenario-confirmar-pegar" data-cenario-id="${cenario.id}" data-dinheiro-id="${dinheiroId}" data-dinheiro-nome="${escapeHtml(d.nome || "Grana")}" data-valor-max="${valorAtual}">Confirmar</button>
                        <button type="button" class="btn-ghost btn-cenario-cancelar-pegar">Cancelar</button>
                    </div>` : ""}
                </div>`;
            }).join("")
            : `<p class="hint">Nenhum dinheiro solto neste cenário.</p>`;

        return `
            <div class="veiculo-card" data-cenario-id="${cenario.id}">
                <div class="veiculo-header">
                    <span class="veiculo-nome">🎬 ${escapeHtml(cenario.titulo)}</span>
                </div>
                <div class="cenario-participantes">${participantesHtml}</div>
                <div class="section-header" style="margin-top:8px;">Itens</div>
                ${itensHtml}
                <div class="section-header" style="margin-top:8px;">Veículos</div>
                ${veiculosHtml}
                <div class="section-header" style="margin-top:8px;">Explosivos armados</div>
                ${explosivosHtml}
                <div class="section-header" style="margin-top:8px;">Dinheiro</div>
                ${dinheiroHtml}
            </div>`;
    }).join("");

    if (!isMestre) {
        el.cenarioLista.querySelectorAll(".btn-cenario-pegar-item").forEach(btn => {
            btn.addEventListener("click", () => pegarItemCenario(btn.dataset.cenarioId, btn.dataset.itemId, btn.dataset.itemNome));
        });
        el.cenarioLista.querySelectorAll(".btn-cenario-arrombar").forEach(btn => {
            btn.addEventListener("click", () => arrombarVeiculoCenario(btn.dataset.veiculoNome));
        });
        // Abre a caixinha de "quanto pegar" embaixo do botão clicado.
        el.cenarioLista.querySelectorAll(".btn-cenario-pegar-dinheiro").forEach(btn => {
            btn.addEventListener("click", () => {
                dinheiroCenarioAbertoId = btn.dataset.dinheiroId;
                renderizarCenarios();
                // Depois de re-renderizar, já foca o input recém-aberto.
                const input = el.cenarioLista.querySelector(".input-cenario-pegar-valor");
                if (input) input.focus();
            });
        });
        el.cenarioLista.querySelectorAll(".btn-cenario-cancelar-pegar").forEach(btn => {
            btn.addEventListener("click", () => { dinheiroCenarioAbertoId = null; renderizarCenarios(); });
        });
        el.cenarioLista.querySelectorAll(".btn-cenario-confirmar-pegar").forEach(btn => {
            btn.addEventListener("click", () => {
                const caixa = btn.closest(".cenario-dinheiro-caixa");
                const input = caixa ? caixa.querySelector(".input-cenario-pegar-valor") : null;
                pegarDinheiroCenario(btn.dataset.cenarioId, btn.dataset.dinheiroId, btn.dataset.dinheiroNome, Number(btn.dataset.valorMax) || 0, input ? input.value : "");
            });
        });
    }
}

// Pega um item solto de um cenário — passa pela fila de aprovação do
// Mestre (mesmo mecanismo de "dar_item", ver criarAcaoPendente/
// confirmarAcaoPendente em mestre.js e plano-cenario.txt, Fase 3).
async function pegarItemCenario(cenarioId, itemId, itemNome) {
    if (!fichaAtualId || isMestre) return;
    const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
    await criarAcaoPendente({
        tipo: "pegar_item_cenario",
        fichaId: fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} quer pegar "${itemNome}" do cenário.`,
        payload: { cenarioId, itemId, itemNome, fichaDestinoId: fichaAtualId }
    });
    toast("Pedido pra pegar o item enviado ao Mestre.");
}

// Pega um valor específico de um saldo de dinheiro solto no cenário —
// mesma fila de aprovação do Mestre de pegarItemCenario acima, só que
// valida também o valor digitado (inteiro, > 0, <= saldo atual) antes
// de criar o pedido. A revalidação final (saldo pode ter mudado
// enquanto o pedido esperava aprovação) acontece de novo no Mestre, em
// confirmarAcaoPendente/"pegar_dinheiro_cenario".
async function pegarDinheiroCenario(cenarioId, dinheiroId, dinheiroNome, valorMax, valorDigitado) {
    if (!fichaAtualId || isMestre) return;
    const valor = Math.floor(Number(valorDigitado));
    if (!valorDigitado || isNaN(valor) || valor <= 0) { toast("Digite um valor válido.", "erro"); return; }
    if (valor > valorMax) { toast(`Só tem ${valorMax} nesse saldo.`, "erro"); return; }
    const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
    await criarAcaoPendente({
        tipo: "pegar_dinheiro_cenario",
        fichaId: fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} quer pegar ${valor} de "${dinheiroNome}" no cenário.`,
        payload: { cenarioId, dinheiroId, dinheiroNome, valor, fichaDestinoId: fichaAtualId }
    });
    dinheiroCenarioAbertoId = null;
    renderizarCenarios();
    toast("Pedido pra pegar o dinheiro enviado ao Mestre.");
}

// Devolve um valor específico de um item de "Dinheiro" físico (ver
// transformar_dinheiro_item, mestre.js) pra algum saldo — mesma fila de
// aprovação, com a mesma validação client-side de pegarDinheiroCenario
// acima (inteiro, > 0, <= valor do item). Quem escolhe EM QUAL saldo o
// valor cai é o Mestre, na hora de confirmar (ver
// montarPainelAcoesPendentes), não aqui.
async function depositarDinheiroItem(itemId, it, valorDigitado) {
    if (!fichaAtualId || isMestre) return;
    const valorMax = Number(it.saldoValor) || 0;
    const valor = Math.floor(Number(valorDigitado));
    if (!valorDigitado || isNaN(valor) || valor <= 0) { toast("Digite um valor válido.", "erro"); return; }
    if (valor > valorMax) { toast(`Esse item só tem ${valorMax}.`, "erro"); return; }
    const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
    await criarAcaoPendente({
        tipo: "depositar_dinheiro_item",
        fichaId: fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} quer depositar ${valor} de "${it.nome}" num saldo.`,
        payload: { itemId, itemNome: it.nome, valor }
    });
    itemDinheiroCaixaAbertaId = null;
    renderizarInventario(modificadoresAtuais());
    toast("Pedido enviado ao Mestre.");
}
// "chave"): ação direta do jogador, sem passar pelo Mestre — destrancar
// exige ter a chave no inventário desta ficha (revalida aqui, não só
// no disabled do botão, porque o HTML pode estar desatualizado se dois
// dispositivos mexerem na ficha ao mesmo tempo).
async function alternarTrancaVeiculo(veiculoId, trancar) {
    if (!fichaAtual || !fichaAtualId || isMestre) return;
    const v = fichaAtual.veiculos && fichaAtual.veiculos[veiculoId];
    if (!v) return;
    if (!trancar && !veiculoTemChaveDisponivel(fichaAtual, veiculoId)) {
        toast("Você não tem a chave deste veículo.", "erro");
        return;
    }
    await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), { trancado: trancar });
    toast(trancar ? "Veículo trancado." : "Veículo destrancado.");
}

// Pedido de pagamento de manutenção — reaproveita a mesma ação
// pendente "gastar_dinheiro" já tratada em confirmarAcaoPendente
// (mestre.js), sem nenhum código novo do lado do Mestre (ver
// plano-veiculos.txt, item 5/6).
async function solicitarManutencaoVeiculo(veiculoId) {
    if (!fichaAtual || !fichaAtualId || isMestre) return;
    const v = fichaAtual.veiculos && fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const saldos = todosOsSaldos(fichaAtual);
    if (!saldos.length) { toast("Você não tem nenhum saldo cadastrado pra pagar a manutenção.", "erro"); return; }
    const card = el.veiculosLista.querySelector(`.veiculo-card[data-veiculo-id="${veiculoId}"]`);
    const saldoId = card?.querySelector("[data-veiculo-manutencao-origem]")?.value;
    const saldo = saldos.find(s => s.id === saldoId);
    if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
    const valor = valorManutencaoVeiculo(v.atributos || {});
    const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
    await criarAcaoPendente({
        tipo: "gastar_dinheiro",
        fichaId: fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} quer pagar a manutenção de "${v.nome}" (CN$ ${valor}, ${saldo.nome}).`,
        payload: { valor, saldoId }
    });
    toast("Pedido de pagamento de manutenção enviado ao Mestre.");
}

// ---------------------------------------------------------------------
// VANTAGENS / DESVANTAGENS / FATOS UNIVERSAIS
// ---------------------------------------------------------------------
// Subtítulo de uma Desvantagem: descrição normal, mas se for um "Vício"
// (tem `.substancia`), acrescenta o status de abstinência calculado na
// hora — dias desde o último uso (ver botão "Consumir" num item de
// droga, em consumirDroga) e a penalidade atual, se houver.
function subDesvantagem(v) {
    if (!v.substancia) return v.descricao || "";
    const diaAtual = calendarioAtual ? calendarioAtual.diaIndice : null;
    const { diasDesdeUltimoUso, semanas, malusTestes, malusPV } = calcularAbstinenciaVicio(v, diaAtual);
    let statusAbstinencia;
    if (diaAtual === null) {
        statusAbstinencia = "calendário da mesa ainda não carregou";
    } else if (semanas <= 0) {
        statusAbstinencia = `${diasDesdeUltimoUso} dia(s) desde a última dose de ${v.substancia} · sem abstinência ainda`;
    } else {
        statusAbstinencia = `${diasDesdeUltimoUso} dia(s) desde a última dose de ${v.substancia} · ${semanas}ª semana em abstinência (${malusTestes} em todos os testes${malusPV ? `, ${malusPV} PV máximo` : ""})`;
    }
    return [v.descricao, statusAbstinencia].filter(Boolean).join(" · ");
}

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
        nome: v.nome || "(sem nome)", sub: subDesvantagem(v), direita: resumoModificadores(v)
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
// VÍCIOS / ABSTINÊNCIA (manual, cap. Drogas)
// ---------------------------------------------------------------------
// Um vício NÃO é mais uma aba própria — é a Desvantagem "Vício" (ver
// campo Substância no modal, mostrado quando o Nome contém "vício";
// configurarCampoSubstanciaVicio mais abaixo) com um campo extra
// `substancia` (qual droga) e `diaIndiceUltimoUso` (contagem de dias do
// calendário da mesa, pra calcular abstinência — ver
// calcularAbstinenciaVicio em regras.js). Achar a desvantagem certa pra
// uma droga usa comparação de texto simples (case-insensitive, ignora
// acento) — é assim que o botão "Consumir" (ver mais abaixo) sabe qual
// vício "curar" quando o personagem usa a droga de novo.
function normalizarTextoBusca(s) {
    return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function encontrarDesvantagemVicioPara(substancia) {
    const alvo = normalizarTextoBusca(substancia);
    if (!alvo) return null;
    const desvantagens = fichaAtual.desvantagens || {};
    const idEncontrado = Object.keys(desvantagens).find(id => normalizarTextoBusca(desvantagens[id].substancia) === alvo);
    return idEncontrado || null;
}

// Mostra/esconde o campo "Substância" no modal de Desvantagem, conforme
// o Nome digitado contém "vício"/"vicio" — e preenche o datalist com o
// catálogo do manual, pra sugerir só (não trava em texto livre, porque
// mesa pode ter droga homebrew).
function configurarCampoSubstanciaVicio() {
    if (el.modalSubstanciaVicioOpcoes) {
        el.modalSubstanciaVicioOpcoes.innerHTML = CATALOGO_DROGAS.map(d => `<option value="${escapeHtml(d.nome)}">`).join("");
    }
    if (!el.modalNome) return;
    el.modalNome.addEventListener("input", () => {
        if (!modalContexto || modalContexto.lista !== "desvantagens" || !el.modalCampoSubstanciaVicio) return;
        const ehVicio = /vic[ií]o/i.test(el.modalNome.value);
        el.modalCampoSubstanciaVicio.style.display = ehVicio ? "flex" : "none";
    });
}

// ---------------------------------------------------------------------
// CONSUMIR DROGA (item de inventário com tag "droga")
// ---------------------------------------------------------------------
// Consumir um item de droga faz duas coisas:
// 1) Se existir uma Desvantagem "Vício" cadastrada pra essa mesma
//    substância, zera a contagem de abstinência dela (diaIndiceUltimoUso
//    = hoje) — "tomou a dose, a abstinência para por hoje".
// 2) Aplica o efeito da droga (bônus/penalidade) pelo tempo (em horas)
//    escrito na própria descrição do item — ex: "...por 4h." (ver
//    extrairDuracaoHorasDaDescricao em regras.js). Sem nenhum "Xh" no
//    texto, cai no comportamento antigo: dura até acabar o dia em jogo
//    atual. O efeito soma diaIndice*24 + hora do calendário da mesa
//    (ver horasTotaisCalendario) pra saber quando expira de verdade, e
//    some sozinho — sem precisar de nenhuma limpeza manual — assim que
//    o calendário passar desse ponto (ver calcularModificadoresDrogasAtivas).
// IMPORTANTE: o efeito aplicado é sempre `item.modificadores` — o mesmo
// campo "Modificadores automáticos" editável no modal do item (ver
// #modal-lista-modificadores em ficha.html). Não existe mais nenhum
// efeito fixo vindo do CATALOGO_DROGAS (dados-manual.js): aquele
// catálogo agora só serve de SUGESTÃO pra preencher esse campo (e a
// descrição, de onde a duração é lida) na hora de cadastrar o item (ver
// configurarAutocompleteItemBanco), continuando 100% editável depois —
// inclusive pra drogas homebrew que nem estão no catálogo.
// Item consumível de verdade: reduz 1 unidade (ou remove, se só tinha 1).
async function consumirDroga(itemId) {
    if (!idAtivo()) return;
    const item = fichaAtual.inventario && fichaAtual.inventario[itemId];
    if (!item) return;
    if (calendarioAtual === null || calendarioAtual === undefined) {
        toast("Calendário da mesa ainda não carregou — espera um instante e tenta de novo.", "erro");
        return;
    }
    const diaAtual = calendarioAtual.diaIndice;
    const modificadoresDoItem = (item.modificadores || []).filter(m => m && m.alvo && Number(m.valor));

    const atualizacoes = {};

    // 1) Cura a abstinência do vício correspondente, se existir.
    const idDesvantagem = encontrarDesvantagemVicioPara(item.nome);
    if (idDesvantagem) {
        fichaAtual.desvantagens[idDesvantagem].diaIndiceUltimoUso = diaAtual;
        atualizacoes[`${caminhoBase()}/desvantagens/${idDesvantagem}/diaIndiceUltimoUso`] = diaAtual;
    }

    // 2) Registra o efeito ativo — direto dos modificadores editáveis do
    // próprio item; item sem nenhum modificador cadastrado só cura a
    // abstinência, sem bônus/penalidade automática. A duração vem do
    // texto da descrição (ex: "por 4h"); sem padrão reconhecido, dura
    // até o fim do dia em jogo (comportamento antigo).
    let notaDuracao = "";
    if (modificadoresDoItem.length) {
        const horasAgora = horasTotaisCalendario(diaAtual, calendarioAtual.hora);
        const duracaoHoras = extrairDuracaoHorasDaDescricao(item.descricao);
        const horasExpira = (duracaoHoras !== null && horasAgora !== null)
            ? horasAgora + duracaoHoras
            : ((diaAtual + 1) * 24); // fallback: até acabar o dia em jogo (meia-noite)
        notaDuracao = duracaoHoras !== null ? `efeito ativo por ${duracaoHoras}h` : "efeito ativo até o fim do dia";

        if (!fichaAtual.efeitosDrogas) fichaAtual.efeitosDrogas = {};
        const chave = normalizarTextoBusca(item.nome);
        fichaAtual.efeitosDrogas[chave] = {
            nome: item.nome,
            diaIndiceConsumido: diaAtual,
            horasExpira,
            modificadores: modificadoresDoItem
        };
        atualizacoes[`${caminhoBase()}/efeitosDrogas/${chave}`] = fichaAtual.efeitosDrogas[chave];
    }

    // 3) Consome 1 unidade do item.
    const quantidadeAtual = Number(item.quantidade);
    if (Number.isFinite(quantidadeAtual) && quantidadeAtual > 1) {
        item.quantidade = quantidadeAtual - 1;
        atualizacoes[`${caminhoBase()}/inventario/${itemId}/quantidade`] = item.quantidade;
    } else {
        delete fichaAtual.inventario[itemId];
        atualizacoes[`${caminhoBase()}/inventario/${itemId}`] = null;
    }

    try {
        await update(ref(db), atualizacoes);
        const partesAviso = [];
        if (idDesvantagem) partesAviso.push("abstinência zerada");
        if (notaDuracao) partesAviso.push(notaDuracao);
        toast(`${item.nome} consumido${partesAviso.length ? " — " + partesAviso.join(", ") : ""}.`);
    } catch (e) {
        toast("Não foi possível consumir o item. Tente de novo.", "erro");
    }
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
    const criticoPositivo = resultado >= 20;
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
                if (itemBanco) {
                    registroItem = autopreencherItemDoBanco(itemBanco, "levando");
                    // Item novo (criado agora, via receita) com modificador
                    // estruturado nasce DESLIGADO, igual a qualquer outro item
                    // novo — exceto droga, que não usa esse botão.
                    if (registroItem.ativo === undefined) {
                        registroItem.ativo = (registroItem.modificadores && registroItem.modificadores.length && registroItem.tag !== "droga") ? false : true;
                    }
                }
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

function renderizarReceitas() {
    if (!el.receitasLista) return;
    const entradasCriacao = Object.values(fichaAtual.pericias || {})
        .filter(p => PERICIAS_CRIACAO_ITEM.includes(p.nome));
    const modificadoresPlanos = modificadoresAtuais();

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
                                ${r ? `<button type="button" class="btn-ghost receita-editar" data-receita-editar-id="${r.id}" title="Editar essa receita no Banco Global">Editar</button>` : ""}
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

            // Módulos de detonação (manual pg. 81): SÓ pra Explosivos — um
            // slot grátis A MAIS por nível, em paralelo ao slot normal de
            // bomba acima, só que a receita vem de Ofícios Utilitários ou
            // Eletrônica (quem cria módulo de verdade — ver
            // receitasModuloDetonacaoDisponiveis). tipoSlot="modulo"
            // mantém os dois slots (bomba e módulo) do mesmo nível
            // independentes um do outro.
            const moduloSlotsHtml = [];
            if (p.nome === "Explosivos") {
                for (let nivel = 1; nivel <= nivelPericia; nivel++) {
                    const livre = receitaLivreDoSlot(p.nome, nivel, "modulo");
                    if (livre) {
                        const r = receitasGlobaisCache.find(g => g.id === livre.receitaGlobalId);
                        const item = r?.itemGlobalId ? itensGlobaisCache.find(it => it.id === r.itemGlobalId) : null;
                        moduloSlotsHtml.push(`
                            <li class="receita-slot receita-slot-preenchido" style="cursor:default;">
                                <div class="entity-main">
                                    <span class="entity-nome">Nível ${nivel} · ${escapeHtml(r ? (r.nome || "(receita sem nome)") : "(receita removida do Banco Global)")}</span>
                                    ${item?.descricao ? `<span class="entity-sub">${escapeHtml(item.descricao)}</span>` : (r?.descricao ? `<span class="entity-sub">${escapeHtml(r.descricao)}</span>` : "")}
                                </div>
                                <div class="entity-badges">
                                    ${r ? `<button type="button" class="btn-rolar btn-blue receita-criar" data-receita-id="${r.id}" data-pericia="${escapeHtml(r.periciaVinculada)}" data-modificador="${calcularTotalPericia(Object.values(fichaAtual.pericias || {}).find(pp => pp.nome === r.periciaVinculada) || { nome: r.periciaVinculada, nivel: 0 }, fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(r.periciaVinculada)).total}" title="Rolar ${escapeHtml(r.periciaVinculada)} pra criar">🎲 Criar</button>` : ""}
                                    ${r ? `<button type="button" class="btn-ghost receita-editar" data-receita-editar-id="${r.id}" title="Editar essa receita no Banco Global">Editar</button>` : ""}
                                </div>
                                <span class="hint-inline">Módulo de detonação — gratuita — travada${isMestre ? "" : " (só o Mestre pode trocar)"}</span>
                                ${isMestre ? `<button type="button" class="btn-red receita-remover" data-id="${livre.id}">Remover</button>` : ""}
                            </li>
                        `);
                    } else {
                        const opcoes = receitasModuloDetonacaoDisponiveis(nivel);
                        if (opcoes.length) {
                            moduloSlotsHtml.push(`
                                <li class="receita-slot receita-slot-vazio" data-pericia="${escapeHtml(p.nome)}" data-nivel="${nivel}" data-tipo-slot="modulo">
                                    <label>Nível ${nivel} — escolha seu módulo de detonação gratuito</label>
                                    <select class="receita-slot-select">
                                        ${opcoes.map(r => `<option value="${r.id}">${escapeHtml(r.nome || "(sem nome)")} (${escapeHtml(r.periciaVinculada)})</option>`).join("")}
                                    </select>
                                    <button type="button" class="btn-lime receita-slot-confirmar">Adquirir</button>
                                </li>
                            `);
                        } else {
                            moduloSlotsHtml.push(`
                                <li class="receita-slot receita-slot-vazio" data-pericia="${escapeHtml(p.nome)}" data-nivel="${nivel}" data-tipo-slot="modulo">
                                    <p class="hint">Nenhuma receita de módulo de detonação de nível ${nivel} cadastrada ainda no Banco Global (Ofícios Utilitários/Eletrônica, item com tag "Módulo de Detonação").</p>
                                </li>
                            `);
                        }
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
                                <span class="entity-nome">Nível ${x.nivel} · ${escapeHtml(r ? (r.nome || "(sem nome)") : "(receita removida do Banco Global)")}${x.tipoSlot === "modulo" ? " (módulo de detonação)" : ""}</span>
                            </div>
                            ${r ? `<button type="button" class="btn-ghost receita-editar" data-receita-editar-id="${r.id}" title="Editar essa receita no Banco Global">Editar</button>` : ""}
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
                                ${r ? `<button type="button" class="btn-ghost receita-editar" data-receita-editar-id="${r.id}" title="Editar essa receita no Banco Global">Editar</button>` : ""}
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

            const moduloSlotsSecao = moduloSlotsHtml.length
                ? `<div class="hint-inline" style="margin-top:10px;">Módulos de detonação (um grátis por ponto em Explosivos — manual pg. 81)</div><ul class="entity-list">${moduloSlotsHtml.join("")}</ul>`
                : "";

            return `
                <div class="section-header">${escapeHtml(p.nome)} <span class="hint-inline">nível ${nivelPericia}</span></div>
                ${nivelPericia < 1 ? `<p class="hint">Perícia ainda em nível 0 — nenhuma receita gratuita disponível.</p>` : `<ul class="entity-list">${slotsHtml.join("")}${formExtraMestre}</ul>`}
                ${moduloSlotsSecao}
                ${extrasHtml}
                ${guardadasHtml}
            `;
        }).join("");

    el.receitasLista.innerHTML = `${corpoHtml}<button type="button" class="btn-lime" id="btn-add-receita" style="margin-top:12px;">+ Cadastrar nova receita no Banco Global</button>`;
    document.getElementById("btn-add-receita")?.addEventListener("click", () => abrirModalCriarReceita());

    // Escolher a receita gratuita de um slot vazio (dentre as já
    // cadastradas no Banco Global pra aquele nível/perícia — ou, se
    // data-tipo-slot="modulo", dentre as receitas de módulo de
    // detonação daquele nível, que são de OUTRA perícia — ver
    // receitasModuloDetonacaoDisponiveis).
    el.receitasLista.querySelectorAll(".receita-slot-confirmar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const li = btn.closest(".receita-slot");
            const periciaNome = li.dataset.pericia;
            const nivel = Number(li.dataset.nivel);
            const tipoSlot = li.dataset.tipoSlot === "modulo" ? "modulo" : "bomba";
            const select = li.querySelector(".receita-slot-select");
            if (!select || !select.value) return;
            await concederReceitaConhecida(periciaNome, nivel, select.value, "livre", tipoSlot);
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

    // Editar a receita já conhecida direto no Banco Global (mesma modal
    // usada pra criar — ver abrirModalCriarReceita — e disponível tanto
    // pro jogador quanto pro Mestre, já que o Banco Global é
    // compartilhado entre todo mundo, igual o de itens). Como a edição
    // é no registro global, ela afeta qualquer outra ficha/mesa que use
    // essa mesma receita.
    el.receitasLista.querySelectorAll(".receita-editar").forEach(btn => {
        btn.addEventListener("click", () => {
            const receita = receitasGlobaisCache.find(g => g.id === btn.dataset.receitaEditarId);
            if (!receita) { toast("Receita não encontrada no Banco Global.", "erro"); return; }
            abrirModalCriarReceita(receita);
        });
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
// Perícias de criação cujo resultado PRECISA sair funcional (a receita
// tem que estar vinculada a um item de verdade do Banco Global de
// Itens) — senão o item nasce só decorativo (tag null, sem dano,
// bônus, efeito, cura, trava aberta, nada), o que trava o jogador na
// hora de tentar usar. Fora dessa lista (Mecânica Automotiva,
// Biomecânica) o item básico sem vínculo ainda é uma opção legítima
// hoje, então o vínculo continua opcional — mas se algum dia isso virar
// problema também, é só adicionar aqui.
const PERICIAS_QUE_EXIGEM_ITEM_VINCULADO = ["Armeiro", "Explosivos", "Eletrônica", "Ofícios Utilitários", "Química"];

function abrirModalCriarReceita(receitaExistente, opcoesSlot, valoresIniciais) {
    let modal = document.getElementById("modal-criar-receita");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-criar-receita";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    // valoresIniciais tem prioridade — é o rascunho recém-vindo do
    // fluxo "+ Criar item no Banco Global" (ver retomarReceitaAoFecharModal
    // dentro de fecharModal), com tudo que já tinha sido digitado antes
    // de ir criar o item, mais o itemGlobalId recém-vinculado.
    const r = { ...(receitaExistente || {}), ...(valoresIniciais || {}) };
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">${receitaExistente ? "Editar receita" : "Nova receita"} — Banco Global</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <div class="modal-field">
            <label for="receita-nome">Nome do item a ser criado</label>
            <input type="text" id="receita-nome" value="${escapeHtml(r.nome || "")}" autocomplete="off">
            <div id="receita-item-opcoes" class="searchable-options" style="display:none;"></div>
            <span class="hint-inline" id="receita-item-vinculo-hint"></span>
            <button type="button" class="btn-ghost" id="btn-receita-criar-item" style="margin-top:6px;">+ Criar item no Banco Global</button>
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

    // Deixa claro, ANTES de tentar salvar, quando a receita vai gerar
    // um item sem função nenhuma (sem vínculo, numa perícia que precisa
    // de dano/efeito real — ver PERICIAS_QUE_EXIGEM_ITEM_VINCULADO).
    function atualizarAvisoVinculo() {
        const exige = PERICIAS_QUE_EXIGEM_ITEM_VINCULADO.includes(selectPericia.value);
        if (itemGlobalIdVinculado) {
            vinculoHint.innerText = "✅ Vinculada a um item do Banco Global de Itens — o item criado sai pronto pra usar (com dano/efeito reais).";
            vinculoHint.classList.remove("hint-alerta");
        } else if (exige) {
            vinculoHint.innerText = `⚠️ ${selectPericia.value} precisa de um item vinculado — sem isso, o item criado sai só decorativo (sem tag, sem bônus, sem efeito nenhum — não funciona de verdade). Digite o nome pra buscar um item já cadastrado no Banco Global; se ele ainda não existir, cadastre-o primeiro (ex.: pelo botão "+ Adicionar item" com a opção "Salvar no Banco Global" marcada) e volte aqui pra vincular.`;
            vinculoHint.classList.add("hint-alerta");
        } else {
            vinculoHint.innerText = "Digite pra buscar um item já cadastrado no Banco Global de Itens (opcional).";
            vinculoHint.classList.remove("hint-alerta");
        }
    }

    inputNome.addEventListener("input", () => {
        itemGlobalIdVinculado = null;
        atualizarAvisoVinculo();
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
                atualizarAvisoVinculo();
                opcoesDiv.style.display = "none";
            });
            opcoesDiv.appendChild(div);
        });
        opcoesDiv.style.display = "block";
    });
    selectPericia.addEventListener("change", atualizarAvisoVinculo);
    atualizarAvisoVinculo();

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

    // "+ Criar item no Banco Global" — pra quando o item de verdade
    // ainda não existe no Banco (ver aviso de PERICIAS_QUE_EXIGEM_ITEM_
    // VINCULADO acima): sai pro modal de item de verdade (Biblioteca de
    // Itens, se Mestre; item de ficha com "Salvar no Banco Global" já
    // marcado, se jogador — só o Mestre mexe direto na Biblioteca) já
    // com o nome preenchido, e guarda tudo que já tinha sido digitado
    // aqui pra restaurar sozinho ao voltar (ver receitaAguardandoVinculo
    // e fecharModal).
    modal.querySelector("#btn-receita-criar-item").addEventListener("click", () => {
        const nomeRascunho = inputNome.value.trim();
        if (!nomeRascunho) { toast("Dê um nome ao item antes de criar — ele preenche o nome do item novo no Banco Global.", "erro"); return; }
        receitaAguardandoVinculo = {
            receitaExistente,
            opcoesSlot,
            rascunho: {
                nome: nomeRascunho,
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
                itemGlobalId: itemGlobalIdVinculado
            }
        };
        modal.remove();
        if (isMestre) {
            abrirModalNovo("itensGlobais");
        } else {
            abrirModalNovo("inventario");
        }
        // Pré-preenche depois que o modal de item já montou os campos
        // (abrirModalNovo/prepararModalParaLista rodam de forma síncrona
        // — este setTimeout(0) só garante que roda DEPOIS disso).
        setTimeout(() => {
            if (el.modalNome) el.modalNome.value = nomeRascunho;
            if (!isMestre && el.modalCampoSalvarBanco && el.modalCampoSalvarBanco.style.display !== "none") {
                el.modalSalvarBanco.checked = true;
            }
        }, 0);
    });


    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-receita").addEventListener("click", async () => {
        const nome = inputNome.value.trim();
        if (!nome) { toast("Dê um nome ao item a ser criado.", "erro"); return; }
        if (!itemGlobalIdVinculado && PERICIAS_QUE_EXIGEM_ITEM_VINCULADO.includes(selectPericia.value)) {
            toast(`Vincule essa receita a um item real do Banco Global antes de salvar — sem isso, o item criado por ela não vai ter tag, bônus nem efeito nenhum. Cadastre o item primeiro (pelo "+ Adicionar item" com "Salvar no Banco Global" marcado) e depois vincule pelo nome aqui.`, "erro");
            return;
        }
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
    montarGradeDarknetSeNecessario();
    CAMPOS_DARKNET_NOTAS.forEach(campo => {
        const input = document.querySelector(`[data-field="${campo}"]`);
        if (input && document.activeElement !== input) input.value = fichaAtual.dados[campo] || "";
    });
    renderizarCredenciaisDarknet();
    renderizarDeterminacoes();
    const notas = document.querySelector('[data-field="notas"]');
    if (notas && document.activeElement !== notas) notas.value = fichaAtual.notas || "";
}

// Monta a grade de caixas da Dark Net uma única vez (uma caixa por site
// do manual, exceto "The Corridor") — o campo de link/acesso de cada
// site segue o mesmo padrão data-field de sempre; a lista de
// credenciais de cada caixa é preenchida/atualizada por
// renderizarCredenciaisDarknet(). Também popula o <select> do botão
// único "Adicionar credenciais" do topo da aba.
let darknetGridMontada = false;
function montarGradeDarknetSeNecessario() {
    const grid = document.getElementById("darknet-grid");
    if (!grid || darknetGridMontada) return;

    grid.innerHTML = "";
    DARKNET_SITES.forEach(site => {
        const box = document.createElement("div");
        box.className = "darknet-site";
        box.dataset.site = site.id;

        const header = document.createElement("div");
        header.className = "darknet-site-header";
        header.textContent = site.nome;
        box.appendChild(header);

        const campo = document.createElement("div");
        campo.className = "campo";
        const label = document.createElement("label");
        label.setAttribute("for", `f-${site.id}`);
        label.textContent = "Link / acesso";
        const input = document.createElement("input");
        input.type = "text";
        input.id = `f-${site.id}`;
        input.dataset.field = site.id;
        if (site.placeholder) input.placeholder = site.placeholder;
        campo.appendChild(label);
        campo.appendChild(input);
        box.appendChild(campo);

        const listaLabel = document.createElement("div");
        listaLabel.className = "hint-inline";
        listaLabel.textContent = "Credenciais";
        box.appendChild(listaLabel);

        const lista = document.createElement("div");
        lista.className = "darknet-credenciais-lista";
        lista.dataset.siteCredenciais = site.id;
        box.appendChild(lista);

        grid.appendChild(box);
    });
    darknetGridMontada = true;

    const select = document.getElementById("darknet-credencial-site-select");
    if (select) {
        select.innerHTML = DARKNET_SITES.map(s => `<option value="${s.id}">${s.nome}</option>`).join("");
    }
}

// Credenciais da Dark Net: cada site guarda uma lista de anotações de
// texto livre (usuário/senha/nota — sem campos fixos, ver decisão do
// jogador). Fica em fichaAtual.darknetCredenciais = { [siteId]: [""...] },
// salvo inteiro a cada alteração (mesmo padrão de fichaAtual.determinacoes).
function credenciaisDoSite(siteId) {
    if (!fichaAtual.darknetCredenciais) fichaAtual.darknetCredenciais = {};
    if (!Array.isArray(fichaAtual.darknetCredenciais[siteId])) fichaAtual.darknetCredenciais[siteId] = [];
    return fichaAtual.darknetCredenciais[siteId];
}

const darknetCredenciaisContagemRenderizada = {};
function renderizarCredenciaisDarknet() {
    DARKNET_SITES.forEach(site => {
        const lista = document.querySelector(`[data-site-credenciais="${site.id}"]`);
        if (!lista) return;
        const valores = credenciaisDoSite(site.id);

        if (darknetCredenciaisContagemRenderizada[site.id] !== valores.length) {
            lista.innerHTML = "";
            if (valores.length === 0) {
                const vazio = document.createElement("div");
                vazio.className = "darknet-credenciais-vazio hint-inline";
                vazio.textContent = "Nenhuma credencial cadastrada.";
                lista.appendChild(vazio);
            } else {
                valores.forEach((_, idx) => lista.appendChild(criarLinhaCredencialDarknet(site.id, idx)));
            }
            darknetCredenciaisContagemRenderizada[site.id] = valores.length;
        }

        lista.querySelectorAll("input[data-darknet-credencial-index]").forEach(inp => {
            const idx = Number(inp.dataset.darknetCredencialIndex);
            if (document.activeElement !== inp) inp.value = valores[idx] || "";
        });
    });
}

function criarLinhaCredencialDarknet(siteId, idx) {
    const linha = document.createElement("div");
    linha.className = "darknet-credencial-item";

    const input = document.createElement("input");
    input.type = "text";
    input.dataset.darknetCredencial = siteId;
    input.dataset.darknetCredencialIndex = String(idx);
    input.placeholder = "usuário, senha, nota...";

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "btn-ghost darknet-credencial-remover";
    remover.title = "Remover credencial";
    remover.textContent = "✕";
    remover.addEventListener("click", () => removerCredencialDarknet(siteId, idx));

    linha.appendChild(input);
    linha.appendChild(remover);
    return linha;
}

function adicionarCredencialDarknet(siteId) {
    if (!fichaAtual || !idAtivo()) return;
    credenciaisDoSite(siteId).push("");
    agendarSalvamento("darknetCredenciais", fichaAtual.darknetCredenciais);
    renderizarCredenciaisDarknet();
    setTimeout(() => {
        const campos = document.querySelectorAll(`input[data-darknet-credencial="${siteId}"]`);
        const ultimo = campos[campos.length - 1];
        if (ultimo) ultimo.focus();
    }, 0);
}

function removerCredencialDarknet(siteId, idx) {
    if (!fichaAtual || !idAtivo()) return;
    credenciaisDoSite(siteId).splice(idx, 1);
    agendarSalvamento("darknetCredenciais", fichaAtual.darknetCredenciais);
    renderizarCredenciaisDarknet();
}

document.getElementById("btn-add-credencial-darknet")?.addEventListener("click", () => {
    const select = document.getElementById("darknet-credencial-site-select");
    if (!select || !select.value) return;
    adicionarCredencialDarknet(select.value);
});

// Grava o texto de cada credencial (mesmo padrão "set no array inteiro"
// usado pelas caixas de Determinação).
document.addEventListener("input", (e) => {
    const siteCred = e.target.dataset && e.target.dataset.darknetCredencial;
    const idxRaw = e.target.dataset && e.target.dataset.darknetCredencialIndex;
    if (siteCred === undefined || idxRaw === undefined || !idAtivo()) return;
    const idx = Number(idxRaw);
    const lista = credenciaisDoSite(siteCred);
    lista[idx] = e.target.value;
    agendarSalvamento("darknetCredenciais", fichaAtual.darknetCredenciais);
});

// Quantidade de slots de Determinação liberados pelo Nível do
// personagem: 3 no nível 1, 6 no nível 3, 9 no nível 6, 10 a partir do
// nível 9 (nível máximo da ficha).
function maxDeterminacoes(nivel) {
    const n = Number(nivel) || 1;
    if (n >= 9) return 10;
    if (n >= 6) return 9;
    if (n >= 3) return 6;
    return 3;
}

// Renderiza uma caixa de texto por Determinação (em vez do antigo
// textarea único de texto livre). A quantidade de caixas visíveis segue
// o Nível atual (ver maxDeterminacoes); se o personagem já tinha mais
// determinações escritas do que seu nível atual libera (ex: rebaixado
// pelo Mestre), essas caixas extras continuam aparecendo — só marcadas
// visualmente — pra nunca apagar texto já escrito pelo jogador.
//
// Fluxo de validação (Sistema de Aprovação do Mestre, mesma fila de
// remover_item/gastar_dinheiro/etc — ver mestre.js): depois de escrever
// o texto, o jogador clica em "Solicitar validação", que cria uma Ação
// Pendente (tipo "validar_determinacao"). Enquanto o Mestre não
// confirma, a caixa mostra "aguardando validação" e o botão some (pra
// não duplicar pedido). Confirmada, fichas/{id}/determinacoesValidadas
// marca aquele índice como true (ver confirmarAcaoPendente em
// mestre.js) — a partir daí só o Mestre edita a caixa (mesmo padrão de
// CAMPOS_SO_MESTRE), até clicar em "Liberar" ali mesmo na Determinação,
// o que desmarca a validação e devolve a edição pro jogador.
let determinacoesQtdRenderizada = null;
function renderizarDeterminacoes() {
    const lista = document.getElementById("determinacoes-lista");
    if (!lista) return;

    const nivel = fichaAtual.dados ? fichaAtual.dados.nivel : 1;
    const max = maxDeterminacoes(nivel);
    const valores = Array.isArray(fichaAtual.determinacoes) ? fichaAtual.determinacoes : [];
    const validadas = Array.isArray(fichaAtual.determinacoesValidadas) ? fichaAtual.determinacoesValidadas : [];
    const total = Math.max(max, valores.length);

    if (determinacoesQtdRenderizada !== total) {
        lista.innerHTML = "";
        for (let i = 0; i < total; i++) {
            const bloco = document.createElement("div");
            bloco.className = "determinacao-item" + (i >= max ? " determinacao-excedente" : "");
            bloco.dataset.determinacaoBloco = String(i);

            const label = document.createElement("label");
            label.setAttribute("for", `f-determinacao-${i}`);
            const numero = document.createElement("span");
            numero.textContent = (i + 1) + (i >= max ? "  (acima do limite do nível atual)" : "");
            const status = document.createElement("span");
            status.className = "determinacao-status";
            status.dataset.determinacaoStatus = String(i);
            label.appendChild(numero);
            label.appendChild(status);

            const textarea = document.createElement("textarea");
            textarea.id = `f-determinacao-${i}`;
            textarea.dataset.determinacaoIndex = String(i);
            textarea.placeholder = "Princípio, vínculo ou objetivo...";

            const acoes = document.createElement("div");
            acoes.className = "determinacao-acoes";

            const btnSolicitar = document.createElement("button");
            btnSolicitar.type = "button";
            btnSolicitar.className = "btn-lime";
            btnSolicitar.dataset.solicitarValidacaoDeterminacao = String(i);
            btnSolicitar.textContent = "Solicitar validação";
            btnSolicitar.addEventListener("click", () => solicitarValidacaoDeterminacao(i));

            const btnLiberar = document.createElement("button");
            btnLiberar.type = "button";
            btnLiberar.className = "btn-ghost";
            btnLiberar.dataset.liberarDeterminacao = String(i);
            btnLiberar.textContent = "Liberar";
            btnLiberar.addEventListener("click", () => liberarDeterminacao(i));

            acoes.appendChild(btnSolicitar);
            acoes.appendChild(btnLiberar);

            bloco.appendChild(label);
            bloco.appendChild(textarea);
            bloco.appendChild(acoes);
            lista.appendChild(bloco);
        }
        determinacoesQtdRenderizada = total;
    }

    lista.querySelectorAll("textarea[data-determinacao-index]").forEach(t => {
        const idx = Number(t.dataset.determinacaoIndex);
        const texto = valores[idx] || "";
        const validada = !!validadas[idx];
        const pendente = existePedidoValidacaoPendente(idx);
        const bloco = t.closest(".determinacao-item");

        if (document.activeElement !== t) t.value = texto;

        // Só o Mestre edita depois de validada (mesmo padrão de
        // CAMPOS_SO_MESTRE — ver listener de "input" mais abaixo, que
        // também bloqueia a gravação do lado do servidor).
        t.disabled = validada && !isMestre;
        if (bloco) bloco.classList.toggle("determinacao-validada", validada);

        const status = lista.querySelector(`[data-determinacao-status="${idx}"]`);
        if (status) {
            if (validada) {
                status.textContent = "✓ validada";
                status.className = "determinacao-status status-validada";
                status.style.display = "";
            } else if (pendente) {
                status.textContent = "aguardando validação";
                status.className = "determinacao-status status-aguardando";
                status.style.display = "";
            } else {
                status.textContent = "";
                status.style.display = "none";
            }
        }

        const btnSolicitar = lista.querySelector(`[data-solicitar-validacao-determinacao="${idx}"]`);
        if (btnSolicitar) {
            // Só o jogador solicita, só faz sentido com texto escrito, só
            // enquanto não estiver validada nem já aguardando resposta.
            btnSolicitar.style.display = (!isMestre && !validada && !pendente && texto.trim()) ? "" : "none";
        }

        const btnLiberar = lista.querySelector(`[data-liberar-determinacao="${idx}"]`);
        if (btnLiberar) {
            btnLiberar.style.display = (isMestre && validada) ? "" : "none";
        }
    });

    const aviso = document.getElementById("determinacoes-nivel-aviso");
    if (aviso) {
        aviso.textContent = `Nível ${nivel}: ${max} ${max === 1 ? "determinação disponível" : "determinações disponíveis"}.`;
    }

    atualizarContadorRolagemDeterminacoes();
}

// Existe algum pedido de validação (tipo "validar_determinacao") já na
// fila de Ações Pendentes pra essa ficha + índice? Consulta o cache já
// mantido por configurarAcoesPendentes (ver mais abaixo) — evita deixar
// o jogador disparar dois pedidos pra mesma caixa.
function existePedidoValidacaoPendente(indice) {
    return pendentesCache.some(a => a.tipo === "validar_determinacao" && a.fichaId === idAtivo() && Number(a.payload && a.payload.indice) === indice);
}

async function solicitarValidacaoDeterminacao(indice) {
    if (!fichaAtual || !idAtivo() || isMestre) return;
    const valores = Array.isArray(fichaAtual.determinacoes) ? fichaAtual.determinacoes : [];
    const texto = (valores[indice] || "").trim();
    if (!texto) { toast("Escreva o texto da Determinação antes de pedir validação.", "erro"); return; }
    const nomeJogador = fichaAtual?.config?.nomeExibicao || sessao?.nome || fichaAtualId;
    const trecho = texto.length > 80 ? texto.slice(0, 80) + "…" : texto;
    try {
        await criarAcaoPendente({
            tipo: "validar_determinacao",
            fichaId: fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} pede validação da Determinação ${indice + 1}: "${trecho}"`,
            payload: { indice, texto }
        });
        toast("Pedido de validação enviado ao Mestre.");
        renderizarDeterminacoes();
    } catch (err) {
        console.error(err);
        toast("Falha ao enviar o pedido de validação.", "erro");
    }
}

// Botão "Liberar" (só o Mestre vê) — desfaz a validação daquela
// Determinação específica, devolvendo a edição pro jogador. Precisa
// estar com a ficha desse jogador aberta (fichaAtualId apontando pra
// ela) pra saber em qual registro gravar.
async function liberarDeterminacao(indice) {
    if (!isMestre || !fichaAtual || !idAtivo()) return;
    if (!Array.isArray(fichaAtual.determinacoesValidadas)) fichaAtual.determinacoesValidadas = [];
    // Preenche eventuais buracos com `false` antes de gravar o array
    // inteiro de volta — um array esparso (com posições `undefined`)
    // vira objeto de chaves não-sequenciais no Realtime Database, e o
    // resto do código (Array.isArray(fichaAtual.determinacoesValidadas))
    // espera sempre um array de verdade. Mesmo cuidado tomado em
    // mestre.js/confirmarAcaoPendente (tipo "validar_determinacao").
    for (let i = 0; i <= indice; i++) {
        if (fichaAtual.determinacoesValidadas[i] === undefined) fichaAtual.determinacoesValidadas[i] = false;
    }
    fichaAtual.determinacoesValidadas[indice] = false;
    agendarSalvamento("determinacoesValidadas", fichaAtual.determinacoesValidadas);
    toast(`Determinação ${indice + 1} liberada para edição.`);
    renderizarDeterminacoes();
}

// ---------------------------------------------------------------------
// Rolagem de Determinações — com até 10 caixas liberadas por Nível, o
// botão de rolar pula direto de uma caixa PREENCHIDA pra outra (ignora
// as vazias no meio), tanto pra cima quanto pra baixo, dentro da lista
// rolável (.determinacoes-lista tem max-height + overflow-y no CSS).
// ---------------------------------------------------------------------
function caixasDeterminacaoPreenchidas() {
    const valores = Array.isArray(fichaAtual?.determinacoes) ? fichaAtual.determinacoes : [];
    const lista = document.getElementById("determinacoes-lista");
    if (!lista) return [];
    return Array.from(lista.querySelectorAll("textarea[data-determinacao-index]"))
        .map(t => Number(t.dataset.determinacaoIndex))
        .filter(idx => (valores[idx] || "").trim());
}

function atualizarContadorRolagemDeterminacoes() {
    const contador = document.getElementById("determinacoes-rolagem-contador");
    if (!contador) return;
    const preenchidas = caixasDeterminacaoPreenchidas();
    contador.textContent = preenchidas.length ? `${preenchidas.length} caixa(s) preenchida(s)` : "nenhuma caixa preenchida ainda";
    const btnAnterior = document.getElementById("btn-determinacao-anterior");
    const btnProxima = document.getElementById("btn-determinacao-proxima");
    if (btnAnterior) btnAnterior.disabled = preenchidas.length < 2;
    if (btnProxima) btnProxima.disabled = preenchidas.length < 2;
}

let determinacaoRolagemPos = -1;
function rolarParaDeterminacaoPreenchida(direcao) {
    const preenchidas = caixasDeterminacaoPreenchidas();
    if (!preenchidas.length) return;
    determinacaoRolagemPos = (determinacaoRolagemPos + direcao + preenchidas.length) % preenchidas.length;
    const idx = preenchidas[determinacaoRolagemPos];
    const bloco = document.querySelector(`[data-determinacao-bloco="${idx}"]`);
    if (bloco) bloco.scrollIntoView({ behavior: "smooth", block: "center" });
}

function configurarRolagemDeterminacoes() {
    const btnAnterior = document.getElementById("btn-determinacao-anterior");
    const btnProxima = document.getElementById("btn-determinacao-proxima");
    if (btnAnterior) btnAnterior.addEventListener("click", () => rolarParaDeterminacaoPreenchida(-1));
    if (btnProxima) btnProxima.addEventListener("click", () => rolarParaDeterminacaoPreenchida(1));
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
    // Caixas de Determinação: cada uma grava sua posição no array
    // fichaAtual.determinacoes, mas o array inteiro é salvo de uma vez
    // (mesmo padrão de "set na folha inteira" usado pelo resto da ficha).
    const detIndice = e.target.dataset && e.target.dataset.determinacaoIndex;
    if (detIndice !== undefined && idAtivo()) {
        const idx = Number(detIndice);
        // Determinação já validada: travada pro jogador (mesmo padrão de
        // CAMPOS_SO_MESTRE) — só edita de novo depois que o Mestre clicar
        // em "Liberar" (ver liberarDeterminacao). O `disabled` do campo já
        // barra isso na prática, mas revalida aqui também.
        const validadas = Array.isArray(fichaAtual.determinacoesValidadas) ? fichaAtual.determinacoesValidadas : [];
        if (validadas[idx] && !isMestre) { e.target.value = fichaAtual.determinacoes?.[idx] || ""; return; }
        if (!Array.isArray(fichaAtual.determinacoes)) fichaAtual.determinacoes = [];
        fichaAtual.determinacoes[idx] = e.target.value;
        agendarSalvamento("determinacoes", fichaAtual.determinacoes);
        return;
    }

    const campo = e.target.dataset && e.target.dataset.field;
    if (!campo || !idAtivo()) return;
    if (CAMPOS_SO_MESTRE.includes(campo) && !isMestre) return;

    if (campo === "notas") {
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
//
// Campo vazio (ex: selecionou o valor antigo pra apagar e digitar um novo)
// NÃO grava nada — só quando há um número de verdade no campo. Isso corrige
// um bug sério: antes, apagar o campo salvava `pvAtual: null` (o campo
// virava "" → Number("") tratado como null), e por convenção usada no
// resto do app (calcularEstadoSaude, o próprio render deste input, o
// painel de Recuperação de PVs) `pvAtual === null` significa "PV no
// máximo" — pensado só pra ficha nova/NPC recém-criado, que ainda não tem
// ferimento registrado. Como esse input salva sozinho a cada tecla (ver
// agendarSalvamento, debounce de 500ms), bastava o autosave disparar
// durante o instante em que o campo ficava vazio (ex: a pessoa se
// distraiu logo depois de apagar, antes de digitar o número novo) pra o
// personagem aparecer com PV cheio do nada pra todo mundo em tempo real
// — sem nenhum Timeskip, sem recuperação, sem nada. Se o campo for
// deixado vazio (blur), o handler de "blur" mais abaixo restaura o
// último valor válido.
document.addEventListener("input", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoKey;
    if (!recursoKey || !idAtivo()) return;
    if (e.target.value === "") return; // ainda digitando — não grava nada
    let valor = Number(e.target.value);
    if (Number.isNaN(valor)) return;

    const modificadoresPlanos = modificadoresAtuais();
    const derivados = calcularDerivados(fichaAtual.dados, modificadoresPlanos);
    const bonusExtra = recursoKey === "pv" ? (Number(fichaAtual.dados.pvBonusExtra) || 0) : 0;
    const totalCalculado = Math.round(derivados.recursos[recursoKey].total) + bonusExtra;
    const max = maximoComOverride(recursoKey, fichaAtual.dados, totalCalculado);
    if (valor > max) valor = max;
    if (valor < 0) valor = 0;
    if (Number(e.target.value) !== valor) e.target.value = valor; // reflete o clamp na tela

    const campo = recursoKey + "Atual";
    fichaAtual.dados[campo] = valor;
    agendarSalvamento(`dados/${campo}`, valor);
});

// Campo de PV/Energia atual deixado vazio ao sair dele (usuário apagou
// tudo e não chegou a digitar um número novo) — restaura o valor válido
// mais recente em vez de deixar "" (que nunca deveria significar "sem PV
// perdido", ver comentário acima). "blur" não faz bubble, por isso o
// listener precisa ser registrado em modo captura (terceiro argumento).
document.addEventListener("blur", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoKey;
    if (!recursoKey || e.target.value !== "") return;
    renderizarAtributos(modificadoresAtuais());
}, true);

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
    document.getElementById("btn-add-veiculo").addEventListener("click", () => abrirModalNovo("veiculos"));
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
    if (lista === "veiculos" && !isMestre) {
        toast("Só o Mestre pode adicionar veículos.", "erro");
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
    // Retoma o modal de receita que ficou pendente (ver comentário na
    // declaração de receitaAguardandoVinculo) — dispara em QUALQUER
    // fechamento do modal de item enquanto há uma receita esperando
    // (salvo com sucesso, cancelado, ou fechado clicando fora).
    if (receitaAguardandoVinculo) {
        const pendente = receitaAguardandoVinculo;
        const idBanco = idBancoParaRetomarReceita;
        receitaAguardandoVinculo = null;
        idBancoParaRetomarReceita = null;
        toast(idBanco
            ? `Item "${pendente.rascunho.nome}" criado no Banco Global — voltando pra receita já vinculada.`
            : `Voltando pra receita (nenhum item novo foi salvo no Banco Global, então ela continua sem vínculo).`);
        abrirModalCriarReceita(pendente.receitaExistente, pendente.opcoesSlot, {
            ...pendente.rascunho,
            itemGlobalId: idBanco || pendente.rascunho.itemGlobalId || null
        });
    }
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
    el.modalCampoVolume.style.display = "none";
    el.modalCampoTamanho.style.display = "none";
    el.modalCampoSubtipoPorte.style.display = "none";
    el.modalCampoCompartimentos.style.display = "none";
    el.modalCampoQuantidade.style.display = "none";
    el.modalCampoCategoriaItem.style.display = "none";
    el.modalCampoGuardarDentro.style.display = "none";
    el.modalCampoMaterialTipo.style.display = "none";
    el.modalCampoMaterialQualidade.style.display = "none";
    el.modalCampoMaterialQuantidade.style.display = "none";
    el.modalConfigArma.style.display = "none";
    el.modalConfigExplosivo.style.display = "none";
    el.modalConfigReducaoDano.style.display = "none";
    el.modalCampoSubstanciaVicio.style.display = "none";
    el.modalCampoTipoVeiculo.style.display = "none";
    el.modalConfigVeiculo.style.display = "none";
    el.modalSecaoNarrativa.style.display = "";
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
    } else if (lista === "veiculos") {
        prepararModalVeiculo(objetoExistente);
    } else {
        // vantagens, desvantagens, fatosUniversais, especializacoes: nome + descrição + modificadores
        el.modalNome.value = objetoExistente ? (objetoExistente.nome || "") : "";
        if (lista === "desvantagens" && el.modalCampoSubstanciaVicio) {
            const nomeAtual = el.modalNome.value;
            const ehVicio = /vic[ií]o/i.test(nomeAtual);
            el.modalCampoSubstanciaVicio.style.display = ehVicio ? "flex" : "none";
            el.modalSubstanciaVicio.value = objetoExistente ? (objetoExistente.substancia || "") : "";
        } else if (el.modalCampoSubstanciaVicio) {
            el.modalCampoSubstanciaVicio.style.display = "none";
            el.modalSubstanciaVicio.value = "";
        }
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
        toast("Edição de perícias só na Criação ou em Level Up pendente.", "erro");
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
// Preenche o select "Guardar dentro de" com TODOS os itens-recipiente
// (tag "recipiente") da ficha — idItemAtual (o próprio item sendo
// editado, null se for novo) fica de fora das opções, e também
// qualquer recipiente que já esteja guardado dentro dele (pra não
// formar um ciclo). valorSelecionado é o dentroDe atual do item
// (string vazia = nenhum, item solto/fora de qualquer recipiente).
// Guardar dentro de um recipiente move o item pra categoria dele
// automaticamente (ver o listener abaixo e salvarItemDoModal) — por
// isso a lista não é filtrada por categoria.
function popularSelectGuardarDentro(idItemAtual, valorSelecionado) {
    el.modalGuardarDentro.innerHTML = "";
    const optNenhum = document.createElement("option");
    optNenhum.value = "";
    optNenhum.innerText = "Nenhum (item solto)";
    el.modalGuardarDentro.appendChild(optNenhum);
    // Lista achatada por COMPARTIMENTO (não por container inteiro — ver
    // listaContainersDisponiveis/seção 5.1 do projeto-slots-porte.txt).
    // O value do <option> carrega os dois ids ("containerId::compartimentoId")
    // porque um mesmo container pode ter vários compartimentos.
    const compartimentosDisponiveis = listaContainersDisponiveis(fichaAtual, idItemAtual);
    compartimentosDisponiveis.forEach(comp => {
        const containerItem = fichaAtual.inventario[comp.containerId];
        const opt = document.createElement("option");
        opt.value = `${comp.containerId}::${comp.compartimentoId}`;
        opt.innerText = `${comp.containerNome} → ${comp.compartimentoNome} (${nomeCategoria(fichaAtual, containerItem?.categoria)})`;
        el.modalGuardarDentro.appendChild(opt);
    });
    // Se o compartimento salvo não está mais entre as opções (ex: o
    // container ou o compartimento foi excluído), volta pra "Nenhum".
    el.modalGuardarDentro.value = [...el.modalGuardarDentro.options].some(o => o.value === valorSelecionado)
        ? valorSelecionado
        : "";
    // Escolher um recipiente sincroniza a categoria do item com a dele
    // na hora (só visual — quem garante de verdade é salvarItemDoModal).
    el.modalGuardarDentro.onchange = () => {
        const [contId] = el.modalGuardarDentro.value ? el.modalGuardarDentro.value.split("::") : [""];
        const cont = contId ? fichaAtual.inventario[contId] : null;
        if (cont) el.modalCategoriaItem.value = cont.categoria || "levando";
    };
}

// Popula um <select> de tamanho (usado tanto pro tamanho do próprio
// item quanto pro "maior tamanho aceito" de um recipiente) com as
// categorias de TAMANHOS_ITEM. valorAtual cai pro primeiro da lista
// ("pequeno") se vier vazio/inválido — mantém o select sempre com uma
// opção válida selecionada, sem exigir escolha explícita pra itens
// sem tamanho definido (dado antigo, ver Fase 7).
function popularSelectTamanho(selectEl, valorAtual) {
    selectEl.innerHTML = "";
    TAMANHOS_ITEM.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        selectEl.appendChild(opt);
    });
    selectEl.value = (valorAtual && TAMANHOS_ITEM.some(t => t.key === valorAtual)) ? valorAtual : TAMANHOS_ITEM[0].key;
}

// Popula o <select> "Tipo de porte" (ver SUBTIPOS_PORTE em dados-manual.js
// e seção 5.1 do projeto-slots-porte.txt) — só aparece pra tag
// "recipiente". valorAtual cai pro primeiro da lista ("mochila") se vier
// vazio/inválido, mesmo default seguro usado por normalizarCompartimentos.
function popularSelectSubtipoPorte(selectEl, valorAtual) {
    selectEl.innerHTML = "";
    SUBTIPOS_PORTE.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.key;
        opt.innerText = s.label;
        selectEl.appendChild(opt);
    });
    selectEl.value = (valorAtual && SUBTIPOS_PORTE.some(s => s.key === valorAtual)) ? valorAtual : SUBTIPOS_PORTE[0].key;
}

// ---------------------------------------------------------------------
// Compartimentos de recipiente (linhas dinâmicas: nome + capacidade +
// tamanho máximo aceito — ver seção 5.1 do projeto-slots-porte.txt).
// Mesmo padrão das linhas de modificador (template clonado via JS).
// ---------------------------------------------------------------------
function montarListaCompartimentos(compartimentos) {
    el.modalListaCompartimentos.innerHTML = "";
    (compartimentos || []).forEach(c => adicionarLinhaCompartimento(c.id, c.nome, c.capacidadeVolume, c.tamanhoMaximoAceito));
}

function adicionarLinhaCompartimento(idExistente, nomeAtual, capacidadeAtual, tamanhoAtual) {
    const fragmento = el.templateCompartimento.content.cloneNode(true);
    const row = fragmento.querySelector(".compartimento-row");
    const nomeInput = row.querySelector(".compartimento-nome");
    const capacidadeInput = row.querySelector(".compartimento-capacidade");
    const tamanhoSelect = row.querySelector(".compartimento-tamanho");
    const btnRemover = row.querySelector(".compartimento-remover");

    // Guarda o id original num dataset — compartimento já existente
    // mantém o mesmo id ao editar (pra não invalidar item.compartimentoId
    // de itens já guardados nele); linha nova só ganha id no momento de
    // salvar (ver lerCompartimentosDoModal/gerarIdLocal).
    row.dataset.compartimentoId = idExistente || "";
    nomeInput.value = nomeAtual || "";
    capacidadeInput.value = capacidadeAtual ?? 0;
    popularSelectTamanho(tamanhoSelect, tamanhoAtual);

    btnRemover.addEventListener("click", () => {
        // Sempre deixa pelo menos 1 linha na lista — remover a última
        // restante seria salvar um container sem nenhum compartimento
        // (proibido, ver lerCompartimentosDoModal). O jogador pode
        // limpar o nome/zerar a capacidade se realmente não quiser
        // aquele compartimento, mas precisa ter algo.
        if (el.modalListaCompartimentos.querySelectorAll(".compartimento-row").length <= 1) {
            toast("O recipiente precisa de pelo menos 1 compartimento.", "erro");
            return;
        }
        // Passo 18 (seção 5.4 do projeto-slots-porte.txt) — bloqueia
        // remover um compartimento que ainda tem item guardado dentro
        // (ficaria com item.compartimentoId apontando pra um compartimento
        // que não existe mais). Só se aplica a compartimento JÁ EXISTENTE
        // (idExistente, guardado no dataset) de um item de INVENTÁRIO já
        // salvo (modalContexto.id) — linha recém-criada no editor (ainda
        // sem id persistido) nunca tem item guardado dentro dela, e item
        // do Banco Global não guarda item de ficha nenhum dentro.
        const idCompartimento = row.dataset.compartimentoId;
        if (idCompartimento && modalContexto && modalContexto.lista === "inventario" && modalContexto.id) {
            const itensDentro = Object.values(fichaAtual.inventario || {})
                .filter(it2 => it2.dentroDe === modalContexto.id && it2.compartimentoId === idCompartimento);
            if (itensDentro.length) {
                const nomes = itensDentro.map(it2 => it2.nome).join(", ");
                toast(`Não dá pra remover esse compartimento com item guardado dentro (${nomes}). Guarde ${itensDentro.length > 1 ? "os itens" : "o item"} em outro lugar primeiro.`, "erro");
                return;
            }
        }
        row.remove();
    });

    el.modalListaCompartimentos.appendChild(row);
}

function configurarCompartimentosGenerico() {
    document.getElementById("modal-add-compartimento").addEventListener("click", () => adicionarLinhaCompartimento(null, "", 0, null));
}

// Lê as linhas do editor e monta o array pra salvar no item. Retorna
// null (e mostra um toast) se a validação mínima falhar — quem chama
// deve tratar null como "não salvar". Compartimento sem nome preenchido
// ganha "Compartimento N" como nome padrão, pra nunca salvar em branco.
function lerCompartimentosDoModal() {
    const linhas = [...el.modalListaCompartimentos.querySelectorAll(".compartimento-row")];
    if (linhas.length === 0) {
        toast("Adicione pelo menos 1 compartimento a esse recipiente.", "erro");
        return null;
    }
    return linhas.map((row, i) => {
        const nomeDigitado = row.querySelector(".compartimento-nome").value.trim();
        return {
            id: row.dataset.compartimentoId || gerarIdLocal(),
            nome: nomeDigitado || `Compartimento ${i + 1}`,
            capacidadeVolume: Math.max(0, Number(row.querySelector(".compartimento-capacidade").value) || 0),
            tamanhoMaximoAceito: row.querySelector(".compartimento-tamanho").value || null
        };
    });
}

function prepararModalItem(existente, ehBanco) {
    // "chave" (ver plano-veiculos.txt, adendo "chave") só aparece no
    // dropdown se o item que está sendo editado JÁ é uma chave — assim
    // dá pra abrir e editar (nome, descrição) uma chave existente sem
    // perder a tag, mas ninguém consegue escolher "chave" do zero pra
    // um item novo ou pra trocar a tag de outro item já existente.
    const opcaoChave = el.modalTag.querySelector('option[data-chave-veiculo="1"]');
    if (opcaoChave) opcaoChave.style.display = (existente && existente.tag === "chave") ? "" : "none";

    el.modalCampoTag.style.display = "flex";
    el.modalCampoPeso.style.display = "flex";
    el.modalCampoVolume.style.display = "flex";
    el.modalCampoTamanho.style.display = "flex";
    // Item do Banco Global não tem "categoria" (levando/casa) nem
    // "guardar dentro de" — isso só existe quando o item está de fato
    // dentro de uma ficha.
    el.modalCampoCategoriaItem.style.display = ehBanco ? "none" : "flex";
    el.modalCampoGuardarDentro.style.display = ehBanco ? "none" : "flex";

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
        el.modalVolume.value = existente.volumeUnitario ?? existente.volume ?? 0;
        popularSelectTamanho(el.modalTamanho, existente.tamanho);
        if (!ehBanco) {
            el.modalCategoriaItem.value = existente.categoria || "levando";
            popularSelectGuardarDentro(modalContexto ? modalContexto.id : null, existente.dentroDe ? `${existente.dentroDe}::${existente.compartimentoId || "principal"}` : "");
        }
        atualizarCamposPorTag(existente.tag, existente.nivelTag, existente.arma, existente.periciaUso, existente.classeProtecao, existente.calibre, existente.reducoesDano, existente.carregador, existente.projetil, existente.localProtegido, { tipo: existente.materialTipo, qualidade: existente.materialQualidade, quantidade: existente.materialQuantidade }, !!existente.ehSaldo, existente.saldoValor, existente.quantidade, { subtipoPorte: existente.subtipoPorte, compartimentos: existente.compartimentos }, existente.maosNecessarias, existente.saldoNotas, existente.saldoMoedas);
        el.modalEquipavel.checked = !!existente.equipavel;
        // Reavalia com o checkbox "equipável" já no valor certo (a
        // chamada acima roda antes dessa linha, então via com o valor
        // antigo/resetado) e reflete se o item já estava equipado.
        atualizarCampoJaEquipar();
        el.modalJaEquipar.checked = el.modalCampoJaEquipar.style.display !== "none" && !existente.dentroDe && !!existente.equipada;
    } else {
        el.modalNome.value = "";
        el.modalTag.value = "";
        el.modalPeso.value = 0;
        el.modalVolume.value = 0;
        popularSelectTamanho(el.modalTamanho, null);
        if (!ehBanco) {
            el.modalCategoriaItem.value = categoriaInventarioAtiva || "levando";
            popularSelectGuardarDentro(null, "");
        }
        atualizarCamposPorTag("", null, null, null, null, null, null, null, null, null, null, false, 0, null, null, null);
        el.modalEquipavel.checked = false;
        el.modalJaEquipar.checked = false;
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
//
// Também mistura sugestões do Catálogo de Drogas (dados-manual.js,
// referência do manual) quando o texto digitado bate com o nome de uma
// substância conhecida — mas SÓ como ponto de partida: ao clicar, o
// efeito (buffs/debuffs) cai dentro da mesma caixa "Modificadores
// automáticos" (editável) que qualquer outro item usa, e o jogador/Mestre
// pode alterar, remover ou adicionar linhas livremente depois — nada
// fica travado/hardcoded no catálogo. Drogas homebrew que não existem
// no catálogo funcionam do mesmo jeito, só cadastrando os modificadores
// na mão.
function configurarAutocompleteItemBanco(ativo) {
    el.modalItemBancoOpcoes.style.display = "none";
    el.modalItemBancoOpcoes.innerHTML = "";
    el.modalNome.oninput = null;
    el.modalNome.onfocus = null;
    if (!ativo) return;

    const buscarDrogasCatalogo = (texto) => {
        const alvo = normalizarTextoBusca(texto);
        if (!alvo) return [];
        return CATALOGO_DROGAS.filter(d => normalizarTextoBusca(d.nome).includes(alvo)).slice(0, 8);
    };

    const renderSugestoes = () => {
        const encontrados = buscarItensGlobaisPorNome(itensGlobaisCache, el.modalNome.value);
        const drogas = buscarDrogasCatalogo(el.modalNome.value);
        el.modalItemBancoOpcoes.innerHTML = "";
        if (!encontrados.length && !drogas.length) { el.modalItemBancoOpcoes.style.display = "none"; return; }
        encontrados.forEach(it => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = `${it.nome} — ${rotuloTag(it.tag)}`;
            div.addEventListener("click", () => {
                el.modalNome.value = it.nome;
                el.modalTag.value = it.tag || "";
                el.modalPeso.value = it.pesoUnitario ?? it.peso ?? 0;
                el.modalVolume.value = it.volumeUnitario ?? it.volume ?? 0;
                popularSelectTamanho(el.modalTamanho, it.tamanho);
                el.modalDescricao.value = it.descricao || "";
                montarListaModificadores(it.modificadores || []);
                atualizarCamposPorTag(it.tag, it.nivelTag, it.arma, it.periciaUso, it.classeProtecao, it.calibre, it.reducoesDano, it.carregador, it.projetil, it.localProtegido, { tipo: it.materialTipo, qualidade: it.materialQualidade, quantidade: it.materialQuantidade }, !!it.ehSaldo, it.saldoValor, it.quantidade, { subtipoPorte: it.subtipoPorte, compartimentos: it.compartimentos }, it.maosNecessarias, it.saldoNotas, it.saldoMoedas);
                el.modalEquipavel.checked = !!it.equipavel;
                atualizarCampoJaEquipar();
                el.modalItemBancoOpcoes.style.display = "none";
                toast(`Preenchido a partir do Banco Global: "${it.nome}".`);
            });
            el.modalItemBancoOpcoes.appendChild(div);
        });
        drogas.forEach(d => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = `${d.nome} — Catálogo de Drogas (sugestão, editável)`;
            div.addEventListener("click", () => {
                el.modalNome.value = d.nome;
                el.modalTag.value = "droga";
                atualizarCamposPorTag("droga", null, null, null, null, null, null, null, null, null, null, false, 0, null, null, null);
                const notas = [d.efeito, d.testeVicio ? `Vício: ${d.testeVicio}` : "", d.testeOverdose ? `Overdose: ${d.testeOverdose}` : ""].filter(Boolean).join("\n");
                el.modalDescricao.value = notas;
                montarListaModificadores(d.modificadores || []);
                el.modalItemBancoOpcoes.style.display = "none";
                toast(`Sugestão preenchida a partir do Catálogo de Drogas: "${d.nome}" — os modificadores abaixo continuam editáveis.`);
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

        // "Usa carregador?" agora é escolha explícita (checkbox), não mais
        // automática por calibre — ver armaUsaCarregador em ficha.js. Item
        // sem esse campo ainda gravado (criado antes dele existir) cai no
        // fallback de sempre: só escopeta (12 gauge) não usava carregador.
        const calibreArmaAtual = (el.modalCampoCalibre.style.display !== "none") ? el.modalCalibre.value : null;
        if (el.modalArmaUsaCarregador) {
            el.modalArmaUsaCarregador.checked = (typeof cfg.usaCarregador === "boolean") ? cfg.usaCarregador : !ehCalibreEscopeta(calibreArmaAtual);
        }
        if (el.modalArmaTemCamaraExtra) el.modalArmaTemCamaraExtra.checked = !!cfg.temCamaraExtra;
        atualizarVisibilidadeCamposCarregador(cfg.carregadorId);
    }
}

// Mostra/esconde "Capacidade +1" e "Carregador anexado" conforme o
// checkbox "Usa carregador?" — e, se o carregador anexado ficar visível,
// repopula o select com os carregadores compatíveis do calibre atual.
function atualizarVisibilidadeCamposCarregador(carregadorIdAtual) {
    const usaCarregador = el.modalArmaUsaCarregador ? el.modalArmaUsaCarregador.checked : true;
    if (el.modalCampoArmaCamaraExtra) el.modalCampoArmaCamaraExtra.style.display = usaCarregador ? "flex" : "none";
    if (!usaCarregador && el.modalArmaTemCamaraExtra) el.modalArmaTemCamaraExtra.checked = false;
    if (el.modalCampoArmaCarregador) el.modalCampoArmaCarregador.style.display = usaCarregador ? "flex" : "none";
    if (usaCarregador) popularCarregadorAnexado(carregadorIdAtual);
}
document.getElementById("modal-arma-usa-carregador")?.addEventListener("change", () => {
    if (el.modalConfigArmaFogo.style.display === "none") return;
    atualizarVisibilidadeCamposCarregador(null);
});

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
// compatíveis no select "Carregador anexado" (só repopula se o campo
// estiver visível — depende do checkbox "Usa carregador?").
document.getElementById("modal-calibre")?.addEventListener("change", () => {
    if (el.modalConfigArmaFogo.style.display === "none") return;
    if (el.modalCampoArmaCarregador && el.modalCampoArmaCarregador.style.display !== "none") popularCarregadorAnexado(null);
    // Sugestão de default do checkbox "Dilacera" (item 7 do plano de
    // saúde/complicações) — só reaplica a sugestão quando o calibre
    // muda DE VERDADE nesta sessão do modal; a checkbox continua
    // 100% editável na sequência.
    if (el.modalArmaDilacera && el.modalCampoDilacera.style.display !== "none") {
        el.modalArmaDilacera.checked = calibreSugereDilacera(el.modalCalibre.value);
    }
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

function atualizarCamposPorTag(tagKey, nivelTag, armaConfig, periciaUsoAtual, classeProtecaoAtual, calibreAtual, reducoesDanoAtuais, carregadorConfigAtual, projetilConfigAtual, localProtegidoAtual, materialConfigAtual, ehSaldoAtual, saldoValorAtual, quantidadeAtual, recipienteConfigAtual, maosNecessariasAtual, saldoNotasAtual, saldoMoedasAtual) {
    // Equipável — checkbox independente da tag (qualquer item pode ser
    // marcado como equipável, não só armas). Some pra tag "Arma" e
    // "Explosivo": as duas já são sempre equipáveis por natureza (ver
    // ehArmaOuExplosivo em itemEhEquipavel, inventario.js), então o
    // checkbox ali seria redundante/confuso. Some também sem tag
    // nenhuma escolhida ainda.
    const podeMarcarEquipavel = !!tagKey && tagKey !== "arma" && tagKey !== "explosivo";
    el.modalCampoEquipavel.style.display = podeMarcarEquipavel ? "flex" : "none";
    if (!podeMarcarEquipavel) el.modalEquipavel.checked = false;

    // Mãos necessárias (ver item.maosNecessarias, seção 2.2 do
    // projeto-slots-porte.txt) — aparece pra qualquer item que possa vir
    // a ser segurado/equipado solto na mão: arma (sempre equipável),
    // qualquer outro item com o checkbox "equipável" disponível acima, ou
    // recipiente (a mochila em si não ocupa mão, mas "bolsa_mao" consome
    // — o campo fica aqui, genérico, e quem decide se conta ou não é
    // maosDisponiveis/itemPodeSerLevadoSolto em inventario.js). Some só
    // sem tag nenhuma escolhida ainda.
    const podeTerMaosNecessarias = tagKey === "arma" || tagKey === "explosivo" || podeMarcarEquipavel;
    el.modalCampoMaosNecessarias.style.display = podeTerMaosNecessarias ? "flex" : "none";
    if (podeTerMaosNecessarias) {
        const valor = Number(maosNecessariasAtual) === 2 ? "2" : "1";
        el.modalMaosNecessarias.value = valor;
    }

    const temNivel = tagTemNivel(tagKey);
    el.modalCampoNivelTag.style.display = temNivel ? "flex" : "none";
    if (temNivel) el.modalNivelTag.value = nivelTag || 1;

    // Carregador — capacidade máxima é definida na criação do item.
    const exigeCapacidade = tagExigeCapacidadeCarregador(tagKey);
    el.modalCampoCarregadorCapacidade.style.display = exigeCapacidade ? "flex" : "none";
    if (exigeCapacidade) el.modalCarregadorCapacidade.value = (carregadorConfigAtual && carregadorConfigAtual.capacidadeMax) || 10;

    // Recipiente (ex.: mochila) — tipo de porte + compartimentos (cada um
    // com sua própria capacidade em volume e maior tamanho aceito, ver
    // tamanhoCabe em dados-manual.js). Só aparecem pra tag "recipiente".
    const container = ehContainer(tagKey);
    el.modalCampoSubtipoPorte.style.display = container ? "flex" : "none";
    el.modalCampoCompartimentos.style.display = container ? "flex" : "none";
    if (container) {
        popularSelectSubtipoPorte(el.modalSubtipoPorte, recipienteConfigAtual && recipienteConfigAtual.subtipoPorte);
        // Item novo (ou container sem compartimentos ainda, ex: dado
        // legado que por algum motivo não passou pela migração) começa
        // com 1 linha em branco pra não deixar salvar sem nenhuma —
        // ver validação mínima em lerCompartimentosDoModal.
        const compartimentosAtuais = (recipienteConfigAtual && recipienteConfigAtual.compartimentos && recipienteConfigAtual.compartimentos.length)
            ? recipienteConfigAtual.compartimentos
            : [{ nome: "", capacidadeVolume: 0, tamanhoMaximoAceito: null }];
        montarListaCompartimentos(compartimentosAtuais);
    }

    // Projétil/munição — quantidade de rounds que ESTE item representa.
    // Editável direto no modal: assim dá pra ter um único item "9mm"
    // com 60 unidades, por exemplo, em vez de precisar criar/duplicar
    // vários itens do mesmo calibre só pra empilhar munição.
    const exigeQuantidadeProjetil = tagExigeQuantidadeProjetil(tagKey);
    el.modalCampoProjetilQuantidade.style.display = exigeQuantidadeProjetil ? "flex" : "none";
    if (exigeQuantidadeProjetil) {
        el.modalProjetilQuantidade.value = (projetilConfigAtual && projetilConfigAtual.quantidade) ?? 1;
        atualizarVolumeTotalProjetilModal();
    }

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
    // cripto, um celular com app de banco...) ou Dinheiro físico (maço
    // de cash). Independente da perícia vinculada acima: um item pode
    // guardar dinheiro sem servir pra Hackear/Programar, e vice-versa.
    // Ver ehTagQuePodeSerSaldo e todosOsSaldos em dados-manual.js.
    // Eletrônico guarda DOIS saldos separados do mesmo item (notas e
    // moedas digitais — cada um gasto/movido à parte na aba Finanças);
    // Dinheiro físico continua com um valor só.
    const podeSerSaldo = ehTagQuePodeSerSaldo(tagKey);
    const saldoEhEletronico = tagKey === "eletronico";
    el.modalCampoItemSaldo.style.display = podeSerSaldo ? "flex" : "none";
    if (podeSerSaldo) {
        el.modalItemEhSaldo.checked = !!ehSaldoAtual;
        el.modalItemSaldoValor.value = saldoValorAtual ?? 0;
        el.modalItemSaldoNotas.value = saldoNotasAtual ?? 0;
        el.modalItemSaldoMoedas.value = saldoMoedasAtual ?? 0;
        el.modalItemSaldoValorBloco.style.display = (ehSaldoAtual && !saldoEhEletronico) ? "block" : "none";
        el.modalItemSaldoEletronicoBloco.style.display = (ehSaldoAtual && saldoEhEletronico) ? "block" : "none";
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
    if (el.modalLabelVolume) {
        el.modalLabelVolume.textContent = ehProjetil(tagKey)
            ? "Volume unitário (por projétil)"
            : (temQuantidade ? "Volume unitário" : "Volume");
    }
    if (temQuantidade) {
        el.modalQuantidade.value = Math.max(1, Number(quantidadeAtual) || 1);
        atualizarPesoTotalModal();
    }

    // Ferramenta de Criação (geral) — ver ehFerramentaCriacaoGeral em
    // dados-manual.js: não tem select de perícia (não fica travada numa
    // só), só um aviso explicando que a escolha é feita ao usar o item.
    el.hintFerramentaCriacaoGeral.style.display = ehFerramentaCriacaoGeral(tagKey) ? "block" : "none";

    const armaOuExplosivo = ehArmaOuExplosivo(tagKey);
    const explosivoItem = ehExplosivo(tagKey);
    const arma = ehArma(tagKey);
    el.modalConfigArma.style.display = armaOuExplosivo ? "block" : "none";
    if (armaOuExplosivo) {
        el.modalArmaDanoBase.value = (armaConfig && armaConfig.danoBase) ?? 0;
        // Explosivo já entra com "Explosão" pré-selecionado (é o tipo de
        // dano correto pra bomba/granada na imensa maioria dos casos) —
        // ainda dá pra trocar manualmente se a receita pedir outro tipo
        // (ex.: uma bomba de fósforo branco = Fogo).
        el.modalArmaTipoDano.value = (armaConfig && armaConfig.tipoDano) || (explosivoItem ? "explosao" : TIPOS_DANO[0].key);
        // Escala (multiplicador sobre atributo) é conceito de arma branca
        // corpo a corpo — o dano de uma explosão não escala com quem a
        // arremessa, então o campo (escondido pra Explosivo pela mesma
        // regra de arma de fogo, ver atualizarVisibilidadeArmaFogo) nunca
        // é preenchido/lido pra essa tag.
        el.modalArmaEscala.value = (armaConfig && armaConfig.escala) || "";
        montarModificacoesArma((armaConfig && armaConfig.modificacoesArma) || []);
    }

    // Configuração do explosivo (manual pg. 81-82) — só pra tag
    // "explosivo". Popula os selects de "modelo padrão" (autopreenchimento)
    // e "módulo de detonação" só a primeira vez (não recriar toda hora
    // perde o listener); os VALORES atuais (dificuldade de armar, raio,
    // módulo escolhido) são sempre re-sincronizados com o item.
    el.modalConfigExplosivo.style.display = explosivoItem ? "block" : "none";
    if (explosivoItem) {
        if (!el.modalExplosivoModelo.dataset.montado) {
            EXPLOSIVOS_PADRAO.forEach(modelo => {
                const opt = document.createElement("option");
                opt.value = modelo.nome;
                opt.innerText = `${modelo.nome} (Nível ${modelo.nivel} — ${modelo.dano} dano, raio ${modelo.raio}m)`;
                el.modalExplosivoModelo.appendChild(opt);
            });
            el.modalExplosivoModelo.dataset.montado = "1";
            el.modalExplosivoModelo.addEventListener("change", () => {
                const modelo = EXPLOSIVOS_PADRAO.find(m => m.nome === el.modalExplosivoModelo.value);
                if (!modelo) return;
                el.modalArmaDanoBase.value = modelo.dano;
                el.modalExplosivoDificuldadeArmar.value = modelo.dificuldadeArmar;
                el.modalExplosivoRaio.value = modelo.raio;
                if (el.modalNivelTag) el.modalNivelTag.value = String(modelo.nivel);
                if (!el.modalDescricao.value.trim()) el.modalDescricao.value = modelo.descricao;
            });
        }
        if (!el.modalExplosivoModulo.dataset.montado) {
            MODULOS_DETONACAO.forEach(mod => {
                const opt = document.createElement("option");
                opt.value = mod.nome;
                opt.innerText = `${mod.nome} (Nível ${mod.nivel})`;
                el.modalExplosivoModulo.appendChild(opt);
            });
            el.modalExplosivoModulo.dataset.montado = "1";
        }
        el.modalExplosivoModelo.value = (armaConfig && armaConfig.modeloPadrao) || "";
        el.modalExplosivoDificuldadeArmar.value = (armaConfig && armaConfig.dificuldadeArmar) ?? 0;
        el.modalExplosivoRaio.value = (armaConfig && armaConfig.raio) ?? 0;
        el.modalExplosivoModulo.value = (armaConfig && armaConfig.moduloDetonacao) || "";
    }
    // Tipo de dano extra — só faz sentido em arma branca (corpo a corpo,
    // não-fogo); arma de fogo dispara sempre o mesmo tipo de projétil.
    // Usa o valor JÁ POPULADO do select de perícia (acima) em vez do
    // parâmetro cru — assim fica certo mesmo quando a tag acabou de
    // mudar e a perícia caiu no primeiro item da lista por padrão.
    const ehArmaBranca = arma && exigePericia && !ehArmaDeFogo(el.modalPericiaUso.value);
    el.modalCampoTipoDanoExtra.style.display = ehArmaBranca ? "flex" : "none";
    if (ehArmaBranca) el.modalArmaTipoDanoExtra.value = (armaConfig && armaConfig.tipoDanoExtra) || "";

    // Dilaceração (item 7 do plano de saúde/complicações) — só faz
    // sentido em arma de verdade (fogo ou branca); explosão dilacera
    // automaticamente por tipo de dano, sem checkbox (ver mestre.js).
    // Checkbox sempre editável — só nasce PRÉ-marcada (sugestão, não
    // trava nada) quando o item ainda não tem esse campo salvo E o
    // calibre escolhido for Classe V. "Dilacera em golpe normal" só
    // aparece em arma branca.
    el.modalCampoDilacera.style.display = arma ? "flex" : "none";
    if (arma) {
        const dilaceraSalvo = armaConfig ? armaConfig.dilacera : undefined;
        el.modalArmaDilacera.checked = (dilaceraSalvo !== undefined && dilaceraSalvo !== null)
            ? !!dilaceraSalvo
            : calibreSugereDilacera(calibreAtual);
    }
    el.modalCampoDilaceraGolpeNormal.style.display = ehArmaBranca ? "flex" : "none";
    if (ehArmaBranca) el.modalArmaDilaceraGolpeNormal.checked = !!(armaConfig && armaConfig.dilaceraEmGolpeNormal);

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

    // "Já equipado" (atalho de criação) — some/aparece junto com tudo
    // acima porque depende do mesmo estado (tag, checkbox "equipável",
    // subtipo de porte do recipiente). Ver atualizarCampoJaEquipar.
    atualizarCampoJaEquipar();
}

// Mostra o campo "Já entra equipado" quando o item sendo montado no
// modal tem algum lugar físico válido pra existir solto em "levando":
// arma/explosivo (sempre equipável), recipiente cujo subtipo de porte
// é vestido/carregado (roupa, cinto, mochila, bolsa de mão — mesma
// lista aceita por itemPodeSerLevadoSolto em inventario.js), ou
// QUALQUER outro item comum — a mão aceita qualquer item solto, marcado
// "equipável" ou não (ver itemPodeEquipar/itemPodeSerLevadoSolto em
// inventario.js: "equipável" hoje só trava se o item PRECISA estar
// equipado pra poder ser usado, não se ele PODE ir pra mão). Desmarca o
// checkbox sempre que o campo some, pra não guardar uma escolha
// "fantasma" de quando ele ainda estava visível.
function atualizarCampoJaEquipar() {
    const tagKey = el.modalTag.value;
    const elegivel = !tagKey ? false
        : ehContainer(tagKey) ? ["roupa", "cinto", "mochila", "bolsa_mao"].includes(el.modalSubtipoPorte.value)
        : true; // arma/explosivo ou qualquer item comum — todos podem ir pra mão
    el.modalCampoJaEquipar.style.display = elegivel ? "flex" : "none";
    if (!elegivel) el.modalJaEquipar.checked = false;
}

document.getElementById("modal-tag")?.addEventListener("change", (e) => {
    atualizarCamposPorTag(e.target.value, null, null, null, null, null, null, null, null, null, null, false, 0, null, null, null);
});

document.getElementById("modal-equipavel")?.addEventListener("change", atualizarCampoJaEquipar);
document.getElementById("modal-subtipo-porte")?.addEventListener("change", atualizarCampoJaEquipar);

document.getElementById("modal-item-eh-saldo")?.addEventListener("change", (e) => {
    const saldoEhEletronico = el.modalTag.value === "eletronico";
    document.getElementById("modal-item-saldo-valor-bloco").style.display = (e.target.checked && !saldoEhEletronico) ? "block" : "none";
    document.getElementById("modal-item-saldo-eletronico-bloco").style.display = (e.target.checked && saldoEhEletronico) ? "block" : "none";
});

// Recalcula e mostra o "Peso total" (Peso unitário × Quantidade) ao
// vivo, enquanto o jogador digita — ver tagTemQuantidadeGeral em
// dados-manual.js. Só é chamada quando o campo de quantidade está
// visível (item de uma tag que aceita quantidade genérica).
function atualizarPesoTotalModal() {
    const unitario = Math.max(0, Number(el.modalPeso.value) || 0);
    const volumeUnitario = Math.max(0, Number(el.modalVolume.value) || 0);
    const quantidade = Math.max(1, Number(el.modalQuantidade.value) || 1);
    el.modalQuantidadePesoTotal.textContent = `Peso total: ${(unitario * quantidade).toFixed(2).replace(/\.?0+$/, "") || "0"} kg`;
    el.modalQuantidadeVolumeTotal.textContent = `Volume total: ${(volumeUnitario * quantidade).toFixed(2).replace(/\.?0+$/, "") || "0"}`;
}
document.getElementById("modal-peso")?.addEventListener("input", () => {
    if (el.modalCampoQuantidade.style.display !== "none") atualizarPesoTotalModal();
});
document.getElementById("modal-volume")?.addEventListener("input", () => {
    if (el.modalCampoQuantidade.style.display !== "none") atualizarPesoTotalModal();
    if (el.modalCampoProjetilQuantidade.style.display !== "none") atualizarVolumeTotalProjetilModal();
});
document.getElementById("modal-quantidade")?.addEventListener("input", () => {
    if (Number(el.modalQuantidade.value) < 1) el.modalQuantidade.value = 1;
    atualizarPesoTotalModal();
});

// Volume total de munição (Fase 4) — mesma fórmula de "unitário ×
// quantidade" de sempre, mas puxando a quantidade do campo aninhado
// próprio de projétil (modal-projetil-quantidade), não do campo de
// quantidade genérico (que fica escondido pra essa tag — ver
// tagTemQuantidadeGeral em dados-manual.js). Math.floor é o que faz o
// "estoque pequeno não ocupa espaço" acontecer sozinho: volumeUnitario
// baixo (ex.: 0.1) vezes poucas balas arredonda pra 0, sem precisar de
// nenhum if especial pra "abaixo de N não conta".
function atualizarVolumeTotalProjetilModal() {
    const volumeUnitario = Math.max(0, Number(el.modalVolume.value) || 0);
    const quantidadeProjetil = Math.max(0, Number(el.modalProjetilQuantidade.value) || 0);
    el.modalProjetilVolumeTotal.textContent = `Volume total: ${Math.floor(volumeUnitario * quantidadeProjetil)}`;
}
document.getElementById("modal-projetil-quantidade")?.addEventListener("input", () => {
    if (Number(el.modalProjetilQuantidade.value) < 0) el.modalProjetilQuantidade.value = 0;
    atualizarVolumeTotalProjetilModal();
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
    // "Dilacera em golpe normal" segue a mesma regra (só arma branca) —
    // ver atualizarCamposPorTag.
    if (el.modalCampoDilaceraGolpeNormal) {
        el.modalCampoDilaceraGolpeNormal.style.display = ehArmaBrancaAgora ? "flex" : "none";
        if (!ehArmaBrancaAgora) el.modalArmaDilaceraGolpeNormal.checked = false;
    }
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
// Modal: VEÍCULO — nome livre + tipo (periodicidade) + os 5 atributos
// com escala fixa (ver plano-veiculos.txt, fase 5). Sem descrição nem
// modificadores estruturados: esses dois campos ficam escondidos (ver
// esconderTodosCamposEspeciais) porque não fazem parte do modelo de
// dados de Veículo — os efeitos derivados vêm de calcularModificadoresVeiculo
// (regras.js), não do sistema genérico de modificadores.
// ---------------------------------------------------------------------
function prepararModalVeiculo(existente) {
    el.modalCampoTipoVeiculo.style.display = "flex";
    el.modalConfigVeiculo.style.display = "block";
    el.modalSecaoNarrativa.style.display = "none";

    el.modalNome.value = existente ? (existente.nome || "") : "";

    if (!el.modalTipoVeiculo.options.length) {
        el.modalTipoVeiculo.innerHTML = TIPOS_VEICULO.map(t => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join("");
    }
    el.modalTipoVeiculo.value = existente ? (existente.tipo || "pessoal") : "pessoal";

    const atributosExistentes = existente ? (existente.atributos || {}) : {};
    el.modalVeiculoAtributos.innerHTML = ATRIBUTOS_VEICULO.map(chave => {
        const escala = escalaVeiculo(chave);
        const nivelAtual = Number(atributosExistentes[chave]) || 0;
        const opcoes = escala.niveis.map(n => `<option value="${n.nivel}" ${n.nivel === nivelAtual ? "selected" : ""}>${n.nivel} — ${escapeHtml(n.efeito)}</option>`).join("");
        return `
            <div class="modal-field">
                <label for="modal-veiculo-attr-${chave}">${escapeHtml(escala.label)}</label>
                <select id="modal-veiculo-attr-${chave}" data-veiculo-atributo="${chave}">${opcoes}</select>
            </div>
        `;
    }).join("");

    // Trava (ver plano-veiculos.txt, adendo "chave"): só faz sentido
    // mexer nisso editando um veículo que já existe — veículo novo
    // sempre nasce trancado, com chave nova criada junto (ver
    // salvarVeiculoDoModal), então não tem o que escolher aqui ainda.
    // "Repor chave" cobre o caso de a chave original ter sido perdida
    // (destruída, dada pro NPC errado, etc.) sem precisar apagar e
    // recriar o veículo inteiro.
    // Remove um campo de trava deixado por uma edição anterior (senão
    // abrir o modal pra um segundo veículo empilha um segundo checkbox
    // com o mesmo id, e getElementById só acha o primeiro — bug clássico
    // de innerHTML acumulando em vez de substituir).
    const campoTrancaAnterior = el.modalConfigVeiculo.querySelector("[data-veiculo-campo-tranca]");
    if (campoTrancaAnterior) campoTrancaAnterior.remove();

    if (existente) {
        el.modalConfigVeiculo.insertAdjacentHTML("beforeend", `
            <div class="modal-field" data-veiculo-campo-tranca>
                <label><input type="checkbox" id="modal-veiculo-trancado" ${existente.trancado ? "checked" : ""}> Veículo trancado</label>
                <button type="button" class="btn-ghost" id="btn-repor-chave-veiculo">Repor chave perdida</button>
            </div>
        `);
        document.getElementById("btn-repor-chave-veiculo").addEventListener("click", () => reporChaveVeiculo(modalContexto?.id));
    }
}

// Repor chave perdida (Mestre) — cria um NOVO item "chave" no
// inventário desta ficha apontando pro mesmo veículo. Não mexe no
// item antigo (se ele ainda existir em algum canto, continua também
// funcionando — veiculoTemChaveDisponivel em regras.js não se importa
// com QUANTAS chaves existem, só se existe pelo menos uma).
async function reporChaveVeiculo(veiculoId) {
    if (!isMestre || !veiculoId || !fichaAtual) return;
    const v = fichaAtual.veiculos && fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const novaChaveId = gerarIdLocal();
    const novaChave = {
        nome: `Chave: ${v.nome}`, descricao: "", modificadores: [], ativo: true,
        tag: "chave", nivelTag: null, peso: 0.05, pesoUnitario: null, volume: 0, volumeUnitario: null,
        tamanho: "pequeno", capacidadeVolume: null, tamanhoMaximoAceito: null, quantidade: null,
        categoria: "levando", dentroDe: null, periciaUso: null, ehSaldo: false, saldoValor: 0,
        classeProtecao: null, calibre: null, reducoesDano: [], localProtegido: null, arma: null,
        carregador: null, projetil: null, equipavel: false, equipada: false,
        materialTipo: null, materialQualidade: null, materialQuantidade: null,
        veiculoId
    };
    if (!fichaAtual.inventario) fichaAtual.inventario = {};
    fichaAtual.inventario[novaChaveId] = novaChave;
    await update(ref(db, `${caminhoBase()}/inventario/${novaChaveId}`), novaChave);
    toast("Nova chave criada no inventário.");
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

    // fichaAtual pode ser null aqui (Mestre criando item direto no Banco
    // Global sem nenhuma ficha aberta) — sem essa proteção, o acesso a
    // .pericias quebrava a função inteira. Também não é mais a fonte
    // principal das perícias oferecidas no seletor: listaAlvosModificador
    // (regras.js) já usa o catálogo fechado do manual por padrão, isso
    // aqui só cobre o caso raro de a ficha ter algum nome fora do catálogo.
    const pericias = Object.values((fichaAtual && fichaAtual.pericias) || {});
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
    if (lista === "veiculos") {
        await salvarVeiculoDoModal(id);
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
    const modificadoresRegistro = lerModificadoresDoModal();
    // Registro NOVO com modificador estruturado nasce DESLIGADO — precisa
    // do clique no botão "Ativar" pra valer (ver btn-toggle-ativo em
    // renderizarListaSimples). Sem efeito nenhum cadastrado, o campo
    // `ativo` não é usado em lugar nenhum, então mantém true por padrão.
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: modificadoresRegistro,
        ativo: existente.ativo ?? (modificadoresRegistro.length ? false : true)
    };
    // Desvantagem "Vício": guarda qual substância é o objeto do vício.
    // `diaIndiceUltimoUso` só é setado na primeira vez que uma substância
    // é informada (criação, ou edição que preenche o campo pela primeira
    // vez) — depois disso, quem zera a contagem é o botão "Consumir" do
    // item de droga correspondente (ver consumirDroga), não o modal.
    if (lista === "desvantagens" && el.modalCampoSubstanciaVicio && el.modalCampoSubstanciaVicio.style.display !== "none") {
        const substancia = el.modalSubstanciaVicio.value.trim();
        if (substancia) {
            registro.substancia = substancia;
            registro.diaIndiceUltimoUso = existente.substancia
                ? existente.diaIndiceUltimoUso
                : (calendarioAtual ? calendarioAtual.diaIndice : 0);
        }
    }
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
        toast("Edição de perícias só na Criação ou em Level Up pendente.", "erro");
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
// Monta o objeto `arma` a partir do modal — compartilhado entre item de
// inventário e item do Banco Global. Sempre grava danoBase (número) e
// tipoDano; escala só se não for arma de fogo; e as características de
// Arma de Fogo (capacidade, disparos por turno, precisão, dificuldade
// de acerto, alcance, recuo, efeito extra) só quando a perícia vinculada
// for uma perícia de Arma de Fogo. `armaExistente` é o `arma` do item
// antes de editar (ou null pra item novo/Banco Global) — só serve pra
// preservar `camaraCarregada`, que é estado de jogo (bala já carregada
// na câmara), não um campo que o modal deixa o jogador escolher direto.
function lerConfigArmaDoModal(periciaUso, calibre, armaExistente, tag) {
    const ehFogo = ehArmaDeFogo(periciaUso);
    const armaTag = ehArma(tag);
    // "Usa carregador?" é escolha explícita (checkbox) desde que deixou
    // de ser automática por calibre — ver armaUsaCarregador. Sem
    // carregador, nunca grava carregadorId, mesmo que o select escondido
    // ainda tenha um valor antigo.
    const usaCarregador = ehFogo && !!(el.modalArmaUsaCarregador ? el.modalArmaUsaCarregador.checked : true);
    const temCamaraExtra = ehFogo && usaCarregador && !!(el.modalArmaTemCamaraExtra && el.modalArmaTemCamaraExtra.checked);
    return {
        danoBase: Number(el.modalArmaDanoBase.value) || 0,
        tipoDano: el.modalArmaTipoDano.value,
        // Tipo de dano extra — só se salva em arma branca (não-fogo) e só
        // se algo de fato foi escolhido (select vazio = "-- nenhum --").
        // Ver escolha na hora de atacar em abrirModalSelecionarAlvo/
        // resolverAtaque e em abrirModalArremessar/resolverArremessar.
        tipoDanoExtra: (!ehFogo && el.modalArmaTipoDanoExtra.value) ? el.modalArmaTipoDanoExtra.value : null,
        escala: ehFogo ? null : (el.modalArmaEscala.value || null),
        // Dilaceração (item 7 do plano de saúde/complicações) — só se
        // aplica a arma de verdade (fogo ou branca), nunca a explosivo
        // (que dilacera automaticamente por dano, sem checkbox).
        dilacera: armaTag ? !!el.modalArmaDilacera.checked : false,
        dilaceraEmGolpeNormal: (armaTag && !ehFogo) ? !!el.modalArmaDilaceraGolpeNormal.checked : false,
        modificacoesArma: lerModificacoesArmaDoModal(),
        capacidade: ehFogo ? (Number(el.modalArmaCapacidade.value) || 0) : null,
        disparosPorTurno: ehFogo ? (Number(el.modalArmaDisparosTurno.value) || 1) : null,
        precisao: ehFogo ? (Number(el.modalArmaPrecisao.value) || 0) : null,
        dificuldadeAcerto: ehFogo ? (Number(el.modalArmaDificuldadeAcerto.value) || 0) : null,
        alcance: ehFogo ? (el.modalArmaAlcance.value || null) : null,
        recuo: ehFogo ? (el.modalArmaRecuo.value || null) : null,
        efeitoExtra: ehFogo ? el.modalArmaEfeitoExtra.value.trim() : "",
        usaCarregador,
        carregadorId: usaCarregador ? (el.modalArmaCarregador.value || null) : null,
        temCamaraExtra,
        camaraCarregada: temCamaraExtra ? !!(armaExistente && armaExistente.camaraCarregada) : false,
        // Explosivo (manual pg. 81-82): dificuldadeArmar é a que fica
        // gravada no ITEM pronto e é rolada de novo toda vez que ele é
        // armado/usado (diferente da dificuldade de CRIAR, que já foi
        // testada uma vez lá na receita). raio e módulo são referência
        // pro Mestre/jogador na hora de narrar o uso — ver
        // abrirModalArmarExplosivo.
        modeloPadrao: tag === "explosivo" ? (el.modalExplosivoModelo.value || null) : null,
        dificuldadeArmar: tag === "explosivo" ? (Number(el.modalExplosivoDificuldadeArmar.value) || 0) : null,
        raio: tag === "explosivo" ? (Number(el.modalExplosivoRaio.value) || 0) : null,
        moduloDetonacao: tag === "explosivo" ? (el.modalExplosivoModulo.value || null) : null
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

// Lê se o item foi marcado como carteira digital e, se sim, o(s)
// saldo(s) atuais — só se aplica a tags que podem ser saldo (eletrônico
// e dinheiro, ver ehTagQuePodeSerSaldo em dados-manual.js). Eletrônico
// grava DOIS campos (saldoNotas/saldoMoedas — saldos separados do mesmo
// item, ver todosOsSaldos); dinheiro físico continua com um só
// (saldoValor). Retorna tudo já pronto pra gravar no item (ehSaldo
// false/undefined não deve deixar nenhum dos campos com lixo de uma
// marcação anterior).
function lerSaldoDoItemDoModal(tag) {
    if (!ehTagQuePodeSerSaldo(tag) || !el.modalItemEhSaldo.checked) {
        return { ehSaldo: false, saldoValor: null, saldoNotas: null, saldoMoedas: null };
    }
    if (tag === "eletronico") {
        return {
            ehSaldo: true, saldoValor: null,
            saldoNotas: Number(el.modalItemSaldoNotas.value) || 0,
            saldoMoedas: Number(el.modalItemSaldoMoedas.value) || 0
        };
    }
    return { ehSaldo: true, saldoValor: Number(el.modalItemSaldoValor.value) || 0, saldoNotas: null, saldoMoedas: null };
}

// Lê peso, volume e quantidade do modal e devolve tudo pronto pra
// gravar no item: `peso`/`volume` continuam sendo os totais do
// registro (é o que pesoTotalPorCategoria, volumeTotalDentroDe e o
// resto do código já somam/leem direto, sem precisar saber de
// quantidade) — pra tags sem quantidade genérica (projétil/material/
// carregador, ver tagTemQuantidadeGeral em dados-manual.js) eles são
// só os valores digitados, igual sempre foi. Volume usa exatamente a
// mesma quantidade que peso, pra não duplicar o campo no modal.
function lerPesoVolumeEQuantidadeDoModal(tag) {
    const pesoDigitado = Math.max(0, Number(el.modalPeso.value) || 0);
    const volumeDigitado = Math.max(0, Number(el.modalVolume.value) || 0);

    // Projétil (Fase 4) — caso especial: usa a PRÓPRIA quantidade de
    // projéteis (it.projetil.quantidade, campo aninhado — não o
    // "quantidade" genérico, que fica escondido pra essa tag) pra
    // multiplicar o volume, arredondando pra baixo. O Math.floor
    // reaproveita a mesma fórmula de unitário × quantidade de sempre,
    // sem nenhum if especial: um estoque pequeno de munição (poucas
    // balas × volume unitário baixo) simplesmente arredonda pra 0.
    if (ehProjetil(tag)) {
        const quantidadeProjetil = Math.max(0, Number(el.modalProjetilQuantidade.value) || 0);
        return {
            peso: pesoDigitado,
            pesoUnitario: null,
            volume: Math.floor(volumeDigitado * quantidadeProjetil),
            volumeUnitario: volumeDigitado,
            quantidade: null
        };
    }

    if (!tagTemQuantidadeGeral(tag)) {
        return { peso: pesoDigitado, pesoUnitario: null, volume: volumeDigitado, volumeUnitario: null, quantidade: null };
    }
    const quantidade = Math.max(1, Math.round(Number(el.modalQuantidade.value)) || 1);
    return {
        peso: +(pesoDigitado * quantidade).toFixed(2),
        pesoUnitario: pesoDigitado,
        volume: +(volumeDigitado * quantidade).toFixed(2),
        volumeUnitario: volumeDigitado,
        quantidade
    };
}

async function salvarItemDoModal(id) {
    const nome = el.modalNome.value.trim();
    const tag = el.modalTag.value;
    if (!nome) { toast("Dê um nome ao item.", "erro"); return; }
    if (!tag) { toast("Toda item precisa de uma tag do sistema.", "erro"); return; }

    const exigePericia = tagExigePericiaUso(tag);
    const periciaUso = lerPericiaUsoDoModal(tag);
    const { ehSaldo, saldoValor, saldoNotas, saldoMoedas } = lerSaldoDoItemDoModal(tag);
    const { peso, pesoUnitario, volume, volumeUnitario, quantidade } = lerPesoVolumeEQuantidadeDoModal(tag);
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

    const tamanho = el.modalTamanho.value || null;

    // Mãos necessárias (ver item.maosNecessarias, seção 2.2 do
    // projeto-slots-porte.txt) — só grava número diferente de 1 quando o
    // campo está visível (item potencialmente equipável/segurável);
    // senão fica no default 1 (irrelevante pra item que nunca é
    // equipado/segurado solto).
    const maosNecessarias = (el.modalCampoMaosNecessarias.style.display !== "none")
        ? (Number(el.modalMaosNecessarias.value) === 2 ? 2 : 1)
        : 1;

    // Recipiente (mochila, bolsa...) — tipo de porte (obrigatório, ver
    // SUBTIPOS_PORTE em dados-manual.js) e compartimentos (obrigatório
    // pelo menos 1, cada um com sua própria capacidade/tamanho — ver
    // editor dinâmico), só gravados quando a tag é "recipiente" (ver
    // ehContainer em dados-manual.js).
    const subtipoPorte = ehContainer(tag) ? (el.modalSubtipoPorte.value || null) : null;
    if (ehContainer(tag) && !subtipoPorte) { toast("Escolha o tipo de porte deste recipiente.", "erro"); return; }
    let compartimentos = null;
    if (ehContainer(tag)) {
        compartimentos = lerCompartimentosDoModal();
        if (!compartimentos) return; // toast de erro já disparado dentro da função
    }

    // "Guardar dentro de" (item-recipiente) — só existe pra item de
    // ficha (não pro Banco Global). Revalida contra ciclo aqui também
    // (defesa extra: o select já vem filtrado por popularSelectGuardarDentro,
    // mas o item pode ter virado recipiente-de-si-mesmo por edição feita
    // noutra aba/dispositivo entre a abertura do modal e o salvar).
    // Guardar dentro de um recipiente SEMPRE move o item pra categoria
    // dele — não faz sentido um item estar "guardado numa mochila que
    // está em casa" e ao mesmo tempo listado como "levando consigo".
    let dentroDe = null;
    let compartimentoId = null;
    let categoriaFinal = el.modalCategoriaItem.value || "levando";
    if (el.modalCampoGuardarDentro.style.display !== "none") {
        // Valor do select agora é composto ("containerId::compartimentoId"
        // — ver popularSelectGuardarDentro/listaContainersDisponiveis,
        // passo 11 do projeto-slots-porte.txt), já que um mesmo container
        // pode ter mais de um compartimento.
        const valorSelecionado = el.modalGuardarDentro.value || "";
        const [containerIdSelecionado, compartimentoIdSelecionado] = valorSelecionado ? valorSelecionado.split("::") : [null, null];
        if (containerIdSelecionado && id && itemDescendeDe(fichaAtual, containerIdSelecionado, id)) {
            toast("Não dá pra guardar um item dentro dele mesmo (ou de algo já guardado dentro dele).", "erro");
            return;
        }
        // "Cabe ou não cabe" (Fase 2/3, agora por compartimento): tamanho
        // e capacidade do compartimento escolhido, contra o volume/tamanho
        // deste item. idExcluir = id (quando editando) evita contar o
        // volume do próprio item duas vezes, caso ele já estivesse
        // guardado ali.
        if (containerIdSelecionado) {
            const resultado = itemCabeNoContainer(fichaAtual, containerIdSelecionado, compartimentoIdSelecionado, volume, tamanho, id || null);
            if (!resultado.cabe) {
                const nomeContainer = fichaAtual.inventario[containerIdSelecionado]?.nome || "recipiente";
                const msg = resultado.motivo === "tamanho"
                    ? `"${nomeContainer}" não aceita item desse tamanho.`
                    : resultado.motivo === "compartimento_invalido"
                        ? `O compartimento escolhido em "${nomeContainer}" não existe mais — escolha outro.`
                        : `"${nomeContainer}" não tem espaço sobrando (capacidade de volume estourada).`;
                toast(msg, "erro");
                return;
            }
        }
        dentroDe = containerIdSelecionado || null;
        compartimentoId = dentroDe ? compartimentoIdSelecionado : null;
        if (dentroDe && fichaAtual.inventario[dentroDe]) {
            categoriaFinal = fichaAtual.inventario[dentroDe].categoria || categoriaFinal;
        }
    }

    // Preserva o estado do item existente ANTES de mexer em
    // categoria/equipada — usado tanto pelo atalho "Já equipado" logo
    // abaixo (pra saber se o item já contava mão antes) quanto pelo
    // resto da função mais adiante (registro, ativo/desativado etc.).
    const existenteItem = (id && fichaAtual.inventario && fichaAtual.inventario[id]) || {};

    // "Já equipado" (atalho de criação — item nasce direto em "Levando
    // consigo" e equipado, sem precisar do fluxo casa → mover pra
    // "levando" → equipar em passos separados). Só entra em jogo se o
    // campo estava visível (item elegível — ver atualizarCampoJaEquipar)
    // e o item não está sendo guardado dentro de outra coisa (dentroDe):
    // guardado e equipado ao mesmo tempo não faz sentido.
    let equipadaFinal = existenteItem.equipada ?? false;
    if (!dentroDe && el.modalCampoJaEquipar.style.display !== "none" && el.modalJaEquipar.checked) {
        if (ehContainer(tag) && subtipoPorteExclusivo(subtipoPorte) && !itemPodeEquiparContainer(fichaAtual, { tag, subtipoPorte }, id || null)) {
            toast(`Já tem outra peça de "${rotuloSubtipoPorte(subtipoPorte)}" equipada — desequipe-a primeiro.`, "erro");
            return;
        }
        const ocupaMaoEsteItem = ehContainer(tag) ? subtipoPorteOcupaMao(subtipoPorte) : true;
        if (ocupaMaoEsteItem) {
            // Se o item já estava equipado (edição) e já contava como mão
            // ocupada, devolve essa mão antes de checar — senão ele
            // "brigaria" contra a própria mão que já era dele.
            const jaOcupavaMao = existenteItem.equipada && existenteItem.categoria === "levando" && !existenteItem.dentroDe
                && (ehContainer(tag) ? ocupaMaoEsteItem : true);
            const maosLivres = maosDisponiveis(fichaAtual) + (jaOcupavaMao ? (Number(existenteItem.maosNecessarias) || 1) : 0);
            if (maosLivres < maosNecessarias) {
                toast(`Sem mãos livres pra equipar (${maosLivres} livre${maosLivres === 1 ? "" : "s"} — precisa de ${maosNecessarias}).`, "erro");
                return;
            }
        }
        categoriaFinal = "levando";
        equipadaFinal = true;
    }

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
    const modificadoresItem = lerModificadoresDoModal();
    // Item NOVO com modificador estruturado nasce DESLIGADO (precisa do
    // botão "Ativar" — ver criarLiItem) — exceto droga, que não usa esse
    // botão (o efeito dela só entra ao ser consumida, ver consumirDroga;
    // `ativo` simplesmente não é lido pra itens com tag "droga").
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: modificadoresItem,
        ativo: existenteItem.ativo ?? (modificadoresItem.length && tag !== "droga" ? false : true),
        tag,
        nivelTag: tagTemNivel(tag) ? Number(el.modalNivelTag.value) : null,
        peso,
        pesoUnitario,
        volume,
        volumeUnitario,
        tamanho,
        maosNecessarias,
        subtipoPorte,
        // Vem do editor dinâmico (lerCompartimentosDoModal) quando é
        // container; senão fica null (item comum não tem compartimento).
        compartimentos,
        quantidade,
        categoria: categoriaFinal,
        dentroDe,
        compartimentoId,
        periciaUso,
        ehSaldo,
        saldoValor,
        saldoNotas,
        saldoMoedas,
        classeProtecao,
        calibre,
        reducoesDano: tagPodeReduzirDano(tag) ? lerReducaoDanoDoModal() : [],
        localProtegido,
        arma: ehArmaOuExplosivo(tag) ? lerConfigArmaDoModal(periciaUso, calibre, existenteItem.arma, tag) : null,
        carregador,
        projetil,
        // Equipável (checkbox independente da tag — ver atualizarCamposPorTag):
        // arma já é sempre equipável por natureza, então o checkbox some e
        // fica implicitamente false aqui (itemEhEquipavel ainda cobre arma
        // via ehArma, ver inventario.js). "equipada" preserva o estado atual
        // — ou vira true de cara se o atalho "Já equipado" foi marcado
        // acima (ver equipadaFinal, logo depois do bloco "Guardar dentro
        // de") — senão editar qualquer outro campo do item desequiparia
        // sem querer.
        equipavel: (tag !== "arma" && tag !== "explosivo") ? !!el.modalEquipavel.checked : false,
        equipada: equipadaFinal,
        // Material de criação: tipo/qualidade/quantidade em estoque —
        // ver atualizarCamposPorTag. Itens antigos que só tinham a
        // marcação implícita (feita de leve em abrirModalEscolherMateriais,
        // antes desse campo existir no modal) continuam preservados aqui
        // se o item não for tag "material" nesta edição.
        materialTipo: tag === "material" ? el.modalMaterialTipo.value : (existenteItem.materialTipo ?? null),
        materialQualidade: tag === "material" ? (qualidadesDoMaterial(el.modalMaterialTipo.value) ? el.modalMaterialQualidade.value : null) : (existenteItem.materialQualidade ?? null),
        materialQuantidade: tag === "material" ? Math.max(0, Number(el.modalMaterialQuantidade.value) || 0) : (existenteItem.materialQuantidade ?? null)
    };

    // Trava central de "todo item solto precisa de um lugar físico" (seção
    // 3 e 5.4 do projeto-slots-porte.txt, passo 12): um item em "levando
    // consigo" e sem estar guardado dentro de nada só pode existir se
    // estiver numa mão, vestido, ou carregado (roupa/cinto/mochila/
    // bolsa_mao equipados) — ver itemPodeSerLevadoSolto em inventario.js.
    // Roda com o `registro` já montado (não com o item antigo) porque a
    // edição pode ter mudado categoria/dentroDe/equipada/subtipoPorte
    // nesta mesma submissão.
    if (!itemPodeSerLevadoSolto(fichaAtual, registro)) {
        toast(`"${nome}" precisa estar numa mão, vestido/carregado, ou guardado dentro de um compartimento pra ficar em "levando consigo".`, "erro");
        return;
    }

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
            idBancoParaRetomarReceita = await salvarItemNoBanco(registro, nomeJogador);
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
    const { ehSaldo, saldoValor, saldoNotas, saldoMoedas } = lerSaldoDoItemDoModal(tag);
    const { peso, pesoUnitario, volume, volumeUnitario, quantidade } = lerPesoVolumeEQuantidadeDoModal(tag);
    const tamanho = el.modalTamanho.value || null;
    const maosNecessarias = (el.modalCampoMaosNecessarias.style.display !== "none")
        ? (Number(el.modalMaosNecessarias.value) === 2 ? 2 : 1)
        : 1;
    const subtipoPorte = ehContainer(tag) ? (el.modalSubtipoPorte.value || null) : null;
    if (ehContainer(tag) && !subtipoPorte) { toast("Escolha o tipo de porte deste recipiente.", "erro"); return; }
    let compartimentos = null;
    if (ehContainer(tag)) {
        compartimentos = lerCompartimentosDoModal();
        if (!compartimentos) return; // toast de erro já disparado dentro da função
    }
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
    const armaConfig = ehArmaOuExplosivo(tag) ? lerConfigArmaDoModal(periciaUso, calibre, null, tag) : null;
    if (armaConfig) { armaConfig.carregadorId = null; armaConfig.camaraCarregada = false; }

    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        tag,
        nivelTag: tagTemNivel(tag) ? Number(el.modalNivelTag.value) : null,
        peso,
        pesoUnitario,
        volume,
        volumeUnitario,
        tamanho,
        maosNecessarias,
        subtipoPorte,
        compartimentos,
        quantidade,
        periciaUso,
        ehSaldo,
        saldoValor,
        saldoNotas,
        saldoMoedas,
        classeProtecao,
        calibre,
        reducoesDano: tagPodeReduzirDano(tag) ? lerReducaoDanoDoModal() : [],
        localProtegido,
        arma: armaConfig,
        carregador,
        projetil,
        // Equipável — molde do Banco Global; item criado a partir dele
        // já nasce com essa marcação (ver salvarItemDoModal).
        equipavel: (tag !== "arma" && tag !== "explosivo") ? !!el.modalEquipavel.checked : false,
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
            idBancoParaRetomarReceita = id;
        } else {
            idBancoParaRetomarReceita = await salvarItemNoBanco(registro, null);
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

// Criar/editar veículo — só o Mestre (ver plano-veiculos.txt, fase 5).
// Cada atributo é lido do select correspondente (data-veiculo-atributo,
// montado em prepararModalVeiculo) e travado em 0-5 por segurança, caso
// o dado salvo no Firebase esteja fora da escala.
//
// Chave (adendo ao plano): todo veículo NOVO nasce trancado e ganha
// junto, no mesmo save, um item tag "chave" no inventário desta mesma
// ficha, apontando pra ele (veiculoId). Só acontece na criação (sem
// `id`) — editar os atributos de um veículo já existente não mexe no
// estado de trancado nem cria chave duplicada.
async function salvarVeiculoDoModal(id) {
    if (!isMestre) { toast("Só o Mestre pode criar ou editar veículos.", "erro"); return; }
    const nome = el.modalNome.value.trim();
    if (!nome) { toast("Dê um nome ao veículo antes de salvar.", "erro"); return; }
    const tipo = el.modalTipoVeiculo.value || "pessoal";
    const atributos = {};
    ATRIBUTOS_VEICULO.forEach(chave => {
        const select = el.modalVeiculoAtributos.querySelector(`[data-veiculo-atributo="${chave}"]`);
        atributos[chave] = Math.max(0, Math.min(5, Number(select?.value) || 0));
    });
    const existente = (id && fichaAtual.veiculos && fichaAtual.veiculos[id]) || {};
    const ehVeiculoNovo = !id;
    const idFinal = id || gerarIdLocal();

    let chaveItemId = existente.chaveItemId || null;
    if (!fichaAtual.inventario) fichaAtual.inventario = {};
    if (ehVeiculoNovo) {
        chaveItemId = gerarIdLocal();
        fichaAtual.inventario[chaveItemId] = {
            nome: `Chave: ${nome}`,
            descricao: "",
            modificadores: [],
            ativo: true,
            tag: "chave",
            nivelTag: null,
            peso: 0.05,
            pesoUnitario: null,
            volume: 0,
            volumeUnitario: null,
            tamanho: "pequeno",
            capacidadeVolume: null,
            tamanhoMaximoAceito: null,
            quantidade: null,
            categoria: "levando",
            dentroDe: null,
            periciaUso: null,
            ehSaldo: false,
            saldoValor: 0,
            classeProtecao: null,
            calibre: null,
            reducoesDano: [],
            localProtegido: null,
            arma: null,
            carregador: null,
            projetil: null,
            equipavel: false,
            equipada: false,
            materialTipo: null,
            materialQualidade: null,
            materialQuantidade: null,
            veiculoId: idFinal
        };
    }

    const checkboxTrancado = document.getElementById("modal-veiculo-trancado");
    const registro = {
        nome,
        tipo,
        atributos,
        criadoEm: existente.criadoEm || Date.now(),
        trancado: ehVeiculoNovo ? true : (checkboxTrancado ? checkboxTrancado.checked : (existente.trancado ?? false)),
        chaveItemId
    };
    if (!fichaAtual.veiculos) fichaAtual.veiculos = {};
    fichaAtual.veiculos[idFinal] = registro;

    // Grava os dois nós juntos — se a chave for criada mas o veículo
    // falhar (ou vice-versa), pelo menos não fica um órfão referenciando
    // o outro que nunca chegou a existir no Firebase.
    const atualizacoes = {};
    atualizacoes[`${caminhoBase()}/veiculos/${idFinal}`] = registro;
    if (ehVeiculoNovo) atualizacoes[`${caminhoBase()}/inventario/${chaveItemId}`] = fichaAtual.inventario[chaveItemId];
    await update(ref(db), atualizacoes);

    toast(ehVeiculoNovo ? "Veículo criado, com chave no inventário." : "Veículo salvo.");
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
        toast("Edição de perícias só na Criação ou em Level Up pendente.", "erro");
        return;
    }

    if (LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa()) {
        toast("Só o Mestre pode remover isso depois da criação do personagem.", "erro");
        return;
    }

    if (lista === "veiculos" && !isMestre) {
        toast("Só o Mestre pode remover veículos.", "erro");
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

    // Excluir um item-recipiente não pode levar junto (nem "sumir" com)
    // o que estava guardado dentro dele — os itens filhos voltam a
    // aparecer soltos na lista (dentroDe some).
    if (lista === "inventario") {
        await destravarItensDeDentro(id);
    }

    // Excluir um veículo não pode deixar a(s) chave(s) dele órfãs no
    // inventário — apontando pra um veiculoId que não existe mais (ver
    // plano-veiculos.txt, adendo "chave"). Remove TODAS as chaves que
    // apontam pra esse veículo, não só a "oficial" (chaveItemId) — pode
    // ter cópia extra feita por reporChaveVeiculo.
    if (lista === "veiculos" && fichaAtual.inventario) {
        const chavesOrfas = Object.entries(fichaAtual.inventario)
            .filter(([, it]) => it && it.tag === "chave" && it.veiculoId === id)
            .map(([itemId]) => itemId);
        for (const itemId of chavesOrfas) {
            delete fichaAtual.inventario[itemId];
            await remove(ref(db, `${caminhoBase()}/inventario/${itemId}`));
        }
    }

    delete fichaAtual[lista][id];
    await remove(ref(db, `${caminhoBase()}/${caminhoLista(lista)}/${id}`));
    toast("Excluído.");
    fecharModal();
}

// Solta (dentroDe = null) todos os itens que estavam guardados dentro
// do recipiente containerId — usado antes de excluir um recipiente
// (direto pelo Mestre) ou ao processar um "remover_item" pendente que
// aponta pra um recipiente (ver mestre.js/confirmarAcaoPendente).
async function destravarItensDeDentro(containerId) {
    const filhos = itensDentroDe(fichaAtual, containerId);
    if (!filhos.length) return;
    const atualizacoes = {};
    filhos.forEach(f => { atualizacoes[f.id] = { ...fichaAtual.inventario[f.id], dentroDe: null }; });
    Object.assign(fichaAtual.inventario, atualizacoes);
    const payload = {};
    filhos.forEach(f => { payload[`${f.id}/dentroDe`] = null; });
    await update(ref(db, `${caminhoBase()}/inventario`), payload);
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
                const { calendario, virouDomingo, popups, recuperacoesPV } = await passarODia(calendarioAtual, fichasParaPopup);
                // Mesmo motivo do handler de "Salvar calendário" acima:
                // evita que um segundo clique rápido em "Passar o dia" (ou
                // um clique em "Salvar calendário" logo em seguida) use a
                // versão antiga do dia, de antes deste avanço.
                calendarioAtual = calendario;
                toast(virouDomingo ? "Dia avançado — caiu Domingo!" : "Dia avançado.");
                mostrarResumoRecuperacaoPV(recuperacoesPV);
            } catch (err) {
                console.error(err);
                toast(`Falha ao passar o dia: ${err.message || err}`, "erro");
            }
        });

        configurarTimeskip();
    }
}

// Resumo da Recuperação de PVs (manual) — chamado depois de "Passar o
// dia" e do Timeskip (ver passarODia/passarVariosDias em mestre.js).
// Pra cada ficha com recuperação em andamento nesse período, mostra
// quanto PV foi recuperado; se a recuperação terminou ANTES do fim do
// período avançado, mostra também quantos dias sobraram sem uso (ver
// avancarRecuperacaoPV em regras.js).
function mostrarResumoRecuperacaoPV(recuperacoesPV) {
    (recuperacoesPV || []).forEach(r => {
        if (r.pvRecuperados <= 0 && !r.completo) return;
        const partes = [`${r.nomeFicha}: +${r.pvRecuperados} PV recuperado(s) (${r.pvAtual}/${r.pvMax})`];
        if (r.completo) {
            partes.push("recuperação concluída");
            if (r.diasSobrando > 0) partes.push(`${r.diasSobrando} dia(s) de Timeskip sobrando`);
        }
        toast(partes.join(" — "));
    });
}

// ---------------------------------------------------------------------
// Timeskip — o Mestre escolhe quantos dias se passam de uma vez só. A
// caixa mostra, ao vivo, qual data/dia da semana o calendário vai ter
// depois de confirmado. Se o período avançado atravessar Domingo(s),
// cada um deles vira um pagamento semanal na fila dos jogadores (ver
// passarVariosDias em mestre.js e configurarAvisoCustoVida abaixo).
// ---------------------------------------------------------------------
function configurarTimeskip() {
    function atualizarPreviewTimeskip() {
        const dias = Math.max(1, Math.trunc(Number(el.timeskipDias.value)) || 1);
        if (!calendarioAtual) { el.timeskipPreview.innerText = ""; return; }
        const { calendario, domingos } = calcularAvancoDias(calendarioAtual, dias);
        const avisoDomingos = domingos > 0
            ? ` — atravessa ${domingos} Domingo${domingos > 1 ? "s" : ""} (${domingos > 1 ? "dispara pagamentos semanais em fila" : "dispara pagamento semanal"}).`
            : " — nenhum Domingo nesse período.";
        el.timeskipPreview.innerText = `Vai ficar: ${calendario.dataLabel} (${calendario.diaSemana})${avisoDomingos}`;
    }

    el.btnTimeskip.addEventListener("click", () => {
        if (!calendarioAtual) return;
        el.timeskipDias.value = "1";
        atualizarPreviewTimeskip();
        el.modalTimeskip.classList.add("active");
    });

    el.timeskipDias.addEventListener("input", atualizarPreviewTimeskip);

    el.timeskipCancelar.addEventListener("click", () => {
        el.modalTimeskip.classList.remove("active");
    });

    el.timeskipConfirmar.addEventListener("click", async () => {
        if (!calendarioAtual) return;
        const dias = Math.max(1, Math.trunc(Number(el.timeskipDias.value)) || 1);
        try {
            const { calendario, domingos, recuperacoesPV } = await passarVariosDias(calendarioAtual, todasAsFichasCache, dias);
            // Mesmo motivo do handler de "Passar o dia": evita usar a
            // versão antiga do calendário caso o Mestre clique em outra
            // coisa (Salvar calendário, Passar o dia) logo em seguida.
            calendarioAtual = calendario;
            el.modalTimeskip.classList.remove("active");
            toast(domingos > 0
                ? `Timeskip de ${dias} dia(s) — atravessou ${domingos} Domingo(s), pagamento(s) semanal(is) disparado(s).`
                : `Timeskip de ${dias} dia(s).`);
            mostrarResumoRecuperacaoPV(recuperacoesPV);
        } catch (err) {
            console.error(err);
            toast(`Falha ao aplicar o timeskip: ${err.message || err}`, "erro");
        }
    });
}

// =====================================================================
// LOG DE DADOS
// =====================================================================

// Destaca palavras-chave do texto do log (ACERTO! em verde-neon, FALHOU
// em vermelho-neon) pra ficarem visíveis mesmo com o texto do detalhe
// em cinza apagado (.log-detalhe usa --text-dim). Recebe o texto JÁ
// escapado (escapeHtml) e devolve HTML com os spans de destaque.
function destacarPalavrasChave(textoEscapado) {
    return textoEscapado
        .replace(/ACERTO!/g, '<span class="log-palavra-acerto">ACERTO!</span>')
        .replace(/FALHOU/g, '<span class="log-palavra-falha">FALHOU</span>');
}

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
                ${entrada.detalhe ? `<span class="log-detalhe">${destacarPalavrasChave(escapeHtml(entrada.detalhe))}</span>` : ""}
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
        // Status só de combate (Derrubado, Agarrado, Imobilizado,
        // Inconsciente, Sangramento...) mudam aqui, não em renderizarTudo()
        // — precisa atualizar o carrossel do topo também neste listener.
        atualizarStatusTopoCarrossel();
    });
}

// =====================================================================
// CENÁRIOS (compartilhado — ver plano-cenario.txt, Fase 4/6): Mestre
// monta em montarGerenciadorCenario, jogador consome em
// renderizarCenarios (aba "Cenário" da ficha).
// =====================================================================
function configurarCenarios() {
    ouvirCenarios((lista) => {
        cenariosCache = lista || [];
        // Se o Gerenciador de Cenário estiver aberto, atualiza em tempo real.
        if (isMestre && el.modalCenarioMestre && el.modalCenarioMestre.classList.contains("active")) {
            el.cenarioMestreCorpo.innerHTML = "";
            montarGerenciadorCenario(el.cenarioMestreCorpo);
        }
        if (typeof renderizarCenarios === "function") renderizarCenarios();
    });
}

// =====================================================================
// SAÚDE (ver plano-sistema-saude-ferimentos.txt, Etapa 3): feridas
// persistentes da ficha atualmente aberta. Diferente dos outros
// listeners deste arquivo, este é específico de UMA ficha (fichaAtualId)
// e não do conjunto compartilhado da mesa — por isso precisa ser
// re-registrado sempre que a ficha ativa muda (Mestre trocando de
// personagem no selectFicha, ou alternando entre ficha/NPC). Chamado a
// cada snapshot de ativarSincronizacao(); o guard de id evita
// reassinar o listener à toa quando nada mudou.
// Escopo desta fase: só ficha de jogador — em modo NPC a lista fica
// vazia (feridas de NPC ficam de fora por enquanto).
// =====================================================================
function configurarSaude() {
    const alvo = !modoNpc && fichaAtualId ? fichaAtualId : null;
    if (alvo === feridasFichaIdOuvida) return;
    feridasFichaIdOuvida = alvo;
    if (unsubFeridas) { unsubFeridas(); unsubFeridas = null; }
    if (!alvo) {
        feridasCache = [];
        renderizarSaude();
        return;
    }
    unsubFeridas = ouvirFeridas(alvo, (lista) => {
        feridasCache = lista || [];
        renderizarSaude();
        // Etapa 6: uma ferida abrindo/fechando pode travar ou destravar
        // a recuperação de PV — re-renderiza o painel com o último
        // contexto (d, pvMaximoTotal) conhecido, sem esperar a próxima
        // atualização da ficha em si.
        if (ultimoContextoRecuperacaoPV) {
            renderizarRecuperacaoPV(ultimoContextoRecuperacaoPV.d, ultimoContextoRecuperacaoPV.pvMaximoTotal);
        }
    });
}

function tituloTipoFerida(tipo) {
    return {
        sangramento: "Sangramento", corte: "Corte", projetil: "Projétil alojado",
        fratura: "Fratura", queimadura: "Queimadura"
    }[tipo] || tipo;
}
function tituloLocalFerida(local) {
    return { cabeca: "Cabeça", torso: "Torso", membro: "Membro", extremidade: "Extremidade" }[local] || local;
}
function tituloEstadoFerida(estado) {
    return {
        aberta: "Aberta", estancada: "Estancada", sem_sangramento: "Projétil removido", tratada: "Tratada"
    }[estado] || estado;
}

// Deriva as ações de tratamento disponíveis pra uma ferida a partir de
// TRATAMENTOS_FERIDA + feridaAceitaSutura (regras.js) — em vez de
// hardcodar a máquina de estados de novo aqui, reaproveita a mesma
// fonte de verdade que tratarFerida() usa pra validar/aplicar. Uma
// ferida "tratada" nunca tem ação disponível.
function acoesDeTratamentoParaFerida(ferida) {
    if (!ferida || ferida.estado === "tratada") return [];
    return Object.entries(TRATAMENTOS_FERIDA)
        .filter(([acao, config]) => {
            if (!config.tiposFerida.includes(ferida.tipo)) return false;
            if (acao === "suturar_ferimento") return feridaAceitaSutura(ferida);
            return ferida.estado === "aberta";
        })
        .map(([acao]) => acao);
}

function renderizarSaude() {
    if (!el.saudeLista) return;

    // Painel do Mestre pra reverter coma (item 6 do plano de saúde/
    // complicações) — sempre manual, nunca automático (ver
    // reverterComaGodmode em mestre.js). Fica visível só quando o
    // Mestre está com uma ficha aberta que está atualmente em coma.
    if (el.mestreComaPainel) {
        const emComa = isMestre && !modoNpc && fichaAtual?.dados?.coma?.ativo;
        if (emComa) {
            el.mestreComaPainel.style.display = "";
            el.mestreComaPainel.innerHTML = `<p class="hint">💤 Esta ficha está em coma. A saída é sempre manual — confirme só se o tratamento em hospital ou a Cirurgia de Campo (bem-sucedidos) justificarem, na cena.</p>
                <button type="button" class="btn-lime" id="btn-reverter-coma">Reverter coma</button>`;
            const btnReverterComa = document.getElementById("btn-reverter-coma");
            if (btnReverterComa) {
                btnReverterComa.addEventListener("click", async () => {
                    try {
                        await reverterComaGodmode(fichaAtualId);
                        toast("Coma revertido — a próxima recuperação de PV dessa ficha vai levar o dobro do tempo.");
                    } catch (err) {
                        console.error(err);
                        toast("Falha ao reverter o coma.", "erro");
                    }
                });
            }
        } else {
            el.mestreComaPainel.style.display = "none";
            el.mestreComaPainel.innerHTML = "";
        }
    }

    // Painel do Mestre pra "acordar" o Desmaio Genérico (item 4) — só
    // desliga o badge/aviso; sem efeito mecânico (ver
    // acordarDesmaioGodmode em mestre.js).
    if (el.mestreDesmaioPainel) {
        const desmaiado = isMestre && !modoNpc && fichaAtual?.dados?.desmaiado;
        if (desmaiado) {
            el.mestreDesmaioPainel.style.display = "";
            el.mestreDesmaioPainel.innerHTML = `<p class="hint">😵 Esta ficha está com o aviso de Desmaio ativo. "Acordar" é sempre resolvido pela mesa (teste de Constituição narrado).</p>
                <button type="button" class="btn-lime" id="btn-acordar-desmaio">Acordar (desligar aviso)</button>`;
            const btnAcordarDesmaio = document.getElementById("btn-acordar-desmaio");
            if (btnAcordarDesmaio) {
                btnAcordarDesmaio.addEventListener("click", async () => {
                    try {
                        await acordarDesmaioGodmode(fichaAtualId);
                        toast("Aviso de Desmaio desligado.");
                    } catch (err) {
                        console.error(err);
                        toast("Falha ao desligar o aviso de Desmaio.", "erro");
                    }
                });
            }
        } else {
            el.mestreDesmaioPainel.style.display = "none";
            el.mestreDesmaioPainel.innerHTML = "";
        }
    }

    if (modoNpc) {
        el.saudeLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">NPCs ainda não entram no sistema de feridas.</p>`;
        return;
    }
    if (!feridasCache.length) {
        el.saudeLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">Nenhuma ferida registrada.</p>`;
        return;
    }

    const feridasOrdenadas = [...feridasCache].sort((a, b) => (b.criadaEm || 0) - (a.criadaEm || 0));

    el.saudeLista.innerHTML = feridasOrdenadas.map(ferida => {
        const acoes = acoesDeTratamentoParaFerida(ferida);
        const badgeInfeccao = ferida.infeccaoAtiva
            ? `<span class="mod-pill negativo">🦠 Infeccionada${ferida.infeccaoGarantida ? " (garantida)" : ""}</span>`
            : "";
        const botoesTratamento = isMestre
            ? ""
            : acoes.map(acao => `<button type="button" class="btn-lime btn-tratar-ferida" data-ferida-id="${ferida.id}" data-acao="${acao}">${escapeHtml(TRATAMENTOS_FERIDA[acao].label)}</button>`).join(" ");
        const semAcao = !isMestre && !acoes.length && ferida.estado !== "tratada"
            ? `<span class="hint">Nenhum tratamento disponível no momento.</span>` : "";
        // Testar Infecção (Etapa 5 do plano): migrado pra cá, vinculado à
        // ferida específica — só o Mestre dispara, a qualquer momento
        // enquanto a ferida não estiver "tratada" (não depende de já
        // estar infeccionada, igual o antigo botão do Gerenciador de
        // Combate).
        const botaoTestarInfeccao = (isMestre && ferida.estado !== "tratada")
            ? `<button type="button" class="btn-ghost btn-testar-infeccao-ferida" data-ferida-id="${ferida.id}" title="Teste de Constituição vs. Infecção (manual: Complicações de ferimentos)">🦠 Testar Infecção</button>`
            : "";

        const historico = Object.values(ferida.historico || {}).sort((a, b) => (a.data || 0) - (b.data || 0));
        const historicoHtml = historico.length
            ? `<details class="ferida-historico">
                <summary>Histórico (${historico.length})</summary>
                <ul>${historico.map(h => `<li>${escapeHtml(h.acao || "")}${h.quem ? ` — ${escapeHtml(h.quem)}` : ""}: ${escapeHtml(h.resultado || "")}</li>`).join("")}</ul>
               </details>`
            : "";

        return `
        <div class="ferida-card" data-ferida-id="${ferida.id}">
            <div class="ferida-topo">
                <span class="ferida-tipo">${tituloTipoFerida(ferida.tipo)}${ferida.local ? ` — ${tituloLocalFerida(ferida.local)}` : ""}</span>
                <span class="mod-pill${ferida.estado === "tratada" ? " positivo" : ""}">${tituloEstadoFerida(ferida.estado)}</span>
                ${badgeInfeccao}
            </div>
            ${ferida.origem ? `<div class="hint">Origem: ${escapeHtml(ferida.origem)}</div>` : ""}
            <div class="ferida-acoes">${botoesTratamento}${semAcao}${botaoTestarInfeccao}</div>
            ${historicoHtml}
        </div>`;
    }).join("");

    if (!isMestre) {
        el.saudeLista.querySelectorAll(".btn-tratar-ferida").forEach(btn => {
            btn.addEventListener("click", () => abrirModalTratarFerida(btn.dataset.feridaId, btn.dataset.acao));
        });
    }
    if (isMestre) {
        el.saudeLista.querySelectorAll(".btn-testar-infeccao-ferida").forEach(btn => {
            btn.addEventListener("click", () => abrirModalTestarInfeccaoFerida(btn.dataset.feridaId));
        });
    }
}

// Modal de tratamento — Etapa 3: só o próprio personagem se tratando,
// então tratadorPericias/tratadorNome sempre vêm de fichaAtual (sem
// seletor de paciente, que é a Etapa 4). Segue o mesmo padrão visual e
// de feedback (toast + registrarRolagem) do modal de Testar Infecção
// por ferida (abrirModalTestarInfeccaoFerida, mais abaixo).
// `alvo` (opcional): { fichaId, nome } do PACIENTE — usado pelo fluxo
// "Tratar outro jogador" (Etapa 4, ver abrirModalTratarOutroJogador).
// Sem isso, assume que é a própria ficha aberta (Etapa 3 — tratar a si
// mesmo). Quem ROLA o teste (perícias em tratadorPericias) é sempre
// fichaAtual — a pessoa com a ficha aberta nesta tela — nunca o
// paciente, mesmo tratando outro jogador.
function abrirModalTratarFerida(feridaId, acao, alvo) {
    const config = TRATAMENTOS_FERIDA[acao];
    if (!config) return;
    const tratandoOutro = !!alvo;
    const fichaAlvoId = tratandoOutro ? alvo.fichaId : fichaAtualId;
    const nomeAlvo = tratandoOutro ? alvo.nome : (fichaAtual?.dados?.nome || fichaAtualId);

    // A própria ficha usa feridasCache (já sincronizado pelo listener
    // dedicado); pra outro jogador, lê direto do snapshot ao vivo de
    // todasAsFichasCache (raw, inclui o nó feridas — normalizarFicha não).
    const ferida = tratandoOutro
        ? Object.entries((todasAsFichasCache[fichaAlvoId] || {}).feridas || {}).map(([id, v]) => ({ id, ...v })).find(f => f.id === feridaId)
        : feridasCache.find(f => f.id === feridaId);
    if (!ferida) { toast("Essa ferida não existe mais.", "erro"); return; }

    let modal = document.getElementById("modal-tratar-ferida");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-tratar-ferida";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    // Info do plano (seção 6, item 3): mostra quais das perícias aceitas
    // pra ESSA ação você (fichaAtual) tem e em que nível — só informativo,
    // já que tratarFerida() sempre usa a maior entre elas sozinho.
    const periciasComNivel = config.pericias.map(nome => {
        const entrada = Object.values(fichaAtual.pericias || {}).find(p => p.nome === nome);
        return entrada ? `${nome} (nível ${Number(entrada.nivel) || 0})` : null;
    }).filter(Boolean);
    const infoPericias = periciasComNivel.length
        ? `Suas perícias que servem pra isso: ${periciasComNivel.join(", ")}.`
        : `Você não tem nenhuma das perícias aceitas (${config.pericias.join(" / ")}) — a rolagem conta como nível 0 nelas.`;

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">${escapeHtml(config.label)}${tratandoOutro ? ` — ${escapeHtml(nomeAlvo)}` : ""} — ${tituloTipoFerida(ferida.tipo)}${ferida.local ? ` (${tituloLocalFerida(ferida.local)})` : ""}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">Itens sugeridos pelo manual: ${escapeHtml(config.itensSugeridos)}.</p>
        <p class="hint">${escapeHtml(infoPericias)}</p>
        <label style="display:block;margin-top:10px;">Item usado
            <select id="ferida-situacao-item" style="width:100%;">
                <option value="adequado">Item adequado (sem penalidade)</option>
                <option value="improvisado">Item improvisado (-1)</option>
                <option value="nenhum">Sem item (-2)</option>
            </select>
        </label>
        <label style="display:block;margin-top:10px;">
            <input type="checkbox" id="ferida-em-hospital"> Tratamento em hospital
            <span class="hint" style="display:block;">Se o tratamento tiver sucesso, reduz em 1/10 o tempo da próxima recuperação de PV (ficha inteira, não empilha).</span>
        </label>
        <label style="display:block;margin-top:10px;">Dificuldade (${config.dificuldadeMin}-${config.dificuldadeMax})
            <input type="number" id="ferida-dificuldade" value="${config.dificuldadeMin}" min="${config.dificuldadeMin}" max="${config.dificuldadeMax}" style="width:100%;">
        </label>
        <label style="display:block;margin-top:10px;">Bônus específico do item (ex: Kit de Sutura nível 3 = +2)
            <input type="number" id="ferida-modificador-extra" value="0" style="width:100%;">
        </label>
        <button type="button" class="btn-lime" id="btn-rolar-tratamento-ferida" style="margin-top:14px;width:100%;">Rolar tratamento</button>
        ${isMestre && godmodeAtivo ? `<button type="button" class="btn-lime" id="btn-tratamento-ferida-godmode" style="margin-top:8px;width:100%;">Tratar automaticamente (Godmode — sem teste nem item)</button>` : ""}
    `;
    const fechar = () => modal.remove();
    modal.querySelector(".combate-fechar").addEventListener("click", fechar);
    modal.querySelector("#btn-rolar-tratamento-ferida").addEventListener("click", async () => {
        const situacaoItem = modal.querySelector("#ferida-situacao-item").value;
        const dificuldadeEscolhida = Number(modal.querySelector("#ferida-dificuldade").value) || config.dificuldadeMin;
        const modificadorExtra = Number(modal.querySelector("#ferida-modificador-extra").value) || 0;
        const emHospital = modal.querySelector("#ferida-em-hospital").checked;
        const nomeTratador = fichaAtual?.dados?.nome || fichaAtualId;
        try {
            const resultado = await tratarFerida(fichaAlvoId, feridaId, {
                acao, tratadorPericias: fichaAtual.pericias, tratadorNome: nomeTratador,
                situacaoItem, dificuldadeEscolhida, modificadorExtra, emHospital
            });
            await registrarRolagem({
                quem: tratandoOutro ? `${nomeTratador} (tratando ${nomeAlvo})` : nomeTratador,
                modificador: resultado.nivelPericia + resultado.penalidadeItem + resultado.modificadorExtra,
                resultado: resultado.resultado, detalhe: resultado.detalhe
            });
            const notaHospital = resultado.tratamentoHospitalRegistrado
                ? " (tratamento em hospital registrado — vai descontar 1/10 da próxima recuperação de PV dessa ficha)"
                : "";
            toast((tratandoOutro ? `${nomeAlvo}: ${resultado.detalhe}` : resultado.detalhe) + notaHospital, resultado.sucesso ? undefined : "erro");
            fechar();
        } catch (e) {
            toast(e.message || "Falha ao tratar a ferida.", "erro");
        }
    });
    // Godmode: sucesso automático, sem rolar d20, sem perícia e sem
    // olhar pro item usado — só o Mestre vê esse botão (checado tanto
    // aqui quanto na hora de montar o HTML acima), então tratarFerida()
    // não precisa reconferir a permissão.
    const btnGodmode = modal.querySelector("#btn-tratamento-ferida-godmode");
    if (btnGodmode) {
        btnGodmode.addEventListener("click", async () => {
            const nomeTratador = fichaAtual?.dados?.nome || fichaAtualId;
            const emHospital = modal.querySelector("#ferida-em-hospital").checked;
            try {
                const resultado = await tratarFerida(fichaAlvoId, feridaId, {
                    acao, tratadorNome: `${nomeTratador} (Godmode)`, godmode: true, emHospital
                });
                const notaHospital = resultado.tratamentoHospitalRegistrado
                    ? " (tratamento em hospital registrado — vai descontar 1/10 da próxima recuperação de PV dessa ficha)"
                    : "";
                toast((tratandoOutro ? `${nomeAlvo}: ${resultado.detalhe}` : resultado.detalhe) + notaHospital);
                fechar();
            } catch (e) {
                toast(e.message || "Falha ao tratar a ferida.", "erro");
            }
        });
    }
}

// Modal "Testar Infecção" por ferida (Etapa 5 do plano): substitui o
// antigo abrirModalTestarInfeccao (que rodava sobre um participante de
// combate solto). Só o Mestre abre (ver botaoTestarInfeccao em
// renderizarSaude), sempre sobre a ficha atualmente aberta na tela —
// não tem seletor de paciente porque a aba Saúde já está mostrando a
// ficha de um personagem específico. `testarInfeccaoFerida` (saude.js)
// já aplica a dificuldade final (base - modificador de itens) e marca
// infeccaoAtiva/infeccaoGarantida na ferida em caso de falha.
function abrirModalTestarInfeccaoFerida(feridaId) {
    const ferida = feridasCache.find(f => f.id === feridaId);
    if (!ferida) { toast("Essa ferida não existe mais.", "erro"); return; }
    const nomeFicha = fichaAtual?.dados?.nome || fichaAtualId;

    let modal = document.getElementById("modal-testar-infeccao-ferida");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-testar-infeccao-ferida";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Infecção — ${escapeHtml(nomeFicha)} — ${tituloTipoFerida(ferida.tipo)}${ferida.local ? ` (${tituloLocalFerida(ferida.local)})` : ""}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">Manual: dificuldade 18 fixa pra tratamento malfeito/ambiente sujo (não isolar o ferimento, mãos/equipamento não esterilizados); ${DIFICULDADE_INFECCAO_MINIMA} a ${DIFICULDADE_INFECCAO_MAXIMA} pra ferimento profundo/grave, mesmo com tratamento adequado — esse teste se repete uma vez por cena até receber tratamento médico. Itens como Soro Fisiológico reduzem a dificuldade em -2.</p>
        <label style="display:block;margin-top:10px;">Dificuldade base (${DIFICULDADE_INFECCAO_MINIMA}-${DIFICULDADE_INFECCAO_MAXIMA})
            <input type="number" id="ferida-infeccao-dificuldade" value="${DIFICULDADE_INFECCAO_MINIMA}" min="1" style="width:100%;">
        </label>
        <label style="display:block;margin-top:10px;">Modificador de itens/tratamento (ex: -2 com Soro Fisiológico)
            <input type="number" id="ferida-infeccao-modificador" value="0" style="width:100%;">
        </label>
        <label style="display:block;margin-top:10px;">Origem / observação
            <input type="text" id="ferida-infeccao-origem" placeholder="Ex: ferimento de bala no torso, tratado sem esterilizar" style="width:100%;">
        </label>
        <button type="button" class="btn-lime" id="btn-rolar-teste-infeccao-ferida" style="margin-top:14px;width:100%;">Rolar teste de Constituição</button>
    `;
    const fechar = () => modal.remove();
    modal.querySelector(".combate-fechar").addEventListener("click", fechar);
    modal.querySelector("#btn-rolar-teste-infeccao-ferida").addEventListener("click", async () => {
        const dificuldadeBase = Number(modal.querySelector("#ferida-infeccao-dificuldade").value) || DIFICULDADE_INFECCAO_MINIMA;
        const modificadorItens = Number(modal.querySelector("#ferida-infeccao-modificador").value) || 0;
        const origem = modal.querySelector("#ferida-infeccao-origem").value.trim() || "Complicação de ferimento";
        try {
            const resultado = await testarInfeccaoFerida(fichaAtualId, feridaId, dificuldadeBase, modificadorItens, origem);
            await registrarRolagem({ quem: nomeFicha, modificador: resultado.modConstituicao, resultado: resultado.resultado, detalhe: resultado.detalhe });
            toast(resultado.detalhe, resultado.sucesso ? undefined : "erro");
            fechar();
        } catch (e) {
            toast(e.message || "Falha ao testar infecção.", "erro");
        }
    });
}

// Modal "Tratar outro jogador" (Etapa 4 do plano): paciente -> ferida ->
// ação, em cascata. A rolagem em si (item usado, dificuldade, bônus
// extra) reaproveita abrirModalTratarFerida passando `alvo`, pra não
// duplicar aquele formulário — só muda quem é o dono da ferida.
function abrirModalTratarOutroJogador() {
    const outras = Object.entries(todasAsFichasCache || {}).filter(([id]) => id !== fichaAtualId);
    if (!outras.length) { toast("Não há outras fichas ativas na rede pra tratar.", "erro"); return; }

    let modal = document.getElementById("modal-tratar-outro");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-tratar-outro";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const opcoesPaciente = outras
        .sort(([, a], [, b]) => ((a.config && a.config.nomeExibicao) || "").localeCompare((b.config && b.config.nomeExibicao) || ""))
        .map(([id, f]) => `<option value="${id}">${escapeHtml((f.config && f.config.nomeExibicao) || id)}</option>`)
        .join("");

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Tratar outro jogador</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <label style="display:block;margin-top:10px;">Paciente
            <select id="tratar-outro-paciente" style="width:100%;">
                <option value="">Escolha…</option>
                ${opcoesPaciente}
            </select>
        </label>
        <div id="tratar-outro-corpo"></div>
    `;
    const fechar = () => modal.remove();
    modal.querySelector(".combate-fechar").addEventListener("click", fechar);

    const corpo = modal.querySelector("#tratar-outro-corpo");

    function renderFerida() {
        const pacienteId = modal.querySelector("#tratar-outro-paciente").value;
        if (!pacienteId) { corpo.innerHTML = ""; return; }

        const feridasPaciente = Object.entries((todasAsFichasCache[pacienteId] || {}).feridas || {})
            .map(([id, v]) => ({ id, ...v }))
            .filter(f => acoesDeTratamentoParaFerida(f).length); // só as que têm alguma ação disponível agora

        if (!feridasPaciente.length) {
            corpo.innerHTML = `<p class="hint" style="margin-top:10px;">Esse personagem não tem nenhuma ferida pendente de tratamento no momento.</p>`;
            return;
        }

        const opcoesFerida = feridasPaciente.map(f =>
            `<option value="${f.id}">${tituloTipoFerida(f.tipo)}${f.local ? ` — ${tituloLocalFerida(f.local)}` : ""} (${tituloEstadoFerida(f.estado)})</option>`
        ).join("");

        corpo.innerHTML = `
            <label style="display:block;margin-top:10px;">Ferida
                <select id="tratar-outro-ferida" style="width:100%;">${opcoesFerida}</select>
            </label>
            <div id="tratar-outro-acao"></div>
        `;
        const selectFerida = corpo.querySelector("#tratar-outro-ferida");
        const areaAcao = corpo.querySelector("#tratar-outro-acao");

        function renderAcao() {
            const feridaId = selectFerida.value;
            const ferida = feridasPaciente.find(f => f.id === feridaId);
            const acoes = ferida ? acoesDeTratamentoParaFerida(ferida) : [];
            if (!acoes.length) { areaAcao.innerHTML = ""; return; }

            const opcoesAcao = acoes.map(a => `<option value="${a}">${escapeHtml(TRATAMENTOS_FERIDA[a].label)}</option>`).join("");
            areaAcao.innerHTML = acoes.length > 1
                ? `<label style="display:block;margin-top:10px;">Tratamento
                       <select id="tratar-outro-acao-select" style="width:100%;">${opcoesAcao}</select>
                   </label>
                   <button type="button" class="btn-lime" id="btn-tratar-outro-continuar" style="margin-top:14px;width:100%;">Continuar</button>`
                : `<button type="button" class="btn-lime" id="btn-tratar-outro-continuar" style="margin-top:14px;width:100%;">Continuar — ${escapeHtml(TRATAMENTOS_FERIDA[acoes[0]].label)}</button>`;

            areaAcao.querySelector("#btn-tratar-outro-continuar").addEventListener("click", () => {
                const acaoEscolhida = acoes.length > 1 ? areaAcao.querySelector("#tratar-outro-acao-select").value : acoes[0];
                const nomePaciente = (todasAsFichasCache[pacienteId].config && todasAsFichasCache[pacienteId].config.nomeExibicao) || pacienteId;
                fechar();
                abrirModalTratarFerida(feridaId, acaoEscolhida, { fichaId: pacienteId, nome: nomePaciente });
            });
        }
        selectFerida.addEventListener("change", renderAcao);
        renderAcao();
    }
    modal.querySelector("#tratar-outro-paciente").addEventListener("change", renderFerida);
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
    const penalidadeFB = Number(r.penalidadeEsquivaForcaBruta) || 0;
    const notaForcaBrutaEsquiva = penalidadeFB ? ` (penalidade ${penalidadeFB} por ser um golpe de Força Bruta)` : "";
    const bloqueioImpossivel = !!(r.bloqueioForcaBruta && r.bloqueioForcaBruta.impossivel);
    const fracaoBloqueio = r.bloqueioForcaBruta && r.bloqueioForcaBruta.fracaoDanoRestante;
    const notaBloqueio = bloqueioImpossivel
        ? "Bloquear é IMPOSSÍVEL contra esse golpe (Força Bruta nível 5)."
        : fracaoBloqueio
            ? `Bloquear só reduz 1/4 do dano desse golpe (Força Bruta nível 4), não a metade normal.`
            : "Bloquear reduz o dano pela metade (não reduz dano perfurante).";
    const avisoBase = r.ehArmaFogo
        ? `${escapeHtml(r.nomeAlvo)} tem Esquiva/Bloqueio guardada, mas não dá pra esquivar/aparar de arma de fogo — só Bloquear ou levar o golpe cheio. ${notaBloqueio}`
        : `${escapeHtml(r.nomeAlvo)} tem a ação de Esquiva/Bloqueio guardada. Esquivar rola Agilidade (+ bônus de Boxe, se tiver)${notaForcaBrutaEsquiva} contra o resultado do ataque — só anula o golpe se bater; Aparar (com teste de perícia contra o resultado do ataque) anula o golpe E permite contra-atacar na hora com -1; ${notaBloqueio} Escolha uma opção, ou deixe passar o golpe cheio sem gastar a ação.`;
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
            const modDadoBase = await calcularModEsquivarParticipante(r.alvoTipo, r.alvoRefId, r.ataqueArmaBranca);
            // Força Bruta nível 4/5 do atacante (manual pg. 22):
            // penalidade -1/-2 pra quem tenta esquivar desse golpe.
            const modDado = modDadoBase + (Number(r.penalidadeEsquivaForcaBruta) || 0);
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
        const modificadoresVantagensNpc = coletarModificadores({ vantagens: npc.vantagens });
        const secundarios = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride, modificadoresVantagensNpc);
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

// Acha o participantId de combate de QUALQUER ficha/npc pelo (tipo,
// refId) — diferente de meuParticipanteIdCombate/npcParticipanteIdCombate
// (que só acham "a própria tela"), usado pela ferramenta genérica
// "Causar dano" do Mestre (que deixa escolher qualquer alvo, dentro ou
// fora do combate) pra saber se dá pra testar Sangramento (Profundo ou
// comum), que depende de status por turno — ver Dilaceração (item 7 do
// plano de saúde/complicações) logo abaixo.
function participanteIdPorAlvo(tipo, refId) {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    const entrada = Object.entries(participantes).find(([, p]) => p.tipo === tipo && p.refId === refId);
    return entrada ? entrada[0] : null;
}

// Busca ao vivo só a Constituição (defesa) de uma ficha/npc pelo
// (tipo, refId) — mesmo cálculo já usado em resolverArremessar acima,
// extraído aqui pra reaproveitar na ferramenta genérica "Causar dano"
// do Mestre (Dilaceração por explosão, item 7 do plano).
async function buscarConstituicaoAlvo(tipo, refId) {
    try {
        if (tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${refId}`)));
            if (!snap.exists()) return 0;
            const fichaAlvo = normalizarFicha(snap.val());
            const modsAlvo = coletarModificadores(fichaAlvo);
            return calcularDificuldadeDefesaJogador(fichaAlvo.dados, "constituicao", modsAlvo, 0);
        }
        const snap = await get(ref(db, caminhoMesa(`npcs/${refId}`)));
        if (!snap.exists()) return 0;
        const npc = snap.val();
        if (npc.modoDetalhado && npc.atributosPrimarios) {
            const modsNpcAlvo = coletarModificadores({ vantagens: npc.vantagens });
            return calcularDificuldadeDefesaJogador(npc.atributosPrimarios, "constituicao", modsNpcAlvo, 0);
        }
        return Number(npc.constituicao) || 0;
    } catch (err) {
        console.error(err);
        return 0;
    }
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
//   - Jogador: precisa ser o turno dele E ter ação sobrando.
//   - Mestre atuando como NPC: mesma checagem de turno/ações.
//   - Fora de combate com iniciativa, ou personagem fora da lista de
//     participantes: ação livre, sem gasto de turno.
// Em QUALQUER caso, o gasto em si nunca é consumido aqui — só entra na
// fila de Ações Pendentes do Mestre (ver criarAcaoPendente/
// resolverAcaoPendente em mestre.js). Regra da mesa: nenhuma ação ou
// dado rolado em combate gasta ação do turno sozinho, mesmo sendo o
// próprio Mestre controlando o NPC — ele sempre aprova ou recusa na
// fila, igual faria com um jogador.
// Retorna null se a ação não pode prosseguir (toast já disparado), ou
// um objeto { participanteId } — participanteId é null quando não há
// economia de ação a aplicar.
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
// direcionado (default true): se esta ação/rolagem tem um alvo dentro
// do combate (ataque, manobra, uso de arma). Rolagens "soltas" —
// perícia/atributo avulsos, uso de item sem alvo, criação de receita —
// chamam com direcionado=false, pra deixar quem está FORA do combate
// rolar normalmente (não estão fazendo nada contra quem está lutando,
// só não entram na fila de turno/ação daquele combate).
function checarConsumoDeAcao(ehCQC = false, direcionado = true) {
    if (!combateComIniciativaAtivo()) return { participanteId: null, extraCQC: false };

    if (!isMestre) {
        const meuId = meuParticipanteIdCombate();
        if (!meuId) {
            if (!direcionado) {
                // Fora do combate, mas é uma rolagem solta (não mira
                // ninguém em combate): deixa passar, sem gastar ação de
                // ninguém — quem está de fora não participa da ordem de
                // turnos daquele combate.
                return { participanteId: null, extraCQC: false };
            }
            // Combate com iniciativa ativo, mas esta ficha não é uma das
            // participantes: ela está fora do combate e não pode fazer
            // nada DIRECIONADO a quem está nele (ataque, manobra, usar
            // arma) — evita personagens de fora "agindo contra" um
            // combate do qual não fazem parte.
            toast("Você não está participando deste combate — só dá pra rolar coisas que não mirem em quem está lutando.", "erro");
            return null;
        }
        const p = combateAtivoCache.participantes[meuId];
        const guardadas = p ? (Number(p.acoesGuardadas) || 0) : 0;

        if (combateAtivoCache.turnoAtual !== meuId) {
            // Fora do próprio turno só é permitido gastar uma ação
            // GUARDADA (ver "guardar_acao_combate" em avancarTurnoCombate/
            // confirmarAcaoPendente, em mestre.js) — o Mestre precisa ter
            // aprovado isso antes. consumirAcaoCombate já sabe descontar
            // de acoesGuardadas quando `acoes` normal está zerado.
            if (guardadas > 0) {
                return { participanteId: meuId, extraCQC: false, usouAcaoGuardada: true };
            }
            toast("Não é o seu turno.", "erro");
            return null;
        }
        if (p && Number(p.acoes) <= 0) {
            if (ehCQC && Number(p.acoesExtraCQC) > 0) {
                return { participanteId: meuId, extraCQC: true };
            }
            if (guardadas > 0) {
                return { participanteId: meuId, extraCQC: false, usouAcaoGuardada: true };
            }
            toast(p.iniciativaTravada ? "Tirou 1 na iniciativa — perdeu esse turno, sem ações." : "Sem ações restantes neste turno.", "erro");
            return null;
        }
        return { participanteId: meuId, extraCQC: false };
    }

    if (modoNpc) {
        const npcPid = npcParticipanteIdCombate();
        if (!npcPid) return { participanteId: null, extraCQC: false };
        const p = combateAtivoCache.participantes[npcPid];
        const guardadas = p ? (Number(p.acoesGuardadas) || 0) : 0;

        if (combateAtivoCache.turnoAtual !== npcPid) {
            if (guardadas > 0) {
                return { participanteId: npcPid, extraCQC: false, usouAcaoGuardada: true };
            }
            toast("Não é o turno desse NPC.", "erro");
            return null;
        }
        if (p && Number(p.acoes) <= 0) {
            if (ehCQC && Number(p.acoesExtraCQC) > 0) {
                return { participanteId: npcPid, extraCQC: true };
            }
            if (guardadas > 0) {
                return { participanteId: npcPid, extraCQC: false, usouAcaoGuardada: true };
            }
            toast(p.iniciativaTravada ? "Esse NPC tirou 1 na iniciativa — perdeu esse turno, sem ações." : "Esse NPC não tem ações restantes neste turno.", "erro");
            return null;
        }
        return { participanteId: npcPid, extraCQC: false };
    }

    return { participanteId: null, extraCQC: false };
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
//
// Quem está DENTRO do combate mas fora do seu turno (e sem ação
// guardada) fica com tudo travado — perícias, atributos, manobras e
// itens/armas (classe .combate-bloqueio-ativo).
//
// Quem está FORA do combate (meuId null) pode continuar rolando
// perícias/atributos normalmente (não é uma ação "contra" ninguém), mas
// não pode fazer nada direcionado a quem está em combate — manobras de
// combate e uso de armas/itens continuam travados (classe
// .combate-bloqueio-alvo, que trava só .btn-pericia-golpe/.btn-usar-item).
function travarAcoesForaDoTurno() {
    if (isMestre) return;
    const meuId = meuParticipanteIdCombate();
    const emCombate = combateComIniciativaAtivo();
    const meuTurno = emCombate && !!meuId && combateAtivoCache.turnoAtual === meuId;
    // Ação guardada (ver checarConsumoDeAcao/guardar_acao_combate): se o
    // Mestre já aprovou guardar uma ação, o personagem pode usá-la fora
    // do próprio turno — então a trava geral de botões não se aplica
    // nesse caso (a validação de verdade continua em checarConsumoDeAcao,
    // isso aqui só libera os botões pra chegar até lá).
    const p = meuId ? combateAtivoCache.participantes[meuId] : null;
    const temAcaoGuardada = p && Number(p.acoesGuardadas) > 0;
    const bloquearTudo = emCombate && !!meuId && !meuTurno && !temAcaoGuardada;
    // Fora do combate: só trava o que mira alguém (manobra/arma), não
    // as rolagens simples de perícia/atributo.
    const bloquearAlvo = emCombate && !meuId;
    document.body.classList.toggle("combate-bloqueio-ativo", bloquearTudo);
    document.body.classList.toggle("combate-bloqueio-alvo", bloquearAlvo);
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
        const qtdAcoesGuardadas = Number(p.acoesGuardadas) || 0;
        const badgeAcaoGuardada = qtdAcoesGuardadas > 0 ? ` <span title="Tem ${qtdAcoesGuardadas} ação(ões) guardada(s) — dá pra usar fora do seu turno">⏳${qtdAcoesGuardadas > 1 ? `×${qtdAcoesGuardadas}` : ""}</span>` : "";
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
        const badgeInfeccao = badgeInfeccaoCombate(p);
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
                <span class="combate-nome">${escapeHtml(p.nome)}${marcadorVoce}${badgeEsquiva}${badgeAcaoGuardada}${badgeContraAtaque}${badgeAgarrado}${badgeAlcance}${badgeDerrubado}${badgeImobilizado}${badgeDesacordado}${badgeOssosQuebrados}${botaoDispararAvancar}${badgeSaude}${badgeEnergia}${badgeStatus}${badgeInfeccao}</span>
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
            el.badgePendentesLateral.style.display = lista.length ? "flex" : "none";
            el.badgePendentesLateral.innerText = String(lista.length);
        }

        // Ações Pendentes têm lugar próprio agora: ícone fixo na lateral
        // esquerda que abre uma gaveta flutuante (ver configurarDrawerPendentes
        // abaixo), em vez de uma aba dentro do Painel do Mestre. Só
        // re-renderiza o conteúdo se a gaveta já estiver aberta.
        if (isMestre && el.drawerPendentes && el.drawerPendentes.classList.contains("aberto")) {
            montarPainelAcoesPendentes(el.drawerPendentesCorpo);
        }
        // O Gerenciador de Combate tem a caixa lateral de Ações Pendentes
        // embutida — precisa re-renderizar também quando a lista de
        // pendentes mudar, não só quando o estado do combate mudar.
        if (isMestre && el.modalCombateMestre && el.modalCombateMestre.classList.contains("active")) {
            el.combateMestreCorpo.innerHTML = "";
            montarGerenciadorCombate(el.combateMestreCorpo);
        }

        // Mantém a aba de Determinações em dia: some com "Solicitar
        // validação" assim que o pedido entra na fila (e, se o Mestre
        // acabou de confirmar/rejeitar em outra tela, reflete o status
        // novo aqui sem precisar trocar de aba).
        if (fichaAtual && document.getElementById("determinacoes-lista")) {
            renderizarDeterminacoes();
        }
    });
}

function montarPainelAcoesPendentes(corpo) {
    // BUG corrigido: essa função é chamada de novo toda vez que a fila
    // muda (ver configurarAcoesPendentes/onValue mais acima) — inclusive
    // logo depois de Confirmar/Rejeitar uma ação, quando ainda sobra
    // outra pendência. Sem limpar o corpo antes, os cards das ações que
    // continuam na fila eram desenhados de novo por CIMA dos antigos
    // (appendChild não substitui nada), duplicando-os no fim da lista a
    // cada atualização.
    corpo.innerHTML = "";
    if (!pendentesCache.length) {
        corpo.innerHTML = `<p class="hint">Nenhuma ação pendente no momento.</p>`;
        return;
    }
    pendentesCache.forEach(acao => {
        const card = document.createElement("div");
        card.className = "pendente-card";
        card.innerHTML = `<span>${escapeHtml(acao.detalhe || `${acao.nomeJogador}: ${acao.tipo}`)}</span>`;

        // "explosao_raio" (ver detonarExplosivoCenario, mestre.js, e
        // plano-explosivos-cenario.txt Fase 4) não é um pedido pra
        // Confirmar/Rejeitar como os outros — é uma pergunta binária
        // "esse participante estava no raio?". "Sim" já abre o painel
        // "Causar Dano" pré-preenchido (alvo/tipo/valor), pro Mestre só
        // conferir e clicar "Causar dano"; "Não" só descarta a pendência.
        // Em ambos os casos usa rejeitarAcaoPendente (só tira da fila —
        // não é "confirmação" de nada automático, o dano é aplicado à
        // parte pelo painel de dano).
        if (acao.tipo === "explosao_raio") {
            const botoesExp = document.createElement("div");
            botoesExp.className = "pendente-botoes";
            const btnSim = document.createElement("button");
            btnSim.className = "btn-red"; btnSim.type = "button"; btnSim.innerText = "💥 Sim, no raio";
            btnSim.addEventListener("click", async () => {
                await rejeitarAcaoPendente(acao.id);
                abrirAcaoMestre("dano", {
                    alvoTipo: acao.payload.participanteTipo,
                    alvoId: acao.payload.participanteRefId,
                    tipoDano: acao.payload.tipoDano,
                    valor: acao.payload.dano
                });
            });
            const btnNao = document.createElement("button");
            btnNao.className = "btn-ghost"; btnNao.type = "button"; btnNao.innerText = "Não, fora do raio";
            btnNao.addEventListener("click", async () => {
                await rejeitarAcaoPendente(acao.id);
                toast(`${acao.payload.participanteNome} fora do raio.`);
            });
            botoesExp.append(btnSim, btnNao);
            card.appendChild(botoesExp);
            corpo.appendChild(card);
            return; // pula o bloco genérico de Confirmar/Rejeitar abaixo
        }

        // "pegar_dinheiro_cenario" e "depositar_dinheiro_item" (ver
        // plano-cenario.txt e transformar_dinheiro_item, mestre.js) não
        // depositam mais automaticamente em "Dinheiro limpo": o Mestre
        // escolhe em qual saldo da ficha de destino o valor cai, na
        // hora de confirmar. Sem escolher, o botão Confirmar fica
        // desabilitado.
        let selectSaldoDestino = null;
        if (acao.tipo === "pegar_dinheiro_cenario" || acao.tipo === "depositar_dinheiro_item") {
            const idFichaDestino = acao.tipo === "pegar_dinheiro_cenario"
                ? (acao.payload && acao.payload.fichaDestinoId)
                : acao.fichaId;
            const fichaDestino = todasAsFichasCache[idFichaDestino];
            const saldosDestino = fichaDestino ? todosOsSaldos(fichaDestino) : [];
            selectSaldoDestino = document.createElement("select");
            selectSaldoDestino.innerHTML = '<option value="">-- em qual saldo? --</option>' +
                saldosDestino.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nome)} (${s.valor})</option>`).join("");
            selectSaldoDestino.style.marginTop = "6px";
            selectSaldoDestino.style.width = "100%";
            card.appendChild(selectSaldoDestino);
        }

        const botoes = document.createElement("div");
        botoes.className = "pendente-botoes";
        const btnConfirmar = document.createElement("button");
        btnConfirmar.className = "btn-lime"; btnConfirmar.type = "button"; btnConfirmar.innerText = "Confirmar";
        if (selectSaldoDestino) {
            btnConfirmar.disabled = true;
            selectSaldoDestino.addEventListener("change", () => { btnConfirmar.disabled = !selectSaldoDestino.value; });
        }
        btnConfirmar.addEventListener("click", async () => {
            if (selectSaldoDestino && !selectSaldoDestino.value) { toast("Escolha em qual saldo o dinheiro vai cair.", "erro"); return; }
            try {
                await confirmarAcaoPendente(acao, selectSaldoDestino ? { saldoDestinoId: selectSaldoDestino.value } : {});
                toast("Ação confirmada e aplicada.");
            } catch (err) {
                console.error(err);
                // guardar_item revalida no confirmarAcaoPendente (Fase 6) e,
                // se não couber mais, já cancela (remove) o pedido e lança
                // um erro com o motivo — mostra ele direto pro Mestre em vez
                // da mensagem genérica, e a lista se atualiza sozinha (o
                // pedido já saiu de acoesPendentes).
                toast(err && err.message ? err.message : "Falha ao confirmar a ação.", "erro");
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
    ouvirAvisoCustoVida((pendentes) => {
        ultimoAvisoCustoVida = pendentes || {};
        avaliarAvisoCustoVida();
    });

    el.custoVidaConfirmar.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId) return;
        const saldoId = el.custoVidaOrigem.value;
        const saldo = todosOsSaldos(fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const pendenteId = el.modalCustoVida.dataset.pendenteId || "";
        const total = await pagarCustoSemanal(fichaAtualId, fichaAtual, saldoId, pendenteId);
        toast(`Pago CN$ ${total} (${saldo.nome}).`);
        el.modalCustoVida.classList.remove("active");
        // Não precisa chamar avaliarAvisoCustoVida aqui na mão: o
        // listener da ficha (onValue, linha ~774) vai ecoar esse
        // pagamento (custoVidaPagos/{pendenteId} recém-marcado) e disparar
        // avaliarAvisoCustoVida de novo sozinho — se sobrar mais algum
        // pendente na fila (ex.: Timeskip que atravessou 2+ Domingos), o
        // modal reabre automaticamente pro próximo.
    });
}

// Acha, na fila de pendentes de custo de vida (`avisoCustoVida/pendentes`
// no Firebase), o mais antigo que ESTA ficha ainda não pagou. Um
// Timeskip que atravessa vários Domingos de uma vez gera vários
// pendentes; cada ficha paga um de cada vez, do mais antigo pro mais
// novo — nunca vê mais de um aviso simultâneo.
function proximoPendenteCustoVida() {
    if (!fichaAtual) return null;
    const pagos = (fichaAtual.dados && fichaAtual.dados.custoVidaPagos) || {};
    const pendentesOrdenados = Object.entries(ultimoAvisoCustoVida || {})
        .sort((a, b) => a[1] - b[1]) // mais antigo (Domingo mais atrás) primeiro
        .filter(([id]) => !pagos[id]);
    if (!pendentesOrdenados.length) return null;
    const [id] = pendentesOrdenados[0];
    return { id, restantes: pendentesOrdenados.length };
}

function avaliarAvisoCustoVida() {
    if (isMestre || !fichaAtual) return;
    const pendente = proximoPendenteCustoVida();
    if (!pendente) {
        if (el.modalCustoVida.classList.contains("active")) el.modalCustoVida.classList.remove("active");
        return;
    }
    // Já está mostrando esse mesmo pendente? Não reabre/repisca à toa.
    if (el.modalCustoVida.classList.contains("active") && el.modalCustoVida.dataset.pendenteId === pendente.id) return;
    abrirModalCustoVida(pendente);
}

function abrirModalCustoVida(pendente) {
    const total = custoSemanalTotal(fichaAtual);
    const notaFila = pendente.restantes > 1 ? ` (${pendente.restantes} pagamentos semanais pendentes — este é o mais antigo)` : "";
    el.custoVidaResumo.innerText = (fichaAtual.dados.padraoDeVida
        ? `Gasto semanal total: CN$ ${total}.`
        : `Defina um padrão de vida no Perfil antes de pagar (gasto atual considera só extras: CN$ ${total}).`) + notaFila;

    const saldos = todosOsSaldos(fichaAtual);
    el.custoVidaOrigem.innerHTML = "";
    saldos.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.nome;
        el.custoVidaOrigem.appendChild(opt);
    });

    el.modalCustoVida.dataset.pendenteId = pendente.id;
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
    // O Painel do Mestre não é mais um painel à parte que se abre por
    // botão: ele mora embutido direto na gaveta de Ações Pendentes (ver
    // drawer-pendentes-secao-mestre em ficha.html) e já aparece pronto
    // assim que a gaveta abre, sem precisar de clique extra. Só zera o
    // corpo aqui no setup inicial (nenhuma ação aberta por padrão).
    el.mestreCorpo.innerHTML = "";

    document.querySelectorAll(".mestre-acao").forEach(btn => {
        btn.addEventListener("click", () => abrirAcaoMestre(btn.dataset.acao));
    });

    // "×" do cabeçalho de #mestre-corpo (ver abrirAcaoMestre) — minimiza
    // o conteúdo aberto (ex.: Biblioteca de Itens, que pode ficar bem
    // grande) sem fechar a gaveta inteira, pra Ações Pendentes voltar a
    // aparecer logo depois da grade de botões em vez de precisar rolar
    // até o fim.
    if (el.mestreCorpoFechar) {
        el.mestreCorpoFechar.addEventListener("click", () => fecharAcaoMestre());
    }

    // Gerenciador de Combate — painel encostado na direita, pra dar pra
    // ver a ficha e o combate ao mesmo tempo (não é mais um modal de tela
    // cheia). Fecha só pelo botão "Fechar" — clicar na ficha atrás não
    // fecha, já que o objetivo é justamente poder usar as duas coisas
    // juntas.
    el.btnAbrirCombate.addEventListener("click", () => {
        el.modalCombateMestre.classList.add("active");
        el.combateMestreCorpo.innerHTML = "";
        montarGerenciadorCombate(el.combateMestreCorpo);
    });
    el.combateMestreFechar.addEventListener("click", () => el.modalCombateMestre.classList.remove("active"));

    // Gerenciador de Cenário — mesmo molde do de Combate acima (drawer
    // lateral, ficha continua usável ao lado).
    if (el.btnAbrirCenario && el.modalCenarioMestre) {
        el.btnAbrirCenario.addEventListener("click", () => {
            el.modalCenarioMestre.classList.add("active");
            el.cenarioMestreCorpo.innerHTML = "";
            montarGerenciadorCenario(el.cenarioMestreCorpo);
        });
        el.cenarioMestreFechar.addEventListener("click", () => el.modalCenarioMestre.classList.remove("active"));
    }
}

// A topbar agora é fixa no topo (pra barra de vida/energia ficar sempre
// visível), mas sua altura varia (quebra linha em telas menores, muda
// conforme itens equipados etc.). Essa função mede a altura real e guarda
// numa CSS var (--topbar-h) que o resto do CSS usa pra empurrar o
// conteúdo abaixo dela e posicionar o painel de info do topo. Roda no
// carregamento, no resize da janela e sempre que a topbar mudar de
// tamanho sozinha (ResizeObserver cobre a quebra de linha dos itens
// equipados sem precisar recalcular manualmente em cada render).
function ajustarEspacoTopbar() {
    if (!el.topbar) return;
    const altura = el.topbar.offsetHeight;
    if (altura > 0) {
        document.documentElement.style.setProperty("--topbar-h", altura + "px");
    }
}

// Botão de menu (☰) na topbar fixa: abre uma janela deslizante encostada
// no topo direito com tudo que não precisa ficar sempre visível — cargo,
// mesa, godmode, seletor de ficha/NPC do Mestre, indicador de sincronia
// e os botões de Painel do Mestre / Gerenciador de Combate. Mesmo padrão
// de "clicar fora fecha" da gaveta de Ações Pendentes.
function configurarPainelInfoTopo() {
    if (!el.btnAbrirInfoTopo || !el.painelInfoTopo) return;

    const abrir = () => el.painelInfoTopo.classList.add("aberto");
    const fechar = () => el.painelInfoTopo.classList.remove("aberto");

    el.btnAbrirInfoTopo.addEventListener("click", (e) => {
        e.stopPropagation();
        if (el.painelInfoTopo.classList.contains("aberto")) fechar(); else abrir();
    });

    document.addEventListener("click", (e) => {
        if (!el.painelInfoTopo.classList.contains("aberto")) return;
        if (el.painelInfoTopo.contains(e.target) || el.btnAbrirInfoTopo.contains(e.target)) return;
        fechar();
    });

    if (el.topbar && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => ajustarEspacoTopbar()).observe(el.topbar);
    }
    window.addEventListener("resize", ajustarEspacoTopbar);
    ajustarEspacoTopbar();
}

// Ícone fixo na lateral esquerda + gaveta flutuante (não é uma tela que
// sobrepõe tudo, como o Painel do Mestre — fica encostada na borda,
// desliza pra dentro/fora, e o resto da tela continua visível e usável
// por trás). Reaproveita montarPainelAcoesPendentes (mesma renderização
// usada na caixa lateral embutida do Gerenciador de Combate).
function configurarDrawerPendentes() {
    const abrir = () => {
        el.btnPendentesLateral.classList.add("aberto");
        el.drawerPendentes.classList.add("aberto");
        montarPainelAcoesPendentes(el.drawerPendentesCorpo);
    };
    const fechar = () => {
        el.btnPendentesLateral.classList.remove("aberto");
        el.drawerPendentes.classList.remove("aberto");
    };

    el.btnPendentesLateral.addEventListener("click", () => {
        if (el.drawerPendentes.classList.contains("aberto")) fechar(); else abrir();
    });
    el.drawerPendentesFechar.addEventListener("click", fechar);

    // Clicar fora da gaveta (e fora do próprio ícone, que já tem seu
    // próprio handler acima) fecha — sem precisar de um overlay escuro
    // bloqueando o resto da tela.
    document.addEventListener("click", (e) => {
        if (!el.drawerPendentes.classList.contains("aberto")) return;
        if (el.drawerPendentes.contains(e.target) || el.btnPendentesLateral.contains(e.target)) return;
        fechar();
    });
}

function nomeDeFicha(fichaId) {
    const f = todasAsFichasCache[fichaId];
    return f && f.config && f.config.nomeExibicao ? f.config.nomeExibicao : fichaId;
}

// Rótulos amigáveis pro cabeçalho de #mestre-corpo (ver
// mestre-corpo-titulo) — mesmo texto dos botões .mestre-acao em
// ficha.html, só que num lugar só pra não desalinhar se um dia mudar.
const ROTULOS_ACAO_MESTRE = {
    xp: "Dar XP",
    dado: "Rolar Dado",
    dano: "Causar Dano",
    npcs: "NPCs",
    dashboard: "Fichas ativas",
    biblioteca: "Biblioteca de Itens",
    "biblioteca-receitas": "Biblioteca de Receitas"
};

// Limpa e esconde o conteúdo aberto em #mestre-corpo (ver "×" ligado em
// configurarPainelMestre). Some com dataset.acaoAberta também, senão o
// listener em tempo real da Biblioteca (ver linha ~754/767 acima)
// reabriria o painel sozinho na próxima atualização do Banco Global.
function fecharAcaoMestre() {
    const corpo = el.mestreCorpo;
    corpo.innerHTML = "";
    delete corpo.dataset.acaoAberta;
    if (el.mestreCorpoTopo) el.mestreCorpoTopo.style.display = "none";
}

function abrirAcaoMestre(acao, prefill = null) {
    const corpo = el.mestreCorpo;
    corpo.innerHTML = "";
    corpo.dataset.acaoAberta = acao;

    // Cabeçalho com "×" pra minimizar (ver fecharAcaoMestre) — só some
    // com o conteúdo aberto, não desmarca nada em Firebase, então dá
    // pra reabrir clicando no mesmo botão de novo.
    if (el.mestreCorpoTopo) {
        el.mestreCorpoTitulo.innerText = ROTULOS_ACAO_MESTRE[acao] || "";
        el.mestreCorpoTopo.style.display = "flex";
    }

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
        const select = criarSelectFichas(true, prefill ? `${prefill.alvoTipo}::${prefill.alvoId}` : null);
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
        // Redução do Dano por Colete x Calibre (manual pg. 53) — só faz
        // sentido pra Perfuração Especial (tiro de arma de fogo); campo
        // opcional, some pros outros tipos de dano. Sem calibre
        // escolhido, aplicarDano cai no comportamento de sempre (soma
        // reducoesDano cheio, sem multiplicador nem piso contundente).
        const campoCalibre = document.createElement("div");
        campoCalibre.style.display = "none";
        campoCalibre.className = "modal-field";
        const labelCalibre = document.createElement("label");
        labelCalibre.innerText = "Calibre do tiro (opcional — aplica a redução por classe de proteção)";
        const selectCalibre = document.createElement("select");
        const optCalibrePlaceholder = document.createElement("option");
        optCalibrePlaceholder.value = ""; optCalibrePlaceholder.innerText = "Sem calibre específico";
        selectCalibre.appendChild(optCalibrePlaceholder);
        CALIBRES.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.key; opt.innerText = c.label;
            selectCalibre.appendChild(opt);
        });
        labelCalibre.appendChild(selectCalibre);
        campoCalibre.appendChild(labelCalibre);
        selectTipo.addEventListener("change", () => {
            campoCalibre.style.display = selectTipo.value === "perfuracao_especial" ? "block" : "none";
            if (selectTipo.value !== "perfuracao_especial") selectCalibre.value = "";
        });
        const btn = document.createElement("button");
        btn.className = "btn-red"; btn.type = "button"; btn.innerText = "Causar dano";
        btn.addEventListener("click", async () => {
            if (!select.value) { toast("Escolha um alvo.", "erro"); return; }
            if (!selectTipo.value) { toast("Escolha o tipo de dano.", "erro"); return; }
            const [tipo, id] = select.value.split("::");
            const resultado = await aplicarDano(tipo, id, Number(input.value) || 0, selectTipo.value, null, 0, selectCalibre.value || null);
            const tipoLabel = TIPOS_DANO.find(t => t.key === selectTipo.value)?.label || selectTipo.value;
            // Redução do Dano por Colete x Calibre (manual pg. 53):
            // aplicarDano já resolveu o multiplicador e o piso contundente
            // (quando calibre foi informado) — aqui só avisa no Log
            // quando o tipo de dano final saiu diferente do escolhido.
            const notaColete = (resultado.tipoDanoFinalAjustado && resultado.tipoDanoFinalAjustado !== selectTipo.value)
                ? ` 🦺 O colete freou o tiro, mas o impacto ainda causou dano CONTUNDENTE, ignorando o resto da redução.`
                : "";
            // Dilaceração por Explosão (item 7 do plano de saúde/
            // complicações) — só a fonte (a), automática por tipo de
            // dano (sem checkbox nenhum): dano de Explosão ≥ metade do
            // PV total do alvo. As fontes (b)/(c) (arma com checkbox
            // "Dilacera" + crítico) já são cobertas no fluxo de ataque
            // normal (resolverAtaque/resolverReacaoPendente), que tem a
            // arma e o resultado do crítico — esta ferramenta genérica
            // não tem nem um nem outro.
            let notaDilaceracao = "";
            if (selectTipo.value === "explosao") {
                const dilacerou = golpeDilacera({ ehExplosao: true, danoFinal: resultado.danoFinal, pvMaximo: resultado.pvMaximo });
                if (dilacerou) {
                    notaDilaceracao = " 🩸 DILACEROU!";
                    const pid = participanteIdPorAlvo(tipo, id);
                    if (pid && combateComIniciativaAtivo() && deveTestarSangramentoProfundo(dilacerou, resultado.danoFinal, resultado.pvMaximo)) {
                        const constituicaoAlvo = await buscarConstituicaoAlvo(tipo, id);
                        const resultadoSangramentoProfundo = await testarSangramentoProfundo(pid, constituicaoAlvo, resultado.danoFinal);
                        if (resultadoSangramentoProfundo) notaDilaceracao += ` ${resultadoSangramentoProfundo.detalhe}`;
                    }
                }
            }
            const detalhe = (resultado.reducao > 0
                ? `Mestre causou ${resultado.danoBruto} (${tipoLabel}) em ${resultado.nomeAlvo}. Redução: ${resultado.reducao}. Dano aplicado: ${resultado.danoFinal} (PV: ${resultado.novoPv}).`
                : `Mestre causou ${resultado.danoFinal} (${tipoLabel}) em ${resultado.nomeAlvo} (PV: ${resultado.novoPv}).`) + notaColete + notaDilaceracao;
            await registrarRolagem({ quem: "Mestre", modificador: 0, resultado: resultado.danoFinal, detalhe });
            toast(detalhe);
        });
        corpo.append(select, selectTipo, campoCalibre, input, btn);

        // Pré-preenchimento vindo da pendência "está no raio?" (Fase 4,
        // atalho pro painel de dano — ver plano-explosivos-cenario.txt):
        // alvo já é tratado acima, aqui só falta tipo de dano e valor.
        // Dispara o "change" manualmente pra campoCalibre reagir igual
        // reagiria a uma escolha manual do Mestre.
        if (prefill) {
            selectTipo.value = prefill.tipoDano;
            selectTipo.dispatchEvent(new Event("change"));
            input.value = prefill.valor;
        }

    } else if (acao === "npcs") {
        montarPainelNpcs(corpo);

    } else if (acao === "biblioteca") {
        montarPainelBibliotecaItens(corpo);

    } else if (acao === "biblioteca-receitas") {
        montarPainelBibliotecaReceitas(corpo);

    } else if (acao === "dashboard") {
        montarDashboardFichas(corpo);
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

// prefillValue (opcional): pré-seleciona um valor (formato "ficha::{id}"
// ou "npc::{id}", igual às options) assim que ele existir na lista.
// Necessário pro atalho da pendência "explosao_raio" (Fase 4) — como os
// NPCs chegam de forma assíncrona via ouvirNpcs, tentar `select.value =`
// synchronously logo após criar o select podia falhar se o alvo for um
// NPC ainda não carregado; aqui a seleção é reaplicada de novo assim que
// a lista de NPCs preencher.
function criarSelectFichas(incluirNpcs, prefillValue = null) {
    const select = document.createElement("select");
    select.innerHTML = '<option value="">-- escolha --</option>';
    Object.keys(todasAsFichasCache).forEach(id => {
        const opt = document.createElement("option");
        opt.value = incluirNpcs ? `ficha::${id}` : id;
        opt.innerText = nomeDeFicha(id);
        select.appendChild(opt);
    });
    if (prefillValue) select.value = prefillValue;
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
            if (prefillValue) select.value = prefillValue;
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
// existente, dentro do próprio Painel do Mestre (reaproveita o
// mestre-corpo, que já está visível dentro da gaveta de Ações Pendentes —
// só troca o conteúdo pelo formulário de edição).
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
// Scroll infinito genérico: em vez de jogar a lista inteira no DOM de
// uma vez (o Banco Global de Itens/Receitas só cresce com o tempo),
// renderiza só a primeira leva (tamanhoPagina) e vai completando o
// resto conforme o usuário rola pra perto do fim — mesma ideia do feed
// do Instagram. Usa um IntersectionObserver numa "sentinela" invisível
// no fim da lista: quando ela entra na área visível do container que
// rola de verdade (scrollRoot), carrega mais um lote.
// ---------------------------------------------------------------------
function montarListaComScrollInfinito({ container, scrollRoot, itens, renderItem, tamanhoPagina = 20, mensagemVazia = "Nada encontrado.", contadorEl = null }) {
    container.innerHTML = "";
    if (contadorEl) contadorEl.innerText = "";
    if (!itens.length) {
        container.innerHTML = `<p class="hint">${mensagemVazia}</p>`;
        return;
    }

    let carregados = 0;
    const sentinela = document.createElement("div");
    sentinela.className = "scroll-infinito-sentinela";
    container.appendChild(sentinela);

    const observer = new IntersectionObserver((entradas) => {
        if (entradas.some(e => e.isIntersecting)) carregarMais();
    }, { root: scrollRoot || null, rootMargin: "300px" });

    function carregarMais() {
        const proximos = itens.slice(carregados, carregados + tamanhoPagina);
        proximos.forEach(it => container.insertBefore(renderItem(it), sentinela));
        carregados += proximos.length;
        if (contadorEl) {
            contadorEl.innerText = carregados < itens.length
                ? `Mostrando ${carregados} de ${itens.length} — role pra ver mais`
                : `${itens.length} no total`;
        }
        if (carregados >= itens.length) observer.disconnect();
    }

    carregarMais();
    if (carregados < itens.length) observer.observe(sentinela);
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

    const contador = document.createElement("span");
    contador.className = "hint-inline scroll-infinito-contador";
    corpo.appendChild(contador);

    const lista = document.createElement("div");
    lista.style.display = "flex";
    lista.style.flexDirection = "column";
    lista.style.gap = "8px";
    corpo.appendChild(lista);

    const renderCardItem = (it) => {
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
        return card;
    };

    const renderLista = () => {
        const filtro = busca.value.trim().toLowerCase();
        const itens = itensGlobaisCache
            .filter(it => !filtro || (it.nome || "").toLowerCase().includes(filtro))
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        montarListaComScrollInfinito({
            container: lista,
            scrollRoot: el.drawerPendentes,
            itens,
            renderItem: renderCardItem,
            mensagemVazia: "Nenhum item no Banco Global ainda.",
            contadorEl: contador
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

    const contador = document.createElement("span");
    contador.className = "hint-inline scroll-infinito-contador";
    corpo.appendChild(contador);

    const lista = document.createElement("div");
    lista.style.display = "flex";
    lista.style.flexDirection = "column";
    lista.style.gap = "8px";
    corpo.appendChild(lista);

    const renderCardReceita = (r) => {
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
        return card;
    };

    const renderLista = () => {
        const filtro = busca.value.trim().toLowerCase();
        const receitas = receitasGlobaisCache
            .filter(r => !filtro || (r.nome || "").toLowerCase().includes(filtro))
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        montarListaComScrollInfinito({
            container: lista,
            scrollRoot: el.drawerPendentes,
            itens: receitas,
            renderItem: renderCardReceita,
            mensagemVazia: "Nenhuma receita no Banco Global ainda.",
            contadorEl: contador
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
            // O Painel do Mestre agora mora dentro da gaveta de Ações
            // Pendentes: ao escolher uma ficha aqui, fecha a gaveta
            // inteira (mesmo comportamento de "fechar" usado em
            // configurarDrawerPendentes).
            if (el.drawerPendentes) el.drawerPendentes.classList.remove("aberto");
            if (el.btnPendentesLateral) el.btnPendentesLateral.classList.remove("aberto");
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
            const qtdAcoesGuardadas = Number(p.acoesGuardadas) || 0;
            const badgeAcaoGuardada = qtdAcoesGuardadas > 0 ? ` <span title="Tem ${qtdAcoesGuardadas} ação(ões) guardada(s) — pode agir fora do próprio turno">⏳${qtdAcoesGuardadas > 1 ? `×${qtdAcoesGuardadas}` : ""}</span>` : "";
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
            // Infecção (Complicações de ferimentos — manual): flag
            // persistente, agora derivada do sistema de feridas (ver
            // sincronizarFlagInfeccaoAgregada em saude.js). Etapa 5 do
            // plano: "Testar Infecção" e "Tratar" saíram daqui — a
            // primeira mora na aba Saúde, vinculada à ferida específica
            // (abrirModalTestarInfeccaoFerida em ficha.js); a segunda
            // deixou de existir como ação solta (o que fecha a infecção
            // agora é tratar a ferida em si, não um botão de limpar flag).
            // O badge continua só como indicador visual pro Mestre
            // acompanhar durante o combate, sem nenhuma ação vinculada.
            const badgeInfeccao = (p.infeccao && p.infeccao.ativo)
                ? ` <span class="mod-pill negativo" title="Tempo de repouso necessário +50% até tratamento médico${p.infeccao.garantida ? " (infecção garantida)" : ""}${p.infeccao.origem ? ` — ${escapeHtml(p.infeccao.origem)}` : ""}">🦠 Infectado</span>`
                : "";
            const badgeIniciativaTravada = p.iniciativaTravada
                ? ` <span class="mod-pill negativo" title="Tirou 1 no d20 da iniciativa — perde esse turno inteiro (0 ações). Ao encerrar o turno, rerrola automaticamente e reordena a fila.">🎲1 Perdeu o turno</span>`
                : "";
            const acaoExtraCQCTexto = Number(p.acoesExtraCQCMax) > 0 ? ` <span title="CQC nível 5 (Agente Impossível) — ação extra só pra rolagens de CQC">🥋 ${p.acoesExtraCQC}/${p.acoesExtraCQCMax} ação CQC</span>` : "";
            linha.innerHTML = `
                <span class="combate-nome">${escapeHtml(p.nome)}${badgeEsquiva}${badgeAcaoGuardada}${badgeContraAtaque}${badgeAgarrado}${badgeAlcance}${badgeDerrubado}${badgeImobilizado}${badgeDesacordado}${badgeOssosQuebrados}${botaoDispararAvancar}${badgeSaude}${badgeEnergia}${badgeStatus}${badgeInfeccao}${badgeIniciativaTravada}</span>
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
// GERENCIADOR DE CENÁRIO (Mestre) — ver plano-cenario.txt, Fase 6.
// Cria/renomeia/encerra cenários, adiciona e remove participantes
// (ficha/NPC), itens soltos e veículos (sempre trancado + semChave).
// =====================================================================
let cenarioAbertoIdNoGerenciador = null; // qual cenário está expandido no momento (só 1 por vez, pra não poluir a tela)

function montarGerenciadorCenario(corpo) {
    // ---- Criar novo cenário ----
    const secaoNovo = document.createElement("div");
    secaoNovo.className = "section-header";
    secaoNovo.innerText = "Criar cenário";
    corpo.appendChild(secaoNovo);

    const inputTitulo = document.createElement("input");
    inputTitulo.type = "text";
    inputTitulo.placeholder = "Título do cenário (ex: Beco atrás do Neon Rosa)";
    const btnCriar = document.createElement("button");
    btnCriar.className = "btn-lime"; btnCriar.type = "button"; btnCriar.innerText = "+ Criar cenário";
    btnCriar.addEventListener("click", async () => {
        if (!inputTitulo.value.trim()) { toast("Dê um título ao cenário.", "erro"); return; }
        const novoId = await criarCenario({ titulo: inputTitulo.value.trim() });
        inputTitulo.value = "";
        cenarioAbertoIdNoGerenciador = novoId; // já abre expandido pra popular participantes/itens
        toast("Cenário criado.");
        // O próprio listener de configurarCenarios() re-renderiza o
        // Gerenciador quando cenariosCache mudar (push do Firebase).
    });
    corpo.append(inputTitulo, btnCriar);

    // ---- Lista de cenários ativos ----
    const secaoLista = document.createElement("div");
    secaoLista.className = "section-header";
    secaoLista.innerText = `Cenários ativos${cenariosCache.length ? ` (${cenariosCache.length})` : ""}`;
    secaoLista.style.marginTop = "14px";
    corpo.appendChild(secaoLista);

    if (!cenariosCache.length) {
        const vazio = document.createElement("p");
        vazio.className = "hint";
        vazio.innerText = "Nenhum cenário ativo no momento.";
        corpo.appendChild(vazio);
        return;
    }

    cenariosCache.forEach(cenario => {
        const card = document.createElement("div");
        card.className = "npc-card";
        card.style.flexDirection = "column";
        card.style.alignItems = "stretch";
        card.style.marginBottom = "10px";

        const topo = document.createElement("div");
        topo.style.display = "flex";
        topo.style.justifyContent = "space-between";
        topo.style.alignItems = "center";
        topo.style.cursor = "pointer";
        const participantesCount = Object.keys(cenario.participantes || {}).length;
        const itensCount = Object.keys(cenario.itens || {}).length;
        const veiculosCount = Object.keys(cenario.veiculos || {}).length;
        topo.innerHTML = `<span>🎬 <strong>${escapeHtml(cenario.titulo)}</strong> <span class="entity-sub">(${participantesCount} participante(s), ${itensCount} item(ns), ${veiculosCount} veículo(s))</span></span><span>${cenarioAbertoIdNoGerenciador === cenario.id ? "▲" : "▼"}</span>`;
        topo.addEventListener("click", () => {
            cenarioAbertoIdNoGerenciador = cenarioAbertoIdNoGerenciador === cenario.id ? null : cenario.id;
            el.cenarioMestreCorpo.innerHTML = "";
            montarGerenciadorCenario(el.cenarioMestreCorpo);
        });
        card.appendChild(topo);

        if (cenarioAbertoIdNoGerenciador === cenario.id) {
            const detalhe = document.createElement("div");
            detalhe.style.marginTop = "10px";
            detalhe.style.display = "flex";
            detalhe.style.flexDirection = "column";
            detalhe.style.gap = "10px";
            card.appendChild(detalhe);
            montarDetalheCenario(detalhe, cenario);
        }

        corpo.appendChild(card);
    });
}

// Conteúdo expandido de um cenário dentro do Gerenciador: renomear,
// participantes, itens, veículos e encerrar.
function montarDetalheCenario(detalhe, cenario) {
    const atualizar = () => {
        el.cenarioMestreCorpo.innerHTML = "";
        montarGerenciadorCenario(el.cenarioMestreCorpo);
    };

    // ---- Renomear ----
    const linhaTitulo = document.createElement("div");
    linhaTitulo.style.display = "flex";
    linhaTitulo.style.gap = "6px";
    const inputRenomear = document.createElement("input");
    inputRenomear.type = "text";
    inputRenomear.value = cenario.titulo;
    const btnRenomear = document.createElement("button");
    btnRenomear.className = "btn-ghost"; btnRenomear.type = "button"; btnRenomear.innerText = "Renomear";
    btnRenomear.addEventListener("click", async () => {
        if (!inputRenomear.value.trim()) { toast("Título não pode ficar vazio.", "erro"); return; }
        await renomearCenario(cenario.id, inputRenomear.value.trim());
        toast("Cenário renomeado.");
    });
    linhaTitulo.append(inputRenomear, btnRenomear);
    detalhe.appendChild(linhaTitulo);

    // ---- Encerrar cenário (ver plano-cenario.txt, Fase 7): remove o nó
    // inteiro — itens e veículos não levados pelos jogadores se perdem
    // junto, de propósito (cenário passageiro). ----
    const btnEncerrar = document.createElement("button");
    btnEncerrar.className = "btn-red"; btnEncerrar.type = "button"; btnEncerrar.innerText = "Encerrar cenário";
    btnEncerrar.style.alignSelf = "flex-start";
    btnEncerrar.addEventListener("click", async () => {
        if (!confirm(`Encerrar "${cenario.titulo}"? Itens e veículos não levados pelos jogadores se perdem junto. Essa ação não pode ser desfeita.`)) return;
        cenarioAbertoIdNoGerenciador = null;
        await excluirCenario(cenario.id);
        toast("Cenário encerrado.");
    });
    detalhe.appendChild(btnEncerrar);

    // ---- Participantes ----
    const secaoParticipantes = document.createElement("div");
    secaoParticipantes.className = "section-header";
    secaoParticipantes.innerText = "Participantes";
    detalhe.appendChild(secaoParticipantes);

    const participantes = cenario.participantes || {};
    Object.entries(participantes).forEach(([pid, p]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>${p.tipo === "ficha" ? "🧑" : "👤"} ${escapeHtml(p.nome)} <span class="entity-sub">(${p.tipo === "ficha" ? "jogador" : "NPC"})</span></span>`;
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerParticipanteCenario(cenario.id, pid); toast("Removido do cenário."); });
        linha.appendChild(btnRemover);
        detalhe.appendChild(linha);
    });

    const selectFichaAdd = criarSelectFichas(false);
    const btnAddFicha = document.createElement("button");
    btnAddFicha.className = "btn-lime"; btnAddFicha.type = "button"; btnAddFicha.innerText = "+ Add ficha";
    btnAddFicha.addEventListener("click", async () => {
        if (!selectFichaAdd.value) { toast("Escolha uma ficha.", "erro"); return; }
        const jaEsta = Object.values(participantes).some(p => p.tipo === "ficha" && p.refId === selectFichaAdd.value);
        if (jaEsta) { toast("Essa ficha já está no cenário.", "erro"); return; }
        await adicionarParticipanteCenario(cenario.id, { tipo: "ficha", refId: selectFichaAdd.value, nome: nomeDeFicha(selectFichaAdd.value) });
        toast("Ficha adicionada ao cenário.");
    });
    const linhaAddFicha = document.createElement("div");
    linhaAddFicha.style.display = "flex"; linhaAddFicha.style.gap = "6px";
    linhaAddFicha.append(selectFichaAdd, btnAddFicha);
    detalhe.appendChild(linhaAddFicha);

    const selectNpcAdd = document.createElement("select");
    selectNpcAdd.innerHTML = '<option value="">-- escolha um NPC --</option>';
    ouvirNpcs((npcs) => {
        const valorAtual = selectNpcAdd.value;
        selectNpcAdd.innerHTML = '<option value="">-- escolha um NPC --</option>';
        npcs.forEach(npc => {
            const opt = document.createElement("option");
            opt.value = npc.id; opt.innerText = npc.nome;
            selectNpcAdd.appendChild(opt);
        });
        selectNpcAdd.value = valorAtual;
    });
    const btnAddNpc = document.createElement("button");
    btnAddNpc.className = "btn-lime"; btnAddNpc.type = "button"; btnAddNpc.innerText = "+ Add NPC";
    btnAddNpc.addEventListener("click", async () => {
        if (!selectNpcAdd.value) { toast("Escolha um NPC.", "erro"); return; }
        const jaEsta = Object.values(participantes).some(p => p.tipo === "npc" && p.refId === selectNpcAdd.value);
        if (jaEsta) { toast("Esse NPC já está no cenário.", "erro"); return; }
        const nomeOpt = selectNpcAdd.options[selectNpcAdd.selectedIndex].innerText;
        await adicionarParticipanteCenario(cenario.id, { tipo: "npc", refId: selectNpcAdd.value, nome: nomeOpt });
        toast("NPC adicionado ao cenário.");
    });
    const linhaAddNpc = document.createElement("div");
    linhaAddNpc.style.display = "flex"; linhaAddNpc.style.gap = "6px";
    linhaAddNpc.append(selectNpcAdd, btnAddNpc);
    detalhe.appendChild(linhaAddNpc);

    // ---- Itens soltos ----
    const secaoItens = document.createElement("div");
    secaoItens.className = "section-header";
    secaoItens.innerText = "Itens no cenário";
    detalhe.appendChild(secaoItens);

    const itens = cenario.itens || {};
    Object.entries(itens).forEach(([itemId, it]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>📦 ${escapeHtml(it.nome || "(sem nome)")}</span>`;
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerItemCenario(cenario.id, itemId); toast("Item removido do cenário."); });
        linha.appendChild(btnRemover);
        detalhe.appendChild(linha);
    });

    const inputNomeItem = document.createElement("input");
    inputNomeItem.type = "text";
    inputNomeItem.placeholder = "Nome do item (ex: Pistola Militech)";
    const inputObsItem = document.createElement("input");
    inputObsItem.type = "text";
    inputObsItem.placeholder = "Observação (opcional)";
    const btnAddItem = document.createElement("button");
    btnAddItem.className = "btn-lime"; btnAddItem.type = "button"; btnAddItem.innerText = "+ Add item";
    btnAddItem.addEventListener("click", async () => {
        if (!inputNomeItem.value.trim()) { toast("Dê um nome ao item.", "erro"); return; }
        await adicionarItemCenario(cenario.id, { nome: inputNomeItem.value.trim(), observacao: inputObsItem.value.trim() || "" });
        inputNomeItem.value = ""; inputObsItem.value = "";
        toast("Item adicionado ao cenário.");
    });
    const linhaAddItem = document.createElement("div");
    linhaAddItem.style.display = "flex"; linhaAddItem.style.gap = "6px"; linhaAddItem.style.flexWrap = "wrap";
    linhaAddItem.append(inputNomeItem, inputObsItem, btnAddItem);
    detalhe.appendChild(linhaAddItem);

    // ---- Explosivos armados (ver plano-explosivos-cenario.txt, Fase 3)
    // — só o Mestre chega aqui. "Detonar" gera uma pendência "está no
    // raio?" por participante do cenário (jogadores E NPCs); o explosivo
    // continua listado depois (status "detonado"), pra não sumir do
    // radar de ninguém no meio da resolução das pendências — remoção
    // definitiva é sempre manual (decisão 6). Não tem formulário de "+
    // Add explosivo" aqui: só chega neste nó pelo "Armar" do jogador
    // (ficha.js, Fase 2). ----
    const secaoExplosivos = document.createElement("div");
    secaoExplosivos.className = "section-header";
    secaoExplosivos.innerText = "Explosivos armados";
    detalhe.appendChild(secaoExplosivos);

    const explosivos = cenario.explosivos || {};
    if (!Object.keys(explosivos).length) {
        const vazio = document.createElement("p");
        vazio.className = "hint";
        vazio.innerText = "Nenhum explosivo armado neste cenário.";
        detalhe.appendChild(vazio);
    }
    Object.entries(explosivos).forEach(([explosivoId, exp]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>💣 ${escapeHtml(exp.nome || "(sem nome)")} — dano ${exp.dano}, raio ${exp.raio}m
            ${exp.status === "detonado" ? " · <strong>já detonado</strong>" : ""}
            <span class="entity-sub">armado por ${escapeHtml(exp.armadoPorNome || "?")}${exp.moduloDetonacaoNome ? ` · ${escapeHtml(exp.moduloDetonacaoNome)}` : ""}</span></span>`;
        const botoes = document.createElement("span");
        botoes.style.display = "flex"; botoes.style.gap = "6px";
        if (exp.status !== "detonado") {
            const btnDetonar = document.createElement("button");
            btnDetonar.className = "btn-red"; btnDetonar.type = "button"; btnDetonar.innerText = "💥 Detonar";
            btnDetonar.addEventListener("click", async () => {
                if (!confirm(`Detonar "${exp.nome}"? Isso cria uma pendência "está no raio?" pra cada participante do cenário — a aplicação do dano fica pro painel de Ações Pendentes.`)) return;
                try {
                    await detonarExplosivoCenario(cenario.id, explosivoId);
                    toast("Pendências de raio de efeito criadas — resolva na fila de Ações Pendentes.");
                } catch (err) {
                    console.error(err);
                    toast(err && err.message ? err.message : "Falha ao detonar.", "erro");
                }
            });
            botoes.appendChild(btnDetonar);
        }
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-ghost"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerExplosivoCenario(cenario.id, explosivoId); toast("Explosivo removido do cenário."); });
        botoes.appendChild(btnRemover);
        linha.appendChild(botoes);
        detalhe.appendChild(linha);
    });

    // ---- Dinheiro solto no cenário (jogador pega um valor específico,
    // até o limite do saldo — ver btn-cenario-pegar-dinheiro em
    // renderizarCenarios e "pegar_dinheiro_cenario" em mestre.js) ----
    const secaoDinheiro = document.createElement("div");
    secaoDinheiro.className = "section-header";
    secaoDinheiro.innerText = "Dinheiro no cenário";
    detalhe.appendChild(secaoDinheiro);

    const dinheiros = cenario.dinheiro || {};
    Object.entries(dinheiros).forEach(([dinheiroId, d]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>💰 ${escapeHtml(d.nome || "Grana")} <span class="entity-sub">(saldo: ${Number(d.valor) || 0})</span></span>`;
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerDinheiroCenario(cenario.id, dinheiroId); toast("Dinheiro removido do cenário."); });
        linha.appendChild(btnRemover);
        detalhe.appendChild(linha);
    });

    const inputNomeDinheiro = document.createElement("input");
    inputNomeDinheiro.type = "text";
    inputNomeDinheiro.placeholder = "Nome do saldo (ex: Grana do cofre)";
    const inputValorDinheiro = document.createElement("input");
    inputValorDinheiro.type = "number";
    inputValorDinheiro.min = "1";
    inputValorDinheiro.placeholder = "Valor";
    const btnAddDinheiro = document.createElement("button");
    btnAddDinheiro.className = "btn-lime"; btnAddDinheiro.type = "button"; btnAddDinheiro.innerText = "+ Add dinheiro";
    btnAddDinheiro.addEventListener("click", async () => {
        if (!inputNomeDinheiro.value.trim()) { toast("Dê um nome ao saldo.", "erro"); return; }
        const valor = Math.floor(Number(inputValorDinheiro.value));
        if (!inputValorDinheiro.value || isNaN(valor) || valor <= 0) { toast("Digite um valor válido.", "erro"); return; }
        await adicionarDinheiroCenario(cenario.id, { nome: inputNomeDinheiro.value.trim(), valor });
        inputNomeDinheiro.value = ""; inputValorDinheiro.value = "";
        toast("Dinheiro adicionado ao cenário.");
    });
    const linhaAddDinheiro = document.createElement("div");
    linhaAddDinheiro.style.display = "flex"; linhaAddDinheiro.style.gap = "6px"; linhaAddDinheiro.style.flexWrap = "wrap";
    linhaAddDinheiro.append(inputNomeDinheiro, inputValorDinheiro, btnAddDinheiro);
    detalhe.appendChild(linhaAddDinheiro);

    // ---- Veículos (sempre trancado + semChave — ver adicionarVeiculoCenario) ----
    const secaoVeiculos = document.createElement("div");
    secaoVeiculos.className = "section-header";
    secaoVeiculos.innerText = "Veículos no cenário";
    detalhe.appendChild(secaoVeiculos);

    const veiculos = cenario.veiculos || {};
    Object.entries(veiculos).forEach(([veiculoId, v]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>🚗 ${escapeHtml(v.nome || "(sem nome)")} <span class="entity-sub">(${rotuloTipoVeiculo(v.tipo)}, ${v.trancado ? "🔒 Trancado" : "🔓 Destrancado"})</span></span>`;
        const botoes = document.createElement("span");
        botoes.style.display = "flex"; botoes.style.gap = "6px";
        const btnAlternar = document.createElement("button");
        btnAlternar.className = "btn-ghost"; btnAlternar.type = "button";
        btnAlternar.innerText = v.trancado ? "Destrancar (sucesso no Arrombar)" : "Trancar de novo";
        btnAlternar.addEventListener("click", async () => { await editarVeiculoCenario(cenario.id, veiculoId, { trancado: !v.trancado }); toast(v.trancado ? "Veículo destrancado." : "Veículo trancado."); });
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerVeiculoCenario(cenario.id, veiculoId); toast("Veículo removido do cenário."); });
        botoes.append(btnAlternar, btnRemover);
        linha.appendChild(botoes);
        detalhe.appendChild(linha);
    });

    const btnMostrarFormVeiculo = document.createElement("button");
    btnMostrarFormVeiculo.className = "btn-ghost"; btnMostrarFormVeiculo.type = "button"; btnMostrarFormVeiculo.innerText = "+ Add veículo";
    const areaFormVeiculo = document.createElement("div");
    areaFormVeiculo.style.display = "none";
    areaFormVeiculo.style.marginTop = "6px";
    areaFormVeiculo.style.display = "none";
    detalhe.append(btnMostrarFormVeiculo, areaFormVeiculo);

    btnMostrarFormVeiculo.addEventListener("click", () => {
        areaFormVeiculo.style.display = areaFormVeiculo.style.display === "none" ? "block" : "none";
        if (areaFormVeiculo.style.display === "block" && !areaFormVeiculo.hasChildNodes()) {
            montarFormularioVeiculoCenario(areaFormVeiculo, cenario.id);
        }
    });
}

// Formulário compacto pra criar um veículo direto num cenário — reaproveita
// os mesmos dados de ATRIBUTOS_VEICULO/TIPOS_VEICULO/escalaVeiculo já
// usados no modal de veículo da ficha, só que grava em
// cenarios/{id}/veiculos em vez de fichas/{id}/veiculos (ver
// adicionarVeiculoCenario em mestre.js, que já fixa trancado:true e
// semChave:true na escrita).
function montarFormularioVeiculoCenario(area, cenarioId) {
    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.placeholder = "Nome do veículo (ex: Quadra Vermelha)";
    area.appendChild(inputNome);

    const selectTipo = document.createElement("select");
    selectTipo.innerHTML = TIPOS_VEICULO.map(t => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join("");
    area.appendChild(selectTipo);

    const gridAtributos = document.createElement("div");
    gridAtributos.className = "grid-atributos";
    const selectsAtributo = {};
    ATRIBUTOS_VEICULO.forEach(chave => {
        const escala = escalaVeiculo(chave);
        const campo = document.createElement("div");
        campo.className = "modal-field";
        const label = document.createElement("label");
        label.innerText = escala.label;
        const select = document.createElement("select");
        select.innerHTML = escala.niveis.map((n, i) => `<option value="${i}">${i} — ${escapeHtml(n.efeito || "")}</option>`).join("");
        selectsAtributo[chave] = select;
        campo.append(label, select);
        gridAtributos.appendChild(campo);
    });
    area.appendChild(gridAtributos);

    const btnSalvar = document.createElement("button");
    btnSalvar.className = "btn-lime"; btnSalvar.type = "button"; btnSalvar.innerText = "Salvar veículo";
    btnSalvar.addEventListener("click", async () => {
        if (!inputNome.value.trim()) { toast("Dê um nome ao veículo.", "erro"); return; }
        const atributos = {};
        ATRIBUTOS_VEICULO.forEach(chave => { atributos[chave] = Number(selectsAtributo[chave].value) || 0; });
        await adicionarVeiculoCenario(cenarioId, { nome: inputNome.value.trim(), tipo: selectTipo.value, atributos });
        toast("Veículo adicionado ao cenário.");
    });
    area.appendChild(btnSalvar);
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
        <p class="hint">Confira tudo. Depois de confirmar, a edição de atributos e perícias fica travada até o próximo Level Up (o Treinamento aplica o ganho automaticamente, sem destravar a ficha).</p>
    `;
    el.criacaoCorpo.appendChild(resumo);

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 5; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Confirmar e começar a jogar", "btn-lime", async () => {
        c.concluida = true;
        fichaAtual.dados.criacaoConcluida = true;
        fichaAtual.dados.funcao = c.funcaoEscolhida; // persiste a função nos dados da ficha
        // PV/Energia atual começam no máximo calculado.
        const modificadoresPlanos = modificadoresAtuais();
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
