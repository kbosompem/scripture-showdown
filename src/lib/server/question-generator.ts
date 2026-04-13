import type { Verse, Question, FillTheGapQuestion, NameThatReferenceQuestion, QuoteItQuestion, GameMode } from '../types/index.js';
import { getDb } from './db.js';

// Words to skip when creating blanks (too easy / not meaningful)
const STOP_WORDS = new Set([
	'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
	'of', 'with', 'by', 'is', 'it', 'he', 'she', 'his', 'her', 'not',
	'be', 'am', 'are', 'was', 'were', 'that', 'this', 'i', 'my', 'me',
	'ye', 'thy', 'thee', 'thou', 'which', 'who', 'whom', 'unto', 'upon',
	'as', 'so', 'if', 'no', 'do', 'hath', 'have', 'had', 'shall', 'will',
	'may', 'can', 'from', 'them', 'they', 'their', 'us', 'we', 'our',
	'him', 'all', 'than', 'nor'
]);

export function getVersesForPack(packSlug: string): Verse[] {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT v.id, v.pack_id as packId, v.book, v.chapter, v.verse_start as verseStart,
				v.verse_end as verseEnd, v.text, v.reference, v.keywords
			FROM verses v
			JOIN verse_packs vp ON v.pack_id = vp.id
			WHERE vp.slug = ?`
		)
		.all(packSlug) as Verse[];
	return rows;
}

export function generateQuestion(verse: Verse, mode: GameMode, allVerses?: Verse[]): Question {
	switch (mode) {
		case 'fill-the-gap':
			return generateFillTheGap(verse);
		case 'name-that-reference':
			return generateNameThatReference(verse);
		case 'quote-it':
			return generateQuoteIt(verse, allVerses || []);
	}
}

/** Get significant word indices from a word array */
function getSignificantIndices(words: string[]): number[] {
	const indices: number[] = [];
	for (let i = 0; i < words.length; i++) {
		const clean = words[i].replace(/[^\w]/g, '').toLowerCase();
		if (!STOP_WORDS.has(clean) && clean.length > 2) {
			indices.push(i);
		}
	}
	return indices;
}

/** Create blanks from a verse text */
function createBlanks(text: string, count: number): { textWithBlanks: string; blanks: { position: number; word: string }[] } {
	const words = text.split(/\s+/);
	const significantIndices = getSignificantIndices(words);
	const blankCount = Math.min(count, significantIndices.length);
	const shuffled = significantIndices.sort(() => Math.random() - 0.5);
	const selectedIndices = shuffled.slice(0, blankCount).sort((a, b) => a - b);

	const blanks: { position: number; word: string }[] = [];
	const displayWords = [...words];

	for (let i = 0; i < selectedIndices.length; i++) {
		const idx = selectedIndices[i];
		blanks.push({ position: i + 1, word: words[idx].replace(/[.,;:!?]$/, '') });
		displayWords[idx] = `___${i + 1}___`;
	}

	return { textWithBlanks: displayWords.join(' '), blanks };
}

/** Generate word choices (correct + distractors) for each blank */
function generateWordChoices(blanks: { position: number; word: string }[], verse: Verse, allVerses: Verse[]): string[][] {
	// Collect distractor pool from all verses
	const allWords = new Set<string>();
	for (const v of allVerses) {
		for (const w of v.text.split(/\s+/)) {
			const clean = w.replace(/[^\w]/g, '');
			if (clean.length > 2 && !STOP_WORDS.has(clean.toLowerCase())) {
				allWords.add(clean);
			}
		}
	}
	// Also add words from the current verse
	for (const w of verse.text.split(/\s+/)) {
		const clean = w.replace(/[^\w]/g, '');
		if (clean.length > 2) allWords.add(clean);
	}

	const wordPool = Array.from(allWords);

	return blanks.map(blank => {
		const correct = blank.word.replace(/[^\w]/g, '');
		// Pick 3 distractors that aren't the correct answer
		const distractors = new Set<string>();
		let attempts = 0;
		while (distractors.size < 3 && attempts < 100) {
			const candidate = wordPool[Math.floor(Math.random() * wordPool.length)];
			if (candidate && candidate.toLowerCase() !== correct.toLowerCase() && !distractors.has(candidate)) {
				distractors.add(candidate);
			}
			attempts++;
		}
		// Shuffle correct + distractors
		const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
		return choices;
	});
}

function generateFillTheGap(verse: Verse): FillTheGapQuestion {
	const words = verse.text.split(/\s+/);
	const significantIndices = getSignificantIndices(words);
	const blankCount = Math.min(Math.max(2, Math.floor(significantIndices.length / 3)), 4);
	const { textWithBlanks, blanks } = createBlanks(verse.text, blankCount);

	return {
		mode: 'fill-the-gap',
		verseId: verse.id,
		textWithBlanks,
		reference: verse.reference,
		fullText: verse.text,
		blanks,
		blankCount: blanks.length
	};
}

function generateNameThatReference(verse: Verse): NameThatReferenceQuestion {
	return {
		mode: 'name-that-reference',
		verseId: verse.id,
		text: verse.text,
		reference: verse.reference,
		correctReference: {
			book: verse.book,
			chapter: verse.chapter,
			verse: verse.verseStart
		}
	};
}

function generateQuoteIt(verse: Verse, allVerses: Verse[]): QuoteItQuestion {
	// Quote-it: show reference, fill in 3 missing words with button choices
	const { textWithBlanks, blanks } = createBlanks(verse.text, 3);
	const wordChoices = generateWordChoices(blanks, verse, allVerses);

	return {
		mode: 'quote-it',
		verseId: verse.id,
		reference: verse.reference,
		correctText: verse.text,
		textWithBlanks,
		blanks,
		blankCount: blanks.length,
		wordChoices
	};
}

/** Pick N random verses from a pack, no repeats */
export function pickRandomVerses(verses: Verse[], count: number): Verse[] {
	const shuffled = [...verses].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, shuffled.length));
}
