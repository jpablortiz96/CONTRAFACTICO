import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  RewindDecisionInputSchema,
  RewindDecisionOutputSchema,
} from "../schemas/index.js";
import { rewindDecisionCore } from "../services/decisionAnalysis.js";

export function registerRewindDecisionTool(server: McpServer): void {
  server.registerTool(
    "rewind_decision",
    {
      title: "Rewind Decision",
      description:
        "Reconstruct the cited evidence timeline around an organizational decision.",
      inputSchema: RewindDecisionInputSchema,
      outputSchema: RewindDecisionOutputSchema,
    },
    async ({ decision_id }) => {
      const structuredContent = RewindDecisionOutputSchema.parse(
        await rewindDecisionCore(decision_id),
      );

      return {
        content: [
          {
            type: "text",
            text: `Reconstructed ${structuredContent.timeline.length} cited timeline artifacts for ${decision_id}.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
