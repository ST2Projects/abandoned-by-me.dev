# Deployment Guide

This guide covers deploying Abandoned by Me using Docker and Dokploy.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured (for production)
- GitHub OAuth App created

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/yourusername/abandoned-by-me.dev.git
cd abandoned-by-me.dev
cp .env.example .env
nano .env
```

### 2. Required Environment Variables

```bash
# Database (SQLite, path inside the container)
DATABASE_URL=/app/data/app.db

# GitHub OAuth App
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-random-secret

# App URL (your production domain)
BETTER_AUTH_URL=https://yourdomain.com

# Production settings
NODE_ENV=production
DEBUG=false
```

### 3. Deploy with Docker Compose

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# SQLite database is created automatically on first run
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

In the Dokploy dashboard:
1. Go to your application settings
2. Add all environment variables from `.env.example`
3. Set `BETTER_AUTH_URL` to your production domain
4. Set domain configuration
5. Enable automatic SSL via Let's Encrypt

### 4. Deploy

Dokploy will automatically:
- Build Docker images
- Start the app service with docker-compose
- Configure Traefik for routing
- Set up SSL certificates
- Monitor application health

## Manual Docker Deployment

### Build and Run

```bash
# Build the application
docker build -t abandoned-by-me:latest .

# Run with docker-compose (recommended)
docker-compose up -d

# Or run individually
docker run -d \
  --name abandoned-by-me-app \
  -p 3456:3456 \
  -v app_data:/app/data \
  -e BETTER_AUTH_SECRET="your-secret" \
  -e BETTER_AUTH_URL="https://yourdomain.com" \
  -e GITHUB_CLIENT_ID="your-id" \
  -e GITHUB_CLIENT_SECRET="your-secret" \
  abandoned-by-me:latest
```

### Database Management

SQLite database is stored at `/app/data/app.db` inside the container, persisted via the `app_data` Docker volume.

```bash
# Backup database
docker cp abandoned-by-me-app:/app/data/app.db ./backup-$(date +%Y%m%d).db

# Restore database
docker cp ./backup.db abandoned-by-me-app:/app/data/app.db
docker restart abandoned-by-me-app
```

## Production Considerations

### 1. Security

- Generate a strong `BETTER_AUTH_SECRET` (use `openssl rand -base64 32`)
- Keep environment variables secure
- Regular security updates

### 2. Backups

Set up automated backups:
```bash
# Add to crontab
0 2 * * * docker cp abandoned-by-me-app:/app/data/app.db /backups/abandoned_$(date +\%Y\%m\%d).db
```

### 3. Monitoring

- Use Dokploy's built-in monitoring
- Set up alerts for downtime
- Check application logs regularly

## Troubleshooting

### Application won't start
```bash
# Check logs
docker-compose logs app

# Verify environment variables
docker-compose exec app env | grep -E "DATABASE_URL|GITHUB|BETTER_AUTH"
```

### Authentication not working
- Verify your GitHub OAuth App callback URL matches `BETTER_AUTH_URL` + `/api/auth/callback/github`
- Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set correctly
- Check that `BETTER_AUTH_URL` matches your actual domain

## Updates

To update the application:

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```
