import type {
  ConnectorReadiness,
  DeploymentFootprint,
  EnterpriseCockpit,
} from "../types.js";
import {
  liveForkWatchCore,
} from "./decisionAnalysis.js";
import {
  evaluateGovernancePolicyCore,
  getAuditRunsCore,
  getDecisionRegistryCore,
} from "./enterprise.js";
import { analyzeForkFingerprintCore } from "./fingerprint.js";
import { loadCompany } from "./localCorpus.js";
import { scoreBranchReliabilityCore } from "./reliability.js";

const connectorReadiness: ConnectorReadiness[] = [
  {
    connector_id: "connector_m365",
    name: "Microsoft 365 / SharePoint / Teams",
    status: "adapter_contract",
    summary: "Approved export and artifact-mapping contract.",
    data_contract: ["documents", "messages", "meetings", "readership"],
  },
  {
    connector_id: "connector_foundry",
    name: "Azure Blob / Foundry IQ",
    status: "implemented",
    summary: "Grounded retrieval and markdown-backed local mirror.",
    data_contract: ["markdown", "json", "jsonl", "citations"],
  },
  {
    connector_id: "connector_decision_logs",
    name: "CSV / JSON decision logs",
    status: "implemented",
    summary: "Decision Registry normalization contract.",
    data_contract: ["decisions", "premises", "owners", "outcomes"],
  },
  {
    connector_id: "connector_jira_github",
    name: "Jira / GitHub",
    status: "adapter_contract",
    summary: "Approved issue-export adapter boundary.",
    data_contract: ["issues", "comments", "change records"],
  },
  {
    connector_id: "connector_servicenow",
    name: "ServiceNow",
    status: "adapter_contract",
    summary: "Incident and impact export adapter boundary.",
    data_contract: ["incidents", "impact", "timelines"],
  },
  {
    connector_id: "connector_markdown",
    name: "Manual Markdown Upload",
    status: "implemented",
    summary: "One validated markdown document per evidence artifact.",
    data_contract: ["markdown", "source spans", "artifact metadata"],
  },
  {
    connector_id: "connector_rest",
    name: "Custom REST API",
    status: "production_pending",
    summary: "Requires tenant authentication, pagination, and field governance.",
    data_contract: ["approved JSON payloads"],
  },
  {
    connector_id: "connector_power_automate",
    name: "Power Automate",
    status: "documented_path",
    summary: "Workflow invocation through the Power Platform connector.",
    data_contract: ["MCP tool calls", "approval workflows"],
  },
  {
    connector_id: "connector_power_bi",
    name: "Power BI / Fabric",
    status: "documented_path",
    summary: "Governed dashboard export for registry and audit metrics.",
    data_contract: ["registry metrics", "risk", "audit runs"],
  },
];

export function getConnectorReadinessCore(): ConnectorReadiness[] {
  return connectorReadiness.map((connector) => ({
    ...connector,
    data_contract: [...connector.data_contract],
  }));
}

export function getDeploymentFootprintCore(): DeploymentFootprint {
  return {
    architecture_mode: "tenant-ready",
    runtime: "Azure Container Apps",
    grounding: "Foundry IQ / Azure AI Search Knowledge Base",
    agent_channel: "Copilot Studio through Power Platform MCP connector",
    web_experience: "Enterprise Cockpit and Decision Rewind War Room",
    components: [
      {
        component_id: "component_mcp_runtime",
        name: "Azure Container Apps MCP Server",
        status: "implemented",
        current_state: "Deployed Streamable HTTP runtime with full and Copilot MCP endpoints.",
        production_requirement: "Use managed identity, production scaling controls, and operational ownership.",
      },
      {
        component_id: "component_copilot",
        name: "Copilot Studio Agent",
        status: "implemented",
        current_state: "Connected through the simplified Power Platform MCP facade.",
        production_requirement: "Replace public hackathon mode with production Entra OAuth.",
      },
      {
        component_id: "component_foundry",
        name: "Foundry IQ Grounding",
        status: "implemented",
        current_state: "Knowledge-base retrieval returns normalized source references.",
        production_requirement: "Apply tenant access controls, retention, and source permissions.",
      },
      {
        component_id: "component_identity",
        name: "Microsoft Entra Identity",
        status: "adapter_contract",
        current_state: "JWT validation is implemented for protected endpoints.",
        production_requirement: "Complete Copilot connector OAuth registration and least-privilege consent.",
      },
      {
        component_id: "component_observability",
        name: "Telemetry and Lineage",
        status: "production_pending",
        current_state: "Audit contracts and deterministic reliability checks are implemented.",
        production_requirement: "Connect approved production telemetry and lineage backends.",
      },
    ],
    connector_readiness: getConnectorReadinessCore(),
  };
}

export async function getEnterpriseCockpitCore(): Promise<EnterpriseCockpit> {
  const [
    company,
    registry,
    auditRuns,
    fingerprint,
    reliability,
    liveFork,
    ...policyEvaluations
  ] = await Promise.all([
    loadCompany(),
    getDecisionRegistryCore(),
    getAuditRunsCore(),
    analyzeForkFingerprintCore(),
    scoreBranchReliabilityCore(
      "dec_x200_march",
      "evt_feb14_supplier",
    ),
    liveForkWatchCore("dec_vendor_switch"),
    evaluateGovernancePolicyCore("dec_x200_march"),
    evaluateGovernancePolicyCore("dec_vendor_switch"),
    evaluateGovernancePolicyCore("dec_q4_packaging_rush"),
    evaluateGovernancePolicyCore("dec_south_region_rollout"),
  ]);
  const blockedDecisionIds = new Set(
    policyEvaluations
      .filter((evaluation) => evaluation.blocked_recommendation)
      .map((evaluation) => evaluation.decision_id),
  );
  const riskByUnit = new Map<
    string,
    EnterpriseCockpit["risk_by_business_unit"][number]
  >();

  for (const decision of registry) {
    const existing = riskByUnit.get(decision.business_unit);
    const exposure =
      decision.avoidable_exposure_usd ??
      decision.expected_impact_usd ??
      0;
    const next = existing ?? {
      business_unit: decision.business_unit,
      decisions: 0,
      open_live_forks: 0,
      governance_blocks: 0,
      exposure_usd: 0,
      risk_level: decision.risk_level,
    };
    next.decisions += 1;
    next.exposure_usd += exposure;
    if (decision.status === "watching") {
      next.open_live_forks += 1;
    }
    if (blockedDecisionIds.has(decision.decision_id)) {
      next.governance_blocks += 1;
    }
    riskByUnit.set(decision.business_unit, next);
  }

  return {
    organization_name: company.name,
    mode: "synthetic-demo",
    decisions_analyzed: registry.length,
    open_live_forks: liveFork.alert ? 1 : 0,
    governance_blocks: blockedDecisionIds.size,
    total_avoidable_exposure_usd:
      fingerprint.total_avoidable_exposure_usd,
    average_branch_reliability: reliability.score,
    top_blind_spot:
      "Critical readiness warnings with low executive readership",
    risk_by_business_unit: [...riskByUnit.values()].sort(
      (left, right) =>
        right.exposure_usd - left.exposure_usd ||
        left.business_unit.localeCompare(right.business_unit),
    ),
    recent_agent_runs: auditRuns.map((run) => ({
      run_id: run.run_id,
      tool_name: run.tool_name,
      ...(run.decision_id === undefined
        ? {}
        : { decision_id: run.decision_id }),
      result_summary: run.result_summary,
      evidence_count: run.evidence_count,
      status: "completed" as const,
    })),
    recommended_next_actions: [
      "Resolve the Vendor B readiness contradiction before approval.",
      "Route critical readiness warnings to accountable decision owners.",
      "Configure production Entra OAuth for the Copilot connector.",
      "Connect the first tenant-approved evidence source and retention policy.",
    ],
  };
}
