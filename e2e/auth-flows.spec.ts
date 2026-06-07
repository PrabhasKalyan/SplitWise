import { expect, test } from "@playwright/test";

test.describe("Authenticated Flows", () => {
  test.beforeEach(async ({ page }) => {
    // page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    const projectRef = "bpruoyahavfgpwycueou";
    const session = {
      access_token: "mocked-token",
      refresh_token: "mocked-refresh",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: {
        id: "11111111-1111-1111-1111-111111111111",
        email: "ava@example.com",
        app_metadata: { provider: "email" },
        user_metadata: { full_name: "Ava Sharma" },
        aud: "authenticated",
        created_at: new Date().toISOString()
      }
    };

    await page.addInitScript(({ session, projectRef }) => {
      window.localStorage.setItem(
        `sb-${projectRef}-auth-token`,
        JSON.stringify(session)
      );
    }, { session, projectRef });

    // Mock Auth
    await page.route("**/auth/v1/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(session)
      });
    });

    // Mock Profiles
    await page.route("**/rest/v1/profiles?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          full_name: "Ava Sharma"
        })
      });
    });

    // Mock Groups
    await page.route("**/rest/v1/groups?*", async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (method === "GET") {
        if (url.includes("id=eq.")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              name: "Goa Escape",
              type: "trip"
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([{
              id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              name: "Goa Escape",
              type: "trip"
            }])
          });
        }
      } else if (method === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: "Weekend Trek",
            type: "trip"
          })
        });
      }
    });


    // Mock Group Members
    await page.route("**/rest/v1/group_members?*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{
            id: "member-1",
            group_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            user_id: session.user.id,
            name: "Ava Sharma",
            email: session.user.email,
            status: "active",
            groups: { name: "Goa Escape" }
          }])
        });
      } else {
        await route.fulfill({ status: 200, body: "{}" });
      }
    });

    // Mock Expenses
    await page.route("**/rest/v1/expenses?*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([])
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "new-expense-id" })
        });
      }
    });

    // Mock Participants
    await page.route("**/rest/v1/expense_participants?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    });

    // Mock Edge Function for Email Invites
    await page.route("**/functions/v1/send-group-invite", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Mock email sent" })
      });
    });
  });

  test("can view dashboard and groups", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Check if Ava's name is visible in the sidebar heading
    await expect(page.getByRole("heading", { name: "Ava Sharma" })).toBeVisible();
    
    // Check if "Goa Escape" group is visible in a heading
    await expect(page.getByRole("heading", { name: "Goa Escape" })).toBeVisible();
  });

  test("can create a new group", async ({ page }) => {
    await page.goto("/groups/new");
    
    await page.getByLabel("Group name").fill("Weekend Trek");
    await page.getByLabel("Type").selectOption("trip");
    await page.getByRole("button", { name: "Create group" }).click();
    
    // After redirect, we should be on a group page
    await expect(page).toHaveURL(/\/groups\/.+/);
  });

  test("can add an expense to a group", async ({ page }) => {
    // Go to the Goa Escape group
    await page.goto("/groups/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    
    await page.getByRole("link", { name: "Add expense" }).click();
    
    await page.getByLabel("Title").fill("Dinner at Thalassa");
    await page.getByLabel("Total amount").fill("3000");
    
    // Need to fill in the payer contribution as well
    // Since Ava is the first member, fill the first payer input
    await page.locator('section:has-text("Paid by")').locator('input[type="number"]').first().fill("3000");
    
    // By default it should be equal split
    await page.getByRole("button", { name: "Save expense" }).click();
    
    // Should redirect back to group page and show the expense
    await expect(page).toHaveURL(/\/groups\/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\/expenses\/.+/);
  });
});
