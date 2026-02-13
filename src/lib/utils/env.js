import { dev } from "$app/environment";
import pino from "pino";
import fs from "node:fs";
import path from "node:path";

const LOG_DIR = process.env.LOG_DIR || "./data/logs";
const LOG_LEVEL = dev ? "debug" : "info";

// Ensure log directory exists
try {
  fs.mkdirSync(path.resolve(LOG_DIR), { recursive: true });
} catch {
  // Best-effort - stdout still works if dir creation fails
}

/**
 * Creates a pino logger with stdout + daily-rotated file transports.
 *
 * Uses pino-roll for daily file rotation with 5-day retention.
 * Logs are written as structured JSON to both stdout and file.
 */
const logger = pino(
  {
    level: LOG_LEVEL,
    formatters: {
      level(label) {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.transport({
    targets: [
      {
        target: "pino/file",
        level: LOG_LEVEL,
        options: { destination: 1 }, // stdout (fd 1)
      },
      {
        target: "pino-roll",
        level: LOG_LEVEL,
        options: {
          file: path.resolve(LOG_DIR, "app"),
          frequency: "daily",
          dateFormat: "yyyy-MM-dd",
          limit: { count: 5 },
          mkdir: true,
        },
      },
    ],
  }),
);

/**
 * Logs debug information in development mode
 * @param {string} message - Debug message
 * @param {any} [data] - Optional data to log
 */
export function debugLog(message, data) {
  if (dev) {
    logger.debug(
      { tag: "APP", ...(data !== undefined ? { data } : {}) },
      message,
    );
  }
}

/**
 * Logs error information
 * @param {string} message - Error message
 * @param {Error | any} [error] - Error object or data
 */
export function errorLog(message, error) {
  if (error instanceof Error) {
    logger.error({ tag: "APP", err: { message: error.message } }, message);
  } else if (error !== undefined) {
    logger.error({ tag: "APP", detail: String(error) }, message);
  } else {
    logger.error({ tag: "APP" }, message);
  }
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
  logger.info(
    {
      tag: "ACCESS",
      method,
      pathname,
      status,
      durationMs,
      ...(clientIp ? { clientIp } : {}),
    },
    `${method} ${pathname} ${status} ${durationMs}ms${clientIp ? " " + clientIp : ""}`,
  );
}

/**
 * Logs application events with a tag prefix
 * @param {string} tag - Event category (e.g., 'AUTH', 'SCAN', 'CONFIG', 'GITHUB', 'JOB')
 * @param {string} message - Event description
 */
export function appLog(tag, message) {
  logger.info({ tag }, message);
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

// Exported for testing
export const _testing = { logger };
