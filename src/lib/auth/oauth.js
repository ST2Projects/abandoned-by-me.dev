import { createGitHubClient, getUserInfo } from '../github/client.js';

/**
 * @typedef {import('../types/auth.js').GitHubAuthResponse} GitHubAuthResponse
 */

/**
 * Validates a GitHub personal access token and returns user info
 * @param {string} token - GitHub personal access token
 * @returns {Promise<GitHubAuthResponse>} Auth response with token and user info
 * @throws {Error} If the token validation fails
 */
export async function validateGitHubToken(token) {
	try {
		// Create GitHub client with the token
		const client = createGitHubClient(token);
		
		// Get user info to validate the token
		const userInfo = await getUserInfo(client);
		
		// Check if token has required scopes by testing repository access
		try {
			await client.request('GET /user/repos', {
				per_page: 1,
				headers: {
					'X-GitHub-Api-Version': '2022-11-28'
				}
			});
		} catch (error) {
			if (error.status === 403) {
				throw new Error('Token does not have required repository access. Please ensure your token has "repo" scope.');
			}
			throw error;
		}

		return {
			access_token: token,
			access_token_expires_in: null, // Personal tokens don't expire unless revoked
			refresh_token: null,
			refresh_token_expires_in: null,
			username: userInfo.login,
			user_info: userInfo
		};
	} catch (error) {
		console.error('GitHub token validation failed:', error);
		throw error;
	}
}

/**
 * Generates instructions for creating a GitHub personal access token
 * @returns {Object} Instructions and required scopes
 */
export function getTokenInstructions() {
	return {
		steps: [
			'Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)',
			'Click "Generate new token (classic)"',
			'Give your token a descriptive name like "Abandoned by Me Dashboard"',
			'Select the following scopes:',
			'• repo (Full control of private repositories)',
			'• user (Read user profile data)',
			'Click "Generate token"',
			'Copy the token immediately (you won\'t be able to see it again)'
		],
		scopes: ['repo', 'user'],
		url: 'https://github.com/settings/tokens'
	};
}