import { defineConfig } from 'vite';

const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: replitDevDomain ? [replitDevDomain] : [],
    // Replit exposes the development server through an HTTPS proxy.
    hmr: replitDevDomain
      ? { protocol: 'wss', host: replitDevDomain, clientPort: 443 }
      : undefined,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
});
