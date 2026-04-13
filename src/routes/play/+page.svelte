<script lang="ts">
	import { goto } from '$app/navigation';

	let code = $state('');

	function handleJoin() {
		const trimmed = code.trim().toUpperCase();
		if (trimmed.length >= 4) {
			goto(`/play/${trimmed}`);
		}
	}
</script>

<svelte:head>
	<title>Scripture Showdown — Join</title>
</svelte:head>

<div class="join-page">
	<header>
		<h1>Scripture<br/>Showdown</h1>
		<div class="divider-ornament">&#10045;</div>
	</header>

	<div class="join-content">
		<p class="instruction">Scan the QR code on the TV screen, or enter the game code below:</p>

		<form onsubmit={(e) => { e.preventDefault(); handleJoin(); }} class="code-form">
			<input
				type="text"
				class="input code-input"
				bind:value={code}
				placeholder="Enter game code"
				maxlength="6"
				autocomplete="off"
				autocapitalize="characters"
			/>
			<button type="submit" class="btn btn-primary" disabled={code.trim().length < 4}>
				Join Game
			</button>
		</form>
	</div>
</div>

<style>
	.join-page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 3rem 1.5rem;
		background: var(--color-page);
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-family: var(--font-verse);
		font-size: 2.5rem;
		font-weight: 900;
		color: var(--color-ink);
		line-height: 1.2;
		margin: 0;
	}

	.join-content {
		width: 100%;
		max-width: 400px;
	}

	.instruction {
		text-align: center;
		color: var(--color-ink-muted);
		font-size: 1.125rem;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.code-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.code-input {
		text-align: center;
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		text-transform: uppercase;
	}
</style>
