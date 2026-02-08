<script>
	import { calculateBadgeStats, getEarnedBadges, getSarcasticMessage, getUserTitle, getNextTitle, getLanguageBadges, getLanguageStats } from '$lib/utils/badges.js';

	/** @type {import('./$types').PageData} */
	export let data;

	const langColors = {
		JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
		Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516',
		PHP: '#4F5D95', 'C#': '#178600', C: '#555555', 'C++': '#f34b7d',
		Swift: '#F05138', Kotlin: '#A97BFF', HTML: '#e34c26', CSS: '#563d7c',
		Shell: '#89e051', Vue: '#41b883', Svelte: '#ff3e00',
	};

	function getLanguageColor(lang) { return langColors[lang] || '#8b949e'; }

	function timeAgo(dateString) {
		if (!dateString) return 'Never';
		const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 30) return `${days}d ago`;
		if (days < 365) return `${Math.floor(days / 30)}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}

	// Track respects counts locally so we can update after POST
	let respectsCounts = {};
	let respectedRepos = {};

	$: publicRepos = data.repositories.filter(repo => !repo.private);
	$: thresholdMonths = data.config?.abandonmentThresholdMonths || 6;

	$: abandonedRepos = publicRepos.filter(repo => {
		if (repo.isArchived) return false;
		const thresholdDate = new Date();
		thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);
		const lastActivity = repo.lastCommitDate || repo.lastPushDate;
		if (!lastActivity) return true;
		return new Date(lastActivity) < thresholdDate;
	});

	$: activeRepos = publicRepos.filter(repo => !abandonedRepos.some(a => a.id === repo.id));
	$: earnedBadges = getEarnedBadges(publicRepos, thresholdMonths);
	$: languageBadges = getLanguageBadges(publicRepos, thresholdMonths);
	$: allBadges = [...earnedBadges, ...languageBadges];
	$: sarcasticMessage = getSarcasticMessage(abandonedRepos.length, publicRepos.length);
	$: abandonmentRate = publicRepos.length > 0
		? Math.round((abandonedRepos.length / publicRepos.length) * 100)
		: 0;
	$: userTitle = getUserTitle(abandonedRepos.length);
	$: nextTitle = getNextTitle(abandonedRepos.length);
	$: langStats = getLanguageStats(publicRepos, thresholdMonths);

	function isAbandoned(repo) {
		return abandonedRepos.some(a => a.id === repo.id);
	}

	function getRespectsCount(repo) {
		return respectsCounts[repo.id] ?? repo.respectsCount ?? 0;
	}

	async function payRespects(repo) {
		if (respectedRepos[repo.id]) return;
		try {
			const res = await fetch(`/api/repos/${repo.id}/respect`, { method: 'POST' });
			if (res.ok) {
				const result = await res.json();
				respectsCounts[repo.id] = result.respectsCount;
				respectedRepos[repo.id] = true;
			} else if (res.status === 429) {
				respectedRepos[repo.id] = true;
			}
		} catch {}
	}
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
</svelte:head>

<div class="public-profile">
	<header class="profile-header">
		<div class="profile-info">
			{#if data.user?.image}
				<img src={data.user.image} alt="" class="profile-avatar" />
			{/if}
			<div>
				<h1>
					<a href="https://github.com/{data.slug}" target="_blank" rel="noopener noreferrer">
						{data.slug}
					</a>'s Graveyard
				</h1>
				<p class="profile-title">{userTitle.emoji} {userTitle.title}</p>
				<p class="profile-subtitle">{sarcasticMessage}</p>
				{#if nextTitle}
					<p class="title-progress">{nextTitle.remaining} more abandoned repo{nextTitle.remaining !== 1 ? 's' : ''} until {nextTitle.nextTitle}</p>
				{/if}
			</div>
		</div>
	</header>

	{#if publicRepos.length === 0}
		<div class="empty-state">
			<span class="empty-icon">🎉</span>
			<h2>No Abandoned Repos!</h2>
			<p>{data.slug} is actively maintaining all their public repositories. Suspicious.</p>
		</div>
	{:else}
		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-value">{publicRepos.length}</span>
				<span class="stat-label">Total Repos</span>
			</div>
			<div class="stat-card stat-abandoned">
				<span class="stat-value">{abandonedRepos.length}</span>
				<span class="stat-label">Abandoned</span>
			</div>
			<div class="stat-card stat-active">
				<span class="stat-value">{activeRepos.length}</span>
				<span class="stat-label">Active</span>
			</div>
			<div class="stat-card stat-rate">
				<span class="stat-value">{abandonmentRate}%</span>
				<span class="stat-label">Abandon Rate</span>
			</div>
		</div>

		{#if allBadges.length > 0}
			<section class="badges-section">
				<h2>Badges of Dishonor ({allBadges.length})</h2>
				<div class="badges-list">
					{#each earnedBadges as badge}
						<div class="badge-item">
							<span class="b-icon">{badge.icon}</span>
							<div class="b-info">
								<span class="b-name">{badge.name}</span>
								<span class="b-desc">{badge.description}</span>
							</div>
						</div>
					{/each}
					{#each languageBadges as badge}
						<div class="badge-item badge-lang">
							<span class="b-icon">{badge.emoji}</span>
							<div class="b-info">
								<span class="b-name">{badge.name}</span>
								<span class="b-desc">{badge.description}</span>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if langStats.stats.length > 0}
			<section class="lang-stats-section">
				<h2>Language Graveyard</h2>
				{#if langStats.mostAbandoned}
					<p class="lang-summary">
						Most abandoned language: <strong>{langStats.mostAbandoned}</strong>
						({langStats.stats.find(s => s.language === langStats.mostAbandoned)?.abandonedCount} repos).
						{#if langStats.safest && langStats.safest !== langStats.mostAbandoned}
							Safest language: <strong>{langStats.safest}</strong>
							({langStats.stats.find(s => s.language === langStats.safest)?.abandonedCount} abandoned).
						{/if}
					</p>
				{/if}
				<div class="lang-bars">
					{#each langStats.stats.filter(s => s.abandonedCount > 0) as stat}
						<div class="lang-bar-row">
							<span class="lang-bar-label">
								<span class="lang-dot" style="background:{getLanguageColor(stat.language)}"></span>
								{stat.language}
							</span>
							<div class="lang-bar-track">
								<div
									class="lang-bar-fill"
									style="width:{Math.max(8, stat.percentage)}%; background:{getLanguageColor(stat.language)}"
								></div>
							</div>
							<span class="lang-bar-count">{stat.abandonedCount}/{stat.totalCount}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<section class="repos-section">
			<h2>Repositories ({publicRepos.length})</h2>
			<div class="repos-grid">
				{#each publicRepos as repo}
					<div class="repo-card" class:abandoned={isAbandoned(repo)}>
						<div class="repo-top">
							<a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" class="repo-name">
								{repo.name}
							</a>
							<span class="status-badge" class:dead={isAbandoned(repo)}>
								{isAbandoned(repo) ? '🪦 Abandoned' : '💚 Active'}
							</span>
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
						</div>

						<div class="repo-commit">
							{#if repo.lastCommitDate}
								Last commit: {timeAgo(repo.lastCommitDate)}
							{:else}
								No commits found
							{/if}
						</div>

						{#if isAbandoned(repo)}
							<div class="repo-respects">
								<button
									class="btn-respect"
									class:respected={respectedRepos[repo.id]}
									on:click={() => payRespects(repo)}
									disabled={respectedRepos[repo.id]}
								>
									🪦 {respectedRepos[repo.id] ? 'Respected' : 'Pay Respects'}
								</button>
								{#if getRespectsCount(repo) > 0}
									<span class="respect-count">
										{getRespectsCount(repo)} developer{getRespectsCount(repo) !== 1 ? 's' : ''} paid respects
									</span>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<div class="cta-banner">
		<p>Powered by <a href="/">abandoned<span class="accent">by.me</span></a></p>
		<p class="cta-sub">Show off your own abandoned projects</p>
	</div>
</div>

<style>
	.public-profile {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.profile-header {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--color-border);
	}

	.profile-info {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.profile-avatar {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		border: 3px solid var(--color-border);
	}

	.profile-header h1 {
		font-size: 1.75rem;
		margin-bottom: 0.25rem;
	}

	.profile-header h1 a {
		color: var(--color-accent-purple);
		text-decoration: none;
	}

	.profile-header h1 a:hover { text-decoration: underline; }

	.profile-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-accent-orange);
		margin: 0 0 0.25rem;
	}

	.profile-subtitle {
		color: var(--color-text-secondary);
		font-size: 0.95rem;
		margin: 0;
	}

	.title-progress {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		font-style: italic;
		margin: 0.25rem 0 0;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
	.empty-state h2 { margin-bottom: 0.5rem; }

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 2rem;
		font-weight: 800;
		color: var(--color-text-primary);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-abandoned .stat-value { color: var(--color-accent-red); }
	.stat-active .stat-value { color: var(--color-accent-green); }
	.stat-rate .stat-value { color: var(--color-accent-orange); }

	.badges-section { margin-bottom: 2rem; }

	.badges-section h2 {
		font-size: 1.25rem;
		margin-bottom: 1rem;
	}

	.badges-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}

	.badge-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.85rem 1rem;
	}

	.badge-lang {
		border-color: rgba(210, 153, 34, 0.3);
	}

	.b-icon { font-size: 1.5rem; flex-shrink: 0; }

	.b-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.b-name {
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--color-text-primary);
	}

	.b-desc {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		line-height: 1.3;
	}

	/* Language Stats */
	.lang-stats-section {
		margin-bottom: 2rem;
	}

	.lang-stats-section h2 {
		font-size: 1.25rem;
		margin-bottom: 0.75rem;
	}

	.lang-summary {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		margin-bottom: 1rem;
	}

	.lang-summary strong {
		color: var(--color-text-primary);
	}

	.lang-bars {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.lang-bar-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.lang-bar-label {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		min-width: 100px;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.lang-bar-track {
		flex: 1;
		height: 8px;
		background: var(--color-bg-surface);
		border-radius: 4px;
		overflow: hidden;
	}

	.lang-bar-fill {
		height: 100%;
		border-radius: 4px;
		opacity: 0.8;
		transition: width 0.3s ease;
	}

	.lang-bar-count {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		min-width: 40px;
		text-align: right;
	}

	.repos-section h2 {
		font-size: 1.25rem;
		margin-bottom: 1rem;
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
		border-left: 3px solid var(--color-accent-green);
		transition: border-color 0.2s;
	}

	.repo-card:hover {
		border-color: var(--color-accent-purple);
		border-left-color: var(--color-accent-purple);
	}

	.repo-card.abandoned { border-left-color: var(--color-accent-red); }
	.repo-card.abandoned:hover { border-left-color: var(--color-accent-purple); }

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

	.status-badge {
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		color: var(--color-accent-green);
		flex-shrink: 0;
	}

	.status-badge.dead { color: var(--color-text-muted); }

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

	.repo-commit {
		border-top: 1px solid var(--color-border-light);
		padding-top: 0.6rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* Respects */
	.repo-respects {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--color-border-light);
		flex-wrap: wrap;
	}

	.btn-respect {
		background: rgba(139, 92, 246, 0.1);
		color: var(--color-accent-purple);
		border: 1px solid rgba(139, 92, 246, 0.3);
		padding: 0.3rem 0.65rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
		flex-shrink: 0;
	}

	.btn-respect:hover:not(:disabled) {
		background: rgba(139, 92, 246, 0.2);
	}

	.btn-respect.respected {
		opacity: 0.6;
		cursor: default;
	}

	.respect-count {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.cta-banner {
		margin-top: 3rem;
		padding: 1.5rem;
		text-align: center;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.cta-banner p:first-child {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		margin: 0 0 0.25rem;
	}

	.cta-banner a {
		color: var(--color-text-primary);
		font-weight: 700;
		text-decoration: none;
	}

	.cta-banner a:hover { text-decoration: underline; }

	.accent { color: var(--color-accent-purple); }

	.cta-sub {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		margin: 0;
	}

	@media (max-width: 768px) {
		.profile-info { flex-direction: column; text-align: center; }
		.stats-grid { grid-template-columns: repeat(2, 1fr); }
		.repos-grid { grid-template-columns: 1fr; }
		.badges-list { grid-template-columns: 1fr; }
	}
</style>
