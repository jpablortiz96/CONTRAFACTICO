export interface Citation {
  sourceId: string;
  title: string;
  url?: string;
  excerpt?: string;
}

export interface Artifact {
  id: string;
  title: string;
  content: string;
  citations: Citation[];
}

export interface Decision {
  id: string;
  title: string;
  summary: string;
  decidedAt: string;
  owner?: string;
  artifactIds: string[];
}

export interface TimelineNode {
  id: string;
  label: string;
  occurredAt: string;
  kind: "event" | "decision" | "branch";
  parentId?: string;
  actual: boolean;
  deltaUsd?: number;
}

export interface ToolResponse<
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  summary: string;
  data: TData;
  citations: Citation[];
}
