import {
  getBooleanEnv,
  requireEnv,
} from "./services/env.js";
import { retrieveGrounded } from "./services/foundryIq.js";

const smokeQuery =
  "Find the X-200 supplier delay artifact and cite the evidence that the batch would not arrive before April.";

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

  const firstCitation = result.citations[0];
  if (firstCitation !== undefined) {
    console.log(
      `First citation: ${firstCitation.source_id} | ${firstCitation.title}`,
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
