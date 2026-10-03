import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/world.js';
import { constrainAdventurePosition, CITY_LIMIT, SHORE_X, WATER_X } from '../src/world-expansion.js';

function adventureWorld() {
  const world = Object.create(World.prototype);
  Object.assign(world, {
    stage: 'freeplay', location: 'city', vehicle: null, frozen: false, flying: false, dancing: false,
    player: { pos: new THREE.Vector3(), vy: 0, grounded: true, heading: 0 },
    playerMesh: new THREE.Group(), vehicles: new Map(), interactables: [],
    keys: new Set(), joy: { x: 0, y: 0 }, velocity: new THREE.Vector3(),
    onNotice() {}, available: () => true,
  });
  world.playerMesh.userData.costume = 'Cyborg';
  return world;
}

function addVehicle(world, type, spawn, entry = spawn) {
  const object = new THREE.Group(); object.position.copy(spawn);
  const vehicle = { id: type, type, mesh: object, spawn: spawn.clone(), position: entry.clone(), dock: entry.clone(), heading: 0, label: type };
  world.vehicles.set(type, vehicle);
  world.interactables.push({ id: type, type: 'vehicle', position: vehicle.position, radius: 4, location: 'city' });
  return vehicle;
}

test('city walking, driving and flight remain inside their world and land boundaries', () => {
  for (const type of [null, 'car']) {
    const pos = new THREE.Vector3(88, 0, 42);
    constrainAdventurePosition(pos, { vehicle: type ? { type } : null });
    assert.ok(pos.x <= SHORE_X);
    assert.ok(Math.hypot(pos.x, pos.z) <= CITY_LIMIT);
  }
  const flying = new THREE.Vector3(84, 16, 0);
  constrainAdventurePosition(flying, { airborne: true });
  assert.equal(flying.x, 84, 'flight can cross the sea');
  const moon = new THREE.Vector3(120, 0, -160);
  constrainAdventurePosition(moon, { location: 'moon' });
  assert.ok(Math.abs(moon.length() - 40) < 1e-9);
});

test('boats cannot cross the coastline even at the corners of the circular map', () => {
  for (const type of ['boat', 'yacht']) for (const [x, z] of [[0, 0], [20, 160], [220, -300], [100, 0]]) {
    const pos = new THREE.Vector3(x, 0, z);
    constrainAdventurePosition(pos, { vehicle: { type } });
    assert.ok(pos.x >= WATER_X + 2);
    assert.ok(Math.hypot(pos.x, pos.z) <= CITY_LIMIT - 4 + 1e-9);
  }
});

test('boat boarding requires proximity and disembarking returns rider and boat to the dock', () => {
  const world = adventureWorld();
  const boat = addVehicle(world, 'boat', new THREE.Vector3(73, 0, 16), new THREE.Vector3(63, 0, 16));
  assert.equal(world.useVehicle('boat'), false);
  world.player.pos.copy(boat.position);
  assert.equal(world.useVehicle('boat'), true);
  assert.equal(world.nearby().id, 'exit-vehicle');
  world.player.pos.set(86, 0, 18); boat.mesh.position.copy(world.player.pos);
  assert.equal(world.exitVehicle(), true);
  assert.equal(world.vehicle, null);
  assert.deepEqual(boat.mesh.position.toArray(), [73, 0, 16]);
  assert.deepEqual(world.player.pos.toArray(), [62, 0, 16]);
  assert.equal(world.player.grounded, true);
});

test('gliders launch from a station and reset the station after leaving in midair', () => {
  const world = adventureWorld();
  const glider = addVehicle(world, 'glider', new THREE.Vector3(-47, 0, 39));
  world.player.pos.copy(glider.position);
  assert.equal(world.useVehicle('glider'), true);
  assert.equal(world.player.pos.y, 19);
  assert.equal(world.player.grounded, false);
  world.player.pos.set(-20, 10, 39); glider.mesh.position.copy(world.player.pos);
  world.exitVehicle();
  assert.deepEqual(glider.mesh.position.toArray(), [-47, 0, 39]);
  assert.deepEqual(world.player.pos.toArray(), [-20, 10, 39]);
  assert.equal(world.player.grounded, false);
});

test('flight, dancing and driving have mutually compatible controls', () => {
  const world = adventureWorld();
  assert.equal(world.toggleFlight(), true);
  assert.equal(world.flying, true);
  assert.equal(world.toggleDance(), false);
  assert.equal(world.toggleFlight(), true);
  world.player.grounded = true;
  assert.equal(world.toggleDance(), true);
  const car = addVehicle(world, 'car', new THREE.Vector3());
  assert.equal(world.useVehicle('car'), true);
  assert.equal(world.dancing, false);
  assert.equal(world.toggleFlight(), false);
  assert.equal(world.vehicle, car);
  world.exitVehicle(); world.playerMesh.userData.costume = 'Human';
  assert.equal(world.toggleFlight(), false);
  assert.equal(world.getAdventureStatus().canShoot, false);
});

test('Moon travel portals follow location independently of story stage', () => {
  const world = adventureWorld();
  const moonPortal = { id: 'to-city', type: 'travel', location: 'moon', position: new THREE.Vector3(), radius: 3 };
  const cityPortal = { id: 'to-moon', type: 'travel', location: 'city', position: new THREE.Vector3(), radius: 3 };
  world.interactables.push(moonPortal, cityPortal);
  assert.equal(world.nearby(), cityPortal);
  world.location = 'moon';
  assert.equal(world.stage, 'freeplay');
  assert.equal(world.nearby(), moonPortal);
});
