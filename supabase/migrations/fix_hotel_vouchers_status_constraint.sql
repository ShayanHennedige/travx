-- ============================================================
-- Fix: Add 'draft' to hotel_vouchers status check constraint
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Drop the existing check constraint
ALTER TABLE public.hotel_vouchers
  DROP CONSTRAINT IF EXISTS hotel_vouchers_status_check;

-- 2. Re-add it with 'draft' included
ALTER TABLE public.hotel_vouchers
  ADD CONSTRAINT hotel_vouchers_status_check
  CHECK (status IN ('draft', 'pending', 'confirmed', 'completed', 'cancelled'));
