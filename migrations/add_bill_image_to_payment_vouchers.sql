-- Migration: Add bill image URL to payment vouchers
-- Run this in Supabase SQL Editor

-- 1. Add bill_image_url column to payment_vouchers
ALTER TABLE public.payment_vouchers
ADD COLUMN IF NOT EXISTS bill_image_url TEXT;

-- 2. Create storage bucket for bill images (run in Supabase Dashboard > Storage > New Bucket)
-- Bucket name: bill-images
-- Public: No (private bucket)
-- Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf

-- OR create via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bill-images',
  'bill-images',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for bill-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload bill images" ON storage.objects;
CREATE POLICY "Authenticated users can upload bill images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bill-images');

DROP POLICY IF EXISTS "Authenticated users can read bill images" ON storage.objects;
CREATE POLICY "Authenticated users can read bill images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bill-images');

DROP POLICY IF EXISTS "Authenticated users can delete bill images" ON storage.objects;
CREATE POLICY "Authenticated users can delete bill images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bill-images');

-- 4. Comment explaining the purpose
COMMENT ON COLUMN public.payment_vouchers.bill_image_url IS 'URL to uploaded bill/invoice image stored in Supabase Storage bucket "bill-images"';
