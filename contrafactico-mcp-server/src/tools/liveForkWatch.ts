import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  EmptyToolInputSchema,
  PlaceholderToolOutputSchema,
  type PlaceholderToolOutput,
} from "../schemas/index.js";

export function registerLiveForkWatchTool(server: McpServer): void {
  server.registerTool(
    "live_fork_watch",
    {
      title: "Live Fork Watch",
      description: "Watch for new evidence that could create a decision fork.",
      inputSchema: EmptyToolInputSchema,
      outputSchema: PlaceholderToolOutputSchema,
    },
    async () => {
      const structuredContent: PlaceholderToolOutput = {
        status: "not_implemented",
        tool: "live_fork_watch",
        message: "Live fork monitoring is not implemented in Step 0.",
      };

      return {
        content: [{ type: "text", text: structuredContent.message }],
        structuredContent,
      };
    },
  );
}
