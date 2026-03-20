-- Migration: Add tour costing sheets table
-- Run this in Supabase SQL Editor

-- Create tour_costing_sheets table
CREATE TABLE IF NOT EXISTS public.tour_costing_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  
  -- Metadata
  agent_name VARCHAR(255),
  arrival_date DATE,
  no_of_pax INTEGER DEFAULT 2,
  hotel_type VARCHAR(100),
  meal_plan VARCHAR(20),
  quote_date DATE DEFAULT CURRENT_DATE,
  
  -- Accommodation data (JSONB for flexible day-by-day structure)
  accommodation_data JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ day: "6th dec", location: "Colombo", hotel: "Marriot", basis: "BB", sgl: 100, dbl: 115, tri: 0 }]
  
  -- Transport data (JSONB for flexible items)
  transport_data JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ description: "Transport", mileage: 1700, rate: 120, total: 204000 }, { description: "Batta", mileage: 12, rate: 3000, total: 36000 }]
  
  -- Transport summary fields
  total_mileage INTEGER DEFAULT 0,
  no_of_nights INTEGER DEFAULT 0,
  
  -- Extras data (JSONB for flexible items)
  extras_data JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ name: "Kandy", description: "Pinnawela", count: 0, unit_price: 0 }]
  
  -- Meal extras (JSONB)
  meal_extras JSONB DEFAULT '{}'::jsonb,
  -- Structure: { ex_lunch: 5000, ex_dinner: 5000, ex_breakfast: 0 }
  
  -- Totals and calculations
  exchange_rate NUMERIC(10, 2) DEFAULT 270.00,
  total_lkr NUMERIC(12, 2) DEFAULT 0,
  total_usd NUMERIC(12, 2) DEFAULT 0,
  per_person_usd NUMERIC(12, 2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'approved')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT tour_costing_sheets_pkey PRIMARY KEY (id),
  CONSTRAINT unique_itinerary_costing_sheet UNIQUE (itinerary_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_costing_sheets_itinerary ON public.tour_costing_sheets(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_costing_sheets_status ON public.tour_costing_sheets(status);
CREATE INDEX IF NOT EXISTS idx_costing_sheets_created_at ON public.tour_costing_sheets(created_at);

-- Enable RLS
ALTER TABLE public.tour_costing_sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read all costing sheets
DROP POLICY IF EXISTS "Authenticated users can read costing sheets" ON public.tour_costing_sheets;
CREATE POLICY "Authenticated users can read costing sheets"
  ON public.tour_costing_sheets
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create costing sheets
DROP POLICY IF EXISTS "Authenticated users can create costing sheets" ON public.tour_costing_sheets;
CREATE POLICY "Authenticated users can create costing sheets"
  ON public.tour_costing_sheets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update costing sheets
DROP POLICY IF EXISTS "Authenticated users can update costing sheets" ON public.tour_costing_sheets;
CREATE POLICY "Authenticated users can update costing sheets"
  ON public.tour_costing_sheets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete costing sheets
DROP POLICY IF EXISTS "Authenticated users can delete costing sheets" ON public.tour_costing_sheets;
CREATE POLICY "Authenticated users can delete costing sheets"
  ON public.tour_costing_sheets
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_costing_sheet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_costing_sheet_updated_at ON tour_costing_sheets;
CREATE TRIGGER set_costing_sheet_updated_at
  BEFORE UPDATE ON tour_costing_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_costing_sheet_updated_at();
