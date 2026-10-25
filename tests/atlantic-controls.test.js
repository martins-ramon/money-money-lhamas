import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/world.js';
import { EXTRA_COSTUMES, JOBS, POSEIDON_COSTUME, initialState } from '../src/model.js';
import { FINANCE_MISSIONS } from '../src/finance-missions.js';
import { missionFor } from '../src/experience.js';
import { CITY_LIMIT, SHORE_X, WATER_X, constrainAdventurePosition } from '../src/world-expansion.js';

function controlsWorld(costume = 'Street dreamer') {
  const world = Object.create(World.prototype);
  Object.assign(world, {
    stage: 'beginning', location: 'city', scene: new THREE.Scene(),
    frozen: false, flying: false, swimming: false, dancing: false, vehicle: null,
    player: { pos: new THREE.Vector3(), vy: 0, grounded: true, heading: Math.PI / 2 },
    playerMesh: new THREE.Group(), vehicles: new Map(), interactables: [],
    keys: new Set(), joy: { x: 0, y: 0 }, velocity: new THREE.Vector3(),
    time: 10, lastMilkShot: -Infinity, milkShots: [],
    onNotice() {}, burst() {}, available: () => true,
  });
  world.playerMesh.userData.costume = costume;
  return world;
}

function turtle(world) {
  const mesh = new THREE.Group(); mesh.position.set(8, 0, 22);
  const vehicle = { id: 'turtle-1', type: 'turtle', location: 'atlantic', label: 'Turtle car', mesh, position: mesh.position.clone(), spawn: mesh.position.clone(), heading: 0 };
  world.vehicles.set(vehicle.id, vehicle);
  world.interactables.push({ id: vehicle.id, type: 'vehicle', location: 'atlantic', position: vehicle.position, radius: 3 });
  return vehicle;
}

test('every original and extra costume can attack, with distinct ocean projectiles', () => {
  for (const costume of ['Street dreamer', 'Fresh streetwear', 'Lunar billionaire', ...JOBS.map(job => job.costume), ...EXTRA_COSTUMES, POSEIDON_COSTUME]) {
    const world = controlsWorld(costume);
    assert.equal(world.getAdventureStatus().canAttack, true, costume);
    assert.equal(world.attack(), true, costume);
    const shot = world.milkShots[0];
    const expected = costume === 'Marine Llama' ? 'tentacle' : costume === POSEIDON_COSTUME ? 'shark' : costume === 'Cyborg' ? 'milk' : 'spit';
    assert.equal(shot.kind, expected, costume);
    assert.equal(shot.mesh.userData.projectileKind, expected);
    assert.equal(shot.location, 'city');
    assert.ok(shot.damage > 0);
    assert.ok(shot.life > 0 && shot.life <= 2, 'shots expire promptly');
    assert.ok(shot.velocity.x > 0, 'shots travel in the player-facing direction');
    assert.equal(shot.mesh.parent, world.scene);
    world.clearMilkShots();
    assert.equal(world.milkShots.length, 0);
    assert.equal(shot.mesh.parent, null);
  }
});

test('attack cooldown, pause and riding suppress shots without consuming the next attack', () => {
  const world = controlsWorld('Marine Llama');
  assert.equal(world.attack(), true);
  assert.equal(world.attack(), false);
  world.time += .2;
  assert.equal(world.attack(), false);
  world.time += .2; world.frozen = true;
  const previous = world.lastMilkShot;
  assert.equal(world.attack(), false);
  assert.equal(world.lastMilkShot, previous);
  world.frozen = false; world.vehicle = { type: 'turtle' };
  assert.equal(world.getAdventureStatus().canAttack, false);
  assert.equal(world.attack(), false);
  assert.equal(world.lastMilkShot, previous);
  world.vehicle = null;
  assert.equal(world.attack(), true);
  assert.equal(world.milkShots.length, 2);
  world.attackHeld = true; world.keys.add('KeyQ');
  world.resetInput();
  assert.equal(world.attackHeld, false, 'pause or lost focus releases touch auto-fire');
  assert.equal(world.keys.has('KeyQ'), false, 'pause or lost focus releases keyboard auto-fire');
  world.clearMilkShots();
});

test('aim assistance tracks the nearest forward guard in three dimensions and unlocks boss targeting after the guards fall', () => {
  const world = controlsWorld(); world.location = 'atlantic';
  const enemy = (x, y, z, boss = false) => {
    const mesh = new THREE.Group(); mesh.position.set(x, y, z);
    return { mesh, hp: 50, height: 2, boss };
  };
  const boss = enemy(3, 0, 0, true), near = enemy(8, 4, 2), far = enemy(16, 0, -2), behind = enemy(-2, 2, 0);
  world.atlanticGame = { active: true, guards: [near, far, behind], enemies: [boss, far, behind, near] };
  const shoot = () => {
    world.time += 1;
    assert.equal(world.attack(), true);
    const direction = world.milkShots.at(-1).velocity.clone().normalize();
    world.clearMilkShots(); return direction;
  };
  const toward = target => target.mesh.position.clone().add(new THREE.Vector3(0, target.height / 2, 0)).sub(world.player.pos.clone().add(new THREE.Vector3(0, 1.8, 0))).normalize();
  const first = shoot();
  assert.ok(first.distanceTo(toward(near)) < 1e-8, 'nearest eligible guard wins over the closer shielded boss and guard behind');
  assert.ok(first.y > 0, 'shots follow a guard swimming above the player');
  near.hp = 0;
  assert.ok(shoot().distanceTo(toward(far)) < 1e-8, 'defeated guards no longer attract shots');
  far.hp = 0;
  assert.ok(shoot().distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-8, 'a remaining guard behind does not turn a forward shot around');
  behind.hp = 0;
  assert.ok(shoot().distanceTo(toward(boss)) < 1e-8, 'the boss becomes eligible only after every guard falls');
});

test('rapid repeated attacks have a bounded scene population and clearing releases their resources', () => {
  const world = controlsWorld(POSEIDON_COSTUME);
  for (let i = 0; i < 30; i++) { world.time += 1; world.attack(); }
  assert.ok(world.milkShots.length > 0 && world.milkShots.length <= 12);
  assert.equal(world.scene.children.length, world.milkShots.length);
  let disposedGeometry = 0, disposedMaterial = 0;
  for (const shot of world.milkShots) shot.mesh.traverse(object => {
    object.geometry?.addEventListener('dispose', () => disposedGeometry++);
    object.material?.addEventListener('dispose', () => disposedMaterial++);
  });
  world.clearMilkShots();
  assert.equal(world.scene.children.length, 0);
  assert.ok(disposedGeometry > 0 && disposedMaterial > 0);
  world.time += 1;
  assert.equal(world.attack(), true, 'clearing frees the projectile capacity');
  world.clearMilkShots();
});

test('diving requires swimming at the sea gate, on foot and in the city', () => {
  const world = controlsWorld();
  const gate = { id: 'to-atlantic', position: new THREE.Vector3(79, -.5, 35), radius: 4 };
  world.interactables.push(gate);
  assert.equal(world.canDive(), false);
  world.player.pos.copy(gate.position);
  assert.equal(world.canDive(), false, 'standing or flying over the gate does not dive');
  world.swimming = true;
  assert.equal(world.canDive(), true);
  world.flying = true; assert.equal(world.canDive(), false);
  world.flying = false; world.vehicle = { type: 'boat' }; assert.equal(world.canDive(), false);
  world.vehicle = null; world.location = 'atlantic'; assert.equal(world.canDive(), false);
  world.location = 'city'; world.player.pos.x = SHORE_X;
  assert.equal(world.canDive(), false, 'the beach itself cannot trigger the underwater transition');
  world.player.pos.copy(gate.position); world.player.pos.z += gate.radius + .1;
  assert.equal(world.canDive(), false);
});

test('turtle boarding requires the correct map, proximity and no active boss', () => {
  const world = controlsWorld(), vehicle = turtle(world);
  world.player.pos.copy(vehicle.position);
  assert.equal(world.useVehicle(vehicle.id), false, 'matching coordinates in the city are not sufficient');
  world.location = 'atlantic'; world.player.pos.z += 20;
  assert.equal(world.useVehicle(vehicle.id), false);
  world.player.pos.copy(vehicle.position); world.atlanticGame = { active: true };
  assert.equal(world.useVehicle(vehicle.id), false);
  world.atlanticGame.active = false; world.swimming = true;
  assert.equal(world.useVehicle(vehicle.id), true);
  assert.equal(world.vehicle, vehicle);
  assert.equal(world.swimming, false);
  assert.equal(world.getAdventureStatus().mode, 'turtle');
  assert.equal(world.exitVehicle(), true);
  assert.equal(world.vehicle, null);
  assert.ok(world.player.pos.distanceTo(vehicle.position) < 3.5, 'disembarking leaves the turtle reachable');
  assert.equal(world.useVehicle(vehicle.id), true, 'the turtle can be boarded again');
});

test('swimmers can cross the coast while land cars stay ashore and all maps retain their bounds', () => {
  const swimmer = new THREE.Vector3(80, -.5, 0);
  constrainAdventurePosition(swimmer, { swimming: true });
  assert.equal(swimmer.x, 80);
  assert.ok(swimmer.x > WATER_X);
  for (const type of ['car', 'turtle']) {
    const driver = new THREE.Vector3(80, 0, 0);
    constrainAdventurePosition(driver, { vehicle: { type }, swimming: true });
    assert.ok(driver.x <= SHORE_X, `${type} cannot enter the surface sea`);
  }
  for (const [location, limit] of [['city', CITY_LIMIT], ['atlantic', 58]]) {
    const edge = new THREE.Vector3(200, 0, 200);
    constrainAdventurePosition(edge, { location, swimming: true });
    assert.ok(Math.hypot(edge.x, edge.z) <= limit + 1e-9);
  }
});

test('Atlantic guide leads to Poseidon, then unfinished ocean lessons, then the surface portal', () => {
  const state = { ...initialState(), location: 'atlantic' };
  const ocean = FINANCE_MISSIONS.filter(mission => mission.location === 'atlantic');
  assert.equal(missionFor(state).id, 'poseidon');
  state.poseidonDefeated = true;
  assert.equal(missionFor(state).id, ocean[0].id);
  state.financeQuests = [ocean[0].id];
  assert.equal(missionFor(state).id, ocean[1].id);
  state.financeQuests = ocean.map(mission => mission.id);
  assert.equal(missionFor(state).id, 'to-beach');
  assert.equal(missionFor(state).progress, 1);
});

test('finished city freeplay sends remaining ocean lessons through the beach dive entrance', () => {
  const state = { ...initialState(), stage: 'freeplay', celebration: true, sideQuests: ['picnic', 'explorer', 'helper'] };
  state.financeQuests = FINANCE_MISSIONS.filter(mission => mission.location === 'city').map(mission => mission.id);
  assert.equal(missionFor(state).id, 'to-atlantic');
  assert.ok(missionFor(state).progress > 0 && missionFor(state).progress < 1);
  state.location = 'moon';
  assert.equal(missionFor(state).id, 'to-city', 'Moon visitors return to the city before diving');
});
