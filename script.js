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

// SALVAR VIDA
window.salvarVida = function () {
  const vida = document.getElementById("vida").value;

  set(ref(db, "jogador1"), {
    vida: vida
  });
};

// LER VIDA EM TEMPO REAL
const vidaRef = ref(db, "jogador1");

onValue(vidaRef, (snapshot) => {
  const data = snapshot.val();

  if (data) {
    document.getElementById("vida").value = data.vida;
    document.getElementById("vidaAtual").innerText = data.vida;
  }
});
