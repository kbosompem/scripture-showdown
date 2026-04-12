<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import Timer from '$lib/components/shared/Timer.svelte';

	let { onSubmit }: { onSubmit: (answer: string | string[]) => void } = $props();

	// Fill-the-gap: array of inputs
	let gapAnswers = $state<string[]>(
		Array(gameStore.phoneQuestion?.blankCount || 4).fill('')
	);

	// Free text: single textarea
	let textAnswer = $state('');

	// Name That Reference: book/chapter/verse
	let selectedBook = $state('');
	let selectedChapter = $state('');
	let selectedVerse = $state('');

	let mode = $derived(gameStore.phoneQuestion?.mode);
	let showVerseForRecall = $derived(mode === 'speed-recall' && !gameStore.speedRecallHidden);

	function submit() {
		if (gameStore.hasAnswered) return;

		if (mode === 'fill-the-gap') {
			onSubmit(gapAnswers);
		} else if (mode === 'name-that-reference') {
			onSubmit(`${selectedBook} ${selectedChapter}:${selectedVerse}`);
		} else {
			onSubmit(textAnswer);
		}
	}

	function skip() {
		if (mode === 'fill-the-gap') {
			onSubmit(Array(gapAnswers.length).fill(''));
		} else {
			onSubmit('');
		}
	}

	// Load bible structure for reference selector
	import bibleStructure from '$lib/data/bible-structure.json';

	let books = bibleStructure.books.map(b => b.name);
	let chapters = $derived(
		selectedBook
			? Array.from({ length: bibleStructure.books.find(b => b.name === selectedBook)?.chapters.length || 0 }, (_, i) => i + 1)
			: []
	);
	let verses = $derived(
		selectedBook && selectedChapter
			? Array.from({ length: bibleStructure.books.find(b => b.name === selectedBook)?.chapters[parseInt(selectedChapter) - 1] || 0 }, (_, i) => i + 1)
			: []
	);
</script>

<div class="answer-screen">
	<header class="answer-header">
		<span class="round-label">Round {gameStore.phoneQuestion?.round}/{gameStore.phoneQuestion?.totalRounds}</span>
		<Timer remaining={gameStore.timer} total={gameStore.timeLimit} />
	</header>

	{#if gameStore.hasAnswered}
		<div class="submitted-msg">
			<span class="check">&#10003;</span>
			<p>Answer submitted!</p>
			<p class="waiting-reveal">Waiting for results...</p>
		</div>
	{:else if showVerseForRecall}
		<div class="recall-display">
			<p class="recall-instruction">Memorize this verse!</p>
			<p class="recall-verse">&ldquo;{gameStore.phoneQuestion?.text}&rdquo;</p>
			{#if gameStore.phoneQuestion?.reference}
				<p class="recall-ref">&mdash; {gameStore.phoneQuestion.reference}</p>
			{/if}
		</div>
	{:else}
		<div class="input-area">
			{#if mode === 'fill-the-gap'}
				<p class="input-instruction">Type the missing words</p>
				{#each gapAnswers as _, i}
					<div class="gap-field">
						<label class="gap-label">{i + 1}.</label>
						<input
							type="text"
							class="input"
							bind:value={gapAnswers[i]}
							placeholder="Missing word {i + 1}"
							autocomplete="off"
							autocapitalize="off"
						/>
					</div>
				{/each}

			{:else if mode === 'name-that-reference'}
				<p class="input-instruction">Select Book, Chapter & Verse</p>
				<select class="input select" bind:value={selectedBook}>
					<option value="">Book...</option>
					{#each books as book}
						<option value={book}>{book}</option>
					{/each}
				</select>
				<div class="chapter-verse-row">
					<select class="input select" bind:value={selectedChapter} disabled={!selectedBook}>
						<option value="">Ch.</option>
						{#each chapters as ch}
							<option value={String(ch)}>{ch}</option>
						{/each}
					</select>
					<select class="input select" bind:value={selectedVerse} disabled={!selectedChapter}>
						<option value="">V.</option>
						{#each verses as v}
							<option value={String(v)}>{v}</option>
						{/each}
					</select>
				</div>
				{#if selectedBook && selectedChapter && selectedVerse}
					<p class="preview-ref">{selectedBook} {selectedChapter}:{selectedVerse}</p>
				{/if}

			{:else if mode === 'quote-it'}
				<p class="input-instruction">Quote: {gameStore.phoneQuestion?.reference}</p>
				<textarea
					class="input textarea"
					bind:value={textAnswer}
					placeholder="Type the verse from memory..."
					rows="5"
				></textarea>
				<p class="fuzzy-note">Typos are OK — fuzzy matching is on</p>

			{:else if mode === 'speed-recall'}
				<p class="input-instruction">Write what you remember!</p>
				<textarea
					class="input textarea"
					bind:value={textAnswer}
					placeholder="Type the verse from memory..."
					rows="5"
				></textarea>
				<p class="fuzzy-note">Typos are OK — fuzzy matching is on</p>
			{/if}
		</div>

		<div class="action-buttons">
			<button class="btn btn-primary submit-btn" onclick={submit}>
				Submit
			</button>
			<button class="btn btn-secondary skip-btn" onclick={skip}>
				I don't know
			</button>
		</div>
	{/if}
</div>

<style>
	.answer-screen {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		padding: 1rem 1.5rem;
		background: var(--color-page);
	}

	.answer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 1rem;
	}

	.round-label {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-ink-muted);
	}

	.submitted-msg {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.check {
		font-size: 3rem;
		color: var(--color-correct);
	}

	.submitted-msg p {
		font-size: 1.25rem;
		color: var(--color-ink);
		font-weight: 600;
	}

	.waiting-reveal {
		color: var(--color-ink-muted) !important;
		font-weight: 400 !important;
	}

	.recall-display {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 1rem;
	}

	.recall-instruction {
		font-size: 1.25rem;
		color: var(--color-accent);
		font-weight: 700;
	}

	.recall-verse {
		font-family: var(--font-verse);
		font-size: 1.25rem;
		line-height: 1.8;
		color: var(--color-ink-verse);
		text-align: center;
	}

	.recall-ref {
		font-style: italic;
		color: var(--color-ink-muted);
	}

	.input-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.input-instruction {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.gap-field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.gap-label {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-accent);
		width: 2rem;
	}

	.select {
		appearance: auto;
	}

	.chapter-verse-row {
		display: flex;
		gap: 0.75rem;
	}

	.chapter-verse-row .select {
		flex: 1;
	}

	.preview-ref {
		font-family: var(--font-verse);
		font-size: 1.25rem;
		color: var(--color-accent);
		text-align: center;
		font-weight: 700;
	}

	.textarea {
		resize: none;
		font-family: var(--font-verse);
		line-height: 1.6;
	}

	.fuzzy-note {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 0;
	}

	.submit-btn, .skip-btn {
		width: 100%;
	}
</style>
