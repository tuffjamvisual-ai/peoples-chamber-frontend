#!/usr/bin/env python3
# Adds verified links to "How this piece was checked" records in the editorials table, the only copy of the reports.
#   python3 scripts/apply-source-links.py <links.json> <output dir>
# Input: a JSON map {"<slug>#<index>": "<url>"}. Each matching plain record in evidence.recordsReviewed becomes
# { text, url }. Records already turned into objects are left alone, so the script can be re-run with more links.
# It only reads the database (one READ ONLY transaction). It writes <dir>/rehearse.sql (ends ROLLBACK) and <dir>/apply.sql
# (ends COMMIT), with the 60 s and 5 s timeouts, to run with psql. A row changed since this script read it is not touched:
# the update matches on updated_at. Then refresh the pages: node scripts/revalidate.js --tag editorial:<slug>
# DATABASE_URL comes from .env.local and is never printed.
import json, os, subprocess, sys

if len(sys.argv) != 3:
    sys.exit('usage: python3 scripts/apply-source-links.py <links.json> <output dir>')
links = json.load(open(sys.argv[1]))
out_dir = sys.argv[2]

by_slug = {}
for k, u in links.items():
    s, i = k.rsplit('#', 1)
    by_slug.setdefault(s, {})[int(i)] = u

url = None
for line in open('.env.local'):
    if line.startswith('DATABASE_URL='):
        url = line.split('=', 1)[1].strip().strip('"\'')
if not url:
    sys.exit('DATABASE_URL is not set in .env.local')


def lit(text):
    return "'" + text.replace("'", "''") + "'"


slugs = ', '.join(lit(s) for s in by_slug)
read = f"""BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
SELECT json_build_object('slug', slug, 'evidence', evidence, 'updated_at', updated_at)::text FROM public.editorials WHERE slug IN ({slugs});
ROLLBACK;
"""
r = subprocess.run(['psql', url, '-X', '-At', '-v', 'ON_ERROR_STOP=1'], input=read, capture_output=True, text=True)
if r.returncode != 0:
    sys.exit('database error (details withheld, they can contain the address); check with psql')
rows = [json.loads(l) for l in r.stdout.splitlines() if l.startswith('{')]

missing = sorted(set(by_slug) - {row['slug'] for row in rows})
changed = 0
updates = []
for row in rows:
    evidence = row['evidence'] or {}
    records = evidence.get('recordsReviewed') or []
    hits = 0
    for i, u in by_slug[row['slug']].items():
        if i < len(records) and isinstance(records[i], str):
            records[i] = {'text': records[i], 'url': u.replace("'", '%27')}
            hits += 1
    if not hits:
        continue
    changed += hits
    text = json.dumps(evidence, ensure_ascii=False)
    tag = 'evidence_json'
    while f'${tag}$' in text:
        tag += '_x'
    updates.append(f"UPDATE public.editorials SET evidence = ${tag}${text}${tag}$::jsonb, updated_at = now() WHERE slug = {lit(row['slug'])} AND updated_at = {lit(row['updated_at'])};")

os.makedirs(out_dir, exist_ok=True)
for name, end in (('rehearse.sql', 'ROLLBACK'), ('apply.sql', 'COMMIT')):
    with open(os.path.join(out_dir, name), 'w', encoding='utf8') as f:
        f.write("BEGIN READ WRITE;\nSET LOCAL statement_timeout = '60s';\nSET LOCAL lock_timeout = '5s';\n" + '\n'.join(updates) + f'\n{end};\n')
print(f'{changed} records linked in {len(updates)} pieces; no row for: {missing or "none"}; SQL in {out_dir}')
