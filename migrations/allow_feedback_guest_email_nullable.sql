-- Allow anonymous feedback submissions to omit guest_email
ALTER TABLE feedback
  ALTER COLUMN guest_email DROP NOT NULL;
