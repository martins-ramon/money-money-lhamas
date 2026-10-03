import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRoomService } from './server/rooms.js';

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

export function createGameServer({ directory = resolve(projectDirectory, 'dist'), roomOptions } = {}) {
  const rooms = createRoomService(roomOptions);
  async function serveStatic(req, res) {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method not allowed.'); return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://game.local').pathname);
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part.startsWith('.'))) { res.writeHead(404); res.end('Not found.'); return; }
      const root = await realpath(directory);
      const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      let file = resolve(root, requested);
      try { file = await realpath(file); } catch { res.writeHead(404); res.end('Not found.'); return; }
      if (!file.startsWith(`${root}${sep}`)) { res.writeHead(404); res.end('Not found.'); return; }
      const info = await stat(file);
      if (!info.isFile()) { res.writeHead(404); res.end('Not found.'); return; }
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = createReadStream(file); stream.on('error', () => res.destroy()); stream.pipe(res);
    } catch {
      if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Build the game with npm run build before starting the production server.');
    }
  }
  const server = createServer((req, res) => { void rooms.handle(req, res, () => { void serveStatic(req, res); }); });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('close', () => rooms.close());
  return { server, rooms, close: () => { rooms.close(); return new Promise((resolveClose, reject) => server.close(err => err ? reject(err) : resolveClose())); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a number from 1 to 65535.');
  const game = createGameServer();
  game.server.listen(port, '0.0.0.0', () => console.log(`Money Money Lhamas is running on port ${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void game.close(); });
}
