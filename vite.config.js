import { defineConfig, loadEnv } from 'vite';
import { createRuntimeRoomService } from './server/runtime-rooms.js';

function multiplayerRooms(env) {
  const services = new Set();
  const attach = server => {
    const rooms = createRuntimeRoomService({ env });
    services.add(rooms);
    server.middlewares.use((req, res, next) => { void rooms.handle(req, res, next); });
    server.httpServer?.once('close', () => { rooms.close(); services.delete(rooms); });
  };
  return { name: 'multiplayer-rooms', configureServer: attach, configurePreviewServer: attach, closeBundle() { for (const rooms of services) rooms.close(); services.clear(); } };
}

export default defineConfig(({ mode }) => ({
  plugins: [multiplayerRooms({ ...loadEnv(mode, process.cwd(), ''), ...process.env })],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
}));
