#!/usr/bin/env python3
# Names for division voters who are not in the mps table (owner, 6 Nov 2026), from Parliament's Members API, written to lib/data/former-mp-names.json.
# A static list, because reading these while a division page renders took over 60 seconds. Reads only. Run again if "Member <id>" appears on a division page.
import json, re, subprocess, time, urllib.request

url = [l.split('=', 1)[1].strip().strip('"\'') for l in open('.env.local') if l.startswith('DATABASE_URL=')][0]
sql = "SELECT DISTINCT member_id FROM mp_division_votes WHERE member_id IS NOT NULL AND member_id NOT IN (SELECT member_id FROM mps) ORDER BY 1"
out = subprocess.run(['psql', url, '-At', '-X', '-q', '-c', 'BEGIN READ ONLY', '-c', "SET LOCAL statement_timeout='60s'", '-c', sql, '-c', 'COMMIT'], capture_output=True, text=True, check=True).stdout
ids = [int(l) for l in out.split() if l.isdigit()]
names = {}
for i in range(0, len(ids), 20):
    q = '&'.join(f'ids={m}' for m in ids[i:i + 20])
    req = urllib.request.Request(f'https://members-api.parliament.uk/api/Members/History?{q}', headers={'User-Agent': 'OpenGovt/1.0 (+https://www.opengovt.uk)'})
    for row in json.load(urllib.request.urlopen(req, timeout=120)):
        v = row.get('value') or {}
        hist = v.get('nameHistory') or []
        cur = next((n for n in hist if not n.get('endDate')), hist[-1] if hist else None)
        if cur and cur.get('nameDisplayAs'):
            names[str(v['id'])] = re.sub(r'^(?:Mr|Mrs|Miss|Ms) ', '', cur['nameDisplayAs'])
    time.sleep(1)
json.dump(names, open('lib/data/former-mp-names.json', 'w'), ensure_ascii=False, indent=0, sort_keys=True)
print(len(ids), 'voters not in mps;', len(names), 'named;', 'missing', [m for m in ids if str(m) not in names][:20])
