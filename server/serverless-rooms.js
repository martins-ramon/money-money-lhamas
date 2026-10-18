import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { validateSnapshot } from './rooms.js';
import { ONLINE_UNAVAILABLE, redisStoreFromEnv } from './redis-store.js';

const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const error = (status, message) => Object.assign(new Error(message), { status });
const unavailable = () => error(503, ONLINE_UNAVAILABLE);
const initialPose = () => ({ x: 0, y: 0, z: 0, heading: 0, costume: 'Street dreamer', character: 'anna', location: 'city', vehicle: null, dancing: false, flying: false });
const roomState = room => ({ hostId: room.hostId, players: room.players.map(player => ({ id: player.id, name: player.name, ...player.snapshot })) });
const session = (room, player) => ({ code: room.code, hostId: room.hostId, playerId: player.id, token: player.token });

function json(res, status, data) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}

function validateName(name) {
  if (typeof name !== 'string') throw error(400, 'Choose a nickname with 1–20 characters.');
  const clean = name.trim();
  if (!clean || [...clean].length > 20 || /[<>\x00-\x1f\x7f]/.test(clean)) throw error(400, 'Choose a nickname with 1–20 characters, without special markup.');
  return clean;
}

async function readBody(req, limit) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw error(415, 'Send JSON data.');
  if (Number(req.headers['content-length']) > limit) throw error(413, 'That message is too large.');
  let supplied;
  // Vercel exposes a lazy body getter; malformed JSON can throw here.
  try { supplied = req.body; } catch { throw error(400, 'Send a valid JSON object.'); }
  let raw;
  if (supplied !== undefined) {
    try { raw = Buffer.isBuffer(supplied) ? supplied : Buffer.from(typeof supplied === 'string' ? supplied : JSON.stringify(supplied)); }
    catch { throw error(400, 'Send a valid JSON object.'); }
  } else {
    raw = await new Promise((resolve, reject) => {
      const chunks = []; let bytes = 0, done = false;
      const finish = (err, value) => { if (done) return; done = true; clearTimeout(timer); err ? reject(err) : resolve(value); };
      const timer = setTimeout(() => { req.resume?.(); finish(error(408, 'The request took too long.')); }, 5000);
      timer.unref?.();
      req.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > limit) { finish(error(413, 'That message is too large.')); return; }
        if (!done) chunks.push(Buffer.from(chunk));
      });
      req.on('end', () => finish(null, Buffer.concat(chunks)));
      req.on('error', () => finish(error(400, 'The request was interrupted.')));
      req.on('aborted', () => finish(error(400, 'The request was interrupted.')));
    });
  }
  if (raw.byteLength > limit) throw error(413, 'That message is too large.');
  try {
    const data = JSON.parse(raw.toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw error(400, 'Send a valid JSON object.'); }
}

function requestIp(req, trustVercelProxy) {
  // This header is supplied by Vercel; never trust arbitrary forwarding
  // headers on the standalone/local server.
  const forwarded = trustVercelProxy && req.headers['x-vercel-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (isIP(first)) return first;
  }
  return req.socket?.remoteAddress || 'local';
}

export function createServerlessRoomService({ store, maxRooms = 100, maxPlayers = 8, idleMs = 15000, maxBodyBytes = 4096, now = Date.now, trustVercelProxy = Boolean(process.env.VERCEL), requestTimeoutMs = 8000, retryWait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)), random = Math.random } = {}) {
  const roomTtlMs = Math.max(60000, idleMs * 2);
  function addPlayer(room, name, timestamp) {
    if (room.players.length >= maxPlayers) throw error(409, 'This room is full (8 players maximum).');
    const player = { id: randomUUID(), token: randomBytes(32).toString('base64url'), name, snapshot: initialPose(), lastSeen: timestamp, budget: 25, budgetAt: timestamp };
    room.players.push(player);
    return player;
  }
  function prune(room, timestamp) {
    room.players = room.players.filter(player => timestamp - player.lastSeen < idleMs);
    room.removedTokens = room.removedTokens.filter(record => timestamp < record.until);
  }
  function authorize(req, room, leaveToken, timestamp) {
    const authorization = req.headers.authorization;
    const token = authorization ? /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization)?.[1] : typeof leaveToken === 'string' && TOKEN_PATTERN.test(leaveToken) ? leaveToken : undefined;
    const player = token && room.players.find(item => timingSafeEqual(Buffer.from(item.token), Buffer.from(token)));
    if (!player) throw room.removedTokens.some(record => record.token === token)
      ? error(403, 'You were removed from the room by its creator.')
      : error(401, 'Your room session ended. Join the room again.');
    player.lastSeen = timestamp;
    return player;
  }
  function limitPlayer(player, timestamp) {
    player.budget = Math.min(25, player.budget + Math.max(0, timestamp - player.budgetAt) * 0.015);
    player.budgetAt = timestamp;
    if (player.budget < 1) throw error(429, 'Player updates are arriving too quickly.');
    player.budget--;
  }
  async function mutate(code, options, operation) {
    for (let attempt = 0; attempt < 64; attempt++) {
      if (Date.now() >= options.deadline) throw unavailable();
      const raw = await store.readRoom(code, options);
      if (raw === null) throw error(404, 'Room not found. Ask your friend to create a new room.');
      const room = JSON.parse(raw), timestamp = now();
      prune(room, timestamp);
      let response, failure;
      try {
        if (!room.players.length) throw error(404, 'This room closed. Ask your friend to create a new room.');
        response = operation(room, timestamp);
      } catch (err) { failure = err; }
      // Persist expiration, revocation, and request budgets even on failed
      // actions. Retrying after a conflict always rechecks authorization.
      room.revision++;
      const committed = await store.compareAndSetRoom(code, raw, room.players.length ? room : null, timestamp, roomTtlMs, maxRooms, options);
      if (committed === 0) {
        // Concurrent polling clients must not repeatedly collide in lockstep.
        // Full jitter gives waiting players a turn while the shared deadline
        // keeps contention within the browser's request timeout.
        if (attempt < 63) {
          const remaining = options.deadline - Date.now();
          if (remaining <= 0) throw unavailable();
          const delay = Math.min(remaining, 5 + Math.floor(random() * Math.min(160, 5 * 2 ** Math.min(attempt, 5))));
          await retryWait(delay);
        }
        continue;
      }
      if (committed !== 1) throw unavailable();
      if (failure) throw failure;
      return response;
    }
    throw unavailable();
  }
  async function handle(req, res, next = () => json(res, 404, { error: 'Not found.' })) {
    const options = { deadline: Date.now() + requestTimeoutMs };
    try {
      let url; try { url = new URL(req.url, 'http://game.local'); } catch { throw error(400, 'Invalid request URL.'); }
      if (!url.pathname.startsWith('/api/')) { next(); return; }
      if (req.headers['sec-fetch-site'] === 'cross-site') throw error(403, 'Connect from this game page.');
      if (req.headers.origin) {
        let sameHost = false; try { sameHost = new URL(req.headers.origin).host === req.headers.host; } catch { /* Reject malformed origins. */ }
        if (!sameHost) throw error(403, 'Connect from this game page.');
      }
      if (!store) throw unavailable();
      const creating = url.pathname === '/api/rooms' && req.method === 'POST';
      const match = /^\/api\/rooms\/([^/]+)\/(join|events|state|sync|ping|leave|kick)$/.exec(url.pathname);
      if (!creating && (!match || !CODE_PATTERN.test(match[1]))) throw error(404, 'Room not found. Check the six-character code.');
      const action = creating ? 'create' : match[2];
      // Vercel uses finite JSON polling; SSE remains supported locally.
      if (action === 'events' || req.method !== 'POST') throw error(405, 'That request method is not available.');
      if (creating || action === 'join') {
        if (!await store.consumeEntryLimit(requestIp(req, trustVercelProxy), now(), options)) throw error(429, 'Too many room requests. Please wait a minute.');
      }
      const body = await readBody(req, maxBodyBytes);
      if (creating) {
        const name = validateName(body.name);
        for (let attempt = 0; attempt < 8; attempt++) {
          if (Date.now() >= options.deadline) throw unavailable();
          const timestamp = now(), code = [...randomBytes(6)].map(value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('');
          const room = { code, hostId: null, players: [], removedTokens: [], idleMs, revision: 0 };
          const player = addPlayer(room, name, timestamp); room.hostId = player.id;
          const committed = await store.compareAndSetRoom(code, null, room, timestamp, roomTtlMs, maxRooms, options);
          if (committed === 0) continue;
          if (committed === -1) throw error(503, 'All rooms are busy. Please try again shortly.');
          if (committed !== 1) throw unavailable();
          json(res, 201, session(room, player)); return;
        }
        throw unavailable();
      }
      const result = await mutate(match[1], options, (room, timestamp) => {
        if (action === 'join') return session(room, addPlayer(room, validateName(body.name), timestamp));
        const player = authorize(req, room, action === 'leave' ? body.token : undefined, timestamp);
        if (action !== 'leave') limitPlayer(player, timestamp);
        if (action === 'kick') {
          if (player.id !== room.hostId) throw error(403, 'Only the room creator can remove players.');
          if (typeof body.playerId !== 'string' || !/^[0-9a-f-]{36}$/.test(body.playerId) || body.playerId === player.id) throw error(400, 'Choose another player to remove.');
          const target = room.players.find(item => item.id === body.playerId);
          if (!target) throw error(404, 'That player is no longer in the room.');
          room.removedTokens.push({ token: target.token, until: timestamp + 60000 });
          room.removedTokens = room.removedTokens.slice(-32);
          room.players = room.players.filter(item => item !== target);
          return roomState(room);
        }
        if (action === 'state' || (action === 'sync' && Object.hasOwn(body, 'snapshot'))) player.snapshot = validateSnapshot(body.snapshot);
        if (action === 'sync') return roomState(room);
        if (action === 'leave') room.players = room.players.filter(item => item !== player);
        return { ok: true };
      });
      json(res, action === 'join' ? 201 : 200, result);
    } catch (err) {
      req.resume?.();
      json(res, err.status || 503, { error: err.status ? err.message : ONLINE_UNAVAILABLE });
    }
  }
  return { handle, close() {} };
}

export function createServerlessRoomServiceFromEnv(env = process.env, options = {}) {
  let store;
  try { store = redisStoreFromEnv(env, options.redisOptions); } catch { /* Handle missing/invalid configuration as a finite 503 response. */ }
  return createServerlessRoomService({ ...options, store, trustVercelProxy: Boolean(env.VERCEL) });
}
