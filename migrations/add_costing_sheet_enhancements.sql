-- Migration: Add costing sheet enhancements
-- Run this in Supabase SQL Editor

-- 1. Add new columns to tour_costing_sheets
ALTER TABLE tour_costing_sheets
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50) DEFAULT 'Van',
ADD COLUMN IF NOT EXISTS vehicle_rate NUMERIC(10, 2) DEFAULT 130.00,
ADD COLUMN IF NOT EXISTS profit_percentage NUMERIC(5, 2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS quad_rate NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS usd_conversion_offset NUMERIC(10, 2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS period_description TEXT;

-- 2. Add comments for clarity
COMMENT ON COLUMN tour_costing_sheets.vehicle_type IS 'Vehicle type: Car, Van, Mini Coach, 30 Seater Coach, Large Coach';
COMMENT ON COLUMN tour_costing_sheets.vehicle_rate IS 'Rate per km for selected vehicle type';
COMMENT ON COLUMN tour_costing_sheets.profit_percentage IS 'Profit margin percentage (default 15%)';
COMMENT ON COLUMN tour_costing_sheets.quad_rate IS 'Per person rate for quad occupancy (total / 4)';
COMMENT ON COLUMN tour_costing_sheets.usd_conversion_offset IS 'Offset to subtract from day rate for USD conversion (default 15)';
COMMENT ON COLUMN tour_costing_sheets.currency IS 'Currency for the quote (USD, EUR, GBP, etc.)';
COMMENT ON COLUMN tour_costing_sheets.period_description IS 'Description of the travel period';
