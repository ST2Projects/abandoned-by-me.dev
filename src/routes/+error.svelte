<script>
	import { page } from '$app/stores';

	const excuses = [
		"We were going to build this page, but then we learned a new framework...",
		"This page exists in a parallel universe where we finish our projects",
		"404: Page not found (but at least we're honest about it)",
		"Unlike your abandoned repos, this page was never even started",
		"This page took a vacation and never came back",
		"We'd fix this, but we're busy not finishing other things",
	];

	const randomExcuse = excuses[Math.floor(Math.random() * excuses.length)];
</script>

<svelte:head>
	<title>404 - Abandoned by... Everyone</title>
</svelte:head>

<div class="error-page">
	<div class="tombstone">
		<div class="tombstone-top"></div>
		<div class="tombstone-body">
			<span class="rip">R.I.P.</span>
			<span class="error-code">{$page.status}</span>
			<span class="page-path">{$page.url.pathname}</span>
			<span class="epitaph">"Gone, but never committed"</span>
		</div>
	</div>

	<h1>This Page Was Abandoned</h1>
	<p class="excuse">{randomExcuse}</p>

	<div class="error-message">
		{#if $page.error?.message}
			<p class="technical">{$page.error.message}</p>
		{/if}
	</div>

	<div class="actions">
		<a href="/" class="btn-primary">Go Home</a>
		<a href="/dashboard" class="btn-secondary">View Dashboard</a>
	</div>

	<p class="footer-note">
		Don't worry, we won't add this to your abandoned repo count.
	</p>
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4rem 2rem;
		min-height: calc(100vh - 160px);
	}

	.tombstone {
		margin-bottom: 2rem;
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}

	.tombstone-top {
		width: 150px;
		height: 50px;
		background: var(--color-bg-surface);
		border-radius: 75px 75px 0 0;
		margin: 0 auto;
		border: 1px solid var(--color-border);
		border-bottom: none;
	}

	.tombstone-body {
		width: 150px;
		background: var(--color-bg-surface);
		padding: 1.25rem 1rem;
		margin: 0 auto;
		border-radius: 0 0 5px 5px;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		border: 1px solid var(--color-border);
		border-top: none;
	}

	.rip {
		font-family: serif;
		font-size: 1.25rem;
		font-weight: bold;
		color: var(--color-text-primary);
	}

	.error-code {
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--color-accent-purple);
	}

	.page-path {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-text-muted);
		word-break: break-all;
	}

	.epitaph {
		font-style: italic;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-top: 0.25rem;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0 0 1rem 0;
		color: var(--color-text-primary);
	}

	.excuse {
		font-size: 1.15rem;
		max-width: 500px;
		line-height: 1.5;
		color: var(--color-text-secondary);
		margin-bottom: 1rem;
	}

	.error-message {
		margin-bottom: 2rem;
	}

	.technical {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		color: var(--color-text-muted);
		background: var(--color-bg-card);
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
	}

	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.btn-primary {
		background: var(--color-accent-purple);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 700;
		text-decoration: none;
		transition: transform 0.2s, background 0.2s;
	}

	.btn-primary:hover {
		background: var(--color-accent-purple-dim);
		transform: translateY(-2px);
		text-decoration: none;
		color: white;
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-text-secondary);
		padding: 0.75rem 1.5rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
		transition: border-color 0.2s, color 0.2s;
	}

	.btn-secondary:hover {
		border-color: var(--color-accent-purple);
		color: var(--color-accent-purple);
		text-decoration: none;
	}

	.footer-note {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	@media (max-width: 768px) {
		h1 {
			font-size: 1.75rem;
		}

		.excuse {
			font-size: 1rem;
		}

		.tombstone-top, .tombstone-body {
			width: 120px;
		}

		.error-code {
			font-size: 2rem;
		}
	}
</style>
