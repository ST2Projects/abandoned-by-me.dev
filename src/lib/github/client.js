import { Octokit } from 'octokit';

/**
 * Creates a new GitHub client with the provided access token
 * @param {string} accessToken - GitHub access token
 * @returns {Octokit} GitHub client instance
 */
export function createGitHubClient(accessToken) {
	return new Octokit({
		auth: accessToken
	});
}

/**
 * Fetches user information from GitHub
 * @param {Octokit} client - GitHub client instance
 * @returns {Promise<any>} User information
 */
export async function getUserInfo(client) {
	const response = await client.request('GET /user', {
		headers: {
			'X-GitHub-Api-Version': '2022-11-28'
		}
	});
	
	return response.data;
}

/**
 * Fetches user repositories from GitHub (public only)
 * @param {Octokit} client - GitHub client instance
 * @param {string} username - GitHub username
 * @returns {Promise<any[]>} User repositories
 */
export async function getUserRepositories(client, username) {
	const response = await client.request('GET /users/{username}/repos', {
		username,
		headers: {
			'X-GitHub-Api-Version': '2022-11-28'
		}
	});
	
	return response.data;
}

/**
 * Tests GitHub API connection and permissions
 * @param {Octokit} client - GitHub client instance
 * @returns {Promise<{user: any, scopes: string[]}>} User info and scopes
 */
export async function testConnection(client) {
	try {
		const userResponse = await client.request('GET /user', {
			headers: {
				'X-GitHub-Api-Version': '2022-11-28'
			}
		});

		// Get rate limit info to check API access
		const rateLimitResponse = await client.request('GET /rate_limit', {
			headers: {
				'X-GitHub-Api-Version': '2022-11-28'
			}
		});

		return {
			user: userResponse.data,
			scopes: rateLimitResponse.headers['x-oauth-scopes']?.split(', ') || [],
			rateLimit: rateLimitResponse.data
		};
	} catch (error) {
		throw new Error(`GitHub API connection failed: ${error.message}`);
	}
}