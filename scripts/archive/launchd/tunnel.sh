#!/bin/zsh
# Starts the ngrok tunnel for the archive server (Cowork ENTRY 480). Copied to ~/opengovt-archive/server by install.sh and run
# by the LaunchAgent uk.opengovt.archive-tunnel. Forwards only 127.0.0.1:3391; basic auth from the private policy file.
set -u
S=$HOME/opengovt-archive/secret
for f in ngrok-url ngrok-policy.yml; do
  [ -f "$S/$f" ] || { echo "$(date -u +%FT%TZ) STOP: $S/$f missing"; exit 2; }
  [ "$(stat -f %Lp "$S/$f")" = 600 ] || { echo "$(date -u +%FT%TZ) STOP: $S/$f must be mode 600"; exit 2; }
done
URL=$(head -1 "$S/ngrok-url")
[[ "$URL" =~ '^https://[a-z0-9-]+\.ngrok-free\.(app|dev)$' ]] || { echo "$(date -u +%FT%TZ) STOP: ngrok-url is not an ngrok free domain"; exit 2; }
exec /opt/homebrew/bin/ngrok http 127.0.0.1:3391 --url "$URL" --traffic-policy-file "$S/ngrok-policy.yml" --log stdout --log-format logfmt
