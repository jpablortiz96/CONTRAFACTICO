export type ArtifactType =
  | "chat"
  | "decision"
  | "document"
  | "email"
  | "meeting_transcript"
  | "memo";

export type DecisionStatus = "approved" | "closed" | "pending";

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
  status?: DecisionStatus;
}

export interface Decision extends Artifact {
  type: "decision";
  statement: string;
  premises: string[];
  status: DecisionStatus;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  employee_count: number;
  industry: string;
  headquarters: string;
}

export interface RetrieveResult {
  answer: string;
  citations: Citation[];
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

export interface ToolResponse<
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  summary: string;
  data: TData;
  citations: Citation[];
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

export type ConnectorCategory =
  | "microsoft365"
  | "project_management"
  | "service_management"
  | "data_lake"
  | "manual_upload"
  | "custom_api";

export type ConnectorStatus = "ready" | "planned" | "adapter_stub";

export interface IngestionConnector {
  connector_id: string;
  name: string;
  category: ConnectorCategory;
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

export type AuditEvidenceMode = "local" | "foundry";

export interface AuditRun {
  run_id: string;
  timestamp: string;
  mode: AuditEvidenceMode;
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

export type TrustStackCategory =
  | "policy"
  | "lineage"
  | "observability"
  | "evaluation"
  | "identity"
  | "grounding";

export type TrustStackIntegrationStatus =
  | "implemented"
  | "adapter_contract"
  | "documented_path";

export interface TrustStackModule {
  module_id: string;
  name: string;
  category: TrustStackCategory;
  role: string;
  integration_status: TrustStackIntegrationStatus;
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

export type EnterpriseImplementationStatus =
  | "implemented"
  | "adapter_contract"
  | "documented_path"
  | "production_pending";

export interface BusinessUnitRisk {
  business_unit: string;
  decisions: number;
  open_live_forks: number;
  governance_blocks: number;
  exposure_usd: number;
  risk_level: DecisionRiskLevel;
}

export interface CockpitAgentRun {
  run_id: string;
  tool_name: string;
  decision_id?: string;
  result_summary: string;
  evidence_count: number;
  status: "completed";
}

export interface EnterpriseCockpit {
  organization_name: string;
  mode: "synthetic-demo" | "tenant-ready";
  decisions_analyzed: number;
  open_live_forks: number;
  governance_blocks: number;
  total_avoidable_exposure_usd: number;
  average_branch_reliability: number;
  top_blind_spot: string;
  risk_by_business_unit: BusinessUnitRisk[];
  recent_agent_runs: CockpitAgentRun[];
  recommended_next_actions: string[];
}

export interface ConnectorReadiness {
  connector_id: string;
  name: string;
  status: EnterpriseImplementationStatus;
  summary: string;
  data_contract: string[];
}

export interface DeploymentComponent {
  component_id: string;
  name: string;
  status: EnterpriseImplementationStatus;
  current_state: string;
  production_requirement: string;
}

export interface DeploymentFootprint {
  architecture_mode: "tenant-ready";
  runtime: string;
  grounding: string;
  agent_channel: string;
  web_experience: string;
  components: DeploymentComponent[];
  connector_readiness: ConnectorReadiness[];
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

export type EvidenceGraphRelation =
  | "rests_on"
  | "contradicts"
  | "read_by"
  | "missed_by"
  | "caused"
  | "priced_by"
  | "blocked_by"
  | "grounded_in"
  | "imported_from";

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
  relation: EvidenceGraphRelation;
}

export interface DecisionNetwork {
  decision_id: string;
  title: string;
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
}

export interface AdoptionStage {
  stage_id: string;
  title: string;
  summary: string;
  status: EnterpriseImplementationStatus;
}

export interface SupportedChannel {
  channel_id: string;
  name: string;
  status: EnterpriseImplementationStatus;
  usage: string;
}

export interface OnboardingEvidenceSource {
  source_id: string;
  name: string;
  examples: string[];
  status: EnterpriseImplementationStatus;
}

export interface EnterpriseOnboarding {
  headline: string;
  adoption_stages: AdoptionStage[];
  supported_channels: SupportedChannel[];
  evidence_sources: OnboardingEvidenceSource[];
  required_customer_inputs: string[];
  generated_outputs: string[];
  production_requirements: string[];
  demo_limitations: string[];
}
