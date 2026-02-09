import { dev } from "$app/environment";

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
 * Logs access information (HTTP requests)
 * @param {string} method - HTTP method
 * @param {string} pathname - Request path (no query strings for privacy)
 * @param {number} status - HTTP status code
 * @param {number} durationMs - Request duration in milliseconds
 * @param {string} [clientIp] - Client IP address
 */
export function accessLog(method, pathname, status, durationMs, clientIp) {
  console.log(
    `[ACCESS] ${method} ${pathname} ${status} ${durationMs}ms${clientIp ? " " + clientIp : ""}`,
  );
}

/**
 * Logs application events with a tag prefix
 * @param {string} tag - Event category (e.g., 'AUTH', 'SCAN', 'CONFIG', 'GITHUB', 'JOB')
 * @param {string} message - Event description
 */
export function appLog(tag, message) {
  console.log(`[${tag}] ${message}`);
}

/**
 * Validates required environment variables
 * @param {string[]} requiredVars - List of required environment variable names
 * @throws {Error} If any required variables are missing
 */
export function validateEnvironment(requiredVars) {
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}
