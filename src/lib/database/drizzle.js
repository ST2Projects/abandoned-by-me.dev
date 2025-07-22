import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { validateEnvironment, debugLog, errorLog } from '../utils/env.js';

const { Pool } = pg;

// Only validate environment variables if not in build mode
// During build, the database isn't needed so we can skip validation
const isBuilding = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;

if (!isBuilding) {
	// Validate required environment variables
	validateEnvironment(['DATABASE_URL']);
}

// Create PostgreSQL connection pool (will fail gracefully during build)
let pool;
let db;

if (!isBuilding) {
	pool = new Pool({
		connectionString: process.env.DATABASE_URL,
		// Connection pool configuration
		max: 20, // Maximum number of clients in the pool
		idleTimeoutMillis: 30000, // Close clients after 30 seconds of inactivity
		connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
	});

	// Handle pool errors
	pool.on('error', (err) => {
		errorLog('Unexpected error on idle client', err);
	});

	// Create Drizzle instance with schema
	db = drizzle(pool, { schema });

	// Graceful shutdown
	process.on('SIGINT', async () => {
		if (pool) {
			await pool.end();
			debugLog('PostgreSQL connection pool closed');
		}
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		if (pool) {
			await pool.end();
			debugLog('PostgreSQL connection pool closed');
		}
		process.exit(0);
	});
} else {
	// During build, create a placeholder that will throw meaningful errors
	db = new Proxy({}, {
		get() {
			throw new Error('Database connection not available during build process');
		}
	});
}

// Export database instance
export { db };

// Export schema for use in other modules
export * from './schema.js';