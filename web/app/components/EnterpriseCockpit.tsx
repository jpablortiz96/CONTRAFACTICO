"use client";

import { useMemo, useState } from "react";

import type {
  CockpitData,
  EnterpriseImplementationStatus,
  EvidenceGraphNode,
} from "../types";

interface EnterpriseCockpitProps {
  data: CockpitData;
}

const graphPositions: Record<string, { x: number; y: number }> = {
  dec_x200_march: { x: 95, y: 155 },
  supplier_on_time: { x: 245, y: 80 },
  evt_feb14_supplier: { x: 405, y: 80 },
  role_x200_decision_makers: { x: 575, y: 65 },
  outcome_x200_returns: { x: 250, y: 235 },
  evt_mar31_returns: { x: 420, y: 235 },
  cost_x200_80000: { x: 585, y: 235 },
  policy_low_readership: { x: 250, y: 350 },
  connector_foundry_iq: { x: 430, y: 350 },
  connector_markdown: { x: 600, y: 350 },
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: EnterpriseImplementationStatus): string {
  switch (status) {
    case "implemented":
      return "Implemented";
    case "adapter_contract":
      return "Adapter Contract";
    case "documented_path":
      return "Documented Path";
    case "production_pending":
      return "Production Pending";
  }
}

function nodeClass(node: EvidenceGraphNode): string {
  return `evidence-node node-${node.type}`;
}

export function EnterpriseCockpit({
  data,
}: EnterpriseCockpitProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(
    "evt_feb14_supplier",
  );
  const selectedNode = useMemo(
    () =>
      data.evidenceGraph.nodes.find(
        (node) => node.id === selectedNodeId,
      ) ?? data.evidenceGraph.nodes[0],
    [data.evidenceGraph.nodes, selectedNodeId],
  );
  const nodeById = useMemo(
    () =>
      new Map(
        data.evidenceGraph.nodes.map((node) => [node.id, node]),
      ),
    [data.evidenceGraph.nodes],
  );

  return (
    <div className="cockpit-view" data-testid="enterprise-cockpit">
      <section className="cockpit-command glass-card">
        <div>
          <span className="eyebrow">Enterprise command center</span>
          <h2>Decision Intelligence Cockpit</h2>
          <p>
            Monitor decision risk, organizational blind spots, grounded
            evidence, and deployment readiness from one operational surface.
          </p>
        </div>
        <div className="cockpit-command-badges">
          <span className="cockpit-mode-badge">
            Synthetic Demo Corpus / Tenant-Ready Architecture
          </span>
          <span>Foundry IQ Grounded</span>
          <span>Copilot Studio Connected</span>
          <span>Azure Container Apps Live</span>
        </div>
      </section>

      <section className="cockpit-kpis" aria-label="Enterprise cockpit KPIs">
        <article className="cockpit-kpi glass-card">
          <span>Decisions analyzed</span>
          <strong>{data.cockpit.decisions_analyzed}</strong>
          <small>{data.cockpit.organization_name}</small>
        </article>
        <article className="cockpit-kpi exposure glass-card">
          <span>Avoidable exposure</span>
          <strong>
            {formatUsd(data.cockpit.total_avoidable_exposure_usd)}
          </strong>
          <small>Across repeated fork signatures</small>
        </article>
        <article className="cockpit-kpi alert glass-card">
          <span>Open live forks</span>
          <strong>{data.cockpit.open_live_forks}</strong>
          <small>Pending governance attention</small>
        </article>
        <article className="cockpit-kpi glass-card">
          <span>Governance blocks</span>
          <strong>{data.cockpit.governance_blocks}+</strong>
          <small>Human approval required</small>
        </article>
        <article className="cockpit-kpi reliability glass-card">
          <span>Average branch reliability</span>
          <strong>{data.cockpit.average_branch_reliability}%</strong>
          <small>Evidence-backed analysis</small>
        </article>
      </section>

      <section
        className="cockpit-section glass-card"
        data-testid="onboarding-wizard"
      >
        <div className="cockpit-section-heading">
          <div>
            <span className="eyebrow">Enterprise onboarding wizard</span>
            <h2>From approved evidence to governed action</h2>
          </div>
          <span className="cockpit-section-note">
            {data.cockpit.mode === "synthetic-demo"
              ? "Synthetic data active"
              : "Tenant data active"}
          </span>
        </div>
        <div className="onboarding-wizard">
          {data.onboarding.adoption_stages.map((stage, index) => (
            <article key={stage.stage_id}>
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i
                  className={`enterprise-badge status-${stage.status}`}
                >
                  {statusLabel(stage.status)}
                </i>
              </div>
              <h3>{stage.title}</h3>
              <p>{stage.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="cockpit-section"
        data-testid="connector-wall"
      >
        <div className="cockpit-section-heading">
          <div>
            <span className="eyebrow">Connector wall</span>
            <h2>Evidence enters through explicit contracts</h2>
          </div>
          <p>
            Status labels distinguish working integrations from adapter and
            production work.
          </p>
        </div>
        <div className="cockpit-connector-grid">
          {data.deployment.connector_readiness.map((connector) => (
            <article
              className="cockpit-connector glass-card"
              key={connector.connector_id}
            >
              <span
                className={`enterprise-badge status-${connector.status}`}
              >
                {statusLabel(connector.status)}
              </span>
              <h3>{connector.name}</h3>
              <p>{connector.summary}</p>
              <small>{connector.data_contract.join(" / ")}</small>
            </article>
          ))}
        </div>
      </section>

      <section
        className="evidence-graph-panel glass-card"
        data-testid="evidence-graph"
      >
        <div className="cockpit-section-heading">
          <div>
            <span className="eyebrow">Evidence graph</span>
            <h2>{data.evidenceGraph.title}</h2>
          </div>
          <span className="cockpit-section-note">
            Select a node to inspect its contract
          </span>
        </div>
        <div className="evidence-graph-layout">
          <svg
            viewBox="0 0 700 420"
            role="img"
            aria-label="X-200 decision evidence graph"
          >
            <defs>
              <marker
                id="graph-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" />
              </marker>
            </defs>
            {data.evidenceGraph.edges.map((edge) => {
              const sourcePosition = graphPositions[edge.source];
              const targetPosition = graphPositions[edge.target];
              if (
                sourcePosition === undefined ||
                targetPosition === undefined
              ) {
                return null;
              }
              return (
                <g key={edge.id}>
                  <line
                    x1={sourcePosition.x}
                    y1={sourcePosition.y}
                    x2={targetPosition.x}
                    y2={targetPosition.y}
                    markerEnd="url(#graph-arrow)"
                  />
                  <text
                    x={(sourcePosition.x + targetPosition.x) / 2}
                    y={(sourcePosition.y + targetPosition.y) / 2 - 7}
                    className="edge-label"
                  >
                    {edge.relation}
                  </text>
                </g>
              );
            })}
            {data.evidenceGraph.nodes.map((node) => {
              const position = graphPositions[node.id];
              if (position === undefined) {
                return null;
              }
              return (
                <g
                  key={node.id}
                  className={`${nodeClass(node)} ${
                    selectedNodeId === node.id ? "selected" : ""
                  }`}
                  data-testid={`graph-node-${node.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${node.label}`}
                  transform={`translate(${position.x} ${position.y})`}
                  onClick={() => setSelectedNodeId(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedNodeId(node.id);
                    }
                  }}
                >
                  <circle r="28" />
                  <text y="45">{node.label}</text>
                </g>
              );
            })}
          </svg>
          <aside className="graph-inspector">
            {selectedNode !== undefined ? (
              <>
                <span className="eyebrow">{selectedNode.type}</span>
                <h3>{selectedNode.label}</h3>
                <code>{selectedNode.id}</code>
                <p>{selectedNode.detail}</p>
                {selectedNode.source_id !== undefined ? (
                  <div>
                    <span>Source ID</span>
                    <strong>{selectedNode.source_id}</strong>
                  </div>
                ) : null}
                <small>
                  {nodeById.has(selectedNode.id)
                    ? "Graph contract verified"
                    : "Graph node unavailable"}
                </small>
              </>
            ) : null}
          </aside>
        </div>
      </section>

      <section
        className="cockpit-section"
        data-testid="channel-matrix"
      >
        <div className="cockpit-section-heading">
          <div>
            <span className="eyebrow">Channel matrix</span>
            <h2>Decision intelligence where work already happens</h2>
          </div>
        </div>
        <div className="channel-matrix">
          {data.channels.map((channel) => (
            <article className="channel-card glass-card" key={channel.channel_id}>
              <span
                className={`enterprise-badge status-${channel.status}`}
              >
                {statusLabel(channel.status)}
              </span>
              <h3>{channel.name}</h3>
              <p>{channel.usage}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="adoption-story glass-card">
        <div>
          <span className="eyebrow">How another company uses this</span>
          <h2>Replace the corpus, keep the decision intelligence.</h2>
        </div>
        <p>{data.onboarding.headline}</p>
        <div className="adoption-story-columns">
          <div>
            <span>Customer provides</span>
            <ul>
              {data.onboarding.required_customer_inputs.map((input) => (
                <li key={input}>{input}</li>
              ))}
            </ul>
          </div>
          <div>
            <span>Platform generates</span>
            <ul>
              {data.onboarding.generated_outputs.map((output) => (
                <li key={output}>{output}</li>
              ))}
            </ul>
          </div>
          <div>
            <span>Production boundary</span>
            <ul>
              {data.onboarding.production_requirements.map(
                (requirement) => (
                  <li key={requirement}>{requirement}</li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="cockpit-footprint glass-card">
        <div>
          <span className="eyebrow">Deployment footprint</span>
          <h2>Live architecture, explicit production boundary</h2>
        </div>
        <div className="footprint-grid">
          {data.deployment.components.map((component) => (
            <article key={component.component_id}>
              <span
                className={`enterprise-badge status-${component.status}`}
              >
                {statusLabel(component.status)}
              </span>
              <h3>{component.name}</h3>
              <p>{component.current_state}</p>
              <small>{component.production_requirement}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
