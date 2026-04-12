<script lang="ts">
	import { gameStore } from '$lib/stores/game.svelte.js';

	const colors = ['var(--color-accent)', 'var(--color-gold)', 'var(--color-correct)'];
	let colorIndex = $derived(Math.max(0, 3 - gameStore.countdown));
</script>

<div class="countdown-screen">
	{#if gameStore.countdown > 0}
		{#key gameStore.countdown}
			<span class="countdown-number animate-bounce-in" style="color: {colors[colorIndex]}">
				{gameStore.countdown}
			</span>
		{/key}
	{:else}
		<span class="countdown-go animate-bounce-in">GO!</span>
	{/if}

	{#if gameStore.packName && gameStore.mode}
		<p class="countdown-info">
			{gameStore.packName}
		</p>
	{/if}
</div>

<style>
	.countdown-screen {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--color-page);
		gap: 2rem;
	}

	.countdown-number {
		font-size: 12rem;
		font-weight: 900;
		line-height: 1;
	}

	.countdown-go {
		font-size: 8rem;
		font-weight: 900;
		color: var(--color-correct);
		line-height: 1;
	}

	.countdown-info {
		font-size: 2rem;
		color: var(--color-ink-muted);
	}
</style>
