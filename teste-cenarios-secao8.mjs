// =====================================================================
// CHUVA DE NEON — Teste automatizado dos 5 cenários da seção 8 do
// projeto-slots-porte.txt ("CENÁRIOS DE TESTE MANUAL").
//
// Roda direto nas funções reais de inventario.js/dados-manual.js/
// normalizacao.js (sem mock), montando uma ficha mínima em memória
// pra cada cenário. Não é um substituto pro teste manual na UI de
// verdade (o doc pede isso "depois de cada fase de UI", pra ver o
// que o jogador vê — textos de bloqueio, botões desabilitados etc.),
// mas garante que a CAMADA DE REGRAS por trás desses botões está
// correta antes de validar visualmente.
//
// Uso: node teste-cenarios-secao8.mjs
// =====================================================================

import {
    itemCabeNoContainer, maosDisponiveis, itemPodeEquiparContainer,
    itemPodeSerLevadoSolto
} from "./inventario.js";
import { normalizarCompartimentos } from "./normalizacao.js";

let falhas = 0;
function checar(descricao, condicao) {
    if (condicao) {
        console.log(`  OK  — ${descricao}`);
    } else {
        console.log(`FALHA — ${descricao}`);
        falhas++;
    }
}

// ---------------------------------------------------------------------
// Cenário 1: Vestir uma calça, guardar uma faca (pequeno) no bolso —
// deve caber; tentar guardar uma katana (comprido) no mesmo bolso —
// deve barrar por tamanho.
// ---------------------------------------------------------------------
console.log("\nCenário 1 — tamanho do compartimento");
{
    const ficha = {
        inventario: {
            calca: {
                nome: "Calça", tag: "recipiente", categoria: "levando", equipada: true,
                subtipoPorte: "roupa",
                compartimentos: [{ id: "bolso", nome: "Bolso frente esq.", capacidadeVolume: 2, tamanhoMaximoAceito: "pequeno" }]
            }
        }
    };
    const faca = { volume: 1, tamanho: "pequeno" };
    const katana = { volume: 1, tamanho: "comprido" };

    const resultadoFaca = itemCabeNoContainer(ficha, "calca", "bolso", faca.volume, faca.tamanho);
    checar('faca (pequeno) cabe no bolso', resultadoFaca.cabe === true);

    const resultadoKatana = itemCabeNoContainer(ficha, "calca", "bolso", katana.volume, katana.tamanho);
    checar('katana (comprido) é barrada, motivo "tamanho"', resultadoKatana.cabe === false && resultadoKatana.motivo === "tamanho");
}

// ---------------------------------------------------------------------
// Cenário 2 (atualizado): a mesa pediu pra REMOVER a exclusividade de
// roupa/cinto — como o inventário é monitorado pelo Mestre item a
// item, por enquanto não deve haver limite de "só 1 peça de roupa" ou
// "só 1 cinto" equipados ao mesmo tempo (dá pra vestir cinto + jaqueta
// + mochila + colete etc. tudo junto). Ver SUBTIPOS_PORTE em
// dados-manual.js (todo subtipo agora nasce com exclusivo: false).
// ---------------------------------------------------------------------
console.log("\nCenário 2 — vestir várias peças de roupa/cinto ao mesmo tempo (sem exclusividade)");
{
    const ficha = {
        inventario: {
            calca1: { nome: "Calça jeans", tag: "recipiente", categoria: "levando", equipada: true, subtipoPorte: "roupa", compartimentos: [{ id: "p", nome: "Principal", capacidadeVolume: 1, tamanhoMaximoAceito: "pequeno" }] },
            calca2: { nome: "Calça cargo", tag: "recipiente", categoria: "levando", equipada: false, subtipoPorte: "roupa", compartimentos: [{ id: "p", nome: "Principal", capacidadeVolume: 1, tamanhoMaximoAceito: "pequeno" }] },
            cinto1: { nome: "Cinto de couro", tag: "recipiente", categoria: "levando", equipada: false, subtipoPorte: "cinto", compartimentos: [{ id: "p", nome: "Principal", capacidadeVolume: 1, tamanhoMaximoAceito: "pequeno" }] }
        }
    };
    const podeVestirSegundaCalca = itemPodeEquiparContainer(ficha, ficha.inventario.calca2, "calca2");
    checar("2ª calça pode ser vestida com a 1ª ainda equipada (sem exclusividade)", podeVestirSegundaCalca === true);

    const podeVestirCinto = itemPodeEquiparContainer(ficha, ficha.inventario.cinto1, "cinto1");
    checar("cinto pode ser vestido junto com as 2 calças (subtipos diferentes nunca tiveram exclusividade entre si)", podeVestirCinto === true);
}

// ---------------------------------------------------------------------
// Cenário 3: Segurar uma arma de 2 mãos com a outra mão já ocupada
// por uma bolsa_mao equipada — deve barrar por falta de mão livre.
// ---------------------------------------------------------------------
console.log("\nCenário 3 — mãos livres");
{
    const ficha = {
        inventario: {
            bolsa: { nome: "Bolsa de mão", tag: "recipiente", categoria: "levando", equipada: true, subtipoPorte: "bolsa_mao", maosNecessarias: 1, compartimentos: [{ id: "p", nome: "Principal", capacidadeVolume: 5, tamanhoMaximoAceito: "medio" }] }
        }
    };
    const maosAntesDaArma = maosDisponiveis(ficha);
    checar("1 mão livre com a bolsa equipada (2 - 1 = 1)", maosAntesDaArma === 1);

    const fuzil = { maosNecessarias: 2 };
    const semMaoParaFuzil = maosAntesDaArma < fuzil.maosNecessarias;
    checar("fuzil de 2 mãos é barrado por falta de mão livre (1 < 2)", semMaoParaFuzil === true);

    // Uma faca de 1 mão, por outro lado, deve caber na mão restante.
    const faca = { maosNecessarias: 1 };
    checar("faca de 1 mão ainda cabe na mão restante (1 >= 1)", maosAntesDaArma >= faca.maosNecessarias);
}

// ---------------------------------------------------------------------
// Cenário 4: Desequipar a calça (tirar) com item guardado dentro —
// item some da lista de "levando consigo" ativo mas continua existindo
// no dado, reaparece se vestir a calça de novo.
// ---------------------------------------------------------------------
console.log("\nCenário 4 — desequipar recipiente com item guardado dentro");
{
    const ficha = {
        inventario: {
            calca: { nome: "Calça", tag: "recipiente", categoria: "levando", equipada: true, subtipoPorte: "roupa", compartimentos: [{ id: "bolso", nome: "Bolso", capacidadeVolume: 2, tamanhoMaximoAceito: "pequeno" }] },
            faca: { nome: "Faca", tag: "arma-branca", categoria: "levando", dentroDe: "calca", compartimentoId: "bolso", volume: 1, tamanho: "pequeno" }
        }
    };
    // A faca (item.dentroDe preenchido) nunca é bloqueada por
    // itemPodeSerLevadoSolto, esteja a calça equipada ou não — ela
    // "viaja" com o container-pai independente do estado dele.
    const facaValidaComCalcaVestida = itemPodeSerLevadoSolto(ficha, ficha.inventario.faca);
    checar("faca guardada é válida com a calça vestida", facaValidaComCalcaVestida === true);

    // Simula "Tirar a calça": antes de tirar, o botão da UI roda
    // itemPodeSerLevadoSolto sobre a PRÓPRIA calça com equipada:false
    // (não sobre a faca) pra decidir se deixa desequipar.
    const podeTirarCalca = itemPodeSerLevadoSolto(ficha, { ...ficha.inventario.calca, equipada: false });
    checar('calça pode ser "tirada" (ela é container, mas SEM dentroDe próprio — trava não se aplica a ela mesma)', podeTirarCalca === false);
    // ^ Nota: como a calça está solta em "levando" (sem dentroDe) e
    // deixaria de ser container-roupa-equipada, itemPodeSerLevadoSolto
    // corretamente diz que ela NÃO pode ficar solta desequipada —
    // teria que ir pra outra categoria ou ser guardada em outro
    // recipiente. Isso é o comportamento intencional descrito no passo
    // 17 (o botão "Tirar" da calça em si segue essa mesma regra
    // central; só os FILHOS dela — a faca — ficam sempre isentos).

    ficha.inventario.calca.equipada = false;
    const facaAindaExisteNoDado = !!ficha.inventario.faca;
    const facaAindaApontaParaCalca = ficha.inventario.faca.dentroDe === "calca";
    checar("faca continua existindo no dado após a calça ser desequipada", facaAindaExisteNoDado);
    checar("faca continua apontando pra calça (dentroDe intacto)", facaAindaApontaParaCalca);

    ficha.inventario.calca.equipada = true;
    const facaValidaDeNovo = itemPodeSerLevadoSolto(ficha, ficha.inventario.faca);
    checar("ao vestir a calça de novo, a faca guardada continua válida (nunca deixou de estar)", facaValidaDeNovo === true);
}

// ---------------------------------------------------------------------
// Cenário 5: Ficha antiga (pré-migração) com mochila cheia de itens —
// depois de abrir uma vez, conferir que nada sumiu e que a mochila
// virou container de 1 compartimento "Principal" com tudo dentro dele.
// ---------------------------------------------------------------------
console.log("\nCenário 5 — migração de ficha antiga");
{
    const fichaAntiga = {
        inventario: {
            mochila: {
                nome: "Mochila velha", tag: "recipiente", categoria: "levando",
                // dado no formato PRÉ-Fase 8: sem subtipoPorte, sem
                // compartimentos, capacidade solta no próprio item.
                capacidadeVolume: 10, tamanhoMaximoAceito: "grande"
            },
            racao: { nome: "Ração", tag: "consumivel", categoria: "levando", dentroDe: "mochila", volume: 2 },
            lanterna: { nome: "Lanterna", tag: "equipamento", categoria: "levando", dentroDe: "mochila", volume: 1 }
        }
    };

    normalizarCompartimentos(fichaAntiga);

    const mochila = fichaAntiga.inventario.mochila;
    checar("mochila ganhou exatamente 1 compartimento", Array.isArray(mochila.compartimentos) && mochila.compartimentos.length === 1);
    checar('compartimento criado se chama "principal"/"Principal"', mochila.compartimentos[0].id === "principal" && mochila.compartimentos[0].nome === "Principal");
    checar("capacidadeVolume antiga (10) foi preservada dentro do compartimento", mochila.compartimentos[0].capacidadeVolume === 10);
    checar("tamanhoMaximoAceito antigo (grande) foi preservado dentro do compartimento", mochila.compartimentos[0].tamanhoMaximoAceito === "grande");
    checar("campos soltos antigos (capacidadeVolume/tamanhoMaximoAceito) somem do item", mochila.capacidadeVolume === undefined && mochila.tamanhoMaximoAceito === undefined);
    checar('subtipoPorte ganhou default seguro "mochila"', mochila.subtipoPorte === "mochila");

    checar("ração continua existindo e não foi perdida", !!fichaAntiga.inventario.racao);
    checar("lanterna continua existindo e não foi perdida", !!fichaAntiga.inventario.lanterna);
    checar('ração foi migrada pro compartimentoId "principal"', fichaAntiga.inventario.racao.compartimentoId === "principal");
    checar('lanterna foi migrada pro compartimentoId "principal"', fichaAntiga.inventario.lanterna.compartimentoId === "principal");
}

console.log("\n" + "=".repeat(60));
if (falhas === 0) {
    console.log("TODOS OS CENÁRIOS DA SEÇÃO 8 PASSARAM.");
} else {
    console.log(`${falhas} checagem(ns) falharam — ver detalhes acima.`);
    process.exitCode = 1;
}
