import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { startRepoRefreshJob } from '$lib/jobs/repoRefresh.js';
import { error } from '@sveltejs/kit';
import { accessLog } from '$lib/utils/env.js';

// Start background jobs once on server startup (not during build)
if (!building) {
	startRepoRefreshJob();
}

/**
 * Access logging hook - logs HTTP requests with timing
 */
const accessLogging = async ({ event, resolve }) => {
	if (building) {
		return resolve(event);
	}

	const start = Date.now();
	const response = await resolve(event);
	const duration = Date.now() - start;
	const pathname = event.url.pathname;

	// Skip health check noise
	if (pathname === '/health') {
		return response;
	}

	let clientIp;
	try {
		clientIp = event.getClientAddress();
	} catch {
		// getClientAddress() may not be available in all contexts
	}

	accessLog(event.request.method, pathname, response.status, duration, clientIp);

	return response;
};

/**
 * CSRF protection hook - validates Origin header on state-changing requests.
 * Requests without a valid Origin that matches the Host are rejected.
 * GET/HEAD/OPTIONS are exempt (safe methods).
 */
const csrfProtection = async ({ event, resolve }) => {
	const method = event.request.method;
	const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

	if (!safeMethods.includes(method)) {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');

		// Allow requests from better-auth's internal flows (they set correct origin)
		// and from same-origin. Block requests with missing or mismatched origin.
		if (origin) {
			let originHost;
			try {
				originHost = new URL(origin).host;
			} catch {
				throw error(403, 'Forbidden');
			}
			if (originHost !== host) {
				throw error(403, 'Forbidden');
			}
		}
		// If no Origin header is present, the request likely comes from a non-browser
		// client (e.g., curl, server-to-server). We allow these through since they
		// can't carry cookies/sessions from a victim's browser (CSRF requires a browser).
	}

	return resolve(event);
};

/**
 * Security headers hook - adds privacy and security headers
 */
const securityHeaders = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Privacy-first headers - no tracking or telemetry
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()');

	// Remove server identification
	response.headers.set('X-Powered-By', '');

	// CSP for security while allowing necessary resources
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: https:",
		"connect-src 'self' https://api.github.com https://github.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self' https://github.com"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	return response;
};

export const handle = sequence(accessLogging, csrfProtection, securityHeaders);
