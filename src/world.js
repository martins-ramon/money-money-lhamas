import * as THREE from 'three';
import { movementInput } from './experience.js';
import { JOBS } from './model.js';

const PALETTE = { peach: 0xffb37a, sage: 0x9dd39a, lilac: 0xc8b4f2, sky: 0x8fd4ff, sun: 0xffd94d, coral: 0xff6b6b, ink: 0x2b2a33, cream: 0xf7f2e4, wood: 0xb58a5a, gold: 0xf6b53d, white: 0xfffaf0 };
const COIN_SPOTS = [[-4, -18], [6, 4], [-18, 2], [22, -4], [3, -26], [-26, -8], [12, 20], [-8, 22], [26, 12], [-24, 16], [0, -6], [18, -12]];
export const HIDING_SPOTS = [[-6, -12], [4, -2], [-16, -14], [14, -2], [-4, 14], [20, 3], [-20, 10], [8, 12]];
export const PLACES = {
  food: { position: [-3, -22], label: 'Food truck', type: 'shop' },
  clothes: { position: [5, -22], label: 'Clothes shop', type: 'shop' },
  home: { position: [0, 20], label: 'Your place', type: 'home' },
  hq: { position: [26, 22], label: 'Llama Labs HQ', type: 'hq' },
  moonhouse: { position: [0, 0], label: 'Moon house deal', type: 'moon' },
  picnic: { position: [-24, 24], label: 'Picnic mission', type: 'quest' },
  explorer: { position: [30, -26], label: 'Explorer mission', type: 'quest' },
  helper: { position: [-30, -26], label: 'Helper mission', type: 'quest' },
  bbq: { position: [10, 26], label: 'BBQ & chimarrão party', type: 'bbq' },
};

let gradientMap;
function toonGradient() {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter; gradientMap.needsUpdate = true;
  return gradientMap;
}
const mat = (color, opts = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts });
function mesh(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = shadow; return m;
}
function textTexture(text, bg = '#fffaf0', fg = '#2b2a33', size = 64) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, 512, 128, 28); ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = '#2b2a33'; ctx.stroke();
  ctx.fillStyle = fg; ctx.font = `900 ${size}px Outfit, 'DM Sans', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let f = size; while (ctx.measureText(text).width > 470 && f > 20) { f -= 4; ctx.font = `900 ${f}px Outfit, 'DM Sans', sans-serif`; }
  ctx.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sign(text, bg) {
  const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: textTexture(text, bg), transparent: true }));
  return s;
}
function disposeGroup(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); });
  geometries.forEach(g => g.dispose()); materials.forEach(m => { m.map?.dispose(); m.dispose(); });
}

/* ---------- Characters ---------- */
export function buildLlama(bodyColor = 0xfff1d6, costume = 'Street dreamer') {
  const g = new THREE.Group();
  const furColor = costume === 'Spider-Llama' ? 0xe63946 : costume === 'Lunar billionaire' ? 0xd7dde8 : bodyColor;
  const fur = mat(furColor), dark = mat(PALETTE.ink), white = mat(PALETTE.white), pink = mat(0xffb3c6);
  const body = new THREE.Group();
  const torso = mesh(new THREE.CapsuleGeometry(0.55, 1.1, 6, 12), fur); torso.rotation.z = Math.PI / 2; torso.position.y = 1.15;
  body.add(torso);
  const neck = mesh(new THREE.CapsuleGeometry(0.28, 0.9, 6, 10), fur, 0.85, 1.85, 0); neck.rotation.z = 0.25; body.add(neck);
  const head = new THREE.Group(); head.position.set(1.05, 2.45, 0);
  head.add(mesh(new THREE.BoxGeometry(0.75, 0.6, 0.62, 2, 2, 2), fur));
  head.add(mesh(new THREE.BoxGeometry(0.42, 0.42, 0.5), fur, 0.5, -0.1, 0));
  head.add(mesh(new THREE.SphereGeometry(0.06, 8, 8), dark, 0.74, -0.12, 0.14, false));
  head.add(mesh(new THREE.SphereGeometry(0.06, 8, 8), dark, 0.74, -0.12, -0.14, false));
  const mouth = mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI), dark, 0.72, -0.26, 0, false); mouth.rotation.set(0, Math.PI / 2, Math.PI); head.add(mouth);
  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.12, 10, 10), white, 0.25, 0.15, side * 0.28, false); head.add(eye);
    head.add(mesh(new THREE.SphereGeometry(0.06, 8, 8), dark, 0.35, 0.16, side * 0.3, false));
    const ear = mesh(new THREE.ConeGeometry(0.12, 0.45, 6), fur, -0.1, 0.5, side * 0.22); ear.rotation.z = -0.15; ear.rotation.x = side * 0.25; head.add(ear);
  }
  body.add(head);
  body.add(mesh(new THREE.SphereGeometry(0.18, 8, 8), fur, -1.1, 1.35, 0));
  const legs = [];
  for (const [x, z] of [[0.6, 0.3], [0.6, -0.3], [-0.6, 0.3], [-0.6, -0.3]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.85, z);
    leg.add(mesh(new THREE.CapsuleGeometry(0.13, 0.65, 4, 8), fur, 0, -0.4, 0));
    leg.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8), dark, 0, -0.8, 0));
    legs.push(leg); body.add(leg);
  }
  const outfit = new THREE.Group();
  const hatBase = () => mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12), dark, 0, 0.36, 0);
  switch (costume) {
    case 'Fresh streetwear': {
      const cap = mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(PALETTE.coral), 0, 0.25, 0); head.add(cap);
      head.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), mat(PALETTE.coral), 0.4, 0.27, 0));
      const hoodie = mesh(new THREE.CapsuleGeometry(0.62, 1.0, 6, 12), mat(PALETTE.lilac)); hoodie.rotation.z = Math.PI / 2; hoodie.position.y = 1.15; outfit.add(hoodie);
      break;
    }
    case 'Ronald McLlama': {
      const red = mat(PALETTE.coral);
      for (const side of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(0.28, 10, 10), red, -0.05, 0.3, side * 0.42));
      head.add(mesh(new THREE.SphereGeometry(0.12, 10, 10), red, 0.78, -0.08, 0));
      const m = mesh(new THREE.TorusGeometry(0.16, 0.06, 8, 16, Math.PI), mat(PALETTE.sun), 0, 0.55, 0); m.rotation.y = Math.PI / 2; head.add(m);
      const shirt = mesh(new THREE.CapsuleGeometry(0.6, 0.8, 6, 12), mat(PALETTE.sun)); shirt.rotation.z = Math.PI / 2; shirt.position.y = 1.15; outfit.add(shirt);
      outfit.add(mesh(new THREE.TorusGeometry(0.62, 0.08, 8, 20), red, 0, 1.15, 0)).rotation.y = Math.PI / 2;
      break;
    }
    case 'Mop-top & cleaning cart': {
      const mop = new THREE.Group(); mop.position.set(0, 0.4, 0);
      mop.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), mat(PALETTE.wood), 0, 0.5, 0));
      for (let i = 0; i < 10; i++) { const s = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 5), mat(0xbfbfbf), Math.cos(i) * 0.22, -0.05, Math.sin(i) * 0.22); s.rotation.z = Math.cos(i) * 0.35; s.rotation.x = Math.sin(i) * 0.35; mop.add(s); }
      head.add(mop);
      legs.forEach(l => (l.visible = false));
      const cart = new THREE.Group();
      cart.add(mesh(new THREE.BoxGeometry(2.4, 1.0, 1.4), mat(PALETTE.sun), 0, 0.85, 0));
      cart.add(mesh(new THREE.BoxGeometry(2.2, 0.9, 1.2), mat(0x3c8dd6), 0, 0.95, 0));
      for (const [x, z] of [[0.9, 0.7], [-0.9, 0.7], [0.9, -0.7], [-0.9, -0.7]]) { const w = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), dark, x, 0.22, z); w.rotation.x = Math.PI / 2; cart.add(w); }
      cart.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), mat(0x8a8a8a), -1.25, 1.5, 0));
      outfit.add(cart);
      break;
    }
    case 'Spider-Llama': {
      const blue = mat(0x2b5fd9), lines = new THREE.MeshBasicMaterial({ color: PALETTE.ink });
      legs.forEach(l => l.children[0].material = blue);
      const belly = mesh(new THREE.CapsuleGeometry(0.58, 0.9, 6, 12), blue); belly.rotation.z = Math.PI / 2; belly.position.y = 1.0; outfit.add(belly);
      for (let i = 0; i < 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15 + i * 0.12, 0.012, 4, 24), lines); ring.position.set(0.39, 0.1, 0); ring.rotation.y = Math.PI / 2; head.add(ring); }
      for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.9, 0.012), lines); l.position.set(0.39, 0.1, 0); l.rotation.x = (i * Math.PI) / 8; head.add(l); }
      break;
    }
    case 'The very full diaper': {
      const diaper = mesh(new THREE.CapsuleGeometry(0.66, 0.5, 6, 12), white); diaper.rotation.z = Math.PI / 2; diaper.position.set(-0.4, 1.05, 0); outfit.add(diaper);
      outfit.add(mesh(new THREE.SphereGeometry(0.28, 8, 8), mat(0x7a4a1d), -0.7, 0.75, 0));
      outfit.add(mesh(new THREE.SphereGeometry(0.16, 8, 8), mat(0x7a4a1d), -0.35, 0.65, 0.35));
      const clip = mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), mat(PALETTE.sky), -0.4, 1.4, 0.7); outfit.add(clip);
      break;
    }
    case 'Grand hotel concierge': {
      body.rotation.z = Math.PI / 2 - 0.15; body.position.set(-0.4, 0.55, 0);
      legs[0].visible = legs[1].visible = false;
      const suit = mesh(new THREE.CapsuleGeometry(0.6, 0.7, 6, 12), dark); suit.rotation.z = Math.PI / 2; suit.position.set(0.2, 1.15, 0); body.add(suit);
      body.add(mesh(new THREE.BoxGeometry(0.2, 0.4, 0.5), white, 0.55, 1.4, 0));
      body.add(mesh(new THREE.BoxGeometry(0.1, 0.16, 0.34), mat(PALETTE.coral), 0.75, 1.7, 0));
      head.add(hatBase()); head.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12), dark, 0, 0.6, 0));
      for (const side of [-1, 1]) { const arm = mesh(new THREE.CapsuleGeometry(0.12, 0.6, 4, 8), dark, 0.6, 0.9, side * 0.45); arm.rotation.z = -1.2; body.add(arm); }
      break;
    }
    case 'Officer Llama': {
      const blue = mat(0x2f4fa2);
      head.add(mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.3, 12), blue, 0, 0.42, 0));
      head.add(mesh(new THREE.BoxGeometry(0.4, 0.05, 0.5), dark, 0.42, 0.3, 0));
      head.add(mesh(new THREE.SphereGeometry(0.08, 8, 8), mat(PALETTE.gold), 0.36, 0.45, 0));
      for (const side of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.06, 0.16, 0.22), dark, 0.36, 0.15, side * 0.28, false));
      const vest = mesh(new THREE.CapsuleGeometry(0.6, 0.8, 6, 12), blue); vest.rotation.z = Math.PI / 2; vest.position.y = 1.15; outfit.add(vest);
      outfit.add(mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(PALETTE.gold), 0.45, 1.5, 0.5));
      break;
    }
    case 'Lunar billionaire': {
      const glow = mat(0x6ff3ff, { emissive: 0x2dd0ff, emissiveIntensity: 0.5 });
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 16), new THREE.MeshPhysicalMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.32, roughness: 0.1 })); helmet.position.set(0.2, 0.05, 0); head.add(helmet);
      const suit = mesh(new THREE.CapsuleGeometry(0.62, 1.0, 6, 12), glow); suit.rotation.z = Math.PI / 2; suit.position.y = 1.15; outfit.add(suit);
      outfit.add(mesh(new THREE.BoxGeometry(0.5, 0.7, 0.9), mat(0x8a94a6), -0.2, 1.75, 0));
      for (const side of [-1, 1]) outfit.add(mesh(new THREE.ConeGeometry(0.12, 0.3, 8), mat(PALETTE.sun), -0.2, 1.3, side * 0.3)).rotation.x = Math.PI;
      break;
    }
    case 'Girlfriend': {
      const bow = new THREE.Group(); bow.position.set(-0.05, 0.42, 0.25);
      bow.add(mesh(new THREE.SphereGeometry(0.12, 8, 8), pink, 0, 0, 0.12)); bow.add(mesh(new THREE.SphereGeometry(0.12, 8, 8), pink, 0, 0, -0.12)); bow.add(mesh(new THREE.SphereGeometry(0.06, 8, 8), dark));
      head.add(bow);
      for (const side of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.06, 0.16, 0.22), mat(0x6a3fa0), 0.36, 0.15, side * 0.28, false));
      const scarf = mesh(new THREE.TorusGeometry(0.34, 0.1, 8, 16), pink, 0.75, 1.75, 0); scarf.rotation.z = 0.25; scarf.rotation.x = Math.PI / 2; outfit.add(scarf);
      break;
    }
    default: {
      head.add(mesh(new THREE.CylinderGeometry(0.4, 0.38, 0.3, 12), mat(0x8a6a4a), 0, 0.4, 0));
      head.add(mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), mat(PALETTE.sage), 0.2, 0.42, 0.25));
      const scarf = mesh(new THREE.TorusGeometry(0.34, 0.1, 8, 16), mat(PALETTE.coral), 0.75, 1.75, 0); scarf.rotation.z = 0.25; scarf.rotation.x = Math.PI / 2; outfit.add(scarf);
    }
  }
  body.add(outfit);
  g.add(body);
  g.userData = { body, head, legs, costume };
  return g;
}
export function buildBarriga() {
  const g = new THREE.Group();
  const skin = mat(0xf2c9a0), shirt = mat(0x4f9be3), dark = mat(PALETTE.ink);
  g.add(mesh(new THREE.SphereGeometry(0.95, 14, 12), shirt, 0, 1.3, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.98, 0.9, 0.4, 14), mat(0x7a4a1d), 0, 0.55, 0));
  const head = new THREE.Group(); head.position.y = 2.55;
  head.add(mesh(new THREE.SphereGeometry(0.55, 14, 12), skin));
  head.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 0.5), dark, 0.5, -0.12, 0));
  for (const side of [-1, 1]) { head.add(mesh(new THREE.SphereGeometry(0.09, 8, 8), mat(PALETTE.white), 0.45, 0.12, side * 0.2, false)); head.add(mesh(new THREE.SphereGeometry(0.045, 6, 6), dark, 0.52, 0.12, side * 0.2, false)); head.add(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.22), dark, 0.42, 0.28, side * 0.2, false)); }
  head.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.42, 14), mat(0x8a6a4a), 0, 0.5, 0));
  head.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 14), mat(0x8a6a4a), 0, 0.3, 0));
  g.add(head);
  for (const side of [-1, 1]) { g.add(mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), dark, 0, 0.32, side * 0.4)); const arm = mesh(new THREE.CapsuleGeometry(0.14, 0.7, 4, 8), shirt, 0.3, 1.4, side * 1.0); arm.rotation.x = side * 0.4; g.add(arm); }
  const paper = mesh(new THREE.BoxGeometry(0.02, 0.5, 0.4), mat(PALETTE.white), 0.9, 1.5, -0.6); paper.rotation.y = 0.4; g.add(paper);
  g.userData = { head };
  return g;
}

/* ---------- Buildings ---------- */
function building(w, h, d, color, roofColor = PALETTE.coral) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(color), 0, h / 2, 0));
  const roof = mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.4, 4), mat(roofColor), 0, h + h * 0.2, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
  g.add(mesh(new THREE.BoxGeometry(w * 0.22, h * 0.45, 0.2), mat(PALETTE.ink), 0, h * 0.225, d / 2 + 0.05));
  for (const x of [-w * 0.3, w * 0.3]) g.add(mesh(new THREE.BoxGeometry(w * 0.2, h * 0.25, 0.15), mat(PALETTE.sky), x, h * 0.6, d / 2 + 0.05));
  return g;
}
function tree(scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.3, 7), mat(PALETTE.wood), 0, 0.65, 0));
  g.add(mesh(new THREE.SphereGeometry(1.1, 9, 8), mat(0x7cc46e), 0, 1.9, 0));
  g.add(mesh(new THREE.SphereGeometry(0.75, 9, 8), mat(0x9dd39a), 0.5, 2.5, 0.3));
  g.scale.setScalar(scale);
  return g;
}
function bush() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(1.2, 10, 8), mat(0x5ea85f), 0, 0.9, 0));
  g.add(mesh(new THREE.SphereGeometry(0.9, 10, 8), mat(0x7cc46e), 0.9, 0.8, 0.3));
  g.add(mesh(new THREE.SphereGeometry(0.8, 10, 8), mat(0x7cc46e), -0.8, 0.7, -0.4));
  return g;
}
function car(color, style = 'classic', scale = 1) {
  const g = new THREE.Group();
  const paint = mat(color);
  const long = style === 'sporty' ? 3.4 : 2.8, height = style === 'cozy' ? 1.1 : 0.8;
  g.add(mesh(new THREE.BoxGeometry(long, height, 1.6), paint, 0, 0.6 + height / 2 - 0.4, 0));
  g.add(mesh(new THREE.BoxGeometry(long * (style === 'sporty' ? 0.45 : 0.55), 0.7, 1.4), style === 'cozy' ? paint : mat(PALETTE.sky), style === 'sporty' ? -0.3 : 0, 0.6 + height - 0.05, 0));
  for (const [x, z] of [[long * 0.32, 0.8], [-long * 0.32, 0.8], [long * 0.32, -0.8], [-long * 0.32, -0.8]]) { const w = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), mat(PALETTE.ink), x, 0.36, z); w.rotation.x = Math.PI / 2; g.add(w); }
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), mat(PALETTE.sun), long / 2, 0.7, 0.5)); g.add(mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), mat(PALETTE.sun), long / 2, 0.7, -0.5));
  if (style === 'sporty') g.add(mesh(new THREE.BoxGeometry(0.2, 0.3, 1.5), paint, -long / 2, 1.2, 0));
  if (style === 'cozy') g.add(mesh(new THREE.BoxGeometry(1.4, 0.3, 1.0), mat(PALETTE.coral), 0, 1.75, 0));
  g.scale.setScalar(scale);
  return g;
}
function house(color, style = 'classic') {
  const g = new THREE.Group();
  const w = style === 'sporty' ? 4.5 : 4, h = style === 'cozy' ? 2.6 : 3.2;
  g.add(mesh(new THREE.BoxGeometry(w, h, 4), mat(color), 0, h / 2, 0));
  const roof = mesh(new THREE.ConeGeometry(3.6, style === 'sporty' ? 1.2 : 2.2, 4), mat(style === 'cozy' ? 0x8a6a4a : PALETTE.coral), 0, h + (style === 'sporty' ? 0.6 : 1.1), 0); roof.rotation.y = Math.PI / 4; g.add(roof);
  g.add(mesh(new THREE.BoxGeometry(1, 1.7, 0.2), mat(PALETTE.ink), 0, 0.85, 2.05));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), mat(PALETTE.sky), -1.3, 1.9, 2.05));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.15), mat(PALETTE.sky), 1.3, 1.9, 2.05));
  if (style === 'cozy') g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), mat(0x8a6a4a), 1.2, h + 1, -0.8));
  if (style === 'sporty') g.add(mesh(new THREE.BoxGeometry(2, 0.3, 2), mat(PALETTE.sky), 0, h + 0.2, 1.5));
  return g;
}
function mansion() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12, 5, 6), mat(PALETTE.cream), 0, 2.5, 0));
  g.add(mesh(new THREE.BoxGeometry(4, 7, 4), mat(PALETTE.white), 0, 3.5, 0.5));
  for (const x of [-4.5, 4.5]) { const r = mesh(new THREE.ConeGeometry(2.8, 2.2, 4), mat(PALETTE.lilac), x, 6.1, 0); r.rotation.y = Math.PI / 4; g.add(r); }
  const centralRoof = mesh(new THREE.ConeGeometry(3, 2.4, 4), mat(PALETTE.gold), 0, 8.2, 0.5);
  centralRoof.rotation.y = Math.PI / 4; g.add(centralRoof);
  const door = mesh(new THREE.BoxGeometry(1.8, 2.6, 0.3), mat(PALETTE.ink), 0, 1.3, 3.1); door.name = 'front-door'; g.add(door);
  for (const x of [-4, -2, 2, 4]) for (const y of [1.5, 3.7]) g.add(mesh(new THREE.BoxGeometry(1.1, 1.1, 0.2), mat(PALETTE.sky), x, y, 3.05));
  for (const x of [-1.7, 1.7]) g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 10), mat(PALETTE.white), x, 2.5, 3.2));
  const fountain = new THREE.Group(); fountain.position.set(6, 0, 8);
  fountain.add(mesh(new THREE.CylinderGeometry(2, 2.2, 0.6, 16), mat(0x9fb3c8), 0, 0.3, 0)); fountain.add(mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.2, 16), mat(0x5cc8ff), 0, 0.62, 0)); fountain.add(mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.6, 10), mat(0x9fb3c8), 0, 1.2, 0));
  g.add(fountain);
  return g;
}
export function buildMansionEstate() {
  const group = new THREE.Group(); group.position.set(0, 0, 32); group.rotation.y = Math.PI; group.scale.setScalar(0.7);
  const house = mansion(); house.name = 'mansion-building'; group.add(house);
  // The path, door, cars and fountain all share the same front-facing transform.
  group.add(mesh(new THREE.BoxGeometry(2.6, 0.08, 4), mat(0xe8d3a8), 0, 0.04, 5.3, false));
  for (const [x, z, color, style] of [[-7, 9, 0xff6b6b, 'sporty'], [7, 9, 0xf6b53d, 'sporty'], [-7, 13, 0x2b2a33, 'classic']]) {
    const vehicle = car(color, style, 1.1); vehicle.position.set(x, 0, z); vehicle.rotation.y = Math.PI / 2; group.add(vehicle);
  }
  group.updateMatrixWorld(true);
  const entrance = group.localToWorld(new THREE.Vector3(0, 0, 5));
  const front = new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld);
  const fountain = group.localToWorld(new THREE.Vector3(6, 0, 8));
  return { group, entrance, front, obstacles: [{ x: 0, z: 32, r: 6.5 * 0.7 }, { x: fountain.x, z: fountain.z, r: 2.4 * 0.7 }] };
}

export function mansionViewDistance(aspect) {
  // Portrait screens need more horizontal breathing room around the facade.
  return Math.min(42, 18 / Math.min(1, Math.max(0.4, aspect)));
}
function hq() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(6, 12, 6), mat(0x5cc8ff), 0, 6, 0));
  for (let y = 1.5; y < 12; y += 2) for (const x of [-2, 0, 2]) g.add(mesh(new THREE.BoxGeometry(1.1, 1.1, 0.2), mat(PALETTE.white), x, y, 3.05, false));
  g.add(mesh(new THREE.BoxGeometry(7, 0.6, 7), mat(PALETTE.ink), 0, 12.3, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), mat(PALETTE.ink), 0, 14, 0));
  g.add(mesh(new THREE.SphereGeometry(0.5, 10, 10), mat(PALETTE.coral, { emissive: PALETTE.coral, emissiveIntensity: 0.6 }), 0, 15.5, 0));
  return g;
}
function cloud() {
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(1.4 - i * 0.2, 8, 6), m, i * 1.4 - 2, (i % 2) * 0.4, 0, false));
  return g;
}

/* ---------- World ---------- */
export class World {
  constructor(canvas, { touch = false } = {}) {
    this.canvas = canvas; this.touch = touch;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !touch;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 260);
    this.yaw = 0; this.pitch = 0.42; this.distance = 9.5;
    this.keys = new Set(); this.joy = { x: 0, y: 0 }; this.jumpQueued = false;
    this.velocity = new THREE.Vector3(); this.sprint = false; this.jumpBuffer = 0;
    this.reducedMotion = false; this.onJump = () => {}; this.onLand = () => {};
    this.player = { pos: new THREE.Vector3(0, 0, 10), vy: 0, heading: Math.PI, speed: 0, grounded: true };
    this.obstacles = []; this.interactables = []; this.coins = new Map(); this.onCoin = () => {}; this.frozen = false;
    this.barriga = null; this.rentActive = false; this.onFound = () => {};
    this.clock = new THREE.Clock(); this.time = 0; this.available = () => true;
    this.stage = 'beginning';
    this.#buildScene();
    this.#buildEffects();
    this.#bindInput();
    this.resize();
  }
  #buildScene() {
    const { scene } = this;
    scene.background = new THREE.Color(PALETTE.sky);
    scene.fog = new THREE.Fog(PALETTE.sky, 60, 140);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x9dd39a, 1.1); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4d6, 2.2); this.sun.position.set(30, 50, 20); this.sun.castShadow = !this.touch;
    Object.assign(this.sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, far: 140 }); this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0005; scene.add(this.sun);
    this.city = new THREE.Group(); scene.add(this.city);
    this.moon = new THREE.Group(); this.moon.visible = false; scene.add(this.moon);
    const ground = mesh(new THREE.CircleGeometry(80, 48), mat(0x9dd39a)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.city.add(ground);
    const road = mat(0x7d7f8c);
    for (const [w, h, x, z] of [[70, 6, 0, 0], [6, 70, 0, 0], [70, 5, 0, -24], [5, 70, -22, 0], [5, 70, 22, 0], [70, 5, 0, 24]]) { const r = mesh(new THREE.PlaneGeometry(w, h), road, x, 0.02, z, false); r.rotation.x = -Math.PI / 2; r.receiveShadow = true; this.city.add(r); }
    const plaza = mesh(new THREE.CircleGeometry(7, 24), mat(0xe8d3a8), 0, 0.03, 0, false); plaza.rotation.x = -Math.PI / 2; this.city.add(plaza);
    // Road markings give the town scale and readable routes through the buildings.
    const stripeGeometry = new THREE.PlaneGeometry(0.15, 1.6), stripeMaterial = mat(0xfff0b5);
    for (let v = -32; v <= 32; v += 4) {
      if (Math.abs(v) < 8) continue;
      for (const horizontal of [false, true]) { const stripe = mesh(stripeGeometry, stripeMaterial, horizontal ? v : 0, 0.045, horizontal ? 0 : v, false); stripe.rotation.x = -Math.PI / 2; if (horizontal) stripe.rotation.z = Math.PI / 2; this.city.add(stripe); }
    }
    const fountainBase = mesh(new THREE.CylinderGeometry(1.8, 2, 0.7, 16), mat(0x9fb3c8), 0, 0.35, 0); this.city.add(fountainBase); this.city.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16), mat(0x5cc8ff), 0, 0.72, 0)); this.obstacles.push({ x: 0, z: 0, r: 2.3 });
    this.fountainDrops = [];
    const dropGeometry = new THREE.SphereGeometry(0.08, 6, 4), dropMaterial = new THREE.MeshBasicMaterial({ color: 0xc6f4ff });
    for (let i = 0; i < 24; i++) { const drop = mesh(dropGeometry, dropMaterial, 0, 1, 0, false); this.city.add(drop); this.fountainDrops.push(drop); }
    // Job buildings
    for (const job of JOBS) {
      const [x, z] = job.location; const g = building(6, 4 + (job.pay === 900 ? 1.5 : 0), 5, PALETTE[job.color]); g.position.set(x, 0, z);
      g.lookAt(0, 0, 0); g.rotation.x = 0; g.rotation.z = 0;
      const s = sign(job.name, '#fffaf0'); s.position.set(0, 3.9 + (job.pay === 900 ? 1.5 : 0), 2.7); g.add(s);
      const closed = sign('OPENS LATER', '#ff6b6b'); closed.position.set(0, 2.6 + (job.pay === 900 ? 1.5 : 0), 2.75); closed.scale.setScalar(0.6); closed.visible = job.pay === 900; g.add(closed); g.userData.closed = closed;
      this.city.add(g); this.obstacles.push({ x, z, r: 4.2 });
      g.updateMatrixWorld(true);
      const door = g.localToWorld(new THREE.Vector3(0, 0, 3.6));
      this.interactables.push({ id: job.id, type: 'job', label: `Work at ${job.name}`, position: door, radius: 3, group: g });
    }
    // Shops
    const truck = new THREE.Group(); truck.position.set(...[PLACES.food.position[0], 0, PLACES.food.position[1]]);
    truck.add(mesh(new THREE.BoxGeometry(4, 2.4, 2), mat(PALETTE.coral), 0, 1.6, 0)); truck.add(mesh(new THREE.BoxGeometry(3, 0.3, 1.2), mat(PALETTE.sun), 0, 2.9, 0.8)).rotation.x = 0.3; truck.add(mesh(new THREE.BoxGeometry(2.4, 0.9, 0.2), mat(PALETTE.cream), 0, 2, 1.05));
    for (const x of [-1.3, 1.3]) { const w = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), mat(PALETTE.ink), x, 0.4, 0.9); w.rotation.x = Math.PI / 2; truck.add(w); }
    const ts = sign('FOOD TRUCK · $60', '#ffd94d'); ts.position.set(0, 3.6, 0.6); ts.scale.setScalar(0.8); truck.add(ts); this.city.add(truck);
    const shop = building(4.5, 3.6, 4, PALETTE.lilac, PALETTE.gold); shop.position.set(PLACES.clothes.position[0], 0, PLACES.clothes.position[1]); const cs = sign('CLOTHES · $120', '#c8b4f2'); cs.position.set(0, 4.1, 2.2); cs.scale.setScalar(0.8); shop.add(cs); this.city.add(shop);
    this.obstacles.push({ x: PLACES.food.position[0], z: PLACES.food.position[1], r: 2.4 }, { x: PLACES.clothes.position[0], z: PLACES.clothes.position[1], r: 2.8 });
    this.interactables.push({ id: 'food', type: 'shop', label: 'Buy a meal ($60)', position: new THREE.Vector3(PLACES.food.position[0], 0, PLACES.food.position[1] + 3), radius: 3 });
    this.interactables.push({ id: 'clothes', type: 'shop', label: 'Buy streetwear ($120)', position: new THREE.Vector3(PLACES.clothes.position[0], 0, PLACES.clothes.position[1] + 3), radius: 3 });
    // Bank
    const bank = building(5, 4, 4, PALETTE.sun, PALETTE.sage); bank.position.set(-12, 0, 20); const bs = sign('PIGGY BANK · 2%', '#ffd94d'); bs.position.set(0, 4.6, 2.1); bs.scale.setScalar(0.85); bank.add(bs); this.city.add(bank); this.obstacles.push({ x: -12, z: 20, r: 3.2 });
    this.interactables.push({ id: 'bank', type: 'bank', label: 'Visit the Piggy Bank', position: new THREE.Vector3(-12, 0, 23), radius: 3 });
    // Home plot
    this.plot = new THREE.Group(); this.plot.position.set(PLACES.home.position[0], 0, PLACES.home.position[1]); this.city.add(this.plot);
    const lot = mesh(new THREE.CircleGeometry(6, 20), mat(0xc9e2a2), 0, 0.04, 0, false); lot.rotation.x = -Math.PI / 2; this.plot.add(lot);
    this.plotSign = sign('YOUR FUTURE HOME', '#fffaf0'); this.plotSign.position.set(0, 2.2, 5); this.plotSign.scale.setScalar(0.7); this.plot.add(this.plotSign);
    this.assetGroup = new THREE.Group(); this.plot.add(this.assetGroup);
    this.interactables.push({ id: 'home', type: 'home', label: 'Customize your place', position: new THREE.Vector3(PLACES.home.position[0], 0, PLACES.home.position[1] + 6), radius: 3.2 });
    // HQ
    this.hqGroup = hq(); this.hqGroup.position.set(PLACES.hq.position[0], 0, PLACES.hq.position[1]); this.hqGroup.visible = false; const hs = sign('LLAMA LABS', '#5cc8ff'); hs.position.set(0, 11, 3.2); this.hqGroup.add(hs); this.city.add(this.hqGroup);
    this.hqObstacle = { x: PLACES.hq.position[0], z: PLACES.hq.position[1], r: 0 }; this.obstacles.push(this.hqObstacle);
    this.interactables.push({ id: 'hq', type: 'hq', label: 'Run Llama Labs', position: new THREE.Vector3(PLACES.hq.position[0], 0, PLACES.hq.position[1] + 4.5), radius: 3.5 });
    // Quests + BBQ
    this.questMarkers = {};
    for (const id of ['picnic', 'explorer', 'helper']) {
      const [x, z] = PLACES[id].position; const m = new THREE.Group(); m.position.set(x, 0, z);
      m.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), mat(PALETTE.ink), 0, 1.5, 0)); m.add(mesh(new THREE.BoxGeometry(1.4, 0.8, 0.05), mat(PALETTE.sun), 0.7, 2.6, 0));
      const star = mesh(new THREE.OctahedronGeometry(0.5), mat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.4 }), 0, 4, 0); m.add(star); m.userData.star = star; m.visible = false; this.city.add(m); this.questMarkers[id] = m;
      this.interactables.push({ id, type: 'quest', label: PLACES[id].label, position: new THREE.Vector3(x, 0, z), radius: 3 });
    }
    this.bbq = new THREE.Group(); this.bbq.position.set(PLACES.bbq.position[0], 0, PLACES.bbq.position[1]); this.bbq.visible = false;
    this.bbq.add(mesh(new THREE.BoxGeometry(2.2, 0.8, 1.2), mat(PALETTE.ink), 0, 1, 0)); for (const x of [-0.9, 0.9]) this.bbq.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), mat(PALETTE.ink), x, 0.5, 0));
    this.bbq.add(mesh(new THREE.BoxGeometry(1.8, 0.1, 0.9), mat(PALETTE.coral, { emissive: PALETTE.coral, emissiveIntensity: 0.6 }), 0, 1.42, 0));
    this.bbq.add(mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.7, 10), mat(0x7a4a1d), 2, 0.35, 0.6)); this.bbq.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), mat(0xd0d0d0), 2.1, 0.9, 0.6));
    const bsg = sign('CHURRASCO!', '#ff6b6b'); bsg.position.set(0, 3, 0); bsg.scale.setScalar(0.7); this.bbq.add(bsg); this.city.add(this.bbq);
    this.interactables.push({ id: 'bbq', type: 'bbq', label: 'Start the BBQ party', position: new THREE.Vector3(PLACES.bbq.position[0], 0, PLACES.bbq.position[1] + 2), radius: 3 });
    // Nature + hiding spots
    const rnd = (n, s) => ((Math.sin(n * 127.1 + s * 311.7) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < 26; i++) { const a = rnd(i, 1) * Math.PI * 2, r = 30 + rnd(i, 2) * 12; const t = tree(0.9 + rnd(i, 3) * 0.6); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); this.city.add(t); this.obstacles.push({ x: t.position.x, z: t.position.z, r: 0.6 }); }
    this.hiding = HIDING_SPOTS.map(([x, z]) => { const b = bush(); b.position.set(x, 0, z); this.city.add(b); return new THREE.Vector3(x, 0, z); });
    this.clouds = []; for (let i = 0; i < 9; i++) { const c = cloud(); c.position.set(rnd(i, 4) * 120 - 60, 22 + rnd(i, 5) * 8, rnd(i, 6) * 120 - 60); c.scale.setScalar(1.2 + rnd(i, 7)); this.city.add(c); this.clouds.push(c); }
    // Coins
    for (let i = 0; i < COIN_SPOTS.length; i++) { const c = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 16), mat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.35 }), COIN_SPOTS[i][0], 1, COIN_SPOTS[i][1]); c.rotation.x = Math.PI / 2; this.city.add(c); this.coins.set(i, c); }
    // Player + friends
    this.playerMesh = buildLlama(0xfff1d6, 'Street dreamer'); this.scene.add(this.playerMesh);
    this.girlfriend = buildLlama(0xffe1ea, 'Girlfriend'); this.girlfriend.visible = false; this.scene.add(this.girlfriend);
    this.barriga = buildBarriga(); this.barriga.visible = false; this.scene.add(this.barriga);
    // Townsfolk: wandering llamas you can bonk into the air
    this.npcs = []; this.onBonk = () => {};
    const looks = [[0xfff1d6, 'Street dreamer'], [0xe8caa4, 'Fresh streetwear'], [0xd9b99b, 'Street dreamer'], [0xffe1ea, 'Girlfriend'], [0xc9b7a2, 'Fresh streetwear'], [0xf3dcc0, 'Street dreamer']];
    looks.forEach(([color, costume], i) => {
      const m = buildLlama(color, costume); m.scale.setScalar(0.85); this.city.add(m);
      const npc = { mesh: m, pos: new THREE.Vector3(Math.cos(i * 1.05) * 14, 0, Math.sin(i * 1.05) * 14), target: new THREE.Vector3(), vy: 0, spin: 0, state: 'walk', timer: rnd(i, 12) * 4, speed: 0 };
      this.#roam(npc); this.npcs.push(npc);
    });
    // Moon
    const moonGround = mesh(new THREE.CircleGeometry(60, 40), mat(0xb9bcc9)); moonGround.rotation.x = -Math.PI / 2; this.moon.add(moonGround);
    for (let i = 0; i < 14; i++) { const cr = mesh(new THREE.TorusGeometry(1 + rnd(i, 8) * 2, 0.25, 6, 20), mat(0x9a9db0), rnd(i, 9) * 80 - 40, 0.1, rnd(i, 10) * 80 - 40, false); cr.rotation.x = Math.PI / 2; this.moon.add(cr); }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.35, roughness: 0.05 })); dome.position.set(0, 0, -12); this.moon.add(dome);
    const moonHome = house(PALETTE.lilac, 'sporty'); moonHome.position.set(0, 0, -12); this.moon.add(moonHome);
    const earth = mesh(new THREE.SphereGeometry(6, 24, 20), mat(0x3c8dd6, { emissive: 0x1d4f8a, emissiveIntensity: 0.5 }), -30, 26, -60, false); this.moon.add(earth); this.moon.add(mesh(new THREE.SphereGeometry(6.05, 24, 20), mat(0x7cc46e, { transparent: true, opacity: 0.6 }), -30, 26, -60, false));
    const rocket = new THREE.Group(); rocket.position.set(10, 0, -6); rocket.add(mesh(new THREE.CylinderGeometry(1, 1.2, 6, 14), mat(PALETTE.white), 0, 3.5, 0)); rocket.add(mesh(new THREE.ConeGeometry(1, 2, 14), mat(PALETTE.coral), 0, 7.5, 0)); for (let i = 0; i < 3; i++) rocket.add(mesh(new THREE.BoxGeometry(0.3, 1.6, 1.4), mat(PALETTE.coral), Math.cos(i * 2.1) * 1.3, 0.8, Math.sin(i * 2.1) * 1.3)); this.moon.add(rocket);
    const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => (rnd(i, 11 + (i % 3)) - 0.5) * 240), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.6 })); this.moon.add(stars);
    this.interactables.push({ id: 'moonhouse', type: 'moon', label: 'Sign the Moon deal with Elo Musk', position: new THREE.Vector3(0, 0, -7), radius: 4 });
  }
  #bindInput() {
    window.addEventListener('keydown', e => {
      if (this.frozen || e.target.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.code === 'Space' && !e.repeat) this.jumpQueued = true;
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.resetInput());
    let drag = null;
    const start = (id, x, y) => { if (!this.frozen) { drag = { id, x, y }; this.canvas.setPointerCapture(id); } }, move = (id, x, y) => { if (this.frozen || !drag || drag.id !== id) return; this.yaw -= (x - drag.x) * 0.006; this.pitch = THREE.MathUtils.clamp(this.pitch + (y - drag.y) * 0.004, 0.08, 1.2); drag.x = x; drag.y = y; }, end = id => { if (drag?.id === id) drag = null; };
    this.canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45) return; start(e.pointerId, e.clientX, e.clientY); });
    window.addEventListener('pointermove', e => move(e.pointerId, e.clientX, e.clientY));
    window.addEventListener('pointerup', e => end(e.pointerId)); window.addEventListener('pointercancel', e => end(e.pointerId));
    this.canvas.addEventListener('wheel', e => { this.distance = THREE.MathUtils.clamp(this.distance + e.deltaY * 0.01, 5, 16); }, { passive: true });
    this.canvas.addEventListener('lostpointercapture', e => end(e.pointerId));
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  resetInput() { this.keys.clear(); this.joy.x = this.joy.y = 0; this.sprint = false; this.jumpQueued = false; this.jumpBuffer = 0; this.velocity.set(0, 0, 0); }
  applySettings(settings) {
    this.reducedMotion = settings.reducedMotion;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.quality === 'high' ? 2 : 1.25));
    this.renderer.shadowMap.enabled = settings.quality === 'high';
    this.sun.castShadow = settings.quality === 'high';
    this.resize();
    if (settings.reducedMotion) this.particles.forEach(p => { p.life = 0; });
  }
  #buildEffects() {
    this.guide = new THREE.Group(); this.guide.visible = false; this.scene.add(this.guide);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 40), new THREE.MeshBasicMaterial({ color: 0xffd94d, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; this.guide.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 4.5; this.guide.add(beam);
    this.particles = Array.from({ length: 96 }, () => ({ pos: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0, total: 1 }));
    this.particleCursor = 0; this.particleDummy = new THREE.Object3D();
    this.particleMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial(), this.particles.length);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.particleMesh);
  }
  burst(position = this.player.pos, color = 0xffd94d, count = 18) {
    if (this.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const index = this.particleCursor++ % this.particles.length, p = this.particles[index];
      p.pos.copy(position); p.pos.y += 0.5;
      p.velocity.set((Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5);
      p.life = p.total = 0.5 + Math.random() * 0.5;
      this.particleMesh.setColorAt(index, new THREE.Color(color));
    }
    this.particleMesh.instanceColor.needsUpdate = true;
  }
  setGuide(target) { this.guide.visible = !!target; if (target) this.guide.position.copy(target.position); }
  #updateEffects(dt) {
    this.guide.children[0].scale.setScalar(this.reducedMotion ? 1 : 1 + Math.sin(this.time * 3) * 0.12);
    this.particles.forEach((p, i) => {
      p.life = Math.max(0, p.life - dt);
      if (p.life) { p.velocity.y -= dt * 10; p.pos.addScaledVector(p.velocity, dt); }
      this.particleDummy.position.copy(p.pos); this.particleDummy.scale.setScalar(p.life / p.total);
      this.particleDummy.updateMatrix(); this.particleMesh.setMatrixAt(i, this.particleDummy.matrix);
    });
    this.particleMesh.instanceMatrix.needsUpdate = true;
  }
  setCostume(name) {
    const { pos } = this.player; const heading = this.playerMesh.rotation.y;
    this.scene.remove(this.playerMesh); disposeGroup(this.playerMesh); this.playerMesh = buildLlama(this.bodyColor ?? 0xfff1d6, name); this.playerMesh.position.copy(pos); this.playerMesh.rotation.y = heading; this.scene.add(this.playerMesh);
  }
  setAsset(asset, color, style) {
    disposeGroup(this.assetGroup);
    this.assetGroup.clear();
    if (asset) this.plotSign.material.map?.dispose();
    if (asset === 'car') { const c = car(new THREE.Color(color), style); c.rotation.y = 0.4; this.assetGroup.add(c); this.plotSign.material.map = textTexture('MY FIRST CAR', '#fffaf0'); }
    else if (asset === 'house') { this.assetGroup.add(house(new THREE.Color(color), style)); this.plotSign.material.map = textTexture('HOME SWEET HOME', '#fffaf0'); }
    this.plotSign.material.needsUpdate = true;
  }
  setStage(stage, state) {
    const previousStage = this.stage;
    this.stage = stage;
    const advanced = ['careers', 'timeskip', 'robbery', 'business', 'moon', 'freeplay'].includes(stage);
    for (const it of this.interactables) if (it.type === 'job' && it.group.userData.closed) it.group.userData.closed.visible = JOBS.find(j => j.id === it.id).pay === 900 && !advanced;
    const rich = ['robbery', 'business', 'moon', 'freeplay'].includes(stage);
    if (rich && !this.mansionGroup) {
      const estate = buildMansionEstate(); this.mansionGroup = estate.group;
      this.city.add(this.mansionGroup); this.obstacles.push(...estate.obstacles);
      this.interactables.push({ id: 'mansion', type: 'mansion', label: 'Enter your mansion', position: estate.entrance, approachDirection: estate.front, radius: 2.5 });
      this.plot.visible = false;
    }
    if (this.mansionGroup) { this.mansionGroup.visible = rich; this.plot.visible = !rich && !!state?.asset || stage === 'purchase' || stage === 'beginning'; }
    this.girlfriend.visible = rich; this.girlfriend.position.set(4, 0, 25); this.girlfriend.rotation.y = Math.PI / 2;
    this.hqGroup.visible = ['business', 'moon', 'freeplay'].includes(stage); this.hqObstacle.r = this.hqGroup.visible ? 4.4 : 0;
    const onMoon = stage === 'moon';
    this.moon.visible = onMoon; this.city.visible = !onMoon;
    this.scene.background.set(onMoon ? 0x0b0d1a : PALETTE.sky); this.scene.fog.color.set(onMoon ? 0x0b0d1a : PALETTE.sky); this.scene.fog.near = onMoon ? 90 : 60;
    this.hemi.intensity = onMoon ? 0.5 : 1.1; this.hemi.groundColor.set(onMoon ? 0x444a66 : 0x9dd39a);
    if (onMoon) { this.player.pos.set(0, 0, 6); this.girlfriend.visible = true; this.girlfriend.position.set(3, 0, 2); this.girlfriend.rotation.y = Math.PI; }
    if (stage === 'robbery' && previousStage !== stage) {
      this.player.pos.set(0, 0, 18); this.player.heading = 0; this.playerMesh.rotation.y = -Math.PI / 2;
      this.yaw = Math.PI; this.pitch = 0.35; this.resetInput();
      const distance = Math.max(this.distance, mansionViewDistance(this.camera.aspect));
      this.camera.position.set(0, 1.6 + Math.sin(this.pitch) * distance, 18 - Math.cos(this.pitch) * distance);
      this.camera.lookAt(0, 1.8, 18);
    }
    for (const id of ['picnic', 'explorer', 'helper']) this.questMarkers[id].visible = stage === 'freeplay' && !state?.sideQuests?.includes(id);
    this.bbq.visible = stage === 'freeplay';
  }
  setCollectibles(ids) { for (const [id, c] of this.coins) c.visible = !ids.includes(id); }
  get playerPosition() { return this.player.pos; }
  nearby() {
    let best = null, bestD = Infinity;
    for (const it of this.interactables) {
      if (it.type === 'moon' ? this.stage !== 'moon' : this.stage === 'moon') continue;
      if (it.type === 'home' && !this.plot.visible) continue;
      if (it.approachDirection && this.player.pos.clone().sub(it.position).dot(it.approachDirection) < 0) continue;
      const d = it.position.distanceTo(this.player.pos);
      if (d < it.radius && d < bestD && this.available(it)) { best = it; bestD = d; }
    }
    return best;
  }
  isHidden() { return this.hiding.some(h => h.distanceTo(this.player.pos) < 2.1); }
  startRent() {
    this.rentActive = true; this.barriga.visible = true;
    const a = Math.random() * Math.PI * 2; this.barriga.position.set(this.player.pos.x + Math.cos(a) * 26, 0, this.player.pos.z + Math.sin(a) * 26);
    this.barrigaTarget = this.player.pos.clone(); this.barrigaLostTimer = 0;
  }
  stopRent() { this.rentActive = false; this.barriga.visible = false; }
  #updateBarriga(dt) {
    if (!this.rentActive || this.frozen) return;
    const b = this.barriga; const hidden = this.isHidden();
    if (!hidden) { this.barrigaTarget.copy(this.player.pos); this.barrigaLostTimer = 0; }
    else { this.barrigaLostTimer += dt; if (this.barrigaLostTimer > 2.5 && b.position.distanceTo(this.barrigaTarget) < 1.5) { this.barrigaTarget.set(this.player.pos.x + (Math.random() - 0.5) * 24, 0, this.player.pos.z + (Math.random() - 0.5) * 24); } }
    const dir = this.barrigaTarget.clone().sub(b.position); dir.y = 0; const dist = dir.length();
    if (dist > 0.3) { dir.normalize(); b.position.addScaledVector(dir, Math.min(dist, dt * 4.2)); b.rotation.y = Math.atan2(dir.x, dir.z) - Math.PI / 2; }
    b.position.y = Math.abs(Math.sin(this.time * 12)) * 0.15;
    if (!hidden && b.position.distanceTo(this.player.pos) < 2.6) { this.onFound(); }
  }
  #roam(npc) {
    const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 30;
    npc.target.set(Math.cos(a) * r, 0, Math.sin(a) * r); npc.timer = 4 + Math.random() * 6;
  }
  #updateNpcs(dt) {
    if (this.stage === 'moon') return;
    const p = this.player;
    for (const npc of this.npcs) {
      const { mesh: m } = npc;
      if (npc.state === 'fly') {
        npc.vy -= 22 * dt; npc.pos.y += npc.vy * dt; npc.spin += dt * 9; npc.pos.addScaledVector(npc.dir, dt * 6);
        m.rotation.x = npc.spin; m.rotation.z = npc.spin * 0.6;
        if (npc.pos.y <= 0) { npc.pos.y = 0; npc.state = 'dazed'; npc.timer = 1.6; m.rotation.x = m.rotation.z = 0; }
      } else if (npc.state === 'dazed') {
        npc.timer -= dt; m.rotation.z = Math.sin(this.time * 20) * 0.15; npc.speed = 0;
        if (npc.timer <= 0) { npc.state = 'walk'; m.rotation.z = 0; this.#roam(npc); }
      } else {
        npc.timer -= dt; const dir = npc.target.clone().sub(npc.pos); dir.y = 0; const d = dir.length();
        if (d < 0.8 || npc.timer <= 0) this.#roam(npc);
        else { dir.normalize(); npc.pos.addScaledVector(dir, dt * 2.4); npc.speed = 2.4; const t = Math.atan2(dir.x, dir.z) - Math.PI / 2; let diff = t - m.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); m.rotation.y += diff * Math.min(1, dt * 6); }
        for (const o of this.obstacles) { const dx = npc.pos.x - o.x, dz = npc.pos.z - o.z, dd = Math.hypot(dx, dz); if (dd < o.r + 0.6 && dd > 0.001) { const push = (o.r + 0.6 - dd) / dd; npc.pos.x += dx * push; npc.pos.z += dz * push; } }
        // bonk: run or land on a townsfolk llama and it goes flying
        const dx = npc.pos.x - p.pos.x, dz = npc.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        if (dist < 1.7 && (p.speed > 5.5 || (!p.grounded && p.vy < -2))) {
          npc.state = 'fly'; npc.vy = 8 + Math.random() * 3; npc.spin = 0; npc.dir = new THREE.Vector3(dx, 0, dz).normalize(); this.onBonk(npc);
        } else if (dist > 0.001 && dist < 1.4) { npc.pos.x += (dx / dist) * (1.4 - dist); npc.pos.z += (dz / dist) * (1.4 - dist); }
      }
      const swing = Math.sin(this.time * 12 + npc.pos.x) * 0.5 * (npc.speed / 2.4);
      m.userData.legs.forEach((l, i) => (l.rotation.z = swing * (i % 2 ? -1 : 1) * (i < 2 ? 1 : -1)));
      m.position.copy(npc.pos);
    }
  }
  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt;
    const p = this.player;
    const input = movementInput(this.keys, this.joy, this.yaw);
    const sprinting = !this.frozen && (this.sprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && input.amount > 0;
    const topSpeed = sprinting ? 11.5 : 7.5;
    const targetVelocity = new THREE.Vector3(input.x * topSpeed, 0, input.z * topSpeed);
    if (this.frozen) this.velocity.set(0, 0, 0);
    else this.velocity.lerp(targetVelocity, 1 - Math.exp(-18 * dt));
    p.pos.addScaledVector(this.velocity, dt);
    if (this.velocity.lengthSq() > 0.01) p.heading = Math.atan2(this.velocity.x, this.velocity.z);
    p.speed = this.velocity.length();
    if (this.jumpQueued) this.jumpBuffer = 0.15;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (this.jumpBuffer > 0 && p.grounded && !this.frozen) { p.vy = 8.5; p.grounded = false; this.jumpBuffer = 0; this.burst(p.pos, 0xfffaf0, 8); this.onJump(); }
    this.jumpQueued = false;
    if (!this.frozen) {
      p.vy -= (this.stage === 'moon' ? 11 : 22) * dt; p.pos.y = Math.max(0, p.pos.y + p.vy * dt);
      if (p.pos.y === 0) { if (!p.grounded) { this.burst(p.pos, 0xfffaf0, 12); this.onLand(); } p.vy = 0; p.grounded = true; }
    }
    // bounds + obstacles
    const limit = this.stage === 'moon' ? 40 : 46; const r = Math.hypot(p.pos.x, p.pos.z); if (r > limit) { p.pos.x *= limit / r; p.pos.z *= limit / r; }
    if (this.stage !== 'moon') for (const o of this.obstacles) { const dx = p.pos.x - o.x, dz = p.pos.z - o.z, d = Math.hypot(dx, dz); if (d < o.r + 0.6 && d > 0.001) { const push = (o.r + 0.6 - d) / d; p.pos.x += dx * push; p.pos.z += dz * push; } }
    // animate player
    const m = this.playerMesh; m.position.copy(p.pos);
    let target = p.heading - Math.PI / 2; let diff = target - m.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); m.rotation.y += diff * Math.min(1, dt * 12);
    const { legs, body, head } = m.userData; const swing = Math.sin(this.time * 14) * 0.6 * (p.speed / 7.5);
    legs.forEach((l, i) => (l.rotation.z = swing * (i % 2 ? -1 : 1) * (i < 2 ? 1 : -1)));
    body.position.y = (head ? 0 : 0) + Math.abs(Math.sin(this.time * 14)) * 0.08 * (p.speed / 7.5) + (m.userData.costume === 'Grand hotel concierge' ? 0.55 : 0);
    head.rotation.z = Math.sin(this.time * 2) * 0.05;
    // friends / decor
    if (this.girlfriend.visible) this.girlfriend.userData.head.rotation.z = Math.sin(this.time * 1.5) * 0.08;
    for (const [, c] of this.coins) { c.rotation.z += dt * 2.5; c.position.y = 1 + Math.sin(this.time * 3 + c.position.x) * 0.15; }
    for (const [id, c] of this.coins) if (!this.frozen && this.stage !== 'moon' && c.visible && c.position.distanceTo(p.pos) < 1.8) { this.burst(c.position, 0xffd94d, 22); c.visible = false; this.onCoin(id); }
    for (const c of this.clouds) { c.position.x += dt * 0.6; if (c.position.x > 70) c.position.x = -70; }
    for (const q of Object.values(this.questMarkers)) if (q.visible) { q.userData.star.rotation.y += dt * 2; q.userData.star.position.y = 4 + Math.sin(this.time * 2) * 0.3; }
    this.#updateBarriga(dt);
    if (!this.frozen) this.#updateNpcs(dt);
    this.#updateEffects(dt);
    if (this.stage !== 'moon') this.fountainDrops.forEach((drop, i) => { const t = ((this.reducedMotion ? 0 : this.time * 0.65) + i / 24) % 1, a = i * 2.4; drop.position.set(Math.cos(a) * t * 1.3, 0.85 + Math.sin(t * Math.PI) * 2.1, Math.sin(a) * t * 1.3); });
    // camera
    const mansionProximity = this.mansionGroup?.visible && this.stage !== 'moon' ? THREE.MathUtils.clamp((24 - Math.hypot(p.pos.x, p.pos.z - 32)) / 10, 0, 1) : 0;
    const framingDistance = THREE.MathUtils.lerp(this.distance, Math.max(this.distance, mansionViewDistance(this.camera.aspect)), mansionProximity);
    const desired = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(framingDistance).add(p.pos).add(new THREE.Vector3(0, 1.6, 0));
    desired.y = Math.max(desired.y, 0.8);
    this.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    this.camera.lookAt(p.pos.x, p.pos.y + 1.8, p.pos.z);
    const fov = this.reducedMotion ? 58 : (sprinting ? 64 : 58);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 1 - Math.exp(-5 * dt)); this.camera.updateProjectionMatrix(); }
    this.sun.position.set(p.pos.x + 30, 50, p.pos.z + 20); this.sun.target.position.copy(p.pos); this.sun.target.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
  }
}

/* Small standalone preview renderer for character cards */
export function preview(canvas, costume, bodyColor = 0xfff1d6, reducedMotion = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(canvas.clientWidth || 160, canvas.clientHeight || 160, false);
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x9dd39a, 1.4)); const l = new THREE.DirectionalLight(0xffffff, 2); l.position.set(3, 6, 4); scene.add(l);
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 50); cam.position.set(5.5, 3.2, 5.5); cam.lookAt(0, 1.4, 0);
  const llama = buildLlama(bodyColor, costume); scene.add(llama);
  let raf, last = performance.now(); const tick = now => { if (!reducedMotion && !document.hidden) llama.rotation.y += Math.min(0.05, (now - last) / 1000) * 0.72; last = now; renderer.render(scene, cam); raf = requestAnimationFrame(tick); }; tick(last);
  return () => { cancelAnimationFrame(raf); disposeGroup(scene); renderer.dispose(); };
}
