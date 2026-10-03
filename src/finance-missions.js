import { getLanguage, registerTranslations } from './i18n.js';

// Fictional, self-contained money challenges. Every answer includes an explanation.
export const FINANCE_MISSIONS = [
  {
    id: 'budget', title: 'Plan your pocket money', description: 'Give every dollar a job before you spend it.', reward: 150,
    questions: [
      { prompt: 'You have $100. Lunch costs $30 and a bus pass costs $20. How much is left?', choices: ['$80', '$50', '$30'], answer: 1, explanation: '$100 − $30 − $20 = $50 left after your needs.' },
      { prompt: 'You want to save $40 of that $50. How much can you spend on a treat?', choices: ['$10', '$40', '$50'], answer: 0, explanation: '$50 − $40 = $10. A budget leaves room for your goal and a small treat.' },
    ],
  },
  {
    id: 'discount', title: 'Spot the real discount', description: 'Work out the final price before choosing a sale.', reward: 150,
    questions: [
      { prompt: 'A $100 helmet has a 20% discount. What is its sale price?', choices: ['$20', '$120', '$80'], answer: 2, explanation: '20% of $100 is $20. Subtract the discount: $100 − $20 = $80.' },
      { prompt: 'The same helmet costs $75 at another shop. Which price is lower?', choices: ['$80 with the sale sign', '$75 at the other shop', 'They cost the same'], answer: 1, explanation: '$75 is $5 less than $80. Compare final prices, even when a sign says SALE.' },
    ],
  },
  {
    id: 'saving', title: 'Grow a savings goal', description: 'Practice saving regularly and learn how game interest works.', reward: 150,
    questions: [
      { prompt: 'A skateboard costs $120. You save $30 each week, starting from $0. How many weeks do you need?', choices: ['3 weeks', '4 weeks', '6 weeks'], answer: 1, explanation: '$120 ÷ $30 = 4 weeks. Small regular amounts can reach a bigger goal.' },
      { prompt: 'In this game, $100 in savings earns 2% for one shift. How much is in savings after that shift?', choices: ['$102', '$120', '$200'], answer: 0, explanation: '2% of $100 is $2, so the new balance is $102. This is a game rule; real savings rates and risks vary.' },
    ],
  },
  {
    id: 'unit-price', title: 'Compare the snack packs', description: 'Find the price of one item to compare different packs.', reward: 150,
    questions: [
      { prompt: 'A pack of 4 juice boxes costs $12. What does one juice box cost?', choices: ['$4', '$8', '$3'], answer: 2, explanation: '$12 ÷ 4 = $3 per juice box.' },
      { prompt: 'You need 6 juice boxes. A pack of 6 costs $15, while single boxes cost $3 each. Which choice costs less?', choices: ['The $15 pack', 'Six single boxes', 'They cost the same'], answer: 0, explanation: 'Six single boxes cost 6 × $3 = $18. The $15 pack saves $3 when you need all six.' },
    ],
  },
  {
    id: 'change', title: 'Check your change', description: 'Add up a purchase and check the money you get back.', reward: 150,
    questions: [
      { prompt: 'A sandwich costs $12 and juice costs $8. You pay with $50. What change should you get?', choices: ['$20', '$30', '$42'], answer: 1, explanation: 'The total is $12 + $8 = $20. Your change is $50 − $20 = $30.' },
      { prompt: 'You receive only $25 in change. What should you do?', choices: ['Ignore it every time', 'Ask for another $25', 'Politely check the receipt and ask about the missing $5'], answer: 2, explanation: '$30 − $25 = $5 missing. Checking the receipt politely helps everyone fix a mistake.' },
    ],
  },
  {
    id: 'business-plan', title: 'Run a lemonade stand', description: 'Separate sales from costs to discover your profit.', reward: 150,
    questions: [
      { prompt: 'You sell 10 lemonades for $5 each. Ingredients and cups cost $20 in total. What is your profit?', choices: ['$50', '$30', '$70'], answer: 1, explanation: 'Sales are 10 × $5 = $50. Profit is sales minus costs: $50 − $20 = $30.' },
      { prompt: 'You keep $10 of that $30 profit for future supplies. How much remains for your savings goal?', choices: ['$20', '$30', '$40'], answer: 0, explanation: '$30 − $10 = $20. Keeping money for future costs helps a small business keep running.' },
    ],
  },
];

// Presentation-only translations keep mission IDs, answers and rewards independent of language.
const PORTUGUESE_MISSIONS = {
  budget: {
    title: 'Planeje sua mesada', description: 'Decida o destino de cada dólar antes de gastar.',
    questions: [
      { prompt: 'Você tem $100. O almoço custa $30 e a passagem de ônibus custa $20. Quanto sobra?', choices: ['$80', '$50', '$30'], explanation: '$100 − $30 − $20 = $50 depois de pagar suas necessidades.' },
      { prompt: 'Você quer guardar $40 dos $50 que sobraram. Quanto pode gastar em um agrado?', choices: ['$10', '$40', '$50'], explanation: '$50 − $40 = $10. Um orçamento reserva dinheiro para seu objetivo e um pequeno agrado.' },
    ],
  },
  discount: {
    title: 'Encontre o desconto de verdade', description: 'Calcule o preço final antes de escolher uma promoção.',
    questions: [
      { prompt: 'Um capacete de $100 está com 20% de desconto. Qual é o preço na promoção?', choices: ['$20', '$120', '$80'], explanation: '20% de $100 são $20. Subtraia o desconto: $100 − $20 = $80.' },
      { prompt: 'O mesmo capacete custa $75 em outra loja. Qual preço é menor?', choices: ['$80 com a placa de promoção', '$75 na outra loja', 'Os dois preços são iguais'], explanation: '$75 são $5 a menos que $80. Compare os preços finais, mesmo quando a placa diz PROMOÇÃO.' },
    ],
  },
  saving: {
    title: 'Poupe para um objetivo', description: 'Pratique poupar regularmente e aprenda como funcionam os juros do jogo.',
    questions: [
      { prompt: 'Um skate custa $120. Você guarda $30 por semana, começando com $0. De quantas semanas precisa?', choices: ['3 semanas', '4 semanas', '6 semanas'], explanation: '$120 ÷ $30 = 4 semanas. Pequenas quantias guardadas regularmente ajudam a alcançar um objetivo maior.' },
      { prompt: 'Neste jogo, $100 guardados rendem 2% em um turno de trabalho. Qual será o saldo depois desse turno?', choices: ['$102', '$120', '$200'], explanation: '2% de $100 são $2, então o novo saldo é $102. Esta é uma regra do jogo; taxas e riscos da poupança real variam.' },
    ],
  },
  'unit-price': {
    title: 'Compare os pacotes de suco', description: 'Descubra o preço de cada unidade para comparar pacotes diferentes.',
    questions: [
      { prompt: 'Um pacote com 4 caixinhas de suco custa $12. Quanto custa cada caixinha?', choices: ['$4', '$8', '$3'], explanation: '$12 ÷ 4 = $3 por caixinha de suco.' },
      { prompt: 'Você precisa de 6 caixinhas de suco. Um pacote com 6 custa $15, e cada caixinha avulsa custa $3. Qual opção custa menos?', choices: ['O pacote de $15', 'Seis caixinhas avulsas', 'As duas opções custam o mesmo'], explanation: 'Seis caixinhas avulsas custam 6 × $3 = $18. O pacote de $15 economiza $3 quando você precisa das seis.' },
    ],
  },
  change: {
    title: 'Confira seu troco', description: 'Some o valor da compra e confira o dinheiro que recebe de volta.',
    questions: [
      { prompt: 'Um sanduíche custa $12 e um suco custa $8. Você paga com $50. Quanto deve receber de troco?', choices: ['$20', '$30', '$42'], explanation: 'O total é $12 + $8 = $20. Seu troco é $50 − $20 = $30.' },
      { prompt: 'Você recebe apenas $25 de troco. O que deve fazer?', choices: ['Sempre ignorar', 'Pedir mais $25', 'Conferir a nota e perguntar com educação sobre os $5 que faltam'], explanation: '$30 − $25 = $5 que faltam. Conferir a nota com educação ajuda todos a corrigir um erro.' },
    ],
  },
  'business-plan': {
    title: 'Cuide de uma barraca de limonada', description: 'Separe as vendas dos custos para descobrir seu lucro.',
    questions: [
      { prompt: 'Você vende 10 limonadas por $5 cada. Os ingredientes e copos custam $20 no total. Qual é seu lucro?', choices: ['$50', '$30', '$70'], explanation: 'As vendas somam 10 × $5 = $50. Lucro é o valor das vendas menos os custos: $50 − $20 = $30.' },
      { prompt: 'Você reserva $10 dos $30 de lucro para comprar materiais no futuro. Quanto sobra para seu objetivo de poupança?', choices: ['$20', '$30', '$40'], explanation: '$30 − $10 = $20. Reservar dinheiro para custos futuros ajuda um pequeno negócio a continuar funcionando.' },
    ],
  },
};

for (const mission of FINANCE_MISSIONS) {
  const translated = PORTUGUESE_MISSIONS[mission.id];
  registerTranslations({ [mission.title]: translated.title, [mission.description]: translated.description });
  mission.questions.forEach((question, index) => {
    const localized = translated.questions[index];
    registerTranslations({ [question.prompt]: localized.prompt, [question.explanation]: localized.explanation });
    question.choices.forEach((choice, choiceIndex) => registerTranslations({ [choice]: localized.choices[choiceIndex] }));
  });
}

export function financeMissions() {
  if (getLanguage() !== 'pt') return FINANCE_MISSIONS;
  return FINANCE_MISSIONS.map(mission => {
    const translated = PORTUGUESE_MISSIONS[mission.id];
    return { ...mission, ...translated, questions: mission.questions.map((question, index) => ({ ...question, ...translated.questions[index] })) };
  });
}
