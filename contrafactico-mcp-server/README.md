# CONTRAFACTICO MCP Server

This package exposes seven organizational decision tools through a stateless Streamable HTTP MCP endpoint. It supports deterministic local evidence and Foundry IQ knowledge-base retrieval.

## Requirements

- Node.js 20 or later
- npm
- An existing Azure AI Search knowledge base for Foundry IQ mode

## Commands

```powershell
npm install
npm run generate:corpus
npm run build
npm run typecheck
npm run check:local
npm run dev
```

Run `npm run check:foundry` only after supplying real Foundry environment values.

## MCP Tools

- `rewind_decision`
- `find_branch_point`
- `simulate_counterfactual`
- `price_the_gap`
- `live_fork_watch`
- `analyze_fork_fingerprint`
- `score_branch_reliability`

`analyze_fork_fingerprint` compares completed decisions for contradicted premises, low readership, and downstream avoidable cost. `score_branch_reliability` scores the existing simulated branch from direct citation coverage and unsupported claims dropped.

## Runtime Configuration

Use [`.env.example`](.env.example) as the environment contract. The server does not load `.env` automatically.

Startup validates:

- `PORT`
- `USE_LOCAL_CORPUS`
- `AUTH_MODE`
- `CORS_ALLOWED_ORIGINS`
- Foundry variables when `USE_LOCAL_CORPUS=false`
- `DEV_BEARER_TOKEN` when `AUTH_MODE=dev-bearer`
- `ENTRA_TENANT_ID` and `ENTRA_AUDIENCE` when `AUTH_MODE=entra-jwt`

The startup summary includes only the service name, port, evidence mode, auth mode, demo visibility, and knowledge-base name. It never includes endpoints, keys, tokens, tenant IDs, or connection strings.

## Evidence Modes

### Local Evidence

```text
USE_LOCAL_CORPUS=true
```

Local mode is the fallback. It reads the deterministic corpus and returns exact markdown-backed citation spans.

### Foundry IQ

```text
USE_LOCAL_CORPUS=false
SEARCH_ENDPOINT=https://YOUR-SEARCH-SERVICE.search.windows.net
SEARCH_KB_NAME=contrafactico-kb
SEARCH_API_VERSION=2026-05-01-preview
SEARCH_API_KEY=YOUR-SEARCH-KEY
```

Foundry mode calls the knowledge-base retrieve route and retries the alternate OData-style route only after HTTP 404 or 405. Citation references are normalized without fabricating missing spans.

Set `FOUNDRY_DEBUG_SHAPE=true` to print only top-level response keys and first-reference keys.

## Authentication Modes

### Local Development

```powershell
$env:AUTH_MODE = "disabled"
$env:DEMO_ENDPOINTS_PUBLIC = "true"
$env:USE_LOCAL_CORPUS = "true"
$env:PORT = "3100"
npm run dev
```

Disabled auth is intended only for local development. The server logs a warning when it is active. `NODE_ENV=production` requires an explicit non-disabled auth mode.

### Remote Smoke Testing

```text
AUTH_MODE=dev-bearer
DEV_BEARER_TOKEN=YOUR-REMOTE-SMOKE-TOKEN
```

Every `/mcp` request must include:

```text
Authorization: Bearer YOUR-REMOTE-SMOKE-TOKEN
```

Use this mode only for controlled pre-OAuth testing.

### Production and Copilot Preparation

```text
AUTH_MODE=entra-jwt
ENTRA_TENANT_ID=YOUR-TENANT-ID
ENTRA_AUDIENCE=api://YOUR-APPLICATION-ID
```

The server verifies RS256 signatures through the Microsoft Entra remote JWKS, caches the remote JWK set, and validates issuer, audience, and expiration. Override `ENTRA_ISSUER` or `ENTRA_JWKS_URI` only when the Entra application requires non-default values.

Copilot Studio connection and OAuth configuration are intentionally deferred to the next step.

## Endpoint Access

- `GET /health` is always public.
- `GET /demo/status` is always public and contains no secret configuration.
- `POST /mcp` is protected according to `AUTH_MODE`.
- `GET /mcp` and `DELETE /mcp` return `405` after authentication.
- `/demo/analysis`, `/demo/live-fork`, `/demo/fingerprint`, `/demo/reliability`, and `/demo/source` are public only when `DEMO_ENDPOINTS_PUBLIC=true`.

When `NODE_ENV=production`, `DEMO_ENDPOINTS_PUBLIC` defaults to `false`. The web demo requires it to be explicitly enabled.

`CORS_ALLOWED_ORIGINS` is a comma-separated allowlist. Wildcards are rejected, and non-local origins must use HTTPS.

## MCP Inspector

Start the server locally, then launch the Inspector:

```powershell
npx @modelcontextprotocol/inspector
```

In the Inspector UI:

1. Select **Streamable HTTP**.
2. Use `http://localhost:3100/mcp` for local testing or `https://YOUR-CONTAINER-APP-FQDN/mcp` for remote testing.
3. For `dev-bearer` or `entra-jwt`, configure the request header as `Authorization: Bearer YOUR-TOKEN`.
4. Connect, initialize, list tools, and invoke the seven registered tools.

Do not expose the Inspector proxy to untrusted networks.

## Direct Endpoint Tests

```powershell
Invoke-RestMethod http://localhost:3100/health
Invoke-RestMethod http://localhost:3100/demo/status
Invoke-RestMethod http://localhost:3100/demo/fingerprint
Invoke-RestMethod http://localhost:3100/demo/reliability/dec_x200_march
Invoke-RestMethod http://localhost:3100/demo/analysis/dec_x200_march
```

The local check also initializes an in-memory MCP client, verifies all seven tools are registered, and calls each tool with its demo input:

```powershell
npm run check:local
```

Use the remote smoke helper for a protected deployment:

```powershell
.\scripts\azure\smoke-mcp-remote.ps1 `
  -BaseUrl "https://YOUR-CONTAINER-APP-FQDN" `
  -BearerToken (Read-Host "Bearer token")
```

The script prints status codes and safe summaries only.

## Container Build

Build from the repository root so the local corpus fallback is included:

```powershell
docker build `
  --file contrafactico-mcp-server/Dockerfile `
  --tag contrafactico-mcp-server:local `
  .
```

The image uses Node.js 20, installs dependencies with `npm ci`, compiles TypeScript, runs as the non-root `node` user, and starts `dist/index.js`.

## Azure Container Apps Preparation

See [`scripts/azure/README.md`](../scripts/azure/README.md) for the manual deployment and smoke-test helpers. No Azure resources are created by package installation or verification commands.

Credentials must remain in process environment variables or an external secret store.
