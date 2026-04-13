<script lang="ts">
	import Timer from '$lib/components/shared/Timer.svelte';
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { GAME_MODE_LABELS, AVATAR_EMOJI } from '$lib/types/index.js';

	let q = $derived(gameStore.tvQuestion);
	let modeLabel = $derived(q?.mode ? GAME_MODE_LABELS[q.mode] : '');
</script>

<div class="question-screen">
	<header class="question-header">
		<div class="header-left">
			<span class="round-info">Round {q?.round} of {q?.totalRounds}</span>
			<span class="mode-label">{modeLabel}</span>
		</div>
		<Timer remaining={gameStore.timer} total={gameStore.timeLimit} />
	</header>

	<main class="question-body">
		{#if q?.mode === 'fill-the-gap'}
			<p class="verse-display">
				{@html (q.textWithBlanks || '').replace(
					/___(\d+)___/g,
					'<span class="blank">____$1____</span>'
				)}
			</p>
			{#if q.reference}
				<p class="verse-ref">&mdash; {q.reference}</p>
			{/if}

		{:else if q?.mode === 'name-that-reference'}
			<p class="verse-display">&ldquo;{q.text}&rdquo;</p>
			<p class="instruction">Name the Book, Chapter & Verse</p>

		{:else if q?.mode === 'quote-it'}
			{#if q.reference}
				<p class="reference-display">{q.reference}</p>
			{/if}
			{#if q.textWithBlanks}
				<p class="verse-display verse-blanked">
					{@html (q.textWithBlanks || '').replace(
						/___(\d+)___/g,
						'<span class="blank">____$1____</span>'
					)}
				</p>
			{/if}
			<p class="instruction">Fill in the missing words</p>

		{:else if q?.mode === 'speed-recall'}
			{#if !gameStore.speedRecallHidden}
				<p class="verse-display">&ldquo;{q.text}&rdquo;</p>
				{#if q.reference}
					<p class="verse-ref">&mdash; {q.reference}</p>
				{/if}
				<p class="memorize-warning">Memorize this verse!</p>
			{:else}
				<p class="hidden-verse">Verse hidden &mdash; write what you remember!</p>
			{/if}
		{/if}
	</main>

	<footer class="question-footer">
		{#each gameStore.players.filter(p => p.connected) as player (player.id)}
			<span class="player-status">
				<span class="player-emoji">{AVATAR_EMOJI[player.avatar]}</span>
				<span class="player-name-small">{player.name}</span>
				{#if gameStore.answeredCount > 0}
					<span class="status-dot answered">&#10003;</span>
				{:else}
					<span class="status-dot waiting">&middot; &middot; &middot;</span>
				{/if}
			</span>
		{/each}
	</footer>
</div>

<style>
	.question-screen {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-page);
		padding: 1.5rem 3rem;
	}

	.question-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--color-border);
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.round-info { font-size: 1.25rem; color: var(--color-ink-muted); }
	.mode-label { font-size: 1.75rem; font-weight: 700; color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.1em; }

	.question-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 2rem 0;
	}

	.verse-display {
		font-family: var(--font-verse);
		font-size: 2.75rem;
		line-height: 1.7;
		color: var(--color-ink-verse);
		text-align: center;
		max-width: 85%;
	}

	.verse-blanked {
		font-size: 2rem;
	}

	.verse-display :global(.blank) {
		color: var(--color-accent);
		font-weight: 700;
		border-bottom: 3px solid var(--color-accent);
		padding: 0 0.25rem;
	}

	.verse-ref {
		font-family: var(--font-ui);
		font-size: 1.5rem;
		color: var(--color-ink-muted);
		font-style: italic;
	}

	.reference-display {
		font-family: var(--font-verse);
		font-size: 4rem;
		font-weight: 900;
		color: var(--color-ink);
	}

	.instruction { font-size: 1.75rem; color: var(--color-ink-muted); }

	.memorize-warning {
		font-size: 1.5rem;
		color: var(--color-accent);
		font-weight: 700;
		animation: pulse 0.8s ease-in-out infinite alternate;
	}

	.hidden-verse { font-size: 2.5rem; color: var(--color-ink-muted); font-style: italic; }

	@keyframes pulse {
		from { opacity: 0.7; }
		to { opacity: 1; }
	}

	.question-footer {
		display: flex;
		gap: 2rem;
		justify-content: center;
		padding-top: 1rem;
		border-top: 2px solid var(--color-border);
	}

	.player-status { display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; }
	.player-emoji { font-size: 1.5rem; }
	.player-name-small { color: var(--color-ink); font-weight: 600; }
	.status-dot { font-size: 1rem; }
	.answered { color: var(--color-correct); font-weight: bold; }
	.waiting { color: var(--color-ink-muted); }
</style>
