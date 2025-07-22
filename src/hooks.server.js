import { sequence } from '@sveltejs/kit/hooks';

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
		"form-action 'self'"
	].join('; ');
	
	response.headers.set('Content-Security-Policy', csp);

	return response;
};

/**
 * Authentication context hook - sets user context
 */
const authContext = async ({ event, resolve }) => {
	// Authentication context for the application
	// Since we're using PostgreSQL without RLS, this is simplified
	
	return await resolve(event);
};

/**
 * Rate limiting hook - basic rate limiting for API endpoints
 */
const rateLimiting = async ({ event, resolve }) => {
	// Basic rate limiting could be implemented here
	// For production, consider using reverse proxy rate limiting
	
	return await resolve(event);
};

export const handle = sequence(securityHeaders, authContext, rateLimiting);