import type { Artifact, Citation, Decision } from "../types.js";
import {
  citationForArtifact,
  loadDecisions,
  loadEvents,
} from "./localCorpus.js";

export interface ForkFingerprintResult {
  pattern_name: string;
  summary: string;
  recurring_signature: string[];
  decisions_analyzed: number;
  repeated_in_decisions: string[];
  average_readership_ratio: number;
  total_avoidable_exposure_usd: number;
  top_blind_spot: string;
  evidence: Citation[];
  recommendations: string[];
}

interface DetectedPattern {
  decision: Decision;
  fork: Artifact;
  cost: Artifact;
  readershipRatio: number;
  avoidableExposureUsd: number;
}

const preferredDecisionOrder = [
  "dec_x200_march",
  "dec_q4_packaging_rush",
  "dec_south_region_rollout",
];

function parseUsdAmount(body: string): number {
  const match = body.match(/\$(\d{1,3}(?:,\d{3})*)\s*USD/i);
  return match?.[1] === undefined
    ? 0
    : Number(match[1].replaceAll(",", ""));
}

function readershipRatio(artifact: Artifact): number {
  return artifact.intended_audience.length === 0
    ? 0
    : artifact.readers.length / artifact.intended_audience.length;
}

function contradictsDecision(
  artifact: Artifact,
  decision: Decision,
): boolean {
  return artifact.contradicts.some((premise) =>
    decision.premises.includes(premise),
  );
}

function findPattern(
  decision: Decision,
  events: Artifact[],
): DetectedPattern | undefined {
  const related = events.filter((event) =>
    event.related_decision_ids.includes(decision.id),
  );
  const fork = related
    .filter(
      (event) =>
        event.timestamp < decision.timestamp &&
        contradictsDecision(event, decision) &&
        readershipRatio(event) < 0.5,
    )
    .sort(
      (left, right) =>
        readershipRatio(left) - readershipRatio(right) ||
        left.timestamp.localeCompare(right.timestamp),
    )[0];
  const cost = related
    .map((event) => ({
      event,
      amount: parseUsdAmount(event.body),
    }))
    .filter(
      ({ event, amount }) =>
        event.timestamp > decision.timestamp && amount > 0,
    )
    .sort(
      (left, right) =>
        right.amount - left.amount ||
        left.event.timestamp.localeCompare(right.event.timestamp),
    )[0];

  if (fork === undefined || cost === undefined) {
    return undefined;
  }

  return {
    decision,
    fork,
    cost: cost.event,
    readershipRatio: readershipRatio(fork),
    avoidableExposureUsd: cost.amount,
  };
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

export async function analyzeForkFingerprintCore(): Promise<ForkFingerprintResult> {
  const [decisions, events] = await Promise.all([
    loadDecisions(),
    loadEvents(),
  ]);
  const historicalDecisions = decisions.filter(
    (decision) => decision.status !== "pending",
  );
  const patterns = historicalDecisions
    .map((decision) => findPattern(decision, events))
    .filter((pattern) => pattern !== undefined)
    .sort(
      (left, right) =>
        preferredDecisionOrder.indexOf(left.decision.id) -
        preferredDecisionOrder.indexOf(right.decision.id),
    );

  if (patterns.length === 0) {
    throw new Error("No recurring fork fingerprint could be grounded.");
  }

  const totalReadership = patterns.reduce(
    (sum, pattern) => sum + pattern.readershipRatio,
    0,
  );
  const evidence = patterns.flatMap((pattern) => [
    citationForArtifact(pattern.fork, pattern.fork.title),
    citationForArtifact(
      pattern.cost,
      `$${pattern.avoidableExposureUsd.toLocaleString("en-US")} USD`,
    ),
  ]);

  return {
    pattern_name: "Invisible supplier and readiness warnings",
    summary:
      "Critical readiness warnings repeatedly reached less than half of the decision group before approval.",
    recurring_signature: [
      "contradicted premise before decision",
      "low readership",
      "downstream avoidable cost",
    ],
    decisions_analyzed: historicalDecisions.length,
    repeated_in_decisions: patterns.map(
      (pattern) => pattern.decision.id,
    ),
    average_readership_ratio: round(totalReadership / patterns.length),
    total_avoidable_exposure_usd: patterns.reduce(
      (sum, pattern) => sum + pattern.avoidableExposureUsd,
      0,
    ),
    top_blind_spot:
      "Readiness evidence is not reaching the full approval group before decisions close.",
    evidence,
    recommendations: [
      "Block final approval when a contradicted premise has unresolved evidence.",
      "Require sign-off from the function that owns the contradicted premise.",
      "Escalate critical artifacts when readership is below 50%.",
      "Add a 24-hour evidence review window before launch decisions.",
    ],
  };
}
