import { expect, test } from "@playwright/test";

test("landing page renders core value proposition", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Shared expenses without the fog." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("auth page offers Google and magic link paths", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send magic link" })).toBeVisible();
});
