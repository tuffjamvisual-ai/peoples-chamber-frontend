// Writes the archive's dataset names and record counts (Cowork ENTRY 480 PART A) to a small JSON file that
// archive-server.mjs reads at start, because counting them reads the whole 22 GB file (about two minutes). Run once after
// the SQLite file changes, then restart the service. Read only.
//   node scripts/archive/list-datasets.mjs [--db <file.sqlite>] > scripts/archive/datasets.json
import { DatabaseSync } from 'node:sqlite';
const args = process.argv.slice(2);
const file = args.includes('--db') ? args[args.indexOf('--db') + 1] : '/Volumes/EDGE_SSD/opengovt-index/opengovt-archive.sqlite';
const db = new DatabaseSync(file, { readOnly: true });
const rows = db.prepare('SELECT dataset AS name, count(*) AS records FROM docs GROUP BY dataset ORDER BY records DESC').all();
process.stdout.write(JSON.stringify({ counted_at: new Date().toISOString(), datasets: rows.map((r) => ({ name: String(r.name), records: Number(r.records) })) }, null, 1) + '\n');
db.close();
