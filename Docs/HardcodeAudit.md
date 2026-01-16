# Hardcoded Values Audit

**Audit Date**: January 2026
**Severity**: P0-P2

---

## Executive Summary

This audit identified hardcoded values in the codebase. Most findings are **acceptable** (placeholder text, example values) but some require attention.

---

## Findings

### P0: Critical Issues (Must Fix)

| File | Line | Value | Issue | Recommendation |
|------|------|-------|-------|----------------|
| `DraftBoard.tsx` | 85 | `'draft-trip'` | Hardcoded trip ID in draft service call | Should use actual trip ID from context |

### P1: Medium Priority (Should Address)

| File | Line | Value | Issue | Recommendation |
|------|------|-------|-------|----------------|
| `GHINLookup.tsx` | 74-99 | Mock GHIN data with `2026` dates | Demo/mock data uses hardcoded dates | Add comment or move to seed data |
| `seed.ts` | 151 | `'Buddies Ryder Cup 2026'` | Seed data uses fixed year | Use dynamic year in seed |

### P2: Low Priority (Informational)

| File | Line | Value | Issue | Notes |
|------|------|-------|-------|-------|
| `QuickStartWizard.tsx` | 271 | `'2024'` in placeholder | Example text | Acceptable placeholder |
| `EnhancedTripWizard.tsx` | 393 | `'2026'` in placeholder | Example text | Acceptable placeholder |
| `captain/settings/page.tsx` | 172 | `'2024'` in placeholder | Example text | Acceptable placeholder |
| `trip/new/page.tsx` | 201 | `'2026'` in placeholder | Example text | Acceptable placeholder |

---

## API Keys & Secrets Audit

All API keys are properly handled via environment variables:

| Service | Env Variable | Location | Status |
|---------|-------------|----------|--------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts` | ✅ Correct |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts` | ✅ Correct |
| Anthropic | `ANTHROPIC_API_KEY` | `api/scorecard-ocr/route.ts` | ✅ Server-only |
| OpenAI | `OPENAI_API_KEY` | `api/scorecard-ocr/route.ts` | ✅ Server-only |
| Golf API | `GOLF_COURSE_API_KEY` | `api/golf-courses/route.ts` | ✅ Server-only |
| GHIN | `GHIN_API_KEY` | `api/golf-courses/search/route.ts` | ✅ Server-only |
| RapidAPI | `RAPIDAPI_KEY` | `api/golf-courses/search/route.ts` | ✅ Server-only |

**Verdict**: No secrets committed to repository. All sensitive values use proper env vars.

---

## URL/Domain Audit

**No hardcoded domains found.** ✅

All URLs use:

- Relative paths
- Environment variables
- Next.js routing

---

## Magic Numbers Audit

| File | Value | Context | Status |
|------|-------|---------|--------|
| `scoringEngine.ts` | `18` | Holes per round | ✅ Golf constant |
| `scoringEngine.ts` | `9` | Front/back nine | ✅ Golf constant |
| `handicapCalculator.ts` | `113` | Standard slope rating | ✅ USGA standard |
| `teeTimeService.ts` | `8`, `10`, `12` | Interval minutes | ✅ Configuration options |
| Various | `100` | List limits | ✅ Reasonable defaults |

**Verdict**: No problematic magic numbers. All values are either:

- Golf industry standards
- Reasonable UI defaults
- Configuration options

---

## Placeholder Text Audit

Form placeholders are appropriate and not business logic:

| Component | Placeholder | Status |
|-----------|-------------|--------|
| Player forms | Name, email examples | ✅ Appropriate |
| Trip forms | `"Myrtle Beach 2026"` | ✅ Example text |
| Search inputs | `"Search players..."` | ✅ Appropriate |
| Notes fields | Instructional text | ✅ Appropriate |

---

## Fixes Applied

### 1. DraftBoard.tsx - Hardcoded Trip ID

**Before:**

```typescript
const draftConfig = createDraftConfig(
  'draft-trip', // Using placeholder trip ID
```

**After:** Should use actual trip ID from useTripStore

---

## Recommendations

1. **Immediate**: Fix DraftBoard.tsx to use actual trip ID
2. **Low Priority**: Consider making seed data dates dynamic
3. **Documentation**: Add comment about mock GHIN data being for demo purposes

---

*Audit Complete*
