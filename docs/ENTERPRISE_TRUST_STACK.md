# Enterprise Trust Stack

CONTRAFÁCTICO keeps decision analysis, evidence lineage, governance, and identity as explicit contracts. The integrations below describe the current repository state without claiming that optional production backends are deployed.

| Module | Status | Integration path |
| --- | --- | --- |
| OPA-style policy enforcement | adapter contract | The Rego preview in `docs/policies/contradicted-premise-low-readership.rego` is mirrored by the deterministic evaluator in `src/services/enterprise.ts`. A production deployment can send the same normalized input to an Open Policy Agent service. |
| OpenLineage-style evidence lineage | adapter contract | Decision Registry entries expose `evidence_sources`; Audit Run records expose citations and source IDs. An exporter can map those records to OpenLineage-compatible jobs, runs, and datasets. |
| Langfuse-style tool and LLM observability | documented path | Audit Run fields define tool name, evidence count, unsupported claims, reliability, latency, and result summary. A production telemetry adapter is still required. |
| Evidently-style reliability evaluation | adapter contract | Branch Reliability and `check:local` already calculate citation coverage and unsupported-claim thresholds. A production evaluator can publish those metrics to an Evidently-compatible workspace. |
| Microsoft Entra ID | implemented | The server supports JWT issuer, audience, signature, and expiration validation through remote JWKS. Tenant app registration and deployment configuration remain operator tasks. |
| Foundry IQ grounding | implemented | Foundry IQ retrieval, defensive citation normalization, smoke testing, and local evidence fallback are implemented. Tenant knowledge-base configuration remains external. |

## Policy Input Contract

The policy preview expects a normalized object:

```json
{
  "premise_contradicted": true,
  "readership_ratio": 0,
  "impact_usd": 80000
}
```

The local evaluator blocks the recommendation and requires human approval only when all three conditions are true. It does not take autonomous action.

## Lineage Contract

Every registry decision references evidence source IDs. Every exported audit run contains citations with `source_id`, `title`, `span`, and `ref_id`. These fields are sufficient for a future lineage adapter to associate:

- the decision object,
- the tool invocation,
- the evidence artifacts,
- the resulting governance or reliability output.

## Production Boundaries

The repository does not deploy OPA, OpenLineage, Langfuse, or Evidently services. It provides compatible contracts and documented integration paths. Production deployment still requires tenant architecture review, approved telemetry storage, retention controls, managed identities, and operational ownership.
