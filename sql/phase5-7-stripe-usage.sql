-- ═══════════════════════════════════════════════════════════════
-- Phase 5-7: Stripe + Usage Tracking
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add Stripe + subscription columns to gt_leads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE gt_leads ADD COLUMN stripe_customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE gt_leads ADD COLUMN stripe_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'subscription_tier') THEN
    ALTER TABLE gt_leads ADD COLUMN subscription_tier TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'subscription_status') THEN
    ALTER TABLE gt_leads ADD COLUMN subscription_status TEXT DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'last_payment_at') THEN
    ALTER TABLE gt_leads ADD COLUMN last_payment_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'last_payment_amount') THEN
    ALTER TABLE gt_leads ADD COLUMN last_payment_amount NUMERIC;
  END IF;
END $$;

-- 2. Usage tracking table
CREATE TABLE IF NOT EXISTS gt_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES gt_leads(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  minutes NUMERIC NOT NULL DEFAULT 0,
  languages INTEGER NOT NULL DEFAULT 1,
  listeners INTEGER NOT NULL DEFAULT 0,
  segment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Monthly aggregation view
CREATE OR REPLACE VIEW gt_usage_monthly AS
SELECT
  lead_id,
  date_trunc('month', created_at) AS month,
  SUM(minutes) AS total_minutes,
  COUNT(*) AS total_sessions,
  SUM(listeners) AS total_listeners,
  MAX(languages) AS max_languages
FROM gt_usage
GROUP BY lead_id, date_trunc('month', created_at);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_gt_usage_lead_id ON gt_usage(lead_id);
CREATE INDEX IF NOT EXISTS idx_gt_usage_created_at ON gt_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_gt_leads_stripe ON gt_leads(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_gt_leads_subscription ON gt_leads(subscription_status);

-- 5. RLS for gt_usage
ALTER TABLE gt_usage ENABLE ROW LEVEL SECURITY;

-- Users can see their own usage
CREATE POLICY "Users can read own usage" ON gt_usage
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Admins can see all usage
CREATE POLICY "Admins can read all usage" ON gt_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin')
    )
  );

-- Service role can insert (from API/webhooks)
GRANT ALL ON gt_usage TO service_role;
GRANT SELECT ON gt_usage_monthly TO service_role;
GRANT SELECT ON gt_usage_monthly TO authenticated;
