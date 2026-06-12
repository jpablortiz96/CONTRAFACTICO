# Submission Screenshot Checklist

Use real product and Azure portal captures. Do not place credentials, tenant identifiers, subscription identifiers, keys, tokens, personal messages, or unrelated customer data in screenshots.

## Required Manual Captures

- [ ] **Foundry IQ knowledge base**
  - Show the configured knowledge base and source/index relationship.
  - Confirm the corpus is present without exposing keys.
  - Save as `docs/assets/screenshots/foundry-iq-kb.png`.

- [ ] **Azure Container Apps**
  - Show the running `ca-contrafactico-mcp` app, healthy revision, and public application URL.
  - Hide subscription and tenant identifiers where practical.
  - Save as `docs/assets/screenshots/azure-container-apps.png`.

- [ ] **Power Platform custom connector test**
  - Show a successful connector operation against `/mcp-copilot`.
  - Do not show bearer tokens, API keys, or secret environment values.
  - Save as `docs/assets/screenshots/power-platform-connector.png`.

- [ ] **Copilot Studio or Microsoft 365 / Teams response**
  - Use the prompt: `Rewind our decision to launch the X-200 in March.`
  - Show the agent returning the February 14 warning, zero-of-four readership, and the `$80,000` gap.
  - Replace `docs/assets/screenshots/copilot-agent-placeholder.png` with the real capture.
  - Keep the same filename so the root README updates automatically.

## Automated Repository Captures

- [x] Hero / landing
  - `docs/assets/screenshots/web-hero.png`

- [x] Rewind Demo
  - `docs/assets/screenshots/rewind-demo.png`

- [x] Enterprise Cockpit
  - `docs/assets/screenshots/enterprise-cockpit.png`

- [x] Evidence Graph
  - `docs/assets/screenshots/evidence-graph.png`

- [x] Citation inspector
  - `docs/assets/screenshots/citation-inspector.png`

- [x] Connector wall
  - `docs/assets/screenshots/connector-wall.png`

- [x] Channel matrix
  - `docs/assets/screenshots/channel-matrix.png`

Regenerate automated captures while the server and web app are running:

```powershell
Set-Location web
npm run capture:readme
```

## Final Review

- [ ] Images contain no secrets or private tenant data.
- [ ] The Copilot image is a real authenticated capture, not a mockup.
- [ ] Text remains readable at GitHub README width.
- [ ] Evidence-mode labels match the environment being demonstrated.
- [ ] The README status language matches the current deployment.
