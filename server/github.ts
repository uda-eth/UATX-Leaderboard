import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
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
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function searchCommitCount(
  octokit: Octokit,
  githubUsername: string,
  dateRange: string,
): Promise<number> {
  let totalCount = 0;
  let page = 1;
  const maxPages = 10;

  while (page <= maxPages) {
    try {
      const { data } = await octokit.rest.search.commits({
        q: `author:${githubUsername} ${dateRange}`,
        per_page: 100,
        page,
        sort: "author-date",
        order: "desc",
      });

      if (page === 1) {
        const MAX_COMMITS = 10000;
        totalCount = Math.min(data.total_count, MAX_COMMITS);
        console.log(`  Search API found ${data.total_count} commits for author:${githubUsername} ${dateRange}${data.total_count > MAX_COMMITS ? ` (capped at ${MAX_COMMITS})` : ''}`);
        break;
      }
    } catch (error: any) {
      if (error.status === 422) {
        console.log(`  Search API: query too broad, paginating manually...`);
        break;
      }
      console.error(`  Search API error page ${page}:`, error.message || error);
      break;
    }
  }

  return totalCount;
}

export async function fetchUserCommitEvents(githubUsername: string): Promise<number> {
  try {
    const octokit = await getUncachableGitHubClient();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const fromDate = weekAgo.toISOString().split('T')[0];
    const toDate = now.toISOString().split('T')[0];
    const dateRange = `author-date:${fromDate}..${toDate}`;

    console.log(`Searching weekly commits for ${githubUsername} (${fromDate} to ${toDate})...`);
    const count = await searchCommitCount(octokit, githubUsername, dateRange);
    console.log(`Weekly commits for ${githubUsername}: ${count}`);
    return count;
  } catch (error) {
    console.error(`Error fetching weekly commits for ${githubUsername}:`, error);
    return 0;
  }
}

export async function fetchHistoricalCommits2026(githubUsername: string): Promise<number> {
  try {
    const octokit = await getUncachableGitHubClient();
    const now = new Date();
    const toDate = now.toISOString().split('T')[0];
    const dateRange = `author-date:2026-01-01..${toDate}`;

    console.log(`Deep scanning 2026 commits for ${githubUsername}...`);
    const count = await searchCommitCount(octokit, githubUsername, dateRange);
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
