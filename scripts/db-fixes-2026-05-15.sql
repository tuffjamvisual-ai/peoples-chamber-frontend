-- Applied 2026-05-15.
--
-- Hot-path indexes added (5):
--   dept_ministers(member_id)  — /mps/[id] generateStaticParams
--   dept_ministers(dept_slug)  — every /departments/[slug] render
--   dept_officials(dept_slug)  — same
--   dept_agencies(dept_slug)   — same
--   mp_interests(member_slug)  — /api/mp-interests called by /people/[slug]
--
-- RLS enabled on 5 dead tables (no policies = deny-all): user, mp_expenses,
-- mp_questions, mp_votes, legislation. Zero code refs each — safe to lock.
--
-- RLS enabled on mp_interests WITH a public-read policy (it's actively
-- queried by anon — enabling RLS without a policy would break /people).
--
-- Dropped 2 permissive INSERT policies that were silently bypassing the
-- per-user restrictions on vote/poll_vote (the OR-combination meant any
-- anon could insert).
--
-- Policies pre-state backup at:
--   scripts/backups/policies-vote-pollvote-pre-20260515-130044.txt

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dept_ministers_member_id ON dept_ministers(member_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dept_ministers_dept_slug ON dept_ministers(dept_slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dept_officials_dept_slug ON dept_officials(dept_slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dept_agencies_dept_slug  ON dept_agencies(dept_slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mp_interests_member_slug ON mp_interests(member_slug);

ALTER TABLE legislation  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_votes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user"       ENABLE ROW LEVEL SECURITY;

ALTER TABLE mp_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read mp interests" ON mp_interests;
CREATE POLICY "Anyone can read mp interests" ON mp_interests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert votes" ON vote;
DROP POLICY IF EXISTS "Anyone can insert poll votes" ON poll_vote;
