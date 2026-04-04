import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Code2, ArrowRight, LogOut } from "lucide-react";
import { SiGithub } from "react-icons/si";
import type { User } from "@shared/models/auth";

export function RegisterForm({ user }: { user: User | null | undefined }) {
  const [githubUsername, setGithubUsername] = useState("");
  const { toast } = useToast();

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/members", { githubUsername: githubUsername.trim() });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/member"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({ title: "Welcome!", description: "You've joined the UATX AI Coding Club!" });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center mx-auto">
            <Code2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Join the Leaderboard</h1>
          <p className="text-muted-foreground text-sm">
            Link your GitHub account to start tracking contributions and earning XP.
          </p>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">GitHub Username</CardTitle>
            <CardDescription>
              Enter your GitHub username so we can track your public contributions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github-username">Username</Label>
              <div className="relative">
                <SiGithub className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="github-username"
                  placeholder="octocat"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="pl-10"
                  data-testid="input-github-username"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => registerMutation.mutate()}
              disabled={!githubUsername.trim() || registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Joining..." : "Join the Club"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <a href="/api/logout">
            <Button variant="ghost" size="sm" data-testid="button-logout-register">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
