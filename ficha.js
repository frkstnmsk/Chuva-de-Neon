// =====================================================================
// CHUVA DE NEON — Ficha (orquestração principal)
// =====================================================================

import { db } from "./firebase-config.js";
import { ref, set, get, update, remove, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import {
    ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS,
    listaAlvosModificador, rotuloAlvo,
    coletarModificadores, calcularDerivados, calcularTotalPericia,
    rolarD20, rolarDado,
    atributoDefesaPorPericia, calcularDificuldadeDefesaJogador, calcularDanoTotalArma,
    calcularDanoDesarmado, calcularDificuldadeArmaFogo, MAX_ATRIBUTO_JOGO
} from "./regras.js";
import {
    PERICIAS_MANUAL, CATEGORIAS_PERICIA, listaPericiasPorCategoria, buscarPericiaPorNome,
    TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS,
    ehArma, ehCarregador, ehProjetil, tagTemNivel, rotuloTag, MANOBRAS_COMBATE,
    tagExigePericiaUso, periciasVinculaveisPorTag,
    CLASSES_PROTECAO, rotuloClasseProtecao, ehArmaDeFogo, tagExigeClasseProtecao,
    rotuloCampoCalibre, tagExigeCapacidadeCarregador, tagExigeQuantidadeProjetil,
    tagPodeReduzirDano,
    ALCANCES_ARMA_FOGO, PADROES_RECUO, rotuloAlcanceArmaFogo, rotuloPadraoRecuo,
    modificadorRecuo, ESCALA_MULT_DESARMADO, ehGolpeDesarmadoComDano,
    calcularEspecificidadeGolpe, bonusEsquivaBoxe, baseDificuldadeAtaque,
    atendeRequisitoPericia
} from "./dados-manual.js";
import { normalizarFicha, fichaVaziaPadrao } from "./normalizacao.js";
import {
    listaCategorias, nomeCategoria, criarCategoriaCustom, pesoTotalPorCategoria,
    calcularCargaAtual, itemPodeUsar, listaArmasInventario,
    listaCarregadoresInventario, listaProjeteisInventario
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
    mestreRolarDado, aplicarDano,
    ouvirNpcs, criarNpc, excluirNpc, passarODia,
    criarNpcDetalhado, atualizarNpcDetalhado,
    ouvirPopupTreinamento, confirmarAvancoTreinamento, descartarPopupTreinamento,
    pagarCustoSemanal,
    ouvirCombateAtivo, adicionarParticipanteCombate, removerParticipanteCombate, encerrarCombate,
    ouvirAcoesPendentes, criarAcaoPendente, rejeitarAcaoPendente, confirmarAcaoPendente,
    iniciarIniciativaCombate, avancarTurnoCombate, consumirAcaoCombate,
    abrirReacaoPendente, responderReacaoPendente
} from "./mestre.js";
import {
    ouvirItensGlobais, buscarItensGlobaisPorNome, salvarItemNoBanco,
    atualizarItemBanco, excluirItemBanco, autopreencherItemDoBanco
} from "./itens-globais.js";
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
        if (parsed && parsed.role) sessao = parsed;
    } catch (e) {
        sessao = null;
    }
}
if (!sessao) {
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
let listenerAtivo = null;
let salvandoDebounce = null;
let modalContexto = null; // { lista: "inventario", id: "..." } | null = criando nova
let godmodeAtivo = false;
let calendarioAtual = null;
let todasAsFichasCache = {};
// Cache local do Banco Global de Itens — carregado pra todo mundo (jogador
// e Mestre), já que o autocompletar do modal de item precisa dele em
// qualquer ficha, não só na Biblioteca do Painel do Mestre.
let itensGlobaisCache = [];
let categoriaInventarioAtiva = "levando";
let ultimoAvisoCustoVida = null; // último valor visto de `avisoCustoVida` no Firebase
let combateAtivoCache = { ativo: false, participantes: {} }; // Gerenciador de Combate (compartilhado)
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
    godmodeIndicador: document.getElementById("godmode-indicador"),
    painelMestreSeletor: document.getElementById("painel-mestre-seletor"),
    selectFicha: document.getElementById("select-ficha"),
    syncIndicator: document.getElementById("sync-indicator"),
    btnLogout: document.getElementById("btn-logout"),
    btnAbrirMestre: document.getElementById("btn-abrir-mestre"),
    badgePendentes: document.getElementById("badge-pendentes"),
    btnSalvar: document.getElementById("btn-salvar"),
    saveStatus: document.getElementById("save-status"),
    tabsNav: document.getElementById("tabs-nav"),
    gridAtributosPrimarios: document.getElementById("grid-atributos-primarios"),
    gridAtributosSecundarios: document.getElementById("grid-atributos-secundarios"),
    gridRecursos: document.getElementById("grid-recursos"),
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
    modalCampoNivelTag: document.getElementById("modal-campo-nivel-tag"),
    modalNivelTag: document.getElementById("modal-nivel-tag"),
    modalCampoPericiaUso: document.getElementById("modal-campo-pericia-uso"),
    modalPericiaUso: document.getElementById("modal-pericia-uso"),
    modalCampoClasseProtecao: document.getElementById("modal-campo-classe-protecao"),
    modalLabelClasseProtecao: document.getElementById("modal-label-classe-protecao"),
    modalClasseProtecao: document.getElementById("modal-classe-protecao"),
    modalCampoCarregadorCapacidade: document.getElementById("modal-campo-carregador-capacidade"),
    modalCarregadorCapacidade: document.getElementById("modal-carregador-capacidade"),
    modalCampoPeso: document.getElementById("modal-campo-peso"),
    modalPeso: document.getElementById("modal-peso"),
    modalCampoCategoriaItem: document.getElementById("modal-campo-categoria-item"),
    modalCategoriaItem: document.getElementById("modal-categoria-item"),
    modalConfigArma: document.getElementById("modal-config-arma"),
    modalArmaDanoBase: document.getElementById("modal-arma-dano-base"),
    modalArmaTipoDano: document.getElementById("modal-arma-tipo-dano"),
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
    div.className = "toast-msg" + (tipo === "erro" ? " erro" : "");
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

    el.btnSalvar.addEventListener("click", () => salvarTudo(true));

    if (isMestre) {
        el.painelMestreSeletor.style.display = "block";
        el.btnAbrirMestre.style.display = "inline-block";
        el.calendarioEdicaoMestre.style.display = "block";
        ouvirListaDeFichas();
        el.selectFicha.addEventListener("change", (e) => {
            if (e.target.value) {
                fichaAtualId = e.target.value;
                ativarSincronizacao();
            }
        });
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
    onValue(ref(db, "fichas"), (snapshot) => {
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

// ---------------------------------------------------------------------
// Sincronização em tempo real com a ficha ativa
// ---------------------------------------------------------------------
function ativarSincronizacao() {
    if (listenerAtivo) {
        off(ref(db, `fichas/${listenerAtivo}`));
    }
    if (!fichaAtualId) return;

    listenerAtivo = fichaAtualId;

    onValue(ref(db, `fichas/${fichaAtualId}`), (snapshot) => {
        if (_pausarListener > 0) return; // operação composta em andamento, ignorar
        el.carregando.style.display = "none";
        el.app.style.display = "flex";

        if (!snapshot.exists()) {
            toast("Essa ficha não existe mais na rede.", "erro");
            return;
        }
        fichaAtual = normalizarFicha(snapshot.val());
        el.nomeFichaAtiva.innerText = (fichaAtual.config.nomeExibicao || fichaAtualId).toUpperCase();

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
                <span class="max-label">/ <span data-recurso-max="${rec.key}">0</span></span>
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
}

// =====================================================================
// RENDERIZAÇÃO — chamada a cada snapshot novo do Firebase
// =====================================================================

function podeEditarPericiaAtributo() {
    if (!fichaAtual) return false;
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

function renderizarTudo() {
    if (!fichaAtual) return;
    const modificadoresPlanos = coletarModificadores(fichaAtual);

    renderizarPerfil();
    renderizarFinancas();
    renderizarAtributos(modificadoresPlanos);
    renderizarPericias(modificadoresPlanos);
    renderizarInventario(modificadoresPlanos);
    renderizarCombate();
    renderizarVantagensDesvantagens();
    renderizarEspecializacoes();
    renderizarTreinamento();
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
    const saldos = fichaAtual.saldos || {};
    el.financasSaldosGrid.innerHTML = "";
    Object.entries(saldos).forEach(([id, s]) => {
        const campo = document.createElement("div");
        campo.className = "campo";
        campo.innerHTML = `
            <label for="saldo-${id}">${escapeHtml(s.nome)}</label>
            <input type="number" id="saldo-${id}" data-saldo-id="${id}">
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
    const saldos = fichaAtual.saldos || {};
    const escolhaAnterior = el.financasGastarOrigem.value;
    el.financasGastarOrigem.innerHTML = "";
    Object.entries(saldos).forEach(([id, s]) => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.innerText = s.nome;
        el.financasGastarOrigem.appendChild(opt);
    });
    if (saldos[escolhaAnterior]) el.financasGastarOrigem.value = escolhaAnterior;
}

function configurarFinancas() {
    // Edição direta de saldo — só o Mestre (delegado, igual aos
    // atributos primários).
    document.addEventListener("input", (e) => {
        const saldoId = e.target.dataset && e.target.dataset.saldoId;
        if (!saldoId || !fichaAtualId || !isMestre) return;
        if (!fichaAtual.saldos || !fichaAtual.saldos[saldoId]) return;
        const valor = Number(e.target.value) || 0;
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
        await update(ref(db, `fichas/${fichaAtualId}/saldos`), fichaAtual.saldos);
        toast(`Saldo "${nome}" criado.`);
    });

    // Ganho fixo — declaração livre do jogador, não mexe em saldo agora,
    // só fica registrado pro crédito automático de Domingo. Não passa
    // pelo sistema de aprovação (não é uma transação, é uma "promessa").
    el.financasGanhoFixoSalvar.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId) return;
        const valor = Math.max(0, Number(el.financasGanhoFixo.value) || 0);
        fichaAtual.dados.ganhoFixo = valor;
        await update(ref(db, `fichas/${fichaAtualId}/dados`), { ganhoFixo: valor });
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
        const saldo = fichaAtual.saldos && fichaAtual.saldos[saldoId];
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
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(nome)}</span>
                ${sub ? `<span class="entity-sub">${escapeHtml(sub)}</span>` : ""}
            </div>
            ${direita ? `<span class="entity-sub">${escapeHtml(direita)}</span>` : ""}
        `;
        li.addEventListener("click", () => abrirModalEdicao(listaChave, id));
        container.appendChild(li);
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
    });

    // Recursos (PV, Energia) — máximo calculado, atual editável por qualquer um.
    const derivados = calcularDerivados(d, modificadoresPlanos);
    RECURSOS.forEach(rec => {
        const maxLabel = document.querySelector(`[data-recurso-max="${rec.key}"]`);
        const atualInput = document.querySelector(`[data-recurso-atual="${rec.key}"]`);
        const total = Math.round(derivados.recursos[rec.key].total);
        if (maxLabel) maxLabel.innerText = total;
        if (atualInput) {
            const valorSalvo = d[rec.key + "Atual"];
            if (document.activeElement !== atualInput) {
                atualInput.value = (valorSalvo === null || valorSalvo === undefined) ? total : valorSalvo;
            }
            atualInput.dataset.recursoKey = rec.key;
        }
    });

    // Secundários calculados
    ATRIBUTOS_SECUNDARIOS.forEach(attr => {
        const span = document.querySelector(`[data-attr-secundario-valor="${attr.key}"]`);
        if (span) span.innerText = Math.round(derivados.secundarios[attr.key].total * 10) / 10;
    });

    window._ultimosDerivados = derivados; // usado pelo detalhamento ao clicar
    window._ultimosModificadores = modificadoresPlanos;
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
        const calc = calcularTotalPericia(p, fichaAtual.dados, modificadoresPlanos);
        const li = document.createElement("li");
        if (!podeEditar) li.classList.add("locked-visual");
        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(p.nome)}${p.legado ? ' <span class="mod-pill">legado</span>' : ""}</span>
                <span class="entity-sub">nível ${p.nivel}${calc.ajustes.length ? ` + ${calc.ajustes.reduce((a, m) => a + m.valor, 0)} de modificadores` : ""}</span>
            </div>
            <div class="entity-badges">
                <button type="button" class="btn-rolar btn-blue" title="Rolar d20 + ${calc.total}">🎲 ${calc.total >= 0 ? "+" : ""}${calc.total}</button>
                <span class="total-rolagem">${calc.total}</span>
            </div>
        `;
        li.querySelector(".btn-rolar").addEventListener("click", async (e) => {
            e.stopPropagation();
            await rolarERegistrar(p.nome, calc.total);
        });
        li.addEventListener("click", () => abrirModalEdicao("pericias", id));
        el.listaPericias.appendChild(li);
    });
}

// Rola 1d20 + modificador e registra no Log de Dados, identificando quem
// rolou pelo nome da ficha ativa (jogador) ou "Mestre".
async function rolarERegistrar(nomeAlvo, modificador) {
    // Trava de ações: com combate com iniciativa ativo, uma rolagem do
    // jogador só acontece se for o turno dele E ele ainda tiver ação
    // sobrando nesse turno. A rolagem em si acontece na hora (o dado é
    // rolado e registrado no Log normalmente), mas o CONSUMO da ação
    // entra na fila do Sistema de Aprovação — o Mestre confirma o gasto
    // depois, igual a qualquer outra ação pendente.
    let participanteIdParaGastarAcao = null;
    if (!isMestre && combateComIniciativaAtivo()) {
        const meuId = meuParticipanteIdCombate();
        if (meuId) {
            if (combateAtivoCache.turnoAtual !== meuId) {
                toast("Não é o seu turno.", "erro");
                return;
            }
            const p = combateAtivoCache.participantes[meuId];
            if (p && Number(p.acoes) <= 0) {
                toast("Sem ações restantes neste turno.", "erro");
                return;
            }
            participanteIdParaGastarAcao = meuId;
        }
    }

    const bruto = rolarD20();
    const resultado = bruto + Number(modificador || 0);
    const quem = isMestre ? `Mestre (${nomeDeFicha(fichaAtualId) || "—"})` : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");
    await registrarRolagem({ quem, modificador, resultado, detalhe: `${nomeAlvo}: d20 (${bruto}) ${modificador >= 0 ? "+" : ""}${modificador}` });
    toast(`${nomeAlvo}: ${resultado} (d20: ${bruto} ${modificador >= 0 ? "+" : ""}${modificador})`);

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: quem,
            detalhe: `${quem} rolou "${nomeAlvo}" (resultado ${resultado}) e quer gastar 1 ação do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }
}

// Calcula o modificador de perícia a aplicar numa rolagem de uso/ataque,
// já respeitando a regra global: nível 0 (ou perícia inexistente na
// ficha) vira -1 fixo, em vez do total calculado normalmente.
function modificadorDePericiaComPenalidade(nomePericia, dadosPrimarios, pericias, modificadoresPlanos) {
    const entrada = Object.entries(pericias || {}).find(([, p]) => p.nome === nomePericia);
    if (!entrada || (Number(entrada[1].nivel) || 0) <= 0) return -1;
    return calcularTotalPericia(entrada[1], dadosPrimarios, modificadoresPlanos).total;
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

// Antes de disparar: exige carregador anexado e com munição. Se puder
// disparar, já desconta 1 projétil do carregador anexado.
async function consumirMunicaoSeArmaDeFogo(it) {
    if (!ehArmaComCarregador(it)) return true;
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
    await update(ref(db, `fichas/${fichaAtualId}/inventario/${carregadorId}/carregador`), carregadorAtualizado);
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

    const candidatos = listaProjeteisInventario(fichaAtual, carregadorItem.classeProtecao)
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
    await update(ref(db, `fichas/${fichaAtualId}/inventario`), inventarioAtualizado);
    toast(`${carregadorItem.nome} carregado (${carregadorAtualizado.municaoAtual}/${capacidadeMax}).`);
}

// ---------------------------------------------------------------------
// "Recarregar" uma arma: troca o carregador anexado por outro carregador
// do mesmo calibre, no inventário, que tenha mais munição do que o atual.
// Escolhe o de maior munição entre os candidatos.
// ---------------------------------------------------------------------
async function recarregarArma(armaId, armaItem) {
    if (!itemPodeUsar(armaItem)) { toast("A arma precisa estar em \"Levando consigo\".", "erro"); return; }
    const calibre = armaItem.classeProtecao;
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
    await update(ref(db, `fichas/${fichaAtualId}/inventario/${armaId}/arma`), armaAtualizada.arma);
    toast(`${armaItem.nome} recarregada com ${novoCarregador.nome} (${novoCarregador.carregador.municaoAtual}/${novoCarregador.carregador.capacidadeMax}).`);
}

// "Usar" um item/arma do inventário: rola d20 + o total da perícia
// vinculada a ele (nível + modificadores estruturados que apontam pra
// essa perícia). Regra global: por ser um teste de perícia, se o
// personagem estiver no nível 0 naquela perícia (ou nem tiver o
// registro dela), o modificador aplicado é -1, não o total calculado.
async function rolarUsoItem(it, modificadoresPlanos) {
    const nomePericia = it.periciaUso;
    if (!nomePericia) { toast("Este item não tem perícia vinculada.", "erro"); return; }
    const modificadorFinal = modificadorDePericiaComPenalidade(nomePericia, fichaAtual.dados, fichaAtual.pericias, modificadoresPlanos);
    await rolarERegistrar(`${it.nome} (${nomePericia})`, modificadorFinal);
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
        abrirModalSelecionarAlvo(it, modificadoresPlanos);
    } else {
        await rolarUsoItem(it, modificadoresPlanos);
    }
}

let contextoAtaque = null;

function abrirModalSelecionarAlvo(it, modificadoresPlanos) {
    const participantes = (combateAtivoCache && combateAtivoCache.participantes) || {};
    // Não deixa o atacante se selecionar como alvo de si mesmo.
    const opcoes = Object.entries(participantes).filter(([, p]) => !(p.tipo === "ficha" && p.refId === fichaAtualId));
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
    el.modalSelecionarAlvo.classList.add("active");
}

function configurarModalSelecionarAlvo() {
    el.alvoCancelar.addEventListener("click", () => {
        el.modalSelecionarAlvo.classList.remove("active");
        contextoAtaque = null;
    });
    el.modalSelecionarAlvo.addEventListener("click", (e) => {
        if (e.target === el.modalSelecionarAlvo) {
            el.modalSelecionarAlvo.classList.remove("active");
            contextoAtaque = null;
        }
    });
    el.alvoConfirmar.addEventListener("click", async () => {
        if (!contextoAtaque) return;
        const pid = el.alvoSelect.value;
        const participante = combateAtivoCache.participantes && combateAtivoCache.participantes[pid];
        if (!participante) { toast("Alvo inválido — pode ter saído do combate.", "erro"); return; }
        const { item, modificadoresPlanos } = contextoAtaque;
        el.modalSelecionarAlvo.classList.remove("active");
        contextoAtaque = null;
        await resolverAtaque(item, modificadoresPlanos, { ...participante, _pid: pid });
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
    pausarSync();
    try {
        const snap = await get(ref(db, `combateAtivo/disparosPorFicha/${fichaAtualId}/${chave}`));
        const atual = snap.exists() ? (Number(snap.val()) || 0) : 0;
        const proximo = atual + 1;
        await update(ref(db, `combateAtivo/disparosPorFicha/${fichaAtualId}`), { [chave]: proximo });
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
        await remove(ref(db, "combateAtivo/disparosPorFicha"));
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
async function resolverAtaque(it, modificadoresPlanosAtacante, participante) {
    const nomePericia = it.periciaUso;
    if (!nomePericia) { toast("Esta arma não tem perícia vinculada.", "erro"); return; }

    let participanteIdParaGastarAcao = null;
    if (!isMestre && combateComIniciativaAtivo()) {
        const meuId = meuParticipanteIdCombate();
        if (meuId) {
            if (combateAtivoCache.turnoAtual !== meuId) { toast("Não é o seu turno.", "erro"); return; }
            const p = combateAtivoCache.participantes[meuId];
            if (p && Number(p.acoes) <= 0) { toast("Sem ações restantes neste turno.", "erro"); return; }
            participanteIdParaGastarAcao = meuId;
        }
    }

    const nomeAtacante = fichaAtual?.config?.nomeExibicao || sessao?.nome || "Jogador";
    const armaConfig = it.arma || {};
    const ehFogo = ehArmaDeFogo(nomePericia) && !armaConfig.desarmado;

    // Recuo — só disparos de arma de fogo de verdade contam (golpe
    // desarmado nunca é "arma de fogo" mesmo se a perícia usada fosse
    // uma perícia de tiro, o que nem é o caso aqui).
    let modRecuo = 0;
    if (ehFogo) {
        const numeroDisparo = await proximoNumeroDisparo(it.id);
        modRecuo = modificadorRecuo(armaConfig.recuo, numeroDisparo);
    }
    const modPrecisao = ehFogo ? (Number(armaConfig.precisao) || 0) : 0;

    const modPericia = modificadorDePericiaComPenalidade(nomePericia, fichaAtual.dados, fichaAtual.pericias, modificadoresPlanosAtacante);
    const modAtaque = modPericia + modPrecisao + modRecuo;
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modAtaque;

    let dificuldade, nomeAlvo;
    try {
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, `fichas/${participante.refId}`));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            const fichaAlvo = normalizarFicha(snap.val());
            nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
            if (ehFogo) {
                const percepcaoAtacante = calcularDerivados(fichaAtual.dados, modificadoresPlanosAtacante).secundarios.percepcao.total;
                dificuldade = calcularDificuldadeArmaFogo(armaConfig.dificuldadeAcerto, percepcaoAtacante);
            } else {
                const atributoDefesaChave = atributoDefesaPorPericia(nomePericia);
                const modsAlvo = coletarModificadores(fichaAlvo);
                const baseDif = baseDificuldadeAtaque(it.nome, nomePericia);
                dificuldade = calcularDificuldadeDefesaJogador(fichaAlvo.dados, atributoDefesaChave, modsAlvo, baseDif);
            }
        } else {
            const snap = await get(ref(db, `npcs/${participante.refId}`));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
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

    const sinalMod = modAtaque >= 0 ? "+" : "";
    const acertou = resultadoAtaque >= dificuldade;
    const recuoTexto = modRecuo ? `, recuo ${modRecuo}` : "";
    const precisaoTexto = modPrecisao ? `, precisão ${modPrecisao >= 0 ? "+" : ""}${modPrecisao}` : "";

    // A rolagem do ataque já aconteceu e vai ser registrada de qualquer
    // forma (acerto ou erro) — só o gasto da ação do turno entra na fila
    // do Sistema de Aprovação, igual em qualquer outra rolagem.
    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome} (d20 ${resultadoAtaque} vs. dificuldade ${dificuldade}) e quer gastar 1 ação do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!acertou) {
        const detalhe = `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome} (${nomePericia}). ERRO — d20 ${brutoAtaque} ${sinalMod}${modAtaque} = ${resultadoAtaque} vs. dificuldade ${dificuldade}${recuoTexto}${precisaoTexto}.`;
        await registrarRolagem({ quem: nomeAtacante, modificador: modAtaque, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
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
        tipoDanoKey = armaConfig.tipoDano;
    }
    const tipoDanoLabel = TIPOS_DANO.find(t => t.key === tipoDanoKey)?.label || tipoDanoKey || "—";

    // Esquiva/Bloqueio (manual: só disponível depois que o alvo já teve
    // seu próprio turno na rodada). É UMA ação só, mas quem decide qual
    // manobra fazer com ela é o ALVO (na tela dele, ou o Mestre, se o
    // alvo for NPC) — não quem ataca. Por isso, em vez de resolver o
    // dano na hora, grava uma "reação pendente" no combate ativo (visível
    // em tempo real pra todo mundo) com tudo que falta pra fechar o
    // golpe, e devolve o controle: quem responde é quem recebeu o golpe,
    // via responderReacaoPendente() — ver mestre.js.
    if (combateComIniciativaAtivo() && participante.esquivaDisponivel) {
        await abrirReacaoPendente({
            participanteId: participante._pid,
            nomeAtacante, nomeAlvo, nomeArma: it.nome,
            danoTotal, tipoDanoKey, tipoDanoLabel, danoDadoTexto,
            alvoTipo: participante.tipo, alvoRefId: participante.refId,
            resultadoAtaque, dificuldade, modAtaque,
            recuoTexto, precisaoTexto, efeitoTexto:
                (armaConfig.efeitoExtra && armaConfig.efeitoExtra.trim()) ? ` Efeito extra: ${armaConfig.efeitoExtra.trim()}.` : ""
        });
        const detalheAguardando = `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! (${resultadoAtaque} vs. dificuldade ${dificuldade}${recuoTexto}${precisaoTexto}) Aguardando ${nomeAlvo} decidir entre Esquivar/Bloquear/Levar o golpe.`;
        toast(detalheAguardando);
        return;
    }

    let resultadoDano;
    try {
        resultadoDano = await aplicarDano(participante.tipo, participante.refId, danoTotal, tipoDanoKey);
    } catch (err) {
        console.error(err);
        toast("Ataque acertou, mas falhou ao aplicar o dano no alvo.", "erro");
        return;
    }

    const efeitoTexto = (armaConfig.efeitoExtra && armaConfig.efeitoExtra.trim()) ? ` Efeito extra: ${armaConfig.efeitoExtra.trim()}.` : "";
    const detalheDano = resultadoDano.reducao > 0
        ? `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! (${resultadoAtaque} vs. dificuldade ${dificuldade}${recuoTexto}${precisaoTexto}) Dano${danoDadoTexto}: ${resultadoDano.danoBruto} (${tipoDanoLabel}) - ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} de dano aplicado. PV restante: ${resultadoDano.novoPv}.${efeitoTexto}`
        : `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! (${resultadoAtaque} vs. dificuldade ${dificuldade}${recuoTexto}${precisaoTexto}) Dano${danoDadoTexto}: ${resultadoDano.danoFinal} (${tipoDanoLabel}) aplicado. PV restante: ${resultadoDano.novoPv}.${efeitoTexto}`;

    await registrarRolagem({ quem: nomeAtacante, modificador: modAtaque, resultado: resultadoDano.danoFinal, detalhe: detalheDano });
    toast(detalheDano);
}

// ---------------------------------------------------------------------
// INVENTÁRIO
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
    const itensCategoria = itens.filter(([, it]) => it.categoria === categoriaInventarioAtiva);
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
            const podeUsar = itemPodeUsar(it) && !!it.periciaUso;
            const ehFogo = ehArma(it.tag) && ehArmaDeFogo(it.periciaUso);
            const tagLabel = rotuloTag(it.tag) + (it.nivelTag ? ` nível ${it.nivelTag}` : "");
            const periciaLabel = it.periciaUso ? ` · Usa: ${escapeHtml(it.periciaUso)}` : "";
            const rotuloCalibreCampo = it.classeProtecao ? rotuloCampoCalibre(it.tag).replace(" (obrigatória)", "").replace(" (obrigatório)", "") : "";
            const classeLabel = it.classeProtecao ? ` · ${rotuloCalibreCampo} ${escapeHtml(it.classeProtecao)}` : "";
            const reducaoLabel = (it.reducoesDano && it.reducoesDano.length)
                ? ` · Reduz: ${it.reducoesDano.map(r => `${TIPOS_DANO.find(t => t.key === r.tipo)?.label || r.tipo} -${r.valor}`).join(", ")}`
                : "";
            const carregadorLabel = it.carregador
                ? ` · Munição: ${it.carregador.municaoAtual || 0}/${it.carregador.capacidadeMax || 0}`
                : "";
            const projetilLabel = it.projetil ? ` · Quantidade: ${it.projetil.quantidade || 0}` : "";
            const carregadorAnexadoLabel = (ehFogo && it.arma)
                ? (it.arma.carregadorId && fichaAtual.inventario?.[it.arma.carregadorId]
                    ? ` · Carregador: ${escapeHtml(fichaAtual.inventario[it.arma.carregadorId].nome)} (${fichaAtual.inventario[it.arma.carregadorId].carregador?.municaoAtual || 0}/${fichaAtual.inventario[it.arma.carregadorId].carregador?.capacidadeMax || 0})`
                    : " · Sem carregador anexado")
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
                    <span class="entity-sub">${tagLabel} · ${it.peso || 0} kg${periciaLabel}${classeLabel}${reducaoLabel}${carregadorLabel}${projetilLabel}${carregadorAnexadoLabel}</span>
                </div>
                <div class="entity-badges">
                    <button type="button" class="btn-usar-item btn-blue" ${podeUsar ? "" : "disabled"} title="${podeUsar ? `Rolar d20 + ${it.periciaUso}` : "Sem perícia vinculada"}">Usar</button>
                    ${ehFogo ? `<button type="button" class="btn-recarregar-item btn-blue" ${itemPodeUsar(it) ? "" : "disabled"} title="Trocar o carregador anexado por um com mais munição">Recarregar</button>` : ""}
                    ${ehCarregador(it.tag) ? `<button type="button" class="btn-carregar-item btn-blue" ${itemPodeUsar(it) ? "" : "disabled"} title="Carregar projéteis do mesmo calibre que estiverem no inventário">Carregar</button>` : ""}
                    ${(!isMestre && it.categoria === "levando") ? `<button type="button" class="btn-dar-item btn-ghost">Dar item</button>` : ""}
                    <select class="select-transferir"></select>
                </div>
            `;
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
                    await update(ref(db, `fichas/${fichaAtualId}/inventario/${id}`), { categoria: novaCategoria });
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
            const escala = ESCALAS_ARMA.find(e => e.key === cfg.escala);
            const mods = (cfg.modificacoesArma || []).join(", ");
            const podeUsar = itemPodeUsar(arma) && !!arma.periciaUso;
            const periciaLabel = arma.periciaUso ? ` · Perícia: ${escapeHtml(arma.periciaUso)}` : " · Sem perícia vinculada";
            const rotuloCalibreCampo = arma.classeProtecao ? rotuloCampoCalibre(arma.tag).replace(" (obrigatória)", "").replace(" (obrigatório)", "") : "";
            const classeLabel = arma.classeProtecao ? ` · ${rotuloCalibreCampo} ${escapeHtml(arma.classeProtecao)}` : "";
            const ehFogo = ehArmaDeFogo(arma.periciaUso);
            const carregadorAnexado = (ehFogo && cfg.carregadorId) ? fichaAtual.inventario?.[cfg.carregadorId] : null;
            const municaoLabel = ehFogo
                ? (carregadorAnexado
                    ? ` · Munição: ${carregadorAnexado.carregador?.municaoAtual || 0}/${carregadorAnexado.carregador?.capacidadeMax || 0}`
                    : " · Sem carregador anexado")
                : "";
            const fogoLabel = ehFogo
                ? ` · Dif. acerto ${cfg.dificuldadeAcerto ?? "—"} · Alcance ${rotuloAlcanceArmaFogo(cfg.alcance)} · Recuo: ${rotuloPadraoRecuo(cfg.recuo)}${cfg.precisao ? ` · Precisão ${cfg.precisao >= 0 ? "+" : ""}${cfg.precisao}` : ""}${municaoLabel}`
                : "";
            li.innerHTML = `
                <div class="entity-main">
                    <span class="entity-nome">${escapeHtml(arma.nome)} <span class="mod-pill tag">nível ${arma.nivelTag || "?"}</span></span>
                    <span class="entity-sub">Dano base: ${cfg.danoBase ?? 0}${tipoDano ? " · " + tipoDano.label : ""}${escala ? " · " + escala.label : ""}${periciaLabel}${classeLabel}${fogoLabel}</span>
                    ${mods ? `<span class="entity-sub">Modificações: ${escapeHtml(mods)}</span>` : ""}
                    ${cfg.efeitoExtra ? `<span class="entity-sub">Efeito extra: ${escapeHtml(cfg.efeitoExtra)}</span>` : ""}
                </div>
                <div class="entity-badges">
                    <button type="button" class="btn-usar-item btn-blue" ${podeUsar ? "" : "disabled"} title="${podeUsar ? `Rolar d20 + ${arma.periciaUso}` : "Precisa estar em 'Levando consigo' e ter perícia vinculada"}">Usar</button>
                    ${ehFogo ? `<button type="button" class="btn-recarregar-item btn-blue" ${podeUsar ? "" : "disabled"} title="Trocar o carregador anexado por um com mais munição">Recarregar</button>` : ""}
                </div>
            `;
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

    MANOBRAS_COMBATE.forEach(m => {
        const li = document.createElement("li");

        const periciasHtml = m.pericias.map(nomePericia => {
            const entrada = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === nomePericia);
            if (!entrada) return `<span class="manobra-pericia-texto">${escapeHtml(nomePericia)}</span>`;
            return `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="${escapeHtml(nomePericia)}" title="Rolar d20 + ${nomePericia}">${escapeHtml(nomePericia)} 🎲</button>`;
        }).join(", ") + ` <button type="button" class="btn-pericia-golpe btn-ghost" data-pericia-golpe="Sem Perícia" title="Rolar sem perícia treinada (-1 fixo)">Sem Perícia 🎲</button>`;

        // Boxe dá bônus passivo pra esquivar desarmado (+2) e contra
        // armas brancas (+1) — manual pg. 22. Não tem rolagem automática
        // (Esquivar é Agilidade x pontuação do ataque sofrido), então só
        // mostramos o bônus já calculado pra referência.
        let efeitoTexto = m.efeito;
        if (m.nome === "Esquivar") {
            const entradaBoxe = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === "Boxe");
            const bonus = entradaBoxe ? bonusEsquivaBoxe(entradaBoxe[1].nivel) : null;
            if (bonus) {
                efeitoTexto += ` · Bônus de Boxe: +${bonus.desarmado} vs. golpe desarmado, +${bonus.armaBranca} vs. arma branca`;
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
                const nomePericia = btn.dataset.periciaGolpe;
                const semPericia = nomePericia === "Sem Perícia";
                const entrada = semPericia ? null : Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === nomePericia);
                if (!semPericia && !entrada) return;

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
                        const modificador = semPericia ? -1 : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos).total;
                        const forcaAtual = Number(fichaAtual.dados.forca) || 0;
                        const danoCalc = calcularDanoDesarmado(forcaAtual, especificidade.escalaMult, especificidade);
                        const dadoTexto = danoCalc.dadoMultiplicador > 1
                            ? `1d${danoCalc.faces}×${danoCalc.dadoMultiplicador}: ${danoCalc.dado}×${danoCalc.dadoMultiplicador}=${danoCalc.dadoTotal}`
                            : `1d${danoCalc.faces}: ${danoCalc.dado}`;
                        await rolarERegistrar(`${m.nome} (${nomePericia}) · dano potencial ${danoCalc.total} (${dadoTexto} + ${danoCalc.bonusEscala})`, modificador);
                    }
                    return;
                }

                const modificador = semPericia ? -1 : calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos).total;
                await rolarERegistrar(`${m.nome} (${nomePericia})`, modificador);
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
    await update(ref(db, `fichas/${fichaAtualId}/treinamento`), fichaAtual.treinamento);
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

function agendarSalvamento(caminho, valor) {
    el.saveStatus.innerText = "salvando...";
    clearTimeout(salvandoDebounce);
    salvandoDebounce = setTimeout(async () => {
        try {
            // `caminho` aponta pro campo exato (ex: "dados/xp"); usamos set()
            // porque o valor é escalar — update() exige um objeto de pares
            // chave/valor relativos à ref, não serve pra sobrescrever uma
            // folha única da árvore.
            await set(ref(db, `fichas/${fichaAtualId}/${caminho}`), valor);
            el.saveStatus.innerText = "sincronizado em tempo real";
        } catch (e) {
            console.error(e);
            el.saveStatus.innerText = "erro ao salvar";
            toast("Não foi possível salvar agora.", "erro");
        }
    }, 500);
}

async function salvarTudo(manual) {
    if (!fichaAtual || !fichaAtualId) return;
    try {
        await set(ref(db, `fichas/${fichaAtualId}`), fichaAtual);
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
    if (!campo || !fichaAtualId) return;
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
    if (!campo || !fichaAtualId || e.target.tagName !== "SELECT") return;
    fichaAtual.dados[campo] = e.target.value;
    agendarSalvamento(`dados/${campo}`, e.target.value);
});

// Atributos primários — só funcionam se podeEditarPericiaAtributo() (Mestre+godmode)
document.addEventListener("input", (e) => {
    const attrKey = e.target.dataset && e.target.dataset.attrPrimario;
    if (!attrKey || !fichaAtualId || !podeEditarPericiaAtributo()) return;
    const valor = Number(e.target.value) || 0;
    fichaAtual.dados[attrKey] = valor;
    agendarSalvamento(`dados/${attrKey}`, valor);
});

// Recursos atuais (PV/Energia atual) — qualquer um pode editar (dano, cura...),
// mas nunca pode passar do máximo calculado (Constituição/fórmula do manual)
// nem ficar negativo. Sem essa trava, o campo aceitava qualquer número digitado
// (inclusive durante a Criação, antes de a ficha estar fechada), inflando o PV
// permanentemente.
document.addEventListener("input", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoKey;
    if (!recursoKey || !fichaAtualId) return;
    let valor = e.target.value === "" ? null : Number(e.target.value);
    if (valor !== null && !Number.isNaN(valor)) {
        const modificadoresPlanos = coletarModificadores(fichaAtual);
        const derivados = calcularDerivados(fichaAtual.dados, modificadoresPlanos);
        const max = Math.round(derivados.recursos[recursoKey].total);
        if (valor > max) valor = max;
        if (valor < 0) valor = 0;
        if (Number(e.target.value) !== valor) e.target.value = valor; // reflete o clamp na tela
    }
    const campo = recursoKey + "Atual";
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
        await update(ref(db, `fichas/${fichaAtualId}/categoriasInventario`), fichaAtual.categoriasInventario);
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
    el.modalCampoClasseProtecao.style.display = "none";
    el.modalCampoPeso.style.display = "none";
    el.modalCampoCategoriaItem.style.display = "none";
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
        el.modalPeso.value = existente.peso ?? 0;
        if (!ehBanco) el.modalCategoriaItem.value = existente.categoria || "levando";
        atualizarCamposPorTag(existente.tag, existente.nivelTag, existente.arma, existente.periciaUso, existente.classeProtecao, existente.reducoesDano, existente.carregador, existente.projetil);
    } else {
        el.modalNome.value = "";
        el.modalTag.value = "";
        el.modalPeso.value = 0;
        if (!ehBanco) el.modalCategoriaItem.value = categoriaInventarioAtiva || "levando";
        atualizarCamposPorTag("", null, null, null, null, null, null, null);
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
                el.modalPeso.value = it.peso ?? 0;
                el.modalDescricao.value = it.descricao || "";
                montarListaModificadores(it.modificadores || []);
                atualizarCamposPorTag(it.tag, it.nivelTag, it.arma, it.periciaUso, it.classeProtecao, it.reducoesDano, it.carregador, it.projetil);
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

// Reavalia se o campo "Classe de Proteção" deve aparecer, olhando o
// estado atual dos outros campos do modal (tag + perícia vinculada
// selecionada). Chamada tanto ao abrir o modal quanto sempre que a tag
// ou a perícia da arma mudam. Hoje só coletes exigem Classe de Proteção
// — armas de fogo passaram a usar Dificuldade de Acerto própria.
function atualizarVisibilidadeClasseProtecao(classeAtual) {
    const tagKey = el.modalTag.value;
    const periciaAtual = el.modalCampoPericiaUso.style.display !== "none" ? el.modalPericiaUso.value : null;
    const exige = tagExigeClasseProtecao(tagKey, periciaAtual);
    el.modalCampoClasseProtecao.style.display = exige ? "flex" : "none";
    if (exige) {
        if (el.modalLabelClasseProtecao) el.modalLabelClasseProtecao.innerText = rotuloCampoCalibre(tagKey);
        popularClassesProtecao(classeAtual);
    }
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
        popularCarregadorAnexado(cfg.carregadorId);
    }
}

// Popula o select "Carregador anexado" só com carregadores do inventário
// que casam com o calibre selecionado na arma (mesmo select de calibre
// usado por colete/carregador/projétil). Se o calibre ainda não tiver
// sido escolhido, mostra todos os carregadores do inventário.
function popularCarregadorAnexado(carregadorIdAtual) {
    if (!el.modalArmaCarregador) return;
    const calibreArma = (el.modalCampoClasseProtecao.style.display !== "none") ? el.modalClasseProtecao.value : null;
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

// Trocar a Classe de Proteção/Calibre da arma reavalia quais carregadores
// aparecem como compatíveis no select.
document.getElementById("modal-classe-protecao")?.addEventListener("change", () => {
    if (el.modalConfigArmaFogo.style.display !== "none") popularCarregadorAnexado(null);
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

function atualizarCamposPorTag(tagKey, nivelTag, armaConfig, periciaUsoAtual, classeProtecaoAtual, reducoesDanoAtuais, carregadorConfigAtual, projetilConfigAtual) {
    const temNivel = tagTemNivel(tagKey);
    el.modalCampoNivelTag.style.display = temNivel ? "flex" : "none";
    if (temNivel) el.modalNivelTag.value = nivelTag || 1;

    // Carregador — capacidade máxima é definida na criação do item.
    const exigeCapacidade = tagExigeCapacidadeCarregador(tagKey);
    el.modalCampoCarregadorCapacidade.style.display = exigeCapacidade ? "flex" : "none";
    if (exigeCapacidade) el.modalCarregadorCapacidade.value = (carregadorConfigAtual && carregadorConfigAtual.capacidadeMax) || 10;

    // Perícia vinculada — obrigatória em armas, eletrônicos, ferramentas
    // de criação (geral e química) e destraves (é ela que o botão "Usar"
    // do inventário rola).
    const exigePericia = tagExigePericiaUso(tagKey);
    el.modalCampoPericiaUso.style.display = exigePericia ? "flex" : "none";
    if (exigePericia) {
        const opcoes = periciasVinculaveisPorTag(tagKey);
        el.modalPericiaUso.innerHTML = "";
        opcoes.forEach(nome => {
            const opt = document.createElement("option");
            opt.value = nome;
            opt.innerText = nome;
            el.modalPericiaUso.appendChild(opt);
        });
        el.modalPericiaUso.value = (periciaUsoAtual && opcoes.includes(periciaUsoAtual)) ? periciaUsoAtual : opcoes[0];
    }

    const arma = ehArma(tagKey);
    el.modalConfigArma.style.display = arma ? "block" : "none";
    if (arma) {
        el.modalArmaDanoBase.value = (armaConfig && armaConfig.danoBase) ?? 0;
        el.modalArmaTipoDano.value = (armaConfig && armaConfig.tipoDano) || TIPOS_DANO[0].key;
        el.modalArmaEscala.value = (armaConfig && armaConfig.escala) || "";
        montarModificacoesArma((armaConfig && armaConfig.modificacoesArma) || []);
    }

    // Redução de dano — só pra tags do tipo "colete/placa".
    const reduzDano = tagPodeReduzirDano(tagKey);
    el.modalConfigReducaoDano.style.display = reduzDano ? "block" : "none";
    if (reduzDano) montarReducaoDanoChecklist(reducoesDanoAtuais);

    // Classe de Proteção — só coletes exigem, hoje.
    atualizarVisibilidadeClasseProtecao(classeProtecaoAtual);
    // Características de Arma de Fogo — dependem da perícia vinculada
    // selecionada acima, então são avaliadas depois dela estar montada.
    atualizarVisibilidadeArmaFogo(armaConfig);
}

document.getElementById("modal-tag")?.addEventListener("change", (e) => {
    atualizarCamposPorTag(e.target.value, null, null, null, null, null, null, null);
});

// Trocar a perícia vinculada de uma arma (ex: de "CQC" pra "Armas de
// Fogo de Pequeno Porte") pode ligar/desligar a exigência de Classe de
// Proteção e o bloco de Arma de Fogo sem precisar trocar a tag —
// reavalia os dois na hora.
document.getElementById("modal-pericia-uso")?.addEventListener("change", () => {
    atualizarVisibilidadeClasseProtecao(null);
    atualizarVisibilidadeArmaFogo(null);
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

    if (!fichaAtual || !fichaAtualId) { toast("Nenhuma ficha selecionada.", "erro"); return; }

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
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal()
    };
    const idFinal = id || gerarIdLocal();
    if (!fichaAtual[lista]) fichaAtual[lista] = {};
    fichaAtual[lista][idFinal] = registro;
    await update(ref(db, `fichas/${fichaAtualId}/${lista}`), fichaAtual[lista]);
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
    await update(ref(db, `fichas/${fichaAtualId}/pericias`), fichaAtual.pericias);
    toast("Perícia salva.");
    fecharModal();
}

// Monta o objeto `arma` a partir do modal — compartilhado entre item de
// inventário e item do Banco Global. Sempre grava danoBase (número) e
// tipoDano; escala só se não for arma de fogo; e as características de
// Arma de Fogo (capacidade, disparos por turno, precisão, dificuldade
// de acerto, alcance, recuo, efeito extra) só quando a perícia vinculada
// for uma perícia de Arma de Fogo.
function lerConfigArmaDoModal(periciaUso) {
    const ehFogo = ehArmaDeFogo(periciaUso);
    return {
        danoBase: Number(el.modalArmaDanoBase.value) || 0,
        tipoDano: el.modalArmaTipoDano.value,
        escala: ehFogo ? null : (el.modalArmaEscala.value || null),
        modificacoesArma: lerModificacoesArmaDoModal(),
        capacidade: ehFogo ? (Number(el.modalArmaCapacidade.value) || 0) : null,
        disparosPorTurno: ehFogo ? (Number(el.modalArmaDisparosTurno.value) || 1) : null,
        precisao: ehFogo ? (Number(el.modalArmaPrecisao.value) || 0) : null,
        dificuldadeAcerto: ehFogo ? (Number(el.modalArmaDificuldadeAcerto.value) || 0) : null,
        alcance: ehFogo ? (el.modalArmaAlcance.value || null) : null,
        recuo: ehFogo ? (el.modalArmaRecuo.value || null) : null,
        efeitoExtra: ehFogo ? el.modalArmaEfeitoExtra.value.trim() : "",
        carregadorId: ehFogo ? (el.modalArmaCarregador.value || null) : null
    };
}

async function salvarItemDoModal(id) {
    const nome = el.modalNome.value.trim();
    const tag = el.modalTag.value;
    if (!nome) { toast("Dê um nome ao item.", "erro"); return; }
    if (!tag) { toast("Toda item precisa de uma tag do sistema.", "erro"); return; }

    const exigePericia = tagExigePericiaUso(tag);
    const periciaUso = exigePericia ? el.modalPericiaUso.value : null;
    if (exigePericia && !periciaUso) { toast("Escolha a perícia vinculada a este item.", "erro"); return; }

    const exigeClasseProtecao = tagExigeClasseProtecao(tag, periciaUso);
    const classeProtecao = exigeClasseProtecao ? el.modalClasseProtecao.value : null;
    if (exigeClasseProtecao && !classeProtecao) { toast(`Escolha ${rotuloCampoCalibre(tag).replace(" (obrigatória)", "").replace(" (obrigatório)", "").toLowerCase()} deste item.`, "erro"); return; }

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

    // Projétil — quantidade de rounds que esse item representa. Não tem
    // mais caixa própria no modal: ao editar um item existente preserva
    // a quantidade já jogada; item novo nasce com 1 (some do modal e
    // some da lista quando carregado num carregador, então pra estocar
    // mais rounds basta duplicar/criar outro item do mesmo calibre).
    let projetil = null;
    if (tagExigeQuantidadeProjetil(tag)) {
        const existenteProjetil = (id && fichaAtual.inventario && fichaAtual.inventario[id] && fichaAtual.inventario[id].projetil) || null;
        projetil = { quantidade: existenteProjetil ? (Number(existenteProjetil.quantidade) || 0) : 1 };
    }

    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        tag,
        nivelTag: tagTemNivel(tag) ? Number(el.modalNivelTag.value) : null,
        peso: Number(el.modalPeso.value) || 0,
        categoria: el.modalCategoriaItem.value || "levando",
        periciaUso,
        classeProtecao,
        reducoesDano: tagPodeReduzirDano(tag) ? lerReducaoDanoDoModal() : [],
        arma: ehArma(tag) ? lerConfigArmaDoModal(periciaUso) : null,
        carregador,
        projetil
    };
    const idFinal = id || gerarIdLocal();
    if (!fichaAtual.inventario) fichaAtual.inventario = {};
    fichaAtual.inventario[idFinal] = registro;
    await update(ref(db, `fichas/${fichaAtualId}/inventario`), fichaAtual.inventario);

    // "Save & Reuse": se o checkbox estiver marcado, o mesmo item também
    // vai pro Banco Global (sem o campo "categoria", que é específico de
    // onde ele está guardado nesta ficha).
    if (el.modalCampoSalvarBanco.style.display !== "none" && el.modalSalvarBanco.checked) {
        const nomeJogador = fichaAtual?.config?.nomeExibicao || fichaAtualId;
        await salvarItemNoBanco(registro, nomeJogador);
        toast(`Item salvo na ficha e no Banco Global.`);
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
    const periciaUso = exigePericia ? el.modalPericiaUso.value : null;
    if (exigePericia && !periciaUso) { toast("Escolha a perícia vinculada a este item.", "erro"); return; }

    const exigeClasseProtecao = tagExigeClasseProtecao(tag, periciaUso);
    const classeProtecao = exigeClasseProtecao ? el.modalClasseProtecao.value : null;
    if (exigeClasseProtecao && !classeProtecao) { toast(`Escolha ${rotuloCampoCalibre(tag).replace(" (obrigatória)", "").replace(" (obrigatório)", "").toLowerCase()} deste item.`, "erro"); return; }

    // Molde do Banco Global: carregador/carregadorId nunca guardam estado
    // de munição de uma ficha específica — só a capacidade máxima serve
    // de template; o resto começa zerado/vazio.
    let carregador = null;
    if (tagExigeCapacidadeCarregador(tag)) {
        const capacidadeMax = Number(el.modalCarregadorCapacidade.value) || 0;
        if (capacidadeMax <= 0) { toast("Informe a capacidade do carregador.", "erro"); return; }
        carregador = { capacidadeMax, municaoAtual: 0, projeteisCarregados: [] };
    }
    // Molde do Banco Global também não tem mais a caixa de quantidade —
    // todo item de projétil salvo no banco nasce com 1 unidade.
    let projetil = null;
    if (tagExigeQuantidadeProjetil(tag)) {
        projetil = { quantidade: 1 };
    }
    const armaConfig = ehArma(tag) ? lerConfigArmaDoModal(periciaUso) : null;
    if (armaConfig) armaConfig.carregadorId = null;

    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        tag,
        nivelTag: tagTemNivel(tag) ? Number(el.modalNivelTag.value) : null,
        peso: Number(el.modalPeso.value) || 0,
        periciaUso,
        classeProtecao,
        reducoesDano: tagPodeReduzirDano(tag) ? lerReducaoDanoDoModal() : [],
        arma: armaConfig,
        carregador,
        projetil
    };

    if (id) {
        await atualizarItemBanco(id, registro);
        toast("Item do Banco Global atualizado.");
    } else {
        await salvarItemNoBanco(registro, null);
        toast("Item criado no Banco Global.");
    }
    fecharModal();
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
    await update(ref(db, `fichas/${fichaAtualId}/gastosExtras`), fichaAtual.gastosExtras);
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

    if (!fichaAtual || !fichaAtualId) { toast("Nenhuma ficha selecionada.", "erro"); return; }

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
    await remove(ref(db, `fichas/${fichaAtualId}/${lista}/${id}`));
    toast("Excluído.");
    fecharModal();
}

// =====================================================================
// CALENDÁRIO
// =====================================================================

function configurarCalendario() {
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
        }
    });

    if (isMestre) {
        el.btnSalvarCalendario.addEventListener("click", async () => {
            const novo = {
                ...calendarioAtual,
                dataLabel: el.calEditData.value,
                hora: el.calEditHora.value,
                temperatura: Number(el.calEditTemp.value) || 0,
                clima: el.calEditClima.value
            };
            await salvarCalendario(novo);
            toast("Calendário atualizado.");
        });

        el.btnPassarDia.addEventListener("click", async () => {
            if (!calendarioAtual) return;
            const fichasParaPopup = todasAsFichasCache;
            const { virouDomingo, popups } = await passarODia(calendarioAtual, fichasParaPopup);
            toast(virouDomingo ? "Dia avançado — caiu Domingo!" : "Dia avançado.");
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
            li.className = "log-bolha" + (entrada.quem && entrada.quem.toLowerCase().includes("mestre") ? " log-mestre" : "");
            const modText = entrada.modificador ? ` (${entrada.modificador >= 0 ? "+" : ""}${entrada.modificador})` : "";
            const hora = entrada.timestamp ? new Date(entrada.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
            li.innerHTML = `
                <div class="log-linha-topo">
                    <span class="log-quem">${escapeHtml(entrada.quem || "—")}</span>
                    <span class="log-hora">${hora}</span>
                </div>
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
}

// =====================================================================
// GERENCIADOR DE COMBATE (compartilhado — Mestre monta, jogador consome)
// =====================================================================

function configurarCombateAtivo() {
    ouvirCombateAtivo((estado) => {
        combateAtivoCache = estado || { ativo: false, participantes: {} };
        // Se o painel do Gerenciador de Combate estiver aberto no momento
        // (ação "combate" do Mestre), atualiza a lista em tempo real.
        if (isMestre && el.mestreCorpo && el.mestreCorpo.dataset.acaoAberta === "combate") {
            abrirAcaoMestre("combate");
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
    el.reacaoDefesaCorpo.innerHTML = `
        <p class="hint">${escapeHtml(r.nomeAtacante)} acertou ${escapeHtml(r.nomeAlvo)} com ${escapeHtml(r.nomeArma)} (${r.resultadoAtaque} vs. dificuldade ${r.dificuldade}). Dano previsto${escapeHtml(r.danoDadoTexto || "")}: ${r.danoTotal} (${escapeHtml(r.tipoDanoLabel)}).</p>
        <p class="hint">${escapeHtml(r.nomeAlvo)} tem a ação de Esquiva/Bloqueio guardada. Esquivar anula o golpe inteiro; Bloquear reduz o dano pela metade (não reduz dano perfurante). Escolha uma opção, ou deixe passar o golpe cheio sem gastar a ação.</p>
    `;
    el.reacaoDefesaBotoes.innerHTML = "";
    const responder = async (escolha) => {
        el.reacaoDefesaBotoes.querySelectorAll("button").forEach(b => b.disabled = true);
        const resultado = await responderReacaoPendente(escolha);
        if (resultado) toast(resultado.detalhe);
        el.modalReacaoDefesa.classList.remove("active");
    };
    const btnEsquivar = document.createElement("button");
    btnEsquivar.className = "btn-lime"; btnEsquivar.type = "button"; btnEsquivar.innerText = "Esquivar";
    btnEsquivar.addEventListener("click", () => responder("esquivar"));
    const btnBloquear = document.createElement("button");
    btnBloquear.className = "btn-blue"; btnBloquear.type = "button"; btnBloquear.innerText = "Bloquear";
    btnBloquear.addEventListener("click", () => responder("bloquear"));
    const btnNenhuma = document.createElement("button");
    btnNenhuma.className = "btn-ghost"; btnNenhuma.type = "button"; btnNenhuma.innerText = "Levar o golpe cheio";
    btnNenhuma.addEventListener("click", () => responder("nenhuma"));
    el.reacaoDefesaBotoes.appendChild(btnEsquivar);
    el.reacaoDefesaBotoes.appendChild(btnBloquear);
    el.reacaoDefesaBotoes.appendChild(btnNenhuma);
    el.modalReacaoDefesa.classList.add("active");
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
        const badgeEsquiva = p.esquivaDisponivel ? ` <span title="Tem ação de Esquiva/Bloqueio guardada">🛡️</span>` : "";
        return `
            <div class="combate-linha ${ativo ? "combate-linha-ativa" : ""}">
                <span class="combate-nome">${escapeHtml(p.nome)}${marcadorVoce}${badgeEsquiva}</span>
                <span>Iniciativa ${p.iniciativa}</span>
                <span>${p.pv}/${p.pvMax} PV</span>
                <span>${p.acoes}/${p.acoesMax} ações</span>
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
        // A aba de Combate tem a caixa lateral de Ações Pendentes embutida
        // — precisa re-renderizar também quando a lista de pendentes mudar,
        // não só quando o estado do combate mudar.
        if (isMestre && el.mestreCorpo && el.mestreCorpo.dataset.acaoAberta === "combate") {
            abrirAcaoMestre("combate");
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
        const saldo = fichaAtual.saldos && fichaAtual.saldos[saldoId];
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

    const saldos = fichaAtual.saldos || {};
    el.custoVidaOrigem.innerHTML = "";
    Object.entries(saldos).forEach(([id, s]) => {
        const opt = document.createElement("option");
        opt.value = id;
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

    } else if (acao === "dashboard") {
        montarDashboardFichas(corpo);

    } else if (acao === "combate") {
        montarGerenciadorCombate(corpo);

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
            const protecaoLabel = npc.protecaoTipo ? `${TIPOS_DANO.find(t => t.key === npc.protecaoTipo)?.label || npc.protecaoTipo} -${npc.protecaoValor || 0}` : "nenhuma";
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

    // Alterna entre a Criação Rápida (texto livre, mais antiga) e a
    // Mini-Ficha Detalhada (atributos/secundários/perícias estruturados).
    const tabs = document.createElement("div");
    tabs.style.display = "flex";
    tabs.style.gap = "8px";
    tabs.style.marginTop = "14px";
    const btnTabRapida = document.createElement("button");
    btnTabRapida.className = "btn-ghost"; btnTabRapida.type = "button"; btnTabRapida.innerText = "Criação Rápida";
    const btnTabDetalhada = document.createElement("button");
    btnTabDetalhada.className = "btn-ghost"; btnTabDetalhada.type = "button"; btnTabDetalhada.innerText = "Mini-Ficha Detalhada";
    tabs.append(btnTabRapida, btnTabDetalhada);
    corpo.appendChild(tabs);

    const formArea = document.createElement("div");
    corpo.appendChild(formArea);

    const mostrarRapida = () => {
        btnTabRapida.className = "btn-lime"; btnTabDetalhada.className = "btn-ghost";
        formArea.innerHTML = "";
        montarFormularioNpcRapido(formArea, async () => { toast("NPC criado."); });
    };
    const mostrarDetalhada = () => {
        btnTabDetalhada.className = "btn-lime"; btnTabRapida.className = "btn-ghost";
        formArea.innerHTML = "";
        montarFormularioNpcDetalhado(formArea, null, async () => { toast("NPC (mini-ficha) criado."); mostrarDetalhada(); });
    };
    btnTabRapida.addEventListener("click", mostrarRapida);
    btnTabDetalhada.addEventListener("click", mostrarDetalhada);
    mostrarRapida();
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

    // ---- Proteção contra dano (reaproveita o mesmo modelo do NPC rápido) ----
    const secProtecao = document.createElement("div");
    secProtecao.className = "section-header";
    secProtecao.innerText = "Proteção (opcional)";
    container.appendChild(secProtecao);
    const linhaProtecao = document.createElement("div");
    linhaProtecao.style.display = "grid";
    linhaProtecao.style.gridTemplateColumns = "1fr 1fr";
    linhaProtecao.style.gap = "8px";
    const selectProtecaoTipo = document.createElement("select");
    const optNenhuma = document.createElement("option");
    optNenhuma.value = ""; optNenhuma.innerText = "Sem proteção contra dano";
    selectProtecaoTipo.appendChild(optNenhuma);
    TIPOS_DANO.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key; opt.innerText = `Reduz: ${t.label}`;
        selectProtecaoTipo.appendChild(opt);
    });
    selectProtecaoTipo.value = npcExistente?.protecaoTipo || "";
    const inputProtecaoValor = criarInput("number", "Valor da redução");
    inputProtecaoValor.value = npcExistente?.protecaoValor || 0;
    linhaProtecao.append(selectProtecaoTipo, inputProtecaoValor);
    container.appendChild(linhaProtecao);

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
            protecaoTipo: selectProtecaoTipo.value || null,
            protecaoValor: inputProtecaoValor.value
        };
        if (npcExistente) {
            await atualizarNpcDetalhado(npcExistente.id, { ...payload, pvAtual: refInputPvAtual.value });
        } else {
            await criarNpcDetalhado(payload);
        }
        if (onSalvo) await onSalvo();
    });
    container.appendChild(btnSalvar);
}

// Formulário rápido de criação de NPC, reaproveitado tanto no painel
// "NPCs" quanto no "Gerenciador de Combate" (onde, ao salvar, o NPC
// recém-criado já entra direto na lista de participantes do combate).
// `onCriado(novoNpcId)` é chamado depois que o NPC é salvo no Firebase.
function montarFormularioNpcRapido(corpo, onCriado) {
    const form = document.createElement("div");
    form.style.display = "grid";
    form.style.gridTemplateColumns = "1fr 1fr";
    form.style.gap = "8px";
    form.style.marginTop = "12px";

    const inputNome = criarInput("text", "Nome");
    const inputPvs = criarInput("number", "PVs");
    const inputAgilidade = criarInput("number", "Agilidade (defesa vs. armas ágeis)");
    const inputConstituicao = criarInput("number", "Constituição (defesa vs. contundentes)");
    const inputAtributos = criarInput("text", "Atributos (texto livre, ex: For 3, Des 4...)");
    const inputAtributosSec = criarInput("text", "Atributos secundários (texto livre)");
    const inputPericias = criarInput("text", "Perícias resumidas");
    const inputItens = criarInput("text", "Itens essenciais");

    const selectProtecaoTipo = document.createElement("select");
    const optNenhuma = document.createElement("option");
    optNenhuma.value = ""; optNenhuma.innerText = "Sem proteção contra dano";
    selectProtecaoTipo.appendChild(optNenhuma);
    TIPOS_DANO.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key; opt.innerText = `Reduz: ${t.label}`;
        selectProtecaoTipo.appendChild(opt);
    });
    const inputProtecaoValor = criarInput("number", "Valor da redução");

    form.append(
        inputNome, inputPvs, inputAgilidade, inputConstituicao,
        inputAtributos, inputAtributosSec, inputPericias, inputItens,
        selectProtecaoTipo, inputProtecaoValor
    );

    const btnCriar = document.createElement("button");
    btnCriar.className = "btn-lime"; btnCriar.type = "button"; btnCriar.innerText = "Criar NPC";
    btnCriar.style.marginTop = "8px";
    btnCriar.addEventListener("click", async () => {
        if (!inputNome.value.trim()) { toast("Dê um nome ao NPC.", "erro"); return; }
        const novoId = await criarNpc({
            nome: inputNome.value,
            pvs: inputPvs.value,
            atributos: inputAtributos.value,
            atributosSecundarios: inputAtributosSec.value,
            periciasResumo: inputPericias.value,
            itensEssenciais: inputItens.value,
            agilidade: inputAgilidade.value,
            constituicao: inputConstituicao.value,
            protecaoTipo: selectProtecaoTipo.value || null,
            protecaoValor: inputProtecaoValor.value
        });
        if (onCriado) await onCriado(novoId, inputNome.value.trim() || "NPC sem nome");
        inputNome.value = ""; inputPvs.value = ""; inputAgilidade.value = ""; inputConstituicao.value = "";
        inputAtributos.value = ""; inputAtributosSec.value = ""; inputPericias.value = ""; inputItens.value = "";
        selectProtecaoTipo.value = ""; inputProtecaoValor.value = "";
    });
    corpo.appendChild(form);
    corpo.appendChild(btnCriar);
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
        await adicionarParticipanteCombate({ tipo: "ficha", refId: selectFichaAdd.value, nome: nomeDeFicha(selectFichaAdd.value) });
        toast("Jogador adicionado ao combate.");
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
        await adicionarParticipanteCombate({ tipo: "npc", refId: selectNpcAdd.value, nome: nomeOpt });
        toast("NPC adicionado ao combate.");
    });
    corpo.append(selectNpcAdd, btnAddNpc);

    // ---- Criar novo NPC direto no combate ----
    const secaoNovoNpc = document.createElement("div");
    secaoNovoNpc.className = "section-header";
    secaoNovoNpc.innerText = "Criar novo NPC (entra direto no combate)";
    corpo.appendChild(secaoNovoNpc);
    montarFormularioNpcRapido(corpo, async (novoId, nome) => {
        await adicionarParticipanteCombate({ tipo: "npc", refId: novoId, nome });
        toast(`${nome} criado e adicionado ao combate.`);
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
            const badgeEsquiva = p.esquivaDisponivel ? ` <span title="Tem ação de Esquiva/Bloqueio guardada">🛡️</span>` : "";
            linha.innerHTML = `
                <span class="combate-nome">${escapeHtml(p.nome)}${badgeEsquiva}</span>
                <span>Iniciativa ${p.iniciativa} (1d20:${p.rolagemBruta} + Agi ${p.modAgilidade})</span>
                <span>${p.pv}/${p.pvMax} PV</span>
                <span>${p.acoes}/${p.acoesMax} ações</span>
            `;
            listaIniciativa.appendChild(linha);
        });
    }
    renderIniciativa();

    const btnIniciarIniciativa = document.createElement("button");
    btnIniciarIniciativa.className = "btn-lime"; btnIniciarIniciativa.type = "button";
    btnIniciarIniciativa.innerText = "Iniciar Combate (rolar iniciativa)";
    btnIniciarIniciativa.addEventListener("click", async () => {
        try {
            await iniciarIniciativaCombate();
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
            const { nome } = await avancarTurnoCombate();
            await resetarDisparosTurno(); // zera o Recuo acumulado junto com a virada de turno
            toast(`Turno de ${nome}.`);
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
        await update(ref(db, `fichas/${fichaAtualId}/criacao`), fichaAtual.criacao);
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
        await update(ref(db, `fichas/${fichaAtualId}`), {
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
        set(ref(db, `fichas/${fichaAtualId}/levelUpPendente`), fichaAtual.levelUpPendente);
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
    await update(ref(db, `fichas/${fichaAtualId}`), {
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
                    const quem = isMestre ? `Mestre (${nomeDeFicha(fichaAtualId) || "—"})` : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");
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
