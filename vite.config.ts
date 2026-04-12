import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { Server } from 'socket.io';

function socketIOPlugin(): Plugin {
	return {
		name: 'socket-io-dev',
		configureServer(server) {
			if (!server.httpServer) return;

			const io = new Server(server.httpServer, {
				cors: { origin: '*' }
			});

			// Dynamic import to avoid bundling issues
			import('./src/lib/server/socket-handler.js').then(({ setupSocketHandlers }) => {
				setupSocketHandlers(io);
			});

			import('./src/lib/server/seed.js').then(({ seedDatabase }) => {
				seedDatabase();
			});
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), socketIOPlugin()],
	server: {
		host: '0.0.0.0'
	}
});
