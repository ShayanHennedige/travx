-- Migration: Add Customer Invoices and PNL System
-- Run this in Supabase SQL Editor

-- 1. Create customer_invoices table
CREATE TABLE IF NOT EXISTS public.customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,
  
  -- Tour/Costing Reference
  tour_id UUID REFERENCES public.tours(id),
  itinerary_id UUID REFERENCES public.itineraries(id),
  costing_sheet_id UUID REFERENCES public.tour_costing_sheets(id),
  tour_reference VARCHAR(100),
  
  -- Customer Info
  customer_name TEXT,
  customer_company TEXT,
  customer_email TEXT,
  customer_address TEXT,
  
  -- Rates (absorbed from costing sheet)
  rate_sgl NUMERIC(12, 2) DEFAULT 0,
  rate_dbl NUMERIC(12, 2) DEFAULT 0,
  rate_tpl NUMERIC(12, 2) DEFAULT 0,
  rate_qud NUMERIC(12, 2) DEFAULT 0,
  
  -- Quantities
  qty_sgl INTEGER DEFAULT 0,
  qty_dbl INTEGER DEFAULT 0,
  qty_tpl INTEGER DEFAULT 0,
  qty_qud INTEGER DEFAULT 0,
  
  -- Totals
  subtotal NUMERIC(12, 2) DEFAULT 0,
  bank_charges NUMERIC(12, 2) DEFAULT 0,
  tax_percentage NUMERIC(5, 2) DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  
  -- Payment Info
  payment_terms TEXT,
  due_date DATE,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  balance_due NUMERIC(12, 2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Metadata
  notes TEXT,
  package_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Ensure all columns exist (in case table already existed)
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES public.tours(id);
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS itinerary_id UUID REFERENCES public.itineraries(id);
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS costing_sheet_id UUID REFERENCES public.tour_costing_sheets(id);
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS package_description TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS bank_charges NUMERIC(12, 2) DEFAULT 0;

-- 2. Create PNL records table
CREATE TABLE IF NOT EXISTS public.pnl_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES public.tours(id),
  itinerary_id UUID REFERENCES public.itineraries(id),
  costing_sheet_id UUID REFERENCES public.tour_costing_sheets(id),
  tour_reference VARCHAR(100),
  period_start DATE,
  period_end DATE,
  
  -- Income (from customer invoices)
  customer_invoice_total NUMERIC(12, 2) DEFAULT 0,
  other_income NUMERIC(12, 2) DEFAULT 0,
  
  -- Expenses (from payment vouchers)
  hotel_expenses NUMERIC(12, 2) DEFAULT 0,
  driver_expenses NUMERIC(12, 2) DEFAULT 0,
  staff_payments NUMERIC(12, 2) DEFAULT 0,
  supplier_expenses NUMERIC(12, 2) DEFAULT 0,
  other_expenses NUMERIC(12, 2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'approved')),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist (in case table already existed)
ALTER TABLE public.pnl_records ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES public.tours(id);
ALTER TABLE public.pnl_records ADD COLUMN IF NOT EXISTS itinerary_id UUID REFERENCES public.itineraries(id);
ALTER TABLE public.pnl_records ADD COLUMN IF NOT EXISTS costing_sheet_id UUID REFERENCES public.tour_costing_sheets(id);

-- Check if generated columns exist, if not add them
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pnl_records' AND column_name = 'total_income') THEN
    ALTER TABLE public.pnl_records ADD COLUMN total_income NUMERIC(12, 2) GENERATED ALWAYS AS (customer_invoice_total + other_income) STORED;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pnl_records' AND column_name = 'total_expenses') THEN
    ALTER TABLE public.pnl_records ADD COLUMN total_expenses NUMERIC(12, 2) GENERATED ALWAYS AS (
      hotel_expenses + driver_expenses + staff_payments + supplier_expenses + other_expenses
    ) STORED;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pnl_records' AND column_name = 'net_profit') THEN
    ALTER TABLE public.pnl_records ADD COLUMN net_profit NUMERIC(12, 2) GENERATED ALWAYS AS (
      (customer_invoice_total + other_income) - 
      (hotel_expenses + driver_expenses + staff_payments + supplier_expenses + other_expenses)
    ) STORED;
  END IF;
END $$;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_invoices_tour ON public.customer_invoices(tour_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_itinerary ON public.customer_invoices(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_costing ON public.customer_invoices(costing_sheet_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_status ON public.customer_invoices(status);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_date ON public.customer_invoices(invoice_date);

CREATE INDEX IF NOT EXISTS idx_pnl_records_tour ON public.pnl_records(tour_id);
CREATE INDEX IF NOT EXISTS idx_pnl_records_period ON public.pnl_records(period_start, period_end);

-- 4. Enable RLS
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnl_records ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for customer_invoices
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON public.customer_invoices;
CREATE POLICY "Authenticated users can read invoices"
  ON public.customer_invoices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.customer_invoices;
CREATE POLICY "Authenticated users can manage invoices"
  ON public.customer_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. RLS Policies for pnl_records
DROP POLICY IF EXISTS "Authenticated users can read pnl records" ON public.pnl_records;
CREATE POLICY "Authenticated users can read pnl records"
  ON public.pnl_records FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage pnl records" ON public.pnl_records;
CREATE POLICY "Authenticated users can manage pnl records"
  ON public.pnl_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Function to auto-generate invoice number (format YYYY/NNN)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  next_number INTEGER;
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Extract maximum numeric part after the slash for the current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_no FROM 6) AS INTEGER)), 100) + 1
  INTO next_number
  FROM customer_invoices
  WHERE invoice_no LIKE year_suffix || '/%';
  
  NEW.invoice_no := year_suffix || '/' || next_number::TEXT;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback if casting fails due to old data format
  NEW.invoice_no := year_suffix || '/' || (100 + floor(random() * 900))::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for auto invoice number
DROP TRIGGER IF EXISTS set_invoice_number ON customer_invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON customer_invoices
  FOR EACH ROW
  WHEN (NEW.invoice_no IS NULL OR NEW.invoice_no = '')
  EXECUTE FUNCTION generate_invoice_number();

-- 9. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_updated_at ON customer_invoices;
CREATE TRIGGER set_invoice_updated_at
  BEFORE UPDATE ON customer_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

CREATE OR REPLACE FUNCTION update_pnl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pnl_updated_at ON pnl_records;
CREATE TRIGGER set_pnl_updated_at
  BEFORE UPDATE ON pnl_records
  FOR EACH ROW
  EXECUTE FUNCTION update_pnl_updated_at();
