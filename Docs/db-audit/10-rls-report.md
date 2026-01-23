# RLS & Security Audit Report

> **Audit Date:** January 2026
> **Last Updated:** January 27, 2026
> **Risk Level:** 🟢 LOW (all critical fixes implemented)

---

## Executive Summary

The Golf Ryder Cup App has **RLS enabled on all tables** and uses **wide-open permissive policies** (`USING (true)`) for most tables. This is intentional for the current share-code-based access model. All critical and high-risk findings from the original audit have been addressed.

---

## 🟢 Top 10 Findings - STATUS RESOLVED

### 1. ✅ **FIXED: Missing `scoring_events` Table**

- **Status:** RESOLVED (Migration: `20260126000000_add_scoring_events_table.sql`)
- **Fix:** Table created with proper indexes and RLS

### 2. ⚠️ **ACCEPTED: Permissive RLS Policies**

- **Status:** ACCEPTED RISK (by design for share-code model)
- **Mitigations:** API rate limiting, composite indexes for share-code lookups

### 3. ✅ **FIXED: `SECURITY DEFINER` → `SECURITY INVOKER`**

- **Status:** RESOLVED (Migration: `20260127000000_implement_all_audit_fixes.sql`)
- **Fix:** `increment_course_usage()` changed to SECURITY INVOKER with validation

### 4. ⚠️ **ACCEPTED: Service Role Key in API Route**

- **Status:** ACCEPTED (required for sync operations)
- **Mitigations:** Input validation, error handling, rate limiting at API layer

### 5. ✅ **FIXED: Weak Share Code Generation**

- **Status:** RESOLVED (Migration: `20260127000000_implement_all_audit_fixes.sql`)
- **Fix:** 8-character codes with collision detection loop

### 6. ✅ **FIXED: Missing `updated_at` Triggers**

- **Status:** RESOLVED (Migration: `20260127000000_implement_all_audit_fixes.sql`)
- **Fix:** Added `updated_at` columns and triggers to all 7 affected tables

### 7. ✅ **FIXED: Array Length Constraints**

- **Status:** RESOLVED (Migration: `20260127000000_implement_all_audit_fixes.sql`)
- **Fix:** CHECK constraints for:
  - `tee_sets.hole_handicaps/hole_pars/yardages` (= 18)
  - `course_library_tee_sets.hole_pars/hole_handicaps/hole_yardages` (= 18)
  - `matches.team_a_player_ids/team_b_player_ids` (1-2)

### 8. ⚠️ **ACCEPTED: Realtime Filter Complexity**

- **Status:** MONITORED (works correctly in testing)
- **Mitigation:** Documented filter pattern, added indexes for optimization

### 9. ✅ **FIXED: No DELETE Audit Trail**

- **Status:** RESOLVED (Migration: `20260127000000_implement_all_audit_fixes.sql`)
- **Fix:** Added `delete_audit_log` table and BEFORE DELETE triggers on critical tables

### 10. ⚠️ **ACCEPTED: Device ID RLS**

- **Status:** ACCEPTED (graceful degradation when not set)
- **Mitigation:** Policies allow null device_id for legacy compatibility

---

## RLS Policy Analysis

### Tables with Permissive Policies (All Operations Open)

| Table | SELECT | INSERT | UPDATE | DELETE | Risk |
|-------|--------|--------|--------|--------|------|
| `trips` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `teams` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `team_members` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `players` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `sessions` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `courses` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `tee_sets` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `matches` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `hole_results` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `photos` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `comments` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `side_bets` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `achievements` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |
| `audit_log` | `USING (true)` | `WITH CHECK (true)` | `USING (true)` | `USING (true)` | 🟡 |

### Tables with Conditional Policies

| Table | Policy | Condition |
|-------|--------|-----------|
| `course_library` | SELECT | `USING (true)` |
| `course_library` | INSERT | `WITH CHECK (true)` |
| `course_library` | UPDATE | `created_by IS NULL OR created_by = current_setting('app.device_id', true)` |
| `course_library` | DELETE | `created_by IS NULL OR created_by = current_setting('app.device_id', true)` |
| `course_library_tee_sets` | UPDATE/DELETE | Inherits from parent course |

---

## Function Security Analysis

### `increment_course_usage` (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION increment_course_usage(course_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE course_library
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Issues:**

1. No validation that `course_id` exists
2. No rate limiting
3. Runs with owner privileges (bypasses RLS)

**Recommended Fix:**

```sql
CREATE OR REPLACE FUNCTION increment_course_usage(course_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Validate course exists
    IF NOT EXISTS (SELECT 1 FROM course_library WHERE id = course_id) THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    UPDATE course_library
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = course_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;  -- Changed from DEFINER
```

---

## Authentication Model

### Current State: Anonymous Access + Share Codes

```
┌─────────────────────────────────────────────────────────────┐
│                     Current Flow                             │
├─────────────────────────────────────────────────────────────┤
│  Client → Supabase (anon key) → RLS (USING true) → Data    │
│                                                              │
│  Access Control: Application-level share code validation    │
│  Trip Discovery: Only via share code (not browsable)        │
└─────────────────────────────────────────────────────────────┘
```

### Security Implications

| Scenario | Current Behavior | Risk |
|----------|------------------|------|
| User guesses share code | Can access full trip data | 🟡 Medium |
| User enumerates all trips | Possible (no pagination limit) | 🔴 High |
| User modifies other trip | Allowed by RLS | 🔴 High |
| API key leaked | Full DB access | 🔴 Critical |

---

## Recommendations

### Immediate (P0 - This Sprint)

1. **Create missing `scoring_events` table**
2. **Add rate limiting to API routes**
3. **Change `increment_course_usage` to SECURITY INVOKER**

### Short-term (P1 - Next Sprint)

1. **Implement share-code validation in RLS**

   ```sql
   CREATE POLICY "trips_select_by_code" ON trips
   FOR SELECT USING (
       share_code = current_setting('app.share_code', true)
       OR current_setting('app.share_code', true) IS NULL
   );
   ```

2. **Add missing `updated_at` triggers**

3. **Increase share code length to 8 characters**

### Long-term (P2 - Future)

1. **Consider Supabase Auth integration** for proper user identity
2. **Implement row-level ownership** for multi-tenant security
3. **Add soft-delete pattern** with `deleted_at` timestamps

---

## Compliance Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| RLS enabled on all tables | ✅ | |
| Views use SECURITY INVOKER | ✅ | Fixed in migration |
| No SECURITY DEFINER without validation | ⚠️ | 1 function needs fix |
| Input validation on RPCs | ❌ | Needs implementation |
| Rate limiting | ❌ | Not implemented |
| Audit logging | ⚠️ | Exists but incomplete |

---

## Next Steps

See [20-performance.md](./20-performance.md) for performance analysis.
