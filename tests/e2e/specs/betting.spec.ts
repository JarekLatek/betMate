import { test as base, expect } from "../fixtures/auth.fixture";
import { MatchesPage } from "../pages/MatchesPage";
import { HomePage } from "../pages/HomePage";

/**
 * E2E Tests for Betting Flow
 * Tests placing, modifying, and deleting bets
 * Uses authenticated fixture to start tests with logged-in user
 */
base.describe("Betting", () => {
  base.describe("View Matches", () => {
    base("should display list of matches", async ({ authenticatedPage }) => {
      const matchesPage = new MatchesPage(authenticatedPage);

      // Navigate to matches page
      await matchesPage.goto();

      // Wait for matches to load
      await matchesPage.waitForMatchesToLoad();

      // Verify at least one match is displayed
      const matchCount = await matchesPage.getMatchCount();
      expect(matchCount).toBeGreaterThan(0);
    });

    base("should display match details", async ({ authenticatedPage }) => {
      const matchesPage = new MatchesPage(authenticatedPage);

      // Navigate to matches page
      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      // Get first match card
      const firstMatchCard = matchesPage.getMatchCard(1); // Assuming match ID 1 exists

      // Wait for the match card to be visible
      await firstMatchCard.waitForVisible();

      // Verify team names are displayed
      const homeTeam = await firstMatchCard.getHomeTeam();
      const awayTeam = await firstMatchCard.getAwayTeam();

      expect(homeTeam).toBeTruthy();
      expect(awayTeam).toBeTruthy();
      expect(homeTeam).not.toBe(awayTeam);
    });
  });

  base.describe("Place Bet", () => {
    base("should place a bet on home win", async ({ authenticatedPage }) => {
      const matchesPage = new MatchesPage(authenticatedPage);

      // Navigate to matches page
      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      // Find a match that is not locked
      // Note: This assumes match ID 1 is available and not locked
      // In a real test, you might need to find an available match dynamically
      const matchCard = matchesPage.getMatchCard(1);
      await matchCard.waitForVisible();

      // Check if betting is available (not locked)
      const isLocked = await matchCard.isBettingLocked();

      if (!isLocked) {
        // Place bet on home win
        await matchCard.betOnHomeWin();

        // Wait for the bet to be processed
        await authenticatedPage.waitForTimeout(1000);

        // Verify the bet is selected
        const isSelected = await matchCard.isBetSelected("home_win");
        expect(isSelected).toBe(true);
      } else {
        // Skip test if betting is locked
        base.skip();
      }
    });

    base("should place a bet on draw", async ({ authenticatedPage }) => {
      const matchesPage = new MatchesPage(authenticatedPage);

      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      const matchCard = matchesPage.getMatchCard(1);
      await matchCard.waitForVisible();

      const isLocked = await matchCard.isBettingLocked();

      if (!isLocked) {
        await matchCard.betOnDraw();
        await authenticatedPage.waitForTimeout(1000);

        const isSelected = await matchCard.isBetSelected("draw");
        expect(isSelected).toBe(true);
      } else {
        base.skip();
      }
    });

    base("should place a bet on away win", async ({ authenticatedPage }) => {
      const matchesPage = new MatchesPage(authenticatedPage);

      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      const matchCard = matchesPage.getMatchCard(1);
      await matchCard.waitForVisible();

      const isLocked = await matchCard.isBettingLocked();

      if (!isLocked) {
        await matchCard.betOnAwayWin();
        await authenticatedPage.waitForTimeout(1000);

        const isSelected = await matchCard.isBetSelected("away_win");
        expect(isSelected).toBe(true);
      } else {
        base.skip();
      }
    });
  });

  base.describe("Modify Bet", () => {
    base("should change bet from home win to away win", async ({
      authenticatedPage,
    }) => {
      const matchesPage = new MatchesPage(authenticatedPage);

      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      const matchCard = matchesPage.getMatchCard(1);
      await matchCard.waitForVisible();

      const isLocked = await matchCard.isBettingLocked();

      if (!isLocked) {
        // Place initial bet on home win
        await matchCard.betOnHomeWin();
        await authenticatedPage.waitForTimeout(1000);

        // Verify initial bet
        let isHomeWinSelected = await matchCard.isBetSelected("home_win");
        expect(isHomeWinSelected).toBe(true);

        // Change bet to away win
        await matchCard.betOnAwayWin();
        await authenticatedPage.waitForTimeout(1000);

        // Verify bet changed
        isHomeWinSelected = await matchCard.isBetSelected("home_win");
        const isAwayWinSelected = await matchCard.isBetSelected("away_win");

        expect(isHomeWinSelected).toBe(false);
        expect(isAwayWinSelected).toBe(true);
      } else {
        base.skip();
      }
    });
  });

  base.describe("Locked Matches", () => {
    base("should not allow betting on locked matches", async ({
      authenticatedPage,
    }) => {
      const matchesPage = new MatchesPage(authenticatedPage);

      await matchesPage.goto();
      await matchesPage.waitForMatchesToLoad();

      // Try to find a locked match
      // This test would need a match that is locked (< 5 min to start or not SCHEDULED)
      // For now, we'll just verify the UI shows the locked state properly

      const matchCard = matchesPage.getMatchCard(1);
      await matchCard.waitForVisible();

      const isLocked = await matchCard.isBettingLocked();

      if (isLocked) {
        // Verify locked message is displayed
        await expect(matchCard.bettingLocked).toBeVisible();

        // Verify betting buttons are not visible
        await expect(matchCard.betButtonHomeWin).not.toBeVisible();
        await expect(matchCard.betButtonDraw).not.toBeVisible();
        await expect(matchCard.betButtonAwayWin).not.toBeVisible();
      } else {
        // Verify betting buttons are visible
        await expect(matchCard.betButtonHomeWin).toBeVisible();
        await expect(matchCard.betButtonDraw).toBeVisible();
        await expect(matchCard.betButtonAwayWin).toBeVisible();
      }
    });
  });

  base.describe("User Session", () => {
    base("should maintain authentication across pages", async ({
      authenticatedPage,
    }) => {
      const homePage = new HomePage(authenticatedPage);
      const matchesPage = new MatchesPage(authenticatedPage);

      // Start on home page
      await matchesPage.goto();

      // Verify user is logged in
      expect(await homePage.isLoggedIn()).toBe(true);

      // Navigate to a different page and back
      await authenticatedPage.goto("/ranking");
      await authenticatedPage.waitForLoadState();

      // Navigate back to matches
      await matchesPage.goto();

      // Verify user is still logged in
      expect(await homePage.isLoggedIn()).toBe(true);
    });
  });
});
