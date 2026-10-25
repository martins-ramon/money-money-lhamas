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

// Atlantic City adds twelve independent lessons; amounts are fictional game examples.
const ATLANTIC_LESSONS = [
  {
    id: 'reef-emergency', title: ['The reef emergency fund', 'A reserva de emergência do recife'],
    description: ['Keep a reserve for an unexpected repair.', 'Reserve dinheiro para um conserto inesperado.'],
    questions: [
      { prompt: ['Your turtle car needs a $90 repair. Your reserve has $140. How much remains?', 'Seu carro tartaruga precisa de um conserto de $90. Sua reserva tem $140. Quanto sobra?'], choices: [['$50', '$90', '$230'], ['$50', '$90', '$230']], answer: 0, explanation: ['$140 − $90 = $50 left in your reserve.', '$140 − $90 = $50 restantes na reserva.'] },
      { prompt: ['You want to rebuild the reserve from $50 to $150, saving $25 each week. How many weeks?', 'Você quer recompor a reserva de $50 para $150, guardando $25 por semana. Quantas semanas?'], choices: [['2 weeks', '4 weeks', '6 weeks'], ['2 semanas', '4 semanas', '6 semanas']], answer: 1, explanation: ['You need $150 − $50 = $100. $100 ÷ $25 = 4 weeks.', 'Faltam $150 − $50 = $100. $100 ÷ $25 = 4 semanas.'] },
    ],
  },
  {
    id: 'pearl-priorities', title: ['Pearls and priorities', 'Pérolas e prioridades'],
    description: ['Plan essential expenses before optional purchases.', 'Planeje as despesas essenciais antes das compras opcionais.'],
    questions: [
      { prompt: ['You have $80. Food costs $35, transport costs $15 and a decoration costs $40. How much remains after food and transport?', 'Você tem $80. A comida custa $35, o transporte custa $15 e uma decoração custa $40. Quanto sobra após comida e transporte?'], choices: [['$50', '$40', '$30'], ['$50', '$40', '$30']], answer: 2, explanation: ['$80 − $35 − $15 = $30 after the essential expenses.', '$80 − $35 − $15 = $30 após as despesas essenciais.'] },
      { prompt: ['The decoration costs $40 but only $30 remains. Which plan fits this budget?', 'A decoração custa $40, mas só restam $30. Qual plano cabe nesse orçamento?'], choices: [['Save another $10 before buying it', 'Spend $40 and still have $30', 'Skip the $35 food and spend everything'], ['Guardar mais $10 antes de comprar', 'Gastar $40 e continuar com $30', 'Deixar de comprar a comida de $35 e gastar tudo']], answer: 0, explanation: ['$40 − $30 = $10 still needed. Waiting preserves the money assigned to essential expenses.', 'Ainda faltam $40 − $30 = $10. Esperar preserva o dinheiro destinado às despesas essenciais.'] },
    ],
  },
  {
    id: 'coral-interest', title: ['The coral interest lesson', 'A lição de juros dos corais'],
    description: ['Calculate simple interest on a fixed starting amount.', 'Calcule juros simples sobre um valor inicial fixo.'],
    questions: [
      { prompt: ['A fictional $200 deposit earns simple interest of 5% per year. How much interest does one year earn?', 'Um depósito fictício de $200 rende juros simples de 5% ao ano. Quanto rende em um ano?'], choices: [['$5', '$10', '$100'], ['$5', '$10', '$100']], answer: 1, explanation: ['$200 × 0.05 = $10 of interest for one year in this example.', '$200 × 0,05 = $10 de juros em um ano neste exemplo.'] },
      { prompt: ['At the same simple interest rate, what is the total after three years without withdrawals?', 'Com a mesma taxa de juros simples, qual é o total após três anos sem saques?'], choices: [['$230', '$210', '$300'], ['$230', '$210', '$300']], answer: 0, explanation: ['Simple interest uses the original $200 each year: $200 + 3 × $10 = $230.', 'Os juros simples usam os $200 iniciais em cada ano: $200 + 3 × $10 = $230.'] },
    ],
  },
  {
    id: 'shell-compounding', title: ['Shells that grow together', 'Conchas que crescem juntas'],
    description: ['See how compound interest includes earlier interest.', 'Veja como os juros compostos incluem os juros anteriores.'],
    questions: [
      { prompt: ['In a fictional exercise, $100 earns 10% compound interest per round. What is the balance after one round?', 'Em um exercício fictício, $100 rendem 10% de juros compostos por rodada. Qual é o saldo após uma rodada?'], choices: [['$101', '$110', '$120'], ['$101', '$110', '$120']], answer: 1, explanation: ['$100 + 10% of $100 = $110 after the first round.', '$100 + 10% de $100 = $110 após a primeira rodada.'] },
      { prompt: ['The next round earns 10% on the full $110 balance. What is the new balance?', 'A próxima rodada rende 10% sobre o saldo inteiro de $110. Qual é o novo saldo?'], choices: [['$120', '$111', '$121'], ['$120', '$111', '$121']], answer: 2, explanation: ['10% of $110 is $11. $110 + $11 = $121 because the earlier interest also earns interest.', '10% de $110 são $11. $110 + $11 = $121 porque os juros anteriores também rendem juros.'] },
    ],
  },
  {
    id: 'turtle-installments', title: ['The turtle payment plan', 'O parcelamento da tartaruga'],
    description: ['Compare the total cost of installments with a cash price.', 'Compare o custo total das parcelas com o preço à vista.'],
    questions: [
      { prompt: ['A turtle helmet costs $240 in cash or 6 installments of $45. What is the installment total?', 'Um capacete de tartaruga custa $240 à vista ou 6 parcelas de $45. Qual é o total parcelado?'], choices: [['$270', '$240', '$225'], ['$270', '$240', '$225']], answer: 0, explanation: ['6 × $45 = $270 paid across all six installments.', '6 × $45 = $270 pagos ao longo das seis parcelas.'] },
      { prompt: ['How much more is the $270 installment total than the $240 cash price?', 'Quanto o total parcelado de $270 supera o preço à vista de $240?'], choices: [['$45', '$30', '$510'], ['$45', '$30', '$510']], answer: 1, explanation: ['$270 − $240 = $30 extra. Compare the whole price, not just one installment.', '$270 − $240 = $30 a mais. Compare o preço inteiro, não apenas uma parcela.'] },
    ],
  },
  {
    id: 'mermaid-subscriptions', title: ['Mermaid music subscriptions', 'As assinaturas musicais da sereia'],
    description: ['Add recurring charges and check what you actually use.', 'Some as cobranças recorrentes e confira o que você usa.'],
    questions: [
      { prompt: ['A music subscription costs $12 per month and a game subscription costs $8. What is their total for 3 months?', 'Uma assinatura de música custa $12 por mês e uma de jogos custa $8. Qual é o total das duas por 3 meses?'], choices: [['$20', '$36', '$60'], ['$20', '$36', '$60']], answer: 2, explanation: ['($12 + $8) × 3 = $60 for three months of both subscriptions.', '($12 + $8) × 3 = $60 por três meses das duas assinaturas.'] },
      { prompt: ['In this exercise there is no cancellation fee. Canceling an unused $8 monthly subscription saves how much over 6 months?', 'Neste exercício não há multa de cancelamento. Cancelar uma assinatura não usada de $8 mensais economiza quanto em 6 meses?'], choices: [['$48', '$14', '$80'], ['$48', '$14', '$80']], answer: 0, explanation: ['$8 × 6 = $48 that can be assigned to another goal.', '$8 × 6 = $48 que podem ser destinados a outra meta.'] },
    ],
  },
  {
    id: 'triton-rent', title: ['Mr. Barriga Triton’s budget', 'O orçamento do Sr. Barriga Tritão'],
    description: ['Account for fixed rent and changing household costs.', 'Inclua o aluguel fixo e os custos variáveis da casa.'],
    questions: [
      { prompt: ['An underwater home has $120 rent and $30 of food costs this month. Income is $200. How much remains?', 'Uma casa submarina tem aluguel de $120 e gastos de $30 com comida neste mês. A renda é $200. Quanto sobra?'], choices: [['$80', '$50', '$150'], ['$80', '$50', '$150']], answer: 1, explanation: ['$200 − $120 − $30 = $50 after rent and food.', '$200 − $120 − $30 = $50 após aluguel e comida.'] },
      { prompt: ['Next month food costs $45 while income and rent stay the same. How much remains?', 'No mês seguinte, a comida custa $45 e a renda e o aluguel continuam iguais. Quanto sobra?'], choices: [['$65', '$50', '$35'], ['$65', '$50', '$35']], answer: 2, explanation: ['$200 − $120 − $45 = $35. A variable expense changed the budget by $15.', '$200 − $120 − $45 = $35. Uma despesa variável alterou o orçamento em $15.'] },
    ],
  },
  {
    id: 'seaweed-break-even', title: ['The seaweed shop breaks even', 'O ponto de equilíbrio da loja de algas'],
    description: ['Find how many sales cover all the costs.', 'Descubra quantas vendas cobrem todos os custos.'],
    questions: [
      { prompt: ['A seaweed snack sells for $5 and costs $2 to make. How much does each sale contribute toward the stall fee?', 'Um lanche de algas é vendido por $5 e custa $2 para produzir. Quanto cada venda contribui para pagar a taxa da barraca?'], choices: [['$3', '$7', '$2'], ['$3', '$7', '$2']], answer: 0, explanation: ['$5 − $2 = $3 per snack before paying the fixed stall fee.', '$5 − $2 = $3 por lanche antes de pagar a taxa fixa da barraca.'] },
      { prompt: ['The stall fee is $30. With a $3 contribution from each snack, how many sales cover that fee?', 'A taxa da barraca é $30. Com uma contribuição de $3 por lanche, quantas vendas cobrem essa taxa?'], choices: [['6 sales', '10 sales', '15 sales'], ['6 vendas', '10 vendas', '15 vendas']], answer: 1, explanation: ['$30 ÷ $3 = 10 sales. At ten snacks, sales cover ingredients and the stall fee, with zero profit.', '$30 ÷ $3 = 10 vendas. Com dez lanches, as vendas cobrem os ingredientes e a taxa da barraca, com lucro zero.'] },
    ],
  },
  {
    id: 'ocean-delivery', title: ['Delivery across the ocean', 'Entrega pelo oceano'],
    description: ['Include delivery charges when comparing offers.', 'Inclua o frete ao comparar ofertas.'],
    questions: [
      { prompt: ['Shop A charges $70 plus $15 delivery. Shop B charges $80 with free delivery. Which total is lower?', 'A loja A cobra $70 mais $15 de frete. A loja B cobra $80 com frete grátis. Qual total é menor?'], choices: [['Shop A: $70', 'Both: $85', 'Shop B: $80'], ['Loja A: $70', 'As duas: $85', 'Loja B: $80']], answer: 2, explanation: ['Shop A totals $70 + $15 = $85. Shop B totals $80, which is $5 less.', 'A loja A soma $70 + $15 = $85. A loja B soma $80, que são $5 a menos.'] },
      { prompt: ['Shop A now offers a $10 coupon on its $85 total. What is its final price?', 'A loja A agora oferece um cupom de $10 sobre seu total de $85. Qual é o preço final?'], choices: [['$75', '$80', '$95'], ['$75', '$80', '$95']], answer: 0, explanation: ['$85 − $10 = $75 including delivery. Recalculate the complete price after a coupon.', '$85 − $10 = $75 incluindo o frete. Recalcule o preço completo após aplicar um cupom.'] },
    ],
  },
  {
    id: 'turtle-value', title: ['A turtle car changes value', 'O valor do carro tartaruga muda'],
    description: ['Understand a fictional change in an asset’s resale value.', 'Entenda uma mudança fictícia no valor de revenda de um bem.'],
    questions: [
      { prompt: ['A turtle car bought for $500 can now be sold for $400. How much value did it lose?', 'Um carro tartaruga comprado por $500 pode ser vendido agora por $400. Quanto perdeu de valor?'], choices: [['$900', '$100', '$400'], ['$900', '$100', '$400']], answer: 1, explanation: ['$500 − $400 = $100 lost in resale value in this example.', '$500 − $400 = $100 de perda no valor de revenda neste exemplo.'] },
      { prompt: ['What percentage of the original $500 is that $100 loss?', 'Qual porcentagem dos $500 originais corresponde à perda de $100?'], choices: [['10%', '25%', '20%'], ['10%', '25%', '20%']], answer: 2, explanation: ['$100 ÷ $500 × 100 = 20%. The percentage uses the original price.', '$100 ÷ $500 × 100 = 20%. A porcentagem usa o preço original.'] },
    ],
  },
  {
    id: 'castle-goal', title: ['Restore the golden castle', 'Restaure o castelo de ouro'],
    description: ['Split a shared savings goal into smaller contributions.', 'Divida uma meta de poupança coletiva em pequenas contribuições.'],
    questions: [
      { prompt: ['The castle garden needs $600. The city already saved $240. How much is still needed?', 'O jardim do castelo precisa de $600. A cidade já guardou $240. Quanto ainda falta?'], choices: [['$360', '$240', '$840'], ['$360', '$240', '$840']], answer: 0, explanation: ['$600 − $240 = $360 still needed for the garden.', '$600 − $240 = $360 ainda necessários para o jardim.'] },
      { prompt: ['Six fish people each save $20 per week. How many weeks cover the remaining $360?', 'Seis homens-peixe guardam $20 cada um por semana. Quantas semanas cobrem os $360 restantes?'], choices: [['2 weeks', '3 weeks', '6 weeks'], ['2 semanas', '3 semanas', '6 semanas']], answer: 1, explanation: ['Together they save 6 × $20 = $120 each week. $360 ÷ $120 = 3 weeks.', 'Juntos, eles guardam 6 × $20 = $120 por semana. $360 ÷ $120 = 3 semanas.'] },
    ],
  },
  {
    id: 'kraken-receipt', title: ['Check the kraken’s receipt', 'Confira o recibo do kraken'],
    description: ['Check quantities, totals and accidental double charges.', 'Confira quantidades, totais e cobranças duplicadas por engano.'],
    questions: [
      { prompt: ['You buy 3 coral lamps for $15 each and a $10 cable. What should the receipt total be?', 'Você compra 3 luminárias de coral por $15 cada e um cabo de $10. Qual deve ser o total do recibo?'], choices: [['$25', '$45', '$55'], ['$25', '$45', '$55']], answer: 2, explanation: ['3 × $15 + $10 = $55 for the three lamps and one cable.', '3 × $15 + $10 = $55 pelas três luminárias e um cabo.'] },
      { prompt: ['The receipt shows $65 because the $10 cable was charged twice. What correction is needed?', 'O recibo mostra $65 porque o cabo de $10 foi cobrado duas vezes. Qual correção é necessária?'], choices: [['Remove the extra $10 cable charge', 'Remove all $65', 'Add another $10'], ['Remover a cobrança extra de $10 do cabo', 'Remover todos os $65', 'Adicionar mais $10']], answer: 0, explanation: ['$65 − $10 = $55. Checking the items identifies the exact duplicate charge.', '$65 − $10 = $55. Conferir os itens identifica exatamente a cobrança duplicada.'] },
    ],
  },
];

for (const mission of FINANCE_MISSIONS) mission.location = 'city';
for (const lesson of ATLANTIC_LESSONS) {
  const localized = language => ({
    title: lesson.title[language], description: lesson.description[language],
    questions: lesson.questions.map(question => ({ prompt: question.prompt[language], choices: question.choices[language], answer: question.answer, explanation: question.explanation[language] })),
  });
  FINANCE_MISSIONS.push({ id: lesson.id, reward: 150, location: 'atlantic', ...localized(0) });
  PORTUGUESE_MISSIONS[lesson.id] = localized(1);
}

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
