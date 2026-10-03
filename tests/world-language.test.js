import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/world.js';
import { getLanguage, setLanguage } from '../src/i18n.js';
import { worldText } from '../src/world-localization.js';
import { FINANCE_MISSIONS, financeMissions } from '../src/finance-missions.js';

test('language switches update signs and prompts without resetting an active world', () => {
  const previousLanguage = getLanguage(), previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      const canvas = { width: 0, height: 0 };
      canvas.getContext = () => ({
        beginPath() {}, roundRect() {}, fill() {}, stroke() {},
        measureText(text) { return { width: text.length * 12 }; },
        fillText(text) { canvas.drawnText = text; },
      });
      return canvas;
    },
  };
  try {
    setLanguage('en');
    const world = Object.create(World.prototype);
    const initialTexture = new THREE.Texture();
    let disposalCount = 0;
    initialTexture.addEventListener('dispose', () => disposalCount++);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: initialTexture }));
    sign.userData = { textSource: 'BEACH · MARINA', textBackground: '#8fd4ff', renderedText: 'BEACH · MARINA' };
    world.scene = new THREE.Group(); world.scene.add(sign);
    const position = new THREE.Vector3(28, 0, -7);
    const vehicle = { id: 'car-city', type: 'car', label: 'Drive the red car', position };
    world.vehicles = new Map([[vehicle.id, vehicle]]); world.vehicle = vehicle;
    world.player = { pos: position.clone() };
    world.interactables = [
      { id: 'car-city', label: 'Drive the red car', position },
      { id: 'to-moon', label: 'Travel to the Moon' },
      { id: FINANCE_MISSIONS[0].id, label: FINANCE_MISSIONS[0].title },
    ];
    world.refreshLanguage();
    assert.equal(sign.material.map, initialTexture, 'unchanged signs reuse the texture');

    setLanguage('pt'); world.refreshLanguage();
    assert.equal(world.interactables[0].label, 'Dirigir o carro vermelho');
    assert.equal(world.interactables[1].label, 'Viajar para a Lua');
    assert.equal(world.interactables[2].label, financeMissions()[0].title);
    assert.equal(vehicle.label, 'Dirigir o carro vermelho');
    assert.equal(sign.material.map.image.drawnText, 'PRAIA · MARINA');
    assert.equal(disposalCount, 1, 'replaced canvas textures are disposed');
    assert.equal(world.vehicle, vehicle);
    assert.equal(world.interactables[0].position, position);
    assert.deepEqual(world.player.pos.toArray(), [28, 0, -7]);
    assert.deepEqual([...world.vehicles.keys()], ['car-city']);

    const portugueseTexture = sign.material.map;
    world.refreshLanguage();
    assert.equal(sign.material.map, portugueseTexture, 'refreshing the same language does not allocate');
    setLanguage('en'); world.refreshLanguage();
    assert.equal(world.interactables[0].label, 'Drive the red car');
    assert.equal(world.interactables[1].label, 'Travel to the Moon');
    assert.equal(world.interactables[2].label, FINANCE_MISSIONS[0].title);
    assert.equal(sign.material.map.image.drawnText, 'BEACH · MARINA');
    sign.material.map.dispose(); sign.material.dispose(); sign.geometry.dispose();
  } finally {
    setLanguage(previousLanguage);
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('adventure statuses and exit prompts use the active language and retain game identifiers', () => {
  const previousLanguage = getLanguage();
  try {
    const world = Object.create(World.prototype);
    Object.assign(world, { location: 'city', player: { pos: new THREE.Vector3() }, playerMesh: { userData: { costume: 'Cyborg' } }, vehicle: { type: 'yacht' } });
    setLanguage('pt');
    assert.equal(world.getAdventureStatus().label, 'Pilotando um iate');
    assert.equal(world.getAdventureStatus().mode, 'yacht');
    assert.equal(world.getAdventureStatus().canFly, true);
    assert.equal(world.nearby().label, 'Voltar ao cais');
    assert.equal(world.nearby().id, 'exit-vehicle');
    assert.equal(worldText('HOME SWEET HOME'), 'LAR, DOCE LAR');
    setLanguage('en');
    assert.equal(world.getAdventureStatus().label, 'Sailing a yacht');
    assert.equal(world.nearby().label, 'Return to the dock');
  } finally { setLanguage(previousLanguage); }
});
