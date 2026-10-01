-- Leader party backfill — derived, no new data source.
--
-- Logic: where a council has a single-party majority (political_control_status
-- = 'majority') and a named leader (leader_name is set) but no recorded
-- leader_party, the leader's party is, in practice, always the controlling
-- party. This backfills leader_party = political_control for that subset only.
--
-- Excluded on purpose because political_control there is not a single clean
-- party identity:
--   'No overall control'        — no single controlling party to attribute
--   'Independents and others'   — a mix, not one party/group
--
-- Conservative write, matching the Wikidata backfill convention: only fills
-- leader_party where it is currently NULL. Never overwrites an existing value.
--
-- Run the SELECT first to review exactly which rows will change before
-- running the UPDATE. Re-verify against current council pages if in doubt —
-- a council could have changed leader without a change of control since the
-- underlying political_control/leader_name rows were last touched.

-- ===== PREVIEW: rows this will update =====
SELECT slug, name, political_control, political_control_status, leader_name, leader_party AS leader_party_before
FROM councils
WHERE leader_name IS NOT NULL
  AND leader_party IS NULL
  AND political_control_status = 'majority'
  AND political_control NOT IN ('No overall control', 'Independents and others')
ORDER BY name;

-- ===== UPDATE =====
BEGIN;

UPDATE councils
SET leader_party = political_control
WHERE leader_name IS NOT NULL
  AND leader_party IS NULL
  AND political_control_status = 'majority'
  AND political_control NOT IN ('No overall control', 'Independents and others');

COMMIT;

-- ===== VERIFY: coverage after =====
SELECT
  count(*) FILTER (WHERE leader_party IS NOT NULL) AS leader_party_filled,
  count(*) AS total_councils
FROM councils;
