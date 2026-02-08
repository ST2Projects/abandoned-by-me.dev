import { redirect } from '@sveltejs/kit';

export async function load({ parent, fetch }) {
	const { session } = await parent();
	if (!session?.user) {
		throw redirect(302, '/login');
	}

	const [reposRes, configRes] = await Promise.all([
		fetch('/api/repositories'),
		fetch('/api/config')
	]);

	const reposData = reposRes.ok ? await reposRes.json() : {};
	const repos = reposData.repositories || [];
	const config = configRes.ok ? await configRes.json() : null;

	return { session, repos, config };
}
