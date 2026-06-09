# CONTRAFÁCTICO MCP Server

This package hosts the CONTRAFÁCTICO tools through a stateless Streamable HTTP MCP endpoint.

## Requirements

- Node.js 20 or later
- npm

## Commands

```powershell
npm install
npm run build
npm run typecheck
npm run dev
```

## Endpoints

- `GET /health` returns process health and service metadata.
- `POST /mcp` handles stateless Streamable HTTP MCP requests.
- `GET /mcp` and `DELETE /mcp` return `405 Method Not Allowed` in stateless mode.

## Runtime Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `HOST` | No | `0.0.0.0` | HTTP bind host |
| `PORT` | No | `3000` | HTTP bind port |
| `FOUNDRY_IQ_ENDPOINT` | No | None | Foundry IQ endpoint placeholder |
| `AZURE_OPENAI_ENDPOINT` | No | None | Azure OpenAI endpoint placeholder |
| `AZURE_OPENAI_DEPLOYMENT` | No | None | Azure OpenAI deployment placeholder |

Credentials are not stored in this package. Production authentication and service integrations are deferred beyond Step 0.
