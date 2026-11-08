// Where scripts/sync-career-parliament.ts writes the entries it left out (owner, PCL1 and PR1a, 8 Nov 2026). A real run
// writes excluded-records-<date>.json; a dry run writes excluded-records-<date>-dry-run.json beside it, so a dry run never
// replaces the real run's file. The folder is the owner's Claude outputs/career folder when it exists (local runs), else
// the working directory (GitHub Actions, which keeps it as a run artifact).
import path from 'node:path';

export function excludedRecordsFile(dir: string, date: string, dryRun: boolean): string {
  return path.join(dir, `excluded-records-${date}${dryRun ? '-dry-run' : ''}.json`);
}
