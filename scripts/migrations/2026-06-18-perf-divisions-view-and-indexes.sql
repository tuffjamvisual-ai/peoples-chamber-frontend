-- 2026-06-18 — Performance audit fixes (applied to production).
--
-- Context: audit found (a) the sitemap pulled all ~268k mp_division_votes
-- rows to derive 597 distinct divisions in JS, and (b) the hot /mps/[id]
-- voting query did an index scan + top-N sort (~31ms), plus two pairs of
-- duplicate indexes wasting write throughput on the daily sync.

-- ── Item 1: distinct-divisions view for the sitemap ───────────────────────
-- Replaces the 268k-row pull + JS Map dedupe with a single ~597-row read.
-- security_invoker=true so it respects mp_division_votes' RLS (anon already
-- has SELECT on the base table).
create or replace view public.commons_divisions_distinct
  with (security_invoker = true) as
select distinct division_date_only, division_number
from public.mp_division_votes
where division_date_only is not null
  and division_number is not null;

grant select on public.commons_divisions_distinct to anon, authenticated;

-- ── Item 2: index migration ───────────────────────────────────────────────
-- CONCURRENTLY (can't run in a txn block) — run each statement separately.

-- Composite for /mps/[id] voting record: WHERE member_id = X
-- ORDER BY division_date DESC LIMIT/OFFSET. DESC defaults to NULLS FIRST,
-- matching PostgREST's .order('division_date',{ascending:false}), so the
-- planner satisfies the ORDER BY from the index and skips the sort.
-- Verified: 31ms -> 0.079ms.
create index concurrently if not exists idx_mp_division_votes_member_date
  on public.mp_division_votes (member_id, division_date desc);

-- Drop duplicate division_id index (identical to idx_mp_division_votes_division_id).
drop index concurrently if exists public.idx_mp_division_votes_division;

-- Drop duplicate member_slug index (identical to idx_mp_interests_member_slug).
drop index concurrently if exists public.mp_interests_member_slug_idx;
