# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Abandoned by Me** is a SvelteKit web application that helps developers track their abandoned GitHub repositories. Users sign in with GitHub OAuth, the app analyzes their repository activity, and provides shareable dashboards showing which repos have been forgotten. Users can "pay respects" to abandoned repos and mark them as "up for adoption."

## Key Features

- **SQLite database** with Drizzle ORM (better-sqlite3)
- **GitHub OAuth** via better-auth
- **Repository analysis** to identify abandoned projects (configurable threshold)
- **Shareable public dashboards** with privacy controls
- **Explore page** to browse public dashboards
- **Adopt page** to browse repos marked "up for adoption"
- **Pay respects** to abandoned repositories (anonymous, cookie-gated)
- **Background repo refresh** job with configurable interval
- **Rate limiting** on all mutation endpoints (in-memory sliding window)
- **CSRF protection** via Origin header validation
- **Account deletion** with full data cleanup
- **Health check** endpoint at `/health`
- **Privacy-focused** - no analytics, tracking, or telemetry
- **Docker deployment** ready

## Quick Start

```bash
# Create .env with required variables (see Environment Variables below)
npm install                  # Install dependencies
npm run dev                  # Start development server at http://localhost:5173
```

You need a GitHub OAuth App. Create one at https://github.com/settings/developers with callback URL `http://localhost:5173/api/auth/callback/github`.

## Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run test             # Run all tests (integration + unit)
npm run test:integration # Run Playwright tests
npm run test:unit        # Run Vitest unit tests
npm run test:unit:watch  # Run Vitest in watch mode
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # Run svelte-check type checking
npm run db:generate      # Generate Drizzle schema migrations
npm run db:push          # Push schema to database (dev only)
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Drizzle Studio database browser
```

## Architecture Overview

### Tech Stack

- **Framework**: SvelteKit (Svelte 4) with Node.js adapter
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Auth**: better-auth with GitHub OAuth provider
- **GitHub API**: Octokit
- **Logging**: pino + pino-roll (structured JSON, daily rotation, 5-day retention)
- **Deployment**: Docker

### Directory Structure

```
src/
├── lib/
│   ├── auth/           # Authentication (better-auth)
│   │   ├── auth.js     # Server-side auth instance
│   │   └── auth-client.js  # Client-side auth helper
│   ├── database/       # Database operations & models
│   │   ├── accounts.js      # GitHub token retrieval from better-auth tables
│   │   ├── drizzle.js       # Drizzle ORM client setup + table auto-creation
│   │   ├── index.js         # Database exports
│   │   ├── migrate.js       # Migration runner
│   │   ├── repositories.js  # Repository CRUD operations
│   │   ├── scanHistory.js   # Scan tracking
│   │   ├── schema.js        # Database schema definitions (SQLite)
│   │   ├── test-helpers.js  # Test utilities for database
│   │   └── userConfig.js    # User configuration management
│   ├── github/         # GitHub API integration
│   │   ├── analyzer.js # Repository analysis & scanning
│   │   └── client.js   # GitHub API client (createGitHubClient only)
│   ├── jobs/           # Background jobs
│   │   └── repoRefresh.js  # Periodic repo refresh (staggered per-user)
│   ├── stores/         # Svelte stores
│   │   └── stores.js   # User session & authentication state
│   └── utils/          # Utilities
│       ├── badges.js   # Badge generation utilities
│       ├── env.js      # Environment validation & structured logging
│       ├── rateLimit.js # In-memory sliding window rate limiter
│       └── session.js  # Session validation helper (requireSession)
├── routes/
│   ├── api/
│   │   ├── account/         # Account deletion (DELETE)
│   │   ├── auth/[...all]/   # better-auth API handler (catch-all)
│   │   ├── auth/logout/     # Logout endpoint
│   │   ├── config/          # User configuration API
│   │   ├── explore/         # Public directory listings API
│   │   ├── public/[slug]/   # Public dashboard data API
│   │   ├── repos/[id]/adoption/  # Toggle adoption status (POST)
│   │   ├── repos/[id]/respect/   # Pay respects (POST, anonymous)
│   │   └── repositories/    # Repository data API
│   ├── about/               # About page
│   ├── adopt/               # Browse repos up for adoption
│   ├── dashboard/           # Private dashboard pages
│   │   └── config/          # Configuration/settings page
│   ├── explore/             # Browse public dashboards
│   ├── health/              # Health check endpoint
│   ├── login/               # Login page
│   ├── public/[slug]/       # Public shareable dashboards
│   └── scan/                # Repository scanning API
├── +layout.server.js        # Root layout server load
├── +layout.svelte           # Root layout component
├── +page.svelte             # Landing page
├── +error.svelte            # Error page
└── hooks.server.js          # Server hooks (access logging, CSRF, security headers, job startup)
```

### Database Schema (SQLite + Drizzle ORM)

The app uses SQLite with Drizzle ORM. The database file is stored at the path specified by `DATABASE_URL` (default: `./data/app.db`). Tables are auto-created on startup in `drizzle.js`.

Both better-auth tables and application tables are defined in the Drizzle schema (`schema.js`):

**better-auth tables** (auth state): `user`, `session`, `account`, `verification`

**Application tables:**

- **user_configs** - Per-user settings (abandonment threshold, public dashboard, auto-refresh)
- **repositories** - Cached GitHub repository data with commit analysis, respects count, adoption status
- **scan_history** - Track repository scanning operations

### Authentication

GitHub OAuth via better-auth:

1. User clicks "Sign in with GitHub"
2. better-auth handles the full OAuth flow (redirects, callbacks, session creation)
3. Sessions stored in SQLite, managed automatically by better-auth
4. Auth API lives at `/api/auth/[...all]`

Required OAuth scopes: `read:user`, `public_repo`

### Server Hooks (`hooks.server.js`)

Three hooks run in sequence via `sequence()`:

1. **Access logging** - Logs HTTP requests with timing (skips `/health`)
2. **CSRF protection** - Validates Origin header on non-safe methods (POST/PUT/DELETE/PATCH)
3. **Security headers** - X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

The hooks file also starts the background repo refresh job on server startup.

### Core Features

#### Repository Analysis

- Fetches all user repositories from GitHub API
- Analyzes last commit dates on default branches
- Configurable abandonment threshold (default: 1 month)
- Handles private repository scanning based on user preferences
- Caches repository data to reduce API calls

#### Public Dashboards

- Shareable URLs with unique slugs (e.g., `/public/username-repos`)
- Only shows public repositories on public dashboards
- Configurable privacy settings per user

#### Pay Respects & Adoption

- Any visitor can "pay respects" to an abandoned repo (cookie-gated, rate-limited)
- Repo owners can mark abandoned repos as "up for adoption"
- `/adopt` page lists all repos marked for adoption across users with public dashboards
- Forks and private repos cannot be put up for adoption

#### Background Repo Refresh

- Runs on server startup via `startRepoRefreshJob()` in hooks
- Staggers user scans across the refresh interval (default 24h) to avoid API bursts
- Only refreshes users who have auto-refresh enabled and haven't been scanned recently
- Configurable via `REFRESH_INTERVAL_HOURS` env var

#### Rate Limiting

In-memory sliding window rate limiter (`rateLimit.js`) with pre-configured limiters:

- Scan: 5 per 10 minutes
- Config updates: 20 per minute
- Respects: 30 per minute per IP
- Adoption toggles: 20 per minute
- Account deletion: 3 per hour

## Environment Variables

```bash
DATABASE_URL=./data/app.db                    # SQLite file path (optional, has default)
GITHUB_CLIENT_ID=your_github_client_id        # GitHub OAuth App (required)
GITHUB_CLIENT_SECRET=your_github_client_secret # GitHub OAuth App (required)
BETTER_AUTH_SECRET=your-random-secret-here     # Auth encryption key (required)
BETTER_AUTH_URL=http://localhost:5173          # App URL for callbacks (required)
REFRESH_INTERVAL_HOURS=24                     # Background refresh interval (optional, default: 24)
LOG_DIR=./data/logs                           # Log file directory (optional, default: ./data/logs)
NODE_ENV=development                          # Environment mode (optional)
```

## Deployment (Docker)

### Docker Compose (Production)

```bash
docker-compose up -d
```

The docker-compose.yml runs only the app service. SQLite data is persisted via a named Docker volume (`app_data`).

### Docker Compose (Development)

```bash
docker-compose -f docker-compose.dev.yml up
```

Mounts the source directory with hot reload on port 5173.

## Testing Strategy

- **Playwright** (60 tests): Integration tests for full user flows (auth, dashboard, APIs, security)
- **Vitest** (112 tests): Unit tests for utilities and business logic
- Playwright test helpers: `tests/helpers/db-seed.js` (DB seeding, cookie signing, auth headers)
- Database test helpers: `src/lib/database/test-helpers.js`
- better-auth cookie signing in tests uses Web Crypto API with standard base64 (btoa), NOT base64url

## Key Implementation Notes

- Repository scanning is performed asynchronously to handle large accounts
- GitHub API rate limiting is considered throughout
- Error handling includes graceful degradation for missing commit data
- The application is designed to be privacy-first with no user tracking
- SQLite database and all tables auto-create on first run (no manual setup needed)
- CSP is configured in `svelte.config.js` using SvelteKit's built-in CSP with nonce generation
- The `accounts.js` module uses raw SQL to query better-auth's `account` table to avoid schema conflicts
