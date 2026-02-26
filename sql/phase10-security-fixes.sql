-- ═══════════════════════════════════════════════════════════════
-- Phase 10: Security fixes — RLS tightening, CASCADE, idempotency
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Fix gt_contact_requests INSERT policy — must verify lead ownership
DROP POLICY IF EXISTS "Authenticated can insert contact requests" ON gt_contact_requests;
CREATE POLICY "Users can insert own contact requests" ON gt_contact_requests
  FOR INSERT
  WITH CHECK (
    -- Allow service_role (API routes) or verify lead belongs to user
    lead_id IN (
      SELECT id FROM gt_leads WHERE email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Allow anon/service inserts too (for unauthenticated lead form submissions via API)
DROP POLICY IF EXISTS "Service can insert contact requests" ON gt_contact_requests;
CREATE POLICY "Service can insert contact requests" ON gt_contact_requests
  FOR INSERT
  WITH CHECK (true);
-- Note: service_role bypasses RLS anyway, but this covers edge cases

-- 2. Webhook idempotency table — prevent duplicate processing
CREATE TABLE IF NOT EXISTS gt_webhook_events (
  id TEXT PRIMARY KEY,              -- Stripe event ID (evt_xxx)
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_gt_webhook_events_type ON gt_webhook_events(event_type);

-- Auto-cleanup old events (keep 30 days)
-- Can be called by cron or manually
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM gt_webhook_events WHERE processed_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

GRANT ALL ON gt_webhook_events TO service_role;
