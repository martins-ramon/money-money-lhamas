import { createRoomService } from './rooms.js';
import { createServerlessRoomServiceFromEnv } from './serverless-rooms.js';

export function createRuntimeRoomService({ env = process.env, ...options } = {}) {
  const useRedis = env.VERCEL || ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'].some(key => env[key]);
  // A partial cloud configuration must fail visibly instead of creating rooms
  // that disappear when another instance receives the next request.
  return useRedis ? createServerlessRoomServiceFromEnv(env) : createRoomService(options);
}
