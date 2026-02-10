import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted runs at the top level before any vi.mock factories,
// so these variables are available inside the mock factory.
const { pinoMockFns } = vi.hoisted(() => {
  const pinoMockFns = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
  return { pinoMockFns };
});

// We need to mock $app/environment since it's a SvelteKit virtual module
vi.mock("$app/environment", () => ({
  dev: true,
}));

vi.mock("pino", () => {
  const mockPino = vi.fn(() => pinoMockFns);
  mockPino.transport = vi.fn(() => ({}));
  mockPino.stdTimeFunctions = {
    isoTime: () => ',"time":"2024-01-15T10:30:00.000Z"',
  };
  return { default: mockPino };
});

import {
  debugLog,
  errorLog,
  accessLog,
  appLog,
  validateEnvironment,
} from "./env.js";

describe("env utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("debugLog", () => {
    it("should call logger.debug with tag and message in dev mode", () => {
      debugLog("test message", { key: "value" });

      expect(pinoMockFns.debug).toHaveBeenCalledTimes(1);
      expect(pinoMockFns.debug).toHaveBeenCalledWith(
        { tag: "APP", data: { key: "value" } },
        "test message",
      );
    });

    it("should handle undefined data parameter", () => {
      debugLog("test message");

      expect(pinoMockFns.debug).toHaveBeenCalledTimes(1);
      expect(pinoMockFns.debug).toHaveBeenCalledWith(
        { tag: "APP" },
        "test message",
      );
    });
  });

  describe("errorLog", () => {
    it("should log Error instances with message only (no stack trace)", () => {
      const error = new Error("test error");

      errorLog("something failed", error);

      expect(pinoMockFns.error).toHaveBeenCalledTimes(1);
      expect(pinoMockFns.error).toHaveBeenCalledWith(
        { tag: "APP", err: { message: "test error" } },
        "something failed",
      );
    });

    it("should handle string error data", () => {
      errorLog("oops", "string detail");

      expect(pinoMockFns.error).toHaveBeenCalledWith(
        { tag: "APP", detail: "string detail" },
        "oops",
      );
    });

    it("should handle missing error parameter", () => {
      errorLog("oops");

      expect(pinoMockFns.error).toHaveBeenCalledWith({ tag: "APP" }, "oops");
    });
  });

  describe("accessLog", () => {
    it("should log with INFO level and ACCESS tag", () => {
      accessLog("GET", "/health", 200, 5);

      expect(pinoMockFns.info).toHaveBeenCalledTimes(1);
      expect(pinoMockFns.info).toHaveBeenCalledWith(
        {
          tag: "ACCESS",
          method: "GET",
          pathname: "/health",
          status: 200,
          durationMs: 5,
        },
        "GET /health 200 5ms",
      );
    });

    it("should include client IP when provided", () => {
      accessLog("POST", "/api/scan", 200, 120, "192.168.1.1");

      expect(pinoMockFns.info).toHaveBeenCalledWith(
        {
          tag: "ACCESS",
          method: "POST",
          pathname: "/api/scan",
          status: 200,
          durationMs: 120,
          clientIp: "192.168.1.1",
        },
        "POST /api/scan 200 120ms 192.168.1.1",
      );
    });
  });

  describe("appLog", () => {
    it("should log with INFO level and custom tag", () => {
      appLog("AUTH", "User logged in");

      expect(pinoMockFns.info).toHaveBeenCalledWith(
        { tag: "AUTH" },
        "User logged in",
      );
    });

    it("should work with different tags", () => {
      appLog("SCAN", "Scan started");
      appLog("JOB", "Refresh complete");

      expect(pinoMockFns.info).toHaveBeenCalledTimes(2);
      expect(pinoMockFns.info).toHaveBeenCalledWith(
        { tag: "SCAN" },
        "Scan started",
      );
      expect(pinoMockFns.info).toHaveBeenCalledWith(
        { tag: "JOB" },
        "Refresh complete",
      );
    });
  });

  describe("validateEnvironment", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should not throw when all required vars are present", () => {
      process.env.TEST_VAR_1 = "value1";
      process.env.TEST_VAR_2 = "value2";

      expect(() =>
        validateEnvironment(["TEST_VAR_1", "TEST_VAR_2"]),
      ).not.toThrow();
    });

    it("should throw when required vars are missing", () => {
      expect(() => validateEnvironment(["MISSING_VAR"])).toThrow(
        "Missing required environment variables: MISSING_VAR",
      );
    });

    it("should list all missing vars in the error message", () => {
      expect(() => validateEnvironment(["MISSING_A", "MISSING_B"])).toThrow(
        "Missing required environment variables: MISSING_A, MISSING_B",
      );
    });

    it("should handle empty array of required vars", () => {
      expect(() => validateEnvironment([])).not.toThrow();
    });
  });
});
