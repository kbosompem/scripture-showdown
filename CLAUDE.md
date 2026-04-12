# CLAUDE.md

## Build & Development

```bash
npm run dev          # Dev server on port 5173 (Socket.io attached via Vite plugin)
npm run build        # Production build → ./build/
npm run check        # TypeScript/Svelte type checking
node server.js       # Production server (SvelteKit + Socket.io on port 3000)
```

## Architecture

Real-time Bible quiz game. TV browser shows questions/leaderboard. Phones are player controllers.

- **Framework:** SvelteKit 2 + Svelte 5 (runes) + TailwindCSS 4
- **Real-time:** Socket.io (server + client)
- **Database:** SQLite via better-sqlite3
- **Deployment:** Docker

### Key paths
- `src/lib/server/game-engine.ts` — state machine (THE core file)
- `src/lib/server/socket-handler.ts` — Socket.io event handlers
- `src/lib/stores/game.svelte.ts` — client reactive state
- `src/routes/tv/` — TV display (full-screen, no interaction)
- `src/routes/play/` — Phone player view
- `seed/theme-packs/` — KJV verse data (JSON)

### Socket.io + SvelteKit integration
- Dev: Vite plugin attaches Socket.io to dev server
- Prod: Custom `server.ts` wraps SvelteKit handler + Socket.io on same port

## Rules

1. All game state transitions are server-authoritative
2. KJV translation only
3. TV view: no scrolling, minimum 2.5rem font, everything fits viewport
4. Phone view: minimum 48px touch targets, bottom-anchored inputs
5. Test in browser before claiming UI works
