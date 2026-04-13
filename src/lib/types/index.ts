// ── Game States ──────────────────────────────────────────────
export type GamePhase =
	| 'IDLE'
	| 'LOBBY'
	| 'THEME_SELECT'
	| 'MODE_SELECT'
	| 'COUNTDOWN'
	| 'QUESTION'
	| 'ANSWERING'
	| 'REVEAL'
	| 'SCORES'
	| 'FINAL';

export type GameMode = 'fill-the-gap' | 'name-that-reference' | 'quote-it' | 'speed-recall';

export const GAME_MODE_LABELS: Record<GameMode, string> = {
	'fill-the-gap': 'Fill the Gap',
	'name-that-reference': 'Name That Reference',
	'quote-it': 'Quote It',
	'speed-recall': 'Speed Recall'
};

export const PLAYER_AVATARS = [
	'lion', 'dove', 'lamb', 'fish', 'eagle', 'olive', 'crown', 'star',
	'flame', 'scroll', 'harp', 'shield', 'cross', 'ark', 'trumpet',
	'anchor', 'vine', 'wheat', 'rainbow', 'pearl'
] as const;

export type Avatar = (typeof PLAYER_AVATARS)[number];

export const AVATAR_EMOJI: Record<Avatar, string> = {
	lion: '🦁', dove: '🕊️', lamb: '🐑', fish: '🐟', eagle: '🦅',
	olive: '🫒', crown: '👑', star: '⭐', flame: '🔥', scroll: '📜',
	harp: '🎵', shield: '🛡️', cross: '✝️', ark: '🚢', trumpet: '📯',
	anchor: '⚓', vine: '🍇', wheat: '🌾', rainbow: '🌈', pearl: '💎'
};

// ── Data Models ──────────────────────────────────────────────

export interface VersePack {
	id: number;
	slug: string;
	name: string;
	description: string;
	icon: string;
	verseCount?: number;
}

export interface Verse {
	id: number;
	packId: number;
	book: string;
	chapter: number;
	verseStart: number;
	verseEnd: number | null;
	text: string;
	reference: string;
	keywords: string;
}

export interface Team {
	id: number;
	name: string;
	code: string;
	createdAt: string;
}

export interface TeamMember {
	id: number;
	teamId: number;
	name: string;
	avatar: Avatar;
	createdAt: string;
}

// ── Player (in-game) ─────────────────────────────────────────

export interface Player {
	id: string; // socket ID
	name: string;
	avatar: Avatar;
	teamId?: number;
	teamName?: string;
	score: number;
	streak: number;
	rank: number;
	connected: boolean;
}

// ── Questions ────────────────────────────────────────────────

export interface FillTheGapQuestion {
	mode: 'fill-the-gap';
	verseId: number;
	textWithBlanks: string;
	reference: string;
	blanks: { position: number; word: string }[];
	blankCount: number;
}

export interface NameThatReferenceQuestion {
	mode: 'name-that-reference';
	verseId: number;
	text: string;
	correctReference: { book: string; chapter: number; verse: number };
}

export interface QuoteItQuestion {
	mode: 'quote-it';
	verseId: number;
	reference: string;
	correctText: string;
}

export interface SpeedRecallQuestion {
	mode: 'speed-recall';
	verseId: number;
	text: string;
	reference: string;
	correctText: string;
}

export type Question =
	| FillTheGapQuestion
	| NameThatReferenceQuestion
	| QuoteItQuestion
	| SpeedRecallQuestion;

// What the TV sees (no answers)
export interface QuestionForTV {
	mode: GameMode;
	round: number;
	totalRounds: number;
	timeLimit: number;
	// Fill the Gap
	textWithBlanks?: string;
	reference?: string;
	blankCount?: number;
	// Name That Reference
	text?: string;
	// Quote It
	// reference already covered
	// Speed Recall
	// text and reference already covered
}

// What the phone sees (input context)
export interface QuestionForPhone {
	mode: GameMode;
	round: number;
	totalRounds: number;
	timeLimit: number;
	blankCount?: number;
	reference?: string;
	text?: string; // Speed Recall only (shown briefly)
}

// ── Answers ──────────────────────────────────────────────────

export interface PlayerAnswer {
	playerId: string;
	roundNumber: number;
	answer: string | string[]; // string[] for fill-the-gap, string for others
	timeMs: number;
}

export interface ScoredAnswer {
	playerId: string;
	playerName: string;
	avatar: Avatar;
	isCorrect: boolean;
	accuracyPct: number;
	answerText: string;
	basePoints: number;
	speedBonus: number;
	streakMultiplier: number;
	totalPoints: number;
	newScore: number;
	newStreak: number;
}

// ── Leaderboard ──────────────────────────────────────────────

export interface LeaderboardEntry {
	playerId: string;
	name: string;
	avatar: Avatar;
	score: number;
	rank: number;
	previousRank: number;
	streak: number;
}

// ── Game State (full, server-authoritative) ──────────────────

export interface GameState {
	phase: GamePhase;
	sessionId: string | null;
	players: Player[];
	currentRound: number;
	totalRounds: number;
	mode: GameMode | null;
	packSlug: string | null;
	packName: string | null;
	question: QuestionForTV | null;
	countdown: number;
	timer: number;
	timeLimit: number;
	answeredCount: number;
	revealData: RevealData | null;
	leaderboard: LeaderboardEntry[];
	finalData: FinalData | null;
}

export interface RevealData {
	correctAnswer: string;
	correctReference?: string;
	results: ScoredAnswer[];
}

export interface FinalData {
	champion: LeaderboardEntry;
	leaderboard: LeaderboardEntry[];
	mvpVerse: { reference: string; correctCount: number } | null;
	toughestVerse: { reference: string; correctCount: number } | null;
}

// ── Socket Events ────────────────────────────────────────────

// Client → Server
export interface ClientEvents {
	'player:join': (data: { name: string; avatar: Avatar; teamCode?: string }) => void;
	'player:leave': () => void;
	'tv:connect': () => void;
	'game:start': (data: { packSlug: string; mode: GameMode; numRounds: number }) => void;
	'answer:submit': (data: { roundNumber: number; answer: string | string[]; timeMs: number }) => void;
	'game:play-again': () => void;
}

// Server → Client
export interface ServerEvents {
	'game:state': (state: GameState) => void;
	'lobby:update': (data: { players: Player[]; canStart: boolean }) => void;
	'game:countdown': (data: { seconds: number }) => void;
	'game:question': (data: QuestionForTV | QuestionForPhone) => void;
	'game:timer': (data: { remaining: number }) => void;
	'game:player-answered': (data: { playerId: string; answeredCount: number; totalPlayers: number }) => void;
	'game:reveal': (data: RevealData) => void;
	'game:scores': (data: { leaderboard: LeaderboardEntry[] }) => void;
	'game:final': (data: FinalData) => void;
	'player:feedback': (data: ScoredAnswer) => void;
	'player:error': (data: { message: string }) => void;
	'game:speed-recall-hide': () => void;
}

// ── Scoring Constants ────────────────────────────────────────

export const SCORING = {
	FILL_THE_GAP_MAX: 1000,
	NAME_THAT_REF_EXACT: 1000,
	NAME_THAT_REF_BOOK_CHAPTER: 500,
	NAME_THAT_REF_BOOK_ONLY: 250,
	QUOTE_IT_MAX: 1000,
	SPEED_RECALL_MAX: 1500,
	SPEED_BONUS_MAX: 500,
	STREAK_MULTIPLIERS: [1.0, 1.0, 1.1, 1.2, 1.3, 1.5] as const, // index = streak count, 5+ = 1.5
	TIME_LIMITS: {
		'fill-the-gap': 30,
		'name-that-reference': 29,
		'quote-it': 45,
		'speed-recall': 50 // 5s display + 45s typing
	} as const,
	SPEED_RECALL_DISPLAY_TIME: 5
} as const;
