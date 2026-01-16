# QA Test Plan

**Version**: 1.0
**Last Updated**: January 2026

---

## 1. Testing Strategy

### Current Test Coverage

- **Unit Tests**: 96 tests passing (Vitest)
  - `scoringEngine.test.ts` - 47 tests
  - `export.test.ts` - 21 tests
  - `awards.test.ts` - 16 tests
  - `templates.test.ts` - 12 tests

### Test Framework

- **Unit/Integration**: Vitest + @testing-library/react
- **E2E**: Not yet implemented (recommend Playwright)

---

## 2. Critical User Flows

### Flow 1: Trip Creation

| Step | Action | Expected Result | Coverage |
|------|--------|-----------------|----------|
| 1 | Click "Create Trip" | QuickStartWizard opens | Manual |
| 2 | Enter trip name | Input validates | Manual |
| 3 | Set dates | Date picker works | Manual |
| 4 | Set team names | Optional customization | Manual |
| 5 | Submit | Trip created, redirect to players | Manual |

### Flow 2: Player Management

| Step | Action | Expected Result | Coverage |
|------|--------|-----------------|----------|
| 1 | Navigate to /players | Player list shows | Manual |
| 2 | Click "Add Player" | Form opens | Manual |
| 3 | Enter player info | Validation works | Manual |
| 4 | Submit | Player added to list | Manual |
| 5 | Assign to team | Team updated | Manual |

### Flow 3: Match Scoring

| Step | Action | Expected Result | Coverage |
|------|--------|-----------------|----------|
| 1 | Navigate to /score | Match list shows | Manual |
| 2 | Select match | Scoring view opens | Manual |
| 3 | Swipe to score | Score updates | **Unit: ✅** |
| 4 | Complete match | Victory modal shows | Manual |
| 5 | View standings | Points calculated | **Unit: ✅** |

### Flow 4: Captain Mode

| Step | Action | Expected Result | Coverage |
|------|--------|-----------------|----------|
| 1 | Toggle captain mode | UI changes | Manual |
| 2 | Access captain tools | Command center opens | Manual |
| 3 | Create lineup | Lineup wizard works | Manual |
| 4 | Send message | Broadcast created | Manual |

---

## 3. Component Test Requirements

### High Priority (P0)

| Component | Tests Needed |
|-----------|-------------|
| `ScoreButton` | Tap, long-press, disabled states |
| `TeamStandingsHero` | Score calculation, animations |
| `BottomNav` | Navigation, badge display |
| `QuickStartWizard` | Multi-step form validation |

### Medium Priority (P1)

| Component | Tests Needed |
|-----------|-------------|
| `DraftBoard` | Draft modes, player selection |
| `LiveJumbotron` | Real-time updates |
| `MatchCard` | Status display, interactions |
| `TripStatsPage` | Stat tracking, leaderboard |

---

## 4. API Route Testing

| Route | Method | Tests Needed |
|-------|--------|-------------|
| `/api/golf-courses` | GET | Mock response, error handling |
| `/api/golf-courses/search` | GET | Query params, pagination |
| `/api/scorecard-ocr` | POST | File upload, validation |

---

## 5. Offline Testing

| Scenario | Expected Behavior | Coverage |
|----------|-------------------|----------|
| Go offline during scoring | Data saved locally | Manual |
| Return online | Sync indicator appears | Manual |
| View data offline | All local data accessible | Manual |

---

## 6. Recommended E2E Test Suite

### Installation

```bash
npm install -D @playwright/test
npx playwright install
```

### Test Files to Create

```
e2e/
├── smoke.spec.ts       # Basic route loading
├── trip-flow.spec.ts   # Trip creation flow
├── scoring.spec.ts     # Match scoring flow
└── captain.spec.ts     # Captain features
```

### Sample Smoke Test

```typescript
// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ryder Cup/);
    await expect(page.locator('text=Ryder Cup Tracker')).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    await page.click('text=More');
    await expect(page).toHaveURL('/more');
  });

  test('no console errors on critical pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.goto('/settings');
    await page.goto('/standings');

    expect(errors.filter(e => !e.includes('known-warning'))).toHaveLength(0);
  });
});
```

---

## 7. Manual Test Checklist

### Before Release

- [ ] Create new trip from empty state
- [ ] Add 4+ players
- [ ] Assign players to teams
- [ ] Create a session with matches
- [ ] Score a complete match
- [ ] Verify standings update
- [ ] Test offline mode
- [ ] Verify PWA install prompt

### Captain Mode

- [ ] Enable captain mode
- [ ] Access all captain tools
- [ ] Create lineup
- [ ] Use draft board
- [ ] Send announcement

### Responsive Design

- [ ] Test on iPhone SE (375px)
- [ ] Test on iPad (768px)
- [ ] Test on Desktop (1024px+)

---

## 8. Run Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

*Test Plan Complete*
