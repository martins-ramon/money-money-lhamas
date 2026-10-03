import test from 'node:test';
import assert from 'node:assert/strict';
import { FINANCE_MISSIONS, financeMissions } from '../src/finance-missions.js';
import { act, initialState, loadGame } from '../src/model.js';
import { getLanguage, setLanguage, translateError } from '../src/i18n.js';

const started = () => act(initialState(), { type: 'start', character: 'anna' });
const solve = mission => ({ type: 'financeQuest', id: mission.id, answers: mission.questions.map(q => q.answer) });

test('finance missions have unique IDs, positive rewards and complete multiple-choice questions', () => {
  assert.equal(FINANCE_MISSIONS.length, 6);
  assert.equal(new Set(FINANCE_MISSIONS.map(m => m.id)).size, FINANCE_MISSIONS.length);
  for (const mission of FINANCE_MISSIONS) {
    assert.ok(mission.title && mission.description && mission.reward > 0);
    assert.ok(mission.questions.length >= 2);
    for (const question of mission.questions) {
      assert.ok(question.prompt && question.explanation);
      assert.ok(question.choices.length >= 2);
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.choices.length);
    }
  }
});

test('each finance mission is available from the start and pays exactly once', () => {
  let state = started();
  let rewards = 0;
  for (const mission of FINANCE_MISSIONS) {
    const before = structuredClone(state);
    const next = act(state, solve(mission));
    assert.deepEqual(state, before, 'completing a mission does not mutate previous state');
    rewards += mission.reward;
    assert.equal(next.wallet, rewards);
    assert.equal(next.earned, rewards);
    assert.ok(next.financeQuests.includes(mission.id));
    assert.equal(next.stage, 'beginning', 'finance quizzes do not bypass the starter jobs');
    assert.deepEqual(next.sideQuests, [], 'finance missions do not satisfy free-world adventure requirements');
    assert.throws(() => act(next, solve(mission)), /not available/);
    state = next;
  }
  assert.deepEqual(loadGame({ getItem: () => JSON.stringify(state) }), state);
});

test('wrong answers explain the mistake and leave money and progress untouched', () => {
  const state = started(), original = structuredClone(state);
  for (const mission of FINANCE_MISSIONS) {
    const action = solve(mission);
    action.answers[1] = (action.answers[1] + 1) % mission.questions[1].choices.length;
    assert.throws(() => act(state, action), error => error.message.includes(mission.questions[1].explanation));
  }
  assert.deepEqual(state, original);
});

test('finance rewards cannot be claimed without complete valid answers or before starting', () => {
  const mission = FINANCE_MISSIONS[0];
  assert.throws(() => act(initialState(), solve(mission)), /not available/);
  assert.throws(() => act(started(), { type: 'financeQuest', id: 'unknown', answers: [] }), /not available/);
  for (const answers of [undefined, [], [mission.questions[0].answer], [1, 0, 0], ['1', '0'], [-1, 0], [1, 99], [NaN, 0]]) {
    assert.throws(() => act(started(), { type: 'financeQuest', id: mission.id, answers }), /Answer every question/);
  }
});

test('Portuguese finance missions preserve answers, progression and rewards', t => {
  const previous = getLanguage(); t.after(() => setLanguage(previous));
  setLanguage('pt');
  const localized = financeMissions();
  assert.equal(localized.length, FINANCE_MISSIONS.length);
  for (const [index, mission] of localized.entries()) {
    const original = FINANCE_MISSIONS[index];
    assert.equal(mission.id, original.id);
    assert.equal(mission.reward, original.reward);
    assert.notEqual(mission.title, original.title);
    assert.notEqual(mission.description, original.description);
    for (const [questionIndex, question] of mission.questions.entries()) {
      const source = original.questions[questionIndex];
      assert.equal(question.answer, source.answer);
      assert.equal(question.choices.length, source.choices.length);
      assert.notEqual(question.prompt, source.prompt);
      assert.notEqual(question.explanation, source.explanation);
      assert.ok(translateError(`Question ${questionIndex + 1}: ${source.explanation} Try again!`).includes(question.explanation));
    }
    assert.deepEqual(act(started(), solve(mission)), act(started(), solve(original)));
  }
  setLanguage('en');
  assert.equal(financeMissions(), FINANCE_MISSIONS);
  assert.equal(FINANCE_MISSIONS[0].title, 'Plan your pocket money');
});
