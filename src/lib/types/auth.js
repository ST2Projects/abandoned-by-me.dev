/**
 * @typedef {Object} UserSession
 * @property {import('octokit').Octokit} client - GitHub client instance
 * @property {string} username - GitHub username
 * @property {string} access_token - GitHub access token
 */

/**
 * @typedef {Object} GitHubAuthResponse
 * @property {string} access_token - GitHub access token
 * @property {string} access_token_expires_in - Access token expiration
 * @property {string} refresh_token - GitHub refresh token
 * @property {string} refresh_token_expires_in - Refresh token expiration
 * @property {string} username - GitHub username
 */

export default {};