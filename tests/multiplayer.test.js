import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGameServer } from '../server.mjs';
import { Multiplayer } from '../src/multiplayer.js';

const pose = fields => ({ x: 5, y: 0, z: -12, heading: 1.2, costume: 'Cyborg', character: 'carlos', location: 'city', vehicle: null, dancing: false, flying: false, ...fields });

async function serverFor(t, options) {
  const game = createGameServer(options);
  await new Promise((resolve, reject) => { game.server.once('error', reject); game.server.listen(0, '127.0.0.1', resolve); });
  t.after(() => game.close());
  const baseUrl = `http://127.0.0.1:${game.server.address().port}`;
  async function post(path, body = {}, token, extra = {}) {
    const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra.headers }, body: extra.raw ?? JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }
  const create = async name => { const result = await post('/api/rooms', { name }); assert.equal(result.status, 201); return result.data; };
  return { ...game, baseUrl, post, create };
}

async function eventually(check, message = 'condition was not reached') {
  const deadline = Date.now() + 3000;
  while (!check()) { if (Date.now() > deadline) assert.fail(message); await new Promise(resolve => setTimeout(resolve, 10)); }
}

async function streamFor(t, baseUrl, session) {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}/api/rooms/${session.code}/events`, { headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const result = { players: [], ended: false, close: () => controller.abort() };
  t.after(result.close);
  void (async () => {
    const decoder = new TextDecoder(); let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); let index;
        while ((index = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, index); buffer = buffer.slice(index + 2);
          const data = block.split('\n').find(line => line.startsWith('data: '));
          if (data) result.players = JSON.parse(data.slice(6)).players;
        }
      }
    } catch { /* Aborting a test stream is expected. */ }
    finally { result.ended = true; reader.releaseLock(); }
  })();
  return result;
}

test('two HTTP players share poses, appearance and departures only in their own room', async t => {
  const { create, post, baseUrl } = await serverFor(t);
  const anna = await create('Anna'), other = await create('Other room');
  assert.match(anna.code, /^[A-HJ-NP-Z2-9]{6}$/); assert.equal(anna.token.length, 43);
  const joined = await post(`/api/rooms/${anna.code}/join`, { name: 'Carlos' }); assert.equal(joined.status, 201);
  const carlos = joined.data;
  const a = await streamFor(t, baseUrl, anna), b = await streamFor(t, baseUrl, carlos), isolated = await streamFor(t, baseUrl, other);
  await eventually(() => a.players.length === 2 && b.players.length === 2 && isolated.players.length === 1);
  const snapshot = pose({ location: 'moon', vehicle: 'glider', flying: true, dancing: true, wallet: 1e12 });
  assert.equal((await post(`/api/rooms/${anna.code}/state`, { snapshot }, carlos.token)).status, 200);
  await eventually(() => a.players.find(player => player.id === carlos.playerId)?.flying);
  const remote = a.players.find(player => player.id === carlos.playerId);
  assert.equal(remote.x, snapshot.x); assert.equal(remote.location, 'moon'); assert.equal(remote.vehicle, 'glider'); assert.equal(remote.dancing, true);
  assert.equal(remote.wallet, undefined); assert.equal(remote.token, undefined); assert.equal(isolated.players.length, 1);
  assert.equal((await post(`/api/rooms/${anna.code}/leave`, {}, carlos.token)).status, 200);
  await eventually(() => a.players.length === 1 && b.ended);
  assert.equal((await post(`/api/rooms/${anna.code}/state`, { snapshot: pose() }, carlos.token)).status, 401);
});

test('JSON room sync preserves optional poses and exposes only authorized players from the same room', async t => {
  const { create, post } = await serverFor(t);
  const anna = await create('Anna'), other = await create('Other room');
  const joined = await post(`/api/rooms/${anna.code}/join`, { name: 'Carlos' });
  assert.equal(joined.status, 201);
  const carlos = joined.data, path = `/api/rooms/${anna.code}/sync`;
  assert.equal((await post(path)).status, 401);
  assert.equal((await post(path, {}, other.token)).status, 401);
  const snapshot = pose({ x: 18, location: 'moon', costume: 'Dragon', flying: true, wallet: 1e12, token: 'private' });
  const updated = await post(path, { snapshot }, carlos.token);
  assert.equal(updated.status, 200);
  assert.equal(updated.data.players.length, 2);
  const polled = await post(path, {}, anna.token);
  assert.equal(polled.status, 200);
  assert.deepEqual(polled.data.players, updated.data.players);
  const remote = polled.data.players.find(player => player.id === carlos.playerId);
  assert.equal(remote.x, 18); assert.equal(remote.location, 'moon'); assert.equal(remote.costume, 'Dragon'); assert.equal(remote.flying, true);
  assert.equal(remote.wallet, undefined); assert.equal(remote.token, undefined);
  for (const player of polled.data.players) assert.equal(player.token, undefined);
  const isolated = await post(`/api/rooms/${other.code}/sync`, {}, other.token);
  assert.deepEqual(isolated.data.players.map(player => player.id), [other.playerId]);
  for (const invalid of [null, [], {}, pose({ x: 1000 }), pose({ costume: 'Unknown' })]) {
    assert.equal((await post(path, { snapshot: invalid }, carlos.token)).status, 400);
  }
  const unchanged = await post(path, {}, carlos.token);
  assert.deepEqual(unchanged.data.players.find(player => player.id === carlos.playerId), remote);
  assert.equal((await post(`/api/rooms/${anna.code}/leave`, {}, carlos.token)).status, 200);
  assert.deepEqual((await post(path, {}, anna.token)).data.players.map(player => player.id), [anna.playerId]);
  assert.equal((await post(path, {}, carlos.token)).status, 401);
});

test('JSON sync shares the player request budget and keeps idle seats alive', async t => {
  let clock = 1000;
  const { create, post, rooms } = await serverFor(t, { roomOptions: { now: () => clock, idleMs: 1000 } });
  const session = await create('Host'), path = `/api/rooms/${session.code}/sync`;
  for (let i = 0; i < 25; i++) assert.equal((await post(path, {}, session.token)).status, 200);
  assert.equal((await post(path, {}, session.token)).status, 429);
  assert.equal((await post(`/api/rooms/${session.code}/state`, { snapshot: pose() }, session.token)).status, 429);
  for (let i = 0; i < 4; i++) {
    clock += 750;
    assert.equal((await post(path, {}, session.token)).status, 200);
    rooms.sweep();
  }
  clock += 1001; rooms.sweep();
  assert.equal((await post(path, {}, session.token)).status, 404);
});

test('rooms reject wrong authorization, invalid input, oversized payloads and ninth players', async t => {
  const { create, post, baseUrl } = await serverFor(t);
  for (const name of ['', 'x'.repeat(21), '<script>', 'hello\nworld', 42]) assert.equal((await post('/api/rooms', { name })).status, 400);
  const session = await create('Host'), second = await create('Different room');
  const statePath = `/api/rooms/${session.code}/state`;
  assert.equal((await post(statePath, { snapshot: pose() })).status, 401);
  assert.equal((await post(statePath, { snapshot: pose() }, second.token)).status, 401);
  const unauthorizedEvents = await fetch(`${baseUrl}/api/rooms/${session.code}/events`); assert.equal(unauthorizedEvents.status, 401);
  for (const fields of [{ x: null }, { x: 1000 }, { y: -20 }, { z: '5' }, { heading: 1e9 }, { costume: 'Unknown' }, { location: 'mars' }, { vehicle: 'submarine' }, { dancing: 1 }, { flying: 'yes' }, { character: 'unknown' }]) assert.equal((await post(statePath, { snapshot: pose(fields) }, session.token)).status, 400);
  const infinite = JSON.stringify({ snapshot: pose() }).replace('"x":5', '"x":1e400');
  assert.equal((await post(statePath, {}, session.token, { raw: infinite })).status, 400);
  assert.equal((await post(statePath, {}, session.token, { raw: '{broken' })).status, 400);
  assert.equal((await post(statePath, { excess: 'x'.repeat(5000) }, session.token)).status, 413);
  assert.equal((await post('/api/rooms', { name: 'Cross-site' }, undefined, { headers: { Origin: 'https://other.example' } })).status, 403);
  for (let i = 0; i < 7; i++) assert.equal((await post(`/api/rooms/${session.code}/join`, { name: `Guest ${i}` })).status, 201);
  assert.equal((await post(`/api/rooms/${session.code}/join`, { name: 'Too many' })).status, 409);
});

test('room capacity, state rate limits, disconnected streams and expired seats are cleaned up', async t => {
  let clock = 1000;
  const { create, post, rooms, baseUrl } = await serverFor(t, { roomOptions: { maxRooms: 1, now: () => clock, idleMs: 1000 } });
  const session = await create('Host');
  assert.equal((await post('/api/rooms', { name: 'No room' })).status, 503);
  for (let i = 0; i < 25; i++) assert.equal((await post(`/api/rooms/${session.code}/state`, { snapshot: pose() }, session.token)).status, 200);
  assert.equal((await post(`/api/rooms/${session.code}/state`, { snapshot: pose() }, session.token)).status, 429);
  clock += 100; assert.equal((await post(`/api/rooms/${session.code}/ping`, {}, session.token)).status, 200);
  clock += 100;
  const stream = await streamFor(t, baseUrl, session); stream.close();
  await eventually(() => stream.ended);
  await new Promise(resolve => setTimeout(resolve, 20));
  const replacement = await create('Replacement');
  clock += 1001; rooms.sweep();
  assert.equal((await post(`/api/rooms/${replacement.code}/join`, { name: 'Late' })).status, 404);
  assert.equal((await post('/api/rooms', { name: 'Fresh' })).status, 201);
});

test('browser network clients work through a JSON-only proxy without opening an event stream', async t => {
  const { baseUrl } = await serverFor(t, { roomOptions: { idleMs: 250, sweepMs: 50, heartbeatMs: 50 } });
  let streamRequests = 0, syncRequests = 0;
  const jsonOnlyFetch = async (url, options) => {
    if (new URL(url).pathname.endsWith('/events')) { streamRequests++; throw new Error('This proxy cannot stream responses.'); }
    if (new URL(url).pathname.endsWith('/sync')) syncRequests++;
    const response = await fetch(url, options);
    // A buffering proxy only forwards a response after the upstream body ends.
    return new Response(await response.text(), { status: response.status, headers: response.headers });
  };
  const errors = [], options = { baseUrl, fetch: jsonOnlyFetch, updateMs: 20, heartbeatMs: 50, onError: error => errors.push(error) };
  const a = new Multiplayer(options), b = new Multiplayer(options);
  t.after(() => a.destroy()); t.after(() => b.destroy());
  a.update(pose({ x: -10, costume: 'Superman' }));
  const room = await a.create('Anna'); await b.join(room.toLowerCase(), 'Carlos');
  assert.equal(a.status, 'connected'); assert.equal(b.room, room);
  b.update(pose({ x: 40, vehicle: 'boat' }));
  await eventually(() => a.peers[0]?.x === 40 && b.peers[0]?.x === -10);
  assert.equal(a.peers[0].name, 'Carlos'); assert.notEqual(a.peers[0].id, a.playerId);
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal(a.status, 'connected'); assert.equal(b.status, 'connected');
  await b.leave(); await eventually(() => a.peers.length === 0);
  assert.equal(b.status, 'disconnected'); assert.equal(b.room, null); assert.equal(b.playerId, null);
  assert.equal(streamRequests, 0); assert.ok(syncRequests >= 4);
  assert.deepEqual(errors, []);
});

test('invalid initial sync responses never announce a connected room', async t => {
  const { baseUrl } = await serverFor(t);
  let players;
  const statuses = [], errors = [];
  const client = new Multiplayer({
    baseUrl,
    fetch: (url, options) => new URL(url).pathname.endsWith('/sync')
      ? Promise.resolve(Response.json({ players }))
      : fetch(url, options),
    onChange: state => statuses.push(state.status),
    onError: error => errors.push(error),
  });
  t.after(() => client.destroy());
  for (players of ['invalid', [], [null], [{ id: 'someone-else' }]]) {
    await assert.rejects(client.create('Guest'), /invalid player list/);
    assert.equal(client.status, 'disconnected'); assert.equal(client.room, null); assert.equal(client.playerId, null);
  }
  assert.ok(!statuses.includes('connected')); assert.equal(errors.length, 4);
});

test('a cancelled initial sync cannot connect or overwrite a newer room when its response arrives late', { timeout: 5000 }, async t => {
  const { baseUrl } = await serverFor(t);
  let releaseFirstSync, markFirstSync, holdFirst = true;
  const firstSyncStarted = new Promise(resolve => { markFirstSync = resolve; });
  const firstSyncReleased = new Promise(resolve => { releaseFirstSync = resolve; });
  t.after(releaseFirstSync);
  const delayedFetch = async (url, options) => {
    const response = await fetch(url, options);
    if (new URL(url).pathname.endsWith('/sync') && holdFirst) {
      holdFirst = false;
      const text = await response.text();
      markFirstSync();
      // The response was already received before abort, but its consumer is delayed.
      await firstSyncReleased;
      return new Response(text, { status: response.status, headers: response.headers });
    }
    return response;
  };
  const statuses = [], errors = [];
  const client = new Multiplayer({ baseUrl, fetch: delayedFetch, onChange: state => statuses.push(state.status), onError: error => errors.push(error) });
  const guest = new Multiplayer({ baseUrl });
  t.after(() => client.destroy()); t.after(() => guest.destroy());
  const old = client.create('Old');
  await firstSyncStarted;
  assert.equal(client.status, 'connecting'); assert.ok(!statuses.includes('connected'));
  await client.leave();
  const room = await client.create('Current'); await guest.join(room, 'Guest');
  await eventually(() => client.peers.some(player => player.name === 'Guest'));
  const playerId = client.playerId;
  releaseFirstSync();
  assert.equal(await old, null);
  assert.equal(client.status, 'connected'); assert.equal(client.room, room); assert.equal(client.playerId, playerId);
  assert.deepEqual(client.peers.map(player => player.name), ['Guest']);
  assert.deepEqual(errors, []);
});

test('failed and cancelled joins never show a phantom connection or overwrite a newer room', async t => {
  const { baseUrl } = await serverFor(t);
  const client = new Multiplayer({ baseUrl }); t.after(() => client.destroy());
  await assert.rejects(client.join('AAAAAA', 'Guest'), /Room not found/);
  assert.equal(client.status, 'disconnected'); assert.equal(client.room, null);
  await assert.rejects(client.join('bad', 'Guest'), /six-character/);
  const pending = client.create('First'); await client.leave(); assert.equal(await pending, null);
  assert.equal(client.room, null); assert.equal(client.status, 'disconnected');
  const old = client.create('Old'), latest = client.create('Latest');
  await Promise.all([old, latest]);
  assert.equal(client.status, 'connected'); assert.ok(client.room); assert.ok(client.playerId);
});

test('production server serves only built assets and never hidden files or symlinks outside dist', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'llama-server-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'index.html'), '<h1>Game</h1>');
  await writeFile(join(directory, '.env'), 'SECRET=yes');
  await symlink('/etc/hosts', join(directory, 'outside.txt'));
  const { baseUrl } = await serverFor(t, { directory });
  const home = await fetch(baseUrl); assert.equal(home.status, 200); assert.equal(await home.text(), '<h1>Game</h1>');
  for (const path of ['/.env', '/outside.txt', '/%2e%2e%2fserver.mjs', '/missing.js']) assert.equal((await fetch(`${baseUrl}${path}`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/index.html`, { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/missing`)).status, 404);
});
