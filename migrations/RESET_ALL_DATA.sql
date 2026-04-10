-- DANGER: This script deletes ALL data from the application tables.
-- Run this in Supabase SQL Editor ONLY if you want to reset the database completely.

-- We use TRUNCATE with CASCADE to clean up all related tables efficiently.
-- This will remove data from:
-- 1. inquiries
-- 2. group_inquiries
-- 3. group_members
-- 4. itineraries
-- 5. tour_costing_sheets
-- 6. hotel_vouchers
-- 7. customer_invoices
-- 8. tours

BEGIN;

TRUNCATE TABLE 
  inquiries, 
  group_inquiries, 
  group_members, 
  itineraries, 
  tour_costing_sheets, 
  hotel_vouchers, 
  customer_invoices,
  tours
RESTART IDENTITY CASCADE;

-- Optional: If you also want to clear drivers (uncomment if needed)
-- TRUNCATE TABLE drivers RESTART IDENTITY CASCADE;

COMMIT;
