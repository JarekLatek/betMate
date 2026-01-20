import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for the Login page
 * Encapsulates all interactions with the login form
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.submitButton = page.getByTestId("submit-button");
    this.forgotPasswordLink = page.getByTestId("forgot-password-link");
    this.registerLink = page.getByTestId("auth-toggle-link");
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Fill in the login form with provided credentials
   */
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow: fill credentials and submit
   */
  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  /**
   * Click the "Forgot password" link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click the "Register" link to go to registration page
   */
  async clickRegisterLink() {
    await this.registerLink.click();
  }

  /**
   * Check if the submit button is in loading state
   */
  async isLoading(): Promise<boolean> {
    const text = await this.submitButton.textContent();
    return text === "Ładowanie...";
  }
}
