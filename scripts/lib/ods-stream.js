// Streaming reader for large .ods spreadsheets.
//
// Why: SheetJS (xlsx) builds the whole content.xml as one string, and the
// Government Grants Register ODS (~33 MB zipped) expands past V8's maximum
// string length ("Cannot create a string longer than 0x1fffffe8
// characters", hit 2026-10-11). This reads the zip's content.xml through a
// streaming inflate and a small incremental XML tokenizer, emitting one row
// at a time, so memory stays flat however big the sheet is.
//
// Handles: table:table (sheet name), table:table-row (+ number-rows-repeated),
// table:table-cell / table:covered-table-cell (+ number-columns-repeated),
// office:value for numeric/currency/percentage cells, text:p / text:s /
// text:tab / text:line-break text, and XML entities. Repeated EMPTY cells at
// the end of a row and repeated EMPTY rows are not expanded (ODS files often
// pad to 16,384 columns / a million rows).
//
// Usage:
//   const { streamOdsRows } = require('./lib/ods-stream');
//   await streamOdsRows(buffer, (sheetName, cells, rowIndex) => { ... });

const zlib = require('zlib');
const { StringDecoder } = require('string_decoder');

function findZipEntry(buf, wanted) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a zip (no end of central directory)');
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = buf.readUInt16LE(eocd + 10);
  let p = cdOffset;
  for (let n = 0; n < entries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad central directory');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    if (name === wanted) {
      const lnameLen = buf.readUInt16LE(localOff + 26);
      const lextraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lnameLen + lextraLen;
      return { method, data: buf.slice(start, start + compSize) };
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} not found in zip`);
}

function decodeEntities(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) => {
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    if (e[1] === 'x') return String.fromCodePoint(parseInt(e.slice(2), 16));
    return String.fromCodePoint(parseInt(e.slice(1), 10));
  });
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name.replace(':', '\\:')}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : null;
}

async function streamOdsRows(buffer, onRow) {
  const entry = findZipEntry(buffer, 'content.xml');
  const inflate = entry.method === 8 ? zlib.createInflateRaw() : null;
  const decoder = new StringDecoder('utf8');

  let pending = '';
  let sheet = null;
  let row = null;          // array of cell values
  let rowRepeat = 1;
  let rowIndex = 0;        // per sheet
  let cell = null;         // { value, text, repeat, numeric }
  let inP = false;
  let pCount = 0;

  function endCell() {
    if (!row || !cell) return;
    const v = cell.numeric !== null ? cell.numeric : cell.text;
    const isEmpty = v === '' || v === null;
    // Repeated empty cells: remember them lazily (only materialise if a
    // non-empty cell follows), so trailing padding never expands.
    if (isEmpty) row.pendingEmpty = (row.pendingEmpty || 0) + cell.repeat;
    else {
      if (row.pendingEmpty) { for (let i = 0; i < row.pendingEmpty; i++) row.cells.push(''); row.pendingEmpty = 0; }
      for (let i = 0; i < Math.min(cell.repeat, 1000); i++) row.cells.push(v);
    }
    cell = null;
  }

  function endRow() {
    if (!row) return;
    const cells = row.cells;
    const empty = cells.length === 0;
    if (!empty) {
      for (let i = 0; i < Math.min(rowRepeat, 1000); i++) onRow(sheet, cells, rowIndex++);
    } else {
      rowIndex += Math.min(rowRepeat, 1); // blank rows: count once, don't expand padding
    }
    row = null;
  }

  function handleTag(tag) {
    if (tag.startsWith('</')) {
      const name = tag.slice(2, -1).trim();
      if (name === 'text:p') { inP = false; }
      else if (name === 'table:table-cell' || name === 'table:covered-table-cell') endCell();
      else if (name === 'table:table-row') endRow();
      else if (name === 'table:table') { sheet = null; }
      return;
    }
    if (tag.startsWith('<?') || tag.startsWith('<!')) return;
    const selfClosing = tag.endsWith('/>');
    const nameEnd = tag.search(/[\s/>]/, 1);
    const name = tag.slice(1, nameEnd === -1 ? undefined : nameEnd);
    if (name === 'table:table') { sheet = attr(tag, 'table:name'); rowIndex = 0; }
    else if (name === 'table:table-row') {
      row = { cells: [], pendingEmpty: 0 };
      rowRepeat = Number(attr(tag, 'table:number-rows-repeated') || 1);
      if (selfClosing) endRow();
    } else if (name === 'table:table-cell' || name === 'table:covered-table-cell') {
      const t = attr(tag, 'office:value-type');
      const val = attr(tag, 'office:value');
      cell = {
        text: '',
        numeric: (t === 'float' || t === 'currency' || t === 'percentage') && val !== null ? Number(val) : null,
        repeat: Number(attr(tag, 'table:number-columns-repeated') || 1),
      };
      pCount = 0;
      if (selfClosing) endCell();
    } else if (name === 'text:p') {
      if (cell) { if (pCount++ > 0) cell.text += '\n'; }
      inP = !selfClosing;
    } else if (name === 'text:s' && cell && inP) {
      cell.text += ' '.repeat(Number(attr(tag, 'text:c') || 1));
    } else if ((name === 'text:tab') && cell && inP) cell.text += '\t';
    else if (name === 'text:line-break' && cell && inP) cell.text += '\n';
  }

  function consume(chunk, final) {
    pending += chunk;
    let i = 0;
    while (true) {
      const lt = pending.indexOf('<', i);
      if (lt < 0) {
        if (cell && inP) cell.text += decodeEntities(pending.slice(i));
        i = pending.length;
        break;
      }
      if (lt > i && cell && inP) cell.text += decodeEntities(pending.slice(i, lt));
      const gt = pending.indexOf('>', lt);
      if (gt < 0) { i = lt; break; } // incomplete tag: wait for more data
      handleTag(pending.slice(lt, gt + 1));
      i = gt + 1;
    }
    // Keep only the unconsumed tail. Text between tags was already appended;
    // an incomplete entity at the very end is rare and only affects one char.
    pending = pending.slice(i);
    if (final && pending) pending = '';
  }

  if (!inflate) { consume(entry.data.toString('utf8'), true); return; }

  await new Promise((resolve, reject) => {
    inflate.on('data', (d) => { try { consume(decoder.write(d), false); } catch (e) { reject(e); } });
    inflate.on('end', () => { try { consume(decoder.end(), true); resolve(); } catch (e) { reject(e); } });
    inflate.on('error', reject);
    inflate.end(entry.data);
  });
}

module.exports = { streamOdsRows };
