import { error, json } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";
import { requireSession } from "$lib/utils/session.js";
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
import { getGitHubToken } from "$lib/database/accounts.js";
import { errorLog, debugLog, appLog } from "$lib/utils/env.js";
import { scanLimiter, getClientKey } from "$lib/utils/rateLimit.js";

/**
 * Initiates a repository scan for the authenticated user
 */
export async function POST(event) {
  try {
    const { request } = event;
    const session = await requireSession(request.headers);

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

    // Get the GitHub access token from the account linked via better-auth
    // Validate token BEFORE creating a scan record to avoid orphaned "running" records
    const accessToken = getGitHubToken(userId);

    if (!accessToken) {
      throw error(
        400,
        "GitHub account not linked. Please sign in with GitHub again.",
      );
    }

    // Start scan record (only after token is confirmed valid)
    const scan = await startScan(userId);
    appLog("SCAN", "Scan started for user " + userId);
    debugLog(`Started repository scan for user ${username}`);

    // Perform the scan asynchronously (don't await)
    performScanAsync(scan.id, userId, username, config, accessToken);

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

    const session = await requireSession(request.headers);
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
 * Performs the repository scan asynchronously
 */
async function performScanAsync(scanId, userId, username, config, accessToken) {
  try {
    debugLog(`Performing async scan ${scanId} for user ${username}`);

    // Perform the GitHub repository scan
    const repositories = await performRepositoryScan(
      accessToken,
      username,
      config.scanPrivateRepos,
    );

    if (repositories.length === 0) {
      await completeScan(scanId, {
        reposScanned: 0,
        reposAdded: 0,
        reposUpdated: 0,
      });
      return;
    }

    // Get current GitHub IDs for cleanup
    const currentGithubIds = repositories.map((repo) => repo.github_id);

    // Upsert repositories to database
    const upsertedRepos = await upsertRepositories(userId, repositories);

    // Clean up repositories that no longer exist on GitHub
    const deletedCount = await cleanupRemovedRepositories(
      userId,
      currentGithubIds,
    );

    // Complete the scan
    await completeScan(scanId, {
      reposScanned: repositories.length,
      reposAdded: upsertedRepos.length,
      reposUpdated: upsertedRepos.length,
    });

    appLog("SCAN", "Scan completed for user " + userId);
    debugLog(`Completed scan ${scanId}`, {
      scanned: repositories.length,
      upserted: upsertedRepos.length,
      deleted: deletedCount,
    });
  } catch (scanError) {
    errorLog(`Scan ${scanId} failed`, scanError);
    await failScan(scanId, scanError);
  }
}
