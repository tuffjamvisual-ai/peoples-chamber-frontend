#!/usr/bin/env bash
# Vercel "Ignored Build Step" (vercel.json ignoreCommand). Exit 0 skips the build, exit 1 builds.
#
# Skips a production build only when main on GitHub has provably moved past its commit, so a webhook delivered late
# (GitHub's webhook incident, 21 Oct 2026: b984c87's push reached Vercel 22 minutes late) cannot put older code live
# over a newer deployment. The head of main always builds, so deploy-hook builds from the deploy watchdog
# (.github/workflows/deploy-watchdog.yml), which build the head, are never skipped. Any doubt builds: a branch other
# than main, a failed or slow GitHub read, or a commit that isn't an ancestor of main's head (for example after a
# force push). The repository is public, so reading it needs no token.
set -u
SHA="${VERCEL_GIT_COMMIT_SHA:-}"
REF="${VERCEL_GIT_COMMIT_REF:-}"
REPO="https://github.com/${VERCEL_GIT_REPO_OWNER:-tuffjamvisual-ai}/${VERCEL_GIT_REPO_SLUG:-peoples-chamber-frontend}.git"
build() { echo "Ignored Build Step: building ($1)"; exit 1; }

[ "$REF" = "main" ] || build "branch ${REF:-unknown}, not main"
[ -n "$SHA" ] || build "no commit sha"
SLOW=(-c http.lowSpeedLimit=1000 -c http.lowSpeedTime=20)
HEAD_SHA=$(git "${SLOW[@]}" ls-remote "$REPO" refs/heads/main 2>/dev/null | cut -f1)
[[ "$HEAD_SHA" =~ ^[0-9a-f]{40}$ ]] || build "could not read main's head from GitHub"
[ "$HEAD_SHA" = "$SHA" ] && build "$SHA is the head of main"

# main's head differs. Skip only if this commit is in main's recent history, i.e. main has moved on past it.
git "${SLOW[@]}" fetch --quiet --no-tags --depth=100 "$REPO" "$HEAD_SHA" 2>/dev/null || build "could not fetch main's head $HEAD_SHA"
if git merge-base --is-ancestor "$SHA" "$HEAD_SHA" 2>/dev/null; then
  echo "Ignored Build Step: skipping $SHA; main has moved on to $HEAD_SHA, which has its own build"
  exit 0
fi
build "$SHA is not an ancestor of main's head $HEAD_SHA"
