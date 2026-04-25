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

	let added = 0;
	let skipped = 0;

	const seedAll = db.transaction(() => {
		for (let i = 0; i < files.length; i++) {
			const raw = readFileSync(join(dir, files[i]), 'utf-8');
			const pack: VersePackData = JSON.parse(raw);

			const supported = pack.supported_modes?.length
				? pack.supported_modes.join(',')
				: DEFAULT_SUPPORTED;

			const existing = findPackBySlug.get(pack.slug) as { id: number } | undefined;
			if (existing) {
				// Only refresh surface metadata — never delete verses/quiz items,
				// because they may be referenced by answer history (FK constraint).
				updatePackMeta.run(pack.name, pack.description, pack.icon, i, supported, pack.slug);
				skipped++;
				continue;
			}

			const result = insertPack.run(pack.slug, pack.name, pack.description, pack.icon, i, supported);
			const packId = result.lastInsertRowid;
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

			if (pack.quiz_items) {
				for (let q = 0; q < pack.quiz_items.length; q++) {
					const item = pack.quiz_items[q];
					insertQuizItem.run(
						packId,
						item.mode,
						item.question,
						item.correct,
						JSON.stringify(item.choices),
						item.reference ?? null,
						item.difficulty ?? q,
						item.explanation ?? null
					);
				}
			}
		}
	});

	seedAll();
	console.log(`Seeding: ${added} new pack(s) added, ${skipped} already present (metadata refreshed).`);
}

export function reseedDatabase(seedDir?: string): void {
	const db = getDb();
	db.prepare('DELETE FROM pack_quiz_items').run();
	db.prepare('DELETE FROM verses').run();
	db.prepare('DELETE FROM verse_packs').run();
	seedDatabase(seedDir);
}
