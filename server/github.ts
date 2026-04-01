import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAppAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken,
      },
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

export async function getUncachableGitHubClient() {
  const accessToken = await getAppAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function getGitHubClient(userToken?: string | null): Promise<Octokit> {
  if (userToken) {
    return new Octokit({ auth: userToken });
  }
  return getUncachableGitHubClient();
}

// Public-only: uses GitHub Search API (fast, 1 request, but no private repos)
async function searchCommitCount(
  octokit: Octokit,
  githubUsername: string,
  dateRange: string,
): Promise<number> {
  try {
    const { data } = await octokit.rest.search.commits({
      q: `author:${githubUsername} ${dateRange}`,
      per_page: 1,
      page: 1,
      sort: "author-date",
      order: "desc",
    });
    console.log(`  [Search API] ${data.total_count} commits for author:${githubUsername} ${dateRange}`);
    return data.total_count;
  } catch (error: any) {
    if (error.status === 422) {
      console.log(`  [Search API] query too broad for ${githubUsername}`);
      return 0;
    }
    console.error(`  [Search API] error:`, error.message || error);
    return 0;
  }
}

// Authenticated: scans every repo the user has access to (includes private repos)
async function countCommitsViaRepos(
  octokit: Octokit,
  githubUsername: string,
  since: Date,
  until?: Date,
): Promise<number> {
  let repos: any[];
  try {
    repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      affiliation: 'owner,collaborator,organization_member',
      per_page: 100,
    });
  } catch (err: any) {
    console.error('  [Repo scan] Failed to list repos:', err.message);
    return 0;
  }

  console.log(`  [Repo scan] Scanning ${repos.length} repos for commits by ${githubUsername} since ${since.toISOString().split('T')[0]}...`);

  let total = 0;
  const batchSize = 10;

  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const counts = await Promise.all(
      batch.map(async (repo: any) => {
        try {
          const params: any = {
            owner: repo.owner.login,
            repo: repo.name,
            author: githubUsername,
            since: since.toISOString(),
            per_page: 100,
          };
          if (until) params.until = until.toISOString();

          const commits = await octokit.paginate(octokit.rest.repos.listCommits, params);
          if (commits.length > 0) {
            console.log(`    ${repo.full_name}: ${commits.length} commits`);
          }
          return commits.length;
        } catch (err: any) {
          // 409 = empty repo, 404 = not found — ignore silently
          if (err.status !== 409 && err.status !== 404) {
            console.error(`    Error in ${repo.full_name}:`, err.message);
          }
          return 0;
        }
      })
    );
    total += counts.reduce((a, b) => a + b, 0);
  }

  console.log(`  [Repo scan] Total: ${total} commits`);
  return total;
}

export async function fetchUserCommitEvents(
  githubUsername: string,
  userToken?: string | null
): Promise<number> {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (userToken) {
      console.log(`Counting weekly commits for ${githubUsername} via repo scan (incl. private)...`);
      const octokit = new Octokit({ auth: userToken });
      const count = await countCommitsViaRepos(octokit, githubUsername, weekAgo, now);
      console.log(`Weekly commits for ${githubUsername}: ${count}`);
      return count;
    }

    const octokit = await getUncachableGitHubClient();
    const fromDate = weekAgo.toISOString().split('T')[0];
    const toDate = now.toISOString().split('T')[0];
    console.log(`Searching weekly commits for ${githubUsername} via Search API (public only)...`);
    const count = await searchCommitCount(octokit, githubUsername, `author-date:${fromDate}..${toDate}`);
    console.log(`Weekly commits for ${githubUsername}: ${count}`);
    return count;
  } catch (error) {
    console.error(`Error fetching weekly commits for ${githubUsername}:`, error);
    return 0;
  }
}

export async function fetchHistoricalCommits2026(
  githubUsername: string,
  userToken?: string | null
): Promise<number> {
  try {
    if (userToken) {
      console.log(`Counting 2026 commits for ${githubUsername} via repo scan (incl. private)...`);
      const octokit = new Octokit({ auth: userToken });
      const since2026 = new Date('2026-01-01T00:00:00Z');
      const count = await countCommitsViaRepos(octokit, githubUsername, since2026);
      console.log(`Total 2026 commits for ${githubUsername}: ${count}`);
      return count;
    }

    const octokit = await getUncachableGitHubClient();
    const now = new Date();
    const toDate = now.toISOString().split('T')[0];
    console.log(`Deep scanning 2026 commits for ${githubUsername} via Search API (public only)...`);
    const count = await searchCommitCount(octokit, githubUsername, `author-date:2026-01-01..${toDate}`);
    console.log(`Total 2026 commits for ${githubUsername}: ${count}`);
    return count;
  } catch (error) {
    console.error(`Error fetching historical commits for ${githubUsername}:`, error);
    return 0;
  }
}

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function calculateXpFromCommits(commits: number): number {
  return commits * 10;
}

export function getRank(level: number): string {
  if (level >= 50) return "Legendary";
  if (level >= 40) return "Grandmaster";
  if (level >= 30) return "Master";
  if (level >= 20) return "Expert";
  if (level >= 15) return "Advanced";
  if (level >= 10) return "Intermediate";
  if (level >= 5) return "Apprentice";
  if (level >= 2) return "Beginner";
  return "Newbie";
}

export function getXpForNextLevel(level: number): number {
  return level * level * 50;
}
