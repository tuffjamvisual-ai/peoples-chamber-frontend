-- Section 114 watchlist correction, Oct 2026.
--
-- Havering and Bradford were listed with section_114_year set, but
-- research against trade press (LGC, Room151, Public Finance) and GOV.UK
-- shows neither actually issued a Section 114 notice. Both repeatedly
-- warned they were close (2023-2024) but received government Exceptional
-- Financial Support specifically to avoid issuing one:
--   - Havering: EFS £18.14m (2023-24) + £30.4m (2024-25); Room151 reported
--     this was "to avoid section 114 notice"; Public Finance still
--     reported Havering "could issue S114" as late as Nov 2024 (i.e.
--     still hadn't). Got a formal improvement notice (GOV.UK, Mar 2024)
--     instead — a different intervention, not a s114.
--   - Bradford: EFS £80m (2023-24) + £120m (2024-25); LGC reported Bradford
--     was issued a Best Value Notice with exceptional financial support
--     INSTEAD of a s114. Granted further borrowing powers in 2025
--     specifically to keep avoiding bankruptcy risk.
-- No source found confirms either council ever issued an actual notice.
-- Both section_114_year values are cleared (set NULL) rather than
-- guessed at a different year, since the underlying event didn't happen.
--
-- Barnet is added: confirmed by five independent trade outlets (LGC,
-- Room151, Public Finance, Local Government Lawyer, MJ) to have issued an
-- actual Section 114 notice on 24 January 2025 — over its own officers
-- discovering unlawful payments to and from the council's pension fund
-- (a governance/fraud-adjacent failure, not a funding-gap one like the
-- others on the watchlist).
--
-- Croydon (3 notices: 2020 x2, 2022) and Nottingham (2: 2021, 2023) are
-- left untouched here — which year to record for a council with multiple
-- notices is a convention decision, not a factual correction, and is
-- being left for a separate pass.
--
-- Sources checked 2026-10-01: Room151, Public Finance, GOV.UK EFS
-- guidance, GOV.UK improvement notice publications, LGC, Yorkshire Post,
-- Local Government Lawyer, MJ.

-- ===== PREVIEW: rows before change =====
SELECT slug, name, section_114_year
FROM councils
WHERE slug IN ('havering', 'bradford', 'barnet');

-- ===== UPDATE =====
BEGIN;

UPDATE councils SET section_114_year = NULL WHERE slug = 'havering';
UPDATE councils SET section_114_year = NULL WHERE slug = 'bradford';
UPDATE councils SET section_114_year = 2025 WHERE slug = 'barnet';

COMMIT;

-- ===== VERIFY =====
SELECT slug, name, section_114_year
FROM councils
WHERE slug IN ('havering', 'bradford', 'barnet');
