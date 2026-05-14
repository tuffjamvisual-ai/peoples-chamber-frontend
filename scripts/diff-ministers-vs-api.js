// READ-ONLY diff between Parliament's GovernmentPosts API and our
// dept_ministers table. Reports who is in office per Parliament but not in
// our DB (likely new ministers), and who is in our DB but no longer in
// office per Parliament (likely resigned / reshuffled). Writes nothing.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const API_BASE = 'https://members-api.parliament.uk/api/Posts/GovernmentPosts';

async function fetchAllPosts() {
  // Endpoint pages with `skip`/`take`. Default take seems generous; loop just in case.
  const out = [];
  const TAKE = 100;
  for (let skip = 0; skip < 1000; skip += TAKE) {
    const res = await fetch(`${API_BASE}?skip=${skip}&take=${TAKE}`);
    if (!res.ok) throw new Error(`API ${res.status} at skip=${skip}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < TAKE) break;
  }
  return out;
}

(async () => {
  console.log('Fetching all government posts from Parliament API…');
  const posts = await fetchAllPosts();
  console.log(`  ${posts.length} posts returned\n`);

  // For each post find the current holder (endDate null).
  // memberId -> array of { role, postId }
  const apiHoldings = new Map();
  let unfilled = 0;
  for (const p of posts) {
    const v = p.value;
    if (!v) continue;
    const current = (v.postHolders || []).find((h) => h.endDate == null);
    if (!current) { unfilled++; continue; }
    const memberId = current.member?.value?.id;
    if (!memberId) continue;
    if (!apiHoldings.has(memberId)) apiHoldings.set(memberId, []);
    apiHoldings.get(memberId).push({ role: v.name, postId: v.id, name: current.member.value.nameDisplayAs });
  }
  console.log(`  posts currently held:   ${posts.length - unfilled}`);
  console.log(`  posts currently vacant: ${unfilled}`);
  console.log(`  distinct member_ids in API: ${apiHoldings.size}\n`);

  // Pull our dept_ministers rows (only those linked to a member_id).
  const { data: dm, error } = await supabase
    .from('dept_ministers')
    .select('id, member_id, name, role, salary_band, dept_slug')
    .not('member_id', 'is', null);
  if (error) { console.error(error); process.exit(1); }
  console.log(`dept_ministers (member_id-linked): ${dm.length}\n`);

  const dbByMember = new Map();
  for (const row of dm) {
    if (!dbByMember.has(row.member_id)) dbByMember.set(row.member_id, []);
    dbByMember.get(row.member_id).push(row);
  }

  // Diff
  const inApiNotDb = [];                  // new ministers
  const inDbNotApi = [];                  // resigned/reshuffled
  const apiMembersSet = new Set(apiHoldings.keys());
  const dbMembersSet = new Set(dbByMember.keys());

  for (const m of apiMembersSet) if (!dbMembersSet.has(m)) inApiNotDb.push(m);
  for (const m of dbMembersSet) if (!apiMembersSet.has(m)) inDbNotApi.push(m);

  // For members in both, check if any of their DB roles aren't held per API.
  const roleMismatch = [];
  for (const m of apiMembersSet) {
    if (!dbMembersSet.has(m)) continue;
    const apiRoles = new Set(apiHoldings.get(m).map((r) => r.role.toLowerCase()));
    const dbRoles = dbByMember.get(m).map((r) => r.role || '(null)');
    const orphans = dbRoles.filter((r) => !apiRoles.has(r.toLowerCase()));
    if (orphans.length) roleMismatch.push({ memberId: m, apiRoles: [...apiRoles], dbRoles, orphans });
  }

  console.log(`\n=== DIFF ===`);
  console.log(`In Parliament API but not in dept_ministers (likely NEW): ${inApiNotDb.length}`);
  for (const memberId of inApiNotDb) {
    const roles = apiHoldings.get(memberId);
    console.log(`  member_id ${memberId} (${roles[0].name})`);
    for (const r of roles) console.log(`    [${r.postId}] ${r.role}`);
  }

  console.log(`\nIn dept_ministers but no current post per API (likely RESIGNED): ${inDbNotApi.length}`);
  for (const memberId of inDbNotApi.slice(0, 50)) {
    const rows = dbByMember.get(memberId);
    console.log(`  member_id ${memberId} (${rows[0].name})`);
    for (const r of rows) console.log(`    [${r.dept_slug}] ${r.role || '(null)'} band=${r.salary_band || '-'}`);
  }
  if (inDbNotApi.length > 50) console.log(`  … and ${inDbNotApi.length - 50} more`);

  console.log(`\nMembers held in both but role-string differs: ${roleMismatch.length}`);
  for (const r of roleMismatch.slice(0, 20)) {
    console.log(`  member_id ${r.memberId}`);
    console.log(`    API now holds: ${r.apiRoles.join(' | ')}`);
    console.log(`    DB has rows for: ${r.dbRoles.join(' | ')}`);
    console.log(`    role rows in DB with no current API counterpart: ${r.orphans.join(' | ')}`);
  }
  if (roleMismatch.length > 20) console.log(`  … and ${roleMismatch.length - 20} more`);

  console.log(`\nNo writes performed. Use this report to decide next step.`);
})();
