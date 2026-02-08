import { db, repositories, userConfigs, user } from './drizzle.js';
import { eq, and, lt, isNull, or, notInArray, desc, sql, count } from 'drizzle-orm';
import { debugLog, errorLog } from '../utils/env.js';

/**
 * @typedef {Object} Repository
 * @property {string} id
 * @property {string} userId
 * @property {number} githubId
 * @property {string} name
 * @property {string} fullName
 * @property {string|null} description
 * @property {boolean} private
 * @property {string} htmlUrl
 * @property {string|null} cloneUrl
 * @property {Date|null} lastCommitDate
 * @property {Date|null} lastPushDate
 * @property {boolean} isFork
 * @property {boolean} isArchived
 * @property {string} defaultBranch
 * @property {string|null} language
 * @property {number} starsCount
 * @property {number} forksCount
 * @property {number} openIssuesCount
 * @property {number} sizeKb
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {Date} lastScannedAt
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
					updatedAt: new Date(),
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
export async function getAbandonedRepositories(userId, abandonmentThresholdMonths = 1) {
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
		const result = await db
			.select()
			.from(userConfigs)
			.where(
				and(
					eq(userConfigs.dashboardSlug, dashboardSlug),
					eq(userConfigs.dashboardPublic, true)
				)
			)
			.limit(1);

		if (result.length === 0) {
			return null;
		}

		const configData = result[0];
		const repositoriesList = await getUserRepositories(configData.userId);

		return {
			repositories: repositoriesList.filter(repo => !repo.private),
			config: configData,
			user: { id: configData.userId }
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

/**
 * Gets public directory listings for the explore page
 * @param {{ limit?: number, offset?: number }} options
 * @returns {Promise<{ listings: Array<{ slug: string, name: string, image: string|null, totalRepos: number, abandonedCount: number }>, total: number }>}
 */
export async function getPublicDirectoryListings({ limit = 50, offset = 0 } = {}) {
	try {
		const thresholdDate = new Date();
		thresholdDate.setMonth(thresholdDate.getMonth() - 6);

		const listings = await db
			.select({
				slug: userConfigs.dashboardSlug,
				name: user.name,
				image: user.image,
				totalRepos: count(repositories.id),
				abandonedCount: sql`sum(case when (${repositories.lastCommitDate} < ${thresholdDate.getTime()} or ${repositories.lastCommitDate} is null) and ${repositories.isArchived} = 0 then 1 else 0 end)`.mapWith(Number),
			})
			.from(userConfigs)
			.innerJoin(user, eq(userConfigs.userId, user.id))
			.leftJoin(repositories, and(
				eq(repositories.userId, userConfigs.userId),
				eq(repositories.private, false),
				eq(repositories.isFork, false)
			))
			.where(eq(userConfigs.dashboardPublic, true))
			.groupBy(userConfigs.userId)
			.orderBy(sql`sum(case when (${repositories.lastCommitDate} < ${thresholdDate.getTime()} or ${repositories.lastCommitDate} is null) and ${repositories.isArchived} = 0 then 1 else 0 end) desc`)
			.limit(limit)
			.offset(offset);

		// Get total count of public dashboards
		const totalResult = await db
			.select({ total: count() })
			.from(userConfigs)
			.where(eq(userConfigs.dashboardPublic, true));

		const total = totalResult[0]?.total ?? 0;

		debugLog(`Fetched ${listings.length} public directory listings`);
		return { listings, total };
	} catch (error) {
		errorLog('Error fetching public directory listings', error);
		throw error;
	}
}
