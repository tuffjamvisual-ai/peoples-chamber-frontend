-- Special Advisers transparency surface.
--
-- Schema is current-only by design: every sync truncates and
-- repopulates these tables from the latest quarterly publication.
-- We do not retain historical quarters. The 'quarter' column is
-- stored so the rendered page can identify which quarter the
-- numbers cover; it has the same value across every row in a
-- given refresh.

CREATE TABLE IF NOT EXISTS special_advisers (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  area        TEXT NOT NULL,          -- 'No 10', 'Cabinet Office', 'HM Treasury', etc.
  quarter     TEXT NOT NULL,          -- e.g. 'October to December 2025'
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, area)
);
CREATE INDEX IF NOT EXISTS idx_special_advisers_area ON special_advisers (area);

CREATE TABLE IF NOT EXISTS spad_gifts (
  id              BIGSERIAL PRIMARY KEY,
  spad_name       TEXT NOT NULL,
  area            TEXT NOT NULL,
  gift_date       TEXT,
  gift_descr      TEXT,
  donor           TEXT,
  value_gbp       TEXT,
  outcome         TEXT,
  quarter         TEXT NOT NULL,
  source_pub_slug TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spad_gifts_name ON spad_gifts (spad_name);
CREATE INDEX IF NOT EXISTS idx_spad_gifts_area ON spad_gifts (area);

CREATE TABLE IF NOT EXISTS spad_hospitality (
  id              BIGSERIAL PRIMARY KEY,
  spad_name       TEXT NOT NULL,
  area            TEXT NOT NULL,
  hosp_date       TEXT,
  hosp_descr      TEXT,
  provider        TEXT,
  purpose         TEXT,
  quarter         TEXT NOT NULL,
  source_pub_slug TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spad_hospitality_name ON spad_hospitality (spad_name);
CREATE INDEX IF NOT EXISTS idx_spad_hospitality_area ON spad_hospitality (area);

CREATE TABLE IF NOT EXISTS spad_media_meetings (
  id              BIGSERIAL PRIMARY KEY,
  spad_name       TEXT NOT NULL,
  area            TEXT NOT NULL,
  meeting_date    TEXT,
  media_org       TEXT,
  individual      TEXT,
  purpose         TEXT,
  quarter         TEXT NOT NULL,
  source_pub_slug TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spad_media_meetings_name ON spad_media_meetings (spad_name);
CREATE INDEX IF NOT EXISTS idx_spad_media_meetings_area ON spad_media_meetings (area);

-- RLS policies — anon read access, consistent with other transparency tables
ALTER TABLE special_advisers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spad_gifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE spad_hospitality    ENABLE ROW LEVEL SECURITY;
ALTER TABLE spad_media_meetings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read special advisers"   ON special_advisers   FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can read spad gifts"          ON spad_gifts         FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can read spad hospitality"    ON spad_hospitality    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can read spad media meetings" ON spad_media_meetings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
