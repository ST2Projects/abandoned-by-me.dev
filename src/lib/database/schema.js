import { pgTable, text, uuid, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enum for scan status
export const scanStatusEnum = pgEnum('scan_status', ['running', 'completed', 'failed']);

// Users table
export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	username: text('username').unique().notNull(),
	accessToken: text('access_token').notNull(),
	refreshToken: text('refresh_token'),
	accessTokenExpiresIn: text('access_token_expires_in'),
	refreshTokenExpiresIn: text('refresh_token_expires_in'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// User configurations table
export const userConfigs = pgTable('user_configs', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	abandonmentThresholdMonths: integer('abandonment_threshold_months').default(6).notNull(),
	dashboardPublic: boolean('dashboard_public').default(false).notNull(),
	dashboardSlug: text('dashboard_slug').unique(),
	scanPrivateRepos: boolean('scan_private_repos').default(false).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
	return {
		userIdUnique: uniqueIndex('user_configs_user_id_unique').on(table.userId),
		dashboardSlugIdx: index('idx_user_configs_dashboard_slug').on(table.dashboardSlug),
	};
});

// Repositories table
export const repositories = pgTable('repositories', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	githubId: integer('github_id').notNull(),
	name: text('name').notNull(),
	fullName: text('full_name').notNull(),
	description: text('description'),
	private: boolean('private').default(false).notNull(),
	htmlUrl: text('html_url').notNull(),
	cloneUrl: text('clone_url'),
	lastCommitDate: timestamp('last_commit_date', { withTimezone: true }),
	lastPushDate: timestamp('last_push_date', { withTimezone: true }),
	isFork: boolean('is_fork').default(false).notNull(),
	isArchived: boolean('is_archived').default(false).notNull(),
	defaultBranch: text('default_branch').default('main').notNull(),
	language: text('language'),
	starsCount: integer('stars_count').default(0).notNull(),
	forksCount: integer('forks_count').default(0).notNull(),
	openIssuesCount: integer('open_issues_count').default(0).notNull(),
	sizeKb: integer('size_kb').default(0).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	lastScannedAt: timestamp('last_scanned_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
	return {
		userGithubUnique: uniqueIndex('repositories_user_id_github_id_unique').on(table.userId, table.githubId),
		userIdIdx: index('idx_repositories_user_id').on(table.userId),
		lastCommitDateIdx: index('idx_repositories_last_commit_date').on(table.lastCommitDate),
		githubIdIdx: index('idx_repositories_github_id').on(table.githubId),
	};
});

// Scan history table
export const scanHistory = pgTable('scan_history', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	scanStartedAt: timestamp('scan_started_at', { withTimezone: true }).defaultNow().notNull(),
	scanCompletedAt: timestamp('scan_completed_at', { withTimezone: true }),
	reposScanned: integer('repos_scanned').default(0).notNull(),
	reposAdded: integer('repos_added').default(0).notNull(),
	reposUpdated: integer('repos_updated').default(0).notNull(),
	errorsCount: integer('errors_count').default(0).notNull(),
	errorDetails: jsonb('error_details'),
	status: scanStatusEnum('status').default('running').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
	return {
		userIdIdx: index('idx_scan_history_user_id').on(table.userId),
		createdAtIdx: index('idx_scan_history_created_at').on(table.createdAt),
	};
});