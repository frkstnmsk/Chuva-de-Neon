// =====================================================================
// CHUVA DE NEON — Ficha (orquestração principal)
// =====================================================================

import { db } from "./firebase-config.js";
import { ref, set, get, update, remove, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import {
    ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS,
    listaAlvosModificador, rotuloAlvo,
    coletarModificadores, calcularDerivados, calcularTotalPericia
} from "./regras.js";

// ---------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------
const sessaoRaw = localStorage.getItem("cdn_session");
if (!sessaoRaw) {
    window.location.href = "index.html";
}
let sessao;
try {
    sessao = JSON.parse(sessaoRaw);
    if (!sessao || !sessao.role) throw new Error("sessão inválida");
} catch (e) {
    localStorage.removeItem("cdn_session");
    window.location.href = "index.html";
}

const isMestre = sessao.role === "mestre";

// Campos que só o Mestre pode editar diretamente na ficha de um jogador.
const CAMPOS_SO_MESTRE = ["nivel", "xp"];

// ---------------------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------------------
let fichaAtualId = isMestre ? "" : sessao.idLimpo;
let fichaAtual = null; // snapshot completo vindo do Firebase
let listenerAtivo = null;
let salvandoDebounce = null;
let modalContexto = null; // { lista: "inventario", id: "..." } | null = criando nova

// ---------------------------------------------------------------------
// Elementos
// ---------------------------------------------------------------------
const el = {
    carregando: document.getElementById("tela-carregando"),
    app: document.getElementById("app"),
    nomeFichaAtiva: document.getElementById("nome-ficha-ativa"),
    userRole: document.getElementById("user-role"),
    painelMestreSeletor: document.getElementById("painel-mestre-seletor"),
    selectFicha: document.getElementById("select-ficha"),
    syncIndicator: document.getElementById("sync-indicator"),
    btnLogout: document.getElementById("btn-logout"),
    btnSalvar: document.getElementById("btn-salvar"),
    saveStatus: document.getElementById("save-status"),
    tabsNav: document.getElementById("tabs-nav"),
    gridAtributosPrimarios: document.getElementById("grid-atributos-primarios"),
    gridAtributosSecundarios: document.getElementById("grid-atributos-secundarios"),
    gridRecursos: document.getElementById("grid-recursos"),
    listaPericias: document.getElementById("lista-pericias"),
    listaInventario: document.getElementById("lista-inventario"),
    listaVantagens: document.getElementById("lista-vantagens"),
    listaDesvantagens: document.getElementById("lista-desvantagens"),
    listaFatos: document.getElementById("lista-fatos"),
    listaEspecializacoes: document.getElementById("lista-especializacoes"),
    resumoCarga: document.getElementById("resumo-carga"),
    hintNivelXp: document.getElementById("hint-nivel-xp"),
    modal: document.getElementById("modal-entidade"),
    modalTitulo: document.getElementById("modal-titulo"),
    modalNome: document.getElementById("modal-nome"),
    modalCampoAtributo: document.getElementById("modal-campo-atributo"),
    modalAtributo: document.getElementById("modal-atributo"),
    modalCampoNivel: document.getElementById("modal-campo-nivel"),
    modalNivel: document.getElementById("modal-nivel"),
    modalDescricao: document.getElementById("modal-descricao"),
    modalListaModificadores: document.getElementById("modal-lista-modificadores"),
    modalAddModificador: document.getElementById("modal-add-modificador"),
    modalCancelar: document.getElementById("modal-cancelar"),
    modalExcluir: document.getElementById("modal-excluir"),
    modalSalvar: document.getElementById("modal-salvar"),
    templateModificador: document.getElementById("template-modificador")
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

    el.btnLogout.addEventListener("click", () => {
        localStorage.removeItem("cdn_session");
        window.location.href = "index.html";
    });

    el.btnSalvar.addEventListener("click", () => salvarTudo(true));

    if (isMestre) {
        el.painelMestreSeletor.style.display = "block";
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
    } else {
        ativarSincronizacao();
    }

    configurarBotoesAdicionar();
    configurarModal();
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
        el.carregando.style.display = "none";
        el.app.style.display = "flex";

        if (!snapshot.exists()) {
            toast("Essa ficha não existe mais na rede.", "erro");
            return;
        }
        fichaAtual = normalizarFicha(snapshot.val());
        el.nomeFichaAtiva.innerText = (fichaAtual.config.nomeExibicao || fichaAtualId).toUpperCase();
        renderizarTudo();
        marcarSincronizado();
    }, (error) => {
        console.error(error);
        el.syncIndicator.classList.add("offline");
        toast("Falha ao sincronizar com a rede.", "erro");
    });
}

function normalizarFicha(raw) {
    return {
        config: raw.config || {},
        dados: raw.dados || {},
        pericias: raw.pericias || {},
        inventario: raw.inventario || {},
        vantagens: raw.vantagens || {},
        desvantagens: raw.desvantagens || {},
        especializacoes: raw.especializacoes || {},
        fatosUniversais: raw.fatosUniversais || {},
        determinacoes: raw.determinacoes || "",
        notas: raw.notas || ""
    };
}

function marcarSincronizado() {
    el.syncIndicator.classList.remove("offline");
    el.saveStatus.innerText = "sincronizado em tempo real";
}

// ---------------------------------------------------------------------
// Abas
// ---------------------------------------------------------------------
function montarAbas() {
    el.tabsNav.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            el.tabsNav.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const tab = btn.dataset.tab;
            document.querySelectorAll(".tab-panel").forEach(p => {
                p.classList.toggle("active", p.dataset.tab === tab);
            });
        });
    });
}

// ---------------------------------------------------------------------
// Grids estáticas (atributos primários / secundários / recursos)
// ---------------------------------------------------------------------
function montarGridsEstaticas() {
    el.gridAtributosPrimarios.innerHTML = "";
    for (const a of ATRIBUTOS_PRIMARIOS) {
        const card = document.createElement("div");
        card.className = "attr-card";
        card.innerHTML = `
            <label for="attr-${a.key}">${a.label}</label>
            <input type="number" id="attr-${a.key}" data-field="${a.key}" min="0" max="7" value="0">
        `;
        el.gridAtributosPrimarios.appendChild(card);
    }

    el.gridAtributosSecundarios.innerHTML = "";
    for (const s of ATRIBUTOS_SECUNDARIOS) {
        const card = document.createElement("div");
        card.className = "attr-card calculado";
        card.id = `secundario-${s.key}`;
        card.innerHTML = `
            <label>${s.label}</label>
            <span class="attr-valor" data-secundario="${s.key}">0</span>
        `;
        el.gridAtributosSecundarios.appendChild(card);
    }

    el.gridRecursos.innerHTML = "";
    for (const r of RECURSOS) {
        const card = document.createElement("div");
        card.className = "attr-card recurso";
        card.id = `recurso-${r.key}`;
        if (r.key === "carga") {
            card.innerHTML = `
                <label>${r.label}</label>
                <span class="attr-valor" data-recurso="${r.key}">0</span>
            `;
        } else {
            card.innerHTML = `
                <label>${r.label}</label>
                <div class="attr-valor-wrap">
                    <input type="number" data-field="${r.key}Atual" style="width:56px;">
                    <span class="max-label">/ <span data-recurso="${r.key}">0</span></span>
                </div>
            `;
        }
        el.gridRecursos.appendChild(card);
    }

    // Listeners de inputs simples (perfil, atributos, dark net, notas)
    document.querySelectorAll("[data-field]").forEach(input => {
        input.addEventListener("input", onCampoSimpleChange);
        input.addEventListener("change", onCampoSimpleChange);
    });
}

function onCampoSimpleChange(e) {
    if (!fichaAtual || !fichaAtualId) return;
    const campo = e.target.dataset.field;
    if (!campo) return;

    // Bloqueio de campos exclusivos do mestre, quando logado como jogador.
    if (!isMestre && CAMPOS_SO_MESTRE.includes(campo)) {
        e.target.value = fichaAtual.dados[campo] ?? "";
        toast("Esse campo só pode ser ajustado pelo Mestre.", "erro");
        return;
    }

    let valor = e.target.value;
    if (e.target.type === "number") valor = valor === "" ? null : Number(valor);

    // Campos de atributo primário e dados pessoais ficam em "dados"
    fichaAtual.dados[campo] = valor;

    // Determinações e notas vivem na raiz da ficha.
    if (campo === "determinacoes" || campo === "notas") {
        fichaAtual[campo] = valor;
    }

    agendarSalvar();
    if (ATRIBUTOS_PRIMARIOS.some(a => a.key === campo)) {
        renderAtributosDerivados();
        renderPericias(); // total de rolagem depende do atributo
    }
}

// ---------------------------------------------------------------------
// Render geral
// ---------------------------------------------------------------------
function renderizarTudo() {
    aplicarBloqueiosDeAcesso();
    renderCamposSimples();
    renderAtributosDerivados();
    renderPericias();
    renderListaGenerica("inventario", el.listaInventario, "Nenhum item no inventário.");
    renderListaGenerica("vantagens", el.listaVantagens, "Nenhuma vantagem registrada.");
    renderListaGenerica("desvantagens", el.listaDesvantagens, "Nenhuma desvantagem registrada.");
    renderListaGenerica("fatosUniversais", el.listaFatos, "Nenhum fato universal registrado.");
    renderListaGenerica("especializacoes", el.listaEspecializacoes, "Nenhuma especialização registrada.");
}

function aplicarBloqueiosDeAcesso() {
    if (isMestre) {
        el.hintNivelXp.style.display = "none";
        document.querySelectorAll("[data-field]").forEach(i => i.closest(".campo")?.removeAttribute("data-locked"));
        return;
    }
    el.hintNivelXp.style.display = "block";
    CAMPOS_SO_MESTRE.forEach(campo => {
        const input = document.querySelector(`[data-field="${campo}"]`);
        if (input) input.closest(".campo")?.setAttribute("data-locked", "true");
    });
}

function renderCamposSimples() {
    const d = fichaAtual.dados;
    document.querySelectorAll("[data-field]").forEach(input => {
        const campo = input.dataset.field;
        if (campo.endsWith("Atual")) return; // recursos atuais tratados em renderAtributosDerivados
        if (campo === "determinacoes") {
            input.value = fichaAtual.determinacoes || "";
        } else if (campo === "notas") {
            input.value = fichaAtual.notas || "";
        } else if (document.activeElement !== input) {
            input.value = d[campo] ?? "";
        }
    });
}

function dadosPrimariosAtuais() {
    const out = {};
    for (const a of ATRIBUTOS_PRIMARIOS) out[a.key] = Number(fichaAtual.dados[a.key]) || 0;
    return out;
}

function renderAtributosDerivados() {
    const modificadoresPlanos = coletarModificadores(fichaAtual);
    const derivados = calcularDerivados(dadosPrimariosAtuais(), modificadoresPlanos);

    for (const s of ATRIBUTOS_SECUNDARIOS) {
        const info = derivados.secundarios[s.key];
        const span = document.querySelector(`[data-secundario="${s.key}"]`);
        if (span) {
            span.innerText = arredondar(info.total);
            span.title = montarTooltipCalculo(s.label, info);
        }
    }

    for (const r of RECURSOS) {
        const info = derivados.recursos[r.key];
        const span = document.querySelector(`[data-recurso="${r.key}"]`);
        if (span) {
            span.innerText = arredondar(info.total);
            span.title = montarTooltipCalculo(r.label, info);
        }
        if (r.key === "carga") {
            el.resumoCarga.innerText = `${arredondar(info.total)} kg (60% sem penalidade: ${arredondar(info.total * 0.6)} kg)`;
        } else {
            const inputAtual = document.querySelector(`[data-field="${r.key}Atual"]`);
            if (inputAtual && document.activeElement !== inputAtual) {
                const atual = fichaAtual.dados[`${r.key}Atual`];
                inputAtual.value = (atual === null || atual === undefined) ? arredondar(info.total) : atual;
                inputAtual.max = arredondar(info.total);
            }
        }
    }
}

function montarTooltipCalculo(label, info) {
    let txt = `${label}: base ${arredondar(info.base)}`;
    if (info.ajustes.length) {
        txt += " " + info.ajustes.map(a => `${a.valor >= 0 ? "+" : ""}${a.valor} (${a.origem})`).join(" ");
    }
    txt += ` = ${arredondar(info.total)}`;
    return txt;
}

function arredondar(n) {
    return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------
// Perícias (lista livre, com cálculo de total de rolagem)
// ---------------------------------------------------------------------
function renderPericias() {
    const lista = fichaAtual.pericias || {};
    const ids = Object.keys(lista);
    el.listaPericias.innerHTML = "";

    if (ids.length === 0) {
        el.listaPericias.innerHTML = `<li class="entity-list-empty" style="border:none;cursor:default;">Nenhuma perícia adicionada ainda.</li>`;
        return;
    }

    const dadosPrimarios = dadosPrimariosAtuais();
    const modificadoresPlanos = coletarModificadores(fichaAtual);
    const labelAtributo = key => (ATRIBUTOS_PRIMARIOS.find(a => a.key === key) || {}).label || key;

    ids.forEach(id => {
        const p = lista[id];
        const calc = calcularTotalPericia(p, dadosPrimarios, modificadoresPlanos);
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(p.nome || "(sem nome)")}</span>
                <span class="entity-sub">${labelAtributo(p.atributo)} · nível ${calc.nivel}${calc.ajustes.length ? ` · ${calc.ajustes.length} modificador(es)` : ""}</span>
            </div>
            <span class="total-rolagem" title="${montarTooltipCalculo("Total de rolagem", calc)}">+${arredondar(calc.total)}</span>
        `;
        li.addEventListener("click", () => abrirModalPericia(id, p));
        el.listaPericias.appendChild(li);
    });
}

// ---------------------------------------------------------------------
// Listas genéricas (inventário, vantagens, desvantagens, fatos, especializações)
// ---------------------------------------------------------------------
const LABELS_LISTA = {
    inventario: "item",
    vantagens: "vantagem",
    desvantagens: "desvantagem",
    fatosUniversais: "fato universal",
    especializacoes: "especialização"
};

function renderListaGenerica(chave, container, textoVazio) {
    const lista = fichaAtual[chave] || {};
    const ids = Object.keys(lista);
    container.innerHTML = "";

    if (ids.length === 0) {
        container.innerHTML = `<li class="entity-list-empty" style="border:none;cursor:default;">${textoVazio}</li>`;
        return;
    }

    ids.forEach(id => {
        const entidade = lista[id];
        const mods = entidade.modificadores || [];
        const li = document.createElement("li");
        const badges = mods.map(m => {
            const positivo = Number(m.valor) >= 0;
            return `<span class="mod-pill ${positivo ? "positivo" : "negativo"}">${rotuloAlvo(m.alvo, listaPericiasArray())} ${positivo ? "+" : ""}${m.valor}</span>`;
        }).join("");
        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(entidade.nome || "(sem nome)")}</span>
                ${entidade.descricao ? `<span class="entity-sub">${escapeHtml(truncar(entidade.descricao, 90))}</span>` : ""}
            </div>
            <div class="entity-badges">${badges}</div>
        `;
        li.addEventListener("click", () => abrirModalEntidade(chave, id, entidade));
        container.appendChild(li);
    });
}

function listaPericiasArray() {
    const lista = fichaAtual.pericias || {};
    return Object.values(lista);
}

function truncar(txt, max) {
    if (!txt) return "";
    return txt.length > max ? txt.slice(0, max) + "…" : txt;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.innerText = str ?? "";
    return div.innerHTML;
}

// ---------------------------------------------------------------------
// Botões "+ Adicionar"
// ---------------------------------------------------------------------
function configurarBotoesAdicionar() {
    document.getElementById("btn-add-pericia").addEventListener("click", () => abrirModalPericia(null, { nome: "", atributo: ATRIBUTOS_PRIMARIOS[0].key, nivel: 0 }));
    document.getElementById("btn-add-item").addEventListener("click", () => abrirModalEntidade("inventario", null, { nome: "", descricao: "", modificadores: [] }));
    document.getElementById("btn-add-vantagem").addEventListener("click", () => abrirModalEntidade("vantagens", null, { nome: "", descricao: "", modificadores: [] }));
    document.getElementById("btn-add-desvantagem").addEventListener("click", () => abrirModalEntidade("desvantagens", null, { nome: "", descricao: "", modificadores: [] }));
    document.getElementById("btn-add-fato").addEventListener("click", () => abrirModalEntidade("fatosUniversais", null, { nome: "", descricao: "", modificadores: [] }));
    document.getElementById("btn-add-especializacao").addEventListener("click", () => abrirModalEntidade("especializacoes", null, { nome: "", descricao: "", modificadores: [] }));
}

// ---------------------------------------------------------------------
// Modal genérico (entidade com nome + descrição + modificadores[])
// ---------------------------------------------------------------------
let modalTipoAtual = null; // "pericias" | nome da lista genérica

function configurarModal() {
    el.modalCancelar.addEventListener("click", fecharModal);
    el.modal.addEventListener("click", (e) => { if (e.target === el.modal) fecharModal(); });
    el.modalAddModificador.addEventListener("click", () => adicionarLinhaModificador());
    el.modalExcluir.addEventListener("click", excluirEntidadeAtual);
    el.modalSalvar.addEventListener("click", salvarEntidadeAtual);
}

function abrirModalPericia(id, pericia) {
    modalTipoAtual = "pericias";
    modalContexto = { id, original: pericia };

    el.modalTitulo.innerText = id ? "Editar perícia" : "Nova perícia";
    el.modalNome.value = pericia.nome || "";
    el.modalNome.placeholder = "ex: Furtividade, Hacking, Boxe...";

    el.modalCampoAtributo.style.display = "flex";
    el.modalAtributo.innerHTML = ATRIBUTOS_PRIMARIOS.map(a => `<option value="${a.key}">${a.label}</option>`).join("");
    el.modalAtributo.value = pericia.atributo || ATRIBUTOS_PRIMARIOS[0].key;

    el.modalCampoNivel.style.display = "flex";
    el.modalNivel.value = pericia.nivel ?? 0;

    el.modalDescricao.value = pericia.descricao || "";
    el.modalDescricao.placeholder = "Especialização, anotação de mesa, regra especial dessa perícia...";

    el.modalListaModificadores.innerHTML = "";
    (pericia.modificadores || []).forEach(m => adicionarLinhaModificador(m));

    el.modalExcluir.style.display = id ? "block" : "none";
    el.modal.classList.add("active");
}

const GENERO_LISTA = {
    inventario: "o",
    vantagens: "a",
    desvantagens: "a",
    fatosUniversais: "o",
    especializacoes: "a"
};

function abrirModalEntidade(chave, id, entidade) {
    modalTipoAtual = chave;
    modalContexto = { id, original: entidade };

    const rotulo = LABELS_LISTA[chave] || "registro";
    const artigo = GENERO_LISTA[chave] || "o";
    el.modalTitulo.innerText = id
        ? `Editar ${rotulo}`
        : `Nov${artigo} ${rotulo}`;
    el.modalNome.value = entidade.nome || "";
    el.modalNome.placeholder = `Nome d${artigo} ${rotulo}`;

    el.modalCampoAtributo.style.display = "none";
    el.modalCampoNivel.style.display = "none";

    el.modalDescricao.value = entidade.descricao || "";
    el.modalDescricao.placeholder = "Descrição, efeito narrativo, regra especial...";

    el.modalListaModificadores.innerHTML = "";
    (entidade.modificadores || []).forEach(m => adicionarLinhaModificador(m));

    el.modalExcluir.style.display = id ? "block" : "none";
    el.modal.classList.add("active");
}

function adicionarLinhaModificador(modificadorExistente) {
    const frag = el.templateModificador.content.cloneNode(true);
    const row = frag.querySelector(".modificador-row");
    const selectAlvo = row.querySelector(".mod-alvo");
    const inputValor = row.querySelector(".mod-valor");
    const btnRemover = row.querySelector(".mod-remover");

    const opcoes = listaAlvosModificador(listaPericiasArray());
    selectAlvo.innerHTML = opcoes.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
    if (modificadorExistente) {
        selectAlvo.value = modificadorExistente.alvo;
        inputValor.value = modificadorExistente.valor;
    }

    btnRemover.addEventListener("click", () => row.remove());
    el.modalListaModificadores.appendChild(row);
}

function lerModificadoresDoModal() {
    const linhas = el.modalListaModificadores.querySelectorAll(".modificador-row");
    const mods = [];
    linhas.forEach(row => {
        const alvo = row.querySelector(".mod-alvo").value;
        const valor = Number(row.querySelector(".mod-valor").value) || 0;
        if (alvo && valor !== 0) mods.push({ alvo, valor });
    });
    return mods;
}

function fecharModal() {
    el.modal.classList.remove("active");
    modalContexto = null;
    modalTipoAtual = null;
}

function salvarEntidadeAtual() {
    const nome = el.modalNome.value.trim();
    if (!nome) {
        toast("Dê um nome antes de salvar.", "erro");
        return;
    }

    if (modalTipoAtual === "pericias") {
        const nivel = Math.max(0, Math.min(5, Number(el.modalNivel.value) || 0));
        const atributo = el.modalAtributo.value;
        const atributoValor = Number(fichaAtual.dados[atributo]) || 0;
        if (nivel > atributoValor) {
            toast(`Aviso: nível ${nivel} é maior que ${atributo} (${atributoValor}). Salvando mesmo assim — ajuste se for engano.`, "erro");
        }
        const objeto = {
            nome,
            atributo,
            nivel,
            descricao: el.modalDescricao.value.trim(),
            modificadores: lerModificadoresDoModal()
        };
        const id = modalContexto.id || gerarId();
        fichaAtual.pericias[id] = objeto;
    } else {
        const objeto = {
            nome,
            descricao: el.modalDescricao.value.trim(),
            modificadores: lerModificadoresDoModal()
        };
        const id = modalContexto.id || gerarId();
        fichaAtual[modalTipoAtual][id] = objeto;
    }

    fecharModal();
    renderizarTudo();
    agendarSalvar();
}

function excluirEntidadeAtual() {
    if (!modalContexto || !modalContexto.id) { fecharModal(); return; }
    if (modalTipoAtual === "pericias") {
        delete fichaAtual.pericias[modalContexto.id];
    } else {
        delete fichaAtual[modalTipoAtual][modalContexto.id];
    }
    fecharModal();
    renderizarTudo();
    agendarSalvar();
}

function gerarId() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

// ---------------------------------------------------------------------
// Salvamento (debounce automático + botão manual)
// ---------------------------------------------------------------------
function agendarSalvar() {
    el.saveStatus.innerText = "salvando alterações...";
    clearTimeout(salvandoDebounce);
    salvandoDebounce = setTimeout(() => salvarTudo(false), 700);
}

async function salvarTudo(manual) {
    if (!fichaAtual || !fichaAtualId) {
        if (manual) toast("Nenhuma ficha ativa pra salvar.", "erro");
        return;
    }
    try {
        await set(ref(db, `fichas/${fichaAtualId}`), fichaAtual);
        el.saveStatus.innerText = "sincronizado em tempo real";
        el.syncIndicator.classList.remove("offline");
        if (manual) toast("Ficha salva na rede.");
    } catch (err) {
        console.error(err);
        el.syncIndicator.classList.add("offline");
        toast("Falha ao salvar. Verifique sua conexão.", "erro");
    }
}
