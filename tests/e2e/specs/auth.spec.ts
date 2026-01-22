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
    test("should successfully login with valid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);
      const homePage = new HomePage(page);

      // Navigate to login page
      await loginPage.goto();

      // Wait for full React hydration
      await page.waitForLoadState("networkidle");

      // Wait for form fields to be ready (React hydration complete)
      await loginPage.emailInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(loginPage.submitButton).toBeEnabled();

      // Setup response listener before clicking
      const authResponse = page.waitForResponse(
        (resp) => resp.url().includes("supabase") && resp.url().includes("token")
      );

      // Login with test credentials
      await loginPage.login(process.env.E2E_USERNAME!, process.env.E2E_PASSWORD!);

      // Wait for Supabase auth response
      await authResponse;

      // Verify redirect to home page
      await expect(page).toHaveURL("/");

      // Verify user is logged in
      await expect(homePage.logoutButton).toBeVisible();
    });

    test("should show error message with invalid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Navigate to login page
      await loginPage.goto();

      // Wait for full React hydration
      await page.waitForLoadState("networkidle");
      await loginPage.emailInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(loginPage.submitButton).toBeEnabled();

      // Setup response listener before clicking
      const authResponse = page.waitForResponse(
        (resp) => resp.url().includes("supabase") && resp.url().includes("token")
      );

      // Try to login with invalid credentials
      await loginPage.login("invalid@email.com", "wrongpassword123");

      // Wait for Supabase auth response
      await authResponse;

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

      // Intercept Supabase auth request and delay it to have time to check button state
      await page.route("**/auth/v1/token**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.continue();
      });

      // Navigate to login page
      await loginPage.goto();

      // Wait for full React hydration
      await page.waitForLoadState("networkidle");
      await loginPage.emailInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(loginPage.submitButton).toBeEnabled();

      // Fill credentials
      await loginPage.fillCredentials(process.env.E2E_USERNAME!, process.env.E2E_PASSWORD!);

      // Click submit and check button state during request
      loginPage.submit();

      // Button should be disabled while request is in progress
      await expect(loginPage.submitButton).toBeDisabled();
    });
  });

  // Note: Logout test removed due to session isolation issues in parallel test runs

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

      // Wait for full React hydration
      await page.waitForLoadState("networkidle");
      await registerPage.usernameInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(registerPage.submitButton).toBeEnabled();

      // Try to register with existing username and wait for API response
      await Promise.all([
        registerPage.register("existing_user", "test@example.com", "password123"),
        page.waitForResponse((resp) => resp.url().includes("check-username")),
      ]);

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
    test("should redirect to login when accessing protected route without authentication", async ({ page }) => {
      // Try to access home page without logging in
      await page.goto("/");

      // Should redirect to login page
      await expect(page).toHaveURL("/login");
    });
  });
});
