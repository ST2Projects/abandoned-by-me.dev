import { json, error } from "@sveltejs/kit";
import { getPublicDirectoryListings } from "$lib/database/repositories.js";
import { errorLog } from "$lib/utils/env.js";

/**
 * Gets public directory listings for the explore page
 */
export async function GET({ url }) {
  try {
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1),
      100,
    );
    const offset = Math.max(
      parseInt(url.searchParams.get("offset") || "0", 10),
      0,
    );

    const { listings, total } = await getPublicDirectoryListings({
      limit,
      offset,
    });

    return json({ listings, total });
  } catch (err) {
    if (err.status) {
      throw err;
    }
    errorLog("Error fetching explore listings", err);
    throw error(500, "Failed to fetch explore listings");
  }
}
