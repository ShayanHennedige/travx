-- Proposals grouping for an inquiry
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id),
  group_inquiry_id UUID REFERENCES group_inquiries(id),
  title TEXT DEFAULT 'Proposal',
  status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Itinerary versions linking back to a proposal
CREATE TABLE IF NOT EXISTS itinerary_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL, -- e.g. "Budget", "Standard", "Luxury"
  itinerary_id UUID REFERENCES itineraries(id), 
  costing_sheet_id UUID REFERENCES tour_costing_sheets(id),
  is_accepted BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false, -- immutable once sent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add proposal constraint back to itineraries
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id);

-- Add proposal constraint back to tour_costing_sheets
ALTER TABLE tour_costing_sheets ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id);
