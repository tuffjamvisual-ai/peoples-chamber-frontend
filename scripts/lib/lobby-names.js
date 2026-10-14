// Shared rules for organisation names in the lobbying index (scripts/build-lobbying-index.js
// and the hand-review tools). Keep any change here in step with lib/lobbying.ts.

'use strict';

// Normalised spelling used for matching: lower case, "&" as "and", curly quotes and
// punctuation removed, a leading "the" and trailing legal suffixes dropped, spaces collapsed.
// "The Confederation of British Industry (CBI) Ltd." -> "confederation of british industry cbi"
function normaliseName(raw) {
  let s = String(raw || '').toLowerCase();
  s = s.replace(/[’‘`]/g, "'").replace(/&/g, ' and ').replace(/\+/g, ' and ');
  s = s.replace(/'s\b/g, 's');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  s = s.replace(/^the\s+/, '');
  for (;;) {
    const t = s.replace(/\s+(ltd|limited|plc|llp|inc|incorporated|co)$/, '');
    if (t === s) break;
    s = t;
  }
  return s.replace(/\s+/g, ' ').trim();
}

// Splits one published "organisation" entry into the organisations it names.
// Semicolons, pipes and line breaks always separate organisations. Commas separate them
// too, except where the joined text is a known single name that contains a comma
// ("Department for Business, Energy and Industrial Strategy"), checked through `isKnown`.
function splitOrganisations(raw, isKnown) {
  const text = String(raw || '').trim();
  if (!text) return [];
  if (isKnown(normaliseName(text))) return [text];
  const out = [];
  for (const chunk of text.split(/\s*(?:;|\||\r?\n)\s*/)) {
    const c = chunk.trim();
    if (!c) continue;
    if (isKnown(normaliseName(c))) { out.push(c); continue; }
    const pieces = splitTopLevelCommas(c);
    let i = 0;
    while (i < pieces.length) {
      // Longest run of pieces, starting here, that is a known comma-containing name.
      let taken = 1;
      for (let j = pieces.length; j > i + 1; j--) {
        if (isKnown(normaliseName(pieces.slice(i, j).join(', ')))) { taken = j - i; break; }
      }
      const piece = pieces.slice(i, i + taken).join(', ').trim();
      i += taken;
      // "Road safety roundtable (Jaguar Land Rover, Thatcham Research, National Highways)":
      // a list inside one bracket. Split it only when at least one item is an organisation
      // already known, so a bracket that spells out a name ("USDAW (Union of Shop,
      // Distributive and Allied Workers)") stays whole.
      const list = taken === 1 ? bracketList(piece) : null;
      if (list && list.items.some((it) => isKnown(normaliseName(it)) || isKnown(normaliseName(stripBrackets(it))))) {
        if (list.label) out.push(list.label);
        for (const it of list.items) out.push(...splitOrganisations(it, isKnown));
      } else {
        out.push(piece);
      }
    }
  }
  return out.filter(Boolean);
}

// The text with its bracketed parts removed: "UK Export Finance (UKEF)" -> "UK Export Finance".
function stripBrackets(text) {
  return String(text).replace(/\s*[([][^)\]]*[)\]]\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// When a piece ends with a bracket that opens at the top level and holds a comma-separated
// list, returns the label before the bracket and the list's items; otherwise null.
function bracketList(piece) {
  const t = piece.trim();
  const last = t[t.length - 1];
  if (last !== ')' && last !== ']') return null;
  const open = last === ')' ? '(' : '[';
  let depth = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === last) depth++;
    else if (t[i] === open) {
      depth--;
      if (depth === 0) {
        const items = splitTopLevelCommas(t.slice(i + 1, -1));
        if (items.length < 2) return null;
        return { label: t.slice(0, i).trim(), items };
      }
    }
  }
  return null;
}

// Splits on commas that are not inside brackets, so "Universities UK (incl. Russell
// Group, MillionPlus)" stays one entry. Only brackets that are closed count: an opening
// bracket that is never closed ("Mayor of York (Combined Authority ,Met Office , ...") is
// treated as ordinary text, so the list after it is still split into its organisations.
function splitTopLevelCommas(text) {
  const chars = [...text];
  const inside = new Array(chars.length).fill(false);
  const stack = [];
  chars.forEach((ch, i) => {
    if (ch === '(' || ch === '[') stack.push(i);
    else if ((ch === ')' || ch === ']') && stack.length) {
      const start = stack.pop();
      for (let k = start + 1; k < i; k++) inside[k] = true;
    }
  });
  const parts = [];
  let cur = '';
  chars.forEach((ch, i) => {
    if (ch === ',' && !inside[i]) { parts.push(cur); cur = ''; } else cur += ch;
  });
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// URL slug for an organisation page.
function slugify(name) {
  return normaliseName(name).replace(/\s+/g, '-').slice(0, 80) || 'organisation';
}

module.exports = { normaliseName, splitOrganisations, splitTopLevelCommas, stripBrackets, slugify };
