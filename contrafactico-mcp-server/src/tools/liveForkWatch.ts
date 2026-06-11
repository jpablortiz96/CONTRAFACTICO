import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  LiveForkWatchInputSchema,
  LiveForkWatchOutputSchema,
} from "../schemas/index.js";
import { liveForkWatchCore } from "../services/decisionAnalysis.js";

export function registerLiveForkWatchTool(server: McpServer): void {
  server.registerTool(
    "live_fork_watch",
    {
      title: "Live Fork Watch",
      description:
        "Detect low-readership evidence that contradicts a pending decision premise.",
      inputSchema: LiveForkWatchInputSchema,
      outputSchema: LiveForkWatchOutputSchema,
    },
    async ({ pending_decision_id }) => {
      const structuredContent = LiveForkWatchOutputSchema.parse(
        await liveForkWatchCore(pending_decision_id),
      );

      return {
        content: [
          {
            type: "text",
            text: structuredContent.alert
              ? `Fork alert raised for ${pending_decision_id}.`
              : `No fork alert raised for ${pending_decision_id}.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
