import type { Server, Socket } from 'socket.io';
import type { Avatar, GameMode } from '../types/index.js';
import { GameEngine } from './game-engine.js';

const engine = new GameEngine();

// ── Rate limiting per IP ────────────────────────────────────
interface RateBucket {
	count: number;
	resetAt: number;
}

const rateLimits = new Map<string, Map<string, RateBucket>>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
	'connection':     { max: 10, windowMs: 60_000 },   // 10 connections/min per IP
	'player:join':    { max: 5,  windowMs: 60_000 },    // 5 joins/min per IP
	'answer:submit':  { max: 30, windowMs: 60_000 },    // 30 answers/min per IP
	'game:start':     { max: 5,  windowMs: 60_000 },    // 5 starts/min per IP
	'game:play-again':{ max: 10, windowMs: 60_000 },    // 10 replays/min per IP
};

function getClientIp(socket: Socket): string {
	return socket.handshake.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
		|| socket.handshake.address
		|| 'unknown';
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

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [ip, buckets] of rateLimits) {
		for (const [action, bucket] of buckets) {
			if (now > bucket.resetAt) buckets.delete(action);
		}
		if (buckets.size === 0) rateLimits.delete(ip);
	}
}, 300_000);

export function setupSocketHandlers(io: Server): void {
	// Wire engine callbacks to Socket.io
	engine.setCallbacks(
		// broadcast to all in room
		(event, data) => io.emit(event, data),
		// emit to specific player
		(playerId, event, data) => io.to(playerId).emit(event, data),
		// timer tick
		(remaining) => io.emit('game:timer', { remaining })
	);

	io.on('connection', (socket: Socket) => {
		const ip = getClientIp(socket);

		// Rate limit connections
		if (isRateLimited(ip, 'connection')) {
			console.log(`[socket] rate-limited connection from ${ip}`);
			socket.emit('player:error', { message: 'Too many connections. Try again later.' });
			socket.disconnect(true);
			return;
		}

		console.log(`[socket] connected: ${socket.id}`);

		// ── TV connects ──────────────────────────────────
		socket.on('tv:connect', () => {
			console.log(`[socket] TV connected: ${socket.id}`);
			socket.emit('game:state', engine.getFullState());
		});

		// ── Player joins ─────────────────────────────────
		socket.on('player:join', (data: { name: string; avatar: Avatar; teamCode?: string }) => {
			if (isRateLimited(ip, 'player:join')) {
				socket.emit('player:error', { message: 'Too many join attempts. Slow down.' });
				return;
			}

			const { name, avatar } = data;

			if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 20) {
				socket.emit('player:error', { message: 'Name is required (max 20 characters)' });
				return;
			}

			const player = engine.addPlayer(socket.id, name.trim(), avatar);
			console.log(`[socket] player joined: ${player.name} (${player.avatar})`);

			// Send full state to the new player
			socket.emit('game:state', engine.getFullState());

			// Broadcast updated lobby to everyone
			io.emit('lobby:update', {
				players: Array.from(engine.players.values()),
				canStart: engine.getActivePlayers().length > 0
			});
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

			const { packSlug, mode, numRounds } = data;

			if (engine.phase !== 'LOBBY') {
				socket.emit('player:error', { message: 'Game is not in lobby phase' });
				return;
			}

			const success = engine.startGame(packSlug, mode, numRounds);
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

			engine.submitAnswer(socket.id, {
				playerId: socket.id,
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

			engine.playAgain();
		});

		// ── Get available packs ──────────────────────────
		socket.on('game:get-packs', () => {
			socket.emit('game:packs', engine.getAvailablePacks());
		});
	});
}

function handleDisconnect(socket: Socket, io: Server): void {
	console.log(`[socket] disconnected: ${socket.id}`);
	engine.removePlayer(socket.id);

	io.emit('lobby:update', {
		players: Array.from(engine.players.values()),
		canStart: engine.getActivePlayers().length > 0
	});
}

export { engine };
