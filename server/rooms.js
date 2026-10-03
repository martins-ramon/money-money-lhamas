import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { EXTRA_COSTUMES, JOBS } from '../src/model.js';

const COSTUMES = new Set(['Street dreamer', 'Fresh streetwear', 'Lunar billionaire', ...EXTRA_COSTUMES, ...JOBS.map(job => job.costume)]);
const VEHICLES = new Set([null, 'car', 'boat', 'yacht', 'glider']);
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const initialPose = () => ({ x: 0, y: 0, z: 0, heading: 0, costume: 'Street dreamer', character: 'anna', location: 'city', vehicle: null, dancing: false, flying: false });
const error = (status, message) => Object.assign(new Error(message), { status });

export function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw error(400, 'Send a valid player position.');
  for (const [key, min, max] of [['x', -256, 256], ['z', -256, 256], ['y', -5, 128], ['heading', -1e6, 1e6]]) {
    if (!Number.isFinite(snapshot[key]) || snapshot[key] < min || snapshot[key] > max) throw error(400, 'Player coordinates are out of range.');
  }
  if (!COSTUMES.has(snapshot.costume) || !['anna', 'carlos'].includes(snapshot.character) || !['city', 'moon'].includes(snapshot.location) || !VEHICLES.has(snapshot.vehicle) || typeof snapshot.dancing !== 'boolean' || typeof snapshot.flying !== 'boolean') throw error(400, 'Send valid appearance and movement settings.');
  return { x: snapshot.x, y: snapshot.y, z: snapshot.z, heading: snapshot.heading % (Math.PI * 2), costume: snapshot.costume, character: snapshot.character, location: snapshot.location, vehicle: snapshot.vehicle, dancing: snapshot.dancing, flying: snapshot.flying };
}

function validateName(name) {
  if (typeof name !== 'string') throw error(400, 'Choose a nickname with 1–20 characters.');
  const clean = name.trim();
  if (!clean || [...clean].length > 20 || /[<>\x00-\x1f\x7f]/.test(clean)) throw error(400, 'Choose a nickname with 1–20 characters, without special markup.');
  return clean;
}

function json(res, status, data) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) { req.resume(); reject(error(415, 'Send JSON data.')); return; }
    const chunks = []; let bytes = 0, done = false;
    const finish = (err, value) => { if (done) return; done = true; clearTimeout(timer); err ? reject(err) : resolve(value); };
    const timer = setTimeout(() => { req.resume(); finish(error(408, 'The request took too long.')); }, 5000);
    timer.unref?.();
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > limit) { finish(error(413, 'That message is too large.')); return; }
      if (!done) chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      try { const data = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); finish(null, data); }
      catch { finish(error(400, 'Send a valid JSON object.')); }
    });
    req.on('error', () => finish(error(400, 'The request was interrupted.')));
    req.on('aborted', () => finish(error(400, 'The request was interrupted.')));
  });
}

// Rooms deliberately live in one server process. No balances, saves or chat are shared.
export function createRoomService({ maxRooms = 100, maxPlayers = 8, idleMs = 180000, sweepMs = 10000, heartbeatMs = 15000, maxBodyBytes = 4096, now = Date.now } = {}) {
  const rooms = new Map(), entryLimits = new Map();
  let closed = false;
  const publicPlayers = room => [...room.players.values()].map(player => ({ id: player.id, name: player.name, ...player.snapshot }));
  function send(stream, event, data) {
    if (!stream || stream.destroyed || stream.writableEnded) return;
    // A stalled reader must not build an unbounded outbound queue.
    if (stream.writableLength > 65536) { stream.destroy(); return; }
    stream.write(event ? `event: ${event}\ndata: ${JSON.stringify(data)}\n\n` : ': keepalive\n\n');
  }
  function broadcast(room) {
    const data = { players: publicPlayers(room) };
    for (const player of room.players.values()) send(player.stream, 'peers', data);
  }
  function remove(room, player, notify = true) {
    if (!room.players.delete(player.id)) return;
    const stream = player.stream; player.stream = null;
    if (stream && !stream.writableEnded) stream.end();
    if (!room.players.size) rooms.delete(room.code);
    else if (notify) broadcast(room);
  }
  function sweep() {
    const timestamp = now();
    for (const room of rooms.values()) for (const player of room.players.values()) if (timestamp - player.lastSeen > idleMs) remove(room, player);
    for (const [ip, bucket] of entryLimits) if (timestamp - bucket.at > 60000) entryLimits.delete(ip);
  }
  const sweepTimer = setInterval(sweep, sweepMs); sweepTimer.unref?.();
  const heartbeatTimer = setInterval(() => { for (const room of rooms.values()) for (const player of room.players.values()) send(player.stream, null); }, heartbeatMs); heartbeatTimer.unref?.();
  function entryLimit(req) {
    const ip = req.socket.remoteAddress || 'local', timestamp = now();
    let bucket = entryLimits.get(ip);
    if (!bucket || timestamp - bucket.at > 60000) { bucket = { at: timestamp, count: 0 }; entryLimits.set(ip, bucket); }
    if (++bucket.count > 60) throw error(429, 'Too many room requests. Please wait a minute.');
  }
  function addPlayer(room, name) {
    if (room.players.size >= maxPlayers) throw error(409, 'This room is full (8 players maximum).');
    const player = { id: randomUUID(), token: randomBytes(32).toString('base64url'), name, snapshot: initialPose(), lastSeen: now(), stream: null, budget: 25, budgetAt: now() };
    room.players.set(player.id, player); broadcast(room);
    return player;
  }
  function authorize(req, room) {
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
    const player = token && [...room.players.values()].find(p => timingSafeEqual(Buffer.from(p.token), Buffer.from(token)));
    if (!player) throw error(401, 'Your room session ended. Join the room again.');
    player.lastSeen = now();
    return player;
  }
  function limitPlayer(player) {
    const timestamp = now();
    player.budget = Math.min(25, player.budget + Math.max(0, timestamp - player.budgetAt) * 0.015); player.budgetAt = timestamp;
    if (player.budget < 1) throw error(429, 'Player updates are arriving too quickly.');
    player.budget--;
  }
  async function handle(req, res, next = () => json(res, 404, { error: 'Not found.' })) {
    try {
      let url; try { url = new URL(req.url, 'http://game.local'); } catch { throw error(400, 'Invalid request URL.'); }
      if (!url.pathname.startsWith('/api/')) { next(); return; }
      if (closed) throw error(503, 'The game server is restarting. Please reconnect.');
      if (req.headers['sec-fetch-site'] === 'cross-site') throw error(403, 'Connect from this game page.');
      if (req.headers.origin) {
        let sameHost = false; try { sameHost = new URL(req.headers.origin).host === req.headers.host; } catch { /* Invalid origin is rejected. */ }
        if (!sameHost) throw error(403, 'Connect from this game page.');
      }
      if (url.pathname === '/api/rooms' && req.method === 'POST') {
        entryLimit(req); const body = await readBody(req, maxBodyBytes), name = validateName(body.name); sweep();
        if (rooms.size >= maxRooms) throw error(503, 'All rooms are busy. Please try again shortly.');
        let code;
        do { code = [...randomBytes(6)].map(value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join(''); } while (rooms.has(code));
        const room = { code, players: new Map() }; rooms.set(code, room);
        const player = addPlayer(room, name);
        json(res, 201, { code, playerId: player.id, token: player.token }); return;
      }
      const match = /^\/api\/rooms\/([^/]+)\/(join|events|state|ping|leave)$/.exec(url.pathname);
      if (!match || !CODE_PATTERN.test(match[1])) throw error(404, 'Room not found. Check the six-character code.');
      const [, code, action] = match;
      if (req.method !== (action === 'events' ? 'GET' : 'POST')) throw error(405, 'That request method is not available.');
      if (action === 'join') entryLimit(req);
      const room = rooms.get(code);
      if (!room) throw error(404, 'Room not found. Ask your friend to create a new room.');
      if (action === 'join') {
        const body = await readBody(req, maxBodyBytes), name = validateName(body.name);
        if (!rooms.has(code)) throw error(404, 'This room closed. Ask your friend to create a new room.');
        const player = addPlayer(room, name);
        json(res, 201, { code, playerId: player.id, token: player.token }); return;
      }
      const player = authorize(req, room);
      limitPlayer(player);
      if (action === 'events') {
        const previous = player.stream; player.stream = res; previous?.end();
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no', 'X-Content-Type-Options': 'nosniff' });
        res.flushHeaders?.();
        send(res, 'peers', { players: publicPlayers(room) });
        res.on('close', () => { if (player.stream === res) remove(room, player); });
        return;
      }
      const body = await readBody(req, maxBodyBytes);
      // A disconnect can happen while the request body is still arriving.
      if (!room.players.has(player.id)) throw error(401, 'Your room session ended. Join the room again.');
      if (action === 'state') { player.snapshot = validateSnapshot(body.snapshot); broadcast(room); }
      if (action === 'leave') remove(room, player);
      json(res, 200, { ok: true });
    } catch (err) {
      req.resume();
      json(res, err.status || 500, { error: err.status ? err.message : 'The room server could not finish that request.' });
    }
  }
  function close() {
    closed = true; clearInterval(sweepTimer); clearInterval(heartbeatTimer);
    for (const room of rooms.values()) for (const player of room.players.values()) remove(room, player, false);
    rooms.clear(); entryLimits.clear();
  }
  return { handle, close, sweep };
}
