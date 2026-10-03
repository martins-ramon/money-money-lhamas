import * as THREE from 'three';
import { buildLlama } from './world.js';

function disposeAvatar(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => { m.map?.dispose(); m.dispose(); });
}

function nameTag(name) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#29293ee6'; ctx.beginPath(); ctx.roundRect(0, 0, 512, 96, 30); ctx.fill();
  ctx.fillStyle = '#fffaf0'; ctx.font = 'bold 38px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 48, 475);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false });
  const sprite = new THREE.Sprite(material); sprite.scale.set(2.4, .45, 1); sprite.position.y = 3.7;
  return sprite;
}

export class PeerView {
  constructor(world) { this.world = world; this.peers = new Map(); }

  set(players) {
    this.world.onlinePeers = players;
    const present = new Set(players.map(p => p.id));
    for (const [id, record] of this.peers) if (!present.has(id)) { this.remove(record); this.peers.delete(id); }
    for (const peer of players) {
      let record = this.peers.get(peer.id);
      if (!record) {
        const group = new THREE.Group(), label = nameTag(peer.name);
        group.add(label); this.world.scene.add(group);
        record = { group, label, data: peer, visualKey: null, vehicleType: null, avatar: null, vehicle: null };
        group.position.set(peer.x, peer.y, peer.z);
        this.peers.set(peer.id, record);
      }
      const key = `${peer.character}|${peer.costume}`;
      if (record.visualKey !== key) {
        if (record.avatar) { record.group.remove(record.avatar); disposeAvatar(record.avatar); }
        record.avatar = buildLlama(peer.character === 'carlos' ? 0xe8caa4 : 0xfff1d6, peer.costume);
        record.group.add(record.avatar); record.visualKey = key;
      }
      if (record.vehicleType !== peer.vehicle) {
        // Transport clones share the world's geometry and materials.
        if (record.vehicle) record.group.remove(record.vehicle);
        record.vehicle = peer.vehicle ? this.world.createVehicleMesh(peer.vehicle) : null;
        if (record.vehicle) record.group.add(record.vehicle);
        record.vehicleType = peer.vehicle;
      }
      record.data = peer;
    }
  }

  update(dt, time) {
    for (const record of this.peers.values()) {
      const p = record.data;
      record.group.visible = p.location === this.world.location;
      if (!record.group.visible) continue;
      const destination = new THREE.Vector3(p.x, p.y, p.z);
      const moving = record.group.position.distanceTo(destination) > .08;
      if (record.group.position.distanceTo(destination) > 20) record.group.position.copy(destination);
      else record.group.position.lerp(destination, 1 - Math.exp(-14 * dt));
      const heading = p.heading - Math.PI / 2;
      const difference = Math.atan2(Math.sin(heading - record.avatar.rotation.y), Math.cos(heading - record.avatar.rotation.y));
      record.avatar.rotation.y += difference * Math.min(1, dt * 14);
      const { body, legs } = record.avatar.userData;
      const dance = p.dancing && !this.world.reducedMotion ? Math.sin(time * 9) : 0;
      body.rotation.x = dance * .16; body.position.y = Math.abs(dance) * .25 + (p.costume === 'Grand hotel concierge' ? .55 : 0);
      legs.forEach((leg, i) => { leg.rotation.z = (p.dancing ? dance * .6 : moving ? Math.sin(time * 13) * .5 : 0) * (i % 2 ? -1 : 1); });
      record.avatar.scale.setScalar(p.vehicle && p.vehicle !== 'glider' ? .65 : 1);
      record.avatar.position.y = p.vehicle === 'yacht' ? 3 : p.vehicle === 'boat' ? 1.45 : p.vehicle === 'car' ? 1.2 : 0;
      for (const thruster of record.avatar.userData.thrusters || []) thruster.visible = p.flying;
      for (const [i, wing] of (record.avatar.userData.wings || []).entries()) wing.rotation.x = this.world.reducedMotion ? 0 : Math.sin(time * (p.flying ? 8 : 2)) * (p.flying ? .45 : .08) * (i ? -1 : 1);
      if (record.vehicle) { record.vehicle.position.set(0, 0, 0); record.vehicle.rotation.y = heading; }
    }
  }

  remove(record) {
    this.world.scene.remove(record.group);
    disposeAvatar(record.avatar);
    record.label.material.map.dispose(); record.label.material.dispose();
  }

  clear() { this.set([]); }
}
