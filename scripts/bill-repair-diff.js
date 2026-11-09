// The weekly bills repair's change test (JF1b, audit JA1, 9 Nov 2026). The repair used to re-read every bill's detail
// (about 4,073 requests) and reset every bill's stages each Sunday, to catch the rare bill the daily sync misses (an
// update time Parliament set earlier than one we hold). The Bills API list already carries each bill's lastUpdate, title,
// stage and flags (20 a page, about 204 requests for every bill), so the repair compares those with the stored row and
// re-reads, re-saves and re-stages only a bill that is new to us or differs. Pure, so it is unit tested.
'use strict';

// The Bills API gives lastUpdate without a timezone; the database stores it as UTC (sync-bills-incremental.js apiTime).
const apiTime = (s) => (s ? Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`) : NaN);
const clean = (s) => { const t = typeof s === 'string' ? s.trim() : ''; return t || null; };
const placeholderTitle = (t) => !/[A-Za-z]/.test(t.replace(/\bBill\s*$/i, ''));

// Why a listed bill needs re-reading, or null when its list row matches what is stored. held: the stored bill row
// (last_update, title, status, is_act, is_defeated, bill_withdrawn) or undefined.
function repairReason(listed, held) {
  if (!held) return 'new';
  const listedTime = apiTime(listed.lastUpdate);
  const heldTime = held.last_update ? Date.parse(held.last_update) : NaN;
  if (listedTime !== heldTime) return listedTime > heldTime || Number.isNaN(heldTime) ? 'updated after the stored lastUpdate' : 'lastUpdate earlier than the stored one';
  const t = clean(listed.shortTitle);
  const title = t && !placeholderTitle(t) ? t : 'Untitled Bill';
  if (title !== held.title && !(title === 'Untitled Bill' && held.title)) return 'title differs';
  const stage = clean(listed.currentStage && listed.currentStage.description);
  if ((stage || null) !== (held.status || null)) return 'stage differs';
  if (Boolean(listed.isAct) !== Boolean(held.is_act)) return 'Act flag differs';
  if (Boolean(listed.isDefeated) !== Boolean(held.is_defeated)) return 'defeated flag differs';
  if (Boolean(listed.billWithdrawn) !== Boolean(held.bill_withdrawn)) return 'withdrawn differs';
  return null;
}

module.exports = { repairReason, apiTime };
