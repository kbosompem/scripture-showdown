import type { Server, Socket } from 'socket.io';
import type { Avatar, GameMode } from '../types/index.js';
import { GameEngine } from './game-engine.js';

const engine = new GameEngine();

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
		console.log(`[socket] connected: ${socket.id}`);

		// ── TV connects ──────────────────────────────────
		socket.on('tv:connect', () => {
			console.log(`[socket] TV connected: ${socket.id}`);
			socket.emit('game:state', engine.getFullState());
		});

		// ── Player joins ─────────────────────────────────
		socket.on('player:join', (data: { name: string; avatar: Avatar; teamCode?: string }) => {
			const { name, avatar } = data;

			if (!name || name.trim().length === 0) {
				socket.emit('player:error', { message: 'Name is required' });
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
			engine.submitAnswer(socket.id, {
				playerId: socket.id,
				roundNumber: data.roundNumber,
				answer: data.answer,
				timeMs: data.timeMs
			});
		});

		// ── Play again ───────────────────────────────────
		socket.on('game:play-again', () => {
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
