import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, set, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

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

const LOGIN_MESTRE = "mestre";
const SENHA_MESTRE = "neon123";
const SENHA_JOGADORES = "cyberpunk";

let usuarioLogado = { role: "jogador", nome: "" };
let fichaMonitorada = ""; // Guarda qual ficha está sendo controlada na tela atual
let firebaseListener = null; // Guarda o escutador ativo para podermos desligar ao trocar de ficha

document.getElementById("btn-entrar").addEventListener("click", () => {
    const user = document.getElementById("login-user").value.trim().toLowerCase();
    const pass = document.getElementById("login-pass").value;
    const erroLogin = document.getElementById("login-erro");

    if (user === LOGIN_MESTRE && pass === SENHA_MESTRE) {
        usuarioLogado.role = "mestre";
        usuarioLogado.nome = "Mestre";
        fichaMonitorada = document.getElementById("select-ficha").value; // Começa na primeira do select
        inicializarPainel();
    } else if (user !== "" && pass === SENHA_JOGADORES) {
        usuarioLogado.role = "jogador";
        usuarioLogado.nome = user; // O nome da ficha será o próprio usuário digitado
        fichaMonitorada = user;
        inicializarPainel();
    } else {
        erroLogin.style.display = "block";
    }
});

function inicializarPainel() {
    document.getElementById("tela-login").style.display = "none";
    document.getElementById("conteudo-ficha").style.display = "block";

    const badgeRole = document.getElementById("user-role");
    const inputModMestre = document.getElementById("mod-mestre");
    const painelSeletorMestre = document.getElementById("painel-mestre-seletor");

    if (usuarioLogado.role === "mestre") {
        badgeRole.innerHTML = `<span class="badge-mestre">MESTRE</span>`;
        inputModMestre.disabled = false;
        painelSeletorMestre.style.display = "block"; // Mostra o seletor de fichas para o Mestre

        // Sempre que o mestre mudar o jogador no select, troca a sincronização de destino
        document.getElementById("select-ficha").addEventListener("change", (e) => {
            fichaMonitorada = e.target.value;
            ativarSincronizacao();
        });
    } else {
        badgeRole.innerHTML = `<span class="badge-jogador">JOGADOR</span>`;
        inputModMestre.disabled = true;
        inputModMestre.style.background = "#222";
        inputModMestre.placeholder = "Apenas o mestre edita o modificador";
    }

    ativarSincronizacao();
}

function activarSincronizacao() {
    // Se já existia um escutador ligado em outra ficha, desliga ele primeiro
    if (firebaseListener) {
        off(ref(db, `fichas/${fichaMonitorada}`));
    }

    document.getElementById("nome-ficha-ativa").innerText = fichaMonitorada.toUpperCase();

    const txtVidaAtual = document.getElementById("vidaAtual");
    const txtModAtual = document.getElementById("modAtual");
    const inputVida = document.getElementById("vida");
    const inputModMestre = document.getElementById("mod-mestre");

    const caminhoFichaRef = ref(db, `fichas/${fichaMonitorada}`);

    // Cria a nova conexão em tempo real com o nó daquela ficha específica
    firebaseListener = onValue(caminhoFichaRef, (snapshot) => {
        const dados = snapshot.val();
        if (dados) {
            txtVidaAtual.innerText = dados.vida !== undefined ? dados.vida : "0";
            txtModAtual.innerText = dados.modificadorMestre !== undefined ? dados.modificadorMestre : "0";

            if (document.activeElement !== inputVida) {
                inputVida.value = dados.vida || "";
            }
            if (document.activeElement !== inputModMestre) {
                inputModMestre.value = dados.modificadorMestre || "";
            }
        } else {
            // Se a ficha não existir ainda no banco
            txtVidaAtual.innerText = "Sem dados";
            txtModAtual.innerText = "0";
            inputVida.value = "";
            inputModMestre.value = "";
        }
    });
}

// Salvar dados respeitando quem está alterando e qual ficha está ativa
document.getElementById("btn-salvar").addEventListener("click", () => {
    const inputVida = document.getElementById("vida");
    const inputModMestre = document.getElementById("mod-mestre");
    const caminhoFichaRef = ref(db, `fichas/${fichaMonitorada}`);

    let dadosParaEnviar = {};

    if (usuarioLogado.role === "mestre") {
        dadosParaEnviar = {
            vida: inputVida.value,
            modificadorMestre: inputModMestre.value
        };
    } else {
        dadosParaEnviar = {
            vida: inputVida.value,
            modificadorMestre: document.getElementById("modAtual").innerText
        };
    }

    set(caminhoFichaRef, dadosParaEnviar)
    .then(() => console.log(`Ficha de ${fichaMonitorada} atualizada!`))
    .catch((err) => console.error("Erro ao salvar:", err));
});
