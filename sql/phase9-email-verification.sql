-- Phase 9: Email verification + auto-provisioning columns
-- Run this in Supabase SQL Editor

-- Add email verification fields to gt_leads
ALTER TABLE gt_leads ADD COLUMN IF NOT EXISTS verification_code text;
ALTER TABLE gt_leads ADD COLUMN IF NOT EXISTS verification_code_expires timestamptz;
ALTER TABLE gt_leads ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Index for quick code lookups
CREATE INDEX IF NOT EXISTS idx_gt_leads_verification
  ON gt_leads (email, verification_code)
  WHERE verification_code IS NOT NULL;
