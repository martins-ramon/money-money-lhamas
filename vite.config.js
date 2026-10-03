import { defineConfig } from 'vite';
import { createRoomService } from './server/rooms.js';

function multiplayerRooms() {
  const services = new Set();
  const attach = server => {
    const rooms = createRoomService();
    services.add(rooms);
    server.middlewares.use((req, res, next) => { void rooms.handle(req, res, next); });
    server.httpServer?.once('close', () => { rooms.close(); services.delete(rooms); });
  };
  return { name: 'multiplayer-rooms', configureServer: attach, configurePreviewServer: attach, closeBundle() { for (const rooms of services) rooms.close(); services.clear(); } };
}

export default defineConfig({
  plugins: [multiplayerRooms()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
});
