import { test, expect, type Page } from "@playwright/test";

const PATH = "/internal/humaniser";

// Drive the page in a given mode with the proxy route mocked, and return the
// `system` prompt the client actually sent to /api/internal/humanise.
async function captureSystemForMode(page: Page, mode: string): Promise<string> {
  let capturedSystem = "";

  await page.route("**/api/internal/humanise", async (route) => {
    const body = route.request().postDataJSON() as { system?: string };
    capturedSystem = body?.system ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: "MOCKED OUTPUT" }] }),
    });
  });

  await page.goto(PATH);
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.getByPlaceholder("Paste AI-generated text here...").fill("Some AI-drafted text to process.");
  await page.getByTestId("action-button").click();

  await expect(page.getByText("MOCKED OUTPUT")).toBeVisible();
  await page.unroute("**/api/internal/humanise");
  return capturedSystem;
}

test.describe("Humaniser mode selector", () => {
  test("renders seven mode options", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByTestId("mode-selector").locator("[data-mode]")).toHaveCount(7);
    for (const id of ["cleaner", "tabloid", "safer", "diagnosis", "reddit", "receipts", "editor"]) {
      await expect(page.locator(`[data-mode="${id}"]`)).toBeVisible();
    }
  });

  test("receipts mode sends the case-file branch", async ({ page }) => {
    const system = await captureSystemForMode(page, "receipts");
    expect(system).toContain("Receipts (case-file) mode");
    expect(system).toContain("political dossier");
    expect(system).toContain("Keep denials, responses and caveats attached");
    expect(system).not.toContain("MODE: More tabloid version");
  });

  test("editor pass sends the selective-editor branch with the stop decision", async ({ page }) => {
    const system = await captureSystemForMode(page, "editor");
    expect(system).toContain("selective newspaper editor, not an automatic rewriting engine");
    expect(system).toContain("STOP: PUBLISHABLE");
    expect(system).toContain("MINIMAL REVISED ARTICLE");
    expect(system).not.toContain("MODE: More tabloid version");
  });

  test("reddit mode shows stance selector + comment field and a Write reply button", async ({ page }) => {
    await page.goto(PATH);
    await page.locator('[data-mode="reddit"]').click();
    await expect(page.getByTestId("reddit-controls")).toBeVisible();
    await expect(page.getByTestId("reddit-controls").locator("[data-stance]")).toHaveCount(4);
    await expect(page.getByPlaceholder("Paste the Reddit comment you're replying to...")).toBeVisible();
    await expect(page.getByTestId("action-button")).toHaveText(/Write reply/i);
  });

  test("reddit mode sends the reddit branch with the selected stance and comment", async ({ page }) => {
    let captured = "";
    let userMsg = "";
    await page.route("**/api/internal/humanise", async (route) => {
      const body = route.request().postDataJSON() as { system?: string; messages?: { content: string }[] };
      captured = body?.system ?? "";
      userMsg = body?.messages?.[0]?.content ?? "";
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: "MOCKED REPLY" }] }) });
    });
    await page.goto(PATH);
    await page.locator('[data-mode="reddit"]').click();
    await page.locator('[data-stance="disagree"]').click();
    await page.getByPlaceholder("Paste AI-generated text here...").fill("The source argument.");
    await page.getByPlaceholder("Paste the Reddit comment you're replying to...").fill("I think pension funds should be forced to invest at home.");
    await page.getByTestId("action-button").click();
    await expect(page.getByText("MOCKED REPLY")).toBeVisible();
    expect(captured).toContain("Reddit context reply");
    expect(captured).toContain("40 to 80 words");
    expect(captured).not.toContain("MODE: More tabloid version");
    expect(userMsg).toContain("disagrees with their point");
    expect(userMsg).toContain("I think pension funds should be forced to invest at home.");
    await page.unroute("**/api/internal/humanise");
  });

  test("defaults to tabloid", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('[data-mode="tabloid"]')).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("action-button")).toHaveText(/Rewrite/i);
  });

  test("diagnosis mode shows the will-not-rewrite note and Diagnose button", async ({ page }) => {
    await page.goto(PATH);
    await page.locator('[data-mode="diagnosis"]').click();
    await expect(page.getByTestId("diagnosis-note")).toContainText("will not rewrite");
    await expect(page.getByTestId("action-button")).toHaveText(/Diagnose/i);
  });

  test("tabloid sends the tabloid branch, not the cleaner one", async ({ page }) => {
    const system = await captureSystemForMode(page, "tabloid");
    expect(system).toContain("No paragraph longer than three sentences");
    expect(system).not.toContain("Natural imperfection here means");
  });

  test("cleaner sends the cleaner branch, not the tabloid paragraph cap", async ({ page }) => {
    const system = await captureSystemForMode(page, "cleaner");
    expect(system).toContain("Natural imperfection here means");
    expect(system).not.toContain("No paragraph longer than three sentences");
  });

  test("safer sends the conditional-hedging branch", async ({ page }) => {
    const system = await captureSystemForMode(page, "safer");
    expect(system).toContain("Add or preserve hedging only where the source text itself is uncertain");
    expect(system).toContain("No paragraph longer than five sentences");
  });

  test("diagnosis sends the do-not-rewrite branch and does not rewrite", async ({ page }) => {
    const system = await captureSystemForMode(page, "diagnosis");
    expect(system.toLowerCase()).toContain("do not rewrite");
    // Diagnosis omits the rewrite-only output instruction.
    expect(system).not.toContain("Output the rewritten text only");
  });

  test("every mode carries the global hedge rule, em-dash ban and 'per cent'", async ({ page }) => {
    for (const mode of ["cleaner", "tabloid", "safer", "diagnosis"]) {
      const system = await captureSystemForMode(page, mode);
      expect(system, `${mode} hedge rule`).toContain(
        "Never strengthen 'could', 'may', 'estimated', 'reported', 'alleged', or 'according to'",
      );
      expect(system, `${mode} em-dash ban`).toContain("Never use em dashes");
      expect(system, `${mode} per cent`).toContain('Write "per cent", never "percent"');
    }
  });
});
