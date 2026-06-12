import type {
  AuditRun,
  ConnectorStatus,
  DecisionRegistryEntry,
  EnterpriseData,
  TrustStackModule,
} from "../types";

interface EnterpriseModeProps {
  data: EnterpriseData;
}

function formatUsd(value: number | undefined): string {
  if (value === undefined) {
    return "Not quantified";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function connectorStatusLabel(status: ConnectorStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "adapter_stub":
      return "Adapter stub";
    case "planned":
      return "Documented path";
  }
}

function trustStatusLabel(
  status: TrustStackModule["integration_status"],
): string {
  switch (status) {
    case "implemented":
      return "Implemented";
    case "adapter_contract":
      return "Adapter contract";
    case "documented_path":
      return "Documented path";
  }
}

function impactFor(decision: DecisionRegistryEntry): number | undefined {
  return (
    decision.avoidable_exposure_usd ??
    decision.expected_impact_usd
  );
}

function AuditRow({ run }: { run: AuditRun }) {
  return (
    <tr>
      <td>
        <code>{run.tool_name}</code>
        <small>{run.decision_id ?? "organization-wide"}</small>
      </td>
      <td>{run.evidence_count}</td>
      <td>{run.unsupported_dropped}</td>
      <td>
        {run.reliability_score === undefined
          ? "Not scored"
          : `${run.reliability_score}%`}
      </td>
      <td>
        <span
          className={`enterprise-badge ${
            run.safe_for_export ? "status-ready" : "status-critical"
          }`}
        >
          {run.safe_for_export ? "Safe for export" : "Restricted"}
        </span>
      </td>
    </tr>
  );
}

export function EnterpriseMode({ data }: EnterpriseModeProps) {
  const policy = data.policies[0];

  return (
    <div className="enterprise-view" data-testid="enterprise-mode">
      <section className="enterprise-overview glass-card">
        <div>
          <span className="eyebrow">Enterprise productization layer</span>
          <h2>Decision intelligence, ready for tenant onboarding.</h2>
          <p>{data.readiness.platform_positioning}</p>
        </div>
        <div className="readiness-dial">
          <strong>{data.readiness.readiness_score}%</strong>
          <span>Implementation readiness</span>
          <small>Deployment and tenant configuration remain pending.</small>
        </div>
      </section>

      <section
        className="adoption-panel glass-card"
        data-testid="adoption-flow"
      >
        <div className="enterprise-section-heading">
          <div>
            <span className="eyebrow">Adoption flow</span>
            <h2>From evidence connection to governed decisions</h2>
          </div>
          <span className="contract-badge">Working local contracts</span>
        </div>
        <div className="adoption-flow">
          {data.readiness.adoption_flow.map((step, index) => (
            <div className="adoption-step" key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
              {index < data.readiness.adoption_flow.length - 1 ? (
                <i aria-hidden="true">→</i>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section
        className="enterprise-section glass-card"
        data-testid="decision-registry"
      >
        <div className="enterprise-section-heading">
          <div>
            <span className="eyebrow">Decision Registry</span>
            <h2>Auditable decision objects</h2>
          </div>
          <span className="record-count">
            {data.registry.length} synthetic records
          </span>
        </div>
        <div className="enterprise-table-wrap">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Decision</th>
                <th>Status</th>
                <th>Owner / unit</th>
                <th>Risk</th>
                <th>Impact</th>
                <th>Premises</th>
              </tr>
            </thead>
            <tbody>
              {data.registry.map((decision) => (
                <tr key={decision.decision_id}>
                  <td>
                    <code>{decision.decision_id}</code>
                    <strong>{decision.statement}</strong>
                  </td>
                  <td>
                    <span
                      className={`enterprise-badge status-${decision.status}`}
                    >
                      {decision.status}
                    </span>
                  </td>
                  <td>
                    <strong>{decision.owner}</strong>
                    <small>{decision.business_unit}</small>
                  </td>
                  <td>
                    <span
                      className={`enterprise-badge status-${decision.risk_level}`}
                    >
                      {decision.risk_level}
                    </span>
                  </td>
                  <td>{formatUsd(impactFor(decision))}</td>
                  <td>{decision.premises.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="enterprise-section"
        data-testid="ingestion-connectors"
      >
        <div className="enterprise-section-heading">
          <div>
            <span className="eyebrow">Ingestion contract</span>
            <h2>Bring approved evidence into one decision model</h2>
          </div>
          <p>
            No live third-party calls are made. Cards identify file-ready
            paths, adapter stubs, and documented integration work.
          </p>
        </div>
        <div className="connector-grid">
          {data.connectors.map((connector) => (
            <article className="connector-card glass-card" key={connector.connector_id}>
              <div className="connector-card-heading">
                <span
                  className={`enterprise-badge status-${connector.status}`}
                >
                  {connectorStatusLabel(connector.status)}
                </span>
                <small>{connector.category.replaceAll("_", " ")}</small>
              </div>
              <h3>{connector.name}</h3>
              <p>{connector.privacy_notes}</p>
              <div className="connector-meta">
                <span>Inputs</span>
                <strong>{connector.input_types.join(" · ")}</strong>
              </div>
              <div className="connector-meta">
                <span>Maps to</span>
                <strong>{connector.maps_to.join(" · ")}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      {policy !== undefined ? (
        <section
          className="governance-grid"
          data-testid="governance-policy"
        >
          <article className="governance-card glass-card">
            <span className="eyebrow">Governance Policy</span>
            <h2>Contradicted premise + low readership + high impact</h2>
            <p>{policy.description}</p>
            <div className="governance-trigger">
              <span>Example trigger</span>
              <strong>{policy.example_trigger}</strong>
            </div>
            <div className="approval-required">
              <span>Human approval required</span>
              <strong>
                {data.policyEvaluation.human_approval_required
                  ? "Yes"
                  : "No"}
              </strong>
            </div>
            <p className="policy-explanation">
              {data.policyEvaluation.explanation}
            </p>
          </article>
          <article className="rego-card glass-card">
            <div className="rego-heading">
              <span>OPA / Rego preview</span>
              <span className="enterprise-badge status-adapter_stub">
                Adapter contract
              </span>
            </div>
            <pre>{policy.opa_rego_preview}</pre>
          </article>
        </section>
      ) : null}

      <section
        className="enterprise-section glass-card"
        data-testid="audit-runs"
      >
        <div className="enterprise-section-heading">
          <div>
            <span className="eyebrow">Audit and observability</span>
            <h2>Exportable run records</h2>
          </div>
          <span className="contract-badge">
            Synthetic local run history
          </span>
        </div>
        <div className="enterprise-table-wrap">
          <table className="enterprise-table audit-table">
            <thead>
              <tr>
                <th>Tool called</th>
                <th>Evidence</th>
                <th>Unsupported dropped</th>
                <th>Reliability</th>
                <th>Export status</th>
              </tr>
            </thead>
            <tbody>
              {data.auditRuns.map((run) => (
                <AuditRow key={run.run_id} run={run} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="enterprise-section"
        data-testid="enterprise-trust-stack"
      >
        <div className="enterprise-section-heading">
          <div>
            <span className="eyebrow">Open Source Trust Stack</span>
            <h2>Composable controls, explicit integration status</h2>
          </div>
        </div>
        <div className="trust-stack-grid">
          {data.trustStack.map((module) => (
            <article className="trust-card glass-card" key={module.module_id}>
              <div>
                <span className="trust-category">{module.category}</span>
                <span
                  className={`enterprise-badge status-${module.integration_status}`}
                >
                  {trustStatusLabel(module.integration_status)}
                </span>
              </div>
              <h3>{module.name}</h3>
              <p>{module.role}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
