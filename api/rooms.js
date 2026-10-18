import { createServerlessRoomServiceFromEnv } from '../server/serverless-rooms.js';

// Vercel may expose the original URL or the rewrite destination. Normalize both
// forms so every room action reaches the same function and shared Redis store.
export function createHandler(service = createServerlessRoomServiceFromEnv()) {
  return async (req, res) => {
    let url;
    try { url = new URL(req.url, 'http://game.local'); }
    catch { return service.handle(req, res); }
    if (url.pathname === '/api/rooms') {
      const path = req.query?.roomPath ?? url.searchParams.get('roomPath');
      if (path) req.url = `/api/rooms/${Array.isArray(path) ? path.join('/') : path}`;
    }
    return service.handle(req, res);
  };
}

export default createHandler();
