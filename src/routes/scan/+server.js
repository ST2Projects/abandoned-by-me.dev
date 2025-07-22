import { error, json } from '@sveltejs/kit';
import { getCurrentSession } from '$lib/auth/session.js';
import { getUserByUsername } from '$lib/database/users.js';
import { getUserConfig } from '$lib/database/userConfig.js';
import { upsertRepositories, cleanupRemovedRepositories } from '$lib/database/repositories.js';
import { startScan, completeScan, failScan, getRunningScan } from '$lib/database/scanHistory.js';
import { performRepositoryScan } from '$lib/github/analyzer.js';
import { errorLog, debugLog } from '$lib/utils/env.js';

/**
 * Initiates a repository scan for the authenticated user
 */
export async function POST({ request }) {
	try {
		// Check authentication
		const session = await getCurrentSession();
		if (!session || !session.username) {
			throw error(401, 'Authentication required');
		}

		// Get user from database
		const user = await getUserByUsername(session.username);
		if (!user) {
			throw error(404, 'User not found');
		}

		// Check if there's already a running scan
		const runningScan = await getRunningScan(user.id);
		if (runningScan) {
			return json({ 
				error: 'Scan already in progress',
				scanId: runningScan.id 
			}, { status: 409 });
		}

		// Get user configuration
		const config = await getUserConfig(user.id);

		// Start scan record
		const scan = await startScan(user.id);
		debugLog(`Started repository scan for user ${user.username}`);

		// Perform the scan asynchronously (don't await)
		performScanAsync(scan.id, user, config, session.access_token);

		return json({
			success: true,
			scanId: scan.id,
			message: 'Repository scan started'
		});

	} catch (err) {
		errorLog('Error starting repository scan', err);
		throw error(500, err.message || 'Failed to start repository scan');
	}
}

/**
 * Gets the status of a repository scan
 */
export async function GET({ url }) {
	try {
		const scanId = url.searchParams.get('scanId');
		if (!scanId) {
			throw error(400, 'Scan ID required');
		}

		// Check authentication
		const session = await getCurrentSession();
		if (!session || !session.username) {
			throw error(401, 'Authentication required');
		}

		// Get user from database
		const user = await getUserByUsername(session.username);
		if (!user) {
			throw error(404, 'User not found');
		}

		// Get scan status
		const { db, scanHistory } = await import('$lib/database/drizzle.js');
		const { eq, and } = await import('drizzle-orm');
		const result = await db
			.select()
			.from(scanHistory)
			.where(
				and(
					eq(scanHistory.id, scanId),
					eq(scanHistory.userId, user.id)
				)
			)
			.limit(1);

		if (result.length === 0) {
			throw error(404, 'Scan not found');
		}

		return json(result[0]);

	} catch (err) {
		errorLog('Error getting scan status', err);
		throw error(500, err.message || 'Failed to get scan status');
	}
}

/**
 * Performs the repository scan asynchronously
 */
async function performScanAsync(scanId, user, config, accessToken) {
	try {
		debugLog(`Performing async scan ${scanId} for user ${user.username}`);

		// Perform the GitHub repository scan
		const repositories = await performRepositoryScan(
			accessToken,
			user.username,
			config.scan_private_repos
		);

		if (repositories.length === 0) {
			await completeScan(scanId, {
				reposScanned: 0,
				reposAdded: 0,
				reposUpdated: 0
			});
			return;
		}

		// Get current GitHub IDs for cleanup
		const currentGithubIds = repositories.map(repo => repo.github_id);

		// Upsert repositories to database
		const upsertedRepos = await upsertRepositories(user.id, repositories);

		// Clean up repositories that no longer exist on GitHub
		const deletedCount = await cleanupRemovedRepositories(user.id, currentGithubIds);

		// Complete the scan
		await completeScan(scanId, {
			reposScanned: repositories.length,
			reposAdded: upsertedRepos.length,
			reposUpdated: upsertedRepos.length, // This would need more logic to differentiate
		});

		debugLog(`Completed scan ${scanId}`, {
			scanned: repositories.length,
			upserted: upsertedRepos.length,
			deleted: deletedCount
		});

	} catch (error) {
		errorLog(`Scan ${scanId} failed`, error);
		await failScan(scanId, error);
	}
}