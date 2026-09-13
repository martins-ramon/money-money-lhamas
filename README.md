# Money Money Lhamas 🦙💸

*Little hooves. Big dreams.* Um jogo 3D de **matemática financeira** feito para o navegador: você começa como uma lhama sem-teto e termina com uma casa na Lua, aprendendo a ganhar, poupar, investir e empreender no caminho.

O jogo é em **inglês**, com visual cartoon (estilo Looney Tunes) e uma pitada de caos à la Goat Simulator. Funciona no computador (teclado + mouse) e no celular (joystick virtual).

## Como rodar

```bash
npm ci
npm run dev      # servidor de desenvolvimento em http://localhost:5000
npm run build    # gera a versão final em dist/
npm run preview  # confere a versão final em http://localhost:4173
npm test         # testes da lógica financeira (node --test)
```

Requer Node.js 22.12 ou mais novo (com nvm, execute `nvm use`). `npm start` também inicia o desenvolvimento. Abra http://localhost:5000 no navegador; mantenha o terminal rodando e use Ctrl+C para encerrar. Se a porta estiver ocupada, encerre o outro servidor antes de iniciar.

Não precisa de backend: o progresso é salvo no `localStorage` do navegador. Cada navegador e endereço mantém seu próprio progresso; o save de localhost não é transferido automaticamente para o Replit.

## Rodar e hospedar no Replit

1. Importe este repositório no Replit, incluindo o arquivo oculto `.replit`.
2. Clique em **Run**. A configuração inicia o jogo; abra o **Preview** para jogar. O servidor escuta em `0.0.0.0:5000`, mapeado para a porta externa 80, e aceita o domínio do proxy do Replit.
3. Quando o jogo estiver pronto, use **Publish** com o tipo **Static**. O arquivo `.replit` configura o build `npm ci --include=dev && npm run build` e a pasta pública `dist`.

A publicação serve os arquivos finais, sem precisar manter um servidor Node.js. `npm run preview` serve apenas para conferir o build localmente. Configuração baseada na [documentação do Replit](https://docs.replit.com/features/project-setup/configuration) e na [configuração de publicação estática](https://docs.replit.com/features/deployment-customization/static-deployments-advanced).

## Controles

| Ação | Computador | Celular |
| --- | --- | --- |
| Andar | WASD ou setas | Joystick (esquerda) |
| Correr | Segurar Shift | Botão **Run** (ativa/desativa) |
| Olhar | Arrastar o mouse | Deslizar no lado direito da tela |
| Pular | Espaço | Botão **Jump** |
| Interagir | E ou Enter | Botão **Action** |
| Fechar painel | Esc | Botão × |
| Guia da cidade | M ou botão de mapa | Botão de mapa |
| Pausar | Esc durante a exploração | Menu |

## Experiência do jogador

- Tela inicial com continuação da partida, personagens 3D e controle de som.
- Missão atual com progresso, bússola, distância e um feixe dourado no destino. O mapa permite escolher outro local; durante a cobrança, o guia aponta para o arbusto mais próximo. A indicação é em linha reta: contorne os prédios pelas ruas.
- Movimento relativo à câmera, aceleração suave, corrida, tolerância de 150 ms para o comando de salto e gravidade menor na Lua.
- Partículas de coleta, salto e impacto; celebrações de empregos, roupas, compras, melhorias e missões. O conjunto de partículas 3D é limitado a 96 instâncias.
- Menus pausam a exploração e a cobrança. Ao sair da aba durante a exploração, o jogo abre o menu. A empresa continua rendendo no painel de negócios, preservando a quantidade de ações digitada; fica pausada nos demais painéis.
- Minigames com progresso visível, atalhos numéricos para as opções e setas na patrulha policial. Desistir encerra as esperas da atividade e não paga salário.
- Defesa da mansão com quatro fases, recorde de sequência, botão de pausa e ataque com Espaço ao ladrão mais próximo. A pausa também funciona com Esc; após trocar de aba, é preciso retomar manualmente.
- Menu com qualidade **High/Balanced**, movimento reduzido e opção de esconder o minimapa. Preferências são salvas separadamente da partida; o jogo continua funcionando se o armazenamento estiver bloqueado.
- Navegação dos painéis pelo teclado, foco visível e mensagens acessíveis. O churrasco final é liberado após as três missões secundárias.

`npm test` executa testes das regras, direções em diferentes ângulos da câmera, joystick, missões, preferências e minigames em DOM simulado. Esses testes não substituem a validação visual em navegadores e celulares reais.

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
src/experience.js   controles, missões, preferências e ciclo das atividades
src/feedback.js     minimapa e celebrações
src/style.css       interface cartoon
tests/model.test.js testes das regras (node:test)
tests/experience.test.js controles, progressão e cancelamento
tests/minigames.test.js interações e pausa em DOM simulado
```

Abra o jogo com `?debug` na URL para expor `window.__mml` (estado, mundo e teletransporte) e facilitar testes.
