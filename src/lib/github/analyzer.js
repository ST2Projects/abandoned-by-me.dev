import { getUserRepositories as getGitHubRepos, createGitHubClient } from './client.js';
import { debugLog, errorLog } from '../utils/env.js';

/**
 * @typedef {Object} GitHubRepository
 * @property {number} id - GitHub repository ID
 * @property {string} name - Repository name
 * @property {string} full_name - Full name (owner/repo)
 * @property {string|null} description - Repository description
 * @property {boolean} private - Is private repository
 * @property {string} html_url - Repository URL
 * @property {string} clone_url - Clone URL
 * @property {boolean} fork - Is fork
 * @property {boolean} archived - Is archived
 * @property {string} default_branch - Default branch name
 * @property {string|null} language - Primary language
 * @property {number} stargazers_count - Stars count
 * @property {number} forks_count - Forks count
 * @property {number} open_issues_count - Open issues count
 * @property {number} size - Size in KB
 * @property {string} created_at - Created timestamp
 * @property {string} updated_at - Updated timestamp
 * @property {string} pushed_at - Last push timestamp
 */

/**
 * Fetches all repositories for a user from GitHub
 * @param {import('octokit').Octokit} client - GitHub client
 * @param {string} username - GitHub username
 * @param {boolean} includePrivate - Whether to include private repositories
 * @returns {Promise<GitHubRepository[]>} Array of repositories
 */
export async function fetchAllRepositories(client, username, includePrivate = false) {
	try {
		debugLog(`Fetching repositories for ${username}`, { includePrivate });
		
		const repositories = [];
		let page = 1;
		const perPage = 100;

		while (true) {
			const { data } = await client.request('GET /user/repos', {
				type: includePrivate ? 'all' : 'public',
				sort: 'updated',
				direction: 'desc',
				per_page: perPage,
				page: page,
				headers: {
					'X-GitHub-Api-Version': '2022-11-28'
				}
			});

			if (data.length === 0) break;

			repositories.push(...data);
			
			if (data.length < perPage) break;
			page++;
		}

		debugLog(`Fetched ${repositories.length} repositories for ${username}`);
		return repositories;
	} catch (error) {
		errorLog('Error fetching repositories from GitHub', error);
		throw error;
	}
}

/**
 * Gets the last commit date for a repository
 * @param {import('octokit').Octokit} client - GitHub client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} defaultBranch - Default branch name
 * @returns {Promise<string|null>} Last commit date or null
 */
export async function getLastCommitDate(client, owner, repo, defaultBranch = 'main') {
	try {
		const { data } = await client.request('GET /repos/{owner}/{repo}/commits', {
			owner,
			repo,
			sha: defaultBranch,
			per_page: 1,
			headers: {
				'X-GitHub-Api-Version': '2022-11-28'
			}
		});

		if (data.length > 0) {
			return data[0].commit.committer.date;
		}

		return null;
	} catch (error) {
		// If we can't get commits (maybe empty repo or branch doesn't exist), return null
		if (error.status === 404 || error.status === 409) {
			debugLog(`No commits found for ${owner}/${repo} on branch ${defaultBranch}`);
			return null;
		}
		
		errorLog(`Error fetching last commit for ${owner}/${repo}`, error);
		return null; // Return null instead of throwing to continue processing other repos
	}
}

/**
 * Analyzes repositories and adds commit information
 * @param {import('octokit').Octokit} client - GitHub client
 * @param {GitHubRepository[]} repositories - Array of repositories
 * @param {function(number, number): void} [onProgress] - Progress callback
 * @returns {Promise<any[]>} Analyzed repositories with commit data
 */
export async function analyzeRepositories(client, repositories, onProgress) {
	const analyzed = [];
	
	debugLog(`Analyzing ${repositories.length} repositories for commit data`);
	
	for (let i = 0; i < repositories.length; i++) {
		const repo = repositories[i];
		
		try {
			// Skip archived repositories - they don't need commit analysis
			const lastCommitDate = repo.archived ? null : await getLastCommitDate(
				client, 
				repo.owner.login, 
				repo.name, 
				repo.default_branch
			);

			analyzed.push({
				github_id: repo.id,
				name: repo.name,
				full_name: repo.full_name,
				description: repo.description,
				private: repo.private,
				html_url: repo.html_url,
				clone_url: repo.clone_url,
				last_commit_date: lastCommitDate,
				last_push_date: repo.pushed_at,
				is_fork: repo.fork,
				is_archived: repo.archived,
				default_branch: repo.default_branch || 'main',
				language: repo.language,
				stars_count: repo.stargazers_count || 0,
				forks_count: repo.forks_count || 0,
				open_issues_count: repo.open_issues_count || 0,
				size_kb: repo.size || 0
			});

			if (onProgress) {
				onProgress(i + 1, repositories.length);
			}
		} catch (error) {
			errorLog(`Error analyzing repository ${repo.full_name}`, error);
			// Continue with other repositories even if one fails
		}
	}

	debugLog(`Completed analysis of ${analyzed.length}/${repositories.length} repositories`);
	return analyzed;
}

/**
 * Determines if a repository is abandoned based on threshold
 * @param {any} repository - Repository with last_commit_date
 * @param {number} thresholdMonths - Months to consider abandoned
 * @returns {boolean} Whether the repository is abandoned
 */
export function isRepositoryAbandoned(repository, thresholdMonths = 6) {
	if (repository.is_archived) {
		return false; // Archived repos are intentionally inactive
	}

	if (!repository.last_commit_date && !repository.last_push_date) {
		return true; // No commits means likely abandoned
	}

	const lastActivity = repository.last_commit_date || repository.last_push_date;
	const thresholdDate = new Date();
	thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);

	return new Date(lastActivity) < thresholdDate;
}

/**
 * Full repository scan workflow
 * @param {string} accessToken - GitHub access token
 * @param {string} username - GitHub username
 * @param {boolean} includePrivate - Include private repositories
 * @param {function(string, any): void} [onStatus] - Status callback
 * @param {function(number, number): void} [onProgress] - Progress callback
 * @returns {Promise<any[]>} Analyzed repositories
 */
export async function performRepositoryScan(accessToken, username, includePrivate = false, onStatus, onProgress) {
	const client = createGitHubClient(accessToken);
	
	try {
		if (onStatus) onStatus('fetching', { message: 'Fetching repositories from GitHub...' });
		
		const repositories = await fetchAllRepositories(client, username, includePrivate);
		
		if (repositories.length === 0) {
			if (onStatus) onStatus('completed', { message: 'No repositories found' });
			return [];
		}

		if (onStatus) onStatus('analyzing', { 
			message: `Analyzing ${repositories.length} repositories...`,
			total: repositories.length 
		});

		const analyzed = await analyzeRepositories(client, repositories, onProgress);
		
		if (onStatus) onStatus('completed', { 
			message: `Analysis completed for ${analyzed.length} repositories`,
			total: analyzed.length 
		});

		return analyzed;
	} catch (error) {
		if (onStatus) onStatus('error', { message: error.message });
		throw error;
	}
}