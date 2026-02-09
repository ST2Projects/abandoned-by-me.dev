import { describe, it, expect, vi } from "vitest";
import { isRepositoryAbandoned, analyzeRepositories } from "./analyzer.js";

vi.mock("../utils/env.js", () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
}));

describe("analyzer", () => {
  describe("isRepositoryAbandoned", () => {
    it("should return false for archived repos", () => {
      const repo = {
        is_archived: true,
        last_commit_date: "2020-01-01T00:00:00Z",
      };
      expect(isRepositoryAbandoned(repo, 1)).toBe(false);
    });

    it("should return true for repos with no commit or push date", () => {
      const repo = {
        is_archived: false,
        last_commit_date: null,
        last_push_date: null,
      };
      expect(isRepositoryAbandoned(repo, 1)).toBe(true);
    });

    it("should return true for repos older than threshold", () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 6);

      const repo = {
        is_archived: false,
        last_commit_date: oldDate.toISOString(),
        last_push_date: null,
      };
      expect(isRepositoryAbandoned(repo, 1)).toBe(true);
    });

    it("should return false for recently active repos", () => {
      const repo = {
        is_archived: false,
        last_commit_date: new Date().toISOString(),
        last_push_date: null,
      };
      expect(isRepositoryAbandoned(repo, 1)).toBe(false);
    });

    it("should use last_push_date as fallback when no commit date", () => {
      const recentDate = new Date();
      const repo = {
        is_archived: false,
        last_commit_date: null,
        last_push_date: recentDate.toISOString(),
      };
      expect(isRepositoryAbandoned(repo, 1)).toBe(false);
    });

    it("should use default threshold of 1 month", () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const repo = {
        is_archived: false,
        last_commit_date: twoWeeksAgo.toISOString(),
      };
      expect(isRepositoryAbandoned(repo)).toBe(false);
    });

    it("should consider different thresholds correctly", () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const repo = {
        is_archived: false,
        last_commit_date: threeMonthsAgo.toISOString(),
      };

      expect(isRepositoryAbandoned(repo, 6)).toBe(false); // 6 months threshold — not abandoned
      expect(isRepositoryAbandoned(repo, 1)).toBe(true); // 1 month threshold — abandoned
    });
  });

  describe("analyzeRepositories", () => {
    it("should transform GitHub API format to internal format", async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          data: [{ commit: { committer: { date: "2025-01-15T00:00:00Z" } } }],
        }),
      };

      const repos = [
        {
          id: 12345,
          name: "test-repo",
          full_name: "user/test-repo",
          description: "A test",
          private: false,
          html_url: "https://github.com/user/test-repo",
          clone_url: "https://github.com/user/test-repo.git",
          pushed_at: "2025-01-15T00:00:00Z",
          fork: false,
          archived: false,
          default_branch: "main",
          language: "JavaScript",
          stargazers_count: 10,
          forks_count: 2,
          open_issues_count: 3,
          size: 512,
          owner: { login: "user" },
        },
      ];

      const result = await analyzeRepositories(mockClient, repos);

      expect(result).toHaveLength(1);
      expect(result[0].github_id).toBe(12345);
      expect(result[0].name).toBe("test-repo");
      expect(result[0].full_name).toBe("user/test-repo");
      expect(result[0].private).toBe(false);
      expect(result[0].is_fork).toBe(false);
      expect(result[0].is_archived).toBe(false);
      expect(result[0].language).toBe("JavaScript");
      expect(result[0].stars_count).toBe(10);
      expect(result[0].forks_count).toBe(2);
      expect(result[0].open_issues_count).toBe(3);
      expect(result[0].size_kb).toBe(512);
      expect(result[0].last_commit_date).toBe("2025-01-15T00:00:00Z");
    });

    it("should skip commit fetch for archived repos", async () => {
      const mockClient = {
        request: vi.fn(),
      };

      const repos = [
        {
          id: 12345,
          name: "archived-repo",
          full_name: "user/archived-repo",
          description: null,
          private: false,
          html_url: "https://github.com/user/archived-repo",
          clone_url: null,
          pushed_at: "2020-01-01T00:00:00Z",
          fork: false,
          archived: true,
          default_branch: "main",
          language: null,
          stargazers_count: 0,
          forks_count: 0,
          open_issues_count: 0,
          size: 0,
          owner: { login: "user" },
        },
      ];

      const result = await analyzeRepositories(mockClient, repos);

      expect(result).toHaveLength(1);
      expect(result[0].last_commit_date).toBeNull();
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it("should call onProgress callback", async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({ data: [] }),
      };
      const onProgress = vi.fn();

      const repos = [
        {
          id: 1,
          name: "r1",
          full_name: "u/r1",
          description: null,
          private: false,
          html_url: "https://github.com/u/r1",
          clone_url: null,
          pushed_at: null,
          fork: false,
          archived: false,
          default_branch: "main",
          language: null,
          stargazers_count: 0,
          forks_count: 0,
          open_issues_count: 0,
          size: 0,
          owner: { login: "u" },
        },
      ];

      await analyzeRepositories(mockClient, repos, onProgress);

      expect(onProgress).toHaveBeenCalledWith(1, 1);
    });

    it("should continue processing when individual repo analysis fails", async () => {
      const mockClient = {
        request: vi
          .fn()
          .mockResolvedValueOnce({
            data: [{ commit: { committer: { date: "2025-01-01T00:00:00Z" } } }],
          }),
      };

      // First repo has no owner property, which will cause a TypeError
      const badRepo = {
        id: 1,
        name: "fail-repo",
        full_name: "u/fail-repo",
        description: null,
        private: false,
        html_url: "https://github.com/u/fail-repo",
        clone_url: null,
        pushed_at: null,
        fork: false,
        archived: false,
        default_branch: "main",
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        size: 0,
        owner: null, // null owner causes error
      };

      const goodRepo = {
        id: 2,
        name: "ok-repo",
        full_name: "u/ok-repo",
        description: null,
        private: false,
        html_url: "https://github.com/u/ok-repo",
        clone_url: null,
        pushed_at: null,
        fork: false,
        archived: false,
        default_branch: "main",
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        size: 0,
        owner: { login: "u" },
      };

      const result = await analyzeRepositories(mockClient, [badRepo, goodRepo]);

      // First repo should fail (TypeError: null.login), second should succeed
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("ok-repo");
    });
  });
});
