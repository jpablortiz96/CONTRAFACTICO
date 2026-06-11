# CONTRAFÁCTICO

**The Org That Didn't Happen**

CONTRAFÁCTICO is an enterprise agent for examining consequential organizational decisions and the paths they closed.

- CONTRAFÁCTICO rewinds organizational decisions.
- It finds the fork where a contradicting fact went invisible.
- It simulates the branch that did not happen.
- It prices the dollar gap.
- Every claim is grounded and cited through Foundry IQ.

## Repository

- `corpus/` contains the organizational source corpus and supporting documents.
- `contrafactico-mcp-server/` contains the stateless Streamable HTTP MCP server.
- `web/` contains the web experience placeholder.
- `agent/` contains the Copilot Studio persona and orchestration instructions.
- `scripts/` contains corpus generation and upload placeholders.

## Status

Step 1B adds a local browser demo for the deterministic cited decision analysis. Azure resources and production integrations are not implemented yet.

## MCP Server

```powershell
Set-Location contrafactico-mcp-server
npm install
npm run generate:corpus
npm run build
npm run typecheck
npm run check:local
npm run dev
```

The local health endpoint is `GET /health`. The MCP endpoint is `POST /mcp`.

Run the web demo from `web/` with `npm install` and `npm run dev -- -p 3001`, then open `http://localhost:3001`.

## Security

Do not commit credentials, certificates, local settings, or environment files. Runtime configuration must be supplied through the deployment environment.

## License

This project is licensed under the MIT License.
