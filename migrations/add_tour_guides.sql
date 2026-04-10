CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create tour_guides table
CREATE TABLE IF NOT EXISTS public.tour_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  language TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tour_guide_assignments table
CREATE TABLE IF NOT EXISTS public.tour_guide_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  tour_guide_id UUID NOT NULL REFERENCES public.tour_guides(id) ON DELETE CASCADE,
  assignment_status TEXT NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active', 'completed', 'cancelled')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active guide per tour
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_tour_guide_assignment
  ON public.tour_guide_assignments (tour_id)
  WHERE assignment_status = 'active';

-- Add trigger to update updated_at for tour_guides
CREATE OR REPLACE FUNCTION update_tour_guides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tour_guides_updated_at_trigger ON public.tour_guides;
CREATE TRIGGER update_tour_guides_updated_at_trigger
BEFORE UPDATE ON public.tour_guides
FOR EACH ROW EXECUTE FUNCTION update_tour_guides_updated_at();

-- Add trigger to update updated_at for tour_guide_assignments
CREATE OR REPLACE FUNCTION update_tour_guide_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tour_guide_assignments_updated_at_trigger ON public.tour_guide_assignments;
CREATE TRIGGER update_tour_guide_assignments_updated_at_trigger
BEFORE UPDATE ON public.tour_guide_assignments
FOR EACH ROW EXECUTE FUNCTION update_tour_guide_assignments_updated_at();

-- Helper view to get active guide for a tour
CREATE OR REPLACE VIEW v_tour_active_guide AS
SELECT
  tga.tour_id,
  tga.tour_guide_id,
  tg.name,
  tg.language,
  tg.phone_number
FROM public.tour_guide_assignments tga
JOIN public.tour_guides tg ON tga.tour_guide_id = tg.id
WHERE tga.assignment_status = 'active';

-- Enable RLS for tour guide tables
ALTER TABLE public.tour_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_guide_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for tour_guides
DROP POLICY IF EXISTS "Authenticated users can read tour guides" ON public.tour_guides;
CREATE POLICY "Authenticated users can read tour guides"
  ON public.tour_guides
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tour guides" ON public.tour_guides;
CREATE POLICY "Authenticated users can create tour guides"
  ON public.tour_guides
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update tour guides" ON public.tour_guides;
CREATE POLICY "Authenticated users can update tour guides"
  ON public.tour_guides
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete tour guides" ON public.tour_guides;
CREATE POLICY "Authenticated users can delete tour guides"
  ON public.tour_guides
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for tour_guide_assignments
DROP POLICY IF EXISTS "Authenticated users can read tour guide assignments" ON public.tour_guide_assignments;
CREATE POLICY "Authenticated users can read tour guide assignments"
  ON public.tour_guide_assignments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tour guide assignments" ON public.tour_guide_assignments;
CREATE POLICY "Authenticated users can create tour guide assignments"
  ON public.tour_guide_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update tour guide assignments" ON public.tour_guide_assignments;
CREATE POLICY "Authenticated users can update tour guide assignments"
  ON public.tour_guide_assignments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete tour guide assignments" ON public.tour_guide_assignments;
CREATE POLICY "Authenticated users can delete tour guide assignments"
  ON public.tour_guide_assignments
  FOR DELETE
  TO authenticated
  USING (true);
