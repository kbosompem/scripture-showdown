<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { AVATAR_EMOJI } from '$lib/types/index.js';
</script>

<div class="reveal-screen">
	<header class="reveal-header">
		<span class="check-mark">&#10003;</span>
		<h2>{gameStore.revealData?.correctReference || gameStore.revealData?.correctAnswer}</h2>
	</header>

	{#if gameStore.revealData?.fullVerseText}
		<p class="full-verse">&ldquo;{gameStore.revealData.fullVerseText}&rdquo;</p>
		{#if gameStore.revealData.correctReference && gameStore.revealData.correctReference !== gameStore.revealData.correctAnswer}
			<p class="verse-ref">&mdash; {gameStore.revealData.correctReference}</p>
		{/if}
	{:else if gameStore.revealData?.correctReference && gameStore.revealData.correctAnswer !== gameStore.revealData.correctReference}
		<p class="correct-answer">{gameStore.revealData.correctAnswer}</p>
	{/if}

	<div class="results-list">
		{#each gameStore.revealData?.results || [] as result, i (result.playerId)}
			<div
				class="result-row animate-fade-in-up"
				class:correct={result.isCorrect}
				class:wrong={!result.isCorrect}
				style="animation-delay: {i * 100}ms"
			>
				<span class="result-avatar">{AVATAR_EMOJI[result.avatar]}</span>
				<span class="result-name">{result.playerName}</span>
				<span class="result-answer">{result.answerText || '—'}</span>
				<span class="result-points" class:zero={result.totalPoints === 0}>
					{result.totalPoints > 0 ? '+' : ''}{result.totalPoints}
				</span>
				{#if result.newStreak >= 2}
					<span class="streak">&#128293;&times;{result.newStreak}</span>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.reveal-screen {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--color-page);
		padding: 2rem 3rem;
		gap: 1rem;
	}

	.reveal-header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.check-mark {
		font-size: 3rem;
		color: var(--color-correct);
		font-weight: bold;
	}

	.reveal-header h2 {
		font-family: var(--font-verse);
		font-size: 2.5rem;
		color: var(--color-ink);
		margin: 0;
	}

	.full-verse {
		font-family: var(--font-verse);
		font-size: 1.5rem;
		color: var(--color-ink-verse);
		max-width: 80%;
		text-align: center;
		line-height: 1.7;
	}

	.verse-ref {
		font-style: italic;
		font-size: 1.25rem;
		color: var(--color-ink-muted);
	}

	.correct-answer {
		font-family: var(--font-verse);
		font-size: 1.5rem;
		color: var(--color-ink-muted);
		max-width: 70%;
		text-align: center;
		line-height: 1.6;
	}

	.results-list {
		width: 100%;
		max-width: 800px;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow-y: auto;
		flex: 1;
	}

	.result-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		border: 2px solid var(--color-border);
		background: var(--color-card);
	}

	.result-row.correct {
		border-color: var(--color-correct);
		background: rgba(46, 125, 50, 0.05);
	}

	.result-row.wrong {
		border-color: var(--color-wrong);
		background: rgba(198, 40, 40, 0.03);
	}

	.result-avatar { font-size: 2rem; }
	.result-name { font-size: 1.5rem; font-weight: 700; color: var(--color-ink); width: 120px; }
	.result-answer { flex: 1; font-size: 1.25rem; color: var(--color-ink-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.result-points { font-size: 1.5rem; font-weight: 800; color: var(--color-correct); min-width: 100px; text-align: right; }
	.result-points.zero { color: var(--color-ink-muted); }
	.streak { font-size: 1.25rem; }
</style>
