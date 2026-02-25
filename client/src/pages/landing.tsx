import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitCommitHorizontal, Trophy, Flame, Users, ArrowRight, Code2, Zap, Target, Eye, EyeOff } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function AuthDialog({ open, onOpenChange, defaultTab }: { open: boolean; onOpenChange: (v: boolean) => void; defaultTab: "login" | "signup" }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ firstName: "", lastName: "", email: "", password: "" });

  function parseErrorMessage(err: any, fallback: string): string {
    const raw = err?.message || fallback;
    const match = raw.match(/^\d+: (.+)$/);
    if (match) {
      try { return JSON.parse(match[1]).message || match[1]; } catch { return match[1]; }
    }
    return raw;
  }

  const loginMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/login", loginForm),
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/auth/user"], await data.json());
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Login failed", description: parseErrorMessage(err, "Login failed"), variant: "destructive" });
    },
  });

  const signupMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/signup", signupForm),
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/auth/user"], await data.json());
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Signup failed", description: parseErrorMessage(err, "Signup failed"), variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary-foreground" />
            </div>
            UATX Code Club
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="tab-login">Log In</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm(f => ({ ...f, email: e.target.value }))}
                data-testid="input-login-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate()}
                  data-testid="input-login-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(v => !v)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending || !loginForm.email || !loginForm.password}
              data-testid="button-login-submit"
            >
              {loginMutation.isPending ? "Logging in..." : "Log In"}
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="signup-firstname">First Name</Label>
                <Input
                  id="signup-firstname"
                  placeholder="Alex"
                  value={signupForm.firstName}
                  onChange={(e) => setSignupForm(f => ({ ...f, firstName: e.target.value }))}
                  data-testid="input-signup-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-lastname">Last Name</Label>
                <Input
                  id="signup-lastname"
                  placeholder="Smith"
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm(f => ({ ...f, lastName: e.target.value }))}
                  data-testid="input-signup-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={signupForm.email}
                onChange={(e) => setSignupForm(f => ({ ...f, email: e.target.value }))}
                data-testid="input-signup-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && signupMutation.mutate()}
                  data-testid="input-signup-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => signupMutation.mutate()}
              disabled={signupMutation.isPending || !signupForm.email || !signupForm.password}
              data-testid="button-signup-submit"
            >
              {signupMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              After signing up, you'll link your GitHub username to start tracking commits.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");

  const openAuth = (tab: "login" | "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />

      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight" data-testid="text-logo">UATX Code Club</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => openAuth("login")} data-testid="button-login-nav">
              Log In
            </Button>
            <Button onClick={() => openAuth("signup")} data-testid="button-signup-nav">
              Sign Up
            </Button>
          </div>
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
                <Button size="lg" onClick={() => openAuth("signup")} data-testid="button-get-started">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => openAuth("login")} data-testid="button-login-hero">
                  Log In
                </Button>
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
                ].map((u) => (
                  <div key={u.rank} className="flex items-center gap-3 p-3 rounded-md bg-background/50">
                    <span className={`font-bold text-lg w-6 text-center ${u.color}`}>
                      {u.rank === 1 ? (
                        <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                      ) : (
                        `#${u.rank}`
                      )}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground">Level {u.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{u.commits}</p>
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
                  Create a free account and link your GitHub username. Your public commits are automatically tracked every time you sync.
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
