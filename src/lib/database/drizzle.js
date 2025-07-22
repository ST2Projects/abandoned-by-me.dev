import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { validateEnvironment, debugLog, errorLog } from '../utils/env.js';

const { Pool } = pg;

// Validate required environment variables
validateEnvironment(['DATABASE_URL']);

// Create PostgreSQL connection pool
const pool = new Pool({
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
export const db = drizzle(pool, { schema });

// Export schema for use in other modules
export * from './schema.js';

// Graceful shutdown
process.on('SIGINT', async () => {
	await pool.end();
	debugLog('PostgreSQL connection pool closed');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	await pool.end();
	debugLog('PostgreSQL connection pool closed');
	process.exit(0);
});