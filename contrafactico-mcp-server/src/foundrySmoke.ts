import {
  getBooleanEnv,
  requireEnv,
} from "./services/env.js";
import { retrieveGrounded } from "./services/foundryIq.js";

const smokeQuery =
  "Find the X-200 supplier delay artifact and cite the evidence that the batch would not arrive before April.";
const SPAN_PREVIEW_LENGTH = 160;

function spanPreview(span: string): string {
  const normalized = span.replace(/\s+/g, " ").trim();
  if (normalized.length <= SPAN_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, SPAN_PREVIEW_LENGTH - 3)}...`;
}

async function main(): Promise<void> {
  if (getBooleanEnv("USE_LOCAL_CORPUS", true)) {
    throw new Error(
      "check:foundry requires USE_LOCAL_CORPUS=false.",
    );
  }

  requireEnv("SEARCH_ENDPOINT");
  requireEnv("SEARCH_KB_NAME");
  requireEnv("SEARCH_API_KEY");

  const result = await retrieveGrounded(smokeQuery);
  console.log(`Answer length: ${result.answer.length}`);
  console.log(`Citation count: ${result.citations.length}`);

  for (const [index, citation] of result.citations.slice(0, 5).entries()) {
    console.log(
      `Citation ${index + 1}: ` +
        `source_id=${citation.source_id} | ` +
        `title=${citation.title} | ` +
        `span=${spanPreview(citation.span) || "(empty)"}`,
    );
  }

  if (result.citations.length === 0) {
    throw new Error(
      "Foundry IQ smoke test returned no citations.",
    );
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error.";
  console.error(`Foundry IQ smoke test failed: ${message}`);
  process.exitCode = 1;
});
