import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  EvaluateGovernancePolicyInputSchema,
  EvaluateGovernancePolicyOutputSchema,
} from "../schemas/index.js";
import { evaluateGovernancePolicyCore } from "../services/enterprise.js";

export function registerEvaluateGovernancePolicyTool(
  server: McpServer,
): void {
  server.registerTool(
    "evaluate_governance_policy",
    {
      title: "Evaluate Governance Policy",
      description:
        "Evaluates deterministic decision controls for contradicted premises, low readership, and high expected or realized impact.",
      inputSchema: EvaluateGovernancePolicyInputSchema,
      outputSchema: EvaluateGovernancePolicyOutputSchema,
    },
    async ({ decision_id }) => {
      const structuredContent =
        EvaluateGovernancePolicyOutputSchema.parse(
          await evaluateGovernancePolicyCore(decision_id),
        );

      return {
        content: [
          {
            type: "text",
            text: structuredContent.blocked_recommendation
              ? `${decision_id} requires human approval before the recommendation proceeds.`
              : `${decision_id} does not trigger the configured governance policy.`,
          },
        ],
        structuredContent,
      };
    },
  );
}
