import type { Server, Socket } from 'socket.io';
import type { Avatar, GameMode } from '../types/index.js';
import { GameEngine } from './game-engine.js';

// ── Session management ──────────────────────────────────────

const sessions = new Map<string, GameEngine>();
const socketToSession = new Map<string, string>(); // socketId → sessionId

function generateSessionId(): string {
	const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
	let id = '';
	for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
	return id;
}

function getOrCreateSession(sessionId: string): GameEngine {
	let engine = sessions.get(sessionId);
	if (!engine) {
		engine = new GameEngine(sessionId);
		sessions.set(sessionId, engine);
		console.log(`[session] created: ${sessionId}`);
	}
	return engine;
}

function getSessionForSocket(socketId: string): { sessionId: string; engine: GameEngine } | null {
	const sessionId = socketToSession.get(socketId);
	if (!sessionId) return null;
	const engine = sessions.get(sessionId);
	if (!engine) return null;
	return { sessionId, engine };
}

// Clean up idle sessions every 5 minutes
setInterval(() => {
	for (const [id, engine] of sessions) {
		if (!engine.hasConnectedSockets() && engine.phase !== 'ANSWERING' && engine.phase !== 'QUESTION') {
			// Keep sessions alive for 10 minutes after last disconnect
			// Use a simple approach: just delete truly empty sessions
			if (engine.players.size === 0) {
				engine.reset();
				sessions.delete(id);
				console.log(`[session] cleaned up empty: ${id}`);
			}
		}
	}
}, 300_000);

// ── Rate limiting per IP ────────────────────────────────────

interface RateBucket { count: number; resetAt: number; }
const rateLimits = new Map<string, Map<string, RateBucket>>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
	'connection':      { max: 20, windowMs: 60_000 },
	'player:join':     { max: 5,  windowMs: 60_000 },
	'answer:submit':   { max: 30, windowMs: 60_000 },
	'game:start':      { max: 5,  windowMs: 60_000 },
	'game:play-again': { max: 10, windowMs: 60_000 },
};

function getClientIp(socket: Socket): string {
	return socket.handshake.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
		|| socket.handshake.address || 'unknown';
}

function isRateLimited(ip: string, action: string): boolean {
	const config = RATE_LIMITS[action];
	if (!config) return false;
	const now = Date.now();
	if (!rateLimits.has(ip)) rateLimits.set(ip, new Map());
	const ipBuckets = rateLimits.get(ip)!;
	let bucket = ipBuckets.get(action);
	if (!bucket || now > bucket.resetAt) {
		bucket = { count: 0, resetAt: now + config.windowMs };
		ipBuckets.set(action, bucket);
	}
	bucket.count++;
	return bucket.count > config.max;
}

setInterval(() => {
	const now = Date.now();
	for (const [ip, buckets] of rateLimits) {
		for (const [action, bucket] of buckets) {
			if (now > bucket.resetAt) buckets.delete(action);
		}
		if (buckets.size === 0) rateLimits.delete(ip);
	}
}, 300_000);

// ── Socket setup ────────────────────────────────────────────

export function setupSocketHandlers(io: Server): void {

	function wireEngineCallbacks(engine: GameEngine, sessionId: string) {
		if ((engine as any)._callbacksWired) return;
		engine.setCallbacks(
			(event, data) => io.to(`session:${sessionId}`).emit(event, data),
			(socketId, event, data) => io.to(socketId).emit(event, data),
			(remaining) => io.to(`session:${sessionId}`).emit('game:timer', { remaining })
		);
		(engine as any)._callbacksWired = true;
	}

	io.on('connection', (socket: Socket) => {
		const ip = getClientIp(socket);

		if (isRateLimited(ip, 'connection')) {
			console.log(`[socket] rate-limited connection from ${ip}`);
			socket.emit('player:error', { message: 'Too many connections. Try again later.' });
			socket.disconnect(true);
			return;
		}

		console.log(`[socket] connected: ${socket.id}`);

		// ── Join a session room ──────────────────────────
		socket.on('session:join', (data: { sessionId: string; role: 'tv' | 'player' }) => {
			const { sessionId, role } = data;
			const engine = getOrCreateSession(sessionId);
			wireEngineCallbacks(engine, sessionId);

			socket.join(`session:${sessionId}`);
			socketToSession.set(socket.id, sessionId);

			console.log(`[socket] ${role} joined session ${sessionId}: ${socket.id}`);

			// Send full state
			socket.emit('game:state', engine.getFullState());
		});

		// ── TV connects (legacy, also handles session) ───
		socket.on('tv:connect', () => {
			const sess = getSessionForSocket(socket.id);
			if (sess) {
				socket.emit('game:state', sess.engine.getFullState());
			}
		});

		// ── Player joins ─────────────────────────────────
		socket.on('player:join', (data: { name: string; avatar: Avatar; teamCode?: string }) => {
			if (isRateLimited(ip, 'player:join')) {
				socket.emit('player:error', { message: 'Too many join attempts. Slow down.' });
				return;
			}

			const sess = getSessionForSocket(socket.id);
			if (!sess) {
				socket.emit('player:error', { message: 'Join a session first.' });
				return;
			}

			const { name, avatar } = data;
			if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 20) {
				socket.emit('player:error', { message: 'Name is required (max 20 characters)' });
				return;
			}

			const player = sess.engine.addPlayer(socket.id, name.trim(), avatar);
			console.log(`[socket] player joined session ${sess.sessionId}: ${player.name} (${player.avatar})`);

			// Send back stable player ID for localStorage persistence
			socket.emit('player:joined', { playerId: player.id });
			socket.emit('game:state', sess.engine.getFullState());

			io.to(`session:${sess.sessionId}`).emit('lobby:update', {
				players: Array.from(sess.engine.players.values()),
				canStart: sess.engine.getActivePlayers().length > 0
			});
		});

		// ── Player reconnects ────────────────────────────
		socket.on('player:reconnect', (data: { playerId: string }) => {
			const sess = getSessionForSocket(socket.id);
			if (!sess) {
				socket.emit('player:error', { message: 'Join a session first.' });
				return;
			}

			const player = sess.engine.reconnectPlayer(data.playerId, socket.id);
			if (player) {
				console.log(`[socket] player reconnected in session ${sess.sessionId}: ${player.name}`);
				socket.emit('player:joined', { playerId: player.id });
				socket.emit('game:state', sess.engine.getFullState());

				io.to(`session:${sess.sessionId}`).emit('lobby:update', {
					players: Array.from(sess.engine.players.values()),
					canStart: sess.engine.getActivePlayers().length > 0
				});
			} else {
				// Player not found — they need to re-join
				socket.emit('player:error', { message: 'Session expired. Please rejoin.' });
			}
		});

		// ── Player leaves ────────────────────────────────
		socket.on('player:leave', () => {
			handleDisconnect(socket, io);
		});

		socket.on('disconnect', () => {
			handleDisconnect(socket, io);
		});

		// ── Start game ───────────────────────────────────
		socket.on('game:start', (data: { packSlug: string; mode: GameMode; numRounds: number }) => {
			if (isRateLimited(ip, 'game:start')) {
				socket.emit('player:error', { message: 'Too many start attempts.' });
				return;
			}

			const sess = getSessionForSocket(socket.id);
			if (!sess) return;

			if (sess.engine.phase !== 'LOBBY') {
				socket.emit('player:error', { message: 'Game is not in lobby phase' });
				return;
			}

			const success = sess.engine.startGame(data.packSlug, data.mode, data.numRounds);
			if (!success) {
				socket.emit('player:error', { message: 'Failed to start game. Check verse pack.' });
			}
		});

		// ── Submit answer ────────────────────────────────
		socket.on('answer:submit', (data: { roundNumber: number; answer: string | string[]; timeMs: number }) => {
			if (isRateLimited(ip, 'answer:submit')) {
				socket.emit('player:error', { message: 'Too many submissions.' });
				return;
			}

			const sess = getSessionForSocket(socket.id);
			if (!sess) return;

			sess.engine.submitAnswer(socket.id, {
				playerId: '', // engine resolves via socketId
				roundNumber: data.roundNumber,
				answer: data.answer,
				timeMs: data.timeMs
			});
		});

		// ── Play again ───────────────────────────────────
		socket.on('game:play-again', () => {
			if (isRateLimited(ip, 'game:play-again')) {
				socket.emit('player:error', { message: 'Too many requests.' });
				return;
			}

			const sess = getSessionForSocket(socket.id);
			if (!sess) return;
			sess.engine.playAgain();
		});

		// ── Get available packs ──────────────────────────
		socket.on('game:get-packs', () => {
			const sess = getSessionForSocket(socket.id);
			if (sess) {
				socket.emit('game:packs', sess.engine.getAvailablePacks());
			} else {
				// Allow getting packs even without a session (for setup)
				const tempEngine = new GameEngine('temp');
				socket.emit('game:packs', tempEngine.getAvailablePacks());
			}
		});
	});
}

function handleDisconnect(socket: Socket, io: Server): void {
	console.log(`[socket] disconnected: ${socket.id}`);

	const sess = getSessionForSocket(socket.id);
	if (sess) {
		sess.engine.removePlayerBySocket(socket.id);
		socketToSession.delete(socket.id);

		io.to(`session:${sess.sessionId}`).emit('lobby:update', {
			players: Array.from(sess.engine.players.values()),
			canStart: sess.engine.getActivePlayers().length > 0
		});
	}
}

export { sessions, generateSessionId };
