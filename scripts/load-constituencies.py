#!/usr/bin/env python3
"""Loads the constituency tables into production (owner, 6 Nov 2026): scripts/migrations/2026-11-06c-constituencies.sql and the
CSVs in "Claude outputs/constituencies/", in one transaction. Empty strings load as null.

  python3 scripts/load-constituencies.py <folder of the CSVs> <folder for temporary files>            rehearsal: ends in ROLLBACK
  python3 scripts/load-constituencies.py <folder of the CSVs> <folder for temporary files> --commit   the real load

Runs the checks below inside the transaction, so a real load that does not match rolls back. The address is never printed.
"""
import csv, json, os, re, subprocess, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIGRATION = f'{ROOT}/scripts/migrations/2026-11-06c-constituencies.sql'
CHECKS = [
    ('seats', "SELECT count(*) FROM constituencies", '650'),
    ('nations', "SELECT nation, count(*) FROM constituencies GROUP BY 1 ORDER BY 1", 'England|543 Northern Ireland|18 Scotland|57 Wales|32'),
    ('candidates 2024', "SELECT count(*) FROM constituency_election_results WHERE election_kind = 'general'", '4515'),
    ('candidates at byelections', "SELECT count(*) FROM constituency_election_results WHERE election_kind = 'byelection'", '101'),
    ('byelections', "SELECT count(*) FROM constituency_byelections", '7'),
    ('MP terms', "SELECT count(*) FROM constituency_mp_terms", '657'),
    ('UK electorate', "SELECT sum(electorate) FROM constituencies", '48224212'),
    ('UK valid votes', "SELECT sum(valid_votes) FROM constituencies", '28809340'),
    ('UK invalid votes', "SELECT sum(invalid_votes) FROM constituencies", '116253'),
    ('candidate votes = valid votes, 2024', "SELECT count(*) FROM constituencies c WHERE c.valid_votes <> (SELECT sum(votes) FROM constituency_election_results r WHERE r.ons_code = c.ons_code AND r.election_kind = 'general')", '0'),
    ('candidate votes = valid votes, byelections', "SELECT count(*) FROM constituency_byelections b WHERE b.valid_votes <> (SELECT sum(votes) FROM constituency_election_results r WHERE r.election_id = b.election_id)", '0'),
    ('Arbroath majority', "SELECT majority, majority_official_page FROM constituency_byelections WHERE election_id = 4554", '5278|5178'),
    ('Farage terms', "SELECT start_date, end_date FROM constituency_mp_terms WHERE member_id = 5091 ORDER BY 1", '2024-07-04|2026-07-08 2026-08-13|'),
    ('seats with one current term', "SELECT count(*) FROM (SELECT ons_code FROM constituency_mp_terms WHERE end_date IS NULL GROUP BY 1 HAVING count(*) = 1) t", '650'),
    ('current term = current MP', "SELECT count(*) FROM constituency_mp_terms t JOIN mps m ON m.member_id = t.member_id AND m.current_member AND m.constituency_gss_code = t.ons_code WHERE t.end_date IS NULL", '650'),
    ('council pages exist', "SELECT count(*) FROM constituencies c, jsonb_array_elements(c.councils) e WHERE NOT EXISTS (SELECT 1 FROM councils k WHERE k.slug = e->>'slug')", '0'),
    ('every seat has a council', "SELECT count(*) FROM constituencies WHERE jsonb_array_length(councils) = 0", '0'),
    ('row level security on', "SELECT count(*) FROM pg_class WHERE relname IN ('constituencies','constituency_byelections','constituency_election_results','constituency_mp_terms') AND relrowsecurity", '4'),
]


def database_url():
    for line in open(f'{ROOT}/.env.local'):
        if line.startswith('DATABASE_URL='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('DATABASE_URL is not in .env.local')


def slug(name):
    plain = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower().replace('&', 'and')
    return re.sub(r'[^a-z0-9]+', '-', plain).strip('-')


def read(path):
    return list(csv.DictReader(open(path, encoding='utf8', newline='')))


def write(path, cols, rows):
    with open(path, 'w', encoding='utf8', newline='') as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(rows)


def split(v):
    return [x.strip() for x in (v or '').split(';') if x.strip()]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    commit = '--commit' in sys.argv
    src, tmp = args[0], args[1]
    results, byes, links, terms = read(f'{src}/results-2024.csv'), read(f'{src}/byelections.csv'), read(f'{src}/seat-links.csv'), read(f'{src}/mp-terms.csv')
    eid = lambda u: int(u.rstrip('/').rsplit('/', 1)[1])
    first = {}
    for r in results:
        first.setdefault(r['ons_code'], r)
    pid = {t['ons_code']: t['parliament_constituency_id'] for t in terms}
    seats = []
    for l in links:
        r = first[l['ons_code']]
        codes, names, slugs = split(l['council_codes']), split(l['council_names']), split(l['council_slugs'])
        if not len(codes) == len(names) == len(slugs):
            sys.exit(f"council lists differ in length for {l['constituency']}")
        councils = [{'code': c, 'name': n, 'slug': s} for c, n, s in zip(codes, names, slugs)]
        county = {'code': l['county_code'], 'name': l['county_name'], 'slug': l['county_slug']} if l['county_slug'] else ''
        seats.append([l['ons_code'], slug(l['constituency']), l['constituency'], l['nation'], l['region'], pid[l['ons_code']], r['electorate'], r['valid_votes'], r['invalid_votes'], r['turnout_pct'], r['majority'], r['majority_pct'], r['result_summary'], r['election_url'], json.dumps(councils, ensure_ascii=False), json.dumps(county, ensure_ascii=False) if county else ''])
    if len({s[1] for s in seats}) != 650:
        sys.exit('slugs are not unique')
    write(f'{tmp}/seats.csv', 'ons_code,slug,name,nation,region,parliament_id,electorate,valid_votes,invalid_votes,turnout_pct,majority,majority_pct,result_summary,result_url,councils,county'.split(','), seats)
    done, rows = {}, []
    for b in byes:
        done.setdefault(eid(b['election_url']), [eid(b['election_url']), b['ons_code'], b['election_date'], b['writ_issued'], b['electorate'], b['valid_votes'], b['invalid_votes'], b['turnout_pct'], b['majority_from_votes'], b['majority_official_page'], b['result_summary'], b['election_url']])
    write(f'{tmp}/byelections.csv', 'election_id,ons_code,election_date,writ_issued,electorate,valid_votes,invalid_votes,turnout_pct,majority,majority_official_page,result_summary,url'.split(','), done.values())
    for kind, src_rows in (('general', results), ('byelection', byes)):
        for r in src_rows:
            rows.append([eid(r['election_url']), r['position'], r['ons_code'], kind, r['election_date'], r['given_name'], r['family_name'], r['member_id'], r['party'], r['party_abbreviation'], r['adjunct_party'], r['votes'], r['share_pct'], r['share_official'], r['share_change_official'], r['is_sitting_mp'], r['is_former_mp']])
    write(f'{tmp}/results.csv', 'election_id,position,ons_code,election_kind,election_date,given_name,family_name,member_id,party,party_abbreviation,adjunct_party,votes,share_pct,share_official,share_change_official,is_sitting_mp,is_former_mp'.split(','), rows)
    write(f'{tmp}/terms.csv', 'ons_code,member_id,name,start_date,end_date,end_reason,end_reason_notes,source'.split(','), [[t['ons_code'], t['member_id'], t['name'], t['start_date'], t['end_date'], t['end_reason'], t['end_reason_notes'], t['source']] for t in terms])

    sql = open(MIGRATION, encoding='utf8').read()
    if sql.count('COMMIT;') != 1:
        sys.exit('expected one COMMIT in the migration')
    script = sql.replace('COMMIT;', '') + '\n'
    for table, name in (('constituencies', 'seats'), ('constituency_byelections', 'byelections'), ('constituency_election_results', 'results'), ('constituency_mp_terms', 'terms')):
        cols = open(f'{tmp}/{name}.csv', encoding='utf8').readline().strip()
        script += f"\\copy public.{table} ({cols}) FROM '{tmp}/{name}.csv' WITH (FORMAT csv, HEADER true, NULL '')\n"
    script += "SELECT '---checks';\n"
    for label, q, _ in CHECKS:
        script += f"SELECT '>>{label}';\n{q};\n"
    script += "\\if :commit_it\nSELECT '---commit';\nCOMMIT;\n\\else\nROLLBACK;\n\\endif\n"
    # Checks print first; the file decides commit only after they are compared, so run them with ROLLBACK first when committing.
    def run(do_commit, final=''):
        r = subprocess.run(['psql', database_url(), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-v', f'commit_it={"true" if do_commit else "false"}', '-f', '-'], input=script, capture_output=True, text=True)
        return r.returncode, r.stdout, re.sub(r'postgres\S+', '<address>', r.stderr)
    code, out, err = run(False)
    if code:
        sys.exit(f'rehearsal failed: {err[:600]}')
    got, label = {}, None
    for line in out.split('---checks', 1)[1].splitlines():
        if line.startswith('>>'):
            label = line[2:]; got[label] = []
        elif label and line:
            got[label].append(line)
    bad = 0
    for label, _, want in CHECKS:
        have = ' '.join(got.get(label, []))
        ok = have == want
        bad += not ok
        print(f"{'ok  ' if ok else 'FAIL'} {label}: {have}" + ('' if ok else f' (expected {want})'))
    if bad:
        sys.exit(f'{bad} checks failed: nothing kept')
    print('rehearsal ended in ROLLBACK')
    if commit:
        code, out, err = run(True)
        if code or '---commit' not in out:
            sys.exit(f'load failed: {err[:600]}')
        print('committed')


main()
