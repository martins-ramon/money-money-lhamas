# Money Money Lhamas 🦙💸

*Little hooves. Big dreams.* Um jogo 3D de **matemática financeira** feito para o navegador: você começa como uma lhama sem-teto e termina com uma casa na Lua, aprendendo a ganhar, poupar, investir e empreender no caminho.

O jogo é em **inglês**, com visual cartoon (estilo Looney Tunes) e uma pitada de caos à la Goat Simulator. Funciona no computador (teclado + mouse) e no celular (joystick virtual).

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento em http://localhost:5173
npm run build    # gera a versão final em dist/
npm run preview  # serve a versão final
npm test         # testes da lógica financeira (node --test)
```

Requer Node.js 20 ou mais novo. Não precisa de backend: o progresso é salvo no `localStorage` do navegador.

## Controles

| Ação | Computador | Celular |
| --- | --- | --- |
| Andar | WASD ou setas | Joystick (esquerda) |
| Olhar | Arrastar o mouse | Deslizar no lado direito da tela |
| Pular | Espaço | Botão **Jump** |
| Interagir | E ou Enter | Botão **Action** |
| Fechar painel | Esc | Botão × |

## A jornada

1. **Little beginnings** – escolha **Anna** ou **Carlos**. Trabalhe no McLlama’s, na escola (zelador) e no cinema. Cada turno é um minigame e paga **$400**. Depois do pagamento você decide: **guardar** (rende 2% por turno) ou **gastar** (comida $60 ou roupas $120). Cada emprego libera uma fantasia: Ronald McLlama, lhama com esfregão no carrinho de limpeza e Spider‑Llama.
2. **A place of your own** – junte **$1.000** repetindo os empregos e compre sua **primeira casa ou carro**, personalizável (cor e estilo). Abrem‑se os empregos avançados: fábrica de fraldas, recepção de hotel e polícia (**$900** cada, com fantasias novas). A partir daqui o **Seu Barriga** aparece em momentos aleatórios: você tem **40 segundos** para se esconder num arbusto. Se ele te acha, paga $200 de aluguel; se não, ganha $500. Ele nunca aparece enquanto você trabalha.
3. **The glow-up** – concluídos os três empregos, salto temporal de **2 anos**: você é milionário, com mansão, carros de luxo e namorada. Ladrões atacam e você defende a mansão com um taco de beisebol por **4 minutos**.
4. **Millionaire moves** – você vira dono da **Llama Labs**. Melhore a empresa e compre ações (Alphabet/YouTube, Netflix, Apple, Tesla) até o patrimônio chegar a **$1 bilhão** e liberar o traje futurista.
5. **Over the Moon** – **Elo Musk** oferece uma casa na Lua ao casal mais rico do mundo das lhamas. Fim do jogo… e início do **mundo livre**: missões secundárias (piquenique, explorador e o **quiz de matemática financeira** para ajudar a criançada) e o **churrasco com chimarrão** de comemoração.

Bônus: 12 moedas da sorte escondidas pela cidade e lhamas cidadãs que saem voando quando você esbarra nelas.

## Conceitos de matemática financeira no jogo

| Conceito | Onde aparece |
| --- | --- |
| Juros simples e compostos | Cofrinho rende 2% por turno sobre o saldo (juros sobre juros) |
| Renda × gasto × poupança | Decisão guardar/gastar após cada pagamento; relatório com taxa de poupança |
| Meta financeira | Juntar $1.000 para o primeiro bem; quantos turnos faltam |
| Ativos e depreciação | Casa × carro na primeira compra |
| Despesas fixas e risco | Aluguel do Seu Barriga |
| Patrimônio líquido | Carteira + poupança + (ações × preço) |
| Retorno sobre investimento (payback) | Custo da melhoria ÷ ganho por tick |
| Mercado de ações | Preços variam até ±8% por tick; lucro/prejuízo na venda |
| Porcentagem | Quiz da missão Helper |

## Estrutura do código

```
index.html          página única
src/main.js         HUD, painéis, cutscenes, aluguel, loop principal
src/model.js        estado do jogo e regras financeiras (puro, testável)
src/world.js        cena 3D (three.js): cidade, Lua, lhamas, Seu Barriga, NPCs
src/minigames.js    minigames dos empregos, defesa da mansão e quiz
src/icons.js        ícones SVG
src/style.css       interface cartoon
tests/model.test.js testes das regras (node:test)
```

Abra o jogo com `?debug` na URL para expor `window.__mml` (estado, mundo e teletransporte) e facilitar testes.
