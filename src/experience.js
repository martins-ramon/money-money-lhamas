import { JOBS, completed, liquid, wealth } from './model.js';
import { financeMissions } from './finance-missions.js';
import { t, nameLabel, locale } from './i18n.js';

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
      return { id: job?.id || 'burger', title: job ? t(`Your next shift: ${job.name}`, `Seu próximo trabalho: ${nameLabel(job.name)}`) : t('Build your first $1,000', 'Junte seus primeiros $1.000'), detail: job ? nameLabel(job.description) : t('Repeat a shift. Save your paycheck.', 'Trabalhe mais um turno. Guarde seu salário.'), progress: completed(state) / 3, count: t(`${completed(state)}/3 jobs · ${Math.min(1000, Math.floor(liquid(state)))}/1,000 saved`, `${completed(state)}/3 trabalhos · ${Math.min(1000, Math.floor(liquid(state))).toLocaleString(locale())}/1.000 guardados`) };
    }
    case 'purchase': return { id: 'home', title: t('Your first big purchase', 'Sua primeira grande compra'), detail: t('A little place. A huge milestone.', 'Uma casinha. Uma enorme conquista.'), progress: 1, count: t('$1,000 goal reached', 'Meta de $1.000 alcançada') };
    case 'careers': return { id: nextJob(true)?.id, title: t('Bigger jobs. Bigger dreams.', 'Grandes trabalhos. Grandes sonhos.'), detail: t('Complete the three advanced careers.', 'Complete as três carreiras avançadas.'), progress: completed(state, true) / 3, count: t(`${completed(state, true)}/3 careers`, `${completed(state, true)}/3 carreiras`) };
    case 'timeskip': return { title: t('Your next chapter awaits', 'Seu próximo capítulo espera por você'), detail: t('Two years of little steps…', 'Dois anos de pequenos passos…'), progress: 1, count: t('Careers complete', 'Carreiras concluídas') };
    case 'robbery': return { id: 'mansion', title: t('Welcome to the rich life', 'Boas-vindas à vida de riqueza'), detail: t('Head home. Your mansion needs you.', 'Volte para casa. Sua mansão precisa de você.'), progress: 0, count: t('Protect your fortune', 'Proteja sua fortuna') };
    case 'business': return { id: 'hq', title: t('Next stop: one billion', 'Próxima parada: um bilhão'), detail: t('Upgrade Llama Labs. Put your money to work.', 'Melhore a Llama Labs. Coloque seu dinheiro para trabalhar.'), progress: Math.min(1, wealth(state) / 1e9), count: t(`${(wealth(state) / 1e9 * 100).toFixed(1)}% of $1B`, `${(wealth(state) / 1e9 * 100).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% de $1 bilhão`) };
    case 'moon': return { id: 'moonhouse', title: t('One giant leap for llamas', 'Um salto gigante para as lhamas'), detail: t('Meet Elo Musk at your Moon house.', 'Encontre Elo Musk na sua casa na Lua.'), progress: 1, count: t('Billionaire unlocked', 'Bilionário desbloqueado') };
    case 'freeplay': {
      if (state.location === 'moon') return { id: 'to-city', title: t('Your home among the stars', 'Sua casa entre as estrelas'), detail: t('Explore the Moon, then take the portal back to the city.', 'Explore a Lua e use o portal para voltar à cidade.'), progress: 1, count: t('Return whenever you like', 'Volte quando quiser') };
      if (state.celebration) {
        const missions = financeMissions();
        const next = missions.find(m => !state.financeQuests?.includes(m.id));
        if (next) return { id: next.id, title: next.title, detail: next.description, progress: (state.financeQuests?.length || 0) / missions.length, count: t(`${state.financeQuests?.length || 0}/${missions.length} money missions`, `${state.financeQuests?.length || 0}/${missions.length} missões de finanças`) };
      }
      return { id: ['picnic', 'explorer', 'helper'].find(id => !state.sideQuests.includes(id)) || (state.celebration ? undefined : 'bbq'), title: state.celebration ? t('The world is yours', 'O mundo é seu') : t('Good friends. Great adventures.', 'Bons amigos. Grandes aventuras.'), detail: state.celebration ? t('Sail, fly, dance with friends, or visit the Moon again.', 'Navegue, voe, dance com amigos ou visite a Lua de novo.') : t('Finish all three missions, then celebrate.', 'Complete as três missões e depois comemore.'), progress: state.sideQuests.length / 3, count: t(`${state.sideQuests.length}/3 missions · ${state.collectibles.length}/12 coins`, `${state.sideQuests.length}/3 missões · ${state.collectibles.length}/12 moedas`) };
    }
    default: return { title: t('Explore the town', 'Explore a cidade'), detail: t('Little hooves. Big dreams.', 'Pequenos cascos. Grandes sonhos.'), progress: 0, count: '' };
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
