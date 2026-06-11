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
- `web/` contains the local visual decision rewind demo.
- `agent/` contains the Copilot Studio persona and orchestration instructions.
- `scripts/` contains corpus generation and manual Azure preparation helpers.

## Status

Step 2A preserves local evidence mode and adds an opt-in Foundry IQ retrieval adapter for an existing Azure AI Search knowledge base. Azure resources are not created or deployed by the repository.

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

Set `USE_LOCAL_CORPUS=true` for deterministic local evidence. Set it to `false` with the required `SEARCH_*` environment variables to use Foundry IQ mode.

## Security

Do not commit credentials, certificates, local settings, or environment files. Runtime configuration must be supplied through the deployment environment.

## License

This project is licensed under the MIT License.
