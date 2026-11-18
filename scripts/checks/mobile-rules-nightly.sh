#!/bin/bash
# MOB-RULES nightly (owner approved 17 Nov 2026, Cowork ENTRY 260 item 3 and 3a, ENTRY 283): the mobile rules check on
# every page type of a local build of origin/main, at 02:30 London, report only. The report goes to
# Claude outputs/audit/mobile-rules-nightly/<date>.md and one STATUS line (page types, passing, failing, which).
# Skipped on Sunday mornings: the weekly sweep (MOB-SWEEP, Saturday 22:30 to Sunday 08:30) covers every page that night.
# Run by launchd through a launcher kept outside any checkout (scripts/git-hooks/README.md, the nightly section), which runs
# origin/main's copy of this file, so a branch switch in the checkout never changes it. Like the push checks it builds in
# its own worktree (the checkout only lends git objects, node_modules, the build cache and .env.local), with a copy of the
# last check build's data cache (entries over 24 hours dropped), and it holds PUSH.lock while it runs so that it never
# builds at the same time as a push's checks. Reads only; one page load a second.
set -u
REPO=/Users/johnnybot/peoples-chamber-frontend
C="/Volumes/EDGE_SSD/opengovt-work/Claude outputs"
ST="$C/STATUS.md"; LOCK="$C/PUSH.lock"
PORT=3197
uk() { TZ=Europe/London date '+%d %b %Y %H:%M' | sed 's/^0//'; }
DAY=$(TZ=Europe/London date +%F)
[ -d "$C" ] || { echo "$(date) the SSD is not mounted; not run"; exit 0; }
if [ "$(TZ=Europe/London date +%u)" = 7 ]; then echo "$(uk) GMT T1 NIGHTLY MOB-RULES $DAY: skipped (Sunday morning, the weekly sweep covers every page)" >> "$ST"; exit 0; fi

# Wait up to 60 minutes for a push to finish, then take the lock (released by the cleanup below, and only by it).
got=0
for i in $(seq 1 60); do if mkdir "$LOCK" 2>/dev/null; then got=1; break; fi; sleep 60; done
[ $got = 1 ] || { echo "$(uk) GMT T1 NIGHTLY MOB-RULES $DAY: skipped (a push held PUSH.lock for 60 minutes)" >> "$ST"; exit 0; }
echo "mobile-rules-nightly $DAY" > "$LOCK/owner.txt"

# A run killed outright (SIGKILL) skips its cleanup: clear what an earlier run left (its .env.local and worktree; T2, 03:28).
for old in /Volumes/EDGE_SSD/opengovt-work/claude-tmp/rules-nightly-*; do
  [ -d "$old" ] || continue
  rm -f "$old/.env.local"; (cd "$REPO" && git worktree remove --force "$old" >/dev/null 2>&1); rm -rf "$old"
done
(cd "$REPO" && git worktree prune >/dev/null 2>&1)
WT=$(mktemp -d /Volumes/EDGE_SSD/opengovt-work/claude-tmp/rules-nightly-XXXX)
SERVER=""
cleanup() {
  [ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null
  lsof -ti tcp:$PORT 2>/dev/null | xargs kill 2>/dev/null
  rm -f "$WT/.env.local"
  (cd "$REPO" && git worktree remove --force "$WT" >/dev/null 2>&1; git worktree prune >/dev/null 2>&1); rm -rf "$WT"
  rm -rf "$LOCK"
}
trap cleanup EXIT
fail() { echo "$(uk) GMT T1 NIGHTLY MOB-RULES $DAY: could not run ($1)" >> "$ST"; exit 1; }

cd "$REPO" || fail "no checkout"
git fetch -q origin main || fail "git fetch"
SHA=$(git rev-parse --short=8 origin/main)
rmdir "$WT"; git worktree add -q --detach "$WT" origin/main || fail "worktree"
cp -cR "$REPO/node_modules" "$WT/node_modules" 2>/dev/null || cp -R "$REPO/node_modules" "$WT/node_modules"
cp "$REPO/.env.local" "$WT/.env.local"
# The checkout's node_modules are its own branch's (the owner's branch has Next.js 16.4.2; main has 16.4.5 since 69455626),
# and next build refuses a Next.js with a known advisory (SecurityFatalError). Bring the copy to main's lockfile first.
(cd "$WT" && npm install --no-audit --no-fund --ignore-scripts > /dev/null 2>&1) || fail "npm install"
[ -z "$(cd "$WT" && git status --porcelain -- package.json package-lock.json)" ] || fail "npm install changed the lockfile"
if [ -d "$REPO/.next/cache/turbopack" ]; then mkdir -p "$WT/.next/cache"; cp -cR "$REPO/.next/cache/turbopack" "$WT/.next/cache/turbopack" 2>/dev/null || true; fi
KEEP=${FETCH_CACHE_KEEP:-$HOME/opengovt-backup/fetch-cache-last}
if [ -d "$KEEP" ]; then
  mkdir -p "$WT/.next/cache"; cp -cR "$KEEP" "$WT/.next/cache/fetch-cache" 2>/dev/null || cp -R "$KEEP" "$WT/.next/cache/fetch-cache"
  (cd "$WT" && node --input-type=module -e "const { purge } = await import('./scripts/fetch-cache-purge.mjs'); purge('.next/cache/fetch-cache', { olderThanHours: 24 });") || true
fi
cd "$WT" || fail "worktree"
RECOMMENDATIONS_PUBLIC=1 npx next build > /dev/null 2>&1 || fail "the build of $SHA failed"
RECOMMENDATIONS_PUBLIC=1 npx next start -p $PORT > /dev/null 2>&1 &
SERVER=$!
for i in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$PORT/support" && break; sleep 1; done

OUT="$C/audit/mobile-rules-nightly/$DAY"
mkdir -p "$OUT"
node scripts/checks/mobile-rules.mjs --base "http://localhost:$PORT" --out "$OUT" --report-only > "$OUT/run.log" 2>&1 || fail "the check stopped (see $OUT/run.log)"
cp "$OUT/report.md" "$C/audit/mobile-rules-nightly/$DAY.md"
SUMMARY=$(node --input-type=module -e "
import fs from 'fs';
const r = JSON.parse(fs.readFileSync('$OUT/report.json', 'utf8'));
const f = r.filter((x) => x.fails.length);
console.log(r.length + ' page types, ' + (r.length - f.length) + ' passing, ' + f.length + ' failing' + (f.length ? ': ' + f.map((x) => x.route + ' (' + [...new Set(x.fails.map((y) => y.rule))].join(', ') + ')').join('; ') : ''));
")
echo "$(uk) GMT T1 NIGHTLY MOB-RULES $DAY on $SHA (report only): $SUMMARY. Report audit/mobile-rules-nightly/$DAY.md" >> "$ST"
