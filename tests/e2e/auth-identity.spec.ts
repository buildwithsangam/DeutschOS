import { expect, test } from "@playwright/test";

test("unauthenticated visitor sees a sign-in link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("login page shows the magic-link form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to DeutschOS" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Back to lessons" })).toBeVisible();
});

test("login form rejects invalid email", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
});

test("existing A1 MVP flow still works with auth nav present", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.getByRole("button", { name: /^Day 1\b/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /^Day 2\b/ })).toBeDisabled();
  await expect(page.getByRole("link", { name: /optional Pre-A1 foundation/i })).toBeVisible();
});

test("pre-a1 page remains accessible with auth nav present", async ({ page }) => {
  await page.goto("/pre-a1");
  await expect(page.getByRole("heading", { name: "Pre-A1 → A1 Bridge" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^← Back to A1$/ })).toBeVisible();
});
