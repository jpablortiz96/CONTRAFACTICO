import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  ScoreBranchReliabilityInputSchema,
  ScoreBranchReliabilityOutputSchema,
} from "../schemas/index.js";
import { scoreBranchReliabilityCore } from "../services/reliability.js";

export function registerScoreBranchReliabilityTool(
  server: McpServer,
): void {
  server.registerTool(
    "score_branch_reliability",
    {
      title: "Score Branch Reliability",
      description:
        "Scores how evidence-backed a counterfactual branch is, exposing unsupported claims dropped by the engine.",
      inputSchema: ScoreBranchReliabilityInputSchema,
      outputSchema: ScoreBranchReliabilityOutputSchema,
    },
    async ({ decision_id, fork_source_id }) => {
      const structuredContent = ScoreBranchReliabilityOutputSchema.parse(
        await scoreBranchReliabilityCore(decision_id, fork_source_id),
      );

      return {
        content: [
          {
            type: "text",
            text: `Branch reliability is ${structuredContent.score}% (${structuredContent.label}).`,
          },
        ],
        structuredContent,
      };
    },
  );
}
