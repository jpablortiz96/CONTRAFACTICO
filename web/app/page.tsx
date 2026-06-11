"use client";

import { useCallback, useMemo, useState } from "react";

import { TimelineTree } from "./components/TimelineTree";
import type {
  Citation,
  DemoAnalysis,
  DemoLiveFork,
  DemoSource,
} from "./types";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "http://localhost:3000";
const serverErrorMessage =
  "Start the MCP server on http://localhost:3000, then run the demo again.";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function highlightEvidence(text: string) {
  const parts = text.split(/(NOT arrive before April|\$80,000 USD)/gi);
  return parts.map((part, index) => {
    const normalized = part.toLowerCase();
    const highlighted =
      normalized === "not arrive before april" ||
      normalized === "$80,000 usd";
    return highlighted ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      part
    );
  });
}

export default function HomePage() {
  const [analysis, setAnalysis] = useState<DemoAnalysis>();
  const [liveFork, setLiveFork] = useState<DemoLiveFork>();
  const [source, setSource] = useState<DemoSource>();
  const [selectedCitation, setSelectedCitation] = useState<Citation>();
  const [loading, setLoading] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [error, setError] = useState<string>();

  const citationBySource = useMemo(
    () =>
      new Map(
        analysis?.citations.map((citation) => [
          citation.source_id,
          citation,
        ]) ?? [],
      ),
    [analysis],
  );

  const openSource = useCallback(
    async (sourceId: string): Promise<void> => {
      setSourceLoading(true);
      setSelectedCitation(citationBySource.get(sourceId));
      try {
        const nextSource = await fetchJson<DemoSource>(
          `/demo/source/${encodeURIComponent(sourceId)}`,
        );
        setSource(nextSource);
        setSelectedCitation((current) => current ?? nextSource.citation_preview);
      } catch {
        setError(serverErrorMessage);
      } finally {
        setSourceLoading(false);
      }
    },
    [citationBySource],
  );

  const runRewind = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    setSource(undefined);
    try {
      const [nextAnalysis, nextLiveFork] = await Promise.all([
        fetchJson<DemoAnalysis>("/demo/analysis/dec_x200_march"),
        fetchJson<DemoLiveFork>("/demo/live-fork/dec_vendor_switch"),
      ]);
      setAnalysis(nextAnalysis);
      setLiveFork(nextLiveFork);
      const forkCitation = nextAnalysis.fork.citation;
      setSelectedCitation(forkCitation);
      const forkSource = await fetchJson<DemoSource>(
        `/demo/source/${encodeURIComponent(forkCitation.source_id)}`,
      );
      setSource(forkSource);
    } catch {
      setError(serverErrorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const activeCitation = selectedCitation ?? source?.citation_preview;

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="hero">
        <div className="brand-line">
          <span className="brand-mark">C</span>
          <span>Organizational decision intelligence</span>
          <span className="status-pill">Local evidence mode</span>
        </div>
        <p className="kicker">The Org That Didn&apos;t Happen</p>
        <h1>CONTRAFÁCTICO</h1>
        <p className="hero-copy">
          Reconstruct the moment a critical fact disappeared, then follow the
          branch the organization never took.
        </p>
      </header>

      <section className="prompt-card glass-card">
        <div className="prompt-index">01</div>
        <div className="prompt-copy">
          <span className="eyebrow">Decision rewind</span>
          <p>“Rewind our decision to launch the X-200 in March.”</p>
        </div>
        <button
          type="button"
          className="run-button"
          data-testid="run-rewind"
          disabled={loading}
          onClick={() => void runRewind()}
        >
          <span>{loading ? "Reconstructing" : "Run Rewind"}</span>
          <i aria-hidden="true">{loading ? "···" : "↗"}</i>
        </button>
      </section>

      {error !== undefined ? (
        <div className="error-card" role="alert" data-testid="server-error">
          <strong>Demo server unavailable</strong>
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <section className="loading-scene" aria-label="Loading decision rewind">
          <div className="loading-line" />
          <p>Reassembling the evidence trail...</p>
        </section>
      ) : null}

      {analysis !== undefined && !loading ? (
        <>
          <section className="metrics-grid" aria-label="Decision findings">
            <article className="metric-card glass-card fork-metric">
              <span className="metric-label">Fork event</span>
              <strong>Feb 14 supplier delay</strong>
              <small>{analysis.fork.fork_event.id}</small>
            </article>
            <article className="metric-card glass-card">
              <span className="metric-label">Contradicted premise</span>
              <strong>{analysis.fork.contradicted_premise}</strong>
              <small>{analysis.fork.contradiction_strength * 100}% strength</small>
            </article>
            <article className="metric-card glass-card">
              <span className="metric-label">Readership</span>
              <strong>
                {analysis.fork.readership.reader_count} of{" "}
                {analysis.fork.readership.intended_count}
              </strong>
              <small>The fact never reached a decision maker</small>
            </article>
            <article className="metric-card glass-card gap-metric">
              <span className="metric-label">Avoidable gap</span>
              <strong>{formatUsd(analysis.gap.delta_usd)}</strong>
              <small>
                {analysis.simulation.dropped_unsupported.length} unsupported
                claim dropped
              </small>
            </article>
          </section>

          <TimelineTree
            analysis={analysis}
            selectedSourceId={source?.source_id}
            onNodeClick={(sourceId) => void openSource(sourceId)}
          />

          <section className="evidence-grid">
            <article className="citation-panel glass-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Grounded evidence</span>
                  <h2>Citation inspector</h2>
                </div>
                {sourceLoading ? (
                  <span className="source-loading">Loading source...</span>
                ) : null}
              </div>

              {source !== undefined && activeCitation !== undefined ? (
                <div data-testid="citation-panel">
                  <div className="source-title-row">
                    <div>
                      <h3>{activeCitation.title}</h3>
                      <code>{source.source_id}</code>
                    </div>
                    <span className="verified-pill">Exact source span</span>
                  </div>
                  <blockquote>
                    {highlightEvidence(activeCitation.span)}
                  </blockquote>
                  <div className="markdown-preview">
                    <div className="preview-bar">
                      <span>corpus/docs/{source.source_id}.md</span>
                      <span>read only</span>
                    </div>
                    <pre>{highlightEvidence(source.markdown)}</pre>
                  </div>
                </div>
              ) : (
                <p className="empty-panel">
                  Select a timeline node to inspect its cited source.
                </p>
              )}
            </article>

            <aside
              className={`live-fork-panel glass-card ${
                liveFork?.live_fork.alert ? "alerting" : ""
              }`}
              data-testid="live-fork-panel"
            >
              <div className="live-orbit" aria-hidden="true">
                <span />
              </div>
              <span className="eyebrow">Live Fork Watch</span>
              {liveFork?.live_fork.alert ? (
                <>
                  <h2>⚠️ Same fork signature detected</h2>
                  <p>
                    A recent memo contradicts{" "}
                    <code>
                      {
                        liveFork.live_fork.matched_signature
                          .contradicted_premise
                      }
                    </code>{" "}
                    and was read by 1 of 5.
                  </p>
                  <button
                    type="button"
                    className="source-link"
                    data-testid="live-fork-source"
                    onClick={() =>
                      void openSource(
                        liveFork.live_fork.citation.source_id,
                      )
                    }
                  >
                    Open {liveFork.live_fork.citation.source_id}
                  </button>
                  <div className="signature-row">
                    <span>
                      Criticality{" "}
                      {liveFork.live_fork.matched_signature.criticality}
                    </span>
                    <span>
                      Readership{" "}
                      {Math.round(
                        liveFork.live_fork.matched_signature
                          .readership_ratio * 100,
                      )}
                      %
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h2>No active fork signature</h2>
                  <p>Run the rewind to evaluate the pending vendor decision.</p>
                </>
              )}
            </aside>
          </section>
        </>
      ) : null}

      <footer>
        <span>CONTRAFÁCTICO</span>
        <span>Every claim grounded in the Cordillera Components corpus.</span>
      </footer>
    </main>
  );
}
