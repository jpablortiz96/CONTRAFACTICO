import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import type { Citation } from "./types.js";
import {
  findBranchPointCore,
  liveForkWatchCore,
  priceTheGapCore,
  rewindDecisionCore,
  simulateCounterfactualCore,
} from "./services/decisionAnalysis.js";
import {
  getArtifactDocumentPath,
  loadCompany,
  loadDecisions,
  loadEvents,
  loadMarkdownArtifacts,
  retrieveLocalGrounded,
} from "./services/localCorpus.js";
import { retrieveGrounded } from "./services/foundryIq.js";

interface CheckResult {
  check: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function record(check: string, detail: string): void {
  results.push({ check, passed: true, detail });
}

async function verifyCitationDocument(citation: Citation): Promise<void> {
  const content = await readFile(
    getArtifactDocumentPath(citation.source_id),
    "utf8",
  );
  assert.ok(
    content.includes(citation.span),
    `Citation span must exist in ${citation.source_id}.md`,
  );
}

async function main(): Promise<void> {
  const [company, decisions, events] = await Promise.all([
    loadCompany(),
    loadDecisions(),
    loadEvents(),
  ]);

  assert.equal(company.name, "Cordillera Components");
  record("company", `${company.name}, ${company.employee_count} employees`);

  assert.equal(decisions.length, 2);
  assert.ok(events.length >= 35);
  const markdownArtifacts = await loadMarkdownArtifacts(events);
  assert.equal(markdownArtifacts.length, events.length);
  record(
    "corpus",
    `${decisions.length} decisions, ${events.length} events, and ${markdownArtifacts.length} markdown documents loaded`,
  );

  const supplierDocument = await readFile(
    getArtifactDocumentPath("evt_feb14_supplier"),
    "utf8",
  );
  assert.ok(
    supplierDocument.includes("The X-200 sensor batch will NOT arrive before April"),
  );
  assert.ok(supplierDocument.includes("**Intended audience count:** 4"));
  assert.ok(supplierDocument.includes("**Readers count:** 0"));
  assert.ok(supplierDocument.includes("**Contradicts:** `supplier_on_time`"));
  record(
    "supplier_document",
    "evt_feb14_supplier.md contains delay, readership, and contradiction evidence",
  );

  const returnsDocument = await readFile(
    getArtifactDocumentPath("evt_mar31_returns"),
    "utf8",
  );
  assert.ok(returnsDocument.includes("$80,000 USD in Q1 returns"));
  record(
    "returns_document",
    "evt_mar31_returns.md contains the Q1 returns cost evidence",
  );

  const rewind = await rewindDecisionCore("dec_x200_march");
  assert.ok(rewind.timeline.length >= 6);
  record(
    "rewind_decision",
    `${rewind.timeline.length} cited timeline events`,
  );

  const fork = await findBranchPointCore("dec_x200_march");
  assert.equal(fork.fork_event.id, "evt_feb14_supplier");
  assert.equal(fork.contradiction_strength, 0.95);
  record(
    "find_branch_point",
    `${fork.fork_event.id}, criticality ${fork.criticality}`,
  );

  const simulation = await simulateCounterfactualCore(
    "dec_x200_march",
    "evt_feb14_supplier",
  );
  assert.ok(simulation.branches.real.length >= 3);
  assert.ok(simulation.branches.counterfactual.length >= 3);
  const factNodes = [
    ...simulation.branches.real,
    ...simulation.branches.counterfactual,
  ].filter((node) => node.fact);
  assert.ok(factNodes.every((node) => node.citation_ref.length > 0));
  assert.ok(simulation.dropped_unsupported.length >= 1);
  record(
    "simulate_counterfactual",
    `${simulation.branches.real.length} real nodes, ${simulation.branches.counterfactual.length} counterfactual nodes, ${simulation.dropped_unsupported.length} unsupported node dropped`,
  );

  const pricing = await priceTheGapCore("dec_x200_march");
  assert.equal(pricing.real_cost, 80_000);
  assert.equal(pricing.counterfactual_cost, 0);
  assert.equal(pricing.delta_usd, 80_000);
  record("price_the_gap", `$${pricing.delta_usd} USD delta`);

  const watch = await liveForkWatchCore("dec_vendor_switch");
  assert.equal(watch.alert, true);
  assert.equal(watch.citation.source_id, "evt_jun07_vendor_validation");
  record(
    "live_fork_watch",
    `alert ${watch.alert} from ${watch.citation.source_id}`,
  );

  const retrieval = await retrieveLocalGrounded(
    "dec_x200_march supplier_on_time delay",
  );
  assert.ok(retrieval.citations.length > 0);
  const returnedCitations = [
    ...rewind.citations,
    fork.citation,
    ...pricing.citations,
    watch.citation,
    ...retrieval.citations,
  ];
  for (const citation of returnedCitations) {
    await verifyCitationDocument(citation);
  }
  record(
    "local_retrieval",
    `${returnedCitations.length} returned citations map to markdown documents with exact spans`,
  );

  const previousLocalMode = process.env.USE_LOCAL_CORPUS;
  process.env.USE_LOCAL_CORPUS = "true";
  try {
    const adapterRetrieval = await retrieveGrounded(
      "evt_feb14_supplier supplier_on_time",
    );
    assert.ok(adapterRetrieval.citations.length > 0);
    assert.equal(
      adapterRetrieval.citations[0]?.source_id,
      "evt_feb14_supplier",
    );
    record(
      "retrieval_adapter",
      "retrieveGrounded uses the local corpus unless USE_LOCAL_CORPUS=false",
    );
  } finally {
    if (previousLocalMode === undefined) {
      delete process.env.USE_LOCAL_CORPUS;
    } else {
      process.env.USE_LOCAL_CORPUS = previousLocalMode;
    }
  }

  for (const result of results) {
    console.log(`PASS ${result.check}: ${result.detail}`);
  }
}

await main();
