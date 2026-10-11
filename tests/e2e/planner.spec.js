import { test, expect } from "@playwright/test";
test("live plan, validation, persistence, category actions and reset", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Budżet marketingowy", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".stat").nth(2)).toContainText(/60\s000,00/);
  await expect(page.locator(".stat").nth(3)).toContainText("60%");
  await page.getByLabel("Udział Social media", { exact: true }).fill("50");
  await expect(page.getByRole("status").first()).toContainText(
    "Przydzielono 110%",
  );
  await expect(page.locator(".stat").nth(2)).toContainText("—");
  await expect(
    page.getByText("Zmniejsz udziały do maksymalnie 100%."),
  ).toBeVisible();
  await page.getByLabel("Udział Social media", { exact: true }).fill("40");
  await page.getByLabel("ROI Social media", { exact: true }).fill("");
  await expect(
    page.getByLabel("ROI Social media", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(".stat").nth(2)).toContainText("—");
  await page.getByLabel("ROI Social media", { exact: true }).fill("200,00");
  await expect(page.locator(".stat").nth(2)).toContainText(/120\s000,00/);
  await page.reload();
  await expect(
    page.getByLabel("ROI Social media", { exact: true }),
  ).toHaveValue("200,00");
  await page.getByRole("button", { name: "Dodaj kategorię" }).click();
  await expect(
    page.getByLabel("Nazwa kategorii 8", { exact: true }),
  ).toHaveValue("Nowa kategoria 1");
  await page
    .getByRole("button", { name: "Usuń Nowa kategoria 1", exact: true })
    .click();
  await expect(page.locator(".category")).toHaveCount(7);
  await page.getByRole("button", { name: "Resetuj plan", exact: true }).click();
  await page.getByRole("button", { name: "Anuluj" }).click();
  await expect(
    page.getByLabel("ROI Social media", { exact: true }),
  ).toHaveValue("200,00");
  await page.getByRole("button", { name: "Resetuj plan", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Resetuj plan", exact: true })
    .click();
  await expect(
    page.getByLabel("ROI Social media", { exact: true }),
  ).toHaveValue("50");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("negative ROI is reflected in chart and financial benefit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Roczny budżet", { exact: true }).fill("10000");
  for (const name of ["WWW", "Radio"])
    await page.getByLabel(`Udział ${name}`, { exact: true }).fill("0");
  await page.getByLabel("Udział Social media", { exact: true }).fill("100");
  await page.getByLabel("ROI Social media", { exact: true }).fill("-100");
  await expect(page.locator(".stat").nth(2)).toContainText(/-10\s000,00/);
  await expect(page.locator(".stat").nth(2)).toContainText(
    "Korzyść finansowa: 0,00",
  );
  await expect(page.locator(".profit-bar")).toHaveCount(1);
  await page.getByLabel("Udział Social media", { exact: true }).fill("0");
  await expect(page.locator(".stat").nth(3)).toContainText("—");
  await expect(
    page.getByText("Przydziel budżet do kanału, aby zobaczyć prognozę."),
  ).toBeVisible();
});
test("keyboard reset, local save failures and accessible default screen", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  const reset = page.getByRole("button", { name: "Resetuj plan", exact: true });
  await reset.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Anuluj" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Resetuj plan" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(reset).toBeFocused();
  await reset.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Resetuj plan" })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("marketing-budget-plan-v1")),
  ).toBeNull();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
  });
  await page.getByLabel("Roczny budżet", { exact: true }).fill("200000");
  await expect(page.getByText("Nie udało się zapisać zmian")).toBeVisible();
  await expect(page.locator(".stat").nth(2)).toContainText(/120\s000,00/);
});
