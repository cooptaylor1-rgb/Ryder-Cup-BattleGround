# Event Runbook

One-page incident guide for running the Ryder Cup BattleGround app at a live event. Keep this open on a phone or laptop during the tournament.

> **Status during event:** The app is offline-first. Every score is written to the device's IndexedDB first and syncs to Supabase opportunistically. A player who loses signal on the course will never lose a score.

---

## Dashboards

| Tool | URL | What to watch |
|---|---|---|
| Production app | _set `NEXT_PUBLIC_APP_URL`_ | Smoke-test on day-of |
| Railway | railway.app → Ryder Cup service | Deploy status, logs, env vars |
| Supabase | supabase.com → project dashboard | DB rows, auth, storage |
| Sentry | sentry.io → golf-ryder-cup | Issues, Performance, Logs, Replays |
| GitHub | cooptaylor1-rgb/Ryder-Cup-BattleGround | Commits, PRs |

---

## Pre-event checklist (run the morning of the event)

- [ ] Pull latest `main`, verify Railway has auto-deployed the latest SHA
- [ ] Confirm Sentry is receiving events: open the production app → open browser console → `throw new Error('pre-event-check-' + Date.now())` → should appear in Sentry within 30 seconds
- [ ] Confirm the latest Sentry release matches the deployed git SHA (check `NEXT_PUBLIC_SENTRY_RELEASE` env var in Railway)
- [ ] Create a manual Supabase database backup: Supabase → Database → Backups → Download
- [ ] Smoke-test on at least one real phone (not devtools):
  - [ ] Create a throwaway trip
  - [ ] Add 4 players, 2 teams
  - [ ] Create a session, enter 3 holes of scores
  - [ ] Go airplane mode, enter 2 more holes
  - [ ] Come back online, confirm sync badge shows "Synced"
  - [ ] Delete the throwaway trip
- [ ] Confirm captain PIN is set for the real trip. Write it on paper, store it somewhere you won't lose it.
- [ ] Confirm at least one co-organizer has Admin Mode PIN for emergency overrides.
- [ ] Open Sentry Issues dashboard and set an alert for "new issue" on the event project.

---

## Common incidents

### "My scores disappeared" / "It's not syncing"

**Triage:**
1. Open the scoring page. Look at the `SyncStatusBadge` in the header.
2. If it says **"Offline"** — the phone has no signal. Scores are safe on the device. When signal returns, badge will flip to "Syncing" then "Synced".
3. If it says **"Failed (N)"** — tap the badge to force a retry. If it keeps failing, check Supabase status and Sentry logs for the device.
4. If it says **"Synced"** but a specific hole is missing — the user may be looking at the wrong match. Check match ID in the URL against the expected session lineup.

**Never delete a trip to "reset" during an event.** All scores will cascade away. Instead, use Supabase SQL to fix the specific rows.

### "The app won't load / blank screen"

1. Check Railway deploy status — did the latest deploy fail? If so, roll back via Railway UI (Deployments → click the previous successful deploy → "Redeploy").
2. Check Sentry for client-side `ChunkLoadError` — indicates a stale client pointing at new bundle URLs. User should close and reopen the PWA. Force-close iOS: swipe up in app switcher.
3. Check Sentry for server errors on `/api/*` routes — may indicate Supabase outage.

### "I can't enter captain mode"

1. If the user has entered the PIN wrong multiple times, rate limiting locks the PIN for an exponentially increasing window (1s → 2s → 4s → ... capped at 5min). Have them wait and try again.
2. If they forgot the PIN: use the "Forgot PIN?" flow in the Captain Toggle modal to reset. They'll need to set a new PIN.
3. If no one has the PIN: a co-organizer with Admin Mode PIN can reset captain mode entirely. Last resort: Supabase SQL to clear the captain PIN hash (see below).

### "Two people scored the same hole differently"

1. The scoring engine detects conflicts automatically within a 30-second window.
2. The captain should open the scoring page, review the conflict banner, and pick the correct outcome.
3. If it's been more than 30s and both scores wrote, the audit log (`/captain/audit`) shows who scored what. Captain can edit the hole manually from the scoring page.

### "I need to undo a score from 10 minutes ago"

1. The per-hole undo banner only lives 8 seconds after each save. For older changes, use the captain audit log.
2. Captain Mode → Captain page → Audit Log → find the `scoreEntered` entry → use "Edit hole" in the match scoring page to correct it. The override is logged.

### "We finished a match but it still shows 'in progress'"

1. The captain can manually finalize a match from the Captain page → match list → "Finalize" button.
2. If that fails, check the scoring engine logs in Sentry for validation errors.

---

## Emergency Supabase SQL snippets

**Only use these if you know exactly what you're doing. Always run SELECT first to confirm.**

Access via Supabase → SQL Editor. Authenticate with the service role.

```sql
-- 1. Find a trip by name
SELECT id, name, start_date, end_date
FROM trips
WHERE name ILIKE '%keyword%'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Find a player's device-local user record
SELECT id, email, display_name, last_seen_at
FROM profiles
WHERE email ILIKE '%keyword%';

-- 3. Reset the captain PIN for a trip (allows the captain to set a new one)
-- Run SELECT first to verify you have the right trip.
UPDATE trips
SET captain_pin_hash = NULL
WHERE id = '<trip-id>';

-- 4. Audit trail for a specific match — who scored what
SELECT created_at, action, actor_name, details
FROM audit_log
WHERE related_entity_id = '<match-id>'
ORDER BY created_at DESC;

-- 5. Find orphaned scoring events (should be zero — alert if not)
SELECT se.id, se.match_id, se.created_at
FROM scoring_events se
LEFT JOIN matches m ON m.id = se.match_id
WHERE m.id IS NULL;

-- 6. Export all trip data for manual backup
-- Run via Supabase → Database → Replication → Custom export
-- OR use the included scripts/exportTripData.ts helper if present.
```

---

## Rollback procedure

If a deploy breaks production and the fix is not obvious:

1. Railway → Service → Deployments tab
2. Find the last known-good deploy (green checkmark, no Sentry spike after deploy)
3. Click "..." → "Redeploy"
4. Verify via smoke test. Post in the event Slack/WhatsApp that rollback happened.

**Do NOT force-push to `main` to revert.** Always use Railway's redeploy.

---

## Who to call

| Who | Role | Contact |
|---|---|---|
| _you_ | Primary on-call | _phone_ |
| _co-organizer_ | Backup / admin PIN | _phone_ |
| _captain 1_ | Team captain | _phone_ |
| _captain 2_ | Team captain | _phone_ |

Fill these in before the event. Leave this file on your phone.

---

## Post-event wind-down

- [ ] Export the final standings to PDF via the `/standings` page share button
- [ ] Export the trip data via Supabase backup
- [ ] Tag the git commit: `git tag event-2026 && git push --tags`
- [ ] Capture any Sentry issues into a backlog for post-event fixes
- [ ] Thank everyone
