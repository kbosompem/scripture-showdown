import type {
	GamePhase, GameMode, GameState, Player, QuestionForTV, QuestionForPhone,
	LeaderboardEntry, RevealData, FinalData, ScoredAnswer
} from '$lib/types/index.js';

// ── Reactive game state using Svelte 5 runes ────────────────

let phase = $state<GamePhase>('IDLE');
let sessionId = $state<string | null>(null);
let players = $state<Player[]>([]);
let currentRound = $state(0);
let totalRounds = $state(0);
let mode = $state<GameMode | null>(null);
let packSlug = $state<string | null>(null);
let packName = $state<string | null>(null);
let tvQuestion = $state<QuestionForTV | null>(null);
let phoneQuestion = $state<QuestionForPhone | null>(null);
let countdown = $state(0);
let timer = $state(0);
let timeLimit = $state(30);
let answeredCount = $state(0);
let totalPlayers = $state(0);
let revealData = $state<RevealData | null>(null);
let leaderboard = $state<LeaderboardEntry[]>([]);
let finalData = $state<FinalData | null>(null);
let myFeedback = $state<ScoredAnswer | null>(null);
let hasAnswered = $state(false);
let speedRecallHidden = $state(false);
let connected = $state(false);
let errorMessage = $state<string | null>(null);

export const gameStore = {
	get phase() { return phase; },
	get sessionId() { return sessionId; },
	get players() { return players; },
	get currentRound() { return currentRound; },
	get totalRounds() { return totalRounds; },
	get mode() { return mode; },
	get packSlug() { return packSlug; },
	get packName() { return packName; },
	get tvQuestion() { return tvQuestion; },
	get phoneQuestion() { return phoneQuestion; },
	get countdown() { return countdown; },
	get timer() { return timer; },
	get timeLimit() { return timeLimit; },
	get answeredCount() { return answeredCount; },
	get totalPlayers() { return totalPlayers; },
	get revealData() { return revealData; },
	get leaderboard() { return leaderboard; },
	get finalData() { return finalData; },
	get myFeedback() { return myFeedback; },
	get hasAnswered() { return hasAnswered; },
	get speedRecallHidden() { return speedRecallHidden; },
	get connected() { return connected; },
	get errorMessage() { return errorMessage; },

	// Apply full state sync
	applyState(state: GameState) {
		phase = state.phase;
		sessionId = state.sessionId;
		players = state.players;
		currentRound = state.currentRound;
		totalRounds = state.totalRounds;
		mode = state.mode;
		packSlug = state.packSlug;
		packName = state.packName;
		tvQuestion = state.question;
		timer = state.timer;
		timeLimit = state.timeLimit;
		answeredCount = state.answeredCount;
		revealData = state.revealData;
		leaderboard = state.leaderboard;
		finalData = state.finalData;
		totalPlayers = state.players.filter(p => p.connected).length;
		hasAnswered = false;
		myFeedback = null;
		speedRecallHidden = false;
		errorMessage = null;
	},

	// Granular updates
	setPhase(p: GamePhase) { phase = p; },
	setPlayers(p: Player[]) { players = p; totalPlayers = p.filter(pl => pl.connected).length; },
	setCountdown(c: number) { countdown = c; },
	setTimer(t: number) { timer = t; },
	setTvQuestion(q: QuestionForTV) { tvQuestion = q; phase = 'ANSWERING'; currentRound = q.round; totalRounds = q.totalRounds; hasAnswered = false; myFeedback = null; speedRecallHidden = false; },
	setPhoneQuestion(q: QuestionForPhone) { phoneQuestion = q; hasAnswered = false; myFeedback = null; speedRecallHidden = false; },
	setAnsweredCount(count: number, total: number) { answeredCount = count; totalPlayers = total; },
	setRevealData(data: RevealData) { revealData = data; phase = 'REVEAL'; },
	setLeaderboard(lb: LeaderboardEntry[]) { leaderboard = lb; phase = 'SCORES'; },
	setFinalData(data: FinalData) { finalData = data; phase = 'FINAL'; },
	setMyFeedback(fb: ScoredAnswer) { myFeedback = fb; hasAnswered = true; },
	setSpeedRecallHidden() { speedRecallHidden = true; },
	setConnected(c: boolean) { connected = c; },
	setError(msg: string) { errorMessage = msg; },
	clearError() { errorMessage = null; },

	reset() {
		phase = 'IDLE';
		sessionId = null;
		players = [];
		currentRound = 0;
		totalRounds = 0;
		mode = null;
		packSlug = null;
		packName = null;
		tvQuestion = null;
		phoneQuestion = null;
		countdown = 0;
		timer = 0;
		answeredCount = 0;
		revealData = null;
		leaderboard = [];
		finalData = null;
		myFeedback = null;
		hasAnswered = false;
		speedRecallHidden = false;
		errorMessage = null;
	}
};
