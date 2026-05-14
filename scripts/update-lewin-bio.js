// Overwrites mp_biography.political_bio for member_id 5061 (Andrew Lewin)
// with the final cleaned text (one more hyphen removed:
// "over-calibrated" -> "overcalibrated"). Backs up the previous bio first.

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!SUPABASE_URL || !ANON_KEY) { console.error('env missing'); process.exit(1); }
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const MEMBER_ID = 5061;

const NEW_BIO = `Andrew Lewin, Labour MP for Welwyn Hatfield since July 2024, entered Parliament with one of the most symbolic wins of the general election. He defeated Grant Shapps, a senior Conservative cabinet minister who had held the seat for nearly two decades. Lewin won 19,877 votes to Shapps' 16,078, turning a long standing Tory seat red at the moment the Conservative machine was falling apart.

There is praise due. Lewin had fought the seat before and built a serious campaign rather than simply arriving during the Labour landslide and collecting the keys. He was selected by local Labour members in March 2023, giving him time to work the constituency properly before the election. That matters. Welwyn Hatfield was not just a target on a spreadsheet. It was the political home of a well known Conservative heavyweight. Taking it required organisation, persistence and credibility.

His background in housing communications also gives him useful relevance. Housing is one of the central pressures in places like Welwyn Hatfield. Affordability, planning, rented conditions, local development and the strain between growth and community identity all matter here. A politician who understands housing institutions and public messaging has some practical equipment for the job. His parliamentary questions have already touched on council housing acquisitions and Right to Buy homes being bought back by local authorities, which suggests a sensible policy interest rather than random backbench wandering.

But Lewin still looks more like a capable campaigner than a fully defined political figure. Defeating Shapps gave him a dramatic entrance, but dramatic entrances are not careers. Westminster is full of MPs who arrived on election night fireworks and then spent five years becoming quiet shapes in the voting lobby. The question now is whether Lewin can become known for something beyond being the man who beat Grant Shapps.

His political history also carries a slight risk of looking overcalibrated. He was once a Liberal Democrat candidate, then joined Labour after the coalition tuition fee row, later founding the pro European Remain Labour group during the Brexit years. None of that is disqualifying. It shows political engagement and some consistency on constitutional and European questions. But to more sceptical voters it may look like the CV of a polished political operator who has spent years looking for the right vehicle.

There is also the loyalty problem common to new Labour MPs. The Starmer era intake is disciplined, cautious and professionally messaged to within an inch of its life. Lewin risks blending into that smooth governing wallpaper unless he shows more independent edge. Voters in Welwyn Hatfield did not remove a Conservative minister just to receive a Labour press release with better formatting.

Overall, Andrew Lewin appears serious, organised and locally committed. He pulled off a major win, has relevant housing experience and seems active on constituency issues. The problem is that he has not yet shown a sharp enough political identity of his own. To last, he needs to turn the Shapps upset into substance. Otherwise, his career may be remembered less as the start of a major political voice and more as one of 2024's better election night trophies gathering dust on Labour's mantelpiece.`;

const sqlEsc = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

(async () => {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  const { data: existing } = await supabase
    .from('mp_biography')
    .select('political_bio')
    .eq('member_id', MEMBER_ID)
    .maybeSingle();

  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `mp_${MEMBER_ID}_bio_${stamp}.txt`);
  fs.writeFileSync(backupPath, existing?.political_bio || '(no prior bio)');
  console.log(`Previous bio (${(existing?.political_bio || '').length} chars) backed up to ${backupPath}`);

  // UPSERT — mp_biography keys on member_id. Insert if absent, update if present.
  const sql = `
    INSERT INTO mp_biography (member_id, political_bio)
    VALUES (${MEMBER_ID}, ${sqlEsc(NEW_BIO)})
    ON CONFLICT (member_id) DO UPDATE SET political_bio = EXCLUDED.political_bio;
  `;
  try {
    execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'pipe' });
  } catch (e) {
    console.error('psql failed:', e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
  }
  console.log(`Wrote new bio (${NEW_BIO.length} chars) for member_id ${MEMBER_ID}.`);

  const { data: after } = await supabase
    .from('mp_biography')
    .select('political_bio')
    .eq('member_id', MEMBER_ID)
    .single();
  console.log(`Verify: DB has ${after?.political_bio?.length || 0} chars. Starts: "${(after?.political_bio || '').slice(0, 70)}..."`);
})();
