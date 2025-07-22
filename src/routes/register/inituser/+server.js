import { exchangeCodeForTokens } from '$lib/auth/oauth.js';
import { createUserSession } from '$lib/auth/session.js';
import { saveUserAuth } from '$lib/database/users.js';
import { debugLog, errorLog } from '$lib/utils/env.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	debugLog('OAuth callback received');
	
	const userCode = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	
	if (!userCode) {
		errorLog('No authorization code provided');
		throw error(400, 'Missing authorization code');
	}
	
	try {
		const authResponse = await exchangeCodeForTokens(userCode);
		await saveUserAuth(authResponse);
		createUserSession(authResponse);
		
		debugLog('User authenticated successfully', { username: authResponse.username });
		
		return new Response(JSON.stringify({ success: true, username: authResponse.username }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		errorLog('OAuth callback failed', err);
		throw error(500, 'Authentication failed');
	}
}

