# Replit setup

This project is a browser-only Vite and Three.js game. It requires Node.js 22.12 or newer and does not require a backend, database, external service, or secret.

## Run

- The `Start application` workflow runs `npm run dev`.
- The development server listens on `0.0.0.0:5000` for Replit Preview.
- Install dependencies from the lockfile with `npm ci` when needed.

## Checks

- `npm test` runs the game-logic tests.
- `npm run build` creates the static production bundle in `dist/`.