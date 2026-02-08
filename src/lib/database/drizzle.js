import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { building } from '$app/environment';
import * as schema from './schema.js';

const dbPath = process.env.DATABASE_URL || './data/app.db';

// Only create real DB connection if not in build mode
const isBuilding = building;

let db;
let sqlite;

if (!isBuilding) {
	// Ensure directory exists
	try { mkdirSync(dirname(dbPath), { recursive: true }); } catch {}

	sqlite = new Database(dbPath);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	// Create better-auth required tables if they don't exist.
	// These tables are managed by better-auth for authentication state.
	const createTablesSql = `
		CREATE TABLE IF NOT EXISTS "user" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"name" TEXT NOT NULL,
			"email" TEXT NOT NULL UNIQUE,
			"emailVerified" INTEGER NOT NULL DEFAULT 0,
			"image" TEXT,
			"createdAt" INTEGER NOT NULL,
			"updatedAt" INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "session" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"expiresAt" INTEGER NOT NULL,
			"token" TEXT NOT NULL UNIQUE,
			"createdAt" INTEGER NOT NULL,
			"updatedAt" INTEGER NOT NULL,
			"ipAddress" TEXT,
			"userAgent" TEXT,
			"userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS "account" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"accountId" TEXT NOT NULL,
			"providerId" TEXT NOT NULL,
			"userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"accessToken" TEXT,
			"refreshToken" TEXT,
			"idToken" TEXT,
			"accessTokenExpiresAt" INTEGER,
			"refreshTokenExpiresAt" INTEGER,
			"scope" TEXT,
			"password" TEXT,
			"createdAt" INTEGER NOT NULL,
			"updatedAt" INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "verification" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"identifier" TEXT NOT NULL,
			"value" TEXT NOT NULL,
			"expiresAt" INTEGER NOT NULL,
			"createdAt" INTEGER NOT NULL,
			"updatedAt" INTEGER NOT NULL
		);
	`;
	sqlite.exec(createTablesSql);

	// Auto-create application tables if they don't exist.
	// These are NOT managed by better-auth — they store app-specific data.
	const createAppTablesSql = `
		CREATE TABLE IF NOT EXISTS "user_configs" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"user_id" TEXT NOT NULL,
			"abandonment_threshold_months" INTEGER NOT NULL DEFAULT 1,
			"dashboard_public" INTEGER NOT NULL DEFAULT 0,
			"dashboard_slug" TEXT UNIQUE,
			"scan_private_repos" INTEGER NOT NULL DEFAULT 0,
			"auto_refresh" INTEGER NOT NULL DEFAULT 0,
			"created_at" INTEGER NOT NULL,
			"updated_at" INTEGER NOT NULL
		);

		CREATE UNIQUE INDEX IF NOT EXISTS "user_configs_user_id_unique" ON "user_configs" ("user_id");
		CREATE INDEX IF NOT EXISTS "idx_user_configs_dashboard_slug" ON "user_configs" ("dashboard_slug");

		CREATE TABLE IF NOT EXISTS "repositories" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"user_id" TEXT NOT NULL,
			"github_id" INTEGER NOT NULL,
			"name" TEXT NOT NULL,
			"full_name" TEXT NOT NULL,
			"description" TEXT,
			"private" INTEGER NOT NULL DEFAULT 0,
			"html_url" TEXT NOT NULL,
			"clone_url" TEXT,
			"last_commit_date" INTEGER,
			"last_push_date" INTEGER,
			"is_fork" INTEGER NOT NULL DEFAULT 0,
			"is_archived" INTEGER NOT NULL DEFAULT 0,
			"default_branch" TEXT NOT NULL DEFAULT 'main',
			"language" TEXT,
			"stars_count" INTEGER NOT NULL DEFAULT 0,
			"forks_count" INTEGER NOT NULL DEFAULT 0,
			"open_issues_count" INTEGER NOT NULL DEFAULT 0,
			"size_kb" INTEGER NOT NULL DEFAULT 0,
			"respects_count" INTEGER NOT NULL DEFAULT 0,
			"up_for_adoption" INTEGER NOT NULL DEFAULT 0,
			"created_at" INTEGER NOT NULL,
			"updated_at" INTEGER NOT NULL,
			"last_scanned_at" INTEGER NOT NULL
		);

		CREATE UNIQUE INDEX IF NOT EXISTS "repositories_user_id_github_id_unique" ON "repositories" ("user_id", "github_id");
		CREATE INDEX IF NOT EXISTS "idx_repositories_user_id" ON "repositories" ("user_id");
		CREATE INDEX IF NOT EXISTS "idx_repositories_last_commit_date" ON "repositories" ("last_commit_date");
		CREATE INDEX IF NOT EXISTS "idx_repositories_github_id" ON "repositories" ("github_id");

		CREATE TABLE IF NOT EXISTS "scan_history" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"user_id" TEXT NOT NULL,
			"scan_started_at" INTEGER NOT NULL,
			"scan_completed_at" INTEGER,
			"repos_scanned" INTEGER NOT NULL DEFAULT 0,
			"repos_added" INTEGER NOT NULL DEFAULT 0,
			"repos_updated" INTEGER NOT NULL DEFAULT 0,
			"errors_count" INTEGER NOT NULL DEFAULT 0,
			"error_details" TEXT,
			"status" TEXT NOT NULL DEFAULT 'running',
			"created_at" INTEGER NOT NULL
		);

		CREATE INDEX IF NOT EXISTS "idx_scan_history_user_id" ON "scan_history" ("user_id");
		CREATE INDEX IF NOT EXISTS "idx_scan_history_created_at" ON "scan_history" ("created_at");
	`;
	sqlite.exec(createAppTablesSql);

	// Add auto_refresh column for existing databases that already have the table
	try {
		sqlite.exec("ALTER TABLE user_configs ADD COLUMN auto_refresh INTEGER NOT NULL DEFAULT 0");
	} catch {
		// Column already exists — safe to ignore
	}

	db = drizzle(sqlite, { schema });
} else {
	// During build, create a placeholder that will throw meaningful errors
	db = new Proxy({}, {
		get() {
			throw new Error('Database connection not available during build process');
		}
	});
}

// Export database instance and raw sqlite connection
export { db, sqlite };

// Export schema for use in other modules
export * from './schema.js';
