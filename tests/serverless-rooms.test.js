import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServerlessRoomService, createServerlessRoomServiceFromEnv } from '../server/serverless-rooms.js';
import { createRedisStore, redisStoreFromEnv, ONLINE_UNAVAILABLE } from '../server/redis-store.js';

const pose = fields => ({ x: 5, y: 0, z: -12, heading: 1.2, costume: 'Cyborg', character: 'carlos', location: 'city', vehicle: null, dancing: false, flying: false, ...fields });

// Deterministic shared store: compare-and-set is the only atomic operation.
// Separate handlers below therefore contend just like separate Vercel instances.
function sharedStore() {
  const rooms = new Map(), expiry = new Map(), limits = new Map();
  return {
    rooms, limits, beforeCompare: null,
    async readRoom(code) { return rooms.get(code) ?? null; },
    async compareAndSetRoom(code, expected, room, timestamp, ttlMs, maxRooms) {
      await this.beforeCompare?.(code, expected, room);
      if ((rooms.get(code) ?? null) !== expected) return 0;
      for (const [key, until] of expiry) if (until <= timestamp) expiry.delete(key);
      if (!room) { rooms.delete(code); expiry.delete(code); return 1; }
      if (!expiry.has(code) && expiry.size >= maxRooms) return -1;
      rooms.set(code, JSON.stringify(room));
      expiry.set(code, Math.max(...room.players.map(player => player.lastSeen)) + room.idleMs);
      return 1;
    },
    async consumeEntryLimit(ip, timestamp) {
      let bucket = limits.get(ip);
      if (!bucket || timestamp - bucket.at >= 60000) { bucket = { at: timestamp, count: 0 }; limits.set(ip, bucket); }
      return ++bucket.count <= 60;
    },
  };
}

async function request(service, path, body = {}, token, { headers = {}, method = 'POST', bodyGetter } = {}) {
  const req = { url: path, method, body, headers: { host: 'game.example', 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, socket: { remoteAddress: '127.0.0.1' }, resume() {} };
  if (bodyGetter) Object.defineProperty(req, 'body', { get: bodyGetter });
  const response = { status: 0, data: null, headers: null };
  const res = { writeHead(status, headers) { response.status = status; response.headers = headers; }, end(raw) { response.data = JSON.parse(raw); } };
  await service.handle(req, res);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  return response;
}

async function create(service, name = 'Host', options) {
  const result = await request(service, '/api/rooms', { name }, undefined, options);
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data;
}

test('separate serverless instances share rooms, snapshots and beacon departures without leaking secrets', async () => {
  const store = sharedStore(), a = createServerlessRoomService({ store }), b = createServerlessRoomService({ store });
  const host = await create(a), isolated = await create(b, 'Isolated'), room = `/api/rooms/${host.code}`;
  const guest = (await request(b, `${room}/join`, { name: 'Guest' })).data;
  assert.match(host.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(guest.hostId, host.playerId);
  assert.equal((await request(a, `${room}/sync`, {}, isolated.token)).status, 401);
  const updated = await request(b, `${room}/sync`, { snapshot: pose({ x: 44, costume: 'Dragon', wallet: 100, token: 'private' }) }, guest.token);
  assert.equal(updated.status, 200);
  const polled = await request(a, `${room}/sync`, {}, host.token);
  assert.equal(polled.data.players.find(player => player.id === guest.playerId).x, 44);
  assert.equal(polled.data.players.find(player => player.id === guest.playerId).wallet, undefined);
  for (const token of [host.token, guest.token]) assert.ok(!JSON.stringify(polled.data).includes(token));
  assert.equal((await request(a, `${room}/state`, { snapshot: pose({ y: 1000 }) }, guest.token)).status, 400);
  assert.equal((await request(b, `${room}/leave`, { token: guest.token, playerId: host.playerId })).status, 200);
  assert.equal((await request(a, `${room}/sync`, {}, guest.token)).status, 401);
  assert.deepEqual((await request(b, `${room}/sync`, {}, host.token)).data.players.map(player => player.id), [host.playerId]);
});

test('concurrent joins cannot exceed eight players and simultaneous pose updates are retained', async () => {
  const store = sharedStore(), a = createServerlessRoomService({ store }), b = createServerlessRoomService({ store });
  const host = await create(a), room = `/api/rooms/${host.code}`;
  const joined = await Promise.all(Array.from({ length: 12 }, (_, index) => request(index % 2 ? a : b, `${room}/join`, { name: `Guest ${index}` })));
  assert.equal(joined.filter(result => result.status === 201).length, 7);
  assert.equal(joined.filter(result => result.status === 409).length, 5);
  const sessions = [host, ...joined.filter(result => result.status === 201).map(result => result.data)];
  const updates = await Promise.all(sessions.map((session, index) => request(index % 2 ? a : b, `${room}/state`, { snapshot: pose({ x: index * 10 }) }, session.token)));
  assert.ok(updates.every(result => result.status === 200));
  const polled = await request(b, `${room}/sync`, {}, host.token);
  for (let index = 0; index < sessions.length; index++) assert.equal(polled.data.players.find(player => player.id === sessions[index].playerId).x, index * 10);
});

test('a stale concurrent update cannot restore a kicked player', async () => {
  const store = sharedStore(), a = createServerlessRoomService({ store }), b = createServerlessRoomService({ store });
  const host = await create(a), room = `/api/rooms/${host.code}`;
  const guest = (await request(b, `${room}/join`, { name: 'Guest' })).data;
  let release, started;
  const paused = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  let held = false;
  store.beforeCompare = async (code, expected, next) => {
    if (!held && next?.players.some(player => player.id === guest.playerId && player.snapshot.x === 42)) { held = true; started(); await gate; }
  };
  const staleUpdate = request(b, `${room}/sync`, { snapshot: pose({ x: 42 }) }, guest.token);
  await paused;
  assert.equal((await request(a, `${room}/kick`, { playerId: guest.playerId }, host.token)).status, 200);
  release();
  const denied = await staleUpdate;
  assert.equal(denied.status, 403);
  assert.equal(denied.data.error, 'You were removed from the room by its creator.');
  assert.deepEqual((await request(a, `${room}/sync`, {}, host.token)).data.players.map(player => player.id), [host.playerId]);
});

test('shared capacity and lazy expiration free abandoned rooms and seats without timers', async () => {
  let clock = 1000;
  const store = sharedStore(), options = { store, maxRooms: 2, maxPlayers: 2, now: () => clock };
  const a = createServerlessRoomService(options), b = createServerlessRoomService(options);
  const created = await Promise.all(Array.from({ length: 5 }, (_, index) => request(index % 2 ? a : b, '/api/rooms', { name: `Host ${index}` })));
  assert.equal(created.filter(result => result.status === 201).length, 2);
  assert.equal(created.filter(result => result.status === 503).length, 3);
  const host = created.find(result => result.status === 201).data, room = `/api/rooms/${host.code}`;
  const guest = (await request(b, `${room}/join`, { name: 'Guest' })).data;
  clock += 10000;
  assert.equal((await request(a, `${room}/ping`, {}, host.token)).status, 200);
  clock += 5001;
  assert.equal((await request(b, `${room}/sync`, {}, guest.token)).status, 401);
  assert.equal((await request(b, `${room}/join`, { name: 'Replacement' })).status, 201);
  await create(a, 'Replacement room');
  clock += 15001;
  assert.equal((await request(a, `${room}/sync`, {}, host.token)).status, 404);
  await create(b, 'Fresh room');
});

test('player budgets and entry rate limits are shared across instances; only Vercel proxy addresses are trusted', async () => {
  let clock = 1000;
  const store = sharedStore(), options = { store, now: () => clock, trustVercelProxy: true };
  const a = createServerlessRoomService(options), b = createServerlessRoomService(options);
  const host = await create(a), room = `/api/rooms/${host.code}`;
  for (let index = 0; index < 25; index++) assert.equal((await request(index % 2 ? a : b, `${room}/sync`, {}, host.token)).status, 200);
  assert.equal((await request(b, `${room}/ping`, {}, host.token)).status, 429);
  assert.equal((await request(a, `${room}/leave`, { token: host.token })).status, 200);
  const headers = { 'x-vercel-forwarded-for': '203.0.113.10', 'x-forwarded-for': 'spoofed' };
  for (let index = 0; index < 60; index++) assert.equal((await request(index % 2 ? a : b, '/api/rooms', { name: '' }, undefined, { headers })).status, 400);
  assert.equal((await request(b, '/api/rooms', { name: 'Limited' }, undefined, { headers })).status, 429);
  assert.equal((await request(b, '/api/rooms', { name: 'Other IP' }, undefined, { headers: { 'x-vercel-forwarded-for': '203.0.113.11' } })).status, 201);
  const local = createServerlessRoomService({ store, now: () => clock, trustVercelProxy: false });
  await create(local, 'Local', { headers: { 'x-vercel-forwarded-for': '192.0.2.99' } });
  assert.ok(!store.limits.has('192.0.2.99'));
  clock += 60001;
  assert.equal((await request(a, '/api/rooms', { name: 'Reset' }, undefined, { headers })).status, 201);
});

test('a delayed renewal cannot exceed room capacity after its former slot expires', async () => {
  let clock = 1000;
  const store = sharedStore(), options = { store, maxRooms: 1, now: () => clock };
  const a = createServerlessRoomService(options), b = createServerlessRoomService(options);
  const host = await create(a);
  let release, started;
  const paused = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  let held = false;
  store.beforeCompare = async (code, expected, next) => {
    if (!held && code === host.code && expected !== null) { held = true; started(); await gate; }
  };
  clock = 15999;
  const renewal = request(a, `/api/rooms/${host.code}/sync`, {}, host.token);
  await paused;
  clock = 16001;
  const replacement = await create(b, 'New room');
  release();
  assert.equal((await renewal).status, 503);
  assert.equal((await request(b, `/api/rooms/${replacement.code}/sync`, {}, replacement.token)).status, 200);
  assert.equal((await request(a, '/api/rooms', { name: 'Too many' })).status, 503);
});

test('host permissions, beacon scope, revocation expiry and same-origin checks remain enforced', async () => {
  let clock = 1000;
  const store = sharedStore(), service = createServerlessRoomService({ store, now: () => clock });
  const host = await create(service), room = `/api/rooms/${host.code}`;
  const guest = (await request(service, `${room}/join`, { name: 'Guest' })).data;
  assert.equal((await request(service, `${room}/kick`, { playerId: host.playerId }, guest.token)).status, 403);
  assert.equal((await request(service, `${room}/kick`, { playerId: host.playerId }, host.token)).status, 400);
  for (const action of ['sync', 'state', 'ping', 'kick']) assert.equal((await request(service, `${room}/${action}`, { token: host.token, snapshot: pose(), playerId: guest.playerId })).status, 401);
  assert.equal((await request(service, `${room}/leave`, { token: guest.token }, undefined, { headers: { origin: 'https://bad.example' } })).status, 403);
  assert.equal((await request(service, `${room}/sync`, {}, host.token, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await request(service, `${room}/sync`, {}, host.token, { headers: { origin: 'https://game.example' } })).status, 200);
  assert.equal((await request(service, `${room}/kick`, { playerId: guest.playerId }, host.token)).status, 200);
  for (let index = 0; index < 6; index++) { clock += 10000; assert.equal((await request(service, `${room}/ping`, {}, host.token)).status, 200); }
  assert.equal((await request(service, `${room}/sync`, {}, guest.token)).status, 401);
  assert.equal((await request(service, `${room}/events`, {}, host.token, { method: 'GET' })).status, 405);
});

test('Vercel parsed bodies, lazy parse errors and raw Node request streams honor the 4 KiB boundary', async t => {
  const service = createServerlessRoomService({ store: sharedStore() });
  for (const body of [{ name: 'Parsed' }, '{"name":"String"}', Buffer.from('{"name":"Buffer"}')]) assert.equal((await request(service, '/api/rooms', body)).status, 201);
  for (const body of [null, [], 42, '{bad']) assert.equal((await request(service, '/api/rooms', body)).status, 400);
  assert.equal((await request(service, '/api/rooms', {}, undefined, { bodyGetter() { throw new Error('Invalid JSON'); } })).status, 400);
  assert.equal((await request(service, '/api/rooms', { name: 'Host', excess: '💸'.repeat(1100) })).status, 413);
  assert.equal((await request(service, '/api/rooms', { name: 'Host' }, undefined, { headers: { 'content-length': '5000' } })).status, 413);
  assert.equal((await request(service, '/api/rooms', {}, undefined, { headers: { 'content-type': 'text/plain' } })).status, 415);
  const server = createServer(service.handle);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/rooms`;
  const post = body => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.equal((await post('{"name":"Raw stream"}')).status, 201);
  assert.equal((await post('{broken')).status, 400);
  assert.equal((await post(JSON.stringify({ name: 'Host', excess: 'x'.repeat(5000) }))).status, 413);
});

test('missing, partial, failing and contended stores fail closed with finite 503 responses', async () => {
  for (const env of [{}, { UPSTASH_REDIS_REST_URL: 'https://db.example' }, { UPSTASH_REDIS_REST_TOKEN: 'secret' }, { UPSTASH_REDIS_REST_URL: 'http://db.example', UPSTASH_REDIS_REST_TOKEN: 'secret' }, { UPSTASH_REDIS_REST_URL: 'https://db.example', KV_REST_API_URL: 'https://alias.example', KV_REST_API_TOKEN: 'alias-secret' }]) {
    const result = await request(createServerlessRoomServiceFromEnv(env), '/api/rooms', { name: 'Host' });
    assert.equal(result.status, 503); assert.equal(result.data.error, ONLINE_UNAVAILABLE);
  }
  const broken = createServerlessRoomService({ store: { async consumeEntryLimit() { throw new Error('private connection details'); } } });
  assert.equal((await request(broken, '/api/rooms', { name: 'Host' })).data.error, ONLINE_UNAVAILABLE);
  const retryDelays = [];
  const store = sharedStore(), service = createServerlessRoomService({ store, retryWait: async milliseconds => { retryDelays.push(milliseconds); }, random: () => 0.5 });
  const host = await create(service);
  const compareAndSetRoom = store.compareAndSetRoom.bind(store);
  let conflicts = 0;
  store.compareAndSetRoom = async (...args) => conflicts++ < 20 ? 0 : compareAndSetRoom(...args);
  assert.equal((await request(service, `/api/rooms/${host.code}/sync`, {}, host.token)).status, 200);
  assert.ok(retryDelays.length >= 20);
  assert.ok(retryDelays.every(delay => delay > 0 && delay < 200));
  assert.ok(new Set(retryDelays).size > 1);
  conflicts = 0; retryDelays.length = 0;
  store.compareAndSetRoom = async () => { conflicts++; return 0; };
  assert.equal((await request(service, `/api/rooms/${host.code}/sync`, {}, host.token)).status, 503);
  assert.ok(conflicts > 20 && conflicts < 100);
  assert.ok(retryDelays.length < conflicts);
  conflicts = 0;
  const deadlineService = createServerlessRoomService({ store, requestTimeoutMs: 5, retryWait: () => new Promise(resolve => setTimeout(resolve, 10)) });
  assert.equal((await request(deadlineService, `/api/rooms/${host.code}/sync`, {}, host.token)).status, 503);
  assert.ok(conflicts <= 1, 'the request deadline must stop retries before the next store call');
});

test('Redis REST adapter uses authenticated atomic EVAL, hashed IP keys, bounded timeouts and environment namespaces', async () => {
  const calls = [], results = [null, 1, 61];
  const fetchImpl = async (url, options) => { calls.push({ url, options, command: JSON.parse(options.body) }); return Response.json({ result: results.shift() }); };
  const store = redisStoreFromEnv({ UPSTASH_REDIS_REST_URL: 'https://redis.example/', UPSTASH_REDIS_REST_TOKEN: 'private-token', VERCEL_ENV: 'preview' }, { fetchImpl });
  assert.equal(await store.readRoom('ABCDEF'), null);
  const room = { players: [{ lastSeen: 1000 }], idleMs: 15000 };
  assert.equal(await store.compareAndSetRoom('ABCDEF', null, room, 1000, 60000, 100), 1);
  assert.equal(await store.consumeEntryLimit('203.0.113.2', 1000), false);
  assert.ok(calls.every(call => call.command[0] === 'EVAL'));
  assert.equal(calls[0].command[3], 'llama-city:preview:room:ABCDEF');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-token');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal(calls[1].command[2], 2);
  assert.equal(calls[1].command[4], 'llama-city:preview:rooms');
  assert.equal(calls[1].command.at(-1), 16000);
  assert.ok(!calls[2].options.body.includes('203.0.113.2'));
  for (const response of [Response.json({ error: 'private error' }), Response.json({ result: 'OK' }, { status: 401 }), new Response('not JSON')]) {
    const failing = createRedisStore({ url: 'https://redis.example', token: 'private', fetchImpl: async () => response });
    await assert.rejects(failing.readRoom('ABCDEF'), { status: 503, message: ONLINE_UNAVAILABLE });
  }
  await assert.rejects(store.readRoom('ABCDEF', { deadline: Date.now() - 1 }), { status: 503 });
  const aliasCalls = [];
  const aliases = redisStoreFromEnv({ KV_REST_API_URL: 'https://alias.example', KV_REST_API_TOKEN: 'private', ROOM_KEY_PREFIX: 'my-project:production' }, { fetchImpl: async (url, options) => { aliasCalls.push(JSON.parse(options.body)); return Response.json({ result: null }); } });
  await aliases.readRoom('ABCDEF');
  assert.equal(aliasCalls[0][3], 'my-project:production:room:ABCDEF');
});
