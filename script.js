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

window.salvarVida = function () {
  const vida = document.getElementById("vida").value;

  set(ref(db, "jogador1/vida"), {
    valor: vida
  });
};
const vidaRef = ref(db, "jogador1/vida");

onValue(vidaRef, (snapshot) => {
  const data = snapshot.val();

  if (data) {
    document.getElementById("vida").value = data.valor;
  }
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "SUA_CHAVE",
  authDomain: "chuva-de-neon.firebaseapp.com",
  databaseURL: "https://chuva-de-neon-default-rtdb.firebaseio.com",
  projectId: "chuva-de-neon",
  storageBucket: "chuva-de-neon.appspot.com",
  messagingSenderId: "994935691317",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.salvarVida = function () {
  const vida = document.getElementById("vida").value;

  set(ref(db, "jogador1/vida"), {
    valor: vida
  });
};

const vidaRef = ref(db, "jogador1/vida");

onValue(vidaRef, (snapshot) => {
  const data = snapshot.val();

  if (data) {
    document.getElementById("vidaAtual").innerText = data.valor;
  }
});


