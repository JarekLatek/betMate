import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Model for the Register page
 * Encapsulates all interactions with the registration form
 */
export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByTestId("username-input");
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.submitButton = page.getByTestId("submit-button");
    this.loginLink = page.getByTestId("auth-toggle-link");
  }

  /**
   * Navigate to the registration page
   */
  async goto() {
    await this.page.goto("/register");
  }

  /**
   * Fill in the registration form with provided data
   */
  async fillRegistrationForm(username: string, email: string, password: string) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the registration form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete registration flow: fill form and submit
   */
  async register(username: string, email: string, password: string) {
    await this.fillRegistrationForm(username, email, password);
    await this.submit();
  }

  /**
   * Click the "Login" link to go to login page
   */
  async clickLoginLink() {
    await this.loginLink.click();
  }

  /**
   * Check if the submit button is in loading state
   */
  async isLoading(): Promise<boolean> {
    const text = await this.submitButton.textContent();
    return text === "Ładowanie...";
  }
}
