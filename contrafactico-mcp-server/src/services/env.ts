function normalizeEnvironmentValue(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0
    ? undefined
    : normalized;
}

export function getEnv(
  name: string,
  fallback?: string,
): string | undefined {
  return normalizeEnvironmentValue(process.env[name]) ?? fallback;
}

export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }
  return value;
}

export function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = getEnv(name);
  if (value === undefined) {
    return fallback;
  }

  if (value.toLowerCase() === "true") {
    return true;
  }
  if (value.toLowerCase() === "false") {
    return false;
  }

  throw new Error(`${name} must be either "true" or "false".`);
}

export function getCsvEnv(
  name: string,
  fallback: readonly string[] = [],
): string[] {
  const value = getEnv(name);
  if (value === undefined) {
    return [...fallback];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
