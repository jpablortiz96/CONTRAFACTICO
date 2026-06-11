import { expect, test } from "@playwright/test";

test("rewinds the X-200 decision and opens cited evidence", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "CONTRAFÁCTICO" }),
  ).toBeVisible();
  await expect(page.getByTestId("evidence-mode")).toHaveText(
    "Local Evidence Mode",
  );

  await page.getByTestId("run-rewind").click();

  await expect(page.getByTestId("timeline-gap-badge")).toHaveText(
    "$80,000 avoidable",
  );
  await expect(page.locator("canvas.timeline-canvas")).toBeVisible();
  await expect(page.getByTestId("live-fork-panel")).toContainText(
    "Same fork signature detected",
  );

  await page
    .getByTestId("timeline-node-evt_feb14_supplier-supplier-delay")
    .click();
  await expect(page.getByTestId("citation-panel")).toContainText(
    "evt_feb14_supplier",
  );
  await expect(page.getByTestId("citation-panel")).toContainText(
    "NOT arrive before April",
  );

  await page.screenshot({
    path: "test-results/contrafactico-demo.png",
    fullPage: true,
  });

  await page
    .getByTestId("timeline-node-evt_mar31_returns-returns")
    .click();
  await expect(page.getByTestId("citation-panel")).toContainText(
    "$80,000 USD",
  );

  expect(consoleErrors).toEqual([]);
});
