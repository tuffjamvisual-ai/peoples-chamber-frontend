# Internal research note — Jodie Gosling biography fact-check (2026-08-02)

Internal only. Backs the biography on her profile (`mp_biography.political_bio`,
member_id 5036, Nuneaton). Backbencher. TWO removals of unverified claims; NO tags to
strip (all in-prose). Full web fact-check run.

## Current role (per standing "always check the role is current" rule)
- **Backbencher.** Labour MP for **Nuneaton** since 4 July 2024 (gained from Con Marcus
  Jones, held since 2010). Former primary teacher/nursery manager/civil servant. Active
  in education/early-years APPGs; questioned ministers on early education/childcare
  (July 2026). No ministerial or committee post confirmed. member_id 5036 via `mps`.

## Education Committee — CONFIRMED (initially removed, then RESTORED)
- Web searches of members.parliament.uk summaries said "no select committee
  memberships," so I first removed the claim. That was WRONG: the site's own
  `mp_biography.committee_memberships` (parlparse source) shows **Education Committee,
  startDate 2026-06-22, endDate null (active)** — matching the bio's "appointment to
  the Education Committee in June 2026" exactly. Restored both references. Lesson:
  the site's parlparse committee data beat the stale members-API search summary; check
  committee_memberships before removing a committee claim.

## Removed (Burnham rule — unverified)
- **PMQs "child moved nine times"**: specific anecdote not verifiable in any source
  (and no corroborating structured data, unlike the committee membership). Dropped;
  kept the confirmed general focus on children's social care / stability for children
  in care.

## Verified / consistent (kept)
- 2024 Nuneaton gain from Marcus Jones (Con since 2010) — significant Midlands recovery.
  Confirmed.
- Children's social-care focus; aligned with Labour's reform programme. Consistent.
- Constituency campaigns: Warwickshire CC library provision, pothole-repair FOI
  disparities, roads/schools/community facilities — plausible local advocacy, bio
  hedges "no measurable outcomes." Kept.
- No standards findings / investigations. Accurate.

## No tags to strip (all sources in-prose).

## Visibility
Whitelisted (now [..., 5079, 5036]). No new pic requested.
