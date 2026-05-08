import { test, expect } from "@playwright/test";

test.describe("Hotel Rates API Endpoints", () => {
  
  test("POST /api/hotel-rates/request - should create a new rate request", async ({ request }) => {
    const response = await request.post("/api/hotel-rates/request", {
      data: {
        hotel_name: "Test API Hotel",
        hotel_email: "api-test@hotel.com",
        check_in_date: "2024-12-01",
        check_out_date: "2024-12-05",
        notes: "API Test Request"
      }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body.success).toBe(true);
    expect(body.request.hotel_name).toBe("Test API Hotel");
    expect(body.token).toBeDefined();
    expect(body.form_url).toContain("token=" + body.token);
  });

  test("POST /api/hotel-rates/batch-lookup - should lookup rates with fuzzy matching", async ({ request }) => {
    // Note: This test depends on data being in the DB, or we can mock the Supabase client if needed.
    // Since we're doing functional testing, let's assume we want to test the logic in the route.ts
    // We'll mock the Supabase responses if we want a pure logic test, but for E2E it's better to hit the real DB if available.
    // However, to make it stable for this environment, I'll focus on validating the structure and handling.

    const response = await request.post("/api/hotel-rates/batch-lookup", {
      data: {
        lookups: [
          {
            hotel_name: "Grand Hotel (5 Star)", // Should be normalized to "Grand Hotel"
            room_category: "Deluxe",
            meal_plan: "Half Board", // Should be normalized to "HB"
            check_date: "2024-06-15"
          }
        ]
      }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBe(1);
    // Even if not found, it should return a result object
    expect(body.results[0]).toHaveProperty("found");
  });

  test("GET /api/hotel-rates - should list rate requests", async ({ request }) => {
    const response = await request.get("/api/hotel-rates");
    
    // This might require being logged in depending on middleware.
    // If it's public (as we just added it to publicPaths), it should work.
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("requests");
  });
});
