import { Octokit } from '@octokit/rest'

export function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7),
    year: d.getUTCFullYear(),
  };
}

export function isSameWeek(
  a: { week: number; year: number },
  b: { week: number; year: number }
): boolean {
  return a.year === b.year && a.week === b.week;
}

export function isPreviousWeek(
  prev: { week: number; year: number },
  current: { week: number; year: number }
): boolean {
  if (prev.year === current.year) return current.week === prev.week + 1;
  if (prev.year === current.year - 1) return current.week === 1 && (prev.week === 52 || prev.week === 53);
  return false;
}

let connectionSettings: any;

async function getAppAccessToken() {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error('X-Replit-Token not found');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { Accept: 'application/json', 'X-Replit-Token': xReplitToken } }
  ).then(r => r.json()).then(d => d.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) throw new Error('GitHub not connected');
  return accessToken;
}

export async function getUncachableGitHubClient() {
  const accessToken = await getAppAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function getGitHubClient(userToken?: string | null): Promise<Octokit> {
  if (userToken) return new Octokit({ auth: userToken });
  return getUncachableGitHubClient();
}

/**
 * Uses GitHub's GraphQL contributionsCollection — the same data powering the
 * profile contribution graph. With the user's own token it includes private
 * repos; with the app token it returns public contributions only.
 */
async function fetchCommitContributions(
  octokit: Octokit,
  githubUsername: string,
  from: Date,
  to: Date,
): Promise<number> {
  const gql = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalRepositoriesWithContributedCommits
          restrictedContributionsCount
        }
      }
    }
  `;
  try {
    const result = await octokit.graphql<{
      user: {
        contributionsCollection: {
          totalCommitContributions: number;
          totalIssueContributions: number;
          totalPullRequestContributions: number;
          totalPullRequestReviewContributions: number;
          totalRepositoriesWithContributedCommits: number;
          restrictedContributionsCount: number;
        };
      };
    }>(gql, {
      login: githubUsername,
      from: from.toISOString(),
      to: to.toISOString(),
    });

    const col = result.user?.contributionsCollection;
    const commits = col?.totalCommitContributions ?? 0;
    const issues = col?.totalIssueContributions ?? 0;
    const prs = col?.totalPullRequestContributions ?? 0;
    const reviews = col?.totalPullRequestReviewContributions ?? 0;
    const repos = col?.totalRepositoriesWithContributedCommits ?? 0;
    const restricted = col?.restrictedContributionsCount ?? 0;
    const combined = commits + restricted;
    console.log(
      `  [GraphQL] ${githubUsername} [${from.toISOString().split('T')[0]} → ${to.toISOString().split('T')[0]}]\n` +
      `    commits: ${commits} (public) + ${restricted} (private) = ${combined}\n` +
      `    issues: ${issues} | PRs: ${prs} | PR reviews: ${reviews}\n` +
      `    repos with commits: ${repos}\n` +
      `    GitHub profile total would be: ${commits + restricted + issues + prs + reviews}`
    );
    return combined;
  } catch (err: any) {
    console.error(`  [GraphQL] Error fetching contributions for ${githubUsername}:`, err.message);
    return 0;
  }
}

export async function fetchUserCommitEvents(
  githubUsername: string,
  userToken?: string | null,
): Promise<number> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const scope = userToken ? 'incl. private' : 'public only';
  console.log(`Fetching weekly commits for ${githubUsername} [${scope}]...`);
  const octokit = await getGitHubClient(userToken);
  return fetchCommitContributions(octokit, githubUsername, weekAgo, now);
}

export async function fetchHistoricalCommits2026(
  githubUsername: string,
  userToken?: string | null,
): Promise<number> {
  const since2026 = new Date('2026-01-01T00:00:00Z');
  const now = new Date();
  const scope = userToken ? 'incl. private' : 'public only';
  console.log(`Fetching 2026 commits for ${githubUsername} [${scope}]...`);
  const octokit = await getGitHubClient(userToken);
  return fetchCommitContributions(octokit, githubUsername, since2026, now);
}

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function calculateXpFromCommits(commits: number): number {
  return commits * 10;
}

export function getRank(level: number): string {
  if (level >= 50) return 'Legendary';
  if (level >= 40) return 'Grandmaster';
  if (level >= 30) return 'Master';
  if (level >= 20) return 'Expert';
  if (level >= 15) return 'Advanced';
  if (level >= 10) return 'Intermediate';
  if (level >= 5) return 'Apprentice';
  if (level >= 2) return 'Beginner';
  return 'Newbie';
}

export function getXpForNextLevel(level: number): number {
  return level * level * 50;
}

export async function checkTokenHasRepoScope(userToken: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${userToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const scopes = res.headers.get('x-oauth-scopes') ?? '';
    const scopeList = scopes.split(',').map(s => s.trim());
    const hasRepo = scopeList.includes('repo');
    console.log(`  [GitHub] Token scopes: "${scopes}" — repo access: ${hasRepo}`);
    return hasRepo;
  } catch (err: any) {
    console.error('  [GitHub] Failed to check token scopes:', err.message);
    return false;
  }
}
