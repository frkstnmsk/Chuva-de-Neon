import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU-e21zaoVuW-1Wjzj5b6CfcyOZDj2BsE",
  authDomain: "chuva-de-neon.firebaseapp.com",
  databaseURL: "https://chuva-de-neon-default-rtdb.firebaseio.com",
  projectId: "chuva-de-neon",
  storageBucket: "chuva-de-neon.firebasestorage.app",
  messagingSenderId: "994935691317",
  appId: "1:994935691317:web:418a37b0700b2bd083b97c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// CONFIGURAÇÃO DE LOGIN (ALTERE AQUI SUAS SENHAS)
// ==========================================
const LOGIN_MESTRE = "mestre";
const SENHA_MESTRE = "neon123";

const SENHA_JOGADORES = "cyberpunk"; // Senha padrão para qualquer jogador entrar

let usuarioLogado = { role: "jogador", nome: "" };

// Captura elementos de login
const btnEntrar = document.getElementById("btn-entrar");
const txtUser = document.getElementById("login-user");
const txtPass = document.getElementById("login-pass");
const erroLogin = document.getElementById("login-erro");

// Evento de clique para Logar
btnEntrar.addEventListener("click", () => {
    const user = txtUser.value.trim().toLowerCase();
    const pass = txtPass.value;

    if (user === LOGIN_MESTRE && pass === SENHA_MESTRE) {
        usuarioLogado.role = "mestre";
        usuarioLogado.nome = "Mestre do Jogo";
        inicializarFicha();
    } else if (user !== "" && pass === SENHA_JOGADORES) {
        usuarioLogado.role = "jogador";
        usuarioLogado.nome = user;
        inicializarFicha();
    } else {
        erroLogin.style.display = "block";
    }
});

// ==========================================
// INICIALIZAÇÃO DA FICHA APÓS LOGIN ACEITO
// ==========================================
function inicializarFicha() {
    // Esconde a tela de login e mostra a ficha
    document.getElementById("tela-login").style.display = "none";
    document.getElementById("conteudo-ficha").style.display = "block";

    const badgeRole = document.getElementById("user-role");
    const inputModMestre = document.getElementById("mod-mestre");

    // Aplica restrições na interface se for Jogador comum
    if (usuarioLogado.role === "mestre") {
        badgeRole.innerHTML = `<span class="badge-mestre">MESTRE</span>`;
        inputModMestre.disabled = false;
    } else {
        badgeRole.innerHTML = `<span class="badge-jogador">JOGADOR (${usuarioLogado.nome.toUpperCase()})</span>`;
        // Bloqueia inputs restritos para o jogador não alterar
        inputModMestre.disabled = true;
        inputModMestre.style.background = "#222";
        inputModMestre.placeholder = "Apenas o mestre pode alterar este valor";
    }

    // Ativa a escuta em tempo real do Firebase
    ativarSincronizacao();
}

// ==========================================
// COMUNICAÇÃO EM TEMPO REAL (FIREBASE)
// ==========================================
const fichaRef = ref(db, "sessao_atual");

function activarSincronizacao() {
    const txtVidaAtual = document.getElementById("vidaAtual");
    const txtModAtual = document.getElementById("modAtual");
    const inputVida = document.getElementById("vida");
    const inputModMestre = document.getElementById("mod-mestre");

    // Escuta o Firebase
    onValue(fichaRef, (snapshot) => {
        const dados = snapshot.val();
        if (dados) {
            // Atualiza os textos em tempo real na tela de todos
            txtVidaAtual.innerText = dados.vida !== undefined ? dados.vida : "Sem dados";
            txtModAtual.innerText = dados.modificadorMestre !== undefined ? dados.modificadorMestre : "0";

            // Sincroniza o input de vida dos jogadores se eles não estiverem digitando nele
            if (document.activeElement !== inputVida) {
                inputVida.value = dados.vida || "";
            }
            // Sincroniza o input do modificador (para o jogador ver o valor que o mestre colocou)
            if (document.activeElement !== inputModMestre) {
                inputModMestre.value = dados.modificadorMestre || "";
            }
        }
    });
}

// Botão Salvar / Sincronizar
document.getElementById("btn-salvar").addEventListener("click", () => {
    const inputVida = document.getElementById("vida");
    const inputModMestre = document.getElementById("mod-mestre");

    // Estrutura o que vai ser enviado baseado em quem está clicando
    let dadosParaEnviar = {};

    if (usuarioLogado.role === "mestre") {
        // O mestre atualiza tudo, inclusive os modificadores dele
        dadosParaEnviar = {
            vida: inputVida.value,
            modificadorMestre: inputModMestre.value
        };
    } else {
        // O jogador só tem permissão de enviar a alteração de vida. 
        // Ele mantém o valor atual do modificador (lido da tela) para não apagar o dado do mestre.
        dadosParaEnviar = {
            vida: inputVida.value,
            modificadorMestre: document.getElementById("modAtual").innerText
        };
    }

    set(fichaRef, dadosParaEnviar)
    .then(() => console.log("Dados sincronizados de acordo com as permissões!"))
    .catch((err) => console.error("Erro ao salvar:", err));
});
