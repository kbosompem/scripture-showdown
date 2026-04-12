# Scripture Showdown

A real-time Bible quiz game for families. TV displays questions and leaderboard, players join from their phones by scanning a QR code.

## Game Modes

- **Fill the Gap** — verse with blanks, type the missing words
- **Name That Reference** — verse shown, pick Book/Chapter/Verse
- **Quote It** — reference shown, type the verse from memory
- **Speed Recall** — verse shown for 5 seconds, then reconstruct

## Tech Stack

- SvelteKit 2 + Svelte 5 + TailwindCSS 4
- Socket.io (real-time sync between TV and phones)
- SQLite (verse packs, teams, session history)
- Docker

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/tv` on the TV and `http://localhost:5173/play` on phones.

## Docker

```bash
docker compose up
```

Game available at `http://<server-ip>:3000`.
