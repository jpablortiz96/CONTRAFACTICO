import type {
  AuditEvidenceMode,
  AuditRun,
  Decision,
  DecisionRegistryEntry,
  DecisionRegistryStatus,
  EnterpriseReadiness,
  GovernancePolicy,
  GovernancePolicyEvaluation,
  IngestionConnector,
  TrustStackModule,
} from "../types.js";
import { findBranchPointCore } from "./decisionAnalysis.js";
import {
  citationForArtifact,
  getEvent,
  loadDecisions,
  loadEvents,
} from "./localCorpus.js";

export type DecisionRegistryFilter =
  | DecisionRegistryStatus
  | "all";

interface RegistryMetadata {
  businessUnit: string;
  status: DecisionRegistryStatus;
  riskLevel: DecisionRegistryEntry["risk_level"];
  expectedImpactUsd?: number;
  avoidableExposureUsd?: number;
  outcomeSummary?: string;
}

const registryMetadata: Record<string, RegistryMetadata> = {
  dec_x200_march: {
    businessUnit: "Operations and Product",
    status: "closed",
    riskLevel: "critical",
    expectedImpactUsd: 80_000,
    avoidableExposureUsd: 80_000,
    outcomeSummary:
      "The March launch stocked out and generated $80,000 USD in Q1 returns.",
  },
  dec_vendor_switch: {
    businessUnit: "Procurement and Quality",
    status: "watching",
    riskLevel: "critical",
    expectedImpactUsd: 60_000,
  },
  dec_q4_packaging_rush: {
    businessUnit: "Operations and Quality",
    status: "closed",
    riskLevel: "high",
    expectedImpactUsd: 42_000,
    avoidableExposureUsd: 42_000,
    outcomeSummary:
      "Packaging failures caused rework, delivery delays, and $42,000 USD in avoidable exposure.",
  },
  dec_south_region_rollout: {
    businessUnit: "Commercial Operations",
    status: "closed",
    riskLevel: "medium",
    expectedImpactUsd: 20_000,
    avoidableExposureUsd: 20_000,
    outcomeSummary:
      "Training gaps drove installer support escalations and $20,000 USD in avoidable cost.",
  },
};

export const contradictedPremisePolicyRego = `package contrafactico.governance

import rego.v1

default block_recommendation := false
default human_approval_required := false

block_recommendation if {
  input.premise_contradicted
  input.readership_ratio < 0.5
  input.impact_usd >= 25000
}

human_approval_required if {
  block_recommendation
}

severity := "critical" if {
  block_recommendation
}`;

const governancePolicies: GovernancePolicy[] = [
  {
    policy_id: "policy_contradicted_premise_low_readership",
    title: "Contradicted premise with low readership",
    description:
      "Prevents a high-impact recommendation from proceeding when evidence contradicts a decision premise but reaches less than half of the intended decision group.",
    severity: "critical",
    condition_summary:
      "Contradicted premise + readership below 50% + expected or realized impact of at least $25,000 USD.",
    opa_rego_preview: contradictedPremisePolicyRego,
    example_trigger:
      "X-200 supplier_on_time was contradicted, reached 0 of 4 intended readers, and carried $80,000 USD in realized impact.",
    recommended_control:
      "Block the recommendation until the evidence owner and a human approver resolve the contradicted premise.",
    human_approval_required: true,
  },
];

const ingestionConnectors: IngestionConnector[] = [
  {
    connector_id: "connector_m365_export",
    name: "Microsoft 365 / SharePoint / Teams export",
    category: "microsoft365",
    status: "adapter_stub",
    input_types: ["markdown", "html", "json", "text export"],
    maps_to: ["artifacts", "readership", "decision evidence sources"],
    privacy_notes:
      "Use tenant-approved exports and preserve source permissions before corpus ingestion.",
    setup_steps: [
      "Export approved SharePoint pages, Teams messages, or meeting records.",
      "Normalize each record to the artifact file contract.",
      "Upload the approved corpus to the tenant knowledge base.",
    ],
  },
  {
    connector_id: "connector_azure_blob_foundry",
    name: "Azure Blob / Foundry IQ corpus",
    category: "data_lake",
    status: "ready",
    input_types: ["markdown", "json", "jsonl"],
    maps_to: ["grounded evidence", "citations", "artifact metadata"],
    privacy_notes:
      "Storage and knowledge-base access remain tenant controlled; repository scripts do not embed credentials.",
    setup_steps: [
      "Generate or validate markdown-backed corpus files.",
      "Upload files with the existing corpus upload helper.",
      "Configure Foundry IQ environment variables at runtime.",
    ],
  },
  {
    connector_id: "connector_decision_logs",
    name: "CSV/JSON decision logs",
    category: "manual_upload",
    status: "ready",
    input_types: ["csv", "json", "jsonl"],
    maps_to: ["decision registry", "premises", "owners", "outcomes"],
    privacy_notes:
      "Only synthetic or tenant-approved fields should be transformed into the registry contract.",
    setup_steps: [
      "Map source columns to the Decision Registry fields.",
      "Validate required identifiers, owners, premises, and timestamps.",
      "Generate evidence-source references for each decision.",
    ],
  },
  {
    connector_id: "connector_jira_github",
    name: "Jira / GitHub issues export",
    category: "project_management",
    status: "adapter_stub",
    input_types: ["csv export", "json export"],
    maps_to: ["artifacts", "premises", "decision evidence sources"],
    privacy_notes:
      "Issue exports must be filtered for approved projects and redact credentials or personal data.",
    setup_steps: [
      "Export approved issues and decision comments.",
      "Map issue identifiers and timestamps to artifact records.",
      "Attach normalized records to related decision IDs.",
    ],
  },
  {
    connector_id: "connector_servicenow",
    name: "ServiceNow incident export",
    category: "service_management",
    status: "adapter_stub",
    input_types: ["csv export", "json export"],
    maps_to: ["outcome artifacts", "cost evidence", "incident timelines"],
    privacy_notes:
      "Incident exports require field allowlists and removal of restricted operational details.",
    setup_steps: [
      "Export approved incident summaries and impact fields.",
      "Normalize incident timestamps and cost evidence.",
      "Link incidents to the originating decision record.",
    ],
  },
  {
    connector_id: "connector_markdown_upload",
    name: "Manual markdown upload",
    category: "manual_upload",
    status: "ready",
    input_types: ["markdown"],
    maps_to: ["artifacts", "citation spans", "local evidence mirror"],
    privacy_notes:
      "Files remain local until an operator explicitly uploads them to tenant storage.",
    setup_steps: [
      "Create one markdown file per approved artifact.",
      "Include artifact metadata and a Body section.",
      "Run the local corpus validation before ingestion.",
    ],
  },
  {
    connector_id: "connector_custom_rest",
    name: "Custom REST API adapter",
    category: "custom_api",
    status: "planned",
    input_types: ["json"],
    maps_to: ["decisions", "artifacts", "readership", "outcomes"],
    privacy_notes:
      "A real adapter requires tenant authentication, pagination, rate limiting, and field-level data governance.",
    setup_steps: [
      "Implement the connector contract for the tenant API.",
      "Add authentication through a tenant-managed identity.",
      "Validate normalized records before registry ingestion.",
    ],
  },
];

const trustStack: TrustStackModule[] = [
  {
    module_id: "trust_opa_policy",
    name: "OPA-style policy enforcement",
    category: "policy",
    role: "Evaluate decision evidence against deterministic governance controls before a recommendation proceeds.",
    integration_status: "adapter_contract",
    why_it_matters:
      "Policy decisions remain explicit, testable, and separable from model-generated reasoning.",
    evidence_in_repo: [
      "docs/policies/contradicted-premise-low-readership.rego",
      "contrafactico-mcp-server/src/services/enterprise.ts",
    ],
  },
  {
    module_id: "trust_openlineage",
    name: "OpenLineage-style evidence lineage",
    category: "lineage",
    role: "Map decisions and audit runs to source artifact identifiers and citation references.",
    integration_status: "adapter_contract",
    why_it_matters:
      "Operators can trace each result back to approved source records and export lineage to a compatible backend.",
    evidence_in_repo: [
      "DecisionRegistryEntry.evidence_sources",
      "AuditRun.citations",
      "corpus/docs",
    ],
  },
  {
    module_id: "trust_langfuse",
    name: "Langfuse-style tool and LLM observability",
    category: "observability",
    role: "Capture tool calls, latency, evidence counts, and model traces through an optional telemetry adapter.",
    integration_status: "documented_path",
    why_it_matters:
      "Production operators need searchable traces without coupling core logic to a proprietary telemetry backend.",
    evidence_in_repo: ["docs/ENTERPRISE_TRUST_STACK.md", "AuditRun"],
  },
  {
    module_id: "trust_evidently",
    name: "Evidently-style reliability evaluation",
    category: "evaluation",
    role: "Evaluate citation coverage, unsupported claims, and reliability thresholds in automated checks.",
    integration_status: "adapter_contract",
    why_it_matters:
      "Reliability regressions become measurable release criteria rather than subjective review.",
    evidence_in_repo: [
      "contrafactico-mcp-server/src/services/reliability.ts",
      "contrafactico-mcp-server/src/devCheck.ts",
    ],
  },
  {
    module_id: "trust_entra",
    name: "Microsoft Entra ID",
    category: "identity",
    role: "Validate JWT issuer, audience, signature, and expiration for protected MCP and demo routes.",
    integration_status: "implemented",
    why_it_matters:
      "Enterprise access can be bound to tenant identities instead of repository credentials.",
    evidence_in_repo: [
      "contrafactico-mcp-server/src/services/auth.ts",
      "contrafactico-mcp-server/src/services/config.ts",
    ],
  },
  {
    module_id: "trust_foundry",
    name: "Foundry IQ grounding",
    category: "grounding",
    role: "Retrieve tenant knowledge-base evidence and normalize source references without fabricating citations.",
    integration_status: "implemented",
    why_it_matters:
      "Decision analysis remains grounded in enterprise evidence with inspectable source references.",
    evidence_in_repo: [
      "contrafactico-mcp-server/src/services/foundryIq.ts",
      "contrafactico-mcp-server/src/foundrySmoke.ts",
    ],
  },
];

function requireMetadata(decisionId: string): RegistryMetadata {
  const metadata = registryMetadata[decisionId];
  if (metadata === undefined) {
    throw new Error(`Decision Registry metadata missing: ${decisionId}`);
  }
  return metadata;
}

function ownerFromDecision(decision: Decision): string {
  return decision.author.replace(/\s+\([^)]*\)$/, "");
}

function requireArtifact<T>(
  value: T | undefined,
  sourceId: string,
): T {
  if (value === undefined) {
    throw new Error(`Enterprise evidence artifact missing: ${sourceId}`);
  }
  return value;
}

function clonePolicy(policy: GovernancePolicy): GovernancePolicy {
  return {
    ...policy,
  };
}

export async function getDecisionRegistryCore(
  status: DecisionRegistryFilter = "all",
): Promise<DecisionRegistryEntry[]> {
  const [decisions, events] = await Promise.all([
    loadDecisions(),
    loadEvents(),
  ]);
  const entries = decisions
    .map((decision): DecisionRegistryEntry => {
      const metadata = requireMetadata(decision.id);
      const relatedEvents = events
        .filter((event) =>
          event.related_decision_ids.includes(decision.id),
        )
        .sort(
          (left, right) =>
            left.timestamp.localeCompare(right.timestamp) ||
            left.id.localeCompare(right.id),
        );
      const lastEvent = relatedEvents.at(-1);

      return {
        decision_id: decision.id,
        statement: decision.statement,
        owner: ownerFromDecision(decision),
        business_unit: metadata.businessUnit,
        status: metadata.status,
        ...(metadata.status === "closed"
          ? { decided_at: decision.timestamp }
          : {}),
        ...(metadata.expectedImpactUsd === undefined
          ? {}
          : { expected_impact_usd: metadata.expectedImpactUsd }),
        premises: [...decision.premises],
        evidence_sources: relatedEvents.map((event) => event.id),
        risk_level: metadata.riskLevel,
        ...(metadata.outcomeSummary === undefined
          ? {}
          : { outcome_summary: metadata.outcomeSummary }),
        ...(metadata.avoidableExposureUsd === undefined
          ? {}
          : {
              avoidable_exposure_usd:
                metadata.avoidableExposureUsd,
            }),
        last_updated: lastEvent?.timestamp ?? decision.timestamp,
      };
    })
    .sort(
      (left, right) =>
        right.last_updated.localeCompare(left.last_updated) ||
        left.decision_id.localeCompare(right.decision_id),
    );

  return status === "all"
    ? entries
    : entries.filter((entry) => entry.status === status);
}

export function getIngestionConnectorsCore(): IngestionConnector[] {
  return ingestionConnectors.map((connector) => ({
    ...connector,
    input_types: [...connector.input_types],
    maps_to: [...connector.maps_to],
    setup_steps: [...connector.setup_steps],
  }));
}

export function getGovernancePoliciesCore(): GovernancePolicy[] {
  return governancePolicies.map(clonePolicy);
}

export async function evaluateGovernancePolicyCore(
  decisionId: string,
): Promise<GovernancePolicyEvaluation> {
  const registry = await getDecisionRegistryCore();
  const decision = registry.find(
    (entry) => entry.decision_id === decisionId,
  );
  if (decision === undefined) {
    throw new Error(`Decision not found in registry: ${decisionId}`);
  }

  const branchPoint = await findBranchPointCore(decisionId);
  const impactUsd =
    decision.avoidable_exposure_usd ??
    decision.expected_impact_usd ??
    0;
  const triggered =
    branchPoint.contradicted_premise.length > 0 &&
    branchPoint.readership.ratio < 0.5 &&
    impactUsd >= 25_000;
  const triggeredPolicies = triggered
    ? getGovernancePoliciesCore()
    : [];
  const impactLabel = `$${impactUsd.toLocaleString("en-US")} USD`;
  const explanation = triggered
    ? `The decision has a contradicted premise, the warning reached ${branchPoint.readership.reader_count} of ${branchPoint.readership.intended_count} intended readers, and the ${impactLabel} impact meets the $25,000 USD policy threshold.`
    : `The decision does not meet every policy condition: contradicted premise, readership below 50%, and impact of at least $25,000 USD.`;

  return {
    decision_id: decisionId,
    triggered_policies: triggeredPolicies,
    blocked_recommendation: triggered,
    human_approval_required: triggered,
    explanation,
    citations: triggered ? [branchPoint.citation] : [],
  };
}

export async function getAuditRunsCore(): Promise<AuditRun[]> {
  const [
    supplierWarning,
    returnsMemo,
    capacityMemo,
    packagingWarning,
    packagingCost,
    southWarning,
    southCost,
    vendorWarning,
  ] = await Promise.all([
    getEvent("evt_feb14_supplier"),
    getEvent("evt_mar31_returns"),
    getEvent("evt_apr_capacity"),
    getEvent("evt_oct17_packaging_qa_warning"),
    getEvent("evt_nov14_packaging_rework"),
    getEvent("evt_apr22_south_training_gap"),
    getEvent("evt_jun06_south_support_escalation"),
    getEvent("evt_jun07_vendor_validation"),
  ]);
  const mode: AuditEvidenceMode = "local";
  const citations = {
    supplier: citationForArtifact(
      requireArtifact(supplierWarning, "evt_feb14_supplier"),
      "NOT arrive before April",
    ),
    returns: citationForArtifact(
      requireArtifact(returnsMemo, "evt_mar31_returns"),
      "$80,000 USD",
    ),
    capacity: citationForArtifact(
      requireArtifact(capacityMemo, "evt_apr_capacity"),
      "returns avoided",
    ),
    packagingWarning: citationForArtifact(
      requireArtifact(
        packagingWarning,
        "evt_oct17_packaging_qa_warning",
      ),
      "not completed final validation",
    ),
    packagingCost: citationForArtifact(
      requireArtifact(packagingCost, "evt_nov14_packaging_rework"),
      "$42,000 USD",
    ),
    southWarning: citationForArtifact(
      requireArtifact(southWarning, "evt_apr22_south_training_gap"),
      "below the required threshold",
    ),
    southCost: citationForArtifact(
      requireArtifact(southCost, "evt_jun06_south_support_escalation"),
      "$20,000 USD",
    ),
    vendor: citationForArtifact(
      requireArtifact(vendorWarning, "evt_jun07_vendor_validation"),
      "Vendor B is ready",
    ),
  };

  return [
    {
      run_id: "run_x200_reliability_20260403",
      timestamp: "2026-04-03T09:05:00-05:00",
      mode,
      tool_name: "score_branch_reliability",
      decision_id: "dec_x200_march",
      evidence_count: 3,
      unsupported_dropped: 1,
      reliability_score: 92,
      result_summary:
        "The X-200 counterfactual retained seven evidence-backed nodes and dropped one unsupported revenue claim.",
      citations: [
        citations.supplier,
        citations.returns,
        citations.capacity,
      ],
      safe_for_export: true,
    },
    {
      run_id: "run_fingerprint_20260609",
      timestamp: "2026-06-09T10:00:00-05:00",
      mode,
      tool_name: "analyze_fork_fingerprint",
      evidence_count: 6,
      unsupported_dropped: 0,
      result_summary:
        "Three decisions repeated the contradicted-premise, low-readership, downstream-cost signature.",
      citations: [
        citations.supplier,
        citations.returns,
        citations.packagingWarning,
        citations.packagingCost,
        citations.southWarning,
        citations.southCost,
      ],
      safe_for_export: true,
    },
    {
      run_id: "run_vendor_policy_20260609",
      timestamp: "2026-06-09T10:12:00-05:00",
      mode,
      tool_name: "evaluate_governance_policy",
      decision_id: "dec_vendor_switch",
      evidence_count: 1,
      unsupported_dropped: 0,
      result_summary:
        "The pending vendor recommendation requires human approval because critical validation evidence reached 1 of 5 intended readers.",
      citations: [citations.vendor],
      safe_for_export: true,
    },
  ];
}

export function getTrustStackCore(): TrustStackModule[] {
  return trustStack.map((module) => ({
    ...module,
    evidence_in_repo: [...module.evidence_in_repo],
  }));
}

export function getEnterpriseReadinessCore(): EnterpriseReadiness {
  return {
    platform_positioning:
      "CONTRAFÁCTICO is a Decision Intelligence Layer for Microsoft 365: it turns decisions, premises, evidence, readership, and outcomes into auditable objects, then uses Foundry IQ-grounded retrieval to rewind failures and warn before repeated fork signatures recur.",
    adoption_flow: [
      "Connect evidence",
      "Build Decision Registry",
      "Rewind decisions",
      "Detect blind spots",
      "Enforce governance",
      "Audit runs",
    ],
    readiness_score: 88,
    production_gaps: [
      "Production Entra OAuth for Copilot connector",
      "Azure Key Vault secret references",
      "Real tenant connector configuration",
      "Production telemetry backend",
      "Customer data governance and retention policy",
    ],
    implemented_capabilities: [
      "Foundry IQ grounding",
      "MCP tools",
      "Copilot Studio MCP facade",
      "Azure Container Apps runtime",
      "Entra JWT validation support",
      "demo endpoints",
      "decision registry schema",
      "ingestion contract",
      "governance policy preview",
      "audit run contract",
      "branch reliability",
      "fork fingerprint",
    ],
    required_for_real_tenant: [
      "Tenant-approved evidence source inventory and retention policy",
      "Connector authentication and field-level allowlists",
      "Production Copilot Studio connection with Entra OAuth",
      "Azure deployment with managed identity and Key Vault references",
      "Production telemetry, lineage export, and operational ownership",
    ],
    trust_stack: getTrustStackCore(),
    next_steps: [
      "Replace public hackathon connector mode with production Entra OAuth.",
      "Move runtime secrets to Azure Key Vault references.",
      "Select and implement the first tenant evidence connector.",
      "Wire production secrets through Key Vault and managed identity.",
      "Connect audit events to approved observability and lineage backends.",
    ],
  };
}
