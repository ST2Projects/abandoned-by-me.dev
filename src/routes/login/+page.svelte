<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	
	$: returnUrl = $page.url.searchParams.get('return') || '/dashboard';
	
	let token = '';
	let isLoading = false;
	let error = '';
	let showInstructions = false;
	
	const tokenInstructions = {
		steps: [
			'Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)',
			'Click "Generate new token (classic)"',
			'Give your token a descriptive name like "Abandoned by Me Dashboard"',
			'Select the following scopes:',
			'• repo (Full control of private repositories)',
			'• user (Read user profile data)',
			'Click "Generate token"',
			'Copy the token immediately (you won\'t be able to see it again)'
		],
		url: 'https://github.com/settings/tokens'
	};
	
	async function handleTokenSubmit() {
		if (!token.trim()) {
			error = 'Please enter your GitHub token';
			return;
		}
		
		isLoading = true;
		error = '';
		
		try {
			const response = await fetch('/api/auth/validate-token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ token: token.trim() }),
			});
			
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(result.error || 'Token validation failed');
			}
			
			// Redirect to dashboard or return URL
			goto(returnUrl);
		} catch (err) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}
	
	function toggleInstructions() {
		showInstructions = !showInstructions;
	}
</script>

<svelte:head>
	<title>Login - Abandoned by Me</title>
	<meta name="description" content="Login to track your abandoned GitHub repositories" />
</svelte:head>

<div class="login-page">
	<div class="login-container">
		<div class="login-header">
			<h1>Welcome to Abandoned by Me</h1>
			<p class="subtitle">
				Discover which of your GitHub repositories have been forgotten and need attention.
			</p>
		</div>

		<div class="login-card">
			<div class="login-content">
				<h2>Connect Your GitHub Account</h2>
				<p>Enter your GitHub personal access token to analyze your repositories and create a shareable dashboard.</p>
				
				<div class="token-form">
					<div class="form-group">
						<label for="token">GitHub Personal Access Token</label>
						<input
							type="password"
							id="token"
							bind:value={token}
							placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
							class="token-input"
							disabled={isLoading}
						/>
						{#if error}
							<div class="error-message">{error}</div>
						{/if}
					</div>
					
					<button
						on:click={handleTokenSubmit}
						disabled={isLoading || !token.trim()}
						class="submit-btn"
					>
						{#if isLoading}
							<div class="loading-spinner"></div>
							Validating...
						{:else}
							<svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
							</svg>
							Connect to GitHub
						{/if}
					</button>
					
					<button
						on:click={toggleInstructions}
						class="instructions-btn"
						type="button"
					>
						{showInstructions ? 'Hide' : 'Show'} instructions
					</button>
				</div>
				
				{#if showInstructions}
					<div class="instructions">
						<h3>How to create a GitHub Personal Access Token:</h3>
						<ol>
							{#each tokenInstructions.steps as step}
								<li>{step}</li>
							{/each}
						</ol>
						<a href={tokenInstructions.url} target="_blank" rel="noopener noreferrer" class="github-link">
							Open GitHub Token Settings →
						</a>
					</div>
				{/if}
				
				<div class="features">
					<div class="feature">
						<div class="feature-icon">📊</div>
						<div class="feature-text">
							<h3>Repository Analysis</h3>
							<p>Identify repositories that haven't been touched in months</p>
						</div>
					</div>
					
					<div class="feature">
						<div class="feature-icon">🔗</div>
						<div class="feature-text">
							<h3>Shareable Dashboard</h3>
							<p>Create public dashboards to showcase your active projects</p>
						</div>
					</div>
					
					<div class="feature">
						<div class="feature-icon">🔒</div>
						<div class="feature-text">
							<h3>Privacy Focused</h3>
							<p>No analytics, no tracking, your data stays yours</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="footer-info">
			<p>
				<strong>Privacy commitment:</strong> We don't use analytics, tracking pixels, or cookies. 
				Your GitHub data is only used to analyze your repositories and is never shared.
			</p>
		</div>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.login-container {
		max-width: 500px;
		width: 100%;
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
		color: white;
	}

	.login-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.subtitle {
		font-size: 1.2rem;
		opacity: 0.9;
		line-height: 1.5;
	}

	.login-card {
		background: white;
		border-radius: 1rem;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		margin-bottom: 2rem;
	}

	.login-content {
		padding: 2.5rem;
	}

	.login-content h2 {
		color: #1a1a1a;
		font-size: 1.8rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.login-content > p {
		color: #666;
		text-align: center;
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.features {
		margin-bottom: 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.feature {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.feature-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.feature-text h3 {
		color: #1a1a1a;
		font-size: 1.1rem;
		margin: 0 0 0.25rem 0;
	}

	.feature-text p {
		color: #666;
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.token-form {
		margin-bottom: 2rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		color: #1a1a1a;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.token-input {
		width: 100%;
		padding: 1rem;
		border: 2px solid #e1e5e9;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		background: #f8f9fa;
		transition: all 0.2s;
		box-sizing: border-box;
	}

	.token-input:focus {
		outline: none;
		border-color: #0366d6;
		background: white;
		box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
	}

	.token-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		color: #d73a49;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		background: #24292e;
		color: white;
		border: none;
		padding: 1rem 2rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1.1rem;
		transition: all 0.2s;
		width: 100%;
		box-sizing: border-box;
		cursor: pointer;
		margin-bottom: 1rem;
	}

	.submit-btn:hover:not(:disabled) {
		background: #1a1e22;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.instructions-btn {
		background: transparent;
		color: #0366d6;
		border: none;
		font-size: 0.9rem;
		cursor: pointer;
		text-decoration: underline;
		padding: 0.5rem 0;
		width: 100%;
	}

	.instructions-btn:hover {
		color: #0256cc;
	}

	.instructions {
		background: #f6f8fa;
		border: 1px solid #e1e5e9;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.instructions h3 {
		margin: 0 0 1rem 0;
		color: #1a1a1a;
		font-size: 1.1rem;
	}

	.instructions ol {
		margin: 0 0 1rem 0;
		padding-left: 1.5rem;
	}

	.instructions li {
		margin-bottom: 0.5rem;
		color: #666;
		line-height: 1.5;
	}

	.github-link {
		color: #0366d6;
		text-decoration: none;
		font-weight: 600;
	}

	.github-link:hover {
		text-decoration: underline;
	}

	.github-icon {
		width: 20px;
		height: 20px;
	}

	.loading-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.footer-info {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		padding: 1.5rem;
		backdrop-filter: blur(10px);
		color: white;
		text-align: center;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.footer-info strong {
		color: #fff;
	}

	@media (max-width: 768px) {
		.login-page {
			padding: 1rem;
		}

		.login-header h1 {
			font-size: 2rem;
		}

		.subtitle {
			font-size: 1rem;
		}

		.login-content {
			padding: 2rem;
		}

		.login-content h2 {
			font-size: 1.5rem;
		}

		.features {
			gap: 1rem;
		}

		.feature {
			gap: 0.75rem;
		}

		.feature-icon {
			font-size: 1.5rem;
		}
	}
</style>