import { sqlite } from "../database/drizzle.js";
import {
  getGitHubToken,
  getGitLabToken,
} from "../database/accounts.js";
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
import { performGitLabScan } from "../gitlab/analyzer.js";
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
 * user is scanned roughly every 14 minutes. This prevents API bursts and
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
 * Runs one full refresh cycle: queries all users with linked accounts,
 * then processes them one at a time with a calculated delay between each user.
 *
 * After the cycle finishes (or if there are no users), it schedules the next
 * cycle using setTimeout to avoid overlapping runs.
 */
async function runRefreshCycle() {
  if (!running) return;

  const cycleStart = Date.now();

  try {
    // Query all users with a linked account (GitHub or GitLab) from better-auth tables.
    const users = sqlite
      .prepare(
        `SELECT DISTINCT u.id, u.name
				 FROM "user" u
				 INNER JOIN "account" a ON u.id = a."userId"
				 WHERE a."providerId" IN ('github', 'gitlab')`,
      )
      .all();

    appLog("JOB", "Repo refresh started");

    if (users.length === 0) {
      debugLog("Repository refresh job: no users to refresh");
      scheduleNextCycle();
      return;
    }

    // Calculate delay between users to spread them across the full interval.
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
 * Scans a single provider for a user and upserts results.
 * @param {'github'|'gitlab'} provider
 * @param {string} userId
 * @param {string} username
 * @param {boolean} includePrivate
 * @param {string} accessToken
 * @returns {Promise<{scanned: number, upserted: number, deleted: number}>}
 */
async function refreshProvider(
  provider,
  userId,
  username,
  includePrivate,
  accessToken,
) {
  let repos;
  if (provider === "github") {
    repos = await performRepositoryScan(accessToken, username, includePrivate);
  } else {
    repos = await performGitLabScan(accessToken, includePrivate);
  }

  if (repos.length === 0) {
    return { scanned: 0, upserted: 0, deleted: 0 };
  }

  const currentIds = repos.map((r) => r.github_id);
  const upserted = await upsertRepositories(userId, repos, provider);
  const deleted = await cleanupRemovedRepositories(userId, currentIds, provider);

  return { scanned: repos.length, upserted: upserted.length, deleted };
}

/**
 * Refreshes repository data for a single user across all linked providers.
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

  // Get tokens for all linked providers
  const githubToken = getGitHubToken(user.id);
  const gitlabToken = getGitLabToken(user.id);

  if (!githubToken && !gitlabToken) {
    debugLog(`Repository refresh job: skipping ${user.name} (no token)`);
    return;
  }

  const includePrivate = config?.scanPrivateRepos || false;

  appLog("JOB", "Refreshing repos for user " + user.id);
  debugLog(`Repository refresh job: scanning ${user.name}`);

  // Start a scan record
  const scan = await startScan(user.id);

  try {
    let totalScanned = 0;
    let totalUpserted = 0;
    let totalDeleted = 0;

    if (githubToken) {
      const gh = await refreshProvider(
        "github",
        user.id,
        user.name,
        includePrivate,
        githubToken,
      );
      totalScanned += gh.scanned;
      totalUpserted += gh.upserted;
      totalDeleted += gh.deleted;
    }

    if (gitlabToken) {
      const gl = await refreshProvider(
        "gitlab",
        user.id,
        user.name,
        includePrivate,
        gitlabToken,
      );
      totalScanned += gl.scanned;
      totalUpserted += gl.upserted;
      totalDeleted += gl.deleted;
    }

    // Complete the scan
    await completeScan(scan.id, {
      reposScanned: totalScanned,
      reposAdded: totalUpserted,
      reposUpdated: totalUpserted,
    });

    debugLog(`Repository refresh job: ${user.name} done`, {
      scanned: totalScanned,
      upserted: totalUpserted,
      deleted: totalDeleted,
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
