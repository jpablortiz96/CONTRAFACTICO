import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  SimulateCounterfactualInputSchema,
  SimulateCounterfactualOutputSchema,
} from "../schemas/index.js";
import { simulateCounterfactual } from "../services/decisionAnalysis.js";

export function registerSimulateCounterfactualTool(server: McpServer): void {
  server.registerTool(
    "simulate_counterfactual",
    {
      title: "Simulate Counterfactual",
      description:
        "Build cited real and counterfactual branches from a verified fork event.",
      inputSchema: SimulateCounterfactualInputSchema,
      outputSchema: SimulateCounterfactualOutputSchema,
    },
    async ({ decision_id, fork_source_id }) => {
      const structuredContent = SimulateCounterfactualOutputSchema.parse(
        await simulateCounterfactual(decision_id, fork_source_id),
      );

      return {
        content: [
          {
            type: "text",
            text: `Built ${structuredContent.branches.real.length} real and ${structuredContent.branches.counterfactual.length} counterfactual cited nodes.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
