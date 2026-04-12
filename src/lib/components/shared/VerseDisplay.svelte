<script lang="ts">
	let { text, reference = '', size = 'large' }: { text: string; reference?: string; size?: 'large' | 'medium' } = $props();
</script>

<div class="verse-container" class:large={size === 'large'} class:medium={size === 'medium'}>
	<p class="verse-text">
		&ldquo;{text}&rdquo;
	</p>
	{#if reference}
		<p class="verse-ref">&mdash; {reference}</p>
	{/if}
</div>

<style>
	.verse-container {
		text-align: center;
		max-width: 80%;
		margin: 0 auto;
	}

	.verse-text {
		font-family: var(--font-verse);
		color: var(--color-ink-verse);
		line-height: 1.8;
		letter-spacing: 0.01em;
	}

	.large .verse-text {
		font-size: 2.5rem;
	}

	.medium .verse-text {
		font-size: 1.5rem;
	}

	.verse-ref {
		font-family: var(--font-ui);
		color: var(--color-ink-muted);
		font-size: 1.25rem;
		margin-top: 1rem;
		font-style: italic;
	}

	.large .verse-ref {
		font-size: 1.75rem;
	}
</style>
