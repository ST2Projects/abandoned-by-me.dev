import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
	const pool = new Pool({
		connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/abandoned_by_me',
	});

	const db = drizzle(pool);

	console.log('Running migrations...');

	try {
		await migrate(db, { migrationsFolder: join(__dirname, '../../../drizzle') });
		console.log('Migrations completed successfully');
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

runMigrations();