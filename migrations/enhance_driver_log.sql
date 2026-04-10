-- Migration: Enhance driver log sheet and P&L tracking
-- Run this in Supabase SQL Editor

-- 1. Add columns for driver log sheet upload and actual km tracking
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS driver_log_sheet_url TEXT,
ADD COLUMN IF NOT EXISTS actual_km_logged NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS log_sheet_uploaded_at TIMESTAMPTZ;

-- 2. Add additional_km column to tour_costing_sheets transport_data tracking
-- (transport_data is already JSONB and includes mileage per row)
-- We add a dedicated column for easier querying
ALTER TABLE tour_costing_sheets
ADD COLUMN IF NOT EXISTS additional_km NUMERIC(10, 2) DEFAULT 0;

-- 3. Add driver daily allowance tracking
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS driver_daily_allowance NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS driver_allowance_days INTEGER DEFAULT 0;

-- 4. Add comments for clarity
COMMENT ON COLUMN tours.driver_log_sheet_url IS 'URL to uploaded driver log sheet file';
COMMENT ON COLUMN tours.actual_km_logged IS 'Actual kilometers logged from completed driver log sheet';
COMMENT ON COLUMN tours.log_sheet_uploaded_at IS 'Timestamp when log sheet was uploaded';
COMMENT ON COLUMN tours.driver_daily_allowance IS 'Daily allowance rate for driver';
COMMENT ON COLUMN tours.driver_allowance_days IS 'Number of days for driver allowance';
COMMENT ON COLUMN tour_costing_sheets.additional_km IS 'Additional kilometers beyond itinerary distance';

-- 5. Create index for faster queries on log sheet status
CREATE INDEX IF NOT EXISTS idx_tours_log_sheet_uploaded ON tours(log_sheet_uploaded_at) WHERE log_sheet_uploaded_at IS NOT NULL;
