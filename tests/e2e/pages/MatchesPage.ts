import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for the Matches page
 * Encapsulates interactions with the matches list and betting functionality
 */
export class MatchesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the matches page (home page)
   */
  async goto() {
    await this.page.goto("/");
  }

  /**
   * Get all match cards on the page
   */
  getAllMatchCards(): Locator {
    return this.page.locator('[data-testid^="match-card-"]');
  }

  /**
   * Wait for matches to load
   */
  async waitForMatchesToLoad() {
    // Wait for at least one match card to appear
    await this.page.waitForSelector('[data-testid^="match-card-"]', {
      timeout: 10000,
    });
  }

  /**
   * Get the count of visible match cards
   */
  async getMatchCount(): Promise<number> {
    return await this.getAllMatchCards().count();
  }
}
