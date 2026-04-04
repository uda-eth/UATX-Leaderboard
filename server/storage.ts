import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  members, commitHistory, achievements, weeklyWinners,
  type Member, type InsertMember, type CommitHistory, type Achievement, type WeeklyWinner
} from "@shared/schema";

export interface IStorage {
  getMemberByUserId(userId: string): Promise<Member | undefined>;
  getMemberByGithubUsername(username: string): Promise<Member | undefined>;
  getMemberById(id: string): Promise<Member | undefined>;
  getAllMembers(): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, data: Partial<Member>): Promise<Member>;
  getLeaderboard(): Promise<Member[]>;
  getWeeklyLeaderboard(): Promise<Member[]>;
  getCommitHistory(memberId: string): Promise<CommitHistory[]>;
  addCommitHistory(data: Omit<CommitHistory, 'id'>): Promise<CommitHistory>;
  getAchievements(memberId: string): Promise<Achievement[]>;
  addAchievement(data: Omit<Achievement, 'id' | 'earnedAt'>): Promise<Achievement>;
  getWeeklyWinners(): Promise<(WeeklyWinner & { member?: Member })[]>;
  addWeeklyWinner(data: Omit<WeeklyWinner, 'id' | 'awardedAt'>): Promise<WeeklyWinner>;
  fixInflatedStreaks(): Promise<{ fixed: number }>;
}

class DatabaseStorage implements IStorage {
  async getMemberByUserId(userId: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.userId, userId));
    return member;
  }

  async getMemberByGithubUsername(username: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.githubUsername, username));
    return member;
  }

  async getMemberById(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async getAllMembers(): Promise<Member[]> {
    return db.select().from(members).orderBy(desc(members.totalCommits));
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [created] = await db.insert(members).values(member).returning();
    return created;
  }

  async updateMember(id: string, data: Partial<Member>): Promise<Member> {
    const [updated] = await db.update(members).set(data).where(eq(members.id, id)).returning();
    return updated;
  }

  async getLeaderboard(): Promise<Member[]> {
    return db.select().from(members).orderBy(desc(members.xp));
  }

  async getWeeklyLeaderboard(): Promise<Member[]> {
    return db.select().from(members).orderBy(desc(members.weeklyCommits));
  }

  async getCommitHistory(memberId: string): Promise<CommitHistory[]> {
    return db.select().from(commitHistory)
      .where(eq(commitHistory.memberId, memberId))
      .orderBy(desc(commitHistory.commitDate));
  }

  async addCommitHistory(data: Omit<CommitHistory, 'id'>): Promise<CommitHistory> {
    const [created] = await db.insert(commitHistory).values(data).returning();
    return created;
  }

  async getAchievements(memberId: string): Promise<Achievement[]> {
    return db.select().from(achievements)
      .where(eq(achievements.memberId, memberId))
      .orderBy(desc(achievements.earnedAt));
  }

  async addAchievement(data: Omit<Achievement, 'id' | 'earnedAt'>): Promise<Achievement> {
    const [created] = await db.insert(achievements).values(data).returning();
    return created;
  }

  async getWeeklyWinners(): Promise<(WeeklyWinner & { member?: Member })[]> {
    const winners = await db.select().from(weeklyWinners)
      .orderBy(desc(weeklyWinners.year), desc(weeklyWinners.weekNumber));
    
    const result = [];
    for (const winner of winners) {
      const member = await this.getMemberById(winner.memberId);
      result.push({ ...winner, member });
    }
    return result;
  }

  async addWeeklyWinner(data: Omit<WeeklyWinner, 'id' | 'awardedAt'>): Promise<WeeklyWinner> {
    const [created] = await db.insert(weeklyWinners).values(data).returning();
    return created;
  }

  async fixInflatedStreaks(): Promise<{ fixed: number }> {
    const result = await db.execute(sql`
      WITH corrected AS (
        UPDATE members
        SET
          current_streak = LEAST(
            current_streak,
            GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(last_synced_at, now()) - joined_at)) / 604800)::int + 1)
          ),
          longest_streak = LEAST(
            longest_streak,
            GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(last_synced_at, now()) - joined_at)) / 604800)::int + 1)
          )
        WHERE
          current_streak > GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(last_synced_at, now()) - joined_at)) / 604800)::int + 1)
          OR longest_streak > GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(last_synced_at, now()) - joined_at)) / 604800)::int + 1)
        RETURNING id
      )
      SELECT COUNT(*) AS fixed FROM corrected
    `);
    const fixed = parseInt((result.rows[0] as any).fixed, 10) || 0;
    console.log(`[streak-backfill] Fixed ${fixed} member(s) with inflated streaks`);
    return { fixed };
  }
}

export const storage = new DatabaseStorage();
