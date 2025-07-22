import { error, json } from '@sveltejs/kit';
import { getPublicDashboardData } from '$lib/database/repositories.js';
import { errorLog } from '$lib/utils/env.js';

/**
 * Gets public dashboard data by slug
 */
export async function GET({ params }) {
	try {
		const { slug } = params;

		if (!slug) {
			throw error(400, 'Dashboard slug is required');
		}

		const dashboardData = await getPublicDashboardData(slug);

		if (!dashboardData) {
			throw error(404, 'Dashboard not found or not public');
		}

		// Filter to only include public repositories
		const publicRepositories = dashboardData.repositories.filter(repo => !repo.private);

		return json({
			repositories: publicRepositories,
			config: {
				abandonment_threshold_months: dashboardData.config.abandonment_threshold_months,
				dashboard_slug: dashboardData.config.dashboard_slug
			},
			user: {
				username: dashboardData.user.username
			},
			stats: {
				total: publicRepositories.length,
				lastUpdated: dashboardData.repositories.length > 0 
					? Math.max(...dashboardData.repositories.map(r => new Date(r.last_scanned_at).getTime()))
					: null
			}
		});

	} catch (err) {
		errorLog('Error fetching public dashboard', err);
		
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		
		throw error(500, 'Failed to fetch dashboard data');
	}
}