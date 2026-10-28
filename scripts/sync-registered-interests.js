#!/usr/bin/env node
// Nightly refresh of mp_registered_interests (the MP Interests tab, second jobs, outside
// earnings and donations figures) from Parliament's Members API, for EVERY current MP in one
// run. Runs in the Daily Department Updates workflow, which has no 5-minute limit.
//
// Why: the Vercel route /api/sync-registered-interests does 150 MPs per call and is meant to
// call itself for the next 150. Those follow-on calls stopped on 14 July 2026, so only the
// first 150 MPs (by member id) had been refreshed since; the other ~500 still showed their
// July register (for example missing new visits and showing entries since removed).
//
// Per MP (same rules as the route):
//   - every live entry is saved with is_current = true and last_seen_date = today
//   - entries no longer on the register are kept but set is_current = false
//   - first_seen_date is never touched
//   - donations and gifts (categories 2, 3, 4 and 5) also get donor_name, donor_amount, received_date,
//     accepted_date and payment_type from the Interests API's structured fields (same interest ids). These were
//     filled by a one-off load until 14 July 2026 and then left empty, and some had since been amended on the
//     register (owner's approval, 21 Oct 2026). If that API fails for an MP, their saved values are left alone.
// An empty answer from the API is asked again once before it is believed, so a passing fault
// cannot wipe a register. Former MPs who still have current entries are checked the same way:
// they are no longer on the register, so their entries are set to not current.
//
// DRY RUN BY DEFAULT: reads everything and reports what would change, writing nothing.
// Pass --write to save. Stops with an error if more than 5% of MPs fail.
//
// Usage:
//   node scripts/sync-registered-interests.js
//   node scripts/sync-registered-interests.js --write

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const API = 'https://members-api.parliament.uk/api/Members';
const INTERESTS_API = 'https://interests-api.parliament.uk/api/v1/Interests'; // 20 per page at most
const UA = 'opengovt-RegisterSync/1.0 (+https://opengovt.uk)';
const THROTTLE_MS = 150;
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);

async function fetchInterests(memberId) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${API}/${memberId}/RegisteredInterests`, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`Members API ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json && json.value)) throw new Error('Members API answer has no value list');
      return json.value;
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(1500 * attempt);
    }
  }
}

// interest id -> { donor_name, donor_amount, received_date, accepted_date, payment_type } for entries that name a donor.
async function fetchDonationFields(memberId) {
  const out = new Map();
  for (let skip = 0; skip < 2000; skip += 20) {
    let json;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${INTERESTS_API}?MemberId=${memberId}&Take=20&Skip=${skip}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
        if (!res.ok) throw new Error(`Interests API ${res.status}`);
        json = await res.json();
        break;
      } catch (e) {
        if (attempt === 3) throw e;
        await sleep(1500 * attempt);
      }
    }
    const items = Array.isArray(json && json.items) ? json.items : [];
    for (const it of items) {
      const f = Object.fromEntries((it.fields || []).map((x) => [x.name, x.value]));
      if (!f.DonorName) continue;
      const amount = f.Value != null && f.Value !== '' && Number.isFinite(Number(f.Value)) ? Number(f.Value) : null;
      out.set(it.id, {
        donor_name: String(f.DonorName).trim(),
        donor_amount: amount,
        received_date: f.ReceivedDate ? String(f.ReceivedDate).slice(0, 10) : null,
        accepted_date: f.AcceptedDate ? String(f.AcceptedDate).slice(0, 10) : null,
        payment_type: f.PaymentType || null,
      });
    }
    await sleep(THROTTLE_MS);
    if (items.length < 20 || skip + 20 >= (json.totalResults || 0)) break;
  }
  return out;
}

const DONATION_KEYS = ['donor_name', 'donor_amount', 'received_date', 'accepted_date', 'payment_type'];

function flattenRows(memberId, categories) {
  const rows = [];
  for (const cat of categories) {
    for (const it of cat.interests || []) {
      if (it.deletedWhen) continue;
      rows.push({
        member_id: memberId,
        category_id: cat.id,
        category_name: cat.name,
        category_sort_order: cat.sortOrder ?? null,
        interest_id: it.id,
        interest_text: it.interest ?? '',
        created_when: it.createdWhen ?? null,
        last_amended_when: it.lastAmendedWhen ?? null,
        is_correction: Boolean(it.isCorrection),
        child_interests: (it.childInterests || []).map((c) => ({
          id: c.id,
          interest: c.interest,
          createdWhen: c.createdWhen ?? null,
          lastAmendedWhen: c.lastAmendedWhen ?? null,
          deletedWhen: c.deletedWhen ?? null,
          isCorrection: Boolean(c.isCorrection),
          childInterests: c.childInterests || [],
        })),
        is_current: true,
        last_seen_date: today,
        source: 'members-api',
      });
    }
  }
  return rows;
}

async function pageAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  const current = await pageAll(() => db.from('mps').select('member_id').eq('current_member', true).order('member_id'));
  const stored = await pageAll(() => db.from('mp_registered_interests').select('member_id, interest_id').eq('is_current', true).order('id'));
  const storedBy = new Map();
  for (const r of stored) { if (!storedBy.has(r.member_id)) storedBy.set(r.member_id, new Set()); storedBy.get(r.member_id).add(r.interest_id); }
  const currentIds = new Set(current.map((m) => m.member_id));
  const former = [...storedBy.keys()].filter((id) => !currentIds.has(id)).sort((a, b) => a - b);
  const targets = [...current.map((m) => m.member_id), ...former];
  console.log(`current MPs: ${current.length}; former MPs still holding current entries: ${former.length}; entries now marked current: ${stored.length}`);

  let ok = 0, failed = 0, added = 0, kept = 0, ended = 0, emptyConfirmed = 0, donationRows = 0, donationFailures = 0;
  const failures = [];
  const changedMps = [];
  for (const memberId of targets) {
    try {
      let rows = flattenRows(memberId, await fetchInterests(memberId));
      if (rows.length === 0 && storedBy.has(memberId)) {
        await sleep(2000);
        rows = flattenRows(memberId, await fetchInterests(memberId));
        if (rows.length === 0) emptyConfirmed++;
      }
      // Structured donation fields, all rows of an MP or none (one upsert sets the same columns on every row).
      try {
        const fields = rows.length ? await fetchDonationFields(memberId) : new Map();
        // No donor entries at all leaves saved values alone, in case the Interests API answered with nothing.
        if (fields.size) for (const r of rows) Object.assign(r, fields.get(r.interest_id) || Object.fromEntries(DONATION_KEYS.map((k) => [k, null])));
        donationRows += rows.filter((r) => r.donor_name).length;
      } catch (e) {
        donationFailures++;
      }
      const have = storedBy.get(memberId) || new Set();
      const live = new Set(rows.map((r) => r.interest_id));
      const newOnes = rows.filter((r) => !have.has(r.interest_id)).length;
      const gone = [...have].filter((id) => !live.has(id));
      added += newOnes; kept += rows.length - newOnes; ended += gone.length;
      if (newOnes || gone.length) changedMps.push(`${memberId} (+${newOnes} / -${gone.length})`);

      if (WRITE) {
        if (rows.length) {
          const { error } = await db.from('mp_registered_interests').upsert(rows, { onConflict: 'member_id,interest_id' });
          if (error) throw new Error(`upsert: ${error.message}`);
        }
        if (gone.length) {
          for (let i = 0; i < gone.length; i += 200) {
            const { error } = await db.from('mp_registered_interests').update({ is_current: false })
              .eq('member_id', memberId).in('interest_id', gone.slice(i, i + 200));
            if (error) throw new Error(`mark ended: ${error.message}`);
          }
        }
      }
      ok++;
    } catch (e) {
      failed++;
      if (failures.length < 20) failures.push(`${memberId}: ${e.message}`);
    }
    await sleep(THROTTLE_MS);
  }

  console.log(`MPs read: ${ok}; failed: ${failed}${failures.length ? `\n  ${failures.join('\n  ')}` : ''}`);
  console.log(`entries: ${added} new, ${kept} still on the register, ${ended} no longer on it${WRITE ? ' (kept, set not current)' : ''}`);
  console.log(`MPs whose register is now empty (confirmed twice): ${emptyConfirmed}`);
  console.log(`entries with donor details from the Interests API: ${donationRows}; MPs whose details could not be read (left as saved): ${donationFailures}`);
  console.log(`MPs with changes: ${changedMps.length}${changedMps.length ? ` e.g. ${changedMps.slice(0, 15).join(', ')}` : ''}`);
  if (failed > targets.length * 0.05) { console.error(`STOPPED: ${failed} of ${targets.length} MPs failed`); process.exit(1); }
  console.log(WRITE ? 'WRITE complete.' : 'DRY RUN complete. Nothing was written.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
