#!/usr/bin/env node
// Backfill council_tax_band_d_pounds and revenue_budget_mn for all 22 Welsh
// and 32 Scottish councils. Conservative write: only fills NULL cells.
//
// ── WALES: council_tax_band_d_pounds ──────────────────────────────────────
// Source: StatsWales dataset 1988b6af-2a9c-43b6-8939-83e6cceb3903
//   "Council tax levels by billing authority and band"
//   Filter: Year = 2026-27, Band = D. Matched by GSS code (W06xxxxxx).
//   Cardiff Band D = £2,013.18 — independently confirmed against Cardiff
//   Council's own 2026-27 budget papers.
// Retrieved: 2026-10-01 via POST download endpoint + token follow.
//
// ── WALES: revenue_budget_mn ──────────────────────────────────────────────
// Source: Welsh Government Final Local Government Revenue Settlement 2026-27
//   Publication: gov.wales/local-government-revenue-and-capital-settlement-
//   final-2026-2027 (published 21 January 2026)
//   File: local-government-revenue-settlement-2026-2027-final-tables.xlsx
//   Table 5 ("Principal Council Funding"), column "Standard Spending
//   Assessment" (SSA). Values are in £ (not £000); divided by 1,000,000
//   here for £m. SSA is defined as AEF (government grant) + 100% council
//   tax yield — the Welsh Government's formula assessment of each council's
//   total non-ring-fenced funding need.
//
// WHY SSA AND NOT THE StatsWales "BUDGETED REVENUE EXPENDITURE" FIGURE:
//   The StatsWales "Budgeted Revenue Expenditure by Authority and Service"
//   survey (dataset 88384d5e) reports gross expenditure including ring-fenced
//   pass-through grants — notably housing benefit payments (£106m for Cardiff
//   alone), Supporting People (£30m), and other Welsh Government ring-fenced
//   items — which do not represent the council's own budget in any meaningful
//   sense. Cardiff's gross figure is £1,212.6m versus its actual net cash
//   limit of £967.3m. Using the gross figure alongside England's "NET CURRENT
//   EXPENDITURE" (from the MHCLG RA budget return, which nets out those same
//   pass-through items) would make Cardiff appear to spend ~25% more than a
//   comparably-sized English city purely due to accounting treatment, which
//   would be actively misleading.
//
//   The SSA excludes ring-fenced pass-through grants by design (housing
//   benefit is a separate line in the settlement formula and not included in
//   the general SSA total). The SSA systematically runs ~4% above councils'
//   own actual net budgets due to the education ring-fenced grant formula
//   element; Cardiff SSA = £1,008.9m vs Cardiff net cash limit £967.3m
//   (4.1% gap). This is a documented, understood structural difference —
//   formula vs actual budget returns — not an unexplained black box. It is
//   a defensible basis for cross-country comparison; the gross StatsWales
//   figure is not.
//
// ── SCOTLAND: council_tax_band_d_pounds ───────────────────────────────────
// Source: Scottish Government "Council Tax Datasets" publication
//   gov.scot/publications/council-tax-datasets/ (updated 31 March 2026)
//   File: CTAS 2026 - Band D Council Tax Rates by year - 1996-97 to 2026-27
//   Sheet: "Av. Band D 1996-97 to 2026-27", column "2026-27".
//   Matched by name to DB slug. Glasgow = £1,706.00 and Edinburgh = £1,626.05
//   are consistent with independently published council tax leaflets.
//
// ── SCOTLAND: revenue_budget_mn ───────────────────────────────────────────
// Source: Scottish Government "Local Government 2025-26 Provisional Outturn
//   and 2026-27 Budget Estimates" (POBE 2026)
//   gov.scot/publications/local-government-2025-26-provisional-outturn-
//   and-2026-27-budget-estimates/ (published June 2026, revised 24 July 2026)
//   File: POBE 2026 - Revenue Workbook - revised on 24 July 2026.xlsx
//   Per-council sheets: Row "Total Net Revenue Expenditure" (Part 1, Row 23)
//   PLUS Row "Total Other Income & Expenditure" (Row 33, covering interest
//   payable, statutory debt repayment, and capital expenditure charged to
//   revenue). The sum of Rows 23 + 33 matches councils' own General Fund
//   revenue budgets: Glasgow POBE total £2,235.9m vs Audit Scotland's
//   independently reported £2,233.8m (0.09% gap). Edinburgh POBE total
//   £1,508.0m vs council source £1,527m (1.3% gap, plausible from visitor
//   levy treatment and budget amendment timing). Values in source are £000;
//   divided by 1000 for £m.
//
//   WHY POBE ROWS 23+33 AND NOT ROW 23 ALONE:
//   Row 23 ("Total Net Revenue Expenditure on Services") covers service
//   delivery costs only. Row 33 adds financing costs: interest payable,
//   statutory debt repayment, and capital-from-revenue. England's "NET
//   CURRENT EXPENDITURE" from the MHCLG RA return includes these financing
//   items. Using Row 23 alone would systematically under-report Scottish
//   councils' total budget obligation versus England; the combined figure
//   matches the scope of England's metric.

'use strict';
require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const DRY_RUN = !process.argv.includes('--live');

// ── WALES: Band D 2026-27 (£, 2 dp) keyed by GSS code ───────────────────
const WALES_CTAX = {
  'W06000001': 2260.73,  // Isle of Anglesey
  'W06000002': 2468.77,  // Gwynedd
  'W06000003': 2472.82,  // Conwy
  'W06000004': 2339.03,  // Denbighshire
  'W06000005': 2376.17,  // Flintshire
  'W06000006': 2308.88,  // Wrexham
  'W06000008': 2419.45,  // Ceredigion
  'W06000009': 2166.15,  // Pembrokeshire
  'W06000010': 2351.20,  // Carmarthenshire
  'W06000011': 2238.29,  // Swansea
  'W06000012': 2541.39,  // Neath Port Talbot
  'W06000013': 2477.99,  // Bridgend
  'W06000014': 2231.54,  // Vale of Glamorgan
  'W06000015': 2013.18,  // Cardiff ← independently confirmed
  'W06000016': 2289.43,  // Rhondda Cynon Taf
  'W06000018': 2082.88,  // Caerphilly
  'W06000019': 2531.26,  // Blaenau Gwent
  'W06000020': 2155.68,  // Torfaen
  'W06000021': 2416.50,  // Monmouthshire
  'W06000022': 2088.48,  // Newport
  'W06000023': 2351.72,  // Powys
  'W06000024': 2593.60,  // Merthyr Tydfil
};

// ── WALES: Settlement SSA 2026-27 (£m, 3 dp) keyed by GSS code ───────────
// SSA values sourced from tbl5 (Principal Council Funding) in the settlement
// tables Excel. Matched to DB via the gss_code already on the council row.
const WALES_SSA_BY_NAME = {
  'Isle of Anglesey':   204.080,
  'Gwynedd':            359.672,
  'Conwy':              330.006,
  'Denbighshire':       308.178,
  'Flintshire':         417.022,
  'Wrexham':            372.424,
  'Powys':              386.984,
  'Ceredigion':         213.639,
  'Pembrokeshire':      357.647,
  'Carmarthenshire':    545.375,
  'Swansea':            684.032,
  'Neath Port Talbot':  419.999,
  'Bridgend':           402.398,
  'Vale of Glamorgan':  360.768,  // settlement spells "The Vale of Glamorgan"
  'Rhondda Cynon Taf':  709.216,
  'Merthyr Tydfil':     178.679,
  'Caerphilly':         517.508,
  'Blaenau Gwent':      206.831,
  'Torfaen':            272.368,
  'Monmouthshire':      233.838,
  'Newport':            476.681,
  'Cardiff':           1008.901,  // Cardiff SSA; own net cash limit £967.3m (4.1% below SSA)
};

// ── SCOTLAND: Band D 2026-27 (£, 2 dp) keyed by DB slug ─────────────────
const SCOTLAND_CTAX = {
  'aberdeen':                1747.54,
  'aberdeenshire':           1686.04,
  'angus':                   1598.65,
  'argyll-and-bute':         1783.33,
  'city-of-edinburgh':       1626.05,
  'clackmannanshire':        1683.67,
  'comhairle-nan-eilean-siar': 1505.50,
  'dumfries-and-galloway':   1578.65,
  'dundee':                  1729.69,
  'east-ayrshire':           1717.28,
  'east-dunbartonshire':     1751.67,
  'east-lothian':            1697.62,
  'east-renfrewshire':       1620.15,
  'falkirk':                 1715.09,
  'fife':                    1573.70,
  'glasgow':                 1706.00,
  'highland':                1633.99,
  'inverclyde':              1673.85,
  'midlothian':              1816.16,
  'moray':                   1731.14,
  'north-ayrshire':          1685.84,
  'north-lanarkshire':       1554.56,
  'orkney-islands':          1669.07,
  'perth-and-kinross':       1673.84,
  'renfrewshire':            1690.56,
  'scottish-borders':        1618.52,
  'shetland-islands':        1487.90,
  'south-ayrshire':          1694.96,
  'south-lanarkshire':       1468.47,
  'stirling':                1752.87,
  'west-dunbartonshire':     1681.53,
  'west-lothian':            1627.59,
};

// ── SCOTLAND: POBE total £m (rows 23+33, 3 dp) keyed by DB slug ──────────
const SCOTLAND_BUDGET = {
  'aberdeen':                 696.038,  // services £614.8m + financing £81.2m
  'aberdeenshire':            862.977,
  'angus':                    377.474,
  'argyll-and-bute':          362.853,
  'city-of-edinburgh':       1507.988,  // vs council source £1,527m (1.3% gap)
  'clackmannanshire':         178.192,
  'comhairle-nan-eilean-siar': 142.808,
  'dumfries-and-galloway':    515.518,
  'dundee':                   498.685,
  'east-ayrshire':            420.797,
  'east-dunbartonshire':      382.050,
  'east-lothian':             355.464,
  'east-renfrewshire':        353.733,
  'falkirk':                  508.419,
  'fife':                    1205.957,
  'glasgow':                 2235.870,  // vs Audit Scotland £2,233.8m (0.09% gap)
  'highland':                 859.422,
  'inverclyde':               276.609,
  'midlothian':               332.364,
  'moray':                    310.929,
  'north-ayrshire':           479.588,
  'north-lanarkshire':       1135.866,
  'orkney-islands':           153.757,
  'perth-and-kinross':        516.003,
  'renfrewshire':             607.717,
  'scottish-borders':         396.415,
  'shetland-islands':         170.736,  // Row 33 is negative (oil fund investment income)
  'south-ayrshire':           395.588,
  'south-lanarkshire':       1072.723,
  'stirling':                 321.060,
  'west-dunbartonshire':      328.060,
  'west-lothian':             600.741,
};

// ── DB helpers ────────────────────────────────────────────────────────────
function psqlRead(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-t', '-A', '-F', '|', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
  });
}
function psqlWrite(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-q'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err)));
    p.stdin.end(sql);
  });
}

(async () => {
  console.log(DRY_RUN
    ? '=== DRY RUN — pass --live to write ===\n'
    : '=== LIVE — writing to production DB ===\n');

  // Load current DB state for all Welsh + Scottish councils
  const raw = await psqlRead(
    `SELECT slug, name, gss_code, council_tax_band_d_pounds, revenue_budget_mn
     FROM councils WHERE gss_code LIKE 'W06%' OR gss_code LIKE 'S12%'
     ORDER BY gss_code`
  );
  const rows = raw.split('\n').filter(Boolean).map(line => {
    const [slug, name, gss, ctax, budget] = line.split('|');
    return { slug, name, gss, ctax: ctax || null, budget: budget || null };
  });

  // ── Build SSA lookup: map DB name → SSA value (name-to-name matching) ──
  // The settlement uses council names slightly different from the DB
  // (e.g. "The Vale of Glamorgan" vs "Vale of Glamorgan Council").
  // Normalise by stripping "The ", "Council", "City Council" suffixes.
  function normName(n) {
    return n.replace(/^The\s+/i, '').replace(/\s+(Council|City Council|County Borough Council)$/i, '').trim().toLowerCase();
  }
  const ssaByNorm = new Map(
    Object.entries(WALES_SSA_BY_NAME).map(([k, v]) => [normName(k), v])
  );

  // ── Preview ───────────────────────────────────────────────────────────
  console.log('=== PREVIEW: current state & proposed writes ===\n');
  console.log(
    'slug'.padEnd(32) +
    'gss'.padEnd(12) +
    'ctax_now'.padEnd(12) +
    'ctax_new'.padEnd(12) +
    'budget_now'.padEnd(12) +
    'budget_new'
  );
  console.log('─'.repeat(92));

  const updates = [];

  for (const row of rows) {
    const isWales = row.gss.startsWith('W06');
    const isScotland = row.gss.startsWith('S12');

    let newCtax = null;
    let newBudget = null;

    if (isWales) {
      newCtax   = row.ctax   == null ? (WALES_CTAX[row.gss]        ?? null) : null;
      const ssa = ssaByNorm.get(normName(row.name));
      newBudget = row.budget == null ? (ssa ?? null) : null;
    } else if (isScotland) {
      newCtax   = row.ctax   == null ? (SCOTLAND_CTAX[row.slug]   ?? null) : null;
      newBudget = row.budget == null ? (SCOTLAND_BUDGET[row.slug] ?? null) : null;
    }

    const willWrite = newCtax != null || newBudget != null;
    if (willWrite) updates.push({ ...row, newCtax, newBudget });

    const marker = willWrite ? '→' : ' ';
    console.log(
      marker + row.slug.padEnd(31) +
      row.gss.padEnd(12) +
      (row.ctax   ?? 'NULL').toString().padEnd(12) +
      (newCtax    != null ? String(newCtax) : '(keep)').padEnd(12) +
      (row.budget ?? 'NULL').toString().padEnd(12) +
      (newBudget  != null ? String(newBudget) : '(keep)')
    );
  }

  // ── Coverage report ───────────────────────────────────────────────────
  const walesRows    = rows.filter(r => r.gss.startsWith('W06'));
  const scotlandRows = rows.filter(r => r.gss.startsWith('S12'));

  const wCtaxFilled   = walesRows.filter(r => r.ctax != null).length;
  const wCtaxNew      = updates.filter(u => u.gss.startsWith('W06') && u.newCtax != null).length;
  const wBudgetFilled = walesRows.filter(r => r.budget != null).length;
  const wBudgetNew    = updates.filter(u => u.gss.startsWith('W06') && u.newBudget != null).length;

  const sCtaxFilled   = scotlandRows.filter(r => r.ctax != null).length;
  const sCtaxNew      = updates.filter(u => u.gss.startsWith('S12') && u.newCtax != null).length;
  const sBudgetFilled = scotlandRows.filter(r => r.budget != null).length;
  const sBudgetNew    = updates.filter(u => u.gss.startsWith('S12') && u.newBudget != null).length;

  console.log('\n=== COVERAGE REPORT ===\n');
  console.log('                  council_tax_band_d_pounds    revenue_budget_mn');
  console.log('                  before → after               before → after');
  console.log(`Wales (22):       ${wCtaxFilled}/22 → ${wCtaxFilled + wCtaxNew}/22               ${wBudgetFilled}/22 → ${wBudgetFilled + wBudgetNew}/22`);
  console.log(`Scotland (32):    ${sCtaxFilled}/32 → ${sCtaxFilled + sCtaxNew}/32               ${sBudgetFilled}/32 → ${sBudgetFilled + sBudgetNew}/32`);
  console.log(`\nTotal writes queued: ${updates.length} councils, ` +
    `${updates.filter(u => u.newCtax != null).length} ctax + ` +
    `${updates.filter(u => u.newBudget != null).length} budget cells`);

  // ── Warn if any council has source data but couldn't be matched ───────
  const walesMatched   = new Set(updates.filter(u => u.gss.startsWith('W06')).map(u => u.gss));
  const scotlandMatched = new Set(updates.filter(u => u.gss.startsWith('S12')).map(u => u.slug));
  const walesMissing    = walesRows.filter(r => r.ctax == null && !WALES_CTAX[r.gss]);
  const scotMissing     = scotlandRows.filter(r => r.ctax == null && !SCOTLAND_CTAX[r.slug]);
  if (walesMissing.length)   console.log('\nWARN: No ctax source for:', walesMissing.map(r => r.slug).join(', '));
  if (scotMissing.length)    console.log('WARN: No ctax source for:', scotMissing.map(r => r.slug).join(', '));

  if (DRY_RUN) {
    console.log('\nDry run complete. Re-run with --live to apply.\n');
    return;
  }

  // ── Live writes (NULL-only, inside a single transaction) ──────────────
  console.log('\nWriting to DB…');
  const setClauses = [];
  for (const u of updates) {
    const parts = [];
    if (u.newCtax   != null) parts.push(`council_tax_band_d_pounds = ${u.newCtax}`);
    if (u.newBudget != null) parts.push(`revenue_budget_mn = ${u.newBudget}`);
    if (parts.length === 0) continue;
    setClauses.push(
      `UPDATE councils SET ${parts.join(', ')} ` +
      `WHERE slug = '${u.slug}' ` +
      `AND (council_tax_band_d_pounds IS NULL OR revenue_budget_mn IS NULL);`
    );
  }

  const sql = `BEGIN;\n${setClauses.join('\n')}\nCOMMIT;\n`;
  await psqlWrite(sql);
  console.log(`Wrote ${setClauses.length} rows.\n`);

  // ── Post-write verification ───────────────────────────────────────────
  const after = await psqlRead(
    `SELECT
       count(*) FILTER (WHERE gss_code LIKE 'W06%' AND council_tax_band_d_pounds IS NOT NULL) AS w_ctax,
       count(*) FILTER (WHERE gss_code LIKE 'W06%' AND revenue_budget_mn IS NOT NULL)         AS w_budget,
       count(*) FILTER (WHERE gss_code LIKE 'S12%' AND council_tax_band_d_pounds IS NOT NULL) AS s_ctax,
       count(*) FILTER (WHERE gss_code LIKE 'S12%' AND revenue_budget_mn IS NOT NULL)         AS s_budget,
       count(*) FILTER (WHERE gss_code LIKE 'W06%')                                            AS w_total,
       count(*) FILTER (WHERE gss_code LIKE 'S12%')                                            AS s_total
     FROM councils`
  );
  const [wc, wb2, sc, sb, wt, st] = after.split('|');
  console.log('=== POST-WRITE COVERAGE ===');
  console.log(`Wales:    ctax ${wc}/${wt}  budget ${wb2}/${wt}`);
  console.log(`Scotland: ctax ${sc}/${st}  budget ${sb}/${st}`);
})();
