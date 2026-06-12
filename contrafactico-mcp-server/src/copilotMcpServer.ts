import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import { serviceMetadata } from "./constants.js";
import {
  findBranchPointCore,
  liveForkWatchCore,
  rewindDecisionCore,
} from "./services/decisionAnalysis.js";
import {
  evaluateGovernancePolicyCore,
  getEnterpriseReadinessCore,
} from "./services/enterprise.js";

const DecisionInputSchema = z
  .object({
    decision_id: z.string().min(1),
  })
  .strict();

const PendingDecisionInputSchema = z
  .object({
    pending_decision_id: z.string().min(1),
  })
  .strict();

const EmptyInputSchema = z.object({}).strict();

const RewindDecisionSummaryOutputSchema = z
  .object({
    decision_id: z.string().min(1),
    statement: z.string().min(1),
    status: z.string().min(1),
    timeline_event_count: z.number().int().nonnegative(),
    summary: z.string().min(1),
    timeline_titles: z.array(z.string().min(1)),
    citation_source_ids: z.array(z.string().min(1)),
  })
  .strict();

const DetectLiveForkOutputSchema = z
  .object({
    pending_decision_id: z.string().min(1),
    alert: z.boolean(),
    contradicted_premise: z.string().min(1),
    reader_count: z.number().int().nonnegative(),
    intended_reader_count: z.number().int().nonnegative(),
    readership_ratio: z.number().min(0).max(1),
    criticality: z.number().min(0).max(1),
    summary: z.string().min(1),
    citation_source_ids: z.array(z.string().min(1)),
  })
  .strict();

const EnterpriseReadinessOutputSchema = z
  .object({
    readiness_score: z.number().min(0).max(100),
    platform_positioning: z.string().min(1),
    production_gap_count: z.number().int().nonnegative(),
    production_gaps: z.array(z.string().min(1)),
    implemented_capabilities: z.array(z.string().min(1)),
    next_steps: z.array(z.string().min(1)),
  })
  .strict();

const DecisionGovernanceOutputSchema = z
  .object({
    decision_id: z.string().min(1),
    blocked_recommendation: z.boolean(),
    human_approval_required: z.boolean(),
    explanation: z.string().min(1),
    triggered_policy_titles: z.array(z.string().min(1)),
    citation_source_ids: z.array(z.string().min(1)),
  })
  .strict();

export const copilotToolNames = [
  "rewind_decision_summary",
  "detect_live_fork",
  "analyze_enterprise_readiness",
  "evaluate_decision_governance",
] as const;

export function createCopilotMcpServer(): McpServer {
  const server = new McpServer({
    name: `${serviceMetadata.name}-copilot`,
    version: serviceMetadata.version,
  });

  server.registerTool(
    "rewind_decision_summary",
    {
      title: "Rewind Decision Summary",
      description:
        "Summarizes the cited evidence timeline for an organizational decision.",
      inputSchema: DecisionInputSchema,
      outputSchema: RewindDecisionSummaryOutputSchema,
    },
    async ({ decision_id }) => {
      const rewind = await rewindDecisionCore(decision_id);
      const structuredContent =
        RewindDecisionSummaryOutputSchema.parse({
          decision_id,
          statement: rewind.decision.statement,
          status: rewind.decision.status,
          timeline_event_count: rewind.timeline.length,
          summary: `Reconstructed ${rewind.timeline.length} cited timeline artifacts for ${decision_id}.`,
          timeline_titles: rewind.timeline.map((event) => event.title),
          citation_source_ids: rewind.citations.map(
            (citation) => citation.source_id,
          ),
        });

      return {
        content: [{ type: "text", text: structuredContent.summary }],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "detect_live_fork",
    {
      title: "Detect Live Fork",
      description:
        "Detects low-readership evidence that contradicts a pending decision premise.",
      inputSchema: PendingDecisionInputSchema,
      outputSchema: DetectLiveForkOutputSchema,
    },
    async ({ pending_decision_id }) => {
      const [watch, branchPoint] = await Promise.all([
        liveForkWatchCore(pending_decision_id),
        findBranchPointCore(pending_decision_id),
      ]);
      const structuredContent = DetectLiveForkOutputSchema.parse({
        pending_decision_id,
        alert: watch.alert,
        contradicted_premise:
          watch.matched_signature.contradicted_premise,
        reader_count: branchPoint.readership.reader_count,
        intended_reader_count: branchPoint.readership.intended_count,
        readership_ratio: branchPoint.readership.ratio,
        criticality: watch.matched_signature.criticality,
        summary: watch.alert
          ? `Same fork signature detected for ${pending_decision_id}.`
          : `No live fork alert detected for ${pending_decision_id}.`,
        citation_source_ids: [watch.citation.source_id],
      });

      return {
        content: [{ type: "text", text: structuredContent.summary }],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "analyze_enterprise_readiness",
    {
      title: "Analyze Enterprise Readiness",
      description:
        "Returns a flat summary of enterprise readiness and remaining production gaps.",
      inputSchema: EmptyInputSchema,
      outputSchema: EnterpriseReadinessOutputSchema,
    },
    async () => {
      const readiness = getEnterpriseReadinessCore();
      const structuredContent = EnterpriseReadinessOutputSchema.parse({
        readiness_score: readiness.readiness_score,
        platform_positioning: readiness.platform_positioning,
        production_gap_count: readiness.production_gaps.length,
        production_gaps: readiness.production_gaps,
        implemented_capabilities: readiness.implemented_capabilities,
        next_steps: readiness.next_steps,
      });

      return {
        content: [
          {
            type: "text",
            text: `Enterprise readiness is ${structuredContent.readiness_score}% with ${structuredContent.production_gap_count} explicit production gaps.`,
          },
        ],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "evaluate_decision_governance",
    {
      title: "Evaluate Decision Governance",
      description:
        "Evaluates deterministic governance controls for a decision.",
      inputSchema: DecisionInputSchema,
      outputSchema: DecisionGovernanceOutputSchema,
    },
    async ({ decision_id }) => {
      const evaluation = await evaluateGovernancePolicyCore(decision_id);
      const structuredContent = DecisionGovernanceOutputSchema.parse({
        decision_id,
        blocked_recommendation: evaluation.blocked_recommendation,
        human_approval_required:
          evaluation.human_approval_required,
        explanation: evaluation.explanation,
        triggered_policy_titles: evaluation.triggered_policies.map(
          (policy) => policy.title,
        ),
        citation_source_ids: evaluation.citations.map(
          (citation) => citation.source_id,
        ),
      });

      return {
        content: [
          {
            type: "text",
            text: structuredContent.blocked_recommendation
              ? `${decision_id} requires human approval before the recommendation proceeds.`
              : `${decision_id} does not trigger the configured governance policy.`,
          },
        ],
        structuredContent,
      };
    },
  );

  return server;
}
