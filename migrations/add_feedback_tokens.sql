-- Create feedback_tokens table for secure, tokenized feedback links
CREATE TABLE IF NOT EXISTS feedback_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  group_inquiry_id UUID REFERENCES group_inquiries(id) ON DELETE CASCADE,
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_token ON feedback_tokens(token);
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_expires_at ON feedback_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_used_at ON feedback_tokens(used_at);

-- Enable RLS
ALTER TABLE feedback_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to create tokens
DROP POLICY IF EXISTS "Users can create feedback tokens" ON public.feedback_tokens;
CREATE POLICY "Users can create feedback tokens"
  ON feedback_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow public access to read tokens (for validation)
DROP POLICY IF EXISTS "Public can read tokens for validation" ON public.feedback_tokens;
CREATE POLICY "Public can read tokens for validation"
  ON feedback_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow updating token usage status
DROP POLICY IF EXISTS "Public can mark tokens as used" ON public.feedback_tokens;
CREATE POLICY "Public can mark tokens as used"
  ON feedback_tokens
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Add driver_id and vehicle_id to feedback table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback' AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE feedback ADD COLUMN driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE feedback ADD COLUMN vehicle_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback' AND column_name = 'token_id'
  ) THEN
    ALTER TABLE feedback ADD COLUMN token_id UUID REFERENCES feedback_tokens(id) ON DELETE SET NULL;
  END IF;
END $$;
