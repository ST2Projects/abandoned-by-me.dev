# Use the official Node.js 20 Alpine image
FROM node:25-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# libc6-compat needed for Alpine, python3/make/g++ needed for native modules (better-sqlite3)
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build the SvelteKit application
ENV NODE_ENV=production
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# su-exec for dropping privileges in the entrypoint
RUN apk add --no-cache su-exec

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Create data and logs directories for SQLite database and log files
RUN mkdir -p /app/data/logs && chown -R sveltekit:nodejs /app/data

# Copy built application
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/package*.json ./
COPY --from=deps --chown=sveltekit:nodejs /app/node_modules ./node_modules

# Copy entrypoint script (runs as root to fix permissions, then drops to sveltekit)
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3456

ENV HOST=0.0.0.0
ENV PORT=3456
ENV DATABASE_URL=/app/data/app.db

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "build"]
