<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;

	let config = null;
	let loading = true;
	let error = null;
	let saving = false;
	let successMessage = '';

	let abandonmentThreshold = 6;
	let dashboardPublic = false;
	let scanPrivateRepos = false;
	let autoRefresh = false;
	let dashboardSlug = '';
	let previousScanPrivateRepos = false;

	// Delete account state
	let showDeleteModal = false;
	let deleteConfirmUsername = '';
	let deleting = false;
	let deleteError = null;

	$: session = $page.data?.session;
	$: user = session?.user;
	$: username = user?.name || '';
	$: deleteConfirmed = deleteConfirmUsername === username && username !== '';

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
				abandonmentThreshold = config.abandonmentThresholdMonths;
				dashboardPublic = config.dashboardPublic;
				scanPrivateRepos = config.scanPrivateRepos;
				previousScanPrivateRepos = config.scanPrivateRepos;
				autoRefresh = config.autoRefresh || false;
				dashboardSlug = config.dashboardSlug || '';
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

			// Detect if private repos scanning was just enabled
			const privateReposJustEnabled = scanPrivateRepos && !previousScanPrivateRepos;

			const updates = {
				abandonmentThresholdMonths: abandonmentThreshold,
				scanPrivateRepos: scanPrivateRepos,
				autoRefresh: autoRefresh
			};

			if (dashboardPublic !== config.dashboardPublic) {
				updates.dashboardPublic = dashboardPublic;
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
			dashboardSlug = config.dashboardSlug || '';
			previousScanPrivateRepos = scanPrivateRepos;

			if (privateReposJustEnabled) {
				// Trigger a rescan to pick up private repositories
				await fetch('/scan', { method: 'POST' });
				// Redirect to dashboard with scan indicator
				window.location.href = '/dashboard?scan=started';
				return;
			}

			successMessage = 'Settings saved!';
			setTimeout(() => { successMessage = ''; }, 3000);
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
			successMessage = 'URL copied!';
			setTimeout(() => { successMessage = ''; }, 3000);
		});
	}

	function openDeleteModal() {
		deleteConfirmUsername = '';
		deleteError = null;
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		deleteConfirmUsername = '';
		deleteError = null;
	}

	async function deleteAccount() {
		if (!deleteConfirmed) return;

		try {
			deleting = true;
			deleteError = null;

			const response = await fetch('/api/account', {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.message || 'Failed to delete account');
			}

			// Account deleted successfully, redirect to home
			window.location.href = '/';
		} catch (err) {
			deleteError = err.message;
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Settings - Abandoned by Me</title>
	<meta name="description" content="Configure your abandoned repository dashboard" />
</svelte:head>

<div class="config-page">
	<div class="config-header">
		<a href="/dashboard" class="back-link">&larr; Back to Dashboard</a>
		<h1>Settings</h1>
		<p class="subtitle">Configure how your abandoned repositories are tracked and displayed.</p>
	</div>

	{#if error}
		<div class="alert alert-error">{error}</div>
	{/if}

	{#if successMessage}
		<div class="alert alert-success">{successMessage}</div>
	{/if}

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading settings...</p>
		</div>
	{:else}
		<form on:submit|preventDefault={saveConfig} class="config-form">
			<div class="form-section">
				<h2>Repository Analysis</h2>

				<div class="form-group">
					<label for="threshold">Abandonment Threshold</label>
					<span class="help-text">Consider repositories abandoned after this many months without commits</span>
					<div class="input-row">
						<input
							type="range"
							id="threshold-range"
							bind:value={abandonmentThreshold}
							min="1"
							max="60"
						/>
						<div class="threshold-value">
							<input
								type="number"
								id="threshold"
								bind:value={abandonmentThreshold}
								min="1"
								max="60"
								required
							/>
							<span>months</span>
						</div>
					</div>
				</div>

				<div class="form-group">
					<label class="toggle-label">
						<div class="toggle-wrapper">
							<input type="checkbox" bind:checked={scanPrivateRepos} />
							<span class="toggle-track"><span class="toggle-thumb"></span></span>
						</div>
						<div>
							<span class="toggle-text">Include private repositories</span>
							<span class="help-text">Private repos will only be visible to you</span>
						</div>
					</label>
				</div>

				<div class="form-group">
					<label class="toggle-label">
						<div class="toggle-wrapper">
							<input type="checkbox" bind:checked={autoRefresh} />
							<span class="toggle-track"><span class="toggle-thumb"></span></span>
						</div>
						<div>
							<span class="toggle-text">Auto-refresh repositories</span>
							<span class="help-text">Automatically scan your repositories periodically to keep your graveyard up to date. When disabled, you can still refresh manually from the dashboard.</span>
						</div>
					</label>
				</div>
			</div>

			<div class="form-section">
				<h2>Public Dashboard</h2>
				<p class="section-desc">
					Make your abandoned repos publicly viewable. Only public repositories will be shown.
				</p>

				<div class="form-group">
					<label class="toggle-label">
						<div class="toggle-wrapper">
							<input type="checkbox" bind:checked={dashboardPublic} />
							<span class="toggle-track"><span class="toggle-thumb"></span></span>
						</div>
						<span class="toggle-text">Enable public dashboard</span>
					</label>
				</div>

				{#if dashboardPublic && dashboardSlug}
					<div class="url-box">
						<label>Public Dashboard URL</label>
						<div class="url-row">
							<input type="text" value={getPublicDashboardUrl()} readonly class="url-input" />
							<button type="button" on:click={copyDashboardUrl} class="btn-copy">Copy</button>
						</div>
						<a href="/public/{dashboardSlug}" target="_blank" rel="noopener noreferrer" class="view-link">
							View Public Dashboard &rarr;
						</a>
					</div>
				{/if}

				{#if dashboardPublic && !dashboardSlug}
					<div class="alert alert-info">Save settings to generate your public dashboard URL.</div>
				{/if}
			</div>

			<div class="form-actions">
				<button type="submit" disabled={saving} class="btn-save">
					{#if saving}
						<span class="spinner small"></span>
						Saving...
					{:else}
						Save Settings
					{/if}
				</button>
			</div>
		</form>

		<div class="privacy-section">
			<h2>Privacy</h2>
			<ul class="privacy-list">
				<li>No analytics or tracking cookies</li>
				<li>No user behavior data collected</li>
				<li>Repository data only used for analysis</li>
				<li>You can delete your account and data at any time</li>
			</ul>
		</div>

		<div class="danger-zone">
			<h2>Danger Zone</h2>
			<div class="danger-zone-content">
				<div class="danger-zone-info">
					<h3>Delete Account</h3>
					<p>This will permanently delete your account from Abandoned by Me, including your cached repository data, scan history, badges, and public profile. This action cannot be undone.</p>
					<p class="github-safe"><strong>Your actual GitHub repositories will not be affected in any way.</strong></p>
				</div>
				<button class="btn-delete-account" on:click={openDeleteModal}>
					Delete My Account
				</button>
			</div>
		</div>
	{/if}
</div>

{#if showDeleteModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="modal-backdrop" on:click={closeDeleteModal}>
		<div class="modal delete-modal" on:click|stopPropagation>
			<div class="modal-header">
				<h2>Are you sure?</h2>
			</div>
			<div class="modal-body">
				<p class="modal-description">
					All your data on Abandoned by Me will be permanently deleted. This includes your cached repository data, scan history, badges, and public profile.
				</p>
				<p class="modal-reassurance">Your GitHub repositories and account are completely unaffected — we only remove our cached copy of your data.</p>
				<p class="modal-description">
					Type your username to confirm.
				</p>
				<div class="confirm-input-group">
					<label for="confirm-username">Type <strong>{username}</strong> to confirm:</label>
					<input
						type="text"
						id="confirm-username"
						bind:value={deleteConfirmUsername}
						placeholder={username}
						class="confirm-input"
						autocomplete="off"
					/>
				</div>
				{#if deleteError}
					<div class="alert alert-error modal-error">{deleteError}</div>
				{/if}
			</div>
			<div class="modal-actions">
				<button class="btn-cancel" on:click={closeDeleteModal}>Cancel</button>
				<button
					class="btn-delete-confirm"
					on:click={deleteAccount}
					disabled={!deleteConfirmed || deleting}
				>
					{#if deleting}
						<span class="spinner small"></span>
						Deleting...
					{:else}
						Delete Everything
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.config-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.config-header {
		margin-bottom: 2rem;
	}

	.back-link {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		display: inline-block;
		margin-bottom: 1rem;
	}

	.back-link:hover {
		color: var(--color-accent-purple);
	}

	h1 {
		font-size: 1.75rem;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: var(--color-text-secondary);
		margin: 0;
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

	.alert-success {
		background: rgba(63, 185, 80, 0.1);
		color: var(--color-accent-green);
		border: 1px solid rgba(63, 185, 80, 0.3);
	}

	.alert-info {
		background: rgba(88, 166, 255, 0.1);
		color: var(--color-accent-blue);
		border: 1px solid rgba(88, 166, 255, 0.3);
	}

	.loading {
		text-align: center;
		padding: 3rem;
		color: var(--color-text-secondary);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top: 3px solid var(--color-accent-purple);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		display: inline-block;
		margin-bottom: 1rem;
	}

	.spinner.small {
		width: 16px;
		height: 16px;
		border-width: 2px;
		margin: 0;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.config-form {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.75rem;
		margin-bottom: 1.5rem;
	}

	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--color-border);
	}

	.form-section:last-of-type {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	.form-section h2 {
		font-size: 1.15rem;
		margin-bottom: 0.5rem;
	}

	.section-desc {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		margin-bottom: 1.25rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group > label {
		display: block;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
		font-size: 0.9rem;
	}

	.help-text {
		display: block;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-top: 0.15rem;
		font-weight: 400;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 0.75rem;
	}

	input[type="range"] {
		flex: 1;
		accent-color: var(--color-accent-purple);
	}

	.threshold-value {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.threshold-value input[type="number"] {
		width: 60px;
		background: var(--color-bg-dark);
		border: 1px solid var(--color-border);
		color: var(--color-text-primary);
		padding: 0.4rem;
		border-radius: 6px;
		text-align: center;
	}

	.threshold-value span {
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}

	/* Toggle switch */
	.toggle-label {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		cursor: pointer;
		font-weight: 500;
	}

	.toggle-wrapper {
		position: relative;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.toggle-wrapper input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-track {
		display: block;
		width: 40px;
		height: 22px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: 11px;
		position: relative;
		transition: background 0.2s;
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: var(--color-text-muted);
		border-radius: 50%;
		transition: transform 0.2s, background 0.2s;
	}

	.toggle-wrapper input:checked + .toggle-track {
		background: var(--color-accent-purple);
		border-color: var(--color-accent-purple);
	}

	.toggle-wrapper input:checked + .toggle-track .toggle-thumb {
		transform: translateX(18px);
		background: white;
	}

	.toggle-text {
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}

	/* URL box */
	.url-box {
		background: var(--color-bg-dark);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 1rem;
		margin-top: 1rem;
	}

	.url-box label {
		display: block;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.url-row {
		display: flex;
		gap: 0.5rem;
	}

	.url-input {
		flex: 1;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text-primary);
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-family: var(--font-mono);
	}

	.btn-copy {
		background: var(--color-accent-purple);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-copy:hover { background: var(--color-accent-purple-dim); }

	.view-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-accent-purple);
	}

	/* Form actions */
	.form-actions {
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
		margin-top: 1.5rem;
		display: flex;
		justify-content: flex-end;
	}

	.btn-save {
		background: var(--color-accent-green);
		color: white;
		border: none;
		padding: 0.6rem 1.5rem;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
		transition: opacity 0.2s;
	}

	.btn-save:hover:not(:disabled) { opacity: 0.9; }
	.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

	/* Privacy section */
	.privacy-section {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.5rem;
	}

	.privacy-section h2 {
		font-size: 1.1rem;
		margin-bottom: 0.75rem;
	}

	.privacy-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.privacy-list li {
		padding: 0.35rem 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
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

	/* Danger Zone */
	.danger-zone {
		background: var(--color-bg-card);
		border: 2px solid rgba(248, 81, 73, 0.5);
		border-radius: 10px;
		padding: 1.5rem;
		margin-top: 1.5rem;
	}

	.danger-zone h2 {
		font-size: 1.1rem;
		margin-bottom: 1rem;
		color: var(--color-accent-red);
	}

	.danger-zone-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.danger-zone-info h3 {
		font-size: 0.95rem;
		margin-bottom: 0.35rem;
		color: var(--color-text-primary);
	}

	.danger-zone-info p {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.danger-zone-info .github-safe {
		margin-top: 0.5rem;
		color: var(--color-accent-green);
		font-size: 0.85rem;
	}

	.btn-delete-account {
		background: transparent;
		color: var(--color-accent-red);
		border: 1px solid var(--color-accent-red);
		padding: 0.5rem 1.25rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		transition: background 0.2s, color 0.2s;
	}

	.btn-delete-account:hover {
		background: var(--color-accent-red);
		color: white;
	}

	/* Delete confirmation modal */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		padding: 1rem;
	}

	.modal {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		width: 100%;
		max-width: 460px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.delete-modal {
		border-color: rgba(248, 81, 73, 0.4);
	}

	.modal-header {
		padding: 1.5rem 1.5rem 0;
	}

	.modal-header h2 {
		font-size: 1.25rem;
		margin: 0;
		color: var(--color-accent-red);
	}

	.modal-body {
		padding: 1rem 1.5rem;
	}

	.modal-description {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0 0 1.25rem;
	}

	.modal-reassurance {
		background: rgba(63, 185, 80, 0.1);
		border: 1px solid rgba(63, 185, 80, 0.3);
		color: var(--color-accent-green);
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.5;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin: 0 0 1.25rem;
	}

	.confirm-input-group {
		margin-bottom: 0.5rem;
	}

	.confirm-input-group label {
		display: block;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.5rem;
	}

	.confirm-input {
		width: 100%;
		background: var(--color-bg-dark);
		border: 1px solid var(--color-border);
		color: var(--color-text-primary);
		padding: 0.6rem 0.75rem;
		border-radius: 6px;
		font-size: 0.9rem;
		box-sizing: border-box;
	}

	.confirm-input:focus {
		outline: none;
		border-color: var(--color-accent-red);
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
	}

	.btn-cancel {
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: color 0.2s, border-color 0.2s;
	}

	.btn-cancel:hover {
		color: var(--color-text-primary);
		border-color: var(--color-text-secondary);
	}

	.btn-delete-confirm {
		background: var(--color-accent-red);
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
		transition: opacity 0.2s;
	}

	.btn-delete-confirm:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-delete-confirm:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.url-row { flex-direction: column; }
		.btn-copy { width: 100%; }

		.danger-zone-content {
			flex-direction: column;
			align-items: flex-start;
		}

		.btn-delete-account {
			width: 100%;
			text-align: center;
		}

		.modal-actions {
			flex-direction: column;
		}

		.btn-cancel,
		.btn-delete-confirm {
			width: 100%;
			justify-content: center;
		}
	}
</style>
