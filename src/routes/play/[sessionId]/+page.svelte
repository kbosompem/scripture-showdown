<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { getSocket, disconnectSocket, savePlayerInfo, getSavedPlayerInfo } from '$lib/stores/socket.js';
	import { gameStore } from '$lib/stores/game.svelte.js';
	import { initAudio, notifyNewQuestion, notifyCorrect, notifyWrong } from '$lib/utils/vibration.js';
	import JoinForm from '$lib/components/phone/JoinForm.svelte';
	import WaitingRoom from '$lib/components/phone/WaitingRoom.svelte';
	import AnswerInput from '$lib/components/phone/AnswerInput.svelte';
	import Feedback from '$lib/components/phone/Feedback.svelte';
	import { AVATAR_EMOJI } from '$lib/types/index.js';
	import type { Avatar, GameMode } from '$lib/types/index.js';

	let sessionId = $derived(page.params.sessionId);
	let joined = $state(false);
	let packs = $state<{ slug: string; name: string; icon: string; verseCount: number }[]>([]);
	let socket: ReturnType<typeof getSocket>;
	let startTimeMs = $state(0);
	let playerId = $state<string | null>(null);

	onMount(() => {
		socket = getSocket();

		socket.on('game:state', (state) => {
			gameStore.applyState(state);
			// If we're already in the players list, we're joined
			if (playerId && state.players.some((p: { id: string }) => p.id === playerId)) {
				joined = true;
			}
		});

		socket.on('lobby:update', (data) => gameStore.setPlayers(data.players));
		socket.on('game:countdown', (data) => {
			gameStore.setPhase('COUNTDOWN');
			gameStore.setCountdown(data.seconds);
		});
		socket.on('game:phone-question', (data) => {
			gameStore.setPhoneQuestion(data);
			gameStore.setPhase('ANSWERING');
			startTimeMs = Date.now();
			notifyNewQuestion();
		});
		socket.on('game:timer', (data) => gameStore.setTimer(data.remaining));
		socket.on('game:player-answered', (data) => gameStore.setAnsweredCount(data.answeredCount, data.totalPlayers));
		socket.on('game:reveal', (data) => gameStore.setRevealData(data));
		socket.on('game:scores', (data) => gameStore.setLeaderboard(data.leaderboard));
		socket.on('game:final', (data) => gameStore.setFinalData(data));
		socket.on('game:speed-recall-hide', () => gameStore.setSpeedRecallHidden());
		socket.on('game:next-countdown', (data) => gameStore.setPostGameCountdown(data.seconds));

		socket.on('player:joined', (data) => {
			playerId = data.playerId;
			joined = true;
		});

		socket.on('player:feedback', (data) => {
			gameStore.setMyFeedback(data);
			if (data.isCorrect) notifyCorrect();
			else notifyWrong();
		});

		socket.on('player:error', (data) => gameStore.setError(data.message));
		socket.on('game:packs', (data) => { packs = data; });

		socket.on('connect', () => {
			gameStore.setConnected(true);
			// Join session room on connect/reconnect
			socket.emit('session:join', { sessionId, role: 'player' });

			// Try to reconnect existing player
			const saved = getSavedPlayerInfo();
			if (saved.playerId && saved.sessionId === sessionId) {
				playerId = saved.playerId;
				socket.emit('player:reconnect', { playerId: saved.playerId });
			}
		});
		socket.on('disconnect', () => gameStore.setConnected(false));

		// Join session if already connected
		if (socket.connected) {
			socket.emit('session:join', { sessionId, role: 'player' });

			const saved = getSavedPlayerInfo();
			if (saved.playerId && saved.sessionId === sessionId) {
				playerId = saved.playerId;
				socket.emit('player:reconnect', { playerId: saved.playerId });
			}
		}
	});

	onDestroy(() => {
		disconnectSocket();
	});

	function handleJoin(name: string, avatar: Avatar) {
		initAudio();
		socket.emit('player:join', { name, avatar });
		socket.emit('game:get-packs');
		// Save to localStorage after we get the playerId back from player:joined
		const waitForId = () => {
			if (playerId) {
				savePlayerInfo(sessionId, playerId, name, avatar);
			} else {
				setTimeout(waitForId, 100);
			}
		};
		waitForId();
	}

	function handleStart(packSlug: string, mode: GameMode, numRounds: number) {
		socket.emit('game:start', { packSlug, mode, numRounds });
	}

	function handleSubmit(answer: string | string[]) {
		const timeMs = Date.now() - startTimeMs;
		socket.emit('answer:submit', {
			roundNumber: gameStore.currentRound,
			answer,
			timeMs
		});
	}

	function handlePlayAgain() {
		socket.emit('game:play-again');
	}
</script>

<svelte:head>
	<title>Scripture Showdown — Play</title>
</svelte:head>

<div class="phone-view">
	{#if !joined}
		<JoinForm onJoin={handleJoin} />
	{:else if gameStore.phase === 'IDLE' || gameStore.phase === 'LOBBY'}
		<WaitingRoom
			onStart={handleStart}
			canStart={gameStore.players.filter(p => p.connected).length > 0}
			{packs}
		/>
	{:else if gameStore.phase === 'COUNTDOWN'}
		<div class="countdown-phone">
			{#key gameStore.countdown}
				<span class="countdown-num animate-bounce-in">{gameStore.countdown}</span>
			{/key}
			<p>Get ready!</p>
		</div>
	{:else if gameStore.phase === 'ANSWERING' || gameStore.phase === 'QUESTION'}
		{#if gameStore.hasAnswered}
			<Feedback />
		{:else}
			<AnswerInput onSubmit={handleSubmit} />
		{/if}
	{:else if gameStore.phase === 'REVEAL'}
		<Feedback />
	{:else if gameStore.phase === 'SCORES'}
		<Feedback />
	{:else if gameStore.phase === 'FINAL'}
		<div class="final-phone">
			{#if gameStore.finalData?.champion}
				<div class="crown-section">
					<span class="crown">&#128081;</span>
					<span class="champ-avatar">{AVATAR_EMOJI[gameStore.finalData.champion.avatar]}</span>
					<h2>{gameStore.finalData.champion.name} wins!</h2>
					<p class="champ-score">{gameStore.finalData.champion.score.toLocaleString()} pts</p>
				</div>
			{/if}
			<div class="final-board">
				{#each gameStore.finalData?.leaderboard || [] as entry (entry.playerId)}
					<div class="final-row">
						<span class="f-rank">{entry.rank}</span>
						<span class="f-avatar">{AVATAR_EMOJI[entry.avatar]}</span>
						<span class="f-name">{entry.name}</span>
						<span class="f-score">{entry.score.toLocaleString()}</span>
					</div>
				{/each}
			</div>
			{#if gameStore.postGameCountdown > 0}
				<p class="next-game-timer">Next game in {gameStore.postGameCountdown}s</p>
			{/if}
			<button class="btn btn-primary play-again-btn" onclick={handlePlayAgain}>
				Play Again Now
			</button>
		</div>
	{/if}

	{#if gameStore.errorMessage}
		<div class="error-toast">
			<p>{gameStore.errorMessage}</p>
			<button onclick={() => gameStore.clearError()}>&times;</button>
		</div>
	{/if}

	{#if !gameStore.connected && joined}
		<div class="connection-bar">Reconnecting...</div>
	{/if}
</div>

<style>
	.countdown-phone {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--color-page);
		gap: 1rem;
	}

	.countdown-num {
		font-size: 6rem;
		font-weight: 900;
		color: var(--color-accent);
	}

	.countdown-phone p {
		font-size: 1.25rem;
		color: var(--color-ink-muted);
	}

	.final-phone {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1.5rem;
		background: var(--color-page);
		gap: 1.5rem;
	}

	.crown-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.crown { font-size: 3rem; }
	.champ-avatar { font-size: 3rem; }

	.crown-section h2 {
		font-size: 1.5rem;
		color: var(--color-ink);
		margin: 0;
	}

	.champ-score {
		font-size: 1.25rem;
		color: var(--color-gold);
		font-weight: 700;
	}

	.final-board {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.final-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-card);
		border-radius: 0.5rem;
	}

	.f-rank { font-weight: 700; color: var(--color-ink-muted); width: 1.5rem; }
	.f-avatar { font-size: 1.25rem; }
	.f-name { flex: 1; font-weight: 600; color: var(--color-ink); }
	.f-score { font-weight: 700; color: var(--color-ink); }

	.next-game-timer {
		font-size: 1.125rem;
		color: var(--color-accent);
		font-weight: 700;
	}

	.play-again-btn {
		width: 100%;
		margin-top: 0.5rem;
	}

	.error-toast {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		right: 1rem;
		background: var(--color-wrong);
		color: white;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		z-index: 100;
	}

	.error-toast button {
		background: none;
		border: none;
		color: white;
		font-size: 1.5rem;
		cursor: pointer;
	}

	.connection-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: var(--color-wrong);
		color: white;
		text-align: center;
		padding: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		z-index: 100;
	}
</style>
