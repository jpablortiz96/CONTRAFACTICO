# CONTRAFACTICO Web Demo

The browser demo visualizes the X-200 decision rewind, its evidence-backed counterfactual branch, the avoidable dollar gap, source citations, the pending vendor Live Fork alert, Fork Fingerprint, and Branch Reliability Score.

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

## Cloud API

Set the public API base URL before building or starting the web app:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = "https://YOUR-CONTAINER-APP-FQDN"
npm run build
```

The web app consumes `/demo/status`, `/demo/analysis`, `/demo/live-fork`, and `/demo/source`. The server also exposes `/demo/fingerprint` and `/demo/reliability/dec_x200_march` for focused integrations. Set `DEMO_ENDPOINTS_PUBLIC=true` on the server when hosting this demo publicly.

Never place bearer tokens, API keys, tenant credentials, or other secrets in `NEXT_PUBLIC_*` variables. Next.js exposes those values to the browser.

## Commands

```powershell
npm run typecheck
npm run build
npm run dev -- -p 3001
```
