// =====================================================================
// CHUVA DE NEON — Ficha (orquestração principal)
// =====================================================================

import { db } from "./firebase-config.js";
import { ref, set, get, update, remove, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import {
    ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS,
    listaAlvosModificador, rotuloAlvo,
    coletarModificadores, calcularDerivados, calcularTotalPericia,
    rolarD20, rolarDado
} from "./regras.js";
import {
    PERICIAS_MANUAL, CATEGORIAS_PERICIA, listaPericiasPorCategoria, buscarPericiaPorNome,
    TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS,
    ehArma, tagTemNivel, rotuloTag, MANOBRAS_COMBATE
} from "./dados-manual.js";
import { normalizarFicha, fichaVaziaPadrao } from "./normalizacao.js";
import {
    listaCategorias, nomeCategoria, criarCategoriaCustom, pesoTotalPorCategoria,
    calcularCargaAtual, itemPodeUsar, listaArmasInventario
} from "./inventario.js";
import {
    estadoInicialCriacao, funcaoDe, calcularPontosAtributoTotais,
    aplicarAtributosFixosFuncao, aplicarItemPericiaInicialFuncao,
    opcoesPericiaFuncao, pontosFuncaoDe, validarLimiteAtributoCriacao,
    validarLimitePericiaCriacao, LIMITES_CRIACAO, pontosBonusPorDesvantagens,
    listaFuncoes
} from "./criacao.js";
import {
    precisaSubirNivel, iniciarLevelUpSeNecessario, confirmarPassoAtributo,
    executarPassoDadoVida, gastarPontoPericiaLevelUp, finalizarLevelUp
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
    mestreRolarDado, causarDanoJogador, causarDanoNpc,
    ouvirNpcs, criarNpc, excluirNpc, passarODia,
    ouvirPopupTreinamento, confirmarAvancoTreinamento, descartarPopupTreinamento,
    pagarCustoSemanal
} from "./mestre.js";

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
let categoriaInventarioAtiva = "levando";
let ultimoAvisoCustoVida = null; // último valor visto de `avisoCustoVida` no Firebase

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
    "maldade", "remorso", "status", "nivel", "xp", "dinheiroLimpo", "dinheiroSujo"];
const CAMPOS_DARKNET_NOTAS = ["dm", "void", "p2k", "rabbithole", "p2c", "creators"];
const TITULOS_MODAL = {
    pericias: "Perícia", inventario: "Item de inventário", vantagens: "Vantagem",
    desvantagens: "Desvantagem", fatosUniversais: "Fato universal",
    especializacoes: "Especialização", gastosExtras: "Gasto semanal extra"
};
const TIPOS_TREINO = [
    { tipo: "periciaFisica", label: "Perícia física", opcoes: () => opcoesPericiaFisica().map(p => p.nome) },
    { tipo: "periciaMental", label: "Perícia mental", opcoes: () => opcoesPericiaMental().map(p => p.nome) },
    { tipo: "atributoFisico", label: "Atributo físico", opcoes: () => opcoesAtributoFisico().map(a => a.key) },
    { tipo: "atributoMental", label: "Atributo mental", opcoes: () => opcoesAtributoMental().map(a => a.key) }
];

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
    btnSalvar: document.getElementById("btn-salvar"),
    saveStatus: document.getElementById("save-status"),
    tabsNav: document.getElementById("tabs-nav"),
    gridAtributosPrimarios: document.getElementById("grid-atributos-primarios"),
    gridAtributosSecundarios: document.getElementById("grid-atributos-secundarios"),
    gridRecursos: document.getElementById("grid-recursos"),
    listaPericias: document.getElementById("lista-pericias"),
    listaVantagens: document.getElementById("lista-vantagens"),
    listaDesvantagens: document.getElementById("lista-desvantagens"),
    listaFatos: document.getElementById("lista-fatos"),
    bonusDesvantagensArea: document.getElementById("bonus-desvantagens-area"),
    listaEspecializacoes: document.getElementById("lista-especializacoes"),
    listaGastosExtras: document.getElementById("lista-gastos-extras"),
    resumoCustoSemanal: document.getElementById("resumo-custo-semanal"),
    fPadraoVida: document.getElementById("f-padrao-vida"),
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
    modalCampoPeso: document.getElementById("modal-campo-peso"),
    modalPeso: document.getElementById("modal-peso"),
    modalCampoCategoriaItem: document.getElementById("modal-campo-categoria-item"),
    modalCategoriaItem: document.getElementById("modal-categoria-item"),
    modalConfigArma: document.getElementById("modal-config-arma"),
    modalArmaDano: document.getElementById("modal-arma-dano"),
    modalArmaTipoDano: document.getElementById("modal-arma-tipo-dano"),
    modalCampoEscala: document.getElementById("modal-campo-escala"),
    modalArmaEscala: document.getElementById("modal-arma-escala"),
    modalArmaModificacoesLista: document.getElementById("modal-arma-modificacoes-lista"),
    modalArmaAddModificacao: document.getElementById("modal-arma-add-modificacao"),
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
    popupTreinoSim: document.getElementById("popup-treino-sim")
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

function renderizarTudo() {
    if (!fichaAtual) return;
    const modificadoresPlanos = coletarModificadores(fichaAtual);

    renderizarPerfil();
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
    const bruto = rolarD20();
    const resultado = bruto + Number(modificador || 0);
    const quem = isMestre ? `Mestre (${nomeDeFicha(fichaAtualId) || "—"})` : (fichaAtual?.config?.nomeExibicao || sessao.nome || "Jogador");
    await registrarRolagem({ quem, modificador, resultado, detalhe: `${nomeAlvo}: d20 (${bruto}) ${modificador >= 0 ? "+" : ""}${modificador}` });
    toast(`${nomeAlvo}: ${resultado} (d20: ${bruto} ${modificador >= 0 ? "+" : ""}${modificador})`);
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
            const podeUsar = itemPodeUsar(it);
            const tagLabel = rotuloTag(it.tag) + (it.nivelTag ? ` nível ${it.nivelTag}` : "");
            li.innerHTML = `
                <div class="entity-main">
                    <span class="entity-nome">${escapeHtml(it.nome)}</span>
                    <span class="entity-sub">${tagLabel} · ${it.peso || 0} kg</span>
                </div>
                <div class="entity-badges">
                    <button type="button" class="btn-usar-item btn-blue" ${podeUsar ? "" : "disabled"}>Usar</button>
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
                await update(ref(db, `fichas/${fichaAtualId}/inventario/${id}`), { categoria: novaCategoria });
                toast(`${it.nome} movido.`);
            });

            li.querySelector(".btn-usar-item").addEventListener("click", (e) => {
                e.stopPropagation();
                if (!podeUsar) return;
                toast(`Usando ${it.nome}.`);
            });

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
            li.innerHTML = `
                <div class="entity-main">
                    <span class="entity-nome">${escapeHtml(arma.nome)} <span class="mod-pill tag">nível ${arma.nivelTag || "?"}</span></span>
                    <span class="entity-sub">Dano: ${escapeHtml(cfg.dano || "—")}${tipoDano ? " · " + tipoDano.label : ""}${escala ? " · " + escala.label : ""}</span>
                    ${mods ? `<span class="entity-sub">Modificações: ${escapeHtml(mods)}</span>` : ""}
                </div>
            `;
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
        }).join(", ");

        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(m.nome)}</span>
                <span class="entity-sub manobra-pericias-linha">${periciasHtml} · dif.: ${escapeHtml(m.dificuldade)}</span>
                <span class="entity-sub">${escapeHtml(m.efeito)}</span>
            </div>
            <span class="manobra-alcance">${escapeHtml(m.alcance)}</span>
        `;

        li.querySelectorAll("[data-pericia-golpe]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const nomePericia = btn.dataset.periciaGolpe;
                const entrada = Object.entries(fichaAtual.pericias || {}).find(([, p]) => p.nome === nomePericia);
                if (!entrada) return;
                const calc = calcularTotalPericia(entrada[1], fichaAtual.dados, modificadoresPlanos);
                await rolarERegistrar(`${m.nome} (${nomePericia})`, calc.total);
            });
        });

        el.listaManobrasCombate.appendChild(li);
    });
}

// ---------------------------------------------------------------------
// VANTAGENS / DESVANTAGENS / FATOS UNIVERSAIS
// ---------------------------------------------------------------------
function renderizarVantagensDesvantagens() {
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

// Recursos atuais (PV/Energia atual) — qualquer um pode editar (dano, cura...)
document.addEventListener("input", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoKey;
    if (!recursoKey || !fichaAtualId) return;
    const valor = e.target.value === "" ? null : Number(e.target.value);
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
    modalContexto = { lista, id: null };
    prepararModalParaLista(lista, null);
    el.modal.classList.add("active");
}

function abrirModalEdicao(lista, id) {
    modalContexto = { lista, id };
    const objeto = fichaAtual[lista] && fichaAtual[lista][id];
    prepararModalParaLista(lista, objeto);
    el.modal.classList.add("active");
}

function fecharModal() {
    el.modal.classList.remove("active");
    modalContexto = null;
}

function esconderTodosCamposEspeciais() {
    el.modalCampoCategoriaPericia.style.display = "none";
    el.modalCampoPericiaBusca.style.display = "none";
    el.modalCampoNivel.style.display = "none";
    el.modalCampoTag.style.display = "none";
    el.modalCampoNivelTag.style.display = "none";
    el.modalCampoPeso.style.display = "none";
    el.modalCampoCategoriaItem.style.display = "none";
    el.modalConfigArma.style.display = "none";
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
    } else if (lista === "inventario") {
        prepararModalItem(objetoExistente);
    } else if (lista === "gastosExtras") {
        prepararModalGasto(objetoExistente);
    } else {
        // vantagens, desvantagens, fatosUniversais, especializacoes: nome + descrição + modificadores
        el.modalNome.value = objetoExistente ? (objetoExistente.nome || "") : "";
    }
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
function prepararModalItem(existente) {
    el.modalCampoTag.style.display = "flex";
    el.modalCampoPeso.style.display = "flex";
    el.modalCampoCategoriaItem.style.display = "flex";

    el.modalCategoriaItem.innerHTML = "";
    listaCategorias(fichaAtual).forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.innerText = cat.nome;
        el.modalCategoriaItem.appendChild(opt);
    });

    if (existente) {
        el.modalNome.value = existente.nome || "";
        el.modalTag.value = existente.tag || "";
        el.modalPeso.value = existente.peso ?? 0;
        el.modalCategoriaItem.value = existente.categoria || "levando";
        atualizarCamposPorTag(existente.tag, existente.nivelTag, existente.arma);
    } else {
        el.modalNome.value = "";
        el.modalTag.value = "";
        el.modalPeso.value = 0;
        el.modalCategoriaItem.value = categoriaInventarioAtiva || "levando";
        atualizarCamposPorTag("", null, null);
    }
}

function atualizarCamposPorTag(tagKey, nivelTag, armaConfig) {
    const temNivel = tagTemNivel(tagKey);
    el.modalCampoNivelTag.style.display = temNivel ? "flex" : "none";
    if (temNivel) el.modalNivelTag.value = nivelTag || 1;

    const arma = ehArma(tagKey);
    el.modalConfigArma.style.display = arma ? "block" : "none";
    if (arma) {
        el.modalArmaDano.value = (armaConfig && armaConfig.dano) || "";
        el.modalArmaTipoDano.value = (armaConfig && armaConfig.tipoDano) || TIPOS_DANO[0].key;
        el.modalArmaEscala.value = (armaConfig && armaConfig.escala) || "";
        el.modalCampoEscala.style.display = "flex";
        montarModificacoesArma((armaConfig && armaConfig.modificacoesArma) || []);
    }
}

document.getElementById("modal-tag")?.addEventListener("change", (e) => {
    atualizarCamposPorTag(e.target.value, null, null);
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
    if (!fichaAtual || !fichaAtualId) { toast("Nenhuma ficha selecionada.", "erro"); return; }
    const { lista, id } = modalContexto;

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

async function salvarItemDoModal(id) {
    const nome = el.modalNome.value.trim();
    const tag = el.modalTag.value;
    if (!nome) { toast("Dê um nome ao item.", "erro"); return; }
    if (!tag) { toast("Toda item precisa de uma tag do sistema.", "erro"); return; }

    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        tag,
        nivelTag: tagTemNivel(tag) ? Number(el.modalNivelTag.value) : null,
        peso: Number(el.modalPeso.value) || 0,
        categoria: el.modalCategoriaItem.value || "levando",
        arma: ehArma(tag) ? {
            dano: el.modalArmaDano.value.trim(),
            tipoDano: el.modalArmaTipoDano.value,
            escala: el.modalArmaEscala.value || null,
            modificacoesArma: lerModificacoesArmaDoModal()
        } : null
    };
    const idFinal = id || gerarIdLocal();
    if (!fichaAtual.inventario) fichaAtual.inventario = {};
    fichaAtual.inventario[idFinal] = registro;
    await update(ref(db, `fichas/${fichaAtualId}/inventario`), fichaAtual.inventario);
    toast("Item salvo.");
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
    if (!fichaAtual || !fichaAtualId) { toast("Nenhuma ficha selecionada.", "erro"); return; }
    const { lista, id } = modalContexto;

    if (lista === "pericias" && !podeEditarPericiaAtributo()) {
        toast("Edição de perícias só na Criação, Level Up ou Treinamento.", "erro");
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
// AVISO DE CUSTO DE VIDA (Domingo)
// =====================================================================

function configurarAvisoCustoVida() {
    ouvirAvisoCustoVida((aviso) => {
        ultimoAvisoCustoVida = aviso;
        avaliarAvisoCustoVida();
    });

    el.custoVidaConfirmar.addEventListener("click", async () => {
        if (!fichaAtual || !fichaAtualId) return;
        const origem = el.custoVidaOrigem.value;
        const total = await pagarCustoSemanal(fichaAtualId, fichaAtual, origem);
        toast(`Pago CN$ ${total} (${origem === "sujo" ? "dinheiro sujo" : "dinheiro limpo"}).`);
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
    ouvirTodasAsFichas((todas) => { todasAsFichasCache = todas || {}; });

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
        const input = document.createElement("input");
        input.type = "number"; input.placeholder = "Valor de dano"; input.value = 10;
        const btn = document.createElement("button");
        btn.className = "btn-red"; btn.type = "button"; btn.innerText = "Causar dano";
        btn.addEventListener("click", async () => {
            if (!select.value) { toast("Escolha um alvo.", "erro"); return; }
            const [tipo, id] = select.value.split("::");
            if (tipo === "ficha") await causarDanoJogador(id, Number(input.value) || 0);
            else await causarDanoNpc(id, Number(input.value) || 0);
            toast(`Dano de ${input.value} aplicado.`);
        });
        corpo.append(select, input, btn);

    } else if (acao === "npcs") {
        montarPainelNpcs(corpo);

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
            card.innerHTML = `
                <strong>${escapeHtml(npc.nome)}</strong>
                <span>PV: ${npc.pvAtual ?? npc.pvs} / ${npc.pvs}</span>
                ${npc.atributos ? `<span>Atributos: ${escapeHtml(npc.atributos)}</span>` : ""}
                ${npc.atributosSecundarios ? `<span>Secundários: ${escapeHtml(npc.atributosSecundarios)}</span>` : ""}
                ${npc.periciasResumo ? `<span>Perícias: ${escapeHtml(npc.periciasResumo)}</span>` : ""}
                ${npc.itensEssenciais ? `<span>Itens: ${escapeHtml(npc.itensEssenciais)}</span>` : ""}
            `;
            const btnExcluir = document.createElement("button");
            btnExcluir.className = "btn-red"; btnExcluir.type = "button"; btnExcluir.innerText = "Excluir NPC";
            btnExcluir.addEventListener("click", async () => { await excluirNpc(npc.id); });
            card.appendChild(btnExcluir);
            lista.appendChild(card);
        });
    });

    const form = document.createElement("div");
    form.style.display = "grid";
    form.style.gridTemplateColumns = "1fr 1fr";
    form.style.gap = "8px";
    form.style.marginTop = "12px";
    form.innerHTML = `
        <input type="text" placeholder="Nome" id="npc-nome">
        <input type="number" placeholder="PVs" id="npc-pvs">
        <input type="text" placeholder="Atributos (ex: For 3, Des 4...)" id="npc-atributos">
        <input type="text" placeholder="Atributos secundários" id="npc-atributos-sec">
        <input type="text" placeholder="Perícias resumidas" id="npc-pericias">
        <input type="text" placeholder="Itens essenciais" id="npc-itens">
    `;
    const btnCriar = document.createElement("button");
    btnCriar.className = "btn-lime"; btnCriar.type = "button"; btnCriar.innerText = "Criar NPC";
    btnCriar.style.marginTop = "8px";
    btnCriar.addEventListener("click", async () => {
        await criarNpc({
            nome: document.getElementById("npc-nome").value,
            pvs: document.getElementById("npc-pvs").value,
            atributos: document.getElementById("npc-atributos").value,
            atributosSecundarios: document.getElementById("npc-atributos-sec").value,
            periciasResumo: document.getElementById("npc-pericias").value,
            itensEssenciais: document.getElementById("npc-itens").value
        });
        toast("NPC criado.");
    });
    corpo.appendChild(form);
    corpo.appendChild(btnCriar);
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
        const linha = document.createElement("div");
        linha.className = "distribuicao-linha";
        linha.innerHTML = `
            <span>${p.nome}</span>
            <div class="stepper">
                <button type="button" class="btn-ghost btn-menos">−</button>
                <span class="stepper-valor">${nivelAtual}</span>
                <button type="button" class="btn-ghost btn-mais">+</button>
            </div>
        `;
        linha.querySelector(".btn-menos").addEventListener("click", () => {
            if (nivelAtual > 0 && existente) {
                fichaAtual.pericias[existente[0]].nivel--;
                if (fichaAtual.pericias[existente[0]].nivel === 0) delete fichaAtual.pericias[existente[0]];
                c[campoPontos]++;
                rerender();
            }
        });
        linha.querySelector(".btn-mais").addEventListener("click", () => {
            if (c[campoPontos] <= 0) return;
            if (nivelAtual >= limite) return;
            if (existente) {
                fichaAtual.pericias[existente[0]].nivel++;
            } else {
                const id = gerarIdLocal();
                fichaAtual.pericias[id] = { nome: p.nome, nivel: 1, descricao: "", modificadores: [], legado: false };
            }
            c[campoPontos]--;
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
    el.criacaoCorpo.innerHTML += `<p class="hint">Cadastre suas desvantagens na aba "Vantagens / Desvantagens" antes de avançar (3 pontos bônus por desvantagem, até 9 no total). Você pode abrir essa aba em outra janela ou fechar este wizard temporariamente.</p>`;

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
        linha.querySelector(".btn-menos").addEventListener("click", async () => {
            const gastoNisso = (c.bonusGastoDetalhe && c.bonusGastoDetalhe[`attr:${attr.key}`]) || 0;
            if (valorAtual <= 0 || gastoNisso <= 0) return;
            fichaAtual.dados[attr.key]--;
            c.bonusGasto = (c.bonusGasto || 0) - 1;
            if (!c.bonusGastoDetalhe) c.bonusGastoDetalhe = {};
            c.bonusGastoDetalhe[`attr:${attr.key}`] = gastoNisso - 1;
            await update(ref(db, `fichas/${fichaAtualId}/dados`), fichaAtual.dados);
            await salvarEstadoCriacao();
            onMudou();
        });
        linha.querySelector(".btn-mais").addEventListener("click", async () => {
            if (c.pontosBonusDesvantagens <= 0) return;
            if (valorAtual >= LIMITES_CRIACAO.maxAtributo) return;
            fichaAtual.dados[attr.key]++;
            c.bonusGasto = (c.bonusGasto || 0) + 1;
            if (!c.bonusGastoDetalhe) c.bonusGastoDetalhe = {};
            c.bonusGastoDetalhe[`attr:${attr.key}`] = ((c.bonusGastoDetalhe[`attr:${attr.key}`]) || 0) + 1;
            await update(ref(db, `fichas/${fichaAtualId}/dados`), fichaAtual.dados);
            await salvarEstadoCriacao();
            onMudou();
        });
        wrap.appendChild(linha);
    });
    destino.appendChild(wrap);

    // Perícias — reaproveita o seletor genérico, mas descontando do pool
    // de bônus em vez do pool de criação normal.
    const tituloPericias = document.createElement("p");
    tituloPericias.className = "hint";
    tituloPericias.innerText = "Ou gaste em perícias:";
    destino.appendChild(tituloPericias);

    montarSeletorPericiasGenerico(c, "pontosBonusDesvantagens", null, async () => {
        c.bonusGasto = bonusTotalMenosRestante(c);
        await update(ref(db, `fichas/${fichaAtualId}/pericias`), fichaAtual.pericias);
        await update(ref(db, `fichas/${fichaAtualId}/dados`), fichaAtual.dados);
        await salvarEstadoCriacao();
        onMudou();
    }, 5, destino);
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
        await update(ref(db, `fichas/${fichaAtualId}/dados`), fichaAtual.dados);
        await salvarEstadoCriacao();
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
    if (!fichaAtual.criacao.concluida) return; // não interfere com a criação em andamento
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
    renderPassoLevelUp();
}

async function salvarEstadoLevelUp() {
    await set(ref(db, `fichas/${fichaAtualId}/levelUpPendente`), fichaAtual.levelUpPendente);
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
            btn.disabled = (fichaAtual.dados[attr.key] || 0) >= 7;
            btn.addEventListener("click", async () => {
                confirmarPassoAtributo(fichaAtual, attr.key);
                await update(ref(db, `fichas/${fichaAtualId}/dados`), fichaAtual.dados);
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
                const resultado = executarPassoDadoVida(fichaAtual);
                await update(ref(db, `fichas/${fichaAtualId}/dados`), fichaAtual.dados);
                await salvarEstadoLevelUp();
                renderPassoLevelUp();
            });
            el.levelupCorpo.appendChild(btn);
        } else {
            const r = lvl.dadoVidaRolado;
            el.levelupCorpo.innerHTML += `<p class="entity-nome">1d${r.faces} (${r.rolagem}) + ${r.bonus} = +${r.total} PV</p>`;
            const btn = document.createElement("button");
            btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Continuar →";
            btn.addEventListener("click", () => renderPassoLevelUp());
            el.levelupCorpo.appendChild(btn);
        }

    } else if (lvl.passo === 3) {
        el.levelupCorpo.innerHTML = `<p class="hint">Passo 3 de 3 — Distribua ${lvl.pontosPericia} ponto(s) de perícia.</p>`;
        const grid = document.createElement("div");
        grid.className = "distribuicao-grid";
        Object.entries(fichaAtual.pericias).forEach(([id, p]) => {
            const linha = document.createElement("div");
            linha.className = "distribuicao-linha";
            linha.innerHTML = `
                <span>${p.nome}</span>
                <div class="stepper">
                    <span class="stepper-valor">${p.nivel}</span>
                    <button type="button" class="btn-ghost btn-mais">+</button>
                </div>
            `;
            linha.querySelector(".btn-mais").addEventListener("click", async () => {
                if (gastarPontoPericiaLevelUp(fichaAtual, id)) {
                    await update(ref(db, `fichas/${fichaAtualId}/pericias`), fichaAtual.pericias);
                    await salvarEstadoLevelUp();
                    renderPassoLevelUp();
                }
            });
            grid.appendChild(linha);
        });
        el.levelupCorpo.appendChild(grid);

        if (lvl.pontosPericia === 0) {
            const btn = document.createElement("button");
            btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Finalizar Level Up";
            btn.addEventListener("click", async () => {
                finalizarLevelUp(fichaAtual);
                await update(ref(db, `fichas/${fichaAtualId}/dados`), fichaAtual.dados);
                await remove(ref(db, `fichas/${fichaAtualId}/levelUpPendente`));
                el.modalLevelup.classList.remove("active");
                toast("Nível aumentado!");
            });
            el.levelupBotoes.appendChild(btn);
        }
    }
}
