"use client";

import { useEffect, useMemo, useRef } from "react";
import { createNoise2D } from "simplex-noise";

import type { Citation, DemoAnalysis } from "../types";

interface TimelineTreeProps {
  analysis: DemoAnalysis;
  selectedSourceId?: string;
  onNodeClick: (sourceId: string) => void;
}

interface VisualNode {
  id: string;
  label: string;
  sourceId: string;
  x: number;
  y: number;
  branch: "real" | "counterfactual";
  fork?: boolean;
  labelPosition: "above" | "below";
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function citationSource(
  citationRef: string,
  citations: Citation[],
): string {
  return (
    citations.find((citation) => citation.ref_id === citationRef)?.source_id ??
    "evt_feb14_supplier"
  );
}

export function TimelineTree({
  analysis,
  selectedSourceId,
  onNodeClick,
}: TimelineTreeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  const nodes = useMemo<VisualNode[]>(() => {
    const counterfactual = analysis.simulation.branches.counterfactual;

    return [
      {
        id: "jan-kickoff",
        label: "Jan kickoff",
        sourceId: "evt_jan_kickoff",
        x: 0.08,
        y: 0.67,
        branch: "real",
        labelPosition: "below",
      },
      {
        id: "supplier-delay",
        label: "Feb 14 supplier delay",
        sourceId: "evt_feb14_supplier",
        x: 0.28,
        y: 0.67,
        branch: "real",
        fork: true,
        labelPosition: "below",
      },
      {
        id: "march-launch",
        label: "Mar launch",
        sourceId: "dec_x200_march",
        x: 0.48,
        y: 0.67,
        branch: "real",
        labelPosition: "below",
      },
      {
        id: "stockout",
        label: "Mar stockout",
        sourceId: "evt_mar08_stockout",
        x: 0.68,
        y: 0.67,
        branch: "real",
        labelPosition: "below",
      },
      {
        id: "returns",
        label: "Q1 returns",
        sourceId: "evt_mar31_returns",
        x: 0.88,
        y: 0.67,
        branch: "real",
        labelPosition: "below",
      },
      {
        id: "delay-seen",
        label: "Delay seen",
        sourceId: citationSource(
          counterfactual[0]?.citation_ref ?? "",
          analysis.citations,
        ),
        x: 0.28,
        y: 0.67,
        branch: "counterfactual",
        fork: true,
        labelPosition: "above",
      },
      {
        id: "escalation",
        label: "Escalation",
        sourceId: citationSource(
          counterfactual[1]?.citation_ref ?? "",
          analysis.citations,
        ),
        x: 0.46,
        y: 0.38,
        branch: "counterfactual",
        labelPosition: "above",
      },
      {
        id: "april-launch",
        label: "April launch",
        sourceId: citationSource(
          counterfactual[2]?.citation_ref ?? "",
          analysis.citations,
        ),
        x: 0.66,
        y: 0.24,
        branch: "counterfactual",
        labelPosition: "above",
      },
      {
        id: "returns-avoided",
        label: "Avoided returns",
        sourceId: citationSource(
          counterfactual[3]?.citation_ref ?? "",
          analysis.citations,
        ),
        x: 0.86,
        y: 0.18,
        branch: "counterfactual",
        labelPosition: "above",
      },
    ];
  }, [analysis]);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }
    const hostElement = host;

    let disposed = false;
    let application: import("pixi.js").Application | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let updateGhost:
      | ((progress: number) => void)
      | undefined;
    let progress = 0;

    async function initialize(): Promise<void> {
      const pixi = await import("pixi.js");
      if (disposed) {
        return;
      }

      const height = 470;
      const width = Math.max(hostElement.clientWidth, 720);
      const app = new pixi.Application({
        width,
        height,
        antialias: true,
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio, 2),
      });
      application = app;
      const canvas = app.view as HTMLCanvasElement;
      canvas.className = "timeline-canvas";
      canvas.setAttribute("aria-hidden", "true");
      hostElement.prepend(canvas);

      const noise2D = createNoise2D(seededRandom(77));

      const drawScene = (sceneWidth: number): void => {
        const removed = app.stage.removeChildren();
        for (const child of removed) {
          child.destroy({ children: true });
        }

        const sceneHeight = height;
        const toPoint = (node: VisualNode) => ({
          x: node.x * sceneWidth,
          y: node.y * sceneHeight,
        });

        const atmosphere = new pixi.Graphics();
        for (let index = 0; index < 90; index += 1) {
          const x = ((index * 97) % 997) / 997;
          const y = ((index * 53) % 991) / 991;
          const alpha =
            0.06 + Math.abs(noise2D(x * 3, y * 3)) * 0.12;
          atmosphere.beginFill(0x8ee9ff, alpha);
          atmosphere.drawCircle(
            x * sceneWidth,
            y * sceneHeight,
            index % 5 === 0 ? 1.5 : 0.8,
          );
          atmosphere.endFill();
        }
        app.stage.addChild(atmosphere);

        const realNodes = nodes.filter((node) => node.branch === "real");
        const realPath = new pixi.Graphics();
        realPath.lineStyle(12, 0x07131d, 0.9);
        realPath.moveTo(
          toPoint(realNodes[0] ?? nodes[0]!).x,
          toPoint(realNodes[0] ?? nodes[0]!).y,
        );
        for (const node of realNodes.slice(1)) {
          const point = toPoint(node);
          realPath.lineTo(point.x, point.y);
        }
        realPath.lineStyle(3, 0x5d7183, 1);
        realPath.moveTo(
          toPoint(realNodes[0] ?? nodes[0]!).x,
          toPoint(realNodes[0] ?? nodes[0]!).y,
        );
        for (const node of realNodes.slice(1)) {
          const point = toPoint(node);
          realPath.lineTo(point.x, point.y);
        }
        app.stage.addChild(realPath);

        const ghostGlow = new pixi.Graphics();
        const ghostPath = new pixi.Graphics();
        app.stage.addChild(ghostGlow, ghostPath);

        updateGhost = (animationProgress: number): void => {
          const fork = toPoint(nodes.find((node) => node.fork) ?? nodes[1]!);
          const escalation = toPoint(
            nodes.find((node) => node.id === "escalation") ?? nodes[6]!,
          );
          const april = toPoint(
            nodes.find((node) => node.id === "april-launch") ?? nodes[7]!,
          );
          const avoided = toPoint(
            nodes.find((node) => node.id === "returns-avoided") ?? nodes[8]!,
          );
          const endX =
            fork.x + (avoided.x - fork.x) * animationProgress;
          const endY =
            fork.y + (avoided.y - fork.y) * animationProgress;
          const controlOneX =
            fork.x + (escalation.x - fork.x) * animationProgress;
          const controlOneY =
            fork.y + (escalation.y - fork.y) * animationProgress;
          const controlTwoX =
            fork.x + (april.x - fork.x) * animationProgress;
          const controlTwoY =
            fork.y + (april.y - fork.y) * animationProgress;

          ghostGlow.clear();
          ghostGlow.lineStyle(18, 0x4ce5c1, 0.08);
          ghostGlow.moveTo(fork.x, fork.y);
          ghostGlow.bezierCurveTo(
            controlOneX,
            controlOneY,
            controlTwoX,
            controlTwoY,
            endX,
            endY,
          );

          ghostPath.clear();
          ghostPath.lineStyle(3, 0x78f5d6, 0.9);
          ghostPath.moveTo(fork.x, fork.y);
          ghostPath.bezierCurveTo(
            controlOneX,
            controlOneY,
            controlTwoX,
            controlTwoY,
            endX,
            endY,
          );
        };
        updateGhost(progress);

        for (const node of nodes) {
          if (
            node.branch === "counterfactual" &&
            node.id === "delay-seen"
          ) {
            continue;
          }

          const point = toPoint(node);
          const group = new pixi.Container();
          group.x = point.x;
          group.y = point.y;

          const halo = new pixi.Graphics();
          const isSelected = node.sourceId === selectedSourceId;
          const color = node.fork
            ? 0xffbb5c
            : node.branch === "counterfactual"
              ? 0x78f5d6
              : 0xa9bbca;
          halo.beginFill(color, node.fork ? 0.15 : 0.08);
          halo.drawCircle(0, 0, node.fork ? 26 : 18);
          halo.endFill();

          const dot = new pixi.Graphics();
          dot.lineStyle(isSelected ? 4 : 2, color, 1);
          dot.beginFill(node.fork ? 0x2d1b08 : 0x07131d, 1);
          dot.drawCircle(0, 0, node.fork ? 11 : 8);
          dot.endFill();
          dot.eventMode = "static";
          dot.cursor = "pointer";
          dot.on("pointertap", () => onNodeClickRef.current(node.sourceId));

          const label = new pixi.Text(node.label, {
            fill: node.branch === "counterfactual" ? 0xb9ffef : 0xdce7ef,
            fontFamily: "Arial, sans-serif",
            fontSize: 12,
            fontWeight: node.fork ? "700" : "500",
            letterSpacing: 0.4,
          });
          label.anchor.set(0.5, node.labelPosition === "above" ? 1 : 0);
          label.y = node.labelPosition === "above" ? -20 : 20;

          group.addChild(halo, dot, label);
          app.stage.addChild(group);
        }

      };

      drawScene(width);

      const ticker = (delta: number): void => {
        progress = Math.min(1, progress + delta / 85);
        const eased = 1 - Math.pow(1 - progress, 3);
        updateGhost?.(eased);
      };
      app.ticker.add(ticker);

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry === undefined || application === undefined) {
          return;
        }
        const nextWidth = Math.max(entry.contentRect.width, 720);
        application.renderer.resize(nextWidth, height);
        drawScene(nextWidth);
      });
      resizeObserver.observe(hostElement);
    }

    void initialize();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      application?.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
      });
    };
  }, [nodes, selectedSourceId]);

  return (
    <section className="timeline-shell" aria-label="Decision timeline">
      <div className="timeline-heading">
        <div>
          <span className="eyebrow">Decision topology</span>
          <h2>The branch that stayed invisible</h2>
        </div>
        <div className="timeline-legend" aria-label="Timeline legend">
          <span>
            <i className="legend-dot real" /> Real path
          </span>
          <span>
            <i className="legend-dot ghost" /> Counterfactual
          </span>
          <span>
            <i className="legend-dot fork" /> Fork
          </span>
        </div>
      </div>

      <div ref={hostRef} className="timeline-stage">
        <span
          className="timeline-gap-badge"
          data-testid="timeline-gap-badge"
        >
          $80,000 avoidable
        </span>
        {nodes
          .filter(
            (node) =>
              !(
                node.branch === "counterfactual" &&
                node.id === "delay-seen"
              ),
          )
          .map((node) => (
            <button
              key={node.id}
              type="button"
              data-testid={`timeline-node-${node.sourceId}-${node.id}`}
              className={`timeline-hit-target ${node.fork ? "fork" : ""}`}
              style={{
                left: `${node.x * 100}%`,
                top: `${node.y * 470}px`,
              }}
              aria-label={`Open source for ${node.label}`}
              onClick={() => onNodeClick(node.sourceId)}
            />
          ))}
      </div>

      <div className="timeline-footnote">
        <span>Solid line: observed history</span>
        <span>Glow line: evidence-supported alternative</span>
        <span>Click any node to inspect its source</span>
      </div>
    </section>
  );
}
