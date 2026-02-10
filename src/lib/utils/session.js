import { error } from "@sveltejs/kit";
import { auth } from "$lib/auth/auth.js";

/**
 * Validates an authenticated session from request headers.
 * Checks both that the session exists and that it has not expired.
 *
 * @param {Headers} headers - Request headers
 * @returns {Promise<{ user: { id: string, name: string, email: string }, session: object }>}
 * @throws {import('@sveltejs/kit').HttpError} 401 if not authenticated or session expired
 */
export async function requireSession(headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw error(401, "Authentication required");
  }

  if (
    session.session?.expiresAt &&
    new Date(session.session.expiresAt) < new Date()
  ) {
    throw error(401, "Session expired. Please sign in again.");
  }

  return session;
}
