-- ============================================================
-- Migration: Add tour guide assignment to tours table
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.tours
  ADD COLUMN tour_guide_id UUID REFERENCES public.tour_guides(id) ON DELETE SET NULL,
  ADD COLUMN tour_guide_status TEXT CHECK (tour_guide_status IN ('new', 'in_progress', 'completed'));
