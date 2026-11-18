# The push hook (owner approved 16 Nov 2026, COWORK-TO-T1 ENTRY 185)

`pre-push` runs the push checks from the code being pushed, never from whatever branch the checkout happens to be on:

1. It refuses a commit that is not built on origin/main (rebase first).
2. It checks the pushed commit out on its own into a temporary worktree, clones this checkout's `node_modules` and turbopack cache into it (APFS clones, instant) and copies `.env.local` (removed with the worktree).
3. It runs that commit's own `scripts/checks/mobile-audit-prepush.mjs` inside the worktree: the layout lock, A16, then the check build (with the saved fetch-cache, ENTRY 167), the page checks, the rendered checks and the visual comparison. Every script and setting comes from the pushed commit.

`PUSH_CHECKS_DRY=1` stops before the build (once the pushed commit has this branch's mobile-audit-prepush.mjs).

## Installing it (a repository setting, not a file in any branch)

So that switching the checkout's branch can never change the hook, keep it outside the checkout:

```sh
mkdir -p ~/opengovt-backup/git-hooks
git show origin/main:scripts/git-hooks/pre-push > ~/opengovt-backup/git-hooks/pre-push
chmod +x ~/opengovt-backup/git-hooks/pre-push
git config core.hooksPath ~/opengovt-backup/git-hooks
```

Repeat the `git show` line when this file changes on main.

## The nightly mobile rules run (MOB-RULES, Cowork ENTRY 260 and 283)

`scripts/checks/mobile-rules-nightly.sh` checks every page type of a local build of origin/main at 02:30 London (report only), skipping Sunday mornings while the weekly sweep runs. It writes `Claude outputs/audit/mobile-rules-nightly/<date>.md` and one STATUS line, holds `PUSH.lock` while it runs (waiting up to 60 minutes for a push to finish, else it skips that night), and builds in its own worktree like the push checks.

Like the hook, it is started from outside the checkout and always runs origin/main's copy:

```sh
mkdir -p ~/opengovt-backup/mobile-rules-nightly
cat > ~/opengovt-backup/mobile-rules-nightly/run.sh <<'SH'
#!/bin/bash
cd /Users/johnnybot/peoples-chamber-frontend || exit 1
git fetch -q origin main || exit 1
git show origin/main:scripts/checks/mobile-rules-nightly.sh > ~/opengovt-backup/mobile-rules-nightly/current.sh || exit 1
exec bash ~/opengovt-backup/mobile-rules-nightly/current.sh
SH
chmod +x ~/opengovt-backup/mobile-rules-nightly/run.sh
```

and a launchd job, `~/Library/LaunchAgents/uk.opengovt.mobile-rules-nightly.plist`, running `/bin/zsh -lc ~/opengovt-backup/mobile-rules-nightly/run.sh` at Hour 2, Minute 30 (the Mac's clock is London time), with its output in `~/opengovt-backup/mobile-rules-nightly/launchd.log`; load it with `launchctl load ~/Library/LaunchAgents/uk.opengovt.mobile-rules-nightly.plist`.
