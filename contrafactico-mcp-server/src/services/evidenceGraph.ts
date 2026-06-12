import type { DecisionNetwork } from "../types.js";

export function getDecisionNetworkCore(): DecisionNetwork {
  return {
    decision_id: "dec_x200_march",
    title: "X-200 March launch evidence network",
    nodes: [
      {
        id: "dec_x200_march",
        label: "Launch X-200 in March",
        type: "decision",
        detail: "Approved launch decision based on supplier readiness.",
        source_id: "dec_x200_march",
      },
      {
        id: "supplier_on_time",
        label: "supplier_on_time",
        type: "premise",
        detail: "The X-200 sensor batch would arrive before launch.",
      },
      {
        id: "evt_feb14_supplier",
        label: "Feb 14 supplier warning",
        type: "evidence",
        detail: "The sensor batch will not arrive before April.",
        source_id: "evt_feb14_supplier",
      },
      {
        id: "role_x200_decision_makers",
        label: "4 intended decision makers",
        type: "person_role",
        detail: "The warning was intended for four decision makers and read by zero.",
      },
      {
        id: "outcome_x200_returns",
        label: "Stockout-driven returns",
        type: "outcome",
        detail: "Replacement inventory was unavailable after launch.",
        source_id: "evt_mar08_stockout",
      },
      {
        id: "evt_mar31_returns",
        label: "March 31 finance memo",
        type: "evidence",
        detail: "Finance documented Q1 customer returns.",
        source_id: "evt_mar31_returns",
      },
      {
        id: "cost_x200_80000",
        label: "$80,000 USD",
        type: "cost",
        detail: "Avoidable Q1 returns attributed to the launch branch.",
      },
      {
        id: "policy_low_readership",
        label: "Contradicted premise policy",
        type: "policy",
        detail: "Requires human approval for high-impact, low-readership contradictions.",
      },
      {
        id: "connector_foundry_iq",
        label: "Foundry IQ Knowledge Base",
        type: "connector",
        detail: "Grounding layer that returns normalized source references.",
      },
      {
        id: "connector_markdown",
        label: "Markdown evidence corpus",
        type: "connector",
        detail: "Synthetic local mirror with one document per artifact.",
      },
    ],
    edges: [
      {
        id: "edge_decision_premise",
        source: "dec_x200_march",
        target: "supplier_on_time",
        relation: "rests_on",
      },
      {
        id: "edge_warning_contradiction",
        source: "evt_feb14_supplier",
        target: "supplier_on_time",
        relation: "contradicts",
      },
      {
        id: "edge_warning_missed",
        source: "evt_feb14_supplier",
        target: "role_x200_decision_makers",
        relation: "missed_by",
      },
      {
        id: "edge_decision_outcome",
        source: "dec_x200_march",
        target: "outcome_x200_returns",
        relation: "caused",
      },
      {
        id: "edge_outcome_finance",
        source: "outcome_x200_returns",
        target: "evt_mar31_returns",
        relation: "grounded_in",
      },
      {
        id: "edge_finance_cost",
        source: "evt_mar31_returns",
        target: "cost_x200_80000",
        relation: "priced_by",
      },
      {
        id: "edge_decision_policy",
        source: "dec_x200_march",
        target: "policy_low_readership",
        relation: "blocked_by",
      },
      {
        id: "edge_warning_foundry",
        source: "evt_feb14_supplier",
        target: "connector_foundry_iq",
        relation: "grounded_in",
      },
      {
        id: "edge_finance_foundry",
        source: "evt_mar31_returns",
        target: "connector_foundry_iq",
        relation: "grounded_in",
      },
      {
        id: "edge_warning_import",
        source: "evt_feb14_supplier",
        target: "connector_markdown",
        relation: "imported_from",
      },
      {
        id: "edge_decision_readers",
        source: "dec_x200_march",
        target: "role_x200_decision_makers",
        relation: "read_by",
      },
    ],
  };
}
