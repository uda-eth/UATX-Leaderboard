import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy, GitCommitHorizontal, Flame, RefreshCw, LogOut, Code2,
  Zap, Crown, Medal, Star, Target, TrendingUp, Award, Settings, CheckCircle2, Link2Off
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { SiGithub } from "react-icons/si";
import { useEffect } from "react";
import { getXpForNextLevel } from "@/lib/game-utils";
import { RegisterForm } from "@/components/register-form";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { AchievementCard } from "@/components/achievement-card";
import type { Member, Achievement, WeeklyWinner } from "@shared/models/leaderboard";

function getRankColor(rank: string): string {
  switch (rank) {
    case "Legendary": return "text-yellow-500";
    case "Grandmaster": return "text-red-500";
    case "Master": return "text-purple-500";
    case "Expert": return "text-blue-500";
    case "Advanced": return "text-cyan-500";
    case "Intermediate": return "text-green-500";
    case "Apprentice": return "text-orange-500";
    case "Beginner": return "text-muted-foreground";
    default: return "text-muted-foreground";
  }
}

function getRankIcon(rank: string) {
  switch (rank) {
    case "Legendary": return Crown;
    case "Grandmaster": return Trophy;
    case "Master": return Star;
    case "Expert": return Target;
    default: return Medal;
  }
}

export default function Home() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const search = useSearch();

  const { data: myMember, isLoading: memberLoading } = useQuery<Member | null>({
    queryKey: ["/api/me/member"],
    queryFn: async () => {
      const res = await fetch("/api/me/member", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery<Member[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: weeklyLeaderboard = [] } = useQuery<Member[]>({
    queryKey: ["/api/leaderboard/weekly"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard/weekly");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: weeklyWinners = [] } = useQuery<(WeeklyWinner & { member?: Member })[]>({
    queryKey: ["/api/weekly-winners"],
    queryFn: async () => {
      const res = await fetch("/api/weekly-winners");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ["/api/members", myMember?.id, "achievements"],
    queryFn: async () => {
      if (!myMember?.id) return [];
      const res = await fetch(`/api/members/${myMember.id}/achievements`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!myMember?.id,
  });

  const { data: githubStatus, refetch: refetchGithubStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/auth/github/status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/github/status", { credentials: "include" });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const disconnectGithubMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/github/disconnect");
      return res.json();
    },
    onSuccess: () => {
      refetchGithubStatus();
      toast({ title: "GitHub disconnected", description: "Contributions will now only count public repos." });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sync-commits");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/member"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/weekly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", myMember?.id, "achievements"] });
      toast({ title: "Synced!", description: "Your contributions have been updated." });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not sync contributions. Try again.", variant: "destructive" });
    },
  });

  // Handle GitHub OAuth redirect messages
  useEffect(() => {
    const params = new URLSearchParams(search);
    const github = params.get("github");
    const error = params.get("error");
    if (github === "connected") {
      refetchGithubStatus();
      toast({ title: "GitHub connected!", description: "Private repo contributions will now be counted too. Sync to update." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (github === "denied") {
      toast({ title: "GitHub access denied", description: "You can connect GitHub anytime from your profile.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      toast({ title: "GitHub connection failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [search]);

  if (memberLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!myMember) {
    return <RegisterForm user={user} />;
  }

  const myRank = leaderboard.findIndex(m => m.id === myMember.id) + 1;
  const xpNeeded = getXpForNextLevel(myMember.level);
  const xpProgress = myMember.xp > 0 ? Math.min((myMember.xp / xpNeeded) * 100, 100) : 0;
  const RankIcon = getRankIcon(myMember.rank);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">UATX Code Club</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              data-testid="button-sync"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? "Syncing..." : "Sync Contributions"}
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={myMember.avatarUrl || undefined} alt={myMember.displayName} />
              <AvatarFallback>{myMember.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Link href="/account">
              <Button variant="ghost" size="icon" data-testid="button-account">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={myMember.avatarUrl || undefined} alt={myMember.displayName} />
                  <AvatarFallback className="text-lg">{myMember.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold truncate" data-testid="text-user-name">{myMember.displayName}</h2>
                    <Badge variant="secondary" className={getRankColor(myMember.rank)}>
                      <RankIcon className="w-3 h-3 mr-1" />
                      {myMember.rank}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <SiGithub className="w-3.5 h-3.5" />
                    <span>{myMember.githubUsername}</span>
                    {myRank > 0 && (
                      <span className="ml-2">Rank #{myRank}</span>
                    )}
                  </div>
                  <div className="mt-2">
                    {githubStatus?.connected ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-green-600 dark:text-green-400 text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          GitHub Connected (private repos tracked)
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-xs text-muted-foreground"
                          onClick={() => disconnectGithubMutation.mutate()}
                          disabled={disconnectGithubMutation.isPending}
                          data-testid="button-disconnect-github"
                        >
                          <Link2Off className="w-3 h-3 mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => window.location.href = "/api/auth/github"}
                        data-testid="button-connect-github"
                      >
                        <SiGithub className="w-3.5 h-3.5" />
                        Connect GitHub (unlock private repos)
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">Level {myMember.level}</span>
                      <span className="text-muted-foreground">{myMember.xp} / {xpNeeded} XP</span>
                    </div>
                    <Progress value={xpProgress} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <GitCommitHorizontal className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-commits">{myMember.totalCommits}</p>
                  <p className="text-xs text-muted-foreground">Total Contributions</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">This week</span>
                <span className="text-sm font-semibold" data-testid="text-weekly-commits">{myMember.weeklyCommits}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-current-streak">{myMember.currentStreak}</p>
                  <p className="text-xs text-muted-foreground">Week Streak</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Longest</span>
                <span className="text-sm font-semibold">{myMember.longestStreak} weeks</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="weekly" className="space-y-4">
          <TabsList data-testid="tabs-leaderboard">
            <TabsTrigger value="weekly" data-testid="tab-weekly">
              <Zap className="w-4 h-4 mr-1.5" />
              This Week
            </TabsTrigger>
            <TabsTrigger value="alltime" data-testid="tab-alltime">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              All Time
            </TabsTrigger>
            <TabsTrigger value="achievements" data-testid="tab-achievements">
              <Award className="w-4 h-4 mr-1.5" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="winners" data-testid="tab-winners">
              <Crown className="w-4 h-4 mr-1.5" />
              Hall of Fame
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5 text-primary" />
                  Weekly Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : (
                  <LeaderboardTable members={weeklyLeaderboard} sortBy="weekly" currentMemberId={myMember.id} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alltime">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  All-Time Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : (
                  <LeaderboardTable members={leaderboard} sortBy="alltime" currentMemberId={myMember.id} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="w-5 h-5 text-primary" />
                  Your Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No achievements yet</p>
                    <p className="text-sm mt-1">Start coding and sync your contributions to unlock achievements!</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {achievements.map((a) => (
                      <AchievementCard key={a.id} achievement={a} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="winners">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Hall of Fame
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyWinners.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No weekly winners yet</p>
                    <p className="text-sm mt-1">The first weekly champion will be crowned soon!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weeklyWinners.map((winner) => (
                      <div
                        key={winner.id}
                        className="flex items-center gap-4 p-4 rounded-md bg-background/50"
                        data-testid={`card-winner-${winner.id}`}
                      >
                        <Trophy className="w-6 h-6 text-yellow-500 shrink-0" />
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={winner.member?.avatarUrl || undefined} />
                          <AvatarFallback>{winner.member?.displayName?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{winner.member?.displayName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            Week {winner.weekNumber}, {winner.year}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{winner.commitCount}</p>
                          <p className="text-xs text-muted-foreground">contributions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
