-- Migration: add ni_district_rate_poundage to councils
-- Applied: 2026-10-01
-- Purpose: Northern Ireland has no council tax — rates are set as a
--          "poundage" (pence per £ of a property's capital value), split
--          between a council-set district rate and a Stormont-set
--          regional rate. council_tax_band_d_pounds does not apply to NI
--          councils and is deliberately left NULL for them; this column
--          holds the one figure that is genuinely the council's own —
--          the district rate.
--
-- Design decisions:
--   - Nullable, no DEFAULT. Only used by the 11 NI councils.
--   - Stores the raw poundage multiplier (e.g. 0.004492 for Belfast),
--     not a derived bill amount — a derived bill needs a specific
--     property's capital value, which this table doesn't hold.
--   - The Stormont-set regional domestic rate (0.005559 for 2026-27) is
--     a single national figure, not a per-council fact, so it is not
--     stored here — it's surfaced as static explanatory copy in the
--     page template instead.

ALTER TABLE public.councils
  ADD COLUMN ni_district_rate_poundage numeric(10,6);
