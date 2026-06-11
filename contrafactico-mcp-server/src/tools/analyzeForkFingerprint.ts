import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  AnalyzeForkFingerprintInputSchema,
  AnalyzeForkFingerprintOutputSchema,
} from "../schemas/index.js";
import { analyzeForkFingerprintCore } from "../services/fingerprint.js";

export function registerAnalyzeForkFingerprintTool(
  server: McpServer,
): void {
  server.registerTool(
    "analyze_fork_fingerprint",
    {
      title: "Analyze Fork Fingerprint",
      description:
        "Detects recurring organizational blind spots by comparing decisions where contradicted premises had low-readership evidence before approval.",
      inputSchema: AnalyzeForkFingerprintInputSchema,
      outputSchema: AnalyzeForkFingerprintOutputSchema,
    },
    async ({ organization_id }) => {
      const structuredContent = AnalyzeForkFingerprintOutputSchema.parse(
        await analyzeForkFingerprintCore(),
      );
      const scope =
        organization_id === undefined
          ? "the available organization corpus"
          : organization_id;

      return {
        content: [
          {
            type: "text",
            text: `Detected ${structuredContent.repeated_in_decisions.length} repeated decision forks in ${scope}.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
