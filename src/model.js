export const SAVE_KEY = 'money-money-lhamas-v1';
export const JOBS = [
  { id: 'burger', name: 'McLlama’s', role: 'Burger crew', icon: 'burger', pay: 400, color: 'peach', costume: 'Ronald McLlama', task: 'Build 5 perfect burgers', description: 'Big buns. Bigger ambitions.', location: [-11, -5] },
  { id: 'school', name: 'Sunny Hooves School', role: 'School janitor', icon: 'broom', pay: 400, color: 'sage', costume: 'Mop-top & cleaning cart', task: 'Clean up 8 muddy spots', description: 'A clean start to your fortune.', location: [10, -8] },
  { id: 'cinema', name: 'Starlight Cinema', role: 'Cinema assistant', icon: 'cinema', pay: 400, color: 'lilac', costume: 'Spider-Llama', task: 'Match 6 movie tickets', description: 'Your origin story starts here.', location: [-12, 9] },
  { id: 'factory', name: 'Tiny Tails Factory', role: 'Diaper inspector', icon: 'factory', pay: 900, color: 'peach', costume: 'The very full diaper', task: 'Sort 8 clean and dirty diapers', description: 'An unexpectedly rewarding shift.', location: [-20, -16] },
  { id: 'hotel', name: 'The Grand Llama', role: 'Hotel receptionist', icon: 'hotel', pay: 900, color: 'lilac', costume: 'Grand hotel concierge', task: 'Give 6 guests the right room key', description: 'Five stars. Four little hooves.', location: [19, -19] },
  { id: 'police', name: 'Hooves PD', role: 'Police officer', icon: 'shield', pay: 900, color: 'sage', costume: 'Officer Llama', task: 'Remember 5 patrol routes', description: 'Protect, serve, and save.', location: [15, 10] },
];
export const STOCKS = [
  { id: 'alphabet', symbol: 'GOOGL', name: 'Alphabet · YouTube', price: 180, color: '#e27b55' },
  { id: 'netflix', symbol: 'NFLX', name: 'Netflix', price: 950, color: '#c76475' },
  { id: 'apple', symbol: 'AAPL', name: 'Apple', price: 230, color: '#729776' },
  { id: 'tesla', symbol: 'TSLA', name: 'Tesla', price: 350, color: '#a294c4' },
];
export const CHAPTERS = ['Little beginnings', 'A place of your own', 'The glow-up', 'Millionaire moves', 'Over the Moon'];
const round = n => Math.round(n * 100) / 100;
export const money = (n, compact = false) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}) }).format(n);
export const initialState = () => ({
  version: 1, started: false, character: 'anna', wallet: 0, savings: 0, earned: 0, spent: 0,
  interest: 0, shifts: {}, stage: 'beginning', costume: 'Street dreamer', costumes: ['Street dreamer'],
  asset: null, assetColor: '#e5aa7e', assetStyle: 'classic', company: 0, businessIncome: 0,
  holdings: {}, prices: Object.fromEntries(STOCKS.map(s => [s.id, s.price])),
  ledger: [], collectibles: [], sideQuests: [], celebration: false, rentEscapes: 0, muted: true,
});
export const liquid = s => round(s.wallet + s.savings);
export const portfolio = s => round(STOCKS.reduce((sum, stock) => sum + (s.holdings[stock.id] || 0) * s.prices[stock.id], 0));
export const wealth = s => round(liquid(s) + portfolio(s));
export const chapter = s => ['beginning', 'purchase'].includes(s.stage) ? 0 : s.stage === 'careers' ? 1 : ['timeskip', 'robbery'].includes(s.stage) ? 2 : s.stage === 'business' ? 3 : 4;
export const income = s => s.company ? 50000 * 2.8 ** (s.company - 1) : 0;
export const upgradeCost = s => Math.round(350000 * 2.6 ** Math.max(0, s.company - 1));
export const completed = (s, advanced = false) => JOBS.slice(advanced ? 3 : 0, advanced ? 6 : 3).filter(j => s.shifts[j.id]).length;
export function record(s, label, amount) {
  s.ledger.unshift({ label, amount: round(amount), date: Date.now() });
  s.ledger = s.ledger.slice(0, 30);
}
function debit(s, amount) {
  if (!Number.isFinite(amount) || amount < 0 || liquid(s) + 0.001 < amount) throw new Error('Not enough money yet. Another shift will help!');
  const cash = Math.min(s.wallet, amount);
  s.wallet = round(s.wallet - cash);
  s.savings = round(s.savings - (amount - cash));
}
function credit(s, label, amount) {
  s.wallet = round(s.wallet + amount); s.earned = round(s.earned + amount); record(s, label, amount);
}
function progress(s) {
  if (s.stage === 'beginning' && completed(s) === 3 && liquid(s) >= 1000) s.stage = 'purchase';
  if (s.stage === 'careers' && completed(s, true) === 3) s.stage = 'timeskip';
  if (s.stage === 'business' && wealth(s) >= 1e9) {
    s.stage = 'moon'; s.costumes.push('Lunar billionaire'); s.costume = 'Lunar billionaire';
  }
}
export function act(state, action) {
  const s = structuredClone(state);
  switch (action.type) {
    case 'start':
      if (!['anna', 'carlos'].includes(action.character)) throw new Error('Choose Anna or Carlos.');
      s.started = true; s.character = action.character; break;
    case 'shift': {
      const job = JOBS.find(j => j.id === action.job);
      if (!s.started || !job || (job.pay === 900 && !['careers', 'timeskip', 'business', 'moon', 'freeplay'].includes(s.stage))) throw new Error('That job is not available yet.');
      const interest = round(s.savings * 0.02);
      if (interest) { s.savings = round(s.savings + interest); s.interest = round(s.interest + interest); record(s, 'Savings interest · 2% per shift', interest); }
      credit(s, `${job.name} paycheck`, job.pay);
      s.shifts[job.id] = (s.shifts[job.id] || 0) + 1;
      if (!s.costumes.includes(job.costume)) s.costumes.push(job.costume);
      break;
    }
    case 'save': {
      if (s.wallet <= 0) throw new Error('Your wallet is empty. Time for a shift!');
      const amount = s.wallet; s.savings = round(s.savings + amount); s.wallet = 0;
      record(s, 'Moved wallet to savings', 0); break;
    }
    case 'spend': {
      if (!['food', 'clothes'].includes(action.item)) throw new Error('Choose food or clothes.');
      const amount = action.item === 'food' ? 60 : 120;
      debit(s, amount); s.spent += amount; record(s, action.item === 'food' ? 'A delicious meal' : 'Fresh streetwear', -amount);
      if (action.item === 'clothes' && !s.costumes.includes('Fresh streetwear')) s.costumes.push('Fresh streetwear');
      break;
    }
    case 'purchase':
      if (s.stage !== 'purchase' || !['house', 'car'].includes(action.asset)) throw new Error('Complete your first three jobs and save $1,000.');
      debit(s, 1000); s.spent += 1000; s.asset = action.asset; s.stage = 'careers'; record(s, `First ${action.asset}`, -1000); break;
    case 'customize':
      if (!s.asset || !/^#[0-9a-f]{6}$/i.test(action.color) || !['classic', 'sporty', 'cozy'].includes(action.style)) throw new Error('Choose a valid customization.');
      s.assetColor = action.color; s.assetStyle = action.style; break;
    case 'costume':
      if (!s.costumes.includes(action.costume)) throw new Error('Complete the related job to unlock this outfit.');
      s.costume = action.costume; break;
    case 'rent':
      if (action.hidden) { credit(s, 'Outsmarted Mr. Barriga!', 500); s.rentEscapes++; }
      else { const fee = Math.min(liquid(s), 200); debit(s, fee); s.spent += fee; record(s, 'Rent paid to Mr. Barriga', -fee); }
      break;
    case 'timeskip':
      if (s.stage !== 'timeskip') throw new Error('Finish your three new careers first.');
      credit(s, 'Two years of hard work', 1000000); s.stage = 'robbery'; break;
    case 'defend':
      if (s.stage !== 'robbery') throw new Error('Your mansion is safe for now.');
      if (Number.isFinite(action.stolen) && action.stolen > 0) { const loss = Math.min(liquid(s), Math.round(action.stolen)); debit(s, loss); s.spent += loss; record(s, 'Stolen during the robbery', -loss); }
      s.stage = 'business'; s.company = 1; break;
    case 'businessTick':
      if (s.company && ['business', 'moon', 'freeplay'].includes(s.stage)) {
        const amount = round(income(s)); credit(s, `Llama Labs · level ${s.company}`, amount); s.businessIncome = round(s.businessIncome + amount);
      }
      break;
    case 'upgrade': {
      if (!s.company || s.company >= 9) throw new Error('Your company cannot be upgraded right now.');
      const cost = upgradeCost(s); debit(s, cost); s.spent += cost; s.company++; record(s, `Company upgrade · level ${s.company}`, -cost); break;
    }
    case 'market':
      for (const stock of STOCKS) {
        const change = action.changes?.[stock.id];
        if (Number.isFinite(change) && change >= -0.08 && change <= 0.08) s.prices[stock.id] = round(Math.max(10, s.prices[stock.id] * (1 + change)));
      }
      break;
    case 'trade': {
      if (!s.company || !STOCKS.some(stock => stock.id === action.stock) || !Number.isSafeInteger(action.quantity) || action.quantity < 1 || action.quantity > 1e8 || !['buy', 'sell'].includes(action.side)) throw new Error('Enter a valid number of shares.');
      const total = round(s.prices[action.stock] * action.quantity);
      if (action.side === 'buy') {
        debit(s, total); s.holdings[action.stock] = (s.holdings[action.stock] || 0) + action.quantity;
        record(s, `Bought ${action.quantity} ${action.stock} shares`, -total);
      } else {
        if ((s.holdings[action.stock] || 0) < action.quantity) throw new Error('You do not own that many shares.');
        s.holdings[action.stock] -= action.quantity; s.wallet = round(s.wallet + total);
        record(s, `Sold ${action.quantity} ${action.stock} shares`, total);
      }
      break;
    }
    case 'coin':
      if (Number.isInteger(action.id) && action.id >= 0 && action.id < 12 && !s.collectibles.includes(action.id)) {
        s.collectibles.push(action.id); credit(s, 'Found a lucky coin', 25);
      }
      break;
    case 'moon':
      if (s.stage !== 'moon') throw new Error('Reach a billion dollars first.');
      s.stage = 'freeplay'; break;
    case 'quest':
      if (s.stage !== 'freeplay' || !['picnic', 'explorer', 'helper'].includes(action.id) || s.sideQuests.includes(action.id)) throw new Error('That mission is not available.');
      s.sideQuests.push(action.id); credit(s, 'Free-world mission completed', 5000); break;
    case 'celebrate':
      if (s.stage !== 'freeplay') throw new Error('Your Moon adventure is still ahead!');
      s.celebration = true; break;
    case 'mute': s.muted = !s.muted; break;
    default: throw new Error('Unknown game action.');
  }
  progress(s);
  return s;
}
export function loadGame(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return initialState();
    const saved = JSON.parse(raw), base = initialState();
    if (saved.version !== 1 || !['beginning', 'purchase', 'careers', 'timeskip', 'robbery', 'business', 'moon', 'freeplay'].includes(saved.stage)) return base;
    for (const key of ['wallet', 'savings', 'earned', 'spent', 'interest', 'businessIncome', 'rentEscapes']) if (!Number.isFinite(saved[key]) || saved[key] < 0 || saved[key] > 1e15) return base;
    if (!['anna', 'carlos'].includes(saved.character) || typeof saved.started !== 'boolean' || typeof saved.muted !== 'boolean') return base;
    if (!Number.isInteger(saved.company) || saved.company < 0 || saved.company > 9) return base;
    if (!saved.shifts || !saved.holdings || !saved.prices || typeof saved.shifts !== 'object' || typeof saved.holdings !== 'object') return base;
    if (JOBS.some(j => saved.shifts[j.id] !== undefined && (!Number.isSafeInteger(saved.shifts[j.id]) || saved.shifts[j.id] < 0))) return base;
    if (STOCKS.some(s => !Number.isFinite(saved.prices[s.id]) || saved.prices[s.id] < 10 || saved.prices[s.id] > 1e12 || (saved.holdings[s.id] !== undefined && (!Number.isSafeInteger(saved.holdings[s.id]) || saved.holdings[s.id] < 0)))) return base;
    const outfits = ['Street dreamer', 'Fresh streetwear', 'Lunar billionaire', ...JOBS.map(j => j.costume)];
    if (!Array.isArray(saved.costumes) || saved.costumes.some(c => !outfits.includes(c)) || !saved.costumes.includes(saved.costume)) return base;
    if (![null, 'house', 'car'].includes(saved.asset) || !/^#[0-9a-f]{6}$/i.test(saved.assetColor) || !['classic', 'sporty', 'cozy'].includes(saved.assetStyle)) return base;
    if (!Array.isArray(saved.collectibles) || saved.collectibles.some(n => !Number.isInteger(n) || n < 0 || n > 11)) return base;
    if (!Array.isArray(saved.sideQuests) || saved.sideQuests.some(q => !['picnic', 'explorer', 'helper'].includes(q)) || !Array.isArray(saved.ledger) || typeof saved.celebration !== 'boolean') return base;
    if (saved.ledger.some(e => !e || typeof e.label !== 'string' || !Number.isFinite(e.amount) || !Number.isFinite(e.date))) return base;
    return Object.fromEntries(Object.keys(base).map(key => [key, saved[key] ?? base[key]]));
  } catch { return initialState(); }
}
