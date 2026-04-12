FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# SvelteKit build output
COPY --from=builder /app/build build/

# Server entry + server-side TypeScript source
COPY --from=builder /app/server.ts .
COPY --from=builder /app/src/lib/server src/lib/server/
COPY --from=builder /app/src/lib/types src/lib/types/

# Verse data for seeding
COPY --from=builder /app/seed seed/

# Bible structure JSON (used by server-side question generator)
COPY --from=builder /app/src/lib/data src/lib/data/

# Dependencies (production only would be ideal, but better-sqlite3 needs build tools)
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules node_modules/

# SQLite data directory (Docker volume)
VOLUME ["/app/data"]

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/scripture-showdown.db

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["npx", "tsx", "server.ts"]
