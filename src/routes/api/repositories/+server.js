import { error, json } from '@sveltejs/kit';
import { getCurrentSession } from '$lib/auth/session.js';
import { getUserByUsername } from '$lib/database/users.js';
import { getUserRepositories, getAbandonedRepositories } from '$lib/database/repositories.js';
import { getUserConfig } from '$lib/database/userConfig.js';
import { errorLog } from '$lib/utils/env.js';

/**
 * Gets repositories for the authenticated user
 */
export async function GET({ url }) {
	try {
		// Check authentication
		const session = await getCurrentSession();
		if (!session || !session.username) {
			throw error(401, 'Authentication required');
		}

		// Get user from database
		const user = await getUserByUsername(session.username);
		if (!user) {
			throw error(404, 'User not found');
		}

		// Get user configuration
		const config = await getUserConfig(user.id);

		// Get query parameters
		const type = url.searchParams.get('type') || 'all'; // 'all', 'abandoned', 'active'

		let repositories;
		
		switch (type) {
			case 'abandoned':
				repositories = await getAbandonedRepositories(user.id, config.abandonment_threshold_months);
				break;
			case 'active':
				const allRepos = await getUserRepositories(user.id);
				const abandonedRepos = await getAbandonedRepositories(user.id, config.abandonment_threshold_months);
				const abandonedIds = new Set(abandonedRepos.map(r => r.id));
				repositories = allRepos.filter(r => !abandonedIds.has(r.id));
				break;
			default:
				repositories = await getUserRepositories(user.id);
		}

		return json({
			repositories,
			config: {
				abandonment_threshold_months: config.abandonment_threshold_months,
				dashboard_public: config.dashboard_public,
				dashboard_slug: config.dashboard_slug
			},
			stats: {
				total: repositories.length
			}
		});

	} catch (err) {
		errorLog('Error fetching repositories', err);
		throw error(500, err.message || 'Failed to fetch repositories');
	}
}