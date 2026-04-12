<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { AVATAR_EMOJI } from '$lib/types/index.js';

	let fb = $derived(gameStore.myFeedback);
	let myRank = $derived(gameStore.leaderboard.findIndex(e => e.score === fb?.newScore) + 1 || '—');
</script>

<div class="feedback-screen" class:correct={fb?.isCorrect} class:wrong={fb && !fb.isCorrect}>
	<div class="feedback-icon animate-bounce-in">
		{#if fb?.isCorrect}
			<span class="icon correct-icon">&#10003;</span>
			<h2>Correct!</h2>
		{:else}
			<span class="icon wrong-icon">&#10007;</span>
			<h2>Not quite</h2>
		{/if}
	</div>

	{#if fb}
		<div class="points-display">
			<span class="points-value">+{fb.totalPoints}</span>
			{#if fb.newStreak >= 2}
				<span class="streak-badge">&#128293; &times;{fb.newStreak}</span>
			{/if}
		</div>

		{#if fb.speedBonus > 0}
			<p class="bonus-line">Speed bonus: +{fb.speedBonus}</p>
		{/if}

		{#if fb.streakMultiplier > 1}
			<p class="bonus-line">Streak: &times;{fb.streakMultiplier}</p>
		{/if}

		<div class="mini-leaderboard">
			{#each gameStore.leaderboard.slice(0, 5) as entry (entry.playerId)}
				<div class="mini-row" class:is-me={entry.score === fb.newScore && entry.name === fb.playerName}>
					<span class="mini-rank">{entry.rank}</span>
					<span class="mini-avatar">{AVATAR_EMOJI[entry.avatar]}</span>
					<span class="mini-name">{entry.name}</span>
					<span class="mini-score">{entry.score.toLocaleString()}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.feedback-screen {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		gap: 1rem;
		background: var(--color-page);
	}

	.feedback-screen.correct {
		animation: flash-correct 1.5s ease forwards;
	}

	.feedback-screen.wrong {
		animation: flash-wrong 1.5s ease forwards;
	}

	@keyframes flash-correct {
		0% { background-color: var(--color-page); }
		15% { background-color: rgba(46, 125, 50, 0.12); }
		100% { background-color: var(--color-page); }
	}

	@keyframes flash-wrong {
		0% { background-color: var(--color-page); }
		15% { background-color: rgba(198, 40, 40, 0.1); }
		100% { background-color: var(--color-page); }
	}

	.feedback-icon {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.icon {
		font-size: 3rem;
		width: 4rem;
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.correct-icon {
		color: white;
		background: var(--color-correct);
	}

	.wrong-icon {
		color: white;
		background: var(--color-wrong);
	}

	h2 {
		font-size: 1.5rem;
		color: var(--color-ink);
		margin: 0;
	}

	.points-display {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.points-value {
		font-size: 2.5rem;
		font-weight: 900;
		color: var(--color-gold);
	}

	.streak-badge {
		font-size: 1.25rem;
		padding: 0.25rem 0.75rem;
		background: var(--color-card);
		border-radius: 2rem;
		border: 1px solid var(--color-border);
	}

	.bonus-line {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
	}

	.mini-leaderboard {
		width: 100%;
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.mini-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-card);
	}

	.mini-row.is-me {
		background: white;
		border: 2px solid var(--color-accent);
	}

	.mini-rank { font-weight: 700; color: var(--color-ink-muted); width: 1.5rem; }
	.mini-avatar { font-size: 1.25rem; }
	.mini-name { flex: 1; font-weight: 600; color: var(--color-ink); }
	.mini-score { font-weight: 700; color: var(--color-ink); }
</style>
