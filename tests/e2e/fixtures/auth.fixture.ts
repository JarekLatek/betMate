import { expect, test as base } from "@playwright/test";
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
      throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
    }

    // Navigate to login page
    await page.goto("/login");

    // Wait for React hydration - form must be interactive
    await page.waitForLoadState("networkidle");

    // Wait for email input to be enabled (React hydration complete)
    const emailInput = page.getByTestId("email-input");
    await emailInput.waitFor({ state: "visible", timeout: 10000 });

    // Fill in login form using data-testid selectors
    await emailInput.fill(email);
    await page.getByTestId("password-input").fill(password);

    // Submit the form
    await page.getByTestId("submit-button").click();

    // Wait for navigation to home page (successful login)
    // Login uses window.location.href which causes full page reload
    await page.waitForURL("/", { timeout: 15000 });

    // Wait for full hydration after redirect
    await page.waitForLoadState("networkidle");

    // Verify we're logged in by checking for logout button
    await expect(page.getByTestId("logout-button")).toBeVisible({ timeout: 10000 });

    // Additional verification - ensure button is attached and clickable
    await page.getByTestId("logout-button").waitFor({ state: "attached" });

    // Provide the authenticated page to the test
    await use(page);

    // Cleanup: logout after test (with safety check)
    // This is optional but helps keep tests isolated
    const logoutButton = page.getByTestId("logout-button");
    const isLogoutVisible = await logoutButton.isVisible().catch(() => false);

    if (isLogoutVisible) {
      await logoutButton.click();
      await page.waitForURL("/login", { timeout: 5000 }).catch(() => {
        // Ignore timeout - user might already be logged out
      });
    }
  },
});

export { expect };
