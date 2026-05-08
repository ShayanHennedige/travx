import { test, expect } from "@playwright/test";

test("group inquiry submits successfully", async ({ page }) => {
  await page.route("**/api/group-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/inquiry");
  await page.getByRole("button", { name: /group/i }).click();

  const today = new Date();
  const arriving = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
  const departing = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const arrivingDate = arriving.toISOString().split("T")[0];
  const departingDate = departing.toISOString().split("T")[0];

  await page.getByLabel("Arriving Date").fill(arrivingDate);
  await page.getByLabel("Departure Date").fill(departingDate);

  await page.getByText("3 Star").click();
  await page.getByText("Standard").click();
  await page.getByText("BB").click();
  await page.getByText("Wildlife and Nature").click();

  await page.getByText("Double (DBL)").scrollIntoViewIfNeeded();
  const doubleRoomCard = page.getByText("Double (DBL)").locator("..").locator("..");
  await doubleRoomCard.locator("button").nth(1).click();

  await page.getByLabel("Number of Adults").fill("1");
  await page.getByLabel("Full Name").first().fill("Group Leader");

  await page.getByRole("button", { name: /submit group inquiry/i }).click();

  await expect(page.getByRole("heading", { name: /thank you/i })).toBeVisible();
});
