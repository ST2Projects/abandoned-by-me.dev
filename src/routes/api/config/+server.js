import { error, json } from '@sveltejs/kit';
import { getCurrentSession } from '$lib/auth/session.js';
import { getUserByUsername } from '$lib/database/users.js';
import { getUserConfig, updateUserConfig, enablePublicDashboard, disablePublicDashboard } from '$lib/database/userConfig.js';
import { errorLog } from '$lib/utils/env.js';

/**
 * Gets user configuration
 */
export async function GET() {
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

		return json(config);

	} catch (err) {
		errorLog('Error fetching user config', err);
		throw error(500, err.message || 'Failed to fetch configuration');
	}
}

/**
 * Updates user configuration
 */
export async function POST({ request }) {
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

		// Parse request body
		const updates = await request.json();

		// Validate updates
		if (updates.abandonment_threshold_months !== undefined) {
			const threshold = parseInt(updates.abandonment_threshold_months);
			if (isNaN(threshold) || threshold < 1 || threshold > 60) {
				throw error(400, 'Abandonment threshold must be between 1 and 60 months');
			}
			updates.abandonment_threshold_months = threshold;
		}

		// Handle public dashboard toggle
		if (updates.dashboard_public !== undefined) {
			if (updates.dashboard_public) {
				const config = await enablePublicDashboard(user.id, session.username);
				return json(config);
			} else {
				const config = await disablePublicDashboard(user.id);
				return json(config);
			}
		}

		// Update configuration
		const updatedConfig = await updateUserConfig(user.id, updates);

		return json(updatedConfig);

	} catch (err) {
		errorLog('Error updating user config', err);
		throw error(500, err.message || 'Failed to update configuration');
	}
}