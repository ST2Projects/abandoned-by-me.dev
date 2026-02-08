<script>
	/** @type {import('./$types').PageData} */
	export let data;

	let selectedLanguage = '';

	const langColors = {
		JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
		Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516',
		PHP: '#4F5D95', 'C#': '#178600', C: '#555555', 'C++': '#f34b7d',
		Swift: '#F05138', Kotlin: '#A97BFF', HTML: '#e34c26', CSS: '#563d7c',
		Shell: '#89e051', Vue: '#41b883', Svelte: '#ff3e00',
	};

	function getLanguageColor(lang) { return langColors[lang] || '#8b949e'; }

	function timeAgo(dateString) {
		if (!dateString) return 'Forever';
		const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 30) return `${days}d ago`;
		if (days < 365) return `${Math.floor(days / 30)}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}

	$: filteredRepos = selectedLanguage
		? data.repos.filter(r => r.language === selectedLanguage)
		: data.repos;
</script>

<svelte:head>
	<title>Repo Adoption Agency - Abandoned by Me</title>
	<meta name="description" content="These abandoned repos need a loving home. Will you adopt one?" />
</svelte:head>

<div class="adopt-page">
	<header class="adopt-header">
		<span class="adopt-icon">🏠</span>
		<h1>Repo Adoption Agency</h1>
		<p class="adopt-subtitle">These repos need a loving home. Will you adopt one?</p>
	</header>

	{#if data.repos.length === 0}
		<div class="empty-state">
			<span class="empty-icon">🦗</span>
			<h2>No repos up for adoption yet</h2>
			<p>Check back later — someone's bound to give up on something soon.</p>
		</div>
	{:else}
		<div class="adopt-controls">
			<span class="result-count">{filteredRepos.length} repo{filteredRepos.length !== 1 ? 's' : ''} looking for a home</span>
			{#if data.languages.length > 1}
				<div class="filter-control">
					<label for="lang-filter">Language:</label>
					<select id="lang-filter" bind:value={selectedLanguage}>
						<option value="">All</option>
						{#each data.languages as lang}
							<option value={lang}>{lang}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<div class="repos-grid">
			{#each filteredRepos as repo}
				<div class="repo-card">
					<div class="repo-top">
						<a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" class="repo-name">
							{repo.name}
						</a>
						<span class="adoption-tag">Up for Adoption</span>
					</div>

					{#if repo.description}
						<p class="repo-desc">{repo.description}</p>
					{/if}

					<div class="repo-meta">
						{#if repo.language}
							<span class="meta-item">
								<span class="lang-dot" style="background:{getLanguageColor(repo.language)}"></span>
								{repo.language}
							</span>
						{/if}
						{#if repo.starsCount > 0}
							<span class="meta-item">&#9733; {repo.starsCount}</span>
						{/if}
						<span class="meta-item">Abandoned {timeAgo(repo.lastCommitDate || repo.lastPushDate)}</span>
					</div>

					<div class="repo-footer">
						{#if repo.dashboardSlug}
							<a href="/public/{repo.dashboardSlug}" class="owner-link">View owner's graveyard</a>
						{/if}
						<a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" class="btn-adopt">
							Fork & Adopt
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.adopt-page {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.adopt-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--color-border);
	}

	.adopt-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 0.75rem;
	}

	.adopt-header h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.adopt-subtitle {
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

	.adopt-controls {
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

	.filter-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.filter-control select {
		background: var(--color-bg-card);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
		padding: 0.35rem 0.6rem;
		border-radius: 6px;
		font-size: 0.825rem;
	}

	.repos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 1rem;
	}

	.repo-card {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
		border-left: 3px solid var(--color-accent-orange);
		transition: border-color 0.2s;
	}

	.repo-card:hover {
		border-color: var(--color-accent-purple);
		border-left-color: var(--color-accent-purple);
	}

	.repo-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
		gap: 0.5rem;
	}

	.repo-name {
		font-weight: 700;
		color: var(--color-accent-blue);
		font-size: 0.95rem;
		text-decoration: none;
	}

	.repo-name:hover { text-decoration: underline; }

	.adoption-tag {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-accent-orange);
		background: rgba(210, 153, 34, 0.15);
		border: 1px solid rgba(210, 153, 34, 0.3);
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.repo-desc {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
		margin-bottom: 0.75rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.repo-meta {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
	}

	.meta-item {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.lang-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		display: inline-block;
	}

	.repo-footer {
		border-top: 1px solid var(--color-border-light);
		padding-top: 0.75rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.owner-link {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.owner-link:hover {
		color: var(--color-accent-purple);
	}

	.btn-adopt {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-accent-green);
		background: rgba(63, 185, 80, 0.1);
		border: 1px solid rgba(63, 185, 80, 0.3);
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		text-decoration: none;
		transition: background 0.2s;
		flex-shrink: 0;
	}

	.btn-adopt:hover {
		background: rgba(63, 185, 80, 0.2);
		text-decoration: none;
		color: var(--color-accent-green);
	}

	@media (max-width: 768px) {
		.repos-grid { grid-template-columns: 1fr; }
		.adopt-controls { flex-direction: column; align-items: flex-start; }
	}
</style>
