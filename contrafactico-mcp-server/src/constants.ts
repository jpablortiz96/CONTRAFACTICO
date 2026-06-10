const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";

function readOptionalEnvironmentVariable(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

function readPort(): number {
  const rawPort = readOptionalEnvironmentVariable("PORT");
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function readBooleanEnvironmentVariable(
  name: string,
  defaultValue: boolean,
): boolean {
  const value = readOptionalEnvironmentVariable(name)?.toLowerCase();
  if (value === undefined) {
    return defaultValue;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be either "true" or "false".`);
}

export const config = Object.freeze({
  host: readOptionalEnvironmentVariable("HOST") ?? DEFAULT_HOST,
  port: readPort(),
  useLocalCorpus: readBooleanEnvironmentVariable("USE_LOCAL_CORPUS", true),
  foundryIqEndpoint: readOptionalEnvironmentVariable("FOUNDRY_IQ_ENDPOINT"),
  azureOpenAiEndpoint: readOptionalEnvironmentVariable("AZURE_OPENAI_ENDPOINT"),
  azureOpenAiDeployment: readOptionalEnvironmentVariable(
    "AZURE_OPENAI_DEPLOYMENT",
  ),
});

export const serviceMetadata = Object.freeze({
  name: "contrafactico-mcp-server",
  version: "0.1.0",
});
