# Money Money Lhamas 🦙💸

*Little hooves. Big dreams.* Um jogo 3D de **matemática financeira** feito para o navegador: você começa como uma lhama sem-teto e termina com uma casa na Lua, aprendendo a ganhar, poupar, investir e empreender no caminho.

O jogo está disponível em **português e inglês**, com visual cartoon (estilo Looney Tunes) e uma pitada de caos à la Goat Simulator. Funciona no computador (teclado + mouse) e no celular (joystick virtual).

Escolha **Português** ou **English** na tela inicial ou no menu durante a partida. No primeiro acesso, o jogo usa português quando esse é o idioma do navegador; nos demais casos, usa inglês. Sua escolha fica salva separadamente do progresso e vale nas próximas visitas. A troca é imediata: atualiza menus, instruções, missões, minigames, mensagens e placas da cidade e da Lua, sem reiniciar a partida nem desconectar da sala multiplayer. Cada jogador pode usar seu próprio idioma. A moeda continua sendo o **dólar (USD)**, com os mesmos preços e saldos; selecionar português não converte os valores para reais.

## Como rodar

```bash
npm ci
npm run dev      # servidor de desenvolvimento em http://localhost:5000
npm run build    # gera a versão final em dist/
npm run preview  # confere o build e as salas em http://localhost:4173
npm run serve    # produção: serve dist/ e a API em http://localhost:5000
npm test         # regras, controles, missões, veículos e salas (node --test)
```

Requer Node.js 22.12 ou mais novo (com nvm, execute `nvm use`). `npm start` também inicia o desenvolvimento. Abra http://localhost:5000 no navegador; mantenha o terminal rodando e use Ctrl+C para encerrar. Se a porta estiver ocupada, encerre o outro servidor antes de iniciar.

O progresso continua salvo no `localStorage` do navegador. Cada navegador e endereço mantém seu próprio progresso; o save de localhost não é transferido automaticamente para o Replit. O multiplayer usa uma API Node.js no mesmo endereço do jogo. Ela já está disponível em `dev`, `preview` e `serve`; não precisa de banco de dados, serviço externo ou segredo. Execute `npm run build` antes de `npm run serve`. A porta de produção pode ser definida pela variável `PORT` (padrão: 5000).

## Rodar e hospedar no Replit

1. Importe este repositório no Replit, incluindo o arquivo oculto `.replit`.
2. Clique em **Run**. Abra o **Preview** para jogar. O servidor escuta em `0.0.0.0:5000`, mapeado para a porta externa 80, e serve também a API de salas.
3. Em **Publishing → Adjust settings**, selecione **Reserved VM**. A configuração local usa `deploymentTarget = "vm"`, build `npm ci --include=dev && npm run build` e comando de execução `npm run serve`.
4. Mantenha uma única instância do servidor Node.js: as salas ficam na memória desse processo. Publique a nova versão após conferir as configurações.

**Publicações existentes precisam de ajuste manual:** se o projeto já estiver publicado como **Static**, altere o tipo para **Reserved VM** no painel do Replit. Uma publicação estática não executa a API multiplayer. Os arquivos do repositório foram preparados para VM; a publicação em nuvem ainda não foi alterada.

O Replit documenta a escolha do tipo em [Deployment types](https://docs.replit.com/features/publishing/deployment-types) e os comandos de build/execução em [App Configuration](https://docs.replit.com/features/project-setup/configuration).

O log `VITE ... ready` é esperado no **Run/Preview**. Na publicação com `npm run serve`, o log é `Money Money Lhamas is running on port 5000` (ou a porta definida em `PORT`). Depois de atualizar o código, republique para aplicar as correções no domínio público.

## Jogar online com amigos

Abra **Jogar online / Play online**, escolha um nome e crie uma sala. Compartilhe o código de **seis caracteres** ou o link exibido para que os amigos entrem na mesma sala, com até **oito jogadores**. Todos precisam acessar a mesma instalação do jogo; uma sala no desenvolvimento local não aparece na publicação do Replit.

As salas mostram a presença, posição, roupa, dança, voo e veículo dos amigos. Para enxergar outro jogador, os dois precisam estar no mesmo lugar: cidade ou Lua. Dinheiro, missões, história e salvamento continuam independentes em cada navegador; NPCs e atividades são simulados localmente. Não há chat.

A sincronização usa requisições HTTP curtas com resposta JSON completa, combinando envio de posição e recebimento dos amigos. A abertura da sala não depende de um fluxo SSE contínuo, que pode ficar retido por intermediários da hospedagem e provocar timeout. O cliente só indica conexão concluída após receber uma resposta autenticada válida.

As salas são temporárias. Reiniciar ou republicar o servidor descarta as salas, sem apagar os saves dos navegadores. Após perder a conexão, entre novamente; se a sala já tiver sido encerrada, crie outra e compartilhe o novo código. O jogo individual continua disponível fora das salas.

## Controles

| Ação | Computador | Celular |
| --- | --- | --- |
| Andar | WASD ou setas | Joystick (esquerda) |
| Correr | Segurar Shift | Botão **Correr / Run** (ativa/desativa) |
| Olhar | Arrastar o mouse | Deslizar no lado direito da tela |
| Pular | Espaço | Botão **Pular / Jump** |
| Interagir, entrar ou sair de veículo | E ou Enter | Botão **Ação / Action** |
| Dirigir, pilotar ou guiar planador | WASD ou setas | Joystick |
| Voar ou pousar com skin compatível | F | Botão **Voar / Fly** |
| Dançar ou parar de dançar | B | Botão **Dançar / Dance** |
| Atirar leite com Cyborg | Q | Botão **Leite / Milk** |
| Fechar painel | Esc | Botão × |
| Guia da cidade | M ou botão de mapa | Botão de mapa |
| Pausar | Esc durante a exploração | Menu |

## Experiência do jogador

- Cidade ampliada para raio de 98 unidades, com novos quarteirões, parque, praia, marina e NPCs humanos adultos cartoon, incluindo banhistas e mulher de biquíni.
- Três carros disponíveis pela cidade e o carro da primeira compra podem ser dirigidos. Barco e iate saem da marina; a ação de sair devolve o jogador e a embarcação ao cais. Três estações de planador lançam o jogador, que guia a descida até pousar.
- Novas skins gratuitas desde o início: **Superman**, **Charlotte Katakuri** (One Piece), **Skeleton**, **Dragon**, **Cyborg**, **Human** e **Zombie**. Superman, Cyborg e Dragon voam; Cyborg tem botas propulsoras e dispara leite. O guarda-roupa preserva as fantasias desbloqueadas pela história.
- Botão de dança e controles de habilidades também no celular. Andar interrompe a dança. Durante a cobrança do Seu Barriga, é preciso resolver a perseguição antes de entrar em veículos ou ativar o voo.
- Depois de liberar o mundo livre, viaje novamente à Lua e volte pelo menu ou pelos portais, mantendo dinheiro, missões e progresso da história.
- Seis missões extras de finanças, disponíveis desde o começo, sobre orçamento, desconto, poupança, preço por unidade, troco e planejamento de uma barraca de limonada. Cada uma tem duas perguntas explicadas e paga **$150 uma única vez**; revisitar pelo catálogo permite estudar novamente sem repetir a recompensa.
- Tela inicial com continuação da partida, personagens 3D e controle de som.
- Missão atual com progresso, bússola, distância e um feixe dourado no destino. O mapa permite escolher outro local; durante a cobrança, o guia aponta para o arbusto mais próximo. A indicação é em linha reta: contorne os prédios pelas ruas.
- Movimento relativo à câmera, aceleração suave, corrida, tolerância de 150 ms para o comando de salto e gravidade menor na Lua.
- Partículas de coleta, salto e impacto; celebrações de empregos, roupas, compras, melhorias e missões. O conjunto de partículas 3D é limitado a 96 instâncias.
- Menus pausam a exploração e a cobrança. Ao sair da aba durante a exploração, o jogo abre o menu. A empresa continua rendendo no painel de negócios, preservando a quantidade de ações digitada; fica pausada nos demais painéis.
- Minigames com progresso visível, atalhos numéricos para as opções e setas na patrulha policial. Desistir encerra as esperas da atividade e não paga salário.
- Defesa da mansão com quatro fases, recorde de sequência, botão de pausa e ataque com Espaço ao ladrão mais próximo. A pausa também funciona com Esc; após trocar de aba, é preciso retomar manualmente.
- Menu com qualidade **High/Balanced**, movimento reduzido e opção de esconder o minimapa. Preferências são salvas separadamente da partida; o jogo continua funcionando se o armazenamento estiver bloqueado.
- Navegação dos painéis pelo teclado, foco visível e mensagens acessíveis. O churrasco final é liberado após as três missões secundárias.

`npm test` executa testes das regras, direções em diferentes ângulos da câmera, joystick, missões, preferências, limites dos veículos, viagens e salas multiplayer, além dos minigames em DOM simulado. Esses testes não substituem a validação visual em navegadores e celulares reais.

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
| Porcentagem e descontos | Quiz da missão Helper e missão Spot the real discount |
| Orçamento e troco | Plan your pocket money e Check your change |
| Preço por unidade | Compare the snack packs |
| Planejamento de um pequeno negócio | Run a lemonade stand |

## Estrutura do código

```
index.html                  página única
server.mjs                  servidor de produção: dist/ + API de salas
server/rooms.js             salas temporárias, sessões e eventos multiplayer
vite.config.js              Vite e API de salas em dev/preview
src/main.js                 HUD, painéis, seleção de idioma, cutscenes e loop principal
src/i18n.js                 idioma ativo, preferência salva e traduções de apresentação
src/model.js                estado, salvamento e regras financeiras
src/world.js                cena 3D, locomoção, veículos e habilidades
src/world-localization.js   rótulos do mundo e placas traduzidos sem recriar a cena
src/world-expansion.js      novos bairros, praia, marina, portais e limites
src/avatars.js              skins e humanos cartoon construídos em Three.js
src/finance-missions.js     catálogo das seis missões financeiras
src/multiplayer.js          cliente de salas e sincronização de presença
src/peers.js                representação 3D dos outros jogadores
src/minigames.js            empregos, defesa da mansão e quiz
src/icons.js                ícones SVG
src/experience.js           controles, missões, preferências e atividades
src/feedback.js             minimapa e celebrações
src/style.css               interface cartoon
tests/model.test.js         regras e compatibilidade dos saves
tests/finance-missions.test.js missões e recompensas
tests/experience.test.js    controles, progressão e cancelamento
tests/minigames.test.js     interações e pausa em DOM simulado
tests/mansion.test.js       entrada e enquadramento da mansão
tests/world-adventure.test.js limites, veículos, voo e localização
tests/world-language.test.js troca de idioma preservando mundo, veículos e texturas
tests/multiplayer.test.js   salas, clientes e servidor de produção
```

A preferência de idioma usa a chave `money-money-lhamas-language-v1` no `localStorage`, independente da partida e das demais preferências. Se o armazenamento estiver bloqueado, a seleção continua funcionando durante a sessão. As traduções mudam apenas a apresentação: IDs, nomes internos de skins, mensagens de sincronização, saldos e saves mantêm o mesmo contrato. `World.refreshLanguage()` atualiza rótulos e texturas das placas, preservando as posições e o veículo em uso.

Abra o jogo com `?debug` na URL para expor `window.__mml` (estado, mundo, teletransporte e multiplayer) e facilitar testes.
