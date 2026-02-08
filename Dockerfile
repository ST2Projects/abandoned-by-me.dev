# Use the official Node.js 18 Alpine image
FROM node:18-alpine AS base

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
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown sveltekit:nodejs /app/data

# Copy built application
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/start.js ./start.js
COPY --from=builder --chown=sveltekit:nodejs /app/package*.json ./
COPY --from=deps --chown=sveltekit:nodejs /app/node_modules ./node_modules

USER sveltekit

EXPOSE 3456

ENV HOST=0.0.0.0
ENV PORT=3456
ENV DATABASE_URL=/app/data/app.db

# Start the application
CMD ["node", "start.js"]
