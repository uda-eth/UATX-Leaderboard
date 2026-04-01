import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";

function getCallbackUrl(req: Express.Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.hostname;
  return `${proto}://${host}/api/auth/github/callback`;
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await authStorage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const { passwordHash: _, githubAccessToken: __, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const hash = await bcrypt.hash(password, 12);
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await authStorage.getUserByEmail(normalizedEmail);
      if (existing) {
        if (existing.passwordHash) {
          return res.status(400).json({ message: "An account with this email already exists. Please log in." });
        }
        const updated = await authStorage.setPasswordHash(existing.id, hash);
        req.session.userId = updated.id;
        const { passwordHash: _, githubAccessToken: __, ...safeUser } = updated;
        return res.json(safeUser);
      }
      const user = await authStorage.createUser({
        email: normalizedEmail,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        passwordHash: hash,
      });
      req.session.userId = user.id;
      const { passwordHash: _, githubAccessToken: __, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await authStorage.getUserByEmail(email.toLowerCase().trim());
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      const { passwordHash: _, githubAccessToken: __, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Failed to log out" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId!;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      const user = await authStorage.getUser(userId);
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: "Unable to verify current password" });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const newHash = await bcrypt.hash(newPassword, 12);
      await authStorage.setPasswordHash(userId, newHash);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // GitHub OAuth — step 1: redirect to GitHub
  app.get("/api/auth/github", isAuthenticated, (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.redirect("/?error=github_not_configured");
    }
    const state = Math.random().toString(36).substring(2, 18);
    req.session.githubOAuthState = state;
    req.session.save(() => {
      const params = new URLSearchParams({
        client_id: clientId,
        scope: "repo read:user user:email",
        state,
        redirect_uri: getCallbackUrl(req as any),
      });
      res.redirect(`https://github.com/login/oauth/authorize?${params}`);
    });
  });

  // GitHub OAuth — step 2: handle callback
  app.get("/api/auth/github/callback", isAuthenticated, async (req, res) => {
    try {
      const { code, state, error } = req.query as Record<string, string>;

      if (error) {
        console.error("GitHub OAuth error:", error);
        return res.redirect("/?github=denied");
      }

      if (!state || state !== req.session.githubOAuthState) {
        console.error("GitHub OAuth state mismatch");
        return res.redirect("/?error=oauth_state_mismatch");
      }

      delete req.session.githubOAuthState;

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.redirect("/?error=github_not_configured");
      }

      // Exchange code for access token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: getCallbackUrl(req as any),
        }),
      });

      const tokenData = await tokenRes.json() as any;

      if (tokenData.error || !tokenData.access_token) {
        console.error("GitHub token exchange failed:", tokenData);
        return res.redirect("/?error=github_token_failed");
      }

      // Fetch GitHub user info
      const githubUserRes = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `token ${tokenData.access_token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      });
      const githubUser = await githubUserRes.json() as any;

      if (!githubUser.id) {
        console.error("Failed to fetch GitHub user:", githubUser);
        return res.redirect("/?error=github_user_failed");
      }

      // Store GitHub connection on the current user
      await authStorage.setGithubConnection(
        req.session.userId!,
        String(githubUser.id),
        tokenData.access_token
      );

      console.log(`GitHub connected for user ${req.session.userId}: @${githubUser.login}`);
      res.redirect("/?github=connected");
    } catch (err) {
      console.error("GitHub OAuth callback error:", err);
      res.redirect("/?error=github_oauth_failed");
    }
  });

  // Get GitHub connection status
  app.get("/api/auth/github/status", isAuthenticated, async (req, res) => {
    try {
      const user = await authStorage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      res.json({ connected: !!user.githubId && !!user.githubAccessToken });
    } catch (error) {
      res.status(500).json({ message: "Failed to check GitHub status" });
    }
  });

  // Disconnect GitHub
  app.post("/api/auth/github/disconnect", isAuthenticated, async (req, res) => {
    try {
      await authStorage.disconnectGithub(req.session.userId!);
      res.json({ message: "GitHub disconnected" });
    } catch (error) {
      res.status(500).json({ message: "Failed to disconnect GitHub" });
    }
  });
}
