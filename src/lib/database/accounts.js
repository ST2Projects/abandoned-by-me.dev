import { db } from "./drizzle.js";
import { sql } from "drizzle-orm";

/**
 * Gets an access token for a user from better-auth's account table.
 *
 * Raw SQL is used here because the `account` table is managed by better-auth
 * and is not part of our Drizzle schema definitions. Defining a Drizzle table
 * for it would risk schema conflicts when better-auth updates its own tables.
 *
 * @param {string} userId - User ID
 * @param {string} providerId - Provider ID (e.g., 'github', 'gitlab')
 * @returns {string|null} Access token or null
 */
export function getProviderToken(userId, providerId) {
  const rows = db.all(
    sql`SELECT "accessToken" FROM account WHERE "userId" = ${userId} AND "providerId" = ${providerId} LIMIT 1`,
  );
  return rows?.[0]?.accessToken || null;
}

/**
 * Gets the GitHub access token for a user.
 * @param {string} userId - User ID
 * @returns {string|null} GitHub access token or null
 */
export function getGitHubToken(userId) {
  return getProviderToken(userId, "github");
}

/**
 * Gets the GitLab access token for a user.
 * @param {string} userId - User ID
 * @returns {string|null} GitLab access token or null
 */
export function getGitLabToken(userId) {
  return getProviderToken(userId, "gitlab");
}

/**
 * Gets all linked provider IDs for a user.
 * @param {string} userId - User ID
 * @returns {string[]} Array of provider IDs (e.g., ['github', 'gitlab'])
 */
export function getLinkedProviders(userId) {
  const rows = db.all(
    sql`SELECT "providerId" FROM account WHERE "userId" = ${userId}`,
  );
  return rows?.map((r) => r.providerId) || [];
}
