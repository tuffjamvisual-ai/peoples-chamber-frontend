// Newsletter caricatures (T1-NLDESIGN, owner approved 14 Nov 2026, COWORK-TO-T1 ENTRY 71, "always caricatures"): for
// each Members API id given, checks the name in the Members API, reads the site's own caricature
// (Supabase photos/mps/<id>.webp, the photo on the opengovt profile) and writes a round 96 by 96 PNG with transparent
// corners to public/newsletter/mps/<id>.png (shown at 48 by 48; PNG because Outlook cannot show webp; round in every
// mail app, as the corners are transparent). Push the new files, then name the people in the send:
//   node scripts/newsletter/mp-photos.mjs 4858 1427 5361
//   node scripts/newsletter/send-issue.mjs <issue.md> --date ... --people "Danny Kruger=4858,Andy Burnham=1427"
// A person with no caricature gets no file, and so no picture.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.join(process.cwd(), '.env.local'), quiet: true });
const sharp = require('sharp');
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ids = process.argv.slice(2).filter((a) => /^\d{1,6}$/.test(a));
if (!ids.length || !base) { console.error('Give Members API ids; NEXT_PUBLIC_SUPABASE_URL must be in .env.local.'); process.exit(1); }
const out = path.join(process.cwd(), 'public/newsletter/mps');
fs.mkdirSync(out, { recursive: true });
const SIZE = 96;
const mask = Buffer.from(`<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`);
for (const id of ids) {
  const m = await fetch(`https://members-api.parliament.uk/api/Members/${id}`);
  const name = m.ok ? (await m.json()).value?.nameDisplayAs : null;
  await new Promise((r) => setTimeout(r, 1000));
  const res = await fetch(`${base}/storage/v1/object/public/photos/mps/${id}.webp`);
  if (!res.ok) { console.log(`${id} ${name ?? '(not in the Members API)'}: no caricature (${res.status}); no picture`); continue; }
  const img = await sharp(Buffer.from(await res.arrayBuffer())).resize(SIZE, SIZE, { fit: 'cover', position: 'top' }).composite([{ input: mask, blend: 'dest-in' }]).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(out, `${id}.png`), img);
  console.log(`${id} ${name}: public/newsletter/mps/${id}.png (${img.length} bytes)`);
  await new Promise((r) => setTimeout(r, 1000));
}
