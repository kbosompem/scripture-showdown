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
			reconnectionAttempts: 10
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
