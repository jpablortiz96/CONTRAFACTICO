import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  FindBranchPointInputSchema,
  FindBranchPointOutputSchema,
} from "../schemas/index.js";
import { findBranchPointCore } from "../services/decisionAnalysis.js";

export function registerFindBranchPointTool(server: McpServer): void {
  server.registerTool(
    "find_branch_point",
    {
      title: "Find Branch Point",
      description:
        "Rank cited contradictions to identify where a decision premise became unreliable.",
      inputSchema: FindBranchPointInputSchema,
      outputSchema: FindBranchPointOutputSchema,
    },
    async ({ decision_id }) => {
      const structuredContent = FindBranchPointOutputSchema.parse(
        await findBranchPointCore(decision_id),
      );

      return {
        content: [
          {
            type: "text",
            text: `${structuredContent.fork_event.id} is the top fork with criticality ${structuredContent.criticality}.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
