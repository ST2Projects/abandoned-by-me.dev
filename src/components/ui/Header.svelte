<script>
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth/auth-client.js';
	let menuOpen = false;

	$: session = $page.data?.session;
	$: user = session?.user;

	async function handleLogout() {
		await authClient.signOut();
		window.location.href = '/';
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<header>
	<div class="header-inner">
		<a href="/" class="logo" on:click={closeMenu}>
			<span class="logo-icon">🪦</span>
			<span class="logo-text">abandoned<span class="logo-accent">by.me</span></span>
		</a>

		<button class="menu-toggle" on:click={toggleMenu} aria-label="Toggle menu">
			<span class="hamburger" class:open={menuOpen}>
				<span></span>
				<span></span>
				<span></span>
			</span>
		</button>

		<nav class:open={menuOpen}>
			<a href="/" class:active={$page.url.pathname === '/'} on:click={closeMenu}>Home</a>
			<a href="/about" class:active={$page.url.pathname === '/about'} on:click={closeMenu}>About</a>
			<a href="/adopt" class:active={$page.url.pathname === '/adopt'} on:click={closeMenu}>Adopt</a>
			<a href="/explore" class:active={$page.url.pathname === '/explore'} on:click={closeMenu}>Explore</a>
			{#if user}
				<a href="/dashboard" class:active={$page.url.pathname.startsWith('/dashboard')} on:click={closeMenu}>Dashboard</a>
				<a href="/dashboard/config" class:active={$page.url.pathname === '/dashboard/config'} on:click={closeMenu}>Settings</a>
			{/if}

			<div class="nav-auth">
				{#if user}
					<div class="user-info">
						{#if user.image}
							<img src={user.image} alt={user.name} class="avatar" />
						{/if}
						<span class="username">{user.name}</span>
					</div>
					<button class="btn-logout" on:click={handleLogout}>Logout</button>
				{:else}
					<a href="/login" class="btn-login" on:click={closeMenu}>Sign in</a>
				{/if}
			</div>
		</nav>
	</div>
</header>

<style>
	header {
		background: var(--color-bg-card);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-inner {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 0 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 60px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--color-text-primary);
		font-weight: 700;
		font-size: 1.15rem;
	}

	.logo:hover {
		text-decoration: none;
		color: var(--color-text-primary);
	}

	.logo-icon {
		font-size: 1.4rem;
	}

	.logo-accent {
		color: var(--color-accent-purple);
	}

	nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	nav a {
		color: var(--color-text-secondary);
		text-decoration: none;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		transition: color 0.2s, background 0.2s;
	}

	nav a:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-surface);
		text-decoration: none;
	}

	nav a.active {
		color: var(--color-accent-purple);
		background: rgba(139, 92, 246, 0.1);
	}

	.nav-auth {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-left: 1rem;
		padding-left: 1rem;
		border-left: 1px solid var(--color-border);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--color-border);
	}

	.username {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.btn-login {
		background: var(--color-accent-purple);
		color: white !important;
		padding: 0.4rem 1rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.875rem;
		transition: background 0.2s;
	}

	.btn-login:hover {
		background: var(--color-accent-purple-dim);
		text-decoration: none;
		color: white !important;
	}

	.btn-logout {
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 500;
		transition: color 0.2s, border-color 0.2s;
	}

	.btn-logout:hover {
		color: var(--color-accent-red);
		border-color: var(--color-accent-red);
	}

	.menu-toggle {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
	}

	.hamburger {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 20px;
	}

	.hamburger span {
		display: block;
		height: 2px;
		background: var(--color-text-secondary);
		border-radius: 2px;
		transition: transform 0.3s, opacity 0.3s;
	}

	.hamburger.open span:nth-child(1) {
		transform: translateY(6px) rotate(45deg);
	}

	.hamburger.open span:nth-child(2) {
		opacity: 0;
	}

	.hamburger.open span:nth-child(3) {
		transform: translateY(-6px) rotate(-45deg);
	}

	@media (max-width: 768px) {
		.menu-toggle {
			display: block;
		}

		nav {
			display: none;
			position: absolute;
			top: 60px;
			left: 0;
			right: 0;
			background: var(--color-bg-card);
			border-bottom: 1px solid var(--color-border);
			flex-direction: column;
			padding: 1rem;
			gap: 0.25rem;
		}

		nav.open {
			display: flex;
		}

		nav a {
			width: 100%;
			padding: 0.75rem;
		}

		.nav-auth {
			margin-left: 0;
			padding-left: 0;
			border-left: none;
			padding-top: 0.75rem;
			margin-top: 0.5rem;
			border-top: 1px solid var(--color-border);
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
