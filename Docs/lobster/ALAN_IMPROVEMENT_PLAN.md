# Alan Improvement Plan — Lobster Workflows

Goal: run the Ryder Cup “Production Improvement Plan” as resumable Lobster workflows so we get:
- deterministic checklists
- explicit checkpoints
- repeatable lint/typecheck/test + commit/push gates

## Prereqs
- Lobster CLI installed: `lobster version`
- Workdir: the repo root (avoid absolute paths). From anywhere inside the repo:
  - `cd "$(git rev-parse --show-toplevel)"`

## Core pipeline: verify + checkpoint + commit gate

Run this after each batch of route fixes.

```bash
cd "$(git rev-parse --show-toplevel)"
lobster run --mode tool \
  "exec --shell 'pnpm -C golf-ryder-cup-web -s lint' \
   | exec --shell 'pnpm -C golf-ryder-cup-web -s typecheck' \
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

Status: ✅ As of 2026-02-06 (see Lobster WORKLOG), the route-level sweep is functionally complete for `src/app/**/page.tsx`:
- no top-level `return null;` in route pages (excluding `api/`)
- no `Suspense fallback={null}` in route pages

Keep the searches below around anyway; they’re the fastest way to verify we didn’t regress.

Primary route checklist (keep a running checklist in the worklog):
- `golf-ryder-cup-web/src/app/schedule/page.tsx`
- `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx`
- `golf-ryder-cup-web/src/app/players/*`
- `golf-ryder-cup-web/src/app/standings/*`
- `golf-ryder-cup-web/src/app/trip-stats/page.tsx`

If the checklist above is already complete, generate the next sweep list by searching for other “blank state” patterns in routes:

```bash
rg "return null" golf-ryder-cup-web/src/app -n
rg "fallback=\{null\}" golf-ryder-cup-web/src/app -n
rg "router\.(push|replace)\('/\w+" golf-ryder-cup-web/src/app -n
```

Then pick a small batch (1–3 routes), apply the standard pattern below, and run the Lobster checkpoint + approval gate.

Extra sweep commands (useful for catching true “blank screen” component returns in route pages):

```bash
rg "^\\s*return null;\\s*$" golf-ryder-cup-web/src/app -n --glob '**/page.tsx' --glob '!**/api/**'
```

CSS var Tailwind syntax sweep (catches invalid forms like `text-(--ink-tertiary)` that silently fail to apply):

```bash
rg "\\w+\\-\\(--" golf-ryder-cup-web/src -n
```

Pattern:
- `undefined` (loading) → `PageLoadingSkeleton`
- `[]` / no rows (empty) → `EmptyStatePremium`
- hard errors → `ErrorEmpty` (from `EmptyStatePremium.tsx`)

## After Phase 1: component-level “silent gap” sweep (optional)

Once routes are no longer blank, the next biggest UX paper-cuts are *silent gaps inside otherwise-rendering pages*.
These usually look like `return null` in a widget that is expected to show something (even an empty state).

Generate a candidate list:

```bash
rg "^\\s*return null;\\s*$" golf-ryder-cup-web/src/components -n
```

Triage guidance:
- **OK to keep `return null`:** tiny status indicators or providers that intentionally disappear (e.g., Offline badge, feature-gated banners).
- **Prefer explicit UI:** cards/sections inside a page where a `null` return looks like a bug (replace with a compact `EmptyStatePremium` or placeholder skeleton).

## Phase boundaries

For each phase, keep:
- a small WORKLOG entry (timestamp + what changed)
- a Lobster checkpoint run (lint/typecheck + approve)
- then commit/push

