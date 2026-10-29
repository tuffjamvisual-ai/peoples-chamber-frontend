#!/usr/bin/env bash
# Vercel "Ignored Build Step" (vercel.json ignoreCommand). Exit 0 skips the build, exit 1 builds.
#
# Skips a production build only when main on GitHub has provably moved past its commit, so a webhook delivered late
# (GitHub's webhook incident, 21 Oct 2026: b984c87's push reached Vercel 22 minutes late) cannot put older code live
# over a newer deployment. The head of main always builds, so deploy-hook builds from the deploy watchdog
# (.github/workflows/deploy-watchdog.yml), which build the head, are never skipped. Any doubt builds: a branch other
# than main, a failed or slow GitHub read, or a commit that isn't an ancestor of main's head (for example after a
# force push). The repository is public, so reading it needs no token.
#
# 29 Oct 2026 (owner's approval): the head of main is also skipped when nothing in the site changed since the last
# deployed commit (VERCEL_GIT_PREVIOUS_SHA), for example a commit of migrations or terminal scripts only. Which files
# count as outside the site: scripts/lib/site-change.sh, shared with the deploy watchdog. Any doubt builds: no previous
# sha, a failed git read, an empty comparison or any file not known to be outside the site.
set -u
SHA="${VERCEL_GIT_COMMIT_SHA:-}"
REF="${VERCEL_GIT_COMMIT_REF:-}"
# IGNORE_BUILD_TEST_REPO: local tests only (a throwaway repo path); Vercel never sets it.
REPO="${IGNORE_BUILD_TEST_REPO:-https://github.com/${VERCEL_GIT_REPO_OWNER:-tuffjamvisual-ai}/${VERCEL_GIT_REPO_SLUG:-peoples-chamber-frontend}.git}"
build() { echo "Ignored Build Step: building ($1)"; exit 1; }

[ "$REF" = "main" ] || build "branch ${REF:-unknown}, not main"
[ -n "$SHA" ] || build "no commit sha"
SLOW=(-c http.lowSpeedLimit=1000 -c http.lowSpeedTime=20)
HEAD_SHA=$(git "${SLOW[@]}" ls-remote "$REPO" refs/heads/main 2>/dev/null | cut -f1)
[[ "$HEAD_SHA" =~ ^[0-9a-f]{40}$ ]] || build "could not read main's head from GitHub"
if [ "$HEAD_SHA" = "$SHA" ]; then
  PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
  [[ "$PREV" =~ ^[0-9a-f]{40}$ ]] || build "$SHA is the head of main (no previous deployed sha to compare)"
  [ "$PREV" != "$SHA" ] || build "$SHA is the head of main and was the last deployed commit (a redeploy)"
  # shellcheck source=lib/site-change.sh
  . "$(dirname "$0")/lib/site-change.sh" 2>/dev/null || build "$SHA is the head of main (file classifier missing)"
  git cat-file -e "$SHA^{commit}" 2>/dev/null || git "${SLOW[@]}" fetch --quiet --no-tags --depth=100 "$REPO" "$SHA" 2>/dev/null || build "could not fetch $SHA"
  git cat-file -e "$PREV^{commit}" 2>/dev/null || git "${SLOW[@]}" fetch --quiet --no-tags --depth=100 "$REPO" "$PREV" 2>/dev/null || build "could not fetch the previous deployed commit $PREV"
  CHANGED=$(git diff --name-only --no-renames "$PREV" "$SHA" 2>/dev/null) || build "could not compare $PREV and $SHA"
  if WHY=$(printf '%s\n' "$CHANGED" | only_non_site_files); then
    echo "Ignored Build Step: skipping $SHA; every file changed since $PREV is outside the site:"
    printf '%s\n' "$CHANGED" | sed 's/^/  /'
    exit 0
  fi
  build "$SHA is the head of main; $WHY"
fi

# main's head differs. Skip only if this commit is in main's recent history, i.e. main has moved on past it.
git "${SLOW[@]}" fetch --quiet --no-tags --depth=100 "$REPO" "$HEAD_SHA" 2>/dev/null || build "could not fetch main's head $HEAD_SHA"
if git merge-base --is-ancestor "$SHA" "$HEAD_SHA" 2>/dev/null; then
  echo "Ignored Build Step: skipping $SHA; main has moved on to $HEAD_SHA, which has its own build"
  exit 0
fi
build "$SHA is not an ancestor of main's head $HEAD_SHA"
