<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getSocket, disconnectSocket } from '$lib/stores/socket.js';
	import { gameStore } from '$lib/stores/game.svelte.js';
	import QRLobby from '$lib/components/tv/QRLobby.svelte';
	import Countdown from '$lib/components/tv/Countdown.svelte';
	import QuestionDisplay from '$lib/components/tv/QuestionDisplay.svelte';
	import RevealResults from '$lib/components/tv/RevealResults.svelte';
	import Leaderboard from '$lib/components/tv/Leaderboard.svelte';
	import FinalStandings from '$lib/components/tv/FinalStandings.svelte';

	onMount(() => {
		const socket = getSocket();

		socket.emit('tv:connect');

		socket.on('game:state', (state) => gameStore.applyState(state));
		socket.on('lobby:update', (data) => gameStore.setPlayers(data.players));
		socket.on('game:countdown', (data) => {
			gameStore.setPhase('COUNTDOWN');
			gameStore.setCountdown(data.seconds);
		});
		socket.on('game:tv-question', (data) => gameStore.setTvQuestion(data));
		socket.on('game:timer', (data) => gameStore.setTimer(data.remaining));
		socket.on('game:player-answered', (data) => gameStore.setAnsweredCount(data.answeredCount, data.totalPlayers));
		socket.on('game:reveal', (data) => gameStore.setRevealData(data));
		socket.on('game:scores', (data) => gameStore.setLeaderboard(data.leaderboard));
		socket.on('game:final', (data) => gameStore.setFinalData(data));
		socket.on('game:speed-recall-hide', () => gameStore.setSpeedRecallHidden());

		socket.on('connect', () => gameStore.setConnected(true));
		socket.on('disconnect', () => gameStore.setConnected(false));
	});

	onDestroy(() => {
		disconnectSocket();
	});
</script>

<svelte:head>
	<title>Scripture Showdown — TV</title>
</svelte:head>

<div class="tv-view">
	{#if gameStore.phase === 'IDLE' || gameStore.phase === 'LOBBY'}
		<QRLobby />
	{:else if gameStore.phase === 'COUNTDOWN'}
		<Countdown />
	{:else if gameStore.phase === 'QUESTION' || gameStore.phase === 'ANSWERING'}
		<QuestionDisplay />
	{:else if gameStore.phase === 'REVEAL'}
		<RevealResults />
	{:else if gameStore.phase === 'SCORES'}
		<Leaderboard />
	{:else if gameStore.phase === 'FINAL'}
		<FinalStandings />
	{/if}

	{#if !gameStore.connected}
		<div class="connection-overlay">
			<p>Reconnecting...</p>
		</div>
	{/if}
</div>

<style>
	.connection-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: var(--color-wrong);
		color: white;
		text-align: center;
		padding: 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		z-index: 100;
	}
</style>
