# CONTRAFACTICO Web Demo

The browser application includes four product views:

- **Enterprise Cockpit** is the default command center with KPI cards, onboarding wizard, connector wall, clickable X-200 evidence graph, channel matrix, adoption story, and deployment footprint.
- **Rewind Demo** visualizes the X-200 evidence trail, counterfactual branch, avoidable gap, Live Fork alert, Fork Fingerprint, and Branch Reliability Score.
- **Enterprise Mode** shows adoption flow, Decision Registry, ingestion connectors, governance policy, audit runs, and the Open Source Trust Stack.
- **Evidence & Trust** shows the target production architecture, implemented-versus-pending boundary, tenant prerequisites, and integration evidence.

## Requirements

- Node.js 20.9 or later
- The CONTRAFACTICO MCP server running with public demo endpoints

## Local Development

The web app uses `http://localhost:3100` as its default API base URL.

Start the server:

```powershell
Set-Location ..\contrafactico-mcp-server
$env:AUTH_MODE = "disabled"
$env:DEMO_ENDPOINTS_PUBLIC = "true"
$env:USE_LOCAL_CORPUS = "true"
$env:PORT = "3100"
npm run dev
```

Start the web app in another terminal:

```powershell
Set-Location ..\web
npm install
npm run dev -- -p 3001
```

Open `http://localhost:3001`. The Enterprise Cockpit loads first; select **Rewind Demo** and then **Run Rewind** for the original experience.

The cockpit consumes:

- `/demo/cockpit`
- `/demo/onboarding`
- `/demo/evidence-graph`
- `/demo/deployment-footprint`
- `/demo/channels`

The evidence graph is a deterministic, clickable visualization of the X-200 decision, supplier premise, unread contradiction, outcome, $80,000 cost, governance policy, and Foundry IQ grounding path.

The result view keeps the core timeline flow intact and adds:

- **Branch Reliability** with the score, direct citation coverage, unsupported claims dropped, and weakest link.
- **Organizational Blind Spot** with the repeated fork signature, average warning readership, total avoidable exposure, and evidence pills that open the existing Citation Inspector.

Select **Enterprise Mode** to load working local contracts from:

- `/demo/enterprise`
- `/demo/registry`
- `/demo/connectors`
- `/demo/policies`
- `/demo/audit-runs`
- `/demo/trust-stack`
- `/demo/policy-evaluation/dec_x200_march`

Connector and channel cards state whether each path is implemented, an adapter contract, a documented path, or production pending. All Cordillera Components data is synthetic. Runtime and Copilot connectivity are implemented; production OAuth, Key Vault references, real tenant connectors, telemetry, and customer data governance remain pending.

## Cloud API

Set the public API base URL before building or starting the web app:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = "https://YOUR-CONTAINER-APP-FQDN"
npm run build
```

The web app consumes the rewind and enterprise demo endpoints. Set `DEMO_ENDPOINTS_PUBLIC=true` on the server only when these read-only demo routes should be public.

Never place bearer tokens, API keys, tenant credentials, or other secrets in `NEXT_PUBLIC_*` variables. Next.js exposes those values to the browser.

## Commands

```powershell
npm run typecheck
npm run build
npm run dev -- -p 3001
```
