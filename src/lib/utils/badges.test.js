import { describe, it, expect } from 'vitest';
import {
	calculateBadgeStats,
	getEarnedBadges,
	getAllBadges,
	getSarcasticMessage,
	getDaysSinceMessage,
	getRandomExcuse,
	excuses,
	getUserTitle,
	getNextTitle,
	getLanguageBadges,
	getLanguageStats,
	LANGUAGE_BADGES
} from './badges.js';

describe('badges utility', () => {
	describe('calculateBadgeStats', () => {
		it('should calculate correct stats for empty repos', () => {
			const stats = calculateBadgeStats([], 6);
			expect(stats.totalCount).toBe(0);
			expect(stats.abandonedCount).toBe(0);
			expect(stats.activeCount).toBe(0);
		});

		it('should identify abandoned repos based on threshold', () => {
			const repos = [
				{ id: 1, last_commit_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() }, // 1 year ago
				{ id: 2, last_commit_date: new Date().toISOString() }, // today
				{ id: 3, last_commit_date: null }, // never committed
			];

			const stats = calculateBadgeStats(repos, 6);
			expect(stats.totalCount).toBe(3);
			expect(stats.abandonedCount).toBe(2); // old one + null one
			expect(stats.activeCount).toBe(1);
		});

		it('should not count archived repos as abandoned', () => {
			const repos = [
				{ id: 1, is_archived: true, last_commit_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() },
			];

			const stats = calculateBadgeStats(repos, 6);
			expect(stats.abandonedCount).toBe(0);
		});

		it('should count forks correctly', () => {
			const repos = [
				{ id: 1, is_fork: true },
				{ id: 2, is_fork: true },
				{ id: 3, is_fork: false },
			];

			const stats = calculateBadgeStats(repos, 6);
			expect(stats.forkCount).toBe(2);
		});

		it('should count unique languages', () => {
			const repos = [
				{ id: 1, language: 'JavaScript', last_commit_date: null },
				{ id: 2, language: 'Python', last_commit_date: null },
				{ id: 3, language: 'JavaScript', last_commit_date: null }, // duplicate
				{ id: 4, language: 'Rust', last_commit_date: null },
			];

			const stats = calculateBadgeStats(repos, 6);
			expect(stats.languageCount).toBe(3);
		});
	});

	describe('getEarnedBadges', () => {
		it('should return clean slate badge when no repos abandoned', () => {
			const repos = [
				{ id: 1, last_commit_date: new Date().toISOString() },
				{ id: 2, last_commit_date: new Date().toISOString() },
			];

			const badges = getEarnedBadges(repos, 6);
			expect(badges.some(b => b.id === 'clean-slate')).toBe(true);
		});

		it('should return serial abandoner badge for 10+ abandoned', () => {
			const repos = Array.from({ length: 12 }, (_, i) => ({
				id: i,
				last_commit_date: null // all abandoned
			}));

			const badges = getEarnedBadges(repos, 6);
			expect(badges.some(b => b.id === 'serial-abandoner')).toBe(true);
		});

		it('should return graveyard keeper for 50%+ abandoned', () => {
			const repos = [
				{ id: 1, last_commit_date: null },
				{ id: 2, last_commit_date: null },
				{ id: 3, last_commit_date: new Date().toISOString() },
			];

			const badges = getEarnedBadges(repos, 6);
			expect(badges.some(b => b.id === 'graveyard-keeper')).toBe(true);
		});

		it('should return collector badge for 25+ repos', () => {
			const repos = Array.from({ length: 26 }, (_, i) => ({
				id: i,
				last_commit_date: new Date().toISOString()
			}));

			const badges = getEarnedBadges(repos, 6);
			expect(badges.some(b => b.id === 'collector')).toBe(true);
		});
	});

	describe('getAllBadges', () => {
		it('should return all available badges', () => {
			const badges = getAllBadges();
			expect(badges.length).toBeGreaterThan(0);
			expect(badges.every(b => b.id && b.name && b.icon && b.description)).toBe(true);
		});
	});

	describe('getSarcasticMessage', () => {
		it('should return message for no repos', () => {
			const msg = getSarcasticMessage(0, 0);
			expect(msg).toContain('No repos');
		});

		it('should return message for all active repos', () => {
			const msg = getSarcasticMessage(0, 10);
			expect(msg).toContain('active'); // Special message for 0% abandoned
		});

		it('should return message for all abandoned repos', () => {
			const msg = getSarcasticMessage(10, 10);
			expect(msg).toContain('100%');
		});

		it('should return percentage-based message', () => {
			const msg = getSarcasticMessage(5, 10);
			expect(msg).toContain('50%');
		});
	});

	describe('getDaysSinceMessage', () => {
		it('should handle null date', () => {
			const msg = getDaysSinceMessage(null);
			expect(msg).toContain('never');
		});

		it('should handle today', () => {
			const msg = getDaysSinceMessage(new Date().toISOString());
			expect(msg.toLowerCase()).toContain('today');
		});

		it('should handle old dates', () => {
			const oldDate = new Date();
			oldDate.setFullYear(oldDate.getFullYear() - 3);
			const msg = getDaysSinceMessage(oldDate.toISOString());
			expect(msg).toContain('over');
		});
	});

	describe('getRandomExcuse', () => {
		it('should return an excuse from the list', () => {
			const excuse = getRandomExcuse();
			expect(excuses).toContain(excuse);
		});

		it('should return different excuses (probabilistic)', () => {
			const results = new Set();
			for (let i = 0; i < 20; i++) {
				results.add(getRandomExcuse());
			}
			// Should get more than one unique excuse in 20 tries
			expect(results.size).toBeGreaterThan(1);
		});
	});

	describe('getUserTitle', () => {
		it('should return Hopeful Beginner for low counts', () => {
			const result = getUserTitle(0);
			expect(result.title).toBe('Hopeful Beginner');
			expect(result.emoji).toBeDefined();
		});

		it('should return Apprentice Abandoner for 3-5', () => {
			expect(getUserTitle(3).title).toBe('Apprentice Abandoner');
			expect(getUserTitle(5).title).toBe('Apprentice Abandoner');
		});

		it('should return Serial Starter for 6-10', () => {
			expect(getUserTitle(6).title).toBe('Serial Starter');
			expect(getUserTitle(10).title).toBe('Serial Starter');
		});

		it('should return top title for 51+', () => {
			expect(getUserTitle(51).title).toBe('Tenured Professor of Abandonware');
			expect(getUserTitle(100).title).toBe('Tenured Professor of Abandonware');
		});

		it('should scale through all tiers', () => {
			const titles = [0, 3, 6, 11, 21, 36, 51].map(n => getUserTitle(n).title);
			// All titles should be unique
			expect(new Set(titles).size).toBe(titles.length);
		});
	});

	describe('getNextTitle', () => {
		it('should return next title info for low counts', () => {
			const next = getNextTitle(0);
			expect(next).not.toBeNull();
			expect(next.remaining).toBe(3);
			expect(next.nextTitle).toBe('Apprentice Abandoner');
		});

		it('should return null when at max title', () => {
			const next = getNextTitle(51);
			expect(next).toBeNull();
		});

		it('should calculate correct remaining count', () => {
			const next = getNextTitle(4);
			expect(next.remaining).toBe(2); // 6 - 4
			expect(next.nextTitle).toBe('Serial Starter');
		});
	});

	describe('getLanguageBadges', () => {
		it('should return language badges for abandoned repos', () => {
			const repos = [
				{ language: 'JavaScript', last_commit_date: null },
				{ language: 'Python', last_commit_date: null },
			];

			const badges = getLanguageBadges(repos, 1);
			expect(badges.length).toBe(2);
			expect(badges.some(b => b.language === 'JavaScript')).toBe(true);
			expect(badges.some(b => b.language === 'Python')).toBe(true);
		});

		it('should not return badges for active repos', () => {
			const repos = [
				{ language: 'JavaScript', last_commit_date: new Date().toISOString() },
			];

			const badges = getLanguageBadges(repos, 1);
			expect(badges.length).toBe(0);
		});

		it('should not return badges for archived repos', () => {
			const repos = [
				{ language: 'JavaScript', last_commit_date: null, is_archived: true },
			];

			const badges = getLanguageBadges(repos, 1);
			expect(badges.length).toBe(0);
		});

		it('should not return badges for unknown languages', () => {
			const repos = [
				{ language: 'Brainfuck', last_commit_date: null },
			];

			const badges = getLanguageBadges(repos, 1);
			expect(badges.length).toBe(0);
		});

		it('should handle camelCase field names', () => {
			const repos = [
				{ language: 'Rust', lastCommitDate: null, isArchived: false },
			];

			const badges = getLanguageBadges(repos, 1);
			expect(badges.length).toBe(1);
			expect(badges[0].name).toBe('Rusty Rust');
		});
	});

	describe('getLanguageStats', () => {
		it('should calculate per-language abandonment stats', () => {
			const repos = [
				{ language: 'JavaScript', last_commit_date: null },
				{ language: 'JavaScript', last_commit_date: new Date().toISOString() },
				{ language: 'Python', last_commit_date: null },
			];

			const { stats, mostAbandoned } = getLanguageStats(repos, 1);
			expect(stats.length).toBe(2);

			const jsStats = stats.find(s => s.language === 'JavaScript');
			expect(jsStats.totalCount).toBe(2);
			expect(jsStats.abandonedCount).toBe(1);
		});

		it('should identify most abandoned language', () => {
			const repos = [
				{ language: 'JavaScript', last_commit_date: null },
				{ language: 'JavaScript', last_commit_date: null },
				{ language: 'Python', last_commit_date: null },
			];

			const { mostAbandoned } = getLanguageStats(repos, 1);
			expect(mostAbandoned).toBe('JavaScript');
		});

		it('should identify safest language', () => {
			const repos = [
				{ language: 'JavaScript', last_commit_date: null },
				{ language: 'Python', last_commit_date: new Date().toISOString() },
			];

			const { safest } = getLanguageStats(repos, 1);
			expect(safest).toBe('Python');
		});

		it('should return nulls for empty repos', () => {
			const { stats, mostAbandoned, safest } = getLanguageStats([], 1);
			expect(stats.length).toBe(0);
			expect(mostAbandoned).toBeNull();
			expect(safest).toBeNull();
		});

		it('should skip repos with no language', () => {
			const repos = [
				{ language: null, last_commit_date: null },
			];

			const { stats } = getLanguageStats(repos, 1);
			expect(stats.length).toBe(0);
		});
	});

	describe('LANGUAGE_BADGES', () => {
		it('should have badges for common languages', () => {
			expect(LANGUAGE_BADGES['JavaScript']).toBeDefined();
			expect(LANGUAGE_BADGES['Python']).toBeDefined();
			expect(LANGUAGE_BADGES['Rust']).toBeDefined();
			expect(LANGUAGE_BADGES['Go']).toBeDefined();
		});

		it('should have name, emoji, and description for each', () => {
			for (const [lang, badge] of Object.entries(LANGUAGE_BADGES)) {
				expect(badge.name).toBeDefined();
				expect(badge.emoji).toBeDefined();
				expect(badge.description).toBeDefined();
			}
		});
	});
});
