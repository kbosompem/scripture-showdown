FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/server.ts .
COPY --from=builder /app/src/lib/server src/lib/server/
COPY --from=builder /app/src/lib/types src/lib/types/
COPY --from=builder /app/src/lib/data src/lib/data/
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/seed seed/
VOLUME ["/app/data"]
EXPOSE 3000
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
CMD ["node", "server.ts"]
