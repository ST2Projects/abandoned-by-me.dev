import { db, scanHistory } from './drizzle.js';
import { eq, desc, and } from 'drizzle-orm';
import { debugLog, errorLog } from '../utils/env.js';

/**
 * @typedef {Object} ScanHistory
 * @property {string} id
 * @property {string} user_id
 * @property {string} scan_started_at
 * @property {string|null} scan_completed_at
 * @property {number} repos_scanned
 * @property {number} repos_added
 * @property {number} repos_updated
 * @property {number} errors_count
 * @property {any|null} error_details
 * @property {'running'|'completed'|'failed'} status
 * @property {string} created_at
 */

/**
 * Starts a new scan for a user
 * @param {string} userId - User ID
 * @returns {Promise<ScanHistory>} Created scan record
 */
export async function startScan(userId) {
	try {
		const [scan] = await db
			.insert(scanHistory)
			.values({
				userId,
				scanStartedAt: new Date(),
				status: 'running'
			})
			.returning();
		
		debugLog(`Started scan ${scan.id} for user ${userId}`);
		return scan;
	} catch (error) {
		errorLog('Error starting scan', error);
		throw error;
	}
}

/**
 * Updates scan progress
 * @param {string} scanId - Scan ID
 * @param {Partial<ScanHistory>} updates - Updates to apply
 * @returns {Promise<ScanHistory>} Updated scan record
 */
export async function updateScan(scanId, updates) {
	try {
		const [result] = await db
			.update(scanHistory)
			.set(updates)
			.where(eq(scanHistory.id, scanId))
			.returning();
		
		return result;
	} catch (error) {
		errorLog('Error updating scan', error);
		throw error;
	}
}

/**
 * Completes a scan successfully
 * @param {string} scanId - Scan ID
 * @param {Object} results - Scan results
 * @param {number} results.reposScanned - Number of repositories scanned
 * @param {number} results.reposAdded - Number of repositories added
 * @param {number} results.reposUpdated - Number of repositories updated
 * @returns {Promise<ScanHistory>} Completed scan record
 */
export async function completeScan(scanId, { reposScanned, reposAdded, reposUpdated }) {
	try {
		const [result] = await db
			.update(scanHistory)
			.set({
				scanCompletedAt: new Date(),
				status: 'completed',
				reposScanned,
				reposAdded,
				reposUpdated
			})
			.where(eq(scanHistory.id, scanId))
			.returning();
		
		debugLog(`Completed scan ${scanId}`, { reposScanned, reposAdded, reposUpdated });
		return result;
	} catch (error) {
		errorLog('Error completing scan', error);
		throw error;
	}
}

/**
 * Marks a scan as failed
 * @param {string} scanId - Scan ID
 * @param {Error|string} error - Error that caused failure
 * @param {Object} [partialResults] - Partial results if any
 * @returns {Promise<ScanHistory>} Failed scan record
 */
export async function failScan(scanId, error, partialResults = {}) {
	try {
		const errorDetails = {
			message: error.message || error.toString(),
			stack: error.stack,
			timestamp: new Date().toISOString()
		};

		const [result] = await db
			.update(scanHistory)
			.set({
				scanCompletedAt: new Date(),
				status: 'failed',
				errorsCount: 1,
				errorDetails: errorDetails,
				...partialResults
			})
			.where(eq(scanHistory.id, scanId))
			.returning();
		
		errorLog(`Failed scan ${scanId}`, error);
		return result;
	} catch (updateError) {
		errorLog('Error updating failed scan', updateError);
		throw updateError;
	}
}

/**
 * Gets scan history for a user
 * @param {string} userId - User ID
 * @param {number} [limit=10] - Number of records to return
 * @returns {Promise<ScanHistory[]>} Scan history
 */
export async function getUserScanHistory(userId, limit = 10) {
	try {
		const result = await db
			.select()
			.from(scanHistory)
			.where(eq(scanHistory.userId, userId))
			.orderBy(desc(scanHistory.createdAt))
			.limit(limit);

		return result;
	} catch (error) {
		errorLog('Error fetching scan history', error);
		throw error;
	}
}

/**
 * Gets the latest scan for a user
 * @param {string} userId - User ID
 * @returns {Promise<ScanHistory|null>} Latest scan or null
 */
export async function getLatestScan(userId) {
	try {
		const result = await db
			.select()
			.from(scanHistory)
			.where(eq(scanHistory.userId, userId))
			.orderBy(desc(scanHistory.createdAt))
			.limit(1);

		return result[0] || null;
	} catch (error) {
		errorLog('Error fetching latest scan', error);
		throw error;
	}
}

/**
 * Checks if a user has a running scan
 * @param {string} userId - User ID
 * @returns {Promise<ScanHistory|null>} Running scan or null
 */
export async function getRunningScan(userId) {
	try {
		const result = await db
			.select()
			.from(scanHistory)
			.where(
				and(
					eq(scanHistory.userId, userId),
					eq(scanHistory.status, 'running')
				)
			)
			.limit(1);

		return result[0] || null;
	} catch (error) {
		errorLog('Error checking for running scan', error);
		throw error;
	}
}