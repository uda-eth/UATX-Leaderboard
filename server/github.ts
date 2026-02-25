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

export async function fetchUserCommitEvents(githubUsername: string): Promise<number> {
  try {
    const octokit = await getUncachableGitHubClient();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let totalCommits = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const { data: events } = await octokit.activity.listPublicEventsForUser({
        username: githubUsername,
        per_page: 100,
        page,
      });

      if (events.length === 0) {
        hasMore = false;
        break;
      }

      for (const event of events) {
        const eventDate = new Date(event.created_at || '');
        if (eventDate < weekAgo) {
          hasMore = false;
          break;
        }
        if (event.type === 'PushEvent') {
          const payload = event.payload as any;
          totalCommits += payload.commits?.length || 0;
        }
      }
      page++;
    }

    return totalCommits;
  } catch (error) {
    console.error(`Error fetching commits for ${githubUsername}:`, error);
    return 0;
  }
}

export async function fetchHistoricalCommits2026(githubUsername: string): Promise<number> {
  try {
    const octokit = await getUncachableGitHubClient();
    let totalCommits = 0;

    let repoPage = 1;
    let hasMoreRepos = true;
    const repos: { owner: string; repo: string; defaultBranch: string }[] = [];

    while (hasMoreRepos) {
      const { data: userRepos } = await octokit.repos.listForUser({
        username: githubUsername,
        per_page: 100,
        page: repoPage,
        sort: "pushed",
        type: "owner",
      });

      if (userRepos.length === 0) {
        hasMoreRepos = false;
        break;
      }

      for (const repo of userRepos) {
        if (repo.pushed_at && new Date(repo.pushed_at) >= new Date("2026-01-01")) {
          repos.push({
            owner: repo.owner.login,
            repo: repo.name,
            defaultBranch: repo.default_branch || "main",
          });
        }
      }

      if (userRepos.length < 100) {
        hasMoreRepos = false;
      }
      repoPage++;
      if (repoPage > 5) break;
    }

    for (const { owner, repo, defaultBranch } of repos) {
      try {
        let commitPage = 1;
        let hasMoreCommits = true;

        while (hasMoreCommits) {
          const { data: commits } = await octokit.repos.listCommits({
            owner,
            repo,
            sha: defaultBranch,
            author: githubUsername,
            since: "2026-01-01T00:00:00Z",
            per_page: 100,
            page: commitPage,
          });

          totalCommits += commits.length;

          if (commits.length < 100) {
            hasMoreCommits = false;
          }
          commitPage++;
          if (commitPage > 10) break;
        }
      } catch {
        continue;
      }
    }

    console.log(`Fetched ${totalCommits} historical commits for ${githubUsername} in 2026 across ${repos.length} repos`);
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
