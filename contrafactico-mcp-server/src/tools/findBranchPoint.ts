import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  EmptyToolInputSchema,
  PlaceholderToolOutputSchema,
  type PlaceholderToolOutput,
} from "../schemas/index.js";

export function registerFindBranchPointTool(server: McpServer): void {
  server.registerTool(
    "find_branch_point",
    {
      title: "Find Branch Point",
      description: "Find where a contradicting fact became invisible.",
      inputSchema: EmptyToolInputSchema,
      outputSchema: PlaceholderToolOutputSchema,
    },
    async () => {
      const structuredContent: PlaceholderToolOutput = {
        status: "not_implemented",
        tool: "find_branch_point",
        message: "Branch point analysis is not implemented in Step 0.",
      };

      return {
        content: [{ type: "text", text: structuredContent.message }],
        structuredContent,
      };
    },
  );
}
