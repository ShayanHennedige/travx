-- Migration: Add hotel rate collection tables
-- Run this in Supabase SQL Editor

-- Table for rate requests sent to hotels
CREATE TABLE IF NOT EXISTS public.hotel_rate_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) UNIQUE,
  hotel_name VARCHAR(255) NOT NULL,
  hotel_email VARCHAR(255) NOT NULL,
  hotel_contact VARCHAR(100),
  hotel_address TEXT,
  requested_by VARCHAR(100),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  group_inquiry_id UUID REFERENCES group_inquiries(id) ON DELETE SET NULL,
  check_in_date DATE,
  check_out_date DATE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT hotel_rate_requests_pkey PRIMARY KEY (id)
);

-- Table for storing submitted rates
CREATE TABLE IF NOT EXISTS public.hotel_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES hotel_rate_requests(id) ON DELETE CASCADE,
  room_category VARCHAR(100) NOT NULL,
  meal_plan VARCHAR(20) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  sell_mode VARCHAR(20) DEFAULT 'per_room',
  rate_sgl NUMERIC(10,2),
  rate_dbl NUMERIC(10,2),
  rate_tpl NUMERIC(10,2),
  rate_child NUMERIC(10,2),
  rate_extra_adult NUMERIC(10,2),
  min_nights INTEGER DEFAULT 1,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT hotel_rates_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hotel_rate_requests_token ON public.hotel_rate_requests(token);
CREATE INDEX IF NOT EXISTS idx_hotel_rate_requests_status ON public.hotel_rate_requests(status);
CREATE INDEX IF NOT EXISTS idx_hotel_rates_request_id ON public.hotel_rates(request_id);

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_rate_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'RATE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('rate_request_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for request numbers
CREATE SEQUENCE IF NOT EXISTS rate_request_seq START 1;

-- Create trigger
DROP TRIGGER IF EXISTS set_rate_request_number ON hotel_rate_requests;
CREATE TRIGGER set_rate_request_number
  BEFORE INSERT ON hotel_rate_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION generate_rate_request_number();
