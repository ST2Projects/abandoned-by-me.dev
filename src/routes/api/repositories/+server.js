import { error, json } from "@sveltejs/kit";
import { auth } from "$lib/auth/auth.js";
import {
  getUserRepositories,
  getAbandonedRepositories,
} from "$lib/database/repositories.js";
import { getUserConfig } from "$lib/database/userConfig.js";
import { errorLog } from "$lib/utils/env.js";

/**
 * Gets repositories for the authenticated user
 */
export async function GET({ url, request }) {
  try {
    // Check authentication via better-auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw error(401, "Authentication required");
    }

    const userId = session.user.id;

    // Get user configuration
    const config = await getUserConfig(userId);

    // Get query parameters
    const type = url.searchParams.get("type") || "all"; // 'all', 'abandoned', 'active'

    let repositories;

    switch (type) {
      case "abandoned":
        repositories = await getAbandonedRepositories(
          userId,
          config.abandonmentThresholdMonths,
        );
        break;
      case "active": {
        const allRepos = await getUserRepositories(userId);
        const abandonedRepos = await getAbandonedRepositories(
          userId,
          config.abandonmentThresholdMonths,
        );
        const abandonedIds = new Set(abandonedRepos.map((r) => r.id));
        repositories = allRepos.filter((r) => !abandonedIds.has(r.id));
        break;
      }
      default:
        repositories = await getUserRepositories(userId);
    }

    return json({
      repositories,
      config: {
        abandonmentThresholdMonths: config.abandonmentThresholdMonths,
        dashboardPublic: config.dashboardPublic,
        dashboardSlug: config.dashboardSlug,
      },
      stats: {
        total: repositories.length,
      },
    });
  } catch (err) {
    if (err.status) throw err;
    errorLog("Error fetching repositories", err);
    throw error(500, err.message || "Failed to fetch repositories");
  }
}
