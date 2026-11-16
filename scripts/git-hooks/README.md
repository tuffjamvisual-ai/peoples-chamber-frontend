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
