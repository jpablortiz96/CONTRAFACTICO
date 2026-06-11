# CONTRAFÁCTICO Web Demo

The local browser demo visualizes the X-200 decision rewind, its evidence-backed counterfactual branch, the avoidable dollar gap, source citations, and the pending vendor Live Fork alert.

## Requirements

- Node.js 20.9 or later
- The CONTRAFÁCTICO MCP server running on `http://localhost:3000`

## Run Locally

Start the server:

```powershell
Set-Location ..\contrafactico-mcp-server
npm run generate:corpus
npm run dev
```

Start the web app in another terminal:

```powershell
Set-Location ..\web
npm install
npm run dev -- -p 3001
```

Open `http://localhost:3001` and select **Run Rewind**.

## Commands

```powershell
npm run typecheck
npm run build
npm run dev -- -p 3001
```

The browser calls the server's read-only `/demo` endpoints directly. Set `NEXT_PUBLIC_MCP_SERVER_URL` only when the local server uses a different origin.
