<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { AVATAR_EMOJI } from '$lib/types/index.js';

	let data = $derived(gameStore.finalData);
	let champion = $derived(data?.champion);
	let rest = $derived(data?.leaderboard.slice(1) || []);
</script>

<div class="final-screen">
	<h1>&#10022; FINAL &#10022;</h1>

	{#if champion}
		<div class="champion-section">
			<div class="crown animate-bounce-in">&#128081;</div>
			<span class="champion-avatar">{AVATAR_EMOJI[champion.avatar]}</span>
			<h2 class="champion-name">{champion.name}</h2>
			<p class="champion-score">{champion.score.toLocaleString()} pts</p>
		</div>
	{/if}

	<div class="rest-standings">
		{#each rest as entry, i (entry.playerId)}
			<div class="standing-row animate-fade-in-up" style="animation-delay: {(i + 1) * 150}ms">
				<span class="stand-rank">
					{#if entry.rank === 2}&#129352;{:else if entry.rank === 3}&#129353;{:else}{entry.rank}{/if}
				</span>
				<span class="stand-avatar">{AVATAR_EMOJI[entry.avatar]}</span>
				<span class="stand-name">{entry.name}</span>
				<span class="stand-score">{entry.score.toLocaleString()}</span>
			</div>
		{/each}
	</div>

	{#if data?.mvpVerse || data?.toughestVerse}
		<div class="stats-row">
			{#if data?.mvpVerse}
				<div class="stat">
					<span class="stat-label">MVP Verse</span>
					<span class="stat-value">{data.mvpVerse.reference}</span>
					<span class="stat-sub">{data.mvpVerse.correctCount} got it right</span>
				</div>
			{/if}
			{#if data?.toughestVerse}
				<div class="stat">
					<span class="stat-label">Toughest</span>
					<span class="stat-value">{data.toughestVerse.reference}</span>
					<span class="stat-sub">{data.toughestVerse.correctCount} got it right</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.final-screen {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--color-page);
		padding: 2rem;
		gap: 1.5rem;
	}

	h1 {
		font-family: var(--font-verse);
		font-size: 3rem;
		color: var(--color-gold);
		letter-spacing: 0.3em;
	}

	.champion-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.crown {
		font-size: 4rem;
	}

	.champion-avatar {
		font-size: 5rem;
	}

	.champion-name {
		font-size: 3.5rem;
		font-weight: 900;
		color: var(--color-ink);
		margin: 0;
	}

	.champion-score {
		font-size: 2rem;
		color: var(--color-gold);
		font-weight: 700;
	}

	.rest-standings {
		display: flex;
		gap: 2rem;
		margin-top: 1rem;
	}

	.standing-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-card);
		border-radius: 0.75rem;
		border: 2px solid var(--color-border);
	}

	.stand-rank {
		font-size: 2rem;
	}

	.stand-avatar {
		font-size: 1.75rem;
	}

	.stand-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.stand-score {
		font-size: 1.25rem;
		color: var(--color-ink-muted);
		font-weight: 600;
	}

	.stats-row {
		display: flex;
		gap: 3rem;
		margin-top: 2rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 1rem;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.stat-value {
		font-family: var(--font-verse);
		font-size: 1.5rem;
		color: var(--color-ink);
		font-weight: 700;
	}

	.stat-sub {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
	}
</style>
