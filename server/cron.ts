import { storage } from "./storage";
import { authStorage } from "./replit_integrations/auth/storage";
import {
  fetchUserCommitEvents,
  fetchHistoricalCommits2026,
  calculateLevel,
  calculateXpFromCommits,
  getRank,
  checkTokenHasRepoScope,
  getISOWeek,
  isSameWeek,
  isPreviousWeek,
} from "./github";

async function syncMember(member: any) {
  const user = await authStorage.getUser(member.userId);
  const userToken = user?.githubAccessToken ?? null;

  if (userToken) {
    await checkTokenHasRepoScope(userToken);
  }

  const [weeklyCommits, totalCommits2026] = await Promise.all([
    fetchUserCommitEvents(member.githubUsername, userToken),
    fetchHistoricalCommits2026(member.githubUsername, userToken),
  ]);
  const totalCommits = Math.max(member.totalCommits, totalCommits2026);
  const xp = calculateXpFromCommits(totalCommits);
  const level = calculateLevel(xp);
  const rank = getRank(level);

  const now = new Date();
  const currentWeek = getISOWeek(now);
  const lastSyncWeek = member.lastSyncedAt ? getISOWeek(new Date(member.lastSyncedAt)) : null;
  const joinWeek = getISOWeek(new Date(member.joinedAt!));
  const weeksActive = Math.max(0, currentWeek.year * 53 + currentWeek.week - (joinWeek.year * 53 + joinWeek.week));
  const maxPossibleStreak = weeksActive + 1;

  let streak = member.currentStreak;
  if (weeklyCommits > 0) {
    if (!lastSyncWeek) {
      streak = 1;
    } else if (isSameWeek(lastSyncWeek, currentWeek)) {
      streak = Math.min(member.currentStreak, maxPossibleStreak);
    } else if (isPreviousWeek(lastSyncWeek, currentWeek)) {
      streak = Math.min(member.currentStreak + 1, maxPossibleStreak);
    } else {
      streak = 1;
    }
  } else {
    if (lastSyncWeek && !isSameWeek(lastSyncWeek, currentWeek) && !isPreviousWeek(lastSyncWeek, currentWeek)) {
      streak = 0;
    }
  }

  const longestStreak = Math.max(member.longestStreak, streak);

  await storage.updateMember(member.id, {
    weeklyCommits,
    totalCommits,
    xp,
    level,
    rank,
    currentStreak: streak,
    longestStreak,
    lastSyncedAt: new Date(),
  });

  if (totalCommits >= 10 && member.totalCommits < 10) {
    await storage.addAchievement({
      memberId: member.id,
      type: "commits_10",
      title: "Getting Started",
      description: "Reached 10 total contributions",
      icon: "git-commit",
    });
  }
  if (totalCommits >= 50 && member.totalCommits < 50) {
    await storage.addAchievement({
      memberId: member.id,
      type: "commits_50",
      title: "Consistent Coder",
      description: "Reached 50 total contributions",
      icon: "flame",
    });
  }
  if (totalCommits >= 100 && member.totalCommits < 100) {
    await storage.addAchievement({
      memberId: member.id,
      type: "commits_100",
      title: "Centurion",
      description: "Reached 100 total contributions",
      icon: "trophy",
    });
  }
  if (streak >= 3 && member.currentStreak < 3) {
    await storage.addAchievement({
      memberId: member.id,
      type: "streak_3",
      title: "On Fire!",
      description: "3 week coding streak",
      icon: "zap",
    });
  }
}

async function syncAllMembers() {
  console.log("[auto-sync] Starting daily sync for all members...");
  const members = await storage.getAllMembers();
  let success = 0;
  let failed = 0;

  for (const member of members) {
    try {
      await syncMember(member);
      success++;
      console.log(`[auto-sync] Synced ${member.githubUsername}`);
    } catch (err: any) {
      failed++;
      console.error(`[auto-sync] Failed to sync ${member.githubUsername}:`, err.message);
    }
  }

  console.log(`[auto-sync] Complete — ${success} synced, ${failed} failed out of ${members.length} members`);

  await crownWeeklyWinner();
}

export async function crownWeeklyWinner() {
  try {
    const now = new Date();
    const currentWeek = getISOWeek(now);

    let prevWeek = currentWeek.week - 1;
    let prevYear = currentWeek.year;
    if (prevWeek < 1) {
      prevYear--;
      prevWeek = 52;
    }

    const alreadyAwarded = await storage.hasWeeklyWinner(prevWeek, prevYear);
    if (alreadyAwarded) {
      console.log(`[weekly-winner] Week ${prevWeek}/${prevYear} already has a winner — skipping`);
      return;
    }

    const allMembers = await storage.getAllMembers();
    if (allMembers.length === 0) {
      console.log("[weekly-winner] No members found — skipping");
      return;
    }

    const topMember = allMembers.reduce((best, m) =>
      m.weeklyCommits > best.weeklyCommits ? m : best
    );

    if (topMember.weeklyCommits <= 0) {
      console.log(`[weekly-winner] No contributions last week — no winner for week ${prevWeek}/${prevYear}`);
      return;
    }

    await storage.addWeeklyWinner({
      memberId: topMember.id,
      weekNumber: prevWeek,
      year: prevYear,
      commitCount: topMember.weeklyCommits,
    });

    console.log(`[weekly-winner] Crowned ${topMember.githubUsername} for week ${prevWeek}/${prevYear} with ${topMember.weeklyCommits} contributions`);
  } catch (err: any) {
    console.error("[weekly-winner] Error crowning weekly winner:", err.message);
  }
}

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startDailySync() {
  const delay = msUntilMidnight();
  const nextRun = new Date(Date.now() + delay);
  console.log(`[auto-sync] Scheduled daily sync — next run at ${nextRun.toISOString()}`);

  setTimeout(() => {
    syncAllMembers();
    setInterval(syncAllMembers, ONE_DAY_MS);
  }, delay);
}
