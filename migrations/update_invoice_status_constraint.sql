-- Migration: Allow 'confirmed' status in customer_invoices
-- Run this in Supabase SQL Editor

-- 1. Drop existing constraint (name might vary, so we try standardized names or generic approach)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint 
        WHERE conname = 'customer_invoices_status_check'
    ) THEN
        ALTER TABLE customer_invoices DROP CONSTRAINT customer_invoices_status_check;
    END IF;
END $$;

-- 2. Add updated constraint
ALTER TABLE customer_invoices 
ADD CONSTRAINT customer_invoices_status_check 
CHECK (status IN ('draft', 'confirmed', 'sent', 'paid', 'overdue', 'cancelled'));
