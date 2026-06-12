export type ArtifactType =
  | "chat"
  | "decision"
  | "document"
  | "email"
  | "meeting_transcript"
  | "memo";

export interface Citation {
  source_id: string;
  title: string;
  span: string;
  ref_id: string;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  timestamp: string;
  author: string;
  intended_audience: string[];
  readers: string[];
  title: string;
  body: string;
  premise_tags: string[];
  contradicts: string[];
  related_decision_ids: string[];
  status?: "approved" | "closed" | "pending";
}

export interface Decision extends Artifact {
  type: "decision";
  statement: string;
  premises: string[];
  status: "approved" | "closed" | "pending";
}

export interface TimelineNode {
  source_id: string;
  type: ArtifactType;
  timestamp: string;
  title: string;
  summary: string;
  citation_ref: string;
}

export interface BranchNode {
  id: string;
  label: string;
  timestamp: string;
  fact: boolean;
  citation_ref: string;
}

export interface ForkFingerprint {
  pattern_name: string;
  summary: string;
  recurring_signature: string[];
  decisions_analyzed: number;
  repeated_in_decisions: string[];
  average_readership_ratio: number;
  total_avoidable_exposure_usd: number;
  top_blind_spot: string;
  evidence: Citation[];
  recommendations: string[];
}

export interface BranchReliability {
  score: number;
  label: string;
  evidence_backed_nodes: number;
  total_nodes: number;
  unsupported_dropped: number;
  weakest_link: string;
  explanation: string;
  citations: Citation[];
}

export interface DemoAnalysis {
  decision_id: string;
  rewind: {
    decision: Decision;
    timeline: TimelineNode[];
    citations: Citation[];
  };
  fork: {
    fork_event: Artifact;
    contradicted_premise: string;
    readership: {
      reader_count: number;
      intended_count: number;
      ratio: number;
    };
    contradiction_strength: number;
    criticality: number;
    citation: Citation;
  };
  simulation: {
    branches: {
      real: BranchNode[];
      counterfactual: BranchNode[];
    };
    reasoning_steps: string[];
    dropped_unsupported: Array<{
      claim: string;
      reason: string;
    }>;
  };
  gap: {
    real_cost: number;
    counterfactual_cost: number;
    delta_usd: number;
    citations: Citation[];
  };
  fingerprint: ForkFingerprint;
  reliability: BranchReliability;
  citations: Citation[];
  generated_at: string;
}

export interface DemoLiveFork {
  pending_decision_id: string;
  live_fork: {
    alert: boolean;
    matched_signature: {
      contradicted_premise: string;
      readership_ratio: number;
      contradiction_strength: number;
      criticality: number;
    };
    pending_decision: Decision;
    citation: Citation;
  };
  generated_at: string;
}

export interface DemoSource {
  source_id: string;
  markdown: string;
  citation_preview: Citation;
}

export interface DemoStatus {
  ok: true;
  evidence_mode: "local" | "foundry";
  evidence_label: "Local Evidence Mode" | "Foundry IQ Grounded Mode";
  microsoft_iq: "Foundry IQ" | null;
  knowledge_base: string | null;
  citations_required: true;
  generated_at: string;
}

export type DecisionRegistryStatus = "pending" | "closed" | "watching";
export type DecisionRiskLevel = "low" | "medium" | "high" | "critical";

export interface DecisionRegistryEntry {
  decision_id: string;
  statement: string;
  owner: string;
  business_unit: string;
  status: DecisionRegistryStatus;
  decided_at?: string;
  expected_impact_usd?: number;
  premises: string[];
  evidence_sources: string[];
  risk_level: DecisionRiskLevel;
  outcome_summary?: string;
  avoidable_exposure_usd?: number;
  last_updated: string;
}

export type ConnectorStatus = "ready" | "planned" | "adapter_stub";

export interface IngestionConnector {
  connector_id: string;
  name: string;
  category:
    | "microsoft365"
    | "project_management"
    | "service_management"
    | "data_lake"
    | "manual_upload"
    | "custom_api";
  status: ConnectorStatus;
  input_types: string[];
  maps_to: string[];
  privacy_notes: string;
  setup_steps: string[];
}

export interface GovernancePolicy {
  policy_id: string;
  title: string;
  description: string;
  severity: DecisionRiskLevel;
  condition_summary: string;
  opa_rego_preview: string;
  example_trigger: string;
  recommended_control: string;
  human_approval_required: boolean;
}

export interface AuditRun {
  run_id: string;
  timestamp: string;
  mode: "local" | "foundry";
  tool_name: string;
  decision_id?: string;
  evidence_count: number;
  unsupported_dropped: number;
  reliability_score?: number;
  latency_ms?: number;
  result_summary: string;
  citations: Citation[];
  safe_for_export: boolean;
}

export interface TrustStackModule {
  module_id: string;
  name: string;
  category:
    | "policy"
    | "lineage"
    | "observability"
    | "evaluation"
    | "identity"
    | "grounding";
  role: string;
  integration_status:
    | "implemented"
    | "adapter_contract"
    | "documented_path";
  why_it_matters: string;
  evidence_in_repo: string[];
}

export interface EnterpriseReadiness {
  platform_positioning: string;
  adoption_flow: string[];
  readiness_score: number;
  production_gaps: string[];
  implemented_capabilities: string[];
  required_for_real_tenant: string[];
  trust_stack: TrustStackModule[];
  next_steps: string[];
}

export interface GovernancePolicyEvaluation {
  decision_id: string;
  triggered_policies: GovernancePolicy[];
  blocked_recommendation: boolean;
  human_approval_required: boolean;
  explanation: string;
  citations: Citation[];
}

export interface EnterpriseData {
  readiness: EnterpriseReadiness;
  registry: DecisionRegistryEntry[];
  connectors: IngestionConnector[];
  policies: GovernancePolicy[];
  auditRuns: AuditRun[];
  trustStack: TrustStackModule[];
  policyEvaluation: GovernancePolicyEvaluation;
}

export type EnterpriseImplementationStatus =
  | "implemented"
  | "adapter_contract"
  | "documented_path"
  | "production_pending";

export interface EnterpriseCockpitData {
  organization_name: string;
  mode: "synthetic-demo" | "tenant-ready";
  decisions_analyzed: number;
  open_live_forks: number;
  governance_blocks: number;
  total_avoidable_exposure_usd: number;
  average_branch_reliability: number;
  top_blind_spot: string;
  risk_by_business_unit: Array<{
    business_unit: string;
    decisions: number;
    open_live_forks: number;
    governance_blocks: number;
    exposure_usd: number;
    risk_level: DecisionRiskLevel;
  }>;
  recent_agent_runs: Array<{
    run_id: string;
    tool_name: string;
    decision_id?: string;
    result_summary: string;
    evidence_count: number;
    status: "completed";
  }>;
  recommended_next_actions: string[];
}

export interface ConnectorReadiness {
  connector_id: string;
  name: string;
  status: EnterpriseImplementationStatus;
  summary: string;
  data_contract: string[];
}

export interface DeploymentFootprint {
  architecture_mode: "tenant-ready";
  runtime: string;
  grounding: string;
  agent_channel: string;
  web_experience: string;
  components: Array<{
    component_id: string;
    name: string;
    status: EnterpriseImplementationStatus;
    current_state: string;
    production_requirement: string;
  }>;
  connector_readiness: ConnectorReadiness[];
}

export interface SupportedChannel {
  channel_id: string;
  name: string;
  status: EnterpriseImplementationStatus;
  usage: string;
}

export interface EnterpriseOnboardingData {
  headline: string;
  adoption_stages: Array<{
    stage_id: string;
    title: string;
    summary: string;
    status: EnterpriseImplementationStatus;
  }>;
  supported_channels: SupportedChannel[];
  evidence_sources: Array<{
    source_id: string;
    name: string;
    examples: string[];
    status: EnterpriseImplementationStatus;
  }>;
  required_customer_inputs: string[];
  generated_outputs: string[];
  production_requirements: string[];
  demo_limitations: string[];
}

export type EvidenceGraphNodeType =
  | "decision"
  | "premise"
  | "evidence"
  | "person_role"
  | "outcome"
  | "cost"
  | "policy"
  | "connector";

export interface EvidenceGraphNode {
  id: string;
  label: string;
  type: EvidenceGraphNodeType;
  detail: string;
  source_id?: string;
}

export interface EvidenceGraphEdge {
  id: string;
  source: string;
  target: string;
  relation:
    | "rests_on"
    | "contradicts"
    | "read_by"
    | "missed_by"
    | "caused"
    | "priced_by"
    | "blocked_by"
    | "grounded_in"
    | "imported_from";
}

export interface DecisionNetworkData {
  decision_id: string;
  title: string;
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
}

export interface CockpitData {
  cockpit: EnterpriseCockpitData;
  onboarding: EnterpriseOnboardingData;
  evidenceGraph: DecisionNetworkData;
  deployment: DeploymentFootprint;
  channels: SupportedChannel[];
}
