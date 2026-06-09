import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  EmptyToolInputSchema,
  PlaceholderToolOutputSchema,
  type PlaceholderToolOutput,
} from "../schemas/index.js";

export function registerSimulateCounterfactualTool(server: McpServer): void {
  server.registerTool(
    "simulate_counterfactual",
    {
      title: "Simulate Counterfactual",
      description: "Simulate the organizational branch that did not happen.",
      inputSchema: EmptyToolInputSchema,
      outputSchema: PlaceholderToolOutputSchema,
    },
    async () => {
      const structuredContent: PlaceholderToolOutput = {
        status: "not_implemented",
        tool: "simulate_counterfactual",
        message: "Counterfactual simulation is not implemented in Step 0.",
      };

      return {
        content: [{ type: "text", text: structuredContent.message }],
        structuredContent,
      };
    },
  );
}
