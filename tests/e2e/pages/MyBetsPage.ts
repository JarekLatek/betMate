import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for the My Bets page
 * Encapsulates interactions with user's betting history
 */
export class MyBetsPage {
  readonly page: Page;
  readonly errorMessage: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.errorMessage = page.getByTestId("my-bets-error");
    this.refreshButton = page.getByTestId("my-bets-refresh-button");
  }

  /**
   * Navigate to the my bets page
   */
  async goto(tournamentId?: number, status?: string) {
    let url = "/my-bets";
    const params: string[] = [];

    if (tournamentId) {
      params.push(`tournamentId=${tournamentId}`);
    }
    if (status && status !== "all") {
      params.push(`status=${status}`);
    }

    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    await this.page.goto(url);
  }

  /**
   * Check if an error message is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Click the refresh button (shown on error)
   */
  async clickRefresh() {
    await this.refreshButton.click();
  }

  /**
   * Get all bet list items on the page
   */
  getBetItems(): Locator {
    // Assuming bet items have a common container or identifier
    // This may need adjustment based on actual implementation
    return this.page.locator('[data-testid^="bet-item-"]');
  }

  /**
   * Get the count of displayed bets
   */
  async getBetCount(): Promise<number> {
    return await this.getBetItems().count();
  }

  /**
   * Delete a bet by its ID
   * Note: The delete button should have a data-testid
   */
  async deleteBet(betId: number) {
    const deleteButton = this.page.getByTestId(`delete-bet-${betId}`);
    await deleteButton.click();
  }

  /**
   * Wait for bets to load
   */
  async waitForBetsToLoad() {
    // Wait for the page to settle after navigation
    await this.page.waitForLoadState("networkidle", { timeout: 10000 });
  }
}
