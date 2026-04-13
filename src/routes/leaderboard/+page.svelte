<script lang="ts">
	import { onMount } from 'svelte';

	interface AllTimeEntry {
		name: string;
		totalScore: number;
		gamesPlayed: number;
		wins: number;
		bestRank: number;
		avgScore: number;
	}

	interface SessionEntry {
		id: string;
		mode: string;
		numRounds: number;
		date: string;
		packName: string;
		packIcon: string;
		champion: string;
		topScore: number;
		playerCount: number;
		players: { name: string; score: number; rank: number }[];
	}

	let allTime = $state<AllTimeEntry[]>([]);
	let recentSessions = $state<SessionEntry[]>([]);
	let tab = $state<'alltime' | 'recent'>('alltime');
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/leaderboard?limit=50');
			const data = await res.json();
			allTime = data.allTime;
			recentSessions = data.recentSessions;
		} catch {
			// silently fail
		}
		loading = false;
	});

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return iso;
		}
	}

	const MODE_LABELS: Record<string, string> = {
		'fill-the-gap': 'Fill the Gap',
		'name-that-reference': 'Name That Reference',
		'quote-it': 'Quote It',
		'speed-recall': 'Speed Recall'
	};
</script>

<svelte:head>
	<title>Leaderboard — Scripture Showdown</title>
</svelte:head>

<div class="lb-page">
	<header class="lb-header">
		<a href="/" class="back-link">&#8592; Home</a>
		<h1>Leaderboard</h1>
	</header>

	<div class="tab-bar">
		<button class="tab-btn" class:active={tab === 'alltime'} onclick={() => tab = 'alltime'}>
			All Time
		</button>
		<button class="tab-btn" class:active={tab === 'recent'} onclick={() => tab = 'recent'}>
			Recent Games
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if tab === 'alltime'}
		{#if allTime.length === 0}
			<div class="empty">No games played yet. Be the first!</div>
		{:else}
			<div class="alltime-list">
				{#each allTime as entry, i (entry.name)}
					<div class="at-row" class:gold={i === 0} class:silver={i === 1} class:bronze={i === 2}>
						<span class="at-rank">
							{#if i === 0}&#129351;{:else if i === 1}&#129352;{:else if i === 2}&#129353;{:else}{i + 1}{/if}
						</span>
						<div class="at-info">
							<span class="at-name">{entry.name}</span>
							<span class="at-stats">
								{entry.gamesPlayed} game{entry.gamesPlayed !== 1 ? 's' : ''}
								&middot; {entry.wins} win{entry.wins !== 1 ? 's' : ''}
								&middot; avg {entry.avgScore}
							</span>
						</div>
						<span class="at-score">{entry.totalScore.toLocaleString()}</span>
					</div>
				{/each}
			</div>
		{/if}

	{:else}
		{#if recentSessions.length === 0}
			<div class="empty">No completed games yet.</div>
		{:else}
			<div class="sessions-list">
				{#each recentSessions as session (session.id)}
					<div class="session-card">
						<div class="session-header">
							<span class="session-mode">{session.packIcon} {MODE_LABELS[session.mode] || session.mode}</span>
							<span class="session-date">{formatDate(session.date)}</span>
						</div>
						<div class="session-meta">
							{session.numRounds} rounds &middot; {session.playerCount} player{session.playerCount !== 1 ? 's' : ''}
						</div>
						<div class="session-players">
							{#each session.players as p (p.rank)}
								<div class="sp-row">
									<span class="sp-rank">
										{#if p.rank === 1}&#129351;{:else if p.rank === 2}&#129352;{:else if p.rank === 3}&#129353;{:else}{p.rank}{/if}
									</span>
									<span class="sp-name">{p.name}</span>
									<span class="sp-score">{p.score.toLocaleString()}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.lb-page {
		min-height: 100dvh;
		background: var(--color-page);
		padding: 1.5rem;
		max-width: 700px;
		margin: 0 auto;
	}

	.lb-header {
		text-align: center;
		margin-bottom: 1.5rem;
		position: relative;
	}

	.back-link {
		position: absolute;
		left: 0;
		top: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-accent);
		text-decoration: none;
		font-weight: 600;
	}

	.lb-header h1 {
		font-family: var(--font-verse);
		font-size: 2rem;
		color: var(--color-ink);
		margin: 0;
	}

	.tab-bar {
		display: flex;
		gap: 0;
		margin-bottom: 1.5rem;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 2px solid var(--color-border);
	}

	.tab-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		border: none;
		background: var(--color-card);
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		cursor: pointer;
		min-height: 48px;
	}

	.tab-btn.active {
		background: var(--color-accent);
		color: white;
	}

	.loading, .empty {
		text-align: center;
		padding: 3rem 1rem;
		font-size: 1.125rem;
		color: var(--color-ink-muted);
	}

	/* ── All-time list ── */
	.alltime-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.at-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--color-card);
		border-radius: 0.5rem;
		border: 2px solid var(--color-border);
	}

	.at-row.gold { border-color: #ffd700; background: #fffbe6; }
	.at-row.silver { border-color: #c0c0c0; background: #f8f8f8; }
	.at-row.bronze { border-color: #cd7f32; background: #fdf5ed; }

	.at-rank {
		font-size: 1.5rem;
		width: 2.5rem;
		text-align: center;
		font-weight: 700;
		color: var(--color-ink-muted);
	}

	.at-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.at-name {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.at-stats {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.at-score {
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--color-accent);
	}

	/* ── Recent sessions ── */
	.sessions-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.session-card {
		background: var(--color-card);
		border: 2px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1rem;
	}

	.session-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.session-mode {
		font-weight: 700;
		font-size: 1rem;
		color: var(--color-ink);
	}

	.session-date {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.session-meta {
		font-size: 0.8rem;
		color: var(--color-ink-muted);
		margin-bottom: 0.75rem;
	}

	.session-players {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sp-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}

	.sp-rank {
		width: 2rem;
		text-align: center;
		font-weight: 700;
		font-size: 1.125rem;
	}

	.sp-name {
		flex: 1;
		font-weight: 600;
		color: var(--color-ink);
	}

	.sp-score {
		font-weight: 700;
		color: var(--color-ink-muted);
	}
</style>
