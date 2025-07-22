# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Abandoned by Me** is a multi-tenant SvelteKit web application that helps developers track their abandoned GitHub repositories. It connects to users' GitHub accounts, analyzes repository activity, and provides shareable dashboards showing which repos have been forgotten.

## Key Features

- **Multi-tenant architecture** with PostgreSQL backend and Drizzle ORM
- **GitHub OAuth integration** for secure authentication
- **Repository analysis** to identify abandoned projects (configurable threshold)
- **Shareable public dashboards** with privacy controls
- **Privacy-focused** - no analytics, tracking, or telemetry
- **Docker deployment** ready with Dokploy support

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
npm run lint             # Run ESLint (when configured)
npm run lint:fix         # Fix ESLint issues (when configured)
npm run type-check       # Type check with svelte-check (when configured)
npm run db:generate      # Generate Drizzle schema migrations
npm run db:push          # Push schema to database (dev only)
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Drizzle Studio database browser
```

## Architecture Overview

### Directory Structure
```
src/
├── lib/
│   ├── auth/           # Authentication & session management
│   │   ├── guards.js   # Route protection helpers
│   │   ├── oauth.js    # GitHub OAuth implementation
│   │   └── session.js  # Session management utilities
│   ├── database/       # Database operations & models
│   │   ├── repositories.js  # Repository CRUD operations
│   │   ├── scanHistory.js   # Scan tracking
│   │   ├── drizzle.js       # Drizzle ORM client & schema exports
│   │   ├── schema.js        # Database schema definitions
│   │   ├── users.js         # User operations
│   │   └── userConfig.js    # User configuration management
│   ├── github/         # GitHub API integration
│   │   ├── analyzer.js # Repository analysis & scanning
│   │   └── client.js   # GitHub API client wrapper
│   ├── stores/         # Svelte stores
│   │   └── stores.js   # User session & authentication state
│   ├── types/          # Type definitions (JSDoc)
│   │   └── auth.js     # Authentication-related types
│   └── utils/          # Utilities
│       └── env.js      # Environment validation & logging
├── components/
│   ├── auth/           # Authentication components (future)
│   └── ui/             # Reusable UI components
├── routes/
│   ├── api/            # API endpoints
│   │   ├── config/     # User configuration API
│   │   ├── public/     # Public dashboard API
│   │   └── repositories/ # Repository data API
│   ├── dashboard/      # Private dashboard pages
│   │   └── config/     # Configuration/settings page
│   ├── public/[slug]/  # Public shareable dashboards
│   ├── register/       # GitHub OAuth callback handling
│   └── scan/           # Repository scanning API
└── hooks.server.js     # Server-side hooks (security headers)
```

### Database Schema (PostgreSQL + Drizzle ORM)

The application uses a PostgreSQL database with Drizzle ORM for type-safe database operations:

- **users** - GitHub user accounts and OAuth tokens
- **user_configs** - Per-user settings (abandonment threshold, public dashboard settings)  
- **repositories** - Cached GitHub repository data with commit analysis
- **scan_history** - Track repository scanning operations

Key features:
- Type-safe database operations with Drizzle ORM
- Automatic migrations with Drizzle Kit
- Proper relationships and indexes for performance
- Automatic timestamp management with database triggers

### Core Features

#### Repository Analysis
- Fetches all user repositories from GitHub API
- Analyzes last commit dates on default branches
- Configurable abandonment threshold (default: 6 months)
- Handles private repository scanning based on user preferences
- Caches repository data to reduce API calls

#### Authentication & Authorization
- GitHub OAuth flow with proper error handling
- Session management with Svelte stores
- Route guards for protected pages
- User-based data isolation via application logic

#### Public Dashboards
- Shareable URLs with unique slugs (e.g., `/public/username-repos`)
- Only shows public repositories on public dashboards
- Configurable privacy settings per user
- SEO-friendly with proper meta tags

#### Privacy & Security
- No analytics or tracking pixels
- Security headers via server hooks
- Content Security Policy implementation
- Rate limiting considerations for API endpoints

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/abandoned_by_me

# PostgreSQL Settings (for docker-compose)
POSTGRES_DB=abandoned_by_me
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_PORT=5432

# GitHub OAuth App
CLIENT_CODE=your_github_oauth_client_id
CLIENT_SECRET=your_github_oauth_client_secret
PUBLIC_CLIENT_CODE=your_github_oauth_client_id

# Security
JWT_SECRET=your-jwt-secret-key-here
COOKIE_SECRET=your-cookie-secret-key-here

# Development Configuration
DEBUG=false
NODE_ENV=development

# Application
APP_PORT=3000
```

## Deployment (Dokploy)

The project is configured for deployment using Dokploy with Docker Compose:

### Local Development
```bash
# Start PostgreSQL and Redis for development
docker-compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Run development server
npm run dev
```

### Production Deployment with Dokploy

1. **Prerequisites**:
   - Install Dokploy on your server
   - Set up DNS pointing to your server
   - Configure SSL certificates (Dokploy handles this via Traefik)

2. **Deploy the application**:
   ```bash
   # Build and deploy with docker-compose
   docker-compose up -d
   ```

3. **Dokploy Configuration**:
   - The `.dokploy.json` file contains deployment configuration
   - Environment variables should be set in Dokploy dashboard
   - Domains and SSL are managed by Dokploy's Traefik integration

4. **Docker Compose Services**:
   - **app**: SvelteKit application (Node.js)
   - **postgres**: PostgreSQL database
   - **redis**: Session storage (optional but recommended)

## Database Setup

### Using Docker Compose (Recommended)
1. Database is automatically initialized with `db/init.sql`
2. Schema includes all tables, indexes, and triggers
3. No manual setup required

### Manual PostgreSQL Setup
1. Create a PostgreSQL database
2. Run the SQL schema from `db/init.sql`
3. Update `DATABASE_URL` in your `.env` file

### Database Migration
The project uses Drizzle Kit for database migrations:
- **Development**: Use `npm run db:push` to sync schema changes
- **Production**: Use `npm run db:migrate` to run migrations
- Migration files are automatically generated with `npm run db:generate`
- All migration files are stored in the `drizzle/` directory

## Architecture Notes

This project has been migrated to use:
- **Drizzle ORM** instead of raw SQL for type safety and better developer experience
- **PostgreSQL** with Docker Compose instead of Supabase
- **Dokploy deployment** instead of Cloudflare Pages
- **Node.js adapter** instead of Cloudflare adapter

## GitHub OAuth Setup

1. Create a new GitHub OAuth App in your GitHub settings
2. Set authorization callback URL to: `https://yourdomain.com/register/inituser`
3. Request scopes: `user` and `repo` (for private repo access)
4. Configure CLIENT_CODE and CLIENT_SECRET environment variables

## Testing Strategy

- **Playwright**: Integration tests for full user flows
- **Vitest**: Unit tests for utilities and business logic
- **Manual Testing**: Repository analysis and public dashboard functionality

## Key Implementation Notes

- Repository scanning is performed asynchronously to handle large accounts
- GitHub API rate limiting is considered throughout
- Public dashboards are cached briefly (5 minutes) for performance
- Error handling includes graceful degradation for missing commit data
- The application is designed to be privacy-first with no user tracking