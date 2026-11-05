#!/usr/bin/env python3
"""Writes lib/data/pmqs-archive-answerers.json (owner, 5 Nov 2026): who answered each session in the PMQs archive, by member
id, so labels never show a printed name with its OCR slips ("Mr. Jamea Callaghan"). Read only. The archive does not change,
so this is run once and the file committed. The answerer is whoever has most rows printed as "The Prime Minister" or
"The Deputy Prime Minister" that day, else the speaker printed as the session's named answerer. The name comes from
pmqs_archive_people, by member id, or by speaker id for the few with no member id.
"""
import collections, json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
url = [l.split('=', 1)[1].strip().strip('"\'') for l in open(f'{ROOT}/.env.local') if l.startswith('DATABASE_URL=')][0]
# Names the person map holds in full, as they are known.
KNOWN_AS = {'John Leslie Prescott': 'John Prescott', 'William Jefferson Hague': 'William Hague', 'Michael Maitland Stewart': 'Michael Stewart'}


def q(sql):
    r = subprocess.run(['psql', url, '-At', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', 'begin read only', '-c', "set local statement_timeout='60s'", '-c', sql, '-c', 'commit'], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(re.sub(r'postgres\S+', '<address>', r.stderr)[:300])
    return json.loads(r.stdout.strip())


sessions = q("select json_agg(json_build_object('d',date,'n',prime_minister_as_named)) from pmqs_archive_sessions")
rows = q("select json_agg(x) from (select date d, attributed_to a, member_id m, parlparse_speaker_id s from pmqs_archive_exchanges where attributed_to is not null and attributed_to !~* 'speaker') x")
people = q("select json_agg(x) from (select parlparse_speaker_id s, name, parliament_member_id m from pmqs_archive_people) x")
by_speaker = {p['s']: p for p in people}
by_member = {}
for p in people:
    if p['m'] and p['name']:
        by_member.setdefault(p['m'], collections.Counter())[p['name']] += 1
by_day = collections.defaultdict(list)
for r in rows:
    by_day[r['d']].append(r)

names, out = {}, {}
for s in sessions:
    day = by_day[s['d']]
    pm = [r for r in day if re.match(r'(the )?(deputy )?prime minister\b', r['a'], re.I)]
    pool = pm or [r for r in day if s['n'] and r['a'].strip() == s['n'].strip()] or day
    (m, sp), _ = collections.Counter((r['m'], r['s']) for r in pool if r['m'] or r['s']).most_common(1)[0]
    name = by_member[m].most_common(1)[0][0] if m in by_member else (by_speaker.get(sp) or {}).get('name')
    if not name:
        raise SystemExit(f"{s['d']}: no name for the answerer")
    key = str(m) if m else sp
    names[key] = KNOWN_AS.get(name, name)
    out[s['d']] = key
with open(f'{ROOT}/lib/data/pmqs-archive-answerers.json', 'w') as f:
    json.dump({'names': names, 'sessions': dict(sorted(out.items()))}, f, ensure_ascii=False, indent=0)
print(len(out), 'sessions,', len(names), 'people,', sum(1 for v in out.values() if not v.isdigit()), 'with no member id')
