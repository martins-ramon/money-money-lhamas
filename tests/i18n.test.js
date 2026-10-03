import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGE_KEY, readLanguage, setLanguage, getLanguage, locale, t, nameLabel, ledgerLabel, translateError } from '../src/i18n.js';
import { JOBS, CHAPTERS, EXTRA_COSTUMES, initialState, act, loadGame, money } from '../src/model.js';

afterEach(() => setLanguage('en'));

test('language preference wins over browser detection and handles unavailable storage', () => {
  const store = { getItem(key) { assert.equal(key, LANGUAGE_KEY); return 'en'; } };
  assert.equal(readLanguage(store, 'pt-BR'), 'en');
  assert.equal(readLanguage({ getItem: () => 'pt' }, 'en-US'), 'pt');
  for (const saved of [null, 'es', '', '{broken']) {
    assert.equal(readLanguage({ getItem: () => saved }, 'pt-BR'), 'pt');
    assert.equal(readLanguage({ getItem: () => saved }, 'es-ES'), 'en');
  }
  assert.equal(readLanguage(undefined, 'PT-pt'), 'pt');
  assert.equal(readLanguage({ getItem() { throw new Error('Blocked'); } }, 'pt-BR'), 'pt');
});

test('language changes are reversible, reject unsupported values and preserve stable names', () => {
  assert.equal(setLanguage('pt'), true);
  assert.equal(locale(), 'pt-BR');
  assert.equal(t('Play', 'Jogar'), 'Jogar');
  assert.equal(nameLabel('Cyborg'), 'Ciborgue');
  assert.equal(nameLabel('Charlotte Katakuri'), 'Charlotte Katakuri');
  assert.equal(nameLabel('A friend named Pedro'), 'A friend named Pedro');
  assert.equal(setLanguage('es'), false);
  assert.equal(setLanguage('pt'), false);
  assert.equal(getLanguage(), 'pt');
  assert.equal(setLanguage('en'), true);
  assert.equal(t('Play', 'Jogar'), 'Play');
  assert.equal(nameLabel('Cyborg'), 'Cyborg');
});

test('job instructions, roles, chapters and non-brand skins have Portuguese labels', () => {
  setLanguage('pt');
  for (const job of JOBS) for (const field of ['role', 'task', 'description']) assert.notEqual(nameLabel(job[field]), job[field]);
  for (const chapter of CHAPTERS) assert.notEqual(nameLabel(chapter), chapter);
  for (const costume of EXTRA_COSTUMES.filter(c => !['Superman', 'Charlotte Katakuri'].includes(c))) assert.notEqual(nameLabel(costume), costume);
  assert.equal(nameLabel('school janitor'), 'zelador da escola');
});

test('switching language changes display only and retains the same save, rewards and currency', () => {
  const state = act(act(initialState(), { type: 'start', character: 'anna' }), { type: 'shift', job: 'school' });
  const saved = JSON.stringify(state), storage = { getItem: () => saved };
  assert.equal(money(1234), '$1,234');
  setLanguage('pt');
  assert.match(money(1234), /US\$\s?1\.234/);
  assert.equal(state.costume, 'Street dreamer');
  assert.ok(state.costumes.includes('Mop-top & cleaning cart'));
  assert.equal(ledgerLabel(state.ledger[0].label), 'Pagamento: Escola Cascos do Sol');
  assert.deepEqual(loadGame(storage), state);
  assert.equal(JSON.stringify(state), saved);
  setLanguage('en');
  assert.equal(ledgerLabel(state.ledger[0].label), 'Sunny Hooves School paycheck');
});

test('errors and saved transaction labels translate at display time', () => {
  setLanguage('pt');
  assert.equal(translateError(new Error('Your wallet is empty. Time for a shift!')), 'Sua carteira está vazia. Hora de trabalhar!');
  assert.equal(translateError('Multiplayer disconnected: This room is full (8 players maximum).'), 'Conexão online encerrada: Esta sala está cheia (máximo de 8 jogadores).');
  assert.equal(ledgerLabel('Bought 3 apple shares'), 'Compra de 3 ações de apple');
  assert.equal(ledgerLabel('Company upgrade · level 4'), 'Melhoria da empresa · nível 4');
  assert.equal(ledgerLabel('First house'), 'Primeira casa');
  setLanguage('en');
  assert.equal(translateError('Your wallet is empty. Time for a shift!'), 'Your wallet is empty. Time for a shift!');
});
