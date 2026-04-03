import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Code2, ArrowLeft, Mail, Lock, KeyRound, Eye, EyeOff,
  CheckCircle2, Link2Off, ShieldCheck, AlertCircle
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { Link, useSearch } from "wouter";
import { useState, useEffect } from "react";
import type { Member } from "@shared/models/leaderboard";

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: myMember, isLoading: memberLoading } = useQuery<Member | null>({
    queryKey: ["/api/me/member"],
    queryFn: async () => {
      const res = await fetch("/api/me/member", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: githubStatus, refetch: refetchGithubStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/auth/github/status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/github/status", { credentials: "include" });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const { data: githubScopeStatus, refetch: refetchScopeStatus } = useQuery<{ connected: boolean; hasRepoScope: boolean }>({
    queryKey: ["/api/auth/github/scope-status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/github/scope-status", { credentials: "include" });
      if (!res.ok) return { connected: false, hasRepoScope: false };
      return res.json();
    },
    enabled: !!githubStatus?.connected,
  });

  const disconnectGithubMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/github/disconnect");
      return res.json();
    },
    onSuccess: () => {
      refetchGithubStatus();
      refetchScopeStatus();
      toast({ title: "GitHub disconnected", description: "Commits will now only count public repos." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect GitHub.", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handle GitHub OAuth redirect params
  useEffect(() => {
    const params = new URLSearchParams(search);
    const github = params.get("github");
    const error = params.get("error");
    if (github === "connected") {
      refetchGithubStatus();
      toast({ title: "GitHub connected!", description: "Private repo commits will now be counted. Sync from the dashboard to update." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (github === "denied") {
      toast({ title: "GitHub access denied", description: "You can connect anytime from this page.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      toast({ title: "GitHub connection failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [search]);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (memberLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">UATX Code Club</span>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account details and security</p>
        </div>

        {/* Email Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5" />
              Email Address
            </CardTitle>
            <CardDescription>Your login email address</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium" data-testid="text-email">{user?.email || "No email"}</span>
            </div>
          </CardContent>
        </Card>

        {/* GitHub OAuth Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SiGithub className="w-5 h-5" />
              GitHub OAuth
            </CardTitle>
            <CardDescription>
              Connect your GitHub account to track commits from private repositories as well as public ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {myMember && (
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={myMember.avatarUrl || undefined} alt={myMember.githubUsername} />
                  <AvatarFallback>{myMember.githubUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <SiGithub className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{myMember.githubUsername}</span>
                  </div>
                  <a
                    href={`https://github.com/${myMember.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    data-testid="link-github-profile"
                  >
                    View GitHub Profile →
                  </a>
                </div>
              </div>
            )}

            {githubStatus?.connected ? (
              <div className="space-y-3">
                {githubScopeStatus?.hasRepoScope === false ? (
                  <div className="flex items-start gap-3 p-4 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">OAuth connected — but missing private repo access</p>
                      <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                        Your token was created without full repository access. Disconnect and reconnect to fix this so private repo commits are counted.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-4 rounded-md border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">OAuth connected</p>
                        <Badge variant="secondary" className="text-green-700 dark:text-green-400 text-xs">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Private repos tracked
                        </Badge>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">
                        Your commit syncs now include private repositories. Hit "Sync Commits" on the dashboard to update your count.
                      </p>
                    </div>
                  </div>
                )}
                {githubScopeStatus?.hasRepoScope === false && (
                  <Button
                    className="w-full gap-2"
                    onClick={() => window.location.href = "/api/auth/github"}
                    data-testid="button-reconnect-github"
                  >
                    <SiGithub className="w-4 h-4" />
                    Reconnect GitHub with Full Access
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => disconnectGithubMutation.mutate()}
                  disabled={disconnectGithubMutation.isPending}
                  data-testid="button-disconnect-github"
                >
                  <Link2Off className="w-4 h-4 mr-2" />
                  {disconnectGithubMutation.isPending ? "Disconnecting..." : "Disconnect GitHub OAuth"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Tracking public repos only</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                      Connect GitHub OAuth to also count commits from your private repositories.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => window.location.href = "/api/auth/github"}
                  data-testid="button-connect-github"
                >
                  <SiGithub className="w-4 h-4" />
                  Connect GitHub with OAuth
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5" />
              Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pl-10 pr-10"
                    required
                    data-testid="input-current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="w-full"
                data-testid="button-update-password"
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
