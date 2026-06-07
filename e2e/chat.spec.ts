import { expect, test } from "@playwright/test";

test.describe("Chat and IndexedDB", () => {
  test.beforeEach(async ({ page }) => {
    // page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    // Mock session for Ava
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

    await page.addInitScript((session) => {
      window.localStorage.setItem(
        "sb-bpruoyahavfgpwycueou-auth-token",
        JSON.stringify(session)
      );
    }, session);

    // Mock profiles fetch
    await page.route("**/rest/v1/profiles?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "11111111-1111-1111-1111-111111111111",
          email: "ava@example.com",
          full_name: "Ava Sharma"
        }])
      });
    });

    // Mock group members fetch
    await page.route("**/rest/v1/group_members?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "member-1",
          group_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          user_id: "11111111-1111-1111-1111-111111111111",
          name: "Ava Sharma",
          email: "ava@example.com",
          status: "active"
        }])
      });
    });

    // Mock groups fetch
    await page.route("**/rest/v1/groups?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          name: "Goa Escape",
          type: "trip"
        })
      });
    });

    // Mock expenses and participants
    await page.route("**/rest/v1/expenses?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    });
    await page.route("**/rest/v1/expense_participants?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    });
  });

  test("can send a message and see it persisted in IndexedDB", async ({ page }) => {
    const groupId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await page.goto(`/groups/${groupId}`);

    // Type a message
    await page.getByPlaceholder("Drop a note for the group...").fill("Hello from Playwright!");
    await page.getByRole("button", { name: "Send message" }).click();

    // Check if it appears in the UI
    await expect(page.getByText("Hello from Playwright!")).toBeVisible();

    // Reload the page to verify IndexedDB persistence
    await page.reload();
    await expect(page.getByText("Hello from Playwright!")).toBeVisible();

    // Verify it's in IndexedDB using evaluate
    const messageExists = await page.evaluate(async (gid) => {
      return new Promise((resolve) => {
        const request = indexedDB.open("fairshare-chat", 1);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("messages", "readonly");
          const store = transaction.objectStore("messages");
          const index = store.index("groupId");
          const getRequest = index.getAll(gid);
          getRequest.onsuccess = () => {
            const results = getRequest.result;
            resolve(results.some(m => m.content === "Hello from Playwright!"));
          };
        };
      });
    }, groupId);

    expect(messageExists).toBe(true);
  });
});
