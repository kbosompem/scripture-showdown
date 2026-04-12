<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { AVATAR_EMOJI, GAME_MODE_LABELS, type GameMode, type Avatar } from '$lib/types/index.js';

	let {
		onStart,
		canStart = false,
		packs = []
	}: {
		onStart: (packSlug: string, mode: GameMode, numRounds: number) => void;
		canStart: boolean;
		packs: { slug: string; name: string; icon: string; verseCount: number }[];
	} = $props();

	let showSetup = $state(false);
	let selectedPack = $state('');
	let selectedMode = $state<GameMode>('fill-the-gap');
	let numRounds = $state(10);

	const modes: { value: GameMode; label: string }[] = [
		{ value: 'fill-the-gap', label: 'Fill the Gap' },
		{ value: 'name-that-reference', label: 'Name That Reference' },
		{ value: 'quote-it', label: 'Quote It' },
		{ value: 'speed-recall', label: 'Speed Recall' }
	];

	function handleStart() {
		if (selectedPack && selectedMode) {
			onStart(selectedPack, selectedMode, numRounds);
		}
	}
</script>

<div class="waiting-screen">
	<div class="player-badge">
		<span class="badge-avatar">{AVATAR_EMOJI[gameStore.players.find(p => p.connected)?.avatar as Avatar || 'lion']}</span>
		<span class="badge-name">You're in!</span>
	</div>

	<div class="player-list">
		<h3>Players ({gameStore.players.filter(p => p.connected).length})</h3>
		<div class="player-chips">
			{#each gameStore.players.filter(p => p.connected) as player (player.id)}
				<span class="chip">{AVATAR_EMOJI[player.avatar]} {player.name}</span>
			{/each}
		</div>
	</div>

	{#if canStart}
		{#if !showSetup}
			<button class="btn btn-primary start-btn" onclick={() => showSetup = true}>
				Start Game
			</button>
		{:else}
			<div class="setup-form">
				<label class="field-label">Theme</label>
				<div class="pack-grid">
					{#each packs as pack (pack.slug)}
						<button
							class="pack-btn"
							class:selected={selectedPack === pack.slug}
							onclick={() => selectedPack = pack.slug}
						>
							<span class="pack-icon">{pack.icon}</span>
							<span class="pack-name">{pack.name}</span>
							<span class="pack-count">{pack.verseCount} verses</span>
						</button>
					{/each}
				</div>

				<label class="field-label">Mode</label>
				<div class="mode-grid">
					{#each modes as m (m.value)}
						<button
							class="mode-btn"
							class:selected={selectedMode === m.value}
							onclick={() => selectedMode = m.value}
						>
							{m.label}
						</button>
					{/each}
				</div>

				<label class="field-label">Rounds: {numRounds}</label>
				<input type="range" min="5" max="25" step="5" bind:value={numRounds} class="range-input" />

				<button
					class="btn btn-primary start-btn"
					disabled={!selectedPack}
					onclick={handleStart}
				>
					Let's Go!
				</button>
			</div>
		{/if}
	{:else}
		<p class="waiting-text">Waiting for someone to start the game...</p>
	{/if}
</div>

<style>
	.waiting-screen {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		padding: 2rem 1.5rem;
		background: var(--color-page);
		gap: 1.5rem;
	}

	.player-badge {
		display: flex;
		align-items: center;
		gap: 1rem;
		justify-content: center;
	}

	.badge-avatar { font-size: 2.5rem; }
	.badge-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-correct);
	}

	.player-list h3 {
		font-size: 1rem;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem;
	}

	.player-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		padding: 0.375rem 0.75rem;
		background: var(--color-card);
		border: 1px solid var(--color-border);
		border-radius: 2rem;
		font-size: 0.875rem;
	}

	.start-btn {
		width: 100%;
		font-size: 1.25rem;
		padding: 1rem;
	}

	.start-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.setup-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.pack-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.pack-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-card);
		cursor: pointer;
	}

	.pack-btn.selected {
		border-color: var(--color-accent);
		background: white;
	}

	.pack-icon { font-size: 1.5rem; }
	.pack-name { font-size: 0.875rem; font-weight: 700; color: var(--color-ink); }
	.pack-count { font-size: 0.75rem; color: var(--color-ink-muted); }

	.mode-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.mode-btn {
		padding: 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-card);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
		cursor: pointer;
	}

	.mode-btn.selected {
		border-color: var(--color-accent);
		background: white;
		color: var(--color-accent);
	}

	.range-input {
		width: 100%;
		accent-color: var(--color-accent);
	}

	.waiting-text {
		text-align: center;
		color: var(--color-ink-muted);
		font-size: 1.125rem;
		padding: 2rem;
	}
</style>
