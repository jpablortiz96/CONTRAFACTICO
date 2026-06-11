import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  PriceTheGapInputSchema,
  PriceTheGapOutputSchema,
} from "../schemas/index.js";
import { priceTheGapCore } from "../services/decisionAnalysis.js";

export function registerPriceTheGapTool(server: McpServer): void {
  server.registerTool(
    "price_the_gap",
    {
      title: "Price the Gap",
      description:
        "Calculate the cited dollar difference between actual and counterfactual outcomes.",
      inputSchema: PriceTheGapInputSchema,
      outputSchema: PriceTheGapOutputSchema,
    },
    async ({ decision_id }) => {
      const structuredContent = PriceTheGapOutputSchema.parse(
        await priceTheGapCore(decision_id),
      );

      return {
        content: [
          {
            type: "text",
            text: `The cited counterfactual gap is $${structuredContent.delta_usd.toLocaleString("en-US")} USD.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
