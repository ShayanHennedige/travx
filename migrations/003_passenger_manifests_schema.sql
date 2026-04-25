-- Passenger Manifests table for post-acceptance data collection
CREATE TABLE IF NOT EXISTS passenger_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  passport_number TEXT,
  passport_expiry DATE,
  nationality TEXT,
  date_of_birth DATE,
  dietary_requirements TEXT,
  is_lead_passenger BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- We don't drop the name/passport columns from inquiries right away for backwards compatibility,
-- but they are no longer required by the application logic during the quote phase.
