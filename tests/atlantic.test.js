import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildAtlantic, buildTurtleCar, startPoseidon, resetPoseidon, setPoseidonDefeated, hitAtlantic, updateAtlantic, getAtlanticStatus, ATLANTIC_SPAWN } from '../src/atlantic.js';
import { FINANCE_MISSIONS } from '../src/finance-missions.js';

function world() {
  const world = { scene: new THREE.Scene(), city: new THREE.Group(), location: 'atlantic', frozen: false, vehicle: null, flying: false, interactables: [], vehicles: new Map(), player: { pos: new THREE.Vector3(0, 0.5, -20), vy: 0 }, velocity: new THREE.Vector3(), wins: 0, notices: [], onNotice(message) { this.notices.push(message); }, onPoseidonDefeated() { this.wins++; } };
  world.scene.add(world.city);
  buildAtlantic(world, { sign: () => new THREE.Group(), car: () => new THREE.Group() });
  return world;
}
const shotAt = (enemy, damage = 18) => ({ mesh: { position: enemy.mesh.position.clone().add(new THREE.Vector3(0, enemy.height / 2, 0)) }, damage });
const step = (world, seconds) => { for (let i = 0; i < Math.ceil(seconds / 0.05); i++) updateAtlantic(world, 0.05, i * 0.05); };

// Reuse the expensive static town for assertions, with independent fixtures for combat.
test('Atlantic scene includes its residents, palace, missions, return portal and usable turtle cars', () => {
  const w = world();
  assert.equal(w.atlantic.parent, w.scene);
  assert.equal(w.atlantic.visible, false, 'stage switching chooses when the map becomes visible');
  assert.ok(w.atlantic.getObjectByName('golden-palace'));
  assert.ok(w.atlanticResidents.some(resident => resident.mesh.userData.kind === 'fishman'));
  assert.ok(w.atlanticResidents.some(resident => resident.mesh.userData.kind === 'mermaid' && resident.mesh.userData.adult));
  assert.equal(w.atlanticTriton.mesh.parent, w.atlantic);
  assert.equal(w.atlanticTriton.mesh.userData.kind, 'triton');
  assert.equal(w.interactables.find(it => it.id === 'to-beach').location, 'atlantic');
  assert.deepEqual(w.interactables.find(it => it.id === 'to-beach').position.toArray(), ATLANTIC_SPAWN);
  const missions = FINANCE_MISSIONS.filter(mission => mission.location === 'atlantic');
  assert.equal(missions.length, 12);
  assert.deepEqual(w.interactables.filter(it => it.type === 'finance').map(it => it.id), missions.map(mission => mission.id));
  for (const v of w.vehicles.values()) {
    assert.equal(v.location, 'atlantic'); assert.equal(v.type, 'turtle');
    assert.equal(v.mesh.parent, w.atlantic);
    assert.ok(v.position.equals(v.spawn));
    assert.equal(w.interactables.find(it => it.id === v.id).position, v.position, 'entry follows the vehicle after driving');
  }
  assert.equal(w.vehicles.size, 3);
  assert.equal(w.pushAnimals.length, 2);
  assert.equal(w.traffic.length, 4);
  assert.ok(w.traffic.every(vehicle => vehicle.driver.parent === vehicle.mesh));
});

test('turtle car is a complete finite mesh suitable for player and multiplayer clones', () => {
  const turtle = buildTurtleCar(), bounds = new THREE.Box3().setFromObject(turtle);
  assert.equal(turtle.userData.vehicleType, 'turtle');
  assert.ok(bounds.max.x > 2 && bounds.max.y > 1.8 && bounds.min.z < -1);
  turtle.traverse(object => { if (object.isMesh) assert.ok(object.geometry.attributes.position.array.every(Number.isFinite)); });
});

test('boss requires proximity, the underwater map, on-foot play and an unpaused encounter', () => {
  const w = world();
  w.location = 'city'; assert.equal(startPoseidon(w), false);
  w.location = 'atlantic'; w.player.pos.set(0, 0, 30); assert.equal(startPoseidon(w), false);
  w.player.pos.set(0, 0, -20); w.vehicle = {}; assert.equal(startPoseidon(w), false);
  w.vehicle = null; w.frozen = true; assert.equal(startPoseidon(w), false);
  w.frozen = false; assert.equal(startPoseidon(w), true);
  assert.equal(startPoseidon(w), false);
  assert.deepEqual(getAtlanticStatus(w), { active: true, defeated: false, playerHP: 100, maxPlayerHP: 100, bossHP: 180, maxBossHP: 180, guards: 3, telegraph: false });
});

test('guards shield Poseidon, attacks count once and victory notifies progression exactly once', () => {
  const w = world(), game = w.atlanticGame, boss = game.enemies[0];
  assert.equal(hitAtlantic(w, shotAt(boss)), false, 'idle boss cannot be damaged');
  startPoseidon(w);
  assert.equal(hitAtlantic(w, shotAt(boss)), true);
  assert.equal(game.bossHP, 180, 'defeat the guards before breaking the shield');
  for (const guard of game.guards) {
    assert.equal(hitAtlantic(w, shotAt(guard, 36)), true);
    assert.equal(guard.hp, 0); assert.equal(guard.mesh.visible, false);
  }
  assert.equal(getAtlanticStatus(w).guards, 0);
  w.frozen = true; assert.equal(hitAtlantic(w, shotAt(boss, 180)), false); assert.equal(game.bossHP, 180);
  w.frozen = false; assert.equal(hitAtlantic(w, shotAt(boss, 180)), true);
  assert.equal(game.bossHP, 0); assert.equal(game.defeated, true); assert.equal(game.active, false); assert.equal(w.wins, 1);
  hitAtlantic(w, shotAt(boss, 180)); assert.equal(w.wins, 1);
  assert.equal(startPoseidon(w), false);
});

test('fast projectiles hit along their traveled segment and do not hit at the wrong height', () => {
  const w = world(), guard = w.atlanticGame.guards[0]; startPoseidon(w);
  const end = guard.mesh.position.clone().add(new THREE.Vector3(5, 1.5, 0));
  const previous = guard.mesh.position.clone().add(new THREE.Vector3(-5, 1.5, 0));
  assert.equal(hitAtlantic(w, { mesh: { position: end }, previous, damage: 12 }), true);
  assert.equal(guard.hp, 24);
  end.y = previous.y = 15;
  assert.equal(hitAtlantic(w, { mesh: { position: end }, previous, damage: 12 }), false);
  assert.equal(guard.hp, 24);
});

test('telegraphs warn before dealing damage, permit dodging, and stop while paused', () => {
  const w = world(), game = w.atlanticGame; startPoseidon(w);
  game.guards.forEach(guard => { guard.hp = 0; guard.mesh.visible = false; });
  game.attackTimer = 0;
  updateAtlantic(w, 0.05, 0);
  assert.equal(game.telegraphs.length, 1); assert.equal(game.playerHP, 100);
  const timer = game.telegraphs[0].timer;
  w.frozen = true; step(w, 2); assert.equal(game.telegraphs[0].timer, timer); assert.equal(game.playerHP, 100);
  w.frozen = false; updateAtlantic(w, 0, 2); assert.equal(game.telegraphs[0].timer, timer);
  w.player.pos.x = 6; step(w, 1.3); assert.equal(game.playerHP, 100, 'moving away from the marked circle avoids the wave');
  game.attackTimer = 0; updateAtlantic(w, 0.05, 3); step(w, 1.3);
  assert.equal(game.playerHP, 82, 'standing inside the warned circle takes one wave of damage');
});

test('losing respawns safely and permits a full-health retry; leaving the map cancels combat', () => {
  const w = world(), game = w.atlanticGame; startPoseidon(w);
  game.guards.forEach(guard => guard.hp = 0); game.playerHP = 10; game.attackTimer = 0;
  step(w, 1.5);
  assert.equal(game.active, false); assert.equal(game.defeated, false); assert.equal(w.wins, 0);
  assert.deepEqual(w.player.pos.toArray(), ATLANTIC_SPAWN);
  assert.equal(game.playerHP, 100); assert.equal(game.bossHP, 180); assert.equal(game.telegraphs.length, 0);
  w.player.pos.set(0, 0, -20); assert.equal(startPoseidon(w), true);
  assert.equal(getAtlanticStatus(w).guards, 3);
  w.location = 'city'; updateAtlantic(w, 0.05, 2);
  assert.equal(game.active, false); assert.equal(game.telegraphs.length, 0);
  w.location = 'atlantic'; assert.equal(startPoseidon(w), true);
  w.player.pos.set(0, 0, 25); updateAtlantic(w, 0.05, 3); assert.equal(game.active, false);
});

test('saved victory hides guards, prevents replay rewards, and resets correctly for a new game', () => {
  const w = world(); setPoseidonDefeated(w, true);
  assert.equal(getAtlanticStatus(w).defeated, true); assert.equal(getAtlanticStatus(w).bossHP, 0);
  assert.ok(w.atlanticGame.guards.every(guard => !guard.mesh.visible));
  assert.equal(startPoseidon(w), false); assert.equal(w.wins, 0);
  resetPoseidon(w); assert.equal(getAtlanticStatus(w).defeated, true);
  setPoseidonDefeated(w, false);
  assert.ok(w.atlanticGame.guards.every(guard => guard.mesh.visible && guard.hp === guard.maxHP));
  assert.equal(startPoseidon(w), true);
});

test('NPC drivers run only on the current map; lion and tiger push with a cooldown and can be stunned', () => {
  const w = world(), cityCar = w.traffic.find(v => v.location === 'city'), oceanCar = w.traffic.find(v => v.location === 'atlantic');
  const cityBefore = cityCar.mesh.position.clone(), oceanBefore = oceanCar.mesh.position.clone();
  updateAtlantic(w, 0.05, 0);
  assert.ok(cityCar.mesh.position.equals(cityBefore)); assert.ok(!oceanCar.mesh.position.equals(oceanBefore));
  w.location = 'city';
  for (const animal of w.pushAnimals) {
    const before = animal.mesh.position.clone().add(new THREE.Vector3(0.5, 0, 0)); w.player.pos.copy(before);
    updateAtlantic(w, 0.01, 0); assert.ok(w.player.pos.distanceTo(before) > 2);
    const pushed = w.player.pos.clone(); updateAtlantic(w, 0.01, 0); assert.ok(w.player.pos.equals(pushed));
    assert.equal(hitAtlantic(w, { mesh: { position: animal.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)) } }), true);
    assert.ok(animal.stun > 0);
    w.player.pos.copy(animal.mesh.position); const stationary = w.player.pos.clone(); updateAtlantic(w, 0.1, 0); assert.ok(w.player.pos.equals(stationary));
  }
  assert.ok(!cityCar.mesh.position.equals(cityBefore));
});
