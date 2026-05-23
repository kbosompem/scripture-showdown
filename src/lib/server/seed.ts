import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getDb } from './db.js';

interface VersePackData {
	slug: string;
	name: string;
	description: string;
	icon: string;
	supported_modes?: string[];
	verses?: {
		book: string;
		chapter: number;
		verse_start: number;
		verse_end?: number | null;
		text: string;
		reference: string;
		keywords: string;
	}[];
	quiz_items?: {
		mode: string;
		question: string;
		correct: string;
		choices: string[];
		reference?: string;
		difficulty?: number;
		explanation?: string;
	}[];
}

const DEFAULT_SUPPORTED = 'fill-the-gap,name-that-reference,quote-it';

export function seedDatabase(seedDir?: string): void {
	const db = getDb();
	const dir = seedDir || join(process.cwd(), 'seed', 'theme-packs');

	const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

	const insertPack = db.prepare(`
		INSERT INTO verse_packs (slug, name, description, icon, sort_order, supported_modes)
		VALUES (?, ?, ?, ?, ?, ?)
	`);
	const updatePackMeta = db.prepare(`
		UPDATE verse_packs SET name = ?, description = ?, icon = ?, sort_order = ?, supported_modes = ?
		WHERE slug = ?
	`);
	const findPackBySlug = db.prepare('SELECT id FROM verse_packs WHERE slug = ?');

	const insertVerse = db.prepare(`
		INSERT INTO verses (pack_id, book, chapter, verse_start, verse_end, text, reference, keywords, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	const insertQuizItem = db.prepare(`
		INSERT INTO pack_quiz_items (pack_id, mode, question, correct_answer, choices, reference, difficulty, explanation)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`);
	const findQuizItem = db.prepare(`
		SELECT id, difficulty, correct_answer, choices FROM pack_quiz_items
		WHERE pack_id = ? AND mode = ? AND question = ?
	`);
	const updateQuizItem = db.prepare(`
		UPDATE pack_quiz_items
		SET correct_answer = ?, choices = ?, reference = ?, difficulty = ?, explanation = ?
		WHERE id = ?
	`);

	let added = 0;
	let skipped = 0;
	let itemsAdded = 0;
	let itemsUpdated = 0;

	const seedAll = db.transaction(() => {
		for (let i = 0; i < files.length; i++) {
			const raw = readFileSync(join(dir, files[i]), 'utf-8');
			const pack: VersePackData = JSON.parse(raw);

			const supported = pack.supported_modes?.length
				? pack.supported_modes.join(',')
				: DEFAULT_SUPPORTED;

			const existing = findPackBySlug.get(pack.slug) as { id: number } | undefined;
			let packId: number | bigint;

			if (existing) {
				updatePackMeta.run(pack.name, pack.description, pack.icon, i, supported, pack.slug);
				packId = existing.id;
				skipped++;
			} else {
				const result = insertPack.run(pack.slug, pack.name, pack.description, pack.icon, i, supported);
				packId = result.lastInsertRowid;
				added++;

				if (pack.verses) {
					for (let v = 0; v < pack.verses.length; v++) {
						const verse = pack.verses[v];
						insertVerse.run(
							packId,
							verse.book,
							verse.chapter,
							verse.verse_start,
							verse.verse_end ?? null,
							verse.text,
							verse.reference,
							verse.keywords,
							v
						);
					}
				}
			}

			// Quiz items: insert any new questions, update difficulty/choices on existing ones.
			// Matching by (pack_id, mode, question) avoids duplicates and preserves answer-history FKs.
			if (pack.quiz_items) {
				for (let q = 0; q < pack.quiz_items.length; q++) {
					const item = pack.quiz_items[q];
					const choicesJson = JSON.stringify(item.choices);
					const existingItem = findQuizItem.get(packId, item.mode, item.question) as
						| { id: number; difficulty: number; correct_answer: string; choices: string }
						| undefined;

					if (!existingItem) {
						insertQuizItem.run(
							packId,
							item.mode,
							item.question,
							item.correct,
							choicesJson,
							item.reference ?? null,
							item.difficulty ?? q,
							item.explanation ?? null
						);
						itemsAdded++;
					} else if (
						existingItem.difficulty !== (item.difficulty ?? q) ||
						existingItem.correct_answer !== item.correct ||
						existingItem.choices !== choicesJson
					) {
						updateQuizItem.run(
							item.correct,
							choicesJson,
							item.reference ?? null,
							item.difficulty ?? q,
							item.explanation ?? null,
							existingItem.id
						);
						itemsUpdated++;
					}
				}
			}
		}
	});

	seedAll();
	console.log(
		`Seeding: ${added} new pack(s) added, ${skipped} already present (metadata refreshed). ` +
		`Quiz items: ${itemsAdded} added, ${itemsUpdated} updated.`
	);
}

export function reseedDatabase(seedDir?: string): void {
	const db = getDb();
	db.prepare('DELETE FROM pack_quiz_items').run();
	db.prepare('DELETE FROM verses').run();
	db.prepare('DELETE FROM verse_packs').run();
	seedDatabase(seedDir);
}
