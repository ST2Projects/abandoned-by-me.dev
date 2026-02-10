import Database from "better-sqlite3";
import { randomUUID, webcrypto } from "crypto";

const DB_PATH = process.env.DATABASE_URL || "./data/app.db";
const AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "test-secret-for-playwright";
const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:4173";

/**
 * Opens a connection to the test database.
 * The app auto-creates tables on startup, so we just connect.
 */
export function getTestDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

/**
 * Signs a session token the same way better-call does (HMAC-SHA-256, standard base64).
 * Replicates makeSignature from better-call/dist/crypto.mjs.
 * The cookie value is: `<rawToken>.<base64Signature>`
 */
export async function signSessionToken(rawToken) {
  const subtle = webcrypto.subtle;
  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const secretBuf = new TextEncoder().encode(AUTH_SECRET);
  const key = await subtle.importKey("raw", secretBuf, algorithm, false, [
    "sign",
  ]);
  const signatureBuffer = await subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawToken),
  );
  const signature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  );
  return `${rawToken}.${signature}`;
}

/**
 * Seeds a test user with session and GitHub account.
 * Returns identifiers needed for authenticated testing.
 */
export function seedTestUser(db, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const userId = overrides.userId || randomUUID();
  const sessionToken = overrides.sessionToken || randomUUID();
  const sessionId = randomUUID();
  const accountId = randomUUID();

  db.prepare(
    `INSERT INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    overrides.name || "testuser",
    overrides.email || `test-${userId}@example.com`,
    0,
    overrides.image || null,
    now,
    now,
  );

  // Session expires in 7 days
  const expiresAt = now + 7 * 24 * 60 * 60;
  db.prepare(
    `INSERT INTO "session" (id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    expiresAt,
    sessionToken,
    now,
    now,
    "127.0.0.1",
    "Playwright Test",
    userId,
  );

  db.prepare(
    `INSERT INTO "account" (id, accountId, providerId, userId, accessToken, scope, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    accountId,
    overrides.githubAccountId || "12345",
    "github",
    userId,
    overrides.accessToken || "gho_fake_test_token_" + randomUUID(),
    "read:user,repo",
    now,
    now,
  );

  return {
    userId,
    sessionToken,
    sessionId,
    accountId,
    name: overrides.name || "testuser",
    email: overrides.email || `test-${userId}@example.com`,
  };
}

/**
 * Seeds a user_configs row for the given user.
 */
export function seedUserConfig(db, userId, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const configId = randomUUID();

  db.prepare(
    `INSERT INTO "user_configs" (id, user_id, abandonment_threshold_months, dashboard_public, dashboard_slug, scan_private_repos, auto_refresh, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    configId,
    userId,
    overrides.abandonmentThresholdMonths ?? 1,
    overrides.dashboardPublic ? 1 : 0,
    overrides.dashboardSlug || null,
    overrides.scanPrivateRepos ? 1 : 0,
    overrides.autoRefresh ? 1 : 0,
    now,
    now,
  );

  return { configId };
}

/**
 * Seeds a repository for the given user.
 * Timestamps (lastCommitDate, lastPushDate) should be ISO strings or Date-compatible values.
 */
export function seedRepository(db, userId, repoData) {
  const now = Math.floor(Date.now() / 1000);
  const repoId = repoData.id || randomUUID();

  db.prepare(
    `INSERT INTO "repositories" (id, user_id, github_id, name, full_name, description, private, html_url, clone_url, last_commit_date, last_push_date, is_fork, is_archived, default_branch, language, stars_count, forks_count, open_issues_count, size_kb, respects_count, up_for_adoption, created_at, updated_at, last_scanned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    repoId,
    userId,
    repoData.githubId,
    repoData.name,
    repoData.fullName || `testuser/${repoData.name}`,
    repoData.description || null,
    repoData.private ? 1 : 0,
    repoData.htmlUrl || `https://github.com/testuser/${repoData.name}`,
    repoData.cloneUrl || null,
    repoData.lastCommitDate
      ? Math.floor(new Date(repoData.lastCommitDate).getTime() / 1000)
      : null,
    repoData.lastPushDate
      ? Math.floor(new Date(repoData.lastPushDate).getTime() / 1000)
      : null,
    repoData.isFork ? 1 : 0,
    repoData.isArchived ? 1 : 0,
    repoData.defaultBranch || "main",
    repoData.language || null,
    repoData.starsCount || 0,
    repoData.forksCount || 0,
    repoData.openIssuesCount || 0,
    repoData.sizeKb || 0,
    repoData.respectsCount || 0,
    repoData.upForAdoption ? 1 : 0,
    now,
    now,
    now,
  );

  return repoId;
}

/**
 * Removes all data associated with a test user (in correct FK order).
 */
export function cleanupTestUser(db, userId) {
  const cleanup = db.transaction(() => {
    db.prepare('DELETE FROM "repositories" WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM "user_configs" WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM "scan_history" WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM "session" WHERE "userId" = ?').run(userId);
    db.prepare('DELETE FROM "account" WHERE "userId" = ?').run(userId);
    db.prepare('DELETE FROM "user" WHERE id = ?').run(userId);
  });
  cleanup();
}

/**
 * Sets the better-auth signed session cookie on a Playwright browser context.
 */
export async function setSessionCookie(context, rawToken) {
  const signedValue = await signSessionToken(rawToken);
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: signedValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}

/**
 * Returns a Cookie header string with signed token for API-level requests.
 */
export async function authCookieHeader(rawToken) {
  const signedValue = await signSessionToken(rawToken);
  return `better-auth.session_token=${signedValue}`;
}

/**
 * Returns common headers needed for authenticated POST/DELETE/PATCH requests.
 * Includes the signed session cookie AND the Origin header for CSRF validation.
 */
export async function authHeaders(rawToken) {
  return {
    Cookie: await authCookieHeader(rawToken),
    Origin: BASE_URL,
  };
}

/**
 * Returns the Origin header for CSRF validation on anonymous POST requests.
 */
export function originHeader() {
  return { Origin: BASE_URL };
}
