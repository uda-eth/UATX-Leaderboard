import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { fetchUserCommitEvents, fetchHistoricalCommits2026, calculateLevel, calculateXpFromCommits, getRank, getUncachableGitHubClient, checkTokenHasRepoScope } from "./github";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/leaderboard/weekly", async (_req, res) => {
    try {
      const leaderboard = await storage.getWeeklyLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching weekly leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch weekly leaderboard" });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMemberById(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  app.get("/api/members/:id/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAchievements(req.params.id);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.get("/api/members/:id/history", async (req, res) => {
    try {
      const history = await storage.getCommitHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching commit history:", error);
      res.status(500).json({ message: "Failed to fetch commit history" });
    }
  });

  app.get("/api/weekly-winners", async (_req, res) => {
    try {
      const winners = await storage.getWeeklyWinners();
      res.json(winners);
    } catch (error) {
      console.error("Error fetching weekly winners:", error);
      res.status(500).json({ message: "Failed to fetch weekly winners" });
    }
  });

  app.get("/api/me/member", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const member = await storage.getMemberByUserId(userId);
      res.json(member || null);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  app.post("/api/members", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { githubUsername } = req.body;

      if (!githubUsername) {
        return res.status(400).json({ message: "GitHub username is required" });
      }

      const existing = await storage.getMemberByUserId(userId);
      if (existing) {
        return res.status(400).json({ message: "You are already registered" });
      }

      const existingGithub = await storage.getMemberByGithubUsername(githubUsername);
      if (existingGithub) {
        return res.status(400).json({ message: "This GitHub username is already registered" });
      }

      const user = await authStorage.getUser(userId);
      const displayName = user?.firstName
        ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
        : githubUsername;

      const member = await storage.createMember({
        userId,
        githubUsername,
        displayName,
        avatarUrl: `https://github.com/${githubUsername}.png`,
      });

      await storage.addAchievement({
        memberId: member.id,
        type: "joined",
        title: "Welcome Aboard!",
        description: "Joined the UATX AI Coding Club",
        icon: "rocket",
      });

      res.json(member);

      (async () => {
        try {
          const user2 = await authStorage.getUser(userId);
          const userToken = user2?.githubAccessToken ?? null;
          console.log(`Starting deep historical scan for ${githubUsername}...`);
          const historicalCommits = await fetchHistoricalCommits2026(githubUsername, userToken);
          const weeklyCommits = await fetchUserCommitEvents(githubUsername, userToken);

          if (historicalCommits > 0) {
            const xp = calculateXpFromCommits(historicalCommits);
            const level = calculateLevel(xp);
            const rank = getRank(level);

            await storage.updateMember(member.id, {
              totalCommits: historicalCommits,
              weeklyCommits,
              xp,
              level,
              rank,
              lastSyncedAt: new Date(),
            });

            if (historicalCommits >= 10) {
              await storage.addAchievement({
                memberId: member.id,
                type: "commits_10",
                title: "Getting Started",
                description: "Reached 10 total contributions",
                icon: "git-commit",
              });
            }
            if (historicalCommits >= 50) {
              await storage.addAchievement({
                memberId: member.id,
                type: "commits_50",
                title: "Consistent Coder",
                description: "Reached 50 total contributions",
                icon: "flame",
              });
            }
            if (historicalCommits >= 100) {
              await storage.addAchievement({
                memberId: member.id,
                type: "commits_100",
                title: "Centurion",
                description: "Reached 100 total contributions",
                icon: "trophy",
              });
            }

            console.log(`Historical scan complete for ${githubUsername}: ${historicalCommits} commits in 2026`);
          }
        } catch (error) {
          console.error(`Background historical scan failed for ${githubUsername}:`, error);
        }
      })();
    } catch (error) {
      console.error("Error creating member:", error);
      res.status(500).json({ message: "Failed to create member" });
    }
  });

  app.get("/api/auth/github/scope-status", isAuthenticated, async (req, res) => {
    try {
      const user = await authStorage.getUser(req.session.userId!);
      if (!user?.githubAccessToken) {
        return res.json({ connected: false, hasRepoScope: false });
      }
      const hasRepoScope = await checkTokenHasRepoScope(user.githubAccessToken);
      res.json({ connected: true, hasRepoScope });
    } catch (error) {
      res.status(500).json({ message: "Failed to check token scope" });
    }
  });

  app.post("/api/sync-commits", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const member = await storage.getMemberByUserId(userId);

      if (!member) {
        return res.status(404).json({ message: "Member not found. Please register first." });
      }

      const user = await authStorage.getUser(userId);
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

      const streak = weeklyCommits > 0 ? member.currentStreak + 1 : 0;
      const longestStreak = Math.max(member.longestStreak, streak);

      const updated = await storage.updateMember(member.id, {
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

      res.json(updated);
    } catch (error) {
      console.error("Error syncing commits:", error);
      res.status(500).json({ message: "Failed to sync contributions" });
    }
  });

  return httpServer;
}
