-- Add flight details and tour agent flag to inquiries table
ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS is_tour_agent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS arrival_flight_no VARCHAR(255),
ADD COLUMN IF NOT EXISTS arrival_time VARCHAR(255),
ADD COLUMN IF NOT EXISTS departure_flight_no VARCHAR(255),
ADD COLUMN IF NOT EXISTS departure_time VARCHAR(255);

-- Apply the same changes to group_inquiries if it exists 
-- (wrapping in DO block to handle case where table might not exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_inquiries') THEN
    ALTER TABLE public.group_inquiries 
    ADD COLUMN IF NOT EXISTS is_tour_agent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS arrival_flight_no VARCHAR(255),
    ADD COLUMN IF NOT EXISTS arrival_time VARCHAR(255),
    ADD COLUMN IF NOT EXISTS departure_flight_no VARCHAR(255),
    ADD COLUMN IF NOT EXISTS departure_time VARCHAR(255);
  END IF;
END $$;

-- Add columns to tours table to carry over data
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS arrival_flight_no VARCHAR(255),
ADD COLUMN IF NOT EXISTS arrival_time VARCHAR(255),
ADD COLUMN IF NOT EXISTS departure_flight_no VARCHAR(255),
ADD COLUMN IF NOT EXISTS departure_time VARCHAR(255);
