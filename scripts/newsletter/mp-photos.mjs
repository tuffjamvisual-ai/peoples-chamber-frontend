// Newsletter caricatures (T1-NLDESIGN, owner approved 14 Nov 2026, COWORK-TO-T1 ENTRY 71, "always caricatures"): for
// each Members API id given, checks the name in the Members API, reads the site's own caricature
// (Supabase photos/mps/<id>.webp, the photo on the opengovt profile) and writes the FULL picture, not cropped, as a
// 168 by 168 JPEG to public/newsletter/mps/<id>.jpg (shown at 84 by 84 in the polaroid frame, ENTRY 72; JPEG because
// Outlook cannot show webp). Push the new files, then name the people in the send:
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
const SIZE = 168;
for (const id of ids) {
  const m = await fetch(`https://members-api.parliament.uk/api/Members/${id}`);
  const name = m.ok ? (await m.json()).value?.nameDisplayAs : null;
  await new Promise((r) => setTimeout(r, 1000));
  const res = await fetch(`${base}/storage/v1/object/public/photos/mps/${id}.webp`);
  if (!res.ok) { console.log(`${id} ${name ?? '(not in the Members API)'}: no caricature (${res.status}); no picture`); continue; }
  // The whole picture (the caricatures are square), on the frame's off-white where it has transparency.
  const img = await sharp(Buffer.from(await res.arrayBuffer())).resize(SIZE, SIZE, { fit: 'contain', background: '#fbf8f0' }).flatten({ background: '#fbf8f0' }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  fs.writeFileSync(path.join(out, `${id}.jpg`), img);
  console.log(`${id} ${name}: public/newsletter/mps/${id}.jpg (${img.length} bytes)`);
  await new Promise((r) => setTimeout(r, 1000));
}
