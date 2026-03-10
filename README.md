# Abandoned by Me

>[!IMPORTANT]
> Due to recent github outages this repo has been migrated to https://gitlab.com/st2projects1/abandoned-by-me-dev

A cemetery for code that never made it. Sign in with GitHub, scan your repos, and face the truth about your abandoned side projects. Share your graveyard with the world so others can pay their respects.

**Live at [abandoned-by-me.dev](https://abandoned-by-me.dev)**

## Features

- **Repository scanning** — Connects to GitHub, analyzes commit history, and identifies which repos you've abandoned (configurable threshold)
- **Badges of Dishonor** — Earn achievements like "Serial Abandoner", "Graveyard Keeper", and "January Enthusiast" based on your repo patterns
- **Public dashboards** — Shareable profile pages showing your abandoned repos (public repos only)
- **Pay Respects** — Visitors can anonymously pay respects to your fallen projects
- **Repo Adoption Agency** — Mark abandoned repos as "up for adoption" so other developers can discover and fork them
- **Auto-refresh** — Optional background job keeps your graveyard up to date
- **Privacy-first** — No analytics, no tracking, no telemetry. Delete your account and all data at any time

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) — Full-stack framework
- [SQLite](https://sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Database
- [Drizzle ORM](https://orm.drizzle.team/) — Type-safe database queries
- [better-auth](https://www.better-auth.com/) — Authentication (GitHub OAuth)
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client

## Local Development

1. **Create a GitHub OAuth App** at [github.com/settings/developers](https://github.com/settings/developers)

   - Homepage URL: `http://localhost:5173`
   - Callback URL: `http://localhost:5173/api/auth/callback/github`

2. **Set up the project**

   ```bash
   git clone <repo-url> && cd abandoned-by-me.dev
   cp .env.example .env
   # Edit .env with your GitHub OAuth credentials and a random secret
   npm install
   npm run dev
   ```

3. **Open** [http://localhost:5173](http://localhost:5173)

The SQLite database is created automatically on first run. No external services needed.

## Environment Variables

| Variable                 | Description                    | Default                 |
| ------------------------ | ------------------------------ | ----------------------- |
| `DATABASE_URL`           | SQLite file path               | `./data/app.db`         |
| `GITHUB_CLIENT_ID`       | GitHub OAuth App client ID     | —                       |
| `GITHUB_CLIENT_SECRET`   | GitHub OAuth App client secret | —                       |
| `BETTER_AUTH_SECRET`     | Secret for auth encryption     | —                       |
| `BETTER_AUTH_URL`        | App URL for auth callbacks     | `http://localhost:5173` |
| `REFRESH_INTERVAL_HOURS` | Auto-refresh interval          | `24`                    |
| `DEBUG`                  | Enable debug logging           | `false`                 |

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run all tests (integration + unit)
npm run test:unit    # Unit tests (Vitest)
npm run format       # Format with Prettier
npm run lint         # Run ESLint
npm run db:studio    # Browse database with Drizzle Studio
```

## Docker Deployment

```bash
# Production
docker-compose up -d

# Development (with hot reload)
docker-compose -f docker-compose.dev.yml up
```

SQLite data is persisted via a Docker volume. Set environment variables in your `.env` file or deployment platform (e.g., Dokploy).
