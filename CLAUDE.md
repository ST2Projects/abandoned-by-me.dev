# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Abandoned by Me** is a SvelteKit web application that helps developers track their abandoned GitHub repositories. Users sign in with GitHub OAuth, the app analyzes their repository activity, and provides shareable dashboards showing which repos have been forgotten.

## Key Features

- **SQLite database** with Drizzle ORM (better-sqlite3)
- **GitHub OAuth** via better-auth
- **Repository analysis** to identify abandoned projects (configurable threshold)
- **Shareable public dashboards** with privacy controls
- **Privacy-focused** - no analytics, tracking, or telemetry
- **Docker deployment** ready with Dokploy support

## Quick Start

```bash
cp .env.example .env         # Copy and fill in GitHub OAuth credentials
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
npm run db:generate      # Generate Drizzle schema migrations
npm run db:push          # Push schema to database (dev only)
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Drizzle Studio database browser
```

## Architecture Overview

### Tech Stack

- **Framework**: SvelteKit with Node.js adapter
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Auth**: better-auth with GitHub OAuth provider
- **GitHub API**: Octokit
- **Deployment**: Docker with Dokploy

### Directory Structure
```
src/
├── lib/
│   ├── auth/           # Authentication (better-auth)
│   │   ├── auth.js     # Server-side auth instance
│   │   └── auth-client.js  # Client-side auth helper
│   ├── database/       # Database operations & models
│   │   ├── repositories.js  # Repository CRUD operations
│   │   ├── scanHistory.js   # Scan tracking
│   │   ├── drizzle.js       # Drizzle ORM client setup
│   │   ├── schema.js        # Database schema definitions (SQLite)
│   │   ├── migrate.js       # Migration runner
│   │   ├── users.js         # User operations
│   │   ├── userConfig.js    # User configuration management
│   │   └── index.js         # Database exports
│   ├── github/         # GitHub API integration
│   │   ├── analyzer.js # Repository analysis & scanning
│   │   └── client.js   # GitHub API client wrapper
│   ├── stores/         # Svelte stores
│   │   └── stores.js   # User session & authentication state
│   └── utils/          # Utilities
│       ├── badges.js   # Badge generation utilities
│       └── env.js      # Environment validation & logging
├── routes/
│   ├── api/
│   │   ├── auth/[...all]/   # better-auth API handler (catch-all)
│   │   ├── auth/logout/     # Logout endpoint
│   │   ├── config/          # User configuration API
│   │   ├── public/          # Public dashboard API
│   │   └── repositories/    # Repository data API
│   ├── dashboard/           # Private dashboard pages
│   │   └── config/          # Configuration/settings page
│   ├── login/               # Login page
│   ├── public/[slug]/       # Public shareable dashboards
│   └── scan/                # Repository scanning API
├── +layout.server.js        # Root layout server load
├── +page.svelte             # Landing page
├── +error.svelte            # Error page
└── hooks.server.js          # Server-side hooks (security headers)
```

### Database Schema (SQLite + Drizzle ORM)

The app uses SQLite with Drizzle ORM. The database file is stored at the path specified by `DATABASE_URL` (default: `./data/app.db`). better-auth manages its own tables (`user`, `session`, `account`, `verification`) automatically.

Application tables:
- **user_configs** - Per-user settings (abandonment threshold, public dashboard settings)
- **repositories** - Cached GitHub repository data with commit analysis
- **scan_history** - Track repository scanning operations

### Authentication

GitHub OAuth via better-auth:
1. User clicks "Sign in with GitHub"
2. better-auth handles the full OAuth flow (redirects, callbacks, session creation)
3. Sessions stored in SQLite, managed automatically by better-auth
4. Auth API lives at `/api/auth/[...all]`

Required OAuth scopes: `read:user`, `public_repo`

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

## Environment Variables

See `.env.example` for all required variables:

```bash
DATABASE_URL=./data/app.db                    # SQLite file path
GITHUB_CLIENT_ID=your_github_client_id        # GitHub OAuth App
GITHUB_CLIENT_SECRET=your_github_client_secret # GitHub OAuth App
BETTER_AUTH_SECRET=your-random-secret-here     # Auth encryption key
BETTER_AUTH_URL=http://localhost:5173          # App URL for callbacks
DEBUG=false
NODE_ENV=development
```

## Deployment (Docker / Dokploy)

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

### Dokploy
- Set environment variables in Dokploy dashboard
- Domains and SSL managed by Dokploy's Traefik integration

## Testing Strategy

- **Playwright**: Integration tests for full user flows
- **Vitest**: Unit tests for utilities and business logic

## Key Implementation Notes

- Repository scanning is performed asynchronously to handle large accounts
- GitHub API rate limiting is considered throughout
- Public dashboards are cached briefly (5 minutes) for performance
- Error handling includes graceful degradation for missing commit data
- The application is designed to be privacy-first with no user tracking
- SQLite database auto-creates on first run (no manual setup needed)
