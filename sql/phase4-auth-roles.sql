-- ═══════════════════════════════════════════════════════════════
-- Phase 4: Supabase Auth + Rollen-System
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS gt_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'kreuzfahrt',
  owner_user_id UUID REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Roles table
CREATE TABLE IF NOT EXISTS gt_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'sales', 'customer', 'sub_account')),
  segment TEXT,
  organization_id UUID REFERENCES gt_organizations(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Add new columns to gt_leads if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'offer_created_at') THEN
    ALTER TABLE gt_leads ADD COLUMN offer_created_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'tested_at') THEN
    ALTER TABLE gt_leads ADD COLUMN tested_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'test_reminder_sent_at') THEN
    ALTER TABLE gt_leads ADD COLUMN test_reminder_sent_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'segment') THEN
    ALTER TABLE gt_leads ADD COLUMN segment TEXT DEFAULT 'kreuzfahrt';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gt_leads' AND column_name = 'auth_user_id') THEN
    ALTER TABLE gt_leads ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 4. RLS policies for gt_roles
ALTER TABLE gt_roles ENABLE ROW LEVEL SECURITY;

-- Admins can read all roles
CREATE POLICY "Admins can read all roles" ON gt_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin')
    )
    OR user_id = auth.uid()
  );

-- Only super_admin/admin can insert roles
CREATE POLICY "Admins can insert roles" ON gt_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin')
    )
  );

-- Only super_admin/admin can update roles
CREATE POLICY "Admins can update roles" ON gt_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin')
    )
  );

-- Only super_admin can delete roles
CREATE POLICY "Super admins can delete roles" ON gt_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role = 'super_admin'
    )
  );

-- 5. RLS policies for gt_organizations
ALTER TABLE gt_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage organizations" ON gt_organizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gt_roles AS r
      WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin', 'admin')
    )
    OR owner_user_id = auth.uid()
  );

-- 6. Index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_gt_roles_user_id ON gt_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_gt_roles_role ON gt_roles(role);
CREATE INDEX IF NOT EXISTS idx_gt_organizations_segment ON gt_organizations(segment);

-- 7. Allow service role to bypass RLS (for API routes)
-- This is default in Supabase, but ensure it's set
GRANT ALL ON gt_roles TO service_role;
GRANT ALL ON gt_organizations TO service_role;
