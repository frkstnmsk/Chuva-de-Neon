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

// 1. FUNÇÃO PARA SALVAR A VIDA NO BANCO (Chamada pelo botão do HTML)
window.salvarVida = function () {
  const campoVida = document.getElementById("vida");
  const valorVida = campoVida.value;

  // Evita enviar campos vazios
  if (valorVida === "") {
    alert("Por favor, digite um número antes de salvar.");
    return;
  }

  set(ref(db, "jogador1"), {
    vida: valorVida
  })
  .then(() => {
    console.log("Vida salva com sucesso no Firebase!");
  })
  .catch((error) => {
    console.error("Erro ao salvar no Firebase:", error);
  });
};

// 2. ESCUTAR MUDANÇAS EM TEMPO REAL (Atualiza todos os aparelhos conectados)
const vidaRef = ref(db, "jogador1");
const txtVidaAtual = document.getElementById("vidaAtual");
const inputVida = document.getElementById("vida");

onValue(vidaRef, (snapshot) => {
  const dados = snapshot.val();
  
  if (dados && dados.vida !== undefined) {
    // Atualiza o texto grande na tela com o valor real do banco de dados
    txtVidaAtual.innerText = dados.vida;
    
    // Se o usuário não estiver com o campo de digitação selecionado (focado), 
    // atualiza o input dele com o valor atual do banco automaticamente.
    if (document.activeElement !== inputVida) {
      inputVida.value = dados.vida;
    }
  } else {
    txtVidaAtual.innerText = "Sem dados";
  }
}, (error) => {
  console.error("Erro ao ler dados em tempo real: ", error);
});
