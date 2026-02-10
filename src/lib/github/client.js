import { Octokit } from "octokit";

/**
 * Creates a new GitHub client with the provided access token
 * @param {string} accessToken - GitHub access token
 * @returns {Octokit} GitHub client instance
 */
export function createGitHubClient(accessToken) {
  return new Octokit({
    auth: accessToken,
  });
}
