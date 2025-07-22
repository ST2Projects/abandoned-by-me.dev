import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/database/schema.js',
	out: './drizzle',
	driver: 'pg',
	dbCredentials: {
		connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/abandoned_by_me',
	},
	verbose: true,
	strict: true,
});