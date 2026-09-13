import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, initialState, loadGame, liquid, wealth, portfolio, completed, chapter, income, upgradeCost, JOBS, STOCKS, SAVE_KEY } from '../src/model.js';

const run = (state, ...actions) => actions.reduce((s, a) => act(s, a), state);
const started = (character = 'anna') => act(initialState(), { type: 'start', character });
const shifts = (s, id, n) => run(s, ...Array.from({ length: n }, () => ({ type: 'shift', job: id })));
const starterDone = () => shifts(shifts(shifts(started(), 'burger', 1), 'school', 1), 'cinema', 1);

test('start: only Anna or Carlos can begin the adventure', () => {
  assert.equal(started('carlos').character, 'carlos');
  assert.throws(() => act(initialState(), { type: 'start', character: 'bob' }), /Anna or Carlos/);
});

test('act never mutates the previous state', () => {
  const s = started(); const before = JSON.stringify(s);
  act(s, { type: 'shift', job: 'burger' });
  assert.equal(JSON.stringify(s), before);
});

test('starter shift pays $400 into the wallet and unlocks the job costume', () => {
  const s = act(started(), { type: 'shift', job: 'burger' });
  assert.equal(s.wallet, 400); assert.equal(s.earned, 400); assert.equal(s.shifts.burger, 1);
  assert.ok(s.costumes.includes('Ronald McLlama'));
  assert.equal(s.ledger[0].label, 'McLlama’s paycheck');
});

test('advanced ($900) jobs are locked until the first purchase', () => {
  assert.throws(() => act(started(), { type: 'shift', job: 'factory' }), /not available/);
  assert.throws(() => act(started(), { type: 'shift', job: 'nope' }), /not available/);
});

test('saving moves the whole wallet and earns 2% compound interest per shift', () => {
  let s = act(act(started(), { type: 'shift', job: 'burger' }), { type: 'save' });
  assert.equal(s.wallet, 0); assert.equal(s.savings, 400);
  s = act(s, { type: 'shift', job: 'school' });
  assert.equal(s.savings, 408); assert.equal(s.interest, 8); assert.equal(s.wallet, 400);
  assert.equal(s.ledger[1].label, 'Savings interest · 2% per shift');
  s = act(act(s, { type: 'save' }), { type: 'shift', job: 'cinema' });
  assert.equal(s.savings, Math.round(808 * 1.02 * 100) / 100);
  assert.throws(() => act(started(), { type: 'save' }), /wallet is empty/);
});

test('spending: food costs $60, clothes cost $120 and unlock Fresh streetwear', () => {
  const s = act(started(), { type: 'shift', job: 'burger' });
  const food = act(s, { type: 'spend', item: 'food' });
  assert.equal(food.wallet, 340); assert.equal(food.spent, 60);
  const clothes = act(s, { type: 'spend', item: 'clothes' });
  assert.equal(clothes.wallet, 280); assert.ok(clothes.costumes.includes('Fresh streetwear'));
  assert.throws(() => act(started(), { type: 'spend', item: 'food' }), /Not enough money/);
  assert.throws(() => act(s, { type: 'spend', item: 'jetski' }), /food or clothes/);
});

test('spending draws from savings when the wallet is short', () => {
  let s = act(act(started(), { type: 'shift', job: 'burger' }), { type: 'save' });
  s = act(s, { type: 'spend', item: 'clothes' });
  assert.equal(s.wallet, 0); assert.equal(s.savings, 280);
});

test('goal: three starter jobs + $1,000 liquid unlock the first purchase', () => {
  let s = starterDone();
  assert.equal(completed(s), 3); assert.equal(s.stage, 'purchase'); assert.equal(liquid(s), 1200);
  s = act(s, { type: 'spend', item: 'clothes' }); s = act(s, { type: 'spend', item: 'clothes' });
  assert.equal(s.stage, 'purchase');
  const poor = run(started(), { type: 'shift', job: 'burger' }, { type: 'shift', job: 'burger' }, { type: 'shift', job: 'burger' });
  assert.equal(poor.stage, 'beginning', 'repeating one job does not count as three jobs');
});

test('purchase costs $1,000, records the asset and opens the advanced careers', () => {
  assert.throws(() => act(started(), { type: 'purchase', asset: 'house' }), /Complete your first three jobs/);
  const s = act(starterDone(), { type: 'purchase', asset: 'car' });
  assert.equal(s.asset, 'car'); assert.equal(liquid(s), 200); assert.equal(s.stage, 'careers'); assert.equal(chapter(s), 1);
  const custom = act(s, { type: 'customize', color: '#ff6b6b', style: 'sporty' });
  assert.equal(custom.assetColor, '#ff6b6b'); assert.equal(custom.assetStyle, 'sporty');
  assert.throws(() => act(s, { type: 'customize', color: 'red', style: 'sporty' }), /valid customization/);
  assert.equal(act(s, { type: 'shift', job: 'factory' }).wallet, 1100);
});

test('rent alert: hiding earns $500, getting caught costs up to $200', () => {
  const s = act(starterDone(), { type: 'purchase', asset: 'house' });
  assert.equal(act(s, { type: 'rent', hidden: true }).wallet, 700);
  const caught = act(s, { type: 'rent', hidden: false });
  assert.equal(liquid(caught), 0); assert.equal(caught.spent, 1200);
  assert.equal(act(s, { type: 'rent', hidden: true }).rentEscapes, 1);
});

test('costumes can only be worn once unlocked', () => {
  const s = act(started(), { type: 'shift', job: 'cinema' });
  assert.equal(act(s, { type: 'costume', costume: 'Spider-Llama' }).costume, 'Spider-Llama');
  assert.throws(() => act(s, { type: 'costume', costume: 'Officer Llama' }), /Complete the related job/);
});

test('three advanced careers trigger the two-year time skip to $1,000,000', () => {
  let s = act(starterDone(), { type: 'purchase', asset: 'house' });
  s = run(s, { type: 'shift', job: 'factory' }, { type: 'shift', job: 'hotel' });
  assert.equal(s.stage, 'careers');
  s = act(s, { type: 'shift', job: 'police' });
  assert.equal(s.stage, 'timeskip'); assert.equal(completed(s, true), 3);
  s = act(s, { type: 'timeskip' });
  assert.equal(s.stage, 'robbery'); assert.ok(liquid(s) >= 1000000); assert.equal(chapter(s), 2);
  assert.throws(() => act(s, { type: 'timeskip' }), /Finish your three new careers/);
});

const millionaire = () => run(starterDone(), { type: 'purchase', asset: 'house' }, { type: 'shift', job: 'factory' }, { type: 'shift', job: 'hotel' }, { type: 'shift', job: 'police' }, { type: 'timeskip' });

test('defending the mansion deducts what the thieves stole and founds the company', () => {
  const before = liquid(millionaire());
  const s = act(millionaire(), { type: 'defend', stolen: 50000 });
  assert.equal(liquid(s), before - 50000); assert.equal(s.company, 1); assert.equal(s.stage, 'business'); assert.equal(chapter(s), 3);
  assert.equal(liquid(act(millionaire(), { type: 'defend', stolen: -5 })), before, 'negative theft is ignored');
  assert.throws(() => act(s, { type: 'defend' }), /safe for now/);
});

test('business: income per tick grows with level and upgrades get pricier', () => {
  let s = act(millionaire(), { type: 'defend', stolen: 0 });
  assert.equal(income(s), 50000); assert.equal(upgradeCost(s), 350000);
  s = act(s, { type: 'businessTick' });
  assert.equal(s.businessIncome, 50000);
  const cash = liquid(s);
  s = act(s, { type: 'upgrade' });
  assert.equal(s.company, 2); assert.equal(liquid(s), cash - 350000); assert.equal(income(s), 140000); assert.equal(upgradeCost(s), 910000);
  assert.throws(() => act(started(), { type: 'upgrade' }), /cannot be upgraded/);
});

test('stock market: prices move at most ±8%, trades update holdings and net worth', () => {
  let s = act(millionaire(), { type: 'defend', stolen: 0 });
  const price = s.prices.netflix;
  s = act(s, { type: 'market', changes: { netflix: 0.05, apple: 0.5, tesla: -0.2 } });
  assert.equal(s.prices.netflix, Math.round(price * 1.05 * 100) / 100);
  assert.equal(s.prices.apple, STOCKS.find(x => x.id === 'apple').price, 'out-of-range moves are ignored');
  const cash = liquid(s);
  s = act(s, { type: 'trade', stock: 'netflix', side: 'buy', quantity: 10 });
  assert.equal(s.holdings.netflix, 10); assert.equal(liquid(s), Math.round((cash - 10 * s.prices.netflix) * 100) / 100);
  assert.equal(portfolio(s), Math.round(10 * s.prices.netflix * 100) / 100); assert.equal(wealth(s), Math.round((liquid(s) + portfolio(s)) * 100) / 100);
  assert.throws(() => act(s, { type: 'trade', stock: 'netflix', side: 'sell', quantity: 11 }), /do not own/);
  s = act(s, { type: 'trade', stock: 'netflix', side: 'sell', quantity: 10 });
  assert.equal(s.holdings.netflix, 0); assert.equal(liquid(s), cash);
  assert.throws(() => act(s, { type: 'trade', stock: 'netflix', side: 'buy', quantity: 0 }), /valid number/);
  assert.throws(() => act(started(), { type: 'trade', stock: 'netflix', side: 'buy', quantity: 1 }), /valid number/);
});

test('one billion dollars unlocks the Moon and the Lunar billionaire suit', () => {
  let s = act(millionaire(), { type: 'defend', stolen: 0 });
  // fast-forward with a giant trade instead of thousands of ticks
  s = { ...s, prices: { ...s.prices, tesla: 1e6 }, holdings: { tesla: 1200 } };
  s = act(s, { type: 'businessTick' });
  assert.equal(s.stage, 'moon'); assert.equal(s.costume, 'Lunar billionaire'); assert.equal(chapter(s), 4);
  s = act(s, { type: 'moon' });
  assert.equal(s.stage, 'freeplay');
  s = act(s, { type: 'quest', id: 'helper' });
  assert.ok(s.sideQuests.includes('helper'));
  assert.throws(() => act(s, { type: 'quest', id: 'helper' }), /not available/);
  assert.throws(() => act(started(), { type: 'celebrate' }), /still ahead/);
  assert.equal(act(s, { type: 'celebrate' }).celebration, true);
});

test('lucky coins pay $25 once each', () => {
  let s = act(started(), { type: 'coin', id: 3 });
  assert.equal(s.wallet, 25);
  s = act(s, { type: 'coin', id: 3 });
  assert.equal(s.wallet, 25);
  assert.equal(act(s, { type: 'coin', id: 99 }).wallet, 25);
});

test('ledger keeps the 30 most recent entries', () => {
  const s = shifts(started(), 'burger', 40);
  assert.equal(s.ledger.length, 30);
});

test('loadGame restores a valid save and rejects tampered ones', () => {
  const mem = new Map(); const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(loadGame(storage).started, false);
  const s = act(starterDone(), { type: 'purchase', asset: 'car' });
  storage.setItem(SAVE_KEY, JSON.stringify(s));
  assert.deepEqual(loadGame(storage), s);
  for (const bad of [{ wallet: -5 }, { stage: 'cheat' }, { company: 42 }, { costume: 'Officer Llama' }, { holdings: { netflix: 1.5 } }, { assetColor: 'blue' }, { collectibles: [99] }]) {
    storage.setItem(SAVE_KEY, JSON.stringify({ ...s, ...bad }));
    assert.equal(loadGame(storage).started, false, `rejects ${JSON.stringify(bad)}`);
  }
  storage.setItem(SAVE_KEY, '{not json');
  assert.equal(loadGame(storage).started, false);
});

test('every job has a unique location and costume', () => {
  assert.equal(new Set(JOBS.map(j => j.costume)).size, JOBS.length);
  assert.equal(new Set(JOBS.map(j => j.location.join(','))).size, JOBS.length);
  assert.deepEqual(JOBS.map(j => j.pay), [400, 400, 400, 900, 900, 900]);
});
