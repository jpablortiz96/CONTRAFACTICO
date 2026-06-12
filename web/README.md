# CONTRAFACTICO Web Demo

The browser application includes three product views:

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

Open `http://localhost:3001` and select **Run Rewind**.

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

The connector and trust cards state whether each path is ready, an adapter contract, or only documented. The architecture view is explicitly labeled as a target deployment with production work pending.

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
