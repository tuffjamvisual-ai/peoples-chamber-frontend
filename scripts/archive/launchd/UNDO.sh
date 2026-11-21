#!/bin/zsh
# UNDO for the archive search service (Cowork ENTRY 480 PART A): stops and unloads both LaunchAgents and removes their plists from
# ~/Library/LaunchAgents. Leaves ~/opengovt-archive (code, logs, secrets) in place; delete it by hand if wanted.
# After this, the archive pages say 'Archive search is offline. Please try again later.', as when the Mac is off.
for L in uk.opengovt.archive-server uk.opengovt.archive-tunnel; do
  launchctl bootout gui/$(id -u) $HOME/Library/LaunchAgents/$L.plist 2>/dev/null
  rm -f $HOME/Library/LaunchAgents/$L.plist
done
launchctl list | grep -c opengovt.archive || true
echo "archive route stopped"
