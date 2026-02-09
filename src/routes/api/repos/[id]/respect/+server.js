import { error, json } from "@sveltejs/kit";
import { db, repositories } from "$lib/database/drizzle.js";
import { eq, sql } from "drizzle-orm";
import { respectLimiter, getClientKey } from "$lib/utils/rateLimit.js";

/**
 * Increment respects count for a repository (anonymous, cookie-gated)
 */
export async function POST(event) {
  const { params, cookies } = event;
  const { id } = params;

  if (!id) {
    throw error(400, "Repository ID is required");
  }

  // IP-based rate limiting (protects against cookie-clearing abuse)
  const rateCheck = respectLimiter.check(getClientKey(event));
  if (!rateCheck.allowed) {
    throw error(429, "Too many requests. Please try again later.");
  }

  // Cookie-based rate limiting (per-repo, UX-level)
  const cookieKey = `respected_${id}`;
  if (cookies.get(cookieKey)) {
    throw error(429, "You have already paid your respects to this repository");
  }

  // Increment the counter
  const result = await db
    .update(repositories)
    .set({ respectsCount: sql`${repositories.respectsCount} + 1` })
    .where(eq(repositories.id, id))
    .returning({ respectsCount: repositories.respectsCount });

  if (result.length === 0) {
    throw error(404, "Repository not found");
  }

  // Set cookie to prevent repeat respects (24h expiry)
  cookies.set(cookieKey, "1", {
    path: "/",
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: "lax",
  });

  return json({ respectsCount: result[0].respectsCount });
}
