<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { calculateBadgeStats, getEarnedBadges, getRandomExcuse, getSarcasticMessage, getDaysSinceMessage, getUserTitle, getNextTitle, getLanguageBadges, getLanguageStats } from '$lib/utils/badges.js';

	/** @type {import('./$types').PageData} */
	export let data;

	let repositories = data.repos || [];
	let config = data.config;
	let scanInProgress = false;
	let scanId = null;
	let scanStatus = null;
	let scanError = null;
	let filter = 'all';
	let sortBy = 'lastCommit';
	let showShareModal = false;
	let enablingPublicDashboard = false;
	let shareUrlCopied = false;
	let shareError = null;
	let showScanStartedModal = false;
	let scanStartedAutoCloseTimer = null;

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('scan') === 'started') {
			showScanStartedModal = true;
			// Clean the URL parameter without reloading
			history.replaceState(null, '', '/dashboard');
			// Auto-dismiss after 10 seconds
			scanStartedAutoCloseTimer = setTimeout(() => {
				showScanStartedModal = false;
			}, 10000);
			// Also trigger scan polling
			startScan();
		}

		return () => {
			if (scanStartedAutoCloseTimer) {
				clearTimeout(scanStartedAutoCloseTimer);
			}
		};
	});

	function closeScanStartedModal() {
		showScanStartedModal = false;
		if (scanStartedAutoCloseTimer) {
			clearTimeout(scanStartedAutoCloseTimer);
			scanStartedAutoCloseTimer = null;
		}
	}

	$: thresholdMonths = config?.abandonmentThresholdMonths || 6;

	$: abandonedRepos = repositories.filter(repo => {
		if (repo.isArchived) return false;
		const thresholdDate = new Date();
		thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);
		const lastActivity = repo.lastCommitDate || repo.lastPushDate;
		if (!lastActivity) return true;
		return new Date(lastActivity) < thresholdDate;
	});

	$: activeRepos = repositories.filter(repo => !abandonedRepos.some(a => a.id === repo.id));

	$: filteredRepos = filter === 'abandoned' ? abandonedRepos
		: filter === 'active' ? activeRepos
		: repositories;

	$: sortedRepos = [...filteredRepos].sort((a, b) => {
		if (sortBy === 'lastCommit') {
			const dateA = a.lastCommitDate ? new Date(a.lastCommitDate) : new Date(0);
			const dateB = b.lastCommitDate ? new Date(b.lastCommitDate) : new Date(0);
			return dateB - dateA;
		} else if (sortBy === 'name') {
			return a.name.localeCompare(b.name);
		} else if (sortBy === 'stars') {
			return (b.starsCount || 0) - (a.starsCount || 0);
		}
		return 0;
	});

	$: abandonmentRate = repositories.length > 0
		? Math.round((abandonedRepos.length / repositories.length) * 100)
		: 0;

	$: earnedBadges = getEarnedBadges(repositories, thresholdMonths);
	$: languageBadges = getLanguageBadges(repositories, thresholdMonths);
	$: allBadges = [...earnedBadges, ...languageBadges];
	$: sarcasticMessage = getSarcasticMessage(abandonedRepos.length, repositories.length);
	$: excuse = getRandomExcuse();
	$: userTitle = getUserTitle(abandonedRepos.length);
	$: nextTitle = getNextTitle(abandonedRepos.length);
	$: langStats = getLanguageStats(repositories, thresholdMonths);

	const langColors = {
		JavaScript: '#f1e05a',
		TypeScript: '#3178c6',
		Python: '#3572A5',
		Java: '#b07219',
		Go: '#00ADD8',
		Rust: '#dea584',
		Ruby: '#701516',
		PHP: '#4F5D95',
		'C#': '#178600',
		C: '#555555',
		'C++': '#f34b7d',
		Swift: '#F05138',
		Kotlin: '#A97BFF',
		Dart: '#00B4AB',
		HTML: '#e34c26',
		CSS: '#563d7c',
		Shell: '#89e051',
		Vue: '#41b883',
		Svelte: '#ff3e00',
	};

	function getLanguageColor(language) {
		return langColors[language] || '#8b949e';
	}

	function isAbandoned(repo) {
		return abandonedRepos.some(a => a.id === repo.id);
	}

	function timeAgo(dateString) {
		if (!dateString) return 'Never';
		const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 30) return `${days}d ago`;
		if (days < 365) return `${Math.floor(days / 30)}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}

	async function startScan() {
		try {
			scanInProgress = true;
			scanError = null;

			const response = await fetch('/scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await response.json();

			if (!response.ok && response.status !== 409) {
				throw new Error(result.error || 'Failed to start scan');
			}

			scanId = result.scanId;
			pollScanStatus();
		} catch (err) {
			scanError = err.message;
			scanInProgress = false;
		}
	}

	async function pollScanStatus() {
		if (!scanId) return;

		try {
			const response = await fetch(`/scan?scanId=${scanId}`);
			if (response.ok) {
				scanStatus = await response.json();

				if (scanStatus.status === 'running') {
					setTimeout(pollScanStatus, 2000);
				} else {
					scanInProgress = false;
					if (scanStatus.status === 'completed') {
						const reposRes = await fetch('/api/repositories');
						if (reposRes.ok) {
							const reposData = await reposRes.json();
							repositories = reposData.repositories || [];
						}
						const configRes = await fetch('/api/config');
						if (configRes.ok) {
							config = await configRes.json();
						}
					}
				}
			}
		} catch (err) {
			console.error('Error polling scan status:', err);
			scanInProgress = false;
		}
	}

	function handleShareClick() {
		if (config?.dashboardPublic && config?.dashboardSlug) {
			copyShareUrl();
		} else {
			showShareModal = true;
			shareError = null;
		}
	}

	function copyShareUrl() {
		if (!config?.dashboardSlug) return;
		const url = `${window.location.origin}/public/${config.dashboardSlug}`;
		navigator.clipboard.writeText(url).then(() => {
			shareUrlCopied = true;
			setTimeout(() => { shareUrlCopied = false; }, 2000);
		});
	}

	async function enablePublicDashboard() {
		try {
			enablingPublicDashboard = true;
			shareError = null;

			const response = await fetch('/api/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dashboardPublic: true })
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to enable public dashboard');
			}

			config = await response.json();
			showShareModal = false;
		} catch (err) {
			shareError = err.message;
		} finally {
			enablingPublicDashboard = false;
		}
	}

	function getPreviewSlug() {
		const username = data.session?.user?.name || 'you';
		return `${username}-repos`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
	}

	async function toggleAdoption(repo) {
		try {
			const res = await fetch(`/api/repos/${repo.id}/adoption`, { method: 'POST' });
			if (res.ok) {
				const result = await res.json();
				repositories = repositories.map(r =>
					r.id === repo.id ? { ...r, upForAdoption: result.upForAdoption } : r
				);
			}
		} catch (err) {
			console.error('Error toggling adoption:', err);
		}
	}
</script>

<svelte:head>
	<title>Dashboard - Abandoned by Me</title>
	<meta name="description" content="Your abandoned GitHub repositories dashboard" />
</svelte:head>

<div class="dashboard">
	<header class="dash-header">
		<div class="user-welcome">
			{#if data.session?.user?.image}
				<img src={data.session.user.image} alt="" class="user-avatar" />
			{/if}
			<div>
				<h1>Your Graveyard</h1>
				{#if data.session?.user?.name}
					<p class="welcome-text">Welcome back, {data.session.user.name}</p>
				{/if}
				{#if repositories.length > 0}
					<p class="user-title">{userTitle.emoji} {userTitle.title}</p>
					{#if nextTitle}
						<p class="title-progress">{nextTitle.remaining} more abandoned repo{nextTitle.remaining !== 1 ? 's' : ''} until {nextTitle.nextTitle}</p>
					{/if}
				{/if}
			</div>
		</div>
		<div class="dash-actions">
			<button class="btn-scan" on:click={startScan} disabled={scanInProgress}>
				{#if scanInProgress}
					<span class="spinner"></span>
					Scanning...
				{:else}
					Scan Repos
				{/if}
			</button>
			<a href="/dashboard/config" class="btn-secondary-link">Settings</a>
			<button class="btn-share" on:click={handleShareClick}>
				{#if shareUrlCopied}
					Copied!
				{:else}
					Share
				{/if}
			</button>
		</div>
	</header>

	{#if scanError}
		<div class="alert alert-error">{scanError}</div>
	{/if}

	{#if scanInProgress && scanStatus}
		<div class="alert alert-info">
			Scanning... {scanStatus.reposScanned ? `${scanStatus.reposScanned} repos found` : ''}
		</div>
	{/if}

	{#if repositories.length === 0}
		<div class="empty-state">
			<span class="empty-icon">🪦</span>
			<h2>No repositories found</h2>
			<p>Hit "Scan Repos" to analyze your GitHub repositories.</p>
			<button class="btn-scan" on:click={startScan} disabled={scanInProgress}>
				{scanInProgress ? 'Scanning...' : 'Scan Repos'}
			</button>
		</div>
	{:else}
		<div class="sarcastic-banner">
			<p class="sarcastic-msg">{sarcasticMessage}</p>
			<p class="excuse-text">"{excuse}"</p>
		</div>

		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-value">{repositories.length}</span>
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
			<div class="repos-controls">
				<div class="filter-tabs">
					<button class:active={filter === 'all'} on:click={() => filter = 'all'}>
						All ({repositories.length})
					</button>
					<button class:active={filter === 'abandoned'} on:click={() => filter = 'abandoned'}>
						Abandoned ({abandonedRepos.length})
					</button>
					<button class:active={filter === 'active'} on:click={() => filter = 'active'}>
						Active ({activeRepos.length})
					</button>
				</div>
				<div class="sort-control">
					<label for="sort-select">Sort:</label>
					<select id="sort-select" bind:value={sortBy}>
						<option value="lastCommit">Last Commit</option>
						<option value="name">Name</option>
						<option value="stars">Stars</option>
					</select>
				</div>
			</div>

			<div class="repos-grid">
				{#each sortedRepos as repo (repo.id)}
					<div class="repo-card" class:abandoned={isAbandoned(repo)}>
						<div class="repo-top">
							<div class="repo-name-row">
								<a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" class="repo-name">
									{repo.name}
								</a>
								{#if repo.isFork}
									<span class="tag tag-fork">Fork</span>
								{/if}
								{#if repo.private}
									<span class="tag tag-private">Private</span>
								{/if}
								{#if repo.upForAdoption}
									<span class="tag tag-adoption">Adoption</span>
								{/if}
							</div>
							<span class="status-badge" class:dead={isAbandoned(repo)}>
								{isAbandoned(repo) ? '🪦 Abandoned' : '💚 Active'}
							</span>
						</div>

						{#if repo.description}
							<p class="repo-desc">{repo.description}</p>
						{/if}

						<div class="repo-meta">
							{#if repo.language}
								<span class="meta-item lang">
									<span class="lang-dot" style="background:{getLanguageColor(repo.language)}"></span>
									{repo.language}
								</span>
							{/if}
							{#if repo.starsCount > 0}
								<span class="meta-item">&#9733; {repo.starsCount}</span>
							{/if}
							{#if repo.forksCount > 0}
								<span class="meta-item">&#127860; {repo.forksCount}</span>
							{/if}
							{#if repo.respectsCount > 0}
								<span class="meta-item">🪦 {repo.respectsCount}</span>
							{/if}
						</div>

						<div class="repo-commit">
							<span class="commit-date">
								{#if repo.lastCommitDate}
									Last commit: {timeAgo(repo.lastCommitDate)}
								{:else}
									No commits found
								{/if}
							</span>
						</div>

						{#if isAbandoned(repo) && !repo.isFork && !repo.private}
							<div class="repo-actions">
								<button
									class="btn-adoption"
									class:adopted={repo.upForAdoption}
									on:click={() => toggleAdoption(repo)}
								>
									{repo.upForAdoption ? '🏠 Remove from Adoption' : '🏠 Put up for Adoption'}
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

{#if showShareModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="modal-backdrop" on:click={() => showShareModal = false}>
		<div class="modal" on:click|stopPropagation>
			<div class="modal-header">
				<h2>Share Your Graveyard</h2>
			</div>
			<div class="modal-body">
				<p class="modal-description">
					Your public graveyard will be visible at a unique URL. Anyone with the link can see your abandoned repos, badges, and stats.
				</p>
				<p class="modal-cta">Ready to share your shame with the world?</p>
				<div class="modal-url-preview">
					<span class="modal-url-label">Your dashboard will live at:</span>
					<code class="modal-url">/public/{getPreviewSlug()}</code>
				</div>
				<p class="modal-note">Only public repositories will be shown. Private repos stay hidden.</p>
				{#if shareError}
					<div class="alert alert-error modal-error">{shareError}</div>
				{/if}
			</div>
			<div class="modal-actions">
				<button class="btn-cancel" on:click={() => showShareModal = false}>Cancel</button>
				<button class="btn-enable" on:click={enablePublicDashboard} disabled={enablingPublicDashboard}>
					{#if enablingPublicDashboard}
						<span class="spinner"></span>
						Enabling...
					{:else}
						Enable Public Dashboard
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showScanStartedModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="modal-backdrop" on:click={closeScanStartedModal}>
		<div class="modal scan-started-modal" on:click|stopPropagation>
			<div class="modal-header">
				<h2>Scan Started</h2>
			</div>
			<div class="modal-body">
				<p class="modal-description">
					We're now scanning your private repositories. This may take a moment depending on how many repos you have. Your dashboard will update automatically when the scan completes.
				</p>
				<p class="modal-fun-text">
					Time to see what skeletons are hiding in your private repos...
				</p>
			</div>
			<div class="modal-actions">
				<button class="btn-got-it" on:click={closeScanStartedModal}>
					Got it
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dashboard {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.dash-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.user-welcome {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 2px solid var(--color-border);
	}

	.user-welcome h1 {
		font-size: 1.75rem;
		margin-bottom: 0.15rem;
	}

	.welcome-text {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.user-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-accent-orange);
		margin: 0.15rem 0 0;
	}

	.title-progress {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-style: italic;
		margin: 0.1rem 0 0;
	}

	.dash-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-scan {
		background: var(--color-accent-purple);
		color: white;
		border: none;
		padding: 0.5rem 1.25rem;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.875rem;
		transition: background 0.2s;
	}

	.btn-scan:hover:not(:disabled) { background: var(--color-accent-purple-dim); }
	.btn-scan:disabled { opacity: 0.6; cursor: not-allowed; }

	.btn-secondary-link {
		background: var(--color-bg-surface);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.875rem;
		text-decoration: none;
		transition: color 0.2s, border-color 0.2s;
	}

	.btn-secondary-link:hover {
		color: var(--color-text-primary);
		border-color: var(--color-accent-purple);
		text-decoration: none;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid transparent;
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		display: inline-block;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.alert-error {
		background: rgba(248, 81, 73, 0.1);
		color: var(--color-accent-red);
		border: 1px solid rgba(248, 81, 73, 0.3);
	}

	.alert-info {
		background: rgba(88, 166, 255, 0.1);
		color: var(--color-accent-blue);
		border: 1px solid rgba(88, 166, 255, 0.3);
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.empty-icon {
		font-size: 4rem;
		display: block;
		margin-bottom: 1rem;
	}

	.empty-state h2 { margin-bottom: 0.5rem; }
	.empty-state p { margin-bottom: 1.5rem; }

	.sarcastic-banner {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem 1.5rem;
		margin-bottom: 2rem;
		text-align: center;
	}

	.sarcastic-msg {
		color: var(--color-text-primary);
		font-size: 1.05rem;
		margin: 0 0 0.5rem;
		font-weight: 500;
	}

	.excuse-text {
		color: var(--color-text-muted);
		font-style: italic;
		font-size: 0.9rem;
		margin: 0;
	}

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

	.lang-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		display: inline-block;
	}

	.repos-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.filter-tabs {
		display: flex;
		gap: 0.25rem;
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.2rem;
	}

	.filter-tabs button {
		background: transparent;
		color: var(--color-text-secondary);
		border: none;
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.2s, background 0.2s;
	}

	.filter-tabs button:hover { color: var(--color-text-primary); }

	.filter-tabs button.active {
		background: var(--color-accent-purple);
		color: white;
	}

	.sort-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.sort-control select {
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
		transition: border-color 0.2s;
		border-left: 3px solid var(--color-accent-green);
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

	.repo-name-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
		flex-wrap: wrap;
	}

	.repo-name {
		font-weight: 700;
		color: var(--color-accent-blue);
		font-size: 0.95rem;
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.repo-name:hover { text-decoration: underline; }

	.tag {
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-weight: 600;
		flex-shrink: 0;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tag-private {
		background: rgba(210, 153, 34, 0.15);
		color: var(--color-accent-orange);
		border: 1px solid rgba(210, 153, 34, 0.3);
	}

	.tag-adoption {
		background: rgba(63, 185, 80, 0.15);
		color: var(--color-accent-green);
		border: 1px solid rgba(63, 185, 80, 0.3);
	}

	.tag-fork {
		background: rgba(139, 148, 158, 0.1);
		color: var(--color-text-muted);
		border: 1px solid rgba(139, 148, 158, 0.25);
	}

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
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.lang { color: var(--color-text-secondary); }

	.repo-commit {
		border-top: 1px solid var(--color-border-light);
		padding-top: 0.6rem;
	}

	.commit-date {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* Adoption button */
	.repo-actions {
		margin-top: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--color-border-light);
	}

	.btn-adoption {
		background: rgba(63, 185, 80, 0.1);
		color: var(--color-accent-green);
		border: 1px solid rgba(63, 185, 80, 0.3);
		padding: 0.3rem 0.65rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-adoption:hover {
		background: rgba(63, 185, 80, 0.2);
	}

	.btn-adoption.adopted {
		background: rgba(210, 153, 34, 0.1);
		color: var(--color-accent-orange);
		border-color: rgba(210, 153, 34, 0.3);
	}

	.btn-adoption.adopted:hover {
		background: rgba(210, 153, 34, 0.2);
	}

	/* Share button */
	.btn-share {
		background: var(--color-bg-surface);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
	}

	.btn-share:hover {
		color: var(--color-text-primary);
		border-color: var(--color-accent-purple);
	}

	/* Share modal */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		max-width: 480px;
		width: 100%;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		padding: 1.5rem 1.5rem 0;
	}

	.modal-header h2 {
		font-size: 1.25rem;
		margin: 0;
		color: var(--color-text-primary);
	}

	.modal-body {
		padding: 1rem 1.5rem;
	}

	.modal-description {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0 0 1rem;
	}

	.modal-cta {
		color: var(--color-accent-orange);
		font-weight: 600;
		font-size: 0.95rem;
		margin: 0 0 1rem;
		font-style: italic;
	}

	.modal-url-preview {
		background: var(--color-bg-dark, #0d1117);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.85rem 1rem;
		margin-bottom: 1rem;
	}

	.modal-url-label {
		display: block;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-bottom: 0.35rem;
		font-weight: 500;
	}

	.modal-url {
		color: var(--color-accent-blue);
		font-size: 0.875rem;
		font-family: var(--font-mono, monospace);
		word-break: break-all;
	}

	.modal-note {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0;
	}

	.modal-error {
		margin-top: 1rem;
		margin-bottom: 0;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem 1.5rem;
		border-top: 1px solid var(--color-border);
		margin-top: 1rem;
	}

	.btn-cancel {
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		padding: 0.5rem 1.25rem;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
	}

	.btn-cancel:hover {
		color: var(--color-text-primary);
		border-color: var(--color-text-secondary);
	}

	.btn-enable {
		background: var(--color-accent-purple);
		color: white;
		border: none;
		padding: 0.5rem 1.25rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		transition: background 0.2s;
	}

	.btn-enable:hover:not(:disabled) {
		background: var(--color-accent-purple-dim);
	}

	.btn-enable:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Scan started modal */
	.scan-started-modal {
		border-color: rgba(163, 113, 247, 0.4);
	}

	.scan-started-modal .modal-header h2 {
		color: var(--color-accent-purple);
	}

	.modal-fun-text {
		color: var(--color-accent-orange);
		font-weight: 600;
		font-size: 0.9rem;
		font-style: italic;
		margin: 0;
	}

	.btn-got-it {
		background: var(--color-accent-purple);
		color: white;
		border: none;
		padding: 0.5rem 1.25rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-got-it:hover {
		background: var(--color-accent-purple-dim);
	}

	@media (max-width: 768px) {
		.dash-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.stats-grid { grid-template-columns: repeat(2, 1fr); }
		.repos-grid { grid-template-columns: 1fr; }

		.repos-controls {
			flex-direction: column;
			align-items: flex-start;
		}

		.modal-actions {
			flex-direction: column;
		}

		.btn-cancel, .btn-enable {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.badges-list { grid-template-columns: 1fr; }
	}
</style>
