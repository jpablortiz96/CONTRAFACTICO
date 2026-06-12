import { randomUUID } from "node:crypto";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";

import { createMcpServer } from "../mcpServer.js";
import type { McpTransportMode } from "./config.js";

type McpServerFactory = () => McpServer;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInitializeRequest(body: unknown): boolean {
  return isRecord(body) && body.method === "initialize";
}

function sessionIdFrom(request: Request): string | undefined {
  const sessionId = request.header("Mcp-Session-Id")?.trim();
  return sessionId === "" ? undefined : sessionId;
}

function jsonRpcError(
  response: Response,
  status: number,
  message: string,
  allow?: string,
): void {
  if (allow !== undefined) {
    response.set("Allow", allow);
  }

  response.status(status).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message,
    },
    id: null,
  });
}

function compatibilityError(
  response: Response,
  status: number,
  message: string,
  allow?: string,
): void {
  if (allow !== undefined) {
    response.set("Allow", allow);
  }

  response.status(status).json({
    ok: false,
    error: message,
  });
}

export class McpHttpTransportManager {
  private readonly transports =
    new Map<string, StreamableHTTPServerTransport>();
  private readonly servers = new Map<string, McpServer>();

  public constructor(
    public readonly mode: McpTransportMode,
    private readonly serverFactory: McpServerFactory = createMcpServer,
  ) {}

  public get activeSessions(): number {
    return this.transports.size;
  }

  public async handlePost(
    request: Request,
    response: Response,
  ): Promise<void> {
    if (this.mode === "stateless") {
      await this.handleStatelessPost(request, response);
      return;
    }

    const sessionId = sessionIdFrom(request);
    if (sessionId !== undefined) {
      const transport = this.transports.get(sessionId);
      if (transport === undefined) {
        jsonRpcError(
          response,
          400,
          "Mcp-Session-Id is missing or does not identify an active session.",
        );
        return;
      }

      await transport.handleRequest(request, response, request.body);
      return;
    }

    if (!isInitializeRequest(request.body)) {
      jsonRpcError(
        response,
        400,
        "A new stateful MCP session must begin with an initialize request.",
      );
      return;
    }

    await this.initializeStatefulSession(request, response);
  }

  public async handleGet(
    request: Request,
    response: Response,
  ): Promise<void> {
    if (this.mode === "stateless") {
      compatibilityError(
        response,
        405,
        "GET requires MCP_TRANSPORT_MODE=stateful.",
        "POST",
      );
      return;
    }

    const sessionId = sessionIdFrom(request);
    if (sessionId === undefined) {
      compatibilityError(
        response,
        400,
        "Mcp-Session-Id header is required for GET in stateful mode.",
      );
      return;
    }

    const transport = this.transports.get(sessionId);
    if (transport === undefined) {
      compatibilityError(
        response,
        400,
        "Mcp-Session-Id does not identify an active session.",
      );
      return;
    }

    await transport.handleRequest(request, response);
  }

  public async handleDelete(
    request: Request,
    response: Response,
  ): Promise<void> {
    if (this.mode === "stateless") {
      jsonRpcError(
        response,
        405,
        "DELETE requires MCP_TRANSPORT_MODE=stateful.",
        "POST",
      );
      return;
    }

    const sessionId = sessionIdFrom(request);
    if (sessionId === undefined) {
      jsonRpcError(
        response,
        400,
        "Mcp-Session-Id is required for stateful MCP requests.",
      );
      return;
    }

    const transport = this.transports.get(sessionId);
    const server = this.servers.get(sessionId);
    if (transport === undefined || server === undefined) {
      jsonRpcError(
        response,
        400,
        "Mcp-Session-Id is missing or does not identify an active session.",
      );
      return;
    }

    try {
      await transport.handleRequest(request, response);
    } finally {
      this.removeSession(sessionId);
      await server.close();
    }
  }

  public async closeAll(): Promise<void> {
    const servers = [...this.servers.values()];
    this.transports.clear();
    this.servers.clear();
    await Promise.allSettled(servers.map(async (server) => server.close()));
  }

  private async handleStatelessPost(
    request: Request,
    response: Response,
  ): Promise<void> {
    const server = this.serverFactory();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    response.once("close", () => {
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  }

  private async initializeStatefulSession(
    request: Request,
    response: Response,
  ): Promise<void> {
    const server = this.serverFactory();
    let initializedSessionId: string | undefined;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: randomUUID,
      onsessioninitialized: (sessionId: string): void => {
        initializedSessionId = sessionId;
        this.transports.set(sessionId, transport);
        this.servers.set(sessionId, server);
      },
      onsessionclosed: (sessionId: string): void => {
        this.removeSession(sessionId);
      },
    });

    transport.onclose = (): void => {
      if (initializedSessionId !== undefined) {
        this.removeSession(initializedSessionId);
      }
    };

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } finally {
      if (initializedSessionId === undefined) {
        await server.close();
      }
    }
  }

  private removeSession(sessionId: string): void {
    this.transports.delete(sessionId);
    this.servers.delete(sessionId);
  }
}
