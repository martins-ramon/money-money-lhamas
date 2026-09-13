import { icon } from './icons.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
const wait = ms => new Promise(r => setTimeout(r, ms));

function frame(root, job, total, onQuit) {
  root.innerHTML = '';
  const el = document.createElement('div'); el.className = 'overlay';
  el.innerHTML = `
    <div class="card game">
      <div class="game-head">
        <div><span class="tag">${icon(job.icon, 14)} ${job.role}</span><h2 style="margin-top:6px">${job.task}</h2></div>
        <button class="btn icon ghost" data-quit aria-label="Quit shift">${icon('close')}</button>
      </div>
      <p class="muted" data-hint></p>
      <div class="progress"><i data-bar style="width:0%"></i></div>
      <div data-body class="stack"></div>
    </div>`;
  root.appendChild(el);
  el.querySelector('[data-quit]').onclick = onQuit;
  let done = 0;
  return {
    body: el.querySelector('[data-body]'), hint: el.querySelector('[data-hint]'),
    step() { done++; el.querySelector('[data-bar]').style.width = `${Math.round((done / total) * 100)}%`; return done >= total; },
    cheer(text) { const t = document.createElement('div'); t.className = 'toast'; t.style.cssText = 'position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:2'; t.textContent = text; el.appendChild(t); setTimeout(() => t.remove(), 1500); },
  };
}

export function playShift(root, job) {
  return new Promise(resolve => {
    const quit = () => resolve(false);
    const games = { burger, school, cinema, factory, hotel, police };
    games[job.id](root, job, quit).then(() => resolve(true));
  });
}

async function burger(root, job, quit) {
  const ui = frame(root, job, 5, quit);
  const fillings = ['🥩', '🧀', '🥬', '🍅', '🥓', '🧅'];
  for (let n = 0; n < 5; n++) {
    const order = ['🍞', ...shuffle(fillings).slice(0, 2 + Math.min(n, 2)), '🍞'];
    let i = 0;
    ui.hint.textContent = `Order #${n + 1}: tap the ingredients in the same order as the recipe card.`;
    ui.body.innerHTML = `<div class="order">${order.map(o => `<span>${o}</span>`).join('')}</div><div class="ingredients">${shuffle(['🍞', ...fillings]).map(f => `<button class="ingredient" data-f="${f}">${f}</button>`).join('')}</div>`;
    await new Promise(next => {
      ui.body.querySelectorAll('.ingredient').forEach(b => (b.onclick = () => {
        if (b.dataset.f === order[i]) { ui.body.querySelectorAll('.order span')[i].classList.add('done'); i++; if (i === order.length) { ui.cheer('Perfect burger! 🍔'); next(); } }
        else { b.classList.add('wrong'); b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 250 }); }
      }));
    });
    ui.step();
  }
  await wait(600);
}

async function school(root, job, quit) {
  const ui = frame(root, job, 8, quit);
  ui.hint.textContent = 'Muddy hoofprints everywhere! Tap each spot to mop it clean.';
  ui.body.innerHTML = '<div class="game-stage" data-stage></div>';
  const stage = ui.body.querySelector('[data-stage]');
  let cleaned = 0;
  await new Promise(done => {
    const spawn = () => {
      const s = document.createElement('button'); s.className = 'spot'; s.textContent = '🐾';
      s.style.left = `${8 + Math.random() * 78}%`; s.style.top = `${8 + Math.random() * 72}%`;
      s.onclick = () => { s.textContent = '✨'; s.style.background = '#9dd39a'; s.disabled = true; setTimeout(() => s.remove(), 350); cleaned++; if (ui.step()) done(); else spawn(); };
      stage.appendChild(s);
    };
    spawn(); spawn();
  });
  ui.cheer('Sparkling clean! 🧽'); await wait(700);
}

async function cinema(root, job, quit) {
  const ui = frame(root, job, 6, quit);
  const movies = [['Llama Wars', '🌌'], ['The Hoof-father', '🎩'], ['Alpaca-lypse', '🔥'], ['Finding Llamo', '🐟'], ['Fast & Fluffy', '🏎️']];
  for (let n = 0; n < 6; n++) {
    const halls = shuffle(movies).slice(0, 3); const target = pick(halls);
    ui.hint.textContent = 'Read the ticket and send the guest to the matching hall.';
    ui.body.innerHTML = `<div class="ticket">🎟️ ADMIT ONE · ${target[0]} · Seat ${Math.floor(Math.random() * 20) + 1}${pick('ABCDEF')}</div><div class="doors">${halls.map((h, i) => `<button class="door" data-i="${i}"><span style="font-size:32px">${h[1]}</span>Hall ${i + 1}<small>${h[0]}</small></button>`).join('')}</div>`;
    await new Promise(next => {
      ui.body.querySelectorAll('.door').forEach(d => (d.onclick = () => {
        if (halls[d.dataset.i] === target) { d.classList.add('right'); ui.cheer('Enjoy the show! 🍿'); setTimeout(next, 400); }
        else { d.classList.add('wrong'); setTimeout(() => d.classList.remove('wrong'), 350); }
      }));
    });
    ui.step();
  }
  await wait(500);
}

async function factory(root, job, quit) {
  const ui = frame(root, job, 8, quit);
  for (let n = 0; n < 8; n++) {
    const dirty = Math.random() < 0.5;
    ui.hint.textContent = 'Inspect each diaper: clean ones go to the shelf, dirty ones go to the laundry.';
    ui.body.innerHTML = `<div class="diaper">${dirty ? '🩲💩' : '🩲✨'}</div><div class="row" style="justify-content:center"><button class="btn sage" data-c="clean">🧺 Clean shelf</button><button class="btn peach" data-c="dirty">🫧 Laundry</button></div>`;
    await new Promise(next => {
      ui.body.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => {
        if ((b.dataset.c === 'dirty') === dirty) { ui.cheer(dirty ? 'Phew! Sorted. 🤢' : 'Fresh and clean!'); next(); }
        else { b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 250 }); }
      }));
    });
    ui.step();
  }
  await wait(500);
}

async function hotel(root, job, quit) {
  const ui = frame(root, job, 6, quit);
  const guests = ['🦙', '🐐', '🐑', '🦒', '🐴', '🦌'];
  for (let n = 0; n < 6; n++) {
    const rooms = shuffle(Array.from({ length: 4 }, (_, i) => `${pick([1, 2, 3, 4])}0${i + 1}`)); const target = pick(rooms);
    ui.hint.textContent = 'Listen to the guest and hand over the right room key.';
    ui.body.innerHTML = `<div class="speech">${guests[n]} “Good evening! I’m in room <b>${target}</b>, may I have my key please?”</div><div class="doors" style="margin-top:14px">${rooms.map(r => `<button class="door" data-r="${r}">🔑<small>Room ${r}</small></button>`).join('')}</div>`;
    await new Promise(next => {
      ui.body.querySelectorAll('.door').forEach(d => (d.onclick = () => {
        if (d.dataset.r === target) { d.classList.add('right'); ui.cheer('Five-star service! ⭐'); setTimeout(next, 400); }
        else { d.classList.add('wrong'); setTimeout(() => d.classList.remove('wrong'), 350); }
      }));
    });
    ui.step();
  }
  await wait(500);
}

async function police(root, job, quit) {
  const ui = frame(root, job, 5, quit);
  const arrows = ['⬆️', '⬇️', '⬅️', '➡️'];
  for (let n = 0; n < 5; n++) {
    const route = Array.from({ length: 3 + Math.min(n, 2) }, () => pick(arrows));
    ui.hint.textContent = 'Memorize the patrol route, then repeat it.';
    ui.body.innerHTML = `<div class="route" data-route></div><div class="arrow-grid"><span></span><button class="btn sky" data-a="⬆️">⬆️</button><span></span><button class="btn sky" data-a="⬅️">⬅️</button><button class="btn sky" data-a="⬇️">⬇️</button><button class="btn sky" data-a="➡️">➡️</button></div>`;
    const routeEl = ui.body.querySelector('[data-route]'); const buttons = [...ui.body.querySelectorAll('[data-a]')];
    buttons.forEach(b => (b.disabled = true));
    for (const step of route) { routeEl.textContent += step; const b = buttons.find(x => x.dataset.a === step); b.classList.add('flash'); await wait(450); b.classList.remove('flash'); await wait(150); }
    await wait(400); routeEl.textContent = '❓'.repeat(route.length); buttons.forEach(b => (b.disabled = false));
    let i = 0;
    await new Promise(next => {
      buttons.forEach(b => (b.onclick = () => {
        if (b.dataset.a === route[i]) { i++; routeEl.textContent = route.slice(0, i).join('') + '❓'.repeat(route.length - i); if (i === route.length) { ui.cheer('Patrol complete! 🚔'); next(); } }
        else { i = 0; routeEl.textContent = '❓'.repeat(route.length); b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 250 }); }
      }));
    });
    ui.step();
  }
  await wait(500);
}

/** Robbery defense: 4 minutes of whacking thieves with a baseball bat. Resolves with { stolen, hits }. */
export function defendMansion(root, seconds = 240) {
  return new Promise(resolve => {
    root.innerHTML = '';
    const el = document.createElement('div'); el.className = 'overlay night';
    el.innerHTML = `
      <div class="card game">
        <div class="game-head">
          <div><span class="tag">🏏 Protect the mansion!</span><h2 style="margin-top:6px">Thieves incoming!</h2></div>
          <div class="money" style="font-size:26px" data-clock>4:00</div>
        </div>
        <p class="muted">Tap the thieves before they reach the front door. Every thief that sneaks in steals $25,000.</p>
        <div class="timer-bar"><i data-bar style="width:100%"></i></div>
        <div class="row" style="justify-content:space-between"><span>Bonks: <b data-hits>0</b></span><span>Stolen: <b data-stolen class="neg">$0</b></span></div>
        <div class="game-stage" data-stage style="background:#1c2140"><div class="mansion-door">🏰</div></div>
      </div>`;
    root.appendChild(el);
    const stage = el.querySelector('[data-stage]');
    let hits = 0, stolen = 0, left = seconds, running = true, paused = false;
    const clock = el.querySelector('[data-clock]'), bar = el.querySelector('[data-bar]');
    const onVis = () => (paused = document.hidden);
    document.addEventListener('visibilitychange', onVis);
    const tick = setInterval(() => {
      if (paused) return;
      left--; clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; bar.style.width = `${(left / seconds) * 100}%`;
      if (left <= 0) finish();
    }, 1000);
    const thieves = new Set();
    const spawn = () => {
      if (!running || paused) return;
      const t = document.createElement('div'); t.className = 'thief'; t.textContent = pick(['🥷', '🦝', '🐺']);
      const side = Math.floor(Math.random() * 4); const w = stage.clientWidth, h = stage.clientHeight;
      let x = side === 0 ? -60 : side === 1 ? w : Math.random() * w, y = side === 2 ? -80 : side === 3 ? h : Math.random() * h;
      const speed = 22 + Math.random() * 18 + (seconds - left) * 0.12;
      t.style.transform = `translate(${x}px, ${y}px)`; stage.appendChild(t);
      const rec = { t, x, y, speed, alive: true }; thieves.add(rec);
      const bonk = () => { if (!rec.alive) return; rec.alive = false; t.classList.add('hit'); t.textContent = '💫'; hits++; el.querySelector('[data-hits]').textContent = hits; setTimeout(() => { t.remove(); thieves.delete(rec); }, 350); };
      t.addEventListener('pointerdown', bonk);
    };
    let acc = 0, last = performance.now(), raf;
    const loop = now => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!paused) {
        acc += dt; const interval = Math.max(0.7, 2.2 - (seconds - left) * 0.006);
        if (acc > interval) { acc = 0; spawn(); }
        const cx = stage.clientWidth / 2 - 35, cy = stage.clientHeight / 2 - 42;
        for (const r of thieves) {
          if (!r.alive) continue;
          const dx = cx - r.x, dy = cy - r.y, d = Math.hypot(dx, dy);
          if (d < 30) { r.alive = false; stolen += 25000; el.querySelector('[data-stolen]').textContent = `$${stolen.toLocaleString('en-US')}`; r.t.textContent = '💰'; r.t.style.opacity = 0.3; setTimeout(() => { r.t.remove(); thieves.delete(r); }, 400); continue; }
          r.x += (dx / d) * r.speed * dt; r.y += (dy / d) * r.speed * dt; r.t.style.transform = `translate(${r.x}px, ${r.y}px)`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    function finish() { running = false; clearInterval(tick); cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); resolve({ stolen, hits }); }
  });
}
