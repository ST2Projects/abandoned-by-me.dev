import { json, error } from '@sveltejs/kit';
import { validateGitHubToken } from '$lib/auth/oauth.js';
import { saveUserAuth } from '$lib/database/users.js';
import { createUserSession } from '$lib/auth/session.js';
import { errorLog, debugLog } from '$lib/utils/env.js';

/**
 * Validates a GitHub personal access token and creates a user session
 */
export async function POST({ request, cookies }) {
	try {
		const { token } = await request.json();
		
		if (!token || typeof token !== 'string') {
			throw error(400, 'GitHub token is required');
		}

		// Validate the token with GitHub
		debugLog('Validating GitHub token');
		const authData = await validateGitHubToken(token);
		
		// Save/update user in database
		debugLog(`Saving user auth for ${authData.username}`);
		const user = await saveUserAuth(authData);
		
		// Create user session
		debugLog(`Creating session for user ${user.id}`);
		await createUserSession(cookies, {
			userId: user.id,
			username: user.username
		});
		
		return json({
			success: true,
			user: {
				id: user.id,
				username: user.username
			}
		});
		
	} catch (err) {
		errorLog('Token validation failed', err);
		
		// Return appropriate error messages
		if (err.status === 401) {
			throw error(401, 'Invalid GitHub token. Please check your token and try again.');
		} else if (err.message.includes('scope') || err.message.includes('repo')) {
			throw error(400, 'Token missing required permissions. Please ensure your token has "repo" and "user" scopes.');
		} else if (err.message.includes('rate limit')) {
			throw error(429, 'GitHub API rate limit exceeded. Please try again later.');
		} else {
			throw error(500, 'Failed to validate token. Please try again.');
		}
	}
}