<script>
	import { onMount } from 'svelte';
	import { userSessionStore } from '$lib/stores/stores.js';
	
	/** @type {import('./$types').PageData} */
	export let data;

	let repositories = [];
	let config = null;
	let loading = true;
	let error = null;
	let scanInProgress = false;
	let scanId = null;
	let scanStatus = null;

	onMount(async () => {
		await loadDashboardData();
	});

	async function loadDashboardData() {
		try {
			loading = true;
			error = null;

			// Load user configuration
			const configResponse = await fetch('/api/config');
			if (configResponse.ok) {
				config = await configResponse.json();
			}

			// Load repositories
			const reposResponse = await fetch('/api/repositories');
			if (reposResponse.ok) {
				const data = await reposResponse.json();
				repositories = data.repositories || [];
			}

			// Check for running scan
			await checkScanStatus();

		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function startScan() {
		try {
			scanInProgress = true;
			error = null;

			const response = await fetch('/scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 409) {
					// Scan already in progress
					scanId = result.scanId;
					await pollScanStatus();
				} else {
					throw new Error(result.error || 'Failed to start scan');
				}
			} else {
				scanId = result.scanId;
				await pollScanStatus();
			}
		} catch (err) {
			error = err.message;
			scanInProgress = false;
		}
	}

	async function checkScanStatus() {
		if (!scanId) return;

		try {
			const response = await fetch(`/scan?scanId=${scanId}`);
			if (response.ok) {
				scanStatus = await response.json();
				
				if (scanStatus.status === 'running') {
					scanInProgress = true;
					setTimeout(checkScanStatus, 2000); // Poll every 2 seconds
				} else {
					scanInProgress = false;
					if (scanStatus.status === 'completed') {
						// Reload repositories after successful scan
						await loadDashboardData();
					}
				}
			}
		} catch (err) {
			console.error('Error checking scan status:', err);
		}
	}

	async function pollScanStatus() {
		if (!scanId) return;
		
		const poll = async () => {
			try {
				const response = await fetch(`/scan?scanId=${scanId}`);
				if (response.ok) {
					scanStatus = await response.json();
					
					if (scanStatus.status === 'running') {
						setTimeout(poll, 2000); // Continue polling
					} else {
						scanInProgress = false;
						if (scanStatus.status === 'completed') {
							await loadDashboardData(); // Reload data
						}
					}
				}
			} catch (err) {
				console.error('Error polling scan status:', err);
				scanInProgress = false;
			}
		};
		
		poll();
	}

	function formatDate(dateString) {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getAbandonedRepositories() {
		if (!repositories || !config) return [];
		
		const thresholdDate = new Date();
		thresholdDate.setMonth(thresholdDate.getMonth() - config.abandonment_threshold_months);

		return repositories.filter(repo => {
			if (repo.is_archived) return false;
			
			const lastActivity = repo.last_commit_date || repo.last_push_date;
			if (!lastActivity) return true;
			
			return new Date(lastActivity) < thresholdDate;
		});
	}

	$: abandonedRepos = getAbandonedRepositories();
	$: activeRepos = repositories.filter(repo => !abandonedRepos.some(ar => ar.id === repo.id));
</script>

<svelte:head>
	<title>Dashboard - Abandoned by Me</title>
	<meta name="description" content="Your abandoned GitHub repositories dashboard" />
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<h1>Your Repository Dashboard</h1>
		{#if data.session?.username}
			<p class="welcome">Welcome back, <strong>{data.session.username}</strong>!</p>
		{/if}
	</header>

	{#if error}
		<div class="error-message">
			<p>Error: {error}</p>
			<button on:click={loadDashboardData} class="retry-btn">Retry</button>
		</div>
	{/if}

	<div class="actions">
		<button 
			on:click={startScan} 
			disabled={scanInProgress || loading}
			class="scan-btn"
		>
			{#if scanInProgress}
				<span class="spinner"></span>
				Scanning repositories...
			{:else}
				Scan Repositories
			{/if}
		</button>

		<a href="/dashboard/config" class="config-link">
			⚙️ Settings
		</a>

		{#if config?.dashboard_public}
			<a href="/public/{config.dashboard_slug}" class="public-link" target="_blank">
				🔗 Public Dashboard
			</a>
		{/if}
	</div>

	{#if scanStatus && scanInProgress}
		<div class="scan-status">
			<p>Scan Status: <strong>{scanStatus.status}</strong></p>
			{#if scanStatus.repos_scanned}
				<p>Repositories scanned: {scanStatus.repos_scanned}</p>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading your repositories...</p>
		</div>
	{:else if repositories.length === 0}
		<div class="empty-state">
			<p>No repositories found. Try scanning your GitHub repositories first.</p>
		</div>
	{:else}
		<div class="stats">
			<div class="stat-card">
				<h3>{repositories.length}</h3>
				<p>Total Repositories</p>
			</div>
			<div class="stat-card abandoned">
				<h3>{abandonedRepos.length}</h3>
				<p>Abandoned</p>
			</div>
			<div class="stat-card active">
				<h3>{activeRepos.length}</h3>
				<p>Active</p>
			</div>
		</div>

		{#if abandonedRepos.length > 0}
			<section class="repositories-section">
				<h2>Abandoned Repositories ({abandonedRepos.length})</h2>
				<p class="section-description">
					Repositories with no commits in the last {config?.abandonment_threshold_months || 6} months.
				</p>
				
				<div class="repositories-grid">
					{#each abandonedRepos as repo}
						<div class="repo-card abandoned">
							<div class="repo-header">
								<h3>
									<a href={repo.html_url} target="_blank" rel="noopener noreferrer">
										{repo.name}
									</a>
									{#if repo.private}
										<span class="private-badge">Private</span>
									{/if}
								</h3>
								{#if repo.language}
									<span class="language">{repo.language}</span>
								{/if}
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

							<div class="repo-dates">
								<p><strong>Last commit:</strong> {formatDate(repo.last_commit_date)}</p>
								<p><strong>Last push:</strong> {formatDate(repo.last_push_date)}</p>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if activeRepos.length > 0}
			<section class="repositories-section">
				<h2>Active Repositories ({activeRepos.length})</h2>
				
				<div class="repositories-grid">
					{#each activeRepos as repo}
						<div class="repo-card active">
							<div class="repo-header">
								<h3>
									<a href={repo.html_url} target="_blank" rel="noopener noreferrer">
										{repo.name}
									</a>
									{#if repo.private}
										<span class="private-badge">Private</span>
									{/if}
								</h3>
								{#if repo.language}
									<span class="language">{repo.language}</span>
								{/if}
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

							<div class="repo-dates">
								<p><strong>Last commit:</strong> {formatDate(repo.last_commit_date)}</p>
								<p><strong>Last push:</strong> {formatDate(repo.last_push_date)}</p>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.dashboard-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.dashboard-header h1 {
		color: #1a1a1a;
		margin-bottom: 0.5rem;
	}

	.welcome {
		color: #666;
		font-size: 1.1rem;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.scan-btn {
		background: #0366d6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.scan-btn:hover:not(:disabled) {
		background: #0256cc;
	}

	.scan-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.config-link, .public-link {
		background: #f8f9fa;
		color: #24292e;
		text-decoration: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid #e1e4e8;
		font-weight: 600;
		transition: background 0.2s;
	}

	.config-link:hover, .public-link:hover {
		background: #e1e4e8;
	}

	.error-message {
		background: #ffe6e6;
		color: #d73a49;
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
		text-align: center;
	}

	.retry-btn {
		background: #d73a49;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		margin-top: 0.5rem;
		cursor: pointer;
	}

	.loading, .empty-state {
		text-align: center;
		padding: 3rem;
		color: #666;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid #f3f3f3;
		border-top: 2px solid #0366d6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		display: inline-block;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.scan-status {
		background: #e6f3ff;
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
		text-align: center;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 3rem;
	}

	.stat-card {
		background: white;
		padding: 2rem;
		border-radius: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		text-align: center;
		border-left: 4px solid #0366d6;
	}

	.stat-card.abandoned {
		border-left-color: #d73a49;
	}

	.stat-card.active {
		border-left-color: #28a745;
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
		margin-bottom: 3rem;
	}

	.repositories-section h2 {
		color: #1a1a1a;
		margin-bottom: 0.5rem;
	}

	.section-description {
		color: #666;
		margin-bottom: 1.5rem;
	}

	.repositories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.repo-card {
		background: white;
		padding: 1.5rem;
		border-radius: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border-left: 4px solid #28a745;
		transition: transform 0.2s, shadow 0.2s;
	}

	.repo-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.repo-card.abandoned {
		border-left-color: #d73a49;
	}

	.repo-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.repo-header h3 {
		margin: 0;
		flex: 1;
	}

	.repo-header a {
		color: #0366d6;
		text-decoration: none;
		font-weight: 600;
	}

	.repo-header a:hover {
		text-decoration: underline;
	}

	.private-badge {
		background: #ffeaa7;
		color: #fdcb6e;
		font-size: 0.75rem;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		font-weight: 600;
		margin-left: 0.5rem;
	}

	.language {
		background: #f8f9fa;
		color: #586069;
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid #e1e4e8;
	}

	.repo-description {
		color: #586069;
		font-size: 0.9rem;
		line-height: 1.4;
		margin-bottom: 1rem;
	}

	.repo-stats {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.stat {
		font-size: 0.875rem;
		color: #586069;
	}

	.repo-dates {
		border-top: 1px solid #e1e4e8;
		padding-top: 0.75rem;
		font-size: 0.875rem;
	}

	.repo-dates p {
		margin: 0.25rem 0;
		color: #586069;
	}

	.repo-dates strong {
		color: #24292e;
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem;
		}

		.actions {
			flex-direction: column;
			align-items: center;
		}

		.repositories-grid {
			grid-template-columns: 1fr;
		}

		.stats {
			grid-template-columns: 1fr;
		}
	}
</style>