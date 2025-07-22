<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	let config = null;
	let loading = true;
	let error = null;
	let saving = false;
	let successMessage = '';

	// Form data
	let abandonmentThreshold = 6;
	let dashboardPublic = false;
	let scanPrivateRepos = false;
	let dashboardSlug = '';

	onMount(async () => {
		await loadConfig();
	});

	async function loadConfig() {
		try {
			loading = true;
			error = null;

			const response = await fetch('/api/config');
			if (response.ok) {
				config = await response.json();
				abandonmentThreshold = config.abandonment_threshold_months;
				dashboardPublic = config.dashboard_public;
				scanPrivateRepos = config.scan_private_repos;
				dashboardSlug = config.dashboard_slug || '';
			} else {
				throw new Error('Failed to load configuration');
			}
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function saveConfig() {
		try {
			saving = true;
			error = null;
			successMessage = '';

			const updates = {
				abandonment_threshold_months: abandonmentThreshold,
				scan_private_repos: scanPrivateRepos
			};

			// Handle dashboard public toggle separately if changed
			if (dashboardPublic !== config.dashboard_public) {
				updates.dashboard_public = dashboardPublic;
			}

			const response = await fetch('/api/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to save configuration');
			}

			config = await response.json();
			dashboardSlug = config.dashboard_slug || '';
			successMessage = 'Configuration saved successfully!';

			// Clear success message after 3 seconds
			setTimeout(() => {
				successMessage = '';
			}, 3000);

		} catch (err) {
			error = err.message;
		} finally {
			saving = false;
		}
	}

	function getPublicDashboardUrl() {
		if (!dashboardSlug) return '';
		return `${window.location.origin}/public/${dashboardSlug}`;
	}

	function copyDashboardUrl() {
		const url = getPublicDashboardUrl();
		navigator.clipboard.writeText(url).then(() => {
			successMessage = 'Dashboard URL copied to clipboard!';
			setTimeout(() => {
				successMessage = '';
			}, 3000);
		});
	}
</script>

<svelte:head>
	<title>Settings - Abandoned by Me</title>
	<meta name="description" content="Configure your abandoned repository dashboard" />
</svelte:head>

<div class="config-page">
	<div class="config-header">
		<a href="/dashboard" class="back-link">← Back to Dashboard</a>
		<h1>Dashboard Settings</h1>
		<p class="subtitle">Configure how your abandoned repositories are tracked and displayed.</p>
	</div>

	{#if error}
		<div class="error-message">
			<p>Error: {error}</p>
		</div>
	{/if}

	{#if successMessage}
		<div class="success-message">
			<p>{successMessage}</p>
		</div>
	{/if}

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading configuration...</p>
		</div>
	{:else}
		<form on:submit|preventDefault={saveConfig} class="config-form">
			<div class="form-section">
				<h2>Repository Analysis</h2>
				
				<div class="form-group">
					<label for="threshold">
						Abandonment Threshold
						<span class="help-text">Consider repositories abandoned after this many months without commits</span>
					</label>
					<div class="input-group">
						<input 
							type="number" 
							id="threshold"
							bind:value={abandonmentThreshold}
							min="1" 
							max="60" 
							required
						/>
						<span class="input-suffix">months</span>
					</div>
				</div>

				<div class="form-group">
					<label class="checkbox-label">
						<input 
							type="checkbox" 
							bind:checked={scanPrivateRepos}
						/>
						<span class="checkmark"></span>
						Include private repositories in scans
						<span class="help-text">Private repositories will only be visible to you</span>
					</label>
				</div>
			</div>

			<div class="form-section">
				<h2>Public Dashboard</h2>
				<p class="section-description">
					Make your abandoned repositories dashboard publicly viewable. 
					Only public repositories will be shown on the public dashboard.
				</p>
				
				<div class="form-group">
					<label class="checkbox-label">
						<input 
							type="checkbox" 
							bind:checked={dashboardPublic}
						/>
						<span class="checkmark"></span>
						Enable public dashboard
					</label>
				</div>

				{#if dashboardPublic && dashboardSlug}
					<div class="public-dashboard-info">
						<div class="dashboard-url-group">
							<label>Public Dashboard URL:</label>
							<div class="url-display">
								<input 
									type="text" 
									value={getPublicDashboardUrl()} 
									readonly 
									class="url-input"
								/>
								<button type="button" on:click={copyDashboardUrl} class="copy-btn">
									Copy
								</button>
							</div>
						</div>
						
						<div class="public-dashboard-actions">
							<a 
								href="/public/{dashboardSlug}" 
								target="_blank" 
								rel="noopener noreferrer"
								class="view-public-btn"
							>
								View Public Dashboard →
							</a>
						</div>
					</div>
				{/if}

				{#if dashboardPublic && !dashboardSlug}
					<div class="info-message">
						<p>Save your settings to generate a public dashboard URL.</p>
					</div>
				{/if}
			</div>

			<div class="form-actions">
				<button type="submit" disabled={saving} class="save-btn">
					{#if saving}
						<span class="spinner small"></span>
						Saving...
					{:else}
						Save Settings
					{/if}
				</button>
			</div>
		</form>

		<div class="danger-zone">
			<h2>Privacy & Data</h2>
			<div class="privacy-info">
				<p><strong>Your privacy matters:</strong></p>
				<ul>
					<li>No analytics or tracking cookies are used</li>
					<li>No user behavior data is collected</li>
					<li>Repository data is only used for analysis and display</li>
					<li>You can delete your account and data at any time</li>
				</ul>
			</div>
		</div>
	{/if}
</div>

<style>
	.config-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.config-header {
		margin-bottom: 3rem;
	}

	.back-link {
		color: #0366d6;
		text-decoration: none;
		font-weight: 500;
		display: inline-block;
		margin-bottom: 1rem;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.config-header h1 {
		color: #1a1a1a;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
		font-size: 1.1rem;
	}

	.error-message {
		background: #ffe6e6;
		color: #d73a49;
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
	}

	.success-message {
		background: #e6ffed;
		color: #28a745;
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
	}

	.info-message {
		background: #e6f3ff;
		color: #0366d6;
		padding: 1rem;
		border-radius: 0.5rem;
		margin-top: 1rem;
	}

	.loading {
		text-align: center;
		padding: 3rem;
		color: #666;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #f3f3f3;
		border-top: 3px solid #0366d6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		display: inline-block;
		margin-bottom: 1rem;
	}

	.spinner.small {
		width: 20px;
		height: 20px;
		border-width: 2px;
		margin: 0;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.config-form {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e1e4e8;
	}

	.form-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	.form-section h2 {
		color: #1a1a1a;
		margin-bottom: 0.5rem;
	}

	.section-description {
		color: #666;
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #24292e;
	}

	.help-text {
		display: block;
		font-weight: 400;
		font-size: 0.9rem;
		color: #666;
		margin-top: 0.25rem;
	}

	.input-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.input-group input {
		flex: 0 0 auto;
		width: 100px;
	}

	.input-suffix {
		color: #666;
		font-weight: 500;
	}

	input[type="number"], .url-input {
		padding: 0.75rem;
		border: 1px solid #e1e4e8;
		border-radius: 0.5rem;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	input[type="number"]:focus, .url-input:focus {
		outline: none;
		border-color: #0366d6;
		box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		cursor: pointer;
		font-weight: 500;
	}

	.checkbox-label input[type="checkbox"] {
		display: none;
	}

	.checkmark {
		width: 20px;
		height: 20px;
		border: 2px solid #e1e4e8;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		transition: all 0.2s;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.checkbox-label input[type="checkbox"]:checked + .checkmark {
		background: #0366d6;
		border-color: #0366d6;
	}

	.checkbox-label input[type="checkbox"]:checked + .checkmark::after {
		content: '✓';
		color: white;
		font-size: 14px;
		font-weight: bold;
	}

	.public-dashboard-info {
		margin-top: 1.5rem;
		padding: 1.5rem;
		background: #f8f9fa;
		border-radius: 0.5rem;
		border: 1px solid #e1e4e8;
	}

	.dashboard-url-group {
		margin-bottom: 1rem;
	}

	.dashboard-url-group label {
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.url-display {
		display: flex;
		gap: 0.5rem;
	}

	.url-input {
		flex: 1;
		background: white;
	}

	.copy-btn {
		background: #0366d6;
		color: white;
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.copy-btn:hover {
		background: #0256cc;
	}

	.view-public-btn {
		color: #0366d6;
		text-decoration: none;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.view-public-btn:hover {
		text-decoration: underline;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 1.5rem;
		border-top: 1px solid #e1e4e8;
		margin-top: 2rem;
	}

	.save-btn {
		background: #28a745;
		color: white;
		border: none;
		padding: 0.75rem 2rem;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.save-btn:hover:not(:disabled) {
		background: #218838;
	}

	.save-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.danger-zone {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		border-left: 4px solid #28a745;
	}

	.danger-zone h2 {
		color: #1a1a1a;
		margin-bottom: 1rem;
	}

	.privacy-info p {
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.privacy-info ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.privacy-info li {
		padding: 0.25rem 0;
		color: #666;
	}

	.privacy-info li::before {
		content: '✓';
		color: #28a745;
		font-weight: bold;
		margin-right: 0.5rem;
	}

	@media (max-width: 768px) {
		.config-page {
			padding: 1rem;
		}

		.config-form {
			padding: 1.5rem;
		}

		.url-display {
			flex-direction: column;
		}

		.copy-btn {
			width: 100%;
		}
	}
</style>