import { db, users } from './drizzle.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Saves or updates user authentication data
 * @param {import('../types/auth.js').GitHubAuthResponse} authData - User auth data
 * @returns {Promise<any>} Database response
 */
export async function saveUserAuth(authData) {
	try {
		const [user] = await db
			.insert(users)
			.values({
				username: authData.username,
				accessToken: authData.access_token,
				refreshToken: authData.refresh_token,
				accessTokenExpiresIn: authData.access_token_expires_in,
				refreshTokenExpiresIn: authData.refresh_token_expires_in,
			})
			.onConflictDoUpdate({
				target: users.username,
				set: {
					accessToken: authData.access_token,
					refreshToken: authData.refresh_token,
					accessTokenExpiresIn: authData.access_token_expires_in,
					refreshTokenExpiresIn: authData.refresh_token_expires_in,
					updatedAt: sql`NOW()`,
				},
			})
			.returning();

		return user;
	} catch (error) {
		console.error('Error saving user auth:', error);
		throw error;
	}
}

/**
 * Gets user data by username
 * @param {string} username - GitHub username
 * @returns {Promise<any>} User data
 */
export async function getUserByUsername(username) {
	try {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		return user || null;
	} catch (error) {
		console.error('Error fetching user:', error);
		throw error;
	}
}