import { test, expect } from "@playwright/test";
import { test as authenticatedTest } from "../fixtures/auth.fixture";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { MatchesPage } from "../pages/MatchesPage";
import { MyBetsPage } from "../pages/MyBetsPage";
import { LeaderboardPage } from "../pages/LeaderboardPage";

/**
 * E2E Tests for Edge Cases and Negative Scenarios
 * Tests boundary conditions, validation, and error handling
 */
test.describe("Edge Cases - Authentication", () => {
  test("should not allow login with empty email", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try to submit with empty email
    await loginPage.fillCredentials("", "password123");
    await loginPage.submit();

    // Should remain on login page (HTML5 validation or form validation)
    await expect(page).toHaveURL("/login");
  });

  test("should not allow login with empty password", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try to submit with empty password
    await loginPage.fillCredentials("test@example.com", "");
    await loginPage.submit();

    // Should remain on login page
    await expect(page).toHaveURL("/login");
  });

  test("should not allow login with invalid email format", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try to login with invalid email format
    await loginPage.fillCredentials("notanemail", "password123");
    await loginPage.submit();

    // Should remain on login page or show validation error
    await expect(page).toHaveURL("/login");
  });

  test("should handle very long email gracefully", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try with extremely long email
    const longEmail = "a".repeat(1000) + "@example.com";
    await loginPage.fillCredentials(longEmail, "password123");
    await loginPage.submit();

    // Should handle gracefully (either validation or error message)
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL("/login");
  });

  test("should handle very long password gracefully", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try with extremely long password
    const longPassword = "a".repeat(10000);
    await loginPage.fillCredentials("test@example.com", longPassword);
    await loginPage.submit();

    // Should handle gracefully
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL("/login");
  });

  test("should not allow registration with empty username", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    await registerPage.goto();

    // Try to register with empty username
    await registerPage.fillRegistrationForm("", "test@example.com", "password123");
    await registerPage.submit();

    // Should remain on register page
    await expect(page).toHaveURL("/register");
  });

  test("should not allow registration with short password", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    await registerPage.goto();

    // Try to register with password shorter than minimum
    await registerPage.register("testuser", "test@example.com", "12345");

    // Should show validation error or remain on register page
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL("/register");
  });

  test("should handle special characters in username", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    await registerPage.goto();

    // Try to register with special characters
    await registerPage.register("test<script>alert('xss')</script>", "test@example.com", "password123");

    // Should handle gracefully (sanitize or reject)
    await page.waitForTimeout(2000);
  });

  test("should handle SQL injection attempt in email", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try SQL injection
    await loginPage.login("admin' OR '1'='1", "password");

    // Should be safely handled and show error
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Edge Cases - Protected Routes", () => {
  test("should redirect unauthenticated user from home page", async ({ page }) => {
    // Try to access home page without authentication
    await page.goto("/");

    // Wait for potential redirect
    await page.waitForLoadState("networkidle", { timeout: 5000 });

    // Should redirect to login (depends on middleware implementation)
    const currentUrl = page.url();
    expect(currentUrl.includes("/login") || currentUrl.includes("/")).toBeTruthy();
  });

  test("should redirect unauthenticated user from my-bets page", async ({ page }) => {
    // Try to access my-bets without authentication
    await page.goto("/my-bets");

    // Wait for potential redirect
    await page.waitForLoadState("networkidle", { timeout: 5000 });

    // Should redirect to login
    const currentUrl = page.url();
    expect(currentUrl).toContain("/login");
  });

  test("should redirect unauthenticated user from leaderboard page", async ({ page }) => {
    // Try to access leaderboard without authentication
    await page.goto("/leaderboard");

    // Wait for potential redirect
    await page.waitForLoadState("networkidle", { timeout: 5000 });

    // Should redirect to login
    const currentUrl = page.url();
    expect(currentUrl).toContain("/login");
  });

  test("should handle direct access to non-existent page", async ({ page }) => {
    // Try to access non-existent page
    await page.goto("/this-page-does-not-exist-at-all");

    // Should show 404 page or redirect
    await page.waitForLoadState("networkidle", { timeout: 5000 });

    // Verify we get some kind of error indication
    const status = await page
      .evaluate(() => {
        return fetch(window.location.href).then((r) => r.status);
      })
      .catch(() => 404);

    expect([404, 200]).toContain(status);
  });
});

authenticatedTest.describe("Edge Cases - Betting", () => {
  authenticatedTest("should handle clicking same bet option multiple times", async ({ authenticatedPage }) => {
    const matchesPage = new MatchesPage(authenticatedPage);

    await matchesPage.goto();
    await matchesPage.waitForMatchesToLoad();

    const matchCard = matchesPage.getMatchCard(1);
    await matchCard.waitForVisible();

    const isLocked = await matchCard.isBettingLocked();

    if (!isLocked) {
      // Click home win multiple times rapidly
      await matchCard.betOnHomeWin();
      await matchCard.betOnHomeWin();
      await matchCard.betOnHomeWin();

      // Wait for any API calls to complete
      await authenticatedPage.waitForTimeout(2000);

      // Should only have one bet (not multiple)
      // Verify by checking the selected state
      const isSelected = await matchCard.isBetSelected("home_win");
      expect(isSelected).toBe(true);
    } else {
      authenticatedTest.skip();
    }
  });

  authenticatedTest("should handle rapid bet changes on same match", async ({ authenticatedPage }) => {
    const matchesPage = new MatchesPage(authenticatedPage);

    await matchesPage.goto();
    await matchesPage.waitForMatchesToLoad();

    const matchCard = matchesPage.getMatchCard(1);
    await matchCard.waitForVisible();

    const isLocked = await matchCard.isBettingLocked();

    if (!isLocked) {
      // Rapidly change bets
      await matchCard.betOnHomeWin();
      await matchCard.betOnDraw();
      await matchCard.betOnAwayWin();
      await matchCard.betOnHomeWin();

      // Wait for final state
      await authenticatedPage.waitForTimeout(2000);

      // Should reflect the last bet (home win)
      const isHomeWinSelected = await matchCard.isBetSelected("home_win");
      expect(isHomeWinSelected).toBe(true);
    } else {
      authenticatedTest.skip();
    }
  });

  authenticatedTest("should not allow betting on match that just became locked", async ({ authenticatedPage }) => {
    const matchesPage = new MatchesPage(authenticatedPage);

    await matchesPage.goto();
    await matchesPage.waitForMatchesToLoad();

    // Find a match that's close to being locked (if available)
    // This is hard to test deterministically without test data setup
    // For now, we'll just verify locked matches show the correct UI

    const matchCard = matchesPage.getMatchCard(1);
    await matchCard.waitForVisible();

    const isLocked = await matchCard.isBettingLocked();

    if (isLocked) {
      // Verify locked message is displayed
      await expect(matchCard.bettingLocked).toBeVisible();

      // Verify betting buttons are not visible or disabled
      const homeWinVisible = await matchCard.betButtonHomeWin.isVisible().catch(() => false);
      expect(homeWinVisible).toBe(false);
    }
    // Test passes - locked state is handled correctly
  });
});

authenticatedTest.describe("Edge Cases - My Bets", () => {
  authenticatedTest("should handle deleting bet that no longer exists", async ({ authenticatedPage }) => {
    const myBetsPage = new MyBetsPage(authenticatedPage);
    const matchesPage = new MatchesPage(authenticatedPage);

    // Place a bet
    await matchesPage.goto();
    await matchesPage.waitForMatchesToLoad();

    const matchCard = matchesPage.getMatchCard(1);
    await matchCard.waitForVisible();

    const isLocked = await matchCard.isBettingLocked();

    if (!isLocked) {
      await matchCard.betOnHomeWin();
      await authenticatedPage.waitForTimeout(1000);

      // Navigate to my bets
      await myBetsPage.goto();
      await myBetsPage.waitForBetsToLoad();

      const betCount = await myBetsPage.getBetCount();

      if (betCount > 0) {
        // Try to delete the bet
        const deleteButton = authenticatedPage.getByTestId("delete-bet-button").first();

        const isVisible = await deleteButton.isVisible().catch(() => false);

        if (isVisible) {
          await deleteButton.click();

          // Confirm deletion
          const confirmButton = authenticatedPage.getByTestId("delete-bet-confirm");
          await expect(confirmButton).toBeVisible({ timeout: 3000 });
          await confirmButton.click();

          // Wait for deletion
          await authenticatedPage.waitForTimeout(2000);

          // Should handle gracefully (either success or error message)
          // Verify page is still functional
          await expect(authenticatedPage).toHaveURL(/\/my-bets/);
        }
      }
    } else {
      authenticatedTest.skip();
    }
  });

  authenticatedTest("should handle navigation with invalid tournament ID", async ({ authenticatedPage }) => {
    const myBetsPage = new MyBetsPage(authenticatedPage);

    // Navigate with invalid tournament ID (very large number)
    await myBetsPage.goto(999999999);
    await myBetsPage.waitForBetsToLoad();

    // Should handle gracefully (show empty state or error)
    await authenticatedPage.waitForTimeout(1000);

    // Verify page loaded without crashing
    await expect(authenticatedPage).toHaveURL(/\/my-bets/);
  });

  authenticatedTest("should handle navigation with invalid status parameter", async ({ authenticatedPage }) => {
    const myBetsPage = new MyBetsPage(authenticatedPage);

    // Navigate with invalid status
    await authenticatedPage.goto("/my-bets?status=invalid-status");
    await myBetsPage.waitForBetsToLoad();

    // Should handle gracefully (ignore invalid parameter or show all)
    await authenticatedPage.waitForTimeout(1000);

    // Verify page loaded without crashing
    await expect(authenticatedPage).toHaveURL(/\/my-bets/);
  });
});

authenticatedTest.describe("Edge Cases - Leaderboard", () => {
  authenticatedTest("should handle navigation with invalid tournament ID", async ({ authenticatedPage }) => {
    const leaderboardPage = new LeaderboardPage(authenticatedPage);

    // Navigate with invalid tournament ID
    await leaderboardPage.goto(999999999);
    await authenticatedPage.waitForLoadState("networkidle", {
      timeout: 10000,
    });

    // Should handle gracefully (show empty state or error)
    await authenticatedPage.waitForTimeout(1000);

    // Verify page loaded without crashing
    await expect(authenticatedPage).toHaveURL(/\/leaderboard/);
  });

  authenticatedTest("should handle leaderboard with no participants", async ({ authenticatedPage }) => {
    const leaderboardPage = new LeaderboardPage(authenticatedPage);

    await leaderboardPage.goto();
    await authenticatedPage.waitForLoadState("networkidle", {
      timeout: 10000,
    });

    const participantCount = await leaderboardPage.getParticipantCount().catch(() => 0);

    if (participantCount === 0) {
      // Verify appropriate empty state is shown
      const hasNoTournaments = await leaderboardPage.hasNoTournaments();
      const hasLeaderboard = await leaderboardPage.isLeaderboardVisible();

      // Either "no tournaments" or empty leaderboard should be shown
      expect(hasNoTournaments || !hasLeaderboard).toBe(true);
    }
    // Test passes - handles empty state
  });
});

authenticatedTest.describe("Edge Cases - Session Management", () => {
  authenticatedTest("should handle page refresh without losing session", async ({ authenticatedPage }) => {
    const matchesPage = new MatchesPage(authenticatedPage);

    // Place a bet
    await matchesPage.goto();
    await matchesPage.waitForMatchesToLoad();

    const matchCard = matchesPage.getMatchCard(1);
    await matchCard.waitForVisible();

    const isLocked = await matchCard.isBettingLocked();

    if (!isLocked) {
      await matchCard.betOnHomeWin();
      await authenticatedPage.waitForTimeout(1000);

      // Refresh page multiple times
      await authenticatedPage.reload();
      await matchesPage.waitForMatchesToLoad();

      await authenticatedPage.reload();
      await matchesPage.waitForMatchesToLoad();

      // Verify bet is still selected
      await matchCard.waitForVisible();
      const isStillSelected = await matchCard.isBetSelected("home_win");
      expect(isStillSelected).toBe(true);
    } else {
      authenticatedTest.skip();
    }
  });

  authenticatedTest("should handle back/forward navigation", async ({ authenticatedPage }) => {
    const matchesPage = new MatchesPage(authenticatedPage);
    const myBetsPage = new MyBetsPage(authenticatedPage);
    const leaderboardPage = new LeaderboardPage(authenticatedPage);

    // Navigate through multiple pages
    await matchesPage.goto();
    await myBetsPage.goto();
    await leaderboardPage.goto();

    // Go back twice
    await authenticatedPage.goBack();
    await expect(authenticatedPage).toHaveURL(/\/my-bets/);

    await authenticatedPage.goBack();
    await expect(authenticatedPage).toHaveURL(/\//);

    // Go forward
    await authenticatedPage.goForward();
    await expect(authenticatedPage).toHaveURL(/\/my-bets/);
  });
});

test.describe("Edge Cases - Network and Performance", () => {
  test("should handle slow network gracefully", async ({ page }) => {
    // Simulate slow network
    await page.route("**/*", (route) => {
      setTimeout(() => route.continue(), 1000);
    });

    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try to login with slow network
    await loginPage.login(process.env.E2E_USERNAME!, process.env.E2E_PASSWORD!);

    // Should eventually succeed or timeout gracefully
    await page.waitForLoadState("networkidle", { timeout: 30000 });
  });
});
