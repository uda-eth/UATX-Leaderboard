import { db } from "./db";
import { members, achievements, users } from "@shared/schema";

export async function seedDatabase() {
  try {
    const existing = await db.select().from(members);
    if (existing.length > 0) {
      return;
    }
  } catch {
    console.log("Tables not ready yet, skipping seed.");
    return;
  }

  console.log("Seeding database with sample data...");

  const seedUsers = [
    { id: "seed-user-1", email: "alice@example.com", firstName: "Alice", lastName: "Chen", profileImageUrl: null },
    { id: "seed-user-2", email: "bob@example.com", firstName: "Bob", lastName: "Martinez", profileImageUrl: null },
    { id: "seed-user-3", email: "carol@example.com", firstName: "Carol", lastName: "Kim", profileImageUrl: null },
    { id: "seed-user-4", email: "dave@example.com", firstName: "Dave", lastName: "Johnson", profileImageUrl: null },
    { id: "seed-user-5", email: "eve@example.com", firstName: "Eve", lastName: "Williams", profileImageUrl: null },
  ];

  await db.insert(users).values(seedUsers);

  const sampleMembers = [
    {
      id: "seed-1",
      userId: "seed-user-1",
      githubUsername: "alice-dev",
      displayName: "Alice Chen",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice",
      totalCommits: 187,
      weeklyCommits: 34,
      currentStreak: 5,
      longestStreak: 8,
      level: 6,
      xp: 1870,
      rank: "Apprentice",
    },
    {
      id: "seed-2",
      userId: "seed-user-2",
      githubUsername: "bob-codes",
      displayName: "Bob Martinez",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob",
      totalCommits: 312,
      weeklyCommits: 47,
      currentStreak: 12,
      longestStreak: 12,
      level: 8,
      xp: 3120,
      rank: "Intermediate",
    },
    {
      id: "seed-3",
      userId: "seed-user-3",
      githubUsername: "carol-hacks",
      displayName: "Carol Kim",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=carol",
      totalCommits: 95,
      weeklyCommits: 22,
      currentStreak: 3,
      longestStreak: 4,
      level: 4,
      xp: 950,
      rank: "Beginner",
    },
    {
      id: "seed-4",
      userId: "seed-user-4",
      githubUsername: "dave-builds",
      displayName: "Dave Johnson",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=dave",
      totalCommits: 523,
      weeklyCommits: 15,
      currentStreak: 2,
      longestStreak: 15,
      level: 10,
      xp: 5230,
      rank: "Intermediate",
    },
    {
      id: "seed-5",
      userId: "seed-user-5",
      githubUsername: "eve-creates",
      displayName: "Eve Williams",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=eve",
      totalCommits: 42,
      weeklyCommits: 8,
      currentStreak: 1,
      longestStreak: 2,
      level: 3,
      xp: 420,
      rank: "Beginner",
    },
  ];

  await db.insert(members).values(sampleMembers);

  const sampleAchievements = [
    { memberId: "seed-1", type: "joined", title: "Welcome Aboard!", description: "Joined the UATX AI Coding Club", icon: "rocket" },
    { memberId: "seed-1", type: "commits_100", title: "Centurion", description: "Reached 100 total commits", icon: "trophy" },
    { memberId: "seed-2", type: "joined", title: "Welcome Aboard!", description: "Joined the UATX AI Coding Club", icon: "rocket" },
    { memberId: "seed-2", type: "commits_100", title: "Centurion", description: "Reached 100 total commits", icon: "trophy" },
    { memberId: "seed-2", type: "streak_3", title: "On Fire!", description: "3 week coding streak", icon: "zap" },
    { memberId: "seed-3", type: "joined", title: "Welcome Aboard!", description: "Joined the UATX AI Coding Club", icon: "rocket" },
    { memberId: "seed-3", type: "commits_50", title: "Consistent Coder", description: "Reached 50 total commits", icon: "flame" },
    { memberId: "seed-4", type: "joined", title: "Welcome Aboard!", description: "Joined the UATX AI Coding Club", icon: "rocket" },
    { memberId: "seed-4", type: "commits_100", title: "Centurion", description: "Reached 100 total commits", icon: "trophy" },
    { memberId: "seed-5", type: "joined", title: "Welcome Aboard!", description: "Joined the UATX AI Coding Club", icon: "rocket" },
    { memberId: "seed-5", type: "commits_10", title: "Getting Started", description: "Reached 10 total commits", icon: "git-commit" },
  ];

  await db.insert(achievements).values(sampleAchievements);

  console.log("Database seeded successfully!");
}
