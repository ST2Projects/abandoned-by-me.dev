<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCurrentSession } from '$lib/auth/session.js';

	onMount(async () => {
		// Check if user is already authenticated
		const session = await getCurrentSession();
		if (session && session.username) {
			goto('/dashboard');
		} else {
			goto('/login');
		}
	});
</script>

<svelte:head>
	<title>Abandoned by Me - Track Your Forgotten GitHub Repositories</title>
	<meta name="description" content="Discover which GitHub repositories have been abandoned and create shareable dashboards. Privacy-focused, no tracking." />
</svelte:head>

<div class="loading-container">
	<div class="spinner"></div>
	<p>Loading...</p>
</div>

<style>
	.loading-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top: 3px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	p {
		font-size: 1.1rem;
		opacity: 0.9;
	}
</style>