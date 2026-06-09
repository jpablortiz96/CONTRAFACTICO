import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  EmptyToolInputSchema,
  PlaceholderToolOutputSchema,
  type PlaceholderToolOutput,
} from "../schemas/index.js";

export function registerRewindDecisionTool(server: McpServer): void {
  server.registerTool(
    "rewind_decision",
    {
      title: "Rewind Decision",
      description: "Reconstruct the evidence and context around a decision.",
      inputSchema: EmptyToolInputSchema,
      outputSchema: PlaceholderToolOutputSchema,
    },
    async () => {
      const structuredContent: PlaceholderToolOutput = {
        status: "not_implemented",
        tool: "rewind_decision",
        message: "Decision rewind is not implemented in Step 0.",
      };

      return {
        content: [{ type: "text", text: structuredContent.message }],
        structuredContent,
      };
    },
  );
}
