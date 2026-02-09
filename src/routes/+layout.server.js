import { building } from '$app/environment';
import { auth } from '$lib/auth/auth.js';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ request }) {
	if (building) {
		return { session: null };
	}

	const session = await auth.api.getSession({
		headers: request.headers,
	});

	return {
		session,
	};
}
