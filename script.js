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

// MESTRE LOGIN DO CANÔNICO
const LOGIN_MESTRE = "frkstnmsk";
const SENHA_MESTRE = "31outcaseri";

let modoAtual = "entrar";
let usuarioLogado = { role: "jogador", nome: "" };
let fichaMonitorada = "";
let firebaseListener = null;

// Elementos HTML
const tabEntrar = document.getElementById("tab-entrar");
const tabCriar = document.getElementById("tab-criar");
const btnAcao = document.getElementById("btn-acao");
const statusMsg = document.getElementById("login-status-msg");

// Controle de Abas
tabEntrar.addEventListener("click", () => {
    modoAtual = "entrar";
    tabEntrar.classList.add("active");
    tabCriar.classList.remove("active");
    btnAcao.innerText = "Inicializar Link";
    statusMsg.style.display = "none";
});
tabCriar.addEventListener("click", () => {
    modoAtual = "criar";
    tabCriar.classList.add("active");
    tabEntrar.classList.remove("active");
    btnAcao.innerText = "Registrar Nova Ficha";
    statusMsg.style.display = "none";
});

// Executar Ação (Login/Criação)
btnAcao.addEventListener("click", async () => {
    const rawUser = document.getElementById("login-user").value.trim();
    const pass = document.getElementById("login-pass").value;

    if (rawUser === "" || pass === "") {
        mostrarErro("SINAL INCOMPLETO: Preencha os campos.");
        return;
    }

    // Tratamento de segurança para IDs limpos (Espaços viram traços)
    const userClean = rawUser.toLowerCase().replace(/[^a-z0-9]/g, "-");

    // Validação do Mestre
    if (rawUser.toLowerCase() === LOGIN_MESTRE && pass === SENHA_MESTRE) {
        definirSessao("mestre", "Mestre", "");
        return;
    }
    if (rawUser.toLowerCase() === LOGIN_MESTRE && pass !== SENHA_MESTRE) {
        mostrarErro("CORTA-FOGO: Chave de mestre inválida.");
        return;
    }

    const configRef = ref(db, `fichas/${userClean}/config`);

    if (modoAtual === "criar") {
        const snapshot = await get(configRef);
        if (snapshot.exists()) {
            mostrarErro("ERRO: ID de ficha já ocupado na rede.");
        } else {
            await set(ref(db, `fichas/${userClean}`), {
                config: { senha: pass, nomeExibicao: rawUser },
                dados: { vida: "100", modificadorMestre: "0" }
            });
            definirSessao("jogador", rawUser, userClean);
        }
    } else {
        const snapshot = await get(configRef);
        if (!snapshot.exists()) {
            mostrarErro("ERRO: Ficha inexistente na colônia.");
        } else {
            const config = snapshot.val();
            if (config.senha === pass) {
                definirSessao("jogador", config.nomeExibicao || rawUser, userClean);
            } else {
                mostrarErro("CORTA-FOGO: Chave de acesso incorreta.");
            }
        }
    }
});

// Sistema de persistência de Login (Sessão)
function definirSessao(role, nome, idLimpo) {
    usuarioLogado = { role, nome, idLimpo };
    localStorage.setItem("cdn_session", JSON.stringify(usuarioLogado));
    liberarPainel();
}

function verificarSessaoAtiva() {
    const saved = localStorage.getItem("cdn_session");
    if (saved) {
        usuarioLogado = JSON.parse(saved);
        liberarPainel();
    }
}

function liberarPainel() {
    document.getElementById("tela-login").style.display = "none";
    document.getElementById("conteudo-ficha").style.display = "block";

    const badgeRole = document.getElementById("user-role");
    const inputMod = document.getElementById("mod-mestre");
    const painelMestre = document.getElementById("painel-mestre-seletor");

    if (usuarioLogado.role === "mestre") {
        badgeRole.className = "badge mestre";
        badgeRole.innerText = "MESTRE";
        inputMod.disabled = false;
        painelMestre.style.display = "block";

        onValue(ref(db, "fichas"), (snapshot) => {
            const seletor = document.getElementById("select-ficha");
            const valorAntigo = seletor.value;
            seletor.innerHTML = '<option value="">-- Escolha um Personagem --</option>';
            
            if (snapshot.exists()) {
                Object.keys(snapshot.val()).forEach(idFicha => {
                    const opt = document.createElement("option");
                    opt.value = idFicha;
                    opt.innerText = idFicha.toUpperCase();
                    seletor.appendChild(opt);
                });
                if (valorAntigo && snapshot.child(valorAntigo).exists()) {
                    seletor.value = valorAntigo;
                }
            }
        });

        document.getElementById("select-ficha").addEventListener("change", (e) => {
            if (e.target.value !== "") {
                fichaMonitorada = e.target.value;
                ativarSincronizacao();
            }
        });
    } else {
        badgeRole.className = "badge jogador";
        badgeRole.innerText = usuarioLogado.nome.toUpperCase();
        inputMod.disabled = true;
        inputMod.style.background = "#141416";
        inputMod.placeholder = "Bloqueado pelo Mestre";
        fichaMonitorada = usuarioLogado.idLimpo;
        ativarSincronizacao();
    }
}

function activarSincronizacao() {
    if (firebaseListener) {
        off(ref(db, `fichas/${fichaMonitorada}/dados`));
    }

    document.getElementById("nome-ficha-ativa").innerText = fichaMonitorada.toUpperCase();

    const txtVida = document.getElementById("vidaAtual");
    const txtMod = document.getElementById("modAtual");
    const inputVida = document.getElementById("vida");
    const inputMod = document.getElementById("mod-mestre");

    firebaseListener = onValue(ref(db, `fichas/${fichaMonitorada}/dados`), (snapshot) => {
        const dados = snapshot.val();
        if (dados) {
            txtVida.innerText = dados.vida !== undefined ? dados.vida : "0";
            txtMod.innerText = dados.modificadorMestre !== undefined ? dados.modificadorMestre : "0";

            if (document.activeElement !== inputVida) inputVida.value = dados.vida || "";
            if (document.activeElement !== inputMod) inputMod.value = dados.modificadorMestre || "";
        } else {
            txtVida.innerText = "0"; txtMod.innerText = "0";
            inputVida.value = ""; inputMod.value = "";
        }
    });
}

// Enviar dados sincronizados
document.getElementById("btn-cyber").parentElement.querySelector("#btn-salvar").addEventListener("click", () => {
    if (!fichaMonitorada) return;

    const payload = usuarioLogado.role === "mestre" ? {
        vida: document.getElementById("vida").value,
        modificadorMestre: document.getElementById("mod-mestre").value
    } : {
        vida: document.getElementById("vida").value,
        modificadorMestre: document.getElementById("modAtual").innerText
    };

    set(ref(db, `fichas/${fichaMonitorada}/dados`), payload);
});

// Desconectar Sessão
document.getElementById("btn-logout").addEventListener("click", () => {
    localStorage.removeItem("cdn_session");
    window.location.reload();
});

function mostrarErro(txt) {
    statusMsg.innerText = txt;
    statusMsg.style.display = "block";
}

// Inicializa a checagem ao carregar a página
verificarSessaoAtiva();
