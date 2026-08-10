#!/usr/bin/env python3
# Tier-A parser: NHS England A&E all-types 4-hour performance (England).
# Finds the latest Monthly A&E CSV on the statistics page, sums provider rows,
# computes % seen within 4 hours = 1 - (over-4hr / attendances) across all types.
import sys, re, subprocess, pandas as pd
PAGE="https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2025-26/"
def curl(url): return subprocess.run(["/usr/bin/curl","-s","-m","60",url],capture_output=True).stdout
html=curl(PAGE).decode("utf-8","ignore")
m=[u for u in re.findall(r'href="([^"]+\.csv)"',html) if re.search(r'Monthly-AE',u,re.I)]
if not m: sys.exit("no monthly CSV found")
csv_url=m[0]; open("/tmp/_ae.csv","wb").write(curl(csv_url))
df=pd.read_csv("/tmp/_ae.csv",low_memory=False)
att=[c for c in df.columns if re.search(r'A&E attendances',c,re.I)]
ov4=[c for c in df.columns if re.search(r'Attendances over 4hrs',c,re.I)]
for c in att+ov4: df[c]=pd.to_numeric(df[c],errors="coerce")
tot=df[att].sum().sum(); over=df[ov4].sum().sum()
pct=round(100*(1-over/tot),1)
period=str(df["Period"].dropna().iloc[0]) if "Period" in df.columns else "?"
print(f"{pct}\t{period}\t{csv_url}")
