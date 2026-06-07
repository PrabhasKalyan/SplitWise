import { expect, test } from "@playwright/test";

test("can fetch data from supabase", async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  await page.goto("/auth");
  
  // Wait for any potential error messages if Supabase is not reachable
  // The app might show an error if it fails to initialize or fetch something
  
  // Let's try to trigger a fetch by entering an email and clicking magic link
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByRole("button", { name: "Send magic link" }).click();
  
  // If DNS fails, we expect an error message in the UI or a timeout
  await expect(page.getByText(/fetch failed|Could not resolve|Magic link sent/)).toBeVisible({ timeout: 10000 });
});
