import {
  getBooleanEnv,
  getEnv,
} from "./env.js";

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

export function getDemoStatus(): DemoStatusResponse {
  const useLocalCorpus = getBooleanEnv("USE_LOCAL_CORPUS", true);

  return {
    ok: true,
    evidence_mode: useLocalCorpus ? "local" : "foundry",
    evidence_label: useLocalCorpus
      ? "Local Evidence Mode"
      : "Foundry IQ Grounded Mode",
    microsoft_iq: useLocalCorpus ? null : "Foundry IQ",
    knowledge_base: useLocalCorpus
      ? null
      : (getEnv("SEARCH_KB_NAME") ?? null),
    citations_required: true,
    generated_at: new Date().toISOString(),
  };
}
