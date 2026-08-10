# Internal note — Baroness Smith of Basildon biography (2026-07-29)

Internal only. Backs the biography on her profile
(`person_cache.political_bio`, slug `baroness-smith-of-basildon`), rendered at
**/people/baroness-smith-of-basildon**.

## Placement (important — peers are NOT in mp_biography)
Peers and civil-service staff have profiles under **/people/[slug]**, backed by
the **`person_cache`** table (not `mps`/`mp_biography`). The long assessment bio
goes in **`person_cache.political_bio`**, which the page renders in preference to
the short gov.uk `biography` field and the `description`. No `BIO_VISIBLE_...`
whitelist and **no deploy** are needed — the write is enough; the ISR page
(`revalidate = 3600`) refreshes within the hour. On-demand
`/api/revalidate?path=/people/<slug>` needs the prod `CRON_SECRET` (pulls empty
locally), so rely on the ISR window or a deploy to force it sooner.

## Current role (verified by the user, cross-checked)
Lord Privy Seal + Leader of the House of Lords + Cabinet minister; appointed
5 July 2024, retained by Burnham July 2026. NOT the presiding officer (Lord
Speaker = Lord Forsyth) and NOT the Lords chief whip.

## Corrections applied (user-supplied fact-check)
- Retirement and Participation Committee **did** report — on **15 July 2026**
  (age limit of 80 phased 2029–2034; 20% attendance across two sessions); by
  29 July these were recommendations, not implemented. (Old text wrongly said
  "not yet reported.")
- Hereditary numbers: the Act ended the exemption allowing **up to 92**; **77**
  were removed on 29 April 2026. (Old "removed 92" was false precision.)
- Life peerages back to displaced hereditaries: **29** (3 in Dec 2025 + 26 in
  May 2026), not 26.
- Dropped the "62 Starmer peers" figure (press-combined, not cleanly
  attributable); the replacement passage makes the point without it.

## Editorial consolidations (flagged to user)
- Hereditary figures stated once (in "What remained unfinished"), not duplicated
  in the "delivered" section.
- Removed the old concession paragraph (its 15+2+9=26 breakdown conflicted with
  the corrected 29); its point is carried by the replacement passage.
- Added "Lord Privy Seal" to the July-2024 appointment line.
