#!/usr/bin/env python3
"""Loads the PMQs archive into production (owner, 5 Nov 2026): the tables in scripts/migrations/2026-11-05h-pmqs-archive.sql
and the four final CSVs, in one transaction, exchanges in batches. Empty strings load as null.

  python3 scripts/load-pmqs-archive.py <folder of the CSVs> <folder for temporary batches>            rehearsal: ends in ROLLBACK
  python3 scripts/load-pmqs-archive.py <folder of the CSVs> <folder for temporary batches> --commit   the real load
  ... --commit --test-rollback   the real load's path, but it always ends in ROLLBACK
  python3 scripts/load-pmqs-archive.py --checks                                                        checks only, read only

Runs "Checks after loading" and compares each with the expected value: inside the transaction before it ends, so a
real load that does not match rolls back, and read only with --checks. The database address is never printed.
"""
import csv, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIGRATION = f'{ROOT}/scripts/migrations/2026-11-05h-pmqs-archive.sql'
BATCH = 10_000
TABLES = "'pmqs_archive_sessions','pmqs_archive_exchanges','pmqs_archive_people','pmqs_library_totals'"
CHECKS = [
    ('sessions', "SELECT count(*) FROM pmqs_archive_sessions", '3164'),
    ('exchanges', "SELECT count(*) FROM pmqs_archive_exchanges", '157652'),
    ('people', "SELECT count(*) FROM pmqs_archive_people", '6770'),
    ('library totals', "SELECT count(*) FROM pmqs_library_totals", '11'),
    ('sessions by source', "SELECT source, count(*) FROM pmqs_archive_sessions GROUP BY 1 ORDER BY 1", 'hansard-api|5 historic-hansard|13 parlparse|3146'),
    ('display source', "SELECT display_source, count(*) FROM pmqs_archive_exchanges GROUP BY 1 ORDER BY 1", 'hansard-api|4560 ours|153092'),
    ('ours differs from parlparse', "SELECT count(*) FROM pmqs_archive_exchanges WHERE display_source = 'ours' AND contribution_text <> parlparse_text", '0'),
    ('member 769', "SELECT count(*) FROM pmqs_archive_exchanges WHERE member_id = 769", '3199'),
    ('seven old Lords ids', "SELECT count(*) FROM pmqs_archive_exchanges WHERE member_id IN (3326, 2303, 2017, 1736, 1722, 3899, 3078)", '0'),
    ('members 960, 1078, 614, 850', "SELECT member_id, count(*) FROM pmqs_archive_exchanges WHERE member_id IN (960, 1078, 614, 850) GROUP BY 1 ORDER BY 1", '614|632 850|261 960|1553 1078|414'),
    ('25 Feb 2009', "SELECT prime_minister_as_named, note IS NOT NULL AND note <> '' FROM pmqs_archive_sessions WHERE \"date\" = '2009-02-25'", 'Gordon Brown|t'),
    ('session counts agree', "SELECT count(*) FROM pmqs_archive_sessions s WHERE s.exchanges <> (SELECT count(*) FROM pmqs_archive_exchanges e WHERE e.\"date\" = s.\"date\")", '0'),
    ('empty or null text', "SELECT count(*) FROM pmqs_archive_exchanges WHERE contribution_text = '' OR parlparse_text = ''", '0'),
    ('row level security on, tables', f"SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname IN ({TABLES}) AND c.relrowsecurity", '4'),
    ('public can only read', f"SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace CROSS JOIN unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p CROSS JOIN unnest(ARRAY['anon','authenticated']) r WHERE n.nspname = 'public' AND c.relname IN ({TABLES}) AND has_table_privilege(r, c.oid, p)", '0'),
    ('public can read', f"SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace CROSS JOIN unnest(ARRAY['anon','authenticated']) r WHERE n.nspname = 'public' AND c.relname IN ({TABLES}) AND has_table_privilege(r, c.oid, 'SELECT')", '8'),
]


def database_url():
    for line in open(f'{ROOT}/.env.local'):
        if line.startswith('DATABASE_URL='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('DATABASE_URL is not in .env.local')


def psql(script):
    r = subprocess.run(['psql', database_url(), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], input=script, capture_output=True, text=True)
    return r.returncode, r.stdout, re.sub(r'postgres\S+', '<address>', r.stderr)


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
        print(f"{'ok ' if match else 'NO '} {name}: {have}{'' if match else f' (expected {want})'}")
    return ok


def checks_only():
    code, out, err = psql("BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\nSET LOCAL lock_timeout = '5s';\n" + check_sql() + "COMMIT;\n")
    if code:
        sys.exit(f'checks failed: {err[:500]}')
    return compare(out)


def batches(folder, tmp):
    csv.field_size_limit(10 ** 9)
    with open(f'{folder}/exchanges.csv', newline='', encoding='utf-8') as f:
        rows = csv.reader(f)
        head = next(rows)
        want = ['date', 'order', 'speaker_name_as_printed', 'parlparse_speaker_id', 'parliament_member_id', 'parliament_id_confidence', 'parlparse_text', 'display_text', 'display_source', 'source']
        if head != want:
            sys.exit(f'exchanges.csv columns changed: {head}')
        n, out, w, files = 0, None, None, []
        for row in rows:
            if n % BATCH == 0:
                if out:
                    out.close()
                files.append(f'{tmp}/pmqs-exchanges-{len(files):03d}.csv')
                out = open(files[-1], 'w', newline='', encoding='utf-8')
                w = csv.writer(out)
            w.writerow(row)
            n += 1
        out.close()
    return files


def main():
    if sys.argv[1:] == ['--checks']:
        sys.exit(0 if checks_only() else 1)
    folder, tmp = sys.argv[1], sys.argv[2]
    commit = '--commit' in sys.argv[3:]
    test_rollback = '--test-rollback' in sys.argv[3:]
    ddl = open(MIGRATION).read()
    body = ddl[ddl.index('CREATE TABLE'):ddl.rindex('COMMIT;')]
    files = batches(folder, tmp)
    # Empty unquoted fields are null (csv default); csv.writer leaves empty strings unquoted.
    copy = lambda table, cols, path, head: f"\\copy public.{table} ({cols}) FROM '{path}' WITH (FORMAT csv, HEADER {'true' if head else 'false'})\n"
    script = "BEGIN READ WRITE;\nSET LOCAL statement_timeout = '60s';\nSET LOCAL lock_timeout = '5s';\n" + body
    script += copy('pmqs_archive_sessions', '"date", prime_minister_as_named, exchanges, source, note', f'{folder}/sessions.csv', True)
    ex = '"date", item_order, attributed_to, parlparse_speaker_id, member_id, member_id_confidence, parlparse_text, contribution_text, display_source, source'
    for i, path in enumerate(files):
        script += copy('pmqs_archive_exchanges', ex, path, False) + f"\\echo batch {i + 1} of {len(files)}\n"
    script += copy('pmqs_archive_people', 'parlparse_speaker_id, parlparse_person_id, name, parliament_member_id, confidence, how_matched, speeches, most_common_printed_name, historic_hansard_url', f'{folder}/person-map.csv', True)
    script += copy('pmqs_library_totals', 'prime_minister, in_office_from, in_office_to, library_total, library_attended, library_missed, our_sessions, difference, note', f'{folder}/pm-library-totals.csv', True)
    script += "\\echo loaded\n" + check_sql()
    started = time.time()
    if commit:
        # The checks run in the transaction, and only a full match sends COMMIT, on the same connection.
        proc = subprocess.Popen(['psql', database_url(), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        proc.stdin.write(script + "\\echo @@END\n")
        proc.stdin.flush()
        buf = ''
        for line in proc.stdout:
            if line.strip() == '@@END':
                break
            buf += line
        ok = compare(buf[buf.index('loaded'):]) if 'loaded' in buf else False
        send_commit = ok and not test_rollback
        proc.stdin.write('COMMIT;\n\\echo @@DONE\n' if send_commit else 'ROLLBACK;\n\\echo @@DONE\n')
        proc.stdin.close()
        tail = proc.stdout.read()
        err = re.sub(r'postgres\S+', '<address>', proc.stderr.read())
        code = proc.wait()
        print(f"{'COMMITTED' if send_commit and '@@DONE' in tail and code == 0 else 'NOT COMMITTED'} in {time.time() - started:.0f} s; psql exit {code}; {err[:500]}")
        sys.exit(0 if (send_commit or test_rollback) and code == 0 else 1)
    code, out, err = psql(script + "ROLLBACK;\n")
    print(f'rehearsal: psql exit {code} in {time.time() - started:.0f} s; {err[:500]}')
    print('\n'.join(l for l in out.split('\n') if l.startswith('batch'))[-40:])
    ok = code == 0 and compare(out[out.index('loaded'):] if 'loaded' in out else '')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
