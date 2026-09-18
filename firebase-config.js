// =====================================================================
// CHUVA DE NEON — Configuração Firebase (compartilhada)
// =====================================================================
// Mantenha este arquivo igual em todas as páginas do site.
// Se você recriar o projeto Firebase, só precisa trocar os valores aqui.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU-e21zaoVuW-1Wjzj5b6CfcyOZDj2BsE",
  authDomain: "chuva-de-neon.firebaseapp.com",
  databaseURL: "https://chuva-de-neon-default-rtdb.firebaseio.com",
  projectId: "chuva-de-neon",
  storageBucket: "chuva-de-neon.firebasestorage.app",
  messagingSenderId: "994935691317",
  appId: "1:994935691317:web:418a37b0700b2bd083b97c"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ---------------------------------------------------------------------
// Correção do bug "só atualiza depois de dar F5": quando o navegador
// restaura a página a partir do bfcache (back/forward cache — acontece
// ao navegar entre páginas do site e voltar, sem recarregar de verdade),
// ele mata à força o WebSocket do Firebase (ver console: "WebSocket
// connection ... failed: Page entered Back-Forward Cache"). A aba volta
// a ficar visível e parece normal, mas o listener onValue fica "surdo"
// — não recebe mais nenhuma atualização em tempo real (item aprovado,
// dano, dinheiro etc.) até um reload manual, porque o SDK do Firebase
// não reabre essa conexão sozinho nesse caso específico.
// Solução: se a página foi restaurada do bfcache (event.persisted),
// força um reload completo — isso garante uma conexão nova e os dados
// mais recentes, sem depender do jogador/Mestre perceberem e apertarem
// F5 por conta própria.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});
