import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";

import { config, serviceMetadata } from "./constants.js";
import { createMcpServer } from "./mcpServer.js";
import { createAuthMiddleware } from "./services/auth.js";
import {
  getDemoAnalysis,
  getDemoLiveFork,
  getDemoSource,
} from "./services/demo.js";
import { getDemoStatus } from "./services/evidenceStatus.js";
import { safeStartupSummary } from "./services/config.js";
import { analyzeForkFingerprintCore } from "./services/fingerprint.js";
import { scoreBranchReliabilityCore } from "./services/reliability.js";

function methodNotAllowed(response: Response): void {
  response
    .status(405)
    .set("Allow", "POST")
    .json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed in stateless mode.",
      },
      id: null,
    });
}

const app = express();
const demoOrigins = new Set(config.corsAllowedOrigins);
const authMiddleware = createAuthMiddleware(config);
const demoAuthMiddleware = config.demoEndpointsPublic
  ? (_request: Request, _response: Response, next: NextFunction): void => {
      next();
    }
  : authMiddleware;

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

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

app.use("/mcp", authMiddleware);

app.post("/mcp", async (request: Request, response: Response) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  response.on("close", () => {
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
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
});

app.get("/mcp", (_request: Request, response: Response) => {
  methodNotAllowed(response);
});

app.delete("/mcp", (_request: Request, response: Response) => {
  methodNotAllowed(response);
});

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
