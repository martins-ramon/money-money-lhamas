import './style.css';
import { icon, llamaLogo } from './icons.js';
import { JOBS, STOCKS, CHAPTERS, money, initialState, loadGame, act, liquid, portfolio, wealth, chapter, income, upgradeCost, completed, SAVE_KEY } from './model.js';
import { World, preview } from './world.js';
import { playShift, defendMansion, playQuiz } from './minigames.js';
import { missionFor, readSettings, SETTINGS_KEY } from './experience.js';
import { celebrate, drawMap } from './feedback.js';

const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (TOUCH) document.body.classList.add('touch-device');
const CHARACTERS = { anna: { name: 'Anna', blurb: 'Curious, brave and always hungry for cupcakes.' }, carlos: { name: 'Carlos', blurb: 'Laid-back dreamer with a head for numbers.' } };
const RENT_STAGES = ['careers', 'business', 'freeplay'];
const BUSINESS_TICK = 8;

/* ---------- Audio ---------- */
let audio;
function sfx(kind) {
  if (state.muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain(); o.connect(g); g.connect(audio.destination);
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const notes = { jump: [260, 390], land: [150, 110], coin: [880, 1320], ok: [523, 659, 784], bad: [220, 180], bonk: [300, 520, 240], alert: [660, 440, 660, 440], cash: [660, 880, 1100] }[kind] || [600];
    o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; g.gain.value = 0.08;
    notes.forEach((f, i) => o.frequency.setValueAtTime(f, audio.currentTime + i * 0.09));
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + notes.length * 0.09 + 0.15);
    o.start(); o.stop(audio.currentTime + notes.length * 0.09 + 0.2);
  } catch { /* audio unavailable */ }
}

/* ---------- DOM skeleton ---------- */
const app = document.getElementById('app');
app.innerHTML = `
  <canvas class="world" tabindex="0" aria-label="Game world. WASD or arrows to move, Shift to sprint, Space to jump, E to interact, Escape to pause."></canvas>
  <div class="hud hidden" data-hud>
    <div class="hud-top">
      <div class="hud-profile"><div class="avatar">${llamaLogo}</div><div><b data-name>Anna</b><small data-costume>Street dreamer</small></div></div>
      <div class="hud-money"><span class="money" data-wallet>$0</span><small data-savings>Savings $0</small><small data-worth>Net worth $0</small></div>
    </div>
    <div class="hud-spacer"></div>
    <div class="hud-bottom">
      <div class="journey-status"><div class="tag" data-chapter>Chapter 1</div><small data-save-status>Progress saved on this device</small></div>
      <div class="hud-actions">
        <button class="btn icon" data-open="map" title="Town guide (M)" aria-label="Town guide">${icon('map')}</button>
        <button class="btn icon" data-open="wallet" title="Wallet & Piggy Bank">${icon('wallet')}</button>
        <button class="btn icon" data-open="wardrobe" title="Wardrobe">${icon('shirt')}</button>
        <button class="btn icon" data-open="report" title="Money report">${icon('chart')}</button>
        <button class="btn icon" data-open="menu" title="Menu">${icon('help')}</button>
      </div>
    </div>
  </div>
  <section class="mission-card hidden" data-mission aria-label="Current mission">
    <div class="mission-eyebrow">YOUR NEXT BIG THING <span data-mission-count></span></div>
    <h2 data-mission-title></h2><p data-mission-detail></p>
    <div class="progress" role="progressbar" aria-label="Mission progress" aria-valuemin="0" aria-valuemax="100" data-mission-progress><i data-mission-fill></i></div>
    <button class="destination" data-route><span class="route-arrow" data-route-arrow>↑</span><span data-route-label>Follow the golden beacon</span><b data-route-distance></b></button>
  </section>
  <button class="minimap hidden" data-minimap title="Open town guide (M)" aria-label="Open town guide"><span>LLAMA TOWN <b>MAP ↗</b></span><canvas width="208" height="208" aria-hidden="true"></canvas><small>● You · Gold = destination</small></button>
  <div class="control-hint hidden" data-controls><kbd>W A S D</kbd> move <kbd>Shift</kbd> sprint <kbd>Space</kbd> jump <kbd>M</kbd> map <kbd>Esc</kbd> pause</div>
  <div class="objective hidden" data-objective></div>
  <div class="rent-banner hidden" data-rent></div>
  <div class="toast-area" data-toasts role="status" aria-live="polite"></div>
  <div class="celebration-layer" data-celebration role="status" aria-live="polite"></div>
  <button class="prompt hidden" data-prompt></button>
  <div class="touch hidden" data-touch>
    <div class="joystick" data-joy><div class="knob" data-knob></div></div>
    <div class="touch-buttons"><button class="btn lilac" data-sprint aria-pressed="false">⚡<br>Run</button><button class="btn sky" data-jump>⬆<br>Jump</button><button class="btn action" data-action>Action</button></div>
  </div>
  <div data-overlay></div>`;
const $ = sel => app.querySelector(sel);
const canvas = $('canvas.world'), hud = $('[data-hud]'), overlayRoot = $('[data-overlay]'), promptEl = $('[data-prompt]');

/* ---------- State ---------- */
let storage;
try { storage = window.localStorage; } catch { /* Gameplay remains available without storage. */ }
let state = loadGame(storage);
const settings = readSettings(storage, { touch: TOUCH, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
const world = new World(canvas, { touch: TOUCH });
world.applySettings(settings);
document.body.classList.toggle('reduced-motion', settings.reducedMotion);
let busy = false, stageBusy = false, rent = null, nextRentAt = 0, businessAcc = 0, lastTick = performance.now();
let trackedId = null, navigationAt = 0;
const awardQueue = []; let nextAwardAt = 0;
const actionBtn = $('[data-action]');

function save() {
  try { if (!storage) throw new Error('Storage unavailable'); storage.setItem(SAVE_KEY, JSON.stringify(state)); $('[data-save-status]').textContent = '✓ Progress saved on this device'; }
  catch { $('[data-save-status]').textContent = 'Session only · saving unavailable'; }
}
function award(title, detail) { awardQueue.push({ title, detail }); }
function toast(text, kind) {
  const area = $('[data-toasts]'); if (area.children.length >= 3) area.firstElementChild.remove();
  const t = document.createElement('div'); t.className = `toast ${kind === 'bad' ? 'toast-error' : ''}`; t.textContent = text; area.appendChild(t); setTimeout(() => t.remove(), 3200);
  if (kind) sfx(kind);
}
const pendingStages = [];
function dispatch(action) {
  const previous = state, before = state.stage;
  try { state = act(state, action); } catch (e) { toast(e.message, 'bad'); return false; }
  save(); syncHUD();
  if (action.type === 'shift' && !previous.shifts[action.job]) { const job = JOBS.find(j => j.id === action.job); award('New outfit unlocked!', `${job.costume} · Your first shift at ${job.name}`); }
  if (action.type === 'purchase') award('From park bench to proud owner', `Your first ${state.asset}. You made it happen.`);
  if (action.type === 'timeskip') award('Hello, millionaire!', 'A mansion. A new life. A million possibilities.');
  if (action.type === 'upgrade') award(`Llama Labs · Level ${state.company}`, `${money(income(state), true)} every 8 seconds. Dream bigger.`);
  if (action.type === 'coin' && state.collectibles.length === 12 && previous.collectibles.length < 12) award('Golden hoof explorer', 'All 12 lucky coins found!');
  if (action.type === 'quest') award('Good deeds. Great company.', `${state.sideQuests.length}/3 free-world adventures complete.`);
  if (action.type === 'celebrate') award('From zero to the Moon', 'Your adventure. Your friends. Your moment.');
  if (before !== state.stage) { trackedId = null; pendingStages.push([before, state.stage]); }
  return true;
}
const synced = {};
function syncHUD() {
  $('[data-name]').textContent = CHARACTERS[state.character].name; $('[data-costume]').textContent = state.costume;
  $('[data-wallet]').textContent = money(state.wallet); $('[data-savings]').textContent = `Savings ${money(state.savings)}`; $('[data-worth]').textContent = `Net worth ${money(wealth(state), wealth(state) >= 1e6)}`;
  $('[data-chapter]').textContent = `Ch. ${chapter(state) + 1} · ${CHAPTERS[chapter(state)]}`;
  const body = state.character === 'carlos' ? 0xe8caa4 : 0xfff1d6;
  if (world.playerMesh.userData.costume !== state.costume || world.bodyColor !== body) { world.bodyColor = body; world.setCostume(state.costume); }
  const assetKey = `${state.asset}|${state.assetColor}|${state.assetStyle}`;
  if (synced.asset !== assetKey) { synced.asset = assetKey; world.setAsset(state.asset, state.assetColor, state.assetStyle); }
  const stageKey = `${state.stage}|${state.sideQuests.join(',')}`;
  if (synced.stage !== stageKey) { synced.stage = stageKey; world.setStage(state.stage, state); }
  world.setCollectibles(state.collectibles);
  const o = $('[data-objective]'); o.innerHTML = objective(); o.classList.toggle('hidden', !state.started);
  const mission = missionFor(state);
  $('[data-mission-title]').textContent = mission.title;
  $('[data-mission-detail]').textContent = mission.detail;
  $('[data-mission-count]').textContent = mission.count;
  $('[data-mission-fill]').style.width = `${mission.progress * 100}%`;
  $('[data-mission-progress]').setAttribute('aria-valuenow', Math.round(mission.progress * 100));
}
function objective() {
  const s = state, done = completed(s), adv = completed(s, true);
  switch (s.stage) {
    case 'beginning': return done < 3 ? `${icon('briefcase', 16)} Work at the three starter jobs <b>(${done}/3)</b>. Each shift pays <b>$400</b>.` : `${icon('coin', 16)} Save up <b>$1,000</b> for your first place or car — you have <b>${money(liquid(s))}</b>. Repeat any job!`;
    case 'purchase': return `${icon('home', 16)} Goal reached! Visit <b>YOUR FUTURE HOME</b> plot to buy a house or a car ($1,000).`;
    case 'careers': return `${icon('sparkles', 16)} New careers unlocked: factory, hotel & police <b>(${adv}/3)</b> — <b>$900</b> each. Watch out for Mr. Barriga!`;
    case 'robbery': return `${icon('pin', 16)} Two years later… head to your <b>mansion</b>. Something feels off.`;
    case 'business': return `${icon('chart', 16)} Grow <b>Llama Labs</b> and your stocks until your net worth hits <b>$1B</b> — now ${money(wealth(s), true)}.`;
    case 'moon': return `${icon('moon', 16)} Meet <b>Elo Musk</b> at the Moon house to sign the deal.`;
    case 'freeplay': return s.celebration ? `${icon('trophy', 16)} You did it! Keep exploring the free world.` : `${icon('map', 16)} Free world! Complete side missions <b>(${s.sideQuests.length}/3)</b> — picnic, explorer and the <b>math homework quiz</b> — then start the <b>BBQ party</b>.`;
    default: return '';
  }
}

/* ---------- Overlays ---------- */
function open(html, cls = '') {
  busy = true; world.frozen = true; world.resetInput(); promptEl.classList.add('hidden');
  hud.inert = true; $('[data-touch]').inert = true; document.body.classList.add('panel-open');
  overlayRoot.innerHTML = `<div class="overlay ${cls}" role="dialog" aria-modal="true" aria-label="Game panel"><div class="panel">${html}</div></div>`;
  const el = overlayRoot.firstElementChild;
  el.setAttribute('aria-label', el.querySelector('h1, h2')?.textContent || 'Game panel');
  queueMicrotask(() => { if (el.isConnected) el.querySelector('button:not([disabled]), input')?.focus({ preventScroll: true }); });
  el.querySelectorAll('[data-close]').forEach(b => (b.onclick = close));
  return el;
}
function close() {
  overlayRoot.innerHTML = ''; busy = false; world.frozen = false; world.resetInput();
  hud.inert = false; $('[data-touch]').inert = false; document.body.classList.remove('panel-open');
  $('[data-knob]').style.transform = ''; $('[data-sprint]').setAttribute('aria-pressed', 'false');
  canvas.focus({ preventScroll: true });
}
const head = (title, sub = '') => `<div class="card"><div class="panel-head"><div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div><button class="btn icon ghost" data-close aria-label="Close">${icon('close')}</button></div></div>`;
const stat = (label, value, cls = '') => `<div class="stat"><small>${label}</small><span class="money ${cls}">${value}</span></div>`;
const gameCredits = () => `
  <section class="game-credits" lang="pt-BR" aria-labelledby="game-credits-heading">
    <img class="game-credits-photo" src="${import.meta.env.BASE_URL}images/vicente.jpg" alt="Foto de Vicente Mitczuck da Silva" width="1206" height="1918">
    <div class="game-credits-copy">
      <h2 id="game-credits-heading">Créditos</h2>
      <p class="game-credits-byline">Um jogo de</p>
      <h3>Vicente Mitczuck da Silva</h3>
      <p>11 anos · Maple Bear Porto Alegre</p>
      <p class="game-credits-class">Year 6 - Morning</p>
      <p class="game-credits-subject">Apresentado na aula de matemática financeira</p>
    </div>
  </section>`;

function titleScreen() {
  const el = open(`
    <div class="title" data-locked>
      <div class="title-kicker">A SMALL LLAMA. AN OUTRAGEOUS DREAM.</div>
      <div class="logo">${llamaLogo}</div>
      <p class="game-wordmark">MONEY MONEY LHAMAS</p>
      <h1>Empty pockets.<br><span>Moon-sized dreams.</span></h1>
      <p class="lead">Your first paycheck. Your own empire. A home among the stars. Every big dream starts with four little hooves.</p>
      <div class="dream-route" aria-label="Your journey"><span>01 · FIRST PAYCHECK</span><i>→</i><span>02 · YOUR EMPIRE</span><i>→</i><span>03 · THE MOON</span></div>
      ${state.started ? `<button class="btn continue-btn" data-continue>${icon('play')} Continue as ${CHARACTERS[state.character].name}<small>Chapter ${chapter(state) + 1} · ${money(wealth(state), true)}</small></button>` : '<p class="character-invite">CHOOSE YOUR DREAMER</p>'}
      <div class="choice-grid" style="width:100%">
        ${Object.entries(CHARACTERS).map(([id, c]) => `<button class="choice character-card" data-pick="${id}"><canvas width="240" height="240"></canvas><b>${c.name}</b><small>${c.blurb}</small></button>`).join('')}
      </div>
      <button class="btn ghost small" data-title-sound>${icon(state.muted ? 'mute' : 'sound')} Sound ${state.muted ? 'off — tap to enable' : 'on'}</button>
      <p class="credits">${TOUCH ? 'Drag the joystick to walk · swipe the right side to look around · big buttons to jump and act.' : 'WASD / arrows to walk · drag the mouse to look · Space to jump · E to interact.'}</p>
      ${gameCredits()}
    </div>`, 'scene');
  const stops = [...el.querySelectorAll('[data-pick]')].map(b => preview(b.querySelector('canvas'), b.dataset.pick === 'anna' ? 'Girlfriend' : 'Street dreamer', b.dataset.pick === 'anna' ? 0xfff1d6 : 0xe8caa4, settings.reducedMotion));
  const begin = () => { stops.forEach(s => s()); close(); canvas.focus(); hud.classList.remove('hidden'); $('[data-touch]').classList.toggle('hidden', !TOUCH); syncHUD(); if (!state.shifts || !Object.keys(state.shifts).length) intro(); if (state.stage === 'timeskip') pendingStages.push(['careers', 'timeskip']); scheduleRent(); sfx('ok'); };
  el.querySelectorAll('[data-pick]').forEach(b => (b.onclick = () => { if (state.started && state.character !== b.dataset.pick && !confirm('Start a brand new adventure? Your current progress will be replaced.')) return; if (!state.started || state.character !== b.dataset.pick) { state = initialState(); } dispatch({ type: 'start', character: b.dataset.pick }); begin(); }));
  el.querySelector('[data-continue]')?.addEventListener('click', begin);
  el.querySelector('[data-title-sound]').onclick = e => { dispatch({ type: 'mute' }); e.currentTarget.innerHTML = `${icon(state.muted ? 'mute' : 'sound')} Sound ${state.muted ? 'off — tap to enable' : 'on'}`; sfx('ok'); };
}
function intro() {
  const name = CHARACTERS[state.character].name;
  const el = open(`
    <div class="card stack">
      <div class="big-emoji">🦙💤</div>
      <h2>Little beginnings</h2>
      <div class="speech">“Ugh… sleeping on a park bench again. That’s it, ${name}! Today I stop being broke and start getting <b>rich</b>.”</div>
      <p>Follow the <b>golden beacon</b> to your first job at McLlama’s. Every shift pays <b>$400</b>. Complete all three starter jobs and save <b>$1,000</b> for your first home or car.</p>
      <div class="onboarding-steps"><span><b>01</b> Follow the beacon</span><span><b>02</b> ${TOUCH ? 'Tap Action' : 'Press E'} at the door</span><span><b>03</b> Earn. Save. Dream bigger.</span></div>
      <p class="muted">${TOUCH ? 'Use the Run button for a burst of speed.' : 'Hold Shift to sprint. Press M for the town guide, or Esc to take a break.'} Lucky coins are hidden around town — every one is worth $25.</p>
      <div class="formula">📐 <b>Financial math tip:</b> money in the Piggy Bank earns <code>2% interest per shift</code>. Interest = savings × 0.02.</div>
      <button class="btn" data-close>${icon('arrow')} Let’s go!</button>
    </div>`);
}

function paycheck(job) {
  const s = state, interest = s.ledger[1]?.label.startsWith('Savings interest') ? s.ledger[1].amount : 0, goal = ['beginning', 'purchase'].includes(s.stage) ? 1000 : null;
  const el = open(`
    ${head(`Payday at ${job.name}!`, `You earned <b>${money(job.pay)}</b> as a ${job.role.toLowerCase()}.`)}
    <div class="card stack">
      <div class="stat-grid">${stat('Wallet', money(s.wallet))}${stat('Piggy Bank', money(s.savings))}${stat('Liquid total', money(liquid(s)))}</div>
      ${s.savings || interest ? `<div class="formula">📐 Interest this shift: <code>${money(s.savings - interest)} × 2% = ${money(interest)}</code>. Your savings grow every time you work!</div>` : ''}
      ${goal ? `<div><div class="row" style="justify-content:space-between"><span>Goal: first house or car</span><b>${money(liquid(s))} / ${money(goal)}</b></div><div class="progress"><i style="width:${Math.min(100, (liquid(s) / goal) * 100)}%"></i></div></div>` : ''}
      <h3>What will you do with your money?</h3>
      <div class="choice-grid">
        <button class="choice" data-do="save"><div class="ico">${icon('coin')}</div><b>Save it</b><small>Move your whole wallet into the Piggy Bank and earn 2% each shift.</small></button>
        <button class="choice" data-do="spend"><div class="ico">${icon('sparkles')}</div><b>Spend it</b><small>Treat yourself to a meal ($60) or fresh streetwear ($120).</small></button>
      </div>
      <button class="btn ghost small" data-close>Keep it in my wallet for now</button>
    </div>`);
  el.querySelector('[data-do="save"]').onclick = () => { if (dispatch({ type: 'save' })) { toast('Saved! Your Piggy Bank is growing.', 'cash'); close(); } };
  el.querySelector('[data-do="spend"]').onclick = () => {
    const box = el.querySelector('.choice-grid'); box.innerHTML = `
      <button class="choice" data-item="food"><div class="ico">🍔</div><b>Food · $60</b><small>A delicious llama burger. Yum, but it doesn’t grow.</small></button>
      <button class="choice" data-item="clothes"><div class="ico">${icon('shirt')}</div><b>Clothes · $120</b><small>Unlocks the Fresh Streetwear outfit.</small></button>`;
    box.querySelectorAll('[data-item]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'spend', item: b.dataset.item })) { toast(b.dataset.item === 'food' ? 'Delicious! -$60' : 'Looking fresh! -$120 · outfit unlocked', 'ok'); close(); } }));
  };
}

function walletPanel() {
  const s = state, projected = Math.round(s.savings * 0.02 * 100) / 100;
  const el = open(`
    ${head('Wallet & Piggy Bank', 'Cash in your wallet does nothing. Savings earn 2% every shift you work.')}
    <div class="card stack">
      <div class="stat-grid">${stat('Wallet', money(s.wallet))}${stat('Piggy Bank', money(s.savings))}${stat('Interest earned so far', money(s.interest), 'pos')}</div>
      <div class="formula">📐 Next shift interest: <code>${money(s.savings)} × 0.02 = ${money(projected)}</code><br>After 5 shifts without touching it: <code>${money(s.savings)} × 1.02⁵ ≈ ${money(s.savings * 1.02 ** 5)}</code> (compound interest!)</div>
      <div class="row"><button class="btn sage" data-save ${s.wallet <= 0 ? 'disabled' : ''}>${icon('coin')} Deposit all (${money(s.wallet)})</button></div>
    </div>`);
  el.querySelector('[data-save]').onclick = () => { if (dispatch({ type: 'save' })) { toast('Deposited into the Piggy Bank!', 'cash'); walletPanel(); } };
}
function wardrobePanel() {
  const all = ['Street dreamer', 'Fresh streetwear', ...JOBS.map(j => j.costume), 'Lunar billionaire'];
  const el = open(`
    ${head('Wardrobe', 'Outfits are unlocked by finishing jobs and reaching milestones.')}
    <div class="card"><div class="choice-grid">${all.map(c => { const has = state.costumes.includes(c), job = JOBS.find(j => j.costume === c); return `<button class="choice ${state.costume === c ? 'selected' : ''}" data-c="${c}" ${has ? '' : 'disabled'}><div class="ico">${icon(has ? (job?.icon || 'shirt') : 'lock')}</div><b>${c}</b><small>${has ? (state.costume === c ? 'Wearing now' : 'Tap to wear') : job ? `Finish a shift at ${job.name}` : c === 'Lunar billionaire' ? 'Reach $1 billion' : 'Buy clothes ($120)'}</small></button>`; }).join('')}</div></div>`);
  el.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'costume', costume: b.dataset.c })) { sfx('ok'); wardrobePanel(); } }));
}
function reportPanel() {
  const s = state;
  open(`
    ${head('Money report', `${CHARACTERS[s.character].name}’s financial journey so far.`)}
    <div class="card stack">
      <div class="stat-grid">${stat('Total earned', money(s.earned), 'pos')}${stat('Total spent', money(s.spent), 'neg')}${stat('Interest earned', money(s.interest), 'pos')}${stat('Business income', money(s.businessIncome, true), 'pos')}${stat('Stock portfolio', money(portfolio(s), true))}${stat('Net worth', money(wealth(s), wealth(s) >= 1e6))}${stat('Rent escapes', s.rentEscapes)}${stat('Lucky coins', `${s.collectibles.length}/12`)}</div>
      <div class="formula">📐 <code>Net worth = wallet + savings + (shares × price)</code> · Savings rate = <code>${s.earned ? Math.round(((s.earned - s.spent) / s.earned) * 100) : 0}%</code> of everything you earned is still yours.</div>
      <h3>Recent transactions</h3>
      <div class="ledger">${s.ledger.length ? s.ledger.map(e => `<div><span>${e.label}</span><b class="${e.amount > 0 ? 'pos' : e.amount < 0 ? 'neg' : ''}">${e.amount ? (e.amount > 0 ? '+' : '') + money(e.amount) : '—'}</b></div>`).join('') : '<p class="muted">Nothing yet — go earn your first paycheck!</p>'}</div>
    </div>`);
}
function menuPanel() {
  const el = open(`
    ${head('Take a little breather', 'World and rent chase paused. Your adventure will be right here.')}
    <div class="card stack">
      <button class="btn" data-close>${icon('play')} Back to the adventure</button>
      <p><b>How to play:</b> ${TOUCH ? 'joystick to walk, swipe the right side of the screen to look, and use the big buttons to jump and act.' : 'WASD or arrows to walk, drag the mouse to look around, Space to jump, E to interact.'}</p>
      <p><b>Rent alert:</b> when Mr. Barriga shows up you have 40 seconds to hide in a bush. If he finds you, rent is $200. If he doesn’t, you pocket $500!</p>
      <p><b>Chaos mode:</b> run or jump into the townsfolk llamas to send them flying. It’s free, it’s silly, and it teaches nothing about finance.</p>
      <div class="row"><button class="btn ghost" data-mute>${icon(state.muted ? 'mute' : 'sound')} Sound ${state.muted ? 'off' : 'on'}</button><button class="btn coral" data-reset>${icon('reset')} New game</button></div>
      <div class="settings-grid">
        <label>Visual quality<select data-quality><option value="high" ${settings.quality === 'high' ? 'selected' : ''}>High · shadows & crisp detail</option><option value="balanced" ${settings.quality === 'balanced' ? 'selected' : ''}>Balanced · smoother on mobile</option></select></label>
        <label class="setting-toggle"><span>Reduced motion<small>Gentler celebrations, no particles or sprint zoom</small></span><input type="checkbox" data-motion ${settings.reducedMotion ? 'checked' : ''}></label>
        <label class="setting-toggle"><span>Show minimap</span><input type="checkbox" data-show-map ${settings.showMap ? 'checked' : ''}></label>
      </div>
    </div>
    ${gameCredits()}`);
  el.querySelector('[data-mute]').onclick = () => { dispatch({ type: 'mute' }); menuPanel(); };
  const apply = () => {
    settings.quality = el.querySelector('[data-quality]').value; settings.reducedMotion = el.querySelector('[data-motion]').checked; settings.showMap = el.querySelector('[data-show-map]').checked;
    world.applySettings(settings); document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    try { storage?.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Session preferences still apply. */ }
  };
  el.querySelectorAll('select, input').forEach(input => input.addEventListener('change', apply));
  el.querySelector('[data-reset]').onclick = () => { if (confirm('Erase your progress and start over?')) { state = initialState(); save(); location.reload(); } };
}

function destination() {
  if (rent) {
    const position = world.hiding.reduce((best, p) => !best || p.distanceTo(world.player.pos) < best.distanceTo(world.player.pos) ? p : best, null);
    return position ? { id: 'shelter', label: 'Hide in a bush', position, radius: 2.1 } : null;
  }
  const mission = missionFor(state), id = trackedId || mission.id;
  const target = world.interactables.find(it => it.id === id && world.available(it) && ((it.type === 'moon') === (state.stage === 'moon')) && (it.type !== 'home' || world.plot.visible));
  if (!target && trackedId) { trackedId = null; return destination(); }
  return target;
}
function mapPanel() {
  const mission = missionFor(state);
  const places = world.interactables.filter(it => world.available(it) && ((it.type === 'moon') === (state.stage === 'moon')) && (it.type !== 'home' || world.plot.visible));
  const el = open(`${head('A town full of possibilities', 'Pick a destination. The golden beacon and compass will guide you there.')}
    <div class="card stack"><button class="btn" data-auto>${icon('sparkles')} Follow my next mission</button><div class="destination-grid">${places.map(it => {
      const job = JOBS.find(j => j.id === it.id), done = !!state.shifts[it.id], distance = Math.round(it.position.distanceTo(world.player.pos));
      return `<button class="choice ${it.id === (trackedId || mission.id) ? 'selected' : ''}" data-track="${it.id}"><span class="tag">${job ? (done ? '✓ SHIFT COMPLETE' : `${money(job.pay)} / SHIFT`) : 'EXPLORE'} · ${distance} m</span><b>${job?.name || it.label}</b><small>${job ? job.description : 'Set a waypoint and explore.'}</small></button>`;
    }).join('')}</div><p class="muted">The compass points directly to your destination; walk around buildings along the streets. During rent alerts, it points to the nearest hiding bush.</p></div>`);
  el.querySelector('[data-auto]').onclick = () => { trackedId = null; close(); };
  el.querySelectorAll('[data-track]').forEach(b => { b.onclick = () => { trackedId = b.dataset.track; close(); toast('Destination set. Follow the golden beacon.', 'ok'); }; });
}

function purchasePanel() {
  const el = open(`
    ${head('Your first big purchase!', 'You saved $1,000. Time to decide what matters most to you.')}
    <div class="card stack">
      <div class="choice-grid">
        <button class="choice" data-asset="house"><div class="ico">${icon('home')}</div><b>First house · $1,000</b><small>A cozy little place. Nobody can evict you from your own home… mostly.</small></button>
        <button class="choice" data-asset="car"><div class="ico">${icon('car')}</div><b>First car · $1,000</b><small>Freedom on four wheels. Fully customizable!</small></button>
      </div>
      <div class="formula">📐 A house is an <b>asset</b> that usually keeps its value; a car is an asset that <b>depreciates</b>. Both cost the same today — what will you choose?</div>
    </div>`);
  el.querySelectorAll('[data-asset]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'purchase', asset: b.dataset.asset })) { sfx('cash'); customizePanel(true); } }));
}
function customizePanel(fresh = false) {
  const colors = ['#ff6b6b', '#ffb37a', '#ffd94d', '#9dd39a', '#8fd4ff', '#c8b4f2', '#2b2a33', '#fffaf0'];
  const el = open(`
    ${head(fresh ? `Congrats on your first ${state.asset}!` : `Customize your ${state.asset}`, 'Pick a color and a style. Changes are free.')}
    <div class="card stack">
      <h3>Color</h3><div class="swatches">${colors.map(c => `<button class="swatch ${state.assetColor === c ? 'selected' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>
      <h3>Style</h3><div class="row">${['classic', 'sporty', 'cozy'].map(st => `<button class="btn small ${state.assetStyle === st ? '' : 'ghost'}" data-style="${st}">${st[0].toUpperCase() + st.slice(1)}</button>`).join('')}</div>
      ${fresh ? `<p>Now the <b>advanced careers</b> are open: Tiny Tails Factory, The Grand Llama hotel and Hooves PD pay <b>$900</b> per shift. But beware… <b>Mr. Barriga</b> will come for the rent!</p>` : ''}
      <button class="btn" data-close>${icon('check')} Looks great!</button>
    </div>`);
  el.querySelectorAll('[data-color]').forEach(b => (b.onclick = () => { dispatch({ type: 'customize', color: b.dataset.color, style: state.assetStyle }); customizePanel(fresh); }));
  el.querySelectorAll('[data-style]').forEach(b => (b.onclick = () => { dispatch({ type: 'customize', color: state.assetColor, style: b.dataset.style }); customizePanel(fresh); }));
}

function businessPanel() {
  const s = state, cur = income(s), next = 50000 * 2.8 ** s.company, cost = upgradeCost(s), payback = Math.ceil(cost / (next - cur));
  const el = open(`
    ${head('Llama Labs HQ', 'Your company pays you every 8 seconds. Upgrade it and invest in stocks to reach $1B.')}
    <div class="card stack">
      <div class="row" style="justify-content:space-between"><span>Net worth</span><b class="money" data-business-worth>${money(wealth(s), true)} / $1B</b></div>
      <div class="progress"><i data-business-progress style="width:${Math.min(100, (wealth(s) / 1e9) * 100)}%"></i></div>
      <div class="stat-grid">${stat('Company level', `${s.company} / 9`)}${stat('Income per tick', money(cur, true), 'pos')}${stat('Cash available', `<span data-business-cash>${money(liquid(s), true)}</span>`)}</div>
      ${s.company < 9 ? `<div class="formula">📐 Upgrade to level ${s.company + 1}: cost <code>${money(cost, true)}</code> → income <code>${money(next, true)}</code> per tick. Payback ≈ <code>${money(cost, true)} ÷ ${money(next - cur, true)} = ${payback} ticks</code> (${payback * BUSINESS_TICK}s).</div>` : '<div class="formula">🏆 Max level reached! Your company is a money machine.</div>'}
      <button class="btn sage" data-upgrade ${s.company >= 9 || liquid(s) < cost ? 'disabled' : ''}>${icon('sparkles')} Upgrade company (${money(cost, true)})</button>
    </div>
    <div class="card stack">
      <h3>${icon('chart', 18)} Stock market</h3>
      <p class="muted">Prices move up to ±8% every tick. Buy low, sell high — but remember: stocks can lose value too.</p>
      <table class="table"><thead><tr><th>Company</th><th class="num">Price</th><th class="num">You own</th><th></th></tr></thead><tbody>
        ${STOCKS.map(st => `<tr><td><b style="color:${st.color}">${st.symbol}</b><br><small>${st.name}</small></td><td class="num money" data-price="${st.id}">${money(s.prices[st.id])}</td><td class="num">${(s.holdings[st.id] || 0).toLocaleString('en-US')}<br><small data-holding="${st.id}">${money((s.holdings[st.id] || 0) * s.prices[st.id], true)}</small></td>
        <td><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><input class="qty" type="number" min="1" value="${Math.max(1, Math.floor(liquid(s) / s.prices[st.id] / 4)) || 1}" data-qty="${st.id}" aria-label="Number of ${st.symbol} shares"><button class="btn small sage" data-buy="${st.id}">Buy</button><button class="btn small peach" data-sell="${st.id}" ${s.holdings[st.id] ? '' : 'disabled'}>Sell</button></div></td></tr>`).join('')}
      </tbody></table>
      <div class="formula">📐 Portfolio value = <code>Σ shares × price = <span data-portfolio>${money(portfolio(s), true)}</span></code></div>
    </div>`);
  const qty = id => Math.floor(Number(el.querySelector(`[data-qty="${id}"]`).value));
  el.querySelector('[data-upgrade]').onclick = () => { if (dispatch({ type: 'upgrade' })) { toast(`Llama Labs is now level ${state.company}!`, 'cash'); businessPanel(); } };
  el.querySelectorAll('[data-buy]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'trade', stock: b.dataset.buy, side: 'buy', quantity: qty(b.dataset.buy) })) { sfx('ok'); businessPanel(); } }));
  el.querySelectorAll('[data-sell]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'trade', stock: b.dataset.sell, side: 'sell', quantity: Math.min(qty(b.dataset.sell), state.holdings[b.dataset.sell] || 0) })) { sfx('cash'); businessPanel(); } }));
  el.dataset.business = '1';
}
function refreshBusiness() {
  const el = overlayRoot.querySelector('[data-business]'); if (!el) return;
  el.querySelector('[data-business-worth]').textContent = `${money(wealth(state), true)} / $1B`;
  el.querySelector('[data-business-progress]').style.width = `${Math.min(100, wealth(state) / 1e9 * 100)}%`;
  el.querySelector('[data-business-cash]').textContent = money(liquid(state), true);
  el.querySelector('[data-upgrade]').disabled = state.company >= 9 || liquid(state) < upgradeCost(state);
  el.querySelector('[data-portfolio]').textContent = money(portfolio(state), true);
  for (const stock of STOCKS) {
    el.querySelector(`[data-price="${stock.id}"]`).textContent = money(state.prices[stock.id]);
    el.querySelector(`[data-holding="${stock.id}"]`).textContent = money((state.holdings[stock.id] || 0) * state.prices[stock.id], true);
  }
}

/* ---------- Cutscenes ---------- */
function cutscene(html, cls = 'scene') { return new Promise(res => { const el = open(`<div class="card stack" data-locked style="text-align:center;justify-items:center">${html}<button class="btn" data-next>${icon('arrow')} Continue</button></div>`, cls); el.querySelector('[data-next]').onclick = () => { close(); res(); }; }); }
async function onStageChange(from, to) {
  if (to === 'purchase') { toast('Goal reached! Go to your plot to buy a house or a car.', 'cash'); }
  if (to === 'timeskip') {
    await cutscene(`<div class="big-emoji">⏳</div><h2>Two years later…</h2><p>Three careers, thousands of shifts, and a Piggy Bank that never stopped compounding. ${CHARACTERS[state.character].name} is now a <b>millionaire</b> with a mansion, luxury cars and a lovely partner.</p><div class="formula">📐 Consistent income + saving + compound interest over time = wealth. Two years of $900 shifts and 2% growth turned into <b>$1,000,000</b>.</div>`, 'night');
    dispatch({ type: 'timeskip' });
  }
  if (to === 'robbery') { world.setStage('robbery', state); toast('Welcome home, millionaire! Visit your mansion.', 'ok'); }
  if (to === 'business') { world.setStage('business', state); toast('Llama Labs HQ is open! Grow your company to $1B.', 'cash'); }
  if (to === 'moon') {
    stopRent();
    await cutscene(`<div class="big-emoji">💸🦙💸</div><h2>BILLIONAIRE!</h2><p>Your net worth passed <b>$1,000,000,000</b>. You unlock the <b>Lunar billionaire</b> suit and you two are officially the richest couple in the llama world.</p><p>📞 “Hi, it’s <b>Elo Musk</b>. I have a little proposal about the Moon…”</p>`, 'night');
    world.setStage('moon', state);
  }
  if (to === 'freeplay') { world.setStage('freeplay', state); toast('Free world unlocked! Side missions are marked with stars.', 'ok'); scheduleRent(); }
}
async function robberySequence() {
  await cutscene(`<div class="big-emoji">🚨</div><h2>Robbers!</h2><p>Thieves heard about your fortune and are sneaking toward the mansion. Grab your <b>baseball bat</b> and defend the front door for <b>4 minutes</b>!</p>`, 'night');
  open('');
  const result = await defendMansion(overlayRoot, 240, sfx);
  close();
  await cutscene(`<div class="big-emoji">🏏💫</div><h2>Mansion defended!</h2><p>You bonked <b>${result.hits}</b> thieves${result.stolen ? ` but they still grabbed <b>${money(result.stolen)}</b>` : ' and they didn’t take a cent'}.</p><p>Time to put that money to work: you’re now the owner of <b>Llama Labs</b>, a company that earns millions. Head to the HQ!</p>`, 'night');
  dispatch({ type: 'defend', stolen: result.stolen });
}
async function moonSequence() {
  await cutscene(`<div class="big-emoji">🚀🌕</div><h2>A deal with Elo Musk</h2><div class="speech">“Llamas on the Moon! Sign here and this dome house is yours. Cheaper than a Mars ticket, I promise.”</div><p>You and your partner now own the first llama house on the Moon. The game is complete — but the <b>free world</b> is now unlocked!</p>`, 'night');
  dispatch({ type: 'moon' });
}
async function finale() {
  const s = state;
  await cutscene(`<div class="big-emoji">🔥🥩🧉</div><h2>Churrasco & chimarrão!</h2><p>From a park bench to the Moon. Friends, family and Elo Musk himself gather for the celebration barbecue.</p>
    <div class="stat-grid" style="text-align:left">${stat('Total earned', money(s.earned, true), 'pos')}${stat('Total spent', money(s.spent, true), 'neg')}${stat('Interest earned', money(s.interest, true), 'pos')}${stat('Net worth', money(wealth(s), true))}</div>
    <div class="formula">📐 The secret recipe: earn → save → let interest compound → invest → build. Thanks for playing!</div>`, 'scene');
  dispatch({ type: 'celebrate' });
}

/* ---------- Rent alert (Mr. Barriga) ---------- */
function scheduleRent() { nextRentAt = performance.now() + (45 + Math.random() * 45) * 1000; }
function startRent() {
  rent = { left: 40, hidden: false }; world.startRent(); sfx('alert');
  const banner = $('[data-rent]'); banner.classList.remove('hidden');
  rent.timer = setInterval(() => {
    if (document.hidden || busy) return;
    rent.left--; renderRent();
    if (rent.left <= 0) { resolveRent(true); }
  }, 1000);
  renderRent();
}
function renderRent() { if (!rent) return; const key = `${rent.left}|${world.isHidden()}`; if (rent.key === key) return; rent.key = key; $('[data-rent]').innerHTML = `🧔 RENT ALERT! Hide from Mr. Barriga <span class="timer">${rent.left}</span>s ${world.isHidden() ? '<span class="hiding">🌳 hiding…</span>' : ''}`; }
function resolveRent(escaped) {
  if (!rent) return; clearInterval(rent.timer); rent = null; world.stopRent(); $('[data-rent]').classList.add('hidden');
  dispatch({ type: 'rent', hidden: escaped });
  toast(escaped ? 'Mr. Barriga gave up! You pocket $500.' : 'Mr. Barriga found you! Rent paid: $200.', escaped ? 'cash' : 'bad');
  scheduleRent();
}
function stopRent() { if (rent) { clearInterval(rent.timer); rent = null; world.stopRent(); $('[data-rent]').classList.add('hidden'); } }
world.onJump = () => sfx('jump');
world.onLand = () => sfx('land');
world.onFound = () => resolveRent(false);
world.onCoin = id => { if (dispatch({ type: 'coin', id })) toast('Lucky coin! +$25', 'coin'); };
let bonks = 0;
world.onBonk = npc => { bonks++; world.burst(npc.pos, 0xc8b4f2, 14); sfx('bonk'); if (bonks === 1) toast('BONK! 🦙💫 Townsfolk llamas go flying when you run into them.'); };
world.available = it => {
  if (it.type === 'job') { const job = JOBS.find(j => j.id === it.id); return job.pay === 400 || RENT_STAGES.concat('timeskip', 'moon').includes(state.stage); }
  if (it.type === 'hq') return !!state.company;
  if (it.type === 'quest') return state.stage === 'freeplay' && !state.sideQuests.includes(it.id);
  if (it.type === 'bbq') return state.stage === 'freeplay' && !state.celebration;
  if (it.type === 'mansion') return !!world.mansionGroup?.visible;
  return true;
};

/* ---------- Interaction ---------- */
async function interact() {
  if (busy || !state.started) return;
  const it = world.nearby(); if (!it) return;
  switch (it.type) {
    case 'job': {
      const job = JOBS.find(j => j.id === it.id);
      stopRent(); open('');
      const ok = await playShift(overlayRoot, job, sfx); close();
      if (ok && dispatch({ type: 'shift', job: job.id })) { sfx('cash'); paycheck(job); } else if (!ok) toast('Shift abandoned — no paycheck this time.');
      scheduleRent(); break;
    }
    case 'shop': if (dispatch({ type: 'spend', item: it.id })) toast(it.id === 'food' ? 'Delicious llama burger! -$60' : 'Fresh streetwear unlocked! -$120', 'ok'); break;
    case 'bank': walletPanel(); break;
    case 'home': if (state.stage === 'purchase') purchasePanel(); else if (state.asset) customizePanel(); else toast(`Save up $1,000 first — you have ${money(liquid(state))}.`); break;
    case 'mansion': if (state.stage === 'robbery') robberySequence(); else toast('Home sweet mansion. 🏰'); break;
    case 'hq': businessPanel(); break;
    case 'quest': {
      const lines = { picnic: 'A lovely picnic with your partner and a basket of alfalfa sandwiches. +$5,000 sponsorship!', explorer: 'You mapped the whole town for tourists. +$5,000!', helper: 'You helped the school kids with their financial-math homework. +$5,000!' };
      if (it.id === 'helper') {
        open('');
        const result = await playQuiz(overlayRoot); close();
        if (!result.passed) { toast(result.quit ? 'Homework session cancelled.' : `Only ${result.correct}/${result.total} correct — the kids need at least ${result.needed}. Try again!`, 'bad'); break; }
      }
      if (dispatch({ type: 'quest', id: it.id })) toast(lines[it.id], 'cash'); break;
    }
    case 'bbq': if (state.sideQuests.length < 3) toast('Three adventures first, then the big BBQ! Follow your next mission.'); else finale(); break;
    case 'moon': moonSequence(); break;
  }
}
window.addEventListener('keydown', e => {
  if (e.code === 'Tab' && busy) {
    const controls = [...overlayRoot.querySelectorAll('button:not([disabled]), input:not([disabled]), select, [tabindex="0"]')].filter(el => !el.closest('.hidden'));
    const first = controls[0], last = controls.at(-1);
    if (first && (!overlayRoot.contains(document.activeElement) || (e.shiftKey ? document.activeElement === first : document.activeElement === last))) {
      e.preventDefault(); (e.shiftKey ? last : first).focus();
    }
    return;
  }
  if (e.repeat) return;
  if (e.code === 'Escape') {
    if (busy && !overlayRoot.querySelector('.game, [data-locked]')) close();
    else if (!busy && state.started) menuPanel();
    return;
  }
  if (e.target.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
  if (e.code === 'KeyE' || e.code === 'Enter') interact();
  if (e.code === 'KeyM' && !busy && state.started) mapPanel();
});
new MutationObserver(() => {
  const game = overlayRoot.querySelector('.game');
  if (game) {
    const dialog = overlayRoot.firstElementChild; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', game.querySelector('h2')?.textContent || 'Minigame');
    game.setAttribute('tabindex', '-1'); game.focus({ preventScroll: true });
  }
}).observe(overlayRoot, { childList: true });
$('[data-action]').onclick = interact;
promptEl.onclick = interact;
$('[data-route]').onclick = () => { if (!busy) mapPanel(); };
$('[data-minimap]').onclick = () => { if (!busy) mapPanel(); };
$('[data-sprint]').onclick = e => { world.sprint = !world.sprint; e.currentTarget.setAttribute('aria-pressed', String(world.sprint)); };
$('[data-jump]').addEventListener('pointerdown', () => (world.jumpQueued = true));
hud.querySelectorAll('[data-open]').forEach(b => { b.setAttribute('aria-label', b.title); b.onclick = () => { if (busy) return; ({ map: mapPanel, wallet: walletPanel, wardrobe: wardrobePanel, report: reportPanel, menu: menuPanel })[b.dataset.open](); }; });

/* Virtual joystick */
{
  const joy = $('[data-joy]'), knob = $('[data-knob]'); let active = null;
  const update = (x, y) => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2 - 20; let dx = x - cx, dy = y - cy; const d = Math.hypot(dx, dy); if (d > max) { dx *= max / d; dy *= max / d; } knob.style.transform = `translate(${dx}px, ${dy}px)`; world.joy.x = dx / max; world.joy.y = dy / max; };
  joy.addEventListener('pointerdown', e => { active = e.pointerId; joy.setPointerCapture(e.pointerId); update(e.clientX, e.clientY); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === active) update(e.clientX, e.clientY); });
  const end = e => { if (e.pointerId !== active) return; active = null; knob.style.transform = ''; world.joy.x = world.joy.y = 0; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end); joy.addEventListener('lostpointercapture', end);
  window.addEventListener('blur', () => { active = null; knob.style.transform = ''; });
}

/* ---------- Main loop ---------- */
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - lastTick) / 1000); lastTick = now;
  if (document.hidden) return;
  world.update();
  if (!state.started) return;
  const playing = !busy && !hud.classList.contains('hidden');
  $('[data-mission]').classList.toggle('hidden', !playing);
  $('[data-minimap]').classList.toggle('hidden', !playing || !settings.showMap);
  $('[data-controls]').classList.toggle('hidden', !playing || TOUCH);
  if (playing && now >= navigationAt) {
    navigationAt = now + 100;
    const target = destination(); world.setGuide(target);
    $('[data-route]').classList.toggle('hidden', !target);
    if (target) {
      const dx = target.position.x - world.player.pos.x, dz = target.position.z - world.player.pos.z, distance = Math.hypot(dx, dz);
      const angle = Math.atan2(dx * Math.cos(world.yaw) - dz * Math.sin(world.yaw), -dx * Math.sin(world.yaw) - dz * Math.cos(world.yaw));
      $('[data-route-arrow]').style.transform = `rotate(${angle}rad)`;
      $('[data-route-label]').textContent = rent ? 'Find cover · nearest bush' : target.label;
      $('[data-route-distance]').textContent = distance < target.radius ? 'HERE' : `${Math.round(distance)} m`;
    }
    if (settings.showMap) drawMap($('[data-minimap] canvas'), world, target, state, rent);
  }
  if (!playing) world.guide.visible = false;
  if (awardQueue.length && now > nextAwardAt && !overlayRoot.querySelector('.game, .title')) {
    const next = awardQueue.shift(); celebrate($('[data-celebration]'), next.title, next.detail, settings.reducedMotion); sfx('ok'); nextAwardAt = now + 4800;
  }
  // stage transitions run only when no other screen is open
  if (!busy && pendingStages.length && !stageBusy) { stageBusy = true; const [from, to] = pendingStages.shift(); onStageChange(from, to).finally(() => (stageBusy = false)); }
  // interaction prompt
  const it = busy ? null : world.nearby();
  promptEl.classList.toggle('hidden', !it);
  if (it && promptEl.dataset.target !== it.id) { promptEl.dataset.target = it.id; promptEl.innerHTML = `<kbd>${TOUCH ? 'Tap' : 'E'}</kbd> ${it.label}`; }
  actionBtn.disabled = !it;
  actionBtn.textContent = it ? it.label.split(' ').slice(0, 2).join(' ') : 'Action';
  // rent alert
  if (rent) renderRent();
  else if (!busy && !document.hidden && RENT_STAGES.includes(state.stage) && now > nextRentAt) startRent();
  // business income
  if (state.company && ['business', 'moon', 'freeplay'].includes(state.stage) && (!busy || overlayRoot.querySelector('[data-business]'))) {
    businessAcc += dt;
    if (businessAcc >= BUSINESS_TICK) {
      businessAcc = 0;
      dispatch({ type: 'market', changes: Object.fromEntries(STOCKS.map(s => [s.id, (Math.random() - 0.48) * 0.16])) });
      dispatch({ type: 'businessTick' }); sfx('coin');
      if (overlayRoot.querySelector('[data-business]')) { if (state.stage === 'moon') close(); else refreshBusiness(); }
    }
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { world.resetInput(); save(); if (state.started && !busy) menuPanel(); } else { lastTick = performance.now(); world.clock.getDelta(); } });
window.addEventListener('beforeunload', save);
// Debug hook for testing: open the game with ?debug to get window.__mml
if (new URLSearchParams(location.search).has('debug')) window.__mml = { world, get state() { return state; }, teleport: (x, z) => world.player.pos.set(x, 0, z), dispatch };
syncHUD();
titleScreen();
requestAnimationFrame(loop);
