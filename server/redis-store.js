import { createHash } from 'node:crypto';

export const ONLINE_UNAVAILABLE = 'Online mode is unavailable right now. Please try again later.';
const unavailable = () => Object.assign(new Error(ONLINE_UNAVAILABLE), { status: 503 });

// EVAL is atomic; a plain GET followed by SET would lose concurrent joins,
// poses, or removals when Vercel runs requests in different instances.
const COMPARE_AND_SET = `
local current = redis.call('GET', KEYS[1])
if (current or '') ~= ARGV[1] then return 0 end
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[3])
if ARGV[2] == '' then
  redis.call('DEL', KEYS[1])
  redis.call('ZREM', KEYS[2], ARGV[6])
  return 1
end
if not redis.call('ZSCORE', KEYS[2], ARGV[6]) and redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[5]) then return -1 end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[4])
redis.call('ZADD', KEYS[2], ARGV[7], ARGV[6])
redis.call('PEXPIRE', KEYS[2], ARGV[4])
return 1
`;
const ENTRY_LIMIT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], 60000) end
return count
`;

export function createRedisStore({ url, token, prefix = 'llama-city:development', fetchImpl = globalThis.fetch, timeoutMs = 2500 } = {}) {
  let endpoint;
  try { endpoint = new URL(url); } catch { throw unavailable(); }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !token || typeof token !== 'string' || typeof prefix !== 'string' || !prefix.trim() || prefix.length > 200) throw unavailable();
  const baseUrl = endpoint.href.replace(/\/$/, '');
  async function command(args, { deadline = Infinity } = {}) {
    const remaining = Math.min(timeoutMs, deadline - Date.now());
    if (remaining <= 0) throw unavailable();
    try {
      const response = await fetchImpl(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(Math.max(1, Math.floor(remaining))),
        cache: 'no-store',
      });
      if (!response.ok) throw unavailable();
      const data = await response.json();
      if (!data || data.error || !Object.hasOwn(data, 'result')) throw unavailable();
      return data.result;
    } catch { throw unavailable(); }
  }
  return {
    async readRoom(code, options) {
      // EVAL routes the read through the same atomic command path as mutations.
      const value = await command(['EVAL', "return redis.call('GET', KEYS[1])", 1, `${prefix}:room:${code}`], options);
      if (value !== null && typeof value !== 'string') throw unavailable();
      return value;
    },
    async compareAndSetRoom(code, expected, room, timestamp, ttlMs, maxRooms, options) {
      const activeUntil = room ? Math.max(...room.players.map(player => player.lastSeen)) + room.idleMs : timestamp;
      const result = await command(['EVAL', COMPARE_AND_SET, 2, `${prefix}:room:${code}`, `${prefix}:rooms`, expected ?? '', room ? JSON.stringify(room) : '', timestamp, ttlMs, maxRooms, code, activeUntil], options);
      if (![0, 1, -1].includes(result)) throw unavailable();
      return result;
    },
    async consumeEntryLimit(ip, timestamp, options) {
      const identifier = createHash('sha256').update(ip).digest('hex');
      const count = await command(['EVAL', ENTRY_LIMIT, 1, `${prefix}:entry:${identifier}`], options);
      if (!Number.isSafeInteger(count) || count < 1) throw unavailable();
      return count <= 60;
    },
  };
}

export function redisStoreFromEnv(env = process.env, options = {}) {
  // A partially configured primary pair must not silently fall back to a
  // different database, nor to process-local rooms in production.
  const useUpstash = Boolean(env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN);
  const url = useUpstash ? env.UPSTASH_REDIS_REST_URL : env.KV_REST_API_URL;
  const token = useUpstash ? env.UPSTASH_REDIS_REST_TOKEN : env.KV_REST_API_TOKEN;
  const environment = env.VERCEL_ENV || (env.VERCEL ? 'production' : 'development');
  return createRedisStore({ ...options, url, token, prefix: env.ROOM_KEY_PREFIX || `llama-city:${environment}` });
}
