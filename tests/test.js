import { expect, test } from "@playwright/test";

test("home page has expected h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("landing page has title and sign-in CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Cemetery");
  await expect(page.locator("text=Sign in with GitHub").first()).toBeVisible();
});

test("landing page shows badge preview section", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator("text=Earn Badges of Dishonor").first(),
  ).toBeVisible();
});

test("landing page shows how it works section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=How It Works")).toBeVisible();
});

test("login page shows GitHub sign-in button", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("text=Sign in with GitHub").first()).toBeVisible();
});

test("login page shows privacy info cards", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("text=No analytics").first()).toBeVisible();
});

test("about page renders with title", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("h1")).toContainText("About");
});

test("about page shows privacy section", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("h2", { hasText: "Privacy" })).toBeVisible();
});

test("about page shows how it works steps", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("text=Sign in with GitHub")).toBeVisible();
  await expect(page.locator("text=Scan Your Repositories")).toBeVisible();
});

test("404 page renders for unknown routes", async ({ page }) => {
  await page.goto("/nonexistent-page-xyz");
  await expect(page.locator(".error-code")).toBeVisible();
  await expect(page.locator("text=This Page Was Abandoned")).toBeVisible();
});

test("404 page has navigation links", async ({ page }) => {
  await page.goto("/nonexistent-page-xyz");
  await expect(page.locator('a[href="/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();
});

test("dashboard redirects to login when not authenticated", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/);
  expect(page.url()).toContain("/login");
});

test("dashboard config redirects to login when not authenticated", async ({
  page,
}) => {
  await page.goto("/dashboard/config");
  await page.waitForURL(/\/login/);
  expect(page.url()).toContain("/login");
});

test("repositories API returns 401 when not authenticated", async ({
  request,
}) => {
  const response = await request.get("/api/repositories");
  expect(response.status()).toBe(401);
});

test("config API returns 401 when not authenticated", async ({ request }) => {
  const response = await request.get("/api/config");
  expect(response.status()).toBe(401);
});

test("public profile shows error for nonexistent slug", async ({ page }) => {
  await page.goto("/public/nonexistent-slug-12345");
  // Should show some kind of error or empty state
  const content = await page.textContent("body");
  const hasError =
    content.includes("not found") ||
    content.includes("404") ||
    content.includes("error") ||
    content.includes("Error") ||
    content.includes("No repositories");
  expect(hasError).toBe(true);
});

test("security headers are present", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
});

test("navigation between pages works", async ({ page }) => {
  await page.goto("/");
  // Click about link in navigation if visible
  const aboutLink = page.locator("nav").locator('a[href="/about"]');
  if (await aboutLink.isVisible()) {
    await aboutLink.click();
    await expect(page.locator("h1")).toContainText("About");
  }
});
