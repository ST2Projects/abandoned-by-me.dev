import { requireAuth } from '$lib/auth/guards.js';

export async function load({ url }) {
	// Require authentication to access config page
	const { session } = await requireAuth(url);
	
	return {
		session
	};
}