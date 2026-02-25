import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown } from "lucide-react";
import type { Member } from "@shared/models/leaderboard";

function getRankMedalIcon(position: number) {
  if (position === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (position === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (position === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-semibold text-muted-foreground w-5 text-center">#{position}</span>;
}

function getRankBadgeColor(rank: string): "default" | "secondary" | "outline" | "destructive" {
  switch (rank) {
    case "Legendary":
    case "Grandmaster":
    case "Master":
      return "default";
    case "Expert":
    case "Advanced":
      return "secondary";
    default:
      return "outline";
  }
}

export function LeaderboardTable({
  members,
  sortBy,
  currentMemberId,
}: {
  members: Member[];
  sortBy: "weekly" | "alltime";
  currentMemberId?: string;
}) {
  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No members yet</p>
        <p className="text-sm mt-1">Be the first to join!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member, index) => {
        const isCurrentUser = member.id === currentMemberId;
        const commits = sortBy === "weekly" ? member.weeklyCommits : member.totalCommits;

        return (
          <div
            key={member.id}
            className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
              isCurrentUser
                ? "bg-primary/5 ring-1 ring-primary/20"
                : "bg-background/50"
            }`}
            data-testid={`row-member-${member.id}`}
          >
            <div className="w-8 flex justify-center shrink-0">
              {getRankMedalIcon(index + 1)}
            </div>

            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={member.avatarUrl || undefined} alt={member.displayName} />
              <AvatarFallback className="text-xs">
                {member.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{member.displayName}</span>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">You</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={getRankBadgeColor(member.rank)} className="text-[10px] px-1.5 py-0">
                  Lv.{member.level} {member.rank}
                </Badge>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="font-bold text-lg tabular-nums">{commits}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {sortBy === "weekly" ? "this week" : "total"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
