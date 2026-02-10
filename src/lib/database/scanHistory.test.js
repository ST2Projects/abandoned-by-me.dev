import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestDb, insertTestUser } from "./test-helpers.js";

vi.mock("../utils/env.js", () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
}));

let testDb;
let testSqlite;
const TEST_USER_ID = "user-scan-1";

vi.mock("./drizzle.js", async () => {
  const schema = await import("./schema.js");
  return {
    db: null,
    ...schema,
  };
});

import * as drizzleMod from "./drizzle.js";
import {
  startScan,
  completeScan,
  failScan,
  getLatestScan,
  getRunningScan,
} from "./scanHistory.js";

beforeEach(() => {
  const { db, sqlite } = createTestDb();
  testDb = db;
  testSqlite = sqlite;
  drizzleMod.db = db;
  insertTestUser(sqlite, { id: TEST_USER_ID });
});

describe("scanHistory", () => {
  describe("startScan", () => {
    it("should create a scan with running status", async () => {
      const scan = await startScan(TEST_USER_ID);

      expect(scan).toBeDefined();
      expect(scan.id).toBeDefined();
      expect(scan.userId).toBe(TEST_USER_ID);
      expect(scan.status).toBe("running");
      expect(scan.reposScanned).toBe(0);
    });

    it("should set scanStartedAt", async () => {
      const before = new Date();
      const scan = await startScan(TEST_USER_ID);

      expect(scan.scanStartedAt).toBeDefined();
      expect(scan.scanStartedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000,
      );
    });
  });

  describe("completeScan", () => {
    it("should mark scan as completed with results", async () => {
      const scan = await startScan(TEST_USER_ID);

      const completed = await completeScan(scan.id, {
        reposScanned: 20,
        reposAdded: 15,
        reposUpdated: 5,
      });

      expect(completed.status).toBe("completed");
      expect(completed.reposScanned).toBe(20);
      expect(completed.reposAdded).toBe(15);
      expect(completed.reposUpdated).toBe(5);
      expect(completed.scanCompletedAt).toBeDefined();
    });
  });

  describe("failScan", () => {
    it("should mark scan as failed with error details", async () => {
      const scan = await startScan(TEST_USER_ID);
      const testError = new Error("GitHub API rate limited");

      const failed = await failScan(scan.id, testError);

      expect(failed.status).toBe("failed");
      expect(failed.errorsCount).toBe(1);
      expect(failed.errorDetails).toBeDefined();
      expect(failed.errorDetails.message).toBe("GitHub API rate limited");
      expect(failed.scanCompletedAt).toBeDefined();
    });

    it("should include partial results when provided", async () => {
      const scan = await startScan(TEST_USER_ID);

      const failed = await failScan(scan.id, new Error("Partial failure"), {
        reposScanned: 10,
        reposAdded: 5,
      });

      expect(failed.reposScanned).toBe(10);
      expect(failed.reposAdded).toBe(5);
    });
  });

  describe("getLatestScan", () => {
    it("should return null when no scans exist", async () => {
      const latest = await getLatestScan(TEST_USER_ID);
      expect(latest).toBeNull();
    });

    it("should return the most recent scan", async () => {
      const scan1 = await startScan(TEST_USER_ID);
      await completeScan(scan1.id, {
        reposScanned: 5,
        reposAdded: 5,
        reposUpdated: 0,
      });

      // SQLite timestamp mode stores seconds, need >1s gap for ordering
      await new Promise((r) => setTimeout(r, 1100));

      const scan2 = await startScan(TEST_USER_ID);

      const latest = await getLatestScan(TEST_USER_ID);
      expect(latest.id).toBe(scan2.id);
    });
  });

  describe("getRunningScan", () => {
    it("should return null when no scans are running", async () => {
      const running = await getRunningScan(TEST_USER_ID);
      expect(running).toBeNull();
    });

    it("should return running scan", async () => {
      const scan = await startScan(TEST_USER_ID);

      const running = await getRunningScan(TEST_USER_ID);
      expect(running).not.toBeNull();
      expect(running.id).toBe(scan.id);
      expect(running.status).toBe("running");
    });

    it("should return null after scan is completed", async () => {
      const scan = await startScan(TEST_USER_ID);
      await completeScan(scan.id, {
        reposScanned: 5,
        reposAdded: 5,
        reposUpdated: 0,
      });

      const running = await getRunningScan(TEST_USER_ID);
      expect(running).toBeNull();
    });
  });
});
