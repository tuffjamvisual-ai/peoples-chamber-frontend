# Builds one batch: CSV (one row per candidate), checks file, council map for the importer,
# and the party names not yet in party-names.csv.  Usage: build.py <batch-name> <slug> [<slug> ...]
# Run it from the batch working folder (it reads and writes paths relative to the current folder);
# see scripts/council-results/README.md.
import sys,json,csv,re,os
batch=sys.argv[1]; slugs=sys.argv[2:]
nz=lambda x:re.sub(r'[^a-z]','',x.lower().replace('&','and').replace(' st ','saint'))
C={c['slug']:c for c in json.load(open(os.environ.get('CONTESTS','contests-ordered.json')))}  # CONTESTS: other years' contest files
# COUNCILS_CSV: an export of the councils table (slug, gss_code, ...); default as in the original batch folders.
OUR={r['slug']:r for r in csv.DictReader(open(os.environ.get('COUNCILS_CSV','../councilres/councils.csv')))}
EXTRA=json.load(open('extra-councils.json')) if os.path.exists('extra-councils.json') else {}
P={r['published_name']:r for r in csv.DictReader(open('party-names.csv'))} if os.path.exists('party-names.csv') else {}
# MAIN_DATE: the main polling date of the batch (default 7 May 2026); older years set it (e.g. MAIN_DATE=2025-05-01).
MAIN=os.environ.get('MAIN_DATE','2026-05-07')
rows=[]; out=[]; fails=[]; info=[]; notes=[]; changes=[]; cmap={}; unmapped={}; summary=[]
# John's decision 6 (18 Oct 2026): where the council's page does not mark the winners, mark the top N by votes
# (N = seats) as elected, unless there is a tie at the cut-off. Only for the contests he named, and never for an STV
# council (John, 18 Oct 2026: STV winners come only from a source that marks them).
MARK_TOP={'north-tyneside':None,'waltham-forest':{'Hale End and Highams Park South'},'essex@2026-06-18':None}
# John's decision 7: published turnout more than 1 point from the council's own ballot figures loads as null.
fail=lambda c,w,why:fails.append(f'{c} | {w} | {why}')
for key in slugs:
    slug,_,date=key.partition('@'); date=date or MAIN
    c=C[slug]; name=c['common']
    st=json.load(open(f'status/{key}.json')) if os.path.exists(f'status/{key}.json') else {'status':'not run'}
    W=json.load(open(f'parsed/{key}.json')) if os.path.exists(f'parsed/{key}.json') and st['status']!='manual' else []  # manual: held back
    # On 7 May the cancelled (postponed) wards are left out; for a later date only those wards count.
    dc=json.load(open(f'dc/{slug}.json')); D={nz(d['ward']):d for d in dc['wards'] if (d['date']==date if 'date' in d else d['cancelled']==(date!=MAIN))}  # dc files for older years give each ward's polling date
    gss=(OUR.get(c['our_slug']) or {}).get('gss_code') if c.get('our_slug') else EXTRA.get(slug,{}).get('gss_code')
    m=cmap.setdefault(name,dict(gss_code=gss,wards_by_date={},source_note=f"{name} council election results, from {st.get('start_url','')}"))
    m['wards_by_date'][date]=len(D)
    if date!=MAIN: name_d=f'{name} (postponed poll, {date})'
    else: name_d=name
    summary.append((name_d,len(W),len(D),st['status'],st.get('why','')))
    out.append(f"== {name_d}: {len(W)} wards collected; Democracy Club lists {len(D)} wards, {sum(d['seats'] for d in D.values())} seats; status {st['status']}{' ('+st['why']+')' if st.get('why') else ''}")
    for p in st.get('problems',[]): notes.append(f'{name_d} | {p}')
    if not W: continue
    if len(W)!=len(D): fail(name_d,'(council)',f'check 4: {len(W)} wards collected, Democracy Club lists {len(D)}')
    got={nz(w.get('dc_ward') or w['ward']) for w in W}
    for k,d in D.items():
        if k not in got: fail(name_d,d['ward'],'check 4: on the Democracy Club list but not collected')
    for w in W:
        d=D.get(nz(w.get('dc_ward') or w['ward']))
        if not d: fail(name_d,w['ward'],'check 4: ward name not on the Democracy Club list')
        if w['seats'] is None and d: w['seats']=d['seats']; w['seats_from_dc']=True
        if d and w.get('under_contested') and w['seats']+(w.get('seats_unfilled') or 0)==d['seats']:
            notes.append(f"{name_d} | {w['ward']} | under-contested: {w['seats']} returned unopposed of {d['seats']} seats; {w.get('seats_unfilled')} left unfilled")
        elif d and w['seats']!=d['seats']: fail(name_d,w['ward'],f"seats on the council page ({w['seats']}) differ from Democracy Club ({d['seats']})")
        cs=w['candidates']
        unc=all(x['votes'] is None for x in cs)   # uncontested (returned unopposed): no poll, no votes
        if unc: notes.append(f"{name_d} | {w['ward']} | uncontested: {len(cs)} candidates for {w['seats']} seats, no votes")
        if key in MARK_TOP and not c.get('stv') and (MARK_TOP[key] is None or w['ward'] in MARK_TOP[key]) and sum(1 for x in cs if x['elected'])!=w['seats']:
            o=sorted(cs,key=lambda x:-x['votes']); n=w['seats']
            if len(o)>n and o[n-1]['votes']==o[n]['votes']:
                changes.append(f"{name_d} | {w['ward']} | winners not marked on the page and tied at the cut-off ({o[n-1]['candidate']} and {o[n]['candidate']}, {o[n]['votes']}): left for John")
            else:
                was=[x['candidate'] for x in cs if x['elected']]
                for x in cs: x['elected']=x in o[:n]
                changes.append(f"{name_d} | {w['ward']} | winners not marked on the page{' (only '+', '.join(was)+' marked)' if was else ''}; marked elected as the top {n} by votes: "+'; '.join(f"{x['candidate']} ({x['votes']})" for x in o[:n])+(f"; next {o[n]['candidate']} ({o[n]['votes']})" if len(o)>n else ''))
        el=[x for x in cs if x['elected']]; un=[x for x in cs if not x['elected']]
        if any(x['elected'] is None for x in cs): fail(name_d,w['ward'],'page does not mark who was elected')
        if len(el)!=w['seats']: fail(name_d,w['ward'],f"check 1: {len(el)} elected, {w['seats']} seats")
        # Single transferable vote (Scotland, Northern Ireland): votes are first preferences, so check 2 does not apply.
        if not unc and not c.get('stv') and el and un and min(x['votes'] for x in el)<=max(x['votes'] for x in un):
            a=min(el,key=lambda x:x['votes']); b=max(un,key=lambda x:x['votes'])
            fail(name_d,w['ward'],f"check 2: elected {a['candidate']} ({a['votes']}) not above unelected {b['candidate']} ({b['votes']})")
        t=w['turnout_pct']; e=w['electorate']; v=sum(x['votes'] or 0 for x in cs); r=w['ballots_rejected']; note=''
        if t is not None and e:
            if w.get('ballots_issued'): own=100*w['ballots_issued']/e; how=f"ballots issued {w['ballots_issued']:,} / electorate {e:,} = {own:.2f}%"
            elif w['seats']==1: own=100*(v+(r or 0))/e; how=f"votes {v:,} + rejected {r if r is not None else 'not published'} = {own:.2f}% of electorate {e:,}"
            else:
                lo,hi=100*v/w['seats']/e,100*(v+(r or 0))/e; own=min(max(t,lo),hi)
                how=f"the votes need between {lo:.2f}% and {hi:.2f}% of electorate {e:,} ({v:,} votes for {w['seats']} seats, rejected {r if r is not None else 'not published'})"
            if abs(own-t)>1:
                changes.append(f"{name_d} | {w['ward']} | turnout not shown: published {t}%, but {how}"); w['turnout_pct']=t=None
        if t is None: info.append(f'{name_d} | {w["ward"]} | no turnout published')
        elif not 10<=t<=80: fail(name_d,w['ward'],f'check 3: turnout {t}% outside 10% to 80%')
        if t is not None and e:
            if w.get('ballots_issued'):
                calc=100*w['ballots_issued']/e; note=f'ballots issued {w["ballots_issued"]} / electorate {e} = {calc:.2f}%'
                if abs(calc-t)>1: fail(name_d,w['ward'],f'check 3: {note}, page says {t}%')
                elif abs(calc-t)>0.02: info.append(f'{name_d} | {w["ward"]} | {note}; page {t}% (gap {calc-t:+.2f} points)')
            elif w['seats']==1:
                calc=100*(v+(r or 0))/e; note=f'votes {v} + rejected {r} = {calc:.2f}% of electorate'
                if abs(calc-t)>1: fail(name_d,w['ward'],f'check 3: {note}, page says {t}% (gap {calc-t:+.2f} points)')
                elif abs(calc-t)>0.02: info.append(f'{name_d} | {w["ward"]} | {note}; page {t}% (gap {calc-t:+.2f} points)')
            else:
                T=e*t/100; note=f'electorate x turnout = {T:.0f} ballots; votes allow {v/w["seats"]:.0f} to {v+(r or 0)}'
                if not (v/w['seats']-1<=T<=v+(r or 0)+1): info.append(f'{name_d} | {w["ward"]} | within 1 point but outside the range: {note}')
        elif e is None: info.append(f'{name_d} | {w["ward"]} | no electorate published')
        if r is None: info.append(f'{name_d} | {w["ward"]} | no rejected ballots figure published')
        out.append(f"  {w['ward']}: seats {w['seats']}{' (from Democracy Club)' if w.get('seats_from_dc') else ''}, {len(cs)} candidates, {len(el)} elected, turnout {t}%, electorate {e}, rejected {r}. {note}")
        for x in cs:
            if x['party'] and x['party'] not in P: unmapped.setdefault(x['party'],[]).append(name)
            code=(d or {}).get('gss') or ''
            rows.append(dict(election_date=date,council=name,ward_code=code.replace('gss:',''),ward_code_source='gss' if code.startswith('gss:') else ('democracy-club' if code else ''),ward=w['ward'],seats=w['seats'],seats_offered=(d['seats'] if d else w['seats']),
                candidate=x['candidate'],party=x['party'],votes='' if x['votes'] is None else x['votes'],elected='yes' if x['elected'] else 'no',
                electorate='' if e is None else e,turnout_pct='' if t is None else t,ballots_rejected='' if r is None else r,source_url=w['source_url']))
    out.append('')
out.append(f'== Failures ({len(fails)})' if fails else '== Failures: none'); out+=['  '+f for f in fails]
out.append(f'\n== Information (not failures) ({len(info)})'); out+=['  '+i for i in info]
out.append(f'\n== Notes from collection ({len(notes)})'); out+=['  '+n for n in notes]
out.append(f"\n== Changes made under John's decisions of 18 Oct 2026 ({len(changes)})"); out+=['  '+c for c in changes]
open(f'out/{batch}-changes.txt','w').write('\n'.join(changes)+'\n')
# seats_offered: Democracy Club's seats on offer (more than seats for an under-contested ward; the importer
# saves the difference as seats_unfilled)
F=['election_date','council','ward_code','ward_code_source','ward','seats','seats_offered','candidate','party','votes','elected','electorate','turnout_pct','ballots_rejected','source_url']
with open(f'out/{batch}.csv','w',newline='') as f: wr=csv.DictWriter(f,F); wr.writeheader(); wr.writerows(rows)
open(f'out/{batch}-checks.txt','w').write('\n'.join(out)+'\n')
json.dump(cmap,open(f'out/{batch}-councils.json','w'),indent=1)
json.dump({k:sorted(set(v)) for k,v in unmapped.items()},open(f'out/{batch}-unmapped-parties.json','w'),indent=1)
print(f'{batch}: {len(rows)} rows, {len(fails)} failures, {len(unmapped)} unmapped party names')
for s in summary: print('  %s: %d of %d wards, %s %s'%s)
