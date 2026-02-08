<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<svelte:head>
	<title>Explore the Graveyards - Abandoned by Me</title>
	<meta name="description" content="Browse public dashboards of abandoned GitHub repositories." />
</svelte:head>

<div class="explore-page">
	<header class="explore-header">
		<span class="explore-icon">🗺️</span>
		<h1>Explore the Graveyards</h1>
		<p class="explore-subtitle">Browse public dashboards and see what others have abandoned.</p>
	</header>

	{#if data.listings.length === 0}
		<div class="empty-state">
			<span class="empty-icon">🦗</span>
			<h2>No public graveyards yet</h2>
			<p>Check back later — someone will share their shame soon enough.</p>
		</div>
	{:else}
		<div class="explore-controls">
			<span class="result-count">{data.listings.length} graveyard{data.listings.length !== 1 ? 's' : ''} to explore</span>
		</div>

		<div class="listings-grid">
			{#each data.listings as listing}
				<a href="/public/{listing.slug}" class="listing-card">
					<div class="listing-top">
						<div class="listing-identity">
							{#if listing.image}
								<img src={listing.image} alt={listing.name} class="listing-avatar" />
							{:else}
								<div class="listing-avatar placeholder">?</div>
							{/if}
							<span class="listing-name">{listing.name}</span>
						</div>
					</div>

					<div class="listing-stats">
						<span class="stat">{listing.totalRepos} repo{listing.totalRepos !== 1 ? 's' : ''}</span>
						<span class="stat-sep">&middot;</span>
						<span class="stat abandoned">{listing.abandonedCount} abandoned</span>
						{#if listing.totalRepos > 0}
							<span class="stat-sep">&middot;</span>
							<span class="stat">{Math.round((listing.abandonedCount / listing.totalRepos) * 100)}% neglect rate</span>
						{/if}
					</div>

					<div class="listing-footer">
						<span class="view-link">View Graveyard &rarr;</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.explore-page {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.explore-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--color-border);
	}

	.explore-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 0.75rem;
	}

	.explore-header h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.explore-subtitle {
		color: var(--color-text-secondary);
		font-size: 1.05rem;
		margin: 0;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
	.empty-state h2 { margin-bottom: 0.5rem; }

	.explore-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.result-count {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.listings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.listing-card {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
		border-left: 3px solid var(--color-accent-purple);
		transition: border-color 0.2s;
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.listing-card:hover {
		border-color: var(--color-accent-purple);
		text-decoration: none;
	}

	.listing-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.listing-identity {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.listing-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 2px solid var(--color-border);
	}

	.listing-avatar.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		color: var(--color-text-muted);
		font-size: 1.1rem;
		font-weight: 600;
	}

	.listing-name {
		font-weight: 700;
		font-size: 1rem;
		color: var(--color-text-primary);
	}

	.listing-stats {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.stat {
		font-size: 0.825rem;
		color: var(--color-text-secondary);
	}

	.stat.abandoned {
		color: var(--color-accent-red);
		font-weight: 600;
	}

	.stat-sep {
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}

	.listing-footer {
		border-top: 1px solid var(--color-border-light);
		padding-top: 0.75rem;
	}

	.view-link {
		font-size: 0.825rem;
		font-weight: 600;
		color: var(--color-accent-purple);
	}

	.listing-card:hover .view-link {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.listings-grid { grid-template-columns: 1fr; }
	}
</style>
