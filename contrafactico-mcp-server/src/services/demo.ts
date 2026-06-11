import type { Citation } from "../types.js";
import {
  findBranchPointCore,
  liveForkWatchCore,
  priceTheGapCore,
  rewindDecisionCore,
  simulateCounterfactualCore,
  type FindBranchPointResult,
  type LiveForkWatchResult,
  type PriceTheGapResult,
  type RewindDecisionResult,
  type SimulateCounterfactualResult,
} from "./decisionAnalysis.js";
import {
  citationForArtifact,
  getEvent,
  readArtifactMarkdown,
} from "./localCorpus.js";

export interface DemoAnalysisResponse {
  decision_id: string;
  rewind: RewindDecisionResult;
  fork: FindBranchPointResult;
  simulation: SimulateCounterfactualResult;
  gap: PriceTheGapResult;
  citations: Citation[];
  generated_at: string;
}

export interface DemoLiveForkResponse {
  pending_decision_id: string;
  live_fork: LiveForkWatchResult;
  generated_at: string;
}

export interface DemoSourceResponse {
  source_id: string;
  markdown: string;
  citation_preview: Citation;
}

function deduplicateCitations(citations: Citation[]): Citation[] {
  const bySourceId = new Map<string, Citation>();
  for (const citation of citations) {
    if (!bySourceId.has(citation.source_id)) {
      bySourceId.set(citation.source_id, citation);
    }
  }
  return Array.from(bySourceId.values());
}

export async function getDemoAnalysis(
  decisionId: string,
): Promise<DemoAnalysisResponse> {
  const [rewind, fork, gap] = await Promise.all([
    rewindDecisionCore(decisionId),
    findBranchPointCore(decisionId),
    priceTheGapCore(decisionId),
  ]);
  const simulation = await simulateCounterfactualCore(
    decisionId,
    fork.fork_event.id,
  );

  return {
    decision_id: decisionId,
    rewind,
    fork,
    simulation,
    gap,
    citations: deduplicateCitations([
      ...rewind.citations,
      fork.citation,
      ...gap.citations,
    ]),
    generated_at: new Date().toISOString(),
  };
}

export async function getDemoLiveFork(
  pendingDecisionId: string,
): Promise<DemoLiveForkResponse> {
  return {
    pending_decision_id: pendingDecisionId,
    live_fork: await liveForkWatchCore(pendingDecisionId),
    generated_at: new Date().toISOString(),
  };
}

export async function getDemoSource(
  sourceId: string,
): Promise<DemoSourceResponse | undefined> {
  const artifact = await getEvent(sourceId);
  if (artifact === undefined) {
    return undefined;
  }

  return {
    source_id: sourceId,
    markdown: await readArtifactMarkdown(sourceId),
    citation_preview: citationForArtifact(artifact),
  };
}
