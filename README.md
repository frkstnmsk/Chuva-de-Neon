# Chuva de Neon // Ficha Interativa

Ficha de personagem automatizada e multiplayer (em tempo real) pro RPG **Chuva de Neon**, feita pra rodar de graça no GitHub Pages + Firebase Realtime Database.

## O que tem aqui

- `index.html` + `auth.js` — tela de login / registro de ficha.
- `ficha.html` + `ficha.js` + `ficha.css` — a ficha em si, com abas.
- `regras.js` — todas as fórmulas do manual (Velocidade, PV, Energia, etc) num arquivo só.
- `firebase-config.js` — config do Firebase, compartilhada entre as páginas.
- `style.css` — identidade visual (a mesma estética do seu mapa interativo).

## Como funciona o acesso

- **Mestre**: login `frkstnmsk` + a senha definida no código (`auth.js`, constante `SENHA_MESTRE`). Vê um seletor pra abrir a ficha de qualquer jogador e editar qualquer campo, inclusive Nível e XP.
- **Jogador**: qualquer outro login. Na aba "Registrar Nova Ficha", escolhe um login, uma senha e o nome da ficha. Esse login cria uma ficha vazia vinculada àquele login/senha. Da próxima vez, entra pela aba "Entrar" com o mesmo login/senha.
- Campos **Nível** e **XP** só o Mestre edita — pro jogador eles aparecem visualmente "apagados" e não recebem clique. Se quiser liberar mais campos assim (ou liberar esses dois), é só editar a lista `CAMPOS_SO_MESTRE` no topo do `ficha.js`.

## O sistema de modificadores (o pulo do gato)

Toda vantagem, desvantagem, item de inventário, especialização ou fato universal pode carregar uma lista de **modificadores automáticos**: cada um diz "some X no alvo Y". O alvo pode ser um atributo primário, um atributo secundário (Velocidade, Agilidade, Percepção, Massa Corpórea, Força de Vontade), PV/Energia/Carga máximos, uma perícia específica pelo nome, ou rótulos gerais (dano, defesa, testes sociais/mentais/físicos).

Exemplo: a desvantagem "Manco" pode ter um modificador `Velocidade -1`. No momento em que você salva essa desvantagem, a Velocidade calculada da ficha já cai automaticamente — sem precisar editar nada na aba de Atributos. O mesmo vale pra um colete balístico dando `+3` em "Defesa", ou uma especialização dando `+2` numa perícia puntual.

Passe o mouse (ou toque e segure, no celular) sobre um valor calculado em verde pra ver o detalhamento: base do manual + cada ajuste, com a origem de cada um.

## Configurando o Firebase

O projeto já está apontando pro Firebase que você criou (`chuva-de-neon`). Só falta uma coisa importante: **as regras do Realtime Database**. Sem regras, ou com regras abertas demais, qualquer pessoa com o link consegue ler/escrever em qualquer ficha (inclusive ler todas as senhas, que ficam em texto puro).

No painel do Firebase, vá em **Realtime Database → Regras** e use como ponto de partida:

```json
{
  "rules": {
    "fichas": {
      ".read": true,
      ".write": true
    }
  }
}
```

Isso libera leitura/escrita pra qualquer um que tenha a URL do banco (suficiente pra rodar entre amigos que confiam uns nos outros, mas não impede alguém de abrir o DevTools e ler as senhas de todo mundo, incluindo a sua). Se quiser travar mais — por exemplo, impedir que um jogador delete a ficha de outro — dá pra evoluir essas regras usando Firebase Auth (login de verdade) em vez de comparar senha em texto puro no JavaScript, mas isso é um projeto mais avançado, exige reescrever a autenticação. Pra uma mesa entre amigos, o esquema atual já resolve o que você pediu.

## Publicando no GitHub Pages

1. Suba todos os arquivos deste pacote pra raiz do seu repositório (substituindo os antigos `index.html`, `script.js`, `style.css`).
2. Em **Settings → Pages**, escolha a branch (`main`) e a pasta raiz (`/`).
3. Acesse `https://seu-usuario.github.io/seu-repositorio/`.
4. Quando quiser linkar o mapa (`CdN.html`), basta subir o arquivo no mesmo repositório (ex: como `mapa.html`) e colocar um link entre as páginas — não fizemos essa integração agora porque você pediu pra focar só na ficha primeiro.

## Editando perícias, fórmulas ou textos depois

- Mudar uma fórmula (ex: se um dia Velocidade passar a ser calculada diferente): edite `regras.js`, função `ATRIBUTOS_SECUNDARIOS`.
- Mudar o limite de nível de perícia (atualmente 0–5) ou o limite de atributo primário (atualmente 0–7): são validações simples dentro de `ficha.js` (`salvarEntidadeAtual`) e no atributo `max` dos inputs em `ficha.js`/`montarGridsEstaticas`.
- Mudar a senha do Mestre: `auth.js`, constantes `LOGIN_MESTRE` e `SENHA_MESTRE`. Lembre de trocar lá.

## Limitação importante de segurança

Senhas de jogador ficam salvas sem criptografia no banco. Isso é proporcional ao uso (mesa entre amigos, não um produto público), mas vale saber: se um jogador mais técnico abrir as ferramentas de desenvolvedor do navegador e investigar as chamadas de rede, ele consegue ver a URL do Firebase e, com as regras sugeridas acima, ler todas as fichas e senhas registradas — inclusive a do Mestre, se ele souber ler o `auth.js` publicado no repositório (o login/senha do Mestre estão no código-fonte, que é público no GitHub a menos que o repositório seja privado). Se isso for uma preocupação real pra sua mesa, me avise e a gente pensa numa segunda camada (por exemplo, mover a senha do Mestre pra fora do código, ou migrar pra Firebase Authentication de verdade).
