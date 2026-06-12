import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..", "..");
const screenshotsDirectory = path.join(
  repositoryRoot,
  "docs",
  "assets",
  "screenshots",
);
const architectureDirectory = path.join(
  repositoryRoot,
  "docs",
  "assets",
  "architecture",
);
const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

await Promise.all([
  mkdir(screenshotsDirectory, { recursive: true }),
  mkdir(architectureDirectory, { recursive: true }),
]);

const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});
const page = await context.newPage();

function screenshotPath(fileName) {
  return path.join(screenshotsDirectory, fileName);
}

function architecturePath(fileName) {
  return path.join(architectureDirectory, fileName);
}

async function captureElement(testId, fileName) {
  const element = page.getByTestId(testId);
  await element.waitFor({ state: "visible" });
  await element.screenshot({
    path: screenshotPath(fileName),
    animations: "disabled",
  });
}

async function captureFromElement(testId, fileName) {
  const start = page.getByTestId(testId);
  await start.waitFor({ state: "visible" });
  await page.evaluate(() => window.scrollTo(0, 0));
  const startBox = await start.boundingBox();
  if (startBox === null) {
    throw new Error(`Could not measure ${testId}.`);
  }
  const scrollY = await page.evaluate(() => window.scrollY);
  const targetTop = Math.max(0, startBox.y + scrollY - 24);
  await page.evaluate((top) => {
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    window.scrollTo(0, top);
  }, targetTop);
  await page.screenshot({
    path: screenshotPath(fileName),
    animations: "disabled",
  });
}

function diagramPage(title, subtitle, content, footer) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            width: 1600px;
            height: 900px;
            overflow: hidden;
            color: #ecf8f6;
            background:
              radial-gradient(circle at 82% 12%, rgba(66, 230, 190, 0.16), transparent 28%),
              radial-gradient(circle at 18% 88%, rgba(227, 157, 63, 0.12), transparent 30%),
              #06141a;
            font-family: Inter, "Segoe UI", Arial, sans-serif;
          }
          main { padding: 58px 68px 48px; }
          .eyebrow {
            color: #66e6c2;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.18em;
            text-transform: uppercase;
          }
          h1 {
            margin: 12px 0 8px;
            max-width: 1150px;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 54px;
            font-weight: 500;
            letter-spacing: -0.025em;
          }
          .subtitle {
            margin: 0;
            color: #9db5bc;
            font-size: 20px;
          }
          .canvas {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 610px;
            margin-top: 28px;
            padding: 30px;
            border: 1px solid #1d3a43;
            border-radius: 28px;
            background: rgba(7, 27, 34, 0.88);
            box-shadow: 0 32px 80px rgba(0, 0, 0, 0.35);
          }
          .row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            width: 100%;
          }
          .row + .row { margin-top: 26px; }
          .node {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 104px;
            width: 185px;
            padding: 18px;
            border: 1px solid #28505a;
            border-radius: 18px;
            background: linear-gradient(145deg, #0e2932, #0a2028);
            text-align: center;
          }
          .node strong {
            font-family: Georgia, "Times New Roman", serif;
            font-size: 21px;
            font-weight: 500;
            line-height: 1.15;
          }
          .node span {
            margin-top: 9px;
            color: #8ea9b0;
            font-size: 12px;
            line-height: 1.35;
          }
          .node.accent {
            border-color: #45cfae;
            background: linear-gradient(145deg, #103d3b, #0a292d);
          }
          .node.gold {
            border-color: #a77431;
            background: linear-gradient(145deg, #34291b, #1b211f);
          }
          .node.pending {
            border-color: #8d5b61;
            background: linear-gradient(145deg, #302027, #171d22);
          }
          .arrow {
            color: #58dcb9;
            font-size: 30px;
            font-weight: 300;
          }
          .down {
            margin: 7px 0 -9px;
            color: #58dcb9;
            font-size: 30px;
            text-align: center;
          }
          .legend {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 25px;
            color: #9db5bc;
            font-size: 13px;
          }
          .legend b { color: #ecf8f6; }
          footer {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            color: #647f87;
            font-size: 12px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <main>
          <div class="eyebrow">CONTRAFÁCTICO · Enterprise Decision Intelligence</div>
          <h1>${title}</h1>
          <p class="subtitle">${subtitle}</p>
          <section class="canvas">${content}</section>
          <footer><span>Microsoft 365 · Foundry IQ · MCP</span><span>${footer}</span></footer>
        </main>
      </body>
    </html>
  `;
}

async function renderArchitecture(fileName, html) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({
    path: architecturePath(fileName),
    animations: "disabled",
  });
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByTestId("enterprise-cockpit").waitFor({
    state: "visible",
  });

  await page.screenshot({
    path: screenshotPath("web-hero.png"),
    animations: "disabled",
    clip: { x: 0, y: 0, width: 1440, height: 920 },
  });
  await captureFromElement(
    "enterprise-cockpit",
    "enterprise-cockpit.png",
  );
  await captureElement("evidence-graph", "evidence-graph.png");
  await captureElement("connector-wall", "connector-wall.png");
  await captureElement("channel-matrix", "channel-matrix.png");

  await page.getByTestId("nav-rewind").click();
  await page.getByTestId("run-rewind").click();
  await page.getByTestId("timeline-gap-badge").waitFor({
    state: "visible",
  });
  await page
    .locator('section[aria-label="Decision timeline"]')
    .screenshot({
      path: screenshotPath("rewind-demo.png"),
      animations: "disabled",
    });
  await captureElement("citation-panel", "citation-inspector.png");

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.setContent(
    diagramPage(
      "Copilot agent screenshot placeholder",
      "Authenticated Microsoft 365 Copilot, Teams, and Copilot Studio sessions must be captured manually by the maintainer.",
      `
        <div class="row">
          <div class="node accent" style="width: 360px; min-height: 180px">
            <strong>Manual screenshot required</strong>
            <span>Replace this file with a real response from the configured CONTRAFÁCTICO Copilot Studio agent.</span>
          </div>
          <div class="arrow">→</div>
          <div class="node gold" style="width: 360px; min-height: 180px">
            <strong>Do not simulate this surface</strong>
            <span>The repository intentionally does not fabricate an authenticated Copilot or Teams conversation.</span>
          </div>
        </div>
        <div class="legend">
          <span><b>Suggested prompt:</b> Rewind our decision to launch the X-200 in March.</span>
        </div>
      `,
      "Replace before final submission",
    ),
    { waitUntil: "load" },
  );
  await page.screenshot({
    path: screenshotPath("copilot-agent-placeholder.png"),
    animations: "disabled",
  });

  await renderArchitecture(
    "architecture-overview.png",
    diagramPage(
      "Product architecture",
      "Two MCP surfaces serve business users and technical clients from one grounded decision-intelligence runtime.",
      `
        <div class="row">
          <div class="node accent"><strong>M365 Copilot / Teams</strong><span>Business user channel</span></div>
          <div class="arrow">→</div>
          <div class="node"><strong>Copilot Studio Agent</strong><span>Conversation and orchestration</span></div>
          <div class="arrow">→</div>
          <div class="node"><strong>Power Platform Connector</strong><span>MCP streamable contract</span></div>
          <div class="arrow">→</div>
          <div class="node gold"><strong>/mcp-copilot</strong><span>5 simplified tools</span></div>
        </div>
        <div class="down">↓</div>
        <div class="row">
          <div class="node"><strong>Web War Room</strong><span>Enterprise cockpit and cited rewinds</span></div>
          <div class="arrow">→</div>
          <div class="node accent"><strong>Azure Container Apps</strong><span>MCP server and read-only demo API</span></div>
          <div class="arrow">→</div>
          <div class="node"><strong>Foundry IQ</strong><span>Azure AI Search knowledge base</span></div>
          <div class="arrow">→</div>
          <div class="node"><strong>Azure Blob Corpus</strong><span>Approved evidence artifacts</span></div>
        </div>
        <div class="legend">
          <span><b>/mcp</b> protected technical endpoint · 10 tools</span>
          <span><b>/demo/*</b> read-only web endpoints</span>
        </div>
      `,
      "Implemented runtime · explicit production controls",
    ),
  );

  await renderArchitecture(
    "evidence-flow.png",
    diagramPage(
      "Evidence lifecycle",
      "Every analysis begins with an approved artifact and ends with a cited, human-governed decision record.",
      `
        <div class="row">
          <div class="node"><strong>Evidence Sources</strong><span>M365, Blob, logs, systems of work</span></div>
          <div class="arrow">→</div>
          <div class="node"><strong>Ingestion Contract</strong><span>Allowlisted fields and ownership</span></div>
          <div class="arrow">→</div>
          <div class="node"><strong>Artifact Normalization</strong><span>Readers, premises, outcomes, cost</span></div>
          <div class="arrow">→</div>
          <div class="node accent"><strong>Decision Registry</strong><span>Auditable decision objects</span></div>
        </div>
        <div class="down">↓</div>
        <div class="row">
          <div class="node"><strong>Foundry IQ Grounding</strong><span>Citations and source references</span></div>
          <div class="arrow">→</div>
          <div class="node gold"><strong>Decision Analysis</strong><span>Rewind · Live Fork · Governance · Reliability</span></div>
          <div class="arrow">→</div>
          <div class="node"><strong>Audit Run</strong><span>Evidence count, policy, score, lineage</span></div>
          <div class="arrow">→</div>
          <div class="node accent"><strong>Human Decision Board</strong><span>Review, approve, reject, or investigate</span></div>
        </div>
      `,
      "Unsupported claims are dropped",
    ),
  );

  await renderArchitecture(
    "production-topology.png",
    diagramPage(
      "Production topology and trust boundary",
      "Implemented services are separated from the controls that still require tenant-specific production configuration.",
      `
        <div class="row">
          <div class="node accent"><strong>Implemented</strong><span>Copilot Studio · Power Platform · Web War Room</span></div>
          <div class="arrow">→</div>
          <div class="node accent"><strong>Azure Container Apps</strong><span>Protected /mcp and Copilot facade</span></div>
          <div class="arrow">→</div>
          <div class="node accent"><strong>Foundry IQ</strong><span>Grounded retrieval and citation normalization</span></div>
        </div>
        <div class="down">↓</div>
        <div class="row">
          <div class="node"><strong>Entra ID</strong><span>JWT validation implemented; tenant OAuth configuration required</span></div>
          <div class="node"><strong>Policy + Lineage</strong><span>OPA-style and OpenLineage-style contracts</span></div>
          <div class="node pending"><strong>Key Vault</strong><span>Secret references pending</span></div>
          <div class="node pending"><strong>Telemetry</strong><span>Production backend pending</span></div>
          <div class="node pending"><strong>Data Governance</strong><span>Customer retention policy pending</span></div>
        </div>
        <div class="legend">
          <span><b>Implemented</b> repository/runtime capability</span>
          <span><b>Pending</b> customer and tenant production work</span>
        </div>
      `,
      "No real customer data connected",
    ),
  );
} finally {
  await browser.close();
}

console.log(`README assets written under ${path.join(repositoryRoot, "docs", "assets")}.`);
