-- Migration: Mixed Options Support
-- Converts single-select inquiry fields to arrays and adds itinerary status tracking

-- 1. Convert hotel_type from text to text[] (preserving existing data)
ALTER TABLE inquiries
  ALTER COLUMN hotel_type TYPE text[]
  USING CASE
    WHEN hotel_type IS NOT NULL THEN ARRAY[hotel_type]
    ELSE '{}'::text[]
  END;

-- 2. Convert meal_plan from text to text[] (preserving existing data)
ALTER TABLE inquiries
  ALTER COLUMN meal_plan TYPE text[]
  USING CASE
    WHEN meal_plan IS NOT NULL THEN ARRAY[meal_plan]
    ELSE '{}'::text[]
  END;

-- 3. Convert room_category from text to text[] (preserving existing data)
ALTER TABLE inquiries
  ALTER COLUMN room_category TYPE text[]
  USING CASE
    WHEN room_category IS NOT NULL THEN ARRAY[room_category]
    ELSE '{}'::text[]
  END;

-- 4. Add mixed_mode flag
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS mixed_mode BOOLEAN DEFAULT false;

-- 5. Set defaults for the array columns
ALTER TABLE inquiries
  ALTER COLUMN hotel_type SET DEFAULT '{}';

ALTER TABLE inquiries
  ALTER COLUMN meal_plan SET DEFAULT '{}';

ALTER TABLE inquiries
  ALTER COLUMN room_category SET DEFAULT '{}';

-- 6. Add status column to itineraries if it doesn't have the right constraint
-- (status values: draft, reviewed, finalized)
-- The itineraries table already has a 'status' column (used for 'completed'),
-- so we just need to ensure it accepts our new values.
DO $$
BEGIN
  -- Drop existing constraint if any
  ALTER TABLE itineraries DROP CONSTRAINT IF EXISTS itineraries_status_check;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Also ensure group_inquiries has the same multi-select columns
ALTER TABLE group_inquiries
  ALTER COLUMN hotel_type TYPE text[]
  USING CASE
    WHEN hotel_type IS NOT NULL THEN ARRAY[hotel_type]
    ELSE '{}'::text[]
  END;

ALTER TABLE group_inquiries
  ALTER COLUMN meal_plan TYPE text[]
  USING CASE
    WHEN meal_plan IS NOT NULL THEN ARRAY[meal_plan]
    ELSE '{}'::text[]
  END;

ALTER TABLE group_inquiries
  ALTER COLUMN room_category TYPE text[]
  USING CASE
    WHEN room_category IS NOT NULL THEN ARRAY[room_category]
    ELSE '{}'::text[]
  END;

ALTER TABLE group_inquiries
  ADD COLUMN IF NOT EXISTS mixed_mode BOOLEAN DEFAULT false;

ALTER TABLE group_inquiries
  ALTER COLUMN hotel_type SET DEFAULT '{}';

ALTER TABLE group_inquiries
  ALTER COLUMN meal_plan SET DEFAULT '{}';

ALTER TABLE group_inquiries
  ALTER COLUMN room_category SET DEFAULT '{}';
