import { error, json } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";
import { auth } from "$lib/auth/auth.js";
import { db, scanHistory } from "$lib/database/drizzle.js";
import { getUserConfig } from "$lib/database/userConfig.js";
import {
  upsertRepositories,
  cleanupRemovedRepositories,
} from "$lib/database/repositories.js";
import {
  startScan,
  completeScan,
  failScan,
  getRunningScan,
} from "$lib/database/scanHistory.js";
import { performRepositoryScan } from "$lib/github/analyzer.js";
import { performGitLabScan } from "$lib/gitlab/analyzer.js";
import {
  getGitHubToken,
  getGitLabToken,
} from "$lib/database/accounts.js";
import { errorLog, debugLog, appLog } from "$lib/utils/env.js";
import { scanLimiter, getClientKey } from "$lib/utils/rateLimit.js";

/**
 * Initiates a repository scan for the authenticated user
 */
export async function POST(event) {
  try {
    const { request } = event;
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw error(401, "Authentication required");
    }

    // Rate limit scan requests per user
    const rateCheck = scanLimiter.check(session.user.id);
    if (!rateCheck.allowed) {
      appLog("RATE", "Rate limited: /scan " + session.user.id);
      return json(
        { error: "Too many scan requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfter) },
        },
      );
    }

    const userId = session.user.id;
    const username = session.user.name || session.user.email;

    // Check if there's already a running scan
    const runningScan = await getRunningScan(userId);
    if (runningScan) {
      return json(
        {
          error: "Scan already in progress",
          scanId: runningScan.id,
        },
        { status: 409 },
      );
    }

    // Get user configuration
    const config = await getUserConfig(userId);

    // Check which providers are linked
    const githubToken = getGitHubToken(userId);
    const gitlabToken = getGitLabToken(userId);

    if (!githubToken && !gitlabToken) {
      throw error(
        400,
        "No accounts linked. Please sign in with GitHub or GitLab.",
      );
    }

    // Start scan record (only after at least one token is confirmed valid)
    const scan = await startScan(userId);
    appLog("SCAN", "Scan started for user " + userId);
    debugLog(`Started repository scan for user ${username}`);

    // Perform the scan asynchronously (don't await)
    performScanAsync(
      scan.id,
      userId,
      username,
      config,
      githubToken,
      gitlabToken,
    );

    return json({
      success: true,
      scanId: scan.id,
      message: "Repository scan started",
    });
  } catch (err) {
    if (err.status) throw err;
    errorLog("Error starting repository scan", err);
    throw error(500, "Failed to start repository scan");
  }
}

/**
 * Gets the status of a repository scan
 */
export async function GET({ url, request }) {
  try {
    const scanId = url.searchParams.get("scanId");
    if (!scanId) {
      throw error(400, "Scan ID required");
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw error(401, "Authentication required");
    }

    const userId = session.user.id;

    // Get scan status
    const result = await db
      .select()
      .from(scanHistory)
      .where(and(eq(scanHistory.id, scanId), eq(scanHistory.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      throw error(404, "Scan not found");
    }

    return json(result[0]);
  } catch (err) {
    if (err.status) throw err;
    errorLog("Error getting scan status", err);
    throw error(500, "Failed to get scan status");
  }
}

/**
 * Performs the repository scan asynchronously across all linked providers
 */
async function performScanAsync(
  scanId,
  userId,
  username,
  config,
  githubToken,
  gitlabToken,
) {
  try {
    debugLog(`Performing async scan ${scanId} for user ${username}`);

    let totalScanned = 0;
    let totalUpserted = 0;
    let totalDeleted = 0;

    // Scan GitHub repos if linked
    if (githubToken) {
      const ghResult = await scanProvider(
        "github",
        userId,
        username,
        config,
        githubToken,
      );
      totalScanned += ghResult.scanned;
      totalUpserted += ghResult.upserted;
      totalDeleted += ghResult.deleted;
    }

    // Scan GitLab repos if linked
    if (gitlabToken) {
      const glResult = await scanProvider(
        "gitlab",
        userId,
        username,
        config,
        gitlabToken,
      );
      totalScanned += glResult.scanned;
      totalUpserted += glResult.upserted;
      totalDeleted += glResult.deleted;
    }

    // Complete the scan
    await completeScan(scanId, {
      reposScanned: totalScanned,
      reposAdded: totalUpserted,
      reposUpdated: totalUpserted,
    });

    appLog("SCAN", "Scan completed for user " + userId);
    debugLog(`Completed scan ${scanId}`, {
      scanned: totalScanned,
      upserted: totalUpserted,
      deleted: totalDeleted,
    });
  } catch (scanError) {
    errorLog(`Scan ${scanId} failed`, scanError);
    await failScan(scanId, scanError);
  }
}

/**
 * Scans a single provider's repositories
 * @param {'github'|'gitlab'} provider
 * @param {string} userId
 * @param {string} username
 * @param {any} config
 * @param {string} accessToken
 * @returns {Promise<{scanned: number, upserted: number, deleted: number}>}
 */
async function scanProvider(provider, userId, username, config, accessToken) {
  debugLog(`Scanning ${provider} repositories for ${username}`);

  let repositories;

  if (provider === "github") {
    repositories = await performRepositoryScan(
      accessToken,
      username,
      config.scanPrivateRepos,
    );
  } else {
    repositories = await performGitLabScan(
      accessToken,
      config.scanPrivateRepos,
    );
  }

  if (repositories.length === 0) {
    return { scanned: 0, upserted: 0, deleted: 0 };
  }

  // Get current external IDs for cleanup
  const currentExternalIds = repositories.map((repo) => repo.github_id);

  // Upsert repositories to database
  const upsertedRepos = await upsertRepositories(
    userId,
    repositories,
    provider,
  );

  // Clean up repositories that no longer exist on the provider
  const deletedCount = await cleanupRemovedRepositories(
    userId,
    currentExternalIds,
    provider,
  );

  return {
    scanned: repositories.length,
    upserted: upsertedRepos.length,
    deleted: deletedCount,
  };
}
