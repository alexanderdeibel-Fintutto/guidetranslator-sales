-- ═══════════════════════════════════════════════════════════════
-- Phase 8: Missing Tables — gt_lead_notes, gt_contact_requests, gt_calculations
-- Run this in Supabase SQL Editor after phase4 and phase5-7
-- ═══════════════════════════════════════════════════════════════

-- 1. Lead Notes (used by Admin panel, check-followups cron, webhook logging)
CREATE TABLE IF NOT EXISTS gt_lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES gt_leads(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'note' CHECK (note_type IN ('note', 'email', 'call', 'system')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gt_lead_notes_lead_id ON gt_lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_gt_lead_notes_created_at ON gt_lead_notes(created_at);

ALTER TABLE gt_lead_notes ENABLE ROW LEVEL SECURITY;

-- Admins/sales can read all notes
CREATE POLICY "Staff can read all notes" ON gt_lead_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin', 'sales')
    )
  );

-- Admins/sales can insert notes
CREATE POLICY "Staff can insert notes" ON gt_lead_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin', 'sales')
    )
  );

-- Only admins can delete notes
CREATE POLICY "Admins can delete notes" ON gt_lead_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin')
    )
  );

GRANT ALL ON gt_lead_notes TO service_role;

-- 2. Contact Requests (used by supabaseHelpers.js submitContactRequest)
CREATE TABLE IF NOT EXISTS gt_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES gt_leads(id) ON DELETE CASCADE,
  interest_level TEXT,
  timeline TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
  handled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gt_contact_requests_lead_id ON gt_contact_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_gt_contact_requests_status ON gt_contact_requests(status);

ALTER TABLE gt_contact_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create contact requests (for their own leads)
CREATE POLICY "Authenticated can insert contact requests" ON gt_contact_requests
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins/sales can read all
CREATE POLICY "Staff can read contact requests" ON gt_contact_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin', 'sales')
    )
  );

-- Admins/sales can update status
CREATE POLICY "Staff can update contact requests" ON gt_contact_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin', 'sales')
    )
  );

GRANT ALL ON gt_contact_requests TO service_role;

-- 3. Calculations (used by supabaseHelpers.js saveCalculation/loadCalculations/deleteCalculation)
CREATE TABLE IF NOT EXISTS gt_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES gt_leads(id) ON DELETE CASCADE,
  name TEXT,
  inputs JSONB NOT NULL DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gt_calculations_lead_id ON gt_calculations(lead_id);

ALTER TABLE gt_calculations ENABLE ROW LEVEL SECURITY;

-- Users can see their own calculations (via lead ownership)
CREATE POLICY "Users can read own calculations" ON gt_calculations
  FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM gt_leads WHERE auth_user_id = auth.uid()
    )
  );

-- Authenticated users can insert calculations
CREATE POLICY "Authenticated can insert calculations" ON gt_calculations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own calculations
CREATE POLICY "Users can delete own calculations" ON gt_calculations
  FOR DELETE
  USING (
    lead_id IN (
      SELECT id FROM gt_leads WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can manage all
CREATE POLICY "Admins can manage all calculations" ON gt_calculations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin')
    )
  );

GRANT ALL ON gt_calculations TO service_role;
GRANT ALL ON gt_contact_requests TO service_role;
GRANT ALL ON gt_lead_notes TO service_role;
