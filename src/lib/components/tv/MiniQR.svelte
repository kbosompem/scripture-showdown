<script lang="ts">
	import { onMount } from 'svelte';

	let { sessionId = '' }: { sessionId?: string } = $props();

	let qrDataUrl = $state('');

	onMount(async () => {
		const gameUrl = `${window.location.origin}/play/${sessionId}`;

		const QRCode = await import('qrcode');
		qrDataUrl = await QRCode.toDataURL(gameUrl, {
			width: 120,
			margin: 1,
			color: { dark: '#3E2723', light: '#F5ECD7' },
			errorCorrectionLevel: 'M'
		});
	});
</script>

{#if qrDataUrl}
	<div class="mini-qr">
		<img src={qrDataUrl} alt="Join QR" class="mini-qr-img" />
		<span class="mini-qr-code">{sessionId}</span>
	</div>
{/if}

<style>
	.mini-qr {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		opacity: 0.7;
		z-index: 50;
		pointer-events: none;
	}

	.mini-qr-img {
		width: 100px;
		height: 100px;
		border-radius: 0.5rem;
		border: 2px solid var(--color-border);
	}

	.mini-qr-code {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-ink-muted);
		letter-spacing: 0.1em;
	}
</style>
