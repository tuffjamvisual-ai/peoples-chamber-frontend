#!/usr/bin/env python3
"""
Builds lib/data/ni-welfare.json: welfare figures for Northern Ireland's 11 councils
(Local Government Districts), which DWP's figures do not cover. Owner's request, 17 Oct 2026.

Sources (Open Government Licence v3.0), saved by hand into data/ni-welfare/ because
automated downloads are blocked from this machine:
  1. Universal Credit Statistics, supplementary tables (DfC):  dfc-ni-uc-stats-supp-tables-*.ods
       Table 07 claimants by LGD (monthly), Table 10 households in payment, Table 13 mean payment
  2. PIP Statistics, supplementary tables (DfC):  personal-independence-payment-statistics-supplementary-tables-*.ods
       Table 9 claims in payment by LGD, Table 6 claims by level of award (for the average award)
  3. NISRA Data Portal, Benefit Statistics by Local Government District (BSLGD.csv)
       yearly claimants by LGD for Carer's Allowance, DLA and ESA
Average payments (NI-wide; DfC does not publish them by council) and weekly rates are set below
with their sources. Housing Benefit is not published by council area in Northern Ireland.

Spend figures are ESTIMATES: claimants in each council x the NI-wide average payment. The page
says so. Universal Credit spend is NI's total (households in payment x mean monthly payment x 12)
shared out by each council's share of UC claimants, because households are not published by council.

Usage:  python3 scripts/build-ni-welfare.py data/ni-welfare   (prints a check report, writes the JSON)
"""
import sys, glob, json, csv, datetime, os
import pandas as pd

SRC = sys.argv[1] if len(sys.argv) > 1 else 'data/ni-welfare'
OUT = 'lib/data/ni-welfare.json'

# NI-wide average weekly payments, NI Benefit Statistics Summary May 2026 (DfC/NISRA).
AVG_WEEKLY = {'dla': 129.29, 'esa': 138.67}
AVG_SOURCE = 'NI Benefit Statistics Summary, May 2026 (DfC/NISRA), average weekly payment for Northern Ireland'
# 2026/27 weekly rates (GOV.UK, Benefit and pension rates 2026 to 2027; Carer's Allowance in NI
# confirmed at the same rate by Carers UK NI).
CA_WEEKLY = 86.45
PIP = {'dl_enh': 114.60, 'dl_std': 76.70, 'mob_enh': 80.00, 'mob_std': 30.30}

LGD = {
  'Antrim and Newtownabbey': 'N09000001', 'Ards and North Down': 'N09000011',
  'Armagh City, Banbridge and Craigavon': 'N09000002', 'Belfast': 'N09000003',
  'Causeway Coast and Glens': 'N09000004', 'Derry City and Strabane': 'N09000005',
  'Fermanagh and Omagh': 'N09000006', 'Lisburn and Castlereagh': 'N09000007',
  'Mid and East Antrim': 'N09000008', 'Mid Ulster': 'N09000009', 'Newry, Mourne and Down': 'N09000010',
}

def one(pattern):
    m = sorted(glob.glob(os.path.join(SRC, pattern)))
    if not m: sys.exit(f'missing file: {pattern} in {SRC}')
    return m[-1]

def month_end(label):  # 'May 2026' -> '2026-05-31'
    d = datetime.datetime.strptime(label.strip(), '%b %Y')
    nxt = (d.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
    return (nxt - datetime.timedelta(days=1)).date().isoformat()

def table(path, sheet, header_text):
    df = pd.read_excel(path, engine='odf', sheet_name=sheet, header=None)
    hdr = next(i for i in range(len(df)) if str(df.iloc[i, 0]).strip() == header_text)
    t = df.iloc[hdr + 1:].copy(); t.columns = [str(c).strip() for c in df.iloc[hdr]]
    return t[t.iloc[:, 0].notna()]

out = {}
def put(code, key, val):
    out.setdefault(code, {})[key] = val

# 1. Universal Credit
uc_file = one('dfc-ni-uc-stats-supp-tables-*.ods')
t7 = table(uc_file, '07', 'Month')
latest = t7.iloc[-1]; uc_month = str(latest['Month'])
base_label = uc_month.split()[0] + ' ' + str(int(uc_month.split()[1]) - 2)
base = t7[t7['Month'].astype(str) == base_label]
if base.empty: sys.exit(f'UC baseline {base_label} not found')
base = base.iloc[0]
t10 = table(uc_file, '10', 'Month'); t13 = table(uc_file, '13', 'Month')
hh_row = t10[t10['Month'].astype(str) == uc_month].iloc[0]; pay_row = t13[t13['Month'].astype(str) == uc_month].iloc[0]
households = float(hh_row['Households In Payment'])
mean_monthly = float(pay_row[[c for c in t13.columns if 'all' in c.lower() or c.lower().startswith('total')][0]]) if any('all' in c.lower() or c.lower().startswith('total') for c in t13.columns) else float(pay_row.iloc[5])
ni_uc_spend = households * mean_monthly * 12
total_claimants = float(latest['Total Claimants'])
for name, code in LGD.items():
    c = float(latest[name]); b = float(base[name])
    put(code, 'uc', {'claimants': c, 'baseline': b, 'baselinePeriod': month_end(base_label), 'period': month_end(uc_month),
                     'spend': ni_uc_spend * c / total_claimants})
uc_meta = {'period': month_end(uc_month), 'households': households, 'meanMonthly': mean_monthly, 'niSpend': ni_uc_spend, 'file': os.path.basename(uc_file)}

# 2. PIP
pip_file = one('personal-independence-payment-statistics-supplementary-tables-*.ods')
t9 = table(pip_file, 'Table_9', 'Local Government District')
t6 = table(pip_file, 'Table_6', 'Date'); l6 = t6.iloc[-1]
mix = {
  'Enhanced DL & Enhanced Mob': PIP['dl_enh'] + PIP['mob_enh'], 'Enhanced DL & Standard Mob': PIP['dl_enh'] + PIP['mob_std'],
  'Standard DL & Enhanced Mob': PIP['dl_std'] + PIP['mob_enh'], 'Standard DL & Standard Mob': PIP['dl_std'] + PIP['mob_std'],
  'Enhanced DL Only': PIP['dl_enh'], 'Standard DL Only': PIP['dl_std'], 'Enhanced Mob Only': PIP['mob_enh'], 'Standard Mob Only': PIP['mob_std'],
}
n = sum(float(l6[k]) for k in mix); pip_avg = sum(float(l6[k]) * v for k, v in mix.items()) / n
if abs(n - float(l6['Total'])) > 5: sys.exit(f'PIP Table 6 levels {n} do not add to total {l6["Total"]}')
pip_period = month_end(str(l6['Date']))
for name, code in LGD.items():
    r = t9[t9.iloc[:, 0].astype(str).str.strip() == name]
    if r.empty: sys.exit(f'PIP: {name} not in Table 9')
    c = float(r.iloc[0]['Total Claims'])
    put(code, 'pip', {'claimants': c, 'period': pip_period, 'spend': c * pip_avg * 52})

# 3. CA, DLA, ESA from BSLGD (yearly)
bs = list(csv.DictReader(open(one('BSLGD.csv'), encoding='utf-8-sig')))
years = {}
for stat in ('CA', 'DLA', 'ESA'):
    rows = [r for r in bs if r['STATISTIC'] == stat and r['LGD2014'] in LGD.values() and r['VALUE'] not in ('', None)]
    yr = max(int(r['TLIST(A1)']) for r in rows); years[stat] = yr
    for code in LGD.values():
        cur = [r for r in rows if r['LGD2014'] == code and int(r['TLIST(A1)']) == yr]
        prev = [r for r in rows if r['LGD2014'] == code and int(r['TLIST(A1)']) == yr - 2]
        if not cur: sys.exit(f'{stat} {yr} missing for {code}')
        c = float(cur[0]['VALUE']); b = float(prev[0]['VALUE']) if prev else None
        weekly = CA_WEEKLY if stat == 'CA' else AVG_WEEKLY[stat.lower()]
        put(code, stat.lower(), {'claimants': c, 'baseline': b, 'baselineYear': yr - 2 if prev else None, 'year': yr, 'spend': c * weekly * 52})

doc = {
  'built': datetime.date.today().isoformat(),
  'councils': out,
  'method': {
    'uc': uc_meta, 'pipAverageWeekly': round(pip_avg, 2), 'pipPeriod': pip_period, 'pipRates': PIP,
    'caWeekly': CA_WEEKLY, 'averages': AVG_WEEKLY, 'averagesSource': AVG_SOURCE, 'bslgdYears': years,
  },
  'sources': [
    {'label': 'Universal Credit Statistics, May 2026 (Department for Communities)', 'url': 'https://www.communities-ni.gov.uk/publications/universal-credit-statistics-may-2026'},
    {'label': 'Personal Independence Payment Statistics, May 2026 (Department for Communities)', 'url': 'https://www.communities-ni.gov.uk/publications/personal-independence-payment-statistics-may-2026'},
    {'label': 'Benefit Statistics by Local Government District (NISRA Data Portal, BSLGD)', 'url': 'https://ws-data.nisra.gov.uk/public/api.restful/PxStat.Data.Cube_API.ReadDataset/BSLGD/CSV/1.0/en'},
    {'label': 'NI Benefit Statistics Summary, May 2026 (average weekly payments)', 'url': 'https://www.communities-ni.gov.uk/publications/benefits-statistics-summary-publication-accredited-official-statistics-may-2026'},
    {'label': 'Benefit and pension rates 2026 to 2027 (GOV.UK)', 'url': 'https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027'},
  ],
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(doc, open(OUT, 'w'), indent=1)
print(f'UC {uc_month}: NI households in payment {households:,.0f} x £{mean_monthly:,.0f}/month = £{ni_uc_spend/1e9:.2f}bn a year; claimants {total_claimants:,.0f}')
print(f'PIP {pip_period}: average weekly award £{pip_avg:.2f} from Table 6 mix ({n:,.0f} claims)')
print(f'BSLGD years: {years}')
for code in sorted(out):
    o = out[code]; tot = sum(o[k]['spend'] for k in o)
    print(code, f"total £{tot/1e6:,.0f}m", ' '.join(f"{k}:{o[k]['claimants']:,.0f}" for k in ('uc','pip','dla','ca','esa')))
print('wrote', OUT)
