<script lang="ts">
	import { onMount } from 'svelte';

	let tvUrl = $state('');
	let playUrl = $state('');

	onMount(() => {
		const host = window.location.hostname;
		const port = window.location.port;
		const base = `http://${host}${port ? ':' + port : ''}`;
		tvUrl = `${base}/tv`;
		playUrl = `${base}/play`;
	});
</script>

<svelte:head>
	<title>Scripture Showdown</title>
</svelte:head>

<div class="landing">
	<header class="hero">
		<h1>Scripture<br/>Showdown</h1>
		<div class="divider-ornament">&#10045;</div>
		<p class="tagline">A real-time Bible quiz for the whole family</p>
	</header>

	<div class="how-it-works">
		<h2>How to Play</h2>
		<div class="steps">
			<div class="step">
				<span class="step-num">1</span>
				<h3>Open TV View</h3>
				<p>Navigate to the TV URL — a new game session is created automatically</p>
				{#if tvUrl}
					<a href={tvUrl} class="step-link">{tvUrl}</a>
				{/if}
			</div>
			<div class="step">
				<span class="step-num">2</span>
				<h3>Scan QR Code</h3>
				<p>Everyone scans the QR code shown on TV with their phone</p>
			</div>
			<div class="step">
				<span class="step-num">3</span>
				<h3>Pick & Play</h3>
				<p>Choose a verse pack, game mode, and start playing!</p>
			</div>
		</div>
	</div>

	<div class="quick-links">
		<a href="/tv" class="btn btn-primary">Open TV Display</a>
		<a href="/play" class="btn btn-secondary">Join as Player</a>
		<a href="/leaderboard" class="btn btn-secondary">Leaderboard</a>
	</div>

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
	}

	.mode-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
	.mode-card h3 { font-size: 1rem; color: var(--color-ink); margin: 0 0 0.375rem; }
	.mode-card p { font-size: 0.8rem; color: var(--color-ink-muted); margin: 0; }
</style>
