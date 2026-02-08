import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb, insertTestUser } from './test-helpers.js';

vi.mock('../utils/env.js', () => ({
	debugLog: vi.fn(),
	errorLog: vi.fn()
}));

let testDb;
let testSqlite;
const TEST_USER_ID = 'user-repo-1';

vi.mock('./drizzle.js', async () => {
	const schema = await import('./schema.js');
	return {
		db: null,
		...schema
	};
});

import * as drizzleMod from './drizzle.js';
import {
	upsertRepositories,
	getUserRepositories,
	getAbandonedRepositories,
	getPublicDashboardData,
	cleanupRemovedRepositories
} from './repositories.js';
import { getUserConfig, enablePublicDashboard } from './userConfig.js';

function makeRepo(overrides = {}) {
	return {
		github_id: 1001,
		name: 'test-repo',
		full_name: 'testuser/test-repo',
		description: 'A test repo',
		private: false,
		html_url: 'https://github.com/testuser/test-repo',
		clone_url: 'https://github.com/testuser/test-repo.git',
		last_commit_date: new Date().toISOString(),
		last_push_date: new Date().toISOString(),
		is_fork: false,
		is_archived: false,
		default_branch: 'main',
		language: 'JavaScript',
		stars_count: 5,
		forks_count: 1,
		open_issues_count: 2,
		size_kb: 100,
		...overrides
	};
}

beforeEach(() => {
	const { db, sqlite } = createTestDb();
	testDb = db;
	testSqlite = sqlite;
	drizzleMod.db = db;
	insertTestUser(sqlite, { id: TEST_USER_ID });
});

describe('repositories', () => {
	describe('upsertRepositories', () => {
		it('should insert new repositories', async () => {
			const repos = [
				makeRepo({ github_id: 1001, name: 'repo-a' }),
				makeRepo({ github_id: 1002, name: 'repo-b' })
			];

			const result = await upsertRepositories(TEST_USER_ID, repos);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('repo-a');
			expect(result[1].name).toBe('repo-b');
		});

		it('should return empty array for empty input', async () => {
			const result = await upsertRepositories(TEST_USER_ID, []);
			expect(result).toEqual([]);
		});

		it('should update existing repositories on conflict', async () => {
			const repo = makeRepo({ github_id: 1001, name: 'repo-a', stars_count: 5 });
			await upsertRepositories(TEST_USER_ID, [repo]);

			const updatedRepo = makeRepo({ github_id: 1001, name: 'repo-a', stars_count: 10 });
			await upsertRepositories(TEST_USER_ID, [updatedRepo]);

			const all = await getUserRepositories(TEST_USER_ID);
			expect(all).toHaveLength(1);
			expect(all[0].starsCount).toBe(10);
		});

		it('should store private flag correctly', async () => {
			const repo = makeRepo({ github_id: 2001, name: 'private-repo', private: true });
			await upsertRepositories(TEST_USER_ID, [repo]);

			const all = await getUserRepositories(TEST_USER_ID);
			expect(all[0].private).toBe(true);
		});
	});

	describe('getUserRepositories', () => {
		it('should return empty array when no repos exist', async () => {
			const repos = await getUserRepositories(TEST_USER_ID);
			expect(repos).toEqual([]);
		});

		it('should return repos ordered by last commit date descending', async () => {
			const oldDate = new Date('2020-01-01').toISOString();
			const newDate = new Date('2025-01-01').toISOString();

			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001, name: 'old-repo', last_commit_date: oldDate }),
				makeRepo({ github_id: 1002, name: 'new-repo', last_commit_date: newDate })
			]);

			const repos = await getUserRepositories(TEST_USER_ID);
			expect(repos[0].name).toBe('new-repo');
			expect(repos[1].name).toBe('old-repo');
		});

		it('should only return repos for the specified user', async () => {
			insertTestUser(testSqlite, { id: 'user-repo-2' });

			await upsertRepositories(TEST_USER_ID, [makeRepo({ github_id: 1001 })]);
			await upsertRepositories('user-repo-2', [makeRepo({ github_id: 2001 })]);

			const repos = await getUserRepositories(TEST_USER_ID);
			expect(repos).toHaveLength(1);
			expect(repos[0].userId).toBe(TEST_USER_ID);
		});
	});

	describe('getAbandonedRepositories', () => {
		it('should return repos with old commit dates', async () => {
			const oldDate = new Date();
			oldDate.setMonth(oldDate.getMonth() - 3);

			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001, name: 'old-repo', last_commit_date: oldDate.toISOString() }),
				makeRepo({ github_id: 1002, name: 'active-repo', last_commit_date: new Date().toISOString() })
			]);

			const abandoned = await getAbandonedRepositories(TEST_USER_ID, 1);
			expect(abandoned).toHaveLength(1);
			expect(abandoned[0].name).toBe('old-repo');
		});

		it('should return repos with null commit dates as abandoned', async () => {
			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001, name: 'empty-repo', last_commit_date: null, last_push_date: null })
			]);

			const abandoned = await getAbandonedRepositories(TEST_USER_ID, 1);
			expect(abandoned).toHaveLength(1);
		});

		it('should not return archived repos as abandoned', async () => {
			const oldDate = new Date();
			oldDate.setFullYear(oldDate.getFullYear() - 2);

			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001, name: 'archived-repo', is_archived: true, last_commit_date: oldDate.toISOString() })
			]);

			const abandoned = await getAbandonedRepositories(TEST_USER_ID, 1);
			expect(abandoned).toHaveLength(0);
		});

		it('should respect the threshold parameter', async () => {
			const threeMonthsAgo = new Date();
			threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001, name: 'medium-old', last_commit_date: threeMonthsAgo.toISOString() })
			]);

			// With 6 month threshold, should NOT be abandoned
			const notAbandoned = await getAbandonedRepositories(TEST_USER_ID, 6);
			expect(notAbandoned).toHaveLength(0);

			// With 1 month threshold, SHOULD be abandoned
			const abandoned = await getAbandonedRepositories(TEST_USER_ID, 1);
			expect(abandoned).toHaveLength(1);
		});
	});

	describe('getPublicDashboardData', () => {
		it('should return null for non-existent slug', async () => {
			const data = await getPublicDashboardData('nonexistent-slug');
			expect(data).toBeNull();
		});

		it('should return null for private dashboard', async () => {
			await getUserConfig(TEST_USER_ID);
			// Dashboard is private by default
			const data = await getPublicDashboardData('testuser-repos');
			expect(data).toBeNull();
		});

		it('should return data for public dashboard', async () => {
			await getUserConfig(TEST_USER_ID);
			await enablePublicDashboard(TEST_USER_ID, 'testuser');

			// Add an abandoned repo
			const oldDate = new Date();
			oldDate.setMonth(oldDate.getMonth() - 3);
			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001, name: 'abandoned-public', last_commit_date: oldDate.toISOString(), private: false })
			]);

			const data = await getPublicDashboardData('testuser-repos');
			expect(data).not.toBeNull();
			expect(data.config.dashboardSlug).toBe('testuser-repos');
			expect(data.user.id).toBe(TEST_USER_ID);
		});

		it('should filter out private repos from public dashboard', async () => {
			await getUserConfig(TEST_USER_ID);
			await enablePublicDashboard(TEST_USER_ID, 'testuser');

			const oldDate = new Date();
			oldDate.setMonth(oldDate.getMonth() - 3);
			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001, name: 'public-repo', private: false, last_commit_date: oldDate.toISOString() }),
				makeRepo({ github_id: 1002, name: 'private-repo', private: true, last_commit_date: oldDate.toISOString() })
			]);

			const data = await getPublicDashboardData('testuser-repos');
			expect(data.repositories.every(r => !r.private)).toBe(true);
		});
	});

	describe('cleanupRemovedRepositories', () => {
		it('should delete repos not in the current GitHub IDs list', async () => {
			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001, name: 'keep-me' }),
				makeRepo({ github_id: 1002, name: 'remove-me' })
			]);

			const deletedCount = await cleanupRemovedRepositories(TEST_USER_ID, [1001]);

			expect(deletedCount).toBe(1);
			const remaining = await getUserRepositories(TEST_USER_ID);
			expect(remaining).toHaveLength(1);
			expect(remaining[0].name).toBe('keep-me');
		});

		it('should delete all repos when currentGithubIds is empty', async () => {
			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001 }),
				makeRepo({ github_id: 1002 })
			]);

			const deletedCount = await cleanupRemovedRepositories(TEST_USER_ID, []);
			expect(deletedCount).toBe(2);

			const remaining = await getUserRepositories(TEST_USER_ID);
			expect(remaining).toHaveLength(0);
		});

		it('should return 0 when no repos to delete', async () => {
			await upsertRepositories(TEST_USER_ID, [
				makeRepo({ github_id: 1001 })
			]);

			const deletedCount = await cleanupRemovedRepositories(TEST_USER_ID, [1001]);
			expect(deletedCount).toBe(0);
		});

		it('should not affect other users repos', async () => {
			insertTestUser(testSqlite, { id: 'user-repo-2' });
			await upsertRepositories(TEST_USER_ID, [makeRepo({ github_id: 1001 })]);
			await upsertRepositories('user-repo-2', [makeRepo({ github_id: 2001 })]);

			await cleanupRemovedRepositories(TEST_USER_ID, []);

			const otherUserRepos = await getUserRepositories('user-repo-2');
			expect(otherUserRepos).toHaveLength(1);
		});
	});
});
