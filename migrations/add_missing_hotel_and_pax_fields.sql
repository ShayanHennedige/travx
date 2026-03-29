-- Migration: Add missing fields for costing and pax tracking
-- Run this in Supabase SQL Editor

-- 1. Update inquiries table
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS hotel_type TEXT,
ADD COLUMN IF NOT EXISTS no_of_children INTEGER DEFAULT 0;

-- 2. Update group_inquiries table
ALTER TABLE group_inquiries 
ADD COLUMN IF NOT EXISTS hotel_type TEXT,
ADD COLUMN IF NOT EXISTS no_of_children INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN inquiries.hotel_type IS 'Preferred hotel category (Standard, Luxury, etc.)';
COMMENT ON COLUMN inquiries.no_of_children IS 'Number of children in the tour';
COMMENT ON COLUMN group_inquiries.hotel_type IS 'Preferred hotel category for the group';
COMMENT ON COLUMN group_inquiries.no_of_children IS 'Number of children in the group tour';
-- 3. Update customer_invoices table
ALTER TABLE customer_invoices 
ADD COLUMN IF NOT EXISTS package_description TEXT;

COMMENT ON COLUMN customer_invoices.package_description IS 'Custom detailed description for the invoice display';
