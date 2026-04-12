<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { AVATAR_EMOJI } from '$lib/types/index.js';

	let maxScore = $derived(Math.max(1, ...gameStore.leaderboard.map(e => e.score)));
</script>

<div class="leaderboard-screen">
	<h2>Leaderboard</h2>
	<div class="divider-ornament">&#10045;</div>

	<div class="board">
		{#each gameStore.leaderboard as entry, i (entry.playerId)}
			{@const barWidth = (entry.score / maxScore) * 100}
			{@const moved = entry.previousRank !== entry.rank}
			<div class="board-row animate-fade-in-up" style="animation-delay: {i * 120}ms">
				<span class="rank" class:first={entry.rank === 1}>{entry.rank}</span>
				<span class="avatar">{AVATAR_EMOJI[entry.avatar]}</span>
				<span class="name">{entry.name}</span>
				<div class="bar-container">
					<div
						class="bar"
						style="width: {barWidth}%"
						class:first={entry.rank === 1}
					></div>
				</div>
				<span class="score">{entry.score.toLocaleString()}</span>
				{#if entry.streak >= 2}
					<span class="streak">&#128293;&times;{entry.streak}</span>
				{/if}
				{#if moved}
					<span class="movement" class:up={entry.rank < entry.previousRank} class:down={entry.rank > entry.previousRank}>
						{entry.rank < entry.previousRank ? '&#9650;' : '&#9660;'}
					</span>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.leaderboard-screen {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--color-page);
		padding: 3rem;
		gap: 1.5rem;
	}

	h2 {
		font-family: var(--font-verse);
		font-size: 3.5rem;
		color: var(--color-ink);
		margin: 0;
	}

	.board {
		width: 100%;
		max-width: 900px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.board-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-card);
		border-radius: 0.75rem;
		border: 2px solid var(--color-border);
	}

	.rank {
		font-size: 2rem;
		font-weight: 800;
		color: var(--color-ink-muted);
		width: 50px;
		text-align: center;
	}

	.rank.first {
		color: var(--color-gold);
	}

	.avatar {
		font-size: 2rem;
	}

	.name {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-ink);
		width: 120px;
	}

	.bar-container {
		flex: 1;
		height: 24px;
		background: var(--color-surface);
		border-radius: 12px;
		overflow: hidden;
	}

	.bar {
		height: 100%;
		background: var(--color-accent);
		border-radius: 12px;
		transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.bar.first {
		background: var(--color-gold);
	}

	.score {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--color-ink);
		min-width: 100px;
		text-align: right;
	}

	.streak {
		font-size: 1.25rem;
	}

	.movement {
		font-size: 1.25rem;
	}

	.up { color: var(--color-correct); }
	.down { color: var(--color-wrong); }
</style>
