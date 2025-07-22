import { userSessionStore } from '../stores/stores.js';
import { createGitHubClient } from '../github/client.js';

/**
 * @typedef {import('../types/auth.js').UserSession} UserSession
 * @typedef {import('../types/auth.js').GitHubAuthResponse} GitHubAuthResponse
 */

/**
 * Creates and stores user session from auth response
 * @param {GitHubAuthResponse} authResponse - GitHub auth response
 */
export function createUserSession(authResponse) {
	const client = createGitHubClient(authResponse.access_token);
	
	const session = {
		client,
		username: authResponse.username,
		access_token: authResponse.access_token
	};
	
	userSessionStore.set(session);
}

/**
 * Clears the user session
 */
export function clearUserSession() {
	userSessionStore.set({});
}

/**
 * Gets the current user session
 * @returns {Promise<UserSession | null>} Current session or null
 */
export function getCurrentSession() {
	return new Promise((resolve) => {
		const unsubscribe = userSessionStore.subscribe((session) => {
			unsubscribe();
			resolve(session && session.access_token ? session : null);
		});
	});
}