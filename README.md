# Abandoned by Me

Track your abandoned GitHub repositories. Sign in with GitHub, scan your repos, and see which ones you've forgotten about. Share a public dashboard so others can see your graveyard of side projects.

## Quick Start

1. **Create a GitHub OAuth App** at [github.com/settings/developers](https://github.com/settings/developers)
   - Set the homepage URL to `http://localhost:5173`
   - Set the callback URL to `http://localhost:5173/api/auth/callback/github`

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

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) — Full-stack framework
- [SQLite](https://sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Database
- [Drizzle ORM](https://orm.drizzle.team/) — Type-safe database queries
- [better-auth](https://www.better-auth.com/) — Authentication (GitHub OAuth)
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client

## Docker Deployment

```bash
# Production
docker-compose up -d

# Development (with hot reload)
docker-compose -f docker-compose.dev.yml up
```

SQLite data is persisted via a Docker volume. Set environment variables in your `.env` file or deployment platform (e.g., Dokploy).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite file path | `./data/app.db` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | — |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | — |
| `BETTER_AUTH_SECRET` | Secret for auth encryption | — |
| `BETTER_AUTH_URL` | App URL for auth callbacks | `http://localhost:5173` |
| `DEBUG` | Enable debug logging | `false` |

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run all tests
npm run test:unit    # Unit tests (Vitest)
npm run format       # Format with Prettier
npm run db:studio    # Browse database with Drizzle Studio
```

## License

MIT
