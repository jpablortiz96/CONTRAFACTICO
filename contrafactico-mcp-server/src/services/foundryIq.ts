import type { Citation, RetrieveResult } from "../types.js";
import {
  getBooleanEnv,
  getEnv,
  requireEnv,
} from "./env.js";
import { retrieveLocalGrounded } from "./localCorpus.js";

const DEFAULT_SEARCH_API_VERSION = "2026-05-01-preview";
const REQUEST_TIMEOUT_MS = 45_000;

type MessageRole = "assistant" | "system" | "user";
type JsonRecord = Record<string, unknown>;

export interface RetrievalHistoryMessage {
  role: MessageRole;
  content: string;
}

export interface FoundryIqQuery {
  query: string;
  history?: RetrievalHistoryMessage[];
}

interface FoundryRequestMessage {
  role: MessageRole;
  content: Array<{
    type: "text";
    text: string;
  }>;
}

interface RetrieveAttempt {
  response: Response;
  payload: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}

function firstRecord(value: unknown): JsonRecord | undefined {
  if (isRecord(value)) {
    return value;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.find(isRecord);
}

function firstStringFromKeys(
  record: JsonRecord | undefined,
  keys: readonly string[],
): string | undefined {
  if (record === undefined) {
    return undefined;
  }
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function extractText(value: unknown, depth = 0): string | undefined {
  if (depth > 6) {
    return undefined;
  }

  const direct = stringValue(value);
  if (direct !== undefined) {
    return direct;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractText(item, depth + 1);
      if (text !== undefined) {
        return text;
      }
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of ["text", "content", "answer", "message", "value"]) {
    const text = extractText(value[key], depth + 1);
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
}

function extractAnswer(payload: unknown): string {
  if (!isRecord(payload)) {
    return extractText(payload) ?? "";
  }

  for (const key of ["response", "content", "answer", "message", "value"]) {
    const answer = extractText(payload[key]);
    if (answer !== undefined) {
      return answer;
    }
  }
  return "";
}

function appendArray(target: unknown[], value: unknown): void {
  if (Array.isArray(value)) {
    target.push(...value);
  }
}

function citationCandidates(payload: unknown): unknown[] {
  if (!isRecord(payload)) {
    return [];
  }

  const candidates: unknown[] = [];
  for (const key of [
    "references",
    "citations",
    "groundingSources",
    "retrievedDocuments",
  ]) {
    appendArray(candidates, payload[key]);
  }

  if (Array.isArray(payload.activity)) {
    for (const activity of payload.activity) {
      if (isRecord(activity)) {
        appendArray(candidates, activity.references);
      }
    }
  }

  return candidates;
}

function normalizeCitation(candidate: unknown): Citation | undefined {
  if (!isRecord(candidate)) {
    return undefined;
  }

  const sourceData = firstRecord(candidate.sourceData);
  const document = firstRecord(candidate.document);
  const sourceId =
    firstStringFromKeys(sourceData, ["source_id", "sourceId", "id"]) ??
    firstStringFromKeys(document, ["source_id", "sourceId", "id"]) ??
    firstStringFromKeys(candidate, [
      "source_id",
      "sourceId",
      "docKey",
      "documentId",
      "id",
    ]);
  if (sourceId === undefined) {
    return undefined;
  }

  const title =
    firstStringFromKeys(sourceData, ["title", "name", "fileName"]) ??
    firstStringFromKeys(document, ["title", "name", "fileName"]) ??
    firstStringFromKeys(candidate, ["title", "name", "fileName", "docKey"]) ??
    sourceId;
  const span =
    firstStringFromKeys(sourceData, [
      "span",
      "content",
      "text",
      "excerpt",
      "chunk",
    ]) ??
    firstStringFromKeys(document, [
      "span",
      "content",
      "text",
      "excerpt",
      "chunk",
    ]) ??
    firstStringFromKeys(candidate, [
      "span",
      "content",
      "text",
      "excerpt",
      "chunk",
      "docKey",
    ]) ??
    title;
  const refId =
    firstStringFromKeys(candidate, ["ref_id", "refId", "referenceId", "id"]) ??
    firstStringFromKeys(sourceData, ["ref_id", "refId"]) ??
    sourceId;

  return {
    source_id: sourceId,
    title,
    span,
    ref_id: refId,
  };
}

function extractCitations(payload: unknown): Citation[] {
  const citations = citationCandidates(payload)
    .map(normalizeCitation)
    .filter((citation) => citation !== undefined);
  const deduplicated = new Map<string, Citation>();
  for (const citation of citations) {
    const key = `${citation.source_id}:${citation.ref_id}`;
    if (!deduplicated.has(key)) {
      deduplicated.set(key, citation);
    }
  }
  return Array.from(deduplicated.values());
}

function normalizeSearchEndpoint(value: string): string {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error("SEARCH_ENDPOINT must be a valid URL.");
  }

  if (endpoint.protocol !== "https:") {
    throw new Error("SEARCH_ENDPOINT must use HTTPS.");
  }
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint.toString().replace(/\/$/, "");
}

function buildMessages(
  query: string,
  history: readonly RetrievalHistoryMessage[],
): FoundryRequestMessage[] {
  return [...history, { role: "user" as const, content: query }].map(
    (message) => ({
      role: message.role,
      content: [{ type: "text", text: message.content }],
    }),
  );
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { content: text };
  }
}

async function postRetrieve(
  url: string,
  apiKey: string,
  body: JsonRecord,
): Promise<RetrieveAttempt> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(
      "Foundry IQ retrieve request could not reach Azure AI Search.",
    );
  }

  return {
    response,
    payload: await parseResponsePayload(response),
  };
}

function safeHttpError(status: number, route: "alternate" | "primary"): Error {
  return new Error(
    `Foundry IQ ${route} retrieve route returned HTTP ${status}.`,
  );
}

export async function retrieveFoundryIqGrounded(
  query: string,
  history: readonly RetrievalHistoryMessage[] = [],
): Promise<RetrieveResult> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length === 0) {
    throw new Error("Foundry IQ retrieve query must not be empty.");
  }

  const searchEndpoint = normalizeSearchEndpoint(requireEnv("SEARCH_ENDPOINT"));
  const knowledgeBaseName = requireEnv("SEARCH_KB_NAME");
  const apiVersion =
    getEnv("SEARCH_API_VERSION", DEFAULT_SEARCH_API_VERSION) ??
    DEFAULT_SEARCH_API_VERSION;
  const apiKey = requireEnv("SEARCH_API_KEY");
  const encodedName = encodeURIComponent(knowledgeBaseName);
  const encodedVersion = encodeURIComponent(apiVersion);
  const primaryUrl =
    `${searchEndpoint}/knowledgebases/${encodedName}/retrieve` +
    `?api-version=${encodedVersion}`;
  const alternateUrl =
    `${searchEndpoint}/knowledgebases('${encodedName}')/retrieve` +
    `?api-version=${encodedVersion}`;
  const requestBody: JsonRecord = {
    messages: buildMessages(normalizedQuery, history),
    retrievalReasoningEffort: { kind: "medium" },
  };

  let attempt = await postRetrieve(primaryUrl, apiKey, requestBody);
  let route: "alternate" | "primary" = "primary";
  if (
    attempt.response.status === 404 ||
    attempt.response.status === 405
  ) {
    route = "alternate";
    attempt = await postRetrieve(alternateUrl, apiKey, requestBody);
  }

  if (!attempt.response.ok) {
    throw safeHttpError(attempt.response.status, route);
  }

  return {
    answer: extractAnswer(attempt.payload),
    citations: extractCitations(attempt.payload),
  };
}

export async function retrieveGrounded(
  query: string,
  history: readonly RetrievalHistoryMessage[] = [],
): Promise<RetrieveResult> {
  if (getBooleanEnv("USE_LOCAL_CORPUS", true)) {
    return retrieveLocalGrounded(query);
  }
  return retrieveFoundryIqGrounded(query, history);
}

export class FoundryIqService {
  public async search(request: FoundryIqQuery): Promise<RetrieveResult> {
    return retrieveGrounded(request.query, request.history);
  }
}
