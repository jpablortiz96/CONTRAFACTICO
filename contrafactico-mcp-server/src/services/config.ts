import {
  getBooleanEnv,
  getCsvEnv,
  getEnv,
  requireEnv,
} from "./env.js";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_SEARCH_API_VERSION = "2026-05-01-preview";
const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3001",
  "http://localhost:3100",
] as const;

export type AuthMode = "dev-bearer" | "disabled" | "entra-jwt";
export type EvidenceMode = "foundry" | "local";

export interface RuntimeConfig {
  nodeEnv: string;
  isProduction: boolean;
  host: string;
  port: number;
  useLocalCorpus: boolean;
  evidenceMode: EvidenceMode;
  corsAllowedOrigins: readonly string[];
  demoEndpointsPublic: boolean;
  authMode: AuthMode;
  devBearerToken?: string;
  entraTenantId?: string;
  entraAudience?: string;
  entraIssuer?: string;
  entraJwksUri?: string;
  searchEndpoint?: string;
  searchKnowledgeBaseName?: string;
  searchApiVersion?: string;
  searchApiKey?: string;
}

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

function readHttpsUrl(name: string, fallback?: string): string {
  const value = fallback === undefined
    ? requireEnv(name)
    : (getEnv(name, fallback) ?? fallback);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }
  return url.toString();
}

function readCorsOrigins(): readonly string[] {
  const origins = getCsvEnv(
    "CORS_ALLOWED_ORIGINS",
    DEFAULT_CORS_ORIGINS,
  );
  if (origins.includes("*")) {
    throw new Error("CORS_ALLOWED_ORIGINS must not contain a wildcard.");
  }

  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(
        "CORS_ALLOWED_ORIGINS must contain valid origins.",
      );
    }
    if (
      url.origin !== origin ||
      (url.protocol !== "https:" &&
        url.hostname !== "localhost" &&
        url.hostname !== "127.0.0.1")
    ) {
      throw new Error(
        "CORS_ALLOWED_ORIGINS must use HTTPS except for localhost.",
      );
    }
  }

  return Object.freeze(origins);
}

function readAuthMode(isProduction: boolean): AuthMode {
  const configured = getEnv("AUTH_MODE");
  if (configured === undefined) {
    if (isProduction) {
      throw new Error(
        "AUTH_MODE must be explicitly set when NODE_ENV=production.",
      );
    }
    return "disabled";
  }

  if (
    configured !== "disabled" &&
    configured !== "dev-bearer" &&
    configured !== "entra-jwt"
  ) {
    throw new Error(
      'AUTH_MODE must be "disabled", "dev-bearer", or "entra-jwt".',
    );
  }
  if (isProduction && configured === "disabled") {
    throw new Error(
      "AUTH_MODE=disabled is not allowed when NODE_ENV=production.",
    );
  }
  return configured;
}

export function loadConfig(): Readonly<RuntimeConfig> {
  const nodeEnv = getEnv("NODE_ENV", "development") ?? "development";
  const isProduction = nodeEnv === "production";
  const useLocalCorpus = getBooleanEnv("USE_LOCAL_CORPUS", true);
  const authMode = readAuthMode(isProduction);
  const tenantId =
    authMode === "entra-jwt" ? requireEnv("ENTRA_TENANT_ID") : undefined;
  const defaultIssuer =
    tenantId === undefined
      ? undefined
      : `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/v2.0`;
  const defaultJwksUri =
    tenantId === undefined
      ? undefined
      : `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`;

  const config: RuntimeConfig = {
    nodeEnv,
    isProduction,
    host: getEnv("HOST", DEFAULT_HOST) ?? DEFAULT_HOST,
    port: readPort(),
    useLocalCorpus,
    evidenceMode: useLocalCorpus ? "local" : "foundry",
    corsAllowedOrigins: readCorsOrigins(),
    demoEndpointsPublic: getBooleanEnv(
      "DEMO_ENDPOINTS_PUBLIC",
      !isProduction,
    ),
    authMode,
  };

  if (!useLocalCorpus) {
    config.searchEndpoint = readHttpsUrl("SEARCH_ENDPOINT");
    config.searchKnowledgeBaseName = requireEnv("SEARCH_KB_NAME");
    config.searchApiVersion =
      getEnv("SEARCH_API_VERSION", DEFAULT_SEARCH_API_VERSION) ??
      DEFAULT_SEARCH_API_VERSION;
    config.searchApiKey = requireEnv("SEARCH_API_KEY");
  }

  if (authMode === "dev-bearer") {
    config.devBearerToken = requireEnv("DEV_BEARER_TOKEN");
  }

  if (authMode === "entra-jwt") {
    config.entraTenantId = tenantId;
    config.entraAudience = requireEnv("ENTRA_AUDIENCE");
    config.entraIssuer = readHttpsUrl("ENTRA_ISSUER", defaultIssuer);
    config.entraJwksUri = readHttpsUrl("ENTRA_JWKS_URI", defaultJwksUri);
  }

  return Object.freeze(config);
}

export function safeStartupSummary(config: RuntimeConfig): string {
  const knowledgeBase =
    config.searchKnowledgeBaseName === undefined
      ? "none"
      : config.searchKnowledgeBaseName;

  return [
    `port=${config.port}`,
    `evidence_mode=${config.evidenceMode}`,
    `auth_mode=${config.authMode}`,
    `demo_endpoints_public=${config.demoEndpointsPublic ? "yes" : "no"}`,
    `knowledge_base=${knowledgeBase}`,
  ].join(" ");
}
