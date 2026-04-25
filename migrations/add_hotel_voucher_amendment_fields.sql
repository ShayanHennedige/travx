-- Migration: Add amendment support to hotel_vouchers
-- Run this in your Supabase SQL Editor

-- Add amendment tracking columns
ALTER TABLE hotel_vouchers
ADD COLUMN IF NOT EXISTS original_voucher_id UUID REFERENCES hotel_vouchers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_amendment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS amendment_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS amendment_confirmed_by TEXT;

-- Ensure status supports amendment lifecycle
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'hotel_vouchers_status_check'
    ) THEN
        ALTER TABLE hotel_vouchers DROP CONSTRAINT hotel_vouchers_status_check;
    END IF;
END $$;

ALTER TABLE hotel_vouchers
ADD CONSTRAINT hotel_vouchers_status_check
CHECK (status IN ('new', 'in_progress', 'completed', 'amended'));

-- Helpful index for looking up amendments of a voucher
CREATE INDEX IF NOT EXISTS idx_hotel_vouchers_original_voucher_id
ON hotel_vouchers(original_voucher_id);
