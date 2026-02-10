import { sequence } from "@sveltejs/kit/hooks";
import { building } from "$app/environment";
import { startRepoRefreshJob } from "$lib/jobs/repoRefresh.js";
import { error } from "@sveltejs/kit";
import { accessLog, validateEnvironment } from "$lib/utils/env.js";

// Validate required environment variables on startup (not during build)
if (!building) {
  validateEnvironment([
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
  ]);
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
  if (pathname === "/health") {
    return response;
  }

  let clientIp;
  try {
    clientIp = event.getClientAddress();
  } catch {
    // getClientAddress() may not be available in all contexts
  }

  accessLog(
    event.request.method,
    pathname,
    response.status,
    duration,
    clientIp,
  );

  return response;
};

/**
 * CSRF protection hook - validates Origin header on state-changing requests.
 * Requests without a valid Origin that matches the Host are rejected.
 * GET/HEAD/OPTIONS are exempt (safe methods).
 */
const csrfProtection = async ({ event, resolve }) => {
  const method = event.request.method;
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (!safeMethods.includes(method)) {
    const origin = event.request.headers.get("origin");
    const host = event.request.headers.get("host");

    // Allow requests from better-auth's internal flows (they set correct origin)
    // and from same-origin. Block requests with missing or mismatched origin.
    if (!origin) {
      // Modern browsers always send Origin on non-safe requests.
      // Reject requests without Origin to prevent CSRF attacks.
      throw error(403, "Forbidden");
    }

    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw error(403, "Forbidden");
    }
    if (originHost !== host) {
      throw error(403, "Forbidden");
    }
  }

  return resolve(event);
};

/**
 * Security headers hook - adds privacy and security headers
 */
const securityHeaders = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Privacy-first headers - no tracking or telemetry
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
  );

  // Remove server identification
  response.headers.set("X-Powered-By", "");

  // CSP is configured in svelte.config.js using SvelteKit's built-in CSP
  // with automatic nonce generation (no unsafe-inline for scripts).

  return response;
};

export const handle = sequence(accessLogging, csrfProtection, securityHeaders);
