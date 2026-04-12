import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';
import { setupSocketHandlers } from './src/lib/server/socket-handler.js';
import { seedDatabase } from './src/lib/server/seed.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server with SvelteKit handler
const httpServer = createServer(handler);

// Attach Socket.io
const io = new Server(httpServer, {
	cors: { origin: '*' },
	pingTimeout: 30000,
	pingInterval: 10000
});

// Wire up game logic
setupSocketHandlers(io);

// Seed database on first run
seedDatabase();

// Start
httpServer.listen(PORT, HOST, () => {
	console.log(`Scripture Showdown running on http://${HOST}:${PORT}`);
});
