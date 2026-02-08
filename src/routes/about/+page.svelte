<svelte:head>
	<title>About - Abandoned by Me</title>
	<meta name="description" content="What is Abandoned by Me? A fun tool for developers to showcase their abandoned GitHub repositories." />
</svelte:head>

<div class="about">
	<div class="about-inner">
		<header class="about-header">
			<h1>About Abandoned by Me</h1>
			<p class="lead">
				A love letter to every <code>git init</code> that never got a second commit.
			</p>
		</header>

		<section class="about-section">
			<h2>What Is This?</h2>
			<p>
				<strong>Abandoned by Me</strong> is a web app for developers who are brave enough to confront
				their repository graveyards. We connect to your GitHub account, scan your repos, and show you
				exactly which projects you've ghosted.
			</p>
			<p>
				Instead of feeling guilty about it, we think you should <em>celebrate it</em>.
				Every abandoned project is evidence that you had an idea, got excited, and started building.
				That the excitement wore off before the README was done? That's just being human.
			</p>
		</section>

		<section class="about-section">
			<h2>How It Works</h2>
			<div class="steps-list">
				<div class="step-item">
					<span class="step-num">1</span>
					<div>
						<h3>Sign in with GitHub</h3>
						<p>We use GitHub OAuth, so we never see your password. We only read your public repository metadata.</p>
					</div>
				</div>
				<div class="step-item">
					<span class="step-num">2</span>
					<div>
						<h3>Scan Your Repositories</h3>
						<p>We look at when you last committed to each repo. If it's been longer than your threshold (default: 6 months), it's officially abandoned.</p>
					</div>
				</div>
				<div class="step-item">
					<span class="step-num">3</span>
					<div>
						<h3>See Your Graveyard</h3>
						<p>View your dashboard of abandoned repos, earn sarcastic badges, and optionally share a public profile of your finest unfinished work.</p>
					</div>
				</div>
			</div>
		</section>

		<section class="about-section">
			<h2>Privacy</h2>
			<p>We take privacy seriously, even if we don't take your commit history seriously.</p>
			<ul class="privacy-list">
				<li>No analytics or tracking of any kind</li>
				<li>No cookies beyond what's needed for your session</li>
				<li>We only store your public repository metadata</li>
				<li>Your data is never shared with anyone</li>
				<li>You can delete your account and all data at any time</li>
				<li>Public profiles only show public repositories</li>
			</ul>
		</section>

		<section class="about-section">
			<h2>Why?</h2>
			<p>
				Because the developer community has a collective habit of starting projects and never finishing them,
				and we figured we should at least make it entertaining. Also, someone started building this app
				and if we abandoned it too, that would just be too on the nose.
			</p>
		</section>
	</div>
</div>

<style>
	.about {
		padding: 3rem 1.5rem;
	}

	.about-inner {
		max-width: 700px;
		margin: 0 auto;
	}

	.about-header {
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--color-border);
	}

	.about-header h1 {
		font-size: 2.25rem;
		margin-bottom: 0.75rem;
	}

	.lead {
		font-size: 1.15rem;
		color: var(--color-text-secondary);
	}

	.lead code {
		background: var(--color-bg-surface);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.95em;
		color: var(--color-accent-purple);
	}

	.about-section {
		margin-bottom: 2.5rem;
	}

	.about-section h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
		color: var(--color-text-primary);
	}

	.about-section p {
		margin-bottom: 1rem;
	}

	.about-section strong {
		color: var(--color-text-primary);
	}

	.steps-list {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.step-item {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
	}

	.step-num {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--color-accent-purple);
		color: white;
		font-weight: 800;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.step-item h3 {
		font-size: 1.05rem;
		margin-bottom: 0.25rem;
	}

	.step-item p {
		margin: 0;
		font-size: 0.9rem;
	}

	.privacy-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.privacy-list li {
		padding: 0.5rem 0;
		color: var(--color-text-secondary);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.privacy-list li::before {
		content: '\2713';
		color: var(--color-accent-green);
		font-weight: bold;
		flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.about-header h1 {
			font-size: 1.75rem;
		}
	}
</style>
