# Golf Ryder Cup App - Railway + Supabase Deployment Guide

## Pre-Deployment Checklist

No production deploy should run until staging Railway, staging Supabase,
unit tests, typecheck, lint, build, `/api/health`, and smoke checks pass.

## Required Environments

Create two Railway services and two Supabase projects:

- `staging`: connected to staging Supabase and a staging Redis REST database.
- `production`: connected to production Supabase and production Redis REST.

Apply Supabase migrations to staging first. Production migrations run only after
a production database backup and a green staging deploy.

## Railway Configuration

`railway.toml` uses:

- Build command: `cd golf-ryder-cup-web && pnpm run deploy:railway`
- Start command: `cd golf-ryder-cup-web && pnpm start`
- Health check path: `/api/health`

`deploy:railway` runs install, typecheck, tests, production build, and a local
`/api/health` smoke before Railway starts the deployed service.

## Environment Variables

Set these in each Railway environment. Use staging values in staging and
production values only in production.

```bash
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Required - Application
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
VAPID_SUBJECT=mailto:admin@example.com

# Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
SENTRY_ORG=<your-sentry-org>
SENTRY_PROJECT=golf-ryder-cup
NEXT_PUBLIC_SENTRY_ENV=staging # or production
# Optional: leave empty in Railway; code falls back to RAILWAY_GIT_COMMIT_SHA.
NEXT_PUBLIC_SENTRY_RELEASE=

# Strict health and distributed rate limiting
HEALTHCHECK_STRICT=1
RATE_LIMIT_BACKEND=redis-rest
RATE_LIMIT_REDIS_REST_URL=<your-redis-rest-url>
RATE_LIMIT_REDIS_REST_TOKEN=<your-redis-rest-token>
```

## Deployment Steps

### 1. Staging Supabase

```bash
cd golf-ryder-cup-web
supabase link --project-ref <staging-project-ref>
supabase db push
```

Confirm `deployment_migration_markers` contains the latest required marker:
`20260424000000_add_deployment_health_markers`.

### 2. Staging Railway

Push the branch connected to the staging Railway service. Verify:

- Railway deploy passes.
- `https://staging-domain/api/health` returns `status: "healthy"`.
- Sentry shows a release matching the Railway commit SHA.
- Redis rate limiting survives a Railway service restart.

### 3. Production Supabase

Before production:

- Take a Supabase backup.
- Confirm staging is healthy.
- Apply migrations with the Supabase CLI.
- Recheck migration drift before deploying Railway.

### 4. Production Railway

Deploy only after production Supabase migrations are applied. Verify:

1. `https://your-domain.com/api/health` is healthy.
2. Join flow works with a share code.
3. Score entry updates the match and standings.
4. Live/spectator views show the same result.
5. Sentry release matches `RAILWAY_GIT_COMMIT_SHA`.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     Client (PWA/Native)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Next.js   │  │  IndexedDB  │  │  Service Worker     │  │
│  │   React     │  │  (Offline)  │  │  (Push/Cache)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ /api/sync/*  │  │ /api/push/* │  │ /api/golf-courses│   │
│  │ (Cloud Sync) │  │ (Push Notif)│  │ (Course Lookup)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  PostgreSQL  │  │  Realtime    │  │  Row Level       │   │
│  │  Database    │  │  Subscriptions│  │  Security        │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Feature Status

| Feature               | Status        | Notes                      |
| --------------------- | ------------- | -------------------------- |
| Trip Management       | ✅ Production | Full CRUD with share codes |
| Team Builder          | ✅ Production | USA vs Europe + custom     |
| Live Scoring          | ✅ Production | Match play scoring engine  |
| Cloud Sync            | ✅ Production | Supabase real-time         |
| Offline Mode          | ✅ Production | IndexedDB with sync queue  |
| Push Notifications    | ✅ Production | VAPID keys configured      |
| Voice Scoring         | ✅ Production | Web Speech API             |
| Side Games            | ✅ Production | Skins, Nassau, KP          |
| Handicap Calculations | ✅ Production | Course handicap engine     |
| Native iOS/Android    | ✅ Ready      | Capacitor configured       |

## Trip-Critical Sync Contract

The offline Dexie sync contract mirrors Supabase for every trip-critical table.
Before deploying a build that writes captain logistics, confirm the
`20260424010000_trip_memberships_and_trip_scoped_rls` migration has been
applied in the target Supabase project.

Synced logistics tables:

- `trip_invitations`: personal invite sends with recipient contact, share
  link, team preference, role, status, open/accepted/revoked timestamps, and
  accepted user/player metadata.
- `announcements`: captain messages with priority, category, status, author
  metadata, read counts, and sent timestamps.
- `attendance_records`: per-player attendance status, ETA, notes, location,
  session scope, and updater metadata.
- `cart_assignments`: trip/session/match cart groupings with player IDs,
  capacity, notes, and creator metadata.

The client queues local changes while offline and only removes local rows during
cloud pull when there is no pending local create or update for that entity.

## Troubleshooting

### "Share code not found"

- Check that the trip exists in Supabase
- Verify share code is case-insensitive

### Push notifications not working

- Verify VAPID keys are set
- Check browser supports Web Push
- Ensure HTTPS is enabled

### Sync failures

- Check Supabase credentials
- Verify RLS policies are applied
- Check API rate limits

## Support

For issues, check:

1. Browser console for client errors
2. Railway logs for server errors
3. Supabase logs for database errors

---

_Last updated: April 2026_
_Version: 1.0.0_
