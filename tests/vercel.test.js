import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHandler } from '../api/rooms.js';
import { createRuntimeRoomService } from '../server/runtime-rooms.js';
import { createServerlessRoomServiceFromEnv } from '../server/serverless-rooms.js';

async function createRoom(service) {
  const req = Readable.from([Buffer.from(JSON.stringify({ name: 'Anna' }))]);
  Object.assign(req, { url: '/api/rooms', method: 'POST', headers: { host: 'game.test', 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' } });
  const result = {};
  const res = { writeHead(status, headers) { Object.assign(result, { status, headers }); }, end(body) { result.body = JSON.parse(body); } };
  await service.handle(req, res);
  return result;
}

test('Vercel routes create and nested actions with original URLs or rewrite parameters', async () => {
  const handler = createHandler({ handle: async req => req.url });
  for (const action of ['join', 'sync', 'state', 'ping', 'leave', 'kick', 'events']) {
    const path = `ABC234/${action}`, expected = `/api/rooms/${path}`;
    assert.equal(await handler({ url: expected }), expected);
    assert.equal(await handler({ url: '/api/rooms', query: { roomPath: path } }), expected);
    assert.equal(await handler({ url: `/api/rooms?roomPath=${encodeURIComponent(path)}` }), expected);
    assert.equal(await handler({ url: '/api/rooms', query: { roomPath: path.split('/') } }), expected);
    assert.equal(await handler({ url: expected, query: { roomPath: 'OTHER2/kick' } }), expected);
  }
  assert.equal(await handler({ url: '/api/rooms' }), '/api/rooms');
  assert.equal(await handler({ url: '/api/rooms?unused=1' }), '/api/rooms?unused=1');
});

test('local server keeps working without cloud credentials', async t => {
  const service = createRuntimeRoomService({ env: {} });
  t.after(() => service.close());
  const response = await createRoom(service);
  assert.equal(response.status, 201);
  assert.match(response.body.code, /^[A-HJ-NP-Z2-9]{6}$/);
});

test('Vercel and incomplete Redis configurations never create process-local rooms', async () => {
  for (const env of [
    { VERCEL: '1' },
    { UPSTASH_REDIS_REST_URL: 'https://redis.test' },
    { UPSTASH_REDIS_REST_TOKEN: 'private-test-token' },
    { KV_REST_API_URL: 'https://redis.test' },
    { KV_REST_API_TOKEN: 'private-test-token' },
  ]) {
    const service = createRuntimeRoomService({ env });
    try {
      const response = await createRoom(service);
      assert.equal(response.status, 503);
      assert.equal(response.headers['Cache-Control'], 'no-store');
      assert.equal(response.body.error, 'Online mode is unavailable right now. Please try again later.');
      assert.doesNotMatch(JSON.stringify(response.body), /private-test-token|redis\.test/);
    } finally { service.close(); }
  }
});

test('the deployed function returns a complete JSON error when Redis is not configured', async () => {
  const handler = createHandler(createServerlessRoomServiceFromEnv({}));
  const response = await createRoom({ handle: handler });
  assert.equal(response.status, 503);
  assert.match(response.headers['Content-Type'], /application\/json/);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});
