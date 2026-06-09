import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, {
  type Request,
  type Response,
} from "express";

import { config, serviceMetadata } from "./constants.js";
import { registerFindBranchPointTool } from "./tools/findBranchPoint.js";
import { registerLiveForkWatchTool } from "./tools/liveForkWatch.js";
import { registerPriceTheGapTool } from "./tools/priceTheGap.js";
import { registerRewindDecisionTool } from "./tools/rewindDecision.js";
import { registerSimulateCounterfactualTool } from "./tools/simulateCounterfactual.js";

function createMcpServer(): McpServer {
  const server = new McpServer(serviceMetadata);

  registerRewindDecisionTool(server);
  registerFindBranchPointTool(server);
  registerSimulateCounterfactualTool(server);
  registerPriceTheGapTool(server);
  registerLiveForkWatchTool(server);

  return server;
}

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
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request: Request, response: Response) => {
  response.status(200).json({
    status: "ok",
    service: serviceMetadata.name,
    version: serviceMetadata.version,
  });
});

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
  console.log(
    `${serviceMetadata.name} listening on http://${config.host}:${config.port}`,
  );
});

httpServer.on("error", (error: Error) => {
  console.error("HTTP server failed.", error);
  process.exitCode = 1;
});
