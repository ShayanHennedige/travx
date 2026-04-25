-- Remove the status column from the pnl_records table
ALTER TABLE public.pnl_records DROP COLUMN IF EXISTS status;
