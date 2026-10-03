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
