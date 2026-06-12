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
- `contrafactico-mcp-server/` contains the Streamable HTTP MCP server.
- `web/` contains the local visual decision rewind demo.
- `agent/` contains the Copilot Studio persona and orchestration instructions.
- `scripts/` contains corpus generation and manual Azure preparation helpers.

## Status

The repository supports local evidence mode, opt-in Foundry IQ retrieval, a ten-tool technical MCP endpoint, a four-tool Copilot Studio facade, stateless and stateful Streamable HTTP modes, a visual decision rewind, and working enterprise product contracts. Azure deployment and tenant connector configuration remain explicit operator actions.

## Enterprise Product Vision

CONTRAFÁCTICO is a Decision Intelligence Layer for Microsoft 365: it turns decisions, premises, evidence, readership, and outcomes into auditable objects, then uses Foundry IQ-grounded retrieval to rewind failures and warn before repeated fork signatures recur.

The productization layer separates six concerns:

- evidence ingestion,
- normalized decision records,
- grounded decision analysis,
- deterministic governance,
- exportable audit runs,
- identity, lineage, observability, and evaluation contracts.

## How A Company Would Use It

1. Connect tenant-approved evidence exports or corpus files.
2. Normalize consequential decisions into the Decision Registry.
3. Rewind failed or disputed decisions through cited evidence.
4. Detect repeated organizational blind spots with Fork Fingerprint.
5. Evaluate high-risk recommendations against governance policies.
6. Retain citations, unsupported-claim counts, and reliability in Audit Run records.

The repository uses only synthetic Cordillera Components data.

## Decision Registry

The Decision Registry represents each decision with an owner, business unit, lifecycle status, premises, evidence source IDs, risk, expected impact, outcome, avoidable exposure, and last update. The enterprise demo exposes all four synthetic decisions through `GET /demo/registry` and the `list_decision_registry` MCP tool.

## Ingestion Contract

The connector contract documents how evidence maps into decisions and artifacts without making live third-party API calls. Current examples cover:

- Microsoft 365, SharePoint, and Teams exports,
- Azure Blob and Foundry IQ corpus files,
- CSV and JSON decision logs,
- Jira and GitHub exports,
- ServiceNow incident exports,
- manual markdown uploads,
- custom REST adapters.

Each connector is marked `ready`, `adapter_stub`, or `planned`. Ready means a local file contract exists; it does not mean a production tenant connector is deployed.

## Governance Policies

The OPA-style preview at `docs/policies/contradicted-premise-low-readership.rego` blocks a recommendation and requires human approval when:

- evidence contradicts a decision premise,
- readership is below 50 percent,
- expected or realized impact is at least $25,000 USD.

The TypeScript evaluator mirrors this policy for the synthetic demo and never takes autonomous action.

## Open Source Trust Stack

`docs/ENTERPRISE_TRUST_STACK.md` describes the integration boundary for:

- OPA-style policy enforcement,
- OpenLineage-style evidence lineage,
- Langfuse-style tool and model observability,
- Evidently-style reliability evaluation,
- Microsoft Entra ID,
- Foundry IQ grounding.

Statuses distinguish implemented modules, adapter contracts, and documented paths. No optional observability or policy backend is claimed as deployed.

## Production Architecture

The target deployment path is:

```text
Microsoft 365 Copilot / Teams
  ↓
Copilot Studio Agent
  ↓
OAuth / Microsoft Entra ID
  ↓
Azure Container Apps MCP Server
  ↓
Foundry IQ / Azure AI Search Knowledge Base
  ↓
SharePoint, Teams, Blob, Jira, ServiceNow, CSV/JSON, custom APIs
  ↓
OPA policy, lineage, observability, evaluation
```

This is a documented target architecture. The local server, Entra JWT validation support, Foundry IQ adapter, MCP tools, schemas, and demo contracts are implemented; deployment and real tenant wiring remain pending.

## What Is Implemented Vs Pending

Implemented:

- Foundry IQ grounding and local fallback,
- ten MCP tools,
- Entra JWT validation support,
- decision registry and ingestion contracts,
- governance policy preview and deterministic evaluator,
- audit run and trust stack contracts,
- Branch Reliability and Fork Fingerprint,
- enterprise demo endpoints and UI.

Pending:

- Copilot Studio connection,
- Azure Container Apps deployment,
- real tenant connector configuration,
- production telemetry backend,
- enterprise Key Vault wiring.

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

The local health endpoint is `GET /health`. `/mcp` exposes all ten protected technical tools. The hackathon Power Platform connector can use public `/mcp-copilot` with `COPILOT_CONNECTOR_AUTH_MODE=public`, `MCP_CONNECTOR_TEST_GET_OK=true`, `MCP_TRANSPORT_MODE=stateful`, and `MCP_RELAX_ACCEPT_HEADER=true`.

Run the web demo from `web/` with `npm install` and `npm run dev -- -p 3001`, then open `http://localhost:3001`.

Set `USE_LOCAL_CORPUS=true` for deterministic local evidence. Set it to `false` with the required `SEARCH_*` environment variables to use Foundry IQ mode.

## Security

Do not commit credentials, certificates, local settings, or environment files. Runtime configuration must be supplied through the deployment environment.

## License

This project is licensed under the MIT License.
