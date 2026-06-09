import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  EmptyToolInputSchema,
  PlaceholderToolOutputSchema,
  type PlaceholderToolOutput,
} from "../schemas/index.js";

export function registerPriceTheGapTool(server: McpServer): void {
  server.registerTool(
    "price_the_gap",
    {
      title: "Price the Gap",
      description: "Estimate the dollar gap between actual and simulated paths.",
      inputSchema: EmptyToolInputSchema,
      outputSchema: PlaceholderToolOutputSchema,
    },
    async () => {
      const structuredContent: PlaceholderToolOutput = {
        status: "not_implemented",
        tool: "price_the_gap",
        message: "Gap pricing is not implemented in Step 0.",
      };

      return {
        content: [{ type: "text", text: structuredContent.message }],
        structuredContent,
      };
    },
  );
}
