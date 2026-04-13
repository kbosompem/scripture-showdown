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

	// Name That Reference: step-based selector
	let selectedBook = $state('');
	let selectedChapter = $state('');
	let selectedVerse = $state('');
	let refStep = $state<'book' | 'chapter' | 'verse'>('book');

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

	// Short book name for grid display
	function shortName(name: string): string {
		const abbrevs: Record<string, string> = {
			'Genesis': 'Gen', 'Exodus': 'Exod', 'Leviticus': 'Lev', 'Numbers': 'Num',
			'Deuteronomy': 'Deut', 'Joshua': 'Josh', 'Judges': 'Judg', 'Ruth': 'Ruth',
			'1 Samuel': '1 Sam', '2 Samuel': '2 Sam', '1 Kings': '1 Kgs', '2 Kings': '2 Kgs',
			'1 Chronicles': '1 Chr', '2 Chronicles': '2 Chr', 'Ezra': 'Ezra', 'Nehemiah': 'Neh',
			'Esther': 'Esth', 'Job': 'Job', 'Psalms': 'Ps', 'Proverbs': 'Prov',
			'Ecclesiastes': 'Eccl', 'Song of Solomon': 'Song', 'Isaiah': 'Isa', 'Jeremiah': 'Jer',
			'Lamentations': 'Lam', 'Ezekiel': 'Ezek', 'Daniel': 'Dan', 'Hosea': 'Hos',
			'Joel': 'Joel', 'Amos': 'Amos', 'Obadiah': 'Obad', 'Jonah': 'Jonah',
			'Micah': 'Mic', 'Nahum': 'Nah', 'Habakkuk': 'Hab', 'Zephaniah': 'Zeph',
			'Haggai': 'Hag', 'Zechariah': 'Zech', 'Malachi': 'Mal',
			'Matthew': 'Matt', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
			'Acts': 'Acts', 'Romans': 'Rom', '1 Corinthians': '1 Cor', '2 Corinthians': '2 Cor',
			'Galatians': 'Gal', 'Ephesians': 'Eph', 'Philippians': 'Phil', 'Colossians': 'Col',
			'1 Thessalonians': '1 Thes', '2 Thessalonians': '2 Thes', '1 Timothy': '1 Tim',
			'2 Timothy': '2 Tim', 'Titus': 'Titus', 'Philemon': 'Phlm', 'Hebrews': 'Heb',
			'James': 'Jas', '1 Peter': '1 Pet', '2 Peter': '2 Pet', '1 John': '1 Jn',
			'2 John': '2 Jn', '3 John': '3 Jn', 'Jude': 'Jude', 'Revelation': 'Rev'
		};
		return abbrevs[name] || name;
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
						<span class="gap-label">{i + 1}.</span>
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
				{#if refStep === 'book'}
					<p class="input-instruction">Select a Book</p>
					<div class="book-grid">
						{#each books as book (book)}
							<button
								type="button"
								class="grid-btn book-btn"
								onclick={() => selectBook(book)}
							>
								{shortName(book)}
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
			{#if mode !== 'name-that-reference' || selectedVerse}
				<button class="btn btn-primary submit-btn" onclick={submit}>
					Submit
				</button>
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
		overflow-y: auto;
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

	/* ── Book grid (7 columns) ── */
	.book-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.3rem;
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
		padding: 0.4rem 0.15rem;
		font-size: 0.65rem;
		min-height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* ── Number grid (7 columns for ch/verse) ── */
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

	.step-selection {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-accent);
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
