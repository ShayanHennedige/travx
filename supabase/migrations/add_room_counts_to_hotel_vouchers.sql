-- ============================================================
-- Migration: Add per-room-type counts and QTPL rate to hotel_vouchers
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.hotel_vouchers
  ADD COLUMN IF NOT EXISTS rooms_sgl   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rooms_dbl   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rooms_tpl   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rooms_qtpl  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS room_rate_qtpl NUMERIC(10,2) DEFAULT 0;
