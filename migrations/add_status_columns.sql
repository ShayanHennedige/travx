-- Migration: Add status columns to itineraries, hotel_vouchers, and tours tables
-- Run this in your Supabase SQL Editor

-- Add status column to itineraries table
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed'));

-- Add status column to hotel_vouchers table
ALTER TABLE hotel_vouchers
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed'));

-- Add driver_status column to tours table
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS driver_status TEXT DEFAULT 'new' CHECK (driver_status IN ('new', 'in_progress', 'completed'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON itineraries(status);
CREATE INDEX IF NOT EXISTS idx_hotel_vouchers_status ON hotel_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_tours_driver_status ON tours(driver_status);
