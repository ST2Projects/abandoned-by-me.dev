export async function load({ parent }) {
	const { session } = await parent();
	return { session };
}
