import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import helmet from "helmet";

import {
  copilotToolNames,
  createCopilotMcpServer,
} from "./copilotMcpServer.js";
import { config, serviceMetadata } from "./constants.js";
import { registeredToolNames } from "./mcpServer.js";
import { createAuthMiddleware } from "./services/auth.js";
import {
  getDeploymentFootprintCore,
  getEnterpriseCockpitCore,
} from "./services/cockpit.js";
import {
  getDemoAnalysis,
  getDemoLiveFork,
  getDemoSource,
} from "./services/demo.js";
import { getDemoStatus } from "./services/evidenceStatus.js";
import { getDecisionNetworkCore } from "./services/evidenceGraph.js";
import { safeStartupSummary } from "./services/config.js";
import {
  evaluateGovernancePolicyCore,
  getAuditRunsCore,
  getDecisionRegistryCore,
  getEnterpriseReadinessCore,
  getGovernancePoliciesCore,
  getIngestionConnectorsCore,
  getTrustStackCore,
} from "./services/enterprise.js";
import { analyzeForkFingerprintCore } from "./services/fingerprint.js";
import { McpHttpTransportManager } from "./services/mcpHttp.js";
import {
  getEnterpriseOnboardingCore,
  getSupportedChannelsCore,
} from "./services/onboarding.js";
import { scoreBranchReliabilityCore } from "./services/reliability.js";

const MCP_ACCEPT_HEADER = "application/json, text/event-stream";

function normalizeMcpAcceptHeader(request: Request): void {
  request.headers.accept = MCP_ACCEPT_HEADER;

  let acceptHeaderFound = false;
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === "accept") {
      request.rawHeaders[index + 1] = MCP_ACCEPT_HEADER;
      acceptHeaderFound = true;
    }
  }
  if (!acceptHeaderFound) {
    request.rawHeaders.push("Accept", MCP_ACCEPT_HEADER);
  }
}

const app = express();
const demoOrigins = new Set(config.corsAllowedOrigins);
const authMiddleware = createAuthMiddleware(config);
const publicMiddleware = (
  _request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next();
};
const copilotAuthMiddleware =
  config.copilotConnectorAuthMode === "public"
    ? publicMiddleware
    : authMiddleware;
const mcpTransportManager = new McpHttpTransportManager(
  config.mcpTransportMode,
);
const copilotTransportManager = new McpHttpTransportManager(
  config.mcpTransportMode,
  createCopilotMcpServer,
);
const demoAuthMiddleware = config.demoEndpointsPublic
  ? publicMiddleware
  : authMiddleware;

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
  (request: Request, _response: Response, next: NextFunction): void => {
    const isMcpEndpoint =
      request.path === "/mcp" || request.path === "/mcp-copilot";
    const supportsRelaxation =
      request.method === "POST" || request.method === "GET";
    if (
      config.mcpRelaxAcceptHeader &&
      isMcpEndpoint &&
      supportsRelaxation
    ) {
      const accept = request.header("Accept")?.toLowerCase() ?? "";
      if (
        !accept.includes("application/json") ||
        !accept.includes("text/event-stream")
      ) {
        normalizeMcpAcceptHeader(request);
      }
    }
    next();
  },
);

app.use(
  "/demo",
  (request: Request, response: Response, next: NextFunction) => {
    const origin = request.header("Origin");
    if (origin !== undefined && demoOrigins.has(origin)) {
      response.set("Access-Control-Allow-Origin", origin);
      response.set("Vary", "Origin");
    }

    if (request.method === "OPTIONS") {
      if (origin !== undefined && !demoOrigins.has(origin)) {
        response.sendStatus(403);
        return;
      }

      response
        .set("Access-Control-Allow-Methods", "GET, OPTIONS")
        .set("Access-Control-Allow-Headers", "Authorization, Content-Type")
        .sendStatus(204);
      return;
    }

    response.set("Cache-Control", "no-store");
    next();
  },
);

app.get("/health", (_request: Request, response: Response) => {
  response.status(200).json({
    status: "ok",
    service: serviceMetadata.name,
    version: serviceMetadata.version,
  });
});

app.get("/demo/status", (_request: Request, response: Response) => {
  response.status(200).json(getDemoStatus(config));
});

app.get(
  "/demo/cockpit",
  demoAuthMiddleware,
  async (_request: Request, response: Response) => {
    try {
      response.status(200).json(await getEnterpriseCockpitCore());
    } catch (error: unknown) {
      console.error("Demo cockpit request failed.", error);
      response.status(500).json({ error: "Demo cockpit failed." });
    }
  },
);

app.get(
  "/demo/onboarding",
  demoAuthMiddleware,
  (_request: Request, response: Response) => {
    response.status(200).json(getEnterpriseOnboardingCore());
  },
);

app.get(
  "/demo/evidence-graph",
  demoAuthMiddleware,
  (_request: Request, response: Response) => {
    response.status(200).json(getDecisionNetworkCore());
  },
);

app.get(
  "/demo/deployment-footprint",
  demoAuthMiddleware,
  (_request: Request, response: Response) => {
    response.status(200).json(getDeploymentFootprintCore());
  },
);

app.get(
  "/demo/channels",
  demoAuthMiddleware,
  (_request: Request, response: Response) => {
    response.status(200).json(getSupportedChannelsCore());
  },
);

app.get(
  "/demo/analysis/dec_x200_march",
  demoAuthMiddleware,
  async (_request: Request, response: Response) => {
    try {
      response
        .status(200)
        .json(await getDemoAnalysis("dec_x200_march"));
    } catch (error: unknown) {
      console.error("Demo analysis request failed.", error);
      response.status(500).json({ error: "Demo analysis failed." });
    }
  },
);

app.get(
  "/demo/live-fork/dec_vendor_switch",
  demoAuthMiddleware,
  async (_request: Request, response: Response) => {
    try {
      response
        .status(200)
        .json(await getDemoLiveFork("dec_vendor_switch"));
    } catch (error: unknown) {
      console.error("Demo live fork request failed.", error);
      response.status(500).json({ error: "Demo live fork analysis failed." });
    }
  },
);

app.get(
  "/demo/fingerprint",
  demoAuthMiddleware,
  async (_request: Request, response: Response) => {
    try {
      response.status(200).json(await analyzeForkFingerprintCore());
    } catch (error: unknown) {
      console.error("Demo fingerprint request failed.", error);
      response.status(500).json({ error: "Demo fingerprint analysis failed." });
    }
  },
);

app.get(
  "/demo/reliability/dec_x200_march",
  demoAuthMiddleware,
  async (_request: Request, response: Response) => {
    try {
      response.status(200).json(
        await scoreBranchReliabilityCore(
          "dec_x200_march",
          "evt_feb14_supplier",
        ),
      );
    } catch (error: unknown) {
      console.error("Demo reliability request failed.", error);
      response.status(500).json({ error: "Demo reliability analysis failed." });
    }
  },
);

app.get(
  "/demo/enterprise",
  demoAuthMiddleware,
  (_request: Request, response: Response) => {
    response.status(200).json(getEnterpriseReadinessCore());
  },
);

app.get(
  "/demo/registry",
  demoAuthMiddleware,
  async (_request: Request, response: Response) => {
    try {
      response.status(200).json(await getDecisionRegistryCore());
    } catch (error: unknown) {
      console.error("Demo registry request failed.", error);
      response.status(500).json({ error: "Demo registry failed." });
    }
  },
);

app.get(
  "/demo/connectors",
  demoAuthMiddleware,
  (_request: Request, response: Response) => {
    response.status(200).json(getIngestionConnectorsCore());
  },
);

app.get(
  "/demo/policies",
  demoAuthMiddleware,
  (_request: Request, response: Response) => {
    response.status(200).json(getGovernancePoliciesCore());
  },
);

app.get(
  "/demo/audit-runs",
  demoAuthMiddleware,
  async (_request: Request, response: Response) => {
    try {
      response.status(200).json(await getAuditRunsCore());
    } catch (error: unknown) {
      console.error("Demo audit runs request failed.", error);
      response.status(500).json({ error: "Demo audit runs failed." });
    }
  },
);

app.get(
  "/demo/trust-stack",
  demoAuthMiddleware,
  (_request: Request, response: Response) => {
    response.status(200).json(getTrustStackCore());
  },
);

app.get(
  "/demo/policy-evaluation/:decision_id",
  demoAuthMiddleware,
  async (request: Request, response: Response) => {
    const decisionId = request.params.decision_id;
    if (
      typeof decisionId !== "string" ||
      !/^[a-z0-9_]+$/.test(decisionId)
    ) {
      response.status(400).json({ error: "Invalid decision id." });
      return;
    }

    try {
      response
        .status(200)
        .json(await evaluateGovernancePolicyCore(decisionId));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error.";
      if (message.startsWith("Decision not found")) {
        response.status(404).json({ error: "Decision not found." });
        return;
      }
      console.error("Demo policy evaluation request failed.", error);
      response
        .status(500)
        .json({ error: "Demo policy evaluation failed." });
    }
  },
);

app.get(
  "/demo/source/:source_id",
  demoAuthMiddleware,
  async (request: Request, response: Response) => {
    const sourceId = request.params.source_id;
    if (
      typeof sourceId !== "string" ||
      !/^[a-z0-9_]+$/.test(sourceId)
    ) {
      response.status(400).json({ error: "Invalid source id." });
      return;
    }

    try {
      const source = await getDemoSource(sourceId);
      if (source === undefined) {
        response.status(404).json({ error: "Source not found." });
        return;
      }

      response.status(200).json(source);
    } catch (error: unknown) {
      console.error("Demo source request failed.", error);
      response.status(500).json({ error: "Demo source retrieval failed." });
    }
  },
);

async function handleMcpRequest(
  operation: () => Promise<void>,
  response: Response,
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    console.error("MCP request failed.", error);

    if (!response.headersSent) {
      response.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error.",
        },
        id: null,
      });
    }
  }
}

function registerMcpEndpoint(
  endpoint: "/mcp" | "/mcp-copilot",
  manager: McpHttpTransportManager,
  toolCount: number,
  endpointAuthMiddleware: RequestHandler,
): void {
  app.get(
    `${endpoint}/status`,
    endpointAuthMiddleware,
    (_request: Request, response: Response) => {
      if (endpoint === "/mcp-copilot") {
        response.status(200).json({
          ok: true,
          endpoint,
          tool_count: toolCount,
          auth_mode: config.copilotConnectorAuthMode,
          transport_mode: manager.mode,
          relax_accept_header: config.mcpRelaxAcceptHeader,
          connector_test_get_ok: config.mcpConnectorTestGetOk,
        });
        return;
      }

      response.status(200).json({
        ok: true,
        endpoint,
        transport_mode: manager.mode,
        relax_accept_header: config.mcpRelaxAcceptHeader,
        active_sessions: manager.activeSessions,
        auth_mode: config.authMode,
        tool_count: toolCount,
      });
    },
  );

  app.post(
    endpoint,
    endpointAuthMiddleware,
    (request: Request, response: Response) => {
      void handleMcpRequest(
        () => manager.handlePost(request, response),
        response,
      );
    },
  );

  app.get(
    endpoint,
    endpointAuthMiddleware,
    (request: Request, response: Response) => {
      if (
        endpoint === "/mcp-copilot" &&
        config.mcpConnectorTestGetOk &&
        (request.header("Mcp-Session-Id")?.trim() ?? "") === ""
      ) {
        response.status(200).json({
          ok: true,
          endpoint,
          message:
            "Copilot MCP facade is reachable. Use POST for MCP JSON-RPC.",
        });
        return;
      }

      void handleMcpRequest(
        () => manager.handleGet(request, response),
        response,
      );
    },
  );

  app.delete(
    endpoint,
    endpointAuthMiddleware,
    (request: Request, response: Response) => {
      void handleMcpRequest(
        () => manager.handleDelete(request, response),
        response,
      );
    },
  );
}

registerMcpEndpoint(
  "/mcp",
  mcpTransportManager,
  registeredToolNames.length,
  authMiddleware,
);
registerMcpEndpoint(
  "/mcp-copilot",
  copilotTransportManager,
  copilotToolNames.length,
  copilotAuthMiddleware,
);

const httpServer = app.listen(config.port, config.host, () => {
  if (config.authMode === "disabled") {
    console.warn("Authentication disabled for local development.");
  }
  console.log(
    `${serviceMetadata.name} startup ${safeStartupSummary(config)}`,
  );
  console.log(
    `${serviceMetadata.name} listening on http://${config.host}:${config.port}`,
  );
});

httpServer.on("error", (error: Error) => {
  console.error("HTTP server failed.", error);
  process.exitCode = 1;
});

httpServer.on("close", () => {
  void Promise.all([
    mcpTransportManager.closeAll(),
    copilotTransportManager.closeAll(),
  ]);
});
