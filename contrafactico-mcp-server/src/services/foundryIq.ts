import type { Citation, RetrieveResult } from "../types.js";
import {
  getBooleanEnv,
  getEnv,
  requireEnv,
} from "./env.js";
import { retrieveLocalGrounded } from "./localCorpus.js";

const DEFAULT_SEARCH_API_VERSION = "2026-05-01-preview";
const REQUEST_TIMEOUT_MS = 45_000;
const ARTIFACT_ID_PATTERN = /\b((?:dec|evt)_[a-z0-9][a-z0-9_-]*)\b/i;
const MARKDOWN_FILENAME_PATTERN =
  /(?:^|[\\/(\s])([a-z0-9][a-z0-9_-]*)\.md(?:$|[?#)\s])/i;

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

function identifierValue(value: unknown): string | undefined {
  const text = stringValue(value);
  if (text !== undefined) {
    return text;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function firstRecord(value: unknown): JsonRecord | undefined {
  if (isRecord(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
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

function firstIdentifierFromKeys(
  record: JsonRecord | undefined,
  keys: readonly string[],
): string | undefined {
  if (record === undefined) {
    return undefined;
  }
  for (const key of keys) {
    const value = identifierValue(record[key]);
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

function firstTextFromKeys(
  record: JsonRecord | undefined,
  keys: readonly string[],
): string | undefined {
  if (record === undefined) {
    return undefined;
  }
  for (const key of keys) {
    const text = extractText(record[key]);
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
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

function decodeText(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sourceIdFromMarkdownFilename(value: string): string | undefined {
  const match = decodeText(value).match(MARKDOWN_FILENAME_PATTERN);
  return match?.[1]?.toLowerCase();
}

function artifactIdFromText(value: string): string | undefined {
  const match = decodeText(value).match(ARTIFACT_ID_PATTERN);
  return match?.[1]?.toLowerCase();
}

function firstDerivedValue(
  values: readonly (string | undefined)[],
  derive: (value: string) => string | undefined,
): string | undefined {
  for (const value of values) {
    if (value === undefined) {
      continue;
    }
    const derived = derive(value);
    if (derived !== undefined) {
      return derived;
    }
  }
  return undefined;
}

function firstUsefulIdentifier(
  values: readonly (string | undefined)[],
): string | undefined {
  return values.find(
    (value): value is string =>
      value !== undefined && !/^\d+$/.test(value),
  );
}

function normalizeTitleValue(value: string): string | undefined {
  const decoded = decodeText(value).trim();
  if (decoded.length === 0 || /^\d+$/.test(decoded)) {
    return undefined;
  }

  const withoutQuery = decoded.split(/[?#]/, 1)[0] ?? decoded;
  const segments = withoutQuery.split(/[\\/]/);
  return segments.at(-1)?.trim() || decoded;
}

function firstUsefulTitle(
  values: readonly (string | undefined)[],
): string | undefined {
  for (const value of values) {
    if (value === undefined) {
      continue;
    }
    const title = normalizeTitleValue(value);
    if (title !== undefined) {
      return title;
    }
  }
  return undefined;
}

function normalizeCitation(candidate: unknown): Citation | undefined {
  if (!isRecord(candidate)) {
    return undefined;
  }

  const sourceData = firstRecord(candidate.sourceData);
  const document = firstRecord(candidate.document);
  const primarySourceIdentifiers = [
    firstIdentifierFromKeys(sourceData, [
      "source_id",
      "sourceId",
      "documentId",
      "docKey",
    ]),
    firstIdentifierFromKeys(document, [
      "source_id",
      "sourceId",
      "documentId",
      "docKey",
    ]),
    firstIdentifierFromKeys(candidate, [
      "source_id",
      "sourceId",
      "documentId",
      "docKey",
    ]),
  ];
  const fallbackSourceIdentifiers = [
    firstIdentifierFromKeys(sourceData, [
      "id",
      "refId",
      "referenceId",
    ]),
    firstIdentifierFromKeys(document, [
      "id",
      "refId",
      "referenceId",
    ]),
    firstIdentifierFromKeys(candidate, [
      "id",
      "refId",
      "referenceId",
    ]),
  ];
  const sourceNames = [
    firstStringFromKeys(sourceData, [
      "metadata_storage_name",
      "metadata_storage_path",
      "title",
      "fileName",
      "name",
    ]),
    firstStringFromKeys(document, [
      "metadata_storage_name",
      "metadata_storage_path",
      "title",
      "fileName",
      "name",
    ]),
    firstStringFromKeys(candidate, [
      "metadata_storage_name",
      "metadata_storage_path",
      "blobUrl",
      "title",
      "fileName",
      "name",
      "docKey",
    ]),
  ];
  const span =
    firstTextFromKeys(sourceData, [
      "span",
      "content",
      "text",
      "chunk",
      "snippet",
      "excerpt",
    ]) ??
    firstTextFromKeys(document, [
      "span",
      "content",
      "text",
      "chunk",
      "snippet",
      "excerpt",
    ]) ??
    firstTextFromKeys(candidate, [
      "span",
      "content",
      "text",
      "chunk",
      "snippet",
      "excerpt",
    ]);
  const sourceId =
    firstDerivedValue(sourceNames, sourceIdFromMarkdownFilename) ??
    firstDerivedValue(
      primarySourceIdentifiers,
      sourceIdFromMarkdownFilename,
    ) ??
    firstDerivedValue(primarySourceIdentifiers, artifactIdFromText) ??
    firstUsefulIdentifier(primarySourceIdentifiers) ??
    (span === undefined ? undefined : artifactIdFromText(span)) ??
    firstDerivedValue(fallbackSourceIdentifiers, artifactIdFromText) ??
    firstUsefulIdentifier(fallbackSourceIdentifiers) ??
    primarySourceIdentifiers.find((value) => value !== undefined) ??
    fallbackSourceIdentifiers.find((value) => value !== undefined);
  if (sourceId === undefined) {
    return undefined;
  }

  const title =
    firstUsefulTitle([
      firstStringFromKeys(sourceData, [
        "title",
        "fileName",
        "name",
        "metadata_storage_name",
        "metadata_storage_path",
      ]),
      firstStringFromKeys(document, [
        "title",
        "fileName",
        "name",
        "metadata_storage_name",
        "metadata_storage_path",
      ]),
      firstStringFromKeys(candidate, [
        "title",
        "fileName",
        "name",
        "metadata_storage_name",
        "metadata_storage_path",
        "blobUrl",
      ]),
    ]) ??
    sourceId;
  const refId =
    firstIdentifierFromKeys(candidate, [
      "ref_id",
      "refId",
      "referenceId",
      "id",
    ]) ??
    firstIdentifierFromKeys(sourceData, [
      "ref_id",
      "refId",
      "referenceId",
      "id",
    ]) ??
    firstIdentifierFromKeys(document, [
      "ref_id",
      "refId",
      "referenceId",
      "id",
    ]) ??
    sourceId;

  return {
    source_id: sourceId,
    title,
    span: span ?? "",
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

function printFoundryResponseShape(payload: unknown): void {
  if (!getBooleanEnv("FOUNDRY_DEBUG_SHAPE", false)) {
    return;
  }

  const topLevelKeys = isRecord(payload)
    ? Object.keys(payload).sort()
    : [];
  const firstReference = citationCandidates(payload).find(isRecord);
  const referenceKeys =
    firstReference === undefined ? [] : Object.keys(firstReference).sort();

  console.log(
    `Foundry response keys: ${topLevelKeys.join(", ") || "(none)"}`,
  );
  console.log(
    `Foundry first reference keys: ${referenceKeys.join(", ") || "(none)"}`,
  );
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

  printFoundryResponseShape(attempt.payload);

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
