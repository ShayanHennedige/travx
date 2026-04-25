-- ============================================================
-- Migration: Create tour_guides table
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tour_guides (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    language    TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (consistent with other tables)
ALTER TABLE public.tour_guides ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (same pattern as drivers table)
CREATE POLICY "Authenticated users can manage tour guides"
    ON public.tour_guides
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Optional: trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tour_guides_updated_at ON public.tour_guides;
CREATE TRIGGER set_tour_guides_updated_at
    BEFORE UPDATE ON public.tour_guides
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
