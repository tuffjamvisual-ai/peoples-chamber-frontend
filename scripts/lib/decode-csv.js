'use strict';
// A CSV's bytes as text (owner, 5 Nov 2026). The Registrar's April to June 2026 file is Windows-1252, where 0x96 is an en
// dash and 0xFC is "ü"; read as UTF-8 each became U+FFFD. Valid UTF-8 is read as UTF-8; anything else as Windows-1252.
function decodeCsv(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}
module.exports = { decodeCsv };
