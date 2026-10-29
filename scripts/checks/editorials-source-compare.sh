#!/usr/bin/env bash
# Builds and starts the site twice locally, editorials from the code and from the database copy (EDITORIALS_FROM_DB=1,
# production data, read only), fetches the same pages from each and compares them (editorials-source-compare.ts).
#   bash scripts/checks/editorials-source-compare.sh <work dir>
# Uses port 3001. Moves .next/cache/fetch-cache and .next/server/route-cache into the work dir before each build, so
# neither run is served data or pages from the other. Owner's approval, 29 Oct 2026 ("go stage B").
set -euo pipefail
WORK="${1:?work dir}"
mkdir -p "$WORK"
PORT=3001
BASE="http://127.0.0.1:$PORT"
stop() { lsof -a -ti:$PORT -sTCP:LISTEN | xargs kill 2>/dev/null || true; sleep 2; }
run() {
  local mode="$1" flag="$2"
  stop
  [ -d .next/cache/fetch-cache ] && mv .next/cache/fetch-cache "$WORK/fetch-cache-$mode-$(date +%s)"
  [ -d .next/server/route-cache ] && mv .next/server/route-cache "$WORK/route-cache-$mode-$(date +%s)"
  local t0; t0=$(date +%s)
  EDITORIALS_FROM_DB="$flag" npx next build > "$WORK/build-$mode.log" 2>&1
  echo "$mode build: $(( $(date +%s) - t0 )) s"
  EDITORIALS_FROM_DB="$flag" SESSION_SECRET="$(openssl rand -hex 32)" npx next start -H 127.0.0.1 -p $PORT > "$WORK/start-$mode.log" 2>&1 &
  for _ in $(seq 1 60); do curl -s -o /dev/null "$BASE/cookies" && break; sleep 1; done
  npx tsx scripts/checks/editorials-source-compare.ts fetch "$BASE" "$WORK/$mode"
  # Cache headers for one article, fetched twice (the second shows whether it is served from the cache).
  for _ in 1 2; do curl -s -o /dev/null -D - "$BASE/editorials/pw7k3nq9hd" | grep -iE "^(cache-control|x-nextjs-cache|x-nextjs-prerender)"; done > "$WORK/headers-$mode.txt"
  stop
}
run off ""
run on "1"
# Exact comparison, then the content check (text, head tag set, ld+json, links); the content check decides the exit.
npx tsx scripts/checks/editorials-source-compare.ts diff "$WORK/off" "$WORK/on" || true
npx tsx scripts/checks/editorials-source-compare.ts content "$WORK/off" "$WORK/on"
