import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PeerView } from '../src/peers.js';
import { buildAvatar } from '../src/avatars.js';

function fixture(overrides = {}, reducedMotion = false) {
  const data = { id: 'friend', x: 5, y: 0, z: 10, heading: 0, costume: 'Cyborg', location: 'city', dancing: false, flying: false, vehicle: null, ...overrides };
  const group = new THREE.Group(); group.position.set(data.x, data.y, data.z);
  const avatar = buildAvatar(data.costume), vehicle = data.vehicle ? new THREE.Group() : null;
  const record = { group, avatar, vehicle, data };
  const view = new PeerView({ location: 'city', reducedMotion }); view.peers.set(data.id, record);
  return { view, record };
}

test('remote riders remain visible above the deck or cabin of each transport', () => {
  for (const [vehicle, y] of [['car', 1.2], ['boat', 1.45], ['yacht', 3], ['glider', 0]]) {
    const { view, record } = fixture({ vehicle }); view.update(.1, 1);
    assert.equal(record.avatar.position.y, y);
    assert.equal(record.avatar.scale.x, vehicle === 'glider' ? 1 : .65);
    assert.equal(record.group.visible, true);
    view.world.location = 'moon'; view.update(.1, 2);
    assert.equal(record.group.visible, false);
  }
});

test('remote flight boots follow flight state and reduced motion suppresses dancing', () => {
  const { view, record } = fixture({ flying: true, dancing: true }, true);
  view.update(.1, 2);
  assert.ok(record.avatar.userData.thrusters.length > 0);
  assert.ok(record.avatar.userData.thrusters.every(t => t.visible));
  assert.equal(record.avatar.userData.body.rotation.x, 0);
  assert.equal(record.avatar.userData.body.position.y, 0);
  assert.ok(record.avatar.userData.legs.every(l => l.rotation.z === 0));
  record.data.flying = false; view.update(.1, 3);
  assert.ok(record.avatar.userData.thrusters.every(t => !t.visible));
});
