import { redirect } from '@sveltejs/kit';
import { getCurrentSession } from './session.js';

/**
 * Redirects to login if user is not authenticated
 * @param {URL} url - Current URL for redirect after login
 * @returns {Promise<{user: any, session: any}>} User and session data
 * @throws {Response} Redirect to login if not authenticated
 */
export async function requireAuth(url) {
	const session = await getCurrentSession();
	
	if (!session || !session.username) {
		const returnUrl = url.pathname + url.search;
		throw redirect(302, `/login?return=${encodeURIComponent(returnUrl)}`);
	}

	return { session };
}

/**
 * Redirects to dashboard if user is already authenticated
 * @returns {Promise<void>}
 * @throws {Response} Redirect to dashboard if authenticated
 */
export async function requireGuest() {
	const session = await getCurrentSession();
	
	if (session && session.username) {
		throw redirect(302, '/dashboard');
	}
}