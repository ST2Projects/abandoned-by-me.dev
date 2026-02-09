import { error, json } from "@sveltejs/kit";
import { auth } from "$lib/auth/auth.js";
import {
  getUserConfig,
  updateUserConfig,
  enablePublicDashboard,
  disablePublicDashboard,
} from "$lib/database/userConfig.js";
import { errorLog, appLog } from "$lib/utils/env.js";
import { configLimiter } from "$lib/utils/rateLimit.js";

/**
 * Gets user configuration
 */
export async function GET({ request }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw error(401, "Authentication required");
    }

    const config = await getUserConfig(session.user.id);
    return json(config);
  } catch (err) {
    if (err.status) throw err;
    errorLog("Error fetching user config", err);
    throw error(500, "Failed to fetch configuration");
  }
}

/**
 * Updates user configuration
 */
export async function POST({ request }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw error(401, "Authentication required");
    }

    // Validate session has not expired
    if (
      session.session?.expiresAt &&
      new Date(session.session.expiresAt) < new Date()
    ) {
      throw error(401, "Session expired. Please sign in again.");
    }

    // Rate limit config updates per user
    const rateCheck = configLimiter.check(session.user.id);
    if (!rateCheck.allowed) {
      appLog("RATE", "Rate limited: /api/config");
      return json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfter) },
        },
      );
    }

    const userId = session.user.id;
    const username = session.user.name || session.user.email;

    // Parse request body
    const updates = await request.json();

    // Validate updates
    if (updates.abandonmentThresholdMonths !== undefined) {
      const threshold = parseInt(updates.abandonmentThresholdMonths);
      if (isNaN(threshold) || threshold < 1 || threshold > 60) {
        throw error(
          400,
          "Abandonment threshold must be between 1 and 60 months",
        );
      }
      updates.abandonmentThresholdMonths = threshold;
    }

    // Handle public dashboard toggle first (it manages its own fields)
    if (updates.dashboardPublic !== undefined) {
      appLog(
        "CONFIG",
        "Public dashboard " +
          (updates.dashboardPublic ? "enabled" : "disabled") +
          " for user " +
          userId,
      );
      if (updates.dashboardPublic) {
        await enablePublicDashboard(userId, username);
      } else {
        await disablePublicDashboard(userId);
      }
      // Remove dashboardPublic from updates so it's not applied again
      delete updates.dashboardPublic;
    }

    // Apply remaining configuration updates (e.g., abandonmentThresholdMonths, scanPrivateRepos)
    if (Object.keys(updates).length > 0) {
      await updateUserConfig(userId, updates);
    }

    // Return the latest config state
    const updatedConfig = await getUserConfig(userId);
    return json(updatedConfig);
  } catch (err) {
    if (err.status) throw err;
    errorLog("Error updating user config", err);
    throw error(500, "Failed to update configuration");
  }
}
