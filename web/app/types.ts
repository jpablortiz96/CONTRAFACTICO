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
  status?: "approved" | "pending";
}

export interface Decision extends Artifact {
  type: "decision";
  statement: string;
  premises: string[];
  status: "approved" | "pending";
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
