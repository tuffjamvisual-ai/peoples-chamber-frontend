// Titles and letters after a name, for matching a person's name to an MP (owner approved, Cowork ENTRY 361, 19 Nov
// 2026: "they should link as many mps start with Mr"). One rule for every place that links a name to an MP by its text
// (people pages, special advisers, Read next, an MP's own page, the Standards Committee sync). Used for matching only:
// the name shown stays as published. Plain JavaScript (CommonJS) so the scripts in scripts/ share it with the site, as
// lib/appg-dataset.js is shared.
//
// - Leading titles are left out: The, Rt Hon, Right Honourable, Hon, Mr, Mrs, Ms, Miss, Mx, Dr, Doctor, Sir, Dame,
//   Professor, Prof, Rev, Reverend, Cllr, Councillor ("The Rt Ed Miliband MP": a source can drop the Hon).
// - Letters after the name are left out: MP, KC, QC, PC, CBE, OBE, MBE, KBE, DBE, CB, KCB, GCB, CMG, KCMG, FRS, FRSE, DL,
//   JP, BEM, CVO, KCVO, LVO, MVO, VC, GC, DSO, MC, TD, VR, KSG.
// - A peer's title (Lord, Lady, Baroness, Baron, Viscount, Earl, Countess, Marquess, Duke ...) is kept, and such a name
//   never links to an MP (isPeerName).
// - Letters after a name that do not include MP mean the person is not presented as an MP ("Gareth Davies CB", head of
//   the National Audit Office, is not Gareth Davies MP): callers matching GOV.UK people use notPresentedAsMp.

const LEAD = /^(?:(?:the|rt\.?|right|hon\.?|honourable|mr|mrs|ms|miss|mx|dr|doctor|sir|dame|professor|prof|rev(?:erend)?|cllr|councillor)\.?\s+)+/i;
const LETTERS = ['mp', 'kc', 'qc', 'pc', 'cbe', 'obe', 'mbe', 'kbe', 'dbe', 'cb', 'kcb', 'gcb', 'cmg', 'kcmg', 'frs', 'frse', 'dl', 'jp', 'bem', 'cvo', 'kcvo', 'lvo', 'mvo', 'vc', 'gc', 'dso', 'mc', 'td', 'vr', 'ksg'];
const TRAIL = new RegExp(`(?:,?\\s+(?:${LETTERS.join('|')})\\.?)+\\s*$`, 'i');
const PEER = /^(?:the\s+)?(?:(?:rt\.?|right|hon\.?|honourable)\.?\s+)*(?:lord|lady|baroness|baron|viscount|viscountess|earl|countess|marquess|marchioness|duke|duchess)\b/i;

/** The name without leading titles and letters after it, as printed ("The Rt Hon Sir Keir Starmer KCB KC MP" -> "Keir Starmer"). */
function bareName(name) {
  return String(name || '').trim().replace(LEAD, '').replace(TRAIL, '').replace(/\s+/g, ' ').trim();
}

/** Letters only, lower case, accents removed: the key two spellings of one name share ("Thérèse Coffey", "Therese Coffey"). */
function nameMatchKey(name) {
  return bareName(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

/** A peer's title: such a name is never linked to an MP. */
function isPeerName(name) {
  return PEER.test(String(name || '').trim());
}

/** Letters after the name, none of them MP ("Gareth Davies CB"): not presented as an MP. */
function notPresentedAsMp(name) {
  const m = String(name || '').trim().match(TRAIL);
  return !!m && !/\bmp\b/i.test(m[0]);
}

/**
 * The one MP a name stands for, or null. candidates: MPs whose name or display name has the same nameMatchKey. A peer
 * never matches. Several people of that name: the single current MP among them, else none (never a guess).
 */
function pickMp(name, candidates) {
  if (isPeerName(name)) return null;
  const byId = new Map();
  for (const c of candidates || []) if (c && c.member_id != null) byId.set(c.member_id, c);
  const all = [...byId.values()];
  if (all.length === 1) return all[0];
  const current = all.filter((c) => c.current_member);
  return current.length === 1 ? current[0] : null;
}

module.exports = { bareName, nameMatchKey, isPeerName, notPresentedAsMp, pickMp };
