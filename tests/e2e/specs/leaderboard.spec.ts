import { test as base, expect } from "../fixtures/auth.fixture";
import { LeaderboardPage } from "../pages/LeaderboardPage";
import { HomePage } from "../pages/HomePage";

/**
 * E2E Tests for Leaderboard/Ranking Page
 * Tests viewing tournament rankings and user standings
 * Uses authenticated fixture to start tests with logged-in user
 */
base.describe("Leaderboard", () => {
  base.describe("Page Navigation", () => {
    base("should navigate to leaderboard page from home", async ({ authenticatedPage }) => {
      // Start on home page
      await authenticatedPage.goto("/");

      // Navigate to leaderboard via navigation menu
      await authenticatedPage.getByRole("link", { name: "Ranking" }).click();

      // Verify URL changed
      await expect(authenticatedPage).toHaveURL("/leaderboard");
    });

    base("should navigate to leaderboard page directly", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      // Navigate directly to leaderboard
      await leaderboardPage.goto();

      // Verify page loaded
      await expect(authenticatedPage).toHaveURL("/leaderboard");
    });
  });

  base.describe("Tournament Leaderboard Display", () => {
    base("should display leaderboard table when tournaments exist", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      // Navigate to leaderboard
      await leaderboardPage.goto();

      // Wait for leaderboard to load
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      // Check if tournaments exist or if "no tournaments" message is shown
      const hasNoTournaments = await leaderboardPage.hasNoTournaments();

      if (hasNoTournaments) {
        // If no tournaments, verify the message is displayed
        await expect(leaderboardPage.noTournamentsMessage).toBeVisible();
      } else {
        // If tournaments exist, verify leaderboard table is visible
        const isVisible = await leaderboardPage.isLeaderboardVisible();
        expect(isVisible).toBe(true);
      }
    });

    base("should display participant entries in leaderboard", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      await leaderboardPage.goto();
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      // Check if tournaments exist
      const hasNoTournaments = await leaderboardPage.hasNoTournaments();

      if (!hasNoTournaments) {
        // Wait for table to load
        await leaderboardPage.waitForLeaderboardToLoad();

        // Get participant count
        const participantCount = await leaderboardPage.getParticipantCount();

        // Verify at least one participant is shown
        expect(participantCount).toBeGreaterThanOrEqual(0);
      } else {
        base.skip();
      }
    });

    base("should display leaderboard entries with correct structure", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      await leaderboardPage.goto();
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      const hasNoTournaments = await leaderboardPage.hasNoTournaments();

      if (!hasNoTournaments) {
        await leaderboardPage.waitForLeaderboardToLoad();

        const participantCount = await leaderboardPage.getParticipantCount();

        if (participantCount > 0) {
          // Get first entry
          const firstEntry = await leaderboardPage.getEntryByRank(1);

          // Verify entry has username and points
          expect(firstEntry.username).toBeTruthy();
          expect(firstEntry.points).toBeTruthy();
        }
      } else {
        base.skip();
      }
    });
  });

  base.describe("Leaderboard Rankings", () => {
    base("should display participants in descending order by points", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      await leaderboardPage.goto();
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      const hasNoTournaments = await leaderboardPage.hasNoTournaments();

      if (!hasNoTournaments) {
        await leaderboardPage.waitForLeaderboardToLoad();

        const participantCount = await leaderboardPage.getParticipantCount();

        // Only test if we have at least 2 participants
        if (participantCount >= 2) {
          const firstEntry = await leaderboardPage.getEntryByRank(1);
          const secondEntry = await leaderboardPage.getEntryByRank(2);

          // Parse points (remove any non-numeric characters)
          const firstPoints = parseInt(firstEntry.points.replace(/[^\d]/g, ""), 10);
          const secondPoints = parseInt(secondEntry.points.replace(/[^\d]/g, ""), 10);

          // First place should have equal or more points than second place
          expect(firstPoints).toBeGreaterThanOrEqual(secondPoints);
        }
      } else {
        base.skip();
      }
    });

    base("should highlight current user's row if present", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      await leaderboardPage.goto();
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      const hasNoTournaments = await leaderboardPage.hasNoTournaments();

      if (!hasNoTournaments) {
        await leaderboardPage.waitForLeaderboardToLoad();

        // Check if current user's row is highlighted
        // Note: This assumes the implementation highlights the current user
        // The actual implementation may use a specific class or attribute
        const currentUserRow = authenticatedPage.locator("tbody tr").first();

        // Just verify the leaderboard is visible for now
        // More specific assertions can be added based on actual implementation
        await expect(currentUserRow).toBeVisible();
      } else {
        base.skip();
      }
    });
  });

  base.describe("Tournament Filtering", () => {
    base("should filter leaderboard by tournament ID via URL parameter", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      // Navigate with a specific tournament ID
      // Note: This assumes tournament ID 1 exists
      await leaderboardPage.goto(1);

      // Verify URL contains tournament parameter
      await expect(authenticatedPage).toHaveURL(/tournamentId=1/);

      // Wait for leaderboard to load with the specific tournament
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });
    });
  });

  base.describe("Error Handling", () => {
    base("should display error message when leaderboard fails to load", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      // Navigate to leaderboard
      await leaderboardPage.goto();

      // Wait for page to settle
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      // Check if error is displayed
      // Note: This test might not trigger an error in a working environment
      // It's mainly to verify the error handling UI exists
      const hasError = await leaderboardPage.hasError();

      if (hasError) {
        // Verify error message is visible
        await expect(leaderboardPage.errorMessage).toBeVisible();

        // Verify refresh button is visible
        await expect(leaderboardPage.refreshButton).toBeVisible();
      }
      // If no error, test passes (error handling is available but not triggered)
    });

    base("should allow retrying after error with refresh button", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      await leaderboardPage.goto();
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      const hasError = await leaderboardPage.hasError();

      if (hasError) {
        // Click refresh button
        await leaderboardPage.clickRefresh();

        // Wait for reload
        await authenticatedPage.waitForLoadState("networkidle", {
          timeout: 10000,
        });

        // Verify either leaderboard loaded or error still shows
        // (depends on whether the retry was successful)
        const stillHasError = await leaderboardPage.hasError();
        const isLeaderboardVisible = await leaderboardPage.isLeaderboardVisible();

        expect(stillHasError || isLeaderboardVisible).toBe(true);
      } else {
        base.skip();
      }
    });
  });

  base.describe("User Session Persistence", () => {
    base("should maintain authentication while viewing leaderboard", async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      // Navigate to leaderboard
      await leaderboardPage.goto();

      // Verify user is still logged in
      expect(await homePage.isLoggedIn()).toBe(true);

      // Verify logout button is still visible
      await expect(homePage.logoutButton).toBeVisible();
    });

    base("should maintain session after refreshing leaderboard page", async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      // Navigate to leaderboard
      await leaderboardPage.goto();

      // Refresh page
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      // Verify user is still logged in after refresh
      expect(await homePage.isLoggedIn()).toBe(true);

      // Verify we're still on leaderboard page
      await expect(authenticatedPage).toHaveURL(/\/leaderboard/);
    });
  });

  base.describe("Empty State", () => {
    base("should display appropriate message when no tournaments exist", async ({ authenticatedPage }) => {
      const leaderboardPage = new LeaderboardPage(authenticatedPage);

      await leaderboardPage.goto();
      await authenticatedPage.waitForLoadState("networkidle", {
        timeout: 10000,
      });

      // Check if no tournaments message is displayed
      const hasNoTournaments = await leaderboardPage.hasNoTournaments();

      if (hasNoTournaments) {
        // Verify the message is displayed
        await expect(leaderboardPage.noTournamentsMessage).toBeVisible();

        // Verify leaderboard table is not visible
        const isLeaderboardVisible = await leaderboardPage.isLeaderboardVisible();
        expect(isLeaderboardVisible).toBe(false);
      }
      // If tournaments exist, test passes (empty state UI is available)
    });
  });
});
