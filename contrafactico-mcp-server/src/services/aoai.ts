export interface SimulationRequest {
  decisionId: string;
  branchPointId: string;
}

export class AzureOpenAiService {
  public async simulate(request: SimulationRequest): Promise<string> {
    void request;
    return Promise.resolve("Simulation is not implemented in Step 0.");
  }
}
