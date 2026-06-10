import { config } from "../constants.js";
import type { RetrieveResult } from "../types.js";
import { retrieveLocalGrounded } from "./localCorpus.js";

export interface FoundryIqQuery {
  query: string;
  limit?: number;
}

export class FoundryIqService {
  public async search(request: FoundryIqQuery): Promise<RetrieveResult> {
    if (config.useLocalCorpus) {
      return retrieveLocalGrounded(request.query);
    }

    return this.searchFoundryIq(request);
  }

  private async searchFoundryIq(
    request: FoundryIqQuery,
  ): Promise<RetrieveResult> {
    void request;
    throw new Error(
      "Foundry IQ retrieval is not configured in Step 1A. Set USE_LOCAL_CORPUS=true for local retrieval.",
    );
  }
}
