// Database disk warning. Read by /api/monitor-freshness every day at 16:00.
//
// The Supabase project is on the Pro plan with the spend cap on, so the disk is
// fixed at 8 GB: it cannot grow past that. If disk use reaches 95% (about 7.6 GB)
// the project switches to read-only and every sync stops saving data. Supabase
// sends no warning before that happens, so this check does.
//
// Disk use here = database size + WAL (both count towards disk). Supabase's own
// disk figure also includes some system logs, so real use is slightly higher;
// the 7 GB urgent level leaves room for that.
//
// If the plan or spend cap changes, update DISK_LIMIT_GB.

import { supabaseAdmin } from '@/lib/supabase-admin';

const GB = 1024 ** 3;

export const DISK_LIMIT_GB = 8;    // Pro plan disk with the spend cap on
export const WARNING_GB = 5;       // first warning email
export const URGENT_GB = 7;        // urgent warning email
export const READ_ONLY_PCT = 95;   // Supabase switches to read-only at this % of disk

export type DiskLevel = 'ok' | 'warning' | 'urgent';

export interface DatabaseSize {
  databaseGb: number;
  walGb: number | null;    // null when the WAL size couldn't be read
  usedGb: number;          // database + WAL
  limitGb: number;
  readOnlyAtGb: number;
  usedPct: number;
  headroomGb: number;      // room left before the read-only point
  level: DiskLevel;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Returns null if the size couldn't be read (the monitor reports that, never throws).
export async function getDatabaseSize(): Promise<{ size: DatabaseSize | null; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_database_size');
    if (error) return { size: null, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.database_bytes == null) return { size: null, error: 'no size returned' };

    const databaseGb = Number(row.database_bytes) / GB;
    const walGb = row.wal_bytes == null ? null : Number(row.wal_bytes) / GB;
    const usedGb = databaseGb + (walGb ?? 0);
    const readOnlyAtGb = DISK_LIMIT_GB * (READ_ONLY_PCT / 100);
    const level: DiskLevel = usedGb >= URGENT_GB ? 'urgent' : usedGb >= WARNING_GB ? 'warning' : 'ok';

    return {
      size: {
        databaseGb: round2(databaseGb),
        walGb: walGb == null ? null : round2(walGb),
        usedGb: round2(usedGb),
        limitGb: DISK_LIMIT_GB,
        readOnlyAtGb: round2(readOnlyAtGb),
        usedPct: Math.round((usedGb / DISK_LIMIT_GB) * 1000) / 10,
        headroomGb: round2(readOnlyAtGb - usedGb),
        level,
      },
    };
  } catch (e) {
    return { size: null, error: (e as Error).message };
  }
}
