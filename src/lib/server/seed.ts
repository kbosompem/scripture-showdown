import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getDb } from './db.js';

interface VersePackData {
	slug: string;
	name: string;
	description: string;
	icon: string;
	verses: {
		book: string;
		chapter: number;
		verse_start: number;
		verse_end?: number | null;
		text: string;
		reference: string;
		keywords: string;
	}[];
}

export function seedDatabase(seedDir?: string): void {
	const db = getDb();
	const dir = seedDir || join(process.cwd(), 'seed', 'theme-packs');

	const existingPacks = db.prepare('SELECT COUNT(*) as count FROM verse_packs').get() as { count: number };
	if (existingPacks.count > 0) {
		console.log(`Database already seeded (${existingPacks.count} packs). Skipping.`);
		return;
	}

	const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
	console.log(`Seeding ${files.length} verse packs...`);

	const insertPack = db.prepare(`
		INSERT INTO verse_packs (slug, name, description, icon, sort_order)
		VALUES (?, ?, ?, ?, ?)
	`);

	const insertVerse = db.prepare(`
		INSERT INTO verses (pack_id, book, chapter, verse_start, verse_end, text, reference, keywords)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`);

	const seedAll = db.transaction(() => {
		for (let i = 0; i < files.length; i++) {
			const raw = readFileSync(join(dir, files[i]), 'utf-8');
			const pack: VersePackData = JSON.parse(raw);

			const result = insertPack.run(pack.slug, pack.name, pack.description, pack.icon, i);
			const packId = result.lastInsertRowid;

			for (const verse of pack.verses) {
				insertVerse.run(
					packId,
					verse.book,
					verse.chapter,
					verse.verse_start,
					verse.verse_end ?? null,
					verse.text,
					verse.reference,
					verse.keywords
				);
			}

			console.log(`  ${pack.icon} ${pack.name}: ${pack.verses.length} verses`);
		}
	});

	seedAll();
	console.log('Seeding complete.');
}

export function reseedDatabase(seedDir?: string): void {
	const db = getDb();
	db.prepare('DELETE FROM verses').run();
	db.prepare('DELETE FROM verse_packs').run();
	seedDatabase(seedDir);
}
