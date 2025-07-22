# Deployment Guide

This guide covers deploying Abandoned by Me using Docker and Dokploy.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured
- GitHub OAuth App created
- PostgreSQL database (provided by docker-compose)

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/yourusername/abandoned-by-me.dev.git
cd abandoned-by-me.dev

# Copy environment example
cp .env.example .env

# Edit .env with your values
nano .env
```

### 2. Required Environment Variables

```bash
# Database (for external PostgreSQL, otherwise docker-compose handles it)
DATABASE_URL=postgresql://postgres:yourpassword@postgres:5432/abandoned_by_me

# No GitHub OAuth configuration needed - users provide their own personal access tokens

# Security (generate secure random strings)
JWT_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)

# Production settings
NODE_ENV=production
DEBUG=false
```

### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Database will be initialized automatically
```

## Dokploy Deployment

### 1. Install Dokploy

Follow the [Dokploy installation guide](https://docs.dokploy.com/docs/core/installation) on your server.

### 2. Create New Application

1. Log into Dokploy dashboard
2. Click "Create Application"
3. Choose "Docker Compose" type
4. Point to your repository

### 3. Configure Environment

In Dokploy dashboard:
1. Go to your application settings
2. Add all environment variables from `.env.example`
3. Set domain configuration
4. Enable automatic SSL via Let's Encrypt

### 4. Deploy

Dokploy will automatically:
- Build Docker images
- Start services with docker-compose
- Configure Traefik for routing
- Set up SSL certificates
- Monitor application health

## Manual Docker Deployment

### Build and Run

```bash
# Build the application
docker build -t abandoned-by-me:latest .

# Run with docker-compose
docker-compose up -d

# Or run individually
docker run -d \
  --name abandoned-by-me-app \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  abandoned-by-me:latest
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d abandoned_by_me

# Backup database
docker-compose exec postgres pg_dump -U postgres abandoned_by_me > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres abandoned_by_me < backup.sql
```

## Production Considerations

### 1. Security

- Use strong passwords for database
- Generate secure JWT and cookie secrets
- Keep environment variables secure
- Regular security updates

### 2. Backups

Set up automated backups:
```bash
# Add to crontab
0 2 * * * docker-compose exec postgres pg_dump -U postgres abandoned_by_me > /backups/abandoned_$(date +\%Y\%m\%d).sql
```

### 3. Monitoring

- Use Dokploy's built-in monitoring
- Set up alerts for downtime
- Monitor disk space for database
- Check application logs regularly

### 4. Scaling

For high traffic:
- Add Redis for session caching (included in docker-compose)
- Use PostgreSQL connection pooling
- Consider read replicas for database
- Use CDN for static assets

## Troubleshooting

### Application won't start
```bash
# Check logs
docker-compose logs app

# Verify environment variables
docker-compose exec app env | grep -E "DATABASE_URL|CLIENT"

# Test database connection
docker-compose exec app node -e "
  const pg = require('pg');
  const client = new pg.Client(process.env.DATABASE_URL);
  client.connect().then(() => console.log('Connected!')).catch(console.error);
"
```

### Database issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify tables exist
docker-compose exec postgres psql -U postgres -d abandoned_by_me -c "\dt"

# Re-run initialization
docker-compose exec postgres psql -U postgres -d abandoned_by_me -f /docker-entrypoint-initdb.d/init.sql
```

### Authentication not working
- Ensure users are creating GitHub Personal Access Tokens with the correct scopes
- Check that tokens have both `repo` and `user` permissions
- Verify the GitHub API is accessible from your server

## Updates

To update the application:

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run any new migrations if needed
docker-compose exec app npm run migrate
```