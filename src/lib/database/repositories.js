import { db, repositories, users, userConfigs } from './drizzle.js';
import { eq, and, lt, isNull, or, notInArray, desc, sql } from 'drizzle-orm';
import { debugLog, errorLog } from '../utils/env.js';

/**
 * @typedef {Object} Repository
 * @property {string} id
 * @property {string} user_id
 * @property {number} github_id
 * @property {string} name
 * @property {string} full_name
 * @property {string|null} description
 * @property {boolean} private
 * @property {string} html_url
 * @property {string|null} clone_url
 * @property {string|null} last_commit_date
 * @property {string|null} last_push_date
 * @property {boolean} is_fork
 * @property {boolean} is_archived
 * @property {string} default_branch
 * @property {string|null} language
 * @property {number} stars_count
 * @property {number} forks_count
 * @property {number} open_issues_count
 * @property {number} size_kb
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} last_scanned_at
 */

/**
 * Upserts repositories for a user
 * @param {string} userId - User ID
 * @param {Repository[]} repositoryList - Array of repository data
 * @returns {Promise<Repository[]>} Upserted repositories
 */
export async function upsertRepositories(userId, repositoryList) {
	try {
		if (repositoryList.length === 0) {
			return [];
		}

		const values = repositoryList.map(repo => ({
			userId,
			githubId: repo.github_id,
			name: repo.name,
			fullName: repo.full_name,
			description: repo.description,
			private: repo.private,
			htmlUrl: repo.html_url,
			cloneUrl: repo.clone_url,
			lastCommitDate: repo.last_commit_date ? new Date(repo.last_commit_date) : null,
			lastPushDate: repo.last_push_date ? new Date(repo.last_push_date) : null,
			isFork: repo.is_fork,
			isArchived: repo.is_archived,
			defaultBranch: repo.default_branch,
			language: repo.language,
			starsCount: repo.stars_count,
			forksCount: repo.forks_count,
			openIssuesCount: repo.open_issues_count,
			sizeKb: repo.size_kb,
			lastScannedAt: new Date()
		}));

		const result = await db
			.insert(repositories)
			.values(values)
			.onConflictDoUpdate({
				target: [repositories.userId, repositories.githubId],
				set: {
					name: sql`excluded.name`,
					fullName: sql`excluded.full_name`,
					description: sql`excluded.description`,
					private: sql`excluded.private`,
					htmlUrl: sql`excluded.html_url`,
					cloneUrl: sql`excluded.clone_url`,
					lastCommitDate: sql`excluded.last_commit_date`,
					lastPushDate: sql`excluded.last_push_date`,
					isFork: sql`excluded.is_fork`,
					isArchived: sql`excluded.is_archived`,
					defaultBranch: sql`excluded.default_branch`,
					language: sql`excluded.language`,
					starsCount: sql`excluded.stars_count`,
					forksCount: sql`excluded.forks_count`,
					openIssuesCount: sql`excluded.open_issues_count`,
					sizeKb: sql`excluded.size_kb`,
					lastScannedAt: sql`excluded.last_scanned_at`,
					updatedAt: sql`NOW()`,
				}
			})
			.returning();
		
		debugLog(`Upserted ${result.length} repositories for user ${userId}`);
		return result;
	} catch (error) {
		errorLog('Error upserting repositories', error);
		throw error;
	}
}

/**
 * Gets all repositories for a user
 * @param {string} userId - User ID
 * @returns {Promise<Repository[]>} User's repositories
 */
export async function getUserRepositories(userId) {
	try {
		const result = await db
			.select()
			.from(repositories)
			.where(eq(repositories.userId, userId))
			.orderBy(desc(repositories.lastCommitDate));

		return result;
	} catch (error) {
		errorLog('Error fetching user repositories', error);
		throw error;
	}
}

/**
 * Gets abandoned repositories for a user based on threshold
 * @param {string} userId - User ID
 * @param {number} abandonmentThresholdMonths - Months to consider abandoned
 * @returns {Promise<Repository[]>} Abandoned repositories
 */
export async function getAbandonedRepositories(userId, abandonmentThresholdMonths = 6) {
	try {
		const thresholdDate = new Date();
		thresholdDate.setMonth(thresholdDate.getMonth() - abandonmentThresholdMonths);

		const result = await db
			.select()
			.from(repositories)
			.where(
				and(
					eq(repositories.userId, userId),
					eq(repositories.isArchived, false),
					or(
						lt(repositories.lastCommitDate, thresholdDate),
						isNull(repositories.lastCommitDate)
					)
				)
			)
			.orderBy(desc(repositories.lastCommitDate));

		return result;
	} catch (error) {
		errorLog('Error fetching abandoned repositories', error);
		throw error;
	}
}

/**
 * Gets repositories by dashboard slug (for public access)
 * @param {string} dashboardSlug - Dashboard slug
 * @param {number} [abandonmentThresholdMonths] - Optional threshold override
 * @returns {Promise<{repositories: Repository[], config: any, user: any}|null>}
 */
export async function getPublicDashboardData(dashboardSlug, abandonmentThresholdMonths) {
	try {
		// First get the user config and user info
		const result = await db
			.select({
				id: userConfigs.id,
				userId: userConfigs.userId,
				abandonmentThresholdMonths: userConfigs.abandonmentThresholdMonths,
				dashboardPublic: userConfigs.dashboardPublic,
				dashboardSlug: userConfigs.dashboardSlug,
				scanPrivateRepos: userConfigs.scanPrivateRepos,
				createdAt: userConfigs.createdAt,
				updatedAt: userConfigs.updatedAt,
				username: users.username
			})
			.from(userConfigs)
			.innerJoin(users, eq(userConfigs.userId, users.id))
			.where(
				and(
					eq(userConfigs.dashboardSlug, dashboardSlug),
					eq(userConfigs.dashboardPublic, true)
				)
			)
			.limit(1);

		if (result.length === 0) {
			return null; // Not found
		}

		const configData = result[0];
		const threshold = abandonmentThresholdMonths || configData.abandonmentThresholdMonths;
		const repositoriesList = await getAbandonedRepositories(configData.userId, threshold);

		return {
			repositories: repositoriesList.filter(repo => !repo.private), // Only public repos for public dashboard
			config: configData,
			user: { id: configData.userId, username: configData.username }
		};
	} catch (error) {
		errorLog('Error fetching public dashboard data', error);
		throw error;
	}
}

/**
 * Deletes repositories that are no longer in the user's GitHub account
 * @param {string} userId - User ID
 * @param {number[]} currentGithubIds - Array of current GitHub repo IDs
 * @returns {Promise<number>} Number of repositories deleted
 */
export async function cleanupRemovedRepositories(userId, currentGithubIds) {
	try {
		if (currentGithubIds.length === 0) {
			// If no current repos, delete all repositories for this user
			const result = await db
				.delete(repositories)
				.where(eq(repositories.userId, userId))
				.returning({ id: repositories.id });
			
			const deletedCount = result.length;
			if (deletedCount > 0) {
				debugLog(`Cleaned up ${deletedCount} removed repositories for user ${userId}`);
			}
			
			return deletedCount;
		}

		// Delete repositories not in the current GitHub IDs list
		const result = await db
			.delete(repositories)
			.where(
				and(
					eq(repositories.userId, userId),
					notInArray(repositories.githubId, currentGithubIds)
				)
			)
			.returning({ id: repositories.id });
		
		const deletedCount = result.length;
		if (deletedCount > 0) {
			debugLog(`Cleaned up ${deletedCount} removed repositories for user ${userId}`);
		}
		
		return deletedCount;
	} catch (error) {
		errorLog('Error cleaning up removed repositories', error);
		throw error;
	}
}