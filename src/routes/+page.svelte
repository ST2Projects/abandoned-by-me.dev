<script>
	import { page } from '$app/stores';
	import { badges } from '$lib/utils/badges.js';

	$: session = $page.data?.session;
	$: user = session?.user;

	const featuredBadges = badges.slice(0, 6);
</script>

<svelte:head>
	<title>Abandoned by Me - A Cemetery for Your Forgotten Code</title>
	<meta name="description" content="Proudly display your abandoned GitHub and GitLab repositories. Get sarcastic badges, share your graveyard of unfinished projects, and embrace the art of not finishing things." />
</svelte:head>

<div class="landing">
	<!-- Hero Section -->
	<section class="hero">
		<div class="hero-inner">
			<div class="tombstones" aria-hidden="true">
				<span class="tombstone t1">🪦</span>
				<span class="tombstone t2">🪦</span>
				<span class="tombstone t3">🪦</span>
			</div>

			<h1>A Cemetery for Code<br />That Never Made It</h1>
			<p class="hero-subtitle">
				Your projects didn't die. They just... stopped living.
				<br />Scan your GitHub &amp; GitLab repos, earn sarcastic badges, and share your graveyard with the world.
			</p>

			{#if user}
				<a href="/dashboard" class="btn-primary">
					Go to Your Dashboard
				</a>
			{:else}
				<a href="/login" class="btn-primary">
					Get Started
				</a>
			{/if}
		</div>
	</section>

	<!-- How it Works -->
	<section class="how-it-works">
		<div class="section-inner">
			<h2>How It Works</h2>
			<div class="steps">
				<div class="step">
					<div class="step-icon">1</div>
					<h3>Connect Your Account</h3>
					<p>Sign in with GitHub or GitLab. We only read your public repo data.</p>
				</div>
				<div class="step">
					<div class="step-icon">2</div>
					<h3>We Scan Your Repos</h3>
					<p>We check when you last committed to each repository. No judgment. Okay, some judgment.</p>
				</div>
				<div class="step">
					<div class="step-icon">3</div>
					<h3>Face the Truth</h3>
					<p>See which repos you've ghosted, earn badges of dishonor, and share your graveyard.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Badge Preview -->
	<section class="badges-preview">
		<div class="section-inner">
			<h2>Earn Badges of Dishonor</h2>
			<p class="section-subtitle">Because every abandoned repo deserves recognition.</p>
			<div class="badges-grid">
				{#each featuredBadges as badge}
					<div class="badge-card">
						<span class="badge-icon">{badge.icon}</span>
						<span class="badge-name">{badge.name}</span>
						<span class="badge-desc">{badge.description}</span>
					</div>
				{/each}
			</div>
			<p class="badges-more">...and {badges.length - featuredBadges.length} more badges to unlock</p>
		</div>
	</section>

	<!-- Features -->
	<section class="features">
		<div class="section-inner">
			<div class="feature-grid">
				<div class="feature">
					<span class="feature-icon">🔒</span>
					<h3>Privacy First</h3>
					<p>No analytics, no tracking, no telemetry. Your abandoned projects are your business.</p>
				</div>
				<div class="feature">
					<span class="feature-icon">🔗</span>
					<h3>Shareable Profiles</h3>
					<p>Generate a public profile to share your repo graveyard. Great for... honestly we're not sure.</p>
				</div>
				<div class="feature">
					<span class="feature-icon">🎚️</span>
					<h3>Configurable</h3>
					<p>Set your own abandonment threshold. 6 months? 1 month? It's your guilt trip.</p>
				</div>
				<div class="feature">
					<span class="feature-icon">😂</span>
					<h3>Sarcastic Stats</h3>
					<p>Random excuses, roast messages, and brutal honesty about your commit history.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="cta">
		<div class="section-inner">
			<h2>Ready to Face Your Abandoned Projects?</h2>
			<p>It's free, it's fast, and it's only mildly soul-crushing.</p>
			{#if user}
				<a href="/dashboard" class="btn-primary">Go to Dashboard</a>
			{:else}
				<a href="/login" class="btn-primary">Get Started</a>
			{/if}
		</div>
	</section>
</div>

<style>
	.landing {
		width: 100%;
	}

	.section-inner {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	/* Hero */
	.hero {
		text-align: center;
		padding: 6rem 1.5rem 4rem;
		background: linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, transparent 100%);
		position: relative;
		overflow: hidden;
	}

	.hero-inner {
		max-width: 700px;
		margin: 0 auto;
		position: relative;
		z-index: 1;
	}

	.tombstones {
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.tombstone {
		font-size: 2.5rem;
		display: inline-block;
		animation: float 3s ease-in-out infinite;
	}

	.t1 { animation-delay: 0s; opacity: 0.5; }
	.t2 { animation-delay: 0.5s; font-size: 3.5rem; }
	.t3 { animation-delay: 1s; opacity: 0.5; }

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}

	.hero h1 {
		font-size: 3rem;
		line-height: 1.15;
		margin-bottom: 1.25rem;
		color: var(--color-text-primary);
	}

	.hero-subtitle {
		font-size: 1.15rem;
		color: var(--color-text-secondary);
		margin-bottom: 2.5rem;
		line-height: 1.7;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		background: var(--color-accent-purple);
		color: white;
		border: none;
		padding: 0.85rem 2rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.05rem;
		cursor: pointer;
		transition: background 0.2s, transform 0.2s;
		text-decoration: none;
	}

	.btn-primary:hover {
		background: var(--color-accent-purple-dim);
		transform: translateY(-2px);
		text-decoration: none;
		color: white;
	}

	/* How it Works */
	.how-it-works {
		padding: 5rem 0;
		border-top: 1px solid var(--color-border);
	}

	.how-it-works h2 {
		text-align: center;
		font-size: 2rem;
		margin-bottom: 3rem;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}

	.step {
		text-align: center;
		padding: 2rem 1.5rem;
		border-radius: 12px;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
	}

	.step-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--color-accent-purple);
		color: white;
		font-weight: 800;
		font-size: 1.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.step h3 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.step p {
		font-size: 0.9rem;
		margin: 0;
	}

	/* Badges Preview */
	.badges-preview {
		padding: 5rem 0;
		background: var(--color-bg-card);
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}

	.badges-preview h2 {
		text-align: center;
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.section-subtitle {
		text-align: center;
		color: var(--color-text-secondary);
		margin-bottom: 2.5rem;
	}

	.badges-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.badge-card {
		background: var(--color-bg-dark);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		transition: border-color 0.2s;
	}

	.badge-card:hover {
		border-color: var(--color-accent-purple);
	}

	.badge-icon {
		font-size: 1.75rem;
	}

	.badge-name {
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--color-text-primary);
	}

	.badge-desc {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.badges-more {
		text-align: center;
		margin-top: 1.5rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	/* Features */
	.features {
		padding: 5rem 0;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	.feature {
		padding: 1.75rem;
		border-radius: 12px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-card);
	}

	.feature-icon {
		font-size: 1.75rem;
		display: block;
		margin-bottom: 0.75rem;
	}

	.feature h3 {
		font-size: 1.05rem;
		margin-bottom: 0.5rem;
	}

	.feature p {
		font-size: 0.9rem;
		margin: 0;
	}

	/* CTA */
	.cta {
		padding: 5rem 0;
		text-align: center;
		border-top: 1px solid var(--color-border);
		background: linear-gradient(0deg, rgba(139, 92, 246, 0.06) 0%, transparent 100%);
	}

	.cta h2 {
		font-size: 2rem;
		margin-bottom: 0.75rem;
	}

	.cta p {
		margin-bottom: 2rem;
		font-size: 1.1rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding: 4rem 1.5rem 3rem;
		}

		.hero h1 {
			font-size: 2rem;
		}

		.hero-subtitle {
			font-size: 1rem;
		}

		.steps {
			grid-template-columns: 1fr;
		}

		.badges-grid {
			grid-template-columns: 1fr 1fr;
		}

		.feature-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.badges-grid {
			grid-template-columns: 1fr;
		}

		.hero h1 {
			font-size: 1.75rem;
		}
	}
</style>
