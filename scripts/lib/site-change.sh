#!/usr/bin/env bash
# Does a range of commits change the site? Shared by scripts/vercel-ignore-build.sh (skips a production build when
# nothing in the site changed) and .github/workflows/deploy-watchdog.yml (does not call the deploy hook for such a
# commit). Owner's approval, 29 Oct 2026.
#
#   source scripts/lib/site-change.sh
#   only_non_site_files < list_of_paths     # exit 0 if every path is outside the site, 1 otherwise
#
# A path is OUTSIDE the site only if it matches one of these, and every other path counts as a site file:
#   scripts/migrations/**                      SQL run by hand, never by the build
#   scripts/** ending .js .cjs .mjs .sh .sql .md .txt .csv .json, except this file and vercel-ignore-build.sh
#                                              (terminal scripts: nothing in app/, lib/ or the build imports them;
#                                              scripts/*.ts are site files because next build type checks every .ts)
#   *.md outside app/, lib/, components/ and public/
#   .github/** except .github/workflows/deploy-watchdog.yml
# An empty list is not "outside the site": with nothing to compare, the caller builds.

is_non_site_file() {
  local f="$1"
  case "$f" in
    scripts/vercel-ignore-build.sh|scripts/lib/site-change.sh) return 1 ;;
    scripts/migrations/*) return 0 ;;
    scripts/*.ts|scripts/*.tsx|scripts/*.mts) return 1 ;;
    scripts/*.js|scripts/*.cjs|scripts/*.mjs|scripts/*.sh|scripts/*.sql|scripts/*.md|scripts/*.txt|scripts/*.csv|scripts/*.json) return 0 ;;
    .github/workflows/deploy-watchdog.yml) return 1 ;;
    .github/*) return 0 ;;
    app/*|lib/*|components/*|public/*) return 1 ;;
    *.md) return 0 ;;
  esac
  return 1
}

only_non_site_files() {
  local any=0 f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    any=1
    if ! is_non_site_file "$f"; then
      echo "site file changed: $f"
      return 1
    fi
  done
  [ "$any" = 1 ] || { echo "no changed files to compare"; return 1; }
  return 0
}
