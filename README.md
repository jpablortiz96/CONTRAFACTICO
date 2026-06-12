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

The repository supports local evidence mode, opt-in Foundry IQ retrieval, a stateless seven-tool MCP server, and a visual decision rewind demo. Azure deployment remains an explicit operator action.

## Fork Fingerprint

Fork Fingerprint compares historical decisions to surface recurring blind spots where premise-changing evidence existed before approval but reached less than half of the decision group. The demo grounds the detected pattern in warning and cost artifacts from three decisions.

## Branch Reliability Score

Branch Reliability Score exposes the evidence contract behind a simulated counterfactual. It reports cited branch nodes, unsupported claims dropped by the engine, the weakest supported dependency, and a bounded confidence score.

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
