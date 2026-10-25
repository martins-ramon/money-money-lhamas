import * as THREE from 'three';
import { buildHuman } from './avatars.js';
import { FINANCE_MISSIONS } from './finance-missions.js';
import { t, registerTranslations } from './i18n.js';

export const ATLANTIC_LIMIT = 58;
export const ATLANTIC_SPAWN = [0, 0, 30];
const GOLD = 0xffcf58, AQUA = 0x5be4df, INK = 0x23365d;
const paint = (color, options = {}) => new THREE.MeshToonMaterial({ color, ...options });
const ball = (r, color) => new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), paint(color));
const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const translations = {
  'ATLANTIC CITY': 'ATLANTIC CITY',
  'THE LOST CITY': 'A CIDADE PERDIDA',
  'GOLDEN PALACE': 'CASTELO DE OURO',
  'Return to the beach': 'Voltar à praia',
  'Challenge Poseidon': 'Desafiar Poseidon',
  'Drive a turtle car': 'Dirigir carro tartaruga',
  'MR. BARRIGA · TRITON': 'SR. BARRIGA · TRITÃO',
  'CORAL MARKET': 'MERCADO DOS CORAIS',
  'PEARL SAVINGS': 'POUPANÇA DAS PÉROLAS',
  'FINANCE REEF': 'RECIFE DAS FINANÇAS',
};
registerTranslations(translations);

function part(group, geometry, color, x = 0, y = 0, z = 0, options) {
  const object = new THREE.Mesh(geometry, paint(color, options));
  object.position.set(x, y, z); object.castShadow = object.receiveShadow = true;
  group.add(object); return object;
}
function fin(group, color, x, y, z, scale = 1) {
  const object = part(group, new THREE.ConeGeometry(0.5, 0.95, 3), color, x, y, z);
  object.scale.set(0.22 * scale, scale, scale); object.rotation.z = -Math.PI / 2;
  return object;
}
function trident(group, scale = 1) {
  const object = new THREE.Group();
  part(object, new THREE.CylinderGeometry(0.07, 0.07, 2.9, 8), GOLD, 0, 1.1, 0);
  part(object, new THREE.BoxGeometry(0.85, 0.1, 0.12), GOLD, 0, 2.5, 0);
  for (const x of [-0.38, 0, 0.38]) {
    part(object, new THREE.CylinderGeometry(0.05, 0.05, x ? 0.6 : 0.9, 6), GOLD, x, 2.7, 0);
    part(object, new THREE.ConeGeometry(0.12, 0.35, 6), GOLD, x, x ? 3.15 : 3.3, 0);
  }
  object.scale.setScalar(scale); group.add(object); return object;
}
function seaResident(kind, index = 0) {
  const mermaid = kind === 'mermaid', triton = kind === 'triton', king = kind === 'poseidon';
  const resident = buildHuman({ female: mermaid, clothing: mermaid ? 'beach' : 'casual', skinColor: mermaid ? 0xe1b38d : king ? 0xa9dddd : 0x65c7c1, shirtColor: triton ? 0x954a87 : king ? GOLD : [0xff898f, 0xbd99f7, 0x6be4d8][index % 3], hairColor: king ? 0xf8f3d8 : 0x493b66 });
  resident.userData.kind = kind; resident.userData.adult = true;
  if (mermaid || triton || king) {
    resident.userData.legs.forEach(leg => leg.visible = false);
    const tail = new THREE.Group();
    const tailColor = king ? 0x259f9b : triton ? 0x746cc9 : [0x37c4ac, 0xd37fd4, 0x548ed4][index % 3];
    const tailPart = part(tail, new THREE.ConeGeometry(triton ? 0.58 : 0.35, 1.65, 12), tailColor, -0.18, 0.48, 0);
    tailPart.rotation.z = Math.PI + 0.28;
    for (const side of [-1, 1]) { const fluke = fin(tail, tailColor, -0.52, -0.2, side * 0.22); fluke.rotation.x = side * 0.65; fluke.scale.set(0.15, 0.7, 0.7); }
    resident.userData.body.add(tail); resident.userData.tail = tail;
    if (triton) {
      part(resident.userData.body, new THREE.SphereGeometry(0.6, 12, 10), 0x954a87, 0.06, 1.5, 0).scale.set(1.1, 1, 1.3);
      const mustache = part(resident.userData.head, new THREE.CapsuleGeometry(0.07, 0.27, 3, 6), INK, 0.37, -0.1, 0); mustache.rotation.x = Math.PI / 2;
    }
  } else {
    fin(resident.userData.head, 0xf4b456, -0.24, 0.28, 0, 0.65).rotation.z = 0;
    for (const side of [-1, 1]) {
      fin(resident.userData.head, 0x8ee9ce, -0.08, -0.02, side * 0.37, 0.4).rotation.x = side * 0.9;
      part(resident.userData.head, new THREE.TorusGeometry(0.09, 0.035, 5, 10), 0x347b86, 0.37, -0.1, side * 0.16).rotation.y = Math.PI / 2;
    }
  }
  if (king) {
    part(resident.userData.head, new THREE.CylinderGeometry(0.4, 0.38, 0.2, 10), GOLD, 0, 0.38, 0);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; part(resident.userData.head, new THREE.ConeGeometry(0.09, 0.3, 5), GOLD, Math.cos(a) * 0.31, 0.62, Math.sin(a) * 0.31); }
    part(resident.userData.head, new THREE.ConeGeometry(0.25, 0.65, 8), 0xfff4d5, 0.23, -0.4, 0).rotation.z = Math.PI;
    const weapon = trident(resident.userData.body); weapon.position.set(0.2, 0.1, -0.8);
  }
  return resident;
}

export function buildTurtleCar() {
  const group = new THREE.Group(); group.name = 'turtle-car';
  part(group, new THREE.SphereGeometry(1.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x4b956b, 0, 0.63, 0).scale.set(1.35, 0.75, 0.9);
  part(group, new THREE.CylinderGeometry(1.36, 1.36, 0.18, 16), 0xa9d980, 0, 0.63, 0).scale.set(1.35, 1, 0.9);
  part(group, new THREE.SphereGeometry(0.43, 12, 8), 0x9bd67a, 1.92, 0.8, 0).scale.set(1.35, 0.9, 1);
  for (const side of [-1, 1]) {
    const eye = ball(0.09, INK); eye.position.set(2.1, 1, side * 0.3); group.add(eye);
    for (const x of [-1, 1]) {
      const wheel = part(group, new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12), INK, x, 0.4, side * 1.15); wheel.rotation.x = Math.PI / 2;
      const hub = part(group, new THREE.CylinderGeometry(0.19, 0.19, 0.32, 10), GOLD, x, 0.4, side * 1.15); hub.rotation.x = Math.PI / 2;
    }
  }
  for (const x of [-0.75, 0, 0.75]) {
    const plate = part(group, new THREE.CylinderGeometry(0.45, 0.45, 0.04, 6), 0x366e56, x, 1.58 - Math.abs(x) * 0.18, 0); plate.scale.z = 0.92;
  }
  part(group, new THREE.BoxGeometry(0.8, 0.15, 0.78), 0xffe09b, -0.2, 1.72, 0);
  const wheel = part(group, new THREE.TorusGeometry(0.28, 0.045, 6, 12), INK, 0.65, 1.95, 0); wheel.rotation.y = Math.PI / 2;
  group.userData.vehicleType = 'turtle'; return group;
}

function animal(kind) {
  const group = new THREE.Group(), color = kind === 'lion' ? 0xdba45a : 0xf7a544;
  part(group, new THREE.CapsuleGeometry(0.46, 1, 4, 10), color, 0, 0.95, 0).rotation.z = Math.PI / 2;
  if (kind === 'lion') part(group, new THREE.SphereGeometry(0.69, 12, 10), 0x94562c, 0.8, 1.25, 0).scale.x = 0.55;
  part(group, new THREE.SphereGeometry(0.45, 12, 10), color, 1.03, 1.28, 0);
  part(group, new THREE.SphereGeometry(0.24, 10, 8), 0xffe4b3, 1.4, 1.1, 0).scale.set(0.7, 0.7, 1.15);
  part(group, new THREE.SphereGeometry(0.09, 8, 6), INK, 1.55, 1.19, 0);
  for (const side of [-1, 1]) {
    part(group, new THREE.SphereGeometry(0.15, 8, 6), color, 0.98, 1.64, side * 0.3);
    part(group, new THREE.SphereGeometry(0.065, 8, 6), INK, 1.3, 1.4, side * 0.27);
    for (const x of [-0.65, 0.65]) part(group, new THREE.CapsuleGeometry(0.13, 0.52, 3, 6), color, x, 0.4, side * 0.32);
    if (kind === 'tiger') for (let i = 0; i < 4; i++) { const stripe = part(group, new THREE.BoxGeometry(0.09, 0.61, 0.03), INK, -0.7 + i * 0.42, 1, side * 0.45); stripe.rotation.z = -0.22; }
  }
  part(group, new THREE.CapsuleGeometry(0.08, 0.8, 3, 6), color, -1.25, 0.97, 0).rotation.z = -0.9;
  group.userData.kind = kind; return group;
}

export function buildAtlantic(world, { sign, car }) {
  const city = new THREE.Group(); city.name = 'atlantic-city'; city.visible = false;
  world.atlantic = city; world.scene.add(city); world.atlanticObstacles = [];
  const add = (object, x, y, z) => { object.position.set(x, y, z); city.add(object); return object; };
  const label = (text, x, y, z, scale = 1, bg = '#5be4df') => { const object = sign(text, bg); object.position.set(x, y, z); object.scale.setScalar(scale); city.add(object); return object; };
  const floor = part(city, new THREE.CircleGeometry(64, 64), 0x88c5bc); floor.rotation.x = -Math.PI / 2;
  const plaza = part(city, new THREE.CircleGeometry(17, 40), 0xb5dbce, 0, 0.03, -20); plaza.rotation.x = -Math.PI / 2;
  for (const x of [-25, 0, 25]) { const road = part(city, new THREE.PlaneGeometry(5, 85), 0x397e91, x, 0.045, -1); road.rotation.x = -Math.PI / 2; }
  for (const z of [-7, 18]) { const road = part(city, new THREE.PlaneGeometry(90, 5), 0x397e91, 0, 0.05, z); road.rotation.x = -Math.PI / 2; }
  // A grand open-front palace: its courtyard remains accessible to combat.
  const palace = new THREE.Group(); palace.name = 'golden-palace'; palace.position.set(0, 0, -39); city.add(palace);
  part(palace, new THREE.BoxGeometry(24, 0.7, 13), GOLD, 0, 0.35, 0);
  part(palace, new THREE.BoxGeometry(23, 9, 1.2), 0xe5af3f, 0, 5, -5.5);
  for (const x of [-10, -6, 6, 10]) {
    part(palace, new THREE.CylinderGeometry(0.65, 0.8, 9, 12), 0xffe29b, x, 5, 3.4);
    for (const y of [0.9, 9.4]) part(palace, new THREE.BoxGeometry(1.9, 0.5, 1.9), GOLD, x, y, 3.4);
  }
  part(palace, new THREE.BoxGeometry(24, 0.8, 12), GOLD, 0, 9.8, 0);
  for (const x of [-11, 11]) {
    part(palace, new THREE.CylinderGeometry(2.3, 2.5, 12, 12), 0xe8b748, x, 6.5, -2);
    part(palace, new THREE.ConeGeometry(3, 4, 12), 0xffe3a0, x, 14.5, -2);
  }
  const crest = trident(palace, 2); crest.position.set(0, 10, 0); crest.rotation.z = 0;
  const throne = part(palace, new THREE.BoxGeometry(3.5, 4.6, 0.8), 0xc67df0, 0, 3.2, -4.4);
  throne.name = 'poseidon-throne';
  label('GOLDEN PALACE', 0, 10.2, -31, 1.6, '#ffcf58');
  world.atlanticObstacles.push({ x: 0, z: -44.5, r: 7, height: 10 }, { x: -11, z: -41, r: 2.7, height: 16 }, { x: 11, z: -41, r: 2.7, height: 16 });
  label('ATLANTIC CITY', 0, 7.5, 23, 2.2);
  label('THE LOST CITY', 0, 5.6, 23, 1.2);
  const arch = new THREE.Group();
  for (const x of [-4, 4]) part(arch, new THREE.CylinderGeometry(0.5, 0.6, 5.5, 10), 0xcde9d7, x, 2.8, 0);
  part(arch, new THREE.BoxGeometry(9, 0.7, 1), GOLD, 0, 5.5, 0); add(arch, 0, 0, 30);
  label('Return to the beach', 0, 4.3, 31, 1);
  world.interactables.push({ id: 'to-beach', type: 'travel', location: 'atlantic', label: 'Return to the beach', position: new THREE.Vector3(...ATLANTIC_SPAWN), radius: 5 });
  world.interactables.push({ id: 'poseidon', type: 'boss', location: 'atlantic', label: 'Challenge Poseidon', position: new THREE.Vector3(0, 0, -20), radius: 7 });
  const colors = [0x71b5b6, 0x9ea0cd, 0xb1d5bb, 0x599fae];
  for (const [i, [x, z]] of [[-38, -23], [35, -25], [-37, 5], [37, 8], [-16, 38], [19, 38]].entries()) {
    const block = new THREE.Group(), height = 5 + i % 3;
    part(block, new THREE.CylinderGeometry(3.6, 4, height, 8), colors[i % 4], 0, height / 2, 0);
    part(block, new THREE.SphereGeometry(3.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x97d7d3, 0, height, 0).scale.y = 0.6;
    for (const side of [-1, 1]) part(block, new THREE.TorusGeometry(0.7, 0.13, 6, 12), GOLD, side * 1.8, 2.8, 3.3);
    add(block, x, 0, z); world.atlanticObstacles.push({ x, z, r: 4.2, height: height + 3 });
    if (i < 3) label(['CORAL MARKET', 'PEARL SAVINGS', 'FINANCE REEF'][i], x, height + 2.5, z + 1, 0.9);
  }
  for (let i = 0; i < 30; i++) {
    const a = i * 2.39996, radius = 43 + i % 4 * 3;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    if (z < -33 && Math.abs(x) < 17) continue;
    const coral = new THREE.Group(), color = [0xfa8ca8, 0x9c8ef5, 0xffbf81, 0x6ae1bb][i % 4];
    for (let branch = 0; branch < 3; branch++) {
      const stem = part(coral, new THREE.CapsuleGeometry(0.18, 1.4 + (i % 3) * 0.6, 3, 6), color, (branch - 1) * 0.45, 1.1, 0); stem.rotation.z = (branch - 1) * 0.4;
      part(coral, new THREE.SphereGeometry(0.33, 8, 6), color, (branch - 1) * 0.85, 1.9 + (i % 3) * 0.4, 0);
    }
    add(coral, x, 0, z);
    if (i % 4 === 0) { const column = part(city, new THREE.CylinderGeometry(0.5, 0.65, 3.5, 10), 0xa0c8bb, x - 2.5, 1.4, z); column.rotation.z = 0.15 + i * 0.01; }
  }
  const bubbles = [];
  const bubbleGeo = new THREE.SphereGeometry(0.15, 6, 4), bubblePaint = paint(0xc0ffff, { transparent: true, opacity: 0.55 });
  for (let i = 0; i < 48; i++) { const bubble = new THREE.Mesh(bubbleGeo, bubblePaint); bubble.position.set(Math.cos(i * 2.4) * (13 + i % 35), i % 17, Math.sin(i * 2.4) * (13 + i % 35)); city.add(bubble); bubbles.push(bubble); }
  world.atlanticResidents = [];
  for (let i = 0; i < 10; i++) {
    const kind = i % 3 === 0 ? 'mermaid' : 'fishman', resident = seaResident(kind, i), home = new THREE.Vector3((i % 2 ? -1 : 1) * (10 + i % 3 * 5), 0, 3 + Math.floor(i / 2) * 5);
    add(resident, home.x, 0.45, home.z); world.atlanticResidents.push({ mesh: resident, home, phase: i * 1.7, stun: 0 });
  }
  const barriga = seaResident('triton'); barriga.scale.setScalar(1.2); add(barriga, -32, 0.5, 23);
  const barrigaSign = sign('MR. BARRIGA · TRITON', '#c8b4f2'); barrigaSign.position.set(0, 3.5, 0); barrigaSign.scale.setScalar(0.65); barriga.add(barrigaSign);
  world.atlanticTriton = { mesh: barriga, home: barriga.position.clone(), cooldown: 0, notice: 0, stun: 0 };
  for (const [index, [x, z]] of [[-9, 27], [28, 15], [-28, -5]].entries()) {
    const object = add(buildTurtleCar(), x, 0, z), position = object.position.clone(), id = `turtle-${index + 1}`, label = 'Drive a turtle car';
    world.vehicles.set(id, { id, type: 'turtle', location: 'atlantic', mesh: object, spawn: position.clone(), position, heading: Math.PI / 2, label });
    world.interactables.push({ id, type: 'vehicle', vehicleType: 'turtle', location: 'atlantic', label, position, radius: 4 });
  }
  const missionPositions = [[-17, 26], [17, 26], [-30, 30], [30, 30], [-43, 16], [43, 20], [-18, 6], [18, 6], [-32, -11], [32, -10], [-22, -28], [23, -27]];
  FINANCE_MISSIONS.filter(mission => mission.location === 'atlantic').forEach((mission, index) => {
    const [x, z] = missionPositions[index]; if (x === undefined) return;
    const marker = new THREE.Group();
    part(marker, new THREE.CylinderGeometry(0.75, 0.95, 0.5, 12), 0xc8b4f2, 0, 0.25, 0);
    const pearl = part(marker, new THREE.OctahedronGeometry(0.65), GOLD, 0, 2.2, 0); marker.userData.pearl = pearl;
    const title = sign(mission.title, '#ffcf58'); title.position.set(0, 3.4, 0); title.scale.setScalar(0.8); marker.add(title); add(marker, x, 0, z);
    world.interactables.push({ id: mission.id, type: 'finance', label: mission.title, position: new THREE.Vector3(x, 0, z), radius: 4, location: 'atlantic', group: marker });
  });
  const boss = seaResident('poseidon'); boss.scale.setScalar(1.9); add(boss, 0, 0.6, -29);
  const enemies = [{ id: 'poseidon', mesh: boss, spawn: boss.position.clone(), hp: 180, maxHP: 180, radius: 2.1, height: 5.8, boss: true }];
  for (const [i, x] of [-8, 8, 0].entries()) {
    const guard = seaResident('guard', i); guard.scale.setScalar(1.18); const weapon = trident(guard.userData.body, 0.7); weapon.position.set(0, 0, -0.65); add(guard, x, 0.5, i === 2 ? -14 : -21);
    enemies.push({ id: `guard-${i}`, mesh: guard, spawn: guard.position.clone(), hp: 36, maxHP: 36, radius: 1.2, height: 3.6, cooldown: 1.8 });
  }
  world.atlanticGame = { active: false, defeated: false, playerHP: 100, maxPlayerHP: 100, bossHP: 180, maxBossHP: 180, enemies, guards: enemies.slice(1), telegraphs: [], attackTimer: 2.1, invulnerable: 0, bubbles, elapsed: 0 };
  world.traffic = [];
  for (let i = 0; i < 4; i++) {
    const ocean = i >= 2, object = ocean ? buildTurtleCar() : car(i ? 0x8fd4ff : 0xffb37a), driver = ocean ? seaResident('fishman', i) : buildHuman({ shirtColor: 0xc8b4f2 });
    driver.scale.setScalar(0.65); driver.position.set(-0.3, ocean ? 1.45 : 1, 0); driver.userData.legs.forEach(leg => leg.visible = false); object.add(driver); object.name = 'npc-driven-car';
    const route = ocean ? [[-24, 18], [24, 18], [24, -7], [-24, -7]] : [[-60, -38], [40, -38], [40, 38], [-60, 38]];
    const start = (i % 2) * 2; object.position.set(route[start][0], 0, route[start][1]); (ocean ? city : world.city).add(object);
    world.traffic.push({ mesh: object, driver, location: ocean ? 'atlantic' : 'city', route, target: (start + 1) % 4, speed: ocean ? 5 : 7 });
  }
  world.pushAnimals = ['lion', 'tiger'].map((kind, i) => {
    const object = animal(kind), home = new THREE.Vector3(-48, 0, 39 + i * 7); object.position.copy(home); world.city.add(object);
    return { mesh: object, home, phase: i * Math.PI, cooldown: 0, stun: 0, notice: 0 };
  });
}

function clearTelegraphs(world) {
  const game = world.atlanticGame;
  for (const attack of game?.telegraphs || []) { attack.mesh.parent?.remove(attack.mesh); attack.mesh.geometry.dispose(); attack.mesh.material.dispose(); }
  if (game) game.telegraphs.length = 0;
}
export function resetPoseidon(world) {
  const game = world.atlanticGame; if (!game) return;
  clearTelegraphs(world); game.active = false; game.playerHP = game.maxPlayerHP; game.attackTimer = 2.1; game.invulnerable = 0; game.elapsed = 0;
  for (const enemy of game.enemies) { enemy.hp = game.defeated ? 0 : enemy.maxHP; enemy.mesh.position.copy(enemy.spawn); enemy.mesh.visible = !game.defeated || enemy.boss; enemy.cooldown = 1.8; }
  game.bossHP = game.defeated ? 0 : game.maxBossHP;
}
export function setPoseidonDefeated(world, defeated) {
  const game = world.atlanticGame; if (!game || game.defeated === !!defeated) return;
  game.defeated = !!defeated; resetPoseidon(world);
}
export function startPoseidon(world) {
  const game = world.atlanticGame;
  if (!game || world.frozen || world.location !== 'atlantic' || world.vehicle || game.active || game.defeated || horizontalDistance(world.player.pos, new THREE.Vector3(0, 0, -20)) > 8) return false;
  resetPoseidon(world); game.active = true;
  world.onNotice?.(t('Poseidon awakens! Defeat his 3 guards, then attack the king. Move out of glowing circles!', 'Poseidon despertou! Derrote os 3 guardas e depois ataque o rei. Saia dos círculos brilhantes!'));
  return true;
}
export function getAtlanticStatus(world) {
  const game = world.atlanticGame;
  return game ? { active: game.active, defeated: game.defeated, playerHP: game.playerHP, maxPlayerHP: game.maxPlayerHP, bossHP: game.bossHP, maxBossHP: game.maxBossHP, guards: game.guards.filter(guard => guard.hp > 0).length, telegraph: game.telegraphs.some(attack => attack.timer > 0) } : null;
}
function hitSegment(projectile, target, radius, height = 3) {
  const end = projectile.mesh.position, start = projectile.previous || end;
  const segment = new THREE.Line3(start, end);
  const center = target.clone(); center.y += height / 2;
  const nearest = start.distanceToSquared(end) < 1e-10 ? end : segment.closestPointToPoint(center, true, new THREE.Vector3());
  return horizontalDistance(nearest, center) < radius + (projectile.radius || 0.3) && nearest.y >= target.y - 0.8 && nearest.y <= target.y + height + 0.6;
}
export function hitAtlantic(world, projectile) {
  if (world.frozen) return false;
  if (world.location === 'city') {
    for (const animal of world.pushAnimals || []) if (hitSegment(projectile, animal.mesh.position, 1.2, 1.9)) { animal.stun = 2.5; world.burst?.(animal.mesh.position, GOLD, 7); return true; }
    return false;
  }
  if (world.location !== 'atlantic') return false;
  const game = world.atlanticGame;
  if (game?.active) {
    for (const enemy of [...game.guards, game.enemies[0]]) {
      if (enemy.hp <= 0 || !hitSegment(projectile, enemy.mesh.position, enemy.radius, enemy.height)) continue;
      if (enemy.boss && game.guards.some(guard => guard.hp > 0)) { world.burst?.(projectile.mesh.position, AQUA, 7); return true; }
      enemy.hp = Math.max(0, enemy.hp - (Number.isFinite(projectile.damage) ? Math.max(1, projectile.damage) : 12));
      world.burst?.(projectile.mesh.position, enemy.boss ? GOLD : AQUA, 10);
      if (enemy.boss) game.bossHP = enemy.hp;
      else if (enemy.hp === 0) enemy.mesh.visible = false;
      if (enemy.boss && enemy.hp === 0) {
        game.active = false; game.defeated = true; clearTelegraphs(world);
        world.burst?.(enemy.mesh.position, GOLD, 32); world.onPoseidonDefeated?.();
      }
      return true;
    }
  }
  for (const resident of [...(world.atlanticResidents || []), ...(world.atlanticTriton ? [world.atlanticTriton] : [])]) {
    if (!hitSegment(projectile, resident.mesh.position, 0.8, 3)) continue;
    resident.stun = 1.5; world.burst?.(resident.mesh.position, AQUA, 6); return true;
  }
  return false;
}
function pushPlayer(world, actor, dt, radius, strength) {
  actor.cooldown = Math.max(0, actor.cooldown - dt); actor.notice = Math.max(0, (actor.notice || 0) - dt);
  if (actor.cooldown || world.vehicle || world.flying || world.player.pos.y > actor.mesh.position.y + 3) return;
  const delta = world.player.pos.clone().sub(actor.mesh.position); delta.y = 0;
  if (delta.length() >= radius) return;
  if (delta.lengthSq() < 0.001) delta.set(1, 0, 0);
  delta.normalize(); world.player.pos.addScaledVector(delta, strength); world.velocity?.addScaledVector(delta, 4); actor.cooldown = 1.6;
  world.burst?.(world.player.pos, GOLD, 8);
  if (!actor.notice) { actor.notice = 8; world.onNotice?.(actor === world.atlanticTriton ? t('Mr. Barriga Triton: make room for the reef inspector!', 'Sr. Barriga Tritão: dê passagem ao fiscal do recife!') : t('A playful big cat gave you a shove! Attack to stun it.', 'O felino deu um empurrão! Ataque para deixá-lo tonto.')); }
}
function hurtPlayer(world, damage) {
  const game = world.atlanticGame; if (!game.active || game.invulnerable > 0) return;
  game.playerHP = Math.max(0, game.playerHP - damage); game.invulnerable = 0.8; world.burst?.(world.player.pos, 0xff898f, 10);
  if (game.playerHP > 0) return;
  resetPoseidon(world); world.player.pos.set(...ATLANTIC_SPAWN); world.player.vy = 0; world.velocity?.set(0, 0, 0); world.resetInput?.();
  world.onNotice?.(t('The current carried you to safety. No money lost! Return to the palace to try again.', 'A correnteza levou você para um lugar seguro. Nenhum dinheiro perdido! Volte ao castelo para tentar novamente.'));
}
function warnWave(world) {
  const game = world.atlanticGame, radius = game.bossHP < 90 ? 3.8 : 3.1;
  const object = new THREE.Mesh(new THREE.RingGeometry(radius - 0.16, radius, 40), new THREE.MeshBasicMaterial({ color: 0xffbc66, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  object.rotation.x = -Math.PI / 2; object.position.set(world.player.pos.x, 0.1, world.player.pos.z); world.atlantic.add(object);
  game.telegraphs.push({ mesh: object, center: object.position.clone(), radius, timer: 1.25, resolved: false });
}
export function updateAtlantic(world, dt, time = 0) {
  if (!Number.isFinite(dt) || dt <= 0 || world.frozen) return;
  dt = Math.min(dt, 0.1);
  for (const traffic of world.traffic || []) {
    if (traffic.location !== world.location) continue;
    const [x, z] = traffic.route[traffic.target], direction = new THREE.Vector3(x, 0, z).sub(traffic.mesh.position), distance = direction.length();
    // Yield to the player rather than run through them.
    if (horizontalDistance(traffic.mesh.position, world.player.pos) < 4.3) continue;
    if (distance < 0.2) traffic.target = (traffic.target + 1) % traffic.route.length;
    else { direction.normalize(); traffic.mesh.position.addScaledVector(direction, Math.min(distance, traffic.speed * dt)); traffic.mesh.rotation.y = Math.atan2(direction.x, direction.z) - Math.PI / 2; }
  }
  if (world.location === 'city') for (const actor of world.pushAnimals || []) {
    actor.stun = Math.max(0, actor.stun - dt); if (actor.stun) continue;
    actor.phase += dt * 0.3; const target = actor.home.clone().add(new THREE.Vector3(Math.cos(actor.phase) * 3, 0, Math.sin(actor.phase) * 2));
    const direction = target.clone().sub(actor.mesh.position); actor.mesh.position.lerp(target, Math.min(1, dt * 2)); actor.mesh.rotation.y = Math.atan2(direction.x, direction.z) - Math.PI / 2;
    pushPlayer(world, actor, dt, 2, 2.8);
  }
  const game = world.atlanticGame;
  if (!game) return;
  if (world.location !== 'atlantic') { if (game.active) resetPoseidon(world); return; }
  if (!world.reducedMotion) for (const [i, bubble] of game.bubbles.entries()) { bubble.position.y += dt * (0.55 + i % 3 * 0.3); if (bubble.position.y > 19) bubble.position.y = 0; }
  for (const resident of world.atlanticResidents || []) {
    resident.stun = Math.max(0, resident.stun - dt); if (resident.stun) continue;
    resident.phase += dt * 0.4; const previous = resident.mesh.position.clone();
    resident.mesh.position.copy(resident.home).add(new THREE.Vector3(Math.cos(resident.phase) * 2, 0.5 + (world.reducedMotion ? 0 : Math.sin(resident.phase * 2) * 0.25), Math.sin(resident.phase) * 2));
    const direction = resident.mesh.position.clone().sub(previous); resident.mesh.rotation.y = Math.atan2(direction.x, direction.z) - Math.PI / 2;
    if (resident.mesh.userData.tail) resident.mesh.userData.tail.rotation.x = world.reducedMotion ? 0 : Math.sin(time * 3 + resident.phase) * 0.2;
    resident.mesh.userData.legs.forEach((leg, i) => leg.rotation.z = Math.sin(time * 5 + i * Math.PI) * 0.3);
  }
  const triton = world.atlanticTriton;
  if (triton) {
    triton.stun = Math.max(0, triton.stun - dt);
    if (!triton.stun && !game.active) {
      const chasing = horizontalDistance(triton.mesh.position, world.player.pos) < 10 && world.player.pos.z > -2;
      const target = chasing ? world.player.pos : triton.home, direction = target.clone().sub(triton.mesh.position); direction.y = 0;
      if (direction.length() > 1.3) { direction.normalize(); triton.mesh.position.addScaledVector(direction, dt * (chasing ? 2.6 : 1.6)); triton.mesh.rotation.y = Math.atan2(direction.x, direction.z) - Math.PI / 2; }
      triton.mesh.position.y = 0.6 + (world.reducedMotion ? 0 : Math.sin(time * 2) * 0.2); pushPlayer(world, triton, dt, 2.2, 3);
    }
  }
  if (!game.active) return;
  game.elapsed += dt; game.invulnerable = Math.max(0, game.invulnerable - dt);
  if (horizontalDistance(world.player.pos, new THREE.Vector3(0, 0, -20)) > 28 || world.vehicle) { resetPoseidon(world); world.onNotice?.(t('You left the arena. Challenge Poseidon again when ready.', 'Você saiu da arena. Desafie Poseidon novamente quando quiser.')); return; }
  for (const guard of game.guards) {
    if (guard.hp <= 0) continue;
    guard.cooldown = Math.max(0, guard.cooldown - dt);
    const direction = world.player.pos.clone().sub(guard.mesh.position); direction.y = 0; const distance = direction.length();
    if (distance > 1.7) { direction.normalize(); guard.mesh.position.addScaledVector(direction, Math.min(distance - 1.7, dt * 2.8)); guard.mesh.rotation.y = Math.atan2(direction.x, direction.z) - Math.PI / 2; }
    guard.mesh.position.y += (Math.max(0.5, world.player.pos.y) - guard.mesh.position.y) * Math.min(1, dt * 1.5);
    if (distance < 2.4 && Math.abs(guard.mesh.position.y - world.player.pos.y) < 2 && guard.cooldown <= 0) { guard.cooldown = 1.6; hurtPlayer(world, 8); if (!game.active) return; }
  }
  const boss = game.enemies[0]; boss.mesh.rotation.y = Math.atan2(world.player.pos.x - boss.mesh.position.x, world.player.pos.z - boss.mesh.position.z) - Math.PI / 2;
  boss.mesh.position.y += (Math.max(0.6, world.player.pos.y - 1) - boss.mesh.position.y) * Math.min(1, dt);
  game.attackTimer -= dt;
  if (game.attackTimer <= 0) { warnWave(world); game.attackTimer = game.bossHP < 90 ? 1.85 : 2.7; }
  for (let i = game.telegraphs.length - 1; i >= 0; i--) {
    const wave = game.telegraphs[i]; wave.timer -= dt;
    if (wave.timer <= 0 && !wave.resolved) {
      wave.resolved = true; wave.mesh.material.color.setHex(0x71ecff); world.burst?.(wave.center, AQUA, 12);
      if (horizontalDistance(world.player.pos, wave.center) < wave.radius) { hurtPlayer(world, 18); if (!game.active) return; }
    }
    wave.mesh.material.opacity = wave.resolved ? Math.max(0, (wave.timer + 0.35) / 0.35) : world.reducedMotion ? 0.85 : 0.65 + Math.sin(time * 12) * 0.2;
    if (wave.timer < -0.35) { wave.mesh.parent?.remove(wave.mesh); wave.mesh.geometry.dispose(); wave.mesh.material.dispose(); game.telegraphs.splice(i, 1); }
  }
}
