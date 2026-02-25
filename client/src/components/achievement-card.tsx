import { Card, CardContent } from "@/components/ui/card";
import { GitCommitHorizontal, Flame, Trophy, Zap, Rocket, Star } from "lucide-react";
import type { Achievement } from "@shared/models/leaderboard";

function getAchievementIcon(icon: string | null) {
  switch (icon) {
    case "git-commit": return GitCommitHorizontal;
    case "flame": return Flame;
    case "trophy": return Trophy;
    case "zap": return Zap;
    case "rocket": return Rocket;
    default: return Star;
  }
}

function getAchievementColor(type: string): string {
  if (type.includes("100")) return "text-yellow-500 bg-yellow-500/10";
  if (type.includes("50")) return "text-purple-500 bg-purple-500/10";
  if (type.includes("streak")) return "text-orange-500 bg-orange-500/10";
  if (type === "joined") return "text-blue-500 bg-blue-500/10";
  return "text-green-500 bg-green-500/10";
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const Icon = getAchievementIcon(achievement.icon);
  const colorClass = getAchievementColor(achievement.type);
  const colors = colorClass.split(" ");

  return (
    <Card className="bg-card" data-testid={`card-achievement-${achievement.id}`}>
      <CardContent className="pt-4 pb-4 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${colors[1]}`}>
          <Icon className={`w-5 h-5 ${colors[0]}`} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{achievement.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
          {achievement.earnedAt && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(achievement.earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
