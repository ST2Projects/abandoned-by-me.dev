import { db, repositories, userConfigs } from '$lib/database/drizzle.js';
import { eq, and } from 'drizzle-orm';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	// Fetch repos marked for adoption that belong to users with public dashboards
	const results = await db
		.select({
			id: repositories.id,
			name: repositories.name,
			fullName: repositories.fullName,
			description: repositories.description,
			htmlUrl: repositories.htmlUrl,
			language: repositories.language,
			starsCount: repositories.starsCount,
			lastCommitDate: repositories.lastCommitDate,
			lastPushDate: repositories.lastPushDate,
			dashboardSlug: userConfigs.dashboardSlug,
		})
		.from(repositories)
		.innerJoin(userConfigs, eq(repositories.userId, userConfigs.userId))
		.where(
			and(
				eq(repositories.upForAdoption, true),
				eq(repositories.private, false),
				eq(repositories.isFork, false),
				eq(userConfigs.dashboardPublic, true)
			)
		);

	// Extract unique languages for filter
	const languages = [...new Set(results.map(r => r.language).filter(Boolean))].sort();

	return { repos: results, languages };
}
