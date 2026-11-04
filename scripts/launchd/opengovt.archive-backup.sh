#!/bin/bash
# Weekly copy of the opengovt folders on EDGE_SSD to GoliathSSD (owner, 4 Nov 2026). The evidence archive and the
# research data live on EDGE_SSD (OPENGOVT_ARCHIVE_ROOT in scripts/evidence-archive.mjs and
# scripts/export-research-data.mjs); GoliathSSD keeps this backup. Node does the copy (archive-copy.mjs, beside this
# script), as macOS refuses rsync, cp and mv on GoliathSSD under launchd but allows Node (tested 4 Nov 2026). It adds and
# updates files on GoliathSSD and never deletes anything there, then checks file count, total bytes and modification
# times. Touches nothing outside the two opengovt folders. If either drive is not mounted it logs "skipped" and exits 0.
# Run by launchd: scripts/launchd/opengovt.archive-backup.plist.
set -u
SRC=/Volumes/EDGE_SSD
DST=/Volumes/GoliathSSD
FOLDERS="opengovt-evidence-archive opengovt-research-data"
LOG=/Users/johnnybot/opengovt-backup/archive-backup.log
NODE=/opt/homebrew/bin/node
COPY=/Users/johnnybot/peoples-chamber-frontend/scripts/launchd/archive-copy.mjs
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$LOG"; }

# A drive counts as mounted only if it is its own volume, not an empty folder under /Volumes.
mounted() { [ -d "$1" ] && [ "$(stat -f %d "$1")" != "$(stat -f %d /Volumes)" ]; }
for d in "$SRC" "$DST"; do
  if ! mounted "$d"; then log "skipped: $d not mounted"; exit 0; fi
done

status=0
for f in $FOLDERS; do
  if [ ! -d "$SRC/$f" ]; then log "skipped $f: not on $SRC"; continue; fi
  start=$(date +%s)
  result=$("$NODE" "$COPY" "$SRC/$f" "$DST/$f" 2>&1); rc=$?
  log "$result ($(( $(date +%s) - start )) s)"
  if [ "$rc" -ne 0 ]; then status=$rc; log "FAILED $f: copy check exit $rc"; fi
done
exit $status
