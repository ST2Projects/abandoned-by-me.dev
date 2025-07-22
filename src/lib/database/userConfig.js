import { db, userConfigs } from './drizzle.js';
import { eq, sql } from 'drizzle-orm';
import { debugLog, errorLog } from '../utils/env.js';

/**
 * @typedef {Object} UserConfig
 * @property {string} id
 * @property {string} user_id
 * @property {number} abandonment_threshold_months
 * @property {boolean} dashboard_public
 * @property {string|null} dashboard_slug
 * @property {boolean} scan_private_repos
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Gets user configuration, creating default if none exists
 * @param {string} userId - User ID
 * @returns {Promise<UserConfig>} User configuration
 */
export async function getUserConfig(userId) {
	try {
		const result = await db
			.select()
			.from(userConfigs)
			.where(eq(userConfigs.userId, userId))
			.limit(1);

		if (result.length === 0) {
			// No config exists, create default
			return await createDefaultUserConfig(userId);
		}

		return result[0];
	} catch (error) {
		errorLog('Error fetching user config', error);
		throw error;
	}
}

/**
 * Creates default user configuration
 * @param {string} userId - User ID
 * @returns {Promise<UserConfig>} Created configuration
 */
async function createDefaultUserConfig(userId) {
	try {
		const [result] = await db
			.insert(userConfigs)
			.values({
				userId,
				abandonmentThresholdMonths: 6,
				dashboardPublic: false,
				dashboardSlug: null,
				scanPrivateRepos: false
			})
			.returning();
		
		debugLog(`Created default config for user ${userId}`);
		return result;
	} catch (error) {
		errorLog('Error creating default user config', error);
		throw error;
	}
}

/**
 * Updates user configuration
 * @param {string} userId - User ID
 * @param {Partial<UserConfig>} updates - Configuration updates
 * @returns {Promise<UserConfig>} Updated configuration
 */
export async function updateUserConfig(userId, updates) {
	try {
		const [result] = await db
			.update(userConfigs)
			.set({
				...updates,
				updatedAt: sql`NOW()`
			})
			.where(eq(userConfigs.userId, userId))
			.returning();
		
		debugLog(`Updated config for user ${userId}`, updates);
		return result;
	} catch (error) {
		errorLog('Error updating user config', error);
		throw error;
	}
}

/**
 * Generates a unique dashboard slug for a user
 * @param {string} username - GitHub username
 * @returns {Promise<string>} Unique dashboard slug
 */
export async function generateDashboardSlug(username) {
	const baseSlug = `${username}-repos`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
	let slug = baseSlug;
	let counter = 1;

	while (true) {
		const result = await db
			.select({ id: userConfigs.id })
			.from(userConfigs)
			.where(eq(userConfigs.dashboardSlug, slug))
			.limit(1);

		if (result.length === 0) {
			return slug;
		}

		slug = `${baseSlug}-${counter}`;
		counter++;
	}
}

/**
 * Enables public dashboard for a user
 * @param {string} userId - User ID
 * @param {string} username - GitHub username for slug generation
 * @returns {Promise<UserConfig>} Updated configuration with dashboard slug
 */
export async function enablePublicDashboard(userId, username) {
	try {
		const slug = await generateDashboardSlug(username);
		
		const [result] = await db
			.update(userConfigs)
			.set({
				dashboardPublic: true,
				dashboardSlug: slug,
				updatedAt: sql`NOW()`
			})
			.where(eq(userConfigs.userId, userId))
			.returning();
		
		debugLog(`Enabled public dashboard for user ${userId} with slug ${slug}`);
		return result;
	} catch (error) {
		errorLog('Error enabling public dashboard', error);
		throw error;
	}
}

/**
 * Disables public dashboard for a user
 * @param {string} userId - User ID
 * @returns {Promise<UserConfig>} Updated configuration
 */
export async function disablePublicDashboard(userId) {
	try {
		const [result] = await db
			.update(userConfigs)
			.set({
				dashboardPublic: false,
				dashboardSlug: null,
				updatedAt: sql`NOW()`
			})
			.where(eq(userConfigs.userId, userId))
			.returning();
		
		debugLog(`Disabled public dashboard for user ${userId}`);
		return result;
	} catch (error) {
		errorLog('Error disabling public dashboard', error);
		throw error;
	}
}