import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

let socket: Socket | null = null;

export function getSocket(): Socket {
	if (!browser) throw new Error('Socket can only be used in the browser');

	if (!socket) {
		socket = io({
			autoConnect: true,
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: Infinity
		});

		socket.on('connect', () => {
			console.log('[socket] connected:', socket?.id);
		});

		socket.on('disconnect', (reason) => {
			console.log('[socket] disconnected:', reason);
		});

		socket.on('connect_error', (err) => {
			console.error('[socket] connection error:', err.message);
		});
	}

	return socket;
}

export function disconnectSocket(): void {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
}

// ── localStorage helpers for player persistence ─────────────

export function savePlayerInfo(sessionId: string, playerId: string, name: string, avatar: string): void {
	if (!browser) return;
	try {
		localStorage.setItem('ss_sessionId', sessionId);
		localStorage.setItem('ss_playerId', playerId);
		localStorage.setItem('ss_playerName', name);
		localStorage.setItem('ss_playerAvatar', avatar);
	} catch { /* quota exceeded or private mode */ }
}

export function getSavedPlayerInfo(): { sessionId: string | null; playerId: string | null; name: string | null; avatar: string | null } {
	if (!browser) return { sessionId: null, playerId: null, name: null, avatar: null };
	return {
		sessionId: localStorage.getItem('ss_sessionId'),
		playerId: localStorage.getItem('ss_playerId'),
		name: localStorage.getItem('ss_playerName'),
		avatar: localStorage.getItem('ss_playerAvatar')
	};
}

export function clearSavedPlayer(): void {
	if (!browser) return;
	localStorage.removeItem('ss_sessionId');
	localStorage.removeItem('ss_playerId');
}
