# CONTRAFACTICO MCP Server

This package exposes ten organizational decision and enterprise product tools through a Streamable HTTP MCP endpoint. It supports deterministic local evidence and Foundry IQ knowledge-base retrieval.

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
- `list_decision_registry`
- `evaluate_governance_policy`
- `get_enterprise_readiness`

`analyze_fork_fingerprint` compares completed decisions for contradicted premises, low readership, and downstream avoidable cost. `score_branch_reliability` scores the existing simulated branch from direct citation coverage and unsupported claims dropped.

The enterprise tools expose normalized registry records, deterministic policy evaluation, and an honest readiness aggregate with production gaps.

## Runtime Configuration

Use [`.env.example`](.env.example) as the environment contract. The server does not load `.env` automatically.

Startup validates:

- `PORT`
- `USE_LOCAL_CORPUS`
- `AUTH_MODE`
- `COPILOT_CONNECTOR_AUTH_MODE`
- `MCP_TRANSPORT_MODE`
- `MCP_RELAX_ACCEPT_HEADER`
- `MCP_CONNECTOR_TEST_GET_OK`
- `CORS_ALLOWED_ORIGINS`
- Foundry variables when `USE_LOCAL_CORPUS=false`
- `DEV_BEARER_TOKEN` when `AUTH_MODE=dev-bearer`
- `ENTRA_TENANT_ID` and `ENTRA_AUDIENCE` when `AUTH_MODE=entra-jwt`

The startup summary includes only the service name, port, evidence mode, auth mode, MCP transport mode, demo visibility, and knowledge-base name. It never includes endpoints, keys, tokens, tenant IDs, or connection strings.

## MCP Transport Modes

Local development defaults to independent stateless `POST` requests:

```text
MCP_TRANSPORT_MODE=stateless
```

Power Platform and Copilot Studio custom connectors should use stateful sessions:

```text
MCP_TRANSPORT_MODE=stateful
```

Stateful initialization returns `Mcp-Session-Id`. Subsequent `POST`, `GET`, and `DELETE` requests must send that header. Sessions are held in memory, so a deployment must use one replica or provide equivalent session affinity.

`MCP_RELAX_ACCEPT_HEADER=true` normalizes incomplete `Accept` headers on `/mcp` and `/mcp-copilot` to `application/json, text/event-stream`. This compatibility behavior is limited to MCP `POST` and `GET` requests.

## MCP Endpoints

- `/mcp` is the full technical endpoint with ten tools and complete nested evidence contracts.
- `/mcp-copilot` is the Power Platform and Copilot Studio facade with five simplified, flat-output tools.

The Copilot facade exposes:

- `rewind_decision_summary`
- `detect_live_fork`
- `analyze_enterprise_readiness`
- `evaluate_decision_governance`
- `explain_enterprise_adoption`

Use [`docs/connectors/contrafactico-mcp-copilot.swagger.yaml`](../docs/connectors/contrafactico-mcp-copilot.swagger.yaml) when creating the Power Platform custom connector. Container Apps should set:

```text
MCP_TRANSPORT_MODE=stateful
MCP_RELAX_ACCEPT_HEADER=true
```

For a hackathon connector configured with no authentication:

```text
COPILOT_CONNECTOR_AUTH_MODE=public
MCP_CONNECTOR_TEST_GET_OK=true
```

`COPILOT_CONNECTOR_AUTH_MODE` defaults to `inherit`, which applies the same authentication as `/mcp`. Public mode affects only `/mcp-copilot` and `/mcp-copilot/status`; `/mcp` remains protected by `AUTH_MODE`.

`MCP_CONNECTOR_TEST_GET_OK` defaults to `false`. When enabled, an unauthenticated `GET /mcp-copilot` without a session ID returns a reachability message for the Power Platform connector Test tab. Stateful GET requests with a session ID still use the MCP transport.

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

The Copilot-compatible MCP facade is implemented. Tenant connector creation and OAuth configuration remain explicit deployment actions.

## Endpoint Access

- `GET /health` is always public.
- `GET /demo/status` is always public and contains no secret configuration.
- `GET /mcp/status` is protected according to `AUTH_MODE` and returns only safe transport, Accept-relaxation, session-count, auth-mode, and tool-count metadata.
- `GET /mcp-copilot/status` reports the facade auth mode, transport mode, Accept compatibility, connector GET compatibility, and five-tool count.
- `POST /mcp`, `GET /mcp`, and `DELETE /mcp` are protected according to `AUTH_MODE`.
- `/mcp-copilot` inherits `/mcp` authentication unless `COPILOT_CONNECTOR_AUTH_MODE=public`.
- In stateless mode, `GET` and `DELETE` on either MCP endpoint return `405`.
- In stateful mode, `GET /mcp` opens the session event stream and `DELETE /mcp` closes the session.
- `/demo/analysis`, `/demo/live-fork`, `/demo/fingerprint`, `/demo/reliability`, `/demo/source`, and every enterprise demo endpoint are public only when `DEMO_ENDPOINTS_PUBLIC=true`.

Enterprise endpoints:

- `GET /demo/cockpit`
- `GET /demo/onboarding`
- `GET /demo/evidence-graph`
- `GET /demo/deployment-footprint`
- `GET /demo/channels`
- `GET /demo/enterprise`
- `GET /demo/registry`
- `GET /demo/connectors`
- `GET /demo/policies`
- `GET /demo/audit-runs`
- `GET /demo/trust-stack`
- `GET /demo/policy-evaluation/:decision_id`

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
4. Connect, initialize, list tools, and invoke the ten registered tools.

Do not expose the Inspector proxy to untrusted networks.

## Direct Endpoint Tests

```powershell
Invoke-RestMethod http://localhost:3100/health
Invoke-RestMethod http://localhost:3100/demo/status
Invoke-RestMethod http://localhost:3100/demo/fingerprint
Invoke-RestMethod http://localhost:3100/demo/reliability/dec_x200_march
Invoke-RestMethod http://localhost:3100/demo/analysis/dec_x200_march
Invoke-RestMethod http://localhost:3100/demo/enterprise
Invoke-RestMethod http://localhost:3100/demo/registry
Invoke-RestMethod http://localhost:3100/demo/connectors
Invoke-RestMethod http://localhost:3100/demo/policies
Invoke-RestMethod http://localhost:3100/demo/audit-runs
Invoke-RestMethod http://localhost:3100/demo/trust-stack
Invoke-RestMethod http://localhost:3100/demo/policy-evaluation/dec_x200_march
```

The local check also initializes an in-memory MCP client, verifies all ten tools are registered, and calls each tool with its demo input. It validates the enterprise contracts, Rego preview, audit citations, and governance thresholds:

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

## Enterprise Contracts

- `src/services/enterprise.ts` contains deterministic local services for registry, connectors, policies, audit runs, trust modules, readiness, and policy evaluation.
- `src/services/cockpit.ts` derives cockpit KPIs, connector readiness, and deployment footprint from the existing enterprise contracts.
- `src/services/onboarding.ts` documents customer inputs, adoption stages, supported channels, generated outputs, limitations, and production requirements.
- `src/services/evidenceGraph.ts` exposes the deterministic X-200 evidence network used by the cockpit.
- `docs/policies/contradicted-premise-low-readership.rego` is an OPA-style policy preview.
- `docs/ENTERPRISE_TRUST_STACK.md` documents implemented modules and optional integration paths.

The repository does not deploy third-party policy, lineage, observability, or evaluation backends.
