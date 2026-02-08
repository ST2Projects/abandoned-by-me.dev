import { auth } from '$lib/auth/auth.js';

export async function POST({ request }) {
	// better-auth handles logout via its own /api/auth/sign-out endpoint
	// This is a convenience redirect
	return new Response(null, {
		status: 302,
		headers: { Location: '/' }
	});
}
