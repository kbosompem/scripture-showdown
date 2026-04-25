<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';
	import Timer from '$lib/components/shared/Timer.svelte';

	let { onSubmit }: { onSubmit: (answer: string | string[]) => void } = $props();

	// Fill-the-gap: array of inputs
	let gapAnswers = $state<string[]>(
		Array(gameStore.phoneQuestion?.blankCount || 4).fill('')
	);
	let gapInputs: HTMLInputElement[] = [];

	function handleGapKey(e: KeyboardEvent, i: number) {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		const next = gapInputs[i + 1];
		if (next) {
			next.focus();
			next.select();
		} else {
			submit();
		}
	}

	// Quote-it: word choice selections
	let quoteSelections = $state<string[]>(
		Array(gameStore.phoneQuestion?.blankCount || 3).fill('')
	);

	// Name That Reference: step-based selector
	let selectedBook = $state('');
	let selectedChapter = $state('');
	let selectedVerse = $state('');
	let refStep = $state<'testament' | 'book' | 'chapter' | 'verse'>('testament');
	let selectedTestament = $state<'OT' | 'NT' | ''>('');

	// Multiple choice (who-said-this, bible-numbers)
	let selectedChoice = $state('');

	// Single-book: chapter/verse picker only (book is known)
	let sbStep = $state<'chapter' | 'verse'>('chapter');
	let sbChapter = $state('');
	let sbVerse = $state('');

	let mode = $derived(gameStore.phoneQuestion?.mode);

	function submit() {
		if (gameStore.hasAnswered) return;

		if (mode === 'fill-the-gap') {
			onSubmit(gapAnswers);
		} else if (mode === 'name-that-reference') {
			onSubmit(`${selectedBook} ${selectedChapter}:${selectedVerse}`);
		} else if (mode === 'quote-it') {
			onSubmit(quoteSelections);
		} else if (mode === 'who-said-this' || mode === 'bible-numbers') {
			onSubmit(selectedChoice);
		} else if (mode === 'single-book') {
			onSubmit(`${sbChapter}:${sbVerse}`);
		}
	}

	function skip() {
		if (mode === 'fill-the-gap') {
			onSubmit(Array(gapAnswers.length).fill(''));
		} else if (mode === 'quote-it') {
			onSubmit(Array(quoteSelections.length).fill(''));
		} else {
			onSubmit('');
		}
	}

	function selectMultipleChoice(choice: string) {
		selectedChoice = choice;
	}

	function sbSelectChapter(ch: number) {
		sbChapter = String(ch);
		sbVerse = '';
		sbStep = 'verse';
	}

	function sbSelectVerse(v: number) {
		sbVerse = String(v);
	}

	function sbBackToChapter() {
		sbChapter = '';
		sbVerse = '';
		sbStep = 'chapter';
	}

	let sbBook = $derived(gameStore.phoneQuestion?.book || '');
	let sbChapterCount = $derived(
		sbBook
			? bibleStructure.books.find(b => b.name === sbBook)?.chapters.length || 0
			: 0
	);
	let sbVerseCount = $derived(
		sbBook && sbChapter
			? bibleStructure.books.find(b => b.name === sbBook)?.chapters[parseInt(sbChapter) - 1] || 0
			: 0
	);

	// Load bible structure for reference selector
	import bibleStructure from '$lib/data/bible-structure.json';

	const OT_BOOKS = bibleStructure.books.slice(0, 39);
	const NT_BOOKS = bibleStructure.books.slice(39);

	let filteredBooks = $derived(
		selectedTestament === 'OT' ? OT_BOOKS :
		selectedTestament === 'NT' ? NT_BOOKS :
		bibleStructure.books
	);

	let chapterCount = $derived(
		selectedBook
			? bibleStructure.books.find(b => b.name === selectedBook)?.chapters.length || 0
			: 0
	);
	let verseCount = $derived(
		selectedBook && selectedChapter
			? bibleStructure.books.find(b => b.name === selectedBook)?.chapters[parseInt(selectedChapter) - 1] || 0
			: 0
	);

	function selectTestament(t: 'OT' | 'NT') {
		selectedTestament = t;
		selectedBook = '';
		selectedChapter = '';
		selectedVerse = '';
		refStep = 'book';
	}

	function selectBook(book: string) {
		selectedBook = book;
		selectedChapter = '';
		selectedVerse = '';
		refStep = 'chapter';
	}

	function selectChapter(ch: number) {
		selectedChapter = String(ch);
		selectedVerse = '';
		refStep = 'verse';
	}

	function selectVerse(v: number) {
		selectedVerse = String(v);
	}

	function goBackToTestament() {
		selectedTestament = '';
		selectedBook = '';
		selectedChapter = '';
		selectedVerse = '';
		refStep = 'testament';
	}

	function goBackToBooks() {
		selectedBook = '';
		selectedChapter = '';
		selectedVerse = '';
		refStep = 'book';
	}

	function goBackToChapters() {
		selectedChapter = '';
		selectedVerse = '';
		refStep = 'chapter';
	}

	function selectQuoteWord(blankIndex: number, word: string) {
		quoteSelections[blankIndex] = word;
		quoteSelections = [...quoteSelections]; // trigger reactivity
	}
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
	{:else}
		<div class="input-area">
			{#if mode === 'fill-the-gap'}
				<p class="input-instruction">Type the missing words</p>
				{#each gapAnswers as _, i}
					<div class="gap-field">
						<span class="gap-label">{i + 1}.</span>
						<input
							type="text"
							class="input"
							bind:value={gapAnswers[i]}
							bind:this={gapInputs[i]}
							onkeydown={(e) => handleGapKey(e, i)}
							placeholder="Missing word {i + 1}"
							autocomplete="off"
							autocapitalize="off"
							enterkeyhint={i === gapAnswers.length - 1 ? 'send' : 'next'}
						/>
					</div>
				{/each}

			{:else if mode === 'name-that-reference'}
				{#if refStep === 'testament'}
					<p class="input-instruction">Select Testament</p>
					<div class="testament-grid">
						<button type="button" class="grid-btn testament-btn" onclick={() => selectTestament('OT')}>
							Old Testament
						</button>
						<button type="button" class="grid-btn testament-btn" onclick={() => selectTestament('NT')}>
							New Testament
						</button>
					</div>

				{:else if refStep === 'book'}
					<div class="step-header">
						<button type="button" class="back-btn" onclick={goBackToTestament}>&#8592; Back</button>
						<span class="step-selection">{selectedTestament === 'OT' ? 'Old Testament' : 'New Testament'}</span>
					</div>
					<p class="input-instruction">Select Book</p>
					<div class="book-grid">
						{#each filteredBooks as book (book.name)}
							<button
								type="button"
								class="grid-btn book-btn"
								onclick={() => selectBook(book.name)}
							>
								{book.name}
							</button>
						{/each}
					</div>

				{:else if refStep === 'chapter'}
					<div class="step-header">
						<button type="button" class="back-btn" onclick={goBackToBooks}>&#8592; Books</button>
						<span class="step-selection">{selectedBook}</span>
					</div>
					<p class="input-instruction">Select Chapter</p>
					<div class="num-grid">
						{#each Array.from({ length: chapterCount }, (_, i) => i + 1) as ch (ch)}
							<button
								type="button"
								class="grid-btn num-btn"
								onclick={() => selectChapter(ch)}
							>
								{ch}
							</button>
						{/each}
					</div>

				{:else if refStep === 'verse'}
					<div class="step-header">
						<button type="button" class="back-btn" onclick={goBackToChapters}>&#8592; Ch.</button>
						<span class="step-selection">{selectedBook} {selectedChapter}</span>
					</div>
					<p class="input-instruction">Select Verse</p>
					<div class="num-grid">
						{#each Array.from({ length: verseCount }, (_, i) => i + 1) as v (v)}
							<button
								type="button"
								class="grid-btn num-btn"
								class:selected-num={selectedVerse === String(v)}
								onclick={() => selectVerse(v)}
							>
								{v}
							</button>
						{/each}
					</div>
					{#if selectedVerse}
						<p class="preview-ref">{selectedBook} {selectedChapter}:{selectedVerse}</p>
					{/if}
				{/if}

			{:else if mode === 'who-said-this' || mode === 'bible-numbers'}
				<p class="input-instruction">{gameStore.phoneQuestion?.question}</p>
				<div class="choice-grid">
					{#each gameStore.phoneQuestion?.choices || [] as choice (choice)}
						<button
							type="button"
							class="choice-btn"
							class:selected-choice={selectedChoice === choice}
							onclick={() => selectMultipleChoice(choice)}
						>
							{choice}
						</button>
					{/each}
				</div>

			{:else if mode === 'single-book'}
				{#if sbStep === 'chapter'}
					<p class="input-instruction">Book: <strong>{sbBook}</strong></p>
					<p class="input-instruction">Select Chapter</p>
					<div class="num-grid">
						{#each Array.from({ length: sbChapterCount }, (_, i) => i + 1) as ch (ch)}
							<button type="button" class="grid-btn num-btn" onclick={() => sbSelectChapter(ch)}>
								{ch}
							</button>
						{/each}
					</div>
				{:else if sbStep === 'verse'}
					<div class="step-header">
						<button type="button" class="back-btn" onclick={sbBackToChapter}>&#8592; Ch.</button>
						<span class="step-selection">{sbBook} {sbChapter}</span>
					</div>
					<p class="input-instruction">Select Verse</p>
					<div class="num-grid">
						{#each Array.from({ length: sbVerseCount }, (_, i) => i + 1) as v (v)}
							<button
								type="button"
								class="grid-btn num-btn"
								class:selected-num={sbVerse === String(v)}
								onclick={() => sbSelectVerse(v)}
							>
								{v}
							</button>
						{/each}
					</div>
					{#if sbVerse}
						<p class="preview-ref">{sbBook} {sbChapter}:{sbVerse}</p>
					{/if}
				{/if}

			{:else if mode === 'quote-it'}
				<p class="input-instruction">{gameStore.phoneQuestion?.reference}</p>
				{#if gameStore.phoneQuestion?.textWithBlanks}
					<p class="quote-verse">
						{@html (gameStore.phoneQuestion.textWithBlanks).replace(
							/___(\d+)___/g,
							(_, num) => {
								const idx = parseInt(num) - 1;
								const selected = quoteSelections[idx];
								return selected
									? `<span class="filled-blank">${selected}</span>`
									: `<span class="empty-blank">____${num}____</span>`;
							}
						)}
					</p>
				{/if}
				{#each gameStore.phoneQuestion?.wordChoices || [] as choices, i}
					<div class="word-choice-group">
						<span class="choice-label">{i + 1}.</span>
						<div class="word-choices">
							{#each choices as word}
								<button
									type="button"
									class="word-btn"
									class:selected-word={quoteSelections[i] === word}
									onclick={() => selectQuoteWord(i, word)}
								>
									{word}
								</button>
							{/each}
						</div>
					</div>
				{/each}

			{/if}
		</div>

		<div class="action-buttons">
			{#if mode === 'name-that-reference'}
				{#if selectedVerse}
					<button class="btn btn-primary submit-btn" onclick={submit}>Submit</button>
				{/if}
			{:else if mode === 'quote-it'}
				{#if quoteSelections.every(s => s !== '')}
					<button class="btn btn-primary submit-btn" onclick={submit}>Submit</button>
				{/if}
			{:else if mode === 'who-said-this' || mode === 'bible-numbers'}
				{#if selectedChoice}
					<button class="btn btn-primary submit-btn" onclick={submit}>Submit</button>
				{/if}
			{:else if mode === 'single-book'}
				{#if sbVerse}
					<button class="btn btn-primary submit-btn" onclick={submit}>Submit</button>
				{/if}
			{:else}
				<button class="btn btn-primary submit-btn" onclick={submit}>Submit</button>
			{/if}
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

	.round-label { font-size: 1rem; font-weight: 600; color: var(--color-ink-muted); }

	.submitted-msg {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.check { font-size: 3rem; color: var(--color-correct); }
	.submitted-msg p { font-size: 1.25rem; color: var(--color-ink); font-weight: 600; }
	.waiting-reveal { color: var(--color-ink-muted) !important; font-weight: 400 !important; }

	.input-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow-y: auto;
	}

	.input-instruction { font-size: 1rem; font-weight: 600; color: var(--color-ink); }

	.gap-field { display: flex; align-items: center; gap: 0.75rem; }
	.gap-label { font-size: 1.25rem; font-weight: 700; color: var(--color-accent); width: 2rem; }

	/* ── Testament selection (2 large buttons) ── */
	.testament-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.testament-btn {
		padding: 2rem 1rem;
		font-size: 1.125rem;
		font-weight: 700;
		min-height: 80px;
	}

	/* ── Book grid (5 columns, bigger buttons after OT/NT split) ── */
	.book-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.35rem;
	}

	.grid-btn {
		border: 2px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-card);
		cursor: pointer;
		font-weight: 600;
		color: var(--color-ink);
		transition: all 100ms ease;
		text-align: center;
	}

	.grid-btn:active {
		transform: scale(0.95);
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}

	.book-btn {
		padding: 0.5rem 0.25rem;
		font-size: 0.8rem;
		min-height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* ── Number grid (7 columns) ── */
	.num-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.35rem;
	}

	.num-btn {
		padding: 0.5rem 0.25rem;
		font-size: 0.95rem;
		min-height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.selected-num {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}

	/* ── Step navigation ── */
	.step-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.back-btn {
		background: var(--color-card);
		border: 2px solid var(--color-border);
		border-radius: 0.375rem;
		padding: 0.4rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-accent);
		cursor: pointer;
		min-height: 48px;
	}

	.step-selection { font-size: 1.125rem; font-weight: 700; color: var(--color-accent); }

	.preview-ref {
		font-family: var(--font-verse);
		font-size: 1.25rem;
		color: var(--color-accent);
		text-align: center;
		font-weight: 700;
	}

	/* ── Quote-it word choices ── */
	.quote-verse {
		font-family: var(--font-verse);
		font-size: 1rem;
		line-height: 1.8;
		color: var(--color-ink-verse);
		text-align: center;
		padding: 0.5rem;
	}

	.quote-verse :global(.empty-blank) {
		color: var(--color-accent);
		font-weight: 700;
		border-bottom: 2px solid var(--color-accent);
		padding: 0 0.15rem;
	}

	.quote-verse :global(.filled-blank) {
		color: white;
		background: var(--color-accent);
		font-weight: 700;
		padding: 0.1rem 0.4rem;
		border-radius: 0.25rem;
	}

	.word-choice-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.choice-label {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-accent);
		width: 1.5rem;
	}

	.word-choices {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		flex: 1;
	}

	.word-btn {
		padding: 0.5rem 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-card);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-ink);
		cursor: pointer;
		min-height: 48px;
		transition: all 100ms ease;
	}

	.word-btn:active {
		transform: scale(0.95);
	}

	.selected-word {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 0;
	}

	.submit-btn, .skip-btn { width: 100%; }

	/* ── Multiple-choice (who-said-this, bible-numbers) ── */
	.choice-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.choice-btn {
		padding: 1rem 0.75rem;
		border: 2px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-card);
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-ink);
		cursor: pointer;
		min-height: 72px;
		transition: all 120ms ease;
		text-align: center;
		word-break: break-word;
	}

	.choice-btn:active {
		transform: scale(0.96);
	}

	.selected-choice {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
		transform: scale(1.02);
	}
</style>
