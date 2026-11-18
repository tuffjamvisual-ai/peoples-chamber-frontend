import csv,re,json,sys
SP=sys.argv[1]
rows=list(csv.DictReader(open(SP+'/fsm/councils.csv')))
byname={}
def norm(s):
    s=re.sub(r'\[note \d+\]','',s); s=s.replace('&','and').replace('Môn','Mon').lower()
    s=re.sub(r'\b(city of|county borough|county council|borough council|council|borough of|royal borough of|london borough of|metropolitan borough of|the|city)\b','',s)
    return re.sub(r'[^a-z]','',s)
for r in rows:
    if r['country'] in ('England','Wales') and r['type']!='district':
        for k in {norm(r['name']), norm(r['slug'].replace('-',' '))}:
            if (r['gss_code'],r['name']) not in byname.get(k,[]): byname.setdefault(k,[]).append((r['gss_code'],r['name']))
ERR=[]
HAND={'Newcastle upon Tyne':'Newcastle City Council','Newcastle-upon Tyne':'Newcastle City Council','Kingston upon Hull':'Hull City Council','Kingston-upon-Hull':'Hull City Council'}
def code(name):
    name=HAND.get(name,name)
    c=byname.get(norm(name),[])
    if len(c)!=1: ERR.append(f'{name!r}: {c}'); return '?'
    return c[0][0]
OLD={'Northamptonshire':'E10000021','Cumbria':'E10000006','Bournemouth':'E06000028','Poole':'E06000029'}
FTE_HAND={'City of London':'City of London Corporation','Newcastle-upon Tyne':'Newcastle upon Tyne','East Riding of Yorkshire and the Humber':'East Riding of Yorkshire','Kingston upon Hull, City of':'Kingston upon Hull','North Yorkshire and the Humber':'North Yorkshire'}
fte={}
for n in [l.strip() for l in open(SP+'/yj/fte_2_10_2_11_areas.txt') if l.strip()]:
    base=re.sub(r'\s*\[note \d+\]','',n).strip()
    fte[n]=OLD[base] if base in OLD else code(FTE_HAND.get(base,base))
MULTI={'Bedfordshire':['Bedford','Central Bedfordshire'],'Blaenau Gwent and Caerphilly':['Blaenau Gwent','Caerphilly'],'Bury and Rochdale':['Bury','Rochdale'],
 'Cheshire East, Cheshire West, Halton and Warrington':['Cheshire East','Cheshire West and Chester','Halton','Warrington'],'Conwy and Denbighshire':['Conwy','Denbighshire'],
 'Cwm Taf':['Merthyr Tydfil','Rhondda Cynon Taf'],'Dorset Combined YOS':['Bournemouth, Christchurch and Poole','Dorset'],'Gwynedd Mon':['Gwynedd','Isle of Anglesey'],
 'Kingston and Richmond':['Kingston upon Thames','Richmond upon Thames'],'Monmouthshire and Torfaen':['Monmouthshire','Torfaen'],'South Tees':['Middlesbrough','Redcar and Cleveland'],
 'Tower Hamlets and City of London':['Tower Hamlets','City of London Corporation'],'West Mercia':['Herefordshire','Shropshire','Telford and Wrekin','Worcestershire'],
 'Western Bay':['Bridgend','Neath Port Talbot','Swansea'],'Northamptonshire':['North Northamptonshire','West Northamptonshire'],'Kingston-upon-Hull':['Kingston upon Hull'],
 'Cornwall':['Cornwall','Isles of Scilly'],  # the annex names it 'Cornwall and Isles of Scilly' (T2, 16:21)
 'Leicestershire':['Leicestershire','Rutland']}  # Leicestershire Youth and Justice Service (including Rutland): Leicestershire County Council, Youth Justice Plan 2023 to 2026
yjs={}
for n in [l.strip() for l in open(SP+'/yj/children_table_yjs.txt') if l.strip()]:
    yjs[n]=['E10000006'] if n=='Cumbria' else ([code(x) for x in MULTI[n]] if n in MULTI else [code(n)])
if ERR: raise SystemExit('unresolved: '+' | '.join(ERR))
ALIAS={'Cornwall and Isles of Scilly':'Cornwall','Derby City':'Derby','Dorset Combined YJS':'Dorset Combined YOS','Gwynedd and Ynys Môn':'Gwynedd Mon','Nottingham City':'Nottingham'}
annex=[l.strip() for l in open(SP+'/yj/annex_c4_yjs.txt') if l.strip()]
miss=[a for a in annex if ALIAS.get(a,a) not in yjs]
if miss: raise SystemExit(f'annex names not in Children_Table: {miss}')
codes=[c for v in yjs.values() for c in v]
dup=sorted({c for c in codes if codes.count(c)>1})
out={'about':'Youth Justice Statistics 2024 to 2025 names to GSS codes (Cowork ENTRY 303, FSM-YJ), built from our councils table by name (scripts in the job notes); old codes for areas before a boundary change; a shared service lists every council it serves. A name not here stops the import.','fte':fte,'fteDorsetOld':'E10000009','yjs':yjs,'annexAlias':ALIAS}
json.dump(out,open(SP+'/fy-wt/lib/youth-justice/names.json','w'),indent=1,ensure_ascii=False)
names={r['gss_code']:r['name'] for r in rows}
print('fte',len(fte),'yjs',len(yjs),'annex',len(annex),'councils served by more than one service name (old/new or split):',[(c,names.get(c)) for c in dup])
for k,v in fte.items():
    if names.get(v) and norm(names[v])!=norm(re.sub(r'\s*\[note \d+\]','',k)): print('FTE check', k,'->',v,names.get(v))
