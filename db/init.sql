-- Database initialization script for PostgreSQL
-- This script creates the database schema for the Abandoned by Me application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for GitHub user accounts and OAuth tokens
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

-- User configurations table
CREATE TABLE IF NOT EXISTS user_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    abandonment_threshold_months INTEGER DEFAULT 6 NOT NULL CHECK (abandonment_threshold_months > 0),
    dashboard_public BOOLEAN DEFAULT false,
    dashboard_slug TEXT UNIQUE,
    scan_private_repos BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Repositories table to cache GitHub data
CREATE TABLE IF NOT EXISTS repositories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    private BOOLEAN DEFAULT false,
    html_url TEXT NOT NULL,
    clone_url TEXT,
    last_commit_date TIMESTAMPTZ,
    last_push_date TIMESTAMPTZ,
    is_fork BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    default_branch TEXT DEFAULT 'main',
    language TEXT,
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    open_issues_count INTEGER DEFAULT 0,
    size_kb INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_scanned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, github_id)
);

-- Scan history table to track when repositories were last analyzed
CREATE TABLE IF NOT EXISTS scan_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_started_at TIMESTAMPTZ DEFAULT NOW(),
    scan_completed_at TIMESTAMPTZ,
    repos_scanned INTEGER DEFAULT 0,
    repos_added INTEGER DEFAULT 0,
    repos_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details JSONB,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_repositories_last_commit_date ON repositories(last_commit_date);
CREATE INDEX IF NOT EXISTS idx_repositories_github_id ON repositories(github_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_dashboard_slug ON user_configs(dashboard_slug) WHERE dashboard_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at);

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_configs_updated_at ON user_configs;
CREATE TRIGGER update_user_configs_updated_at 
    BEFORE UPDATE ON user_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_repositories_updated_at ON repositories;
CREATE TRIGGER update_repositories_updated_at 
    BEFORE UPDATE ON repositories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- This will be ignored if data already exists due to ON CONFLICT
INSERT INTO users (username, access_token) 
VALUES ('testuser', 'test_token') 
ON CONFLICT (username) DO NOTHING;

COMMIT;