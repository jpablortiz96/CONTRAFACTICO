import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  ListDecisionRegistryInputSchema,
  ListDecisionRegistryOutputSchema,
} from "../schemas/index.js";
import { getDecisionRegistryCore } from "../services/enterprise.js";

export function registerListDecisionRegistryTool(
  server: McpServer,
): void {
  server.registerTool(
    "list_decision_registry",
    {
      title: "List Decision Registry",
      description:
        "Lists normalized enterprise decision records with ownership, premises, evidence sources, risk, status, and impact.",
      inputSchema: ListDecisionRegistryInputSchema,
      outputSchema: ListDecisionRegistryOutputSchema,
    },
    async ({ status }) => {
      const statusFilter = status ?? "all";
      const decisions = await getDecisionRegistryCore(statusFilter);
      const structuredContent = ListDecisionRegistryOutputSchema.parse({
        status_filter: statusFilter,
        count: decisions.length,
        decisions,
      });

      return {
        content: [
          {
            type: "text",
            text: `Listed ${structuredContent.count} decision registry records for status ${structuredContent.status_filter}.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
