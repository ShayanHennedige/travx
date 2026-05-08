import { test, expect } from "@playwright/test";

test.describe("Hotel Rates Submission Form", () => {
  test.beforeEach(async ({ page }) => {
    // We will mock specific API responses in each test if needed
  });

  test("should load the form correctly", async ({ page }) => {
    await page.route("**/api/hotel-rates/prefill*", async (route) => {
      await route.fulfill({ status: 404, body: JSON.stringify({ error: "No token" }) });
    });
    await page.goto("/hotel-rates");
    await expect(page.getByText("Submit Your Hotel Rates")).toBeVisible();
    await expect(page.getByPlaceholder("Enter hotel name")).toBeVisible();
  });

  test("should prefill form when a valid token is provided", async ({ page }) => {
    const mockRequest = {
      request: {
        request_number: "REQ-123",
        check_in_date: "2024-10-01",
        check_out_date: "2024-10-10",
        notes: "Please provide best rates for deluxe rooms.",
      }
    };

    await page.route("**/api/hotel-rates/prefill?token=valid-token", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequest),
      });
    });

    await page.goto("/hotel-rates?token=valid-token");

    // Check prefilled data
    await expect(page.getByText("REQ-123")).toBeVisible();
    await expect(page.getByText("Please provide best rates for deluxe rooms.")).toBeVisible();
    
    // Verify date inputs are prefilled in the first rate plan
    const fromInput = page.locator('input[type="date"]').first();
    const toInput = page.locator('input[type="date"]').nth(1);
    await expect(fromInput).toHaveValue("2024-10-01");
    await expect(toInput).toHaveValue("2024-10-10");
  });

  test("should show validation errors when required fields are missing", async ({ page }) => {
    await page.goto("/hotel-rates");
    
    // Try to submit empty form
    await page.getByRole("button", { name: /Submit All Rates/i }).click();
    
    // Should show error for hotel name (based on handleSubmit logic)
    await expect(page.getByText("Please enter the hotel name")).toBeVisible();

    // Fill hotel name but miss email
    await page.getByPlaceholder("Enter hotel name").fill("Test Hotel");
    await page.getByRole("button", { name: /Submit All Rates/i }).click();
    await expect(page.getByText("Please enter the hotel email")).toBeVisible();
  });

  test("should allow adding and removing room categories", async ({ page }) => {
    await page.goto("/hotel-rates");
    
    // Initially one category
    await expect(page.getByText("Room Category 1")).toBeVisible();
    
    // Add another
    await page.getByRole("button", { name: /Add Another Room Category/i }).click();
    await expect(page.getByText("Room Category 2")).toBeVisible();
    
    // Remove the first one
    await page.getByRole("button", { name: /Remove Category/i }).first().click();
    await expect(page.getByText("Room Category 2")).not.toBeVisible();
    // It should now just show "Room Category 1" again (renumbered)
    await expect(page.getByText("Room Category 1")).toBeVisible();
  });

  test("should successfully submit rates", async ({ page }) => {
    // Mock successful submission
    await page.route("**/api/hotel-rates", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "Rates submitted successfully" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/hotel-rates");

    // Fill Hotel Info
    await page.getByPlaceholder("Enter hotel name").fill("Grand Hotel");
    await page.getByPlaceholder("enter hotel email").fill("info@grandhotel.com");
    await page.getByPlaceholder("Enter hotel address").fill("123 Street, City");

    // Fill Room Category
    await page.getByPlaceholder("e.g., Deluxe Room, Suite").fill("Deluxe Ocean View");
    
    // Set dates
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);
    
    const fromDate = today.toISOString().split("T")[0];
    const toDate = nextMonth.toISOString().split("T")[0];

    await page.locator('input[type="date"]').first().fill(fromDate);
    await page.locator('input[type="date"]').nth(1).fill(toDate);

    // Set rates
    await page.getByPlaceholder("0.00").first().fill("150"); // SGL
    await page.getByPlaceholder("0.00").nth(1).fill("200"); // DBL

    // Submit
    await page.getByRole("button", { name: /Submit All Rates/i }).click();

    // Verify success screen
    await expect(page.getByText("Thank You!")).toBeVisible();
    await expect(page.getByText("Your rates have been submitted successfully")).toBeVisible();
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Mock API error
    await page.route("**/api/hotel-rates", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Database connection failed" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/hotel-rates");

    // Fill minimum required fields
    await page.getByPlaceholder("Enter hotel name").fill("Error Hotel");
    await page.getByPlaceholder("enter hotel email").fill("error@hotel.com");
    await page.getByPlaceholder("e.g., Deluxe Room, Suite").fill("Test Room");
    
    const fromDate = "2024-06-01";
    const toDate = "2024-06-30";
    await page.locator('input[type="date"]').first().fill(fromDate);
    await page.locator('input[type="date"]').nth(1).fill(toDate);
    await page.getByPlaceholder("0.00").first().fill("100");

    // Submit
    await page.getByRole("button", { name: /Submit All Rates/i }).click();

    // Verify error message
    await expect(page.getByText("Database connection failed")).toBeVisible();
  });
});
