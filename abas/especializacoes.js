// abas/especializacoes.js
// ---------------------------------------------------------------------
// Aba Especializações + o campo "Substância" (vício) do modal de
// Desvantagem, que fica fisicamente ligado a essa aba no HTML.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt).
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import { el, renderizarListaSimples, resumoModificadores, escapeHtml } from "../ficha.js?v=20260926b-difacertarcontraataque";
import { CATALOGO_DROGAS } from "../dados-manual.js";
import { ATRIBUTOS_PRIMARIOS } from "../regras.js";
import { categoriaEspecializacao, resumoSlotsEspecializacaoAtributo } from "../levelup.js";

export function renderizarEspecializacoes() {
    const resumo = document.getElementById("resumo-slots-especializacao-atributo");
    if (resumo) {
        const r = resumoSlotsEspecializacaoAtributo(estado.fichaAtual);
        resumo.textContent = `Slots de especialização de atributo: ${r.usados}/${r.total} em uso (nível ${r.nivel}) — liberam nos níveis 3, 6 e 9.`;
    }
    renderizarListaSimples(el.listaEspecializacoes, estado.fichaAtual.especializacoes || {}, (id, v) => {
        const ehAtributo = categoriaEspecializacao(v) === "atributo";
        const attr = ehAtributo ? ATRIBUTOS_PRIMARIOS.find(a => a.key === v.atributoVinculado) : null;
        const vinculo = ehAtributo
            ? `Atributo: ${attr ? attr.label : "(não definido)"}`
            : (v.periciaVinculada ? `Perícia: ${v.periciaVinculada}` : null);
        return {
            nome: v.nome || "(sem nome)",
            sub: [vinculo, v.descricao || null].filter(Boolean).join(" — "),
            direita: resumoModificadores(v)
        };
    }, "especializacoes");
}

// Mostra/esconde o campo "Substância" no modal de Desvantagem, conforme
// o Nome digitado contém "vício"/"vicio" — e preenche o datalist com o
// catálogo do manual, pra sugerir só (não trava em texto livre, porque
// mesa pode ter droga homebrew).
export function configurarCampoSubstanciaVicio() {
    if (el.modalSubstanciaVicioOpcoes) {
        el.modalSubstanciaVicioOpcoes.innerHTML = CATALOGO_DROGAS.map(d => `<option value="${escapeHtml(d.nome)}">`).join("");
    }
    if (!el.modalNome) return;
    el.modalNome.addEventListener("input", () => {
        if (!estado.modalContexto || estado.modalContexto.lista !== "desvantagens" || !el.modalCampoSubstanciaVicio) return;
        const ehVicio = /vic[ií]o/i.test(el.modalNome.value);
        el.modalCampoSubstanciaVicio.style.display = ehVicio ? "flex" : "none";
    });
}
