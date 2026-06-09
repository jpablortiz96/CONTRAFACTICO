import type { Artifact } from "../types.js";

export interface FoundryIqQuery {
  query: string;
  limit?: number;
}

export class FoundryIqService {
  public async search(query: FoundryIqQuery): Promise<Artifact[]> {
    void query;
    return Promise.resolve([]);
  }
}
