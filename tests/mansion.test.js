import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMansionEstate, mansionViewDistance, World } from '../src/world.js';

test('mansion entrance and visible door face the town and remain reachable', () => {
  const { group, entrance, front, obstacles } = buildMansionEstate();
  const door = group.getObjectByName('front-door').getWorldPosition(new THREE.Vector3());
  assert.ok(front.z < -0.99);
  assert.ok(entrance.z < door.z && door.z < group.position.z);
  assert.ok(Math.abs(entrance.x - door.x) < 1e-9);
  const closestWalkable = new THREE.Vector3(0, 0, 32 - obstacles[0].r - 0.6);
  assert.ok(closestWalkable.distanceTo(entrance) < 2.5);
  const bounds = new THREE.Box3().setFromObject(group.getObjectByName('mansion-building'));
  assert.ok(bounds.max.y < 7, 'Mansion should fit the scale of the town');
});

test('mansion cannot be entered from behind the entrance', () => {
  const { entrance, front } = buildMansionEstate();
  const entry = { type: 'mansion', position: entrance, approachDirection: front, radius: 2.5 };
  const world = { stage: 'robbery', interactables: [entry], available: () => true, player: { pos: entrance.clone().addScaledVector(front, 1) } };
  assert.equal(World.prototype.nearby.call(world), entry);
  world.player.pos.copy(entrance).addScaledVector(front, -1);
  assert.equal(World.prototype.nearby.call(world), null);
});

test('mansion fits the camera on arrival and at the door in wide and portrait screens', () => {
  const { group } = buildMansionEstate();
  const bounds = new THREE.Box3().setFromObject(group.getObjectByName('mansion-building'));
  for (const aspect of [16 / 9, 1, 390 / 844]) for (const z of [18, 26.8]) {
    const camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 260);
    const distance = mansionViewDistance(aspect), pitch = 0.35;
    camera.position.set(0, 1.6 + Math.sin(pitch) * distance, z - Math.cos(pitch) * distance);
    camera.lookAt(0, 1.8, z); camera.updateMatrixWorld();
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const depth of [bounds.min.z, bounds.max.z]) {
      const projected = new THREE.Vector3(x, y, depth).project(camera);
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, `Clipped facade at aspect ${aspect}, approach ${z}`);
      assert.ok(projected.z > -1 && projected.z < 1);
    }
  }
});
