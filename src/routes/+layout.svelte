<script>
	import Header from '../components/ui/Header.svelte';
	import '../app.css';
</script>

<div class="app">
	<Header />

	<main>
		<slot />
	</main>

	<footer>
		<div class="footer-inner">
			<div class="footer-brand">
				<span class="footer-logo">🪦 abandoned<span class="accent">by.me</span></span>
				<p>Proudly displaying unfinished business since 2026</p>
			</div>
			<div class="footer-links">
				<a href="/about">About</a>
				<a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
			</div>
			<div class="footer-privacy">
				No tracking. No analytics. No judgment (okay, a little judgment).
			</div>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
	}

	footer {
		border-top: 1px solid var(--color-border);
		padding: 2.5rem 1.5rem;
		margin-top: auto;
	}

	.footer-inner {
		max-width: var(--max-width);
		margin: 0 auto;
		text-align: center;
	}

	.footer-logo {
		font-weight: 700;
		font-size: 1rem;
		color: var(--color-text-primary);
	}

	.accent {
		color: var(--color-accent-purple);
	}

	.footer-brand p {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0.5rem 0 0;
	}

	.footer-links {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		margin: 1rem 0;
	}

	.footer-links a {
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}

	.footer-links a:hover {
		color: var(--color-accent-purple);
	}

	.footer-privacy {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		font-style: italic;
	}
</style>
