# Replit setup

Money Money Lhamas is a Vite and Three.js browser game with a Node.js multiplayer room API. It requires Node.js 22.12 or newer. Player progress stays in browser localStorage; room presence is kept in server memory. No database, external service, or secret is required.

## Run and preview

- Install dependencies from the lockfile with `npm ci` when needed.
- The `Start application` workflow runs `npm run dev` on `0.0.0.0:5000` for Replit Preview, mapped to external port 80.
- `npm run build` creates the browser bundle in `dist/`.
- `npm run preview` serves that build on port 4173 and includes the room API.
- `npm run serve` starts `server.mjs`, serving `dist/` and the room API together. Build first. It listens on `0.0.0.0`, using `PORT` or port 5000 by default.

## Publish

Use **Reserved VM** with a single Node.js server process. The repository's `.replit` deployment configuration is:

```toml
[deployment]
deploymentTarget = "vm"
build = ["sh", "-c", "npm ci --include=dev && npm run build"]
run = ["npm", "run", "serve"]
```

If an existing publication uses **Static**, manually change it to **Reserved VM** in **Publishing → Adjust settings** and publish the updated build. A static deployment cannot run the multiplayer API. The repository configuration is ready; the existing cloud publication has not been changed. Keep one instance because room state is held in memory and is not shared across processes.

See Replit's [deployment types](https://docs.replit.com/features/publishing/deployment-types) and [app configuration](https://docs.replit.com/features/project-setup/configuration).

## Multiplayer behavior

- Players create or join rooms using a six-character code or the shared room link, with at most eight players per room.
- All participants must use the same running installation. Development, preview and production processes have separate rooms.
- The room shares player presence, position, costume, vehicle, flying and dancing. Players are rendered together when they are in the same location, city or Moon.
- Money, missions, story progress, NPCs and activities remain local to each browser. There is no chat.
- Rooms are temporary. A server restart or redeployment discards them while browser saves remain intact.
- A disconnected player must join again. If the room no longer exists, create a new room and share its code.

## Game features and controls

The game UI is in English. Keep new player-facing text consistent with that language.

The city has a radius of 98 units, additional neighborhoods, a beach, marina and adult cartoon human NPCs. Players can drive three city cars and their purchased car, pilot a boat or yacht, and launch from three glider stations. Leaving a boat returns it and its rider to the dock. Free skins include Superman, Charlotte Katakuri, Skeleton, Dragon, Cyborg, Human and Zombie. Superman, Cyborg and Dragon fly; Cyborg fires harmless milk projectiles. Skills have both keyboard controls and on-screen buttons: F to fly/land, B to dance, Q to shoot milk. E/Action enters and exits vehicles; normal movement controls steer them.

Once free play is unlocked, the menu and travel portals allow return trips between the city and Moon without resetting story progress. Six extra finance missions are available from the start, each with two explained questions and a one-time $150 reward. Completed missions can be reviewed from the catalog.

## Code and checks

- `src/world-expansion.js`: new city areas, marina, NPC placement, vehicles, portals and world boundaries.
- `src/avatars.js`: procedural skins and adult human NPC models.
- `src/finance-missions.js`: finance questions and explanations.
- `src/multiplayer.js`: room client; `src/peers.js`: remote player rendering.
- `server/rooms.js`: room API; `server.mjs`: production HTTP server.
- `vite.config.js`: room API middleware for both development and preview.
- `npm test` runs the rules, controls, mission, vehicle, room and server tests.
- `npm run build` checks the production bundle. Browser and mobile visual checks remain necessary in addition to automated tests.
