import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { playShift, defendMansion, playQuiz } from '../src/minigames.js';
import { JOBS } from '../src/model.js';
import { getLanguage, setLanguage } from '../src/i18n.js';

function setup(t) {
  const { document, window } = parseHTML('<html><body><main></main></body></html>');
  const previous = globalThis.document; globalThis.document = document;
  t.after(() => { globalThis.document = previous; });
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  return { root: document.querySelector('main'), document, window };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

for (const job of JOBS) {
  test(`quitting ${job.id} resolves without a paycheck or later UI replacement`, async t => {
    const { root } = setup(t);
    const result = playShift(root, job);
    root.querySelector('[data-quit]').click();
    assert.equal(await result, false);
    root.innerHTML = '<p>Back in town</p>';
    t.mock.timers.tick(10000); await flush();
    assert.equal(root.textContent, 'Back in town');
  });
}

test('school shift ends after exactly eight cleanups with no ninth spot', async t => {
  const { root } = setup(t); const result = playShift(root, JOBS.find(j => j.id === 'school'));
  for (let i = 0; i < 8; i++) {
    const spot = root.querySelector('.spot:not([disabled])'); assert.ok(spot); spot.click();
  }
  assert.equal(root.querySelectorAll('.spot:not([disabled])').length, 0);
  assert.equal(root.querySelector('[data-counter]').textContent, '8 / 8 complete');
  await flush(); t.mock.timers.tick(700); await flush();
  assert.equal(await result, true);
});

test('cinema ignores extra answers during the transition to the next ticket', async t => {
  const { root } = setup(t); const result = playShift(root, JOBS.find(j => j.id === 'cinema'));
  const ticket = root.querySelector('.ticket').textContent;
  const correct = [...root.querySelectorAll('.door')].find(b => ticket.includes(b.querySelector('small').textContent));
  correct.click();
  assert.ok([...root.querySelectorAll('.door')].every(b => b.disabled));
  t.mock.timers.tick(400); await flush();
  assert.equal(root.querySelector('[data-counter]').textContent, '1 / 6 complete');
  root.querySelector('[data-quit]').click(); assert.equal(await result, false);
});

test('mansion defense pauses its clock and stays paused after returning to the tab', async t => {
  const { root, document, window } = setup(t);
  const oldRaf = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  t.after(() => { globalThis.requestAnimationFrame = oldRaf; globalThis.cancelAnimationFrame = oldCancel; });
  const result = defendMansion(root, 4);
  root.querySelector('[data-pause]').click(); t.mock.timers.tick(2000);
  assert.equal(root.querySelector('[data-clock]').textContent, '0:04');
  root.querySelector('[data-pause]').click(); t.mock.timers.tick(1000);
  assert.equal(root.querySelector('[data-clock]').textContent, '0:03');
  document.hidden = true; document.dispatchEvent(new window.Event('visibilitychange'));
  document.hidden = false; document.dispatchEvent(new window.Event('visibilitychange'));
  t.mock.timers.tick(2000);
  assert.equal(root.querySelector('[data-clock]').textContent, '0:03');
  root.querySelector('[data-pause]').click(); t.mock.timers.tick(3000);
  assert.deepEqual(await result, { stolen: 0, hits: 0, bestStreak: 0 });
});

test('a Portuguese school shift has translated instructions, progress and quit control', async t => {
  const { root } = setup(t);
  const previous = getLanguage(); t.after(() => setLanguage(previous));
  setLanguage('pt');
  const result = playShift(root, JOBS.find(j => j.id === 'school'));
  assert.match(root.textContent, /Zelador da escola/);
  assert.match(root.querySelector('[data-hint]').textContent, /Pegadas de lama/);
  root.querySelector('.spot:not([disabled])').click();
  assert.equal(root.querySelector('[data-counter]').textContent, '1 / 8 concluídos');
  assert.equal(root.querySelector('[data-quit]').getAttribute('aria-label'), 'Sair do trabalho');
  root.querySelector('[data-quit]').click();
  assert.equal(await result, false);
});

test('all generated financial quiz questions preserve numeric answers in both languages', async t => {
  const { root } = setup(t);
  const previous = getLanguage(); t.after(() => setLanguage(previous));
  t.mock.method(Math, 'random', () => 0.5);
  const options = [];
  for (const language of ['en', 'pt']) {
    setLanguage(language);
    const result = playQuiz(root, 10, 3);
    assert.equal(root.querySelector('h2').textContent, language === 'pt' ? 'Lição de matemática financeira' : 'Financial-math homework');
    for (let index = 0; index < 10; index++) {
      assert.match(root.querySelector('.ticket').textContent, language === 'pt' ? new RegExp(`^Pergunta ${index + 1} de 10:`) : new RegExp(`^Question ${index + 1} of 10:`));
      const buttons = [...root.querySelectorAll('[data-v]')];
      const values = buttons.map(button => Number(button.dataset.v));
      if (language === 'en') options.push(values);
      else assert.deepEqual(values, options[index]);
      // A fixed random source keeps each generator's correct answer first.
      buttons[0].click();
      assert.match(root.querySelector('[data-explain]').textContent, language === 'pt' ? /✅ Correto!/ : /✅ Correct!/);
      root.querySelector('[data-body] > button').click();
    }
    assert.equal(root.querySelector('h3').textContent, language === 'pt' ? 'Lição concluída!' : 'Homework done!');
    root.querySelector('[data-finish]').click();
    assert.deepEqual(await result, { passed: true, correct: 10, total: 10, needed: 3, quit: false });
  }
});
