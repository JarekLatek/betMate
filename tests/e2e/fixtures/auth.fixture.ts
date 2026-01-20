import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Custom fixture that provides an authenticated page context
 * Uses E2E test user credentials from environment variables
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Get credentials from environment variables
    const email = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "E2E_USERNAME and E2E_PASSWORD must be set in .env.test"
      );
    }

    // Navigate to login page
    await page.goto("/login");

    // Fill in login form using data-testid selectors
    await page.getByTestId("email-input").fill(email);
    await page.getByTestId("password-input").fill(password);

    // Submit the form
    await page.getByTestId("submit-button").click();

    // Wait for navigation to home page (successful login)
    await page.waitForURL("/", { timeout: 10000 });

    // Verify we're logged in by checking for logout button
    await expect(page.getByTestId("logout-button")).toBeVisible();

    // Provide the authenticated page to the test
    await use(page);

    // Cleanup: logout after test
    // This is optional but helps keep tests isolated
    await page.getByTestId("logout-button").click();
    await page.waitForURL("/login", { timeout: 5000 });
  },
});

export { expect };
