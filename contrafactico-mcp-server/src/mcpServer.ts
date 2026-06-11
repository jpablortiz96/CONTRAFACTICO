import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { serviceMetadata } from "./constants.js";
import { registerAnalyzeForkFingerprintTool } from "./tools/analyzeForkFingerprint.js";
import { registerFindBranchPointTool } from "./tools/findBranchPoint.js";
import { registerLiveForkWatchTool } from "./tools/liveForkWatch.js";
import { registerPriceTheGapTool } from "./tools/priceTheGap.js";
import { registerRewindDecisionTool } from "./tools/rewindDecision.js";
import { registerScoreBranchReliabilityTool } from "./tools/scoreBranchReliability.js";
import { registerSimulateCounterfactualTool } from "./tools/simulateCounterfactual.js";

export const registeredToolNames = [
  "rewind_decision",
  "find_branch_point",
  "simulate_counterfactual",
  "price_the_gap",
  "live_fork_watch",
  "analyze_fork_fingerprint",
  "score_branch_reliability",
] as const;

export function createMcpServer(): McpServer {
  const server = new McpServer(serviceMetadata);

  registerRewindDecisionTool(server);
  registerFindBranchPointTool(server);
  registerSimulateCounterfactualTool(server);
  registerPriceTheGapTool(server);
  registerLiveForkWatchTool(server);
  registerAnalyzeForkFingerprintTool(server);
  registerScoreBranchReliabilityTool(server);

  return server;
}
