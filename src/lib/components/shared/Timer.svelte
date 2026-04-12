<script lang="ts">
	let { remaining, total }: { remaining: number; total: number } = $props();

	let progress = $derived(remaining / total);
	let urgent = $derived(remaining <= 5);
	let circumference = 2 * Math.PI * 45;
	let dashOffset = $derived(circumference * (1 - progress));
</script>

<div class="timer" class:urgent>
	<svg viewBox="0 0 100 100" width="80" height="80">
		<circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" stroke-width="6" />
		<circle
			cx="50" cy="50" r="45" fill="none"
			stroke={urgent ? 'var(--color-wrong)' : 'var(--color-gold)'}
			stroke-width="6"
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={dashOffset}
			transform="rotate(-90 50 50)"
			style="transition: stroke-dashoffset 1s linear, stroke 0.3s ease;"
		/>
	</svg>
	<span class="timer-text">{remaining}</span>
</div>

<style>
	.timer {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.timer-text {
		position: absolute;
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--color-ink);
	}

	.urgent .timer-text {
		color: var(--color-wrong);
		animation: pulse 0.5s ease-in-out infinite alternate;
	}

	@keyframes pulse {
		from { transform: scale(1); }
		to { transform: scale(1.15); }
	}
</style>
