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
