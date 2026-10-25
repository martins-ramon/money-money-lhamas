import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot } from '../server/rooms.js';
import { POSEIDON_COSTUME } from '../src/model.js';
import { nameLabel, setLanguage } from '../src/i18n.js';

const pose = fields => ({ x: 0, y: 2, z: 12, heading: 0, costume: 'Fish Llama', character: 'anna', location: 'atlantic', vehicle: null, dancing: false, flying: false, ...fields });

test('presence accepts all ocean skins, Atlantic City and turtle cars with the existing wire format', () => {
  for (const costume of ['Fish Llama', 'Marine Llama', POSEIDON_COSTUME]) {
    for (const vehicle of [null, 'turtle']) {
      const snapshot = pose({ costume, vehicle });
      assert.deepEqual(validateSnapshot(snapshot), snapshot);
    }
  }
  const result = validateSnapshot(pose({ wallet: 1234, poseidonDefeated: true, token: 'secret' }));
  assert.equal(result.wallet, undefined);
  assert.equal(result.poseidonDefeated, undefined);
  assert.equal(result.token, undefined);
  assert.equal(result.swimming, undefined, 'swimming does not require a new protocol field');
});

test('new appearance options retain snapshot validation boundaries', () => {
  for (const fields of [{ location: 'atlantis' }, { vehicle: 'submarine' }, { costume: 'Fake Poseidon' }, { x: Infinity }, { y: -20 }, { dancing: 1 }]) {
    assert.throws(() => validateSnapshot(pose(fields)), error => error.status === 400);
  }
});

test('all ocean costume labels translate without changing their stable IDs', () => {
  try {
    setLanguage('pt');
    assert.equal(nameLabel('Fish Llama'), 'Lhama peixe');
    assert.equal(nameLabel('Marine Llama'), 'Lhama marinha');
    assert.equal(nameLabel(POSEIDON_COSTUME), 'Lhama de Poseidon');
    setLanguage('en');
    assert.equal(nameLabel(POSEIDON_COSTUME), POSEIDON_COSTUME);
  } finally { setLanguage('en'); }
});
