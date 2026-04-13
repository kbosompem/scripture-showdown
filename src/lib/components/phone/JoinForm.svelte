<script lang="ts">
	import { onMount } from 'svelte';
	import { PLAYER_AVATARS, AVATAR_EMOJI, type Avatar } from '$lib/types/index.js';
	import { browser } from '$app/environment';

	let { onJoin }: { onJoin: (name: string, avatar: Avatar) => void } = $props();

	let name = $state('');
	let selectedAvatar = $state<Avatar>('lion');

	onMount(() => {
		if (browser) {
			const savedName = localStorage.getItem('ss_playerName');
			const savedAvatar = localStorage.getItem('ss_playerAvatar') as Avatar | null;
			if (savedName) name = savedName;
			if (savedAvatar && PLAYER_AVATARS.includes(savedAvatar)) selectedAvatar = savedAvatar;
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (name.trim()) {
			if (browser) {
				try {
					localStorage.setItem('ss_playerName', name.trim());
					localStorage.setItem('ss_playerAvatar', selectedAvatar);
				} catch { /* ignore */ }
			}
			onJoin(name.trim(), selectedAvatar);
		}
	}
</script>

<div class="join-screen">
	<header>
		<h1>Scripture<br/>Showdown</h1>
		<div class="divider-ornament">&#10045;</div>
	</header>

	<form onsubmit={handleSubmit} class="join-form">
		<span class="field-label">Your name</span>
		<input
			type="text"
			class="input"
			bind:value={name}
			placeholder="Enter your name"
			maxlength="20"
			autocomplete="off"
		/>

		<span class="field-label">Pick an icon</span>
		<div class="avatar-grid">
			{#each PLAYER_AVATARS.slice(0, 12) as avatar (avatar)}
				<button
					type="button"
					class="avatar-btn"
					class:selected={selectedAvatar === avatar}
					onclick={() => selectedAvatar = avatar}
				>
					{AVATAR_EMOJI[avatar]}
				</button>
			{/each}
		</div>

		<button type="submit" class="btn btn-primary join-btn" disabled={!name.trim()}>
			Join Game
		</button>
	</form>
</div>

<style>
	.join-screen {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		padding: 2rem 1.5rem;
		background: var(--color-page);
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-family: var(--font-verse);
		font-size: 2.5rem;
		font-weight: 900;
		color: var(--color-ink);
		line-height: 1.2;
		margin: 0;
	}

	.join-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field-label {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.avatar-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.5rem;
	}

	.avatar-btn {
		width: 100%;
		aspect-ratio: 1;
		font-size: 1.75rem;
		border: 2px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-card);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 150ms ease;
	}

	.avatar-btn.selected {
		border-color: var(--color-accent);
		background: white;
		transform: scale(1.1);
		box-shadow: 0 2px 8px rgba(139, 26, 26, 0.2);
	}

	.join-btn {
		margin-top: 1rem;
		width: 100%;
		font-size: 1.25rem;
		padding: 1rem;
	}

	.join-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
