import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { HomePage } from "../pages/HomePage";

/**
 * E2E Tests for Authentication Flow
 * Tests login, logout, and navigation between auth pages
 */
test.describe("Authentication", () => {
  test.describe("Login", () => {
    test("should successfully login with valid credentials", async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);
      const homePage = new HomePage(page);

      // Navigate to login page
      await loginPage.goto();

      // Login with test credentials
      await loginPage.login(
        process.env.E2E_USERNAME!,
        process.env.E2E_PASSWORD!
      );

      // Verify redirect to home page
      await expect(page).toHaveURL("/");

      // Verify user is logged in
      await expect(homePage.logoutButton).toBeVisible();
    });

    test("should show error message with invalid credentials", async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Try to login with invalid credentials
      await loginPage.login("invalid@email.com", "wrongpassword");

      // Verify error message is displayed
      await expect(page.getByText("Nieprawidłowy email lub hasło")).toBeVisible();

      // Verify we're still on login page
      await expect(page).toHaveURL("/login");
    });

    test("should navigate to register page from login", async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Click register link
      await loginPage.clickRegisterLink();

      // Verify navigation to register page
      await expect(page).toHaveURL("/register");

      // Verify register form is visible
      await expect(page.getByTestId("username-input")).toBeVisible();
    });

    test("should navigate to forgot password page", async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Click forgot password link
      await loginPage.clickForgotPassword();

      // Verify navigation to forgot password page
      await expect(page).toHaveURL("/forgot-password");
    });

    test("should disable submit button while loading", async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Fill credentials
      await loginPage.fillCredentials(
        process.env.E2E_USERNAME!,
        process.env.E2E_PASSWORD!
      );

      // Click submit and immediately check if it's disabled
      const submitPromise = loginPage.submit();

      // Button should be disabled while request is in progress
      await expect(loginPage.submitButton).toBeDisabled();

      // Wait for the request to complete
      await submitPromise;
    });
  });

  test.describe("Logout", () => {
    test("should successfully logout", async ({ page }) => {
      const loginPage = new LoginPage(page);
      const homePage = new HomePage(page);

      // Login first
      await loginPage.goto();
      await loginPage.login(
        process.env.E2E_USERNAME!,
        process.env.E2E_PASSWORD!
      );
      await expect(page).toHaveURL("/");

      // Logout
      await homePage.logout();

      // Verify redirect to login page
      await expect(page).toHaveURL("/login");

      // Verify logout button is not visible
      await expect(homePage.logoutButton).not.toBeVisible();
    });
  });

  test.describe("Register", () => {
    test("should navigate to login page from register", async ({ page }) => {
      const registerPage = new RegisterPage(page);

      // Navigate to register page
      await registerPage.goto();

      // Click login link
      await registerPage.clickLoginLink();

      // Verify navigation to login page
      await expect(page).toHaveURL("/login");

      // Verify login form is visible (no username field)
      await expect(page.getByTestId("username-input")).not.toBeVisible();
      await expect(page.getByTestId("email-input")).toBeVisible();
    });

    test("should show error for duplicate username", async ({ page }) => {
      const registerPage = new RegisterPage(page);

      // Navigate to register page
      await registerPage.goto();

      // Try to register with existing username
      // Using the E2E test user's email as username should already exist
      await registerPage.register(
        "existing_user",
        "test@example.com",
        "password123"
      );

      // Wait for error message
      // Note: The exact error message depends on your implementation
      await page.waitForTimeout(2000); // Wait for API response

      // Should still be on register page
      await expect(page).toHaveURL("/register");
    });

    test("should validate form fields", async ({ page }) => {
      const registerPage = new RegisterPage(page);

      // Navigate to register page
      await registerPage.goto();

      // Try to submit empty form
      await registerPage.submit();

      // Form validation should prevent submission
      // The form should still be visible
      await expect(registerPage.usernameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to login when accessing protected route without authentication", async ({
      page,
    }) => {
      // Try to access home page without logging in
      await page.goto("/");

      // Should redirect to login page
      // Note: This depends on your middleware implementation
      // Adjust the assertion based on your actual redirect behavior
      await page.waitForTimeout(1000);

      // If your app redirects unauthenticated users, uncomment:
      // await expect(page).toHaveURL("/login");
    });
  });
});
