-- Migration to make contact person fields nullable
-- This supports inquiries where ONLY agent details are provided

-- Individual Inquiries
ALTER TABLE inquiries 
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL,
ALTER COLUMN contact_number DROP NOT NULL,
ALTER COLUMN country DROP NOT NULL;

-- Group Inquiries
ALTER TABLE group_inquiries 
ALTER COLUMN head_first_name DROP NOT NULL,
ALTER COLUMN head_last_name DROP NOT NULL,
ALTER COLUMN contact_number DROP NOT NULL,
ALTER COLUMN country DROP NOT NULL;
