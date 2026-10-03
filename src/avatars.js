import * as THREE from 'three';

// All avatars face +X and share the llama's animation contract. Geometry is
// generated locally so the wardrobe and NPCs need no downloads or image assets.
const INK = 0x292b39;
const CREAM = 0xfffaf0;
const material = (color, extra = {}) => new THREE.MeshToonMaterial({ color, ...extra });
const sphere = (radius, detail = 12) => new THREE.SphereGeometry(radius, detail, 10);
const capsule = (radius, length) => new THREE.CapsuleGeometry(radius, length, 4, 10);

function addMesh(parent, geometry, paint, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, paint);
  object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}

function bone(parent, from, to, radius, paint) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const object = addMesh(parent, new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 8), paint);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return object;
}

function curve(parent, points, radius, paint) {
  const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return addMesh(parent, new THREE.TubeGeometry(path, 18, radius, 6, false), paint);
}

function panel(parent, points, paint) {
  const vertices = [];
  for (let i = 1; i < points.length - 1; i++) vertices.push(...points[0], ...points[i], ...points[i + 1]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return addMesh(parent, geometry, paint);
}

function rig(costume) {
  const avatar = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  avatar.name = `avatar-${costume.toLowerCase()}`;
  head.position.set(0.025, 2.4, 0);
  body.add(head); avatar.add(body);
  avatar.userData = { costume, body, head, legs: [], arms: [] };
  return avatar;
}

function face(head, { skin, hair = null, eyeColor = INK, zombie = false } = {}) {
  const dark = material(INK), white = material(CREAM), iris = material(eyeColor);
  addMesh(head, sphere(0.38), skin).scale.set(0.95, 1.03, 1);
  addMesh(head, sphere(0.075, 8), skin, 0.37, -0.035, 0).scale.set(0.8, 0.9, 0.8);
  for (const side of [-1, 1]) {
    addMesh(head, sphere(0.074, 8), skin, -0.005, -0.015, side * 0.37);
    addMesh(head, sphere(0.08, 8), white, 0.31, 0.085, side * 0.17).scale.x = 0.45;
    addMesh(head, sphere(0.042, 8), iris, 0.347, 0.087, side * 0.17).scale.x = 0.55;
    const brow = addMesh(head, new THREE.BoxGeometry(0.03, 0.035, 0.14), dark, 0.328, 0.197, side * 0.17);
    brow.rotation.x = side * (zombie ? 0.25 : -0.08);
  }
  curve(head, [[0.341, -0.125, -0.115], [0.36, -0.16, 0], [0.341, -0.125, 0.115]], 0.014, dark);
  if (hair) {
    addMesh(head, new THREE.SphereGeometry(0.397, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair, -0.02, 0.07, 0);
    addMesh(head, new THREE.BoxGeometry(0.19, 0.2, 0.54), hair, -0.29, 0.075, 0);
  }
}

function limbs(avatar, skin, pants, shoes, { sleeve = null, bareFeet = false } = {}) {
  const { body, legs, arms } = avatar.userData;
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0, 1.03, side * 0.235);
    addMesh(leg, capsule(0.145, 0.58), pants, 0, -0.42, 0);
    addMesh(leg, new THREE.BoxGeometry(0.43, 0.2, 0.32), bareFeet ? skin : shoes, 0.085, -0.92, 0);
    legs.push(leg); body.add(leg);
    const arm = new THREE.Group(); arm.position.set(0, 1.94, side * 0.47);
    addMesh(arm, capsule(0.115, 0.43), skin, 0, -0.29, side * 0.025);
    addMesh(arm, sphere(0.13, 10), skin, 0.015, -0.63, side * 0.035);
    if (sleeve) addMesh(arm, capsule(0.145, 0.16), sleeve, 0, -0.11, side * 0.015);
    arm.rotation.x = side * 0.1; arms.push(arm); body.add(arm);
  }
}

/** Adult town resident; beach + female renders a simple, non-anatomical bikini. */
export function buildHuman({ skinColor = 0xc58a61, shirtColor = 0x65b9cf, hairColor = 0x483426, clothing = 'casual', female = false } = {}) {
  const avatar = rig('Human'), { body, head } = avatar.userData;
  const skin = material(skinColor), shirt = material(shirtColor), pants = material(0x344b78), shoes = material(CREAM), hair = material(hairColor);
  const beach = clothing === 'beach';
  addMesh(body, capsule(0.31, 0.48), beach ? skin : shirt, 0, 1.61, 0).scale.set(0.83, 1, 1.25);
  addMesh(body, capsule(0.12, 0.11), skin, 0, 2.11, 0);
  limbs(avatar, skin, beach ? skin : pants, shoes, { sleeve: beach ? null : shirt, bareFeet: beach });
  face(head, { skin, hair });
  if (female) {
    addMesh(head, capsule(0.13, 0.35), hair, -0.23, -0.035, -0.29);
    addMesh(head, capsule(0.13, 0.35), hair, -0.23, -0.035, 0.29);
  }
  if (beach && female) {
    addMesh(body, new THREE.BoxGeometry(0.54, 0.2, 0.71), shirt, 0.015, 1.84, 0);
    addMesh(body, new THREE.BoxGeometry(0.5, 0.25, 0.64), shirt, 0, 1.18, 0);
    for (const side of [-1, 1]) bone(body, [0.2, 1.9, side * 0.23], [0, 2.025, side * 0.3], 0.025, shirt);
    addMesh(body, sphere(0.04, 8), shoes, 0.3, 1.86, 0);
  } else if (beach) {
    addMesh(body, new THREE.BoxGeometry(0.49, 0.43, 0.68), shirt, 0, 1.03, 0);
    addMesh(body, new THREE.BoxGeometry(0.51, 0.045, 0.7), shoes, 0, 1.245, 0);
  } else {
    addMesh(body, new THREE.BoxGeometry(0.03, 0.17, 0.14), shoes, 0.274, 1.81, -0.18);
  }
  avatar.userData.adult = true;
  avatar.userData.clothing = clothing;
  return avatar;
}

function superman() {
  const avatar = rig('Superman'), { body, head } = avatar.userData;
  const blue = material(0x267bd6), red = material(0xe7474d), gold = material(0xffd85d), skin = material(0xe1a27a);
  addMesh(body, capsule(0.32, 0.47), blue, 0, 1.62, 0).scale.set(0.85, 1, 1.28);
  addMesh(body, capsule(0.13, 0.12), skin, 0, 2.11, 0);
  limbs(avatar, blue, blue, red, { sleeve: blue });
  face(head, { skin, hair: material(0x253247) });
  addMesh(body, new THREE.BoxGeometry(0.51, 0.13, 0.7), gold, 0, 1.15, 0);
  panel(body, [[-0.22, 2.02, -0.42], [-0.22, 2.02, 0.42], [-0.62, 0.53, 0.69], [-0.72, 0.63, 0], [-0.62, 0.53, -0.69]], material(0xda3647, { side: THREE.DoubleSide }));
  const shield = [[-0.29, 0.17], [0.29, 0.17], [0.33, 0.06], [0, -0.27], [-0.33, 0.06]];
  panel(body, shield.map(([z, y]) => [0.286, 1.73 + y, z]), material(0xffd85d, { side: THREE.DoubleSide }));
  curve(body, [[0.31, 1.84, 0.16], [0.32, 1.9, -0.08], [0.33, 1.78, -0.17], [0.34, 1.72, 0.12], [0.34, 1.62, 0.12], [0.33, 1.58, -0.09]], 0.035, red);
  return avatar;
}

function skeleton() {
  const avatar = rig('Skeleton'), { body, head, legs, arms } = avatar.userData;
  const ivory = material(0xfff3cf), dark = material(0x46465e), blue = material(0x79cfea);
  bone(body, [0, 1.03, 0], [0, 2.13, 0], 0.075, ivory);
  addMesh(body, sphere(0.28), ivory, 0, 1.05, 0).scale.set(0.7, 0.45, 1.35);
  for (const y of [1.39, 1.56, 1.73, 1.9]) {
    const rib = addMesh(body, new THREE.TorusGeometry(0.27, 0.046, 6, 14), ivory, 0, y, 0);
    rib.rotation.x = Math.PI / 2; rib.scale.set(0.75, 1.3, 1);
  }
  bone(body, [0, 1.97, -0.44], [0, 1.97, 0.44], 0.07, ivory);
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0, 1.02, side * 0.235);
    bone(leg, [0, -0.06, 0], [0, -0.81, 0], 0.072, ivory);
    for (const y of [-0.1, -0.48, -0.81]) addMesh(leg, sphere(0.1, 8), ivory, 0, y, 0);
    addMesh(leg, new THREE.BoxGeometry(0.35, 0.16, 0.23), ivory, 0.07, -0.93, 0);
    legs.push(leg); body.add(leg);
    const arm = new THREE.Group(); arm.position.set(0, 1.94, side * 0.44);
    bone(arm, [0, 0, 0], [0.01, -0.61, side * 0.07], 0.062, ivory);
    addMesh(arm, sphere(0.09, 8), ivory, 0, -0.29, side * 0.03);
    addMesh(arm, sphere(0.105, 8), ivory, 0.01, -0.65, side * 0.07);
    arms.push(arm); body.add(arm);
  }
  addMesh(head, sphere(0.375), ivory).scale.set(0.95, 1.02, 1);
  addMesh(head, new THREE.BoxGeometry(0.36, 0.17, 0.43), ivory, 0.13, -0.26, 0);
  for (const side of [-1, 1]) {
    addMesh(head, sphere(0.13, 10), dark, 0.31, 0.045, side * 0.155).scale.x = 0.32;
    addMesh(head, sphere(0.047, 8), blue, 0.355, 0.045, side * 0.155).scale.x = 0.45;
  }
  addMesh(head, sphere(0.05, 8), dark, 0.365, -0.095, 0).scale.set(0.3, 1, 0.7);
  for (const z of [-0.13, -0.045, 0.045, 0.13]) addMesh(head, new THREE.BoxGeometry(0.015, 0.058, 0.017), dark, 0.316, -0.27, z);
  return avatar;
}

function dragon() {
  const avatar = rig('Dragon'), { body, head, legs } = avatar.userData;
  const green = material(0x61ae87), belly = material(0xffd59a), horn = material(0xfff3cf), wingPaint = material(0x92c7d0, { side: THREE.DoubleSide });
  addMesh(body, capsule(0.38, 0.4), green, 0, 1.54, 0).scale.set(1, 1, 1.2);
  addMesh(body, sphere(0.32), belly, 0.265, 1.55, 0).scale.set(0.4, 1.45, 1.06);
  limbs(avatar, green, green, green);
  face(head, { skin: green, eyeColor: 0x705131 });
  addMesh(head, capsule(0.22, 0.2), green, 0.39, -0.08, 0).rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    addMesh(head, sphere(0.035, 8), material(INK), 0.65, 0.015, side * 0.105);
    const spike = addMesh(head, new THREE.ConeGeometry(0.09, 0.32, 8), horn, -0.08, 0.41, side * 0.23);
    spike.rotation.x = side * 0.22;
    for (const z of [-0.095, 0, 0.095]) {
      const claw = addMesh(legs[side === -1 ? 0 : 1], new THREE.ConeGeometry(0.038, 0.16, 6), horn, 0.29, -0.92, z);
      claw.rotation.z = -Math.PI / 2;
    }
  }
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group(); wing.position.set(-0.24, 1.85, side * 0.32);
    const points = [[0, 0, 0], [-0.22, 0.57, side * 0.5], [-0.18, 0.3, side * 1.22], [0, -0.12, side * 1.02], [-0.08, -0.15, side * 0.53], [0.02, -0.55, side * 0.36]];
    panel(wing, points, wingPaint);
    for (let i = 2; i < points.length; i++) bone(wing, points[1], points[i], 0.026, green);
    bone(wing, points[0], points[1], 0.06, green);
    body.add(wing); wings.push(wing);
  }
  curve(body, [[-0.24, 1.18, 0], [-0.66, 0.69, 0], [-1.12, 0.44, 0], [-1.43, 0.62, 0]], 0.13, green);
  const tailTip = addMesh(body, new THREE.ConeGeometry(0.16, 0.38, 6), belly, -1.52, 0.7, 0); tailTip.rotation.z = -0.85;
  avatar.userData.wings = wings;
  return avatar;
}

function cyborg() {
  const avatar = rig('Cyborg'), { body, head, legs } = avatar.userData;
  const metal = material(0xb5c3d4), dark = material(0x354359), cyan = material(0x78eaff, { emissive: 0x49cde8, emissiveIntensity: 0.7 }), skin = material(0x9d644b), white = material(CREAM);
  addMesh(body, capsule(0.34, 0.43), metal, 0, 1.62, 0).scale.set(0.85, 1, 1.28);
  addMesh(body, capsule(0.13, 0.12), dark, 0, 2.11, 0);
  limbs(avatar, metal, dark, metal, { sleeve: metal });
  face(head, { skin, hair: material(0x263248) });
  addMesh(head, new THREE.BoxGeometry(0.27, 0.62, 0.35), metal, 0.24, 0.015, -0.2);
  addMesh(head, sphere(0.09, 10), cyan, 0.385, 0.09, -0.2).scale.x = 0.36;
  addMesh(body, new THREE.CylinderGeometry(0.16, 0.16, 0.055, 12), cyan, 0.3, 1.75, 0).rotation.z = -Math.PI / 2;
  const thrusters = [];
  for (const leg of legs) {
    addMesh(leg, new THREE.BoxGeometry(0.39, 0.4, 0.36), metal, 0.015, -0.76, 0);
    addMesh(leg, new THREE.BoxGeometry(0.43, 0.06, 0.39), cyan, 0.065, -0.98, 0);
    const flame = addMesh(leg, new THREE.ConeGeometry(0.14, 0.62, 9), cyan, 0.04, -1.31, 0);
    flame.rotation.z = Math.PI; flame.visible = false; thrusters.push(flame);
  }
  const cannon = new THREE.Group(); cannon.position.set(0.18, 1.39, -0.58);
  addMesh(cannon, new THREE.CylinderGeometry(0.16, 0.19, 0.53, 12), dark, 0.18, 0, 0).rotation.z = -Math.PI / 2;
  addMesh(cannon, new THREE.CylinderGeometry(0.17, 0.17, 0.14, 12), white, 0.35, 0, 0).rotation.z = -Math.PI / 2;
  addMesh(cannon, new THREE.CylinderGeometry(0.105, 0.105, 0.025, 12), cyan, 0.46, 0, 0).rotation.z = -Math.PI / 2;
  addMesh(cannon, new THREE.CylinderGeometry(0.11, 0.11, 0.29, 10), white, 0.09, 0.25, 0);
  addMesh(cannon, new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10), cyan, 0.09, 0.42, 0);
  body.add(cannon); avatar.userData.cannon = cannon; avatar.userData.thrusters = thrusters;
  return avatar;
}

function zombie() {
  const avatar = rig('Zombie'), { body, head } = avatar.userData;
  const skin = material(0x91bf78), jacket = material(0x9171b3), pants = material(0x526584), shoes = material(0x735641);
  addMesh(body, capsule(0.32, 0.47), jacket, 0, 1.61, 0).scale.set(0.84, 1, 1.25);
  addMesh(body, capsule(0.13, 0.12), skin, 0, 2.11, 0);
  limbs(avatar, skin, pants, shoes, { sleeve: jacket });
  face(head, { skin, hair: material(0x536a43), zombie: true });
  addMesh(body, new THREE.BoxGeometry(0.05, 0.39, 0.17), material(0xffdca2), 0.28, 1.7, 0);
  for (const side of [-1, 1]) {
    const patch = addMesh(body, new THREE.BoxGeometry(0.06, 0.15, 0.17), material(0xa8c69f), 0.245, 1.4, side * 0.19);
    patch.rotation.x = side * 0.35;
  }
  addMesh(head, new THREE.BoxGeometry(0.024, 0.054, 0.05), material(CREAM), 0.363, -0.135, -0.04);
  return avatar;
}

function katakuri() {
  const avatar = rig('Charlotte Katakuri'), { body, head, legs, arms } = avatar.userData;
  const skin = material(0xe1a485), dark = material(0x302d43), magenta = material(0x932c62), scarf = material(0xfff5eb), silver = material(0xc0c5d5), gold = material(0xd8ac58);
  addMesh(body, capsule(0.33, 0.46), skin, 0, 1.62, 0).scale.set(0.87, 1, 1.32);
  limbs(avatar, skin, dark, dark);
  face(head, { skin, hair: magenta, eyeColor: 0x7b274e });
  // The tall white scarf, spiked magenta hair, open vest and trident identify
  // Katakuri while retaining the game's soft, friendly character proportions.
  for (const side of [-1, 1]) {
    addMesh(body, new THREE.BoxGeometry(0.47, 0.78, 0.18), dark, 0, 1.7, side * 0.32);
    for (const y of [1.5, 1.72, 1.92]) addMesh(body, sphere(0.035, 8), silver, 0.253, y, side * 0.31);
    for (const y of [-0.26, -0.39]) addMesh(arms[side === -1 ? 0 : 1], new THREE.CylinderGeometry(0.127, 0.127, 0.05, 10), magenta, 0, y, side * 0.025);
    addMesh(legs[side === -1 ? 0 : 1], new THREE.BoxGeometry(0.34, 0.37, 0.34), dark, 0.03, -0.76, 0);
    for (const y of [-0.65, -0.8]) addMesh(legs[side === -1 ? 0 : 1], new THREE.BoxGeometry(0.035, 0.045, 0.35), silver, 0.211, y, 0);
  }
  for (const y of [1.43, 1.57, 1.71]) addMesh(body, new THREE.BoxGeometry(0.018, 0.025, 0.19), magenta, 0.291, y, 0);
  addMesh(body, new THREE.BoxGeometry(0.54, 0.14, 0.71), dark, 0, 1.15, 0);
  addMesh(body, new THREE.BoxGeometry(0.035, 0.13, 0.16), gold, 0.285, 1.15, 0);
  const collar = addMesh(body, new THREE.TorusGeometry(0.37, 0.14, 8, 16), scarf, 0, 2.095, 0); collar.rotation.x = Math.PI / 2;
  addMesh(head, new THREE.BoxGeometry(0.42, 0.28, 0.68), scarf, 0.205, -0.23, 0);
  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI * 2 / 9;
    const tuft = addMesh(head, new THREE.ConeGeometry(0.1, 0.23, 5), magenta, Math.cos(angle) * 0.22, 0.42, Math.sin(angle) * 0.24);
    tuft.rotation.z = -Math.cos(angle) * 0.35; tuft.rotation.x = Math.sin(angle) * 0.35;
  }
  const trident = new THREE.Group(); trident.position.set(0.2, 0, -0.76);
  bone(trident, [0, 0.08, 0], [0, 2.63, 0], 0.037, dark);
  bone(trident, [0, 2.54, -0.22], [0, 2.54, 0.22], 0.035, silver);
  for (const z of [-0.22, 0, 0.22]) {
    const top = z === 0 ? 2.98 : 2.84;
    bone(trident, [0, 2.54, z], [0, top - 0.13, z], 0.031, silver);
    addMesh(trident, new THREE.ConeGeometry(0.058, 0.19, 6), silver, 0, top - 0.035, z);
  }
  body.add(trident);
  return avatar;
}

/** Returns null for original llama costumes, preserving their existing factory. */
export function buildAvatar(costume, bodyColor = 0xe1a27a) {
  switch (costume) {
    case 'Superman': return superman();
    case 'Skeleton': return skeleton();
    case 'Dragon': return dragon();
    case 'Cyborg': return cyborg();
    case 'Human': return buildHuman({ skinColor: bodyColor === 0xfff1d6 ? 0xc58a61 : bodyColor });
    case 'Zombie': return zombie();
    case 'Charlotte Katakuri': return katakuri();
    default: return null;
  }
}
