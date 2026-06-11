# CONTRAFÁCTICO MCP Server

This package hosts the CONTRAFÁCTICO tools through a stateless Streamable HTTP MCP endpoint. It supports deterministic local evidence and an opt-in Foundry IQ knowledge-base retrieval adapter.

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

Run the cloud retrieval smoke test only after supplying real environment values:

```powershell
npm run check:foundry
```

## Evidence Modes

### Local Mode

Local mode is the default:

```text
USE_LOCAL_CORPUS=true
```

`retrieveGrounded` searches the deterministic markdown corpus and returns exact local citation spans. `npm run check:local` verifies the corpus, all five analysis workflows, markdown citation mapping, and the local adapter switch.

### Foundry IQ Mode

Foundry IQ mode is enabled explicitly:

```text
USE_LOCAL_CORPUS=false
```

It requires an existing Azure AI Search knowledge base and:

- `SEARCH_ENDPOINT`
- `SEARCH_KB_NAME`
- `SEARCH_API_KEY`
- `SEARCH_API_VERSION`, defaulting to `2026-05-01-preview`

The adapter calls:

```text
POST {SEARCH_ENDPOINT}/knowledgebases/{SEARCH_KB_NAME}/retrieve?api-version={SEARCH_API_VERSION}
```

After HTTP 404 or 405, it retries once with:

```text
POST {SEARCH_ENDPOINT}/knowledgebases('{SEARCH_KB_NAME}')/retrieve?api-version={SEARCH_API_VERSION}
```

The current request uses message content entries shaped as `{ "type": "text", "text": "..." }` and requests `retrievalReasoningEffort.kind` of `medium`.

Preview response contracts can vary. The adapter reads an answer from `response`, `content`, `answer`, `message`, or `value`. It normalizes citations from `references`, `activity[].references`, `citations`, `groundingSources`, or `retrievedDocuments`. If the service returns no citations, the adapter returns an empty citation array without creating substitutes.

## Environment Contract

[`.env.example`](.env.example) contains placeholders only and documents the supported variables. It is not loaded automatically. Supply values through the process environment, a deployment environment, or Node's `--env-file` support for compiled execution.

Example PowerShell session:

```powershell
$env:USE_LOCAL_CORPUS = "false"
$env:SEARCH_ENDPOINT = "https://<search-service>.search.windows.net"
$env:SEARCH_KB_NAME = "<knowledge-base>"
$env:SEARCH_API_VERSION = "2026-05-01-preview"
$env:SEARCH_API_KEY = Read-Host "Azure AI Search API key"
npm run check:foundry
Remove-Item Env:SEARCH_API_KEY
```

`check:foundry` prints answer length, citation count, and previews for up to five normalized citations. It never prints credentials or the complete environment.

Set `FOUNDRY_DEBUG_SHAPE=true` to print only the top-level response keys and first reference keys. Debug mode never prints credentials or full response bodies.

## Endpoints

- `GET /health` returns process health and service metadata.
- `GET /demo/status` returns the public evidence mode without endpoints, keys, or tenant details.
- `POST /mcp` handles stateless Streamable HTTP MCP requests.
- `GET /mcp` and `DELETE /mcp` return `405 Method Not Allowed` in stateless mode.
- `GET /demo/analysis/dec_x200_march` returns the shared rewind, fork, simulation, gap, and citations.
- `GET /demo/live-fork/dec_vendor_switch` returns the pending vendor decision alert.
- `GET /demo/source/:source_id` returns a corpus markdown source and citation preview.

The demo endpoints are read-only. `CORS_ALLOWED_ORIGINS` is a comma-separated allowlist and defaults to `http://localhost:3001,http://localhost:3000`. Wildcard origins are rejected.

## Azure Preparation

See [`scripts/azure/README.md`](../scripts/azure/README.md) for manual storage upload, knowledge-base configuration, retrieval testing, and environment setup. No Azure resources are created by package installation or verification commands.

Credentials are never stored in this package.
