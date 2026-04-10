-- Migration: Add flight details and agent arrangement fields to inquiries and group_inquiries
-- Run this in your Supabase SQL Editor

-- Add fields to inquiries table
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS arranged_by_agent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inbound_flight_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS inbound_arrival_date DATE,
ADD COLUMN IF NOT EXISTS inbound_arrival_time TIME,
ADD COLUMN IF NOT EXISTS outbound_flight_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS outbound_departure_date DATE,
ADD COLUMN IF NOT EXISTS outbound_departure_time TIME;

-- Add fields to group_inquiries table
ALTER TABLE group_inquiries 
ADD COLUMN IF NOT EXISTS arranged_by_agent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inbound_flight_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS inbound_arrival_date DATE,
ADD COLUMN IF NOT EXISTS inbound_arrival_time TIME,
ADD COLUMN IF NOT EXISTS outbound_flight_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS outbound_departure_date DATE,
ADD COLUMN IF NOT EXISTS outbound_departure_time TIME;

-- Add comments for clarity
COMMENT ON COLUMN inquiries.arranged_by_agent IS 'Whether the trip is arranged by a travel agent';
COMMENT ON COLUMN inquiries.inbound_flight_no IS 'Inbound flight number';
COMMENT ON COLUMN inquiries.inbound_arrival_date IS 'Inbound flight arrival date';
COMMENT ON COLUMN inquiries.inbound_arrival_time IS 'Inbound flight arrival time';
COMMENT ON COLUMN inquiries.outbound_flight_no IS 'Outbound flight number';
COMMENT ON COLUMN inquiries.outbound_departure_date IS 'Outbound flight departure date';
COMMENT ON COLUMN inquiries.outbound_departure_time IS 'Outbound flight departure time';

COMMENT ON COLUMN group_inquiries.arranged_by_agent IS 'Whether the trip is arranged by a travel agent';
COMMENT ON COLUMN group_inquiries.inbound_flight_no IS 'Inbound flight number';
COMMENT ON COLUMN group_inquiries.inbound_arrival_date IS 'Inbound flight arrival date';
COMMENT ON COLUMN group_inquiries.inbound_arrival_time IS 'Inbound flight arrival time';
COMMENT ON COLUMN group_inquiries.outbound_flight_no IS 'Outbound flight number';
COMMENT ON COLUMN group_inquiries.outbound_departure_date IS 'Outbound flight departure date';
COMMENT ON COLUMN group_inquiries.outbound_departure_time IS 'Outbound flight departure time';
