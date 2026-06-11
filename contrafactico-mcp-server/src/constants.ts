import {
  getBooleanEnv,
  getCsvEnv,
  getEnv,
} from "./services/env.js";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3001",
  "http://localhost:3000",
] as const;

function readPort(): number {
  const rawPort = getEnv("PORT");
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function readCorsOrigins(): string[] {
  const origins = getCsvEnv(
    "CORS_ALLOWED_ORIGINS",
    DEFAULT_CORS_ORIGINS,
  );
  if (origins.includes("*")) {
    throw new Error("CORS_ALLOWED_ORIGINS must not contain a wildcard.");
  }
  return origins;
}

export const config = Object.freeze({
  host: getEnv("HOST", DEFAULT_HOST) ?? DEFAULT_HOST,
  port: readPort(),
  useLocalCorpus: getBooleanEnv("USE_LOCAL_CORPUS", true),
  corsAllowedOrigins: Object.freeze(readCorsOrigins()),
});

export const serviceMetadata = Object.freeze({
  name: "contrafactico-mcp-server",
  version: "0.1.0",
});
