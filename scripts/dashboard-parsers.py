#!/usr/bin/env python3
"""
Tier-A parsers for the Broken State Dashboard. Each fetches the statistics page,
locates the latest published file, parses the headline figure, and prints
  value<TAB>period<TAB>source_url
which a driver upserts into dashboard_indicators (update_method='auto'), bumping
series_version on any definition break.

Requires odfpy for the ODS feeds. Set up once:
  python3 -m venv /tmp/dashvenv && /tmp/dashvenv/bin/pip install odfpy pandas openpyxl
Run:  /tmp/dashvenv/bin/python scripts/dashboard-parsers.py <ae|rtt|homelessness|courts|prisons|charge>

Tuned & verified against live files: ae, rtt, homelessness, courts, prisons.
charge (Home Office outcomes) still a scaffold: the % is not a single cell and must
be computed from charged-count / total-offences in the outcomes table.
"""
import sys, re, subprocess, io
import pandas as pd

def curl(url, binary=True):
    return subprocess.run(["/usr/bin/curl", "-sL", "-m", "90", url], capture_output=True).stdout

def find_link(page_url, pattern):
    html = curl(page_url, False).decode("utf-8", "ignore")
    m = re.search(r'href="([^"]+)"', ' '.join(re.findall(r'href="[^"]+"', html)))
    hits = [h for h in re.findall(r'href="([^"]+)"', html) if re.search(pattern, h, re.I)]
    return hits[0] if hits else None

# ---- A&E all-types 4-hour % (NHS monthly CSV) ---------------------------------
def ae():
    page = "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2025-26/"
    csv = find_link(page, r'Monthly-AE.*\.csv')
    df = pd.read_csv(io.BytesIO(curl(csv)), low_memory=False)
    att = [c for c in df.columns if re.search(r'A&E attendances', c, re.I)]
    ov4 = [c for c in df.columns if re.search(r'Attendances over 4hrs', c, re.I)]
    for c in att + ov4: df[c] = pd.to_numeric(df[c], errors="coerce")
    pct = round(100 * (1 - df[ov4].sum().sum() / df[att].sum().sum()), 1)
    period = str(df["Period"].dropna().iloc[0])
    return f"{pct}\t{period}\t{page}"

# ---- RTT incomplete pathways with estimates (NHS Overview Timeseries XLSX) -----
def rtt():
    page = "https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2026-27/"
    x = find_link(page, r'RTT-Overview-Timeseries.*\.xlsx')
    df = pd.read_excel(io.BytesIO(curl(x)), sheet_name='Full Time Series', header=None)
    # the with-estimates total is the largest incomplete stock (4-10m band)
    best = 0
    for j in range(df.shape[1]):
        col = pd.to_numeric(df.iloc[11:, j], errors="coerce").dropna()
        if len(col) and 4_000_000 < col.iloc[-1] < 10_000_000:
            best = max(best, int(col.iloc[-1]))
    return f"{best}\tlatest\t{page}"

# ---- Households in temporary accommodation (MHCLG ODS, TA1) --------------------
def homelessness():
    page = "https://www.gov.uk/government/statistical-data-sets/live-tables-on-homelessness"
    ods = find_link(page, r'Time_Series.*\.ods')
    df = pd.read_excel(io.BytesIO(curl(ods)), engine='odf', sheet_name='TA1', header=None)
    # column headed 'Total number of households in temporary accommodation'
    j = next(c for c in range(df.shape[1]) if 'Total number of households' in ' '.join(str(df.iloc[r, c]) for r in range(3)))
    col = pd.to_numeric(df.iloc[3:, j], errors="coerce").dropna()
    return f"{int(col.iloc[-1])}\tlatest\t{page}"

# ---- Crown Court open (outstanding) caseload (MoJ ODS, Table_C1) ---------------
def courts():
    coll = curl("https://www.gov.uk/government/collections/criminal-court-statistics", False).decode("utf-8", "ignore")
    rel = "https://www.gov.uk" + re.search(r'href="(/government/statistics/criminal-court-statistics-quarterly[^"]*)"', coll).group(1)
    ods = find_link(rel, r'ccsq.*tables.*\.ods')
    df = pd.read_excel(io.BytesIO(curl(ods)), engine='odf', sheet_name='Table_C1', header=None)
    # 'open cases at end of period' column ~ the value in the 30k-120k band on the last quarterly row
    col = pd.to_numeric(df.iloc[:, 4], errors="coerce")
    latest = col[(col > 30000) & (col < 120000)].dropna().iloc[-1]
    return f"{int(latest)}\tlatest\t{rel}"

# ---- Prison occupancy = population / usable operational capacity (weekly ODS) --
def prisons():
    page = "https://www.gov.uk/government/publications/prison-population-weekly-estate-figures-2026"
    ods = find_link(page, r'PSWEBREPORT.*\.ods')
    df = pd.read_excel(io.BytesIO(curl(ods)), engine='odf', sheet_name='Data', header=None)
    def val(label):
        for i in range(df.shape[0]):
            if str(df.iloc[i, 0]).strip().lower().startswith(label):
                return float(df.iloc[i, 1])
        return None
    pop, cap = val('population'), val('useable operational')
    return f"{round(100*pop/cap,1)}\tlatest\t{page}"

def charge():
    return ("SCAFFOLD charge rate: Home Office 'Crime outcomes in England and Wales' outcomes ODS — "
            "the charge/summons % is not a single cell; compute charged-count / total-offences from the outcomes table.")

if __name__ == "__main__":
    fn = {"ae": ae, "rtt": rtt, "homelessness": homelessness, "courts": courts, "prisons": prisons, "charge": charge}
    print(fn.get(sys.argv[1] if len(sys.argv) > 1 else "ae", ae)())
