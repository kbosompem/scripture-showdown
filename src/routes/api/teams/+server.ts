import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';

function generateCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

export async function GET() {
	const db = getDb();
	const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
	return json(teams);
}

export async function POST({ request }) {
	const { name } = await request.json();

	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		return json({ error: 'Team name is required' }, { status: 400 });
	}

	const db = getDb();
	let code = generateCode();

	// Ensure unique code
	while (db.prepare('SELECT id FROM teams WHERE code = ?').get(code)) {
		code = generateCode();
	}

	const result = db.prepare('INSERT INTO teams (name, code) VALUES (?, ?)').run(name.trim(), code);

	return json({
		id: result.lastInsertRowid,
		name: name.trim(),
		code
	}, { status: 201 });
}
