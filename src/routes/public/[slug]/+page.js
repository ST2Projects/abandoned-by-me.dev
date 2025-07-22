import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const { slug } = params;

	try {
		const response = await fetch(`/api/public/${slug}`);
		
		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, 'Dashboard not found or not public');
			}
			throw error(500, 'Failed to load dashboard');
		}

		const data = await response.json();
		
		return {
			slug,
			repositories: data.repositories,
			config: data.config,
			user: data.user,
			meta: {
				title: `${data.user.username}'s Abandoned Repositories`,
				description: `Public dashboard showing ${data.user.username}'s abandoned GitHub repositories`
			}
		};

	} catch (err) {
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to load dashboard');
	}
}