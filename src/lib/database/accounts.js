import { db } from "./drizzle.js";
import { sql } from "drizzle-orm";

/**
 * Gets the GitHub access token for a user from better-auth's account table.
 *
 * Raw SQL is used here because the `account` table is managed by better-auth
 * and is not part of our Drizzle schema definitions. Defining a Drizzle table
 * for it would risk schema conflicts when better-auth updates its own tables.
 *
 * @param {string} userId - User ID
 * @returns {string|null} GitHub access token or null
 */
export function getGitHubToken(userId) {
  const rows = db.all(
    sql`SELECT "accessToken" FROM account WHERE "userId" = ${userId} AND "providerId" = 'github' LIMIT 1`,
  );
  return rows?.[0]?.accessToken || null;
}
