# E2E Tests - betMate

This directory contains end-to-end tests for the betMate application using Playwright.

## Structure

```
tests/e2e/
├── fixtures/          # Test fixtures (auth, setup)
│   └── auth.fixture.ts
├── pages/             # Page Object Models (POMs)
│   ├── index.ts
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── HomePage.ts
│   ├── MatchesPage.ts
│   ├── MatchCard.ts
│   ├── LeaderboardPage.ts
│   └── MyBetsPage.ts
├── specs/             # Test specifications
│   ├── auth.spec.ts
│   ├── betting.spec.ts
│   ├── leaderboard.spec.ts
│   ├── my-bets.spec.ts
│   └── edge-cases.spec.ts
└── E2E-README.md
```

## Prerequisites

1. **Environment Setup**: Ensure you have `.env.test` file with the following variables:

```env
SUPABASE_URL=<your-test-supabase-url>
SUPABASE_PUBLIC_KEY=<your-test-supabase-public-key>
E2E_USERNAME_ID=<test-user-id>
E2E_USERNAME=<test-user-email>
E2E_PASSWORD=<test-user-password>

# Optional: Service Role Key for complete data cleanup (bypasses RLS)
# Without this, cleanup is limited by RLS policies
# Get from: Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

2. **Test Database**: You should have a separate Supabase project for E2E testing with:
   - Database schema migrated
   - Test user created
   - Test data seeded (matches, tournaments)

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/specs/auth.spec.ts
npx playwright test tests/e2e/specs/betting.spec.ts
npx playwright test tests/e2e/specs/leaderboard.spec.ts
npx playwright test tests/e2e/specs/my-bets.spec.ts
npx playwright test tests/e2e/specs/edge-cases.spec.ts

# Run specific test suite
npx playwright test --grep "Leaderboard"
npx playwright test --grep "My Bets"
npx playwright test --grep "Edge Cases"

# Run tests with specific project/browser
npx playwright test --project=chromium

# Debug tests
npx playwright test --debug

# Run only edge case tests
npx playwright test tests/e2e/specs/edge-cases.spec.ts --headed
```

## Data Cleanup (Global Teardown)

After all tests complete, the `global-teardown.ts` script automatically cleans up test data:

**What gets cleaned:**
- `bets` - All betting predictions created during tests
- `scores` - Points accumulated by the test user

**What is preserved:**
- `matches` - Seed data needed for tests
- `tournaments` - Seed data needed for tests
- `profiles` - Test user account remains intact

**Cleanup Strategy:**
1. **With Service Role Key** (recommended):
   - Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.test`
   - Bypasses RLS policies for complete cleanup
   - Can clean all test data regardless of RLS restrictions

2. **Without Service Role Key** (fallback):
   - Uses test user authentication (anon key)
   - Limited by RLS policies
   - Can only clean data the test user has permission to delete

**Note:** If you experience issues with leftover test data, add the Service Role Key to your `.env.test` file. Get it from: Supabase Dashboard → Settings → API → service_role key

## Test Patterns

### Using Page Object Models (POMs)

POMs encapsulate page structure and interactions:

```typescript
import { LoginPage } from "../pages/LoginPage";

test("should login", async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login("user@example.com", "password");

  await expect(page).toHaveURL("/");
});
```

### Using Authenticated Fixture

For tests that require authentication, use the `authenticatedPage` fixture:

```typescript
import { test, expect } from "../fixtures/auth.fixture";

test("should access protected page", async ({ authenticatedPage }) => {
  // User is already logged in
  await authenticatedPage.goto("/my-bets");

  // Your test logic here
});
```

The `authenticatedPage` fixture:
- Automatically logs in before each test
- Provides an authenticated page context
- Logs out after each test for cleanup

### Testing Betting Flow

```typescript
import { test, expect } from "../fixtures/auth.fixture";
import { MatchesPage } from "../pages/MatchesPage";

test("should place a bet", async ({ authenticatedPage }) => {
  const matchesPage = new MatchesPage(authenticatedPage);

  await matchesPage.goto();
  await matchesPage.waitForMatchesToLoad();

  const matchCard = matchesPage.getMatchCard(1);
  await matchCard.betOnHomeWin();

  const isSelected = await matchCard.isBetSelected("home_win");
  expect(isSelected).toBe(true);
});
```

## Available Page Object Models

### Authentication POMs

- **LoginPage**: Login form interactions
  - `goto()`: Navigate to login page
  - `login(email, password)`: Complete login flow
  - `clickForgotPassword()`: Navigate to password reset
  - `clickRegisterLink()`: Navigate to registration

- **RegisterPage**: Registration form interactions
  - `goto()`: Navigate to register page
  - `register(username, email, password)`: Complete registration
  - `clickLoginLink()`: Navigate to login page

- **HomePage**: Main page and navigation
  - `goto()`: Navigate to home page
  - `logout()`: Logout current user
  - `isLoggedIn()`: Check authentication status

### Betting POMs

- **MatchesPage**: Matches list view
  - `goto()`: Navigate to matches page
  - `getMatchCard(matchId)`: Get specific match card POM
  - `waitForMatchesToLoad()`: Wait for matches to appear
  - `getMatchCount()`: Get number of visible matches

- **MatchCard**: Individual match card interactions
  - `getHomeTeam()`: Get home team name
  - `getAwayTeam()`: Get away team name
  - `betOnHomeWin()`: Place bet on home win (1)
  - `betOnDraw()`: Place bet on draw (X)
  - `betOnAwayWin()`: Place bet on away win (2)
  - `isBettingLocked()`: Check if betting is available
  - `isBetSelected(betType)`: Check if specific bet is selected

### Other POMs

- **LeaderboardPage**: Tournament ranking view
  - `goto(tournamentId?)`: Navigate to leaderboard
  - `waitForLeaderboardToLoad()`: Wait for data to load
  - `getParticipantCount()`: Get number of participants
  - `getEntryByRank(rank)`: Get specific leaderboard entry

- **MyBetsPage**: User's betting history
  - `goto(tournamentId?, status?)`: Navigate with filters
  - `getBetCount()`: Get number of displayed bets
  - `deleteBet(betId)`: Delete a specific bet

## Test Scenarios Coverage

### Auth Tests (auth.spec.ts)
- ✅ Successful login with valid credentials
- ✅ Error handling for invalid credentials
- ✅ Navigation between login and register
- ✅ Forgot password flow
- ✅ Loading state during authentication
- ✅ Successful logout
- ✅ Form validation

### Betting Tests (betting.spec.ts)
- ✅ Display list of matches
- ✅ View match details
- ✅ Place bet on home win
- ✅ Place bet on draw
- ✅ Place bet on away win
- ✅ Modify existing bet
- ✅ Locked matches handling
- ✅ Session persistence

### Leaderboard Tests (leaderboard.spec.ts)
- ✅ Navigate to leaderboard page
- ✅ Display leaderboard table when tournaments exist
- ✅ Display participant entries with correct structure
- ✅ Display participants in descending order by points
- ✅ Highlight current user's row
- ✅ Filter leaderboard by tournament ID
- ✅ Error handling and refresh functionality
- ✅ Empty state when no tournaments exist
- ✅ Session persistence across page refreshes

### My Bets Tests (my-bets.spec.ts)
- ✅ Navigate to my bets page
- ✅ Display user's betting history
- ✅ Display bet details in cards
- ✅ Filter bets by status (pending, resolved, all)
- ✅ Filter bets by tournament
- ✅ Combined filtering (tournament + status)
- ✅ Delete bet functionality with confirmation dialog
- ✅ Cancel deletion
- ✅ Confirm deletion and verify removal
- ✅ Error handling and refresh functionality
- ✅ Empty state for no bets
- ✅ Integration with matches (newly placed bets appear)
- ✅ Session persistence

### Edge Cases & Negative Scenarios (edge-cases.spec.ts)
- ✅ **Authentication edge cases:**
  - Empty email/password validation
  - Invalid email format handling
  - Very long email/password handling
  - Empty username validation
  - Short password validation
  - Special characters in username
  - SQL injection attempt prevention
- ✅ **Protected routes:**
  - Redirect unauthenticated users from home, my-bets, leaderboard
  - Handle non-existent page access
- ✅ **Betting edge cases:**
  - Multiple clicks on same bet option
  - Rapid bet changes on same match
  - Betting on locked matches
- ✅ **My Bets edge cases:**
  - Delete non-existent bet
  - Invalid tournament ID in URL
  - Invalid status parameter in URL
- ✅ **Leaderboard edge cases:**
  - Invalid tournament ID in URL
  - No participants in leaderboard
- ✅ **Session management:**
  - Page refresh without losing session
  - Back/forward navigation
- ✅ **Network & performance:**
  - Slow network handling

## Test Suite Summary

The E2E test suite is comprehensive and covers:

✅ **Complete feature coverage:**
- Authentication (login, register, logout)
- Betting (place, modify, view locked matches)
- Leaderboard (view rankings, filter by tournament)
- My Bets (view history, filter, delete bets)

✅ **Edge cases and negative scenarios:**
- Input validation and boundary conditions
- Protected route access
- Error handling and recovery
- Session management
- Network resilience

✅ **Test organization:**
- 5 test specification files
  - `auth.spec.ts` - 15 tests
  - `betting.spec.ts` - 8 tests
  - `leaderboard.spec.ts` - 13 tests
  - `my-bets.spec.ts` - 22 tests
  - `edge-cases.spec.ts` - 17 tests
- Page Object Model pattern for maintainability
- Authenticated fixtures for efficient test setup
- Global teardown for data cleanup

**Total test count:** 75 test cases covering all major user flows

## Next Steps (Optional Enhancements)

You can further extend the test suite with:

1. **Visual Regression Tests**: Add screenshot comparisons for UI consistency
   ```typescript
   await expect(page).toHaveScreenshot('leaderboard-page.png');
   ```

2. **Performance Tests**: Measure page load times and API response times
   ```typescript
   const startTime = Date.now();
   await page.goto('/');
   const loadTime = Date.now() - startTime;
   expect(loadTime).toBeLessThan(3000);
   ```

3. **Accessibility Tests**: Integrate axe-core for a11y testing
   ```bash
   npm install @axe-core/playwright
   ```

4. **API Tests**: Add direct API testing alongside E2E tests
   - Test API endpoints independently
   - Verify response schemas
   - Test error responses

5. **Cross-browser Testing**: Enable more browsers in playwright.config.ts
   - Firefox
   - WebKit (Safari)
   - Mobile viewports

## Best Practices

1. **Use data-testid selectors**: More stable than CSS selectors
2. **Keep POMs focused**: One POM per page/component
3. **Use fixtures for setup**: Avoid duplicating setup code
4. **Handle async properly**: Always await page interactions
5. **Clean up after tests**: Use fixtures for cleanup
6. **Make tests independent**: Don't rely on test execution order
7. **Use meaningful assertions**: Make failures easy to understand

## Debugging Tests

### VS Code Debugging
1. Install Playwright Test for VS Code extension
2. Set breakpoints in your test files
3. Use "Debug Test" option in test explorer

### Playwright Inspector
```bash
npx playwright test --debug
```

### Trace Viewer
When tests fail, check the trace:
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

Tests are configured to run in CI with:
- Retry on failure (2 retries)
- Single worker for stability
- HTML report generation
- Screenshots on failure
- Trace on first retry

See [playwright.config.ts](../../playwright.config.ts) for full configuration.

## Troubleshooting

### Tests timing out
- Increase timeout in test: `test.setTimeout(30000)`
- Check if test database is accessible
- Verify test data exists

### Authentication failing
- Verify E2E_USERNAME and E2E_PASSWORD in `.env.test`
- Check if test user exists in test database
- Ensure test database URL is correct

### Flaky tests
- Add explicit waits: `await page.waitForLoadState()`
- Use `waitForSelector` instead of fixed `waitForTimeout`
- Check for race conditions in application code

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
