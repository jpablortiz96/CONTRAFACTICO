import { z } from "zod/v4";

export const CitationSchema = z
  .object({
    source_id: z.string().min(1),
    title: z.string().min(1),
    span: z.string().min(1),
    ref_id: z.string().min(1),
  })
  .strict();

const ArtifactTypeSchema = z.enum([
  "chat",
  "decision",
  "document",
  "email",
  "meeting_transcript",
  "memo",
]);

export const ArtifactSchema = z
  .object({
    id: z.string().min(1),
    type: ArtifactTypeSchema,
    timestamp: z.string().min(1),
    author: z.string().min(1),
    intended_audience: z.array(z.string()),
    readers: z.array(z.string()),
    title: z.string().min(1),
    body: z.string().min(1),
    premise_tags: z.array(z.string()),
    contradicts: z.array(z.string()),
    related_decision_ids: z.array(z.string()),
    status: z.enum(["approved", "closed", "pending"]).optional(),
  })
  .strict();

export const DecisionSchema = ArtifactSchema.extend({
  type: z.literal("decision"),
  statement: z.string().min(1),
  premises: z.array(z.string().min(1)),
  status: z.enum(["approved", "closed", "pending"]),
}).strict();

export const TimelineNodeSchema = z
  .object({
    source_id: z.string().min(1),
    type: ArtifactTypeSchema,
    timestamp: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    citation_ref: z.string().min(1),
  })
  .strict();

export const BranchNodeSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    timestamp: z.string().min(1),
    fact: z.literal(true),
    citation_ref: z.string().min(1),
  })
  .strict();

export const RewindDecisionInputSchema = z
  .object({
    decision_id: z.string().min(1),
  })
  .strict();

export const RewindDecisionOutputSchema = z
  .object({
    decision: DecisionSchema,
    timeline: z.array(TimelineNodeSchema),
    citations: z.array(CitationSchema),
  })
  .strict();

export const FindBranchPointInputSchema = z
  .object({
    decision_id: z.string().min(1),
  })
  .strict();

export const FindBranchPointOutputSchema = z
  .object({
    fork_event: ArtifactSchema,
    contradicted_premise: z.string().min(1),
    readership: z
      .object({
        reader_count: z.number().int().nonnegative(),
        intended_count: z.number().int().nonnegative(),
        ratio: z.number().min(0).max(1),
      })
      .strict(),
    contradiction_strength: z.number().min(0).max(1),
    criticality: z.number().min(0).max(1),
    citation: CitationSchema,
  })
  .strict();

export const SimulateCounterfactualInputSchema = z
  .object({
    decision_id: z.string().min(1),
    fork_source_id: z.string().min(1),
  })
  .strict();

export const SimulateCounterfactualOutputSchema = z
  .object({
    branches: z
      .object({
        real: z.array(BranchNodeSchema),
        counterfactual: z.array(BranchNodeSchema),
      })
      .strict(),
    reasoning_steps: z.array(z.string().min(1)),
    dropped_unsupported: z.array(
      z
        .object({
          claim: z.string().min(1),
          reason: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

export const PriceTheGapInputSchema = z
  .object({
    decision_id: z.string().min(1),
  })
  .strict();

export const PriceTheGapOutputSchema = z
  .object({
    real_cost: z.number().nonnegative(),
    counterfactual_cost: z.number().nonnegative(),
    delta_usd: z.number(),
    citations: z.array(CitationSchema),
  })
  .strict();

export const LiveForkWatchInputSchema = z
  .object({
    pending_decision_id: z.string().min(1),
  })
  .strict();

export const LiveForkWatchOutputSchema = z
  .object({
    alert: z.boolean(),
    matched_signature: z
      .object({
        contradicted_premise: z.string().min(1),
        readership_ratio: z.number().min(0).max(1),
        contradiction_strength: z.number().min(0).max(1),
        criticality: z.number().min(0).max(1),
      })
      .strict(),
    pending_decision: DecisionSchema,
    citation: CitationSchema,
  })
  .strict();

export const AnalyzeForkFingerprintInputSchema = z
  .object({
    organization_id: z.string().min(1).optional(),
  })
  .strict();

export const AnalyzeForkFingerprintOutputSchema = z
  .object({
    pattern_name: z.string().min(1),
    summary: z.string().min(1),
    recurring_signature: z.array(z.string().min(1)).min(1),
    decisions_analyzed: z.number().int().nonnegative(),
    repeated_in_decisions: z.array(z.string().min(1)),
    average_readership_ratio: z.number().min(0).max(1),
    total_avoidable_exposure_usd: z.number().nonnegative(),
    top_blind_spot: z.string().min(1),
    evidence: z.array(CitationSchema),
    recommendations: z.array(z.string().min(1)),
  })
  .strict();

export const ScoreBranchReliabilityInputSchema = z
  .object({
    decision_id: z.string().min(1),
    fork_source_id: z.string().min(1),
  })
  .strict();

export const ScoreBranchReliabilityOutputSchema = z
  .object({
    score: z.number().min(0).max(100),
    label: z.string().min(1),
    evidence_backed_nodes: z.number().int().nonnegative(),
    total_nodes: z.number().int().nonnegative(),
    unsupported_dropped: z.number().int().nonnegative(),
    weakest_link: z.string().min(1),
    explanation: z.string().min(1),
    citations: z.array(CitationSchema),
  })
  .strict();

export const DecisionRegistryStatusSchema = z.enum([
  "pending",
  "closed",
  "watching",
]);

export const DecisionRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const DecisionRegistryEntrySchema = z
  .object({
    decision_id: z.string().min(1),
    statement: z.string().min(1),
    owner: z.string().min(1),
    business_unit: z.string().min(1),
    status: DecisionRegistryStatusSchema,
    decided_at: z.string().min(1).optional(),
    expected_impact_usd: z.number().nonnegative().optional(),
    premises: z.array(z.string().min(1)),
    evidence_sources: z.array(z.string().min(1)),
    risk_level: DecisionRiskLevelSchema,
    outcome_summary: z.string().min(1).optional(),
    avoidable_exposure_usd: z.number().nonnegative().optional(),
    last_updated: z.string().min(1),
  })
  .strict();

export const IngestionConnectorSchema = z
  .object({
    connector_id: z.string().min(1),
    name: z.string().min(1),
    category: z.enum([
      "microsoft365",
      "project_management",
      "service_management",
      "data_lake",
      "manual_upload",
      "custom_api",
    ]),
    status: z.enum(["ready", "planned", "adapter_stub"]),
    input_types: z.array(z.string().min(1)),
    maps_to: z.array(z.string().min(1)),
    privacy_notes: z.string().min(1),
    setup_steps: z.array(z.string().min(1)),
  })
  .strict();

export const GovernancePolicySchema = z
  .object({
    policy_id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    severity: DecisionRiskLevelSchema,
    condition_summary: z.string().min(1),
    opa_rego_preview: z.string().min(1),
    example_trigger: z.string().min(1),
    recommended_control: z.string().min(1),
    human_approval_required: z.boolean(),
  })
  .strict();

export const AuditRunSchema = z
  .object({
    run_id: z.string().min(1),
    timestamp: z.string().min(1),
    mode: z.enum(["local", "foundry"]),
    tool_name: z.string().min(1),
    decision_id: z.string().min(1).optional(),
    evidence_count: z.number().int().nonnegative(),
    unsupported_dropped: z.number().int().nonnegative(),
    reliability_score: z.number().min(0).max(100).optional(),
    latency_ms: z.number().nonnegative().optional(),
    result_summary: z.string().min(1),
    citations: z.array(CitationSchema),
    safe_for_export: z.boolean(),
  })
  .strict();

export const TrustStackModuleSchema = z
  .object({
    module_id: z.string().min(1),
    name: z.string().min(1),
    category: z.enum([
      "policy",
      "lineage",
      "observability",
      "evaluation",
      "identity",
      "grounding",
    ]),
    role: z.string().min(1),
    integration_status: z.enum([
      "implemented",
      "adapter_contract",
      "documented_path",
    ]),
    why_it_matters: z.string().min(1),
    evidence_in_repo: z.array(z.string().min(1)),
  })
  .strict();

export const EnterpriseReadinessSchema = z
  .object({
    platform_positioning: z.string().min(1),
    adoption_flow: z.array(z.string().min(1)),
    readiness_score: z.number().min(0).max(100),
    production_gaps: z.array(z.string().min(1)),
    implemented_capabilities: z.array(z.string().min(1)),
    required_for_real_tenant: z.array(z.string().min(1)),
    trust_stack: z.array(TrustStackModuleSchema),
    next_steps: z.array(z.string().min(1)),
  })
  .strict();

export const GovernancePolicyEvaluationSchema = z
  .object({
    decision_id: z.string().min(1),
    triggered_policies: z.array(GovernancePolicySchema),
    blocked_recommendation: z.boolean(),
    human_approval_required: z.boolean(),
    explanation: z.string().min(1),
    citations: z.array(CitationSchema),
  })
  .strict();

export const ListDecisionRegistryInputSchema = z
  .object({
    status: z
      .enum(["pending", "closed", "watching", "all"])
      .optional(),
  })
  .strict();

export const ListDecisionRegistryOutputSchema = z
  .object({
    status_filter: z.enum([
      "pending",
      "closed",
      "watching",
      "all",
    ]),
    count: z.number().int().nonnegative(),
    decisions: z.array(DecisionRegistryEntrySchema),
  })
  .strict();

export const EvaluateGovernancePolicyInputSchema = z
  .object({
    decision_id: z.string().min(1),
  })
  .strict();

export const EvaluateGovernancePolicyOutputSchema =
  GovernancePolicyEvaluationSchema;

export const GetEnterpriseReadinessInputSchema = z.object({}).strict();

export const GetEnterpriseReadinessOutputSchema =
  EnterpriseReadinessSchema;
