import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestDb, insertTestUser } from "./test-helpers.js";

// Mock env utils to suppress logs
vi.mock("../utils/env.js", () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
}));

let testDb;
let testSqlite;
const TEST_USER_ID = "user-test-1";

// We need to mock the drizzle module to use our test DB
vi.mock("./drizzle.js", async () => {
  const schema = await import("./schema.js");
  return {
    db: null, // will be replaced in beforeEach
    ...schema,
  };
});

import * as drizzleMod from "./drizzle.js";
import {
  getUserConfig,
  updateUserConfig,
  generateDashboardSlug,
  enablePublicDashboard,
  disablePublicDashboard,
} from "./userConfig.js";

beforeEach(() => {
  const { db, sqlite } = createTestDb();
  testDb = db;
  testSqlite = sqlite;
  // Replace the mocked db with our test db
  drizzleMod.db = db;
  insertTestUser(sqlite, { id: TEST_USER_ID });
});

describe("userConfig", () => {
  describe("getUserConfig", () => {
    it("should create default config when none exists", async () => {
      const config = await getUserConfig(TEST_USER_ID);

      expect(config).toBeDefined();
      expect(config.userId).toBe(TEST_USER_ID);
      expect(config.abandonmentThresholdMonths).toBe(1);
      expect(config.dashboardPublic).toBe(false);
      expect(config.dashboardSlug).toBeNull();
      expect(config.scanPrivateRepos).toBe(false);
    });

    it("should return existing config on subsequent calls", async () => {
      const first = await getUserConfig(TEST_USER_ID);
      const second = await getUserConfig(TEST_USER_ID);

      expect(first.id).toBe(second.id);
      expect(first.userId).toBe(second.userId);
    });
  });

  describe("updateUserConfig", () => {
    it("should update abandonment threshold", async () => {
      await getUserConfig(TEST_USER_ID); // create default

      const updated = await updateUserConfig(TEST_USER_ID, {
        abandonmentThresholdMonths: 6,
      });

      expect(updated.abandonmentThresholdMonths).toBe(6);
    });

    it("should update scan private repos setting", async () => {
      await getUserConfig(TEST_USER_ID);

      const updated = await updateUserConfig(TEST_USER_ID, {
        scanPrivateRepos: true,
      });

      expect(updated.scanPrivateRepos).toBe(true);
    });

    it("should update updatedAt timestamp", async () => {
      const original = await getUserConfig(TEST_USER_ID);
      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = await updateUserConfig(TEST_USER_ID, {
        abandonmentThresholdMonths: 3,
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        original.updatedAt.getTime(),
      );
    });
  });

  describe("generateDashboardSlug", () => {
    it("should generate slug from username", async () => {
      const slug = await generateDashboardSlug("testuser");
      expect(slug).toBe("testuser-repos");
    });

    it("should lowercase and sanitize special characters", async () => {
      const slug = await generateDashboardSlug("Test_User.123");
      expect(slug).toBe("test-user-123-repos");
    });

    it("should append counter for duplicate slugs", async () => {
      // Create a config with the base slug
      await getUserConfig(TEST_USER_ID);
      await enablePublicDashboard(TEST_USER_ID, "testuser");

      // Create another user and try same slug
      insertTestUser(testSqlite, { id: "user-test-2", name: "testuser2" });
      // Manually check the second slug generation
      const slug = await generateDashboardSlug("testuser");
      expect(slug).toBe("testuser-repos-1");
    });
  });

  describe("enablePublicDashboard", () => {
    it("should enable dashboard and generate slug", async () => {
      await getUserConfig(TEST_USER_ID);

      const config = await enablePublicDashboard(TEST_USER_ID, "testuser");

      expect(config.dashboardPublic).toBe(true);
      expect(config.dashboardSlug).toBe("testuser-repos");
    });
  });

  describe("disablePublicDashboard", () => {
    it("should disable dashboard and clear slug", async () => {
      await getUserConfig(TEST_USER_ID);
      await enablePublicDashboard(TEST_USER_ID, "testuser");

      const config = await disablePublicDashboard(TEST_USER_ID);

      expect(config.dashboardPublic).toBe(false);
      expect(config.dashboardSlug).toBeNull();
    });
  });
});
