import { dev } from '$app/environment';

/**
 * Logs debug information in development mode
 * @param {string} message - Debug message
 * @param {any} [data] - Optional data to log
 */
export function debugLog(message, data) {
	if (dev) {
		console.log(`[DEBUG] ${message}`, data);
	}
}

/**
 * Logs error information
 * @param {string} message - Error message
 * @param {Error | any} [error] - Error object or data
 */
export function errorLog(message, error) {
	console.error(`[ERROR] ${message}`, error);
}

/**
 * Validates required environment variables
 * @param {string[]} requiredVars - List of required environment variable names
 * @throws {Error} If any required variables are missing
 */
export function validateEnvironment(requiredVars) {
	const missing = requiredVars.filter(varName => !process.env[varName]);
	
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}
}