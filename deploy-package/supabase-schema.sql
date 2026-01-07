-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'Unknown',
    data JSONB DEFAULT '{}'::jsonb
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_project ON tags(project_id);
CREATE INDEX IF NOT EXISTS idx_tags_key ON tags(key);

-- Row Level Security (allow all for simplicity - add auth later if needed)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tags" ON tags FOR ALL USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_projects_timestamp ON projects;
CREATE TRIGGER update_projects_timestamp BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
