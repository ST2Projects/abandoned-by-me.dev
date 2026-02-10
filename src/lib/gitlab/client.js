import { appLog } from "$lib/utils/env.js";

const GITLAB_API_BASE = "https://gitlab.com/api/v4";

/**
 * Makes an authenticated request to the GitLab API
 * @param {string} accessToken - GitLab access token
 * @param {string} endpoint - API endpoint path (e.g., "/user")
 * @param {Record<string, string>} [params] - Query parameters
 * @returns {Promise<any>} Parsed JSON response
 */
async function gitlabRequest(accessToken, endpoint, params = {}) {
  const url = new URL(`${GITLAB_API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GitLab API error ${response.status}: ${response.statusText} - ${body}`,
    );
  }

  return response.json();
}

/**
 * Fetches authenticated user information from GitLab
 * @param {string} accessToken - GitLab access token
 * @returns {Promise<any>} User information
 */
export async function getUserInfo(accessToken) {
  return gitlabRequest(accessToken, "/user");
}

/**
 * Fetches user's owned projects from GitLab
 * @param {string} accessToken - GitLab access token
 * @param {boolean} includePrivate - Whether to include private projects
 * @returns {Promise<any[]>} Array of GitLab projects
 */
export async function getUserProjects(accessToken, includePrivate = false) {
  const projects = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const params = {
      owned: "true",
      per_page: String(perPage),
      page: String(page),
      order_by: "updated_at",
      sort: "desc",
    };

    if (!includePrivate) {
      params.visibility = "public";
    }

    const data = await gitlabRequest(accessToken, "/projects", params);

    if (data.length === 0) break;
    projects.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  return projects;
}

/**
 * Tests GitLab API connection
 * @param {string} accessToken - GitLab access token
 * @returns {Promise<{user: any}>} User info
 */
export async function testConnection(accessToken) {
  try {
    const user = await getUserInfo(accessToken);
    return { user };
  } catch (error) {
    throw new Error(`GitLab API connection failed: ${error.message}`);
  }
}
