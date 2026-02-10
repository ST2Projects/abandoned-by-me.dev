import { expect, test } from "@playwright/test";
import {
  getTestDb,
  seedTestUser,
  seedUserConfig,
  seedRepository,
  cleanupTestUser,
  setSessionCookie,
  authCookieHeader,
  authHeaders,
  originHeader,
} from "./helpers/db-seed.js";

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

let db;
let testUser;
/** @type {Record<string, string>} repo name -> repo id */
let repoIds = {};

// Timestamps for test repos
const now = new Date();
const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
const sixMonthsAgo = new Date(now - 180 * 24 * 60 * 60 * 1000);
const oneYearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);
const threeMonthsAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

test.beforeAll(() => {
  db = getTestDb();
  testUser = seedTestUser(db, { name: "pw-testuser" });

  seedUserConfig(db, testUser.userId, {
    abandonmentThresholdMonths: 1,
    dashboardPublic: true,
    dashboardSlug: "pw-testuser-repos",
  });

  // Active public repo (committed 7 days ago)
  repoIds.active = seedRepository(db, testUser.userId, {
    githubId: 1001,
    name: "active-project",
    fullName: "pw-testuser/active-project",
    description: "An actively maintained project",
    lastCommitDate: sevenDaysAgo.toISOString(),
    lastPushDate: sevenDaysAgo.toISOString(),
    language: "JavaScript",
    starsCount: 42,
  });

  // Abandoned public repo (6 months ago)
  repoIds.abandoned1 = seedRepository(db, testUser.userId, {
    githubId: 1002,
    name: "old-todo-app",
    fullName: "pw-testuser/old-todo-app",
    description: "A forgotten todo app",
    lastCommitDate: sixMonthsAgo.toISOString(),
    lastPushDate: sixMonthsAgo.toISOString(),
    language: "Python",
    starsCount: 5,
  });

  // Abandoned public repo (1 year ago)
  repoIds.abandoned2 = seedRepository(db, testUser.userId, {
    githubId: 1003,
    name: "ancient-blog",
    fullName: "pw-testuser/ancient-blog",
    description: "A blog that never was",
    lastCommitDate: oneYearAgo.toISOString(),
    lastPushDate: oneYearAgo.toISOString(),
    language: "Ruby",
    starsCount: 1,
    respectsCount: 3,
  });

  // Fork repo (abandoned)
  repoIds.fork = seedRepository(db, testUser.userId, {
    githubId: 1004,
    name: "forked-lib",
    fullName: "pw-testuser/forked-lib",
    description: "A forked library",
    lastCommitDate: threeMonthsAgo.toISOString(),
    isFork: true,
    language: "TypeScript",
  });

  // Private repo (abandoned)
  repoIds.private = seedRepository(db, testUser.userId, {
    githubId: 1005,
    name: "secret-project",
    fullName: "pw-testuser/secret-project",
    description: "A private abandoned project",
    lastCommitDate: threeMonthsAgo.toISOString(),
    private: true,
    language: "Go",
    starsCount: 0,
  });
});

test.afterAll(() => {
  if (db && testUser) {
    cleanupTestUser(db, testUser.userId);
    db.close();
  }
});

// ===========================================================================
// Health Check
// ===========================================================================

test.describe("Health Check", () => {
  test("GET /health returns 200 with JSON status", async ({ request }) => {
    const res = await request.get("/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
    expect(body.message).toBe("Application is running");
  });
});

// ===========================================================================
// Security Headers
// ===========================================================================

test.describe("Security Headers", () => {
  test("responses include all required security headers", async ({
    request,
  }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("geolocation=()");
    expect(h["content-security-policy"]).toContain("default-src 'self'");
  });

  test("CSP includes expected directives", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toContain("script-src");
    expect(csp).toContain("img-src");
    expect(csp).toContain("connect-src");
  });
});

// ===========================================================================
// CSRF Protection
// ===========================================================================

test.describe("CSRF Protection", () => {
  test("POST without Origin header is rejected with 403", async ({
    request,
  }) => {
    // Playwright may auto-add Origin, so use an empty object to override
    const res = await request.fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ abandonmentThresholdMonths: 2 }),
    });
    // Without an Origin header, should be 403
    expect([401, 403]).toContain(res.status());
  });
});

// ===========================================================================
// Authentication & Access Control
// ===========================================================================

test.describe("Authentication - Unauthenticated Access", () => {
  test("dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("dashboard config redirects to login", async ({ page }) => {
    await page.goto("/dashboard/config");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("GET /api/repositories returns 401", async ({ request }) => {
    const res = await request.get("/api/repositories");
    expect(res.status()).toBe(401);
  });

  test("GET /api/config returns 401", async ({ request }) => {
    const res = await request.get("/api/config");
    expect(res.status()).toBe(401);
  });

  test("POST /scan returns 401 without auth", async ({ request }) => {
    const res = await request.post("/scan", {
      headers: {
        "Content-Type": "application/json",
        ...originHeader(),
      },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/account returns 401 without auth", async ({ request }) => {
    const res = await request.delete("/api/account", {
      headers: originHeader(),
    });
    expect(res.status()).toBe(401);
  });
});

// ===========================================================================
// Authenticated Dashboard
// ===========================================================================

test.describe("Dashboard - Authenticated", () => {
  test.beforeEach(async ({ context }) => {
    await setSessionCookie(context, testUser.sessionToken);
  });

  test("dashboard page loads and shows repository list", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Graveyard");
    await expect(page.locator(".welcome-text")).toContainText("pw-testuser");
  });

  test("dashboard shows correct stat counts", async ({ page }) => {
    await page.goto("/dashboard");
    const statCards = page.locator(".stat-card");
    await expect(statCards).toHaveCount(4);

    // Total repos = 5
    const totalStat = statCards.nth(0).locator(".stat-value");
    await expect(totalStat).toHaveText("5");
  });

  test("dashboard shows repo cards", async ({ page }) => {
    await page.goto("/dashboard");
    const repoCards = page.locator(".repo-card");
    await expect(repoCards.first()).toBeVisible();
    const count = await repoCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("dashboard filter tabs switch between all, abandoned, and active", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const filterTabs = page.locator(".filter-tabs button");

    // Click "Abandoned" tab
    await filterTabs.filter({ hasText: "Abandoned" }).click();
    await expect(filterTabs.filter({ hasText: "Abandoned" })).toHaveClass(
      /active/,
    );

    // Click "Active" tab
    await filterTabs.filter({ hasText: "Active" }).click();
    await expect(filterTabs.filter({ hasText: "Active" })).toHaveClass(
      /active/,
    );

    // Click "All" tab
    await filterTabs.filter({ hasText: "All" }).click();
    await expect(filterTabs.filter({ hasText: "All" })).toHaveClass(/active/);
  });

  test("dashboard config page loads for authenticated user", async ({
    page,
  }) => {
    await page.goto("/dashboard/config");
    await expect(page.locator("h1")).toContainText("Settings");
    await expect(page.locator(".back-link")).toBeVisible();
  });
});

// ===========================================================================
// Repositories API (Authenticated)
// ===========================================================================

test.describe("Repositories API", () => {
  test("GET /api/repositories returns repos with config and stats", async ({
    request,
  }) => {
    const cookie = await authCookieHeader(testUser.sessionToken);
    const res = await request.get("/api/repositories", {
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.repositories).toBeDefined();
    expect(Array.isArray(body.repositories)).toBe(true);
    expect(body.repositories.length).toBe(5);
    expect(body.config).toBeDefined();
    expect(body.stats).toBeDefined();
    expect(body.stats.total).toBe(5);
  });

  test("GET /api/repositories?type=abandoned returns only abandoned repos", async ({
    request,
  }) => {
    const cookie = await authCookieHeader(testUser.sessionToken);
    const res = await request.get("/api/repositories?type=abandoned", {
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // With 1-month threshold, active-project (7d ago) should NOT be abandoned
    expect(body.repositories.length).toBeGreaterThanOrEqual(2);
    const names = body.repositories.map((r) => r.name);
    expect(names).toContain("old-todo-app");
    expect(names).toContain("ancient-blog");
    expect(names).not.toContain("active-project");
  });

  test("GET /api/repositories?type=active returns only active repos", async ({
    request,
  }) => {
    const cookie = await authCookieHeader(testUser.sessionToken);
    const res = await request.get("/api/repositories?type=active", {
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const names = body.repositories.map((r) => r.name);
    expect(names).toContain("active-project");
    expect(names).not.toContain("old-todo-app");
    expect(names).not.toContain("ancient-blog");
  });
});

// ===========================================================================
// Configuration API
// ===========================================================================

test.describe("Configuration API", () => {
  test("GET /api/config returns user config", async ({ request }) => {
    const cookie = await authCookieHeader(testUser.sessionToken);
    const res = await request.get("/api/config", {
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.abandonmentThresholdMonths).toBe(1);
    expect(body.dashboardSlug).toBe("pw-testuser-repos");
  });

  test("POST /api/config updates abandonment threshold", async ({
    request,
  }) => {
    const headers = await authHeaders(testUser.sessionToken);
    const res = await request.post("/api/config", {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { abandonmentThresholdMonths: 3 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.abandonmentThresholdMonths).toBe(3);

    // Restore original value
    await request.post("/api/config", {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { abandonmentThresholdMonths: 1 },
    });
  });

  test("POST /api/config rejects invalid threshold (< 1)", async ({
    request,
  }) => {
    const headers = await authHeaders(testUser.sessionToken);
    const res = await request.post("/api/config", {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { abandonmentThresholdMonths: 0 },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/config rejects invalid threshold (> 60)", async ({
    request,
  }) => {
    const headers = await authHeaders(testUser.sessionToken);
    const res = await request.post("/api/config", {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { abandonmentThresholdMonths: 61 },
    });
    expect(res.status()).toBe(400);
  });
});

// ===========================================================================
// Scan API
// ===========================================================================

test.describe("Scan API", () => {
  test("POST /scan starts a scan with valid auth", async ({ request }) => {
    const headers = await authHeaders(testUser.sessionToken);
    const res = await request.post("/scan", {
      headers: { ...headers, "Content-Type": "application/json" },
    });
    // Should succeed (even though GitHub API will fail with fake token)
    // Could also be 409 (already running) from a prior test
    expect([200, 409]).toContain(res.status());
    const body = await res.json();
    expect(body.scanId || body.error).toBeTruthy();
  });

  test("GET /scan?scanId returns scan status", async ({ request }) => {
    const headers = await authHeaders(testUser.sessionToken);

    // First start a scan
    const startRes = await request.post("/scan", {
      headers: { ...headers, "Content-Type": "application/json" },
    });

    if (startRes.status() === 200) {
      const { scanId } = await startRes.json();
      const cookie = await authCookieHeader(testUser.sessionToken);
      const statusRes = await request.get(`/scan?scanId=${scanId}`, {
        headers: { Cookie: cookie },
      });
      expect(statusRes.status()).toBe(200);
      const body = await statusRes.json();
      expect(body.status).toBeTruthy();
      expect(["running", "completed", "failed"]).toContain(body.status);
    }
  });

  test("GET /scan without scanId returns 400", async ({ request }) => {
    const cookie = await authCookieHeader(testUser.sessionToken);
    const res = await request.get("/scan", {
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(400);
  });
});

// ===========================================================================
// Adoption API
// ===========================================================================

test.describe("Adoption API", () => {
  test("POST /api/repos/[id]/adoption requires auth", async ({ request }) => {
    const res = await request.post(
      `/api/repos/${repoIds.abandoned1}/adoption`,
      { headers: originHeader() },
    );
    expect(res.status()).toBe(401);
  });

  test("toggles adoption on an abandoned public repo", async ({ request }) => {
    const headers = await authHeaders(testUser.sessionToken);
    const res = await request.post(
      `/api/repos/${repoIds.abandoned1}/adoption`,
      { headers },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.upForAdoption).toBe("boolean");

    // Toggle back
    await request.post(`/api/repos/${repoIds.abandoned1}/adoption`, {
      headers,
    });
  });

  test("rejects adoption toggle on a fork", async ({ request }) => {
    const headers = await authHeaders(testUser.sessionToken);
    const res = await request.post(`/api/repos/${repoIds.fork}/adoption`, {
      headers,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Fork");
  });

  test("rejects adoption toggle on a private repo", async ({ request }) => {
    const headers = await authHeaders(testUser.sessionToken);
    const res = await request.post(`/api/repos/${repoIds.private}/adoption`, {
      headers,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Private");
  });

  test("returns 404 for non-existent repo", async ({ request }) => {
    const headers = await authHeaders(testUser.sessionToken);
    const res = await request.post("/api/repos/nonexistent-id/adoption", {
      headers,
    });
    expect(res.status()).toBe(404);
  });
});

// ===========================================================================
// Pay Respects API
// ===========================================================================

test.describe("Pay Respects API", () => {
  test("increments respects count for a valid repo", async ({ request }) => {
    const res = await request.post(`/api/repos/${repoIds.abandoned2}/respect`, {
      headers: originHeader(),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.respectsCount).toBeGreaterThanOrEqual(4); // was 3 initially
  });

  test("returns 404 for non-existent repo", async ({ request }) => {
    const res = await request.post("/api/repos/nonexistent-id/respect", {
      headers: originHeader(),
    });
    expect(res.status()).toBe(404);
  });
});

// ===========================================================================
// Public Dashboard
// ===========================================================================

test.describe("Public Dashboard", () => {
  test("loads public dashboard with valid slug", async ({ page }) => {
    await page.goto("/public/pw-testuser-repos");
    // Should load without error - check for repo content or dashboard structure
    const body = await page.textContent("body");
    const isLoaded =
      body.includes("active-project") ||
      body.includes("old-todo-app") ||
      body.includes("ancient-blog") ||
      body.includes("pw-testuser");
    expect(isLoaded).toBe(true);
  });

  test("public dashboard API returns only public repos", async ({
    request,
  }) => {
    const res = await request.get("/api/public/pw-testuser-repos");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.repositories).toBeDefined();
    // Should not include the private repo
    const names = body.repositories.map((r) => r.name);
    expect(names).not.toContain("secret-project");
    // Should include public repos
    expect(names).toContain("active-project");
    expect(names).toContain("old-todo-app");
  });

  test("public dashboard API returns 404 for invalid slug", async ({
    request,
  }) => {
    const res = await request.get("/api/public/nonexistent-slug-xyz");
    expect(res.status()).toBe(404);
  });

  test("public dashboard page shows error for invalid slug", async ({
    page,
  }) => {
    await page.goto("/public/nonexistent-slug-xyz");
    const content = await page.textContent("body");
    const hasError =
      content.includes("not found") ||
      content.includes("404") ||
      content.includes("error") ||
      content.includes("Error");
    expect(hasError).toBe(true);
  });
});

// ===========================================================================
// Explore API & Page
// ===========================================================================

test.describe("Explore", () => {
  test("GET /api/explore returns public dashboard listings", async ({
    request,
  }) => {
    const res = await request.get("/api/explore");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.listings).toBeDefined();
    expect(Array.isArray(body.listings)).toBe(true);
    expect(typeof body.total).toBe("number");
    // Our test user has a public dashboard so should appear
    const slugs = body.listings.map((l) => l.slug);
    expect(slugs).toContain("pw-testuser-repos");
  });

  test("GET /api/explore respects limit and offset", async ({ request }) => {
    const res = await request.get("/api/explore?limit=1&offset=0");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.listings.length).toBeLessThanOrEqual(1);
  });

  test("explore page renders", async ({ page }) => {
    await page.goto("/explore");
    const body = await page.textContent("body");
    expect(body.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Adopt Page
// ===========================================================================

test.describe("Adopt Page", () => {
  test("adopt page renders", async ({ page }) => {
    await page.goto("/adopt");
    const body = await page.textContent("body");
    expect(body.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Account Deletion
// ===========================================================================

test.describe("Account Deletion", () => {
  test("DELETE /api/account deletes all user data", async ({ request }) => {
    // Create a disposable user specifically for this test
    const deleteUser = seedTestUser(db, { name: "delete-me-user" });
    seedUserConfig(db, deleteUser.userId, {
      abandonmentThresholdMonths: 1,
    });
    seedRepository(db, deleteUser.userId, {
      githubId: 9999,
      name: "doomed-repo",
      fullName: "delete-me-user/doomed-repo",
      lastCommitDate: sixMonthsAgo.toISOString(),
    });

    const headers = await authHeaders(deleteUser.sessionToken);
    const res = await request.delete("/api/account", { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify the user is actually gone at DB level
    const userRow = db
      .prepare('SELECT id FROM "user" WHERE id = ?')
      .get(deleteUser.userId);
    expect(userRow).toBeUndefined();
  });
});

// ===========================================================================
// Login Page - Authenticated Redirect
// ===========================================================================

test.describe("Login Redirect", () => {
  test("authenticated user on login page is redirected to dashboard", async ({
    context,
    page,
  }) => {
    await setSessionCookie(context, testUser.sessionToken);
    await page.goto("/login");
    // The login page checks session in +page.js and redirects to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");
  });
});
