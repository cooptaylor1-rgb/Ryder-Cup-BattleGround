# Tech Debt - v1.1 Post-Mortem

**Date:** January 12, 2026  
**Version:** 1.1.0 (Captain's Toolkit)  
**Status:** Production Ready with Known Debt

---

## Must Fix Soon (Priority Order)

### 1. 🔴 Player ID Storage: Comma-Separated Strings
**Location:** `Match.swift` (lines 58-61)  
**Issue:** Team player IDs stored as comma-separated UUIDs (`teamAPlayerIds`, `teamBPlayerIds`)  
**Risk:** Brittle parsing, no referential integrity, orphaned IDs if player deleted  
**Mitigation:** Documented in code comments; works but not elegant  
**Fix:** Consider proper many-to-many join table or explicit deletion handling

### 2. 🔴 Course Not Reusable Across Trips
**Location:** `Course.swift`, `TeeSet.swift`  
**Issue:** Courses are created per-trip, must re-enter data for recurring trips  
**Risk:** User friction, duplicate data, error-prone  
**Fix:** P2.2 Course Library will address this

### 3. 🟡 Undo History Not Persisted
**Location:** `ScoringEngine.swift` (lines 154+)  
**Issue:** Undo stack is in-memory only, capped at 5 actions  
**Risk:** Undo lost on app restart; limited recovery window  
**Fix:** Persist to SwiftData or expand to 10+ with session-level storage

### 4. 🟡 No Trip Export/Backup
**Location:** N/A (missing feature)  
**Issue:** All data local, no way to export or backup a trip  
**Risk:** Data loss on device failure, no migration path  
**Fix:** P2.5 Backup/Export will address this

### 5. 🟡 HomeTabView Performance Concerns
**Location:** `HomeTabView.swift`  
**Issue:** Multiple computed properties re-evaluate on every render  
**Risk:** Potential jank on older devices with large trips  
**Fix:** Move to ViewModel pattern with cached/memoized values

### 6. 🟡 Missing Unit Tests for New P0/P1 Features
**Location:** `Tests/` directory  
**Issue:** CaptainModeService, LineupAutoFillService, ShareService untested  
**Risk:** Regression risk on future changes  
**Fix:** Add test coverage before v1.3

### 7. 🟢 Audit Log Unbounded Growth
**Location:** `AuditLogEntry.swift`, `Trip.swift`  
**Issue:** No limit on audit log entries per trip  
**Risk:** Memory/storage bloat for long-running trips  
**Fix:** Add configurable retention (e.g., last 500 entries, or 30 days)

### 8. 🟢 CountdownView Timer Leak Potential
**Location:** `HomeTabView.swift` (`CountdownView`)  
**Issue:** Timer created with `Timer.publish` - should use `.autoconnect()`  
**Risk:** Minimal, but timer may fire when view not visible  
**Fix:** Use `onAppear`/`onDisappear` to manage timer lifecycle

### 9. 🟢 Notification Delegate Registration
**Location:** `NotificationService.swift`  
**Issue:** `UNUserNotificationCenterDelegate` set up but not registered on app launch  
**Risk:** Notification actions may not work correctly  
**Fix:** Register delegate in `GolfTripApp.init()`

### 10. 🟢 SwiftLint Warnings Ignored
**Location:** `.github/workflows/ci.yml`  
**Issue:** CI set to `continue-on-error: true` for SwiftLint  
**Risk:** Lint violations accumulate  
**Fix:** Configure `.swiftlint.yml` and enforce in CI after fixing existing warnings

---

## Severity Legend

| Icon | Severity | Action |
|------|----------|--------|
| 🔴 | High | Fix before v1.3 |
| 🟡 | Medium | Fix in v1.3-1.4 |
| 🟢 | Low | Track, fix opportunistically |

---

## Architecture Notes

### Current Strengths
- Clean MVVM with SwiftData
- DesignTokens system is excellent
- ScoringEngine state machine is solid
- Audit trail infrastructure in place

### Watch Areas
- SwiftData performance with large datasets (100+ matches)
- iCloud sync complexity when added (P3.1)
- Player management across trips needs better UX

---

## Next Review
Schedule TechDebt review after v1.2 ships (target: February 2026)
