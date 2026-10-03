import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PLACES } from '../src/world.js';
import { buildCityExpansion } from '../src/world-expansion.js';

function expandedRoads() {
  const world = { city: new THREE.Group(), moon: new THREE.Group(), obstacles: [], interactables: [], npcs: [] };
  buildCityExpansion(world, {
    mat: (color, options) => new THREE.MeshToonMaterial({ color, ...options }),
    mesh: (geometry, material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); return mesh;
    },
    building: () => new THREE.Group(), car: () => new THREE.Group(),
    tree: () => new THREE.Group(), sign: () => new THREE.Group(),
  });
  world.city.updateMatrixWorld(true);
  return world.city.children.filter(object => object.isMesh && object.material.color.getHex() === 0x7d7f8c);
}

test('city expansion leaves the home lot and original plaza free of overlapping asphalt', () => {
  const roads = expandedRoads();
  const [homeX, homeZ] = PLACES.home.position;
  const protectedAreas = [
    new THREE.Box3(new THREE.Vector3(homeX - 6, -1, homeZ - 6), new THREE.Vector3(homeX + 6, 1, homeZ + 6)),
    new THREE.Box3(new THREE.Vector3(-7, -1, -7), new THREE.Vector3(7, 1, 7)),
  ];
  for (const area of protectedAreas) for (const road of roads) {
    assert.equal(new THREE.Box3().setFromObject(road).intersectsBox(area), false,
      'Expanded roads must not overlay the original home lot or plaza');
  }
});

test('central avenue extensions meet the old town without gaps or raised road surfaces', () => {
  const roads = expandedRoads();
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  for (const [x, z] of [[-64.9, 0], [-35.001, 0], [35.001, 0], [56.9, 0], [0, -75.9], [0, -35.001], [0, 35.001], [0, 75.9]]) {
    ray.ray.origin.set(x, 1, z);
    const [surface] = ray.intersectObjects(roads);
    assert.ok(surface, `Missing road at (${x}, ${z})`);
    assert.ok(Math.abs(surface.point.y - 0.02) < 1e-6, 'Extensions align with the original road height');
  }
});
