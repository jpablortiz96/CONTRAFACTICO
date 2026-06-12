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
  await expect(page.getByTestId("evidence-mode")).toContainText("Mode");

  await expect(page.getByTestId("enterprise-cockpit")).toBeVisible();
  await expect(page.getByTestId("enterprise-cockpit")).toContainText(
    "Decision Intelligence Cockpit",
  );
  await expect(page.getByTestId("enterprise-cockpit")).toContainText(
    "$142,000",
  );
  await expect(page.getByTestId("onboarding-wizard")).toContainText(
    "Ground with Foundry IQ",
  );
  await expect(page.getByTestId("connector-wall")).toContainText(
    "Power BI / Fabric",
  );
  await expect(page.getByTestId("channel-matrix")).toContainText(
    "Microsoft 365 Copilot / Teams",
  );
  await page.getByTestId("graph-node-evt_mar31_returns").click();
  await expect(page.getByTestId("evidence-graph")).toContainText(
    "evt_mar31_returns",
  );

  await page.screenshot({
    path: "test-results/contrafactico-cockpit.png",
    fullPage: true,
  });

  await page.getByTestId("nav-rewind").click();
  await page.getByTestId("run-rewind").click();

  await expect(page.getByTestId("timeline-gap-badge")).toHaveText(
    "$80,000 avoidable",
  );
  await expect(page.locator("canvas.timeline-canvas")).toBeVisible();
  await expect(page.getByTestId("live-fork-panel")).toContainText(
    "Same fork signature detected",
  );
  await expect(page.getByTestId("branch-reliability")).toContainText(
    "92%",
  );
  await expect(page.getByTestId("fork-fingerprint")).toContainText(
    "$142,000 avoidable exposure",
  );

  await page.getByTestId(
    "fingerprint-source-evt_feb14_supplier",
  ).click();
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

  await page.getByTestId("nav-enterprise").click();
  await expect(page.getByTestId("enterprise-mode")).toBeVisible();
  await expect(page.getByTestId("decision-registry")).toContainText(
    "dec_vendor_switch",
  );
  await expect(page.getByTestId("ingestion-connectors")).toContainText(
    "Microsoft 365 / SharePoint / Teams export",
  );
  await expect(page.getByTestId("governance-policy")).toContainText(
    "Human approval required",
  );
  await expect(page.getByTestId("audit-runs")).toContainText(
    "score_branch_reliability",
  );
  await expect(page.getByTestId("enterprise-trust-stack")).toContainText(
    "Foundry IQ grounding",
  );

  await page.screenshot({
    path: "test-results/contrafactico-enterprise.png",
    fullPage: true,
  });

  await page.getByTestId("nav-trust").click();
  await expect(page.getByTestId("evidence-trust-mode")).toBeVisible();
  await expect(page.getByTestId("production-architecture")).toContainText(
    "Azure Container Apps MCP Server",
  );
  await expect(page.getByTestId("production-architecture")).toContainText(
    "Runtime implemented",
  );

  await page.getByTestId("nav-cockpit").click();
  await expect(page.getByTestId("enterprise-cockpit")).toBeVisible();

  await page.getByTestId("nav-rewind").click();
  await expect(page.getByTestId("timeline-gap-badge")).toHaveText(
    "$80,000 avoidable",
  );

  expect(consoleErrors).toEqual([]);
});
