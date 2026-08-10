#!/usr/bin/env bash
#
# Guarded production deploy.
#
# Background: for months the live site was deployed straight from an
# uncommitted working tree via `vercel --prod`, so production ran ~3 months
# ahead of git with no version control safety net. This wrapper makes that
# impossible: it refuses to deploy unless the tree is clean AND HEAD is
# pushed to origin, so every production deploy corresponds to a committed,
# pushed commit.
#
# Preferred path is still Vercel's Git integration (auto-deploy on push to
# main). Use this script only for the cases where a push does not trigger a
# deploy and a manual `vercel --prod` is genuinely needed.
#
# Usage: ./scripts/deploy.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

branch="$(git rev-parse --abbrev-ref HEAD)"

# 1. Working tree must be clean.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "✗ Refusing to deploy: working tree has uncommitted changes."
  echo "  Commit or stash them first — production must match a real commit."
  git status --short
  exit 1
fi

# 2. HEAD must be pushed to its remote tracking branch.
git fetch --quiet origin "$branch" || true
if ! git rev-parse --verify --quiet "origin/$branch" >/dev/null; then
  echo "✗ Refusing to deploy: origin/$branch does not exist. Push first."
  exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$branch")" ]]; then
  echo "✗ Refusing to deploy: local $branch differs from origin/$branch."
  echo "  Run 'git push' so the deployed commit is on the remote."
  exit 1
fi

echo "✓ Tree clean and $branch in sync with origin ($(git rev-parse --short HEAD)). Deploying…"
exec npx vercel --prod --yes
