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

// ACESSO DO MESTRE CANÔNICO
const LOGIN_MESTRE = "frkstnmsk";
const SENHA_MESTRE = "31outcaseri";

let modoAtual = "entrar";
let usuarioLogado = { role: "jogador", nome: "", idLimpo: "" };
let fichaMonitorada = "";
let firebaseListener = null;

const tabEntrar = document.getElementById("tab-entrar");
const tabCriar = document.getElementById("tab-criar");
const btnAcao = document.getElementById("btn-acao");
const statusMsg = document.getElementById("login-status-msg");
const formFicha = document.getElementById("form-ficha-dados");

// Alternar Abas Login
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

// Ação de Login / Criação
btnAcao.addEventListener("click", async () => {
    const rawUser = document.getElementById("login-user").value.trim();
    const pass = document.getElementById("login-pass").value;

    if (rawUser === "" || pass === "") {
        mostrarErro("SINAL INCOMPLETO: Preencha os campos.");
        return;
    }

    const userClean = rawUser.toLowerCase().replace(/[^a-z0-9]/g, "-");

    // Validação Mestre
    if (rawUser.toLowerCase() === LOGIN_MESTRE && pass === SENHA_MESTRE) {
        definirSessao("mestre", "Mestre", "");
        return;
    }
    if (rawUser.toLowerCase() === LOGIN_MESTRE && pass !== SENHA_MESTRE) {
        mostrarErro("CORTA-FOGO: Senha de mestre inválida.");
        return;
    }

    const configRef = ref(db, `fichas/${userClean}/config`);

    if (modoAtual === "criar") {
        const snapshot = await get(configRef);
        if (snapshot.exists()) {
            mostrarErro("ERRO: ID de ficha já ocupado na rede.");
        } else {
            // Cria a ficha estruturada com valor padrão vazio para todos os campos pedidos
            const camposIniciais = {
                nome: rawUser, vulgo: "", idade: "", nacionalidade: "", funcao: "", maldade: "0", remorso: "0", status: "0",
                dm: "", void: "", p2k: "", rabbithole: "", p2c: "", creators: "",
                nivel: "1", xp: "0", pvs: "100", energia: "10",
                forca: "0", constituicao: "0", destreza: "0", sabedoria: "0", inteligencia: "0", raciocinio: "0", carisma: "0", manipulacao: "0",
                velocidade: "0", agilidade: "0", percepcao: "0", massa_corporea: "0", forca_vontade: "0",
                pericias: "", desvantagens: "", determinacoes: ""
            };

            await set(ref(db, `fichas/${userClean}`), {
                config: { senha: pass, nomeExibicao: rawUser },
                dados: camposIniciais
            });
            definirSessao("jogador", rawUser, userClean);
        }
    } else {
        const snapshot = await get(configRef);
        if (!snapshot.exists()) {
            mostrarErro("ERRO: Ficha inexistente no sistema.");
        } else {
            const config = snapshot.val();
            if (config.senha === pass) {
                definirSessao("jogador", config.nomeExibicao || rawUser, userClean);
            } else {
                mostrarErro("CORTA-FOGO: Senha incorreta.");
            }
        }
    }
});

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
    const painelMestre = document.getElementById("painel-mestre-seletor");

    if (usuarioLogado.role === "mestre") {
        badgeRole.className = "badge mestre";
        badgeRole.innerText = "MESTRE";
        painelMestre.style.display = "block";

        onValue(ref(db, "fichas"), (snapshot) => {
            const seletor = document.getElementById("select-ficha");
            const valorAntigo = seletor.value;
            seletor.innerHTML = '<option value="">-- Escolha um Personagem da Rede --</option>';
            
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
        fichaMonitorada = usuarioLogado.idLimpo;
        ativarSincronizacao();
    }
}

// SINCRONIZAÇÃO TOTAL DOS CAMPOS COM O FIREBASE (TEMPO REAL)
function ativarSincronizacao() {
    if (firebaseListener) {
        off(ref(db, `fichas/${fichaMonitorada}/dados`));
    }

    document.getElementById("nome-ficha-ativa").innerText = fichaMonitorada.toUpperCase();

    firebaseListener = onValue(ref(db, `fichas/${fichaMonitorada}/dados`), (snapshot) => {
        const dados = snapshot.val();
        if (dados) {
            // Mapeia inteligentemente todos os inputs da ficha e joga o valor vindo do banco
            Object.keys(dados).forEach(key => {
                const input = formFicha.elements[key];
                if (input && document.activeElement !== input) {
                    input.value = dados[key];
                }
            });
        }
    });
}

// SALVAR TODOS OS DADOS NO BANCO
document.getElementById("btn-salvar").addEventListener("click", () => {
    if (!fichaMonitorada) {
        alert("Nenhum link ativo com uma ficha.");
        return;
    }

    const formData = new FormData(formFicha);
    const dadosParaEnviar = {};

    formData.forEach((value, key) => {
        dadosParaEnviar[key] = value;
    });

    set(ref(db, `fichas/${fichaMonitorada}/dados`), dadosParaEnviar)
    .then(() => alert("SINAL DE PROTOCOLO SUCEDIDO: Ficha salva no Firebase!"))
    .catch((err) => console.error("Erro ao salvar:", err));
});

// LOGOUT
document.getElementById("btn-logout").addEventListener("click", () => {
    localStorage.removeItem("cdn_session");
    window.location.reload();
});

function mostrarErro(txt) {
    statusMsg.innerText = txt;
    statusMsg.style.display = "block";
}

// Inicializa a escuta
verificarSessaoAtiva();
