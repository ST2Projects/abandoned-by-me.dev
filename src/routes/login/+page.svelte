<script>
	import { authClient } from '$lib/auth/auth-client.js';

	let isLoading = false;

	async function signInWithGitHub() {
		isLoading = true;
		try {
			await authClient.signIn.social({
				provider: 'github',
				callbackURL: '/dashboard',
			});
		} catch (err) {
			console.error('Sign in failed:', err);
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - Abandoned by Me</title>
	<meta name="description" content="Sign in to track your abandoned GitHub repositories" />
</svelte:head>

<div class="login-page">
	<div class="login-container">
		<div class="login-icon">🪦</div>
		<h1>Ready to Face Your Abandoned Projects?</h1>
		<p class="subtitle">
			Sign in with GitHub and we'll show you which repos you've been ghosting.
		</p>

		<button
			on:click={signInWithGitHub}
			disabled={isLoading}
			class="github-btn"
		>
			{#if isLoading}
				<div class="loading-spinner"></div>
				Redirecting to GitHub...
			{:else}
				<svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
				</svg>
				Sign in with GitHub
			{/if}
		</button>

		<div class="info-cards">
			<div class="info-card">
				<span class="info-icon">🔍</span>
				<p>We'll scan your public GitHub repos to find your abandoned projects</p>
			</div>
			<div class="info-card">
				<span class="info-icon">🔒</span>
				<p>We only read your public repository data. No write access, ever.</p>
			</div>
			<div class="info-card">
				<span class="info-icon">🚫</span>
				<p>No analytics, no tracking, no telemetry. Your data stays yours.</p>
			</div>
		</div>
	</div>
</div>

<style>
	.login-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 160px);
		padding: 2rem 1.5rem;
	}

	.login-container {
		max-width: 440px;
		width: 100%;
		text-align: center;
	}

	.login-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 1.75rem;
		margin-bottom: 0.75rem;
		color: var(--color-text-primary);
		text-align: center;
	}

	.subtitle {
		font-size: 1.05rem;
		color: var(--color-text-secondary);
		margin-bottom: 2rem;
	}

	.github-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		background: var(--color-text-primary);
		color: var(--color-bg-dark);
		border: none;
		padding: 0.85rem 2rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.05rem;
		cursor: pointer;
		transition: opacity 0.2s, transform 0.2s;
		width: 100%;
	}

	.github-btn:hover:not(:disabled) {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.github-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.github-icon {
		width: 22px;
		height: 22px;
	}

	.loading-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.info-cards {
		margin-top: 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.info-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.85rem 1rem;
		text-align: left;
	}

	.info-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.info-card p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}
</style>
