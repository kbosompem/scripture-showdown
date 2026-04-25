<script lang="ts">
	import { onMount } from 'svelte';

	interface ActiveSession {
		sessionId: string;
		phase: string;
		playerCount: number;
		mode: string | null;
		packName: string | null;
		currentRound: number;
		totalRounds: number;
	}

	let tvUrl = $state('');
	let playUrl = $state('');
	let showSessions = $state(false);
	let loadingSessions = $state(false);
	let activeSessions = $state<ActiveSession[]>([]);

	onMount(() => {
		const base = window.location.origin;
		tvUrl = `${base}/tv`;
		playUrl = `${base}/play`;
	});

	async function loadSessions() {
		loadingSessions = true;
		try {
			const res = await fetch('/api/sessions');
			if (res.ok) {
				activeSessions = await res.json();
			}
		} catch {
			activeSessions = [];
		}
		loadingSessions = false;
	}

	function toggleSessions() {
		showSessions = !showSessions;
		if (showSessions) loadSessions();
	}
</script>

<svelte:head>
	<title>Scripture Showdown</title>
</svelte:head>

<div class="landing gradient-bg">
	<header class="hero">
		<h1 class="animate-float-soft"><span class="shimmer-text">Scripture</span><br/><span class="shimmer-text">Showdown</span></h1>
		<div class="divider-ornament"><span class="animate-sparkle">&#10045;</span></div>
		<p class="tagline">A real-time Bible quiz for the whole family</p>
	</header>

	<div class="how-it-works">
		<h2>How to Play</h2>
		<div class="steps">
			<div class="step step-1">
				<span class="step-num">1</span>
				<h3>Open TV View</h3>
				<p>Navigate to the TV URL — a new game session is created automatically</p>
				{#if tvUrl}
					<a href={tvUrl} class="step-link">{tvUrl}</a>
				{/if}
			</div>
			<div class="step step-2">
				<span class="step-num">2</span>
				<h3>Scan QR Code</h3>
				<p>Everyone scans the QR code shown on TV with their phone</p>
			</div>
			<div class="step step-3">
				<span class="step-num">3</span>
				<h3>Pick & Play</h3>
				<p>Choose a verse pack, game mode, and start playing!</p>
			</div>
		</div>
	</div>

	<div class="quick-links">
		<a href="/tv" class="btn btn-primary animate-pulse-glow">Open TV Display</a>
		<a href="/play" class="btn btn-secondary">Join as Player</a>
		<a href="/leaderboard" class="btn btn-secondary">Leaderboard</a>
		<button type="button" class="btn btn-secondary" onclick={toggleSessions}>
			{showSessions ? 'Hide Active Games' : 'Active Games'}
		</button>
	</div>

	{#if showSessions}
		<div class="sessions-panel animate-fade-in-up">
			<h2>Active Games</h2>
			{#if loadingSessions}
				<p class="sessions-empty">Loading…</p>
			{:else if activeSessions.length === 0}
				<p class="sessions-empty">No games in progress. <a href="/tv">Start one</a>.</p>
			{:else}
				<ul class="sessions-list">
					{#each activeSessions as s (s.sessionId)}
						<li class="session-row">
							<span class="session-code">{s.sessionId}</span>
							<span class="session-meta">
								{s.phase === 'LOBBY' ? 'Lobby' : `Round ${s.currentRound}/${s.totalRounds}`}
								· {s.playerCount} {s.playerCount === 1 ? 'player' : 'players'}
								{#if s.packName}· {s.packName}{/if}
							</span>
							<a class="session-join" href={`/play/${s.sessionId}`}>Join</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<div class="game-modes">
		<h2>Game Modes</h2>
		<div class="mode-cards">
			<div class="mode-card">
				<span class="mode-icon">&#9997;</span>
				<h3>Fill the Gap</h3>
				<p>Complete the verse by filling in missing words</p>
			</div>
			<div class="mode-card">
				<span class="mode-icon">&#128214;</span>
				<h3>Name That Reference</h3>
				<p>Identify the Book, Chapter & Verse</p>
			</div>
			<div class="mode-card">
				<span class="mode-icon">&#128172;</span>
				<h3>Quote It</h3>
				<p>Pick the missing words from multiple choices</p>
			</div>
			<div class="mode-card">
				<span class="mode-icon">&#128100;</span>
				<h3>Who Said This?</h3>
				<p>Identify the speaker or character from four choices</p>
			</div>
			<div class="mode-card">
				<span class="mode-icon">&#128290;</span>
				<h3>Bible Numbers</h3>
				<p>Answer how many? and numeric facts from Scripture</p>
			</div>
			<div class="mode-card">
				<span class="mode-icon">&#128218;</span>
				<h3>Single Book</h3>
				<p>Verses from one book — name the chapter and verse</p>
			</div>
		</div>
	</div>
</div>

<style>
	.landing {
		min-height: 100dvh;
		background: var(--color-page);
		padding: 3rem 1.5rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.hero { text-align: center; margin-bottom: 3rem; }

	.hero h1 {
		font-family: var(--font-verse);
		font-size: 3.5rem;
		font-weight: 900;
		color: var(--color-ink);
		line-height: 1.2;
		margin: 0;
	}

	.tagline { font-size: 1.25rem; color: var(--color-ink-muted); margin-top: 0.5rem; }
	.how-it-works { margin-bottom: 3rem; }

	.how-it-works h2, .game-modes h2 {
		font-family: var(--font-verse);
		font-size: 2rem;
		color: var(--color-ink);
		text-align: center;
		margin: 0 0 1.5rem;
	}

	.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }

	.step {
		text-align: center;
		padding: 1.5rem;
		background: var(--color-card);
		border-radius: 0.75rem;
		border: 2px solid var(--color-border);
		opacity: 0;
		animation: fade-in-up 0.6s ease forwards;
		transition: transform 200ms ease, box-shadow 200ms ease;
	}

	.step-1 { animation-delay: 0.1s; }
	.step-2 { animation-delay: 0.25s; }
	.step-3 { animation-delay: 0.4s; }

	.step:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(62, 39, 35, 0.12);
	}

	.step-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: var(--color-accent);
		color: white;
		font-weight: 800;
		font-size: 1.25rem;
		margin-bottom: 0.75rem;
	}

	.step h3 { font-size: 1.125rem; color: var(--color-ink); margin: 0 0 0.5rem; }
	.step p { font-size: 0.875rem; color: var(--color-ink-muted); margin: 0; }
	.step-link { font-size: 0.75rem; color: var(--color-accent); word-break: break-all; }

	.quick-links {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 3rem;
		flex-wrap: wrap;
	}

	.quick-links .btn { min-width: 160px; text-decoration: none; text-align: center; }
	.game-modes { margin-bottom: 2rem; }
	.mode-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }

	.mode-card {
		padding: 1.25rem;
		background: var(--color-card);
		border-radius: 0.75rem;
		border: 2px solid var(--color-border);
		text-align: center;
		transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
	}

	.mode-card:hover {
		transform: translateY(-4px) scale(1.02);
		border-color: var(--color-accent);
		box-shadow: 0 8px 20px rgba(139, 26, 26, 0.15);
	}

	.mode-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
	.mode-card h3 { font-size: 1rem; color: var(--color-ink); margin: 0 0 0.375rem; }
	.mode-card p { font-size: 0.8rem; color: var(--color-ink-muted); margin: 0; }

	.sessions-panel {
		margin: 0 0 3rem;
		padding: 1.25rem;
		background: var(--color-card);
		border-radius: 0.75rem;
		border: 2px solid var(--color-border);
	}

	.sessions-panel h2 {
		font-family: var(--font-verse);
		font-size: 1.5rem;
		color: var(--color-ink);
		margin: 0 0 0.75rem;
		text-align: center;
	}

	.sessions-empty {
		text-align: center;
		color: var(--color-ink-muted);
		font-size: 0.95rem;
		margin: 0.5rem 0;
	}

	.sessions-empty a {
		color: var(--color-accent);
		font-weight: 700;
		text-decoration: underline;
	}

	.sessions-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.session-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-page);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}

	.session-code {
		font-family: monospace;
		font-weight: 800;
		color: var(--color-accent);
		letter-spacing: 0.1em;
	}

	.session-meta {
		font-size: 0.85rem;
		color: var(--color-ink-muted);
	}

	.session-join {
		background: var(--color-accent);
		color: white;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		text-decoration: none;
		font-weight: 700;
		font-size: 0.875rem;
	}
</style>
