import { v4 as uuidv4 } from 'uuid';
import type {
	GamePhase, GameMode, GameState, Player, Avatar, Question,
	QuestionForTV, QuestionForPhone, PlayerAnswer, ScoredAnswer,
	LeaderboardEntry, RevealData, FinalData, Verse,
	FillTheGapQuestion, NameThatReferenceQuestion, QuoteItQuestion,
	SpeedRecallQuestion
} from '../types/index.js';
import { SCORING } from '../types/index.js';
import { generateQuestion, getVersesForPack, pickRandomVerses } from './question-generator.js';
import { fuzzyMatch } from './fuzzy-match.js';
import { getDb } from './db.js';

export class GameEngine {
	phase: GamePhase = 'IDLE';
	sessionId: string | null = null;
	players: Map<string, Player> = new Map();
	mode: GameMode | null = null;
	packSlug: string | null = null;
	packName: string | null = null;
	currentRound = 0;
	totalRounds = 10;
	questions: Question[] = [];
	currentQuestion: Question | null = null;
	answers: Map<string, ScoredAnswer> = new Map(); // keyed by playerId for current round
	timers: NodeJS.Timeout[] = [];
	timeLimit = 30;
	timerRemaining = 0;
	roundAnswers: Map<string, Map<number, ScoredAnswer>> = new Map(); // playerId -> round -> answer

	// Callbacks for Socket.io emission
	private onBroadcast: ((event: string, data: unknown) => void) | null = null;
	private onEmitTo: ((playerId: string, event: string, data: unknown) => void) | null = null;
	private onTimerTick: ((remaining: number) => void) | null = null;

	setCallbacks(
		broadcast: (event: string, data: unknown) => void,
		emitTo: (playerId: string, event: string, data: unknown) => void,
		timerTick: (remaining: number) => void
	) {
		this.onBroadcast = broadcast;
		this.onEmitTo = emitTo;
		this.onTimerTick = timerTick;
	}

	// ── Player management ────────────────────────────────────

	addPlayer(id: string, name: string, avatar: Avatar, teamId?: number, teamName?: string): Player {
		const player: Player = {
			id,
			name,
			avatar,
			teamId,
			teamName,
			score: 0,
			streak: 0,
			rank: this.players.size + 1,
			connected: true
		};
		this.players.set(id, player);

		if (this.phase === 'IDLE') {
			this.phase = 'LOBBY';
		}

		return player;
	}

	removePlayer(id: string): void {
		const player = this.players.get(id);
		if (player) {
			player.connected = false;
		}
	}

	reconnectPlayer(oldId: string, newId: string): Player | null {
		const player = this.players.get(oldId);
		if (!player) return null;
		this.players.delete(oldId);
		player.id = newId;
		player.connected = true;
		this.players.set(newId, player);
		return player;
	}

	getActivePlayers(): Player[] {
		return Array.from(this.players.values()).filter((p) => p.connected);
	}

	// ── Game lifecycle ───────────────────────────────────────

	startGame(packSlug: string, mode: GameMode, numRounds: number): boolean {
		if (this.phase !== 'LOBBY') return false;
		if (this.getActivePlayers().length === 0) return false;

		// Load verses
		const verses = getVersesForPack(packSlug);
		if (verses.length === 0) return false;

		// Get pack name
		const db = getDb();
		const pack = db.prepare('SELECT name FROM verse_packs WHERE slug = ?').get(packSlug) as { name: string } | undefined;

		this.mode = mode;
		this.packSlug = packSlug;
		this.packName = pack?.name || packSlug;
		this.totalRounds = Math.min(numRounds, verses.length);
		this.currentRound = 0;
		this.timeLimit = SCORING.TIME_LIMITS[mode];
		this.sessionId = uuidv4();
		this.roundAnswers = new Map();

		// Pre-generate all questions
		const selected = pickRandomVerses(verses, this.totalRounds);
		this.questions = selected.map((v) => generateQuestion(v, mode));

		// Reset player scores
		for (const player of this.players.values()) {
			player.score = 0;
			player.streak = 0;
			player.rank = 1;
		}

		this.startCountdown();
		return true;
	}

	private startCountdown(): void {
		this.phase = 'COUNTDOWN';
		let count = 3;
		this.broadcast('game:countdown', { seconds: count });

		const interval = setInterval(() => {
			count--;
			if (count > 0) {
				this.broadcast('game:countdown', { seconds: count });
			} else {
				clearInterval(interval);
				this.nextRound();
			}
		}, 1000);

		this.timers.push(interval);
	}

	private nextRound(): void {
		if (this.currentRound >= this.totalRounds) {
			this.endGame();
			return;
		}

		this.currentQuestion = this.questions[this.currentRound];
		this.currentRound++;
		this.answers.clear();
		this.phase = 'QUESTION';
		this.timerRemaining = this.timeLimit;

		// Send TV question (separate event so phones don't get it)
		const tvQuestion = this.buildTVQuestion();
		this.broadcast('game:tv-question', tvQuestion);

		// Send phone question to each player (personal event)
		const phoneQuestion = this.buildPhoneQuestion();
		for (const player of this.getActivePlayers()) {
			this.emitTo(player.id, 'game:phone-question', phoneQuestion);
		}

		// For speed recall: hide verse after display time
		if (this.currentQuestion.mode === 'speed-recall') {
			const hideTimer = setTimeout(() => {
				this.broadcast('game:speed-recall-hide', {});
			}, SCORING.SPEED_RECALL_DISPLAY_TIME * 1000);
			this.timers.push(hideTimer);
		}

		this.phase = 'ANSWERING';
		this.startQuestionTimer();
	}

	private startQuestionTimer(): void {
		const interval = setInterval(() => {
			this.timerRemaining--;
			this.onTimerTick?.(this.timerRemaining);

			if (this.timerRemaining <= 0) {
				clearInterval(interval);
				this.endRound();
			}
		}, 1000);

		this.timers.push(interval);
	}

	submitAnswer(playerId: string, answer: PlayerAnswer): ScoredAnswer | null {
		if (this.phase !== 'ANSWERING') return null;
		if (this.answers.has(playerId)) return null; // already answered
		if (!this.currentQuestion) return null;

		const player = this.players.get(playerId);
		if (!player) return null;

		const scored = this.scoreAnswer(player, answer);
		this.answers.set(playerId, scored);

		// Store in round history
		if (!this.roundAnswers.has(playerId)) {
			this.roundAnswers.set(playerId, new Map());
		}
		this.roundAnswers.get(playerId)!.set(this.currentRound, scored);

		// Update player
		player.score = scored.newScore;
		player.streak = scored.newStreak;

		// Broadcast progress (no spoilers)
		this.broadcast('game:player-answered', {
			playerId,
			answeredCount: this.answers.size,
			totalPlayers: this.getActivePlayers().length
		});

		// Send personal feedback
		this.emitTo(playerId, 'player:feedback', scored);

		// If all active players answered, end round early
		if (this.answers.size >= this.getActivePlayers().length) {
			this.clearTimers();
			this.endRound();
		}

		return scored;
	}

	private endRound(): void {
		this.clearTimers();
		this.phase = 'REVEAL';

		// Build reveal data
		const revealData = this.buildRevealData();
		this.broadcast('game:reveal', revealData);

		// After 5 seconds, show scores
		const scoreTimer = setTimeout(() => {
			this.phase = 'SCORES';
			this.updateRanks();
			const leaderboard = this.getLeaderboard();
			this.broadcast('game:scores', { leaderboard });

			// After 4 seconds, next round or final
			const nextTimer = setTimeout(() => {
				this.nextRound();
			}, 4000);
			this.timers.push(nextTimer);
		}, 5000);
		this.timers.push(scoreTimer);
	}

	private endGame(): void {
		this.clearTimers();
		this.phase = 'FINAL';
		this.updateRanks();

		const leaderboard = this.getLeaderboard();
		const champion = leaderboard[0];

		const finalData: FinalData = {
			champion,
			leaderboard,
			mvpVerse: this.getMvpVerse(),
			toughestVerse: this.getToughestVerse()
		};

		// Persist results to SQLite
		this.persistSession(leaderboard);

		this.broadcast('game:final', finalData);
	}

	private persistSession(leaderboard: LeaderboardEntry[]): void {
		if (!this.sessionId || !this.mode || !this.packSlug) return;

		try {
			const db = getDb();

			// Get pack ID
			const pack = db.prepare('SELECT id FROM verse_packs WHERE slug = ?').get(this.packSlug) as { id: number } | undefined;

			// Save game session
			db.prepare(
				`INSERT INTO game_sessions (id, pack_id, mode, status, num_rounds, finished_at)
				 VALUES (?, ?, ?, 'finished', ?, datetime('now'))`
			).run(this.sessionId, pack?.id ?? null, this.mode, this.totalRounds);

			// Save each player's results
			const insertPlayer = db.prepare(
				`INSERT INTO session_players (session_id, display_name, total_score, final_rank)
				 VALUES (?, ?, ?, ?)`
			);

			const insertAnswer = db.prepare(
				`INSERT INTO answers (session_id, session_player_id, round_number, verse_id, answer_text, is_correct, accuracy_pct, time_ms, base_points, speed_bonus, streak_bonus, total_points)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			);

			const saveAll = db.transaction(() => {
				for (const entry of leaderboard) {
					const result = insertPlayer.run(this.sessionId, entry.name, entry.score, entry.rank);
					const sessionPlayerId = result.lastInsertRowid;

					// Save round-by-round answers for this player
					const playerRounds = this.roundAnswers.get(entry.playerId);
					if (playerRounds) {
						for (const [round, scored] of playerRounds) {
							const question = this.questions[round - 1];
							const verseId = question ? ('verseId' in question ? question.verseId : null) : null;
							insertAnswer.run(
								this.sessionId,
								sessionPlayerId,
								round,
								verseId,
								scored.answerText,
								scored.isCorrect ? 1 : 0,
								scored.accuracyPct,
								0, // timeMs not stored in ScoredAnswer currently
								scored.basePoints,
								scored.speedBonus,
								Math.floor((scored.streakMultiplier - 1) * 100),
								scored.totalPoints
							);
						}
					}
				}
			});

			saveAll();
			console.log(`[game] Session ${this.sessionId} persisted: ${leaderboard.length} players, ${this.totalRounds} rounds`);
		} catch (err) {
			console.error('[game] Failed to persist session:', err);
		}
	}

	playAgain(): void {
		this.clearTimers();
		this.phase = 'LOBBY';
		this.currentRound = 0;
		this.questions = [];
		this.currentQuestion = null;
		this.answers.clear();
		this.roundAnswers.clear();
		this.mode = null;
		this.sessionId = null;

		for (const player of this.players.values()) {
			player.score = 0;
			player.streak = 0;
		}

		this.broadcast('lobby:update', {
			players: Array.from(this.players.values()),
			canStart: this.getActivePlayers().length > 0
		});
	}

	// ── Scoring ──────────────────────────────────────────────

	private scoreAnswer(player: Player, answer: PlayerAnswer): ScoredAnswer {
		const q = this.currentQuestion!;
		let basePoints = 0;
		let accuracyPct = 0;
		let isCorrect = false;
		let answerText = '';

		switch (q.mode) {
			case 'fill-the-gap': {
				const ftg = q as FillTheGapQuestion;
				const answers = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
				answerText = answers.join(', ');
				let correct = 0;
				for (let i = 0; i < ftg.blanks.length; i++) {
					const expected = ftg.blanks[i].word.toLowerCase().replace(/[^\w]/g, '');
					const actual = (answers[i] || '').toLowerCase().replace(/[^\w]/g, '');
					if (expected === actual) correct++;
				}
				accuracyPct = correct / ftg.blanks.length;
				basePoints = Math.floor(SCORING.FILL_THE_GAP_MAX * accuracyPct);
				isCorrect = accuracyPct >= 1.0;
				break;
			}
			case 'name-that-reference': {
				const ntr = q as NameThatReferenceQuestion;
				answerText = String(answer.answer);
				const parts = answerText.split(':');
				const bookChapter = parts[0]?.trim() || '';
				const verse = parseInt(parts[1]?.trim() || '0');
				const lastSpace = bookChapter.lastIndexOf(' ');
				const book = bookChapter.substring(0, lastSpace).trim();
				const chapter = parseInt(bookChapter.substring(lastSpace + 1).trim());

				if (
					book.toLowerCase() === ntr.correctReference.book.toLowerCase() &&
					chapter === ntr.correctReference.chapter &&
					verse === ntr.correctReference.verse
				) {
					basePoints = SCORING.NAME_THAT_REF_EXACT;
					accuracyPct = 1.0;
					isCorrect = true;
				} else if (
					book.toLowerCase() === ntr.correctReference.book.toLowerCase() &&
					chapter === ntr.correctReference.chapter
				) {
					basePoints = SCORING.NAME_THAT_REF_BOOK_CHAPTER;
					accuracyPct = 0.5;
				} else if (book.toLowerCase() === ntr.correctReference.book.toLowerCase()) {
					basePoints = SCORING.NAME_THAT_REF_BOOK_ONLY;
					accuracyPct = 0.25;
				}
				break;
			}
			case 'quote-it': {
				const qi = q as QuoteItQuestion;
				answerText = String(answer.answer);
				accuracyPct = fuzzyMatch(qi.correctText, answerText);
				if (accuracyPct >= 0.9) {
					basePoints = SCORING.QUOTE_IT_MAX;
					isCorrect = true;
				} else if (accuracyPct >= 0.5) {
					basePoints = Math.floor(SCORING.QUOTE_IT_MAX * accuracyPct);
				}
				break;
			}
			case 'speed-recall': {
				const sr = q as SpeedRecallQuestion;
				answerText = String(answer.answer);
				accuracyPct = fuzzyMatch(sr.correctText, answerText);
				if (accuracyPct >= 0.9) {
					basePoints = SCORING.SPEED_RECALL_MAX;
					isCorrect = true;
				} else if (accuracyPct >= 0.5) {
					basePoints = Math.floor(SCORING.SPEED_RECALL_MAX * accuracyPct);
				}
				break;
			}
		}

		// Speed bonus
		const speedBonus =
			basePoints > 0
				? Math.max(0, Math.floor(((this.timeLimit * 1000 - answer.timeMs) / (this.timeLimit * 1000)) * SCORING.SPEED_BONUS_MAX))
				: 0;

		// Streak
		const newStreak = isCorrect ? player.streak + 1 : 0;
		const streakIdx = Math.min(newStreak, SCORING.STREAK_MULTIPLIERS.length - 1);
		const streakMultiplier = SCORING.STREAK_MULTIPLIERS[streakIdx];

		const totalPoints = Math.floor((basePoints + speedBonus) * streakMultiplier);
		const newScore = player.score + totalPoints;

		return {
			playerId: player.id,
			playerName: player.name,
			avatar: player.avatar,
			isCorrect,
			accuracyPct,
			answerText,
			basePoints,
			speedBonus,
			streakMultiplier,
			totalPoints,
			newScore,
			newStreak
		};
	}

	// ── State building ───────────────────────────────────────

	private buildTVQuestion(): QuestionForTV {
		const q = this.currentQuestion!;
		const base = {
			mode: q.mode,
			round: this.currentRound,
			totalRounds: this.totalRounds,
			timeLimit: this.timeLimit
		};

		switch (q.mode) {
			case 'fill-the-gap':
				return { ...base, textWithBlanks: (q as FillTheGapQuestion).textWithBlanks, reference: (q as FillTheGapQuestion).reference, blankCount: (q as FillTheGapQuestion).blankCount };
			case 'name-that-reference':
				return { ...base, text: (q as NameThatReferenceQuestion).text };
			case 'quote-it':
				return { ...base, reference: (q as QuoteItQuestion).reference };
			case 'speed-recall':
				return { ...base, text: (q as SpeedRecallQuestion).text, reference: (q as SpeedRecallQuestion).reference };
		}
	}

	private buildPhoneQuestion(): QuestionForPhone {
		const q = this.currentQuestion!;
		const base = {
			mode: q.mode,
			round: this.currentRound,
			totalRounds: this.totalRounds,
			timeLimit: this.timeLimit
		};

		switch (q.mode) {
			case 'fill-the-gap':
				return { ...base, blankCount: (q as FillTheGapQuestion).blankCount };
			case 'name-that-reference':
				return { ...base };
			case 'quote-it':
				return { ...base, reference: (q as QuoteItQuestion).reference };
			case 'speed-recall':
				return { ...base, text: (q as SpeedRecallQuestion).text, reference: (q as SpeedRecallQuestion).reference };
		}
	}

	private buildRevealData(): RevealData {
		const q = this.currentQuestion!;
		let correctAnswer = '';
		let correctReference: string | undefined;

		switch (q.mode) {
			case 'fill-the-gap': {
				const ftg = q as FillTheGapQuestion;
				correctAnswer = ftg.blanks.map((b) => b.word).join(', ');
				correctReference = ftg.reference;
				break;
			}
			case 'name-that-reference': {
				const ntr = q as NameThatReferenceQuestion;
				correctAnswer = `${ntr.correctReference.book} ${ntr.correctReference.chapter}:${ntr.correctReference.verse}`;
				break;
			}
			case 'quote-it': {
				const qi = q as QuoteItQuestion;
				correctAnswer = qi.correctText;
				correctReference = qi.reference;
				break;
			}
			case 'speed-recall': {
				const sr = q as SpeedRecallQuestion;
				correctAnswer = sr.correctText;
				correctReference = sr.reference;
				break;
			}
		}

		return {
			correctAnswer,
			correctReference,
			results: Array.from(this.answers.values()).sort((a, b) => b.totalPoints - a.totalPoints)
		};
	}

	private updateRanks(): void {
		const sorted = Array.from(this.players.values())
			.filter((p) => p.connected)
			.sort((a, b) => b.score - a.score);

		for (let i = 0; i < sorted.length; i++) {
			sorted[i].rank = i + 1;
		}
	}

	getLeaderboard(): LeaderboardEntry[] {
		const sorted = Array.from(this.players.values())
			.filter((p) => p.connected)
			.sort((a, b) => b.score - a.score);

		return sorted.map((p, i) => ({
			playerId: p.id,
			name: p.name,
			avatar: p.avatar,
			score: p.score,
			rank: i + 1,
			previousRank: p.rank,
			streak: p.streak
		}));
	}

	getFullState(): GameState {
		return {
			phase: this.phase,
			sessionId: this.sessionId,
			players: Array.from(this.players.values()),
			currentRound: this.currentRound,
			totalRounds: this.totalRounds,
			mode: this.mode,
			packSlug: this.packSlug,
			packName: this.packName,
			question: this.phase === 'ANSWERING' || this.phase === 'QUESTION' ? this.buildTVQuestion() : null,
			countdown: 0,
			timer: this.timerRemaining,
			timeLimit: this.timeLimit,
			answeredCount: this.answers.size,
			revealData: this.phase === 'REVEAL' ? this.buildRevealData() : null,
			leaderboard: this.getLeaderboard(),
			finalData: null
		};
	}

	getAvailablePacks(): { slug: string; name: string; icon: string; verseCount: number }[] {
		const db = getDb();
		return db
			.prepare(
				`SELECT vp.slug, vp.name, vp.icon, COUNT(v.id) as verseCount
				FROM verse_packs vp
				LEFT JOIN verses v ON v.pack_id = vp.id
				GROUP BY vp.id
				ORDER BY vp.sort_order`
			)
			.all() as { slug: string; name: string; icon: string; verseCount: number }[];
	}

	// ── Stats ────────────────────────────────────────────────

	private getMvpVerse(): FinalData['mvpVerse'] {
		if (this.questions.length === 0) return null;
		let bestIdx = 0;
		let bestCount = 0;

		for (let i = 0; i < this.questions.length; i++) {
			let correct = 0;
			for (const playerAnswers of this.roundAnswers.values()) {
				const a = playerAnswers.get(i + 1);
				if (a?.isCorrect) correct++;
			}
			if (correct > bestCount) {
				bestCount = correct;
				bestIdx = i;
			}
		}

		const q = this.questions[bestIdx];
		const ref = 'reference' in q ? (q as { reference: string }).reference : `Round ${bestIdx + 1}`;
		return { reference: ref, correctCount: bestCount };
	}

	private getToughestVerse(): FinalData['toughestVerse'] {
		if (this.questions.length === 0) return null;
		let worstIdx = 0;
		let worstCount = Infinity;

		for (let i = 0; i < this.questions.length; i++) {
			let correct = 0;
			for (const playerAnswers of this.roundAnswers.values()) {
				const a = playerAnswers.get(i + 1);
				if (a?.isCorrect) correct++;
			}
			if (correct < worstCount) {
				worstCount = correct;
				worstIdx = i;
			}
		}

		const q = this.questions[worstIdx];
		const ref = 'reference' in q ? (q as { reference: string }).reference : `Round ${worstIdx + 1}`;
		return { reference: ref, correctCount: worstCount === Infinity ? 0 : worstCount };
	}

	// ── Utilities ────────────────────────────────────────────

	private broadcast(event: string, data: unknown): void {
		this.onBroadcast?.(event, data);
	}

	private emitTo(playerId: string, event: string, data: unknown): void {
		this.onEmitTo?.(playerId, event, data);
	}

	private clearTimers(): void {
		for (const timer of this.timers) {
			clearTimeout(timer);
			clearInterval(timer);
		}
		this.timers = [];
	}

	reset(): void {
		this.clearTimers();
		this.phase = 'IDLE';
		this.sessionId = null;
		this.players.clear();
		this.answers.clear();
		this.roundAnswers.clear();
		this.questions = [];
		this.currentQuestion = null;
		this.currentRound = 0;
		this.mode = null;
	}
}
