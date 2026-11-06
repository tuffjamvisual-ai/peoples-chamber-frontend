// Database disk warning. Read by /api/monitor-freshness every day at 16:00.
//
// The Supabase spend cap was turned off on 6 Nov 2026 (owner), so on the Pro plan the disk grows by itself: by 50 per cent when it reaches 90 per cent full (8 GB to 12 GB).
// Supabase only makes the project read only at 95 per cent if it has used up its allowed resizes. https://supabase.com/docs/guides/platform/database-size
// Each increase costs money, so this warns when use passes 85 per cent of the current disk, and again whenever the disk has grown.
//
// The disk's size and use come from Supabase's own metrics for the /data volume, so they follow any increase. A disk sold as 8 GB shows about 7.78 GB there, after the file
// system's share. If the metrics can't be read, use falls back to database + WAL and the size to 8 GB, and the email says so.

import { supabaseAdmin } from '@/lib/supabase-admin';

const GB = 1024 ** 3;

export const WARN_PCT = 85;           // warning email above this share of the current disk
const FALLBACK_DISK_GB = 8;           // only when Supabase's metrics can't be read
const GROWTH_CURSOR = 'disk:size';    // sync_cursor row holding the size seen at the last run

export type DiskLevel = 'ok' | 'warning';

export interface DatabaseSize {
  databaseGb: number;
  walGb: number | null;    // null when the WAL size couldn't be read
  usedGb: number;          // Supabase's figure for the disk; database + WAL if that couldn't be read
  diskGb: number;          // the disk's current size
  diskFromSupabase: boolean;
  usedPct: number;
  level: DiskLevel;
  grew: { fromGb: number; toGb: number } | null;   // the disk grew since the last run, a day ago
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// node_filesystem_* lines for the /data volume, from Supabase's metrics endpoint. Null if they can't be read; never throws.
async function diskFromMetrics(): Promise<{ sizeBytes: number; usedBytes: number } | null> {
  try {
    const key = process.env.SUPABASE_SECRET_KEY;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!key || !base) return null;
    const res = await fetch(`${base}/customer/v1/privileged/metrics`, {
      headers: { Authorization: `Basic ${Buffer.from(`service_role:${key}`).toString('base64')}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const read = (name: string) => {
      const line = text.split('\n').find((l) => l.startsWith(`${name}{`) && l.includes('mountpoint="/data"'));
      const value = line ? Number(line.slice(line.lastIndexOf(' ') + 1)) : NaN;
      return Number.isFinite(value) ? value : null;
    };
    const sizeBytes = read('node_filesystem_size_bytes');
    const availBytes = read('node_filesystem_avail_bytes');
    if (!sizeBytes || availBytes == null) return null;
    return { sizeBytes, usedBytes: sizeBytes - availBytes };
  } catch {
    return null;
  }
}

// Has the disk grown since the last run? Keeps the size in sync_cursor, except on a dry run. A growth is reported once, by the run that first sees it.
async function growthSinceLastRun(sizeBytes: number, dry: boolean): Promise<DatabaseSize['grew']> {
  const { data } = await supabaseAdmin.from('sync_cursor').select('cursor').eq('route', GROWTH_CURSOR).maybeSingle();
  const before = Number((data?.cursor as { sizeBytes?: number } | null)?.sizeBytes) || null;
  if (!dry && before !== sizeBytes) {
    await supabaseAdmin.from('sync_cursor').upsert({ route: GROWTH_CURSOR, cursor: { sizeBytes }, updated_at: new Date().toISOString() }, { onConflict: 'route' });
  }
  return before && sizeBytes > before * 1.01 ? { fromGb: round2(before / GB), toGb: round2(sizeBytes / GB) } : null;
}

// Returns null if the size couldn't be read (the monitor reports that, never throws).
export async function getDatabaseSize(dry = false): Promise<{ size: DatabaseSize | null; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_database_size');
    if (error) return { size: null, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.database_bytes == null) return { size: null, error: 'no size returned' };

    const databaseGb = Number(row.database_bytes) / GB;
    const walGb = row.wal_bytes == null ? null : Number(row.wal_bytes) / GB;
    const disk = await diskFromMetrics();
    const usedGb = disk ? disk.usedBytes / GB : databaseGb + (walGb ?? 0);
    const diskGb = disk ? disk.sizeBytes / GB : FALLBACK_DISK_GB;
    const usedPct = (usedGb / diskGb) * 100;

    return {
      size: {
        databaseGb: round2(databaseGb),
        walGb: walGb == null ? null : round2(walGb),
        usedGb: round2(usedGb),
        diskGb: round2(diskGb),
        diskFromSupabase: !!disk,
        usedPct: Math.round(usedPct * 10) / 10,
        level: usedPct > WARN_PCT ? 'warning' : 'ok',
        grew: disk ? await growthSinceLastRun(disk.sizeBytes, dry) : null,
      },
    };
  } catch (e) {
    return { size: null, error: (e as Error).message };
  }
}

// The email's wording, apart from its sending.
export function databaseSizeMessage(size: DatabaseSize): { headline: string; lines: string[] } {
  const gb = (n: number) => `${n.toFixed(2)} GB`;
  const headline = size.grew
    ? `Database disk grew from ${gb(size.grew.fromGb)} to ${gb(size.grew.toGb)}`
    : `Database disk at ${size.usedPct} per cent of ${gb(size.diskGb)}`;
  const lines = [
    `Disk used: ${gb(size.usedGb)} of ${gb(size.diskGb)} (${size.usedPct} per cent).`,
    ...(size.grew ? [`The disk grew in the last 24 hours, from ${gb(size.grew.fromGb)} to ${gb(size.grew.toGb)}. This is a paid increase.`] : []),
    `Database: ${gb(size.databaseGb)}. WAL: ${size.walGb == null ? 'could not be read' : gb(size.walGb)}.`,
    'The disk grows automatically by 50 per cent when it reaches 90 per cent full. Supabase only makes the project read only at 95 per cent if it has used up its allowed resizes.',
    ...(size.level === 'warning' ? [`Use has passed ${WARN_PCT} per cent of the current disk size. The site keeps running, but the next increase is paid for. Free up space if you want to avoid it.`] : []),
    ...(size.diskFromSupabase ? [] : [`The disk size could not be read from Supabase, so this assumes ${FALLBACK_DISK_GB} GB and counts the database and WAL only.`]),
  ];
  return { headline, lines };
}
