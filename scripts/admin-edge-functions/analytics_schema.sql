-- ============================================================
-- Analytics Schema für zentrale Vercel Analytics
-- ============================================================

-- Tabelle für Page Views (von allen Apps)
CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Welche App / Drain-Gruppe
  app_group TEXT NOT NULL,            -- 'translator' oder 'fintutto'
  project_name TEXT,                   -- z.B. 'guidetranslator-sales', 'cloud'
  hostname TEXT,                       -- z.B. 'sales.guidinggroup.com'

  -- Page View Daten
  path TEXT NOT NULL,                  -- z.B. '/pricing'
  referrer TEXT,                       -- z.B. 'https://google.com'

  -- Besucher-Info
  country TEXT,                        -- z.B. 'DE', 'AT', 'CH'
  city TEXT,
  region TEXT,
  device TEXT,                         -- 'desktop', 'mobile', 'tablet'
  os TEXT,                             -- 'Windows', 'macOS', 'iOS', 'Android'
  browser TEXT,                        -- 'Chrome', 'Firefox', 'Safari'

  -- Custom Events
  event_name TEXT DEFAULT 'pageview',
  event_data JSONB,

  -- Zeitstempel
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_pageviews_app_group ON analytics_pageviews(app_group);
CREATE INDEX IF NOT EXISTS idx_pageviews_hostname ON analytics_pageviews(hostname);
CREATE INDEX IF NOT EXISTS idx_pageviews_timestamp ON analytics_pageviews(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pageviews_path ON analytics_pageviews(path);
CREATE INDEX IF NOT EXISTS idx_pageviews_country ON analytics_pageviews(country);
CREATE INDEX IF NOT EXISTS idx_pageviews_event ON analytics_pageviews(event_name);
CREATE INDEX IF NOT EXISTS idx_pageviews_group_time ON analytics_pageviews(app_group, timestamp DESC);

-- Aggregierte Tages-Statistiken
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  app_group TEXT NOT NULL,
  hostname TEXT NOT NULL,
  path TEXT NOT NULL,

  pageviews INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,

  top_referrers JSONB DEFAULT '[]',
  top_countries JSONB DEFAULT '[]',
  desktop_count INTEGER DEFAULT 0,
  mobile_count INTEGER DEFAULT 0,
  tablet_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, hostname, path)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON analytics_daily_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_group ON analytics_daily_stats(app_group, date DESC);

-- Row Level Security
ALTER TABLE analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access pageviews" ON analytics_pageviews
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access daily_stats" ON analytics_daily_stats
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anon read pageviews" ON analytics_pageviews
  FOR SELECT USING (true);

CREATE POLICY "Anon read daily_stats" ON analytics_daily_stats
  FOR SELECT USING (true);

-- Hilfreiche Views
CREATE OR REPLACE VIEW analytics_today AS
SELECT
  app_group,
  hostname,
  COUNT(*) as pageviews,
  COUNT(DISTINCT country || device || browser) as estimated_visitors
FROM analytics_pageviews
WHERE timestamp >= CURRENT_DATE
GROUP BY app_group, hostname
ORDER BY pageviews DESC;

CREATE OR REPLACE VIEW analytics_30days AS
SELECT
  app_group,
  hostname,
  COUNT(*) as pageviews,
  COUNT(DISTINCT country || device || browser) as estimated_visitors,
  COUNT(DISTINCT path) as unique_pages
FROM analytics_pageviews
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY app_group, hostname
ORDER BY pageviews DESC;

CREATE OR REPLACE VIEW analytics_top_pages AS
SELECT
  app_group,
  hostname,
  path,
  COUNT(*) as views,
  COUNT(DISTINCT country) as countries
FROM analytics_pageviews
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY app_group, hostname, path
ORDER BY views DESC
LIMIT 100;
