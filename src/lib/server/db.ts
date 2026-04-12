import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'scripture-showdown.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (db) return db;

	const dir = dirname(DB_PATH);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');

	initSchema(db);
	return db;
}

function initSchema(db: Database.Database): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS teams (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			name        TEXT NOT NULL,
			code        TEXT NOT NULL UNIQUE,
			created_at  TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS team_members (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			team_id     INTEGER NOT NULL REFERENCES teams(id),
			name        TEXT NOT NULL,
			avatar      TEXT,
			created_at  TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS verse_packs (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			slug        TEXT NOT NULL UNIQUE,
			name        TEXT NOT NULL,
			description TEXT,
			icon        TEXT,
			sort_order  INTEGER DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS verses (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			pack_id     INTEGER NOT NULL REFERENCES verse_packs(id),
			book        TEXT NOT NULL,
			chapter     INTEGER NOT NULL,
			verse_start INTEGER NOT NULL,
			verse_end   INTEGER,
			text        TEXT NOT NULL,
			reference   TEXT NOT NULL,
			keywords    TEXT
		);

		CREATE TABLE IF NOT EXISTS game_sessions (
			id          TEXT PRIMARY KEY,
			pack_id     INTEGER REFERENCES verse_packs(id),
			mode        TEXT NOT NULL,
			status      TEXT DEFAULT 'lobby',
			num_rounds  INTEGER DEFAULT 10,
			created_at  TEXT DEFAULT (datetime('now')),
			finished_at TEXT
		);

		CREATE TABLE IF NOT EXISTS session_players (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id   TEXT NOT NULL REFERENCES game_sessions(id),
			member_id    INTEGER REFERENCES team_members(id),
			display_name TEXT NOT NULL,
			team_id      INTEGER REFERENCES teams(id),
			total_score  INTEGER DEFAULT 0,
			final_rank   INTEGER
		);

		CREATE TABLE IF NOT EXISTS answers (
			id                INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id        TEXT NOT NULL REFERENCES game_sessions(id),
			session_player_id INTEGER NOT NULL REFERENCES session_players(id),
			round_number      INTEGER NOT NULL,
			verse_id          INTEGER REFERENCES verses(id),
			answer_text       TEXT,
			is_correct        INTEGER DEFAULT 0,
			accuracy_pct      REAL,
			time_ms           INTEGER,
			base_points       INTEGER DEFAULT 0,
			speed_bonus       INTEGER DEFAULT 0,
			streak_bonus      INTEGER DEFAULT 0,
			total_points      INTEGER DEFAULT 0,
			answered_at       TEXT DEFAULT (datetime('now'))
		);

		CREATE INDEX IF NOT EXISTS idx_verses_pack ON verses(pack_id);
		CREATE INDEX IF NOT EXISTS idx_verses_book ON verses(book, chapter, verse_start);
		CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id, round_number);
		CREATE INDEX IF NOT EXISTS idx_session_players_session ON session_players(session_id);
	`);
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}
