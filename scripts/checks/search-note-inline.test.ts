// Security review H1 (owner approved 14 Nov 2026, COWORK-TO-T1 ENTRY 59): the search words written into /search's
// inline script cannot end the script or start HTML.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/search-note-inline.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { searchNoteInline, SEARCH_NOTE_JS } from '../../lib/search-note';

const ATTACKS = [
  '</script><img src=x onerror=alert(1)>',
  '</SCRIPT><script>alert(1)</script>',
  '<!--<script>',
  '"); alert(1); ("',
  'tax   credits  ',
];

test('the call holds no "<" at all, so nothing in q can close the script or open a tag', () => {
  for (const q of ATTACKS) {
    const call = searchNoteInline(q).slice(SEARCH_NOTE_JS.length);
    assert.ok(!call.includes('<'), call);
    assert.ok(!/<\/script/i.test(searchNoteInline(q).slice(SEARCH_NOTE_JS.length)));
  }
});

test('the script still passes the exact words to the note', () => {
  for (const q of [...ATTACKS, 'housing benefit', '']) {
    let got: unknown = null;
    vm.runInNewContext(searchNoteInline(q).slice(SEARCH_NOTE_JS.length), { window: { __ogNoteSearch: (x: unknown) => { got = x; } } });
    assert.equal(got, q);
  }
});
