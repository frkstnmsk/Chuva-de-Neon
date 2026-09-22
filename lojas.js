// =====================================================================
// CHUVA DE NEON — Lojas (camada de dados)
// =====================================================================
// O Mestre cadastra lojas e os itens que cada uma vende (preço e
// estoque). O jogador compra pela sub-aba "Lojas" (aba Jogo). Este
// módulo NÃO tem tela: só guarda/lê as lojas no Firebase e oferece
// funções puras de cálculo/validação pra as telas usarem depois.
//
// Cada mesa tem suas próprias lojas (igual fichas, calendário, npcs):
//
// mesas/{mesaId}/lojas: {
//   "<lojaId>": {
//     nome: "Mercado do Zé",
//     descricao: "Vende de tudo um pouco, sem perguntas.",
//     visivel: true,              // false = só o Mestre vê
//     aceitaDinheiroVirtual: false, // true = itens PODEM ter um 2º preço
//                                    // (precoVirtual) pra pagar com saldo
//                                    // de dinheiro virtual — ver abaixo
//     criadaEm: 1730000000000,
//     itens: {
//       "<itemLojaId>": {
//         itemBancoId: "-Nabc123",  // id em itensGlobais (o "molde")
//         nomeCache: "Pistola 1911",// pra listar sem buscar o Banco
//         preco: 350,               // CN$ por unidade, em dinheiro normal
//         precoVirtual: 400,        // opcional — CN$ por unidade, em
//                                    // dinheiro virtual (ver abaixo).
//                                    // Ausente/null = item não vende por
//                                    // dinheiro virtual, mesmo que a
//                                    // loja aceite.
//         estoque: 4,               // unidades que a loja tem
//         descricaoLoja: "",        // texto opcional só desta loja
//         criadoEm: 1730000000000
//       }
//     }
//   }
// }
//
// Dinheiro normal x dinheiro virtual: o jogo NÃO calcula conversão
// nenhuma entre os dois — o Mestre define os dois preços à mão (o
// "câmbio" de cada loja é dele, pode ter ágio, desconto, mercado
// negro etc.). Loja com aceitaDinheiroVirtual:true deixa o Mestre
// preencher, por item, um preco (dinheiro normal) E um precoVirtual
// (dinheiro virtual) — a tela do jogador então oferece "Pagar com
// Dinheiro" ou "Pagar com Dinheiro Virtual" e, dependendo da escolha,
// só lista os saldos daquele grupo (ver saldoIdEhVirtual em
// dados-manual.js e formaPagamento em validarCompra/efetivarCompra
// abaixo). "Dinheiro virtual" aqui é sempre notas/moedas de uma
// carteira digital (Eletrônico com ehSaldo, ver todosOsSaldos); saldo
// fixo/customizado da ficha e dinheiro físico de item contam como
// "dinheiro normal".
//
// O item da loja só APONTA pro Banco Global de Itens (itensGlobais,
// ver itens-globais.js): quem comprar recebe uma cópia do molde
// atual do Banco, não uma foto tirada na hora do cadastro.
//
// O ouvirLojas() devolve as lojas já "achatadas" pra facilitar a tela:
// `itens` vira um array (cada um com seu `id`) em vez de um objeto,
// porque o Firebase omite objetos vazios (loja sem itens não tem o
// nó `itens`) e a tela sempre espera uma lista.
//
// Etapa 6 (ver planejamento-lojas.txt): efetivarCompra() baixa o
// estoque de forma atômica (runTransaction, mesmo padrão de
// consumirAcao em combate.js — evita dois jogadores levarem a última
// unidade ao mesmo tempo) e debita o saldo escolhido, revalidando os
// dois com o valor mais FRESCO do Firebase (não confia no que a tela
// calculou antes de chamar). Se o débito falhar, devolve o estoque já
// baixado (rollback) — nunca fica estoque baixado sem cobrar. IMPORTANTE:
// o item ainda NÃO entra no inventário aqui — isso é a Etapa 7; a tela
// (abas/lojas.js) mostra um aviso de "modo de teste" antes de chamar.
// =====================================================================

import { db } from "./firebase-config.js?v=20260916-bfcachefix";
import { ref, set, get, update, remove, push, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";
import { arredondarMoeda, ehIdSaldoDeItem, idItemDoSaldo, campoSaldoDoItem, saldoIdEhVirtual } from "./dados-manual.js";

// ---------------------------------------------------------------------
// Caminhos
// ---------------------------------------------------------------------
function caminhoLojas() { return caminhoMesa("lojas"); }
function caminhoLoja(lojaId) { return `${caminhoLojas()}/${lojaId}`; }
function caminhoItensDaLoja(lojaId) { return `${caminhoLoja(lojaId)}/itens`; }
function caminhoItemDaLoja(lojaId, itemLojaId) { return `${caminhoItensDaLoja(lojaId)}/${itemLojaId}`; }

// ---------------------------------------------------------------------
// Normalização (Firebase -> formato que a tela usa)
// ---------------------------------------------------------------------
function normalizarItemDaLoja(id, bruto) {
    return {
        id,
        itemBancoId: bruto.itemBancoId || "",
        nomeCache: bruto.nomeCache || "",
        preco: arredondarMoeda(bruto.preco),
        // null = item não tem preço em dinheiro virtual definido (não
        // pode ser comprado com essa forma de pagamento, mesmo numa
        // loja que aceita dinheiro virtual).
        precoVirtual: (bruto.precoVirtual === null || bruto.precoVirtual === undefined) ? null : arredondarMoeda(bruto.precoVirtual),
        estoque: Math.max(0, Math.floor(Number(bruto.estoque) || 0)),
        descricaoLoja: bruto.descricaoLoja || "",
        criadoEm: Number(bruto.criadoEm) || 0
    };
}

function normalizarLoja(id, bruta) {
    const itensBrutos = bruta.itens || {};
    const itens = Object.entries(itensBrutos)
        .map(([itemId, it]) => normalizarItemDaLoja(itemId, it))
        .sort((a, b) => a.criadoEm - b.criadoEm);
    return {
        id,
        nome: bruta.nome || "",
        descricao: bruta.descricao || "",
        // Só `false` esconde: loja antiga sem o campo continua visível.
        visivel: bruta.visivel !== false,
        aceitaDinheiroVirtual: bruta.aceitaDinheiroVirtual === true,
        criadaEm: Number(bruta.criadaEm) || 0,
        itens
    };
}

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

// Escuta todas as lojas da mesa em tempo real. Devolve a função que
// cancela a escuta (mesmo padrão do onValue). callback recebe um array
// de lojas ordenado pela data de criação.
export function ouvirLojas(callback) {
    return onValue(
        ref(db, caminhoLojas()),
        (snap) => {
            if (!snap.exists()) { callback([]); return; }
            const lojas = Object.entries(snap.val())
                .map(([id, bruta]) => normalizarLoja(id, bruta))
                .sort((a, b) => a.criadaEm - b.criadaEm);
            callback(lojas);
        },
        (erro) => console.error("Erro ao ouvir lojas:", erro)
    );
}

// Leitura única de uma loja (ou null se não existir).
export async function buscarLojaPorId(lojaId) {
    const snap = await get(ref(db, caminhoLoja(lojaId)));
    return snap.exists() ? normalizarLoja(lojaId, snap.val()) : null;
}

// ---------------------------------------------------------------------
// Escrita — lojas
// ---------------------------------------------------------------------
function textoObrigatorio(valor, rotulo) {
    const texto = String(valor ?? "").trim();
    if (!texto) throw new Error(`${rotulo} é obrigatório.`);
    return texto;
}

// Cria uma loja nova. Devolve o id gerado.
export async function criarLoja({ nome, descricao = "", visivel = true, aceitaDinheiroVirtual = false }) {
    const nova = push(ref(db, caminhoLojas()));
    await set(nova, {
        nome: textoObrigatorio(nome, "O nome da loja"),
        descricao: String(descricao || "").trim(),
        visivel: visivel !== false,
        aceitaDinheiroVirtual: aceitaDinheiroVirtual === true,
        criadaEm: Date.now()
    });
    return nova.key;
}

// Edita só os campos permitidos (nome, descricao, visivel,
// aceitaDinheiroVirtual); o resto (itens, criadaEm) nunca é mexido por
// aqui. Desligar aceitaDinheiroVirtual NÃO apaga o precoVirtual já
// gravado nos itens — só deixa de valer enquanto a loja estiver
// desmarcada (ver validarCompra/efetivarCompra).
export async function editarLoja(lojaId, campos) {
    const alteracoes = {};
    if ("nome" in campos) alteracoes.nome = textoObrigatorio(campos.nome, "O nome da loja");
    if ("descricao" in campos) alteracoes.descricao = String(campos.descricao || "").trim();
    if ("visivel" in campos) alteracoes.visivel = campos.visivel !== false;
    if ("aceitaDinheiroVirtual" in campos) alteracoes.aceitaDinheiroVirtual = campos.aceitaDinheiroVirtual === true;
    if (!Object.keys(alteracoes).length) return;
    await update(ref(db, caminhoLoja(lojaId)), alteracoes);
}

// Exclui a loja e todos os itens dela.
export async function excluirLoja(lojaId) {
    await remove(ref(db, caminhoLoja(lojaId)));
}

// ---------------------------------------------------------------------
// Escrita — itens da loja
// ---------------------------------------------------------------------
function lerPreco(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0) throw new Error("O preço precisa ser um número maior ou igual a zero.");
    return arredondarMoeda(n);
}

// Igual lerPreco, mas vazio/null/undefined é válido e vira `null`
// (campo não gravado / removido) — usado só no precoVirtual, que é
// opcional mesmo numa loja que aceita dinheiro virtual.
function lerPrecoOpcional(valor) {
    if (valor === null || valor === undefined || String(valor).trim() === "") return null;
    return lerPreco(valor);
}

function lerEstoque(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        throw new Error("O estoque precisa ser um número inteiro maior ou igual a zero.");
    }
    return n;
}

// Adiciona à loja um item que já existe no Banco Global (itemBancoId).
// Devolve o id do item dentro da loja. (Criar um item novo no Banco na
// hora é outra etapa: salva primeiro no Banco e chama esta função com o
// id gerado.)
// precoVirtual é opcional (null = item não vende por dinheiro
// virtual). Só é gravado quando informado, pra não poluir itens de
// lojas que nunca vão usar dinheiro virtual.
export async function adicionarItemNaLoja(lojaId, { itemBancoId, nomeCache = "", preco, precoVirtual = null, estoque, descricaoLoja = "" }) {
    const novo = push(ref(db, caminhoItensDaLoja(lojaId)));
    const dados = {
        itemBancoId: textoObrigatorio(itemBancoId, "O item do Banco"),
        nomeCache: String(nomeCache || "").trim(),
        preco: lerPreco(preco),
        estoque: lerEstoque(estoque),
        descricaoLoja: String(descricaoLoja || "").trim(),
        criadoEm: Date.now()
    };
    const pv = lerPrecoOpcional(precoVirtual);
    if (pv !== null) dados.precoVirtual = pv;
    await set(novo, dados);
    return novo.key;
}

// Edita preço, precoVirtual, estoque, descrição da loja ou nome em
// cache. O item do Banco a que ele aponta não muda (pra trocar,
// remova e adicione outro). Passar precoVirtual vazio/null REMOVE o
// preço virtual do item (volta a não vender por dinheiro virtual).
export async function editarItemDaLoja(lojaId, itemLojaId, campos) {
    const alteracoes = {};
    if ("preco" in campos) alteracoes.preco = lerPreco(campos.preco);
    if ("precoVirtual" in campos) alteracoes.precoVirtual = lerPrecoOpcional(campos.precoVirtual);
    if ("estoque" in campos) alteracoes.estoque = lerEstoque(campos.estoque);
    if ("descricaoLoja" in campos) alteracoes.descricaoLoja = String(campos.descricaoLoja || "").trim();
    if ("nomeCache" in campos) alteracoes.nomeCache = String(campos.nomeCache || "").trim();
    if (!Object.keys(alteracoes).length) return;
    await update(ref(db, caminhoItemDaLoja(lojaId, itemLojaId)), alteracoes);
}

export async function removerItemDaLoja(lojaId, itemLojaId) {
    await remove(ref(db, caminhoItemDaLoja(lojaId, itemLojaId)));
}

// ---------------------------------------------------------------------
// Funções puras (sem Firebase) — usadas pela tela e pela compra
// ---------------------------------------------------------------------

// A tela do jogador só lista lojas visíveis; o Mestre vê todas.
export function lojaVisivelParaJogador(loja) {
    return !!loja && loja.visivel !== false;
}

export function itemEsgotado(item) {
    return !item || (Number(item.estoque) || 0) <= 0;
}

// Total em CN$ de `quantidade` unidades, arredondado como o resto do
// jogo (1 casa decimal — ver arredondarMoeda). Quantidade inválida
// (não inteira ou < 1) dá total 0.
export function calcularTotal(preco, quantidade) {
    const qtd = Number(quantidade);
    if (!Number.isInteger(qtd) || qtd < 1) return 0;
    return arredondarMoeda((Number(preco) || 0) * qtd);
}

// Confere se a compra pode acontecer, SEM gravar nada. Devolve
// { ok, codigo, motivo, total }. `codigo` serve pra tela decidir o que
// destacar; `motivo` é a frase pronta pra mostrar.
// saldoDisponivel = valor do saldo escolhido em CN$ (omita ou passe
// null enquanto o jogador ainda não escolheu de onde paga: aí só
// estoque e quantidade são conferidos).
// { ehMestre: true } deixa comprar de loja oculta (teste do Mestre).
// { formaPagamento: "dinheiro" | "virtual" } decide qual preço do item
// vale (preco ou precoVirtual) — "virtual" só é aceito se a loja tiver
// aceitaDinheiroVirtual E o item tiver precoVirtual definido; qualquer
// outro caso falha com um código específico pra tela explicar.
export function validarCompra(loja, item, quantidade, saldoDisponivel = null, { ehMestre = false, formaPagamento = "dinheiro" } = {}) {
    const falha = (codigo, motivo) => ({ ok: false, codigo, motivo, total: 0 });

    if (!loja) return falha("loja_inexistente", "Essa loja não existe mais.");
    if (!ehMestre && !lojaVisivelParaJogador(loja)) return falha("loja_oculta", "Essa loja não está disponível.");
    if (!item) return falha("item_inexistente", "Esse item não está mais à venda.");

    if (formaPagamento === "virtual") {
        if (!loja.aceitaDinheiroVirtual) return falha("loja_nao_aceita_virtual", "Essa loja não aceita dinheiro virtual.");
        if (item.precoVirtual === null || item.precoVirtual === undefined) return falha("sem_preco_virtual", "Esse item não tem preço em dinheiro virtual.");
    }

    const qtd = Number(quantidade);
    if (!Number.isInteger(qtd) || qtd < 1) return falha("quantidade_invalida", "Escolha uma quantidade inteira de pelo menos 1.");

    const estoque = Number(item.estoque) || 0;
    if (estoque <= 0) return falha("esgotado", "Item esgotado.");
    if (qtd > estoque) return falha("sem_estoque", `A loja só tem ${estoque} unidade(s) desse item.`);

    const precoUnitario = formaPagamento === "virtual" ? item.precoVirtual : item.preco;
    const total = calcularTotal(precoUnitario, qtd);
    if (saldoDisponivel !== null && saldoDisponivel !== undefined) {
        const saldo = arredondarMoeda(saldoDisponivel);
        if (saldo < total) return { ok: false, codigo: "saldo_insuficiente", motivo: "Saldo insuficiente no saldo escolhido.", total };
    }
    return { ok: true, codigo: null, motivo: "", total };
}

// ---------------------------------------------------------------------
// Efetivar a compra (Etapa 6) — cobra e baixa o estoque de verdade.
// ---------------------------------------------------------------------

// Baixa `quantidade` unidades do estoque de forma atômica. Devolve
// true se conseguiu (a transação "comprometeu"), false se abortou —
// item sumiu da loja ou não tinha mais estoque suficiente (outro
// jogador levou antes).
async function baixarEstoqueTransacional(lojaId, itemLojaId, quantidade) {
    const caminho = ref(db, `${caminhoItemDaLoja(lojaId, itemLojaId)}/estoque`);
    const resultado = await runTransaction(caminho, (estoqueAtual) => {
        if (estoqueAtual === null || estoqueAtual === undefined) return; // item não existe mais -> aborta
        const atual = Math.floor(Number(estoqueAtual)) || 0;
        if (atual < quantidade) return; // sem estoque suficiente -> aborta
        return atual - quantidade;
    });
    return resultado.committed;
}

// Rollback do estoque, também transacional (protege contra o Mestre
// ter mexido no estoque por fora enquanto o pagamento acontecia). Se o
// item foi removido da loja nesse meio tempo, não tem onde devolver —
// só loga (a compra já falhou de qualquer forma, nada foi cobrado).
async function devolverEstoqueTransacional(lojaId, itemLojaId, quantidade) {
    const caminho = ref(db, `${caminhoItemDaLoja(lojaId, itemLojaId)}/estoque`);
    const resultado = await runTransaction(caminho, (estoqueAtual) => {
        if (estoqueAtual === null || estoqueAtual === undefined) return; // nada a devolver
        return (Math.floor(Number(estoqueAtual)) || 0) + quantidade;
    });
    if (!resultado.committed) {
        console.error(`Lojas: não foi possível devolver ${quantidade} unidade(s) ao estoque de ${lojaId}/${itemLojaId} — o item pode ter sido excluído da loja durante a compra.`);
    }
}

// Caminho + nome do campo onde o VALOR de um saldo está gravado — saldo
// normal (fichas/{id}/saldos/{saldoId}/valor) ou a carteira digital/
// dinheiro físico de um item (fichas/{id}/inventario/{itemId}/<campo>,
// ver ehIdSaldoDeItem/campoSaldoDoItem em dados-manual.js). `caminhoFicha`
// é sempre a própria ficha de quem compra (a compra dispensa a fila de
// aprovação do Mestre — regra 5 do plano), passado pela tela via
// caminhoBase() (ficha.js).
function localizarSaldo(caminhoFicha, saldoId) {
    if (ehIdSaldoDeItem(saldoId)) {
        const itemId = idItemDoSaldo(saldoId);
        const campo = campoSaldoDoItem(saldoId);
        return { caminhoNo: `${caminhoFicha}/inventario/${itemId}`, campo };
    }
    return { caminhoNo: `${caminhoFicha}/saldos/${saldoId}`, campo: "valor" };
}

async function lerSaldoAtual(caminhoFicha, saldoId) {
    const { caminhoNo, campo } = localizarSaldo(caminhoFicha, saldoId);
    const snap = await get(ref(db, `${caminhoNo}/${campo}`));
    return snap.exists() && snap.val() !== null ? arredondarMoeda(snap.val()) : 0;
}

async function debitarSaldo(caminhoFicha, saldoId, valor) {
    const { caminhoNo, campo } = localizarSaldo(caminhoFicha, saldoId);
    const atual = await lerSaldoAtual(caminhoFicha, saldoId);
    await update(ref(db, caminhoNo), { [campo]: arredondarMoeda(atual - valor) });
}

// Efetiva a compra: baixa o estoque (transacional) e debita o saldo
// escolhido — revalidando os dois com dados FRESCOS do Firebase, nunca
// confiando no que a tela calculou antes (outro jogador pode ter
// comprado no meio tempo, ou o Mestre pode ter mudado preço/estoque/
// saldo). Se o débito falhar, devolve o estoque já baixado (rollback).
//
// IMPORTANTE (ver Etapa 7 no plano): esta função só cobra e baixa
// estoque — o item ainda NÃO entra no inventário. `caminhoFicha` é o
// prefixo da ficha de quem compra (ex.: caminhoBase() de ficha.js).
// `formaPagamento` ("dinheiro" ou "virtual") decide o preço (preco ou
// precoVirtual) e é revalidada aqui com dados FRESCOS da loja — nunca
// confia no que a tela já tinha calculado. Também confere que o saldo
// escolhido (saldoId) é do grupo certo pra forma de pagamento
// (saldoIdEhVirtual) — evita pagar preço de dinheiro virtual com saldo
// normal ou vice-versa, mesmo que a tela tenha um bug ou o pedido
// venha adulterado. Devolve { ok, codigo, motivo, total }.
export async function efetivarCompra({ lojaId, itemLojaId, quantidade, saldoId, caminhoFicha, formaPagamento = "dinheiro" }) {
    const falha = (codigo, motivo) => ({ ok: false, codigo, motivo, total: 0 });

    const loja = await buscarLojaPorId(lojaId);
    if (!loja) return falha("loja_inexistente", "Essa loja não existe mais.");
    const item = (loja.itens || []).find(i => i.id === itemLojaId);
    if (!item) return falha("item_inexistente", "Esse item não está mais à venda.");

    const qtd = Number(quantidade);
    if (!Number.isInteger(qtd) || qtd < 1) return falha("quantidade_invalida", "Escolha uma quantidade inteira de pelo menos 1.");
    if (!saldoId) return falha("sem_saldo_escolhido", "Escolha de onde vai sair o pagamento.");

    if (formaPagamento === "virtual") {
        if (!loja.aceitaDinheiroVirtual) return falha("loja_nao_aceita_virtual", "Essa loja não aceita dinheiro virtual.");
        if (item.precoVirtual === null || item.precoVirtual === undefined) return falha("sem_preco_virtual", "Esse item não tem preço em dinheiro virtual.");
        if (!saldoIdEhVirtual(saldoId)) return falha("saldo_incompativel", "Escolha um saldo de dinheiro virtual pra pagar em dinheiro virtual.");
    } else if (saldoIdEhVirtual(saldoId)) {
        return falha("saldo_incompativel", "Escolha um saldo de dinheiro normal pra pagar em dinheiro.");
    }

    const precoUnitario = formaPagamento === "virtual" ? item.precoVirtual : item.preco;
    const total = calcularTotal(precoUnitario, qtd);

    // 1) O estoque é o recurso disputado entre jogadores — baixa
    // primeiro, de forma atômica.
    const conseguiuEstoque = await baixarEstoqueTransacional(lojaId, itemLojaId, qtd);
    if (!conseguiuEstoque) {
        return falha("sem_estoque", "Não tinha mais estoque suficiente — alguém deve ter comprado antes de você.");
    }

    // 2) Confere o saldo com o valor mais recente e debita. Qualquer
    // problema aqui devolve o estoque já baixado no passo 1.
    try {
        const saldoAtual = await lerSaldoAtual(caminhoFicha, saldoId);
        if (saldoAtual < total) {
            await devolverEstoqueTransacional(lojaId, itemLojaId, qtd);
            return falha("saldo_insuficiente", "Saldo insuficiente no saldo escolhido.");
        }
        await debitarSaldo(caminhoFicha, saldoId, total);
    } catch (erro) {
        await devolverEstoqueTransacional(lojaId, itemLojaId, qtd);
        throw erro;
    }

    return { ok: true, codigo: null, motivo: "", total };
}
