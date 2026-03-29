#!/bin/sh
set -e

# Ensure data directories exist with correct ownership.
# This handles existing named volumes that may have stale permissions
# from earlier image builds (self-healing on container start).
mkdir -p /app/data/logs
chown -R sveltekit:nodejs /app/data

# Drop privileges and run the application
exec su-exec sveltekit "$@"
