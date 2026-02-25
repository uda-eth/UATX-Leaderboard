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

async function getAllUserRepos(octokit: Octokit, githubUsername: string) {
  const repos: { owner: string; repo: string; defaultBranch: string }[] = [];
  let page = 1;

  while (page <= 10) {
    try {
      const { data: userRepos } = await octokit.repos.listForUser({
        username: githubUsername,
        per_page: 100,
        page,
        sort: "pushed",
      });

      if (userRepos.length === 0) break;

      for (const repo of userRepos) {
        repos.push({
          owner: repo.owner.login,
          repo: repo.name,
          defaultBranch: repo.default_branch || "main",
        });
      }

      if (userRepos.length < 100) break;
      page++;
    } catch (err) {
      console.error(`Error listing repos page ${page} for ${githubUsername}:`, err);
      break;
    }
  }

  return repos;
}

async function countCommitsInRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  author: string,
  since: string,
  until?: string,
): Promise<number> {
  let count = 0;
  let page = 1;

  while (page <= 20) {
    try {
      const params: any = {
        owner,
        repo,
        sha: branch,
        author,
        since,
        per_page: 100,
        page,
      };
      if (until) params.until = until;

      const { data: commits } = await octokit.repos.listCommits(params);
      count += commits.length;
      if (commits.length < 100) break;
      page++;
    } catch {
      break;
    }
  }

  return count;
}

export async function fetchUserCommitEvents(githubUsername: string): Promise<number> {
  try {
    const octokit = await getUncachableGitHubClient();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sinceStr = weekAgo.toISOString();

    const repos = await getAllUserRepos(octokit, githubUsername);
    let totalCommits = 0;

    console.log(`Scanning ${repos.length} repos for weekly commits by ${githubUsername}...`);

    for (const { owner, repo, defaultBranch } of repos) {
      const count = await countCommitsInRepo(octokit, owner, repo, defaultBranch, githubUsername, sinceStr);
      totalCommits += count;
    }

    console.log(`Weekly commits for ${githubUsername}: ${totalCommits}`);
    return totalCommits;
  } catch (error) {
    console.error(`Error fetching weekly commits for ${githubUsername}:`, error);
    return 0;
  }
}

export async function fetchHistoricalCommits2026(githubUsername: string): Promise<number> {
  try {
    const octokit = await getUncachableGitHubClient();
    const repos = await getAllUserRepos(octokit, githubUsername);
    let totalCommits = 0;

    console.log(`Deep scanning ${repos.length} repos for 2026 commits by ${githubUsername}...`);

    for (const { owner, repo, defaultBranch } of repos) {
      const count = await countCommitsInRepo(
        octokit, owner, repo, defaultBranch, githubUsername,
        "2026-01-01T00:00:00Z"
      );
      if (count > 0) {
        console.log(`  ${owner}/${repo}: ${count} commits`);
      }
      totalCommits += count;
    }

    console.log(`Total 2026 commits for ${githubUsername}: ${totalCommits} across ${repos.length} repos`);
    return totalCommits;
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
