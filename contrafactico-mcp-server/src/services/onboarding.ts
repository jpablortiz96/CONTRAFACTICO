import type {
  EnterpriseOnboarding,
  SupportedChannel,
} from "../types.js";

const supportedChannels: SupportedChannel[] = [
  {
    channel_id: "channel_m365_copilot",
    name: "Microsoft 365 Copilot / Teams",
    status: "implemented",
    usage: "Consume governed decision analysis through the connected Copilot Studio agent.",
  },
  {
    channel_id: "channel_copilot_studio",
    name: "Copilot Studio",
    status: "implemented",
    usage: "Call the simplified MCP facade through the Power Platform custom connector.",
  },
  {
    channel_id: "channel_web_war_room",
    name: "Web War Room",
    status: "implemented",
    usage: "Inspect rewinds, live forks, governance, citations, and the enterprise cockpit.",
  },
  {
    channel_id: "channel_mcp_api",
    name: "REST/MCP API",
    status: "implemented",
    usage: "Integrate the full ten-tool MCP endpoint or the simplified Copilot facade.",
  },
  {
    channel_id: "channel_power_automate",
    name: "Power Automate",
    status: "adapter_contract",
    usage: "Trigger decision checks from approved workflows through the connector contract.",
  },
  {
    channel_id: "channel_power_bi",
    name: "Power BI / Fabric dashboard",
    status: "documented_path",
    usage: "Publish registry, risk, reliability, and audit metrics through a governed data export.",
  },
  {
    channel_id: "channel_internal_portals",
    name: "Custom internal portals",
    status: "adapter_contract",
    usage: "Embed read-only cockpit data and invoke approved MCP workflows.",
  },
  {
    channel_id: "channel_future_adapters",
    name: "Future Slack/Jira/ServiceNow adapters",
    status: "production_pending",
    usage: "Add tenant-authenticated adapters after field mapping and data-governance review.",
  },
];

export function getSupportedChannelsCore(): SupportedChannel[] {
  return supportedChannels.map((channel) => ({ ...channel }));
}

export function getEnterpriseOnboardingCore(): EnterpriseOnboarding {
  return {
    headline:
      "Replace the synthetic Cordillera corpus with approved company evidence, normalize it into a Decision Registry, ground analysis through Foundry IQ, and deliver governed results through the channels employees already use.",
    adoption_stages: [
      {
        stage_id: "connect_evidence",
        title: "Connect Evidence",
        summary:
          "Select tenant-approved exports, storage locations, and source-system adapters.",
        status: "adapter_contract",
      },
      {
        stage_id: "normalize_artifacts",
        title: "Normalize Artifacts",
        summary:
          "Map messages, documents, meetings, decisions, readership, and outcomes to the artifact contract.",
        status: "implemented",
      },
      {
        stage_id: "build_registry",
        title: "Build Decision Registry",
        summary:
          "Create auditable decision objects with owners, premises, evidence sources, risk, and outcomes.",
        status: "implemented",
      },
      {
        stage_id: "ground_foundry",
        title: "Ground with Foundry IQ",
        summary:
          "Upload approved evidence to the knowledge base and retain normalized source references.",
        status: "implemented",
      },
      {
        stage_id: "run_analysis",
        title: "Run Rewind / Live Fork",
        summary:
          "Reconstruct historical forks and detect repeated blind spots before pending decisions close.",
        status: "implemented",
      },
      {
        stage_id: "govern_audit",
        title: "Govern & Audit",
        summary:
          "Apply deterministic approval policies and retain cited, exportable run records.",
        status: "adapter_contract",
      },
    ],
    supported_channels: getSupportedChannelsCore(),
    evidence_sources: [
      {
        source_id: "m365",
        name: "Microsoft 365 / SharePoint / Teams",
        examples: ["SharePoint pages", "Teams exports", "meeting records"],
        status: "adapter_contract",
      },
      {
        source_id: "foundry_blob",
        name: "Azure Blob / Foundry IQ",
        examples: ["Markdown", "JSON", "JSONL"],
        status: "implemented",
      },
      {
        source_id: "decision_logs",
        name: "CSV / JSON decision logs",
        examples: ["Decision registers", "risk logs", "outcome reports"],
        status: "implemented",
      },
      {
        source_id: "work_systems",
        name: "Jira / GitHub / ServiceNow",
        examples: ["Issues", "incidents", "change records"],
        status: "adapter_contract",
      },
      {
        source_id: "custom_sources",
        name: "Manual uploads / custom REST APIs",
        examples: ["Markdown", "approved API payloads"],
        status: "documented_path",
      },
    ],
    required_customer_inputs: [
      "Approved evidence-source inventory and source owners",
      "Decision identifiers, owners, timestamps, premises, and lifecycle status",
      "Readership or distribution metadata where policy permits",
      "Outcome and cost records linked to originating decisions",
      "Tenant identity, retention, access-control, and field-allowlist requirements",
    ],
    generated_outputs: [
      "Normalized Decision Registry",
      "Cited decision rewind timelines",
      "Counterfactual branch simulations with unsupported claims removed",
      "Live Fork alerts and repeated blind-spot fingerprints",
      "Governance policy evaluations and human-approval requirements",
      "Audit runs, reliability scores, evidence graphs, and dashboard metrics",
    ],
    production_requirements: [
      "Production Entra OAuth for the Copilot connector",
      "Azure Key Vault secret references",
      "Real tenant connector configuration",
      "Production telemetry backend",
      "Customer data governance and retention policy",
    ],
    demo_limitations: [
      "All Cordillera Components decisions and evidence are synthetic.",
      "Connector cards describe implemented file contracts or adapter paths; they do not claim live tenant access.",
      "The evidence graph is deterministic and scoped to the X-200 demonstration decision.",
      "Public Copilot connector mode is for the hackathon demonstration, not a production security posture.",
    ],
  };
}
