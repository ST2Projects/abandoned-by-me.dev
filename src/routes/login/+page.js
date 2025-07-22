import { requireGuest } from '$lib/auth/guards.js';

export async function load() {
	// Redirect to dashboard if already logged in
	await requireGuest();
	
	return {};
}