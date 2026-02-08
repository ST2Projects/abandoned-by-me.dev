import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb, insertTestUser, insertTestAccount } from './test-helpers.js';

vi.mock('./drizzle.js', async () => {
	const schema = await import('./schema.js');
	return {
		db: null,
		...schema
	};
});

import * as drizzleMod from './drizzle.js';
import { getGitHubToken } from './accounts.js';

const TEST_USER_ID = 'user-acct-1';

beforeEach(() => {
	const { db, sqlite } = createTestDb();
	drizzleMod.db = db;
	insertTestUser(sqlite, { id: TEST_USER_ID });
	insertTestAccount(sqlite, { userId: TEST_USER_ID, accessToken: 'ghp_test_abc123' });
});

describe('accounts', () => {
	describe('getGitHubToken', () => {
		it('should return the GitHub access token for a user', () => {
			const token = getGitHubToken(TEST_USER_ID);
			expect(token).toBe('ghp_test_abc123');
		});

		it('should return null for a user without an account', () => {
			const token = getGitHubToken('nonexistent-user');
			expect(token).toBeNull();
		});
	});
});
