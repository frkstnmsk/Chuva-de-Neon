import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

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

// CREDENCIAIS DO MESTRE
const LOGIN_MESTRE = "frkstnmsk";
const SENHA_MESTRE = "31outcaseri";

let modoAtual = "entrar"; // "entrar" ou "criar"
let usuarioLogado = { role: "jogador", nome: "" };
let fichaMonitorada = "";
let firebaseListener = null;

// Chaves de controle de Abas da Interface
const tabEntrar = document.getElementById("tab-entrar");
const tabCriar = document.getElementById("tab-criar");
const btnAcao = document.getElementById("btn-acao");
const statusMsg = document.getElementById("login-status-msg");

tabEntrar.addEventListener("click", () => {
    modoAtual = "entrar";
    tabEntrar.classList.add("active");
    tabCriar.classList.remove("active");
    btnAcao.innerText = "Acessar Sistema";
    statusMsg.style.display = "none";
});

tabCriar.addEventListener("click", () => {
    modoAtual = "criar";
    tabCriar.classList.add("active");
    tabEntrar.classList.remove("active");
    btnAcao.innerText = "Criar Nova Ficha";
    statusMsg.style.display = "none";
});

// Executar Ação (Entrar ou Criar)
btnAcao.addEventListener("click", async () => {
    const user = document.getElementById("login-user").value.trim().toLowerCase();
    const pass = document.getElementById("login-pass").value;

    if (user === "" || pass === "") {
        mostrarErro("Preencha todos os campos.");
        return;
    }

    // 1. CHECAGEM SE É O MESTRE
    if (user === LOGIN_MESTRE && pass === SENHA_MESTRE) {
        usuarioLogado.role = "mestre";
        usuarioLogado.nome = "Mestre";
        liberarPainel();
        return;
    }

    if (user === LOGIN_MESTRE && pass !== SENHA_MESTRE) {
        mostrarErro("Senha incorreta para o usuário de Mestre.");
        return;
    }

    const fichaRef = ref(db, `fichas/${user}/config`);

    if (modoAtual === "criar") {
        // 2. LÓGICA DE CRIAR FICHA
        const snapshot = await get(fichaRef);
        if (snapshot.exists()) {
            mostrarErro("Uma ficha com esse nome já existe!");
        } else {
            // Cria os dados de acesso da ficha e inicializa os valores padrão
            await set(ref(db, `fichas/${user}`), {
                config: { senha: pass },
                dados: { vida: "100", modificadorMestre: "0" }
            });
            usuarioLogado.role = "jogador";
            usuarioLogado.nome = user;
            fichaMonitorada = user;
            liberarPainel();
        }
    } else {
        // 3. LÓGICA DE ENTRAR EM FICHA EXISTENTE
        const snapshot = await get(fichaRef);
        if (!snapshot.exists()) {
            mostrarErro("Essa ficha não existe. Escolha 'CRIAR FICHA' se for nova.");
        } else {
            const dadosConfig = snapshot.val();
            if (dadosConfig.senha === pass) {
                usuarioLogado.role = "jogador";
                usuarioLogado.nome = user;
                fichaMonitorada = user;
                liberarPainel();
            } else {
                mostrarErro("Senha incorreta para esta ficha.");
            }
        }
    }
});

function mostrarErro(txt) {
    statusMsg.innerText = txt;
    statusMsg.style.display = "block";
}

function liberarPainel() {
    document.getElementById("tela-login").style.display = "none";
    document.getElementById("conteudo-ficha").style.display = "block";

    const badgeRole = document.getElementById("user-role");
    const inputModMestre = document.getElementById("mod-mestre");
    const painelSeletorMestre = document.getElementById("painel-mestre-seletor");

    if (usuarioLogado.role === "mestre") {
        badgeRole.innerHTML = `<span class="badge-mestre">MESTRE</span>`;
        inputModMestre.disabled = false;
        painelSeletorMestre.style.display = "block";

        // Carrega todas as fichas criadas no banco para colocar no select do mestre
        onValue(ref(db, "fichas"), (snapshot) => {
            const seletor = document.getElementById("select-ficha");
            seletor.innerHTML = '<option value="">-- Escolha um Personagem --</option>';
            
            if (snapshot.exists()) {
                Object.keys(snapshot.val()).forEach(nomeFicha => {
                    const opt = document.createElement("option");
                    opt.value = nomeFicha;
                    opt.innerText = nomeFicha.toUpperCase();
                    seletor.appendChild(opt);
                });
                if (fichaMonitorada) seletor.value = fichaMonitorada;
            }
        });

        document.getElementById("select-ficha").addEventListener("change", (e) => {
            if (e.target.value !== "") {
                fichaMonitorada = e.target.value;
                ativarSincronizacao();
            }
        });
    } else {
        badgeRole.innerHTML = `<span class="badge-jogador">JOGADOR</span>`;
        inputModMestre.disabled = true;
        inputModMestre.style.background = "#222";
        inputModMestre.placeholder = "Apenas o mestre edita o modificador";
        ativarSincronizacao();
    }
}

function activarSincronizacao() {
    if (firebaseListener) {
        off(ref(db, `fichas/${fichaMonitorada}/dados`));
    }

    document.getElementById("nome-ficha-ativa").innerText = fichaMonitorada.toUpperCase();

    const txtVidaAtual = document.getElementById("vidaAtual");
    const txtModAtual = document.getElementById("modAtual");
    const inputVida = document.getElementById("vida");
    const inputModMestre = document.getElementById("mod-mestre");

    const caminhoDadosRef = ref(db, `fichas/${fichaMonitorada}/dados`);

    firebaseListener = onValue(caminhoDadosRef, (snapshot) => {
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
            txtVidaAtual.innerText = "Sem dados";
            txtModAtual.innerText = "0";
            inputVida.value = "";
            inputModMestre.value = "";
        }
    });
}

// Salvar Dados Sincronizados
document.getElementById("btn-salvar").addEventListener("click", () => {
    if (!fichaMonitorada) {
        alert("Nenhum personagem selecionado para salvar.");
        return;
    }

    const inputVida = document.getElementById("vida");
    const inputModMestre = document.getElementById("mod-mestre");
    const caminhoDadosRef = ref(db, `fichas/${fichaMonitorada}/dados`);

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

    set(caminhoDadosRef, dadosParaEnviar)
    .then(() => console.log(`Dados salvos em fichas/${fichaMonitorada}`))
    .catch((err) => console.error(err));
});
