# Council election results: batch builder

`build.py` turns one batch of collected council election results into the files the importer
(`scripts/import-council-election-results.js`) loads. For each council in the batch it reads the parsed
results, checks every ward against Democracy Club's list of wards and seats, and writes:

| File | What it is |
|---|---|
| `out/<batch>.csv` | one row per candidate: election_date, council, ward_code, ward_code_source, ward, seats, seats_offered, candidate, party, votes, elected, electorate, turnout_pct, ballots_rejected, source_url |
| `out/<batch>-checks.txt` | each ward's figures and every check that failed (seats elected, winners above losers, turnout, ward count) |
| `out/<batch>-councils.json` | the council map for the importer (GSS code, wards per polling date, source note) |
| `out/<batch>-changes.txt` | changes made under the owner's rules (e.g. winners marked where the page did not mark them) |
| `out/<batch>-unmapped-parties.json` | party descriptions not yet in `party-names.csv` |

`seats` is the number of councillors returned in the ward; `seats_offered` is Democracy Club's seats on offer.
They differ only for an under-contested ward, and the importer saves the difference as `seats_unfilled`.

## Inputs (in the batch working folder, the folder it is run from)

- `contests-<year>.json` (or `contests-ordered.json`): the councils in the batch, with slug, name and polling dates
- `dc/<slug>.json`: Democracy Club's wards for each council (ward, GSS code, seats, polling date)
- `parsed/<slug>.json` (and `parsed/<slug>@<date>.json` for a postponed poll): the collected results
- `status/<slug>.json`: each council's collection status; `manual` councils are held back
- `party-names.csv` (optional): published party names already mapped
- `extra-councils.json` (optional): GSS codes for councils not in the councils table
- `COUNCILS_CSV`: an export of the `councils` table with at least `slug` and `gss_code`
  (default `../councilres/councils.csv`), e.g.
  `psql "$DATABASE_URL" -c "\copy (select slug, name, short_name, gss_code, country, last_election_year, type, website_url from councils) to 'councils.csv' csv header"`

Settings (environment): `CONTESTS` (the contests file), `MAIN_DATE` (the batch's main polling date,
default 2026-05-07), `COUNCILS_CSV`.

None of these inputs or the outputs are kept in Git.

## Run

From the batch working folder:

```
CONTESTS=contests-2022.json MAIN_DATE=2022-05-05 COUNCILS_CSV=../councilres/councils.csv \
  python3 -I <repo>/scripts/council-results/build.py <batch-name> <slug> [<slug>@<postponed date>] ...
```

Then check `out/<batch>-checks.txt`, and dry run the importer on `out/<batch>.csv` before loading.
