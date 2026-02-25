import { sql } from "drizzle-orm";
import { pgTable, varchar, integer, timestamp, text, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  githubUsername: varchar("github_username").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  avatarUrl: varchar("avatar_url"),
  totalCommits: integer("total_commits").notNull().default(0),
  weeklyCommits: integer("weekly_commits").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  rank: varchar("rank").notNull().default("Newbie"),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastSyncedAt: timestamp("last_synced_at"),
});

export const commitHistory = pgTable("commit_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  commitCount: integer("commit_count").notNull().default(0),
  commitDate: date("commit_date").notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  type: varchar("type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  icon: varchar("icon"),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const weeklyWinners = pgTable("weekly_winners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  commitCount: integer("commit_count").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  totalCommits: true,
  weeklyCommits: true,
  currentStreak: true,
  longestStreak: true,
  level: true,
  xp: true,
  rank: true,
  joinedAt: true,
  lastSyncedAt: true,
});

export const insertCommitHistorySchema = createInsertSchema(commitHistory).omit({ id: true });
export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, earnedAt: true });
export const insertWeeklyWinnerSchema = createInsertSchema(weeklyWinners).omit({ id: true, awardedAt: true });

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type CommitHistory = typeof commitHistory.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type WeeklyWinner = typeof weeklyWinners.$inferSelect;
