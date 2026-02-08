import { db } from './drizzle.js';
import { eq } from 'drizzle-orm';

// Note: better-auth manages its own user table.
// These functions are kept for any app-specific user queries if needed,
// but primary user management is handled by better-auth.
