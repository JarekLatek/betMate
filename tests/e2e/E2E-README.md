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
│   ├── LeaderboardPage.ts
│   └── MyBetsPage.ts
├── specs/             # Test specifications
│   ├── auth.spec.ts
│   ├── betting.spec.ts
│   ├── leaderboard.spec.ts
│   ├── my-bets.spec.ts
│   └── edge-cases.spec.ts
├── global-setup.ts    # Test data seeding
├── global-teardown.ts # Test data cleanup
└── E2E-README.md
```

## Prerequisites

1. **Environment Setup**: Ensure you have `.env.test` file with the following variables:

```env
SUPABASE_URL=<your-test-supabase-url>
SUPABASE_KEY=<your-supabase-key>
PUBLIC_SUPABASE_URL=<your-public-supabase-url>
PUBLIC_SUPABASE_ANON_KEY=<your-public-supabase-anon-key>
E2E_USERNAME_ID=<test-user-id>
E2E_USERNAME=<test-user-email>
E2E_PASSWORD=<test-user-password>

# Required: Service Role Key for data seeding and cleanup (bypasses RLS)
# Get from: Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

2. **Test Database**: You should have a separate Supabase project for E2E testing with:
   - Database schema migrated
   - Test user created
   - Test data will be seeded automatically by global-setup.ts

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

# Debug tests
npx playwright test --debug

# View HTML report
npx playwright show-report
```

## Test Configuration

Tests run with the following configuration (see `playwright.config.ts`):

- **Sequential execution**: `fullyParallel: false`, `workers: 1`
- **Browser**: Chromium (Desktop Chrome)
- **Retries**: 2 in CI, 0 locally
- **Global setup**: Seeds test data (tournaments, matches)
- **Global teardown**: Cleans up test data (bets, scores)

> **Note**: Tests run sequentially to avoid race conditions with shared user session.

## Data Management

### Global Setup (Before Tests)
- Creates test tournament if not exists
- Seeds SCHEDULED matches for betting tests
- Creates score entry for leaderboard tests

### Global Teardown (After Tests)
- Cleans up `bets` table
- Cleans up `scores` table
- Preserves `matches`, `tournaments`, and `profiles`

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
- Waits for full React hydration
- Provides an authenticated page context
- Logs out after each test for cleanup

## Available Page Object Models

### Authentication POMs

- **LoginPage**: Login form interactions
  - `goto()`: Navigate to login page
  - `login(email, password)`: Complete login flow
  - `fillCredentials(email, password)`: Fill form without submitting
  - `submit()`: Submit the form
  - `clickForgotPassword()`: Navigate to password reset
  - `clickRegisterLink()`: Navigate to registration

- **RegisterPage**: Registration form interactions
  - `goto()`: Navigate to register page
  - `register(username, email, password)`: Complete registration
  - `fillRegistrationForm(username, email, password)`: Fill form without submitting
  - `clickLoginLink()`: Navigate to login page

- **HomePage**: Main page and navigation
  - `goto()`: Navigate to home page
  - `logout()`: Logout current user
  - `isLoggedIn()`: Check authentication status

### Feature POMs

- **MatchesPage**: Matches list view
  - `goto()`: Navigate to matches page
  - `waitForMatchesToLoad()`: Wait for matches to appear
  - `getMatchCount()`: Get number of visible matches

- **LeaderboardPage**: Tournament ranking view
  - `goto(tournamentId?)`: Navigate to leaderboard
  - `isLeaderboardVisible()`: Check if leaderboard table is visible
  - `hasNoTournaments()`: Check for empty state
  - `hasError()`: Check for error state
  - `getParticipantCount()`: Get number of participants

- **MyBetsPage**: User's betting history
  - `goto(tournamentId?, status?)`: Navigate with filters
  - `waitForBetsToLoad()`: Wait for bets to load
  - `getBetCount()`: Get number of displayed bets
  - `hasError()`: Check for error state

## Test Scenarios Coverage

### Auth Tests (auth.spec.ts) - 9 tests
- Successful login with valid credentials
- Error handling for invalid credentials
- Navigation between login and register pages
- Forgot password navigation
- Loading state during authentication
- Register form validation
- Duplicate username handling
- Protected routes redirect

### Betting Tests (betting.spec.ts) - 2 tests
- Display list of matches
- Maintain authentication across pages

> **Note**: Detailed betting tests (place/modify bets) were removed due to test data isolation issues with shared user sessions. These features are covered by manual testing.

### Leaderboard Tests (leaderboard.spec.ts) - 3 tests
- Navigate to leaderboard page
- Error handling and refresh functionality
- Empty state when no tournaments exist

### My Bets Tests (my-bets.spec.ts) - 3 tests
- Navigate to my bets page
- Display user's bets when bets exist
- Error handling and refresh functionality

### Edge Cases (edge-cases.spec.ts) - 18 tests
- **Authentication edge cases:**
  - Empty email/password validation
  - Invalid email format handling
  - Very long email/password handling
  - Empty username validation
  - Short password validation
  - Special characters in username
  - SQL injection attempt prevention
- **Protected routes:**
  - Redirect unauthenticated users from home, my-bets, leaderboard
  - Handle non-existent page access
- **My Bets edge cases:**
  - Invalid tournament ID in URL
  - Invalid status parameter in URL
- **Leaderboard edge cases:**
  - Invalid tournament ID in URL
  - No participants handling
- **Network & performance:**
  - Slow network handling

## Test Suite Summary

| Spec File | Test Count | Description |
|-----------|------------|-------------|
| auth.spec.ts | 9 | Authentication flows |
| betting.spec.ts | 2 | Match viewing, session |
| leaderboard.spec.ts | 3 | Ranking page |
| my-bets.spec.ts | 3 | Betting history |
| edge-cases.spec.ts | 18 | Validation, errors, security |
| **Total** | **35** | |

## Best Practices

1. **Use data-testid selectors**: More stable than CSS selectors
2. **Wait for hydration**: Use `waitForLoadState("networkidle")` before interactions
3. **Keep POMs focused**: One POM per page/component
4. **Use fixtures for setup**: Avoid duplicating setup code
5. **Handle async properly**: Always await page interactions
6. **Clean up after tests**: Use fixtures and global teardown for cleanup
7. **Make tests independent**: Don't rely on test execution order

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

### HTML Report
```bash
npx playwright show-report
```

## Troubleshooting

### Tests timing out
- Increase timeout in test: `test.setTimeout(30000)`
- Check if test database is accessible
- Verify test data exists (check global-setup.ts logs)

### Authentication failing
- Verify E2E_USERNAME and E2E_PASSWORD in `.env.test`
- Check if test user exists in test database
- Ensure test database URL is correct

### Flaky tests
- Tests run sequentially (`workers: 1`) to prevent race conditions
- Add explicit waits: `await page.waitForLoadState("networkidle")`
- Use `waitFor({ state: "visible" })` for elements
- Check for race conditions in application code

### Global setup/teardown issues
- Ensure SUPABASE_SERVICE_ROLE_KEY is set in `.env.test`
- Check Supabase project permissions
- Verify database schema is migrated

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
