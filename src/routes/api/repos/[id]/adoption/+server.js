import { error, json } from "@sveltejs/kit";
import { auth } from "$lib/auth/auth.js";
import { db, repositories } from "$lib/database/drizzle.js";
import { eq, and } from "drizzle-orm";
import { adoptionLimiter } from "$lib/utils/rateLimit.js";

/**
 * Toggle up_for_adoption status on a repository (auth required, must own repo)
 */
export async function POST({ params, request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw error(401, "Authentication required");
  }

  // Rate limit adoption toggles per user
  const rateCheck = adoptionLimiter.check(session.user.id);
  if (!rateCheck.allowed) {
    throw error(429, "Too many requests. Please try again later.");
  }

  const { id } = params;
  if (!id) {
    throw error(400, "Repository ID is required");
  }

  // Fetch the repo and verify ownership
  const repo = await db
    .select({
      id: repositories.id,
      upForAdoption: repositories.upForAdoption,
      isFork: repositories.isFork,
      private: repositories.private,
    })
    .from(repositories)
    .where(
      and(eq(repositories.id, id), eq(repositories.userId, session.user.id)),
    )
    .limit(1);

  if (repo.length === 0) {
    throw error(404, "Repository not found or you do not own it");
  }

  if (repo[0].isFork) {
    throw error(400, "Forked repositories cannot be put up for adoption");
  }

  if (repo[0].private) {
    throw error(400, "Private repositories cannot be put up for adoption");
  }

  const newValue = !repo[0].upForAdoption;

  await db
    .update(repositories)
    .set({ upForAdoption: newValue, updatedAt: new Date() })
    .where(eq(repositories.id, id));

  return json({ upForAdoption: newValue });
}
