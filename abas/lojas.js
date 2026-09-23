// abas/lojas.js
// ---------------------------------------------------------------------
// Aba Lojas (Etapas 2 a 7 do plano — ver planejamento-lojas.txt): o
// Mestre cria, edita e exclui lojas, e cadastra nelas itens do Banco
// Global de Itens — busca por nome, preço, estoque e uma descrição
// própria da loja. Quando o item ainda não existe no Banco, o botão
// "+ Criar item novo no Banco" abre o mesmo modal completo (tag, peso,
// perícia, dano etc.) já usado pela Biblioteca do Mestre e pelo
// "Solicitar item" do jogador (ver abrirModalNovo("itensGlobais") em
// ficha.js) — sem duplicar as regras de cada tag aqui. Depois de salvo
// no modal, o Mestre busca o nome de novo no campo desta loja pra
// selecionar e completar o cadastro (mesmo padrão de "Solicitar item"
// em abas/inventario.js).
//
// Jogador (Etapas 5-8): vê as lojas visíveis, expande o catálogo e
// monta a compra — quantidade, saldo, total (calcularTotal/validarCompra,
// lojas.js) e um aviso de espaço se nenhum container em "Levando
// consigo" comporta a quantidade (simularEncaixeCompra, inventario.js).
// O botão "Comprar" (confirmarCompra, Etapa 7) faz, nesta ordem:
//   1) decide ONDE o item vai cair (decidirDestinoDoItemComprado,
//      inventario.js) usando o molde MAIS RECENTE do Banco — se não
//      houver container que comporte, a compra é BLOQUEADA aqui, sem
//      cobrar nada (regra "tudo ou nada" / ponto em aberto do plano:
//      "nenhum container comporta" só bloqueia com aviso, provisório).
//      Compra de várias unidades SEPARADAS (item não empilhável, qtd >
//      1) não cai direto num container do jogador: vai tudo pra dentro
//      de uma Caixa nova (Etapa 8) — só a Caixa precisa de um lugar
//      físico (container que comporte, ou mão livre; ver "caixa" no
//      retorno de decidirDestinoDoItemComprado);
//   2) só então efetiva a compra de verdade (efetivarCompra, lojas.js:
//      baixa estoque de forma atômica + debita o saldo escolhido, com
//      rollback se o débito falhar);
//   3) grava o(s) item(ns) no inventário, nos destinos decididos no
//      passo 1 (entregarItensComprados abaixo) — autopreencherItemDoBanco
//      + dentroDe/compartimentoId do container escolhido (ou da Caixa
//      recém-criada, quando for o caso).
// Passo 1 nunca cobra, e só chega no passo 3 depois do pagamento ter
// dado certo — assim nunca cobra sem entregar (a única janela de risco
// que sobra é bem pequena: entre os passos 2 e 3 só existe uma escrita
// local no Firebase, sem I/O do usuário no meio).
//
// Cache local em estado.lojasCache (ver estado.js) — mesmo padrão de
// estado.cenariosCache / estado.npcsCache: um listener em tempo real
// (ouvirLojas) alimenta o cache, e renderizarLojas() só lê o cache pra
// desenhar a lista, sem chamada de rede a cada render.
// ---------------------------------------------------------------------

import { db } from "../firebase-config.js?v=20260916-bfcachefix";
import { ref, update } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { estado } from "../estado.js";
import { escapeHtml, toast, abrirModalNovo, caminhoBase, gerarIdLocal } from "../ficha.js?v=20260830-npcnivelpv";
import {
    ouvirLojas, criarLoja, editarLoja, excluirLoja,
    adicionarItemNaLoja, editarItemDaLoja, removerItemDaLoja,
    itemEsgotado, calcularTotal, validarCompra, efetivarCompra
} from "../lojas.js";
import { buscarItensGlobaisPorNome, buscarItemBancoPorId, autopreencherItemDoBanco } from "../itens-globais.js";
import { rotuloTag, todosOsSaldos, tagTemQuantidadeGeral } from "../dados-manual.js";
import { simularEncaixeCompra, decidirDestinoDoItemComprado, DENTRO_DA_CAIXA } from "../inventario.js";

// ---------------------------------------------------------------------
// Listener — chamado uma vez no setup() do ficha.js, igual
// configurarCenarios/configurarFatorPrecoDarknet.
// ---------------------------------------------------------------------
export function configurarLojas() {
    if (estado.unsubLojas) { estado.unsubLojas(); estado.unsubLojas = null; }
    estado.unsubLojas = ouvirLojas((lojas) => {
        estado.lojasCache = lojas;
        renderizarLojas();
    });

    const blocoMestre = document.getElementById("lojas-mestre-bloco");
    if (blocoMestre) blocoMestre.style.display = estado.isMestre ? "block" : "none";

    const btnCriar = document.getElementById("lojas-btn-criar");
    if (btnCriar && !btnCriar.dataset.wired) {
        btnCriar.dataset.wired = "1";
        btnCriar.addEventListener("click", criarLojaPeloFormulario);
    }
}

async function criarLojaPeloFormulario() {
    const inputNome = document.getElementById("lojas-novo-nome");
    const inputDescricao = document.getElementById("lojas-novo-descricao");
    const chkVirtual = document.getElementById("lojas-novo-aceita-virtual");
    const nome = (inputNome.value || "").trim();
    if (!nome) { toast("Dê um nome pra loja antes de criar."); inputNome.focus(); return; }
    try {
        await criarLoja({
            nome,
            descricao: inputDescricao.value || "",
            visivel: true,
            aceitaDinheiroVirtual: chkVirtual ? chkVirtual.checked : false
        });
        inputNome.value = "";
        inputDescricao.value = "";
        if (chkVirtual) chkVirtual.checked = false;
        toast(`Loja "${nome}" criada.`);
    } catch (e) {
        toast(e.message || "Não deu pra criar a loja.");
    }
}

// ---------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------
export function renderizarLojas() {
    const lista = document.getElementById("lojas-lista");
    const vazio = document.getElementById("lojas-vazio");
    if (!lista) return;

    const todasAsLojas = estado.lojasCache || [];
    const lojasVisiveis = estado.isMestre ? todasAsLojas : todasAsLojas.filter(l => l.visivel !== false);

    lista.innerHTML = "";
    if (vazio) vazio.style.display = lojasVisiveis.length ? "none" : "block";

    lojasVisiveis.forEach(loja => {
        lista.appendChild(estado.isMestre ? montarItemLojaMestre(loja) : montarItemLojaJogador(loja));
    });
}

function montarItemLojaJogador(loja) {
    const li = document.createElement("li");
    const itens = loja.itens || [];
    const expandida = estado.lojasExpandidas.has(loja.id);
    li.innerHTML = `
        <div class="entity-main">
            <div class="entity-nome">${escapeHtml(loja.nome)}</div>
            ${loja.descricao ? `<div class="loja-descricao">${escapeHtml(loja.descricao)}</div>` : ""}
            <div class="loja-acoes-mestre">
                <button type="button" class="btn-ghost" data-acao="expandir">${expandida ? "Recolher catálogo" : `Ver catálogo (${itens.length})`}</button>
            </div>
            <div class="loja-catalogo" data-catalogo style="display:${expandida ? "block" : "none"};"></div>
        </div>`;

    li.querySelector('[data-acao="expandir"]').addEventListener("click", () => {
        if (estado.lojasExpandidas.has(loja.id)) estado.lojasExpandidas.delete(loja.id);
        else estado.lojasExpandidas.add(loja.id);
        renderizarLojas();
    });

    if (expandida) montarCatalogoJogador(li.querySelector("[data-catalogo]"), loja);

    return li;
}

// ---------------------------------------------------------------------
// Catálogo da loja (visão do jogador) — Etapa 5: lista os itens à
// venda e monta a caixa de compra (quantidade, saldo, total, aviso de
// espaço). A compra em si (efetivar, cobrar, entregar) só chega nas
// Etapas 6/7 — aqui o botão "Comprar" fica sempre desabilitado, é só
// cálculo e validação em tempo real (ver planejamento-lojas.txt).
// ---------------------------------------------------------------------
function montarCatalogoJogador(container, loja) {
    const itens = loja.itens || [];
    const lista = document.createElement("ul");
    lista.className = "entity-list loja-catalogo-lista";
    if (!itens.length) {
        const vazio = document.createElement("li");
        vazio.className = "loja-catalogo-em-breve";
        vazio.textContent = "Essa loja ainda não tem itens à venda.";
        lista.appendChild(vazio);
    }
    itens.forEach(item => lista.appendChild(montarItemCatalogoJogador(loja, item)));
    container.appendChild(lista);
}

function montarItemCatalogoJogador(loja, item) {
    const li = document.createElement("li");
    const esgotado = itemEsgotado(item);
    const itemBanco = (estado.itensGlobaisCache || []).find(b => b.id === item.itemBancoId) || null;
    const permiteVirtual = loja.aceitaDinheiroVirtual && item.precoVirtual !== null && item.precoVirtual !== undefined;
    li.innerHTML = `
        <div class="entity-main">
            <div class="entity-nome">${escapeHtml(item.nomeCache || "(item sem nome)")}</div>
            <div class="loja-descricao">CN$ ${item.preco}${permiteVirtual ? ` · Virtual: CN$ ${item.precoVirtual}` : ""} · ${esgotado ? "esgotado" : `estoque: ${item.estoque}`}${item.descricaoLoja ? ` · ${escapeHtml(item.descricaoLoja)}` : ""}</div>
            ${itemBanco && itemBanco.descricao ? `<div class="loja-descricao">${escapeHtml(itemBanco.descricao)}</div>` : ""}
            <div class="loja-acoes-mestre">
                <button type="button" class="btn-ghost" data-acao="abrir-compra" ${esgotado ? "disabled" : ""}>${esgotado ? "Esgotado" : "Comprar"}</button>
            </div>
            <div class="loja-edit-form loja-compra-box" data-caixa-compra style="display:none;"></div>
        </div>`;

    const box = li.querySelector("[data-caixa-compra]");
    li.querySelector('[data-acao="abrir-compra"]').addEventListener("click", () => {
        if (box.style.display === "block") { box.style.display = "none"; box.innerHTML = ""; return; }
        abrirCaixaCompra(box, loja, item, itemBanco);
        box.style.display = "block";
    });

    return li;
}

// Monta o formulário da compra (quantidade + forma de pagamento +
// saldo) e recalcula tudo (total, saldo, estoque, espaço nos
// containers) a cada mudança — nada é gravado, só calculado (ver
// validarCompra em lojas.js e simularEncaixeCompra em inventario.js).
//
// Loja com aceitaDinheiroVirtual E item com precoVirtual definido
// ganham um seletor extra "Forma de pagamento" (Dinheiro / Dinheiro
// Virtual) — o preço muda com a escolha (preco x precoVirtual), e o
// "Pagar com" logo abaixo só lista os saldos daquele grupo
// (formaPagamentoAtual/preencherOpcoesSaldo). Sem isso (loja comum, ou
// item sem preço virtual definido mesmo numa loja que aceita), a
// compra continua igual a antes: só dinheiro normal.
function abrirCaixaCompra(box, loja, item, itemBanco) {
    const permiteVirtual = loja.aceitaDinheiroVirtual && item.precoVirtual !== null && item.precoVirtual !== undefined;

    box.innerHTML = `
        <label>Quantidade (estoque: ${item.estoque})</label>
        <input type="number" min="1" max="${item.estoque}" step="1" value="1" data-campo="quantidade">
        ${permiteVirtual ? `
        <label>Forma de pagamento</label>
        <select data-campo="forma-pagamento">
            <option value="dinheiro">Dinheiro (CN$ ${item.preco})</option>
            <option value="virtual">Dinheiro Virtual (CN$ ${item.precoVirtual})</option>
        </select>` : ""}
        <label>Pagar com</label>
        <select data-campo="saldo"></select>
        <div class="loja-compra-total" data-total></div>
        <div class="loja-compra-aviso" data-aviso style="display:none;"></div>
        <div class="loja-compra-aviso loja-compra-aviso-espaco" data-aviso-espaco style="display:none;"></div>
        <div class="loja-acoes-mestre">
            <button type="button" class="btn-lime" data-acao="confirmar-compra" disabled>Comprar</button>
            <button type="button" class="btn-ghost" data-acao="cancelar-compra">Cancelar</button>
        </div>`;

    const recalcular = () => recalcularCompra(box, loja, item, itemBanco);

    box.querySelector('[data-campo="quantidade"]').addEventListener("input", recalcular);
    const selectForma = box.querySelector('[data-campo="forma-pagamento"]');
    if (selectForma) {
        selectForma.addEventListener("change", () => {
            preencherOpcoesSaldo(box);
            recalcular();
        });
    }
    box.querySelector('[data-campo="saldo"]').addEventListener("change", recalcular);
    box.querySelector('[data-acao="cancelar-compra"]').addEventListener("click", () => {
        box.style.display = "none"; box.innerHTML = "";
    });
    box.querySelector('[data-acao="confirmar-compra"]').addEventListener("click", () => {
        confirmarCompra(box, loja, item);
    });

    preencherOpcoesSaldo(box);
    recalcular();
}

// "dinheiro" (padrão, quando a loja nem oferece a escolha) ou
// "virtual" — lido do seletor "Forma de pagamento", se ele existir.
function formaPagamentoAtual(box) {
    const select = box.querySelector('[data-campo="forma-pagamento"]');
    return select ? select.value : "dinheiro";
}

// Recria as opções do "Pagar com" a partir da forma de pagamento atual
// — só os saldos do grupo certo (todosOsSaldos já marca cada um com
// `virtual`, ver dados-manual.js). Tenta manter a escolha anterior se
// ela continuar valendo pro novo grupo (troca de forma de pagamento
// não deveria resetar sem necessidade); senão cai no primeiro da lista.
function preencherOpcoesSaldo(box) {
    const selectSaldo = box.querySelector('[data-campo="saldo"]');
    const formaPagamento = formaPagamentoAtual(box);
    const valorAnterior = selectSaldo.value;
    const saldos = todosOsSaldos(estado.fichaAtual).filter(s => formaPagamento === "virtual" ? s.virtual : !s.virtual);

    selectSaldo.innerHTML = saldos.length
        ? saldos.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nome)} (CN$ ${s.valor})</option>`).join("")
        : `<option value="">Nenhum saldo disponível</option>`;
    selectSaldo.disabled = !saldos.length;
    if (saldos.some(s => s.id === valorAnterior)) selectSaldo.value = valorAnterior;
}

// Monta, a partir do molde do Banco, o registro pronto pra gravar no
// inventário no destino decidido por decidirDestinoDoItemComprado —
// numa mão livre (destino.naMao — prioridade 1, ver inventario.js) ou
// dentro de um container (containerId + compartimentoId). Item
// empilhável (tagTemQuantidadeGeral — regra 3 do plano) vira UMA
// entrada só com a quantidade TOTAL comprada, mesmo que seja só 1
// unidade (nunca herda a quantidade que o molde tinha quando foi
// cadastrado no Banco) — peso/volume recalculados pelo unitário do
// molde × quantidade, igual o resto do jogo já faz (ver
// lerPesoVolumeEQuantidadeDoModal em ficha.js). Item comum (arma,
// container, projétil, material...) é uma cópia direta do molde, sem
// tocar em peso/volume/quantidade.
function montarRegistroParaDestino(itemBanco, destino) {
    const registro = autopreencherItemDoBanco(itemBanco, "levando");
    if (destino.naMao) {
        registro.dentroDe = null;
        registro.compartimentoId = null;
        registro.equipada = true;
    } else {
        registro.dentroDe = destino.containerId;
        registro.compartimentoId = destino.compartimentoId;
    }
    if (tagTemQuantidadeGeral(itemBanco.tag)) {
        const pesoUnitario = Number(itemBanco.pesoUnitario) || 0;
        registro.quantidade = destino.unidades;
        registro.peso = +(pesoUnitario * destino.unidades).toFixed(2);
        registro.volume = destino.volume;
    }
    return registro;
}

// Monta o registro da Caixa em si (Etapa 8) a partir do que
// decidirDestinoDoItemComprado calculou em `caixaInfo` (tamanho,
// capacidadeVolume, tamanhoMaximoAceito, e onde ELA vai ficar — outro
// container do jogador, ou na mão). Tag "recipiente", subtipo
// bolsa_mao (ocupa mão — ver SUBTIPOS_PORTE em dados-manual.js), um
// único compartimento "principal" com a capacidade calculada pra essa
// compra. Peso próprio 0 (provisório: o peso de quem carrega já conta
// o peso de cada item guardado dentro dela, separadamente — ver
// pesoTotalPorCategoria, inventario.js; a caixa em si não soma peso
// extra por cima disso).
function montarRegistroDaCaixa(itemBanco, quantidade, caixaInfo) {
    const naMao = caixaInfo.destino.naMao;
    return {
        nome: `Caixa (${itemBanco.nome})`,
        descricao: `Caixa com ${quantidade} unidade(s) de "${itemBanco.nome}", compradas juntas.`,
        tag: "recipiente",
        categoria: "levando",
        subtipoPorte: "bolsa_mao",
        maosNecessarias: 1,
        peso: 0,
        tamanho: caixaInfo.tamanho,
        volume: caixaInfo.volume,
        compartimentos: [{
            id: caixaInfo.compartimentoId,
            nome: "Principal",
            capacidadeVolume: caixaInfo.capacidadeVolume,
            tamanhoMaximoAceito: caixaInfo.tamanhoMaximoAceito
        }],
        dentroDe: naMao ? null : caixaInfo.destino.containerId,
        compartimentoId: naMao ? null : caixaInfo.destino.compartimentoId,
        // Só precisa estar "equipada" (regra de itemPodeSerLevadoSolto,
        // inventario.js) quando fica solta na mão — dentro de outro
        // container isso não é exigido.
        equipada: !!naMao
    };
}

// Grava no Firebase (um único update multi-caminho — o RTDB aplica
// isso de forma atômica) tudo que uma compra gerou, e já atualiza o
// cache local (estado.fichaAtual.inventario) pra tela refletir na
// hora, sem esperar o próximo evento do listener. Recebe a decisão
// INTEIRA de decidirDestinoDoItemComprado (destinos + caixa):
//   - sem Caixa (caixa: null): grava cada destino direto no container
//     decidido (Etapas 5-7, sem mudança);
//   - com Caixa (Etapa 8): cria a Caixa primeiro (só aí um id de
//     verdade existe) e troca o sentinel DENTRO_DA_CAIXA de cada
//     destino pelo id gerado, antes de gravar as unidades.
// Devolve os nomes dos containers/Caixa onde a compra caiu, pro toast
// de sucesso mostrar pro jogador.
async function entregarItensComprados(itemBanco, quantidadeTotal, decisaoDestino) {
    const payload = {};
    const nomesContainers = new Set();
    if (!estado.fichaAtual.inventario) estado.fichaAtual.inventario = {};

    let destinos = decisaoDestino.destinos;

    if (decisaoDestino.caixa) {
        const caixaId = gerarIdLocal();
        const registroCaixa = montarRegistroDaCaixa(itemBanco, quantidadeTotal, decisaoDestino.caixa);
        estado.fichaAtual.inventario[caixaId] = registroCaixa;
        payload[`${caminhoBase()}/inventario/${caixaId}`] = registroCaixa;
        nomesContainers.add(registroCaixa.nome);
        destinos = destinos.map(destino =>
            destino.containerId === DENTRO_DA_CAIXA ? { ...destino, containerId: caixaId } : destino
        );
    }

    destinos.forEach(destino => {
        const id = gerarIdLocal();
        const registro = montarRegistroParaDestino(itemBanco, destino);
        estado.fichaAtual.inventario[id] = registro;
        payload[`${caminhoBase()}/inventario/${id}`] = registro;
        if (!decisaoDestino.caixa) {
            if (destino.naMao) {
                nomesContainers.add("sua mão");
            } else {
                const container = estado.fichaAtual.inventario[destino.containerId];
                if (container && container.nome) nomesContainers.add(container.nome);
            }
        }
    });

    await update(ref(db), payload);
    return Array.from(nomesContainers);
}

// Frase amigável pro caso "nenhum container comporta" (ponto em aberto
// do plano — hoje só bloqueia com aviso, sem cobrar). "sem_espaco"
// cobre tanto o item direto quanto a Caixa (Etapa 8: quando a compra é
// de várias unidades separadas, nem um container nem uma mão livre
// coube a Caixa que guardaria tudo).
function fraseSemEspaco(motivo) {
    return motivo === "sem_container"
        ? "Você não tem nenhum container em \"Levando consigo\" com lugar pra guardar isso. Arrume um container equipado (mochila, bolso, etc.) antes de comprar."
        : "Nenhum dos seus containers tem espaço pra isso agora (nem uma mão livre pra segurar a Caixa, se for mais de uma unidade). Libere espaço, uma mão, ou compre menos unidades.";
}

// Etapa 7: decide o destino ANTES de cobrar (nunca cobra sem ter pra
// onde entregar), efetiva a compra (cobra + baixa estoque) e só então
// grava o(s) item(ns) no inventário, no container decidido.
async function confirmarCompra(box, loja, item) {
    const btnConfirmar = box.querySelector('[data-acao="confirmar-compra"]');
    const inputQtd = box.querySelector('[data-campo="quantidade"]');
    const selectSaldo = box.querySelector('[data-campo="saldo"]');
    const selectForma = box.querySelector('[data-campo="forma-pagamento"]');
    const qtd = Math.max(1, Math.floor(Number(inputQtd.value) || 0));
    const saldoId = selectSaldo.value;
    const formaPagamento = formaPagamentoAtual(box);

    btnConfirmar.disabled = true;
    selectSaldo.disabled = true;
    inputQtd.disabled = true;
    if (selectForma) selectForma.disabled = true;

    const reabilitarComErro = (motivo) => {
        toast(motivo || "Não deu pra efetivar a compra.");
        inputQtd.disabled = false;
        selectSaldo.disabled = false;
        if (selectForma) selectForma.disabled = false;
        recalcularCompra(box, loja, item, (estado.itensGlobaisCache || []).find(b => b.id === item.itemBancoId) || null);
    };

    try {
        // 1) Molde mais recente do Banco — nunca confia só no cache da
        // tela (o Mestre pode ter editado o item depois de cadastrado
        // na loja; ver "Riscos e observações" do plano).
        const itemBanco = await buscarItemBancoPorId(item.itemBancoId);
        if (!itemBanco) { reabilitarComErro("Esse item não está mais disponível no Banco Global — avise o Mestre."); return; }

        // 2) Decide ONDE vai cair. Ainda NADA foi cobrado até aqui.
        const decisaoDestino = decidirDestinoDoItemComprado(estado.fichaAtual, itemBanco, qtd);
        if (!decisaoDestino.ok) { reabilitarComErro(fraseSemEspaco(decisaoDestino.motivo)); return; }

        // 3) Só agora cobra de verdade (transacional: baixa estoque +
        // debita saldo, com rollback se o saldo faltar).
        const resultado = await efetivarCompra({
            lojaId: loja.id,
            itemLojaId: item.id,
            quantidade: qtd,
            saldoId,
            caminhoFicha: caminhoBase(),
            formaPagamento
        });
        if (!resultado.ok) { reabilitarComErro(resultado.motivo); return; }

        // 4) Pagamento confirmado — entrega de verdade nos destinos já
        // decididos no passo 2 (cria a Caixa antes, se for o caso —
        // Etapa 8).
        try {
            const nomesContainers = await entregarItensComprados(itemBanco, qtd, decisaoDestino);
            const ondeFoi = nomesContainers.length ? ` Foi pra: ${nomesContainers.join(", ")}.` : "";
            const rotuloForma = formaPagamento === "virtual" ? " (dinheiro virtual)" : "";
            toast(`Compra concluída: CN$ ${resultado.total}${rotuloForma} debitado(s), "${item.nomeCache}" entregue.${ondeFoi}`);
            box.style.display = "none";
            box.innerHTML = "";
        } catch (erroEntrega) {
            // Já foi cobrado e o estoque já baixou — não dá pra desfazer
            // isso silenciosamente aqui. Avisa bem claro pro jogador
            // procurar o Mestre em vez de fingir que deu tudo certo.
            console.error("Erro ao entregar item comprado (pagamento já efetivado):", erroEntrega);
            toast(`CN$ ${resultado.total} foi debitado e o estoque baixou, mas houve um erro ao entregar "${item.nomeCache}" no inventário. Avise o Mestre.`);
            box.style.display = "none";
            box.innerHTML = "";
        }
    } catch (e) {
        console.error("Erro ao efetivar compra:", e);
        reabilitarComErro(e.message || "Erro ao efetivar a compra — veja o console.");
    }
}

function recalcularCompra(box, loja, item, itemBanco) {
    const inputQtd = box.querySelector('[data-campo="quantidade"]');
    const selectSaldo = box.querySelector('[data-campo="saldo"]');
    const elTotal = box.querySelector('[data-total]');
    const elAviso = box.querySelector('[data-aviso]');
    const elAvisoEspaco = box.querySelector('[data-aviso-espaco]');
    const btnConfirmar = box.querySelector('[data-acao="confirmar-compra"]');

    let qtd = Math.floor(Number(inputQtd.value) || 0);
    if (qtd < 1) qtd = 1;
    inputQtd.value = qtd;

    const formaPagamento = formaPagamentoAtual(box);
    const precoUnitario = formaPagamento === "virtual" ? item.precoVirtual : item.preco;
    const total = calcularTotal(precoUnitario, qtd);
    elTotal.textContent = `Total: CN$ ${total}${formaPagamento === "virtual" ? " (dinheiro virtual)" : ""}`;

    const saldos = todosOsSaldos(estado.fichaAtual).filter(s => formaPagamento === "virtual" ? s.virtual : !s.virtual);
    if (!saldos.length) {
        elAviso.textContent = formaPagamento === "virtual"
            ? "Você não tem nenhum saldo de dinheiro virtual pra pagar essa compra."
            : "Você não tem nenhum saldo de dinheiro pra pagar essa compra.";
        elAviso.style.display = "block";
        elAvisoEspaco.style.display = "none";
        btnConfirmar.disabled = true;
        btnConfirmar.title = elAviso.textContent;
        return;
    }

    const saldoEscolhido = saldos.find(s => s.id === selectSaldo.value) || saldos[0];
    const resultado = validarCompra(loja, item, qtd, saldoEscolhido.valor, { ehMestre: false, formaPagamento });

    // Motivo BLOQUEANTE (impede o botão "Comprar"): estoque, saldo, ou
    // o item ter sumido do Banco Global no meio tempo.
    let motivo = resultado.ok ? "" : resultado.motivo;
    if (resultado.ok && !itemBanco) {
        motivo = "Esse item não está mais disponível no Banco Global — avise o Mestre.";
    }

    // Aviso de ESPAÇO (Etapa 7: agora BLOQUEIA o botão também — se
    // nenhum container comportar, confirmarCompra vai recusar a compra
    // antes de cobrar; mostrar isso aqui de antemão evita o jogador
    // clicar "Comprar" só pra descobrir na hora. Usa a mesma regra que
    // decide a entrega de verdade — simularEncaixeCompra chama
    // decidirDestinoDoItemComprado por baixo dos panos, então nunca diverge).
    let avisoEspaco = "";
    let bloqueiaPorEspaco = false;
    if (resultado.ok && itemBanco) {
        const encaixe = simularEncaixeCompra(estado.fichaAtual, itemBanco, qtd);
        if (!encaixe.cabe) {
            avisoEspaco = fraseSemEspaco(encaixe.motivo);
            bloqueiaPorEspaco = true;
        }
    }

    elAviso.textContent = motivo;
    elAviso.style.display = motivo ? "block" : "none";
    elAvisoEspaco.textContent = avisoEspaco;
    elAvisoEspaco.style.display = avisoEspaco ? "block" : "none";

    btnConfirmar.disabled = !!motivo || bloqueiaPorEspaco;
    btnConfirmar.title = motivo || avisoEspaco || "Compra CN$ + baixa estoque + entrega o item no seu container.";
}

function montarItemLojaMestre(loja) {
    const li = document.createElement("li");
    const itens = loja.itens || [];
    const expandida = estado.lojasExpandidas.has(loja.id);
    li.innerHTML = `
        <div class="entity-main">
            <div class="entity-nome">
                ${escapeHtml(loja.nome)}
                <span class="loja-badge ${loja.visivel ? "visivel" : "oculta"}">${loja.visivel ? "Visível" : "Oculta"}</span>
                ${loja.aceitaDinheiroVirtual ? `<span class="loja-badge virtual">Aceita dinheiro virtual</span>` : ""}
            </div>
            ${loja.descricao ? `<div class="loja-descricao">${escapeHtml(loja.descricao)}</div>` : ""}
            <div class="loja-acoes-mestre">
                <button type="button" class="btn-ghost" data-acao="expandir">${expandida ? "Recolher catálogo" : `Ver catálogo (${itens.length})`}</button>
                <button type="button" class="btn-ghost" data-acao="alternar-visivel">${loja.visivel ? "Ocultar" : "Tornar visível"}</button>
                <button type="button" class="btn-ghost" data-acao="editar">Editar</button>
                <button type="button" class="btn-red" data-acao="excluir">Excluir</button>
            </div>
            <div class="loja-edit-form" data-form-editar style="display:none;"></div>
            <div class="loja-catalogo" data-catalogo style="display:${expandida ? "block" : "none"};"></div>
        </div>`;

    li.querySelector('[data-acao="alternar-visivel"]').addEventListener("click", async () => {
        try { await editarLoja(loja.id, { visivel: !loja.visivel }); }
        catch (e) { toast(e.message || "Não deu pra mudar a visibilidade."); }
    });

    li.querySelector('[data-acao="excluir"]').addEventListener("click", async () => {
        if (!confirm(`Excluir a loja "${loja.nome}"? Isso apaga também os itens cadastrados nela.`)) return;
        try { await excluirLoja(loja.id); toast(`Loja "${loja.nome}" excluída.`); }
        catch (e) { toast(e.message || "Não deu pra excluir a loja."); }
    });

    li.querySelector('[data-acao="editar"]').addEventListener("click", () => {
        abrirFormularioEdicao(li, loja);
    });

    li.querySelector('[data-acao="expandir"]').addEventListener("click", () => {
        if (estado.lojasExpandidas.has(loja.id)) estado.lojasExpandidas.delete(loja.id);
        else estado.lojasExpandidas.add(loja.id);
        renderizarLojas();
    });

    if (expandida) montarCatalogoMestre(li.querySelector("[data-catalogo]"), loja);

    return li;
}

// ---------------------------------------------------------------------
// Catálogo da loja (visão do Mestre) — lista os itens já cadastrados +
// o formulário de busca no Banco Global pra adicionar um novo.
// ---------------------------------------------------------------------
function montarCatalogoMestre(container, loja) {
    const itens = loja.itens || [];

    const lista = document.createElement("ul");
    lista.className = "entity-list loja-catalogo-lista";
    if (!itens.length) {
        const vazio = document.createElement("li");
        vazio.className = "loja-catalogo-em-breve";
        vazio.textContent = "Nenhum item cadastrado ainda.";
        lista.appendChild(vazio);
    }
    itens.forEach(item => lista.appendChild(montarItemCatalogoMestre(loja, item)));
    container.appendChild(lista);

    container.appendChild(montarFormularioAdicionarItem(loja));
}

function montarItemCatalogoMestre(loja, item) {
    const li = document.createElement("li");
    const temPrecoVirtual = item.precoVirtual !== null && item.precoVirtual !== undefined;
    const trechoVirtual = loja.aceitaDinheiroVirtual
        ? (temPrecoVirtual ? ` · Virtual: CN$ ${item.precoVirtual}` : ` · <span style="color:var(--neon-red)">sem preço virtual</span>`)
        : "";
    li.innerHTML = `
        <div class="entity-main">
            <div class="entity-nome">${escapeHtml(item.nomeCache || "(item sem nome em cache)")}</div>
            <div class="loja-descricao">CN$ ${item.preco}${trechoVirtual} · estoque: ${item.estoque}${item.descricaoLoja ? ` · ${escapeHtml(item.descricaoLoja)}` : ""}</div>
            <div class="loja-edit-form" data-form-item style="display:none;"></div>
            <div class="loja-acoes-mestre">
                <button type="button" class="btn-ghost" data-acao="editar-item">Editar</button>
                <button type="button" class="btn-red" data-acao="remover-item">Remover</button>
            </div>
        </div>`;

    li.querySelector('[data-acao="remover-item"]').addEventListener("click", async () => {
        if (!confirm(`Remover "${item.nomeCache}" da loja "${loja.nome}"?`)) return;
        try { await removerItemDaLoja(loja.id, item.id); }
        catch (e) { toast(e.message || "Não deu pra remover o item."); }
    });

    li.querySelector('[data-acao="editar-item"]').addEventListener("click", () => {
        abrirFormularioEdicaoItem(li, loja, item);
    });

    return li;
}

function abrirFormularioEdicaoItem(li, loja, item) {
    const form = li.querySelector("[data-form-item]");
    if (form.style.display === "block") { form.style.display = "none"; form.innerHTML = ""; return; }

    form.style.display = "block";
    form.innerHTML = `
        <input type="number" min="0" step="0.1" data-campo="preco" value="${item.preco}" placeholder="Preço em dinheiro (CN$)">
        ${loja.aceitaDinheiroVirtual ? `<input type="number" min="0" step="0.1" data-campo="precoVirtual" value="${item.precoVirtual ?? ""}" placeholder="Preço em dinheiro virtual (CN$)">` : ""}
        <input type="number" min="0" step="1" data-campo="estoque" value="${item.estoque}" placeholder="Estoque">
        <input type="text" data-campo="descricaoLoja" value="${escapeHtml(item.descricaoLoja)}" placeholder="Descrição nesta loja (opcional)">
        <div class="loja-acoes-mestre">
            <button type="button" class="btn-lime" data-acao="salvar-item">Salvar</button>
            <button type="button" class="btn-ghost" data-acao="cancelar-item">Cancelar</button>
        </div>`;

    form.querySelector('[data-acao="cancelar-item"]').addEventListener("click", () => {
        form.style.display = "none"; form.innerHTML = "";
    });

    form.querySelector('[data-acao="salvar-item"]').addEventListener("click", async () => {
        const preco = form.querySelector('[data-campo="preco"]').value;
        const inputPrecoVirtual = form.querySelector('[data-campo="precoVirtual"]');
        if (loja.aceitaDinheiroVirtual && (!inputPrecoVirtual || String(inputPrecoVirtual.value).trim() === "")) {
            toast("Essa loja aceita dinheiro virtual — preencha também o preço em dinheiro virtual (ou desmarque \"Aceita dinheiro virtual\" na loja, se este item nunca vai vender por ele).");
            return;
        }
        const estoque = form.querySelector('[data-campo="estoque"]').value;
        const descricaoLoja = form.querySelector('[data-campo="descricaoLoja"]').value;
        const campos = { preco, estoque, descricaoLoja };
        if (inputPrecoVirtual) campos.precoVirtual = inputPrecoVirtual.value;
        try {
            await editarItemDaLoja(loja.id, item.id, campos);
            form.style.display = "none"; form.innerHTML = "";
        } catch (e) {
            toast(e.message || "Não deu pra salvar o item.");
        }
    });
}

// Formulário "+ Adicionar item do Banco" — busca por nome (reaproveita
// estado.itensGlobaisCache, já alimentado por ouvirItensGlobais no
// setup() de ficha.js) e, ao escolher um resultado, pede preço e
// estoque antes de gravar. Mesmo componente visual (.searchable-options
// / .opcao) do "Solicitar dinheiro/item" — ver abas/inventario.js.
function montarFormularioAdicionarItem(loja) {
    const wrap = document.createElement("div");
    wrap.className = "loja-edit-form";
    wrap.innerHTML = `
        <label>+ Adicionar item do Banco Global</label>
        <input type="text" placeholder="Digite pra buscar..." data-campo="busca">
        <div class="searchable-options" data-opcoes style="display:none;"></div>
        <button type="button" class="btn-ghost" data-acao="criar-novo">+ Criar item novo no Banco</button>
        <div class="loja-edit-form" data-form-preco style="display:none;">
            <input type="number" min="0" step="0.1" data-campo="preco" placeholder="Preço em dinheiro (CN$)">
            ${loja.aceitaDinheiroVirtual ? `<input type="number" min="0" step="0.1" data-campo="precoVirtual" placeholder="Preço em dinheiro virtual (CN$)">` : ""}
            <input type="number" min="0" step="1" value="1" data-campo="estoque" placeholder="Estoque">
            <input type="text" data-campo="descricaoLoja" placeholder="Descrição nesta loja (opcional)">
            <div class="loja-acoes-mestre">
                <button type="button" class="btn-lime" data-acao="confirmar-adicionar">Adicionar à loja</button>
                <button type="button" class="btn-ghost" data-acao="cancelar-adicionar">Cancelar</button>
            </div>
        </div>`;

    wrap.querySelector('[data-acao="criar-novo"]').addEventListener("click", () => {
        abrirModalNovo("itensGlobais");
        toast("Crie e salve o item no modal — depois busque o nome dele aqui pra adicionar à loja.");
    });

    const inputBusca = wrap.querySelector('[data-campo="busca"]');
    const opcoes = wrap.querySelector('[data-opcoes]');
    const formPreco = wrap.querySelector('[data-form-preco]');
    let itemEscolhido = null;

    inputBusca.addEventListener("input", () => {
        itemEscolhido = null;
        formPreco.style.display = "none";
        const encontrados = buscarItensGlobaisPorNome(estado.itensGlobaisCache, inputBusca.value);
        opcoes.innerHTML = "";
        if (!encontrados.length) {
            opcoes.style.display = inputBusca.value.trim() ? "block" : "none";
            if (inputBusca.value.trim()) opcoes.innerHTML = `<div class="opcao-vazia">Nenhum item encontrado — clique em "+ Criar item novo no Banco" se ele ainda não existe.</div>`;
            return;
        }
        opcoes.style.display = "block";
        encontrados.forEach(it => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = `${it.nome} — ${rotuloTag(it.tag)}`;
            div.addEventListener("click", () => {
                itemEscolhido = it;
                inputBusca.value = it.nome;
                opcoes.style.display = "none";
                formPreco.style.display = "block";
            });
            opcoes.appendChild(div);
        });
    });

    wrap.querySelector('[data-acao="cancelar-adicionar"]').addEventListener("click", () => {
        itemEscolhido = null;
        inputBusca.value = "";
        opcoes.style.display = "none";
        formPreco.style.display = "none";
    });

    wrap.querySelector('[data-acao="confirmar-adicionar"]').addEventListener("click", async () => {
        if (!itemEscolhido) { toast("Escolha um item da lista antes de adicionar."); return; }
        const preco = formPreco.querySelector('[data-campo="preco"]').value;
        const inputPrecoVirtual = formPreco.querySelector('[data-campo="precoVirtual"]');
        if (loja.aceitaDinheiroVirtual && (!inputPrecoVirtual || String(inputPrecoVirtual.value).trim() === "")) {
            toast("Essa loja aceita dinheiro virtual — preencha também o preço em dinheiro virtual.");
            return;
        }
        const precoVirtual = inputPrecoVirtual ? inputPrecoVirtual.value : null;
        const estoque = formPreco.querySelector('[data-campo="estoque"]').value;
        const descricaoLoja = formPreco.querySelector('[data-campo="descricaoLoja"]').value;
        try {
            await adicionarItemNaLoja(loja.id, {
                itemBancoId: itemEscolhido.id,
                nomeCache: itemEscolhido.nome,
                preco, precoVirtual, estoque, descricaoLoja
            });
            const nomeAdicionado = itemEscolhido.nome;
            itemEscolhido = null;
            inputBusca.value = "";
            formPreco.style.display = "none";
            toast(`"${nomeAdicionado}" adicionado à loja.`);
        } catch (e) {
            toast(e.message || "Não deu pra adicionar o item à loja.");
        }
    });

    return wrap;
}

function abrirFormularioEdicao(li, loja) {
    const form = li.querySelector("[data-form-editar]");
    if (form.style.display === "block") { form.style.display = "none"; form.innerHTML = ""; return; }

    form.style.display = "block";
    form.innerHTML = `
        <input type="text" data-campo="nome" value="${escapeHtml(loja.nome)}" placeholder="Nome da loja">
        <input type="text" data-campo="descricao" value="${escapeHtml(loja.descricao)}" placeholder="Descrição (opcional)">
        <label><input type="checkbox" data-campo="aceitaDinheiroVirtual" ${loja.aceitaDinheiroVirtual ? "checked" : ""}> Aceita dinheiro virtual <span class="hint-inline">deixa cadastrar um preço em dinheiro virtual, além do preço normal, em cada item desta loja</span></label>
        <div class="loja-acoes-mestre">
            <button type="button" class="btn-lime" data-acao="salvar">Salvar</button>
            <button type="button" class="btn-ghost" data-acao="cancelar">Cancelar</button>
        </div>`;

    form.querySelector('[data-acao="cancelar"]').addEventListener("click", () => {
        form.style.display = "none"; form.innerHTML = "";
    });

    form.querySelector('[data-acao="salvar"]').addEventListener("click", async () => {
        const nome = form.querySelector('[data-campo="nome"]').value;
        const descricao = form.querySelector('[data-campo="descricao"]').value;
        const aceitaDinheiroVirtual = form.querySelector('[data-campo="aceitaDinheiroVirtual"]').checked;
        try {
            await editarLoja(loja.id, { nome, descricao, aceitaDinheiroVirtual });
            form.style.display = "none"; form.innerHTML = "";
        } catch (e) {
            toast(e.message || "Não deu pra salvar a loja.");
        }
    });
}
