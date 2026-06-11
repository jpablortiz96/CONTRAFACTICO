import { loadConfig } from "./services/config.js";

export const serviceMetadata = Object.freeze({
  name: "contrafactico-mcp-server",
  version: "0.1.0",
});

export const config = loadConfig();
