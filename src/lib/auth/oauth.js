import { CLIENT_CODE, CLIENT_SECRET } from '$env/static/private';
import { createGitHubClient, getUserInfo } from '../github/client.js';

/**
 * @typedef {import('../types/auth.js').GitHubAuthResponse} GitHubAuthResponse
 */

/**
 * Exchanges authorization code for access token
 * @param {string} code - Authorization code from GitHub OAuth callback
 * @returns {Promise<GitHubAuthResponse>} Auth response with tokens and user info
 * @throws {Error} If the token exchange fails
 */
export async function exchangeCodeForTokens(code) {
	const params = {
		client_id: CLIENT_CODE,
		client_secret: CLIENT_SECRET,
		code: code
	};

	const requestURL = 'https://github.com/login/oauth/access_token?' + new URLSearchParams(params);

	try {
		const response = await fetch(requestURL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`GitHub OAuth request failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		if (data.error) {
			throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
		}

		// Get user info
		const client = createGitHubClient(data.access_token);
		const userInfo = await getUserInfo(client);

		return {
			access_token: data.access_token,
			access_token_expires_in: data.expires_in,
			refresh_token: data.refresh_token,
			refresh_token_expires_in: data.refresh_token_expires_in,
			username: userInfo.login
		};
	} catch (error) {
		console.error('OAuth token exchange failed:', error);
		throw error;
	}
}

/**
 * Generates GitHub OAuth authorization URL
 * @param {string} clientId - GitHub OAuth client ID
 * @param {string} redirectUri - OAuth redirect URI
 * @param {string[]} [scopes=['user', 'repo']] - OAuth scopes
 * @param {string} [state] - State parameter for security
 * @returns {string} Authorization URL
 */
export function getAuthorizationUrl(clientId, redirectUri, scopes = ['user', 'repo'], state) {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: scopes.join(' ')
	});

	if (state) {
		params.append('state', state);
	}

	return `https://github.com/login/oauth/authorize?${params}`;
}