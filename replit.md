# UATX AI Coding Club Leaderboard

## Overview
A gamified coding leaderboard for the UATX AI Coding Club. Members sign in via Replit Auth (supports GitHub, Google, etc.), link their GitHub username, and compete based on weekly GitHub commits.

## Architecture
- **Frontend**: React + TypeScript with Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)
- **GitHub API**: Octokit via Replit GitHub connector

## Key Features
- GitHub contribution tracking (commits, issues, PRs, reviews — matches GitHub profile totals)
- Automatic daily sync at midnight for all members (server/cron.ts)
- XP/leveling system (10 XP per contribution)
- Rank progression (Newbie -> Legendary)
- Weekly and all-time leaderboards
- Achievement system (milestones, streaks)
- Weekly winner hall of fame
- Streak tracking

## Project Structure
```
shared/
  schema.ts          - Re-exports all models
  models/
    auth.ts          - Users & sessions tables (Replit Auth)
    leaderboard.ts   - Members, commit history, achievements, weekly winners
server/
  index.ts           - Express app setup
  db.ts              - Neon/PostgreSQL connection
  routes.ts          - API endpoints
  storage.ts         - Database CRUD operations
  github.ts          - GitHub API integration (Octokit connector)
  cron.ts            - Daily auto-sync scheduler (runs at midnight)
  seed.ts            - Sample data seeder
  replit_integrations/auth/ - Replit Auth module
client/src/
  App.tsx            - Root with auth-gated routing
  pages/
    landing.tsx      - Public landing page
    home.tsx         - Main dashboard with leaderboard
  components/
    register-form.tsx    - GitHub username registration
    leaderboard-table.tsx - Leaderboard display
    achievement-card.tsx  - Achievement display
  hooks/
    use-auth.ts      - Auth state hook
  lib/
    game-utils.ts    - XP/rank calculations
    auth-utils.ts    - Auth error helpers
    queryClient.ts   - TanStack Query setup
```

## Database Tables
- `users` - Replit Auth users
- `sessions` - Session storage
- `members` - Club members with GitHub link, XP, level, rank
- `commit_history` - Daily commit records
- `achievements` - Unlocked achievements
- `weekly_winners` - Weekly champion records

## Integrations
- Replit Auth (javascript_log_in_with_replit)
- GitHub connector (for Octokit API access)
