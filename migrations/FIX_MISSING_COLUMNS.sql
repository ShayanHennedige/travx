-- COMPREHENSIVE FIX: Add all required fields for updated Inquiry forms
-- Run this in your Supabase SQL Editor to resolve 500 errors

-- 1. Update inquiries table
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS agent_email TEXT,
ADD COLUMN IF NOT EXISTS agent_company TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_desires TEXT,
ADD COLUMN IF NOT EXISTS passport_no TEXT,
ADD COLUMN IF NOT EXISTS meal_plan TEXT;

-- Drop NOT NULL constraints for personal info (allowing agent-only inquiries)
ALTER TABLE inquiries 
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL,
ALTER COLUMN contact_number DROP NOT NULL,
ALTER COLUMN country DROP NOT NULL,
ALTER COLUMN client_email DROP NOT NULL;

-- 2. Update group_inquiries table
ALTER TABLE group_inquiries 
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS agent_email TEXT,
ADD COLUMN IF NOT EXISTS agent_company TEXT,
ADD COLUMN IF NOT EXISTS client_desires TEXT,
ADD COLUMN IF NOT EXISTS head_passport_no TEXT,
ADD COLUMN IF NOT EXISTS meal_plan TEXT;

-- Drop NOT NULL constraints for personal info
ALTER TABLE group_inquiries 
ALTER COLUMN head_first_name DROP NOT NULL,
ALTER COLUMN head_last_name DROP NOT NULL,
ALTER COLUMN contact_number DROP NOT NULL,
ALTER COLUMN country DROP NOT NULL,
ALTER COLUMN client_email DROP NOT NULL;

-- 3. Update group_members table
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS passport_no TEXT;

-- 4. Update customer_invoices table
ALTER TABLE customer_invoices 
ADD COLUMN IF NOT EXISTS itinerary_id UUID REFERENCES itineraries(id),
ADD COLUMN IF NOT EXISTS package_description TEXT;

-- 5. Update tour_costing_sheets table
ALTER TABLE tour_costing_sheets 
ADD COLUMN IF NOT EXISTS passport_no TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inquiries_agent_email ON inquiries(agent_email);
CREATE INDEX IF NOT EXISTS idx_group_inquiries_agent_email ON group_inquiries(agent_email);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_itinerary_id ON customer_invoices(itinerary_id);
