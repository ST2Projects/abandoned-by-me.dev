import { error, json } from '@sveltejs/kit';
import { auth } from '$lib/auth/auth.js';
import { db, sqlite } from '$lib/database/drizzle.js';
import { scanHistory, repositories, userConfigs } from '$lib/database/schema.js';
import { eq } from 'drizzle-orm';
import { errorLog } from '$lib/utils/env.js';
import { accountDeleteLimiter, getClientKey } from '$lib/utils/rateLimit.js';

/**
 * Deletes a user account and ALL associated data.
 * This is wrapped in a transaction so it's all-or-nothing.
 */
export async function DELETE(event) {
	try {
		const { request } = event;
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			throw error(401, 'Authentication required');
		}

		// Validate session has not expired before irreversible action
		if (session.session?.expiresAt && new Date(session.session.expiresAt) < new Date()) {
			throw error(401, 'Session expired. Please sign in again.');
		}

		// Rate limit account deletion attempts per IP
		const rateCheck = accountDeleteLimiter.check(getClientKey(event));
		if (!rateCheck.allowed) {
			throw error(429, 'Too many attempts. Please try again later.');
		}

		const userId = session.user.id;

		// Use a transaction to ensure all-or-nothing deletion
		const deleteAll = sqlite.transaction(() => {
			// 1. Delete scan history (app table)
			db.delete(scanHistory).where(eq(scanHistory.userId, userId)).run();

			// 2. Delete repositories (app table)
			db.delete(repositories).where(eq(repositories.userId, userId)).run();

			// 3. Delete user configs (app table)
			db.delete(userConfigs).where(eq(userConfigs.userId, userId)).run();

			// Raw SQL is used below because better-auth manages these tables directly
			// and they are not part of our Drizzle schema definitions.

			// 4. Delete sessions (better-auth table)
			sqlite.prepare('DELETE FROM "session" WHERE "userId" = ?').run(userId);

			// 5. Delete accounts (better-auth table)
			sqlite.prepare('DELETE FROM "account" WHERE "userId" = ?').run(userId);

			// 6. Delete user (better-auth table)
			sqlite.prepare('DELETE FROM "user" WHERE "id" = ?').run(userId);
		});

		deleteAll();

		return json({ success: true, message: 'Account and all associated data deleted successfully' });

	} catch (err) {
		if (err.status) throw err;
		errorLog('Error deleting user account', err);
		throw error(500, 'Failed to delete account');
	}
}
