// F02 check (read only): the question pages' people read now returns every MP and peer.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readAll } from '../../lib/read-all';
config({ path: '.env.local', quiet: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
(async () => {
  const peers = await readAll<{ member_id: number; is_current: boolean }>(() => db.from('peers'), { columns: 'member_id, name_display, is_current, end_date', orderBy: 'member_id', concurrency: 2, label: 'peers' });
  const mps = await readAll<{ member_id: number }>(() => db.from('mps'), { columns: 'member_id, display_name, name', orderBy: 'member_id', concurrency: 2, label: 'mps' });
  console.log(`peers read: ${peers.length} (current ${peers.filter((p) => p.is_current).length}); MPs read: ${mps.length}`);
})().catch((e) => { console.error('FAILED: ' + (e instanceof Error ? e.message : e)); process.exit(1); });
