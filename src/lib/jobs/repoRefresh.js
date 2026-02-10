import { db, sqlite } from "../database/drizzle.js";
import { sql } from "drizzle-orm";
import { getGitHubToken } from "../database/accounts.js";
import { getUserConfig } from "../database/userConfig.js";
import {
  startScan,
  completeScan,
  failScan,
  getLatestScan,
} from "../database/scanHistory.js";
import {
  upsertRepositories,
  cleanupRemovedRepositories,
} from "../database/repositories.js";
import { performRepositoryScan } from "../github/analyzer.js";
import { debugLog, errorLog, appLog } from "../utils/env.js";

/** @type {number} Refresh interval in milliseconds (default 24 hours) */
const REFRESH_INTERVAL_MS =
  (parseInt(process.env.REFRESH_INTERVAL_HOURS, 10) || 24) * 60 * 60 * 1000;

/** @type {number} Minimum delay between processing individual users (10 seconds) */
const MIN_DELAY_BETWEEN_USERS_MS = 10 * 1000;

/**
 * Consider a user stale at 90% of the refresh interval.
 * For a 24-hour interval this is ~21.6 hours, which avoids re-scanning users
 * who were just refreshed manually or during the previous cycle.
 * @type {number}
 */
const STALE_THRESHOLD_MS = REFRESH_INTERVAL_MS * 0.9;

/** @type {boolean} Whether the job is logically running */
let running = false;

/** @type {ReturnType<typeof setTimeout>|null} */
let timeoutId = null;

/**
 * Starts the repository refresh background job.
 *
 * Instead of scanning every user at once, it spreads users across the entire
 * refresh interval. If the interval is 24 hours and there are 100 users, one
 * user is scanned roughly every 14 minutes. This prevents GitHub API bursts and
 * distributes load evenly.
 *
 * Calling this multiple times is safe -- subsequent calls are no-ops.
 */
export function startRepoRefreshJob() {
  if (running) return;
  running = true;

  debugLog("Repository refresh job: started", {
    refreshIntervalMs: REFRESH_INTERVAL_MS,
    staleThresholdMs: STALE_THRESHOLD_MS,
    minDelayBetweenUsersMs: MIN_DELAY_BETWEEN_USERS_MS,
  });

  // Start first cycle after 60 seconds to let the app fully initialize
  timeoutId = setTimeout(() => runRefreshCycle(), 60 * 1000);
}

/**
 * Stops the repository refresh background job.
 */
export function stopRepoRefreshJob() {
  running = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  debugLog("Repository refresh job: stopped");
}

/**
 * Runs one full refresh cycle: queries all users with linked GitHub accounts,
 * then processes them one at a time with a calculated delay between each user.
 *
 * After the cycle finishes (or if there are no users), it schedules the next
 * cycle using setTimeout to avoid overlapping runs.
 */
async function runRefreshCycle() {
  if (!running) return;

  const cycleStart = Date.now();

  try {
    // Query all users with a linked GitHub account from better-auth tables.
    // Uses Drizzle's sql template tag for parameterization safety, even though
    // this query has no user input. These tables are managed by better-auth,
    // not by our Drizzle schema.
    const users = db.all(
      sql`SELECT DISTINCT u.id, u.name
          FROM "user" u
          INNER JOIN "account" a ON u.id = a."userId"
          WHERE a."providerId" = 'github'`,
    );

    appLog("JOB", "Repo refresh started");

    if (users.length === 0) {
      debugLog("Repository refresh job: no users to refresh");
      scheduleNextCycle();
      return;
    }

    // Calculate delay between users to spread them across the full interval.
    // e.g., 24 hours / 100 users = ~14.4 minutes per user.
    // Never go below MIN_DELAY_BETWEEN_USERS_MS to avoid hammering the API.
    const delayBetweenUsers = Math.max(
      MIN_DELAY_BETWEEN_USERS_MS,
      Math.floor(REFRESH_INTERVAL_MS / users.length),
    );

    debugLog(
      `Repository refresh job: ${users.length} users, ` +
        `${Math.round(delayBetweenUsers / 1000)}s between each`,
    );

    // Process users one at a time with staggered delays
    for (let i = 0; i < users.length; i++) {
      if (!running) break;

      try {
        await refreshUserRepos(users[i]);
      } catch (err) {
        errorLog(
          `Repository refresh job: failed for ${users[i].name || users[i].id}`,
          err,
        );
      }

      // Wait before next user (except after the last one)
      if (i < users.length - 1 && running) {
        await sleep(delayBetweenUsers);
      }
    }

    appLog(
      "JOB",
      "Repo refresh completed (" +
        users.length +
        " users, " +
        (Date.now() - cycleStart) +
        "ms)",
    );
    debugLog("Repository refresh job: cycle complete");
  } catch (err) {
    errorLog("Repository refresh job: cycle failed", err);
  }

  // Schedule the next cycle
  scheduleNextCycle();
}

/**
 * Schedules the next refresh cycle via setTimeout.
 * Using setTimeout (instead of setInterval) prevents overlapping cycles when a
 * cycle takes longer than the interval.
 */
function scheduleNextCycle() {
  if (running) {
    timeoutId = setTimeout(() => runRefreshCycle(), REFRESH_INTERVAL_MS);
  }
}

/**
 * Refreshes repository data for a single user.
 * Skips the user if they were scanned recently (within STALE_THRESHOLD_MS).
 *
 * @param {{ id: string, name: string }} user - User record
 */
async function refreshUserRepos(user) {
  // Check if user has auto-refresh enabled
  const config = await getUserConfig(user.id);
  if (!config?.autoRefresh) {
    debugLog(
      `Repository refresh job: skipping ${user.name} (auto-refresh disabled)`,
    );
    return;
  }

  // Check last scan time — skip if scanned recently
  const latestScan = await getLatestScan(user.id);
  if (latestScan && latestScan.scanStartedAt) {
    const lastScanTime =
      latestScan.scanStartedAt instanceof Date
        ? latestScan.scanStartedAt.getTime()
        : new Date(latestScan.scanStartedAt).getTime();
    if (Date.now() - lastScanTime < STALE_THRESHOLD_MS) {
      debugLog(
        `Repository refresh job: skipping ${user.name} (recently scanned)`,
      );
      return;
    }
  }

  // Get the GitHub access token (synchronous — uses raw sqlite)
  const accessToken = getGitHubToken(user.id);
  if (!accessToken) {
    debugLog(`Repository refresh job: skipping ${user.name} (no token)`);
    return;
  }

  // Reuse config from the auto-refresh check above for scanPrivateRepos preference
  const includePrivate = config?.scanPrivateRepos || false;

  appLog("JOB", "Refreshing repos for user " + user.id);
  debugLog(`Repository refresh job: scanning ${user.name}`);

  // Start a scan record
  const scan = await startScan(user.id);

  try {
    // Perform the same scan as the manual /scan endpoint:
    // performRepositoryScan(accessToken, username, includePrivate)
    const repositories = await performRepositoryScan(
      accessToken,
      user.name,
      includePrivate,
    );

    if (repositories.length === 0) {
      await completeScan(scan.id, {
        reposScanned: 0,
        reposAdded: 0,
        reposUpdated: 0,
      });
      debugLog(`Repository refresh job: ${user.name} done — 0 repos found`);
      return;
    }

    // Get current GitHub IDs for cleanup
    const currentGithubIds = repositories.map((repo) => repo.github_id);

    // Upsert repositories to database
    const upsertedRepos = await upsertRepositories(user.id, repositories);

    // Clean up repositories that no longer exist on GitHub
    const deletedCount = await cleanupRemovedRepositories(
      user.id,
      currentGithubIds,
    );

    // Complete the scan
    await completeScan(scan.id, {
      reposScanned: repositories.length,
      reposAdded: upsertedRepos.length,
      reposUpdated: upsertedRepos.length,
    });

    debugLog(`Repository refresh job: ${user.name} done`, {
      scanned: repositories.length,
      upserted: upsertedRepos.length,
      deleted: deletedCount,
    });
  } catch (err) {
    await failScan(scan.id, err);
    throw err;
  }
}

/**
 * Promise-based delay helper
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
