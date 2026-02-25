export function getXpForNextLevel(level: number): number {
  return level * level * 50;
}

export function getRankColor(rank: string): string {
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
