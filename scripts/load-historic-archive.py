#!/usr/bin/env python3
"""Loads Commons votes 2004 to 2016 and the historic register into production (owner, 6 Nov 2026), following
"Claude outputs/twfy-inventory/load/load-plan.md": scripts/migrations/2026-11-06h-historic-votes-register.sql and the plan's files, in batches of
50,000 rows in one transaction, with every check from the plan run inside it. A load that does not match rolls back. Empty fields load as null.

  python3 scripts/load-historic-archive.py <load folder> <folder for temporary batches>            rehearsal: ends in ROLLBACK
  python3 scripts/load-historic-archive.py <load folder> <folder for temporary batches> --commit   the real load: COMMIT only if every check matches
  python3 scripts/load-historic-archive.py --checks                                                 the checks only, read only

The database address is never printed.
"""
import csv, gzip, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIGRATION = f'{ROOT}/scripts/migrations/2026-11-06h-historic-votes-register.sql'
BATCH = 50_000
TABLES = ['historic_commons_divisions', 'historic_commons_votes', 'register_archive_editions', 'register_archive_entries', 'register_archive_entry_editions']
LORDS = '(4160, 4148, 4150, 4158, 4151, 4162, 4154, 3748, 4211, 4149, 3786)'
CHECKS = [
    ('divisions', "SELECT count(*), min(division_date), max(division_date) FROM historic_commons_divisions", '2908|2004-10-11|2016-03-08'),
    ('count check', "SELECT count_check, count(*) FROM historic_commons_divisions GROUP BY 1 ORDER BY 1", 'differs|347 headline 0 to 0|50 headline negative|1 same|2510'),
    ('count shown', "SELECT count_shown, count(*) FROM historic_commons_divisions GROUP BY 1 ORDER BY 1", 'named list|76 official headline|2832'),
    ('votes', "SELECT count(*) FROM historic_commons_votes", '1299487'),
    ('side and teller', "SELECT side, is_teller, count(*) FROM historic_commons_votes GROUP BY 1, 2 ORDER BY 1, 2", 'aye|f|631106 aye|t|5538 no|f|657305 no|t|5538'),
    ('votes with no member', "SELECT count(*) FROM historic_commons_votes WHERE member_id IS NULL", '8'),
    ('side changed', "SELECT count(*) FROM historic_commons_votes WHERE side <> side_as_published", '0'),
    ('count notes', "SELECT count(*) FROM historic_commons_divisions WHERE count_note IS NOT NULL", '25'),
    ('notes show the named count', "SELECT count(*) FROM historic_commons_divisions WHERE count_note IS NOT NULL AND (ayes_shown <> ayes_named OR noes_shown <> noes_named)", '0'),
    ('inconsistent record note', "SELECT count(*) FROM historic_commons_divisions WHERE count_note LIKE '%printed record is inconsistent%'", '1'),
    ('profile links, votes', "SELECT count(DISTINCT profile_link_id), count(*) FILTER (WHERE profile_link_id IS NOT NULL) FROM historic_commons_votes", '12|8830'),
    ('members voting', "SELECT count(DISTINCT member_id) FROM historic_commons_votes", '1206'),
    ('Lords records moved', f"SELECT count(*) FROM historic_commons_votes WHERE member_id IN {LORDS}", '0'),
    ('Jim Knight moved', "SELECT count(*) FROM historic_commons_votes WHERE hansard_member_id = 4160 AND member_id = 1450", '1168'),
    ('Angela E. Smith', "SELECT count(*) FROM historic_commons_votes WHERE id_method LIKE '%Angela E. Smith%' AND member_id <> 30", '0'),
    ('no person-map in votes', "SELECT count(*) FROM historic_commons_votes WHERE id_method LIKE '%person-map%'", '0'),
    ('live votes untouched', "SELECT count(*) FROM mp_division_votes WHERE division_date_only < '2016-03-09'", '0'),
    ('editions', "SELECT count(*), min(edition_date), max(edition_date) FROM register_archive_editions", '362|2000-11-10|2024-03-04'),
    ('25 Mar 2008 edition', "SELECT count(*) FROM register_archive_editions WHERE edition_date = '2008-03-25'", '0'),
    ('entries', "SELECT count(*) FROM register_archive_entries", '112929'),
    ('empty entries', "SELECT count(*) FROM register_archive_entries WHERE btrim(text) = ''", '0'),
    ('people and member ids', "SELECT count(DISTINCT person_id), count(DISTINCT member_id) FROM register_archive_entries", '1585|1563'),
    ('people with no id', "SELECT count(DISTINCT person_id) FROM register_archive_entries WHERE member_id IS NULL", '22'),
    ('profile links, register', "SELECT count(*) FROM register_archive_entries WHERE profile_link_id IS NOT NULL", '468'),
    ('edition rows', "SELECT count(*) FROM register_archive_entry_editions", '2081548'),
    ('rows with no entry', "SELECT count(*) FROM register_archive_entry_editions o LEFT JOIN register_archive_entries e USING (entry_id) WHERE e.entry_id IS NULL", '0'),
    ('25 Mar 2008 rows', "SELECT count(*) FROM register_archive_entry_editions WHERE edition_date = '2008-03-25'", '0'),
    ('published order has no gaps', "SELECT count(*) FROM (SELECT edition_date, member_person_id FROM register_archive_entry_editions GROUP BY 1, 2 HAVING max(block_order) <> count(*)) x", '0'),
    ('row level security on', "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relrowsecurity AND c.relname IN (" + ','.join(f"'{t}'" for t in TABLES) + ")", '5'),
    ('public can only read', "SELECT count(*) FROM unnest(ARRAY[" + ','.join(f"'public.{t}'" for t in TABLES) + "]) t, unnest(ARRAY['anon','authenticated']) r, unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p WHERE has_table_privilege(r, t, p)", '0'),
    ('public can read', "SELECT count(*) FROM unnest(ARRAY[" + ','.join(f"'public.{t}'" for t in TABLES) + "]) t, unnest(ARRAY['anon','authenticated']) r WHERE has_table_privilege(r, t, 'SELECT')", '10'),
]
DIVISION_COLS = 'external_id,hansard_division_id,division_date,division_time,division_number,title,debate_section_ext_id,ayes_official,noes_official,ayes_named,noes_named,aye_tellers,noe_tellers,ayes_shown,noes_shown,count_shown,count_note,count_check,votes_no_id,same_member_twice_same_side,evel_type,evel_ayes,evel_noes,text_before,text_after'.split(',')
VOTE_COLS = 'division_external_id,division_date,division_number,side,side_as_published,is_teller,list_as,party_as_listed,hansard_member_id,member_id,profile_link_id,id_method,id_flag'.split(',')
EDITION_COLS = 'edition_date,twfy_file,first_page_url_as_recorded,file_bytes,members,members_with_id,members_without_id,item_rows,heading_rows,categories,repeated_identical_member_blocks_dropped'.split(',')
ENTRY_COLS = 'entry_id,person_id,member_id,profile_link_id,id_source,id_confidence,member_name,category_type,category_name,subcategory,row_kind,text,first_edition,last_edition,editions_count'.split(',')
ROW_COLS = 'edition_date,member_person_id,member_order,block_order,record_no,entry_id'.split(',')


def database_url():
    for line in open(f'{ROOT}/.env.local'):
        if line.startswith('DATABASE_URL='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('DATABASE_URL is not in .env.local')


def clean(s):
    return re.sub(r'postgres\S+', '<address>', s)


def check_sql():
    return ''.join(f"\\echo @@{i}\n{sql};\n" for i, (_, sql, _) in enumerate(CHECKS))


def compare(out):
    ok = True
    parts = re.split(r'^@@(\d+)$', out, flags=re.M)
    got = {int(parts[i]): ' '.join(parts[i + 1].split()) for i in range(1, len(parts), 2)}
    for i, (name, _, want) in enumerate(CHECKS):
        have = got.get(i, '(no result)')
        match = have == want
        ok = ok and match
        print(f"{'ok ' if match else 'NO '} {name}: {have}{'' if match else f' (expected {want})'}", flush=True)
    return ok


def split(path, cols, tmp, name, op=open):
    """Writes the wanted columns, in batches. Refuses a file that lacks a column."""
    csv.field_size_limit(10 ** 9)
    files, out, w, n = [], None, None, 0
    with op(path, 'rt', newline='', encoding='utf-8') as f:
        r = csv.DictReader(f)
        missing = [c for c in cols if c not in r.fieldnames]
        if missing:
            sys.exit(f'{path}: no column {missing}')
        for row in r:
            if n % BATCH == 0:
                if out:
                    out.close()
                files.append(f'{tmp}/{name}-{len(files):03d}.csv')
                out = open(files[-1], 'w', newline='', encoding='utf-8')
                w = csv.writer(out)
            w.writerow([row[c] for c in cols])
            n += 1
    out.close()
    return files, n


def main():
    if sys.argv[1:] == ['--checks']:
        r = subprocess.run(['psql', database_url(), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], input="BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\nSET LOCAL lock_timeout = '5s';\n" + check_sql() + "COMMIT;\n", capture_output=True, text=True)
        if r.returncode:
            sys.exit(f'checks failed: {clean(r.stderr)[:600]}')
        sys.exit(0 if compare(r.stdout) else 1)
    folder, tmp = sys.argv[1], sys.argv[2]
    commit = '--commit' in sys.argv[3:]
    os.makedirs(tmp, exist_ok=True)
    ddl = open(MIGRATION, encoding='utf-8').read()
    if ddl.count('COMMIT;') != 1:
        sys.exit('expected one COMMIT in the migration')
    body = ddl[ddl.index('BEGIN READ WRITE;'):ddl.rindex('COMMIT;')]
    script = body + "\n"
    total = 0
    for table, file, cols, name, op in (
        ('historic_commons_divisions', 'divisions-2004-2016.csv', DIVISION_COLS, 'div', open),
        ('historic_commons_votes', 'votes-2004-2016.csv', VOTE_COLS, 'votes', open),
        ('register_archive_editions', 'register-editions.csv', EDITION_COLS, 'ed', open),
        ('register_archive_entries', 'register-entries.csv', ENTRY_COLS, 'entries', open),
        ('register_archive_entry_editions', 'register-entry-editions.csv.gz', ROW_COLS, 'rows', gzip.open),
    ):
        files, n = split(f'{folder}/{file}', cols, tmp, name, op)
        total += n
        print(f'{table}: {n} rows, {len(files)} batches', flush=True)
        for i, path in enumerate(files):
            # One division has no title in Hansard (18 Jul 2007, no. 190): it loads as a blank, as published, not null. The plan's null list leaves title out.
            keep = ", FORCE_NOT_NULL (title)" if table == 'historic_commons_divisions' else ''
            script += f"\\copy public.{table} ({', '.join(cols)}) FROM '{path}' WITH (FORMAT csv, HEADER false{keep})\n\\echo {table} batch {i + 1} of {len(files)}\n"
    script += "\\echo LOADED\n" + check_sql() + "\\echo @@END\n"
    started = time.time()
    proc = subprocess.Popen(['psql', database_url(), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    proc.stdin.write(script)
    proc.stdin.flush()
    lines = []
    for line in proc.stdout:
        line = line.rstrip('\n')
        if line == '@@END':
            break
        lines.append(line)
        if ' batch ' in line and (line.endswith(' of 1') or re.search(r' batch \d*0 of ', line)):
            print(f'{int(time.time() - started)}s {line}', flush=True)
    else:
        sys.exit(f'stopped before the checks: {clean(chr(10).join(lines[-4:]))[:800]}')
    out = '\n'.join(lines)
    print(f'loaded and checked in {int(time.time() - started)}s', flush=True)
    ok = compare(out[out.index('LOADED'):])
    final = 'COMMIT;' if (commit and ok) else 'ROLLBACK;'
    size = "SELECT pg_size_pretty(sum(pg_total_relation_size(c.oid))) FROM pg_class c WHERE c.relname IN (" + ','.join(f"'{t}'" for t in TABLES) + ");\n"
    each = ''.join(f"SELECT '{t}', pg_size_pretty(pg_total_relation_size('public.{t}'));\n" for t in TABLES)
    proc.stdin.write(size + each + final + "\n\\echo @@DONE\n")
    proc.stdin.flush()
    for line in proc.stdout:
        line = line.rstrip('\n')
        if line == '@@DONE':
            break
        print('size:', line, flush=True)
    proc.stdin.close()
    proc.wait()
    print(f"{'COMMITTED' if final == 'COMMIT;' else 'ROLLED BACK'} after {int(time.time() - started)}s; every check matched: {ok}", flush=True)
    sys.exit(0 if ok else 1)


main()
