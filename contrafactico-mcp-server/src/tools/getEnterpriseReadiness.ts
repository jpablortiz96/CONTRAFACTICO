import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  GetEnterpriseReadinessInputSchema,
  GetEnterpriseReadinessOutputSchema,
} from "../schemas/index.js";
import { getEnterpriseReadinessCore } from "../services/enterprise.js";

export function registerGetEnterpriseReadinessTool(
  server: McpServer,
): void {
  server.registerTool(
    "get_enterprise_readiness",
    {
      title: "Get Enterprise Readiness",
      description:
        "Returns the implemented enterprise capabilities, trust contracts, adoption flow, production gaps, and next deployment steps.",
      inputSchema: GetEnterpriseReadinessInputSchema,
      outputSchema: GetEnterpriseReadinessOutputSchema,
    },
    async () => {
      const structuredContent =
        GetEnterpriseReadinessOutputSchema.parse(
          getEnterpriseReadinessCore(),
        );

      return {
        content: [
          {
            type: "text",
            text: `Enterprise readiness is ${structuredContent.readiness_score}% with ${structuredContent.production_gaps.length} explicit production gaps.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
