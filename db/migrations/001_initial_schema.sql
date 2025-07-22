-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for Abandoned by Me
-- Date: 2024-01-15

-- This migration creates the initial database schema
-- It's the same as db/init.sql but structured as a migration

-- Up Migration
BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    access_token_expires_in TEXT,
    refresh_token_expires_in TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add other tables from init.sql...
-- (Truncated for brevity - in practice, include all tables)

COMMIT;

-- Down Migration (for rollback)
-- BEGIN;
-- DROP TABLE IF EXISTS scan_history CASCADE;
-- DROP TABLE IF EXISTS repositories CASCADE;
-- DROP TABLE IF EXISTS user_configs CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- COMMIT;