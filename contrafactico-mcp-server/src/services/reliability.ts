import type { BranchNode, Citation } from "../types.js";
import {
  rewindDecisionCore,
  simulateCounterfactualCore,
} from "./decisionAnalysis.js";

export interface BranchReliabilityResult {
  score: number;
  label: string;
  evidence_backed_nodes: number;
  total_nodes: number;
  unsupported_dropped: number;
  weakest_link: string;
  explanation: string;
  citations: Citation[];
}

function reliabilityLabel(score: number): string {
  if (score >= 85) {
    return "High confidence";
  }
  if (score >= 70) {
    return "Moderate confidence";
  }
  return "Low confidence";
}

function uniqueCitations(citations: Citation[]): Citation[] {
  const citationsBySource = new Map<string, Citation>();
  for (const citation of citations) {
    if (!citationsBySource.has(citation.source_id)) {
      citationsBySource.set(citation.source_id, citation);
    }
  }
  return [...citationsBySource.values()];
}

function flattenNodes(branches: {
  real: BranchNode[];
  counterfactual: BranchNode[];
}): BranchNode[] {
  return [...branches.real, ...branches.counterfactual];
}

export async function scoreBranchReliabilityCore(
  decisionId: string,
  forkSourceId: string,
): Promise<BranchReliabilityResult> {
  const [simulation, rewind] = await Promise.all([
    simulateCounterfactualCore(decisionId, forkSourceId),
    rewindDecisionCore(decisionId),
  ]);
  const citationsByRef = new Map(
    rewind.citations.map((citation) => [citation.ref_id, citation]),
  );
  const nodes = flattenNodes(simulation.branches);
  const citedNodes = nodes.filter((node) =>
    citationsByRef.has(node.citation_ref),
  );
  const uncitedNodes = nodes.length - citedNodes.length;
  const unsupportedDropped = simulation.dropped_unsupported.length;
  const score = Math.max(
    0,
    Math.min(100, 100 - unsupportedDropped * 8 - uncitedNodes * 5),
  );
  const citations = uniqueCitations(
    citedNodes
      .map((node) => citationsByRef.get(node.citation_ref))
      .filter((citation) => citation !== undefined),
  );
  const citationExplanation =
    uncitedNodes === 0
      ? `${citedNodes.length} of ${nodes.length} branch nodes resolve to direct citations.`
      : `${citedNodes.length} of ${nodes.length} branch nodes resolve to direct citations; ${uncitedNodes} uncited node${uncitedNodes === 1 ? "" : "s"} reduced the score.`;
  const unsupportedExplanation =
    unsupportedDropped === 0
      ? "No unsupported claims were dropped."
      : `${unsupportedDropped} unsupported claim${unsupportedDropped === 1 ? "" : "s"} ${unsupportedDropped === 1 ? "was" : "were"} dropped, reducing the score by ${unsupportedDropped * 8} points.`;

  return {
    score,
    label: reliabilityLabel(score),
    evidence_backed_nodes: citedNodes.length,
    total_nodes: nodes.length,
    unsupported_dropped: unsupportedDropped,
    weakest_link:
      "The zero-return counterfactual depends on April capacity evidence and the absence of March stockout pressure.",
    explanation: `${citationExplanation} ${unsupportedExplanation}`,
    citations,
  };
}
