import type { EnterpriseData, TrustStackModule } from "../types";

interface EvidenceTrustProps {
  data: EnterpriseData;
}

const architectureLayers = [
  {
    label: "Experience",
    value: "Microsoft 365 Copilot / Teams",
  },
  {
    label: "Agent",
    value: "Copilot Studio Agent",
  },
  {
    label: "Identity",
    value: "OAuth / Microsoft Entra ID",
  },
  {
    label: "Runtime",
    value: "Azure Container Apps MCP Server",
  },
  {
    label: "Grounding",
    value: "Foundry IQ / Azure AI Search Knowledge Base",
  },
  {
    label: "Enterprise evidence",
    value:
      "SharePoint · Teams · Blob · Jira · ServiceNow · CSV/JSON · custom APIs",
  },
  {
    label: "Trust layer",
    value: "OPA policy · lineage · observability · evaluation",
  },
] as const;

function statusLabel(
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

export function EvidenceTrust({ data }: EvidenceTrustProps) {
  return (
    <div className="enterprise-view" data-testid="evidence-trust-mode">
      <section
        className="architecture-section glass-card"
        data-testid="production-architecture"
      >
        <div className="enterprise-section-heading">
          <div>
            <span className="eyebrow">Target deployment topology</span>
            <h2>Production Architecture</h2>
          </div>
          <span className="enterprise-badge status-implemented">
            Runtime implemented
          </span>
        </div>
        <p className="architecture-disclosure">
          The MCP runtime, Foundry grounding, web experience, and Copilot
          facade are implemented. Production Entra OAuth, Key Vault
          references, real tenant connectors, telemetry, and customer data
          governance remain explicit deployment work.
        </p>
        <div className="architecture-flow">
          {architectureLayers.map((layer, index) => (
            <div className="architecture-step" key={layer.label}>
              <div>
                <span>{layer.label}</span>
                <strong>{layer.value}</strong>
              </div>
              {index < architectureLayers.length - 1 ? (
                <i aria-hidden="true">↓</i>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="trust-detail-grid">
        <article className="enterprise-section glass-card">
          <div className="enterprise-section-heading">
            <div>
              <span className="eyebrow">Implemented vs pending</span>
              <h2>Enterprise readiness boundary</h2>
            </div>
            <strong className="readiness-inline">
              {data.readiness.readiness_score}%
            </strong>
          </div>
          <div className="readiness-columns">
            <div>
              <h3>Implemented capabilities</h3>
              <ul>
                {data.readiness.implemented_capabilities.map(
                  (capability) => (
                    <li key={capability}>{capability}</li>
                  ),
                )}
              </ul>
            </div>
            <div>
              <h3>Production gaps</h3>
              <ul className="gap-list">
                {data.readiness.production_gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <article className="enterprise-section glass-card">
          <span className="eyebrow">Real tenant prerequisites</span>
          <h2>Required before production use</h2>
          <ol className="tenant-requirements">
            {data.readiness.required_for_real_tenant.map(
              (requirement) => (
                <li key={requirement}>{requirement}</li>
              ),
            )}
          </ol>
        </article>
      </section>

      <section className="enterprise-section">
        <div className="enterprise-section-heading">
          <div>
            <span className="eyebrow">Evidence and trust modules</span>
            <h2>Repository-backed integration map</h2>
          </div>
        </div>
        <div className="trust-module-list">
          {data.trustStack.map((module) => (
            <article className="trust-module-row glass-card" key={module.module_id}>
              <div className="trust-module-title">
                <span className="trust-category">{module.category}</span>
                <h3>{module.name}</h3>
              </div>
              <p>{module.why_it_matters}</p>
              <div>
                <span
                  className={`enterprise-badge status-${module.integration_status}`}
                >
                  {statusLabel(module.integration_status)}
                </span>
                <small>{module.evidence_in_repo.join(" · ")}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="enterprise-section glass-card">
        <div className="enterprise-section-heading">
          <div>
            <span className="eyebrow">Next controlled steps</span>
            <h2>Path to a real tenant</h2>
          </div>
        </div>
        <div className="next-step-grid">
          {data.readiness.next_steps.map((step, index) => (
            <div key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
