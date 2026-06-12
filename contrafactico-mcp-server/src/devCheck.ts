import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  copilotToolNames,
  createCopilotMcpServer,
} from "./copilotMcpServer.js";
import {
  createMcpServer,
  registeredToolNames,
} from "./mcpServer.js";
import type { Citation } from "./types.js";
import {
  findBranchPointCore,
  liveForkWatchCore,
  priceTheGapCore,
  rewindDecisionCore,
  simulateCounterfactualCore,
} from "./services/decisionAnalysis.js";
import {
  readCopilotConnectorAuthMode,
  readMcpConnectorTestGetOk,
  readMcpTransportMode,
} from "./services/config.js";
import { getDemoStatus } from "./services/evidenceStatus.js";
import {
  evaluateGovernancePolicyCore,
  getAuditRunsCore,
  getDecisionRegistryCore,
  getEnterpriseReadinessCore,
  getGovernancePoliciesCore,
  getIngestionConnectorsCore,
  getTrustStackCore,
} from "./services/enterprise.js";
import { analyzeForkFingerprintCore } from "./services/fingerprint.js";
import {
  getArtifactDocumentPath,
  loadCompany,
  loadDecisions,
  loadEvents,
  loadMarkdownArtifacts,
  retrieveLocalGrounded,
} from "./services/localCorpus.js";
import { retrieveGrounded } from "./services/foundryIq.js";
import { scoreBranchReliabilityCore } from "./services/reliability.js";

interface CheckResult {
  check: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function record(check: string, detail: string): void {
  results.push({ check, passed: true, detail });
}

async function verifyCitationDocument(citation: Citation): Promise<void> {
  const content = await readFile(
    getArtifactDocumentPath(citation.source_id),
    "utf8",
  );
  assert.ok(
    content.includes(citation.span),
    `Citation span must exist in ${citation.source_id}.md`,
  );
}

function argumentsForTool(
  toolName: (typeof registeredToolNames)[number],
): Record<string, unknown> {
  switch (toolName) {
    case "rewind_decision":
    case "find_branch_point":
    case "price_the_gap":
      return { decision_id: "dec_x200_march" };
    case "simulate_counterfactual":
    case "score_branch_reliability":
      return {
        decision_id: "dec_x200_march",
        fork_source_id: "evt_feb14_supplier",
      };
    case "live_fork_watch":
      return { pending_decision_id: "dec_vendor_switch" };
    case "analyze_fork_fingerprint":
    case "get_enterprise_readiness":
      return {};
    case "list_decision_registry":
      return { status: "all" };
    case "evaluate_governance_policy":
      return { decision_id: "dec_x200_march" };
  }
}

async function verifyMcpTools(): Promise<void> {
  const server = createMcpServer();
  const client = new Client({
    name: "contrafactico-local-check",
    version: "0.1.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const listedTools = await client.listTools();
    const names = new Set(listedTools.tools.map((tool) => tool.name));

    assert.equal(listedTools.tools.length, registeredToolNames.length);
    for (const toolName of registeredToolNames) {
      assert.ok(names.has(toolName), `MCP tool not registered: ${toolName}`);
      const result = await client.callTool({
        name: toolName,
        arguments: argumentsForTool(toolName),
      });
      assert.notEqual(result.isError, true, `MCP tool failed: ${toolName}`);
      assert.ok(
        result.structuredContent !== undefined,
        `MCP tool returned no structuredContent: ${toolName}`,
      );
    }
  } finally {
    await client.close();
    await server.close();
  }
}

function copilotArgumentsForTool(
  toolName: (typeof copilotToolNames)[number],
): Record<string, unknown> {
  switch (toolName) {
    case "rewind_decision_summary":
    case "evaluate_decision_governance":
      return { decision_id: "dec_x200_march" };
    case "detect_live_fork":
      return { pending_decision_id: "dec_vendor_switch" };
    case "analyze_enterprise_readiness":
      return {};
  }
}

function assertFlatStructuredContent(
  value: Record<string, unknown>,
  toolName: string,
): void {
  for (const [key, field] of Object.entries(value)) {
    const isPrimitive =
      typeof field === "string" ||
      typeof field === "number" ||
      typeof field === "boolean";
    const isStringArray =
      Array.isArray(field) &&
      field.every((entry) => typeof entry === "string");
    assert.ok(
      isPrimitive || isStringArray,
      `${toolName}.${key} must be primitive or a string array`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function verifyCopilotMcpTools(): Promise<void> {
  const server = createCopilotMcpServer();
  const client = new Client({
    name: "contrafactico-copilot-local-check",
    version: "0.1.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const listedTools = await client.listTools();
    const names = new Set(listedTools.tools.map((tool) => tool.name));

    assert.equal(listedTools.tools.length, copilotToolNames.length);
    for (const toolName of copilotToolNames) {
      assert.ok(
        names.has(toolName),
        `Copilot MCP tool not registered: ${toolName}`,
      );
      const result = await client.callTool({
        name: toolName,
        arguments: copilotArgumentsForTool(toolName),
      });
      assert.notEqual(
        result.isError,
        true,
        `Copilot MCP tool failed: ${toolName}`,
      );
      assert.ok(
        isRecord(result.structuredContent),
        `Copilot MCP tool returned no structuredContent: ${toolName}`,
      );
      assertFlatStructuredContent(
        result.structuredContent,
        toolName,
      );
    }
  } finally {
    await client.close();
    await server.close();
  }
}

async function main(): Promise<void> {
  const previousTransportMode = process.env.MCP_TRANSPORT_MODE;
  const previousCopilotAuthMode =
    process.env.COPILOT_CONNECTOR_AUTH_MODE;
  const previousConnectorTestGetOk =
    process.env.MCP_CONNECTOR_TEST_GET_OK;
  try {
    delete process.env.MCP_TRANSPORT_MODE;
    assert.equal(readMcpTransportMode(), "stateless");
    process.env.MCP_TRANSPORT_MODE = "stateful";
    assert.equal(readMcpTransportMode(), "stateful");
    process.env.MCP_TRANSPORT_MODE = "invalid";
    assert.throws(
      () => readMcpTransportMode(),
      /MCP_TRANSPORT_MODE must be "stateless" or "stateful"/,
    );
    record(
      "mcp_transport_config",
      "stateless default and explicit stateful mode are validated",
    );

    delete process.env.COPILOT_CONNECTOR_AUTH_MODE;
    assert.equal(readCopilotConnectorAuthMode(), "inherit");
    process.env.COPILOT_CONNECTOR_AUTH_MODE = "public";
    assert.equal(readCopilotConnectorAuthMode(), "public");
    process.env.COPILOT_CONNECTOR_AUTH_MODE = "invalid";
    assert.throws(
      () => readCopilotConnectorAuthMode(),
      /COPILOT_CONNECTOR_AUTH_MODE must be "inherit" or "public"/,
    );

    delete process.env.MCP_CONNECTOR_TEST_GET_OK;
    assert.equal(readMcpConnectorTestGetOk(), false);
    process.env.MCP_CONNECTOR_TEST_GET_OK = "true";
    assert.equal(readMcpConnectorTestGetOk(), true);
    record(
      "copilot_connector_config",
      "inherited auth and disabled connector GET default safely; public demo mode is explicit",
    );
  } finally {
    if (previousTransportMode === undefined) {
      delete process.env.MCP_TRANSPORT_MODE;
    } else {
      process.env.MCP_TRANSPORT_MODE = previousTransportMode;
    }
    if (previousCopilotAuthMode === undefined) {
      delete process.env.COPILOT_CONNECTOR_AUTH_MODE;
    } else {
      process.env.COPILOT_CONNECTOR_AUTH_MODE =
        previousCopilotAuthMode;
    }
    if (previousConnectorTestGetOk === undefined) {
      delete process.env.MCP_CONNECTOR_TEST_GET_OK;
    } else {
      process.env.MCP_CONNECTOR_TEST_GET_OK =
        previousConnectorTestGetOk;
    }
  }

  const previousLocalMode = process.env.USE_LOCAL_CORPUS;
  const previousKnowledgeBase = process.env.SEARCH_KB_NAME;

  try {
    process.env.USE_LOCAL_CORPUS = "true";
    delete process.env.SEARCH_KB_NAME;
    const localStatus = getDemoStatus();
    assert.equal(localStatus.ok, true);
    assert.equal(localStatus.evidence_mode, "local");
    assert.equal(localStatus.evidence_label, "Local Evidence Mode");
    assert.equal(localStatus.microsoft_iq, null);
    assert.equal(localStatus.knowledge_base, null);
    assert.equal(localStatus.citations_required, true);
    assert.ok(Number.isFinite(Date.parse(localStatus.generated_at)));

    process.env.USE_LOCAL_CORPUS = "false";
    process.env.SEARCH_KB_NAME = "status-check-kb";
    const foundryStatus = getDemoStatus();
    assert.equal(foundryStatus.evidence_mode, "foundry");
    assert.equal(foundryStatus.evidence_label, "Foundry IQ Grounded Mode");
    assert.equal(foundryStatus.microsoft_iq, "Foundry IQ");
    assert.equal(foundryStatus.knowledge_base, "status-check-kb");
    record(
      "demo_status",
      "local and Foundry evidence modes return the expected public status",
    );
  } finally {
    if (previousLocalMode === undefined) {
      delete process.env.USE_LOCAL_CORPUS;
    } else {
      process.env.USE_LOCAL_CORPUS = previousLocalMode;
    }
    if (previousKnowledgeBase === undefined) {
      delete process.env.SEARCH_KB_NAME;
    } else {
      process.env.SEARCH_KB_NAME = previousKnowledgeBase;
    }
  }

  const [company, decisions, events] = await Promise.all([
    loadCompany(),
    loadDecisions(),
    loadEvents(),
  ]);

  assert.equal(company.name, "Cordillera Components");
  record("company", `${company.name}, ${company.employee_count} employees`);

  assert.equal(decisions.length, 4);
  assert.ok(events.length >= 35);
  const markdownArtifacts = await loadMarkdownArtifacts(events);
  assert.equal(markdownArtifacts.length, events.length);
  record(
    "corpus",
    `${decisions.length} decisions, ${events.length} events, and ${markdownArtifacts.length} markdown documents loaded`,
  );

  const packagingDecision = decisions.find(
    (decision) => decision.id === "dec_q4_packaging_rush",
  );
  const southDecision = decisions.find(
    (decision) => decision.id === "dec_south_region_rollout",
  );
  assert.equal(packagingDecision?.status, "closed");
  assert.equal(southDecision?.status, "closed");
  record(
    "historical_decisions",
    "Q4 packaging rush and South Region rollout are closed and documented",
  );

  const supplierDocument = await readFile(
    getArtifactDocumentPath("evt_feb14_supplier"),
    "utf8",
  );
  assert.ok(
    supplierDocument.includes("The X-200 sensor batch will NOT arrive before April"),
  );
  assert.ok(supplierDocument.includes("**Intended audience count:** 4"));
  assert.ok(supplierDocument.includes("**Readers count:** 0"));
  assert.ok(supplierDocument.includes("**Contradicts:** `supplier_on_time`"));
  record(
    "supplier_document",
    "evt_feb14_supplier.md contains delay, readership, and contradiction evidence",
  );

  const returnsDocument = await readFile(
    getArtifactDocumentPath("evt_mar31_returns"),
    "utf8",
  );
  assert.ok(returnsDocument.includes("$80,000 USD in Q1 returns"));
  record(
    "returns_document",
    "evt_mar31_returns.md contains the Q1 returns cost evidence",
  );

  const rewind = await rewindDecisionCore("dec_x200_march");
  assert.ok(rewind.timeline.length >= 6);
  record(
    "rewind_decision",
    `${rewind.timeline.length} cited timeline events`,
  );

  const fork = await findBranchPointCore("dec_x200_march");
  assert.equal(fork.fork_event.id, "evt_feb14_supplier");
  assert.equal(fork.contradiction_strength, 0.95);
  record(
    "find_branch_point",
    `${fork.fork_event.id}, criticality ${fork.criticality}`,
  );

  const simulation = await simulateCounterfactualCore(
    "dec_x200_march",
    "evt_feb14_supplier",
  );
  assert.ok(simulation.branches.real.length >= 3);
  assert.ok(simulation.branches.counterfactual.length >= 3);
  const factNodes = [
    ...simulation.branches.real,
    ...simulation.branches.counterfactual,
  ].filter((node) => node.fact);
  assert.ok(factNodes.every((node) => node.citation_ref.length > 0));
  assert.ok(simulation.dropped_unsupported.length >= 1);
  record(
    "simulate_counterfactual",
    `${simulation.branches.real.length} real nodes, ${simulation.branches.counterfactual.length} counterfactual nodes, ${simulation.dropped_unsupported.length} unsupported node dropped`,
  );

  const pricing = await priceTheGapCore("dec_x200_march");
  assert.equal(pricing.real_cost, 80_000);
  assert.equal(pricing.counterfactual_cost, 0);
  assert.equal(pricing.delta_usd, 80_000);
  record("price_the_gap", `$${pricing.delta_usd} USD delta`);

  const watch = await liveForkWatchCore("dec_vendor_switch");
  assert.equal(watch.alert, true);
  assert.equal(watch.citation.source_id, "evt_jun07_vendor_validation");
  record(
    "live_fork_watch",
    `alert ${watch.alert} from ${watch.citation.source_id}`,
  );

  const fingerprint = await analyzeForkFingerprintCore();
  assert.ok(fingerprint.repeated_in_decisions.length >= 3);
  assert.deepEqual(
    new Set(fingerprint.repeated_in_decisions),
    new Set([
      "dec_x200_march",
      "dec_q4_packaging_rush",
      "dec_south_region_rollout",
    ]),
  );
  assert.equal(fingerprint.total_avoidable_exposure_usd, 142_000);
  assert.ok(fingerprint.average_readership_ratio < 0.5);
  assert.ok(fingerprint.evidence.length >= 6);
  record(
    "analyze_fork_fingerprint",
    `${fingerprint.repeated_in_decisions.length} repeated decisions, ${fingerprint.average_readership_ratio} average readership, $${fingerprint.total_avoidable_exposure_usd} USD exposure`,
  );

  const reliability = await scoreBranchReliabilityCore(
    "dec_x200_march",
    "evt_feb14_supplier",
  );
  assert.ok(reliability.score >= 80);
  assert.ok(reliability.unsupported_dropped >= 1);
  assert.ok(reliability.evidence_backed_nodes >= 6);
  assert.ok(reliability.label.length > 0);
  record(
    "score_branch_reliability",
    `${reliability.score}% ${reliability.label}, ${reliability.evidence_backed_nodes}/${reliability.total_nodes} evidence-backed nodes`,
  );

  const registry = await getDecisionRegistryCore();
  assert.equal(registry.length, 4);
  assert.deepEqual(
    new Set(registry.map((decision) => decision.decision_id)),
    new Set([
      "dec_x200_march",
      "dec_vendor_switch",
      "dec_q4_packaging_rush",
      "dec_south_region_rollout",
    ]),
  );
  assert.equal(
    registry.find(
      (decision) => decision.decision_id === "dec_vendor_switch",
    )?.status,
    "watching",
  );
  assert.equal((await getDecisionRegistryCore("closed")).length, 3);
  record(
    "decision_registry",
    "4 normalized decisions with ownership, risk, impact, and evidence sources",
  );

  const connectors = getIngestionConnectorsCore();
  assert.equal(connectors.length, 7);
  assert.ok(connectors.some((connector) => connector.status === "ready"));
  assert.ok(
    connectors.some((connector) => connector.status === "adapter_stub"),
  );
  assert.ok(
    connectors.some((connector) => connector.status === "planned"),
  );
  record(
    "ingestion_connectors",
    "7 connector contracts distinguish ready file paths, adapter stubs, and planned integration",
  );

  const policies = getGovernancePoliciesCore();
  assert.equal(policies.length, 1);
  assert.equal(
    policies[0]?.title,
    "Contradicted premise with low readership",
  );
  assert.ok(policies[0]?.opa_rego_preview.includes("impact_usd >= 25000"));
  const regoPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "docs",
    "policies",
    "contradicted-premise-low-readership.rego",
  );
  const regoPolicy = await readFile(regoPath, "utf8");
  assert.ok(regoPolicy.includes("package contrafactico.governance"));
  assert.ok(regoPolicy.includes("readership_ratio < 0.5"));
  record(
    "governance_policy",
    "OPA-style policy preview and deterministic TypeScript evaluator share the required threshold",
  );

  const x200Policy = await evaluateGovernancePolicyCore(
    "dec_x200_march",
  );
  assert.equal(x200Policy.blocked_recommendation, true);
  assert.equal(x200Policy.human_approval_required, true);
  assert.equal(
    x200Policy.triggered_policies[0]?.title,
    "Contradicted premise with low readership",
  );
  assert.equal(
    x200Policy.citations[0]?.source_id,
    "evt_feb14_supplier",
  );
  const vendorPolicy = await evaluateGovernancePolicyCore(
    "dec_vendor_switch",
  );
  assert.equal(vendorPolicy.blocked_recommendation, true);
  assert.equal(
    vendorPolicy.citations[0]?.source_id,
    "evt_jun07_vendor_validation",
  );
  const southPolicy = await evaluateGovernancePolicyCore(
    "dec_south_region_rollout",
  );
  assert.equal(southPolicy.blocked_recommendation, false);
  assert.equal(southPolicy.citations.length, 0);
  record(
    "policy_evaluation",
    "X-200 and vendor switch require human approval; the $20,000 South Region decision stays below threshold",
  );

  const auditRuns = await getAuditRunsCore();
  assert.ok(auditRuns.length >= 3);
  assert.ok(auditRuns.every((run) => run.safe_for_export));
  assert.ok(
    auditRuns.every((run) => run.evidence_count === run.citations.length),
  );
  record(
    "audit_runs",
    `${auditRuns.length} deterministic audit records include evidence counts, unsupported claims, and export safety`,
  );

  const trustModules = getTrustStackCore();
  assert.equal(trustModules.length, 6);
  assert.ok(
    trustModules.some(
      (module) =>
        module.name === "Microsoft Entra ID" &&
        module.integration_status === "implemented",
    ),
  );
  assert.ok(
    trustModules.some(
      (module) =>
        module.name === "Langfuse-style tool and LLM observability" &&
        module.integration_status === "documented_path",
    ),
  );
  record(
    "trust_stack",
    "6 trust modules expose implemented, adapter contract, and documented path statuses",
  );

  const readiness = getEnterpriseReadinessCore();
  assert.ok(
    readiness.readiness_score >= 78 &&
      readiness.readiness_score <= 84,
  );
  assert.equal(readiness.production_gaps.length, 5);
  assert.ok(
    readiness.implemented_capabilities.includes("Foundry IQ grounding"),
  );
  assert.equal(readiness.trust_stack.length, trustModules.length);
  record(
    "enterprise_readiness",
    `${readiness.readiness_score}% readiness with ${readiness.production_gaps.length} explicit production gaps`,
  );

  const retrieval = await retrieveLocalGrounded(
    "dec_x200_march supplier_on_time delay",
  );
  assert.ok(retrieval.citations.length > 0);
  const returnedCitations = [
    ...rewind.citations,
    fork.citation,
    ...pricing.citations,
    watch.citation,
    ...fingerprint.evidence,
    ...reliability.citations,
    ...x200Policy.citations,
    ...vendorPolicy.citations,
    ...auditRuns.flatMap((run) => run.citations),
    ...retrieval.citations,
  ];
  for (const citation of returnedCitations) {
    await verifyCitationDocument(citation);
  }
  record(
    "local_retrieval",
    `${returnedCitations.length} returned citations map to markdown documents with exact spans`,
  );

  const previousAdapterLocalMode = process.env.USE_LOCAL_CORPUS;
  process.env.USE_LOCAL_CORPUS = "true";
  try {
    const adapterRetrieval = await retrieveGrounded(
      "evt_feb14_supplier supplier_on_time",
    );
    assert.ok(adapterRetrieval.citations.length > 0);
    assert.equal(
      adapterRetrieval.citations[0]?.source_id,
      "evt_feb14_supplier",
    );
    record(
      "retrieval_adapter",
      "retrieveGrounded uses the local corpus unless USE_LOCAL_CORPUS=false",
    );
  } finally {
    if (previousAdapterLocalMode === undefined) {
      delete process.env.USE_LOCAL_CORPUS;
    } else {
      process.env.USE_LOCAL_CORPUS = previousAdapterLocalMode;
    }
  }

  await verifyMcpTools();
  record(
    "mcp_tools",
    `${registeredToolNames.length} tools registered and callable`,
  );

  await verifyCopilotMcpTools();
  record(
    "copilot_mcp_tools",
    `${copilotToolNames.length} flat-output tools registered and callable`,
  );

  for (const result of results) {
    console.log(`PASS ${result.check}: ${result.detail}`);
  }
}

await main();
