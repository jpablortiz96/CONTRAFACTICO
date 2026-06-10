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
    status: z.enum(["approved", "pending"]).optional(),
  })
  .strict();

export const DecisionSchema = ArtifactSchema.extend({
  type: z.literal("decision"),
  statement: z.string().min(1),
  premises: z.array(z.string().min(1)),
  status: z.enum(["approved", "pending"]),
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
