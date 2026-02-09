import { getPublicDirectoryListings } from "$lib/database/repositories.js";

/** @type {import('./$types').PageServerLoad} */
export async function load() {
  const { listings } = await getPublicDirectoryListings();

  return { listings };
}
