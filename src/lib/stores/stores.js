import { readable, writable } from 'svelte/store';

/**
 * @typedef {import('../types/auth.js').UserSession} UserSession
 */

/**
 * Store for user authentication session
 * @type {import('svelte/store').Writable<UserSession | {}>}
 */
export const userSessionStore = writable({});

/**
 * Derived store for authentication status
 * @type {import('svelte/store').Readable<boolean>}
 */
export const isAuthenticated = readable(false, (set) => {
	const unsubscribe = userSessionStore.subscribe((session) => {
		set(session && session.access_token ? true : false);
	});

	return unsubscribe;
});