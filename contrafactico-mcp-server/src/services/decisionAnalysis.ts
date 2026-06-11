import type {
  Artifact,
  BranchNode,
  Citation,
  Decision,
  TimelineNode,
} from "../types.js";
import {
  citationForArtifact,
  getDecision,
  getEvent,
  loadEvents,
} from "./localCorpus.js";

export interface RewindDecisionResult {
  decision: Decision;
  timeline: TimelineNode[];
  citations: Citation[];
}

export interface Readership {
  reader_count: number;
  intended_count: number;
  ratio: number;
}

export interface FindBranchPointResult {
  fork_event: Artifact;
  contradicted_premise: string;
  readership: Readership;
  contradiction_strength: number;
  criticality: number;
  citation: Citation;
}

export interface DroppedUnsupportedNode {
  claim: string;
  reason: string;
}

export interface SimulateCounterfactualResult {
  branches: {
    real: BranchNode[];
    counterfactual: BranchNode[];
  };
  reasoning_steps: string[];
  dropped_unsupported: DroppedUnsupportedNode[];
}

export interface PriceTheGapResult {
  real_cost: number;
  counterfactual_cost: number;
  delta_usd: number;
  citations: Citation[];
}

export interface LiveForkSignature {
  contradicted_premise: string;
  readership_ratio: number;
  contradiction_strength: number;
  criticality: number;
}

export interface LiveForkWatchResult {
  alert: boolean;
  matched_signature: LiveForkSignature;
  pending_decision: Decision;
  citation: Citation;
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

function summarize(artifact: Artifact): string {
  return citationForArtifact(artifact).span;
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function readershipFor(artifact: Artifact): Readership {
  const intendedCount = artifact.intended_audience.length;
  const ratio =
    intendedCount === 0 ? 0 : artifact.readers.length / intendedCount;

  return {
    reader_count: artifact.readers.length,
    intended_count: intendedCount,
    ratio: round(ratio),
  };
}

function contradictionFor(
  artifact: Artifact,
  decision: Decision,
): string | undefined {
  return artifact.contradicts.find((premise) =>
    decision.premises.includes(premise),
  );
}

function parseUsdAmount(body: string): number {
  const match = body.match(/\$(\d{1,3}(?:,\d{3})*)\s*USD/i);
  if (match?.[1] === undefined) {
    return 0;
  }
  return Number(match[1].replaceAll(",", ""));
}

function branchNode(
  id: string,
  label: string,
  timestamp: string,
  citation: Citation,
): BranchNode {
  return {
    id,
    label,
    timestamp,
    fact: true,
    citation_ref: citation.ref_id,
  };
}

async function requireDecision(decisionId: string): Promise<Decision> {
  return requireValue(
    await getDecision(decisionId),
    `Decision not found: ${decisionId}`,
  );
}

async function requireEvent(eventId: string): Promise<Artifact> {
  return requireValue(await getEvent(eventId), `Event not found: ${eventId}`);
}

export async function rewindDecisionCore(
  decisionId: string,
): Promise<RewindDecisionResult> {
  const [decision, events] = await Promise.all([
    requireDecision(decisionId),
    loadEvents(),
  ]);
  const relatedEvents = events
    .filter((event) => event.related_decision_ids.includes(decisionId))
    .sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) ||
        left.id.localeCompare(right.id),
    );
  const citations = relatedEvents.map((event) =>
    citationForArtifact(event, decision.statement),
  );
  const citationBySource = new Map(
    citations.map((citation) => [citation.source_id, citation]),
  );
  const timeline = relatedEvents.map((event): TimelineNode => {
    const citation = requireValue(
      citationBySource.get(event.id),
      `Citation missing for ${event.id}`,
    );

    return {
      source_id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      title: event.title,
      summary: summarize(event),
      citation_ref: citation.ref_id,
    };
  });

  return { decision, timeline, citations };
}

export async function findBranchPointCore(
  decisionId: string,
): Promise<FindBranchPointResult> {
  const [decision, events] = await Promise.all([
    requireDecision(decisionId),
    loadEvents(),
  ]);
  const candidates = events
    .map((artifact) => {
      const contradictedPremise = contradictionFor(artifact, decision);
      if (
        contradictedPremise === undefined ||
        !artifact.related_decision_ids.includes(decisionId)
      ) {
        return undefined;
      }

      const readership = readershipFor(artifact);
      const contradictionStrength = 0.95;
      return {
        artifact,
        contradictedPremise,
        readership,
        contradictionStrength,
        criticality: round(
          contradictionStrength * (1 - readership.ratio),
        ),
      };
    })
    .filter((candidate) => candidate !== undefined)
    .sort(
      (left, right) =>
        right.criticality - left.criticality ||
        left.artifact.timestamp.localeCompare(right.artifact.timestamp) ||
        left.artifact.id.localeCompare(right.artifact.id),
    );
  const top = requireValue(
    candidates[0],
    `No contradicting artifact found for decision: ${decisionId}`,
  );

  return {
    fork_event: top.artifact,
    contradicted_premise: top.contradictedPremise,
    readership: top.readership,
    contradiction_strength: top.contradictionStrength,
    criticality: top.criticality,
    citation: citationForArtifact(
      top.artifact,
      top.contradictedPremise,
    ),
  };
}

export async function simulateCounterfactualCore(
  decisionId: string,
  forkSourceId: string,
): Promise<SimulateCounterfactualResult> {
  if (
    decisionId !== "dec_x200_march" ||
    forkSourceId !== "evt_feb14_supplier"
  ) {
    throw new Error(
      "Step 1A simulation is available for dec_x200_march with evt_feb14_supplier.",
    );
  }

  const [decisionEvent, forkEvent, stockoutEvent, returnsEvent, capacityEvent] =
    await Promise.all([
      requireEvent("dec_x200_march"),
      requireEvent("evt_feb14_supplier"),
      requireEvent("evt_mar08_stockout"),
      requireEvent("evt_mar31_returns"),
      requireEvent("evt_apr_capacity"),
    ]);
  const decisionCitation = citationForArtifact(decisionEvent, "March launch");
  const forkCitation = citationForArtifact(forkEvent, "NOT arrive before April");
  const stockoutCitation = citationForArtifact(
    stockoutEvent,
    "stocked out replacement units",
  );
  const returnsCitation = citationForArtifact(returnsEvent, "$80,000 USD");
  const capacityCitation = citationForArtifact(
    capacityEvent,
    "April capacity returns avoided",
  );
  const proposedNodes = [
    {
      claim: "An April launch would have created $250,000 USD in new revenue.",
      supported: false,
      reason: "No corpus artifact supports an incremental revenue amount.",
    },
  ];

  return {
    branches: {
      real: [
        branchNode(
          "real_march_launch",
          "March launch approved",
          decisionEvent.timestamp,
          decisionCitation,
        ),
        branchNode(
          "real_stockout",
          "Launch inventory stocked out and replacements were unavailable",
          stockoutEvent.timestamp,
          stockoutCitation,
        ),
        branchNode(
          "real_returns",
          "Customer returns reached $80,000 USD",
          returnsEvent.timestamp,
          returnsCitation,
        ),
      ],
      counterfactual: [
        branchNode(
          "counterfactual_delay_seen",
          "Supplier delay is seen before the launch greenlight",
          forkEvent.timestamp,
          forkCitation,
        ),
        branchNode(
          "counterfactual_escalation",
          "The launch date is escalated for review",
          forkEvent.timestamp,
          forkCitation,
        ),
        branchNode(
          "counterfactual_april_launch",
          "Launch moves to available April assembly capacity",
          capacityEvent.timestamp,
          capacityCitation,
        ),
        branchNode(
          "counterfactual_returns_avoided",
          "Replacement inventory is staged and stockout-related returns are avoided",
          capacityEvent.timestamp,
          capacityCitation,
        ),
      ],
    },
    reasoning_steps: [
      "The supplier delay directly contradicts the on-time delivery premise.",
      "The unread contradiction existed before the March launch decision.",
      "The April capacity memo supports a delayed launch with replacement inventory.",
      "Only corpus-supported facts are retained as branch nodes.",
    ],
    dropped_unsupported: proposedNodes
      .filter((node) => !node.supported)
      .map(({ claim, reason }) => ({ claim, reason })),
  };
}

export async function priceTheGapCore(
  decisionId: string,
): Promise<PriceTheGapResult> {
  if (decisionId !== "dec_x200_march") {
    throw new Error(
      "Step 1A gap pricing is available for dec_x200_march.",
    );
  }

  const [returnsEvent, capacityEvent] = await Promise.all([
    requireEvent("evt_mar31_returns"),
    requireEvent("evt_apr_capacity"),
  ]);
  const realCost = parseUsdAmount(returnsEvent.body);
  const counterfactualCost = capacityEvent.body.includes(
    "returns would likely have been avoided",
  )
    ? 0
    : realCost;

  return {
    real_cost: realCost,
    counterfactual_cost: counterfactualCost,
    delta_usd: realCost - counterfactualCost,
    citations: [
      citationForArtifact(returnsEvent, "$80,000 USD"),
      citationForArtifact(capacityEvent, "returns avoided"),
    ],
  };
}

export async function liveForkWatchCore(
  pendingDecisionId: string,
): Promise<LiveForkWatchResult> {
  const decision = await requireDecision(pendingDecisionId);
  if (decision.status !== "pending") {
    throw new Error(`Decision is not pending: ${pendingDecisionId}`);
  }

  const branchPoint = await findBranchPointCore(pendingDecisionId);

  return {
    alert: branchPoint.criticality >= 0.7,
    matched_signature: {
      contradicted_premise: branchPoint.contradicted_premise,
      readership_ratio: branchPoint.readership.ratio,
      contradiction_strength: branchPoint.contradiction_strength,
      criticality: branchPoint.criticality,
    },
    pending_decision: decision,
    citation: branchPoint.citation,
  };
}
