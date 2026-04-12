<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { AVATAR_EMOJI } from '$lib/types/index.js';

	let qrDataUrl = $state('');
	let gameUrl = $state('');

	onMount(async () => {
		const host = window.location.hostname;
		const port = window.location.port;
		gameUrl = `http://${host}${port ? ':' + port : ''}/play`;

		const QRCode = await import('qrcode');
		qrDataUrl = await QRCode.toDataURL(gameUrl, {
			width: 300,
			margin: 2,
			color: { dark: '#3E2723', light: '#F5ECD7' },
			errorCorrectionLevel: 'H'
		});
	});
</script>

<div class="lobby">
	<header class="lobby-header">
		<h1>Scripture Showdown</h1>
		<div class="divider-ornament">&#10045;</div>
	</header>

	<div class="lobby-body">
		<div class="join-section">
			<h2>Scan to Join</h2>
			{#if qrDataUrl}
				<img src={qrDataUrl} alt="QR code to join game" class="qr-code" />
			{:else}
				<div class="qr-placeholder">Loading...</div>
			{/if}
			<p class="join-url">{gameUrl}</p>
		</div>

		<div class="players-section">
			<h2>Players ({gameStore.players.filter(p => p.connected).length}/20)</h2>
			<div class="player-grid">
				{#each gameStore.players.filter(p => p.connected) as player (player.id)}
					<div class="player-card animate-fade-in-up">
						<span class="player-avatar">{AVATAR_EMOJI[player.avatar]}</span>
						<span class="player-name">{player.name}</span>
					</div>
				{/each}
				{#if gameStore.players.filter(p => p.connected).length === 0}
					<p class="waiting-text">Waiting for players to join...</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.lobby {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-page);
		padding: 2rem 3rem;
	}

	.lobby-header {
		text-align: center;
		margin-bottom: 1rem;
	}

	.lobby-header h1 {
		font-family: var(--font-verse);
		font-size: 4rem;
		font-weight: 900;
		color: var(--color-ink);
		margin: 0;
	}

	.lobby-body {
		flex: 1;
		display: flex;
		gap: 4rem;
		align-items: center;
		justify-content: center;
	}

	.join-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.join-section h2 {
		font-size: 2rem;
		color: var(--color-ink);
		margin: 0;
	}

	.qr-code {
		width: 300px;
		height: 300px;
		border-radius: 1rem;
		border: 3px solid var(--color-border);
	}

	.qr-placeholder {
		width: 300px;
		height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 3px dashed var(--color-border);
		border-radius: 1rem;
		color: var(--color-ink-muted);
		font-size: 1.5rem;
	}

	.join-url {
		font-size: 1.25rem;
		color: var(--color-ink-muted);
		font-family: monospace;
	}

	.players-section {
		flex: 1;
		max-width: 600px;
	}

	.players-section h2 {
		font-size: 2rem;
		color: var(--color-ink);
		margin: 0 0 1.5rem;
	}

	.player-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 1rem;
	}

	.player-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.25rem;
		background: var(--color-card);
		border-radius: 0.75rem;
		border: 2px solid var(--color-border);
	}

	.player-avatar {
		font-size: 2.5rem;
	}

	.player-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.waiting-text {
		font-size: 1.5rem;
		color: var(--color-ink-muted);
		grid-column: 1 / -1;
		text-align: center;
		padding: 2rem;
	}
</style>
