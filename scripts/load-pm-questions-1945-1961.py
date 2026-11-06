#!/usr/bin/env python3
"""Loads Questions to the Prime Minister, 1945 to 1961 into production (owner's yes, 6 Nov 2026), following "Claude outputs/pmqs-pre1961/load-plan.md" and the owner's changes:
Mr. Boyden's question on Wednesday 2 Aug 1961 gets no period_label. People, then questions, then rows, in batches in one transaction. No check queries inside it: the
transaction goes by the row count of each COPY, and the checks run read only afterwards. Empty fields load as null. The files are not changed.

  python3 scripts/load-pm-questions-1945-1961.py --before <folder>           the checks before, read only
  python3 scripts/load-pm-questions-1945-1961.py --load <folder> <tmp>       rehearsal: ends in ROLLBACK
  python3 scripts/load-pm-questions-1945-1961.py --load <folder> <tmp> --commit
  python3 scripts/load-pm-questions-1945-1961.py --after <row counts before> the checks after, read only

The database address is never printed.
"""
import collections, csv, datetime, hashlib, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIGRATION = f'{ROOT}/scripts/migrations/2026-11-06i-pm-questions-1945-1961.sql'
PEOPLE, QUESTIONS, ROWS = 'pm_question_people_1945_1961', 'pm_questions_1945_1961', 'pm_question_exchange_rows_1945_1961'
TABLES = [PEOPLE, QUESTIONS, ROWS]
FILES = {
    'questions-1945-1961.csv': ('bf0588820e23d0fe', 4135),
    'exchanges-1945-1961.csv': ('3cf269581df72359', 26373),
    'people-1945-1961.csv': ('9b522b2797a3b0a2', 621),
}
ARCHIVE = "SELECT (SELECT count(*) FROM pmqs_archive_sessions), (SELECT count(*) FROM pmqs_archive_exchanges), (SELECT count(*) FROM pmqs_archive_people)"
ID_COLS = f"(SELECT asker_member_id m FROM {QUESTIONS} UNION ALL SELECT answerer_member_id FROM {QUESTIONS} UNION ALL SELECT member_id FROM {ROWS} UNION ALL SELECT member_id FROM {PEOPLE}) x"
EXPERIMENT = 'The 3.15 p.m. experiment'
AFTER = [
    ('questions', f'SELECT count(*) FROM {QUESTIONS}', '4135'),
    ('distinct dates', f'SELECT count(DISTINCT date) FROM {QUESTIONS}', '1246'),
    ('first and last date', f'SELECT min(date), max(date) FROM {QUESTIONS}', '1945-08-21|1961-08-03'),
    ('exchange rows', f'SELECT count(*) FROM {ROWS}', '26373'),
    ('exchanges, questions table', f'SELECT count(DISTINCT exchange_id) FROM {QUESTIONS}', '3622'),
    ('exchanges, rows table', f'SELECT count(DISTINCT exchange_id) FROM {ROWS}', '3622'),
    ('people', f'SELECT count(*) FROM {PEOPLE}', '621'),
    ('kind', f'SELECT kind, count(*) FROM {ROWS} GROUP BY 1 ORDER BY 1', 'first_answer|3622 follow_on|18123 printed_text|30 procedural|452 question|4146'),
    ('found_in', f'SELECT found_in, count(*) FROM {QUESTIONS} GROUP BY 1 ORDER BY 1', 'both|3986 Hansard API only|5 Historic Hansard only|144'),
    ('answered_by', f'SELECT answered_by, count(*) FROM {QUESTIONS} GROUP BY 1 ORDER BY 1', 'Prime Minister|3428 someone else|707'),
    ('not recorded', f"SELECT count(*) FROM {QUESTIONS} WHERE answered_by = 'not recorded'", '0'),
    ('by private notice', f"SELECT count(*) FROM {QUESTIONS} WHERE by_private_notice = 'yes'", '87'),
    ('date corrected', f"SELECT count(*) FROM {QUESTIONS} WHERE date_corrected = 'yes'", '35'),
    ('date not confirmed', f"SELECT count(*) FROM {QUESTIONS} WHERE date_status NOT LIKE 'confirmed%'", '5'),
    ('period_label filled (changed by the owner: 47 on 6 days)', f"SELECT count(*), count(DISTINCT date), min(date), max(date) FROM {QUESTIONS} WHERE period_label IS NOT NULL", '47|6|1961-07-18|1961-08-03'),
    ('period_label is only the experiment', f"SELECT count(*) FROM {QUESTIONS} WHERE period_label <> '{EXPERIMENT}'", '0'),
    ('period_label on Tuesdays and Thursdays only', f"SELECT count(*) FROM {QUESTIONS} WHERE period_label IS NOT NULL AND extract(isodow FROM date) NOT IN (2, 4)", '0'),
    ('Mr. Boyden, 2 Aug 1961, no label', f"SELECT asker_as_printed, period_label IS NULL FROM {QUESTIONS} WHERE date = '1961-08-02'", 'Mr. Boyden|t'),
    ('weekend dates', f'SELECT count(*) FROM {QUESTIONS} WHERE extract(isodow FROM date) >= 6', '0'),
    ('distinct member_id on people', f'SELECT count(DISTINCT member_id) FROM {PEOPLE}', '12'),
    ('rows with a member_id', f'SELECT count(*) FROM {ROWS} WHERE member_id IS NOT NULL', '476'),
    ('member_id 1081 in any table', f'SELECT count(*) FROM {ID_COLS} WHERE m = 1081', '0'),
    ('member_id 2565 in any table', f'SELECT count(*) FROM {ID_COLS} WHERE m = 2565', '0'),
    ('mr-winston-churchill member_id is null', f"SELECT member_id IS NULL FROM {PEOPLE} WHERE person_slug = 'mr-winston-churchill'", 't'),
    ('exchanges where row_order has a gap', f'SELECT count(*) FROM (SELECT exchange_id FROM {ROWS} GROUP BY 1 HAVING min(row_order) <> 1 OR max(row_order) <> count(*)) g', '0'),
    ('by Prime Minister: questions, days, by PM, by someone else', f"SELECT prime_minister, count(*), count(DISTINCT date), count(*) FILTER (WHERE answered_by = 'Prime Minister'), count(*) FILTER (WHERE answered_by = 'someone else') FROM {QUESTIONS} GROUP BY 1 ORDER BY 1",
     'Attlee|1175|496|956|219 Churchill|914|274|800|114 Eden|396|115|325|71 Macmillan|1650|361|1347|303'),
    ('by year', f"SELECT extract(year FROM date)::int, count(*), count(DISTINCT date) FROM {QUESTIONS} GROUP BY 1 ORDER BY 1",
     '1945|180|42 1946|213|88 1947|224|98 1948|137|74 1949|123|69 1950|172|66 1951|194|73 1952|246|87 1953|246|83 1954|249|66 1955|262|64 1956|239|75 1957|410|89 1958|363|74 1959|265|75 1960|279|65 1961|333|58'),
    ('row level security on', "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relrowsecurity AND c.relname IN (" + ','.join(f"'{t}'" for t in TABLES) + ')', '3'),
    ('public can read', "SELECT count(*) FROM unnest(ARRAY[" + ','.join(f"'public.{t}'" for t in TABLES) + "]) t, unnest(ARRAY['anon','authenticated']) r WHERE has_table_privilege(r, t, 'SELECT')", '6'),
    ('public cannot write', "SELECT count(*) FROM unnest(ARRAY[" + ','.join(f"'public.{t}'" for t in TABLES) + "]) t, unnest(ARRAY['anon','authenticated']) r, unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p WHERE has_table_privilege(r, t, p)", '0'),
]


def database_url():
    for line in open(f'{ROOT}/.env.local'):
        if line.startswith('DATABASE_URL='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('DATABASE_URL is not in .env.local')


def clean(s):
    return re.sub(r'postgres\S+', '<address>', s)


def psql(script):
    r = subprocess.run(['psql', database_url(), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], input=script, text=True, capture_output=True)
    if r.returncode:
        sys.exit(f'stopped: {clean(r.stderr)[:800]}')
    return r.stdout


def read_only(selects):
    body = ''.join(f"\\echo @@{i}\n{sql};\n" for i, sql in enumerate(selects))
    out = psql(f"BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\nSET LOCAL lock_timeout = '5s';\n{body}COMMIT;\n")
    parts = re.split(r'^@@(\d+)$', out, flags=re.M)
    return {int(parts[i]): ' '.join(parts[i + 1].split('\n')).strip() for i in range(1, len(parts), 2)}


def read_csv(folder, name):
    csv.field_size_limit(10 ** 9)
    with open(f'{folder}/{name}', newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def check_files(folder):
    ok = True
    for name, (sha, rows) in FILES.items():
        have = hashlib.sha256(open(f'{folder}/{name}', 'rb').read()).hexdigest()[:16]
        n = len(read_csv(folder, name))
        good = have == sha and n == rows
        ok = ok and good
        print(f"{'ok ' if good else 'NO '} {name}: {have}, {n} rows (expected {sha}, {rows})", flush=True)
    return ok


def before(folder):
    ok = check_files(folder)
    q, r, p = read_csv(folder, 'questions-1945-1961.csv'), read_csv(folder, 'exchanges-1945-1961.csv'), read_csv(folder, 'people-1945-1961.csv')
    dates = sorted({x['date'] for x in q})
    def line(name, have, want):
        nonlocal ok
        ok = ok and have == want
        print(f"{'ok ' if have == want else 'NO '} {name}: {have}{'' if have == want else f' (expected {want})'}", flush=True)
    line('file: rows, days, first, last', (len(q), len(dates), dates[0], dates[-1]), (4135, 1246, '1945-08-21', '1961-08-03'))
    kinds = collections.defaultdict(collections.Counter)
    for x in r:
        kinds[x['exchange_id']][x['kind']] += 1
    per = {e: sum(c.values()) for e, c in kinds.items()}
    line('file: exchanges whose rows differ from exchange_rows', sum(1 for x in q if per.get(x['exchange_id']) != int(x['exchange_rows'])), 0)
    line('file: exchanges with a question and exactly one first answer', sum(1 for c in kinds.values() if c['question'] >= 1 and c['first_answer'] == 1), 3622)
    ids = [x[c] for x, c in [(x, 'asker_member_id') for x in q] + [(x, 'answerer_member_id') for x in q] + [(x, 'member_id') for x in r] + [(x, 'member_id') for x in p]]
    line('file: 1081 or 2565 in any member id column', sum(1 for i in ids if i in ('1081', '2565')), 0)
    line('file: the one question to lose its label (2 Aug 1961)', [(x['asker_as_printed'], x['period_label']) for x in q if x['date'] == '1961-08-02'], [('Mr. Boyden', EXPERIMENT)])
    line('file: rows with empty text', sum(1 for x in r if not x['text'].strip()), 0)
    line('file: slugs not in people', sum(1 for x in r if x['person_slug'] and x['person_slug'] not in {y['person_slug'] for y in p}), 0)
    got = read_only(["SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN (" + ','.join(f"'{t}'" for t in TABLES) + ')', ARCHIVE])
    line('database: the 3 new table names in pg_tables', got[0], '0')
    print('database: pmqs_archive_sessions, exchanges, people:', got[1], flush=True)
    guard = subprocess.run(['psql', database_url(), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', f'{ROOT}/scripts/checks/rls-guard.sql'], text=True, capture_output=True)
    print('rls-guard:', clean(guard.stdout).strip() or clean(guard.stderr)[:300], flush=True)
    sys.exit(0 if ok else 1)


def batches(rows, cols, tmp, name, size):
    files = []
    for i in range(0, len(rows), size):
        files.append(f'{tmp}/{name}-{len(files):03d}.csv')
        with open(files[-1], 'w', newline='', encoding='utf-8') as out:
            w = csv.writer(out)
            for row in rows[i:i + size]:
                w.writerow([row[c] for c in cols])
    return files


def load(folder, tmp, commit):
    if not check_files(folder):
        sys.exit('the files do not match the plan')
    os.makedirs(tmp, exist_ok=True)
    p, q, r = read_csv(folder, 'people-1945-1961.csv'), read_csv(folder, 'questions-1945-1961.csv'), read_csv(folder, 'exchanges-1945-1961.csv')
    changed = [x for x in q if x['date'] == '1961-08-02' and x['asker_as_printed'] == 'Mr. Boyden' and x['period_label'] == EXPERIMENT]
    if len(changed) != 1 or sum(1 for x in q if x['date'] == '1961-08-02') != 1:
        sys.exit("expected exactly one question on 2 Aug 1961, Mr. Boyden's")
    changed[0]['period_label'] = ''
    ddl = open(MIGRATION, encoding='utf-8').read()
    if ddl.count('COMMIT;') != 1:
        sys.exit('expected one COMMIT in the migration')
    script = ddl[ddl.index('BEGIN READ WRITE;'):ddl.rindex('COMMIT;')] + '\n'
    want = {}
    for table, rows, name, size in ((PEOPLE, p, 'people', 1000), (QUESTIONS, q, 'questions', 1000), (ROWS, r, 'rows', 5000)):
        cols = list(rows[0].keys())
        want[table] = len(rows)
        files = batches(rows, cols, tmp, name, size)
        print(f'{table}: {len(rows)} rows, {len(files)} batches', flush=True)
        for i, path in enumerate(files):
            # Only an unquoted empty field is null: text keeps every line break, and csv.writer writes an empty field unquoted.
            script += f"\\echo @@COPY {table}\n\\copy public.{table} ({', '.join(cols)}) FROM '{path}' WITH (FORMAT csv, HEADER false)\n"
    script += '\\echo @@LOADED\n'
    started = time.time()
    # Not -q, so that each COPY reports its row count.
    proc = subprocess.Popen(['psql', database_url(), '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    proc.stdin.write(script)
    proc.stdin.flush()
    have, table = collections.Counter(), None
    for line in proc.stdout:
        line = line.strip()
        if line == '@@LOADED':
            break
        if line.startswith('@@COPY '):
            table = line[7:]
        elif re.fullmatch(r'COPY \d+', line) and table:
            have[table] += int(line[5:])
    else:
        sys.exit(f'stopped before the end of the load, nothing committed: {clean(proc.stderr.read())[:800]}')
    ok = dict(have) == want
    print(f'loaded in {int(time.time() - started)}s: {dict(have)}; matches the files: {ok}', flush=True)
    final = 'COMMIT;' if (commit and ok) else 'ROLLBACK;'
    proc.stdin.write(final + '\n\\echo @@DONE\n')
    proc.stdin.flush()
    for line in proc.stdout:
        if line.strip() == '@@DONE':
            break
    proc.stdin.close()
    proc.wait()
    print(f"{'COMMITTED' if final == 'COMMIT;' else 'ROLLED BACK'} at {datetime.datetime.now().strftime('%H:%M:%S')} after {int(time.time() - started)}s", flush=True)
    sys.exit(0 if ok else 1)


def after(archive_before):
    got = read_only([sql for _, sql, _ in AFTER] + [ARCHIVE])
    ok = True
    for i, (name, _, want) in enumerate(AFTER):
        match = got[i] == want
        ok = ok and match
        print(f"{'ok ' if match else 'NO '} {name}: {got[i]}{'' if match else f' (expected {want})'}", flush=True)
    match = got[len(AFTER)] == archive_before
    ok = ok and match
    print(f"{'ok ' if match else 'NO '} pmqs_archive_* row counts: {got[len(AFTER)]} (before {archive_before})", flush=True)
    anon = psql("BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\nSET LOCAL ROLE anon;\n" + ''.join(f'SELECT count(*) FROM public.{t};\n' for t in TABLES) + 'COMMIT;\n').split()
    match = anon == ['621', '4135', '26373']
    ok = ok and match
    print(f"{'ok ' if match else 'NO '} anon reads the 3 tables: {anon}", flush=True)
    guard = subprocess.run(['psql', database_url(), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', f'{ROOT}/scripts/checks/rls-guard.sql'], text=True, capture_output=True)
    print('rls-guard:', clean(guard.stdout).strip() or clean(guard.stderr)[:300], flush=True)
    print('every check matched:', ok, flush=True)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['--before']:
        before(a[1])
    elif a[:1] == ['--load']:
        load(a[1], a[2], '--commit' in a[3:])
    elif a[:1] == ['--after']:
        after(a[1])
    else:
        sys.exit(__doc__)
