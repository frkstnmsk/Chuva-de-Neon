// abas/financas.js
// ---------------------------------------------------------------------
// Aba Finanças — saldos, ganho fixo, gastar dinheiro, transformar em
// item, mover dinheiro entre saldos.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt).
// ---------------------------------------------------------------------

import { ref, update, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { db } from "../firebase-config.js?v=20260916-bfcachefix";
import { estado } from "../estado.js";
import { el, toast, caminhoBase, agendarSalvamento, escapeHtml, cenarioAtualDoPersonagem } from "../ficha.js?v=20260830-npcnivelpv";
import { arredondarMoeda, ehIdSaldoDeItem, idItemDoSaldo, campoSaldoDoItem, todosOsSaldos, saldoIdEhVirtual } from "../dados-manual.js";
import { criarAcaoPendente } from "../mestre.js";
import { caminhoMesa } from "../mesa.js";

export function renderizarFinancas() {
    el.financasSaldoHint.innerText = estado.isMestre
        ? "você pode editar os saldos diretamente acima"
        : "apenas o Mestre pode editar os saldos — use \"Gastar dinheiro\" abaixo pra remover";
    el.financasGastarBloco.style.display = estado.isMestre ? "none" : "block";
    el.financasMoverBloco.style.display = estado.isMestre ? "none" : "block";
    el.financasSolicitarBloco.style.display = estado.isMestre ? "none" : "block";
    el.financasDarBloco.style.display = estado.isMestre ? "none" : "block";
    el.financasDeixarCenarioBloco.style.display = estado.isMestre ? "none" : "block";

    renderizarSaldos();
    renderizarOpcoesOrigemGasto();
    renderizarOpcoesMoverDinheiro();
    renderizarOpcoesSolicitarDinheiro();
    renderizarOpcoesDarDinheiro();
    renderizarOpcoesDeixarDinheiroCenario();
    renderizarPedidosDarDinheiroVirtual();

    if (document.activeElement !== el.financasGanhoFixo) {
        el.financasGanhoFixo.value = estado.fichaAtual.dados.ganhoFixo ?? 0;
    }
    el.financasGanhoFixo.disabled = !estado.isMestre;
    el.financasGanhoFixoSalvar.style.display = estado.isMestre ? "inline-block" : "none";
}

// Desenha um campo numérico por saldo (fixo ou customizado). Só o
// Mestre pode digitar direto aqui — jogador só vê o valor e usa
// "Gastar dinheiro" (que vira pedido de aprovação).
export function renderizarSaldos() {
    const saldos = todosOsSaldos(estado.fichaAtual);
    el.financasSaldosGrid.innerHTML = "";
    saldos.forEach((s) => {
        const domId = s.id.replace(/[^a-zA-Z0-9_-]/g, "_");
        const campo = document.createElement("div");
        campo.className = "campo";
        // Só saldo customizado (fixo:false) e que não é a carteira embutida
        // de um item (deItem — esse aí some junto com o item, não tem
        // exclusão própria) ganha o botão de excluir. Os 3 saldos padrão
        // de toda ficha nova (Dinheiro sujo em casa/limpo na conta/No
        // bolso) são fixo:true e continuam intocáveis.
        const podeExcluir = !s.fixo && !s.deItem;
        campo.innerHTML = `
            <label for="saldo-${domId}">${escapeHtml(s.nome)}</label>
            <div class="saldo-campo-linha">
                <input type="number" id="saldo-${domId}" data-saldo-id="${s.id}">
                ${podeExcluir ? `<button type="button" class="btn-saldo-excluir" data-saldo-excluir-id="${s.id}" data-saldo-excluir-nome="${escapeHtml(s.nome)}" title="Excluir saldo \\"${escapeHtml(s.nome)}\\"">×</button>` : ""}
            </div>
        `;
        const input = campo.querySelector("input");
        if (document.activeElement !== input) input.value = arredondarMoeda(s.valor) ?? 0;
        input.disabled = !estado.isMestre;
        el.financasSaldosGrid.appendChild(campo);
    });
    el.financasSaldosGrid.querySelectorAll(".btn-saldo-excluir").forEach(btn => {
        btn.addEventListener("click", () => excluirSaldoCustomizado(btn.dataset.saldoExcluirId, btn.dataset.saldoExcluirNome));
    });
}

// Exclui um saldo customizado (criado via "+ Novo saldo") — nunca os 3
// fixos da ficha nem os embutidos em item (esses são removidos junto
// com o item, não por aqui — ver podeExcluir em renderizarSaldos).
// Trava a exclusão se ainda sobrar valor nele, pra dinheiro não
// simplesmente desaparecer — pede pra zerar (gastar/mover pra outro
// saldo) antes.
async function excluirSaldoCustomizado(saldoId, saldoNome) {
    if (!estado.fichaAtual || !estado.fichaAtualId || !saldoId) return;
    const saldo = todosOsSaldos(estado.fichaAtual).find(s => s.id === saldoId);
    if (!saldo || saldo.fixo || saldo.deItem) return;
    if (Number(saldo.valor) || 0) {
        toast(`Zere o saldo "${saldoNome}" (gaste ou mova o dinheiro pra outro saldo) antes de excluí-lo.`, "erro");
        return;
    }
    if (!confirm(`Excluir o saldo "${saldoNome}"? Essa ação não pode ser desfeita.`)) return;
    if (!estado.fichaAtual.saldos || !estado.fichaAtual.saldos[saldoId]) return;
    delete estado.fichaAtual.saldos[saldoId];
    await remove(ref(db, `${caminhoBase()}/saldos/${saldoId}`));
    toast(`Saldo "${saldoNome}" excluído.`);
    renderizarFinancas();
}

// Popula o dropdown "de onde sai" (gastar dinheiro) com os saldos
// atuais da ficha, preservando a escolha atual quando possível.
export function renderizarOpcoesOrigemGasto() {
    const saldos = todosOsSaldos(estado.fichaAtual);
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

// Popula o dropdown "pra qual saldo" de "Solicitar dinheiro" com os
// saldos atuais da ficha — mesma ideia de renderizarOpcoesOrigemGasto,
// só que pro fluxo inverso (pedir crédito em vez de gasto).
export function renderizarOpcoesSolicitarDinheiro() {
    const saldos = todosOsSaldos(estado.fichaAtual);
    const escolhaAnterior = el.financasSolicitarDestino.value;
    el.financasSolicitarDestino.innerHTML = "";
    saldos.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.nome;
        el.financasSolicitarDestino.appendChild(opt);
    });
    if (saldos.some(s => s.id === escolhaAnterior)) el.financasSolicitarDestino.value = escolhaAnterior;
}

// Popula os dois dropdowns ("De" / "Para") de "Mover dinheiro entre
// saldos" com os saldos atuais da ficha, preservando a escolha atual de
// cada um quando possível — mesma ideia de renderizarOpcoesOrigemGasto
// acima, só que duplicada pros dois lados da movimentação.
export function renderizarOpcoesMoverDinheiro() {
    const saldos = todosOsSaldos(estado.fichaAtual);
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

// Popula "Dar dinheiro a outro personagem": origem é sempre um saldo
// PRÓPRIO (mesma lista de todosOsSaldos usada em Gastar/Mover); destino
// é outra ficha ativa na mesa (mesma fonte que abrirModalDarItem usa
// pro "Dar item" comum — estado.todasAsFichasCache). O saldo que
// recebe do outro lado é sempre o fixo "No bolso" (ver "bolso" em
// normalizacao.js — todo personagem tem, então não precisa nem existe
// escolha do lado de quem recebe), pra não exigir que o jogador que dá
// conheça os saldos internos de quem recebe.
export function renderizarOpcoesDarDinheiro() {
    const saldos = todosOsSaldos(estado.fichaAtual);
    const escolhaAnteriorOrigem = el.financasDarOrigem.value;
    el.financasDarOrigem.innerHTML = "";
    saldos.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.nome;
        el.financasDarOrigem.appendChild(opt);
    });
    if (saldos.some(s => s.id === escolhaAnteriorOrigem)) el.financasDarOrigem.value = escolhaAnteriorOrigem;

    const outrasFichas = Object.entries(estado.todasAsFichasCache || {}).filter(([id]) => id !== estado.fichaAtualId);
    const escolhaAnteriorDestino = el.financasDarDestinoFicha.value;
    el.financasDarDestinoFicha.innerHTML = "";
    outrasFichas.forEach(([id, f]) => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.innerText = (f.config && f.config.nomeExibicao) || id;
        el.financasDarDestinoFicha.appendChild(opt);
    });
    if (outrasFichas.some(([id]) => id === escolhaAnteriorDestino)) el.financasDarDestinoFicha.value = escolhaAnteriorDestino;
}

// Popula o dropdown "de onde sai" de "Deixar dinheiro no cenário" com os
// saldos atuais da ficha — mesma ideia de renderizarOpcoesDarDinheiro,
// só que o destino não é outra ficha e sim o cenário em que o
// personagem está agora (cenarioAtualDoPersonagem, ficha.js). Sem
// cenário ativo no momento, esconde os campos e mostra só o aviso.
export function renderizarOpcoesDeixarDinheiroCenario() {
    if (!el.financasDeixarCenarioCampos) return;
    const cenario = cenarioAtualDoPersonagem();
    el.financasDeixarCenarioCampos.style.display = cenario ? "grid" : "none";
    el.financasDeixarCenarioBtn.style.display = cenario ? "inline-block" : "none";
    el.financasDeixarCenarioHint.style.display = cenario ? "none" : "block";
    if (!cenario) return;

    const saldos = todosOsSaldos(estado.fichaAtual);
    const escolhaAnterior = el.financasDeixarCenarioOrigem.value;
    el.financasDeixarCenarioOrigem.innerHTML = "";
    saldos.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.nome;
        el.financasDeixarCenarioOrigem.appendChild(opt);
    });
    if (saldos.some(s => s.id === escolhaAnterior)) el.financasDeixarCenarioOrigem.value = escolhaAnterior;
}

// "dar_dinheiro" com origem em dinheiro VIRTUAL (notas/moedas de
// carteira digital — ver saldoIdEhVirtual em dados-manual.js) não cai
// sozinho em lugar nenhum: quem recebe pode ter mais de uma carteira
// digital (ou nenhuma). Em vez do Mestre escolher por ele, ou de cair
// automaticamente num saldo genérico, esta caixa aparece pra quem VAI
// RECEBER o dinheiro (payload.fichaDestinoId === esta ficha) — ele
// escolhe em qual dos PRÓPRIOS saldos quer o valor, e essa escolha é
// gravada direto em payload.saldoDestinoId da ação pendente (grava sem
// passar por criarAcaoPendente de novo — é a MESMA pendência, só
// completando um dado que faltava nela). Só depois disso o pedido
// aparece liberado pro Mestre confirmar (ver ehDarDinheiroVirtualSemEscolha
// em mestre/acoes-pendentes.js, que trava o Confirmar até aqui).
// Dinheiro físico nunca aparece aqui — cai direto no "bolso", sem
// escolha nenhuma (ver dar_dinheiro em mestre.js).
export function renderizarPedidosDarDinheiroVirtual() {
    if (!el.financasDarDinheiroPendentes) return;
    if (!estado.fichaAtualId || estado.isMestre) {
        el.financasDarDinheiroPendentes.style.display = "none";
        el.financasDarDinheiroPendentes.innerHTML = "";
        return;
    }
    const pendentes = (estado.pendentesCache || []).filter(acao => (
        acao.tipo === "dar_dinheiro"
        && acao.payload
        && acao.payload.fichaDestinoId === estado.fichaAtualId
        && saldoIdEhVirtual(acao.payload.saldoOrigemId)
        && !acao.payload.saldoDestinoId
    ));
    if (!pendentes.length) {
        el.financasDarDinheiroPendentes.style.display = "none";
        el.financasDarDinheiroPendentes.innerHTML = "";
        return;
    }
    el.financasDarDinheiroPendentes.style.display = "block";
    el.financasDarDinheiroPendentes.innerHTML = "";
    const titulo = document.createElement("div");
    titulo.className = "section-header";
    titulo.innerText = "Dinheiro virtual esperando sua escolha";
    el.financasDarDinheiroPendentes.appendChild(titulo);
    const saldosProprios = todosOsSaldos(estado.fichaAtual);
    pendentes.forEach(acao => {
        const bloco = document.createElement("div");
        bloco.className = "campo";
        bloco.style.marginBottom = "10px";
        const texto = document.createElement("p");
        texto.className = "hint";
        texto.innerText = `${acao.nomeJogador} quer te dar CN$ ${acao.payload.valor} em dinheiro virtual. Em qual carteira você quer receber?`;
        const select = document.createElement("select");
        select.innerHTML = '<option value="">-- escolha o saldo --</option>' +
            saldosProprios.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nome)}</option>`).join("");
        const btn = document.createElement("button");
        btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Confirmar recebimento";
        btn.addEventListener("click", async () => {
            if (!select.value) { toast("Escolha em qual carteira você quer receber.", "erro"); return; }
            await update(ref(db, caminhoMesa(`acoesPendentes/${acao.id}/payload`)), { saldoDestinoId: select.value });
            toast("Escolha registrada — agora é só esperar o Mestre confirmar.");
        });
        bloco.append(texto, select, btn);
        el.financasDarDinheiroPendentes.appendChild(bloco);
    });
}

export function configurarFinancas() {
    // Edição direta de saldo — só o Mestre (delegado, igual aos
    // atributos primários).
    document.addEventListener("input", (e) => {
        const saldoId = e.target.dataset && e.target.dataset.saldoId;
        if (!saldoId || !estado.fichaAtualId || !estado.isMestre) return;
        const valor = arredondarMoeda(Number(e.target.value) || 0);
        if (ehIdSaldoDeItem(saldoId)) {
            const itemId = idItemDoSaldo(saldoId);
            const campo = campoSaldoDoItem(saldoId);
            if (!estado.fichaAtual.inventario || !estado.fichaAtual.inventario[itemId]) return;
            estado.fichaAtual.inventario[itemId][campo] = valor;
            agendarSalvamento(`inventario/${itemId}/${campo}`, valor);
            return;
        }
        if (!estado.fichaAtual.saldos || !estado.fichaAtual.saldos[saldoId]) return;
        estado.fichaAtual.saldos[saldoId].valor = valor;
        agendarSalvamento(`saldos/${saldoId}/valor`, valor);
    });

    // Criar novo saldo — carteira/local personalizado. Disponível pro
    // jogador (e pro Mestre); respeita as mesmas regras de aprovação
    // pra retirada, por ser um saldo igual aos demais.
    el.btnAddSaldo.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId) return;
        const nome = (prompt("Nome do novo saldo (ex: Cofre do esconderijo, Debaixo do colchão):") || "").trim();
        if (!nome) return;
        const id = "saldo_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        if (!estado.fichaAtual.saldos) estado.fichaAtual.saldos = {};
        estado.fichaAtual.saldos[id] = { nome, valor: 0, fixo: false };
        await update(ref(db, `${caminhoBase()}/saldos`), estado.fichaAtual.saldos);
        toast(`Saldo "${nome}" criado.`);
    });

    // Ganho fixo — agora só o Mestre pode definir. Fica registrado pro
    // crédito automático de Domingo. Não passa pelo sistema de aprovação
    // (não é uma transação, é um valor fixo cadastrado pelo Mestre).
    el.financasGanhoFixoSalvar.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId) return;
        if (!estado.isMestre) { toast("Só o Mestre pode definir o ganho fixo.", "erro"); return; }
        const valor = Math.max(0, Number(el.financasGanhoFixo.value) || 0);
        estado.fichaAtual.dados.ganhoFixo = valor;
        await update(ref(db, `${caminhoBase()}/dados`), { ganhoFixo: valor });
        toast(`Ganho fixo semanal definido: CN$ ${valor}.`);
    });

    // Gastar dinheiro — jogador nunca subtrai na hora; vira pedido pro
    // Mestre aprovar (regra 4). Funciona pra qualquer saldo, inclusive
    // os customizados criados pelo próprio jogador.
    el.financasGastarBtn.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const valor = Number(el.financasGastarValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor de gasto maior que zero.", "erro"); return; }
        const saldoId = el.financasGastarOrigem.value;
        const saldo = todosOsSaldos(estado.fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const saldoAtual = Number(saldo.valor) || 0;
        if (valor > saldoAtual) { toast("Valor maior que o saldo disponível.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "gastar_dinheiro",
            fichaId: estado.fichaAtualId,
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
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const valor = Math.floor(Number(el.financasGastarValor.value)) || 0;
        if (valor <= 0) { toast("Informe um valor maior que zero.", "erro"); return; }
        const saldoId = el.financasGastarOrigem.value;
        const saldo = todosOsSaldos(estado.fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const saldoAtual = Number(saldo.valor) || 0;
        if (valor > saldoAtual) { toast("Valor maior que o saldo disponível.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "transformar_dinheiro_item",
            fichaId: estado.fichaAtualId,
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
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const valor = Number(el.financasMoverValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor de movimentação maior que zero.", "erro"); return; }
        const origemId = el.financasMoverOrigem.value;
        const destinoId = el.financasMoverDestino.value;
        if (!origemId || !destinoId) { toast("Escolha os saldos de origem e destino.", "erro"); return; }
        if (origemId === destinoId) { toast("Escolha saldos diferentes pra origem e destino.", "erro"); return; }
        const saldos = todosOsSaldos(estado.fichaAtual);
        const saldoOrigem = saldos.find(s => s.id === origemId);
        const saldoDestino = saldos.find(s => s.id === destinoId);
        if (!saldoOrigem || !saldoDestino) { toast("Escolha saldos válidos.", "erro"); return; }
        const saldoAtualOrigem = Number(saldoOrigem.valor) || 0;
        if (valor > saldoAtualOrigem) { toast("Valor maior que o saldo disponível na origem.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "mover_dinheiro",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer mover CN$ ${valor} de "${saldoOrigem.nome}" pra "${saldoDestino.nome}".`,
            payload: { valor, saldoOrigemId: origemId, saldoDestinoId: destinoId }
        });
        toast("Pedido de movimentação enviado ao Mestre.");
        el.financasMoverValor.value = 0;
    });

    // Dar dinheiro a outro personagem — igual "Dar item" (abas/inventario.js),
    // só que sem precisar transformar o valor num item físico antes: sai
    // direto de um saldo próprio (qualquer um, inclusive carteira digital
    // de item) e cai no saldo fixo "No bolso" de quem recebe. Jogador
    // nunca move na hora — vira pedido pro Mestre aprovar (regra 4),
    // igual qualquer outra movimentação de dinheiro.
    el.financasDarBtn.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const valor = Number(el.financasDarValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor maior que zero.", "erro"); return; }
        const origemId = el.financasDarOrigem.value;
        const fichaDestinoId = el.financasDarDestinoFicha.value;
        if (!origemId) { toast("Escolha de onde vai sair o dinheiro.", "erro"); return; }
        if (!fichaDestinoId) { toast("Escolha pra quem dar o dinheiro.", "erro"); return; }
        const saldoOrigem = todosOsSaldos(estado.fichaAtual).find(s => s.id === origemId);
        if (!saldoOrigem) { toast("Escolha um saldo válido.", "erro"); return; }
        const saldoAtualOrigem = Number(saldoOrigem.valor) || 0;
        if (valor > saldoAtualOrigem) { toast("Valor maior que o saldo disponível.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        const nomeDestino = (estado.todasAsFichasCache[fichaDestinoId] && estado.todasAsFichasCache[fichaDestinoId].config && estado.todasAsFichasCache[fichaDestinoId].config.nomeExibicao) || fichaDestinoId;
        await criarAcaoPendente({
            tipo: "dar_dinheiro",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer dar CN$ ${valor} (${saldoOrigem.nome}) para ${nomeDestino}.`,
            payload: { valor, saldoOrigemId: origemId, fichaDestinoId, fichaDestinoNome: nomeDestino }
        });
        toast("Pedido de transferência enviado ao Mestre.");
        el.financasDarValor.value = 0;
    });

    // Deixar dinheiro no cenário — igual "Dar dinheiro" acima, só que o
    // destino não é outro personagem e sim o cenário em que este
    // personagem está agora (cenarioAtualDoPersonagem, ficha.js). Vira
    // um saldo novo, "sem dono", solto no cenário (qualquer participante
    // pode pegar depois — ver "deixar_dinheiro_cenario" em
    // criarAcaoPendente/confirmarAcaoPendente, mestre.js). Jogador nunca
    // move na hora — vira pedido pro Mestre aprovar (regra 4), igual
    // qualquer outra movimentação de dinheiro.
    el.financasDeixarCenarioBtn.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const cenario = cenarioAtualDoPersonagem();
        if (!cenario) { toast("Você não está em nenhum cenário no momento.", "erro"); return; }
        const valor = Number(el.financasDeixarCenarioValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor maior que zero.", "erro"); return; }
        const origemId = el.financasDeixarCenarioOrigem.value;
        const saldoOrigem = todosOsSaldos(estado.fichaAtual).find(s => s.id === origemId);
        if (!saldoOrigem) { toast("Escolha um saldo válido.", "erro"); return; }
        const saldoAtualOrigem = Number(saldoOrigem.valor) || 0;
        if (valor > saldoAtualOrigem) { toast("Valor maior que o saldo disponível.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "deixar_dinheiro_cenario",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer deixar CN$ ${valor} (${saldoOrigem.nome}) no cenário "${cenario.titulo || "sem título"}".`,
            payload: { valor, saldoOrigemId: origemId, cenarioId: cenario.id }
        });
        toast("Pedido pra deixar dinheiro no cenário enviado ao Mestre.");
        el.financasDeixarCenarioValor.value = 0;
    });

    // Solicitar dinheiro — o jogador pede um valor novo (ganho em jogo,
    // negociado com o Mestre fora do sistema etc.) e já escolhe em qual
    // dos PRÓPRIOS saldos ele deve cair; vira pedido pendente (regra 4),
    // o Mestre só aprova o valor (ver "solicitar_dinheiro" em mestre.js).
    el.financasSolicitarBtn.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const valor = Number(el.financasSolicitarValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor maior que zero.", "erro"); return; }
        const saldoId = el.financasSolicitarDestino.value;
        const saldo = todosOsSaldos(estado.fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "solicitar_dinheiro",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} está solicitando CN$ ${valor} (pra "${saldo.nome}").`,
            payload: { valor, saldoId, saldoNome: saldo.nome }
        });
        toast("Pedido de dinheiro enviado ao Mestre.");
        el.financasSolicitarValor.value = 0;
    });
}
