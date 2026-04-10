-- Migration: Add passport and country fields
-- Run this in Supabase SQL Editor

-- 1. Ensure inquiries has passport_no
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS passport_no TEXT;

-- 2. Ensure group_inquiries has head_passport_no
ALTER TABLE group_inquiries 
ADD COLUMN IF NOT EXISTS head_passport_no TEXT;

-- 3. Ensure group_members has passport_no
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS passport_no TEXT;

-- 4. Update tour_costing_sheets with client details
ALTER TABLE tour_costing_sheets 
ADD COLUMN IF NOT EXISTS passport_no TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add comments for clarity
COMMENT ON COLUMN inquiries.passport_no IS 'Passport number of the primary client';
COMMENT ON COLUMN group_inquiries.head_passport_no IS 'Passport number of the head of the group';
COMMENT ON COLUMN group_members.passport_no IS 'Passport number of the group member';
