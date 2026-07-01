// =====================================================================
// CHUVA DE NEON — Autenticação (login / registro / sessão)
// =====================================================================
// Como funciona:
// - "Login do Mestre" é fixo (definido abaixo) e dá acesso total.
// - Qualquer outro login cria (ou acessa) uma ficha de jogador.
// - A sessão fica salva no localStorage do navegador, então ao recarregar
//   a página o jogador continua logado até clicar em "Sair".
//
// ATENÇÃO SOBRE SEGURANÇA:
// As senhas ficam salvas em texto simples dentro do Firebase Realtime
// Database. Isso é suficiente para uma mesa entre amigos, mas NÃO é uma
// autenticação de verdade — alguém com conhecimento técnico que acesse
// a URL do banco consegue ler as senhas. Para travar isso de verdade,
// configure as "Regras" do Realtime Database no painel do Firebase
// (veja o README.md do repositório para o trecho de regras sugerido).

import { db } from "./firebase-config.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

// ACESSO DO MESTRE CANÔNICO
const LOGIN_MESTRE = "frkstnmsk";
const SENHA_MESTRE = "31outcaseri";

let modoAtual = "entrar";

const tabEntrar = document.getElementById("tab-entrar");
const tabCriar = document.getElementById("tab-criar");
const btnAcao = document.getElementById("btn-acao");
const statusMsg = document.getElementById("login-status-msg");
const spinner = document.getElementById("login-spinner");
const campoNomeExibicao = document.getElementById("campo-nome-exibicao");
const inputUser = document.getElementById("login-user");
const inputPass = document.getElementById("login-pass");
const inputNomeExibicao = document.getElementById("login-nome-exibicao");

// Se já existe sessão válida, manda direto pra ficha.
(function redirecionarSeJaLogado() {
    const saved = localStorage.getItem("cdn_session");
    if (saved) {
        try {
            const sessao = JSON.parse(saved);
            if (sessao && sessao.idLimpo !== undefined && sessao.role) {
                window.location.href = "ficha.html";
            }
        } catch (e) {
            localStorage.removeItem("cdn_session");
        }
    }
})();

tabEntrar.addEventListener("click", () => {
    modoAtual = "entrar";
    tabEntrar.classList.add("active");
    tabCriar.classList.remove("active");
    btnAcao.innerText = "Inicializar Link";
    campoNomeExibicao.style.display = "none";
    ocultarErro();
});

tabCriar.addEventListener("click", () => {
    modoAtual = "criar";
    tabCriar.classList.add("active");
    tabEntrar.classList.remove("active");
    btnAcao.innerText = "Registrar Nova Ficha";
    campoNomeExibicao.style.display = "flex";
    ocultarErro();
});

btnAcao.addEventListener("click", executarAcao);
[inputUser, inputPass, inputNomeExibicao].forEach(el => {
    el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") executarAcao();
    });
});

async function executarAcao() {
    const rawUser = inputUser.value.trim();
    const pass = inputPass.value;
    const nomeExibicao = inputNomeExibicao.value.trim();

    if (rawUser === "" || pass === "") {
        mostrarErro("SINAL INCOMPLETO: preencha login e senha.");
        return;
    }
    if (modoAtual === "criar" && nomeExibicao === "") {
        mostrarErro("SINAL INCOMPLETO: dê um nome pra sua ficha.");
        return;
    }

    const userClean = rawUser.toLowerCase().replace(/[^a-z0-9]/g, "-");

    if (userClean === "" ) {
        mostrarErro("LOGIN INVÁLIDO: use letras, números ou hífen.");
        return;
    }

    // Validação do Mestre — sempre tratado de forma especial, em qualquer aba.
    if (rawUser.toLowerCase() === LOGIN_MESTRE) {
        if (pass === SENHA_MESTRE) {
            definirSessao("mestre", "Mestre", "");
        } else {
            mostrarErro("CORTA-FOGO: senha de mestre inválida.");
        }
        return;
    }

    travarBotao(true);
    try {
        const configRef = ref(db, `fichas/${userClean}/config`);

        if (modoAtual === "criar") {
            const snapshot = await get(configRef);
            if (snapshot.exists()) {
                mostrarErro("ERRO: esse login já está em uso. Escolha outro ou entre com a senha dele.");
                return;
            }
            await criarFichaNova(userClean, pass, nomeExibicao);
            definirSessao("jogador", nomeExibicao, userClean);
        } else {
            const snapshot = await get(configRef);
            if (!snapshot.exists()) {
                mostrarErro("ERRO: ficha inexistente. Use a aba \"Registrar Nova Ficha\" pra criar uma.");
                return;
            }
            const config = snapshot.val();
            if (config.senha === pass) {
                definirSessao("jogador", config.nomeExibicao || rawUser, userClean);
            } else {
                mostrarErro("CORTA-FOGO: senha incorreta.");
            }
        }
    } catch (err) {
        console.error(err);
        mostrarErro("FALHA DE CONEXÃO COM A REDE. Tente novamente em alguns segundos.");
    } finally {
        travarBotao(false);
    }
}

async function criarFichaNova(idLimpo, senha, nomeExibicao) {
    const fichaVazia = {
        config: {
            senha,
            nomeExibicao,
            criadoEm: Date.now()
        },
        dados: {
            nome: nomeExibicao, vulgo: "", idade: "", nacionalidade: "", funcao: "",
            maldade: 0, remorso: 0, status: 0,
            dm: "", void: "", p2k: "", rabbithole: "", p2c: "", creators: "",
            nivel: 1, xp: 0,
            forca: 0, constituicao: 0, destreza: 0, sabedoria: 0,
            inteligencia: 0, raciocinio: 0, carisma: 0, manipulacao: 0,
            pvAtual: null, energiaAtual: null,
            dinheiroLimpo: 0, dinheiroSujo: 0,
            padraoDeVida: "",
            ganhoFixo: 0,
            ultimoPagamentoCustoVida: 0,
            criacaoConcluida: false
        },
        pericias: {},
        inventario: {},
        categoriasInventario: {},
        gastosExtras: {},
        vantagens: {},
        desvantagens: {},
        especializacoes: {},
        fatosUniversais: {},
        criacao: {
            etapa: 1,
            funcaoEscolhida: "",
            escolhaAtributoFuncao: "",
            etapa1JaConfirmadaAntes: false,
            pontosAtributosRestantes: 7,
            pontosPericiasRestantes: 5,
            pontosFuncaoRestantes: 0,
            pontosBonusDesvantagens: 0,
            bonusGasto: 0,
            bonusGastoDetalhe: {},
            concluida: false
        },
        treinamento: {
            ativo: false,
            periciaFisica: null,
            periciaMental: null,
            atributoFisico: null,
            atributoMental: null
        },
        levelUpPendente: null,
        determinacoes: "",
        notas: ""
    };
    await set(ref(db, `fichas/${idLimpo}`), fichaVazia);
}

function definirSessao(role, nome, idLimpo) {
    const sessao = { role, nome, idLimpo };
    localStorage.setItem("cdn_session", JSON.stringify(sessao));
    window.location.href = "ficha.html";
}

function mostrarErro(txt) {
    statusMsg.innerText = txt;
    statusMsg.style.display = "block";
}
function ocultarErro() {
    statusMsg.style.display = "none";
}
function travarBotao(travado) {
    btnAcao.disabled = travado;
    spinner.style.display = travado ? "block" : "none";
}
