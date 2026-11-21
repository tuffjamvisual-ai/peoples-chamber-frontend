#!/bin/zsh
# Installs the archive search service on this Mac (Cowork ENTRY 480 PART A, owner approved 21 Nov 2026 22:44). Run by T1
# only after T2's OK for this file, the two plists, tunnel.sh and the server. Prints no secret.
#   zsh scripts/archive/launchd/install.sh
# 1. ~/opengovt-archive/{server,secret,logs}; secret/ is mode 700, its files 600.
# 2. The server's code and its datasets.json copied from this checkout to ~/opengovt-archive/server (so a branch switch never
#    changes what runs). The server reads /Volumes/EDGE_SSD/opengovt-index/opengovt-archive.sqlite read only.
# 3. The key (48 random bytes, base64) and the ngrok basic-auth password made once with openssl if absent; the policy file
#    written from ngrok-policy.example.yml with that password. secret/ngrok-url must already hold the account's free
#    development domain (https://<name>.ngrok-free.app), copied from the ngrok dashboard.
# 5. Both plists copied to ~/Library/LaunchAgents and loaded (bootstrap). Old copies, if any, kept as *.old-<time> for UNDO.
set -eu
HERE=${0:A:h}
A=$HOME/opengovt-archive; S=$A/secret
umask 077
mkdir -p $A/server $A/logs $S; chmod 700 $S
cp $HERE/../archive-server.mjs $HERE/../datasets.json $HERE/tunnel.sh $A/server/
[ -f $S/key ] || openssl rand -base64 48 | tr -d '\n' > $S/key
[ -f $S/ngrok-pass ] || openssl rand -hex 24 | tr -d '\n' > $S/ngrok-pass
chmod 600 $S/key $S/ngrok-pass
sed "s/REPLACE_WITH_A_LONG_RANDOM_PASSWORD/$(cat $S/ngrok-pass)/" $HERE/ngrok-policy.example.yml > $S/ngrok-policy.yml
chmod 600 $S/ngrok-policy.yml
[ -f $S/ngrok-url ] || { echo "STOP: put the ngrok free domain (https://<name>.ngrok-free.app) in $S/ngrok-url (mode 600) first"; exit 2; }
chmod 600 $S/ngrok-url
LA=$HOME/Library/LaunchAgents; T=$(date +%Y%m%d-%H%M%S)
for L in uk.opengovt.archive-server uk.opengovt.archive-tunnel; do
  [ -f $LA/$L.plist ] && { launchctl bootout gui/$(id -u) $LA/$L.plist 2>/dev/null || true; cp -p $LA/$L.plist $A/$L.plist.old-$T; }
  cp $HERE/$L.plist $LA/$L.plist; chmod 644 $LA/$L.plist
  launchctl bootstrap gui/$(id -u) $LA/$L.plist
done
sleep 5
launchctl print gui/$(id -u)/uk.opengovt.archive-server | grep -E "state =" | head -1
launchctl print gui/$(id -u)/uk.opengovt.archive-tunnel | grep -E "state =" | head -1
tail -2 $A/logs/server.log
echo "installed; secrets in $S (not printed)"
