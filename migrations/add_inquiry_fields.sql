-- Migration: Add extra fields for inquiries and group_inquiries
-- Run this in your Supabase SQL Editor

-- Add fields to inquiries table
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS agent_email TEXT,
ADD COLUMN IF NOT EXISTS agent_company TEXT,
ADD COLUMN IF NOT EXISTS client_desires TEXT;

-- Make client_email optional in inquiries table
ALTER TABLE inquiries ALTER COLUMN client_email DROP NOT NULL;

-- Add fields to group_inquiries table
ALTER TABLE group_inquiries 
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS agent_email TEXT,
ADD COLUMN IF NOT EXISTS agent_company TEXT,
ADD COLUMN IF NOT EXISTS client_desires TEXT,
ADD COLUMN IF NOT EXISTS meal_plan TEXT;

-- Make client_email optional in group_inquiries table
ALTER TABLE group_inquiries ALTER COLUMN client_email DROP NOT NULL;

-- Create indexes for agent search and filtering
CREATE INDEX IF NOT EXISTS idx_inquiries_agent_email ON inquiries(agent_email);
CREATE INDEX IF NOT EXISTS idx_group_inquiries_agent_email ON group_inquiries(agent_email);
