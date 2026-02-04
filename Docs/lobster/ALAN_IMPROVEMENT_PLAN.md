# Alan Improvement Plan — Lobster Workflows

Goal: run the Ryder Cup “Production Improvement Plan” as resumable Lobster workflows so we get:
- deterministic checklists
- explicit checkpoints
- repeatable lint/typecheck/test + commit/push gates

## Prereqs
- Lobster CLI installed: `lobster version`
- Workdir: `/Users/agent/clawd/Ryder-Cup-BattleGround`

## Core pipeline: verify + checkpoint + commit gate

Run this after each batch of route fixes.

```bash
cd /Users/agent/clawd/Ryder-Cup-BattleGround
lobster run --mode tool \
  "exec --shell 'cd golf-ryder-cup-web && pnpm -s lint' \
   | exec --shell 'cd golf-ryder-cup-web && pnpm -s typecheck' \
   | exec --shell 'git status --porcelain' \
   | exec --shell 'git --no-pager diff --stat' \
   | approve --prompt 'Create commit for current batch? (approve=yes to proceed)' --emit"
```

If it returns `needs_approval`, resume with the token:

```bash
lobster resume --token <TOKEN> --approve yes
```

Then commit/push (manual, but gated by the approval step above):

```bash
git commit -am "Phase 1: remove blank-screen states (batch)" || true
git push origin main
```

## Phase 1 workflow (current)

Purpose: eliminate blank-screen / `return null` UI states on user-facing routes.

Target routes to sweep (keep a running checklist in the worklog):
- `golf-ryder-cup-web/src/app/schedule/page.tsx`
- `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx`
- `golf-ryder-cup-web/src/app/players/*`
- `golf-ryder-cup-web/src/app/standings/*`
- `golf-ryder-cup-web/src/app/trip-stats/page.tsx`

Pattern:
- `undefined` (loading) → `PageLoadingSkeleton`
- `[]` / no rows (empty) → `EmptyStatePremium`
- hard errors → `ErrorEmpty` (from `EmptyStatePremium.tsx`)

## Phase boundaries

For each phase, keep:
- a small WORKLOG entry (timestamp + what changed)
- a Lobster checkpoint run (lint/typecheck + approve)
- then commit/push

