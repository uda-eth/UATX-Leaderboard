import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGraphql = vi.hoisted(() => vi.fn());

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(function MockOctokit(this: any) {
    this.graphql = mockGraphql;
  }),
}));

import {
  fetchUserCommitEvents,
  fetchHistoricalCommits2026,
  calculateLevel,
  calculateXpFromCommits,
  getRank,
  getXpForNextLevel,
} from './github';

function makeGitHubResponse(publicCommits: number, privateCommits: number) {
  return {
    user: {
      contributionsCollection: {
        totalCommitContributions: publicCommits,
        restrictedContributionsCount: privateCommits,
      },
    },
  };
}

describe('fetchUserCommitEvents', () => {
  beforeEach(() => {
    mockGraphql.mockReset();
  });

  it('returns only public commits when there are no private commits', async () => {
    mockGraphql.mockResolvedValueOnce(makeGitHubResponse(42, 0));
    const result = await fetchUserCommitEvents('testuser', 'fake-token');
    expect(result).toBe(42);
  });

  it('adds public and private commits together', async () => {
    mockGraphql.mockResolvedValueOnce(makeGitHubResponse(30, 15));
    const result = await fetchUserCommitEvents('testuser', 'fake-token');
    expect(result).toBe(45);
  });

  it('returns only private commits when there are no public commits', async () => {
    mockGraphql.mockResolvedValueOnce(makeGitHubResponse(0, 20));
    const result = await fetchUserCommitEvents('testuser', 'fake-token');
    expect(result).toBe(20);
  });

  it('returns 0 when the API throws an error', async () => {
    mockGraphql.mockRejectedValueOnce(new Error('GitHub API error'));
    const result = await fetchUserCommitEvents('testuser', 'fake-token');
    expect(result).toBe(0);
  });

  it('handles null contributionsCollection gracefully', async () => {
    mockGraphql.mockResolvedValueOnce({ user: { contributionsCollection: null } });
    const result = await fetchUserCommitEvents('testuser', 'fake-token');
    expect(result).toBe(0);
  });

  it('handles null user gracefully', async () => {
    mockGraphql.mockResolvedValueOnce({ user: null });
    const result = await fetchUserCommitEvents('testuser', 'fake-token');
    expect(result).toBe(0);
  });
});

describe('fetchHistoricalCommits2026', () => {
  beforeEach(() => {
    mockGraphql.mockReset();
  });

  it('returns the sum of public and private commits since Jan 1 2026', async () => {
    mockGraphql.mockResolvedValueOnce(makeGitHubResponse(100, 50));
    const result = await fetchHistoricalCommits2026('testuser', 'fake-token');
    expect(result).toBe(150);
  });

  it('returns 0 when both public and private are zero', async () => {
    mockGraphql.mockResolvedValueOnce(makeGitHubResponse(0, 0));
    const result = await fetchHistoricalCommits2026('testuser', 'fake-token');
    expect(result).toBe(0);
  });

  it('returns 0 on API failure instead of crashing', async () => {
    mockGraphql.mockRejectedValueOnce(new Error('Rate limit exceeded'));
    const result = await fetchHistoricalCommits2026('testuser', 'fake-token');
    expect(result).toBe(0);
  });

  it('queries GitHub with the correct login variable', async () => {
    mockGraphql.mockResolvedValueOnce(makeGitHubResponse(5, 0));
    await fetchHistoricalCommits2026('alice', 'fake-token');
    const callArgs = mockGraphql.mock.calls[0];
    expect(callArgs[1]).toMatchObject({ login: 'alice' });
  });

  it('queries from Jan 1 2026 as the start date', async () => {
    mockGraphql.mockResolvedValueOnce(makeGitHubResponse(5, 0));
    await fetchHistoricalCommits2026('alice', 'fake-token');
    const callArgs = mockGraphql.mock.calls[0];
    expect(callArgs[1].from).toMatch(/^2026-01-01/);
  });
});

describe('calculateXpFromCommits', () => {
  it('gives 10 XP per commit', () => {
    expect(calculateXpFromCommits(1)).toBe(10);
    expect(calculateXpFromCommits(10)).toBe(100);
    expect(calculateXpFromCommits(50)).toBe(500);
  });

  it('returns 0 for 0 commits', () => {
    expect(calculateXpFromCommits(0)).toBe(0);
  });
});

describe('calculateLevel', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('correctly calculates level for known XP values', () => {
    expect(calculateLevel(50)).toBe(2);
    expect(calculateLevel(200)).toBe(3);
    expect(calculateLevel(450)).toBe(4);
  });

  it('is consistent with getXpForNextLevel thresholds', () => {
    for (let level = 1; level <= 10; level++) {
      const xpNeeded = getXpForNextLevel(level);
      expect(calculateLevel(xpNeeded)).toBeGreaterThanOrEqual(level + 1);
    }
  });
});

describe('getRank', () => {
  it('returns Newbie at level 1', () => {
    expect(getRank(1)).toBe('Newbie');
  });

  it('returns Beginner at level 2', () => {
    expect(getRank(2)).toBe('Beginner');
  });

  it('returns Apprentice at level 5', () => {
    expect(getRank(5)).toBe('Apprentice');
  });

  it('returns Intermediate at level 10', () => {
    expect(getRank(10)).toBe('Intermediate');
  });

  it('returns Advanced at level 15', () => {
    expect(getRank(15)).toBe('Advanced');
  });

  it('returns Expert at level 20', () => {
    expect(getRank(20)).toBe('Expert');
  });

  it('returns Master at level 30', () => {
    expect(getRank(30)).toBe('Master');
  });

  it('returns Grandmaster at level 40', () => {
    expect(getRank(40)).toBe('Grandmaster');
  });

  it('returns Legendary at level 50', () => {
    expect(getRank(50)).toBe('Legendary');
  });
});

describe('getXpForNextLevel', () => {
  it('requires more XP for each subsequent level', () => {
    const thresholds = [1, 2, 3, 4, 5].map(getXpForNextLevel);
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
  });

  it('returns the correct formula result (level * level * 50)', () => {
    expect(getXpForNextLevel(1)).toBe(50);
    expect(getXpForNextLevel(2)).toBe(200);
    expect(getXpForNextLevel(3)).toBe(450);
    expect(getXpForNextLevel(10)).toBe(5000);
  });
});
