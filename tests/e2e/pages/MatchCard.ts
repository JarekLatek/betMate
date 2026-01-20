import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for a single Match Card
 * Encapsulates interactions with match cards and betting controls
 */
export class MatchCard {
  readonly page: Page;
  readonly matchId: number;
  readonly card: Locator;
  readonly homeTeam: Locator;
  readonly awayTeam: Locator;
  readonly betButtonHomeWin: Locator;
  readonly betButtonDraw: Locator;
  readonly betButtonAwayWin: Locator;
  readonly bettingLocked: Locator;

  constructor(page: Page, matchId: number) {
    this.page = page;
    this.matchId = matchId;
    this.card = page.getByTestId(`match-card-${matchId}`);
    this.homeTeam = this.card.getByTestId("home-team");
    this.awayTeam = this.card.getByTestId("away-team");
    this.betButtonHomeWin = this.card.getByTestId("bet-button-home_win");
    this.betButtonDraw = this.card.getByTestId("bet-button-draw");
    this.betButtonAwayWin = this.card.getByTestId("bet-button-away_win");
    this.bettingLocked = this.card.getByTestId("betting-locked");
  }

  /**
   * Get the home team name
   */
  async getHomeTeam(): Promise<string> {
    return (await this.homeTeam.textContent()) || "";
  }

  /**
   * Get the away team name
   */
  async getAwayTeam(): Promise<string> {
    return (await this.awayTeam.textContent()) || "";
  }

  /**
   * Place a bet on home win (1)
   */
  async betOnHomeWin() {
    await this.betButtonHomeWin.click();
  }

  /**
   * Place a bet on draw (X)
   */
  async betOnDraw() {
    await this.betButtonDraw.click();
  }

  /**
   * Place a bet on away win (2)
   */
  async betOnAwayWin() {
    await this.betButtonAwayWin.click();
  }

  /**
   * Check if betting is locked for this match
   */
  async isBettingLocked(): Promise<boolean> {
    return await this.bettingLocked.isVisible();
  }

  /**
   * Check if a specific bet button is selected/active
   */
  async isBetSelected(
    betType: "home_win" | "draw" | "away_win"
  ): Promise<boolean> {
    const button =
      betType === "home_win"
        ? this.betButtonHomeWin
        : betType === "draw"
          ? this.betButtonDraw
          : this.betButtonAwayWin;

    // Check if button has the "default" variant (which indicates it's selected)
    const ariaPressed = await button.getAttribute("aria-pressed");
    return ariaPressed === "true";
  }

  /**
   * Wait for the match card to be visible
   */
  async waitForVisible() {
    await this.card.waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Check if the match card is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.card.isVisible();
  }
}
