-- ============================================================
-- Migration: Add flight details and is_tour_agent to group_inquiries
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.group_inquiries
  ADD COLUMN IF NOT EXISTS is_tour_agent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS arrival_flight_no TEXT,
  ADD COLUMN IF NOT EXISTS arrival_time TEXT,
  ADD COLUMN IF NOT EXISTS departure_flight_no TEXT,
  ADD COLUMN IF NOT EXISTS departure_time TEXT;
