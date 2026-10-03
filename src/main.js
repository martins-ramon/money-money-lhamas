import './style.css';
import { icon, llamaLogo } from './icons.js';
import { JOBS, STOCKS, CHAPTERS, EXTRA_COSTUMES, money, initialState, loadGame, act, liquid, portfolio, wealth, chapter, income, upgradeCost, completed, SAVE_KEY } from './model.js';
import { financeMissions } from './finance-missions.js';
import { World, preview } from './world.js';
import { playShift, defendMansion, playQuiz } from './minigames.js';
import { missionFor, readSettings, SETTINGS_KEY } from './experience.js';
import { celebrate, drawMap } from './feedback.js';
import { Multiplayer } from './multiplayer.js';
import { PeerView } from './peers.js';
import { t, getLanguage, setLanguage, readLanguage, LANGUAGE_KEY, locale, nameLabel, ledgerLabel, translateError } from './i18n.js';

let storage;
try { storage = window.localStorage; } catch { /* Gameplay remains available without storage. */ }
setLanguage(readLanguage(storage, navigator.language));
document.documentElement.lang = locale();

const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (TOUCH) document.body.classList.add('touch-device');
const CHARACTERS = { anna: { name: 'Anna', get blurb() { return t('Curious, brave and always hungry for cupcakes.', 'Curiosa, corajosa e sempre com vontade de comer cupcakes.'); } }, carlos: { name: 'Carlos', get blurb() { return t('Laid-back dreamer with a head for numbers.', 'Um sonhador tranquilo que leva jeito com os números.'); } } };
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
      <div class="hud-profile"><div class="avatar">${llamaLogo}</div><div><b data-name>Anna</b><small data-costume>${t("Street dreamer", "Sonhador das ruas")}</small></div></div>
      <div class="hud-money"><span class="money" data-wallet>$0</span><small data-savings>${t("Savings $0", "Poupança $0")}</small><small data-worth>${t("Net worth $0", "Patrimônio $0")}</small></div>
    </div>
    <div class="hud-spacer"></div>
    <div class="hud-bottom">
      <div class="journey-status"><div class="tag" data-chapter>${t("Chapter 1", "Capítulo 1")}</div><small data-save-status>${t("Progress saved on this device", "Progresso salvo neste aparelho")}</small></div>
      <div class="hud-actions">
        <button class="btn icon" data-open="multiplayer" title="Play online with friends" aria-label="Play online with friends">👥</button>
        <button class="btn icon" data-open="finance" title="Money missions" aria-label="Money missions">🎯</button>
        <button class="btn icon" data-open="map" title="Town guide (M)" aria-label="Town guide">${icon('map')}</button>
        <button class="btn icon" data-open="wallet" title="Wallet & Piggy Bank">${icon('wallet')}</button>
        <button class="btn icon" data-open="wardrobe" title="Wardrobe">${icon('shirt')}</button>
        <button class="btn icon" data-open="report" title="Money report">${icon('chart')}</button>
        <button class="btn icon" data-open="menu" title="Menu">${icon('help')}</button>
      </div>
    </div>
  </div>
  <section class="mission-card hidden" data-mission aria-label="Current mission">
    <div class="mission-eyebrow">${t("YOUR NEXT BIG THING ", "SUA PRÓXIMA CONQUISTA ")}<span data-mission-count></span></div>
    <h2 data-mission-title></h2><p data-mission-detail></p>
    <div class="progress" role="progressbar" aria-label="Mission progress" aria-valuemin="0" aria-valuemax="100" data-mission-progress><i data-mission-fill></i></div>
    <button class="destination" data-route><span class="route-arrow" data-route-arrow>↑</span><span data-route-label>${t("Follow the golden beacon", "Siga o sinal dourado")}</span><b data-route-distance></b></button>
  </section>
  <button class="minimap hidden" data-minimap title="Open town guide (M)" aria-label="Open town guide"><span>${t("LLAMA TOWN ", "CIDADE DAS LHAMAS ")}<b>${t("MAP ↗", "MAPA ↗")}</b></span><canvas width="208" height="208" aria-hidden="true"></canvas><small>${t("● You · Gold = destination", "● Você · Dourado = destino")}</small></button>
  <div class="control-hint hidden" data-controls><kbd>W A S D</kbd>${t(" move ", " mover ")}<kbd>Shift</kbd>${t(" sprint ", " correr ")}<kbd>Space</kbd>${t(" jump ", " pular ")}<kbd>M</kbd>${t(" map ", " mapa ")}<kbd>Esc</kbd>${t(" pause", " pausar")}</div>
  <div class="adventure-controls hidden" data-adventure>
    <small data-mode>${t("Explore the city", "Explore a cidade")}</small>
    <div class="row">
      <button class="btn small lilac" data-dance aria-pressed="false" title="Dance (B)">${t("🕺 Dance", "🕺 Dançar")}</button>
      <button class="btn small sky hidden" data-fly aria-pressed="false" title="Fly / land (F)">${t("🚀 Fly", "🚀 Voar")}</button>
      <button class="btn small ghost hidden" data-milk title="Shoot milk (Q)">${t("🥛 Milk", "🥛 Leite")}</button>
    </div>
  </div>
  <button class="online-status hidden" data-online aria-label="Open multiplayer room"></button>
  <div class="objective hidden" data-objective></div>
  <div class="rent-banner hidden" data-rent></div>
  <div class="toast-area" data-toasts role="status" aria-live="polite"></div>
  <div class="celebration-layer" data-celebration role="status" aria-live="polite"></div>
  <button class="prompt hidden" data-prompt></button>
  <div class="touch hidden" data-touch>
    <div class="joystick" data-joy><div class="knob" data-knob></div></div>
    <div class="touch-buttons"><button class="btn lilac" data-sprint aria-pressed="false">⚡<br>${t("Run", "Correr")}</button><button class="btn sky" data-jump>⬆<br>${t("Jump", "Pular")}</button><button class="btn action" data-action>${t("Action", "Ação")}</button></div>
  </div>
  <div data-overlay></div>`;
const $ = sel => app.querySelector(sel);
const canvas = $('canvas.world'), hud = $('[data-hud]'), overlayRoot = $('[data-overlay]'), promptEl = $('[data-prompt]');

/* ---------- State ---------- */
let state = loadGame(storage);
const settings = readSettings(storage, { touch: TOUCH, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
const world = new World(canvas, { touch: TOUCH });
const peerView = new PeerView(world);
const multiplayer = new Multiplayer({
  onChange: () => queueMicrotask(syncOnline),
  onPeers: peers => { peerView.set(peers); syncOnline(); },
  onError: error => {
    toast(translateError(error.message), 'bad');
    if (overlayRoot.querySelector('[data-room-code]')) {
      multiplayerPanel();
      overlayRoot.querySelector('[data-online-error]').textContent = translateError(error.message);
    }
  },
});
world.applySettings(settings);
document.body.classList.toggle('reduced-motion', settings.reducedMotion);
let busy = false, stageBusy = false, rent = null, nextRentAt = 0, businessAcc = 0, lastTick = performance.now();
let trackedId = null, navigationAt = 0;
const awardQueue = []; let nextAwardAt = 0;
const actionBtn = $('[data-action]');
let saveStatus = storage ? 'initial' : 'unavailable';

const languagePicker = () => `<label class="language-picker">${t('Language', 'Idioma')}<select data-language aria-label="${t('Language', 'Idioma')}"><option value="pt" ${getLanguage() === 'pt' ? 'selected' : ''}>Português</option><option value="en" ${getLanguage() === 'en' ? 'selected' : ''}>English</option></select></label>`;
function refreshLanguageUI() {
  document.documentElement.lang = locale();
  document.title = t('Money Money Lhamas — From zero to the Moon', 'Money Money Lhamas — Do zero até a Lua');
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = t('A small llama with big dreams. Work, save, invest and explore from the city to the Moon.', 'Uma pequena lhama com grandes sonhos. Trabalhe, poupe, invista e explore da cidade até a Lua.');
  canvas.setAttribute('aria-label', t('Game world. WASD or arrows to move, Shift to sprint, Space to jump, E to interact, Escape to pause.', 'Mundo do jogo. WASD ou setas para mover, Shift para correr, Espaço para pular, E para interagir e Escape para pausar.'));
  const actionLabels = {
    multiplayer: t('Play online with friends', 'Jogar online com amigos'), finance: t('Money missions', 'Missões financeiras'),
    map: t('Town guide (M)', 'Guia da cidade (M)'), wallet: t('Wallet & Piggy Bank', 'Carteira e cofrinho'),
    wardrobe: t('Wardrobe', 'Guarda-roupa'), report: t('Money report', 'Relatório financeiro'), menu: t('Menu', 'Menu'),
  };
  hud.querySelectorAll('[data-open]').forEach(button => { button.title = actionLabels[button.dataset.open]; button.setAttribute('aria-label', button.title); });
  $('[data-mission]').setAttribute('aria-label', t('Current mission', 'Missão atual'));
  $('.mission-eyebrow').firstChild.textContent = t('YOUR NEXT BIG THING ', 'SUA PRÓXIMA CONQUISTA ');
  $('[data-mission-progress]').setAttribute('aria-label', t('Mission progress', 'Progresso da missão'));
  $('[data-route-label]').textContent = t('Follow the golden beacon', 'Siga o sinal dourado');
  const map = $('[data-minimap]');
  map.title = t('Open town guide (M)', 'Abrir guia da cidade (M)'); map.setAttribute('aria-label', map.title);
  map.querySelector('span').innerHTML = `${t('LLAMA TOWN', 'CIDADE DAS LHAMAS')} <b>${t('MAP ↗', 'MAPA ↗')}</b>`;
  map.querySelector('small').textContent = t('● You · Gold = destination', '● Você · Dourado = destino');
  $('[data-controls]').innerHTML = `<kbd>W A S D</kbd> ${t('move', 'mover')} <kbd>Shift</kbd> ${t('sprint', 'correr')} <kbd>${t('Space', 'Espaço')}</kbd> ${t('jump', 'pular')} <kbd>M</kbd> ${t('map', 'mapa')} <kbd>Esc</kbd> ${t('pause', 'pausar')}`;
  $('[data-dance]').textContent = t('🕺 Dance', '🕺 Dançar'); $('[data-dance]').title = t('Dance (B)', 'Dançar (B)');
  $('[data-fly]').title = t('Fly / land (F)', 'Voar / pousar (F)');
  $('[data-milk]').textContent = t('🥛 Milk', '🥛 Leite'); $('[data-milk]').title = t('Shoot milk (Q)', 'Atirar leite (Q)');
  $('[data-mode]').textContent = world.getAdventureStatus().label;
  $('[data-online]').setAttribute('aria-label', t('Open multiplayer room', 'Abrir sala multiplayer'));
  $('[data-sprint]').innerHTML = `⚡<br>${t('Run', 'Correr')}`;
  $('[data-jump]').innerHTML = `⬆<br>${t('Jump', 'Pular')}`;
  actionBtn.textContent = t('Action', 'Ação');
  $('[data-save-status]').textContent = saveStatus === 'unavailable' ? t('Session only · saving unavailable', 'Só nesta sessão · não foi possível salvar') : saveStatus === 'saved' ? t('✓ Progress saved on this device', '✓ Progresso salvo neste aparelho') : t('Progress saved on this device', 'Progresso salvo neste aparelho');
  delete promptEl.dataset.target; navigationAt = 0;
  if (rent) { delete rent.key; renderRent(); }
}
function changeLanguage(language) {
  if (!setLanguage(language)) return;
  try { storage?.setItem(LANGUAGE_KEY, getLanguage()); } catch { /* The selection still applies for this session. */ }
  world.refreshLanguage();
  refreshLanguageUI(); syncHUD(); syncOnline();
  // Transient notifications were composed in the previous language.
  $('[data-toasts]').replaceChildren(); $('[data-celebration]').replaceChildren(); awardQueue.length = 0;
}

function save() {
  try { if (!storage) throw new Error('Storage unavailable'); storage.setItem(SAVE_KEY, JSON.stringify(state)); saveStatus = 'saved'; $('[data-save-status]').textContent = t("✓ Progress saved on this device", "✓ Progresso salvo neste aparelho"); }
  catch { saveStatus = 'unavailable'; $('[data-save-status]').textContent = t("Session only · saving unavailable", "Só nesta sessão · não foi possível salvar"); }
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
  try { state = act(state, action); } catch (e) { toast(translateError(e.message), 'bad'); return false; }
  save(); syncHUD();
  if (action.type === 'shift' && !previous.shifts[action.job]) { const job = JOBS.find(j => j.id === action.job); award(t("New outfit unlocked!", "Novo visual desbloqueado!"), t(`${nameLabel(job.costume)} · Your first shift at ${nameLabel(job.name)}`, `${nameLabel(job.costume)} · Seu primeiro turno em ${nameLabel(job.name)}`)); }
  if (action.type === 'purchase') award(t("From park bench to proud owner", "Do banco da praça à primeira conquista"), t(`Your first ${state.asset}. You made it happen.`, `Sua primeira conquista: ${nameLabel(state.asset)}. Você conseguiu!`));
  if (action.type === 'timeskip') award(t("Hello, millionaire!", "Olá, milionário!"), t("A mansion. A new life. A million possibilities.", "Uma mansão. Uma nova vida. Um milhão de possibilidades."));
  if (action.type === 'upgrade') award(t(`Llama Labs · Level ${state.company}`, `Llama Labs · Nível ${state.company}`), t(`${money(income(state), true)} every 8 seconds. Dream bigger.`, `${money(income(state), true)} a cada 8 segundos. Sonhe mais alto.`));
  if (action.type === 'coin' && state.collectibles.length === 12 && previous.collectibles.length < 12) award(t("Golden hoof explorer", "Explorador de cascos dourados"), t("All 12 lucky coins found!", "Você encontrou as 12 moedas da sorte!"));
  if (action.type === 'quest') award(t("Good deeds. Great company.", "Boas ações. Ótimas companhias."), t(`${state.sideQuests.length}/3 free-world adventures complete.`, `${state.sideQuests.length}/3 aventuras do mundo livre concluídas.`));
  if (action.type === 'celebrate') award(t("From zero to the Moon", "Do zero até a Lua"), t("Your adventure. Your friends. Your moment.", "Sua aventura. Seus amigos. Seu momento."));
  if (before !== state.stage) { trackedId = null; pendingStages.push([before, state.stage]); }
  return true;
}
const synced = {};
function syncHUD() {
  $('[data-name]').textContent = CHARACTERS[state.character].name; $('[data-costume]').textContent = nameLabel(state.costume);
  $('[data-wallet]').textContent = money(state.wallet); $('[data-savings]').textContent = t(`Savings ${money(state.savings)}`, `Poupança ${money(state.savings)}`); $('[data-worth]').textContent = t(`Net worth ${money(wealth(state), wealth(state) >= 1e6)}`, `Patrimônio ${money(wealth(state), wealth(state) >= 1e6)}`);
  $('[data-chapter]').textContent = t(`Ch. ${chapter(state) + 1} · ${nameLabel(CHAPTERS[chapter(state)])}`, `Cap. ${chapter(state) + 1} · ${nameLabel(CHAPTERS[chapter(state)])}`);
  const body = state.character === 'carlos' ? 0xe8caa4 : 0xfff1d6;
  if (world.playerMesh.userData.costume !== state.costume || world.bodyColor !== body) { world.bodyColor = body; world.setCostume(state.costume); }
  const assetKey = `${state.asset}|${state.assetColor}|${state.assetStyle}`;
  if (synced.asset !== assetKey) { synced.asset = assetKey; world.setAsset(state.asset, state.assetColor, state.assetStyle); }
  const stageKey = `${state.stage}|${state.location}|${state.sideQuests.join(',')}|${state.financeQuests.join(',')}`;
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
    case 'beginning': return done < 3 ? t(`${icon('briefcase', 16)} Work at the three starter jobs <b>(${done}/3)</b>. Each shift pays <b>$400</b>.`, `${icon('briefcase', 16)} Trabalhe nos três empregos iniciais <b>(${done}/3)</b>. Cada turno paga <b>$400</b>.`) : t(`${icon('coin', 16)} Save up <b>${money(1000)}</b> for your first place or car — you have <b>${money(liquid(s))}</b>. Repeat any job!`, `${icon('coin', 16)} Junte <b>$1.000</b> para sua primeira casa ou carro — você tem <b>${money(liquid(s))}</b>. Repita qualquer emprego!`);
    case 'purchase': return t(`${icon('home', 16)} Goal reached! Visit <b>YOUR FUTURE HOME</b> plot to buy a house or a car ($1,000).`, `${icon('home', 16)} Meta alcançada! Visite o terreno <b>SUA FUTURA CASA</b> para comprar uma casa ou carro ($1.000).`);
    case 'careers': return t(`${icon('sparkles', 16)} New careers unlocked: factory, hotel & police <b>(${adv}/3)</b> — <b>$900</b> each. Watch out for Mr. Barriga!`, `${icon('sparkles', 16)} Novas carreiras: fábrica, hotel e polícia <b>(${adv}/3)</b> — <b>$900</b> por turno. Cuidado com o Sr. Barriga!`);
    case 'robbery': return t(`${icon('pin', 16)} Two years later… head to your <b>mansion</b>. Something feels off.`, `${icon('pin', 16)} Dois anos depois… vá até sua <b>mansão</b>. Algo parece estranho.`);
    case 'business': return t(`${icon('chart', 16)} Grow <b>Llama Labs</b> and your stocks until your net worth hits <b>$1B</b> — now ${money(wealth(s), true)}.`, `${icon('chart', 16)} Faça a <b>Llama Labs</b> e seus investimentos crescerem até alcançar <b>$1 bilhão</b> — agora ${money(wealth(s), true)}.`);
    case 'moon': return t(`${icon('moon', 16)} Meet <b>Elo Musk</b> at the Moon house to sign the deal.`, `${icon('moon', 16)} Encontre <b>Elo Musk</b> na casa da Lua para assinar o acordo.`);
    case 'freeplay': return s.celebration ? t(`${icon('trophy', 16)} You did it! Keep exploring the free world.`, `${icon('trophy', 16)} Você conseguiu! Continue explorando o mundo livre.`) : t(`${icon('map', 16)} Free world! Complete side missions <b>(${s.sideQuests.length}/3)</b> — picnic, explorer and the <b>math homework quiz</b> — then start the <b>BBQ party</b>.`, `${icon('map', 16)} Mundo livre! Complete as missões extras <b>(${s.sideQuests.length}/3)</b> — piquenique, exploração e <b>dever de matemática</b> — depois comece o <b>churrasco</b>.`);
    default: return '';
  }
}

/* ---------- Overlays ---------- */
function open(html, cls = '') {
  busy = true; world.frozen = true; world.resetInput(); promptEl.classList.add('hidden');
  hud.inert = true; $('[data-touch]').inert = true; document.body.classList.add('panel-open');
  overlayRoot.innerHTML = `<div class="overlay ${cls}" role="dialog" aria-modal="true" aria-label="${t("Game panel", "Painel do jogo")}"><div class="panel">${html}</div></div>`;
  const el = overlayRoot.firstElementChild;
  el.setAttribute('aria-label', el.querySelector('h1, h2')?.textContent || t("Game panel", "Painel do jogo"));
  queueMicrotask(() => { if (el.isConnected) el.querySelector('button:not([disabled]), input, select')?.focus({ preventScroll: true }); });
  el.querySelectorAll('[data-close]').forEach(b => (b.onclick = close));
  return el;
}
function close() {
  overlayRoot.innerHTML = ''; busy = false; world.frozen = false; world.resetInput();
  hud.inert = false; $('[data-touch]').inert = false; document.body.classList.remove('panel-open');
  $('[data-knob]').style.transform = ''; $('[data-sprint]').setAttribute('aria-pressed', 'false');
  canvas.focus({ preventScroll: true });
}
const head = (title, sub = '') => `<div class="card"><div class="panel-head"><div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div><button class="btn icon ghost" data-close aria-label="${t("Close", "Fechar")}">${icon('close')}</button></div></div>`;
const stat = (label, value, cls = '') => `<div class="stat"><small>${label}</small><span class="money ${cls}">${value}</span></div>`;
const gameCredits = () => `
  <section class="game-credits" lang="${locale()}" aria-labelledby="game-credits-heading">
    <img class="game-credits-photo" src="${import.meta.env.BASE_URL}images/vicente.jpg" alt="${t("Photo of Vicente Mitczuck da Silva", "Foto de Vicente Mitczuck da Silva")}" width="1206" height="1918">
    <div class="game-credits-copy">
      <h2 id="game-credits-heading">${t("Credits", "Créditos")}</h2>
      <p class="game-credits-byline">${t("A game by", "Um jogo de")}</p>
      <h3>Vicente Mitczuck da Silva</h3>
      <p>${t("Age 11 · Maple Bear Porto Alegre", "11 anos · Maple Bear Porto Alegre")}</p>
      <p class="game-credits-class">${t("Year 6 - Morning", "6º ano - Manhã")}</p>
      <p class="game-credits-subject">${t("Presented in financial mathematics class", "Apresentado na aula de matemática financeira")}</p>
    </div>
  </section>`;

function titleScreen() {
  const el = open(`
    <div class="title" data-locked>
      <div class="title-kicker">${t("A SMALL LLAMA. AN OUTRAGEOUS DREAM.", "UMA PEQUENA LHAMA. UM SONHO ENORME.")}</div>
      ${languagePicker()}
      <div class="logo">${llamaLogo}</div>
      <p class="game-wordmark">MONEY MONEY LHAMAS</p>
      <h1>${t("Empty pockets.", "Bolsos vazios.")}<br><span>${t("Moon-sized dreams.", "Sonhos do tamanho da Lua.")}</span></h1>
      <p class="lead">${t("Your first paycheck. Your own empire. A home among the stars. Every big dream starts with four little hooves.", "Seu primeiro salário. Seu próprio império. Uma casa entre as estrelas. Todo grande sonho começa com quatro pequenos cascos.")}</p>
      <div class="dream-route" aria-label="${t("Your journey", "Sua jornada")}"><span>${t("01 · FIRST PAYCHECK", "01 · PRIMEIRO SALÁRIO")}</span><i>→</i><span>${t("02 · YOUR EMPIRE", "02 · SEU IMPÉRIO")}</span><i>→</i><span>${t("03 · THE MOON", "03 · A LUA")}</span></div>
      ${state.started ? `<button class="btn continue-btn" data-continue>${icon('play')} ${t(`Continue as ${CHARACTERS[state.character].name}`, `Continue como ${CHARACTERS[state.character].name}`)}<small>${t(`Chapter ${chapter(state) + 1}`, `Capítulo ${chapter(state) + 1}`)} · ${money(wealth(state), true)}</small></button>` : `<p class="character-invite">${t("CHOOSE YOUR DREAMER", "ESCOLHA SEU SONHADOR")}</p>`}
      <div class="choice-grid" style="width:100%">
        ${Object.entries(CHARACTERS).map(([id, c]) => `<button class="choice character-card" data-pick="${id}"><canvas width="240" height="240"></canvas><b>${c.name}</b><small>${c.blurb}</small></button>`).join('')}
      </div>
      <button class="btn ghost small" data-title-sound>${icon(state.muted ? 'mute' : 'sound')}${t(" Sound ", " Som ")}${state.muted ? t("off — tap to enable", "desligado — toque para ligar") : t("on", "ligado")}</button>
      <p class="credits">${TOUCH ? t("Drag the joystick to walk · swipe the right side to look around · big buttons to jump and act.", "Arraste o controle para andar · deslize o lado direito para olhar · use os botões para pular e interagir.") : t("WASD / arrows to walk · drag the mouse to look · Space to jump · E to interact.", "WASD / setas para andar · arraste o mouse para olhar · Espaço para pular · E para interagir.")}</p>
      ${gameCredits()}
    </div>`, 'scene');
  const stops = [...el.querySelectorAll('[data-pick]')].map(b => preview(b.querySelector('canvas'), b.dataset.pick === 'anna' ? 'Girlfriend' : 'Street dreamer', b.dataset.pick === 'anna' ? 0xfff1d6 : 0xe8caa4, settings.reducedMotion));
  el.querySelector('[data-language]').onchange = event => { stops.forEach(stop => stop()); changeLanguage(event.target.value); titleScreen(); queueMicrotask(() => overlayRoot.querySelector('[data-language]')?.focus()); };
  const begin = () => { stops.forEach(s => s()); close(); canvas.focus(); hud.classList.remove('hidden'); $('[data-touch]').classList.toggle('hidden', !TOUCH); syncHUD(); if (!state.shifts || !Object.keys(state.shifts).length) intro(); if (state.stage === 'timeskip') pendingStages.push(['careers', 'timeskip']); scheduleRent(); sfx('ok'); };
  el.querySelectorAll('[data-pick]').forEach(b => (b.onclick = () => { if (state.started && state.character !== b.dataset.pick && !confirm(t("Start a brand new adventure? Your current progress will be replaced.", "Começar uma aventura nova? Seu progresso atual será substituído."))) return; if (!state.started || state.character !== b.dataset.pick) { state = initialState(); } dispatch({ type: 'start', character: b.dataset.pick }); begin(); }));
  el.querySelector('[data-continue]')?.addEventListener('click', begin);
  el.querySelector('[data-title-sound]').onclick = e => { dispatch({ type: 'mute' }); e.currentTarget.innerHTML = `${icon(state.muted ? 'mute' : 'sound')}${t(" Sound ", " Som ")}${state.muted ? t("off — tap to enable", "desligado — toque para ligar") : t("on", "ligado")}`; sfx('ok'); };
}
function intro() {
  const name = CHARACTERS[state.character].name;
  const el = open(`
    <div class="card stack">
      <div class="big-emoji">🦙💤</div>
      <h2>${t("Little beginnings", "Pequenos começos")}</h2>
      <div class="speech">${t(`“Ugh… sleeping on a park bench again. That’s it, ${name}! Today I stop being broke and start getting `, `“Ah… dormindo num banco de praça de novo. Chega, ${name}! Hoje vou deixar de ser pobre e começar a ficar `)}<b>${t("rich", "rico")}</b>.”</div>
      <p>${t("Follow the ", "Siga o ")}<b>${t("golden beacon", "sinal dourado")}</b>${t(" to your first job at McLlama’s. Every shift pays ", " até seu primeiro emprego no McLlama’s. Cada turno paga ")}<b>$400</b>${t(". Complete all three starter jobs and save ", ". Complete os três empregos iniciais e junte ")}<b>${money(1000)}</b>${t(" for your first home or car.", " para sua primeira casa ou carro.")}</p>
      <div class="onboarding-steps"><span><b>01</b>${t(" Follow the beacon", " Siga o sinal")}</span><span><b>02</b> ${TOUCH ? t("Tap Action", "Toque em Ação") : t("Press E", "Aperte E")}${t(" at the door", " na porta")}</span><span><b>03</b>${t(" Earn. Save. Dream bigger.", " Ganhe. Poupe. Sonhe mais alto.")}</span></div>
      <p class="muted">${TOUCH ? t("Use the Run button for a burst of speed.", "Use o botão Correr para ganhar velocidade.") : t("Hold Shift to sprint. Press M for the town guide, or Esc to take a break.", "Segure Shift para correr. Aperte M para abrir o guia da cidade ou Esc para pausar.")}${t(" Lucky coins are hidden around town — every one is worth $25.", " Há moedas da sorte escondidas pela cidade — cada uma vale $25.")}</p>
      <div class="formula">📐 <b>${t("Financial math tip:", "Dica de matemática financeira:")}</b>${t(" money in the Piggy Bank earns ", " o dinheiro no cofrinho rende ")}<code>${t("2% interest per shift", "2% de juros por turno")}</code>${t(". Interest = savings × 0.02.", ". Juros = poupança × 0,02.")}</div>
      <button class="btn" data-close>${icon('arrow')}${t(" Let’s go!", " Vamos lá!")}</button>
    </div>`);
}

function paycheck(job) {
  const s = state, interest = s.ledger[1]?.label.startsWith('Savings interest') ? s.ledger[1].amount : 0, goal = ['beginning', 'purchase'].includes(s.stage) ? 1000 : null;
  const el = open(`
    ${head(t(`Payday at ${nameLabel(job.name)}!`, `Dia de pagamento em ${nameLabel(job.name)}!`), t(`You earned <b>${money(job.pay)}</b> as a ${nameLabel(job.role.toLowerCase())}.`, `Você ganhou <b>${money(job.pay)}</b> trabalhando como ${nameLabel(job.role.toLowerCase())}.`))}
    <div class="card stack">
      <div class="stat-grid">${stat(t("Wallet", "Carteira"), money(s.wallet))}${stat(t("Piggy Bank", "Cofrinho"), money(s.savings))}${stat(t("Liquid total", "Total disponível"), money(liquid(s)))}</div>
      ${s.savings || interest ? `<div class="formula">${t("📐 Interest this shift: ", "📐 Juros deste turno: ")}<code>${money(s.savings - interest)} × 2% = ${money(interest)}</code>${t(". Your savings grow every time you work!", ". Sua poupança cresce toda vez que você trabalha!")}</div>` : ''}
      ${goal ? `<div><div class="row" style="justify-content:space-between"><span>${t("Goal: first house or car", "Meta: primeira casa ou carro")}</span><b>${money(liquid(s))} / ${money(goal)}</b></div><div class="progress"><i style="width:${Math.min(100, (liquid(s) / goal) * 100)}%"></i></div></div>` : ''}
      <h3>${t("What will you do with your money?", "O que você fará com seu dinheiro?")}</h3>
      <div class="choice-grid">
        <button class="choice" data-do="save"><div class="ico">${icon('coin')}</div><b>${t("Save it", "Poupar")}</b><small>${t("Move your whole wallet into the Piggy Bank and earn 2% each shift.", "Coloque todo o dinheiro da carteira no cofrinho e ganhe 2% a cada turno.")}</small></button>
        <button class="choice" data-do="spend"><div class="ico">${icon('sparkles')}</div><b>${t("Spend it", "Gastar")}</b><small>${t("Treat yourself to a meal ($60) or fresh streetwear ($120).", "Compre uma refeição ($60) ou roupas novas ($120).")}</small></button>
      </div>
      <button class="btn ghost small" data-close>${t("Keep it in my wallet for now", "Deixar na carteira por enquanto")}</button>
    </div>`);
  el.querySelector('[data-do="save"]').onclick = () => { if (dispatch({ type: 'save' })) { toast(t("Saved! Your Piggy Bank is growing.", "Dinheiro guardado! Seu cofrinho está crescendo."), 'cash'); close(); } };
  el.querySelector('[data-do="spend"]').onclick = () => {
    const box = el.querySelector('.choice-grid'); box.innerHTML = `
      <button class="choice" data-item="food"><div class="ico">🍔</div><b>${t("Food · $60", "Comida · $60")}</b><small>${t("A delicious llama burger. Yum, but it doesn’t grow.", "Um delicioso hambúrguer de lhama. Gostoso, mas não rende juros.")}</small></button>
      <button class="choice" data-item="clothes"><div class="ico">${icon('shirt')}</div><b>${t("Clothes · $120", "Roupas · $120")}</b><small>${t("Unlocks the Fresh Streetwear outfit.", "Desbloqueia o visual Roupa urbana.")}</small></button>`;
    box.querySelectorAll('[data-item]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'spend', item: b.dataset.item })) { toast(b.dataset.item === 'food' ? t("Delicious! -$60", "Uma delícia! -$60") : t("Looking fresh! -$120 · outfit unlocked", "Visual novo! -$120 · roupa desbloqueada"), 'ok'); close(); } }));
  };
}

function walletPanel() {
  const s = state, projected = Math.round(s.savings * 0.02 * 100) / 100;
  const el = open(`
    ${head(t("Wallet & Piggy Bank", "Carteira e cofrinho"), t("Cash in your wallet does nothing. Savings earn 2% every shift you work.", "O dinheiro na carteira não rende. A poupança rende 2% a cada turno de trabalho."))}
    <div class="card stack">
      <div class="stat-grid">${stat(t("Wallet", "Carteira"), money(s.wallet))}${stat(t("Piggy Bank", "Cofrinho"), money(s.savings))}${stat(t("Interest earned so far", "Juros acumulados"), money(s.interest), 'pos')}</div>
      <div class="formula">${t("📐 Next shift interest: ", "📐 Juros do próximo turno: ")}<code>${money(s.savings)} × ${t("0.02", "0,02")} = ${money(projected)}</code><br>${t("After 5 shifts without touching it: ", "Após 5 turnos sem mexer: ")}<code>${money(s.savings)} × ${t("1.02⁵", "1,02⁵")} ≈ ${money(s.savings * 1.02 ** 5)}</code>${t(" (compound interest!)", " (juros compostos!)")}</div>
      <div class="row"><button class="btn sage" data-save ${s.wallet <= 0 ? 'disabled' : ''}>${icon('coin')}${t(" Deposit all (", " Depositar tudo (")}${money(s.wallet)})</button></div>
    </div>`);
  el.querySelector('[data-save]').onclick = () => { if (dispatch({ type: 'save' })) { toast(t("Deposited into the Piggy Bank!", "Dinheiro depositado no cofrinho!"), 'cash'); walletPanel(); } };
}
function wardrobePanel() {
  const all = ['Street dreamer', ...EXTRA_COSTUMES, 'Fresh streetwear', ...JOBS.map(j => j.costume), 'Lunar billionaire'];
  const el = open(`
    ${head(t("Wardrobe", "Guarda-roupa"), t("New hero skins are free! Superman, Dragon and Cyborg can fly (F). Cyborg shoots milk (Q). Everyone can dance (B).", "Os novos visuais de heróis são grátis! Superman, Dragão e Ciborgue podem voar (F). Ciborgue atira leite (Q). Todos podem dançar (B)."))}
    <div class="card"><div class="choice-grid">${all.map(c => { const has = state.costumes.includes(c), job = JOBS.find(j => j.costume === c); return `<button class="choice ${state.costume === c ? 'selected' : ''}" data-c="${c}" ${has ? '' : 'disabled'}><div class="ico">${icon(has ? (job?.icon || 'shirt') : 'lock')}</div><b>${nameLabel(c)}</b><small>${has ? (state.costume === c ? t("Wearing now", "Usando agora") : t("Tap to wear", "Toque para vestir")) : job ? t(`Finish a shift at ${nameLabel(job.name)}`, `Complete um turno em ${nameLabel(job.name)}`) : c === 'Lunar billionaire' ? t("Reach $1 billion", "Alcance $1 bilhão") : t("Buy clothes ($120)", "Compre roupas ($120)")}</small></button>`; }).join('')}</div></div>`);
  el.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'costume', costume: b.dataset.c })) { sfx('ok'); wardrobePanel(); } }));
}
function reportPanel() {
  const s = state;
  open(`
    ${head(t("Money report", "Relatório financeiro"), t(`${CHARACTERS[s.character].name}’s financial journey so far.`, `A jornada financeira de ${CHARACTERS[s.character].name} até agora.`))}
    <div class="card stack">
      <div class="stat-grid">${stat(t("Total earned", "Total ganho"), money(s.earned), 'pos')}${stat(t("Total spent", "Total gasto"), money(s.spent), 'neg')}${stat(t("Interest earned", "Juros ganhos"), money(s.interest), 'pos')}${stat(t("Business income", "Renda da empresa"), money(s.businessIncome, true), 'pos')}${stat(t("Stock portfolio", "Investimentos em ações"), money(portfolio(s), true))}${stat(t("Net worth", "Patrimônio"), money(wealth(s), wealth(s) >= 1e6))}${stat(t("Rent escapes", "Fugas do aluguel"), s.rentEscapes)}${stat(t("Lucky coins", "Moedas da sorte"), `${s.collectibles.length}/12`)}</div>
      <div class="formula">📐 <code>${t("Net worth = wallet + savings + (shares × price)", "Patrimônio = carteira + poupança + (ações × preço)")}</code>${t(" · Savings rate = ", " · Taxa de poupança = ")}<code>${s.earned ? Math.round(((s.earned - s.spent) / s.earned) * 100) : 0}%</code>${t(" of everything you earned is still yours.", " de tudo o que você ganhou ainda é seu.")}</div>
      <h3>${t("Recent transactions", "Transações recentes")}</h3>
      <div class="ledger">${s.ledger.length ? s.ledger.map(e => `<div><span>${ledgerLabel(e.label)}</span><b class="${e.amount > 0 ? 'pos' : e.amount < 0 ? 'neg' : ''}">${e.amount ? (e.amount > 0 ? '+' : '') + money(e.amount) : '—'}</b></div>`).join('') : `<p class="muted">${t("Nothing yet — go earn your first paycheck!", "Nada ainda — vá ganhar seu primeiro salário!")}</p>`}</div>
    </div>`);
}

function financePanel() {
  const el = open(`${head(t("Money missions", "Missões financeiras"), t("Small challenges for big money skills. Learn, try again, and earn a reward once per mission.", "Pequenos desafios para aprender a cuidar do dinheiro. Aprenda, tente de novo e ganhe uma recompensa por missão."))}
    <div class="card stack"><span class="tag">${t(`${state.financeQuests.length} / ${financeMissions().length} completed`, `${state.financeQuests.length} / ${financeMissions().length} concluídas`)}</span>
    <div class="choice-grid">${financeMissions().map(m => `<button class="choice" data-finance="${m.id}"><b>${state.financeQuests.includes(m.id) ? '✓ ' : ''}${m.title}</b><small>${m.description}</small><span class="tag">${state.financeQuests.includes(m.id) ? t("Review lesson", "Rever lição") : t(`Reward ${money(m.reward)}`, `Recompensa ${money(m.reward)}`)}</span></button>`).join('')}</div></div>`);
  el.querySelectorAll('[data-finance]').forEach(button => button.onclick = () => financeMission(button.dataset.finance));
}

function financeMission(id) {
  const mission = financeMissions().find(m => m.id === id); if (!mission) return;
  let step = 0;
  const answers = [], reviewing = state.financeQuests.includes(id);
  function render() {
    const question = mission.questions[step];
    const el = open(`${head(mission.title, `${step + 1} / ${mission.questions.length} · ${reviewing ? t("Practice — reward already earned", "Treino — recompensa já recebida") : t(`Reward ${money(mission.reward)}`, `Recompensa ${money(mission.reward)}`)}`)}
      <div class="card stack"><h3>${question.prompt}</h3><div class="choice-grid">${question.choices.map((choice, i) => `<button class="choice" data-answer="${i}">${choice}</button>`).join('')}</div>
      <p class="formula hidden" data-explanation role="status"></p><button class="btn hidden" data-next-question>${step + 1 < mission.questions.length ? t("Next question", "Próxima pergunta") : t("Finish mission", "Concluir missão")}</button>
      <button class="btn ghost small" data-missions>${t("Back to missions", "Voltar às missões")}</button></div>`);
    el.querySelector('[data-missions]').onclick = financePanel;
    el.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => {
      const answer = Number(button.dataset.answer), correct = answer === question.answer;
      const feedback = el.querySelector('[data-explanation]'); feedback.classList.remove('hidden');
      feedback.textContent = `${correct ? t("Correct! ", "Correto! ") : t("Have another try. ", "Tente novamente. ")}${question.explanation}`;
      sfx(correct ? 'coin' : 'bad');
      if (correct) {
        answers[step] = answer;
        el.querySelectorAll('[data-answer]').forEach(b => { b.disabled = true; });
        const next = el.querySelector('[data-next-question]'); next.classList.remove('hidden'); next.focus();
      }
    });
    el.querySelector('[data-next-question]').onclick = () => {
      if (answers[step] !== question.answer) return;
      if (++step < mission.questions.length) { render(); return; }
      if (reviewing) toast(t("Great practice! You already earned this mission’s reward.", "Ótimo treino! Você já recebeu a recompensa desta missão."), 'ok');
      else if (dispatch({ type: 'financeQuest', id, answers })) { toast(t(`${mission.title} complete! +${money(mission.reward)}`, `${mission.title} concluída! +${money(mission.reward)}`), 'cash'); award(t("Money skills unlocked!", "Novas habilidades financeiras!"), mission.title); }
      financePanel();
    };
  }
  render();
}

function travel(location) {
  if (dispatch({ type: 'travel', location })) {
    stopRent(); trackedId = null; close(); scheduleRent();
    toast(location === 'moon' ? t("Welcome back to the Moon! Use the rocket to return to the city.", "Bem-vindo de volta à Lua! Use o foguete para voltar à cidade.") : t("Welcome back to the city!", "Bem-vindo de volta à cidade!"), 'ok');
  }
}

function syncOnline() {
  const badge = $('[data-online]');
  badge.classList.toggle('hidden', !multiplayer.room || busy);
  badge.textContent = multiplayer.room ? `👥 ${multiplayer.room} · ${peerView.peers.size + 1}/8 · ${multiplayer.status === 'connected' ? t("Online", "Online") : t("Connecting…", "Conectando…")}` : '';
  const count = overlayRoot.querySelector('[data-room-count]');
  if (count) count.textContent = t(`${peerView.peers.size + 1} / 8 players in this room`, `${peerView.peers.size + 1} / 8 jogadores nesta sala`);
  const roster = overlayRoot.querySelector('[data-room-roster]');
  if (roster) {
    roster.replaceChildren();
    for (const peer of world.onlinePeers || []) {
      const entry = document.createElement('li'); entry.textContent = `${peer.name} · ${peer.location === 'moon' ? t("Moon", "Lua") : t("City", "Cidade")}`; roster.append(entry);
    }
  }
  if (!multiplayer.room) peerView.clear();
}

function multiplayerPanel() {
  const connected = !!multiplayer.room;
  const el = open(`${head(t("Explore with friends", "Explore com amigos"), t("Up to 8 players. Share a room code and explore together from different devices.", "Até 8 jogadores. Compartilhe o código da sala e explore com amigos, cada um no seu aparelho."))}
    <div class="card stack">
    ${connected ? `<p class="muted">${t("YOUR ROOM CODE", "CÓDIGO DA SUA SALA")}</p><strong class="room-code" data-room-code></strong><p data-room-count></p><ul data-room-roster></ul>
      <div class="row"><button class="btn sky" data-copy-room>${t("Copy invite link", "Copiar link de convite")}</button><button class="btn coral" data-leave-room>${t("Leave room", "Sair da sala")}</button></div><button class="btn" data-close>${t("Back to our adventure", "Voltar à nossa aventura")}</button>` : `
      <label class="field">${t("Your nickname", "Seu apelido")}<input data-online-name maxlength="20" autocomplete="nickname" placeholder="${t("Your name", "Seu nome")}"></label>
      <button class="btn sky" data-create-room>${t("Create a room", "Criar uma sala")}</button>
      <label class="field">${t("Friend’s room code", "Código da sala do amigo")}<input data-room-input maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123"></label>
      <button class="btn sage" data-join-room>${t("Join room", "Entrar na sala")}</button>`}
    <p data-online-error class="neg" role="status"></p>
    <p class="muted">${t("Your money and missions stay in your own save. Friends appear when you are in the same place. Use the wardrobe to show off your skins and the Dance button to dance together.", "Seu dinheiro e suas missões ficam no seu próprio progresso salvo. Os amigos aparecem quando estão no mesmo lugar. Use o guarda-roupa para mostrar seus visuais e o botão Dançar para dançarem juntos.")}</p>
    </div>`);
  if (connected) {
    el.querySelector('[data-room-code]').textContent = multiplayer.room;
    el.querySelector('[data-copy-room]').onclick = async () => {
      const url = new URL(location.href); url.searchParams.delete('debug'); url.searchParams.set('room', multiplayer.room);
      try { await navigator.clipboard.writeText(url.href); toast(t("Invite link copied!", "Link de convite copiado!"), 'ok'); }
      catch { el.querySelector('[data-online-error]').textContent = t(`Share the room code: ${multiplayer.room}`, `Compartilhe o código da sala: ${multiplayer.room}`); }
    };
    el.querySelector('[data-leave-room]').onclick = async () => { await multiplayer.leave(); peerView.clear(); if (el.isConnected) multiplayerPanel(); };
    syncOnline();
  } else {
    el.querySelector('[data-online-name]').value = CHARACTERS[state.character].name;
    el.querySelector('[data-room-input]').value = new URLSearchParams(location.search).get('room')?.slice(0, 6) || '';
    const connect = async create => {
      const name = el.querySelector('[data-online-name]').value.trim(), code = el.querySelector('[data-room-input]').value.trim().toUpperCase();
      if (!name) { el.querySelector('[data-online-error]').textContent = t("Choose a nickname first.", "Escolha um apelido primeiro."); return; }
      if (!create && !/^[A-Z0-9]{6}$/.test(code)) { el.querySelector('[data-online-error]').textContent = t("Enter your friend’s 6-character room code.", "Digite o código de 6 caracteres da sala do seu amigo."); return; }
      el.querySelectorAll('[data-create-room], [data-join-room]').forEach(b => { b.disabled = true; });
      el.querySelector('[data-online-error]').textContent = t("Connecting…", "Conectando…");
      try {
        if (create) await multiplayer.create(name); else await multiplayer.join(code, name);
        if (multiplayer.peers.some(peer => peer.location === world.location && Math.hypot(peer.x - world.player.pos.x, peer.z - world.player.pos.z) < 2.5)) {
          // Friends often start at the same bench. Give the joining player room to see both avatars.
          world.player.pos.x += world.player.pos.x > 0 ? -3.5 : 3.5;
          world.resetInput();
        }
        if (el.isConnected) multiplayerPanel();
      } catch (error) {
        if (el.isConnected) { el.querySelector('[data-online-error]').textContent = translateError(error.message); el.querySelectorAll('[data-create-room], [data-join-room]').forEach(b => { b.disabled = false; }); }
      }
    };
    el.querySelector('[data-create-room]').onclick = () => connect(true);
    el.querySelector('[data-join-room]').onclick = () => connect(false);
  }
}

function menuPanel() {
  const el = open(`
    ${head(t("Take a little breather", "Faça uma pausa"), t("World and rent chase paused. Your adventure will be right here.", "O mundo e a cobrança do aluguel estão pausados. Sua aventura espera por você."))}
    <div class="card stack">
      <button class="btn" data-close>${icon('play')}${t(" Back to the adventure", " Voltar à aventura")}</button>
      ${languagePicker()}
      <p><b>${t("How to play:", "Como jogar:")}</b> ${TOUCH ? t("joystick to walk, swipe the right side of the screen to look, and use the big buttons to jump and act.", "use o controle para andar, deslize o lado direito da tela para olhar e use os botões grandes para pular e interagir.") : t("WASD or arrows to walk, drag the mouse to look around, Space to jump, E to interact.", "WASD ou setas para andar, arraste o mouse para olhar, Espaço para pular e E para interagir.")}</p>
      <p><b>${t("Rent alert:", "Alerta de aluguel:")}</b>${t(" when Mr. Barriga shows up you have 40 seconds to hide in a bush. If he finds you, rent is $200. If he doesn’t, you pocket $500!", " quando o Sr. Barriga aparecer, você terá 40 segundos para se esconder em um arbusto. Se ele encontrar você, o aluguel custa $200. Se não encontrar, você ganha $500!")}</p>
      <p><b>${t("Chaos mode:", "Modo bagunça:")}</b>${t(" run or jump into the townsfolk llamas to send them flying. It’s free, it’s silly, and it teaches nothing about finance.", " corra ou pule nas lhamas da cidade para fazê-las voar. É grátis, é uma brincadeira e não ensina nada de finanças.")}</p>
      <p><b>${t("A bigger adventure:", "Uma aventura maior:")}</b>${t(" find cars, gliders and the beach marina on the map. Use Action / E to enter or leave a vehicle. Fly with F, dance with B, and shoot Cyborg milk with Q. The on-screen buttons work on phones too.", " encontre carros, planadores e a marina da praia no mapa. Use Ação / E para entrar ou sair de um veículo. Voe com F, dance com B e atire leite com Q usando o Ciborgue. Os botões na tela também funcionam no celular.")}</p>
      <div class="row"><button class="btn sky" data-friends>${t("👥 Play online", "👥 Jogar online")}</button><button class="btn sage" data-money-missions>${t("🎯 Money missions", "🎯 Missões financeiras")}</button>${state.stage === 'freeplay' ? `<button class="btn lilac" data-travel>🚀 ${state.location === 'moon' ? t("Return to the city", "Voltar à cidade") : t("Visit the Moon again", "Visitar a Lua de novo")}</button>` : ''}</div>
      <div class="row"><button class="btn ghost" data-mute>${icon(state.muted ? 'mute' : 'sound')}${t(" Sound ", " Som ")}${state.muted ? t("off", "desligado") : t("on", "ligado")}</button><button class="btn coral" data-reset>${icon('reset')}${t(" New game", " Novo jogo")}</button></div>
      <div class="settings-grid">
        <label>${t("Visual quality", "Qualidade visual")}<select data-quality><option value="high" ${settings.quality === 'high' ? 'selected' : ''}>${t("High · shadows & crisp detail", "Alta · sombras e detalhes nítidos")}</option><option value="balanced" ${settings.quality === 'balanced' ? 'selected' : ''}>${t("Balanced · smoother on mobile", "Equilibrada · melhor no celular")}</option></select></label>
        <label class="setting-toggle"><span>${t("Reduced motion", "Reduzir movimento")}<small>${t("Gentler celebrations, no particles or sprint zoom", "Comemorações suaves, sem partículas ou zoom ao correr")}</small></span><input type="checkbox" data-motion ${settings.reducedMotion ? 'checked' : ''}></label>
        <label class="setting-toggle"><span>${t("Show minimap", "Mostrar minimapa")}</span><input type="checkbox" data-show-map ${settings.showMap ? 'checked' : ''}></label>
      </div>
    </div>
    ${gameCredits()}`);
  el.querySelector('[data-mute]').onclick = () => { dispatch({ type: 'mute' }); menuPanel(); };
  el.querySelector('[data-friends]').onclick = multiplayerPanel;
  el.querySelector('[data-money-missions]').onclick = financePanel;
  el.querySelector('[data-travel]')?.addEventListener('click', () => travel(state.location === 'moon' ? 'city' : 'moon'));
  const apply = () => {
    settings.quality = el.querySelector('[data-quality]').value; settings.reducedMotion = el.querySelector('[data-motion]').checked; settings.showMap = el.querySelector('[data-show-map]').checked;
    world.applySettings(settings); document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    try { storage?.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Session preferences still apply. */ }
  };
  el.querySelectorAll('[data-quality], [data-motion], [data-show-map]').forEach(input => input.addEventListener('change', apply));
  el.querySelector('[data-language]').onchange = event => { changeLanguage(event.target.value); menuPanel(); queueMicrotask(() => overlayRoot.querySelector('[data-language]')?.focus()); };
  el.querySelector('[data-reset]').onclick = () => { if (confirm(t("Erase your progress and start over?", "Apagar seu progresso e começar de novo?"))) { state = initialState(); save(); location.reload(); } };
}

function destination() {
  if (rent) {
    const position = world.hiding.reduce((best, p) => !best || p.distanceTo(world.player.pos) < best.distanceTo(world.player.pos) ? p : best, null);
    return position ? { id: 'shelter', label: t("Hide in a bush", "Esconda-se em um arbusto"), position, radius: 2.1 } : null;
  }
  const mission = missionFor(state), id = trackedId || mission.id;
  const target = world.interactables.find(it => it.id === id && world.available(it) && world.isOnLocation(it) && (it.type !== 'home' || world.plot.visible));
  if (!target && trackedId) { trackedId = null; return destination(); }
  return target;
}
function mapPanel() {
  const mission = missionFor(state);
  const places = world.interactables.filter(it => world.available(it) && world.isOnLocation(it) && (it.type !== 'home' || world.plot.visible));
  const el = open(`${head(t("A town full of possibilities", "Uma cidade cheia de possibilidades"), t("Pick a destination. The golden beacon and compass will guide you there.", "Escolha um destino. O sinal dourado e a bússola vão guiar você."))}
    <div class="card stack"><button class="btn" data-auto>${icon('sparkles')}${t(" Follow my next mission", " Seguir minha próxima missão")}</button><div class="destination-grid">${places.map(it => {
      const job = JOBS.find(j => j.id === it.id), done = !!state.shifts[it.id], distance = Math.round(it.position.distanceTo(world.player.pos));
      return `<button class="choice ${it.id === (trackedId || mission.id) ? 'selected' : ''}" data-track="${it.id}"><span class="tag">${job ? (done ? t("✓ SHIFT COMPLETE", "✓ TURNO CONCLUÍDO") : t(`${money(job.pay)} / SHIFT`, `${money(job.pay)} / TURNO`)) : t("EXPLORE", "EXPLORAR")} · ${distance} m</span><b>${job ? nameLabel(job.name) : it.label}</b><small>${job ? nameLabel(job.description) : t("Set a waypoint and explore.", "Marque um destino e explore.")}</small></button>`;
    }).join('')}</div><p class="muted">${t("The compass points directly to your destination; walk around buildings along the streets. During rent alerts, it points to the nearest hiding bush.", "A bússola aponta direto para seu destino; siga pelas ruas para contornar os prédios. Durante os alertas de aluguel, ela aponta para o arbusto mais próximo.")}</p></div>`);
  el.querySelector('[data-auto]').onclick = () => { trackedId = null; close(); };
  el.querySelectorAll('[data-track]').forEach(b => { b.onclick = () => { trackedId = b.dataset.track; close(); toast(t("Destination set. Follow the golden beacon.", "Destino marcado. Siga o sinal dourado."), 'ok'); }; });
}

function purchasePanel() {
  const el = open(`
    ${head(t("Your first big purchase!", "Sua primeira grande compra!"), t("You saved $1,000. Time to decide what matters most to you.", "Você juntou $1.000. Hora de decidir o que mais importa para você."))}
    <div class="card stack">
      <div class="choice-grid">
        <button class="choice" data-asset="house"><div class="ico">${icon('home')}</div><b>${t("First house · $1,000", "Primeira casa · $1.000")}</b><small>${t("A cozy little place. Nobody can evict you from your own home… mostly.", "Um cantinho aconchegante. Ninguém pode expulsar você da sua própria casa… quase sempre.")}</small></button>
        <button class="choice" data-asset="car"><div class="ico">${icon('car')}</div><b>${t("First car · $1,000", "Primeiro carro · $1.000")}</b><small>${t("Freedom on four wheels. Fully customizable!", "Liberdade sobre quatro rodas. Personalize como quiser!")}</small></button>
      </div>
      <div class="formula">${t("📐 A house is an ", "📐 Uma casa é um ")}<b>${t("asset", "bem")}</b>${t(" that usually keeps its value; a car is an asset that ", " que geralmente mantém seu valor; um carro é um bem que ")}<b>${t("depreciates", "se desvaloriza")}</b>${t(". Both cost the same today — what will you choose?", ". Os dois custam o mesmo hoje — qual você vai escolher?")}</div>
    </div>`);
  el.querySelectorAll('[data-asset]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'purchase', asset: b.dataset.asset })) { sfx('cash'); customizePanel(true); } }));
}
function customizePanel(fresh = false) {
  const colors = ['#ff6b6b', '#ffb37a', '#ffd94d', '#9dd39a', '#8fd4ff', '#c8b4f2', '#2b2a33', '#fffaf0'];
  const el = open(`
    ${head(fresh ? t(`Congrats on your first ${state.asset}!`, `Parabéns pela conquista: ${nameLabel(state.asset)}!`) : t(`Customize your ${state.asset}`, `Personalize: ${nameLabel(state.asset)}`), t("Pick a color and a style. Changes are free.", "Escolha uma cor e um estilo. As mudanças são grátis."))}
    <div class="card stack">
      <h3>${t("Color", "Cor")}</h3><div class="swatches">${colors.map(c => `<button class="swatch ${state.assetColor === c ? 'selected' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>
      <h3>${t("Style", "Estilo")}</h3><div class="row">${['classic', 'sporty', 'cozy'].map(st => `<button class="btn small ${state.assetStyle === st ? '' : 'ghost'}" data-style="${st}">${nameLabel(st)}</button>`).join('')}</div>
      ${fresh ? `<p>${t("Now the ", "Agora as ")}<b>${t("advanced careers", "carreiras avançadas")}</b>${t(" are open: Tiny Tails Factory, The Grand Llama hotel and Hooves PD pay ", " estão disponíveis: a Fábrica Pequenas Caudas, o hotel O Grande Lhama e a Delegacia dos Cascos pagam ")}<b>$900</b>${t(" per shift. But beware… ", " por turno. Mas cuidado… ")}<b>${t("Mr. Barriga", "Sr. Barriga")}</b>${t(" will come for the rent!", " virá cobrar o aluguel!")}</p>` : ''}
      <button class="btn" data-close>${icon('check')}${t(" Looks great!", " Ficou ótimo!")}</button>
    </div>`);
  el.querySelectorAll('[data-color]').forEach(b => (b.onclick = () => { dispatch({ type: 'customize', color: b.dataset.color, style: state.assetStyle }); customizePanel(fresh); }));
  el.querySelectorAll('[data-style]').forEach(b => (b.onclick = () => { dispatch({ type: 'customize', color: state.assetColor, style: b.dataset.style }); customizePanel(fresh); }));
}

function businessPanel() {
  const s = state, cur = income(s), next = 50000 * 2.8 ** s.company, cost = upgradeCost(s), payback = Math.ceil(cost / (next - cur));
  const el = open(`
    ${head(t("Llama Labs HQ", "Sede da Llama Labs"), t("Your company pays you every 8 seconds. Upgrade it and invest in stocks to reach $1B.", "Sua empresa paga a cada 8 segundos. Melhore a empresa e invista em ações para chegar a $1 bilhão."))}
    <div class="card stack">
      <div class="row" style="justify-content:space-between"><span>${t("Net worth", "Patrimônio")}</span><b class="money" data-business-worth>${money(wealth(s), true)} / ${money(1e9, true)}</b></div>
      <div class="progress"><i data-business-progress style="width:${Math.min(100, (wealth(s) / 1e9) * 100)}%"></i></div>
      <div class="stat-grid">${stat(t("Company level", "Nível da empresa"), `${s.company} / 9`)}${stat(t("Income per tick", "Renda por ciclo"), money(cur, true), 'pos')}${stat(t("Cash available", "Dinheiro disponível"), `<span data-business-cash>${money(liquid(s), true)}</span>`)}</div>
      ${s.company < 9 ? `<div class="formula">${t(`📐 Upgrade to level ${s.company + 1}: cost `, `📐 Melhoria para o nível ${s.company + 1}: custo `)}<code>${money(cost, true)}</code>${t(" → income ", " → renda ")}<code>${money(next, true)}</code>${t(" per tick. Payback ≈ ", " por ciclo. Retorno ≈ ")}<code>${money(cost, true)} ÷ ${money(next - cur, true)} = ${payback} ${t("ticks", "ciclos")}</code> (${payback * BUSINESS_TICK}s).</div>` : `<div class="formula">${t("🏆 Max level reached! Your company is a money machine.", "🏆 Nível máximo! Sua empresa é uma máquina de ganhar dinheiro.")}</div>`}
      <button class="btn sage" data-upgrade ${s.company >= 9 || liquid(s) < cost ? 'disabled' : ''}>${icon('sparkles')}${t(" Upgrade company (", " Melhorar empresa (")}${money(cost, true)})</button>
    </div>
    <div class="card stack">
      <h3>${icon('chart', 18)}${t(" Stock market", " Bolsa de valores")}</h3>
      <p class="muted">${t("Prices move up to ±8% every tick. Buy low, sell high — but remember: stocks can lose value too.", "Os preços variam até ±8% a cada ciclo. Compre na baixa e venda na alta — lembre-se: ações também podem perder valor.")}</p>
      <table class="table"><thead><tr><th>${t("Company", "Empresa")}</th><th class="num">${t("Price", "Preço")}</th><th class="num">${t("You own", "Você tem")}</th><th></th></tr></thead><tbody>
        ${STOCKS.map(st => `<tr><td><b style="color:${st.color}">${st.symbol}</b><br><small>${st.name}</small></td><td class="num money" data-price="${st.id}">${money(s.prices[st.id])}</td><td class="num">${(s.holdings[st.id] || 0).toLocaleString(locale())}<br><small data-holding="${st.id}">${money((s.holdings[st.id] || 0) * s.prices[st.id], true)}</small></td>
        <td><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><input class="qty" type="number" min="1" value="${Math.max(1, Math.floor(liquid(s) / s.prices[st.id] / 4)) || 1}" data-qty="${st.id}" aria-label="${t(`Number of ${st.symbol} shares`, `Quantidade de ações ${st.symbol}`)}"><button class="btn small sage" data-buy="${st.id}">${t("Buy", "Comprar")}</button><button class="btn small peach" data-sell="${st.id}" ${s.holdings[st.id] ? '' : 'disabled'}>${t("Sell", "Vender")}</button></div></td></tr>`).join('')}
      </tbody></table>
      <div class="formula">${t("📐 Portfolio value = ", "📐 Valor dos investimentos = ")}<code>${t("Σ shares × price = ", "Σ ações × preço = ")}<span data-portfolio>${money(portfolio(s), true)}</span></code></div>
    </div>`);
  const qty = id => Math.floor(Number(el.querySelector(`[data-qty="${id}"]`).value));
  el.querySelector('[data-upgrade]').onclick = () => { if (dispatch({ type: 'upgrade' })) { toast(t(`Llama Labs is now level ${state.company}!`, `A Llama Labs chegou ao nível ${state.company}!`), 'cash'); businessPanel(); } };
  el.querySelectorAll('[data-buy]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'trade', stock: b.dataset.buy, side: 'buy', quantity: qty(b.dataset.buy) })) { sfx('ok'); businessPanel(); } }));
  el.querySelectorAll('[data-sell]').forEach(b => (b.onclick = () => { if (dispatch({ type: 'trade', stock: b.dataset.sell, side: 'sell', quantity: Math.min(qty(b.dataset.sell), state.holdings[b.dataset.sell] || 0) })) { sfx('cash'); businessPanel(); } }));
  el.dataset.business = '1';
}
function refreshBusiness() {
  const el = overlayRoot.querySelector('[data-business]'); if (!el) return;
  el.querySelector('[data-business-worth]').textContent = `${money(wealth(state), true)} / ${money(1e9, true)}`;
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
function cutscene(html, cls = 'scene') { return new Promise(res => { const el = open(`<div class="card stack" data-locked style="text-align:center;justify-items:center">${html}<button class="btn" data-next>${icon('arrow')} ${t("Continue", "Continuar")}</button></div>`, cls); el.querySelector('[data-next]').onclick = () => { close(); res(); }; }); }
async function onStageChange(from, to) {
  if (to === 'purchase') { toast(t("Goal reached! Go to your plot to buy a house or a car.", "Meta alcançada! Vá ao seu terreno para comprar uma casa ou um carro."), 'cash'); }
  if (to === 'timeskip') {
    await cutscene(`<div class="big-emoji">⏳</div><h2>${t("Two years later…", "Dois anos depois…")}</h2><p>${t(`Three careers, thousands of shifts, and a Piggy Bank that never stopped compounding. ${CHARACTERS[state.character].name} is now a `, `Três carreiras, milhares de turnos e um cofrinho que nunca parou de render. ${CHARACTERS[state.character].name} agora é `)}<b>${t("millionaire", "milionário")}</b>${t(" with a mansion, luxury cars and a lovely partner.", " com uma mansão, carros de luxo e uma pessoa especial ao seu lado.")}</p><div class="formula">${t("📐 Consistent income + saving + compound interest over time = wealth. Two years of $900 shifts and 2% growth turned into ", "📐 Renda constante + poupança + juros compostos ao longo do tempo = riqueza. Dois anos de turnos de $900 e rendimento de 2% se transformaram em ")}<b>${money(1e6)}</b>.</div>`, 'night');
    dispatch({ type: 'timeskip' });
  }
  if (to === 'robbery') { world.setStage('robbery', state); toast(t("Welcome home, millionaire! Visit your mansion.", "Bem-vindo ao lar, milionário! Visite sua mansão."), 'ok'); }
  if (to === 'business') { world.setStage('business', state); toast(t("Llama Labs HQ is open! Grow your company to $1B.", "A sede da Llama Labs está aberta! Faça sua empresa chegar a $1 bilhão."), 'cash'); }
  if (to === 'moon') {
    stopRent();
    await cutscene(`<div class="big-emoji">💸🦙💸</div><h2>${t("BILLIONAIRE!", "BILIONÁRIO!")}</h2><p>${t("Your net worth passed ", "Seu patrimônio passou de ")}<b>${money(1e9)}</b>${t(". You unlock the ", ". Você desbloqueou o traje ")}<b>${t("Lunar billionaire", "Bilionário lunar")}</b>${t(" suit and you two are officially the richest couple in the llama world.", " e vocês são oficialmente o casal mais rico do mundo das lhamas.")}</p><p>${t("📞 “Hi, it’s ", "📞 “Oi, aqui é o ")}<b>Elo Musk</b>${t(". I have a little proposal about the Moon…”", ". Tenho uma proposta sobre a Lua…”")}</p>`, 'night');
    world.setStage('moon', state);
  }
  if (to === 'freeplay') { world.setStage('freeplay', state); toast(t("Free world unlocked! Side missions are marked with stars.", "Mundo livre desbloqueado! As missões extras estão marcadas com estrelas."), 'ok'); scheduleRent(); }
}
async function robberySequence() {
  await cutscene(`<div class="big-emoji">🚨</div><h2>${t("Robbers!", "Ladrões!")}</h2><p>${t("Thieves heard about your fortune and are sneaking toward the mansion. Grab your ", "Os ladrões souberam da sua fortuna e estão se aproximando da mansão. Pegue seu ")}<b>${t("baseball bat", "taco de beisebol")}</b>${t(" and defend the front door for ", " e defenda a porta por ")}<b>${t("4 minutes", "4 minutos")}</b>!</p>`, 'night');
  open('');
  const result = await defendMansion(overlayRoot, 240, sfx);
  close();
  await cutscene(`<div class="big-emoji">🏏💫</div><h2>${t("Mansion defended!", "Mansão protegida!")}</h2><p>${t("You bonked ", "Você acertou ")}<b>${result.hits}</b>${t(` thieves${result.stolen ? ` but they still grabbed <b>${money(result.stolen)}</b>` : ' and they didn’t take a cent'}`, ` ladrões${result.stolen ? `, mas eles levaram <b>${money(result.stolen)}</b>` : ' e eles não levaram nem um centavo'}`)}.</p><p>${t("Time to put that money to work: you’re now the owner of ", "Hora de fazer o dinheiro trabalhar: você agora é dono da ")}<b>Llama Labs</b>${t(", a company that earns millions. Head to the HQ!", ", uma empresa que rende milhões. Vá até a sede!")}</p>`, 'night');
  dispatch({ type: 'defend', stolen: result.stolen });
}
async function moonSequence() {
  await cutscene(`<div class="big-emoji">🚀🌕</div><h2>${t("A deal with Elo Musk", "Um acordo com Elo Musk")}</h2><div class="speech">${t("“Llamas on the Moon! Sign here and this dome house is yours. Cheaper than a Mars ticket, I promise.”", "“Lhamas na Lua! Assine aqui e esta casa-cúpula é sua. Mais barata que uma passagem para Marte, eu prometo.”")}</div><p>${t("You and your partner now own the first llama house on the Moon. The game is complete — but the ", "Você e seu par agora têm a primeira casa de lhamas na Lua. A história terminou — e o ")}<b>${t("free world", "mundo livre")}</b>${t(" is now unlocked!", " está liberado!")}</p>`, 'night');
  dispatch({ type: 'moon' });
}
async function finale() {
  const s = state;
  await cutscene(`<div class="big-emoji">🔥🥩🧉</div><h2>${t("Barbecue & chimarrão!", "Churrasco e chimarrão!")}</h2><p>${t("From a park bench to the Moon. Friends, family and Elo Musk himself gather for the celebration barbecue.", "De um banco de praça até a Lua. Amigos, família e o próprio Elo Musk se reúnem para o churrasco de comemoração.")}</p>
    <div class="stat-grid" style="text-align:left">${stat(t("Total earned", "Total ganho"), money(s.earned, true), 'pos')}${stat(t("Total spent", "Total gasto"), money(s.spent, true), 'neg')}${stat(t("Interest earned", "Juros ganhos"), money(s.interest, true), 'pos')}${stat(t("Net worth", "Patrimônio"), money(wealth(s), true))}</div>
    <div class="formula">${t("📐 The secret recipe: earn → save → let interest compound → invest → build. Thanks for playing!", "📐 A receita secreta: ganhar → poupar → acumular juros → investir → construir. Obrigado por jogar!")}</div>`, 'scene');
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
function renderRent() { if (!rent) return; const key = `${rent.left}|${world.isHidden()}`; if (rent.key === key) return; rent.key = key; $('[data-rent]').innerHTML = `${t("🧔 RENT ALERT! Hide from Mr. Barriga ", "🧔 ALERTA DE ALUGUEL! Esconda-se do Sr. Barriga ")}<span class="timer">${rent.left}</span>s ${world.isHidden() ? `<span class="hiding">${t("🌳 hiding…", "🌳 escondido…")}</span>` : ''}`; }
function resolveRent(escaped) {
  if (!rent) return; clearInterval(rent.timer); rent = null; world.stopRent(); $('[data-rent]').classList.add('hidden');
  dispatch({ type: 'rent', hidden: escaped });
  toast(escaped ? t("Mr. Barriga gave up! You pocket $500.", "O Sr. Barriga desistiu! Você ganhou $500.") : t("Mr. Barriga found you! Rent paid: $200.", "O Sr. Barriga encontrou você! Aluguel pago: $200."), escaped ? 'cash' : 'bad');
  scheduleRent();
}
function stopRent() { if (rent) { clearInterval(rent.timer); rent = null; world.stopRent(); $('[data-rent]').classList.add('hidden'); } }
world.onJump = () => sfx('jump');
world.onLand = () => sfx('land');
world.onNotice = message => { toast(message); if (!busy) canvas.focus({ preventScroll: true }); };
world.onFound = () => resolveRent(false);
world.onCoin = id => { if (dispatch({ type: 'coin', id })) toast(t("Lucky coin! +$25", "Moeda da sorte! +$25"), 'coin'); };
let bonks = 0;
world.onBonk = npc => { bonks++; world.burst(npc.pos, 0xc8b4f2, 14); sfx('bonk'); if (bonks === 1) toast(t("BONK! 💫 Townsfolk go flying when you run into them.", "POFT! 💫 Os moradores voam quando você corre contra eles.")); };
world.available = it => {
  if (it.type === 'travel') return state.stage === 'freeplay';
  if (it.type === 'moon') return state.stage === 'moon';
  if (it.type === 'finance') return !state.financeQuests.includes(it.id);
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
    case 'vehicle': if (it.id === 'exit-vehicle') world.exitVehicle(); else if (rent) toast(t("Hide from Mr. Barriga first, then take a ride.", "Esconda-se do Sr. Barriga primeiro, depois vá passear.")); else world.useVehicle(it.id); break;
    case 'travel': travel(it.id === 'to-moon' ? 'moon' : 'city'); break;
    case 'finance': financeMission(it.id); break;
    case 'job': {
      const job = JOBS.find(j => j.id === it.id);
      stopRent(); open('');
      const ok = await playShift(overlayRoot, job, sfx); close();
      if (ok && dispatch({ type: 'shift', job: job.id })) { sfx('cash'); paycheck(job); } else if (!ok) toast(t("Shift abandoned — no paycheck this time.", "Turno abandonado — sem salário desta vez."));
      scheduleRent(); break;
    }
    case 'shop': if (dispatch({ type: 'spend', item: it.id })) toast(it.id === 'food' ? t("Delicious llama burger! -$60", "Delicioso hambúrguer de lhama! -$60") : t("Fresh streetwear unlocked! -$120", "Roupa urbana desbloqueada! -$120"), 'ok'); break;
    case 'bank': walletPanel(); break;
    case 'home': if (state.stage === 'purchase') purchasePanel(); else if (state.asset) customizePanel(); else toast(t(`Save up $1,000 first — you have ${money(liquid(state))}.`, `Junte $1.000 primeiro — você tem ${money(liquid(state))}.`)); break;
    case 'mansion': if (state.stage === 'robbery') robberySequence(); else toast(t("Home sweet mansion. 🏰", "Mansão, doce mansão. 🏰")); break;
    case 'hq': businessPanel(); break;
    case 'quest': {
      const lines = { picnic: t("A lovely picnic with your partner and a basket of alfalfa sandwiches. +$5,000 sponsorship!", "Um belo piquenique com seu par e uma cesta de sanduíches de alfafa. +$5.000 de patrocínio!"), explorer: t("You mapped the whole town for tourists. +$5,000!", "Você mapeou a cidade para os turistas. +$5.000!"), helper: t("You helped the school kids with their financial-math homework. +$5,000!", "Você ajudou as crianças com o dever de matemática financeira. +$5.000!") };
      if (it.id === 'helper') {
        open('');
        const result = await playQuiz(overlayRoot); close();
        if (!result.passed) { toast(result.quit ? t("Homework session cancelled.", "Sessão de dever de casa cancelada.") : t(`Only ${result.correct}/${result.total} correct — the kids need at least ${result.needed}. Try again!`, `Você acertou ${result.correct}/${result.total} — as crianças precisam de pelo menos ${result.needed}. Tente de novo!`), 'bad'); break; }
      }
      if (dispatch({ type: 'quest', id: it.id })) toast(lines[it.id], 'cash'); break;
    }
    case 'bbq': if (state.sideQuests.length < 3) toast(t("Three adventures first, then the big BBQ! Follow your next mission.", "Primeiro três aventuras, depois o churrasco! Siga sua próxima missão.")); else finale(); break;
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
  if (!busy && state.started) {
    if (e.code === 'KeyB') world.toggleDance();
    if (e.code === 'KeyF') fly();
    if (e.code === 'KeyQ') world.shootMilk();
  }
});
new MutationObserver(() => {
  const game = overlayRoot.querySelector('.game');
  if (game) {
    const dialog = overlayRoot.firstElementChild; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', game.querySelector('h2')?.textContent || t("Minigame", "Minijogo"));
    game.setAttribute('tabindex', '-1'); game.focus({ preventScroll: true });
  }
}).observe(overlayRoot, { childList: true });
$('[data-action]').onclick = interact;
promptEl.onclick = interact;
$('[data-route]').onclick = () => { if (!busy) mapPanel(); };
$('[data-minimap]').onclick = () => { if (!busy) mapPanel(); };
$('[data-sprint]').onclick = e => { world.sprint = !world.sprint; e.currentTarget.setAttribute('aria-pressed', String(world.sprint)); };
$('[data-jump]').addEventListener('pointerdown', () => (world.jumpQueued = true));
$('[data-dance]').onclick = () => { if (!busy) world.toggleDance(); };
function fly() { if (busy) return; if (rent) toast(t("Hide from Mr. Barriga before taking off.", "Esconda-se do Sr. Barriga antes de decolar.")); else world.toggleFlight(); }
$('[data-fly]').onclick = fly;
$('[data-milk]').onclick = () => { if (!busy) { world.shootMilk(); canvas.focus({ preventScroll: true }); } };
$('[data-online]').onclick = () => { if (!busy) multiplayerPanel(); };
hud.querySelectorAll('[data-open]').forEach(b => { b.setAttribute('aria-label', b.title); b.onclick = () => { if (busy) return; ({ map: mapPanel, wallet: walletPanel, wardrobe: wardrobePanel, report: reportPanel, menu: menuPanel, finance: financePanel, multiplayer: multiplayerPanel })[b.dataset.open](); }; });

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
  if (state.started && multiplayer.room) {
    const p = world.player.pos;
    multiplayer.update({ x: p.x, y: p.y, z: p.z, heading: world.player.heading, character: state.character, costume: state.costume, location: world.location, vehicle: world.vehicle?.type || null, dancing: !!world.dancing, flying: !!world.flying });
  }
  if (document.hidden) return;
  world.update();
  peerView.update(dt, now / 1000);
  if (!state.started) return;
  const playing = !busy && !hud.classList.contains('hidden');
  $('[data-online]').classList.toggle('hidden', !playing || !multiplayer.room);
  $('[data-adventure]').classList.toggle('hidden', !playing);
  if (playing) {
    const status = world.getAdventureStatus();
    $('[data-mode]').textContent = status.label;
    $('[data-dance]').setAttribute('aria-pressed', String(status.dancing));
    $('[data-fly]').classList.toggle('hidden', !status.canFly);
    $('[data-fly]').textContent = status.mode === 'flight' ? t("⬇ Land", "⬇ Pousar") : t("🚀 Fly", "🚀 Voar");
    $('[data-fly]').setAttribute('aria-pressed', String(status.mode === 'flight'));
    $('[data-milk]').classList.toggle('hidden', !status.canShoot);
  }
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
      $('[data-route-label]').textContent = rent ? t("Find cover · nearest bush", "Esconda-se · arbusto mais próximo") : target.label;
      $('[data-route-distance]').textContent = distance < target.radius ? t("HERE", "AQUI") : `${Math.round(distance)} m`;
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
  if (it && promptEl.dataset.target !== it.id) { promptEl.dataset.target = it.id; promptEl.innerHTML = `<kbd>${TOUCH ? t("Tap", "Toque") : 'E'}</kbd> ${it.label}`; }
  actionBtn.disabled = !it;
  actionBtn.textContent = it ? it.label.split(' ').slice(0, 2).join(' ') : t("Action", "Ação");
  // rent alert
  if (rent) renderRent();
  else if (!busy && !document.hidden && world.location === 'city' && !world.vehicle && !world.flying && RENT_STAGES.includes(state.stage) && now > nextRentAt) startRent();
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
if (new URLSearchParams(location.search).has('debug')) window.__mml = { world, multiplayer, peerView, get state() { return state; }, teleport: (x, z) => world.player.pos.set(x, 0, z), dispatch };
refreshLanguageUI(); syncHUD();
titleScreen();
requestAnimationFrame(loop);
