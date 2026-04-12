import type { Verse, Question, FillTheGapQuestion, NameThatReferenceQuestion, QuoteItQuestion, SpeedRecallQuestion, GameMode } from '../types/index.js';
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

export function generateQuestion(verse: Verse, mode: GameMode): Question {
	switch (mode) {
		case 'fill-the-gap':
			return generateFillTheGap(verse);
		case 'name-that-reference':
			return generateNameThatReference(verse);
		case 'quote-it':
			return generateQuoteIt(verse);
		case 'speed-recall':
			return generateSpeedRecall(verse);
	}
}

function generateFillTheGap(verse: Verse): FillTheGapQuestion {
	const words = verse.text.split(/\s+/);
	const significantIndices: number[] = [];

	for (let i = 0; i < words.length; i++) {
		const clean = words[i].replace(/[^\w]/g, '').toLowerCase();
		if (!STOP_WORDS.has(clean) && clean.length > 2) {
			significantIndices.push(i);
		}
	}

	// Pick 2-4 blanks
	const blankCount = Math.min(Math.max(2, Math.floor(significantIndices.length / 3)), 4);
	const shuffled = significantIndices.sort(() => Math.random() - 0.5);
	const selectedIndices = shuffled.slice(0, blankCount).sort((a, b) => a - b);

	const blanks: { position: number; word: string }[] = [];
	const displayWords = [...words];

	for (let i = 0; i < selectedIndices.length; i++) {
		const idx = selectedIndices[i];
		blanks.push({ position: i + 1, word: words[idx].replace(/[.,;:!?]$/, '') });
		displayWords[idx] = `___${i + 1}___`;
	}

	return {
		mode: 'fill-the-gap',
		verseId: verse.id,
		textWithBlanks: displayWords.join(' '),
		reference: verse.reference,
		blanks,
		blankCount: blanks.length
	};
}

function generateNameThatReference(verse: Verse): NameThatReferenceQuestion {
	return {
		mode: 'name-that-reference',
		verseId: verse.id,
		text: verse.text,
		correctReference: {
			book: verse.book,
			chapter: verse.chapter,
			verse: verse.verseStart
		}
	};
}

function generateQuoteIt(verse: Verse): QuoteItQuestion {
	return {
		mode: 'quote-it',
		verseId: verse.id,
		reference: verse.reference,
		correctText: verse.text
	};
}

function generateSpeedRecall(verse: Verse): SpeedRecallQuestion {
	return {
		mode: 'speed-recall',
		verseId: verse.id,
		text: verse.text,
		reference: verse.reference,
		correctText: verse.text
	};
}

/** Pick N random verses from a pack, no repeats */
export function pickRandomVerses(verses: Verse[], count: number): Verse[] {
	const shuffled = [...verses].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, shuffled.length));
}
