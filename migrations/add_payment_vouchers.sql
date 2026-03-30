-- Migration: Add Payment Vouchers table
-- Run this in Supabase SQL Editor

-- 1. Create payees table for dropdown selection
CREATE TABLE IF NOT EXISTS public.payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- Hotel, Supplier, Staff, Other
  bank_name VARCHAR(255),
  account_number VARCHAR(100),
  contact_info TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create payment_vouchers table
CREATE TABLE IF NOT EXISTS public.payment_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no VARCHAR(50) UNIQUE NOT NULL,
  voucher_date DATE DEFAULT CURRENT_DATE,
  
  -- Tour/Costing Reference
  tour_id UUID REFERENCES tours(id),
  costing_sheet_id UUID REFERENCES tour_costing_sheets(id),
  tour_reference VARCHAR(100),
  hotel_invoice_no VARCHAR(100),
  
  -- Payee Information
  payee_id UUID REFERENCES payees(id),
  payee_type VARCHAR(50) NOT NULL, -- Hotel, Supplier, Staff, Other
  payee_name TEXT NOT NULL,
  
  -- Description (can be pulled from costing sheet)
  description TEXT,
  nights_count INTEGER DEFAULT 0,
  
  -- Amounts
  rate_usd NUMERIC(12, 2) DEFAULT 0,
  total_usd NUMERIC(12, 2) DEFAULT 0,
  exchange_rate NUMERIC(10, 2) DEFAULT 300,
  total_lkr NUMERIC(12, 2) DEFAULT 0,
  amount_in_words TEXT,
  
  -- Payment Method
  payment_mode VARCHAR(50), -- Cash, Bank Transfer, Cheque, Credit Card, Debit Card
  cheque_ref_no VARCHAR(100),
  bank_name VARCHAR(255),
  
  -- Remarks
  remarks TEXT,
  
  -- Signatures/Approvals
  prepared_by TEXT,
  checked_by TEXT,
  authorized_by TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_tour ON public.payment_vouchers(tour_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_costing ON public.payment_vouchers(costing_sheet_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_payee ON public.payment_vouchers(payee_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status ON public.payment_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_date ON public.payment_vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_payees_type ON public.payees(type);

-- 4. Enable RLS
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for payment_vouchers
DROP POLICY IF EXISTS "Authenticated users can read payment vouchers" ON public.payment_vouchers;
CREATE POLICY "Authenticated users can read payment vouchers"
  ON public.payment_vouchers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create payment vouchers" ON public.payment_vouchers;
CREATE POLICY "Authenticated users can create payment vouchers"
  ON public.payment_vouchers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update payment vouchers" ON public.payment_vouchers;
CREATE POLICY "Authenticated users can update payment vouchers"
  ON public.payment_vouchers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete payment vouchers" ON public.payment_vouchers;
CREATE POLICY "Authenticated users can delete payment vouchers"
  ON public.payment_vouchers FOR DELETE TO authenticated USING (true);

-- 6. RLS Policies for payees
DROP POLICY IF EXISTS "Authenticated users can read payees" ON public.payees;
CREATE POLICY "Authenticated users can read payees"
  ON public.payees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage payees" ON public.payees;
CREATE POLICY "Authenticated users can manage payees"
  ON public.payees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Function to auto-generate voucher number
CREATE OR REPLACE FUNCTION generate_voucher_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  next_number INTEGER;
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_no FROM 4 FOR 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM payment_vouchers
  WHERE voucher_no LIKE 'PV-' || year_suffix || '-%';
  
  NEW.voucher_no := 'PV-' || year_suffix || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for auto voucher number
DROP TRIGGER IF EXISTS set_voucher_number ON payment_vouchers;
CREATE TRIGGER set_voucher_number
  BEFORE INSERT ON payment_vouchers
  FOR EACH ROW
  WHEN (NEW.voucher_no IS NULL OR NEW.voucher_no = '')
  EXECUTE FUNCTION generate_voucher_number();

-- 9. Function to update updated_at
CREATE OR REPLACE FUNCTION update_payment_voucher_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_payment_voucher_updated_at ON payment_vouchers;
CREATE TRIGGER set_payment_voucher_updated_at
  BEFORE UPDATE ON payment_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_voucher_updated_at();

-- 10. Insert some default payees
INSERT INTO payees (name, type) VALUES
  ('Heritance Hotels', 'Hotel'),
  ('Cinnamon Hotels', 'Hotel'),
  ('Marriott', 'Hotel'),
  ('Transport Supplier A', 'Supplier'),
  ('Staff - Driver Batta', 'Staff')
ON CONFLICT DO NOTHING;
