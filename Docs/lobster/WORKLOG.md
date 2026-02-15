# Ryder Cup BattleGround — Improvement Worklog (Lobster)

This file is the high-level, checkpointed “what shipped” log for the Lobster-driven improvement plan.


## 2026-02-14

### 23:05 EST — Phase 2 — ErrorBoundary: tokenize inverse CTA + error surfaces
- `ErrorBoundary` / `MiniErrorFallback` / `ErrorCard`: replaced `text-white` with `text-[var(--canvas)]` on Masters CTAs so inverse copy remains theme-safe.
- Migrated remaining inline error tint palettes (`rgba(220,38,38,…)`, `#DC2626`) to the premium error token system (`bg-[color:var(--error)]/…`, `border-[color:var(--error)]/…`, `text-[var(--error)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`4ed9b18`)

### 22:40 EST — Phase 2 — Remove remaining `text-white` on Masters surfaces (TripStats awards + TripStats error + iOS install prompt)
- `/trip-stats/awards`: winner chip now uses `text-[var(--canvas)]` on the Masters surface.
- `/trip-stats/error`: primary “Try Again” CTA now uses `text-[var(--canvas)]`.
- `IOSInstallPrompt`: header + subtitle + “Got It” CTA now use canvas token typography (`text-[var(--canvas)]`, `text-[color:var(--canvas)]/80`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 22:20 EST — Phase 2 — Tokenize remaining `text-white` on Masters/accent UI (TripStats + OfflineIndicator + PDF export)
- `/trip-stats`: increment (+) button now uses `text-[var(--canvas)]` on the Masters surface.
- `OfflineIndicator`: migrated banner/pill copy and status chips off `text-white/*` onto canvas tokens (`text-[var(--canvas)]`, `text-[color:var(--canvas)]/…`) for theme-safe inverse readability.
- `PDFExportPanel`: selected icon chip and primary export CTA now use `text-[var(--canvas)]` instead of `text-white` on accent surfaces.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 22:05 EST — Phase 2 — Remove remaining `text-white` on Masters/team surfaces (Settings + CourseDetails + Hammer)
- `SettingsPanel`: Masters-primary segmented controls + sync button now use `text-[var(--canvas)]` instead of `text-white`.
- `CourseDetails`: header shell, active tabs, scorecard tee selector, and totals column now use `text-[var(--canvas)]` so Masters surfaces stay theme-safe.
- `HammerGameCard`: USA/EUR team chips and Masters header titles now use `text-[var(--canvas)]` instead of `text-white`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 21:45 EST — Phase 2 — Tokenize remaining Masters header/CTA text (TripArchiveCard + GHINLookup)
- `TripArchiveCard`: Masters-gradient header title/subtitle and “View Full Trip” button now use `text-[var(--canvas)]` tokens instead of `text-white`.
- `GHINLookup`: lookup button and success/header icons now use `text-[var(--canvas)]` on Masters/success surfaces for theme-safe legibility.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f064d78`)

### 21:32 EST — Phase 2 — Error routes: remove `text-white` + hard-coded error tints
- `/error`, `/stats/error`, `/spectator/error`: primary "Try Again" CTA now uses `text-[var(--canvas)]` instead of `text-white` on the Masters button.
- Tokenized error icon shells off inline `rgba(239,68,68,0.1)` / `#DC2626` and onto `bg-[color:var(--error)]/10` + `text-[var(--error)]` for theme-safe consistency.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b1b0262`)

### 21:10 EST — Phase 2 — Replace remaining `text-white` overlays with canvas tokens (Standings + Help error + Nassau)
- `/standings`: migrated active tab + “View Trip Recap” CTA off `text-white` and onto `text-[var(--canvas)]` so Masters-accented states remain theme-safe.
- `/help` error route: updated the primary “Try Again” button to use `text-[var(--canvas)]` instead of `text-white`.
- `NassauEnhancedCard`: tokenized header copy + close affordance off `text-white`/`text-white/80` to canvas tokens (`text-[var(--canvas)]`, `text-[color:var(--canvas)]/80`) for consistent legibility on the Masters gradient.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a77bd60`)

### 20:57 EST — Phase 2 — Replace remaining `text-white` overlays with canvas tokens (InstallPrompt + StablefordScorecard)
- `InstallPrompt`: swapped primary CTA and iOS instruction step numbers off `text-white` onto `text-[var(--canvas)]`; updated iOS modal backdrop from `bg-black/50` to token-driven `bg-[color:var(--ink)]/50`.
- `StablefordScorecard`: replaced selected/active states off `text-white` / `text-white/50` onto `var(--canvas)` token classes so Masters-accent chips remain theme-safe.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b8bf6c2`)

### 07:45 EST — Phase 2 — Tokenize onboarding availability status controls + roster team assignment buttons
- `AvailabilityCalendar`: replaced hard-coded Tailwind palette utilities (`green-*`, `amber-*`, `red-*`, `blue-*`) with premium status tokens (`var(--success)`, `var(--warning)`, `var(--error)`, `var(--info)`) for session icons and Yes/Maybe/No selection states; removed dark-mode forks in favor of token tints.
- `PlayerRosterImport`: mapped Team A/B assignment buttons to Ryder Cup team tokens (`bg-team-usa` / `bg-team-europe`) and moved destructive remove affordance onto `var(--error)` tokens instead of raw `red-*` classes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f41d745`)

### 07:15 EST — Phase 2 — Button component: replace hard-coded Masters hex with tokens
- `Button` (UI primitive): primary + danger variants now use premium tokens instead of hard-coded hex/`text-white` (`bg-[var(--masters)]`, `bg-[var(--error)]`, `text-[var(--canvas)]`) with token-driven hover/active states.
- Updated Button unit tests to assert against the new token classes.
- Keeps core CTAs theme-safe and consistent with the Phase 2 token system.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b862135`, `aa52b01`)

### 06:55 EST — Phase 2 — Tokenize Masters buttons + spinners (Availability + Login)
- `/captain/availability`: selected session pill now uses `text-[var(--canvas)]` and the in-progress pulse dot uses `bg-[color:var(--canvas)]` so the Masters-highlighted state stays theme-safe.
- `/login`: primary sign-in CTA and loading spinner swapped `text-white` / `border-white` utilities for canvas tokens (`text-[var(--canvas)]`, `border-[color:var(--canvas)]/...`) to remove hard-coded white overlays.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b800d58`)


### 04:35 EST — Phase 2 — Tokenize remaining black/white overlay controls (SwipeScorePanel + PhotoGallery)
- `SwipeScorePanel`: replaced the keyboard shortcut hint + current score pill backgrounds off `bg-black/*` + `dark:bg-white/*` forks onto a single neutral ink tint (`bg-[color:var(--ink)]/…`) with canvas text so overlays stay consistent across themes.
- `PhotoGallery` full-screen viewer: migrated close + navigation button hover/fill tints off `bg-white/*` and onto token-driven canvas overlays (`bg-[color:var(--canvas)]/…`) for theme-safe controls on the dark viewer shell.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`57d71fc`)


### 02:48 EST — Phase 2 — Onboarding chips + Toast progress track: remove remaining white/black overlays
- `TripWelcomeCard`: replaced remaining `bg-white/*`, `text-white/*`, and `border-white/*` utilities in hero badges, metadata row, and stat dividers with token-driven `var(--canvas-raised)` opacity classes so the invite hero stays theme-safe.
- `SideBetOptIn`: updated “All In / None” buttons to use `var(--canvas-raised)` tint overlays instead of `bg-white/*` utilities for consistent legibility on the Masters gradient.
- `Toast`: swapped the progress-track background off `bg-black/15 dark:bg-white/15` and onto a single neutral ink tint (`bg-[color:var(--ink)]/12`) to avoid dark-mode forks.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`fd7a6c1`)

### 02:32 EST — Phase 2 — Smart pairing suggestions adopt premium tokens
- `SmartPairingSuggestions`: migrated the captain pairing recommender UI off legacy Tailwind gray/blue/yellow palettes and dark-mode forks onto the premium surface/ink/rule + status token system (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`, `var(--info)`, `var(--warning)`, `var(--success)`, `var(--error)`, `var(--masters)`).
- Fairness score, format toggles, suggestion cards, history table, and analysis panel now use tokenized surfaces/typography with consistent hover states.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ea1aa41`)

### 01:55 EST — Phase 2 — Profile completion reward: premium token cleanup
- `ProfileCompletionReward`: replaced hard-coded confetti + trophy palette hexes with premium tone tokens (`var(--masters)`, `var(--success)`, `var(--warning)`, `var(--info)`, `var(--error)`, `var(--color-accent)`) for theme-safe celebration effects.
- Trophy icon now uses `var(--canvas)` instead of `text-white`, and the team header fallback background uses `var(--ink-primary)` instead of a hard-coded hex.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 00:58 EST — Phase 2 — Live play overlays adopt premium tokens
- `WeatherAlerts`: replaced rgba severity palettes with premium tone tokens, chip/icon color-mix overlays, and canvas-based refresh/dismiss controls so alerts stay legible across themes with proper focus rings.
- `QuickStandingsOverlay`: swapped linear-gradient team cards and white overlays for tone-driven team surfaces, premium ink typography, and neutral match summaries so live standings read cleanly in light/dark shells.
- `StickyUndoBanner`: moved the undo banner onto raised premium surfaces with tokenized progress, controls, and focus treatments, removing inline rgba backgrounds on undo/dismiss affordances.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5a67da2`)

### 00:36 EST — Phase 2 — Side bet reminders adopt premium inverse tokens
- `SideBetReminder`: replaced rgba white overlays and hex palettes with premium tone tokens (`var(--masters)`, `var(--warning)`, `var(--info)`) for current/upcoming/result-needed states so the cards stay legible on light and dark shells.
- Icon chips, status badges, inputs, and actions now rely on inverse canvas ink tokens (`var(--canvas-raised)`) with tokenized focus/disabled treatments; dynamic CSS vars drive background/border mixes instead of inline rgba strings.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`00090b3`)

### 00:08 EST — Phase 2 — Live play status widgets adopt premium inverse tokens
- `MatchStatusHeader`: replaced remaining hard-coded ink/white overlays with inverse canvas/ink tokens, giving skeletons, momentum badge, and fallback states tokenized surfaces + team shades so the mini-scoreboard stays legible across shells.
- `FloatingMyMatch`: swapped inline gradients, white overlays, and red/green hexes for premium gradient tokens, team/status tone classes, and inverse canvas chips; detail drawer now leans on tokenized borders/ink instead of rgba hacks.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`0ff193e`)

## 2026-02-13

### 23:42 EST — Phase 2 — Tokenize remaining white overlay chips (Nassau + Archives + Notifications toggle)
- `NassauEnhancedCard`: close button hover tint now uses tokenized canvas overlay instead of `hover:bg-white/10` so the header action stays premium across themes.
- `/settings/notifications`: toggle knob now uses `var(--surface-raised)` + `shadow-card-sm` instead of `bg-white`.
- `TripArchiveCard`: compare mode toggle now uses tokenized canvas overlay for the non-compare state instead of `bg-white/20`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`2a6837e`)

### 23:17 EST — Phase 2 — Captain invitations & announcements adopt premium overlays
- `InvitationManager` quick-share card now uses premium canvas-raised overlays for the icon chip, join-code panel, and copy/share CTAs (no `bg-white/*`); the share button now sits on the neutral canvas surface with Masters-accent text.
- `AnnouncementBanner` icon, dismiss, and “View Details” actions moved to tokenized canvas-raised tints with hover states so urgent/standard banners stay legible across themes without raw white overlays.
- `CaptainDashboard` live session & attention cards now rely on premium canvas-raised pulses and list items instead of white translucency, keeping realtime cards aligned with the premium shell.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 22:52 EST — Phase 2 — More page admin toggles: premium token alignment
- `/more`: moved the “Exit trip” CTA off `bg-white/15`/`text-white` and onto canvas token overlays with hover states so the button remains legible without hard-coded white overlays on the Masters gradient.
- Admin Mode tile, modal, and toggle knob now rely on premium error/canvas tokens (`var(--error)`, `var(--canvas)`, `var(--surface-raised)`) instead of `#dc2626`/`rgba(...)`/`bg-white`, keeping destructive affordances theme-safe across shells.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 22:27 EST — Phase 2 — Course details weather surfaces: premium token sweep
- `CourseDetails`: swapped gradient quick-action overlays to canvas token tints (`bg-[color:var(--canvas)]/15 → /25`) and aligned header metadata on the inverse canvas text tone so the module keeps legibility without raw `white/*` utilities.
- `WeatherWidget`: replaced the refresh button, stat row, and hero typography with canvas token overlays/text, parameterized the background pattern fill, and moved icon defaults to the premium inverse tone to eliminate the remaining `white/*` classes in course weather.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6e2a081`)

### 21:56 EST — Phase 2 — Form errors adopt premium token system
- `FormError` inline + summary states now rely on premium error/warning/success/info tokens for surfaces, borders, and icons rather than legacy Tailwind palette utilities; inline copy stays on neutral ink tokens for readability.
- `FormErrorSummary` focus ring, icon, and body copy moved onto premium tokens, and `FormHint` now uses the shared ink tertiary tone to avoid dark-mode forks.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅

### 21:35 EST — Phase 2 — PhotoCapture + TripMemories + AchievementUnlock overlays: remove remaining `bg-white/*`
- `PhotoCapture`: replaced the remaining hard-coded `bg-white` capture button + error CTA with token-driven `var(--canvas-raised)` surfaces/rings so the camera UI stays consistent across themes.
- `TripMemories`: replaced the score progress divider + MVP avatar background off `bg-white` and onto subtle `var(--canvas-raised)` tints with blur for legibility on the gold hero gradient.
- `AchievementUnlock` + trip setup `FormatSelector` modal header: swapped close/stat/hero capsules off `bg-white/*` overlays and onto tokenized `var(--canvas-raised)` blur treatments.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`2bab66a`)

### 21:20 EST — Phase 2 — Remove remaining `bg-white` UI fragments (iOS + Achievements + Lineup)
- `IOSScrollContainer`: pull-to-refresh indicator now uses premium raised surface + rule border tokens instead of `bg-white`; icon tint aligned to `var(--masters)`.
- `/achievements`: progress bar track/fill now use `var(--canvas)` tints instead of `bg-white/*` so the hero stays consistent across theme shells.
- `/lineup/new`: “Use Defaults & Continue” CTA now uses token-driven canvas tints + `backdrop-blur-sm` instead of inline `rgba(255,255,255,…)` + `hover:bg-white/30`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅

### 21:05 EST — Phase 2 — Notification system overlays: premium token sweep
- `NotificationToast` now uses premium tone maps for urgent/high/medium/low priorities instead of inline rgba backgrounds, with tokenized icon, action, and dismiss treatments to stay legible on light/dark shells.
- `NotificationBell` + stack controls swapped lingering `bg-white/*` hover states and the red badge for premium canvas/error tokens with shared focus rings.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d9c05f2`)

### 20:35 EST — Phase 2 — iOS install sheet + stroke alert banner: remove remaining white overlays
- `IOSInstallPrompt`: replaced the remaining `bg-white/*` close button + app icon capsule tints with token-driven canvas tints so the iOS install sheet stays consistent across themes.
- `StrokeAlertBanner`: replaced the header dismiss hover `bg-white/20` tint with a tokenized canvas overlay.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`323a374`)

### 20:15 EST — Phase 2 — Live play capture affordances: premium token sweep
- `QuickPhotoCapture`: replaced gradient + white overlay styles with premium surface/ink tokens, added tokenized focus ring + hover states, and swapped capture button halos to `var(--canvas-raised)` tints so the camera tray stays readable across themes.
- `VoiceScoring`: migrated idle/listening/processing/error shells off raw `bg-white/*` overlays and inline rgba backgrounds onto premium Masters/error tone tokens; standardized cancel/retry actions on shared neutral overlays and swapped the loader accent to `var(--masters)`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅

### 19:52 EST — Phase 2 — Live scoring affordances: premium overlay tokens
- `QuickScoreFABv2`: replaced the remaining `bg-white/*` overlays (pulse halo, icon capsule, LIVE badge, menu close control) with `var(--canvas-raised)` tone-driven tints so the quick-score affordance stays legible across light/dark themes.
- `OfflineIndicator`: swapped offline queue badges and detail dividers off hard-coded `white/*` backgrounds onto shared surface tokens to keep status chips and retry counts readable without blowing out dark mode.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅

### 19:16 EST — Phase 2 — Trip recap hero: premium token alignment
- `HeroBanner` on `/recap`: swapped hard-coded USA/EUR gradients, white typography, and badge overlays for token-driven team gradients (`var(--team-usa/europe-gradient-*)`), canvas text, and gold accents so the headline and scoreline stay readable across themes.
- `OverviewSection` MVP card + leaderboard medals now rely on premium gold tokens instead of raw `rgb()` yellows.
- `PhotosSection`: replaced black/white overlays with ink/canvas token tints so moment badges and captions stay legible without breaking dark mode.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`85f4f0d`).

### 19:12 EST — Phase 2 — Live match banner CTA: premium token sweep
- `LiveMatchBanner` + `LiveMatchPill`: replaced hard-coded crimson gradients, white overlays, and text treatments with premium error + canvas tokens (`var(--error)`, `var(--canvas-raised)`) and token-driven `color-mix` tints so the live CTA matches the editorial palette across themes.
- Dismiss affordance, live badges, and pulse indicators now rely on tokenized Tailwind classes instead of `bg-white/*` utilities, keeping hover/focus states readable in both light and dark contexts.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3fd8882`).

### 19:05 EST — Phase 2 — Bulk import modal: premium token alignment
- `BulkImportModal`: replaced legacy `bg-white`/`text-gray-*`/`border-gray-*` classes with premium surface/ink/rule tokens, added border + card shadow so the import dialog matches the editorial shell.
- Success/warning/error summaries now use token-tinted backgrounds + icon colors (`var(--success)`, `var(--warning)`, `var(--error)`) and the preview table relies on neutral rule/ink tokens instead of Tailwind grays.
- CTA buttons, method cards, and helper links now lean on Masters brand tokens for hover/focus states, with disabled styling mapped to neutral ink tints.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c299eb7`).

### 18:50 EST — Phase 2 — Captain dashboard + session tools: premium token cleanup
- `AlertCenter`: tokenized alert summary counts (warning/info/neutral) and replaced inline styles with premium ink/status classes.
- `BatchScoreGrid`: tokenized the status bar + scroll controls (warning/error/success dots + icons, selected segment surfaces) and removed remaining inline ink/rule styles.
- `PointsCalculator`: aligned the “Final” badge and scenario summary success state to premium success tokens.
- `SessionCloner`: migrated player rows and exclude/replace controls off inline ink + hard-coded red/green colors onto premium ink + success/error tokens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`fc5ab1f`)

### 18:45 EST — Phase 2 — Captain monitors: status token alignment
- SessionCloner roster summary and preview badges now use premium success/warning tokens (no inline rgba/hex overrides) while keeping neutral copy on the shared ink palette.
- BatchScoreGrid save footer + error banner moved onto masters/error token classes for consistent call-to-action and validation states.
- LiveMatchMonitor status config + alert ring now map to premium success/warning/error tokens instead of hard-coded hex colors.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`13f59a3`)

### 18:24 EST — Phase 2 — PreFlightChecklist: premium token sweep
- `PreFlightChecklist` (captain dashboard): migrated the summary header, progress meter, and status sections off Tailwind gray/green/yellow palettes onto premium surface/ink/status tokens, eliminating dark-mode branches and inline color mixes.
- Error/warning/info cards now use shared tone tints (`bg-[color:var(--success/warning/error)]/…`) and tokenized typography so captains get consistent feedback across themes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1b86443`)

### 18:09 EST — Phase 2 — Undo toast + offline indicator: premium token alignment
- `UndoToast`: replaced inline `surface-card`/`masters-gold` styling with premium surface, rule, and ink token classes; added focus ring + tone-consistent label colors so the undo affordance stays legible across themes.
- `OfflineIndicator`: removed inline background/border colors in favor of premium status + surface tokens, keeping the banner readable for offline + back-online states and adding subtle elevation.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3debaf6`)

### 18:02 EST — Phase 2 — WeatherBanner: premium token alignment
- `WeatherBanner`: replaced legacy emerald/amber/red palette utilities for delay states with premium status tokens (`var(--success)`, `var(--warning)`, `var(--error)`) and tokenized the weather icons to keep the banner consistent across themes.
- Neutral weather fallback now uses premium masters/ink tokens without dark-mode branches, and high-precipitation copy leans on the shared warning tone instead of bespoke Tailwind colors.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`520d741`)

### 16:55 EST — Phase 2 — CaptainToolkit: avoid silent empty panel on unknown section
- `CaptainToolkit`: replaced the fallback `return null` in `renderActiveSection()` with a compact `EmptyStatePremium` so unexpected/invalid section IDs don’t yield an empty card.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5c02b73`)

### 17:00 EST — Phase 2 — MatchStatusHeader: avoid silent gap when no match is resolved
- `MatchStatusHeader` (live-play): replaced the render-level `return null` when `statusData` can’t be derived with a compact “No match in progress” affordance that routes to `/schedule`.
- Prevents an unexplained blank gap at the top of screens when a trip exists but there’s no in-progress match for the default player.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d2acb8c`)

### 17:35 EST — Phase 2 — Settings Backup + Notifications: premium status token sweep
- `/settings/backup`: replaced hard-coded Tailwind palettes (`emerald-*`, `red-*`, `blue-*`) with premium status tokens (`var(--success)`, `var(--error)`, `var(--info)`) for success banners, import previews, and import result cards.
- `/settings/notifications`: tokenized the “Notifications enabled” status card and tee time reminder icon treatment off `emerald-*` and onto `var(--success)`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`21dfd7e`)

### 16:40 EST — Phase 2 — SideBetsTracker: premium token sweep + explicit empty states
- `SideBetsTracker` (captain tools): migrated legacy Tailwind gray/green/blue palettes + dark-mode branches to the premium surface/ink/rule + status token system (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`, `var(--masters)`, `var(--info)`, `var(--success)`, `var(--error)`), and standardized the tabs + form controls to the shared look.
- Replaced first-time-use silent gaps with compact `EmptyStatePremium` cards for **No side games**, **No expenses**, and **No balances**.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`dd78c53`)

### 16:25 EST — Phase 2 — FourballScoreEntry: remove inline token style props
- `FourballScoreEntry`: migrated remaining inline `style={{ color: 'var(--…)' }}` usages (icon + labels + helper text) onto token-driven Tailwind classes (`text-[var(--ink-secondary)]`, `text-[var(--ink-tertiary)]`, etc.).
- Best-ball badge now uses a CSS variable (`--team-color`) + Tailwind `bg-[color:var(--team-color)]/20` for consistent theming without manual hex alpha concatenation.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3241408`, docs `4051124`)

### 15:45 EST — Docs — WORKLOG: restore chronological ordering
- Reordered the 2026-02-13 entries so the late-night **SessionLockManager** checkpoint (20:58) appears in correct time order within the day.
- Documentation-only cleanup to keep the Lobster log scannable.
- Reorder commit: `ac32795`
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e0caf6c`)

### 15:55 EST — Phase 2 — Captain DirectMessage: premium token alignment
- `DirectMessage` (captain tools): migrated remaining inline styles / legacy tokens (`var(--ink)`, `var(--ink-muted)`, `rgba(...)`, `hover:bg-white/*`) onto the premium surface/ink/rule + status tokens (`var(--surface-*)`, `var(--ink-primary/tertiary)`, `var(--rule)`, `var(--error)`, `var(--masters)`), and standardized team dots to Ryder Cup team tokens (`bg-team-usa`, `bg-team-europe`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`4364868`)

### 20:58 EST — Phase 2 — SessionLockManager: premium token sweep
- `SessionLockManager` (scoring finalize/lock flow): migrated remaining hard-coded Tailwind palettes (amber/blue/grays/reds) onto premium status + surface + ink tokens (`var(--warning)`, `var(--info)`, `var(--error)`, `var(--surface-*)`, `var(--ink-*)`, `var(--rule)`), including modal icon treatments, warning callout, PIN input focus styles, and the finalized badge.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a2a3f29`)

### 15:35 EST — Phase 2 — Captain lineup builder: premium token alignment
- `LineupCanvas`, `MatchSlot`, `PlayerCard`: migrated remaining Tailwind gray palettes (`bg-gray-*`, `hover:bg-gray-*`) and hard-coded hex status colors to the premium surface/ink/rule + status token system.
- Standardized skeleton/loading placeholders to premium neutral surfaces (`var(--surface-secondary)`), and replaced ring/selection colors with tokenized tones (`var(--success)` / `var(--info)`).
- Status badges now use token-driven tint backgrounds (`bg-[color:var(--tone)]/10`) instead of manual hex + alpha concatenation.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`624e163`)

### 15:05 EST — Phase 2 — MatchCardGenerator + SettingsPanel toggle: premium token cleanup
- `MatchCardGenerator`: migrated remaining legacy ink/border/hover palette fragments (`var(--ink)`, `var(--ink-muted)`, `rgba(...)`, `hover:bg-white/10`, `text-green-500`) onto premium tokens (`var(--ink-primary/secondary/tertiary)`, `var(--rule)`, `bg-[color:var(--ink-primary)]/10`, `var(--success)`), keeping the printable match cards UI consistent with the premium shell.
- `SettingsPanel`: tokenized the toggle knob to use premium surfaces/rules instead of `bg-white`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c393f20`)

### 15:02 EST — Phase 2 — DraftBoard: premium token alignment
- `DraftBoard` (captain tools): migrated the draft mode selection cards, in-progress header controls, pick banners, tables, and action buttons off hard-coded Tailwind palette utilities (`gray-*`, `blue-*`, `green-*`, `red-*`, dark variants) onto the premium surface/ink/rule + status tokens.
- Team pick banners and team headers now use Ryder Cup team tokens (`bg-team-usa/10`, `bg-team-europe/10`, border team accents).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`df6e950`)

### 14:30 EST — Fix — dramaNotificationService: remove unsupported `renotify` option
- `dramaNotificationService`: removed the `renotify` field from `sendNotification` options to satisfy TypeScript (`NotificationOptions` type in this project does not include `renotify`).
- Unblocks the pre-push `typecheck` gate after rebasing on latest `origin/main`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`816af59`)

### 14:10 EST — Phase 2 — Root layout loading fallback: remove CSS var fallbacks
- `src/app/layout.tsx`: removed `bg-[var(--canvas,#...)]` / `border-[var(--rule,#...)]` / `border-t-[var(--masters,#...)]` / `text-[var(--ink-secondary,#...)]` fallback forms from the global `Suspense` loading UI.
- Standardizes the last “fallback token” usage onto the premium token system and reduces Tailwind/CSS optimizer warnings.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b1ea0e4`)

### 12:45 EST — Phase 2 — Fix ESM import ordering (logger const after imports)
- Fixed invalid `import` ordering in:
  - `src/components/social/DaySummaryCard.tsx`
  - `src/lib/services/courseLibrarySyncService.ts`
  - `src/lib/services/liveUpdatesService.ts`
  - `src/lib/services/tripSyncService.ts`
- Ensures the files are valid ESM/TypeScript modules (no `import` statements after runtime declarations like `const logger = …`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`426d1ae`)

### 12:31 EST — Phase 2 — AppShell global loading overlay: premium token alignment
- `AppShell`: migrated the global loading overlay card and spinner off `bg-white`/`dark:bg-gray-*` + `border-gray-*` + `border-t-green-*` palettes onto premium surface/rule/ink/Masters tokens (`bg-[var(--surface-raised)]`, `border-[var(--rule)]`, `text-[var(--ink-secondary)]`, `border-t-[var(--masters)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a2d6c65`)

### 12:14 EST — Phase 2 — TeeTimeGenerator: premium token sweep
- `TeeTimeGenerator` (captain tools): migrated the generator header, settings panel, summary bar, table, and actions off legacy Tailwind palette utilities (`blue-*`, `gray-*`, dark-mode branches) onto the premium surface/ink/rule + status tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`, `var(--info)`, `var(--masters)`), and standardized team labels to Ryder Cup team tokens (`text-team-usa` / `text-team-europe`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`2362df1`)

### 11:41 EST — Phase 2 — WeatherWidget: premium token alignment (icon + precip accents)
- `WeatherWidget`: replaced remaining Tailwind palette icon/precipitation accents (`yellow-*`/`blue-*`/`gray-*`/`slate-*`) with premium status + ink tokens (`var(--warning)`, `var(--info)`, `var(--ink-tertiary)`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e367590`)

### 11:37 EST — Phase 2 — Captain MatchCardGenerator: premium token sweep
- `MatchCardGenerator`: migrated printable/shareable match cards off hard-coded hex + Tailwind gray/red/blue palettes onto premium surface/ink/rule tokens and Ryder Cup team tokens (`bg-team-usa` / `bg-team-europe`).
- Standardized headers, dividers, info bars, player rows, and QR placeholder onto `var(--surface-*)` + `var(--ink-*)` + `var(--rule)`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`2726ed5`)

### 09:28 EST — Phase 2 — SwipeScorePanel + HoleScoreDisplay: premium token sweep
- `HoleScoreDisplay`: replaced remaining gray divider separators (`bg-gray-*`, dark-mode branches) with the premium rule token (`bg-[var(--rule)]`).
- `SwipeScorePanel`: migrated halved badge + helper copy + halved tap button off gray palette utilities onto premium surface/ink tokens (`bg-[color:var(--ink-secondary)]/80`, `text-[var(--ink-tertiary)]`, `bg-[var(--surface-secondary)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d7baf4f`)

### 09:18 EST — Phase 2 — Scoring mini-map + QuickScoreFABv2: premium token sweep
- `HoleMiniMap`: replaced gray palette dividers/borders/labels (`bg-gray-*`, `text-gray-*`, `border-gray-*`, dark-mode branches) with premium rule + ink tokens (`bg-[var(--rule)]`, `border-[var(--rule)]`, `text-[var(--ink-*)]`).
- `QuickScoreFABv2`: replaced the gray divider + hover palette classes with premium surface + rule tokens (`bg-[var(--rule)]`, `hover:bg-[var(--surface-secondary)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7c21f48`)

### 01:15 EST — Phase 2 — Trip Awards route: premium token sweep
- `/trip/[tripId]/awards`: replaced remaining legacy `bg-white`/`text-gray-*`/`border-gray-*` utilities with premium surface + ink + rule tokens.
- Award cards + leaderboard rows now use token-driven surfaces (`var(--surface-card)` / `var(--surface-secondary)`), ink (`var(--ink-*)`), and card borders/shadows (`border-[var(--rule)]`, `shadow-card-sm`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`243c3b3`)

### 00:35 EST — Phase 2 — InstallPrompt: premium token sweep (PWA + iOS install UI)
- `InstallPrompt` (PWA install banners + iOS instructions): migrated remaining legacy `bg-white` / `border-stone-*` / iOS-blue palettes to premium surfaces + rule + status tokens (`var(--surface-*)`, `var(--rule)`, `var(--info)`, `var(--masters)`), and standardized copy onto premium ink tokens (`var(--ink-primary)` / `var(--ink-secondary)`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f29eebc`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimizer warnings)

## 2026-02-12

### 19:05 EST — Phase 2 — OfflineIndicator chips: tokenize sync/offline/online colors
- `OfflineIndicator`: migrated the small **Online** pill icon off `text-green-500` and onto the premium success token (`var(--success)`).
- `SyncStatusChip` + `OfflineChip`: replaced hard-coded red/blue palette tints (`bg-*/border-*` + `text-*`) with premium status tokens (`var(--error)`, `var(--info)`), keeping borders/tints consistent across themes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 18:40 EST — Phase 2 — SyncStatusBadge + StrokeScoreEntry: premium token alignment
- `SyncStatusBadge`: replaced hard-coded Tailwind palettes (green/blue/red/gray) with premium tone tokens (`var(--success)`, `var(--info)`, `var(--error)`, `var(--ink-*)`) and token-driven tint backgrounds so the badge remains theme-consistent.
- `StrokeScoreEntry`: replaced `bg-gray-*` separators and inline ink styles in the Hole info row with premium rule/ink token classes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 17:30 EST — Phase 2 — SessionWeatherPanel: premium status tokens (remove hard-coded palettes)
- `SessionWeatherPanel`: replaced hard-coded Tailwind palette utilities (red/orange/yellow/blue/green) with premium status tokens (`var(--info)`, `var(--warning)`, `var(--success)`, `var(--error)`) for icons, alert cards, recommendation badges, and error/recommendation panels.
- Also removed dark-mode-specific palette branches in favor of token-driven tints + premium ink.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a566d20`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimizer warnings)

### 16:56 EST — Phase 2 — TripArchiveCard: premium token + team palette sweep
- `TripArchiveCard` (trip history): replaced legacy `bg-white`/`dark:bg-gray-*` shell + indigo/purple/blue/red palettes with the premium `.card` surface and token-driven inks/surfaces/rules.
- Header now uses a Masters gradient (`var(--masters)` → `var(--masters-deep)`); all-time standings + timeline winner states use Ryder Cup team tokens (`bg-team-usa` / `bg-team-europe`, `text-team-*`).
- Compare/selected states now use premium `var(--info)` + `var(--masters)` accents; badges use `var(--success)`/`var(--warning)`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c28263d`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimizer warnings)

### 16:20 EST — Phase 2 — iOS ContextMenu + iOS install prompt: token sweep
- `IOSContextMenu`: replaced `bg-white/*` + `border-white/*` + `bg-gray-200` separator with premium surface/rule tokens so the blur menu is consistent across themes.
- `IOSInstallPrompt`: removed hard-coded hex palette and migrated instruction body surfaces + inks onto premium tokens (`var(--surface-secondary)`, `var(--ink-*)`, `var(--masters)`, `var(--info)`), keeping the iOS sheet style while matching the premium design system.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`209407d`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimizer warnings)

### 15:25 EST — Phase 2 — HammerGameCard: premium token sweep
- `HammerGameCard`: migrated the Hammer game setup + gameplay UI off legacy `bg-white`/`dark:bg-gray-*` and hard-coded Tailwind palettes (amber/orange/green/red/blue) onto premium surface/ink/rule + status tokens.
- Team selection + payouts now use Ryder Cup team tokens (`bg-team-usa`, `bg-team-europe`, `text-team-*`) and success/error/info tokens for actions.
- Header + primary actions now use `var(--masters)` for consistent premium theming.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e6690a1`)

### 14:55 EST — Phase 2 — iOS sheets + Weather alerts: premium token sweep
- `IOSBottomSheet`: replaced `bg-white` and hard-coded gray handle/hover classes with premium surface/rule/ink tokens; snap indicators now use `var(--masters)` + neutral token tints.
- `IOSActionSheet`: migrated the iOS-style translucent panels and dividers off `bg-white`/`border-gray-*` and replaced iOS-blue / destructive reds with premium `var(--info)` + `var(--error)` tokens; active/pressed states now use premium surface tints.
- `WeatherAlertBanner`: replaced hard-coded Tailwind severity palettes (`blue/yellow/orange/red`) and dark-mode branches with premium status tokens (`var(--info)`, `var(--warning)`, `var(--error)`) + neutral ink/rule so alerts remain legible across themes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3a01aa0`)

### 14:10 EST — Phase 2 — SyncStatusIndicator: premium token tones (remove hard-coded red/blue/amber/green)
- `SyncStatusIndicator`: migrated minimal/compact/full variants off hard-coded Tailwind status colors (`red-500`, `blue-500`, `amber-*`, `green-*`) onto premium design tokens (`var(--warning)`, `var(--info)`, `var(--success)`, `var(--ink-tertiary)` for offline).
- `LastSyncedTimestamp`: aligned syncing/offline text colors to the same token system.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`13a0279`)

### 13:45 EST — Phase 2 — Tokenize remaining Trip Settings gradient accent
- `/trip/[tripId]/settings`: replaced the last `from-masters-green/15` gradient overlay with token-driven `from-[color:var(--masters)]/15` so the premium texture overlay stays theme-consistent.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a95240f`)

### 13:20 EST — Phase 2 — Remove remaining legacy `augusta-green`/`masters-green` classes (PWA banners + trip setup + Storybook)
- `PWABanners`: offline + update banners now use premium warning + Masters tokens (no hard-coded `amber-*` / `augusta-green`).
- Trip setup: `PointSystem` + `TeamColorPicker` accents now use `var(--masters)` token-driven Tailwind.
- Storybook: `Card.stories` + `Modal.stories` examples now use `var(--masters)` instead of `masters-green`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e06bb25`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimizer warnings)

### 13:05 EST — Phase 2 — Tokenize remaining `masters-green` classes (Course Library + scoring)
- `/courses`: replaced remaining `bg-masters-green/*` + `text-masters-green-*` accents in the course cards + info banner with premium `var(--masters)` tokens.
- `SwipeScorePanel`: focus ring now uses token-driven `focus:ring-[var(--masters)]` instead of a legacy Tailwind color.
- Trip setup `FormatSelector`: replaced remaining `bg-masters-green` usage with token-driven `var(--masters)`.
- Root `layout` skip-link: replaced `focus:bg-masters-green` with `focus:bg-[var(--masters)]` for theme-consistent accessibility styling.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`eaf436b`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimizer warnings)

### 12:31 EST — Docs — WORKLOG backfill: add missing commit hashes
- `Docs/lobster/WORKLOG.md`: filled in missing commit hashes for two older Phase 1 entries so the historical log consistently references the exact landed changes.
  - PWABanners InstallPrompt stub removal → `c5d78be`
  - ConnectionStatusBadge local-only badge → `fcefb45`
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`08ab320`)

### 12:08 EST — Phase 2 — Pending sync surfaces: premium token alignment
- `PendingSyncIndicator`, `SyncBadge`, and `SyncStatusRow`: replaced legacy `bg-white`/`bg-amber-*`/`text-stone-*` classes with premium surface/ink/rule tokens, reusing shared tone maps for syncing/pending/offline states so the widgets stay legible across themes.
- Floating indicator now uses a neutral premium surface with tone-specific icon chips, tokenized rings, and focus-visible outlines to match the premium shell and keep offline status accessible in dark mode.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`53b6cdc`)

### 11:56 EST — Phase 2 — Course + trip setup accents: replace `augusta-green` + legacy grays with premium tokens
- `SideBetPresets`: replaced remaining `bg-surface-*` + `augusta-green` chips and action states with premium surface/ink/rule tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--masters)`, `var(--error)`), eliminating dark-mode branches.
- `CourseSearch`: migrated search/results UI off hard-coded `gray-*` palettes and `augusta-green` accents onto premium token-driven Tailwind; standardized inputs, cards, warnings, and error states to the shared surfaces/ink.
- `CourseSelection` + `SessionBuilder`: replaced remaining `augusta-green` selection and hover accents with token-driven `var(--masters)` and neutral surfaces/rules.
- `/trip/[tripId]/awards`: tab navigation now uses premium surfaces and `var(--masters)` for the active state.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`504eea6`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 11:08 EST — Phase 2 — Nassau Enhanced card: premium token sweep
- `NassauEnhancedCard`: replaced legacy `bg-white`/`dark:*` surface palettes and `text-gray-*` ink utilities with the shared premium `.card` shell, token-driven ink/surface/team classes, and primary button/input patterns so the Nassau side game aligns with the premium shell.
- Auto-press configuration now uses premium success + neutral tokens for the toggle, team selection chips reuse Ryder Cup team tokens, and standings/payout/press pills leverage the standard warning/success accents instead of bespoke Tailwind colors.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`617b78a`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimizer warnings about token parsing)

### 10:38 EST — Phase 2 — Trip setup scoring format: premium token sweep
- `ScoringFormatOptions`: migrated legacy `surface-*`, `augusta-green`, and `text-surface-*` utilities to premium token-driven Tailwind for cards, toggles, and Stableford configuration so the trip scoring setup matches the premium shell.
- Format badges now use premium status tokens (`var(--masters)`, `var(--info)`, `var(--color-accent)`, `var(--warning)`) with shared ring/masters-subtle selection states, and supporting copy moved onto the shared `ink` token palette.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`9ec65d9`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 10:20 EST — Phase 2 — Trip setup imports + side bets: premium token sweep
- `PlayerRosterImport`: migrated remaining legacy `surface-*` palette utilities and `augusta-green` accents to premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`, `var(--masters)`), removing theme-specific branches.
- `SideBetPresets`: migrated header + preset pills + amount labels off legacy `surface-*` palette utilities onto premium tokens for consistent theme behavior.
- Storybook: updated `Button` + `Input` RealWorldExamples wrappers to use the shared `.card` surface and premium ink tokens (no `bg-surface-base` / `text-canvas`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`2f3e2d3`)

### 09:15 EST — Phase 2 — EnhancedTripWizard: premium token sweep
- `EnhancedTripWizard` (trip setup): migrated remaining legacy `surface-*` palette utilities and `augusta-green` accents to premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`, `var(--masters)`).
- `Badge.stories.tsx`: removed legacy `bg-surface-base` / `text-canvas` usage in the RealWorldExamples story so Storybook examples don’t demonstrate deprecated classes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`9cb350d`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 08:50 EST — Phase 2 — PlayingStyleSurvey: premium token sweep
- `PlayingStyleSurvey` (player onboarding): migrated legacy `surface-*` palette utilities (`bg-white`, `border-surface-*`, `text-surface-*`, dark variants) onto premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`) and the shared `.card` surface.
- Progress and navigation UI now use premium neutral tokens, reducing theme drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1a8b066`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 08:30 EST — Phase 2 — ProfilePhotoUpload: premium token sweep
- `ProfilePhotoUpload` (player onboarding): migrated legacy `surface-*` palette utilities (`bg-white`, `dark:bg-surface-*`, `border-surface-*`, `text-surface-*`) to premium token-driven Tailwind (`var(--surface-raised)`, `var(--surface-secondary)`, `var(--rule)`, `var(--ink-*)`), keeping the photo picker modals and actions consistent across themes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5fbac9d`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 07:58 EST — Phase 2 — Trip setup HandicapRules: premium token sweep
- `HandicapRules` (trip setup): migrated legacy `surface-*` palette utilities + `augusta-green` accents onto premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`, `var(--masters)`), removing dark-mode palette branches.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c23306e`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 07:28 EST — Phase 2 — Player onboarding AvailabilityCalendar: premium token sweep
- `AvailabilityCalendar`: migrated the calendar container, expanded session cards, and note modal off the legacy `surface-*` palette and onto premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`), keeping the semantic availability colors intact.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1790ac6`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 07:25 EST — Phase 2 — Player onboarding TripWelcomeCard + GolfSuperlatives: premium token sweep
- `TripWelcomeCard`: replaced legacy `surface-*` palette utilities and dark-mode branches with premium `.card` surfaces and token-driven ink/rule classes; standardized the hero wave fill to `var(--canvas)`.
- `GolfSuperlatives`: migrated the onboarding card, progress track, input, and actions off legacy `surface-*` palette classes onto premium tokens (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`31e0408`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 06:28 EST — Phase 2 — Trip Settings + SessionTimeoutWarning: premium token sweep
- `/trip/[tripId]/settings`: migrated remaining legacy `text-text-*` utilities onto premium ink tokens (`text-[var(--ink-primary)]` / `text-[var(--ink-secondary)]`) so the Trip Settings route is consistent with the premium shell.
- `SessionTimeoutWarning`: removed legacy `text-surface-*` usage in message + logout button and replaced with premium ink tokens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`90b09db`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 06:03 EST — Phase 2 — TripRecap: premium token sweep (remove legacy surface palette)
- `TripRecap` (social): migrated legacy `surface-*` palette utilities (`bg-surface-card`, `text-surface-*`, dark variants) onto premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`) and the shared `.card` surface.
- Match rows, player rows, tabs, and photos empty state now match the premium shell across themes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`44a6e73`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 05:32 EST — Phase 2 — Trip setup TeeTimePreferences: premium token sweep
- `TeeTimePreferences` (trip setup): migrated remaining legacy `surface-*` palette utilities + `augusta-green` accents onto the premium token-driven Tailwind system (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`, `var(--masters)`), removing dark-mode palette branches.
- Standardized separators and neutral pills to `var(--rule)` and premium surfaces (`var(--surface-secondary)` / `var(--surface-raised)`) so the scheduling UI stays consistent across themes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`0833bc7`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 05:15 EST — Phase 2 — Trip setup FormatSelector + PlayerCountSelector: premium token sweep
- `FormatSelector` + `PlayerCountSelector` (trip setup): migrated remaining legacy `surface-*` palette usage (`bg-*`, `border-*`, `text-*`, `hover:*`, dark variants) onto premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`, `var(--masters)`).
- Standardized the selection accents from legacy `masters-green`/`augusta-green` classes to `var(--masters)` + `var(--masters-subtle)`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ef4d599`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 04:47 EST — Phase 2 — Player onboarding QuickProfileMode + TravelLodgingInfo: premium token sweep
- `QuickProfileMode`: migrated remaining legacy `surface-*` palette utilities (text, borders, disabled states, error tint) onto premium token-driven Tailwind (`var(--ink-*)`, `var(--rule)`, `var(--error)`).
- `TravelLodgingInfo`: replaced legacy `bg-white/dark:bg-surface-*` + `border-surface-*` + `text-surface-*` utilities with premium `.card` surfaces and token-driven ink/rule/hover classes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`92f9d00`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 04:12 EST — Phase 2 — Global error page: replace legacy surface gradient + hard-coded reds
- `/global-error`: replaced the legacy `from-surface-*` gradient utilities with premium token-driven surfaces (`from-[var(--canvas)]` → `to-[var(--surface-secondary)]`).
- Standardized the error icon + dev-only stack text off hard-coded reds and onto the shared `var(--error)` token.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6877be7`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 03:55 EST — Phase 2 — Trip setup PointSystem + TeamColorPicker: premium token sweep
- `PointSystem` (trip setup): migrated legacy `surface-*` palette utilities (text, borders, hover states, steppers) onto premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`).
- `TeamColorPicker` (trip setup): migrated remaining legacy `surface-*` palette utilities (pills, tab container, borders, preview header/divider) onto premium design tokens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1f03bf7`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 03:19 EST — Phase 2 — SessionBuilder: premium token sweep
- `SessionBuilder` (trip setup): migrated remaining legacy `surface-*` palette utilities (backgrounds, borders, hover states, and text) onto premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ff0ac2d`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 03:05 EST — Docs — Worklog hash update (Phase 2 onboarding sweep)
- `Docs/lobster/WORKLOG.md`: updated the Phase 2 player onboarding token sweep entry to reference code commit `1965186` once the batch landed.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`da7ae31`)

### 03:03 EST — Phase 2 — Player onboarding GHIN + Side Bet: premium token sweep
- `GHINLookup`: migrated the lookup input, success states, and history cards off legacy `surface-*` palette utilities onto premium tokens; refreshed the loading/success accents to use shared Masters/success tokens.
- `SideBetOptIn`: replaced legacy `surface-*` toggles + info states with premium surface/ink/rule tokens and aligned the summary card and controls with the shared success tokens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1965186`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 02:56 EST — Phase 2 — ShareButton: premium tokens in fallback menu
- `ShareButton`: migrated the non-WebShare fallback menu off legacy `surface-*` palette utilities and onto premium token-driven Tailwind (`var(--surface-raised)`, `var(--surface-secondary)`, `var(--rule)`, `var(--ink-*)`).
- Copied state now uses the premium success token (`var(--success)`) instead of hard-coded green.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`574da3b`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 02:27 EST — Docs — Worklog chronological hygiene (2026-02-11)
- `Docs/lobster/WORKLOG.md`: fixed a minor ordering regression where the **23:24** Phase 2 entry had drifted below **20:45**; restored reverse-chronological ordering and removed an extra blank line.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`fc2ad5a`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 02:05 EST — Captain Settings: consistent premium header in empty states
- `/captain/settings`: added the standard `PageHeader` to the **No active trip** and **Captain mode required** empty-state shells so the page keeps consistent navigation + title context.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5b916f5`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 01:40 EST — Phase 2 — PlayerOnboardingWizard: premium token sweep
- `PlayerOnboardingWizard`: replaced remaining legacy `surface-*` palette utilities (bg/border/text/hover + dark variants) with premium token-driven Tailwind (`var(--canvas)`, `var(--surface)`, `var(--surface-secondary)`, `var(--rule)`, `var(--ink-*)`).
- Standardized disabled CTA state onto a token-neutral tint (`bg-[color:var(--ink-tertiary)]/10`) and removed remaining dark-mode palette branches.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`4d1ba10`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 01:05 EST — Phase 2 — MatchCard + ScoreButton: premium token sweep
- `MatchCard`: migrated remaining legacy `surface-*` palette utilities (hover/text/dividers) to premium tokens (`var(--surface-secondary)`, `var(--rule)`, `var(--ink-tertiary)`).
- `ScoreButton`: replaced legacy `surface-*` palette fallbacks for the “Halved” + default button states with premium surfaces/ink/rule tokens; standardized focus/selected rings to token-driven `var(--masters)` + `ring-offset-[color:var(--canvas)]`.
- `/score/[matchId]`: replaced a remaining `bg-surface-card` tooltip arrow block with the premium raised surface (`bg-[var(--surface-raised)]`) and premium rule border.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f8fb1b8`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 00:35 EST — Docs — WORKLOG date boundary ordering
- `Docs/lobster/WORKLOG.md`: moved late-night Phase 2 entries (20:45–23:59) back under **2026-02-11** so the 2026-02-12 section only contains post-midnight work.
- Minor whitespace cleanup in the moved block to keep the day reverse-chronological (latest-first).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`76ca5cd`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 00:20 EST — Phase 2 — Course + Trip Setup + Settings toggles: premium token sweep
- `CourseSelection` (trip setup): migrated legacy `surface-*` palette usage (text/background/border/hover) to premium tokens (`var(--surface-secondary)`, `var(--rule)`, `var(--ink-*)`).
- `/settings/appearance` + `/settings/scoring`: toggle tracks now use token-driven neutrals (`bg-[color:var(--ink-tertiary)]/25`) and toggle knobs use `bg-[var(--surface-raised)]`.
- `CourseDetails`: removed remaining legacy `surface-*` palette usage across tabs, tee cards, and scorecard tables; standardized neutrals onto premium surface/rule/ink tokens.
- `ProfileCompletionReward`: migrated remaining legacy `surface-*` palette utilities to premium token-driven text/surfaces and standardized the team card onto `.card`.

## 2026-02-11

### 23:59 EST — Phase 2 — Achievements + Social share/reactions: premium token sweep
- `Achievements`: migrated remaining legacy `surface-*` palette utilities (bg/border/text) to premium tokens (`var(--surface-secondary)`, `var(--rule)`, `var(--ink-*)`) and standardized cards onto the shared `.card` surface.
- Social: `ReactionPicker` emoji hover state now uses `hover:bg-[var(--surface-raised)]` (no legacy class).
- Social: `ShareCard` download button border/hover migrated to `border-[var(--rule)]` + `hover:bg-[var(--surface-secondary)]`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`86e14cd`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 23:24 EST — Phase 2 — Core UI primitives: migrate legacy surface/ink utilities to premium tokens
- `Badge`, `Card`, `Tabs`, `Tooltip`, `SectionHeader`, `Breadcrumb`, `LiveJumbotron`: replaced remaining legacy `surface-*` palette + `text-text-*` utilities with premium token-driven Tailwind (`var(--surface-*)`, `var(--rule)`, `var(--ink-*)`).
- Storybook `.stories.tsx` examples for these primitives were updated to match the token system so docs don’t demonstrate deprecated classnames.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 22:55 EST — Phase 2 — TrashTalkFeed + Lineup new: premium tokens for legacy surface palette
- `TrashTalkFeed`: migrated the remaining legacy `surface-*` palette utilities (borders/surfaces/text) to premium tokens (`var(--rule)`, `var(--surface-secondary)`, `var(--surface-raised)`, `var(--ink-*)`) so the match banter UI stays consistent across themes.
- `/lineup/new`: replaced `hover:bg-surface-100` with `hover:bg-[var(--surface-secondary)]` to avoid reliance on the legacy palette.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`4393797`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 22:40 EST — Phase 2 — ScoreCelebration/Toast: token-driven colors + team-color mix
- `ScoreCelebration` (hole-lost subtle feedback): replaced inline `teamColor + '40'` alpha concatenation with a token-safe `color-mix()` background and a single `--team-color` CSS variable.
- `ScoreToast`: replaced hard-coded hex colors for info/warning with premium tokens (`var(--info)`, `var(--warning)`) and switched success to `var(--success)`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`10fd177`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 22:15 EST — Phase 2 — Social Polls + PlayerStatsCard: premium `.card` + rule tokens
- Social Poll UI (`PollCard`, `CreatePollModal`): replaced legacy `card-surface` wrapper with the shared premium `.card` surface.
- Standardized section separators/dashed affordances off `border-[var(--surface-tertiary)]` and onto premium `border-[var(--rule)]` / `border-[color:var(--rule)]/40`.
- `PlayerStatsCard`: replaced legacy `card-surface` wrapper with `.card`; migrated section separators to `border-[var(--rule)]` and standardized the closing-rate track to a token-driven neutral (`bg-[color:var(--ink-tertiary)]/15`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f68a71a`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 21:55 EST — Phase 2 — Modal/Toast/ConfirmDialog: premium token sweep
- `Modal`: migrated overlay + dialog surfaces/borders/text off legacy inline `var(--surface-card)` / `--border-subtle` / `--text-*` and onto premium token-driven Tailwind (`var(--surface-raised)`, `var(--rule)`, `var(--ink-*)`).
- `Toast`: migrated toast container + item surfaces/borders/text onto premium tokens and removed legacy `hover:bg-surface-highlight` usage.
- `ConfirmDialog` (hook-driven): replaced broken `var(--color-*)20` alpha concatenation + legacy `--text-*` usage with token-driven Tailwind tone classes (`var(--error)`, `var(--warning)`, `var(--masters)`, `var(--success)`), preserving variants.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`2e38ec8`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 21:15 EST — Docs — Worklog chronological hygiene (2026-02-10)
- `Docs/lobster/WORKLOG.md`: re-sorted the 2026-02-10 entries so the day stays reverse-chronological (latest-first) and stops drifting as new batches land.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`98fea22`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 20:45 EST — Phase 2 — Notifications settings: accessibility labels for toggles
- `/settings/notifications`: added `aria-label` support to the toggle switch and set labels for tee time + type toggles so screen readers announce control purpose.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`28818ba`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 20:25 EST — Phase 2 — ConnectionStatus: premium token sweep
- `ConnectionStatus`: migrated remaining legacy `surface-*` palette usage (text/background/border utilities) to premium design tokens (`var(--ink-*)`, `var(--surface-secondary)`, `var(--rule)`), keeping warning/info/success states intact.
- `ActiveUsersIndicator` + Sync error banner: standardized neutral ink/surface tokens and removed `border-surface-card`/`bg-surface-*` usage for avatar pills.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`aa6b891`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 19:50 EST — Phase 2 — Day Summary modal: premium empty/loading states
- `DaySummaryModal` (social share card): replaced plain text placeholders with shared premium components:
  - `EmptyStatePremium` for **No active trip** and **No matches found** states.
  - `LoadingEmpty` for the “Generating summary…” state.
- Keeps modal content consistent with the premium shell and avoids sparse/unstyled interim states.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)

### 19:25 EST — Phase 2 — Trip creation preview: premium token sweep
- New trip flow (`/trip/new`): migrated remaining legacy `surface-*` palette usages (e.g. `text-surface-*`, `divide-surface-*`, `border-surface-*`, `bg-augusta-green/*`) to premium token-driven Tailwind (`var(--ink-tertiary)`, `var(--rule)`, `var(--masters)`), keeping the UI consistent with the premium shell.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5548a02`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 18:55 EST — Phase 2 — WeatherBanner: render when wind/temp provided
- `WeatherBanner`: updated the “don’t render” guard to treat `0` values as meaningful and to show the banner when *any* weather signal is present (condition, precip chance, temperature, or wind speed).
- Prevents a silent gap when `condition` is unset but wind/temperature data exists.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`842ef4e`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 18:30 EST — Phase 2 — Games/Exports/Stats/Notifications: replace legacy `card-surface` + borders
- `VegasGameCard` + `WolfGameCard`: replaced legacy `card-surface` wrapper with the shared premium `.card` surface and migrated section dividers to `border-[var(--rule)]`.
- `PDFExportPanel`: replaced the legacy wrapper with `.card`, migrated dividers to `border-[var(--rule)]`, and standardized neutral option/disabled surfaces on premium tokens.
- `StatsDashboard` + `NotificationSettings`: replaced remaining `card-surface` wrappers with `.card`; standardized divider rules and a neutral toggle track (`bg-[color:var(--ink-tertiary)]/25`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a099832`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 18:00 EST — Phase 2 — Trip Awards + shared Input: premium token sweep
- Trip Awards (`/trip-stats/awards`): replaced remaining legacy `card-surface`/`surface-*` + `text-text-*` utilities with premium `.card` + `var(--ink-*)`/`var(--rule)` tokens.
- Shared `Input` component: migrated label/ink, surfaces, borders, placeholders, disabled, and error states onto premium tokens; added `ring-offset-[color:var(--canvas)]` so focus styles render cleanly across themes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`539cb08`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 17:35 EST — Phase 2 — Courses page: premium token sweep
- `Courses` (`/courses`): replaced remaining legacy `bg-surface-card` / `border-surface-border` / `text-text-*` utilities with premium token-driven Tailwind and the shared `.card` surface.
- Course cards now use consistent premium surfaces and ink tokens; search input + quick action tiles match the rest of the premium shell.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`88f6b14`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 17:10 EST — Phase 2 — CourseDetails: replace legacy `bg-surface-card` blocks with premium `.card`
- `CourseDetails`: migrated the map wrapper, tee list, course stats, and “missing data” placeholder cards off legacy `bg-surface-card`/`border-surface-*` utilities and onto the shared premium `.card` surface.
- Keeps the course details UI consistent with the premium shell and reduces theme drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`190e2fc`) (pre-push `typecheck` + `test` + `build` passed; build emitted existing CSS optimization warnings)

### 16:55 EST — Phase 2 — Bets: replace shadcn `--muted` token
- Bets list + bet detail: replaced remaining `var(--muted)` surfaces with the premium token `var(--surface-secondary)` so “disabled/empty” pills and the Nassau team-selection disabled state render consistently across themes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`42e3634`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 16:15 EST — Docs — Worklog chronological hygiene (midday re-sort)
- `Docs/lobster/WORKLOG.md`: re-sorted the 09:15–15:55 entries to be reverse-chronological (latest-first), fixing a lingering 13:xx ordering issue.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7aab69a`)

### 15:55 EST — Phase 1 — Trip recap: highlights empty state
- Trip recap `HighlightsSection`: when a trip has no saved highlights, render the shared `EmptyStatePremium` instead of returning `null`, so the Top Moments section stays visible with clear guidance.
- Keeps the social recap free of silent gaps and aligned with the premium empty-state pattern.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`acdd239`)

### 15:35 EST — Phase 2 — Backup + ScorecardScanner: tokenize `--masters-subtle`
- Backup & Restore (`/settings/backup`): removed the Tailwind class fallback form `bg-[var(--masters-subtle,rgba(...))]` in favor of a stable token-driven class (`bg-[var(--masters-subtle)]`) to avoid CSS optimizer warnings.
- `ScorecardScanner`: replaced the remaining inline `style={{ background/color: 'var(--masters-subtle/masters)' }}` usage with token-driven Tailwind classes (`bg-[var(--masters-subtle)]`, `text-[var(--masters)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`40f0fe4`)

### 15:16 EST — Phase 2 — JoinTripModal: premium token sweep
- `JoinTripModal`: migrated modal surfaces/ink/rules off the legacy `surface-*` palette and onto premium token-driven Tailwind (`var(--surface-raised)`, `var(--surface)`, `var(--rule)`, `var(--ink-*)`).
- Input now uses the standard premium focus ring + ring offset (`ring-gold` + `ring-offset-[color:var(--canvas)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5823fc9`)

### 14:50 EST — Phase 2 — Remove remaining shadcn `--border`/`--card` CSS vars
- Offline Queue panel: replaced `bg-[var(--card)]`, `border-[var(--border)]`, and `text-[var(--ink)]` with premium tokens (`bg-[var(--surface-raised)]`, `border-[var(--rule)]`, `text-[var(--ink-primary)]`).
- QuickScoreFABv2 + FloatingMyMatch: replaced remaining `border-[var(--border)]` usage with premium `border-[var(--rule)]`.
- Players bulk-add dropzone: replaced dashed `border-[var(--border)]` with premium `border-[color:var(--rule)]/40`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a445d56`)

### 14:30 EST — Polish — Global error: token-driven ink + dark-mode gradient
- `src/app/global-error.tsx`: updated copy block + dev-only details panel to use premium token-driven ink/surface/rule classes so the global error page renders correctly in dark mode.
- Added `dark:from-surface-900 dark:to-surface-950` to the page gradient background.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`aab0a8b`)

### 14:10 EST — Phase 2 — WeatherWidget + PhotoStrip: premium token sweep
- `WeatherWidget`: migrated remaining legacy `bg-surface-card` / `border-surface-*` / `text-surface-*` utilities to premium token-driven Tailwind (`var(--surface)`, `var(--surface-secondary)`, `var(--rule)`, `var(--ink-*)`) across loading/error/compact + forecast cards.
- `FactorBar`: updated the track color to a subtle token-driven neutral (`bg-[color:var(--ink-tertiary)]/15`) so the conditions bars render consistently across themes.
- `PhotoStrip` (in `PhotoGallery`): migrated thumbnail + “+N” pill backgrounds/text off the legacy `surface-*` palette and onto premium tokens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a7e25df`)

### 13:36 EST — Phase 2 — SideBets: premium token sweep + empty state upgrade
- `SideBets`: migrated remaining legacy `bg-surface-*` / `text-surface-*` utilities to premium token-driven Tailwind (`var(--surface)`, `var(--surface-secondary)`, `var(--ink-*)`, `var(--rule)`) across category headers, bet rows, and the add form so the component matches the premium shell.
- Replaced the bespoke inline empty state with the shared `NoBetsEmpty` so editable views surface the standard CTA and read-only views stay consistent.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`dd16081`)

### 13:25 EST — Phase 1 — FloatingMyMatch: show “Find my match” affordance when unresolved
- `FloatingMyMatch`: no longer silently disappears when the app can’t resolve a current match yet.
- When a trip exists but no match is found (and you’re not already on a scoring page), it now shows a small premium button that routes to `/schedule`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`9305cf2`) (pre-push `typecheck` + `test` + `build` passed)

### 13:20 EST — Docs — Worklog chronological hygiene
- `Docs/lobster/WORKLOG.md`: fixed a minor timestamp ordering issue in the 2026-02-11 section (08:50 entry now correctly precedes 08:25).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`00b6d76`)

### 13:10 EST — Phase 2 — Button/IconButton + PhotoGallery: premium token sweep
- `Button` + `IconButton`: replaced legacy `surface-*` + `text-text-*` utilities with premium token-driven Tailwind (`var(--surface-raised)`, `var(--surface)`, `var(--rule)`, `var(--ink-*)`) and updated focus ring offset to `ring-offset-[color:var(--canvas)]`.
- `PhotoGallery`: migrated legacy `bg-surface-*` / `text-surface-*` empty-state + upload progress styles to premium tokens (surface/rule/ink).
- `getWinnerStyles`: removed legacy `surface-*` classes for halved/none winner states in favor of token-driven neutral pill styles.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f32eb7d`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 12:55 EST — Phase 2 — SettingsPanel: premium token sweep (remove legacy surface palette)
- `SettingsPanel`: migrated remaining legacy `bg-surface-*` / `border-surface-*` / `text-surface-*` utilities to premium tokens (`var(--surface)`, `var(--surface-raised)`, `var(--rule)`, `var(--ink-*)`).
- Updates include the scoring-hand selector buttons, settings rows, storage/sync icons, and the Export/Import data cards.
- Toggle off-state now uses a token-driven neutral (`bg-[color:var(--ink-tertiary)]/25`) instead of the legacy surface palette.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b03f336`)

### 12:30 EST — Phase 2 — PathToVictoryCard: premium token sweep (remove legacy surface palette)
- `PathToVictoryCard`: migrated remaining legacy `bg-surface-*` / `border-surface-*` / `text-surface-*` utilities to premium tokens (`var(--surface)`, `var(--surface-raised)`, `var(--canvas-sunken)`, `var(--rule)`, `var(--ink-*)`).
- Keeps gamification UI consistent with the premium shell and reduces theme drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`997cccb`)

### 12:15 EST — Phase 2 — MomentumMeter: premium token sweep (remove legacy surface palette)
- `MomentumMeter`: migrated legacy `bg-surface-*` / `border-surface-*` / `text-surface-*` classes to the premium design tokens (`var(--surface)`, `var(--rule)`, `var(--ink-*)`).
- Keeps the momentum UI consistent with the rest of the premium shell and reduces theme drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`81489d3`)

### 11:50 EST — Phase 1 — QuickScoreFABv2: show “Start scoring” affordance when no active match
- QuickScoreFABv2 no longer disappears entirely when there’s no in-progress match.
- Instead, it renders a small premium “Start scoring” button that navigates to `/schedule`, so users always have an obvious scoring entry-point.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e1be826`)

### 11:30 EST — Phase 1 — SettingsPanel: import/clear without hard reload
- SettingsPanel data management actions now avoid `window.location.reload()` after **Import data** and **Clear all data**.
- After a successful import/clear, we reset in-memory trip state (`useTripStore.getState().clearTrip()`) and use Next router navigation (`router.push('/')` + `router.refresh()`) so the UI updates without a hard reload.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`28c1ad5`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 10:55 EST — Phase 1 — Captain Availability + Lineup toggle: remove undefined `bg-surface`
- Captain Availability (`/captain/availability`): session selector buttons now use premium surface + rule tokens instead of the undefined `bg-surface` utility.
- Lineup session (`/lineup/[sessionId]`): view-mode toggle buttons now use premium surface + rule tokens instead of `bg-surface`, and rely on `disabled:*` Tailwind classes instead of inline opacity.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5c3be62`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 10:35 EST — Phase 1 — Replace legacy `bg-surface/*` utilities + QuickScoreFABv2 typecheck fix
- Trip Settings (`/trip/[tripId]/settings`): replaced legacy `bg-surface/60 hover:bg-surface` buttons with premium token-driven Tailwind (`bg-[color:var(--surface)]/60`, `hover:bg-[var(--surface)]`, `border-[color:var(--rule)]/30`) and removed `PageHeader` icon inline color style.
- Live: `QuickStandingsOverlay` pull-indicator pill now uses premium surface + rule tokens instead of `bg-surface/80`.
- Live: `VoiceScoring` “not supported” disabled control now uses premium surface/ink/rule tokens (no undefined `bg-surface` class; removed inline ink color style).
- Scoring: fixed `QuickScoreFABv2` typecheck error by removing a stray `teamBColor` reference and using the team token via Tailwind.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c8220e7`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 09:40 EST — Captain Toolkit: premium tokens + EmptyStatePremium for no sessions
- Captain Toolkit: migrated UI surfaces/inks/rules off the hard-coded gray/blue palette and onto premium token-driven Tailwind (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`), keeping accent colors via `var(--color-accent)`.
- Tee Times / Smart Pairings / Weather sections: when there are no sessions, now render `EmptyStatePremium` (“No sessions created yet”) instead of bespoke placeholder blocks.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5eeee4a`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 09:15 EST — Phase 1 — OfflineIndicator: token-driven banner gradients
- Offline banner: replaced inline `style={{ background, paddingTop }}` with Tailwind classes.
- Uses `pt-[env(safe-area-inset-top)]` for iOS safe-area spacing and gradient utilities for offline/syncing/online states (`var(--masters)` → `var(--masters-deep)` for the “back online” banner).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e1fb04b`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 08:50 EST — Phase 1 — ScorecardScanner: remove remaining shadcn border token
- `ScorecardScanner` (preview → “Add another image” dashed dropzone): replaced `border-muted-foreground/*` with premium token-driven Tailwind (`border-[color:var(--rule)]/40` + hover state) to prevent silent theme drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`09b0122`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 08:25 EST — Phase 1 — ScorecardScanner: premium token sweep
- Course scorecard OCR (`ScorecardScanner`): migrated remaining shadcn tokens (`bg-background`, `bg-muted`, `border-border`, `text-muted-foreground`, `bg-card`) to premium token-driven Tailwind (`bg-[var(--canvas)]`, `bg-[var(--surface)]`, `border-[var(--rule)]`, `text-[var(--ink-secondary)]`).
- Updated `ScanScorecardButton` to match premium surfaces (surface + rule + raised hover).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ba1b6b7`) (pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

### 07:45 EST — Docs — Re-sort Lobster WORKLOG by date
- Moved the 21:05–23:45 entries that were accidentally logged under **2026-02-11** back under **2026-02-10**.
- Keeps the worklog chronological and avoids “future” timestamps.

### 07:25 EST — Captain Toolkit — Guard Smart Pairings when no sessions
- Captain Toolkit: in the Smart Pairings section, render a clear “No sessions created yet” empty-state card instead of passing an undefined session into `SmartPairingSuggestions`.
- Prevents potential runtime errors/silent gaps when captains open Pairings before creating sessions.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3c0c782`)

### 06:55 EST — Phase 1 — Bets modals + Trip settings: premium token surfaces
- Bets (`/bets` + `/bets/[betId]`): migrated remaining bottom-sheet/confirm modal surfaces off shadcn `bg-background` / `bg-muted` and onto premium surfaces (`bg-[var(--surface-raised)]`, `border-[var(--rule)]`) with consistent hover states (`hover:bg-[var(--surface)]`).
- Trip settings (`/trip/[tripId]/settings`): replaced remaining `border-border` section dividers with premium `border-[var(--rule)]`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`0db49c2`)

### 06:20 EST — Phase 1 — Home skeleton + Continue Scoring banner: premium token sweep
- `HomeLoadingSkeleton`: migrated the pulse blocks off shadcn `bg-muted/50` to premium token-driven Tailwind (`bg-[color:var(--ink-tertiary)]/10`) and removed remaining inline layout/token styles in favor of classnames.
- `ContinueScoringBanner`: removed the last `text-muted-foreground` usage and swapped inline gradient/border colors to token-driven Tailwind (`border-[var(--masters)]`, `bg-gradient-to-br from-[color:var(--masters)]/15 to-[color:var(--masters)]/5`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3afa1e0`)

### 05:55 EST — Phase 1 — Predictions + Cart Tracker: premium token sweep
- `MatchPredictions`: migrated prediction cards + bottom-sheet modal off shadcn tokens (`bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-muted-foreground`) onto premium design tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`), keeping the Masters + team accents.
- `CartTracker`: migrated the bottom sheet + controls off shadcn tokens onto premium tokens and standardized the selected state to use premium `var(--warning)`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f25f1de`) (note: pre-push `typecheck` + `test` + `build` passed; Next build reported an existing CSS optimization warning for a `bg-[var(...)]` class)

### 05:35 EST — Phase 1 — Photo capture + skeleton: premium token sweep
- Photo capture context panel + actions (`PhotoCapture`): migrated off shadcn `bg-card` / `border-border` and hard-coded gray palette onto premium design tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`, `var(--masters)`, `var(--success)`) with proper focus/hover states.
- `LiveMatchCardSkeleton`: migrated wrapper + header off shadcn tokens (`bg-card`, `border-border`, `bg-muted`) onto premium tokens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d78e294`)

### 05:10 EST — Phase 1 — Social Day Summary: premium token sweep
- Social Day Summary share card + modal (`DaySummaryCard`): migrated off shadcn `bg-card` / `border-border` / `bg-muted` / `bg-background` and `text-muted-foreground` onto premium design tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`), keeping share UI consistent with the premium shell.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`274194e`) (note: pre-push hook ran `typecheck` + `test` + `build` and all passed ✅)

### 04:25 EST — Phase 1 — Replace remaining shadcn `bg-card` tokens (Offline + live notifications)
- `OfflineIndicator`: the small “Online” reconnection pill now uses premium surface/rule tokens (`bg-[var(--surface)] border-[var(--rule)]`) instead of shadcn `bg-card border-border`.
- Live score notifications permission banner (`liveScoreNotifications.tsx`): migrated the container + description text off shadcn tokens (`bg-card`, `border-border`, `text-muted-foreground`) onto premium tokens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3ecf73b`)

### 03:55 EST — Phase 1 — Switch app shell to QuickScoreFABv2 (remove legacy modal)
- App root layout now renders `QuickScoreFABv2` (enhanced premium quick-score control).
- Removed legacy `QuickScoreFAB` + `QuickScoreModal` (and the modal unit test) to avoid duplicate/unused scoring entrypoints.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7324079`)

### 03:25 EST — Phase 1 — Remove unused legacy sync status components
- Removed the unused legacy sync UI module at `src/components/sync/*` (deprecated in favor of the newer premium sync/offline indicators).
- Reduces dead code + confusion from two similarly-named `SyncStatusIndicator` implementations.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`9ff91bf`)

### 02:48 EST — Phase 1 — PWA banners: remove unused InstallPrompt stub
- `PWABanners`: removed the unused `InstallPrompt` export that always returned `null` (the real install UI lives in `components/InstallPrompt.tsx`).
- Avoids confusing name collisions and ensures future imports don’t silently render nothing.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c5d78be`)

### 02:25 EST — Phase 1 — PointsCalculator: token-driven premium styles
- Captain dashboard `PointsCalculator`: removed inline `style={{...}}` usage for premium CSS tokens (surface/ink/masters/positive) in favor of token-driven Tailwind arbitrary-value classes.
- Keeps premium theming consistent and reduces silent style drift; dynamic team colors remain inline where required.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7d8200c`)

### 01:50 EST — Phase 1 — ConnectionStatusBadge: avoid silent gap when sync is local-only
- `ConnectionStatusBadge`: when Supabase sync is not configured, render an explicit "Local" badge (with `CloudOff` icon) instead of returning `null`.
- Keeps header UI stable and makes it clear that the app is running offline/local-only even while online.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`fcefb45`)

### 01:30 EST — Phase 1 — HandicapStrokeIndicator: avoid silent gap when no strokes
- `HandicapStrokeIndicator`: when both teams have 0 strokes, render an explicit compact “No handicap strokes” row (with `Info` icon) instead of `return null`.
- Prevents a confusing empty region in scoring headers where the strokes widget is expected.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a357b23`)

### 01:05 EST — Phase 1 — Tailwind: restore legacy `masters-primary*` color aliases
- Tailwind config: added legacy color aliases (`masters-primary`, `masters-primary-dark`) mapping to `var(--masters)` / `var(--masters-deep)` so existing classnames like `bg-masters-primary`, `text-masters-primary`, `hover:bg-masters-primary-dark`, `focus:ring-masters-primary` resolve correctly.
- This prevents silent styling failures after the palette refactor without needing to touch every component immediately.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`9c5c94b`) (note: pre-push hook ran `typecheck` + `test` + `build` and all passed ✅)

### 00:35 EST — Phase 1 — HandicapStrokeIndicator: token-driven premium styles
- `HandicapStrokeIndicator`: replaced inline `style={{...}}` (premium tokens + team colors) with token-driven Tailwind arbitrary-value classes (`bg-[var(--canvas-sunken)]`, `border-[var(--rule)]`, `text-[var(--team-usa)]`, `bg-[color:var(--team-usa)]/15`, etc.).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`bb8428f`)

### 00:10 EST — Docs — Phase 1 route sweep status + next optional component-level sweep
- `Docs/lobster/ALAN_IMPROVEMENT_PLAN.md`: documented that Phase 1’s route-level blank-screen sweep is functionally complete (as of 2026-02-06), and added a follow-on optional sweep for component-level `return null` “silent gaps”.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a73ed23`)

## 2026-02-10

### 23:45 EST — Phase 1 — SyncStatusIndicator: token-driven premium styles
- `SyncStatusIndicator` (full variant): migrated remaining `bg-card` / `surface-*` utility classes to the premium CSS tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`).
- Offline “many pending changes” warning now uses `var(--warning)` tokens instead of hard-coded amber palette.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`278b41f`) (note: pre-push hook ran `typecheck` + `test` + `build` and all passed ✅)

### 23:45 EST — Phase 1 — QuickScoreFABv2: token-driven styles
- QuickScoreFABv2: replaced inline token styles (`var(--surface/masters/ink-*)` + rgba badges/shadows) with token-driven Tailwind classes (e.g. `bg-[var(--masters)]`, `text-[var(--ink-secondary)]`, `shadow-[...]`, `bg-white/20`) for consistent premium theming.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d8266a7`)

### 23:20 EST — Phase 1 — Stats hub + Match Card generator: token-driven styles
- Stats hub (`/stats`): removed inline style props (icon color, margins, grid/padding, token backgrounds) in favor of Tailwind token/arbitrary-value classes.
- Captain `MatchCardGenerator`: replaced inline `var(--token)` text/background/border styles with token-driven Tailwind classes for consistent theming.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3aabb9f`)

### 23:15 EST — Phase 1 — Live + Courses + Standings: premium token sweep
- Live Scores (`/live`): migrated `LiveMatchCard` off shadcn-style tokens (`bg-card`, `border-border`, `bg-muted`, `text-muted-foreground`, `text-foreground`) onto premium design tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`) and standardized status pill colors using `var(--error)` / `var(--success)`.
- Add Course (`/courses/new`): removed remaining inline token styles (scan scorecard CTA + icon colors) in favor of token-driven Tailwind classes.
- Standings (`/standings`) Awards tab: removed inline gradient background in award icon blocks in favor of `bg-gradient-to-br from-[var(--masters)] to-[var(--masters-deep)]`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6e1fc4c`) (note: pre-push hook ran `typecheck` + `test` + `build` and all passed ✅)

### 22:21 EST — Phase 1 — PressTracker: token-driven styles
- Scoring `PressTracker`: replaced inline token styles (`style={{ background/color/border... }}`) with token-driven Tailwind arbitrary-value classes (e.g. `bg-[var(--surface)]`, `text-[var(--ink-secondary)]`, `border-[var(--rule)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`69b71b4`)

### 22:10 EST — Phase 1 — Finances progress bar + New Trip header icon: token-driven Tailwind styles
- Finances (`/finances`): replaced the progress bar’s inline `background` style with token-driven Tailwind classes (`bg-[var(--success)]` or `bg-gradient-to-r from-[var(--masters)] to-[var(--masters-deep)]`), keeping only the dynamic `width` inline.
- New Trip (`/trip/new`): replaced the `PageHeader` icon inline color style with Tailwind token class (`text-[var(--color-accent)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`abe1197`)

### 21:45 EST — Phase 2 — Live Scores: token-driven team accents
- Live Scores (`/live`): migrated the `PageHeader` icon accent off inline `style` onto token-driven Tailwind (`text-[var(--color-accent)]`).
- Live match cards: team dots and “winning team” highlight/score accents now use team CSS tokens via Tailwind (`bg-[var(--team-usa)]`, `bg-[color:var(--team-usa)]/15`, `text-[var(--team-usa)]`, etc.).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7ce1119`)

### 21:05 EST — Phase 1 — Course UI: replace undefined success/warning subtle tokens
- Course Scorecard OCR (`ScorecardScanner`) and Hole Data Editor validation banner: removed reliance on undefined CSS vars (`--success-subtle`, `--warning-soft`).
- Replaced with token-driven Tailwind classes (`bg-[color:var(--success)]/15`, `bg-[color:var(--warning)]/10`, `text-[var(--success)]` / `text-[var(--warning)]`) and removed a few inline icon/text style props.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d05d52b`)

### 20:30 EST — Docs — Worklog chronological hygiene
- `Docs/lobster/WORKLOG.md`: re-sorted the newest 2026-02-10 entries so the top of the day stays in chronological order as new batches land.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`75248ae`)

### 19:50 EST — Phase 2 — Captain dashboard LiveMatchMonitor: token-driven Tailwind styles
- `LiveMatchMonitor` (captain dashboard): removed most inline `style={{ ... }}` token usage (surface/border/ink colors, progress bar, alert banners) in favor of token-driven Tailwind classes.
- Kept truly-dynamic colors (team accents + status colors) inline where required.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`80d1ab8`)

### 18:58 EST — Phase 1 — Press tracker setup state
- Press tracking (scoring advanced tools): instead of rendering nothing when the default bet is unset, show a premium empty-state card explaining how to enable presses.
- Keeps the advanced tools accordion layout stable and guides captains to configure press tracking rather than presenting a blank region.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`69b71b4`)

### 18:25 EST — Docs — Log ThemeToggle hydration batch (push recovered)
- Worklogs: recorded the ThemeToggle hydration placeholder batch.
- Note: pushing from this environment also runs `pre-push` checks (`typecheck` + `test` + `build`) and they all passed ✅.
- Commit + push ✅ (`80d64eb`)

### 17:55 EST — Phase 1 — ThemeToggle: placeholder during hydration
- `ThemeToggle`: replaced the `!mounted → return null` hydration gate with a non-interactive placeholder sized to the selected variant.
- Prevents layout shift where the theme control would briefly disappear during client hydration.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`563893a`)

### 17:35 EST — Phase 1 — Home: YourMatchCard token-driven styles
- `YourMatchCard` (Home hero): removed large inline `style={{...}}` blocks (layout, borders, gradients, typography, CTA surface) in favor of token-driven Tailwind classes + `cn()`.
- Dynamic team accents now use token-driven Tailwind classes (`text-[var(--team-usa)]`, `text-[var(--team-europe)]`) for premium consistency.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`71bbfaf`)

### 16:55 EST — Phase 1 — Captain carts + contacts: remove inline styles
- Captain Cart Assignments (`/captain/carts`) + Contacts (`/captain/contacts`): removed remaining inline `style={{...}}` usage for the `PageHeader` icon container + card padding, switching to token-driven Tailwind classes (`iconContainerClassName`, `p-[var(--space-5)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ef424ed`)

### 16:26 EST — Phase 1 — Weather banner: token-driven classes
- WeatherBanner (captain delay banner): replaced inline `style` props with token-driven Tailwind classes using shared tone styles so status states inherit the premium theming.
- Swapped bespoke action buttons + inputs to `cn()`-powered classnames with accessible focus/hover states (no DOM custom attributes leaking to the page).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c8ac5cc`)

### 16:05 EST — Settings / Backup: refresh after import (no hard reload)
- Backup & Restore (`/settings/backup`): replaced `window.location.reload()` after a successful import with an in-app `loadTrips()` refresh and auto-select the imported trip.
- Keeps the import confirmation UI responsive and avoids a full-page refresh.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`8cdc993`)

### 15:40 EST — Phase 1 — Captain Draft: standardize empty states
- Captain Draft (`/captain/draft`): replaced bespoke inline-styled “card” empty states (all assigned / need more players / teams not set up) with the shared `EmptyStatePremium` for consistent premium navigation + visuals.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`dedc638`)

### 15:10 EST — Phase 1 — More page: token-driven gradients + toggle backgrounds
- More (`/more`): replaced hard-coded inline `linear-gradient(...)` background styles with token-driven Tailwind arbitrary-value classes.
- Captain Mode toggle: removed conditional inline background styles by using `cn()` + token-driven Tailwind classes.
- Menu badges + toggle track: replaced inline `background` style values with CSS custom properties (`--badge-bg`, `--toggle-bg`) + Tailwind `bg-[var(...)]`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c2cdc0f`)

### 13:10 EST — Phase 1 — Login: remove inline styles
- Login (`/login`): removed large inline `style={{...}}` blocks + manual focus handlers in favor of token-driven Tailwind classes + `cn()` (safe-area header padding, editorial typography, inputs, error banner, actions, footer note).
- Keeps the premium wrapper + BottomNav consistent with the rest of Phase 1 routes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`dfa2864`)

### 12:10 EST — Chore — Sort Lobster worklog chronologically
- Reordered the `## 2026-02-10` worklog entries by timestamp so the log reads in chronological order.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6ec6a8f`)

### 11:50 EST — Phase 1 — Courses page: token-driven Tailwind styles
- Courses (`/courses`): removed remaining inline `style={{...}}` usage for token-driven colors/gradients (PageHeader icons, scan-scorecard CTA, icon/text accents) in favor of Tailwind arbitrary-value classes.
- Tee set pills: consolidated dynamic tee colors by setting a single `--tee-color` CSS variable inline, then using Tailwind to apply both text + translucent background (no more multi-prop inline styles).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`2ee4a37`)

### 11:15 EST — Phase 1 — Path to Victory: remove inline styles
- `PathToVictoryCard`: replaced most inline `style={{...}}` usage (gradients, borders, icon colors) with Tailwind/arbitrary-value classes.
- Quick summary rows now use a CSS variable + `color-mix()` for translucent team-colored backgrounds, avoiding runtime Tailwind class generation while keeping the UI token-driven.
- Kept only the truly-dynamic progress bar `width` inline styles.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f49c30f` + `f7bbd94`)

### 11:00 EST — Phase 1 — Match scoring: token-driven team colors (no inline style)
- Match scoring (`/score/[matchId]`): removed remaining inline `style={{...}}` usages for team colors and winner styling (header hero, score display, quick-score buttons, match-complete summary), switching to token-driven Tailwind arbitrary-value classes.
- Team color constants (`TEAM_COLORS`): now use CSS tokens (`var(--team-usa)`, `var(--team-europe)`) so styling stays consistent with the design system.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1172afb`)

### 10:30 EST — Phase 1 — Backup & Restore + Profile skeleton: token-driven Tailwind styles
- Settings → Backup & Restore (`/settings/backup`): removed remaining inline `style={{...}}` usage across the page (cards, banners, file picker, TripCard) in favor of token-driven Tailwind classes and `cn()`.
- Profile loading skeleton (`/profile` loading state): replaced inline flex + card token styles with Tailwind token classes (`bg-[var(--canvas-raised)]`, `border-[var(--rule)]`, `p-[var(--space-5)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7810571`)

### 10:05 EST — Phase 1 — App layout Suspense fallback: token-driven Tailwind styles
- App root layout (`src/app/layout.tsx`): replaced inline style + custom `@keyframes spin` in the top-level `Suspense` fallback with Tailwind/token-driven classes (`bg-[var(--canvas)]`, `border-[var(--rule)]`, `border-t-[var(--masters)]`, `animate-spin`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f64ff02`)

### 09:45 EST — Phase 1 — PWA update toast + Predictions: token-driven styles
- `PWAUpdateToast`: replaced large inline `style={{...}}` blocks (fixed positioning, spacing tokens, icon/message styles, actions row) with Tailwind classes + token-driven arbitrary values.
- `MatchPredictions`: removed remaining inline token styles for team dots and lucide icon colors in favor of Tailwind token classes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`737e26d`)

### 09:10 EST — Phase 1 — Home past trips + Schedule cards: token-driven styles
- Home (`HomePage`): removed large inline `style={{...}}` blocks from the Past Trips list (layout, borders, gradients, icon/text colors), replacing with token-driven Tailwind classes and `truncate` for overflow.
- Schedule (`ScheduleEntryCard`): replaced remaining hard-coded rgba/hex accents with token-driven Tailwind classes (`var(--masters)` + `var(--gold)`), keeping the dynamic countdown badge inline styles.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`08951fc`)

### 08:45 EST — Phase 1 — Schedule: token-driven Tailwind styles
- Schedule (`/schedule`): removed remaining inline token styles (PageHeader icon, user badge icon, tab selector buttons, and “Profile not linked” warning card) in favor of token-driven Tailwind classes + `cn()`.
- `ScheduleEntryCard`: migrated session/user-match card backgrounds + borders and status pill styling to token-driven Tailwind classes; kept only the truly-dynamic countdown badge colors inline.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`840a8e9`)

### 08:10 EST — Phase 1 — Captain Settings + Messages: token-driven Tailwind styles
- Captain Settings (`/captain/settings`): removed remaining inline token/layout styles in the header save action, section headers, labels, team-name fields, and Captain Tools rows (use token-driven Tailwind classes like `text-[var(--team-usa)]`, `mb-[var(--space-4)]`, `rotate-180`).
- Captain Messages (`/captain/messages`): removed inline layout styles in the PageHeader action and the composer/empty cards; moved icon colors to Tailwind (`text-white`, `text-[var(--ink-tertiary)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3cd94fd`)

### 07:35 EST — Phase 1 — Offline Queue + Header: token-driven Tailwind styles
- Offline Queue panel (`OfflineQueuePanel`): removed inline token `style={{...}}` usage for surfaces/borders/text, replacing with token-driven Tailwind arbitrary-value classes.
- Offline Queue badge/actions: replaced inline rgba styles with Tailwind opacity utilities (e.g. `bg-red-500/10`).
- Header (`components/layout/Header`): replaced inline surface/rule/text styles with token-driven Tailwind classes for consistent premium theming.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`0653314`)

### 06:58 EST — Phase 1 — Trip Awards + Captain Invites: token-driven Tailwind styles
- Trip Awards (`/trip-stats/awards`): swapped PageHeader icon color from inline `style` to token-driven Tailwind (`text-[var(--color-accent)]`).
- Captain → Invitations (`/captain/invites`): replaced remaining inline token style blocks (PageHeader icon, section padding, Share Invite button, card padding) with token-driven Tailwind classes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e85490e`)

### 06:40 EST — Phase 1 — Score list: token-driven styles (remove inline var() styles)
- Score (`/score`): removed remaining inline `style={{...}}` usage for spacing/typography tokens and most MatchRow layout styling, replacing with token-driven Tailwind classes.
- MatchRow: now uses `cn()` for conditional padding/borders, and uses Tailwind token classes for the “Your Match” badge, overlines, player rows, and score styling.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`04fea66`)

### 06:20 EST — Phase 1 — Bets: token-driven layout cleanup (batch)
- Bets (`/bets`): removed several remaining inline `style={{...}}` blocks for the header action button, main container padding, pot summary hero card, tabs, list spacing, and Quick Add section.
- Swapped PageHeader icon color props from inline styles to token-driven Tailwind classes (`text-[var(--color-accent)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`32408a8`)

### 05:25 EST — Phase 1 — Route error boundaries: token-driven Tailwind styles
- Error boundaries: removed remaining inline `style={{ ... }}` usage (token colors/backgrounds/borders) across key route error pages:
  - App-level `src/app/error.tsx`
  - Feature routes: Achievements, Bets, Live, Social, Trip, Profile, Trip Stats
  - Match scoring error (`/score/[matchId]/error.tsx`) including the offline-saved banner
- Converted to token-driven Tailwind arbitrary-value classes like `bg-[var(--surface)]`, `border-[var(--rule)]`, `text-[var(--ink-secondary)]`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5a000ff`)

### 05:05 EST — Phase 1 — Achievements: token-driven styles (no inline layout)
- Achievements (`/achievements`): removed most inline `style={{ ... }}` layout and token usage in favor of token-driven Tailwind classes.
- Progress overview card, category filter, and grid now use standard Tailwind layout utilities; progress bars keep only the dynamic `width` inline style.
- Achievement cards now use Tailwind for structure/spacing, keeping only dynamic rarity colors via inline styles.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5ce5112`)

### 04:45 EST — Phase 1 — Captain Command + PageHeader: remove inline styles
- Captain Command (`/captain`): removed remaining inline `style={{...}}` usage for the Captain Mode PIN gate and refined readiness/tools list styling with token-driven Tailwind classes + `cn()`.
- `PageHeader`: removed inline style objects for back button + typography spacing; added Tailwind-based defaults and support for `iconContainerClassName` for themed headers.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`9d221a4`)

### 04:05 EST — Phase 1 — Settings / Notifications: remove inline styles
- Notifications settings (`/settings/notifications`): removed inline `style={{ ... }}` usage in favor of token-driven Tailwind classes.
- Refactored toggles + cards to use `cn()` with conditional classes (no DOM style props), keeping behavior unchanged.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3211d1b`)

### 03:30 EST — Phase 1 — Route error boundaries: premium wrapper + BottomNav
- Captain, Courses, Lineup (`src/app/{captain,courses,lineup}/error.tsx`): standardized wrappers to `pb-nav page-premium-enter texture-grain bg-[var(--canvas)]`, added `BottomNav`, and removed remaining inline token styles in favor of token-driven Tailwind classes.
- Keeps recovery screens consistent with the rest of the premium shell and avoids dead-end navigation.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`383823c`)

### 02:55 EST — Phase 1 — Day Summary: prevent stale summaries + stuck loading
- `useDaySummary` (Day Summary share card): ensure `isLoading` is always cleared via `finally`, and clear `summary` when there is no active trip, no sessions for the day, or summary generation fails.
- Prevents stale summary content from persisting across refreshes/date changes, and avoids a stuck loading spinner on “no sessions today” paths.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`de0e8ac`)

### 02:00 EST — Phase 1 — Home hero + Momentum: token-driven Tailwind styles
- Home components (`ActiveTournamentHero`, `MomentumSection`): removed inline `style={{...}}` usage (spacing + team colors) in favor of token-driven Tailwind arbitrary-value classes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a9fa425`)

### 01:40 EST — Phase 1 — Pre-push build lock + Tailwind placeholder warnings
- Husky `pre-push`: proactively remove stale `golf-ryder-cup-web/.next/lock` so interrupted builds don’t block future pushes.
- Worklogs: replaced example Tailwind token placeholders like `text-[var(--...)]` with real token names to avoid Turbopack CSS optimizer warnings.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3576cc1`)

### 01:35 EST — Phase 1 — Players page: token-driven styles
- Players (`/players`): replaced inline token/layout style props throughout the page (header actions, modal layouts, bulk-add grid, section headers, and PlayerRow actions) with token-driven Tailwind classes.
- Kept the one truly-dynamic avatar background color as an inline `style` (computed from team color).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`fcd4966`)

### 01:25 EST — Phase 1 — Trip Stats: token-driven icon styles
- Trip Stats (`/trip-stats`): removed remaining inline token styles in `PageHeader` icons (use `text-[var(--color-accent)]`).
- Trip Stats: replaced `bg-masters/10` + `text-masters` with token-driven Tailwind arbitrary-value classes.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ed13109`)

### 00:40 EST — Phase 1 — Small route token-style cleanup (Login + Create Profile + Schedule)
- Login (`/login`): replaced the “New here?” divider inline styles with token-driven Tailwind classes.
- Create Profile (`/profile/create`): replaced the header bottom rule inline styles with `h-px bg-[var(--rule)]`.
- Schedule (`/schedule`): removed inline token styles from the Day badge, the Create Profile link, and the “No scheduled events” padding wrapper.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c0582e7`)

### 00:07 EST — Phase 1 — Social: add PageHeader on no-trip state
- Social (`/social`): added the shared `PageHeader` to the **No trip selected** screen so the access-gated empty state keeps consistent premium navigation (no more headerless screen).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a240a67`)


## 2026-02-09

### 17:15 EST — Phase 1 — Captain Draft: PageHeader on access-gated states
- Captain Draft (`/captain/draft`): added the shared `PageHeader` to the **No active trip** and **Captain mode required** screens so access-gated states retain consistent premium navigation.
- Commit + push ✅ (`7c2ea89`)

### 17:45 EST — Phase 1 — Not Found: token-driven styles
- Not Found (`/_not-found`): replaced inline `style={{ background/color: 'var(--...)' }}` usage with token-driven Tailwind classes (e.g. `bg-[var(--masters-light)]`, `text-[var(--ink-secondary)]`) for consistency.
- Uses shared `btn` variants for the primary/secondary CTAs.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`354b670`)

### 18:10 EST — Phase 1 — Scorecard Upload: remove inline token styles (batch)
- Scorecard Upload modal (`ScorecardUpload`): replaced common inline `style={{ ...var(--token) }}` usages with token-driven Tailwind classes for the overlay, modal surface, header, and idle/processing/error/success text panels.
- No behavior change; improves consistency and reduces the chance of silent style drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`aef056e`)

### 18:55 EST — Phase 1 — AuthGuard + Stableford: remove inline token styles (batch)
- AuthGuard: replaced bespoke inline-style loading spinner with Tailwind token classes (`bg-[var(--canvas)]`, `border-[var(--rule)]`, `border-t-[var(--masters)]`, `animate-spin`).
- Stableford scorecard: migrated the main wrappers and buttons off inline `style={{ ...var(--token) }}` usage onto token-driven Tailwind classes and `cn()` for stateful styling.
- Kept the one dynamic points color as an inline `style` (computed from Stableford points).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1c23771`)

### 19:50 EST — Phase 1 — Settings: remove inline layout styles
- Settings (`/settings`): removed most inline layout styles (padding, flex, spacing, typography) in favor of token-driven Tailwind classes (`p-[var(--space-4)]`, `gap-[var(--space-3)]`, `text-[var(--masters)]`, etc.) for consistency.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6054133`)

### 20:05 EST — Docs: clarify prior push statuses
- Lobster worklog: updated earlier entries that were marked "push pending" to reflect that they have now been pushed to `main`.
- Commit + push ✅ (`ee2d910`)

## 2026-02-04

### 09:30 EST — Phase 1 (batch 1)
- Schedule page: removed “indefinite skeleton” when no trip is selected; now shows a Premium empty state with a clear CTA back home.
- Schedule page: added explicit error empty state + retry for match loading failures (no more silent console-only failures).

### 10:05 EST — Phase 1 (batch 2)
- Bet Detail page: eliminated a silent “missing linked match” section by distinguishing loading vs missing vs present match states and showing a clear inline warning instead of rendering nothing.

### 11:55 EST — Phase 1 (batch 3)
- Match scoring page: removed a user-facing blank state by replacing `Suspense` `fallback={null}` (ScoreCelebration lazy load) with an explicit loading overlay.

### 12:05 EST — Phase 1 (batch 4)
- Trip Stats: replaced the Category Leaders widget’s silent `return null` with an explicit “No leaders yet” card.
- Trip Awards: replaced silent `return null` winner showcase with an explicit “No award winners yet” state, and upgraded the “No active trip” screen to `EmptyStatePremium`.

### 13:05 EST — Phase 1 (batch 5)
- Players page: removed auto-redirect when no trip is selected; now shows a premium empty state with a clear CTA back home.
- Standings page: removed auto-redirect when no trip is selected; now shows a premium empty state with a clear CTA back home (loading skeleton remains for real data loads).

### 13:20 EST — Phase 1 (batch 6)
- Schedule page: removed auto-redirect when no trip is selected; now consistently renders the premium empty state instead of bouncing back home.

### 14:20 EST — Phase 1 (batch 7)
- Bet Detail page: replaced the ambiguous “Loading bet…” screen with explicit states for: no trip selected (premium empty), loading (pulse), and bet not found (error + back to Bets). No more infinite loading when a bet ID is missing.

### 14:32 EST — Phase 1 (batch 8)
- Lobster plan: removed hard-coded absolute workdir paths and switched to `git rev-parse --show-toplevel` + `pnpm -C` so the checkpoint workflow runs reliably from any checkout location.

### 17:50 EST — Phase 1 (batch 9)
- Bet Detail (Nassau results): replaced a silent `return null` when all segments are halved with an explicit “All segments were halved — no payouts.” message.

### 17:55 EST — Phase 1 (batch 10)
- Schedule page: standardized loading state to `PageLoadingSkeleton` and upgraded “no matches / no sessions / no events” sections to `EmptyStatePremium` (no more dead `isLoading` rendering).
- Match scoring page: replaced spinner + bespoke error/missing screens with `PageLoadingSkeleton`, `ErrorEmpty`, and `EmptyStatePremium` for consistent non-blank states.
- Standings + Home: tightened loading/empty state handling (no redirects/blank renders) and cleaned up lint (unused imports).

### 18:30 EST — Phase 1 (batch 11)
- Schedule + Score list pages: hardened current-user-to-player matching to avoid crashes when either side has missing `firstName`/`lastName` fields (prevents rare blank screens on name-only matching).
- Lobster checkpoint: `lint` + `typecheck` ✅

### 18:55 EST — Phase 1 (batch 12)
- New Lineup / Session page: added an explicit `EmptyStatePremium` when format filters produce zero options (prevents a confusing “blank section” under Format when nothing matches).

## 2026-02-05

### 00:15 EST — Phase 1 (batch 13)
- Standings (Trip stats section): if all tracked stat totals are zero, we now render a clear premium empty state (“No trip stats yet”) instead of silently rendering nothing under the category headers.

### 01:25 EST — Phase 1 (batch 32)
- Schedule: added an explicit signed-out empty state (“Sign in to view the schedule”) with a clear CTA to `/login` and `BottomNav` for consistent navigation.
- Score (match list): added an explicit signed-out empty state (“Sign in to view scores”) with CTA to `/login` and `BottomNav`.
- Schedule: prevented unnecessary match-loading attempts when signed out.
- Commit + push ✅ (`85f9312`)

### 01:40 EST — Phase 1 (batch 34)
- Spectator mode (`/spectator/[tripId]`): added an explicit load-error state (Retry + Go Home) so transient DB failures don’t show a misleading “Tournament Not Found” screen.
- Spectator mode: preserve the previously-loaded view on refresh failures so the screen doesn’t blank.
- Added a compact header error badge when the latest refresh fails.
- Commit + push ✅ (`a288c13`)

### 01:55 EST — Phase 1 (batch 33)
- New Session / Lineup (`/lineup/new`): replaced the hand-rolled bottom nav with the shared `BottomNav` component.
- New Session / Lineup: replaced the skeleton-only gate with explicit premium empty states for **No trip selected** and **Captain Mode required**, each with clear CTAs and `BottomNav`.
- Commit + push ✅ (`a8dc84c`)

### 02:05 EST — Phase 1 (batch 35)
- Complete Profile (`/profile/complete`): removed the auto-redirect to `/login` when unauthenticated to avoid a confusing skeleton flash.
- Complete Profile: added an explicit signed-out premium empty state with Sign In + Home CTAs and `BottomNav`.
- Complete Profile: added an explicit “already onboarded” premium empty state with Continue + Home CTAs and `BottomNav`.
- Complete Profile: kept a loading skeleton only for the authenticated-but-still-loading `currentUser` case.
- Commit + push ✅ (`2bc0cf3`)

### 02:45 EST — Phase 1 (batch 37)
- Web worklog (`golf-ryder-cup-web/WORKLOG.md`): synced missing shipped Phase 1 entries.
- Commit + push ✅ (`b039ec6`)

### 03:45 EST — Phase 1 (batch 38)
- Courses (`/courses`): standardized the wrapper to `min-h-screen pb-nav page-premium-enter texture-grain` and added `BottomNav`.
- New Course (`/courses/new`): added `BottomNav`.
- Course Database Search modal: added `BottomNav` + `pb-nav`.
- Commit + push ✅ (`0b57d6f`)

### 04:20 EST — Phase 1 (batch 39)
- Achievements (`/achievements`): replaced bespoke bottom navigation with the shared `BottomNav` component and added `BottomNav` to no-trip/loading states.
- Settings — Notifications: removed the page-local fixed nav + `NavItem` in favor of shared `BottomNav`.
- Commit + push ✅ (`bb1f9e3`)

### 04:45 EST — Phase 1 (batch 40)
- App-level Not Found + route error pages: standardized wrappers to the premium layout and added `BottomNav`.
- Global error page: added `BottomNav` + standard bottom padding so recovery screens aren’t dead ends.
- Commit + push ✅ (`6987064`)

### 04:58 EST — Phase 1 (batch 41)
- Lint hygiene: removed unused imports to reduce warning noise.
- Commit + push ✅ (`3770052`)

### 05:35 EST — Phase 1 (batch 42)
- Login (`/login`): added `BottomNav` and `pb-nav` so signed-out users still have a clear navigation path.
- Admin (`/admin`): added `BottomNav` to both the main admin UI and the “Admin Mode Required” screen.
- Commit + push ✅ (`9da832a`)

### 06:30 EST — Phase 1 (batch 43)
- Lint hygiene: removed an unused eslint-disable directive from `featureFlags.tsx`.

### 09:10 EST — Phase 1 (batch 14)
- Docs: added a dedicated daily worklog entry for 2026-02-05 and noted that the Phase 1 route sweep is functionally complete for the then-current checklist.

### 09:55 EST — Phase 1 — Scoring match detail: keep BottomNav scoring context in missing-match state
- Scoring match detail (`/score/[matchId]`): when a match is unavailable, the premium empty state still passes `activeMatchId` into `BottomNav` so the scoring context stays consistent.
- Commit + push ✅ (`80847d6`)

### 10:05 EST — Phase 1 — Profile Create
- Profile Create (`/profile/create`): standardized wrapper (`pb-nav` + texture + premium enter) and added `BottomNav` so onboarding screens aren’t navigation dead ends.
- Profile Create: lifted the fixed bottom action bar above the BottomNav height.
- Commit + push ✅ (`016fe81`)

### 10:20 EST — Phase 1 — Scoring match detail: explicit signed-out empty state
- Scoring match detail (`/score/[matchId]`): added an explicit signed-out premium empty state (Sign In + Back to Score CTAs) and included `BottomNav`.
- Commit + push ✅ (`278add9`)

### 10:45 EST — Phase 1 — Standings (Fun Stats): premium empty state
- Standings: replaced the ad-hoc “No Stats Yet” block in the Fun Stats tab with `EmptyStatePremium` + CTA.
- Commit + push ✅ (`e52f2b0`)

### 11:20 EST — Phase 1 (batch 15)
- Captain pages (Messages / Contacts / Cart Assignments): removed auto-redirect + pulse-skeleton gate when missing `currentTrip` or Captain Mode; now renders `EmptyStatePremium` with clear CTAs.

### 11:20 EST — Phase 1 — Standings (Fun Stats): category rendering consistency
- Standings: tightened Fun Stats rendering so category sections don’t silently disappear in confusing ways when data is partially missing.
- Commit + push ✅ (`1de47dc`)

### 12:15 EST — Phase 1 — Standings (Fun Stats): remove remaining `return null` inside stat mapping
- Standings (Fun Stats): removed remaining `return null` inside stat mapping by switching to a `reduce`/`push` approach.
- Commit + push ✅ (`c185928`)

### 13:45 EST — Phase 1 — Settings subpages: premium wrapper + PageHeader
- Settings subpages (`/settings/appearance`, `/settings/scoring`): upgraded both to the standard premium wrapper and replaced bespoke sticky headers with the shared `PageHeader`.
- Scoring settings: aligned toggles to the actual `ScoringPreferences` keys.
- Commit + push ✅ (`7a45cc3`)

### 14:01 EST — Phase 1 — Captain Bets: remove `return null` inside winner selection mapping
- Captain Bets: winner selection buttons no longer use `return null` inside `map()` when a participant record is missing; we now prefilter to render only valid players.
- Commit + push ✅ (`1f44b15`)

### 14:10 EST — Phase 1 — ThemeToggle: implement dropdown variant (no silent `null`)
- `ThemeToggle`: implemented the `dropdown` variant and added a safe fallback render so an unexpected variant can’t silently render nothing.
- Migrated the button/segmented variants off the old `surface-*` palette onto token-driven Tailwind classes (`var(--surface-*)`, `var(--ink-*)`) for premium consistency.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ca23556`)

### 14:35 EST — Phase 1 — Web worklog: chronological resort
- Web worklog (`golf-ryder-cup-web/WORKLOG.md`): re-sorted 2026-02-05 and 2026-02-06 entries into chronological order.
- Commit + push ✅ (`0f2c0a9`)

### 14:35 EST — Phase 1 — Standings (Fun Stats): CTAs use router navigation
- Standings (Fun Stats): replaced `window.location.href` CTAs with `router.push()`.
- Commit + push ✅ (`3d2bac3`)

### 15:35 EST — Docs: Phase 1 plan follow-on sweep commands
- Lobster improvement plan: added `rg` search commands for quickly generating the next Phase 1 sweep list after the primary route checklist is complete.
- Commit + push ✅ (`46c367d`)

### 17:15 EST — Docs: Phase 1 sweep — detect top-level `return null`
- Lobster improvement plan: added a dedicated `rg` command to catch true blank-screen component returns (`return null;`) in route `page.tsx` files.
- Commit + push ✅ (`21ec8be`)

### 20:10 EST — Phase 1 (batch 16)
- Captain routes: removed auto-redirects + pulse-skeleton gates when missing `currentTrip` or Captain Mode; now consistently renders `EmptyStatePremium` with clear CTAs.

### 20:45 EST — Phase 1 (batch 17)
- Achievements page: removed the auto-redirect to Home when `currentTrip` is missing; now shows an explicit `EmptyStatePremium` (“No trip selected”) with a clear CTA.

### 20:45 EST — Phase 1 (batch 18)
- Bets page: removed the auto-redirect when `currentTrip` is missing; now shows a premium empty state (Home + More CTAs).
- Bets detail page: removed an unused `useEffect` import (lint hygiene).

### 20:55 EST — Phase 1 (batch 19)
- Lineup session page: replaced the plain “Session not found” gate with `EmptyStatePremium` screens and included `BottomNav`.
- Commit + push ✅ (`ab4b319`)

### 21:10 EST — Phase 1 (batch 20)
- Social + Live: removed auto-redirects when `currentTrip` is missing and replaced fallbacks with `EmptyStatePremium` + `BottomNav`.

### 21:25 EST — Phase 1 (batch 21)
- Stats hub: replaced ad-hoc “Start or join a trip” content with consistent `EmptyStatePremium` when there’s no active trip.
- Added `BottomNav`.
- Commit + push ✅ (`f798894`)

### 21:35 EST — Phase 1 (batch 22)
- Matchups: when there’s no active trip, now uses `EmptyStatePremium` (Home + More CTAs) and includes `BottomNav`.
- Commit + push ✅ (`a09ca56`)

### 21:50 EST — Phase 1 (batch 23)
- Profile page: removed auto-redirect-to-login behavior when unauthenticated; now renders `EmptyStatePremium` with clear CTAs when not authenticated.
- Commit + push ✅ (`774b4e9`)

### 22:05 EST — Phase 1 (batch 24)
- Trip Stats + Trip Awards: updated both pages to use the standard premium page wrapper and added `BottomNav`.

### 22:30 EST — Phase 1 (batch 25)
- Trip settings (`/trip/[tripId]/settings`): upgraded to the standard premium page wrapper and added `BottomNav`.
- Added explicit loading/error/not-found states.
- Commit + push ✅ (`4c70f5e`)

### 22:55 EST — Phase 1 — Live: explicit empty states
- Live (`/live`): added explicit premium empty states for **No active session** and **No live matches**, each with clear CTAs to Schedule/Matchups.
- Commit + push ✅ (`ff1070a` + worklog sync `82c0d70`)

### 23:05 EST — Phase 1 (batch 26)
- Trip Awards (per-trip) route (`/trip/[tripId]/awards`): upgraded to the standard premium page wrapper and added `BottomNav`.
- Standardized loading to `PageLoadingSkeleton` and added explicit non-blank states.
- Commit + push ✅ (`31e5a1b`)

### 23:05 EST — Phase 1 — Backup & Restore
- Backup & Restore (`/settings/backup`): added explicit loading and load-error states, plus a clear premium empty state when there are no trips yet.
- Added `BottomNav` and ensured adequate bottom padding.

### 23:40 EST — Phase 1 (batch 27)
- Captain routes (Command Center + all subpages): upgraded empty-state scenarios to use the standard premium wrapper and include `BottomNav`.

### 23:58 EST — Phase 1 (batch 29)
- Players: upgraded to the standard premium wrapper and added `BottomNav` in all states.
- Standings: added `BottomNav` to no-trip/loading states and standardized wrapper.

## 2026-02-06

### 00:10 EST — Phase 1 (batch 30)
- Docs: synced `golf-ryder-cup-web/WORKLOG.md` to include shipped Phase 1 batches 24–29.

### 00:25 EST — Phase 1 (batch 31)
- More page: standardized wrapper and added `BottomNav`.
- Settings page: replaced the hand-rolled bottom nav with the shared `BottomNav` component.
- Commit + push ✅ (`df99c05`)

### 01:02 EST — Phase 1 (batch 77)
- Players (`/players`): replaced bespoke header markup with the shared `PageHeader` component so the route matches the standard premium header pattern used across Phase 1 routes.
- Kept captain actions available via `rightSlot`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c315aba`)

### 01:30 EST — Phase 1 (batch 78)
- Score match detail (`/score/[matchId]`): replaced internal `null` sentinels with `undefined` (session/hole-result memos + quick-score pending state), removing the remaining `return null` hits from Phase 1’s route sweep.
- Bet detail (`/bets/[betId]`): linked-match query returns `undefined` when there’s no `matchId` (no behavior change), avoiding an extra `return null` hit in route code.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`cd811e2`)

### 01:55 EST — Phase 1 — Route sweep verification (no remaining blank-screen patterns)
- Verified there are no remaining route-level blank-screen patterns in `src/app/**/page.tsx`:
  - no `return null;` top-level returns
  - no `return null` hits in route pages (excluding `api/`)
  - no `Suspense fallback={null}` usage in routes
- Next: if we want to keep tightening “silent gaps”, consider a component-level sweep for `return null` inside user-facing widgets (separate from the route blank-screen goal).

### 02:10 EST — Phase 1 (batch 73)
- Schedule (`/schedule`): replaced bespoke header markup with the shared `PageHeader` across the signed-out, no-trip, and main states for consistent premium navigation.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`2b642bb`)

### 02:30 EST — Phase 1 (batch 79)
- New Trip (`/trip/new`): removed legacy `AppShell` usage and migrated the route to the standard premium wrapper (`min-h-screen pb-nav page-premium-enter texture-grain`) with the shared `PageHeader`.
- Kept `BottomNav` always available during the multi-step flow, so creating a trip never becomes a navigation dead end.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ddb8690`)

### 02:55 EST — Phase 1 (batch 80)
- Settings hub (`/settings`): updated the Notifications and Data/Storage entries to link to the dedicated `/settings/notifications` and `/settings/backup` pages.
- Settings — Notifications: standardized the page wrapper to include the premium background canvas.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7cea01b`)

### 03:25 EST — Docs: Lobster worklog hygiene
- Fixed the date heading so midnight entries (00:10+) are correctly grouped under 2026-02-06.
- Commit + push ✅ (`a48b648`)

### 03:50 EST — Docs: daily worklog sync
- Daily worklog (`Docs/worklogs/alan-rydercup-2026-02-06.md`): synced to include Phase 1 batch 80 + the Lobster worklog date-heading fix.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6f6ff9a`)


### 04:15 EST — Phase 1 (batch 81)
- Login (`/login`): added the standard premium wrapper enter/texture classes for consistency with Phase 1 routes.
- Login: fixed a stray “Golf Buddies” copy string so branding matches the app.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ee6ad19`)

### 04:50 EST — Phase 1 (batch 82)
- Social (`/social`): migrated off the bespoke header + hand-rolled bottom nav onto the shared `PageHeader` + `BottomNav` for consistent premium navigation.
- Social: pinned the message composer above `BottomNav` (fixed bar at `bottom: var(--nav-height)`) and increased feed padding so content never hides behind the composer.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5354ae6`)

### 05:15 EST — Phase 1 (batch 83)
- Achievements (`/achievements`): replaced the bespoke premium header with the shared `PageHeader` for consistency with Phase 1 routes.
- Achievements: simplified the loading path to the standard `PageLoadingSkeleton` (grid) instead of custom pulse markup.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5545df4`)

### 05:45 EST — Phase 1 (batch 74)
- Players error boundary: standardized to the premium wrapper (shared `PageHeader`, texture, `pb-nav`) and `BottomNav` so recovery screens aren’t dead ends.
- Standings error boundary: same premium wrapper + `BottomNav`, using shared `ErrorEmpty` for consistent retry messaging.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e14c286`)

### 06:15 EST — Phase 1 (batch 84)
- Social Photos (`/social/photos`): migrated off the bespoke premium header onto the shared `PageHeader` for consistency with Phase 1 routes.
- Social Photos: kept the view toggle + upload actions in `PageHeader.rightSlot`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d114a9b`)

### 06:50 EST — Phase 1 (batch 85)
- Matchups (`/matchups`): replaced bespoke header markup with the shared `PageHeader` for consistent premium navigation.
- Matchups: replaced the hand-rolled bottom nav markup with the shared `BottomNav` component.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3ee6528`)

### 07:10 EST — Phase 1 (batch 44)
- Web worklog hygiene (`golf-ryder-cup-web/WORKLOG.md`): rewrote into a single clean chronological timeline (deduped mixed-format Phase 1 entries).
- Commit + push ✅ (`d143e6f`)

### 07:15 EST — Phase 1 (batch 86)
- Trip Settings (`/trip/[tripId]/settings`): removed an unused `next/link` import (lint hygiene; no UI change).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b152413`)

### 07:45 EST — Phase 1 (batch 87)
- Trip Awards (`/trip-stats/awards`): replaced bespoke `header-premium` markup with the shared `PageHeader`.
- Trip Awards: standardized the layout to the usual premium route wrapper + `container-editorial` pattern.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6dacc3c`)

### 07:55 EST — Phase 1 (batch 45)
- Profile (`/profile`): keep `BottomNav` visible while editing by lifting the fixed “Save Changes” bar above the nav height.
- Commit + push ✅ (`b6a3f87`)

### 08:20 EST — Phase 1 (batch 46)
- More (`/more`): when all menu items are filtered out, render an explicit `EmptyStatePremium` instead of an empty page section.
- Commit + push ✅ (`16f8a0a`)

### 08:25 EST — Phase 1 (batch 88)
- Trip Stats (`/trip-stats`): removed the “No stats yet” early-return so users can start tracking immediately from an all-zero state (tracking UI renders even before any stats exist).
- Trip Stats: standardized the no-trip state layout to the standard premium wrapper + `container-editorial`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`0f1ca16`)

### 08:55 EST — Phase 1 (batch 89)
- Settings — Backup & Restore (`/settings/backup`): loading state now uses `PageLoadingSkeleton title="Backup & Restore" variant="list"` so the skeleton is correctly labeled and matches the standard list layout.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a838d0e`)

### 09:20 EST — Phase 1 (batch 90)
- Live Scores (`/live`): replaced the bespoke premium header markup with the shared `PageHeader` for consistent premium navigation.
- Live Scores: replaced the hand-rolled bottom nav markup with the shared `BottomNav` component.
- Live Scores: moved the sound/fullscreen/refresh controls into `PageHeader.rightSlot`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a6555c9`)

### 09:55 EST — Phase 1 (batch 48)
- Lineup Session (`/lineup/[sessionId]`): migrated off the bespoke header + hand-rolled bottom nav onto the shared `PageHeader` + `BottomNav`, and standardized the wrapper to the premium layout for consistent navigation.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a36bfe2`)

### 10:25 EST — Phase 1 (batch 91)
- Settings hub (`/settings`): replaced bespoke `header-premium` markup with the shared `PageHeader` for consistent premium navigation.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6879433`)

### 10:55 EST — Phase 1 (batch 92)
- Settings — Notifications (`/settings/notifications`): removed invalid Tailwind “CSS var” class syntax (e.g. `bg-(--masters)`) that could cause the page to render with missing styles.
- Standardized the page to use CSS variable inline styles (`var(--masters)`, `var(--surface)`, `var(--rule)`) and kept the shared `PageHeader` + `BottomNav`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3371b11`)

### 11:25 EST — Phase 1 (batch 49)
- Profile (`/profile`): migrated the authenticated state onto the standard premium wrapper (`pb-nav` + texture + premium enter) and replaced the bespoke sticky header with the shared `PageHeader` for consistent navigation.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`482d2ac`)

### 11:40 EST — Phase 1 (batch 47)
- Lint hygiene sweep + small correctness hardening (warnings-only).
- Commit + push ✅ (`0ba1a70`)

### 11:58 EST — Phase 1 (batch 93)
- Day Summary modal: removed the top-level `if (!currentTrip) return null;` so opening the modal can’t silently do nothing.
- Added explicit modal body states for **No active trip**, **Generating summary…**, and **No matches found**.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`0ab52cd`)

### 12:15 EST — Phase 1 (batch 94)
- Quick Score modal: added an explicit `useLiveQuery` default value so we can distinguish loading vs not-found.
- Removed the top-level `if (!match) return null;` and replaced it with explicit in-modal UI for **Loading match…** and **Match unavailable**, so opening Quick Score can’t silently do nothing.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a60c681`)

### 12:20 EST — Phase 1 (batch 54)
- Docs: synced Phase 1 worklogs to include the latest shipped batches.
- Commit + push ✅ (`80e378f`)

### 12:35 EST — Phase 1 (batch 95)
- Captain checklist (`/captain/checklist`): replaced bespoke `header-premium` markup with the shared `PageHeader` for consistent premium navigation.
- Captain checklist: replaced the hand-rolled bottom nav with the shared `BottomNav` component.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1ac63a6`)

### 12:45 EST — Phase 1 (batch 55)
- Spectator mode (`/spectator/[tripId]`): added bottom padding so the fixed “Last updated” footer doesn’t overlap content on smaller screens.
- Commit + push ✅ (`baee815`)

### 12:50 EST — Phase 1 (batch 56)
- Docs: updated worklogs to include the batch 55 commit hash.
- Commit + push ✅ (`8503fdf`)

### 13:00 EST — Phase 1 (batch 96)
- New Course (`/courses/new`): removed invalid Tailwind “CSS var” hover class syntax from the Scan Scorecard CTA and switched to the standard `press-scale` interaction.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`cdd0159`)
### 13:15 EST — Phase 1 (batch 57)
- New Session / Lineup (`/lineup/new`): precompute and filter format categories instead of `return null` inside the category map.
- Commit + push ✅ (`6087b1e`)

### 13:25 EST — Phase 1 (batch 58)
- Docs: synced worklogs to include Phase 1 batch 57.
- Commit + push ✅ (`71d8681`)

### 13:55 EST — Phase 1 (batch 96)
- New Course (`/courses/new`): replaced bespoke `header-premium` markup with the shared `PageHeader` for consistent premium navigation.
- Kept the existing `BottomNav` so the flow remains non-blocking.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`cd161c6`)

### 14:35 EST — Phase 1 (batch 97)
- Captain Command Center (`/captain`): replaced bespoke `header-premium` markup with the shared `PageHeader` and replaced the hand-rolled bottom nav with the shared `BottomNav`.
- Captain Audit Log (`/captain/audit`): migrated the header to `PageHeader` for consistent premium navigation.
- Invitations (`/captain/invites`): migrated the header to `PageHeader` and replaced the hand-rolled bottom nav with the shared `BottomNav`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1941d5b`)

### 15:25 EST — Phase 1 (batch 99)
- New Session / Lineup (`/lineup/new`): replaced bespoke `header-premium` markup with the shared `PageHeader` and kept the step indicator in `rightSlot`.
- Captain Attendance (`/captain/availability`): migrated the header to `PageHeader`, keeping the refresh action in `rightSlot`.
- Captain Cart Assignments (`/captain/carts`) + Contacts (`/captain/contacts`): migrated headers to `PageHeader`.
- Contacts: replaced the hand-rolled bottom nav with the shared `BottomNav`.
- Shared `PageHeader`: added `iconContainerStyle`/`iconContainerClassName` so routes can keep their custom icon gradients while standardizing structure.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`374f7b0`)

### 15:30 EST — Phase 1 (batch 101)
- Course Library (`/courses`) + Scan Scorecard upload + Quick Score modal: replaced invalid Tailwind “CSS var” class syntax (e.g. `hover:border-(--masters)`, `ring-(--team-usa)`) with valid arbitrary-value forms like `hover:border-[var(--masters)]` and `ring-[var(--team-usa)]`.
- This prevents styles from silently failing to apply.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b428a85`)

### 15:45 EST — Phase 1 (batch 102)
- Score (match list) (`/score`): signed-out and no-trip states now use the shared `PageHeader` (with `BottomNav`) for consistent premium navigation instead of dropping straight into a bare empty state.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5299a11`)

### 15:55 EST — Phase 1 (batch 59)
- Settings — Notifications (`/settings/notifications`): upgraded to the standard premium wrapper and replaced the bespoke sticky header with the shared `PageHeader` for consistent navigation.
- Commit + push ✅ (`354e05a`)

### 16:15 EST — Phase 1 (batch 103)
- Captain Messages (`/captain/messages`): migrated the bespoke header onto the shared `PageHeader`.
- Captain Draft (`/captain/draft`): migrated the bespoke header onto the shared `PageHeader`.
- Captain Settings (`/captain/settings`): migrated the bespoke header onto the shared `PageHeader`.
- All three pages now use the shared `BottomNav` (replacing the hand-rolled nav markup) so Captain tools remain consistent with the Phase 1 premium navigation pattern.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`842aa60`)

### 16:25 EST — Phase 1 (batch 60)
- Captain Bets: winner selection button list now uses `flatMap()` to prefilter valid participants instead of `return null` inside a `map()`.
- Commit + push ✅ (`0805cd2`)

### 16:45 EST — Phase 1 (batch 61)
- Stableford scorecard: score input buttons now prefilter valid values instead of `return null` inside `map()` (avoids silent render gaps and keeps Phase 1 consistency).
- Commit + push ✅ (`22191a2`)

### 16:50 EST — Phase 1 — Standardize Bets + Standings headers/loading
- Bets (`/bets`) and Bet Detail (`/bets/[betId]`): migrated from bespoke `header-premium` markup onto the shared `PageHeader` (actions in `rightSlot`) for consistent premium navigation.
- Standings (`/standings`): loading state now uses the standard `PageLoadingSkeleton`.
- Commit + push ✅ (`47e8ac0`)

### 17:20 EST — Phase 1 (batch 104)
- Trip Awards (`/trip/[tripId]/awards`): loading now uses an early-return `PageLoadingSkeleton title="Awards" variant="detail"` so we don’t render a full-page skeleton (with its own header/nav) inside an already-rendered page.
- Trip Settings (`/trip/[tripId]/settings`): loading now uses `PageLoadingSkeleton title="Trip Settings" variant="form"` for a consistent, self-labeled premium skeleton.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`8f55e29`)
### 17:40 EST — Phase 1 (batch 63)
- Phase 1 sweep verification: re-ran the strict route scan (`rg "^\s*return null;\s*$"` over `src/app/**/page.tsx`) and confirmed there are no remaining top-level `return null;` blank-screen returns.
- Remaining `return null` hits in route pages are internal (helpers/`useMemo`) and do not correspond to user-facing blank screens.

### 18:10 EST — Phase 1 (batch 64)
- Social Stats dashboard: player leaderboard no longer uses `return null` inside the `map()` when a player record is missing; we now prefilter valid rows so rendering is stable and ranks remain consistent.
- Lobster checkpoint: `lint` + `typecheck` ✅
- Commit + push ✅ (`75548bb`)

### 18:40 EST — Phase 1 (batch 105)
- Captain Emergency Contacts: removed `return null` inside the player-group `map()` by prefiltering empty groups for stable rendering.
- Player onboarding — Side Bet Opt-In: removed `return null` inside category `map()` by prefiltering categories with zero bets.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`44c8299`)

### 18:45 EST — Phase 1 (batch 65)
- Trip Stats: replaced bespoke header/back button markup with the shared `PageHeader` component to match the standard premium wrapper pattern.
- Trip Stats: applied the same `PageHeader` pattern for **no active trip**, **no stats yet**, and the main view so the page remains consistent across states.
- Lobster checkpoint: `lint` + `typecheck` ✅
- Commit + push ✅ (`435b667`)

### 19:05 EST — Phase 1 (batch 67)
- Global error page (`/global-error`): replaced `window.location.href = '/'` with `router.push('/')` so recovery navigation uses App Router semantics.
- Lobster checkpoint: `lint` + `typecheck` ✅
- Commit + push ✅ (`2d4641c`)

### 19:10 EST — Phase 1 (batch 106)
- Home — Side Bets section (`SideBetsSection`): removed the silent early-return when there are zero active bets and captain mode is off.
- The section now renders an explicit empty state with a clear link to Bets so Home doesn’t have an unexplained “missing” section.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d01e942`)

### 19:25 EST — Phase 1 (batch 66)
- Settings — Backup & Restore (`/settings/backup`): upgraded to the standard premium wrapper (canvas background + `pb-nav page-premium-enter texture-grain`) to match the rest of Settings.
- Settings — Backup & Restore: replaced the bespoke sticky header with the shared `PageHeader` (Back → `/settings`) for consistent navigation.
- Load-error state now uses the same wrapper + header pattern as the main view.
- Lobster checkpoint: `lint` + `typecheck` ✅
- Commit + push ✅ (`0cf31a4`)

### 19:40 EST — Phase 1 (batch 68)
- Schedule: removed the unused `_getUserTeam` helper (and its exact `return null;`) to keep the Phase 1 “no blank returns” sweep clean.
- Score Match Detail: `nextIncompleteMatch` now returns `undefined` instead of `null` (internal value), removing the remaining exact `return null;` in route code.
- Lobster checkpoint: `lint` + `typecheck` ✅
- Commit + push ✅ (`dc0ca4d`)

### 20:20 EST — Phase 1 (batch 69)
- Player onboarding + gamification components: removed remaining `return null` usages inside `map()` by prefiltering with `filter(Boolean)`/`flatMap()` so UI sections don’t silently skip rows when definitions are missing.
- Affected components: Profile Completion Reward, Golf Superlatives display, Achievements (compact).
- Lobster checkpoint: `lint` + `typecheck` ✅
- Commit + push ✅ (`3e0ee18`)

### 20:35 EST — Phase 1 (batch 70)
- Trip Settings (`/trip/[tripId]/settings`): replaced bespoke header markup with the shared `PageHeader` component (Back → Trip, Home button in `rightSlot`) so the route matches the standard premium header pattern across all states.
- Lobster checkpoint: `lint` + `typecheck` ✅
- Commit + push ✅ (`a40d29e`)

### 20:55 EST — Phase 1 (batch 71)
- Minor optional-value hygiene: switched a few internal helpers from `null` to `undefined` (Schedule countdown memo, Players `getPlayerTeam`, Bets Nassau summary) to keep “absence” values idiomatic/consistent and reduce `null` sentinels in route code.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`25adf90`)

### 21:18 EST — Phase 1 (batch 72)
- Schedule + Score: `currentUserPlayer` memos now return `undefined` instead of `null` when unauthenticated, keeping “absence” values idiomatic and reducing `null` sentinels in route code.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`8e82188`)

### 22:10 EST — Phase 1 (batch 74)
- Trip Recap component: avoided `return null` inside the match list render by prefiltering to matches with computed state (stable rendering, no silent row drops).
- Trip Recap: prefiltered missing player records in the match rows so names don’t render as empty strings.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`8a07584`)

### 23:15 EST — Phase 1 (batch 75)
- Profile (`/profile`): loading state now uses the standard premium wrapper + shared `PageHeader` and includes `BottomNav`, so users can always navigate even while auth/profile data is loading.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`023ed48`)

### 23:20 EST — Phase 1 (batch 76)
- Bets (`/bets`): removed a duplicate early-return no-trip block that prevented the upgraded state from rendering.
- Bets no-trip state now consistently uses the standard premium wrapper + shared `PageHeader` and includes `BottomNav`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`0ed199a`)

## 2026-02-07

### 10:30 EST — Phase 1 (batch 107)
- Your Match Card: now handles unassigned teams without rendering a confusing blank-ish state.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a89ab90`)

### 10:50 EST — Phase 1 (batch 108)
- Captain Carts (`/captain/carts`): replaced bespoke bottom nav markup with the shared `BottomNav` for consistent navigation.
- UI components: replaced invalid Tailwind CSS-var class syntax (e.g. `text-(--ink-tertiary)`, `ring-(--masters)`) with valid arbitrary-value forms like `text-[var(--ink-tertiary)]`, `ring-[var(--masters)]` in `StandingsCard`, `HoleIndicator`, and `MatchPredictions` to prevent styles silently failing to apply.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`35d80e6`)

### 12:58 EST — Phase 1 (batch 109)
- UI components (`PremiumComponents`): replaced remaining invalid Tailwind CSS-var class syntax (e.g. `text-(--team-usa)`, `bg-(--team-usa)/10`) with valid arbitrary-value forms like `text-[var(--team-usa)]`, `bg-[color:var(--team-usa)]/10` so styles don’t silently fail.
- Captain components: replaced `ring-(--masters)` with `ring-[var(--masters)]` in `MatchCardGenerator`, `CourseSetupConfirmation`, and `QuickPlayerSwap`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c5ed264`)

### 13:20 EST — Docs — Phase 1 sweep: add invalid Tailwind CSS-var syntax detection
- Lobster improvement plan: added a dedicated `rg` sweep to detect invalid Tailwind CSS-var class syntax (e.g. `text-(--ink-tertiary)`) that can cause styles to silently fail.

### 13:55 EST — Phase 1 (batch 110)
- Lineup Builder (`/lineup/builder`): migrated the main view to the standard premium wrapper (`pb-nav page-premium-enter texture-grain`) so it matches the Phase 1 navigation pattern.
- Lineup Builder: replaced legacy hard-coded dark theme colors with CSS variable equivalents (`var(--canvas)`, `var(--surface)`, `var(--rule)`, `var(--team-usa)`, `var(--team-europe)`, `var(--gold)`), improving theming consistency.
- Lineup Builder: ensured `BottomNav` renders in the main state (previously only in early-return states), so the page is never a navigation dead end.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`22c5064`)

### 14:55 EST — Phase 1 (batch 111)
- Momentum Meter (compact mode): replaced the silent `return null` when no holes have been played with a small explicit placeholder (“No holes yet”), so embedding the compact widget never results in a confusing “missing” UI section.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`40653c1`)

### 15:20 EST — Phase 1 (batch 112)
- Home (`/`): migrated from bespoke `header-premium` markup to the shared `PageHeader` for consistent premium navigation.
- Home: standardized the loading state to `PageLoadingSkeleton title="Home"` (no more hand-rolled skeleton markup).
- Home: updated the wrapper to the standard premium page classes (`min-h-screen pb-nav page-premium-enter texture-grain`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5720717`)

### 15:55 EST — Phase 1 (batch 113)
- Scoring match detail (`/score/[matchId]`): standardized the outer wrappers to include the premium enter/texture classes (`page-premium-enter texture-grain`) so the scoring experience matches the Phase 1 navigation polish.
- Applied consistently across signed-out, error, missing-match, and main states (no behavior change; visual consistency).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`dba3aa9`)

### 16:40 EST — Phase 1 (batch 114)
- Players (`/players`) + Standings (`/standings`): when there is **no active trip**, the premium empty state now includes the shared `PageHeader` (Back + icon + subtitle) so the screen matches the standard Phase 1 navigation pattern.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6b37c01`)

## 2026-02-09

### 11:22 EST — Phase 1 (batch 46)
- Join deep-link (`/join?code=...`): replaced the bespoke loading spinner with the shared `PageLoadingSkeleton` so the loading UX matches the premium design system.

### 12:25 EST — Phase 1 (batch 145)
- Login (`/login`), Create Profile (`/profile/create`), Complete Profile (`/profile/complete`), Lineup Builder (`/lineup/builder`): wrapped route bodies in `Suspense` with real `PageLoadingSkeleton` fallbacks.
- Prevents momentary blank screens / Next.js `useSearchParams()` suspense warnings while search params resolve.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`bff33e6`)

### 12:50 EST — Phase 1 (batch 146)
- Section layouts (Stats, Awards, Spectator, Lineup, Standings, Scoring, Captain): replaced the older `PageSkeleton` `Suspense` fallback with the standard `PageLoadingSkeleton` so layout-level suspense renders match the premium wrapper + BottomNav experience.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`17977f0`)

### 13:25 EST — Phase 1 (batch 147)
- Captain Draft (`/captain/draft`), Captain Pairings (`/captain/pairings`), Captain Settings (`/captain/settings`): removed remaining inline `style={{ background: 'var(--canvas)' }}` wrappers.
- Standardized wrappers to use `bg-[var(--canvas)]` so premium theming stays token-driven and consistent.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`754632f`)

### 13:55 EST — Phase 1 (batch 148)
- Captain `SessionWeatherPanel`: migrated hard-coded gray/dark styles onto token-driven premium styles (`card`, `bg-[var(--surface-secondary)]`, `text-[var(--ink-*)]`) so it matches the Phase 1 theming system.
- Removed an unused `_getPlayabilityColor` helper.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`762b54e`)

### 14:55 EST — Phase 1 (batch 149)
- Lineup (`/lineup/new`, `/lineup/[sessionId]`), Trip Awards (`/trip/[tripId]/awards`), and Settings → Backup (`/settings/backup`): removed inline `style={{ background: 'var(--canvas)' }}` wrappers and standardized to `bg-[var(--canvas)]` for consistent premium theming.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1b54a2b`)

### 15:35 EST — Phase 1 (batch 150)
- Captain components: removed remaining inline `style={{ background: 'var(--canvas)' }}` wrappers in a few key Captain UI surfaces.
- DirectMessage: message history cards now use `bg-[var(--canvas)]`.
- Lineup Builder `LineupCanvas`: player pool wrapper now uses `bg-[var(--canvas)] border-[var(--rule)]`.
- Attendance Check-In: sticky team headers + ETA modal wrapper now use `bg-[var(--canvas)]`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`190db5a`)

### 16:30 EST — Phase 1 (batch 151)
- Captain components: replaced remaining inline `style={{ background: 'var(--canvas)' }}` / `style={{ color: 'var(--ink*)' }}` usages with token-driven Tailwind classes.
- Affected surfaces: Pace Spacing, Go Time Countdown (alert schedule), Emergency Contacts, Cart Assignment Manager, Course Setup Confirmation, Quick Player Swap modal wrapper, Keyboard Shortcuts Help.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b8353ca`)

### 20:55 EST — Phase 1 (batch 115)
- Admin (`/admin`): replaced bespoke `header-premium` markup with the shared `PageHeader` for consistent premium navigation.
- Admin: the “Admin Mode Required” gate now uses the standard premium wrapper + `PageHeader` so the screen isn’t a visual outlier.
- Captain Manage (`/captain/manage`) + Captain Side Bets (`/captain/bets`): migrated bespoke `header-premium` markup to the shared `PageHeader`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`67b5fc4`)

### 21:20 EST — Phase 1 (batch 116)
- Course Library (`/courses`): replaced bespoke header markup with the shared `PageHeader` for consistent premium navigation.
- Course Library: the in-page “Search Course Database” view now also uses `PageHeader` (instead of a special green header), keeping the screen consistent with the rest of Phase 1.
- Lineup Builder (`/lineup/builder`): replaced the bespoke sticky header with `PageHeader`, keeping the Save affordance in `rightSlot`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1251567`)

### 21:55 EST — Docs: daily worklog sync
- Daily worklog (`Docs/worklogs/alan-rydercup-2026-02-09.md`): added the missing Phase 1 batch 116 entry for completeness.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6358c0b`)

### 22:25 EST — Phase 1 (batch 117)
- Score (match list) (`/score`): standardized the outer wrappers to include the premium layout classes (`pb-nav page-premium-enter texture-grain bg-[var(--canvas)]`) instead of inline style props.
- No behavior change; this is purely for visual/navigation consistency with the rest of Phase 1.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`dfe9fc5`)

### 22:45 EST — Phase 1 (batch 118)
- Home: standardized the premium wrapper to use `bg-[var(--canvas)]` instead of inline `style={{ background: ... }}`.
- Home: standardized the Continue Scoring sticky banner wrapper to use Tailwind arbitrary values (e.g. `py-[var(--space-2)]`) instead of inline padding/background styles.
- UI skeletons: standardized full-page skeleton wrappers to use `bg-[var(--canvas)]` instead of inline style props.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5cea7dd`)

### 23:20 EST — Phase 1 (batch 119)
- Settings → Backup (`/settings/backup`): refreshed the UI to match the standard premium page styling (shared `PageHeader`, `card` surfaces, and theme tokens) instead of hard-coded dark colors.
- Backup: improved import/export previews and actions using shared button styles (`btn-primary` / `btn-secondary`) and consistent success/error panels.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d97d892`)

### 23:50 EST — Phase 1 (batch 120)
- Complete Profile (`/profile/complete`): replaced bespoke `header-premium` markup with the shared `PageHeader` for consistent premium navigation.
- Complete Profile: standardized the “Skip” affordance to the shared `btn-ghost` style.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`a95a0bb`)

## 2026-02-10

### 00:15 EST — Phase 1 (batch 121)
- Settings (`/settings`): standardized the premium wrapper to use `bg-[var(--canvas)]` instead of inline `style={{ background: ... }}`.
- Settings → Notifications (`/settings/notifications`): standardized the premium wrapper to use `bg-[var(--canvas)]` (removes inline background style).
- Notifications: migrated most surface panels to the shared `card` + `btn-primary` styles to match the rest of the premium UI.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d4a1412`)

### 00:45 EST — Phase 1 (batch 122)
- Finances (`/finances`): replaced a silent `return null` ledger section with an explicit compact `EmptyStatePremium` so the Overview tab never renders a confusing blank area.
- Finances: Payments tab now renders a compact premium empty state when there are no payments.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b76b126`)

### 01:10 EST — Phase 1 (batch 123)
- Finances (`/finances`): replaced an internal `null` sentinel in the computed summary memo with `undefined` so the Phase 1 route sweep no longer flags `return null` in route code (no UI change).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`14870d6`)

### 01:35 EST — Phase 1 (batch 124)
- Schedule (`/schedule`): standardized the premium wrapper to use `bg-[var(--canvas)]` instead of inline `style={{ background: ... }}`.
- Trip Stats (`/trip-stats`): standardized the premium wrapper to use `bg-[var(--canvas)]` instead of inline `style={{ background: ... }}`.
- Schedule: migrated the current-user badge in the header to Tailwind token classes (removes inline background/border/boxShadow styles).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7aeca76`)

### 01:55 EST — Phase 1 (batch 125)
- Quick Score FAB: replaced inline `style={{ ... }}` usage with Tailwind arbitrary values (`bg-[var(--masters)]`, `shadow-[...]`, `bg-[rgba(...)]`) for consistency and to avoid silent styling drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`31a2360`)

### 02:25 EST — Phase 1 (batch 126)
- UI overlays/skeletons: replaced remaining full-screen `style={{ background: 'var(--canvas)' }}` usage with the standard Tailwind token classes (`bg-[var(--canvas)]`, `texture-grain` where appropriate) for consistency.
- Affected components: `PageLoadingSkeleton`, `AppOnboardingProvider` (loading gate), `QuickStartWizard` overlay.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`babd3ce`)

### 02:55 EST — Phase 1 (batch 127)
- Stats (`/stats`), Join (`/join`), and Not Found (`/_not-found`): standardized the premium wrapper backgrounds to use `bg-[var(--canvas)]` instead of inline `style={{ background: 'var(--canvas)' }}`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`ca9de1f`)

### 03:40 EST — Phase 1 (batch 128)
- Home Setup Guide: replaced inline gradient, border, and text color styles with Tailwind arbitrary-value tokens + the shared `cn` helper so the captain checklist honors theme variables without bespoke CSS.
- Setup steps: migrated the state-specific badge/row styling to utility classes (no more inline `style={{ ... }}`), keeping success states green while aligning hover/press behavior with other premium lists.
- Notification permission banner: swapped inline background/button styling for `btn-primary`/`btn-ghost` + tokenized backgrounds so the prompt fits the premium button system.

### 04:10 EST — Phase 1 (batch 129)
- Matchups (`/matchups`): removed inline `style={{ background: 'var(--canvas)' }}` usage and standardized the premium wrapper to `bg-[var(--canvas)]` for consistent theming.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`fec733f`)

### 04:29 EST — Phase 1 (batch 130)
- Trip Stats (`/trip-stats`): replaced non-standard Tailwind theme-token classnames (e.g. `bg-masters-green`, `text-text-primary`) with CSS-variable-based Tailwind arbitrary values (e.g. `bg-[var(--masters)]`, `text-[var(--ink)]`) so styles can’t silently fail in production builds.
- Trip Stats: standardized card + surface tokens to `card` + `var(--surface-elevated)` and replaced an invalid border token class with `border-[var(--rule)]`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c770e5c`)

### 05:10 EST — Phase 1 (batch 131)
- Bets (`/bets`), Captain Invitations (`/captain/invites`), and Trip Settings (`/trip/[tripId]/settings`): removed remaining inline `style={{ background: 'var(--canvas)' }}` wrapper usage.
- Standardized wrappers to use `bg-[var(--canvas)]` so theming can’t silently drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3526c94`)

### 05:35 EST — Phase 1 (batch 132)
- Route error boundaries (`src/app/**/error.tsx`): removed remaining inline `style={{ background: 'var(--canvas)' }}` wrappers.
- Standardized recovery screen wrappers to use `bg-[var(--canvas)]` so theme tokens are applied consistently.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`e4c589b`)

### 06:10 EST — Phase 1 (batch 133)
- Social (`/social`) + Social Photos (`/social/photos`): standardized wrappers to use token-driven Tailwind classes (`bg-[var(--canvas)]`, `flex flex-col`) instead of inline `style={{ background: 'var(--canvas)' }}` / layout styles.
- Captain Checklist (`/captain/checklist`): standardized wrappers to `bg-[var(--canvas)]` and migrated remaining icon/padding/background inline styles to token utilities.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`4786187`)

### 06:25 EST — Phase 1 (batch 134)
- Lineup Builder (`/lineup/builder`): removed inline `style={{ background: 'var(--canvas)' }}` and standardized the premium wrapper to `bg-[var(--canvas)]`.
- New Trip (`/trip/new`): removed inline `style={{ background: 'var(--canvas)' }}` and replaced a `paddingTop` style prop with `pt-6`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c270f9a`)

### 06:45 EST — Phase 1 (batch 135)
- Course Library (`/courses`), New Course (`/courses/new`), and Trip Awards (`/trip-stats/awards`): removed remaining inline `style={{ background: 'var(--canvas)' }}` wrappers and standardized them to `bg-[var(--canvas)]` so the premium theme can’t silently drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`97977f4`)

### 07:10 EST — Phase 1 (batch 136)
- Achievements (`/achievements`) + Live Scores (`/live`): removed remaining inline `style={{ background: 'var(--canvas)' }}` wrappers.
- Standardized wrappers to `bg-[var(--canvas)]` so the premium theme can’t silently drift.
- Live Scores: replaced inline `background`/`border` styles on PageHeader action buttons with tokenized Tailwind classes (`bg-[var(--surface-card)]`, `border-[var(--rule)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6ea1243`)

### 07:45 EST — Phase 1 (batch 137)
- Captain Carts (`/captain/carts`), Contacts (`/captain/contacts`), and Messages (`/captain/messages`): removed inline `style={{ background: 'var(--canvas)' }}` wrapper usage.
- Standardized wrappers to use `bg-[var(--canvas)]` so the premium theme can’t silently drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`028ccfe`)

### 08:05 EST — Phase 1 (batch 138)
- Settings — Notifications (`/settings/notifications`): hardened the “Settings saved” toast behavior by managing the timeout via a ref and clearing it on re-trigger/unmount.
- This prevents potential setState-after-unmount issues and avoids stacking multiple timeouts.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3a84d53`)

### 08:40 EST — Phase 1 (batch 139)
- Bets (`/bets`) + Settings subpages (`/settings/appearance`, `/settings/scoring`): removed remaining inline `style={{ background: 'var(--canvas)' }}` wrapper usage.
- Standardized wrappers to use `bg-[var(--canvas)]` so the premium theme stays token-driven and can’t silently drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d07d039`)

### 09:00 EST — Phase 1 (batch 140)
- Join (`/join`): added a real `Suspense` fallback so the route never renders a momentary blank screen while `useSearchParams()` resolves.
- Join: refactored the loading UI into a shared `JoinLoading` component used by both the route body and the `Suspense` fallback.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`86fe2f4`)

### 09:35 EST — Phase 1 (batch 141)
- Home: memoized the score narrative computation so we don’t compute it multiple times during render and avoid `null` sentinels.
- No behavior change; this is a small correctness/perf polish for the Home header/subtitle.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1de1730`)

### 10:15 EST — Phase 1 (batch 142)
- Route error boundaries: standardized Matchups (`/matchups`), Schedule (`/schedule`), and Login (`/login`) error screens to the Phase 1 premium pattern.
- Each now uses the standard premium wrapper + shared `PageHeader`, renders shared `ErrorEmpty` messaging, and includes `BottomNav` so recovery screens aren’t dead ends.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`493ba7f`)

### 10:35 EST — Phase 1 (batch 143)
- Captain Command Center (`/captain`): removed an unused `MoreHorizontal` icon import (lint hygiene).
- Tests: removed unused types/helpers (`DuesLineItem`, `randomChoice`) and renamed an unused loop key to `_key`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`1be30ae`)

### 11:55 EST — Phase 1 (batch 144)
- Captain Attendance (`/captain/availability`), Captain Audit Log (`/captain/audit`), and Captain Invitations (`/captain/invites`): removed remaining inline `style={{ background: 'var(--canvas)' }}` wrapper usage.
- Standardized wrappers to use `bg-[var(--canvas)]` so the premium theme stays token-driven and can’t silently drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f2a5fa8`)

### 19:20 EST — Phase 1 (batch 152)
- Route error boundaries (Settings `/settings`, Scoring `/score`, Spectator `/spectator`): replaced inline token styles (`style={{ color/background: 'var(--...)' }}`) with Tailwind token/arbitrary-value classes (e.g. `text-[var(--ink-secondary)]`, `bg-[var(--surface)]`, `border-[var(--rule)]`).
- No behavior change; keeps premium theming token-driven and consistent across recovery screens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`5743a9b`)

### 20:15 EST — Phase 1 (batch 153)
- Trip Memories (Social recap component): replaced many inline token style props (`style={{ color/background/border: 'var(--...)' }}`) with token-driven Tailwind arbitrary-value classes (e.g. `text-[var(--ink)]`, `bg-[var(--surface)]`, `border-[var(--rule)]`).
- Keeps the recap UI aligned with the Phase 1 premium theming system and reduces chances of silent style drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`8d94e0d`)

### 20:35 EST — Phase 1 (batch 154)
- Day Summary (Social share card): replaced inline token styles with Tailwind arbitrary-value token classes.
- Share button now uses `bg-[var(--masters)]` and the “No active trip” label uses `text-[var(--ink)]` (no behavior change; consistent premium theming).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`8e8044f`)

### 01:35 EST — Phase 1 (batch 155)
- UI skeletons: removed inline token style props from `Skeleton` components in favor of token-driven Tailwind arbitrary-value classes (`bg-[var(--surface-*)]`, `border-[var(--rule)]`, etc.).
- ErrorBoundary: removed inline token text colors and standardized to `text-[var(--ink)]` / `text-[var(--ink-secondary)]`.
- Not Found + Quick Score: replaced `style={{ fontFamily: 'var(--font-display)' }}` with `font-[var(--font-display)]` for consistent token-driven styling.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`bb41c7f`)

### 21:35 EST — Phase 1 (batch 156)
- Captain `SessionWeatherPanel`: treat `latitude=0` / `longitude=0` as valid coordinates by checking for `null`/`undefined` instead of falsy values.
- Prevents false “Location not available” errors for legit 0-valued coordinates (correctness; no UI change otherwise).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`4956327`)

### 21:55 EST — Phase 1 (batch 157)
- Route error boundaries (Login `/login`, Schedule `/schedule`, Standings `/standings`, Matchups `/matchups`, Players `/players`): removed remaining inline token style props in the dev-only error details panel and the “Back to Home” CTA.
- Icons now use token classes (`text-[var(--color-accent)]`), and the error details panel uses tokenized surfaces (`bg-[var(--surface)]`, `bg-[var(--canvas)]`, `border-[var(--rule)]`).
- “Back to Home” now uses the shared `btn-secondary` style for consistency.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c0b0d54`)

### 12:45 EST — Phase 1 (batch 158)
- Session Lineup (`/lineup/[sessionId]`): replaced the plain “Loading matches...” text with the shared `InlineLoadingSkeleton` inside an editorial card.
- Keeps the route’s loading state consistent with Phase 1 premium patterns (no plain blank/text-only interim).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`aee41bd`)

### 13:40 EST — Phase 1 (batch 159)
- Captain toggle UI (`CaptainToggle`): removed inline `style={{...}}` usage and migrated the toggle + modals to token-driven Tailwind classes and shared button variants (`btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`).
- Uses `cn()` for stateful styling (on/off background, error border), keeping the component consistent with the Phase 1 premium theming system.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`6052b5a`)

### 14:55 EST — Phase 1 (batch 160)
- Live (`/live`): fixed match sorting to use the real `Match.matchOrder` field (was `matchNumber`, which is not part of the model and could cause unstable ordering).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`3f9adcd`)

## 2026-02-11

### 04:40 EST — Phase 1 — Live play header: remove inline styles
- Live play `MatchStatusHeader`: removed inline `style={{ ... }}` usage and migrated to Tailwind classes (including token-driven team colors like `bg-[var(--team-usa)]` / `bg-[var(--team-europe)]`).
- No behavior change; keeps premium theming class-driven and reduces chances of silent style drift.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`9282e2f`)

### 18:54 EST — Phase 1 — Scoring settings: remove inline styles
- Settings → Scoring (`/settings/scoring`): migrated remaining inline `style={{ ... }}` usage to Tailwind/token-driven classnames (spacing, borders, icon colors, gradient header, and the one-handed-mode tip callout).
- No behavior change; reduces style drift and keeps premium theming class-driven.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`372f7dc`)

### 19:30 EST — Phase 1 — Games: explicit fallback when game missing
- NassauEnhancedCard + HammerGameCard: replaced `if (!game) return null;` with a small in-component fallback card (“Game unavailable”) so the UI can’t silently render nothing if a game record can’t be loaded.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c3ee33c`)

## 2026-02-12

### 06:55 EST — Phase 2 — StrokeAlertBanner: token-driven styling
- `StrokeAlertBanner`: removed inline token style props for surfaces/borders/text and migrated to premium token-driven Tailwind classes (`bg-[var(--surface)]`, `border-[var(--masters)]`, `text-[var(--ink-*)]`, `border-[var(--rule)]`).
- `StrokeIndicator`: refactored from passing raw `color` strings to a typed `variant` (`usa`/`europe`) so Lucide icons + labels can use class-driven token colors (and a small fixed rgba tint for the leading-strokes badge background).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`b60c5c2`)

## 2026-02-14

### 08:23 EST — Phase 2 — AchievementUnlock: reduce inline styles
- `AchievementUnlock` / `AchievementBadge`: replaced a few remaining inline `style={{ ... }}` props with Tailwind classes (overlay uses `bg-black/90`, shine uses `bg-[linear-gradient(...)]`).
- Introduced a single CSS custom property `--rarity-color` on the badge wrapper so repeated rarity-colored fills can be class-driven (`bg-[color:var(--rarity-color)]`) instead of duplicating inline styles.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`c3501d5`)
