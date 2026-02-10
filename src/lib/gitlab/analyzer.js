import { getUserProjects } from "./client.js";
import { debugLog, errorLog } from "../utils/env.js";

const GITLAB_API_BASE = "https://gitlab.com/api/v4";

/**
 * Gets the last commit date for a GitLab project
 * @param {string} accessToken - GitLab access token
 * @param {number} projectId - GitLab project ID
 * @param {string} defaultBranch - Default branch name
 * @returns {Promise<string|null>} Last commit date or null
 */
async function getLastCommitDate(accessToken, projectId, defaultBranch) {
  try {
    const url = new URL(
      `${GITLAB_API_BASE}/projects/${projectId}/repository/commits`,
    );
    url.searchParams.set("ref_name", defaultBranch);
    url.searchParams.set("per_page", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        debugLog(`No commits found for project ${projectId}`);
        return null;
      }
      return null;
    }

    const commits = await response.json();
    if (commits.length > 0) {
      return commits[0].committed_date;
    }

    return null;
  } catch (error) {
    errorLog(`Error fetching last commit for project ${projectId}`, error);
    return null;
  }
}

/**
 * Analyzes GitLab projects and adds commit information
 * @param {string} accessToken - GitLab access token
 * @param {any[]} projects - Array of GitLab projects
 * @param {function(number, number): void} [onProgress] - Progress callback
 * @returns {Promise<any[]>} Analyzed projects with commit data
 */
export async function analyzeProjects(accessToken, projects, onProgress) {
  const analyzed = [];

  debugLog(`Analyzing ${projects.length} GitLab projects for commit data`);

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];

    try {
      const lastCommitDate = project.archived
        ? null
        : await getLastCommitDate(
            accessToken,
            project.id,
            project.default_branch || "main",
          );

      analyzed.push({
        github_id: project.id,
        name: project.name,
        full_name: project.path_with_namespace,
        description: project.description,
        private: project.visibility !== "public",
        html_url: project.web_url,
        clone_url: project.http_url_to_repo,
        last_commit_date: lastCommitDate,
        last_push_date: project.last_activity_at,
        is_fork: !!project.forked_from_project,
        is_archived: project.archived || false,
        default_branch: project.default_branch || "main",
        language: null,
        stars_count: project.star_count || 0,
        forks_count: project.forks_count || 0,
        open_issues_count: project.open_issues_count || 0,
        size_kb: Math.round((project.statistics?.repository_size || 0) / 1024),
      });

      if (onProgress) {
        onProgress(i + 1, projects.length);
      }
    } catch (error) {
      errorLog(
        `Error analyzing GitLab project ${project.path_with_namespace}`,
        error,
      );
    }
  }

  debugLog(
    `Completed analysis of ${analyzed.length}/${projects.length} GitLab projects`,
  );
  return analyzed;
}

/**
 * Full GitLab repository scan workflow
 * @param {string} accessToken - GitLab access token
 * @param {boolean} includePrivate - Include private projects
 * @param {function(string, any): void} [onStatus] - Status callback
 * @param {function(number, number): void} [onProgress] - Progress callback
 * @returns {Promise<any[]>} Analyzed projects
 */
export async function performGitLabScan(
  accessToken,
  includePrivate = false,
  onStatus,
  onProgress,
) {
  try {
    if (onStatus)
      onStatus("fetching", {
        message: "Fetching projects from GitLab...",
      });

    const projects = await getUserProjects(accessToken, includePrivate);

    if (projects.length === 0) {
      if (onStatus)
        onStatus("completed", { message: "No GitLab projects found" });
      return [];
    }

    if (onStatus)
      onStatus("analyzing", {
        message: `Analyzing ${projects.length} GitLab projects...`,
        total: projects.length,
      });

    const analyzed = await analyzeProjects(accessToken, projects, onProgress);

    if (onStatus)
      onStatus("completed", {
        message: `Analysis completed for ${analyzed.length} GitLab projects`,
        total: analyzed.length,
      });

    return analyzed;
  } catch (error) {
    if (onStatus) onStatus("error", { message: error.message });
    throw error;
  }
}
