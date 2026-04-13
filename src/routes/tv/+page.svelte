<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		// Generate a session ID client-side and redirect
		const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
		let id = '';
		for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
		goto(`/tv/${id}`, { replaceState: true });
	});
</script>

<div class="loading-screen">
	<h1>Scripture Showdown</h1>
	<p>Creating session...</p>
</div>

<style>
	.loading-screen {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--color-page);
		gap: 1rem;
	}
	h1 {
		font-family: var(--font-verse);
		font-size: 3rem;
		color: var(--color-ink);
	}
	p {
		color: var(--color-ink-muted);
		font-size: 1.25rem;
	}
</style>
