-- Migration: Add agent_company to tour_costing_sheets
-- Run this in Supabase SQL Editor

ALTER TABLE tour_costing_sheets
ADD COLUMN IF NOT EXISTS agent_company TEXT;

COMMENT ON COLUMN tour_costing_sheets.agent_company IS 'The company name of the travel agent';
