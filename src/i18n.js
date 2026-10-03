// Presentation language is independent of saves, room messages and stable game IDs.
export const LANGUAGE_KEY = 'money-money-lhamas-language-v1';
let language = 'en';
export const getLanguage = () => language;
export const locale = () => language === 'pt' ? 'pt-BR' : 'en-US';
export const t = (english, portuguese) => language === 'pt' ? (portuguese ?? english) : english;

export function setLanguage(value) {
  if (!['en', 'pt'].includes(value) || value === language) return false;
  language = value;
  return true;
}

export function readLanguage(storage, browserLanguage = 'en') {
  try {
    const saved = storage?.getItem(LANGUAGE_KEY);
    if (['en', 'pt'].includes(saved)) return saved;
  } catch { /* Language selection still works when storage is unavailable. */ }
  return /^pt(?:-|$)/i.test(String(browserLanguage)) ? 'pt' : 'en';
}

const translations = new Map(Object.entries({
  'Street dreamer': 'Sonhador das ruas',
  'Fresh streetwear': 'Roupa urbana',
  'Ronald McLlama': 'Ronald McLlama',
  'Mop-top & cleaning cart': 'Esfregão e carrinho de limpeza',
  'Spider-Llama': 'Lhama-Aranha',
  'The very full diaper': 'A fralda bem cheia',
  'Grand hotel concierge': 'Concierge do Grande Hotel',
  'Officer Llama': 'Lhama policial',
  'Lunar billionaire': 'Bilionário lunar',
  'Superman': 'Superman',
  'Charlotte Katakuri': 'Charlotte Katakuri',
  'Skeleton': 'Esqueleto', 'Dragon': 'Dragão', 'Cyborg': 'Ciborgue', 'Human': 'Humano', 'Zombie': 'Zumbi',
  'Girlfriend': 'Companheira',
  'McLlama’s': 'McLlama’s',
  'Sunny Hooves School': 'Escola Cascos do Sol',
  'Starlight Cinema': 'Cinema Luz das Estrelas',
  'Tiny Tails Factory': 'Fábrica Pequenas Caudas',
  'The Grand Llama': 'O Grande Lhama',
  'Hooves PD': 'Delegacia dos Cascos',
  'Burger crew': 'Atendente da lanchonete',
  'School janitor': 'Zelador da escola',
  'Cinema assistant': 'Assistente de cinema',
  'Diaper inspector': 'Inspetor de fraldas',
  'Hotel receptionist': 'Recepcionista de hotel',
  'Police officer': 'Policial',
  'Build 5 perfect burgers': 'Monte 5 hambúrgueres perfeitos',
  'Clean up 8 muddy spots': 'Limpe 8 manchas de lama',
  'Match 6 movie tickets': 'Confira 6 ingressos de cinema',
  'Sort 8 clean and dirty diapers': 'Separe 8 fraldas limpas e sujas',
  'Give 6 guests the right room key': 'Entregue a chave certa a 6 hóspedes',
  'Remember 5 patrol routes': 'Memorize 5 rotas de patrulha',
  'Big buns. Bigger ambitions.': 'Grandes hambúrgueres. Ambições maiores ainda.',
  'A clean start to your fortune.': 'Um começo limpinho para sua fortuna.',
  'Your origin story starts here.': 'Sua história começa aqui.',
  'An unexpectedly rewarding shift.': 'Um turno com uma recompensa surpreendente.',
  'Five stars. Four little hooves.': 'Cinco estrelas. Quatro casquinhos.',
  'Protect, serve, and save.': 'Proteger, servir e poupar.',
  'Little beginnings': 'Pequenos começos',
  'A place of your own': 'Um cantinho só seu',
  'The glow-up': 'A grande virada',
  'Millionaire moves': 'Passos de milionário',
  'Over the Moon': 'Rumo à Lua',
  'house': 'casa', 'car': 'carro', 'classic': 'clássico', 'sporty': 'esportivo', 'cozy': 'aconchegante',
  'Plan your pocket money': 'Planeje sua mesada',
  'Spot the real discount': 'Descubra o desconto de verdade',
  'Grow a savings goal': 'Poupe para alcançar sua meta',
  'Compare the snack packs': 'Compare os pacotes de lanche',
  'Check your change': 'Confira seu troco',
  'Run a lemonade stand': 'Cuide de uma banca de limonada',
}));

// Content modules can add their own source text without introducing module cycles.
export function registerTranslations(entries) {
  for (const [english, portuguese] of Object.entries(entries)) translations.set(english, portuguese);
}

export function nameLabel(value) {
  if (language !== 'pt' || typeof value !== 'string') return value;
  if (translations.has(value)) return translations.get(value);
  const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
  return translations.has(capitalized) ? translations.get(capitalized).toLocaleLowerCase('pt-BR') : value;
}

const ledger = {
  'Savings interest · 2% per shift': 'Juros da poupança · 2% por turno',
  'Moved wallet to savings': 'Dinheiro transferido para a poupança',
  'A delicious meal': 'Uma refeição deliciosa',
  'Outsmarted Mr. Barriga!': 'Você despistou o Seu Barriga!',
  'Rent paid to Mr. Barriga': 'Aluguel pago ao Seu Barriga',
  'Two years of hard work': 'Dois anos de trabalho duro',
  'Stolen during the robbery': 'Dinheiro levado pelos ladrões',
  'Found a lucky coin': 'Moeda da sorte encontrada',
  'Free-world mission completed': 'Missão do mundo livre concluída',
};

export function ledgerLabel(label) {
  if (language !== 'pt' || typeof label !== 'string') return label;
  if (Object.hasOwn(ledger, label)) return ledger[label];
  let match;
  if ((match = /^(.*) paycheck$/.exec(label))) return `Pagamento: ${nameLabel(match[1])}`;
  if ((match = /^First (house|car)$/.exec(label))) return match[1] === 'house' ? 'Primeira casa' : 'Primeiro carro';
  if ((match = /^Llama Labs · level (\d+)$/.exec(label))) return `Llama Labs · nível ${match[1]}`;
  if ((match = /^Company upgrade · level (\d+)$/.exec(label))) return `Melhoria da empresa · nível ${match[1]}`;
  if ((match = /^(Bought|Sold) (\d+) (\w+) shares$/.exec(label))) return `${match[1] === 'Bought' ? 'Compra' : 'Venda'} de ${match[2]} ações de ${match[3]}`;
  if ((match = /^Finance mission · (.*)$/.exec(label))) return `Missão financeira · ${nameLabel(match[1])}`;
  return nameLabel(label);
}

const errors = {
  'Not enough money yet. Another shift will help!': 'Ainda falta dinheiro. Mais um turno vai ajudar!',
  'Choose Anna or Carlos.': 'Escolha Anna ou Carlos.',
  'That job is not available yet.': 'Esse emprego ainda não está disponível.',
  'Your wallet is empty. Time for a shift!': 'Sua carteira está vazia. Hora de trabalhar!',
  'Choose food or clothes.': 'Escolha comida ou roupas.',
  'Complete your first three jobs and save $1,000.': 'Conclua os três primeiros empregos e junte $1.000.',
  'Choose a valid customization.': 'Escolha uma personalização válida.',
  'Complete the related job to unlock this outfit.': 'Conclua o emprego correspondente para desbloquear esta roupa.',
  'Finish your three new careers first.': 'Conclua primeiro as três novas profissões.',
  'Your mansion is safe for now.': 'Sua mansão está segura por enquanto.',
  'Your company cannot be upgraded right now.': 'Não é possível melhorar sua empresa agora.',
  'Enter a valid number of shares.': 'Digite uma quantidade válida de ações.',
  'You do not own that many shares.': 'Você não tem essa quantidade de ações.',
  'Reach a billion dollars first.': 'Alcance um bilhão de dólares primeiro.',
  'Finish your first Moon adventure to unlock return trips.': 'Conclua sua primeira aventura na Lua para liberar as viagens de volta.',
  'Choose the city or the Moon.': 'Escolha a cidade ou a Lua.',
  'That finance mission is not available.': 'Essa missão financeira não está disponível.',
  'Answer every question before finishing the mission.': 'Responda a todas as perguntas antes de concluir a missão.',
  'That mission is not available.': 'Essa missão não está disponível.',
  'Your Moon adventure is still ahead!': 'Sua aventura na Lua ainda está por vir!',
  'Complete the three side missions before the BBQ party.': 'Conclua as três missões extras antes do churrasco.',
  'Unknown game action.': 'Ação desconhecida no jogo.',
  'Enter a six-character room code.': 'Digite um código de sala com seis caracteres.',
  'Multiplayer needs the game server. Start it with npm run dev or npm run serve.': 'O modo online precisa do servidor do jogo. Inicie com npm run dev ou npm run serve.',
  'Could not connect to the room.': 'Não foi possível conectar à sala.',
  'The room connection could not open. Please join again.': 'Não foi possível abrir a conexão. Entre na sala novamente.',
  'The room connection was lost. Please join again.': 'A conexão com a sala caiu. Entre novamente.',
  'The room connection timed out. Please try again.': 'A conexão demorou demais. Tente novamente.',
  'The room closed or the connection was lost. Please join again.': 'A sala fechou ou a conexão caiu. Entre novamente.',
  'The room sent an invalid update.': 'A sala enviou uma atualização inválida.',
  'The room sent an invalid player list.': 'A sala enviou uma lista de jogadores inválida.',
  'Send a valid player position.': 'Envie uma posição válida do jogador.',
  'Player coordinates are out of range.': 'A posição do jogador está fora dos limites.',
  'Send valid appearance and movement settings.': 'Envie configurações válidas de aparência e movimento.',
  'Choose a nickname with 1–20 characters.': 'Escolha um apelido com 1 a 20 caracteres.',
  'Choose a nickname with 1–20 characters, without special markup.': 'Escolha um apelido com 1 a 20 caracteres, sem marcações especiais.',
  'Send JSON data.': 'Envie dados no formato JSON.',
  'The request took too long.': 'A solicitação demorou demais.',
  'That message is too large.': 'Essa mensagem é muito grande.',
  'Send a valid JSON object.': 'Envie dados JSON válidos.',
  'The request was interrupted.': 'A solicitação foi interrompida.',
  'Too many room requests. Please wait a minute.': 'Muitas solicitações de sala. Aguarde um minuto.',
  'This room is full (8 players maximum).': 'Esta sala está cheia (máximo de 8 jogadores).',
  'Your room session ended. Join the room again.': 'Sua sessão na sala terminou. Entre novamente.',
  'You were removed from the room by its creator.': 'Você foi removido da sala pelo criador.',
  'Only the room creator can remove players.': 'Somente o criador da sala pode remover jogadores.',
  'Choose another player to remove.': 'Escolha outro jogador para remover.',
  'That player is no longer in the room.': 'Esse jogador não está mais na sala.',
  'Player updates are arriving too quickly.': 'As atualizações do jogador estão chegando rápido demais.',
  'Invalid request URL.': 'Endereço de solicitação inválido.',
  'The game server is restarting. Please reconnect.': 'O servidor do jogo está reiniciando. Conecte novamente.',
  'Connect from this game page.': 'Conecte pela página deste jogo.',
  'All rooms are busy. Please try again shortly.': 'Todas as salas estão ocupadas. Tente novamente em instantes.',
  'Room not found. Check the six-character code.': 'Sala não encontrada. Confira o código de seis caracteres.',
  'That request method is not available.': 'Esse tipo de solicitação não está disponível.',
  'Room not found. Ask your friend to create a new room.': 'Sala não encontrada. Peça ao seu amigo para criar outra.',
  'This room closed. Ask your friend to create a new room.': 'Esta sala fechou. Peça ao seu amigo para criar outra.',
  'The room server could not finish that request.': 'O servidor da sala não conseguiu concluir a solicitação.',
  'Failed to fetch': 'Não foi possível conectar. Confira sua conexão com a internet.',
  'NetworkError when attempting to fetch resource.': 'Não foi possível conectar. Confira sua conexão com a internet.',
  'Load failed': 'Não foi possível carregar. Confira sua conexão com a internet.',
};

export function translateError(error) {
  const message = typeof error === 'string' ? error : error?.message || '';
  if (language !== 'pt') return message;
  if (Object.hasOwn(errors, message)) return errors[message];
  const finance = /^Question (\d+): (.*) Try again!$/.exec(message);
  if (finance) return `Pergunta ${finance[1]}: ${nameLabel(finance[2])} Tente novamente!`;
  if (message.startsWith('Multiplayer disconnected: ')) return `Conexão online encerrada: ${translateError(message.slice(26))}`;
  return message;
}
