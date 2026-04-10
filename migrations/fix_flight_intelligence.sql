-- FIX: Add missing Flight Intelligence and Agent columns
-- Run this in Supabase SQL Editor to fix "N/A" data issues

-- 1. Add fields to 'inquiries' table
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS arranged_by_agent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inbound_flight_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS inbound_arrival_date DATE,
ADD COLUMN IF NOT EXISTS inbound_arrival_time TIME,
ADD COLUMN IF NOT EXISTS outbound_flight_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS outbound_departure_date DATE,
ADD COLUMN IF NOT EXISTS outbound_departure_time TIME,
ADD COLUMN IF NOT EXISTS agent_company TEXT;

-- 2. Add fields to 'group_inquiries' table
ALTER TABLE group_inquiries 
ADD COLUMN IF NOT EXISTS arranged_by_agent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inbound_flight_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS inbound_arrival_date DATE,
ADD COLUMN IF NOT EXISTS inbound_arrival_time TIME,
ADD COLUMN IF NOT EXISTS outbound_flight_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS outbound_departure_date DATE,
ADD COLUMN IF NOT EXISTS outbound_departure_time TIME,
ADD COLUMN IF NOT EXISTS agent_company TEXT;

-- 3. refresh the schema cache (optional, helpful for Supabase dashboard)
NOTIFY pgrst, 'reload schema';