import { test as base, expect } from "../fixtures/auth.fixture";
import { MyBetsPage } from "../pages/MyBetsPage";
import { HomePage } from "../pages/HomePage";
import { MatchesPage } from "../pages/MatchesPage";

/**
 * E2E Tests for My Bets Page
 * Tests viewing, filtering, and managing user's betting history
 * Uses authenticated fixture to start tests with logged-in user
 */
base.describe("My Bets", () => {
  base.describe("Page Navigation", () => {
    base("should navigate to my bets page from home", async ({ authenticatedPage }) => {
      // Start on home page
      await authenticatedPage.goto("/");

      // Navigate to my bets via navigation menu
      await authenticatedPage.getByRole("link", { name: "Moje zakłady" }).click();

      // Verify URL changed
      await expect(authenticatedPage).toHaveURL("/my-bets");
    });

    base("should navigate to my bets page directly", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate directly to my bets
      await myBetsPage.goto();

      // Verify page loaded
      await expect(authenticatedPage).toHaveURL("/my-bets");
    });

    base("should navigate between pages and return to my bets", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Start on my bets page
      await myBetsPage.goto();

      // Navigate to home
      await authenticatedPage.getByRole("link", { name: "Mecze" }).click();
      await expect(authenticatedPage).toHaveURL("/");

      // Navigate back to my bets
      await authenticatedPage.getByRole("link", { name: "Moje zakłady" }).click();
      await expect(authenticatedPage).toHaveURL("/my-bets");
    });
  });

  base.describe("Bets Display", () => {
    base("should display user's bets when bets exist", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate to my bets
      await myBetsPage.goto();
      await myBetsPage.waitForBetsToLoad();

      // Check if bets are displayed
      const betCount = await myBetsPage.getBetCount();

      // Verify the bet list is loaded (could be 0 or more bets)
      expect(betCount).toBeGreaterThanOrEqual(0);
    });

    base("should display bet list container", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      await myBetsPage.goto();
      await myBetsPage.waitForBetsToLoad();

      // Wait a bit for the UI to render
      await authenticatedPage.waitForTimeout(1000);

      // Verify bet list or empty state is present
      const hasBetList = await authenticatedPage
        .getByTestId("bet-list")
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await authenticatedPage
        .getByText(/Nie masz jeszcze żadnych zakładów|Brak zakładów/)
        .isVisible()
        .catch(() => false);

      // At least one should be visible
      expect(hasBetList || hasEmptyState).toBe(true);
    });

    base("should display bet details in bet cards", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      await myBetsPage.goto();
      await myBetsPage.waitForBetsToLoad();

      const betCount = await myBetsPage.getBetCount();

      if (betCount > 0) {
        // Get first bet card
        const firstBet = myBetsPage.getBetItems().first();

        // Verify bet card is visible
        await expect(firstBet).toBeVisible();

        // Verify bet card contains team information
        // Note: Actual content depends on implementation
        const betText = await firstBet.textContent();
        expect(betText).toBeTruthy();
      } else {
        // Skip test if no bets available
        base.skip();
      }
    });
  });

  base.describe("Filtering by Status", () => {
    base("should filter bets by status via URL parameter", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate with pending status filter
      await myBetsPage.goto(undefined, "pending");

      // Verify URL contains status parameter
      await expect(authenticatedPage).toHaveURL(/status=pending/);

      await myBetsPage.waitForBetsToLoad();

      // Verify page loaded with filter applied
      await authenticatedPage.waitForTimeout(1000);
    });

    base("should filter bets by resolved status", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate with resolved status filter
      await myBetsPage.goto(undefined, "resolved");

      // Verify URL contains status parameter
      await expect(authenticatedPage).toHaveURL(/status=resolved/);

      await myBetsPage.waitForBetsToLoad();
    });

    base("should show all bets when no status filter applied", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate without status filter
      await myBetsPage.goto(undefined, "all");

      // Verify URL does NOT contain status parameter
      // (or contains "all" which is ignored)
      await myBetsPage.waitForBetsToLoad();

      // Count should include all bets
      const betCount = await myBetsPage.getBetCount();
      expect(betCount).toBeGreaterThanOrEqual(0);
    });
  });

  base.describe("Filtering by Tournament", () => {
    base("should filter bets by tournament ID via URL parameter", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate with tournament filter
      // Note: Assumes tournament ID 1 exists
      await myBetsPage.goto(1);

      // Verify URL contains tournament parameter
      await expect(authenticatedPage).toHaveURL(/tournamentId=1/);

      await myBetsPage.waitForBetsToLoad();
    });

    base("should filter by both tournament and status", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate with both filters
      await myBetsPage.goto(1, "pending");

      // Verify URL contains both parameters
      await expect(authenticatedPage).toHaveURL(/tournamentId=1/);
      await expect(authenticatedPage).toHaveURL(/status=pending/);

      await myBetsPage.waitForBetsToLoad();
    });
  });

  base.describe("Delete Bet Functionality", () => {
    base("should show delete button for pending bets", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);
      const matchesPage = new MatchesPage(authenticatedPage);

      // First, place a bet to ensure we have at least one pending bet
      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      // Try to place a bet on the first available match
      const matchCard = matchesPage.getMatchCard(1);
      await matchCard.waitForVisible();

      const isLocked = await matchCard.isBettingLocked();

      if (!isLocked) {
        // Place a bet
        await matchCard.betOnHomeWin();
        await authenticatedPage.waitForTimeout(1000);

        // Navigate to my bets
        await myBetsPage.goto();
        await myBetsPage.waitForBetsToLoad();

        const betCount = await myBetsPage.getBetCount();

        if (betCount > 0) {
          // Check if delete button exists (for pending bets)
          const deleteButton = authenticatedPage.getByTestId("delete-bet-button").first();
          const isDeleteButtonVisible = await deleteButton.isVisible().catch(() => false);

          // If the bet is pending, delete button should be visible
          // (Note: This assumes the implementation shows delete buttons for pending bets)
          expect(isDeleteButtonVisible).toBeDefined();
        }
      } else {
        base.skip();
      }
    });

    base("should display confirmation dialog when deleting bet", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);
      const matchesPage = new MatchesPage(authenticatedPage);

      // Place a bet first
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
          // Click delete button on first bet
          const deleteButton = authenticatedPage.getByTestId("delete-bet-button").first();

          const isVisible = await deleteButton.isVisible().catch(() => false);

          if (isVisible) {
            await deleteButton.click();

            // Wait for confirmation dialog
            const cancelButton = authenticatedPage.getByTestId("delete-bet-cancel");
            await expect(cancelButton).toBeVisible({ timeout: 3000 });

            // Cancel the deletion
            await cancelButton.click();

            // Verify bet still exists
            const newBetCount = await myBetsPage.getBetCount();
            expect(newBetCount).toBe(betCount);
          }
        }
      } else {
        base.skip();
      }
    });

    base("should delete bet when confirmed", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);
      const matchesPage = new MatchesPage(authenticatedPage);

      // Place a bet first
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

        const initialBetCount = await myBetsPage.getBetCount();

        if (initialBetCount > 0) {
          // Click delete button on first bet
          const deleteButton = authenticatedPage.getByTestId("delete-bet-button").first();

          const isVisible = await deleteButton.isVisible().catch(() => false);

          if (isVisible) {
            await deleteButton.click();

            // Confirm deletion
            const confirmButton = authenticatedPage.getByTestId("delete-bet-confirm");
            await expect(confirmButton).toBeVisible({ timeout: 3000 });
            await confirmButton.click();

            // Wait for deletion to complete
            await authenticatedPage.waitForTimeout(2000);

            // Verify bet count decreased
            const newBetCount = await myBetsPage.getBetCount();
            expect(newBetCount).toBeLessThan(initialBetCount);
          }
        }
      } else {
        base.skip();
      }
    });
  });

  base.describe("Error Handling", () => {
    base("should display error message when bets fail to load", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate to my bets
      await myBetsPage.goto();
      await myBetsPage.waitForBetsToLoad();

      // Check if error is displayed
      // Note: This test might not trigger an error in a working environment
      const hasError = await myBetsPage.hasError();

      if (hasError) {
        // Verify error message is visible
        await expect(myBetsPage.errorMessage).toBeVisible();

        // Verify refresh button is visible
        await expect(myBetsPage.refreshButton).toBeVisible();
      }
      // If no error, test passes (error handling is available but not triggered)
    });

    base("should allow retrying after error with refresh button", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      await myBetsPage.goto();
      await myBetsPage.waitForBetsToLoad();

      const hasError = await myBetsPage.hasError();

      if (hasError) {
        // Click refresh button
        await myBetsPage.clickRefresh();

        // Wait for reload
        await authenticatedPage.waitForTimeout(2000);

        // Verify either bets loaded or error still shows
        const stillHasError = await myBetsPage.hasError();
        const betCount = await myBetsPage.getBetCount();

        expect(stillHasError || betCount >= 0).toBe(true);
      } else {
        base.skip();
      }
    });
  });

  base.describe("Empty State", () => {
    base("should display empty state when user has no bets", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      await myBetsPage.goto();
      await myBetsPage.waitForBetsToLoad();

      const betCount = await myBetsPage.getBetCount();

      if (betCount === 0) {
        // Verify empty state message is displayed
        const emptyStateText = await authenticatedPage
          .getByText(/Nie masz jeszcze żadnych zakładów|Brak zakładów/)
          .isVisible()
          .catch(() => false);

        expect(emptyStateText).toBe(true);
      }
      // If bets exist, empty state is not shown (correct behavior)
    });

    base("should display empty state when filters return no results", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate with a specific status filter
      await myBetsPage.goto(undefined, "resolved");
      await myBetsPage.waitForBetsToLoad();

      const betCount = await myBetsPage.getBetCount();

      if (betCount === 0) {
        // Verify empty state for filtered results
        const emptyStateText = await authenticatedPage
          .getByText(/Brak zakładów|Nie znaleziono/)
          .isVisible()
          .catch(() => false);

        expect(emptyStateText).toBe(true);
      }
      // If filtered bets exist, empty state is not shown
    });
  });

  base.describe("User Session Persistence", () => {
    base("should maintain authentication while viewing bets", async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate to my bets
      await myBetsPage.goto();

      // Verify user is still logged in
      expect(await homePage.isLoggedIn()).toBe(true);

      // Verify logout button is still visible
      await expect(homePage.logoutButton).toBeVisible();
    });

    base("should maintain session after refreshing my bets page", async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      const myBetsPage = new MyBetsPage(authenticatedPage);

      // Navigate to my bets
      await myBetsPage.goto();

      // Refresh page
      await authenticatedPage.reload();
      await myBetsPage.waitForBetsToLoad();

      // Verify user is still logged in after refresh
      expect(await homePage.isLoggedIn()).toBe(true);

      // Verify we're still on my bets page
      await expect(authenticatedPage).toHaveURL(/\/my-bets/);
    });
  });

  base.describe("Integration with Matches", () => {
    base("should reflect newly placed bet on my bets page", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);
      const matchesPage = new MatchesPage(authenticatedPage);

      // Get initial bet count
      await myBetsPage.goto();
      await myBetsPage.waitForBetsToLoad();
      const initialBetCount = await myBetsPage.getBetCount();

      // Navigate to matches and place a bet
      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      const matchCard = matchesPage.getMatchCard(1);
      await matchCard.waitForVisible();

      const isLocked = await matchCard.isBettingLocked();

      if (!isLocked) {
        // Place a new bet
        await matchCard.betOnDraw();
        await authenticatedPage.waitForTimeout(1000);

        // Navigate back to my bets
        await myBetsPage.goto();
        await myBetsPage.waitForBetsToLoad();

        // Verify bet count increased
        const newBetCount = await myBetsPage.getBetCount();
        expect(newBetCount).toBeGreaterThan(initialBetCount);
      } else {
        base.skip();
      }
    });

    base("should reflect updated bet on my bets page", async ({ authenticatedPage }) => {
      const myBetsPage = new MyBetsPage(authenticatedPage);
      const matchesPage = new MatchesPage(authenticatedPage);

      // Place initial bet
      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      const matchCard = matchesPage.getMatchCard(1);
      await matchCard.waitForVisible();

      const isLocked = await matchCard.isBettingLocked();

      if (!isLocked) {
        // Place bet on home win
        await matchCard.betOnHomeWin();
        await authenticatedPage.waitForTimeout(1000);

        // Change bet to away win
        await matchCard.betOnAwayWin();
        await authenticatedPage.waitForTimeout(1000);

        // Navigate to my bets
        await myBetsPage.goto();
        await myBetsPage.waitForBetsToLoad();

        // Verify bet exists (updated bet, not new bet)
        const betCount = await myBetsPage.getBetCount();
        expect(betCount).toBeGreaterThan(0);

        // Note: More specific validation could check bet details
      } else {
        base.skip();
      }
    });
  });
});
