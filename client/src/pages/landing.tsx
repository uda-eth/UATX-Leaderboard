import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCommitHorizontal, Trophy, Flame, Users, ArrowRight, Code2, Zap, Target } from "lucide-react";
import { SiGithub } from "react-icons/si";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight" data-testid="text-logo">UATX Code Club</span>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login-nav">
              <SiGithub className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </a>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-2">
                <Badge variant="secondary" className="mb-4">
                  <Zap className="w-3 h-3 mr-1" />
                  Season 1 Active
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]" data-testid="text-hero-title">
                  Code More.
                  <br />
                  <span className="text-primary">Win More.</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg mt-4">
                  The UATX AI Coding Club leaderboard. Track your GitHub commits, climb the ranks, earn achievements, and compete for weekly glory.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="/api/login">
                  <Button size="lg" data-testid="button-get-started">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <SiGithub className="w-4 h-4" />
                  GitHub Connected
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  Weekly Winners
                </span>
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  Streak Tracking
                </span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative bg-card border border-card-border rounded-md p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 mb-6">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">This Week's Top Coders</h3>
                  <Badge variant="outline">Live</Badge>
                </div>
                {[
                  { rank: 1, name: "Alice Chen", commits: 47, level: 12, color: "text-yellow-500" },
                  { rank: 2, name: "Bob Martinez", commits: 38, level: 9, color: "text-gray-400" },
                  { rank: 3, name: "Carol Kim", commits: 31, level: 7, color: "text-amber-600" },
                  { rank: 4, name: "Dave Johnson", commits: 24, level: 5, color: "" },
                  { rank: 5, name: "Eve Williams", commits: 19, level: 4, color: "" },
                ].map((user) => (
                  <div
                    key={user.rank}
                    className="flex items-center gap-3 p-3 rounded-md bg-background/50"
                  >
                    <span className={`font-bold text-lg w-6 text-center ${user.color}`}>
                      {user.rank === 1 ? (
                        <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                      ) : (
                        `#${user.rank}`
                      )}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">Level {user.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{user.commits}</p>
                      <p className="text-xs text-muted-foreground">commits</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight" data-testid="text-features-title">How It Works</h2>
            <p className="text-muted-foreground mt-2">Three steps to coding glory</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-card">
              <CardContent className="pt-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Join the Club</h3>
                <p className="text-sm text-muted-foreground">
                  Sign in and link your GitHub username. Your public commits are automatically tracked every time you sync.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="pt-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <GitCommitHorizontal className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Push Code, Earn XP</h3>
                <p className="text-sm text-muted-foreground">
                  Every commit earns you XP. Level up, unlock achievements, and build your coding streak week after week.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="pt-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Compete Weekly</h3>
                <p className="text-sm text-muted-foreground">
                  Each week the top coder is crowned champion. Build your legacy and climb the all-time leaderboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>UATX AI Coding Club</p>
          <p>Built with love for code</p>
        </div>
      </footer>
    </div>
  );
}
