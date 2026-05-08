import { test, expect } from "@playwright/test";

test("login submits and navigates to dashboard", async ({ page }) => {
  await page.route("**/auth/v1/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "refresh",
        user: { id: "user-1", email: "user@example.com" },
      }),
    });
  });

  await page.goto("/login");

  await page.getByPlaceholder("name@company.com").fill("user@example.com");
  await page.getByPlaceholder("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022").fill("password123");
  await page.getByRole("button", { name: /sign in securely/i }).click();

  await page.context().addCookies([
    {
      name: "sb-access-token",
      value: "token",
      domain: "localhost",
      path: "/",
    },
    {
      name: "sb-refresh-token",
      value: "refresh",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});
