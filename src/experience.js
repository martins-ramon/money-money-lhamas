import { JOBS, completed, liquid, wealth } from './model.js';

export const SETTINGS_KEY = 'money-money-lhamas-settings-v1';

export function readSettings(storage, { touch = false, reducedMotion = false } = {}) {
  const defaults = { reducedMotion, quality: touch ? 'balanced' : 'high', showMap: true };
  try {
    const saved = JSON.parse(storage?.getItem(SETTINGS_KEY) || '{}');
    for (const key of ['reducedMotion', 'showMap']) if (typeof saved[key] === 'boolean') defaults[key] = saved[key];
    if (['high', 'balanced'].includes(saved.quality)) defaults.quality = saved.quality;
  } catch { /* Preferences are optional, including in private browsing. */ }
  return defaults;
}

// Horizontal camera basis: W/up is away from the camera; D/right stays screen-right.
export function movementInput(keys, joy, yaw) {
  let x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + joy.x;
  let z = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + joy.y;
  const length = Math.hypot(x, z);
  if (length < 0.12) return { x: 0, z: 0, amount: 0 };
  if (length > 1) { x /= length; z /= length; }
  return { x: Math.cos(yaw) * x + Math.sin(yaw) * z, z: -Math.sin(yaw) * x + Math.cos(yaw) * z, amount: Math.min(1, length) };
}

export function missionFor(state) {
  const nextJob = advanced => JOBS.slice(advanced ? 3 : 0, advanced ? 6 : 3).find(j => !state.shifts[j.id]);
  switch (state.stage) {
    case 'beginning': {
      const job = nextJob(false);
      return { id: job?.id || 'burger', title: job ? `Your next shift: ${job.name}` : 'Build your first $1,000', detail: job ? job.description : 'Repeat a shift. Save your paycheck.', progress: completed(state) / 3, count: `${completed(state)}/3 jobs · ${Math.min(1000, Math.floor(liquid(state)))}/1,000 saved` };
    }
    case 'purchase': return { id: 'home', title: 'Your first big purchase', detail: 'A little place. A huge milestone.', progress: 1, count: '$1,000 goal reached' };
    case 'careers': return { id: nextJob(true)?.id, title: 'Bigger jobs. Bigger dreams.', detail: 'Complete the three advanced careers.', progress: completed(state, true) / 3, count: `${completed(state, true)}/3 careers` };
    case 'timeskip': return { title: 'Your next chapter awaits', detail: 'Two years of little steps…', progress: 1, count: 'Careers complete' };
    case 'robbery': return { id: 'mansion', title: 'Welcome to the rich life', detail: 'Head home. Your mansion needs you.', progress: 0, count: 'Protect your fortune' };
    case 'business': return { id: 'hq', title: 'Next stop: one billion', detail: 'Upgrade Llama Labs. Put your money to work.', progress: Math.min(1, wealth(state) / 1e9), count: `${(wealth(state) / 1e9 * 100).toFixed(1)}% of $1B` };
    case 'moon': return { id: 'moonhouse', title: 'One giant leap for llamas', detail: 'Meet Elo Musk at your Moon house.', progress: 1, count: 'Billionaire unlocked' };
    case 'freeplay': return { id: ['picnic', 'explorer', 'helper'].find(id => !state.sideQuests.includes(id)) || (state.celebration ? undefined : 'bbq'), title: state.celebration ? 'The world is yours' : 'Good friends. Great adventures.', detail: state.celebration ? 'Find every lucky coin. Make a little chaos.' : 'Finish all three missions, then celebrate.', progress: state.sideQuests.length / 3, count: `${state.sideQuests.length}/3 missions · ${state.collectibles.length}/12 coins` };
    default: return { title: 'Explore the town', detail: 'Little hooves. Big dreams.', progress: 0, count: '' };
  }
}

// Every pending wait/listener belongs to one activity and is released on quit.
export function activity() {
  const controller = new AbortController();
  const { signal } = controller;
  return {
    signal,
    cancel: () => controller.abort(),
    wait(ms) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new DOMException('Activity cancelled', 'AbortError'));
        const abort = () => { clearTimeout(timer); reject(new DOMException('Activity cancelled', 'AbortError')); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
        signal.addEventListener('abort', abort, { once: true });
      });
    },
    until(register) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new DOMException('Activity cancelled', 'AbortError'));
        const abort = () => reject(new DOMException('Activity cancelled', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
        register(() => { signal.removeEventListener('abort', abort); resolve(); });
      });
    },
  };
}
