import {
  getBooleanEnv,
  getEnv,
} from "./env.js";
import type { RuntimeConfig } from "./config.js";

export type EvidenceMode = "foundry" | "local";

export interface DemoStatusResponse {
  ok: true;
  evidence_mode: EvidenceMode;
  evidence_label: "Foundry IQ Grounded Mode" | "Local Evidence Mode";
  microsoft_iq: "Foundry IQ" | null;
  knowledge_base: string | null;
  citations_required: true;
  generated_at: string;
}

export function getDemoStatus(
  config?: Pick<
    RuntimeConfig,
    "searchKnowledgeBaseName" | "useLocalCorpus"
  >,
): DemoStatusResponse {
  const useLocalCorpus =
    config?.useLocalCorpus ?? getBooleanEnv("USE_LOCAL_CORPUS", true);
  const knowledgeBase =
    config?.searchKnowledgeBaseName ?? getEnv("SEARCH_KB_NAME");

  return {
    ok: true,
    evidence_mode: useLocalCorpus ? "local" : "foundry",
    evidence_label: useLocalCorpus
      ? "Local Evidence Mode"
      : "Foundry IQ Grounded Mode",
    microsoft_iq: useLocalCorpus ? null : "Foundry IQ",
    knowledge_base: useLocalCorpus
      ? null
      : (knowledgeBase ?? null),
    citations_required: true,
    generated_at: new Date().toISOString(),
  };
}
