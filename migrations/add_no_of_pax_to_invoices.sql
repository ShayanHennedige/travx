-- Migration: Add no_of_pax to customer_invoices
-- Run this in Supabase SQL Editor

ALTER TABLE public.customer_invoices 
ADD COLUMN IF NOT EXISTS no_of_pax INTEGER DEFAULT 2;

COMMENT ON COLUMN public.customer_invoices.no_of_pax IS 'Total number of travelers for this invoice';
