<script>
	/** @type {import('./$types').PageData} */
	export let data;

	function formatDate(dateString) {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getDaysSince(dateString) {
		if (!dateString) return null;
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now - date);
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}

	function formatDaysSince(dateString) {
		const days = getDaysSince(dateString);
		if (!days) return '';
		
		if (days < 30) {
			return `${days} days ago`;
		} else if (days < 365) {
			const months = Math.floor(days / 30);
			return `${months} month${months > 1 ? 's' : ''} ago`;
		} else {
			const years = Math.floor(days / 365);
			return `${years} year${years > 1 ? 's' : ''} ago`;
		}
	}

	$: publicRepositories = data.repositories.filter(repo => !repo.private);
	$: totalStats = {
		total: publicRepositories.length,
		withCommits: publicRepositories.filter(r => r.last_commit_date).length,
		withoutCommits: publicRepositories.filter(r => !r.last_commit_date).length
	};
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta name="description" content={data.meta.description} />
	<meta property="og:title" content={data.meta.title} />
	<meta property="og:description" content={data.meta.description} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.meta.title} />
	<meta name="twitter:description" content={data.meta.description} />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="public-dashboard">
	<header class="dashboard-header">
		<div class="header-content">
			<h1>
				<a href="https://github.com/{data.user.username}" target="_blank" rel="noopener noreferrer" class="username-link">
					{data.user.username}
				</a>'s Abandoned Repositories
			</h1>
			<p class="subtitle">
				Public repositories abandoned for more than {data.config.abandonment_threshold_months} months
			</p>
			<div class="branding">
				<a href="/" class="brand-link">Powered by abandoned-by-me.dev</a>
			</div>
		</div>
	</header>

	{#if publicRepositories.length === 0}
		<div class="empty-state">
			<div class="empty-content">
				<h2>🎉 No Abandoned Repositories!</h2>
				<p>{data.user.username} is actively maintaining all their public repositories.</p>
				<p class="hint">Check back later or adjust the abandonment threshold.</p>
			</div>
		</div>
	{:else}
		<div class="stats">
			<div class="stat-card">
				<h3>{totalStats.total}</h3>
				<p>Abandoned Repositories</p>
			</div>
			<div class="stat-card">
				<h3>{totalStats.withCommits}</h3>
				<p>With Known Last Commit</p>
			</div>
			{#if totalStats.withoutCommits > 0}
				<div class="stat-card">
					<h3>{totalStats.withoutCommits}</h3>
					<p>Never Committed To</p>
				</div>
			{/if}
		</div>

		<div class="repositories-section">
			<div class="section-header">
				<h2>Abandoned Repositories</h2>
				<p class="repository-count">{publicRepositories.length} repositories</p>
			</div>
			
			<div class="repositories-grid">
				{#each publicRepositories as repo}
					<div class="repo-card">
						<div class="repo-header">
							<h3>
								<a href={repo.html_url} target="_blank" rel="noopener noreferrer" class="repo-link">
									{repo.name}
								</a>
							</h3>
							<div class="repo-meta">
								{#if repo.language}
									<span class="language">{repo.language}</span>
								{/if}
								{#if repo.is_fork}
									<span class="fork-badge">Fork</span>
								{/if}
							</div>
						</div>

						{#if repo.description}
							<p class="repo-description">{repo.description}</p>
						{/if}

						<div class="repo-stats">
							<span class="stat">⭐ {repo.stars_count}</span>
							<span class="stat">🍴 {repo.forks_count}</span>
							{#if repo.open_issues_count > 0}
								<span class="stat">⚠️ {repo.open_issues_count} issues</span>
							{/if}
						</div>

						<div class="repo-activity">
							{#if repo.last_commit_date}
								<div class="activity-item">
									<strong>Last commit:</strong>
									<span class="date">
										{formatDate(repo.last_commit_date)}
										<span class="relative-date">({formatDaysSince(repo.last_commit_date)})</span>
									</span>
								</div>
							{:else}
								<div class="activity-item no-commits">
									<strong>Last commit:</strong>
									<span class="no-data">No commits found</span>
								</div>
							{/if}

							{#if repo.last_push_date && repo.last_push_date !== repo.last_commit_date}
								<div class="activity-item">
									<strong>Last push:</strong>
									<span class="date">
										{formatDate(repo.last_push_date)}
										<span class="relative-date">({formatDaysSince(repo.last_push_date)})</span>
									</span>
								</div>
							{/if}
						</div>

						<div class="repo-footer">
							<a href={repo.html_url} target="_blank" rel="noopener noreferrer" class="view-repo">
								View on GitHub →
							</a>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<footer class="dashboard-footer">
		<div class="footer-content">
			<p class="footer-info">
				This dashboard shows public repositories that haven't been committed to in {data.config.abandonment_threshold_months} months or more.
				Data is updated when the repository owner runs a scan.
			</p>
			<div class="footer-links">
				<a href="/" class="footer-link">Create your own dashboard</a>
				<span class="separator">•</span>
				<a href="https://github.com" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.public-dashboard {
		min-height: 100vh;
		background: #f8f9fa;
	}

	.dashboard-header {
		background: white;
		border-bottom: 1px solid #e1e4e8;
		padding: 3rem 0;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		text-align: center;
	}

	.dashboard-header h1 {
		color: #1a1a1a;
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.username-link {
		color: #0366d6;
		text-decoration: none;
	}

	.username-link:hover {
		text-decoration: underline;
	}

	.subtitle {
		color: #666;
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	.branding {
		margin-top: 2rem;
	}

	.brand-link {
		color: #0366d6;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
	}

	.brand-link:hover {
		text-decoration: underline;
	}

	.empty-state {
		max-width: 600px;
		margin: 4rem auto;
		padding: 0 2rem;
		text-align: center;
	}

	.empty-content {
		background: white;
		padding: 3rem;
		border-radius: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.empty-content h2 {
		color: #28a745;
		margin-bottom: 1rem;
		font-size: 2rem;
	}

	.empty-content p {
		color: #666;
		line-height: 1.6;
		margin-bottom: 0.5rem;
	}

	.empty-content .hint {
		font-size: 0.9rem;
		font-style: italic;
	}

	.stats {
		max-width: 1200px;
		margin: 3rem auto 0;
		padding: 0 2rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.stat-card {
		background: white;
		padding: 2rem;
		border-radius: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		text-align: center;
		border-left: 4px solid #d73a49;
	}

	.stat-card h3 {
		font-size: 2.5rem;
		margin: 0;
		color: #1a1a1a;
	}

	.stat-card p {
		margin: 0.5rem 0 0 0;
		color: #666;
		font-weight: 600;
	}

	.repositories-section {
		max-width: 1200px;
		margin: 4rem auto;
		padding: 0 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.section-header h2 {
		color: #1a1a1a;
		margin: 0;
	}

	.repository-count {
		color: #666;
		margin: 0;
		font-weight: 500;
	}

	.repositories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		gap: 1.5rem;
	}

	.repo-card {
		background: white;
		padding: 1.5rem;
		border-radius: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border-left: 4px solid #d73a49;
		transition: transform 0.2s, shadow 0.2s;
	}

	.repo-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.repo-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		gap: 1rem;
	}

	.repo-header h3 {
		margin: 0;
		flex: 1;
		min-width: 0;
	}

	.repo-link {
		color: #0366d6;
		text-decoration: none;
		font-weight: 600;
		word-break: break-word;
	}

	.repo-link:hover {
		text-decoration: underline;
	}

	.repo-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-end;
		flex-shrink: 0;
	}

	.language {
		background: #f8f9fa;
		color: #586069;
		font-size: 0.8rem;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid #e1e4e8;
		white-space: nowrap;
	}

	.fork-badge {
		background: #fff3cd;
		color: #856404;
		font-size: 0.8rem;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid #ffeaa7;
		white-space: nowrap;
	}

	.repo-description {
		color: #586069;
		font-size: 0.95rem;
		line-height: 1.4;
		margin-bottom: 1rem;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.repo-stats {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.stat {
		font-size: 0.875rem;
		color: #586069;
		white-space: nowrap;
	}

	.repo-activity {
		border-top: 1px solid #e1e4e8;
		padding-top: 1rem;
		margin-bottom: 1rem;
		space-y: 0.5rem;
	}

	.activity-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		gap: 1rem;
	}

	.activity-item:last-child {
		margin-bottom: 0;
	}

	.activity-item strong {
		color: #24292e;
		flex-shrink: 0;
	}

	.date {
		text-align: right;
		color: #586069;
	}

	.relative-date {
		display: block;
		font-size: 0.8rem;
		color: #959da5;
		margin-top: 0.1rem;
	}

	.no-commits .no-data {
		color: #d73a49;
		font-style: italic;
	}

	.repo-footer {
		border-top: 1px solid #e1e4e8;
		padding-top: 1rem;
		text-align: right;
	}

	.view-repo {
		color: #0366d6;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
	}

	.view-repo:hover {
		text-decoration: underline;
	}

	.dashboard-footer {
		background: white;
		border-top: 1px solid #e1e4e8;
		padding: 2rem 0;
		margin-top: 4rem;
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		text-align: center;
	}

	.footer-info {
		color: #666;
		font-size: 0.9rem;
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.footer-links {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.footer-link {
		color: #0366d6;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.footer-link:hover {
		text-decoration: underline;
	}

	.separator {
		color: #d1d5da;
	}

	@media (max-width: 768px) {
		.dashboard-header {
			padding: 2rem 0;
		}

		.header-content {
			padding: 0 1rem;
		}

		.dashboard-header h1 {
			font-size: 2rem;
		}

		.stats, .repositories-section {
			padding: 0 1rem;
		}

		.repositories-grid {
			grid-template-columns: 1fr;
		}

		.repo-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.repo-meta {
			flex-direction: row;
			align-items: flex-start;
		}

		.activity-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.date {
			text-align: left;
		}

		.footer-content {
			padding: 0 1rem;
		}

		.footer-links {
			flex-direction: column;
			gap: 0.5rem;
		}

		.separator {
			display: none;
		}
	}
</style>