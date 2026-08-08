import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import milkFixture from "../src/lib/supermarket/fixtures/shufersal-milk.json";

async function signInViaMagicLink() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const preferredEmail = process.env.E2E_EMAIL;

  if (!url || !serviceRoleKey) {
    return null;
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) throw error;

  const user =
    data.users.find((u) => preferredEmail && u.email === preferredEmail) ??
    data.users.find((u) => Boolean(u.email));

  if (!user?.email) return null;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });
  if (linkError) throw linkError;

  const tokenHash = linkData.properties.hashed_token;
  if (!tokenHash) throw new Error("Supabase generateLink did not return hashed_token");

  return tokenHash;
}

test.describe("חיפוש מחיר חלב", () => {
  test("searches for milk and shows a real price", async ({ page }) => {
    const tokenHash = await signInViaMagicLink();
    test.skip(!tokenHash, "Missing Supabase service role env for e2e login");

    await page.goto(
      `/auth/callback?token_hash=${encodeURIComponent(tokenHash!)}&type=magiclink&next=/prices`,
    );

    await expect(page.getByRole("heading", { name: "חיפוש מחירים" })).toBeVisible({
      timeout: 30_000,
    });

    const input = page.getByTestId("price-search-input");
    await expect(input).toHaveValue("חלב");
    await page.getByTestId("price-search-submit").click();

    const firstResult = page.getByTestId("price-search-result").first();
    await expect(firstResult).toBeVisible({ timeout: 20_000 });
    await expect(firstResult.getByTestId("price-product-name")).toContainText("חלב");

    const priceText = await firstResult.getByTestId("price-product-price").innerText();
    expect(priceText).toMatch(/\d/);
    const numeric = Number(priceText.replace(/[^\d.]/g, ""));
    expect(numeric).toBeGreaterThan(0);
    expect(numeric).toBeLessThan(50);

    const sample = milkFixture.items.find((i) => i.name.includes("חלב"));
    expect(sample?.price).toBeGreaterThan(0);
  });
});
