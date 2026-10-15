-- Party make-up of each council (seats by party) and who runs it, from Open Council Data UK's
-- council compositions file (history2016-26.csv), which is public domain (CC0) and captured
-- shortly after each May election. Loaded by scripts/import-council-composition.js.
--
-- administration_code is the publisher's own label for who runs the council, e.g. 'LAB',
-- 'LAB min' (minority), 'LD/IND' (coalition), 'LAB Mayor' (directly elected mayor), 'NOC'.

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.council_composition (
  gss_code            text PRIMARY KEY,
  council_slug        text,              -- councils.slug when matched on gss_code
  authority_name      text NOT NULL,     -- as published
  snapshot_year       smallint NOT NULL, -- year of the May capture, not the last election year
  total_seats         smallint NOT NULL,
  seats               jsonb NOT NULL,    -- {"con": 8, "lab": 19, "ld": 1, "green": 5, "ukip": 0, "ref": 3, "pc": 0, "snp": 0, "other": 6}
  largest_party       text,              -- code of the party with most seats ('other' = independents and others)
  largest_seats       smallint,
  majority_party      text,              -- code of the party with more than half the seats, else null
  administration_code text,              -- publisher's label (see above); null when not given
  source              text NOT NULL DEFAULT 'Open Council Data UK (CC0)',
  built_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS council_composition_slug_idx ON public.council_composition (council_slug);

ALTER TABLE public.council_composition ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS council_composition_public_read ON public.council_composition;
CREATE POLICY council_composition_public_read ON public.council_composition FOR SELECT TO anon, authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'council_composition' AND policyname = 'council_composition_public_read') THEN
    RAISE EXCEPTION 'public read policy missing';
  END IF;
END $$;

COMMIT;
