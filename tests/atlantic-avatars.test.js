import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildAvatar, buildProjectile } from '../src/avatars.js';

function bounds(object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  assert.ok([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite));
  assert.ok(!box.isEmpty());
  return box;
}

test('ocean costumes remain four-legged llamas and support the shared movement animation', () => {
  for (const costume of ['Fish Llama', 'Marine Llama', 'Poseidon Llama']) {
    const avatar = buildAvatar(costume);
    const { body, head, legs, arms } = avatar.userData;
    assert.equal(avatar.userData.costume, costume);
    assert.equal(legs.length, 4);
    assert.ok(Array.isArray(arms));
    assert.ok(head.position.x > 0.8, 'the long llama neck and muzzle face forward');
    assert.ok(legs.every(leg => leg.parent === body));
    legs.forEach((leg, index) => { leg.rotation.z = index % 2 ? -0.5 : 0.5; });
    body.position.y = 0.1; head.rotation.z = 0.08;
    bounds(avatar);
  }
  assert.equal(buildAvatar('Street dreamer'), null, 'original costumes keep the original factory');
});

test('Poseidon carries the trident on his back with tips above his head', () => {
  const avatar = buildAvatar('Poseidon Llama');
  const trident = avatar.userData.trident;
  assert.equal(trident.name, 'poseidon-trident');
  assert.equal(trident.parent, avatar.userData.body);
  assert.ok(trident.position.x < 0);
  assert.ok(bounds(trident).max.y > bounds(avatar.userData.head).max.y);
  assert.ok(avatar.getObjectByName('poseidon-crown'));
});

test('projectile factories supply distinct renderable local effects without a browser', () => {
  const effects = ['spit', 'milk', 'tentacle', 'shark'].map(buildProjectile);
  for (const [index, effect] of effects.entries()) {
    assert.equal(effect.userData.projectileKind, ['spit', 'milk', 'tentacle', 'shark'][index]);
    assert.deepEqual(effect.position.toArray(), [0, 0, 0]);
    bounds(effect);
    let count = 0;
    effect.traverse(object => {
      if (!object.isMesh) return;
      count++;
      assert.ok(object.geometry.attributes.position.count > 0);
      assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite));
    });
    assert.ok(count > 1);
  }
  assert.ok(bounds(effects[2]).max.x > 1, 'tentacle extends forward with its curled tip');
  assert.ok(bounds(effects[3]).max.y > 0.7, 'shark has a raised dorsal fin');
  assert.notEqual(effects[0].children[0].material.color.getHex(), effects[1].children[0].material.color.getHex());
});
