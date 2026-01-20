import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for the Home page
 * Encapsulates common navigation and header elements
 */
export class HomePage {
  readonly page: Page;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logoutButton = page.getByTestId("logout-button");
  }

  /**
   * Navigate to the home page
   */
  async goto() {
    await this.page.goto("/");
  }

  /**
   * Logout the current user
   */
  async logout() {
    await this.logoutButton.click();
  }

  /**
   * Check if the user is logged in by verifying logout button visibility
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.logoutButton.isVisible();
  }
}
