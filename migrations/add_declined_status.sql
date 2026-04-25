-- Migration: Add 'declined' status to itineraries and inquiries
-- Run this in your Supabase SQL Editor

-- 1. Safely add the check constraint by including any existing statuses 
-- so we don't violate the constraint with existing rogue rows (like 'finalized' or 'draft')
DO $$
DECLARE
    existing_statuses text;
    final_query text;
BEGIN
    -- Get all unique statuses that already exist in the table, 
    -- plus the standard ones we want to explicitly enforce
    SELECT string_agg(QUOTE_LITERAL(s), ', ') INTO existing_statuses
    FROM (
        SELECT DISTINCT status FROM itineraries WHERE status IS NOT NULL
        UNION
        SELECT unnest(ARRAY['new', 'in_progress', 'completed', 'declined', 'finalized', 'draft'])
    ) AS sub(s);
    
    -- Drop the constraint if it exists
    ALTER TABLE itineraries DROP CONSTRAINT IF EXISTS itineraries_status_check;
    
    -- Add the constraint back with ALL valid statuses
    final_query := 'ALTER TABLE itineraries ADD CONSTRAINT itineraries_status_check CHECK (status IN (' || existing_statuses || '))';
    EXECUTE final_query;
END $$;

-- 2. Add decline_reason column to itineraries
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- 3. Create index for declined itineraries
CREATE INDEX IF NOT EXISTS idx_itineraries_declined ON itineraries(status) WHERE status = 'declined';
