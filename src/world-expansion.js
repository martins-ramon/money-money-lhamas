import * as THREE from 'three';
import { buildHuman } from './avatars.js';
import { FINANCE_MISSIONS } from './finance-missions.js';

export const CITY_LIMIT = 98;
export const SHORE_X = 65;
export const WATER_X = 67;

// One set of boundaries is shared by walking, driving, sailing and the map.
export function constrainAdventurePosition(position, { location = 'city', vehicle = null, airborne = false } = {}) {
  const sailing = vehicle?.type === 'boat' || vehicle?.type === 'yacht';
  const limit = location === 'moon' ? 40 : CITY_LIMIT - (sailing ? 4 : 0);
  if (location !== 'moon') {
    if (sailing) position.x = Math.max(WATER_X + 2, position.x);
    else if (!airborne) position.x = Math.min(SHORE_X, position.x);
  }
  const radius = Math.hypot(position.x, position.z);
  if (radius > limit) { position.x *= limit / radius; position.z *= limit / radius; }
  if (sailing) {
    position.x = Math.max(WATER_X + 2, position.x);
    const maxZ = Math.sqrt(Math.max(0, limit * limit - position.x * position.x));
    position.z = THREE.MathUtils.clamp(position.z, -maxZ, maxZ);
  }
  return position;
}

export function buildCityExpansion(world, { mat, mesh, building, car, tree, sign }) {
  const { city } = world;
  const addPlane = (width, depth, color, x, z, y = 0.04) => {
    const plane = mesh(new THREE.PlaneGeometry(width, depth), mat(color), x, y, z, false);
    plane.rotation.x = -Math.PI / 2; plane.receiveShadow = true; city.add(plane); return plane;
  };
  // Keep the original town at the centre so saved games and story routes still work.
  const asphalt = 0x7d7f8c;
  for (const z of [-60, -38, 38, 60]) addPlane(128, 5, asphalt, -4, z);
  for (const x of [-60, -40, 40, 60]) addPlane(5, 144, asphalt, x, 0);
  addPlane(122, 6, asphalt, -4, 0);
  addPlane(6, 152, asphalt, 0, 0);
  const colors = [0xffb37a, 0xc8b4f2, 0xffd94d, 0x8fd4ff, 0xf7f2e4];
  let block = 0;
  for (const z of [-72, -49, 49, 72]) for (const x of [-72, -50, -27, -12, 12, 27, 50]) {
    if (Math.hypot(x, z) > 86 || (z === 49 && x === -50)) continue;
    const height = 4 + (block % 4) * 1.8;
    const group = building(7, height, 6, colors[block % colors.length], colors[(block + 2) % colors.length]);
    group.position.set(x, 0, z); if (z < 0) group.rotation.y = 0; else group.rotation.y = Math.PI;
    city.add(group); world.obstacles.push({ x, z, r: 4.7, height: height * 1.5 }); block++;
  }
  for (const [x, z] of [[-72, -15], [-72, 10], [-50, 17], [-50, -18], [48, -13], [48, 14]]) {
    const group = building(6, 5, 7, colors[block++ % colors.length]); group.position.set(x, 0, z); city.add(group);
    world.obstacles.push({ x, z, r: 4.6, height: 8 });
  }
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2, x = Math.cos(a) * 88, z = Math.sin(a) * 88;
    if (x > 54) continue;
    const t = tree(1 + (i % 3) * 0.15); t.position.set(x, 0, z); city.add(t);
    world.obstacles.push({ x, z, r: 0.7, height: 4 });
  }
  addPlane(17, 26, 0xbadd91, -50, 43, 0.06);
  const parkSign = sign('IDEAS PARK', '#9dd39a'); parkSign.position.set(-49, 3, 35); parkSign.scale.setScalar(0.9); city.add(parkSign);

  // A wide coast with shallow sand, a promenade and a marina.
  addPlane(13, 150, 0xf5da92, 61.5, 0, 0.055);
  addPlane(4, 148, 0xdac4a2, 56, 0, 0.065);
  world.ocean = addPlane(150, 230, 0x3bb8db, 142, 0, 0.07);
  world.ocean.material.transparent = true; world.ocean.material.opacity = 0.96;
  for (const z of [-12, 16]) {
    addPlane(18, 3.8, 0xb58a5a, 67, z, 0.32);
    for (const x of [60, 64, 68, 72, 76]) {
      const post = mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.3, 6), mat(0x876240), x, 0.7, z + 2.1); city.add(post);
    }
  }
  const marinaSign = sign('BEACH · MARINA', '#8fd4ff'); marinaSign.position.set(56, 3.6, 3); city.add(marinaSign);
  for (const z of [-50, -32, 34, 51]) {
    const umbrella = new THREE.Group(); umbrella.position.set(62, 0, z);
    umbrella.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.8, 6), mat(0xf7f2e4), 0, 1.4, 0));
    umbrella.add(mesh(new THREE.ConeGeometry(2.1, 0.7, 10), mat(colors[Math.abs(z) % colors.length]), 0, 3, 0));
    umbrella.add(mesh(new THREE.BoxGeometry(1.5, 0.08, 2.8), mat(0xff6b6b), -1.5, 0.14, 1.2)); city.add(umbrella);
  }
  world.waveLines = [];
  for (let i = 0; i < 14; i++) {
    const wave = addPlane(0.13, 7, 0xd2f6f7, 68 + (i % 4) * 6, -58 + i * 9, 0.09);
    world.waveLines.push(wave);
  }

  const boat = (yacht = false) => {
    const group = new THREE.Group(), length = yacht ? 8 : 4.6, width = yacht ? 3.3 : 2.2;
    const hull = mesh(new THREE.BoxGeometry(length, 0.8, width), mat(yacht ? 0xfffaf0 : 0xff6b6b), 0, 0.7, 0); group.add(hull);
    const bow = mesh(new THREE.ConeGeometry(width * 0.62, width, 3), mat(yacht ? 0xfffaf0 : 0xff6b6b), length / 2 + 0.4, 0.7, 0); bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 2; group.add(bow);
    group.add(mesh(new THREE.BoxGeometry(length * 0.65, 0.12, width * 0.8), mat(0xb58a5a), 0, 1.16, 0));
    group.add(mesh(new THREE.BoxGeometry(yacht ? 3.6 : 1.3, yacht ? 1.6 : 0.65, width * 0.65), mat(0x8fd4ff), yacht ? -0.3 : 0.1, yacht ? 2 : 1.5, 0));
    if (yacht) {
      group.add(mesh(new THREE.BoxGeometry(4.2, 0.2, 2.8), mat(0xfffaf0), -0.3, 2.95, 0));
      group.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), mat(0x2b2a33), -1, 3.5, 0));
      group.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.04), mat(0xffd94d), -0.6, 4.4, 0));
    }
    return group;
  };
  const glider = () => {
    const group = new THREE.Group();
    const wing = mesh(new THREE.ConeGeometry(3.1, 0.4, 3), mat(0xffd94d, { side: THREE.DoubleSide }), 0, 2.8, 0); wing.rotation.y = Math.PI / 2; group.add(wing);
    const brace = mesh(new THREE.TorusGeometry(0.65, 0.06, 5, 3), mat(0x2b2a33), 0, 1.9, 0); brace.rotation.y = Math.PI / 2; group.add(brace);
    group.add(mesh(new THREE.BoxGeometry(4, 0.09, 0.09), mat(0xff6b6b), 0, 2.78, 0)); return group;
  };
  const definitions = [
    ['car-city', 'car', -7, -36, car(0xff6b6b, 'sporty'), 'Drive the red car'],
    ['car-park', 'car', -43, 0, car(0xffd94d, 'cozy'), 'Drive the yellow car'],
    ['car-beach', 'car', 43, 27, car(0x8fd4ff), 'Drive the blue car'],
    ['boat-marina', 'boat', 73, 16, boat(), 'Pilot the boat'],
    ['yacht-marina', 'yacht', 76, -12, boat(true), 'Pilot the yacht'],
    ['glider-park', 'glider', -47, 39, glider(), 'Launch the glider'],
    ['glider-hill', 'glider', 36, -41, glider(), 'Launch the glider'],
    ['glider-beach', 'glider', 58, -26, glider(), 'Launch the glider'],
  ];
  world.vehicles = new Map();
  for (const [id, type, x, z, object, label] of definitions) {
    object.position.set(x, 0, z); city.add(object);
    const spawn = object.position.clone(), sailing = type === 'boat' || type === 'yacht';
    const position = new THREE.Vector3(sailing ? 63 : x, 0, z);
    const vehicle = { id, type, mesh: object, spawn, heading: Math.PI / 2, position, label, dock: sailing ? position.clone() : null };
    world.vehicles.set(id, vehicle);
    world.interactables.push({ id, type: 'vehicle', vehicleType: type, label, position, radius: sailing ? 4.5 : 3.5, location: 'city' });
  }
  // NPCs have simple adult cartoon proportions and the same animation contract as avatars.
  for (let i = 0; i < 12; i++) {
    const beach = i >= 7, pos = new THREE.Vector3(beach ? 61 : -46 + (i % 4) * 27, 0, beach ? -45 + (i - 7) * 22 : -29 + Math.floor(i / 4) * 69);
    const human = buildHuman({ clothing: beach ? 'beach' : 'casual', female: i % 2 === 1, adult: true, skinColor: [0xf1c7a4, 0xa9714b, 0xd69b70][i % 3], shirtColor: colors[i % colors.length] });
    human.scale.setScalar(0.95); human.position.copy(pos); city.add(human);
    world.npcs.push({ mesh: human, pos, home: pos.clone(), roamRadius: beach ? 8 : 12, beach, human: true, target: pos.clone().add(new THREE.Vector3(0, 0, 5)), vy: 0, spin: 0, state: 'walk', timer: 5, speed: 0 });
  }

  const financePositions = [[-46, -28], [-48, 42], [34, -48], [46, 42], [-8, -50], [52, -14]];
  FINANCE_MISSIONS.forEach((mission, i) => {
    const [x, z] = financePositions[i];
    const marker = new THREE.Group(); marker.position.set(x, 0, z);
    marker.add(mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.45, 12), mat(0xc8b4f2), 0, 0.25, 0));
    const coin = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16), mat(0xffd94d), 0, 2.3, 0); coin.rotation.x = Math.PI / 2; marker.add(coin);
    const label = sign(mission.title, '#ffd94d'); label.position.set(0, 3.5, 0); label.scale.setScalar(0.75); marker.add(label); city.add(marker);
    world.interactables.push({ id: mission.id, type: 'finance', label: mission.title, position: new THREE.Vector3(x, 0, z), radius: 3, location: 'city', group: marker });
  });

  // Both portals remain present; the story decides when travel becomes available.
  const portal = (parent, id, location, x, z, label) => {
    const group = new THREE.Group(); group.position.set(x, 0, z);
    group.add(mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.25, 16), mat(0x2b2a33), 0, 0.13, 0));
    const ring = mesh(new THREE.TorusGeometry(1.4, 0.18, 8, 24), mat(0x8fd4ff, { emissive: 0x3bb8db, emissiveIntensity: 0.6 }), 0, 2, 0); group.add(ring);
    const labelSign = sign(label, '#8fd4ff'); labelSign.position.set(0, 4.3, 0); labelSign.scale.setScalar(0.75); group.add(labelSign); parent.add(group);
    world.interactables.push({ id, type: 'travel', location, label, position: new THREE.Vector3(x, 0, z + 2), radius: 3 });
  };
  portal(city, 'to-moon', 'city', 32, 35, 'Travel to the Moon');
  portal(world.moon, 'to-city', 'moon', 10, 3, 'Return to the city');
}
