import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod/v4";

import type {
  Artifact,
  Citation,
  Company,
  Decision,
  RetrieveResult,
} from "../types.js";

const corpusDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "corpus",
);

const ArtifactSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["chat", "email", "meeting_transcript", "memo"]),
    timestamp: z.string().datetime({ offset: true }),
    author: z.string().min(1),
    intended_audience: z.array(z.string().min(1)),
    readers: z.array(z.string().min(1)),
    title: z.string().min(1),
    body: z.string().min(1),
    premise_tags: z.array(z.string().min(1)),
    contradicts: z.array(z.string().min(1)),
    related_decision_ids: z.array(z.string().min(1)),
    status: z.enum(["approved", "pending"]).optional(),
  })
  .strict();

const DecisionSchema = ArtifactSchema.extend({
  type: z.literal("decision"),
  statement: z.string().min(1),
  premises: z.array(z.string().min(1)),
  status: z.enum(["approved", "pending"]),
}).strict();

const EventSchema = z.discriminatedUnion("type", [
  ArtifactSchema,
  DecisionSchema,
]);

const CompanySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    employee_count: z.number().int().positive(),
    industry: z.string().min(1),
    headquarters: z.string().min(1),
  })
  .strict();

interface ScoredArtifact {
  artifact: Artifact;
  score: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(normalize(value).match(/[a-z0-9_]+/g) ?? []),
  ).filter((token) => token.length > 1);
}

function parseJson(value: string, source: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${source}: ${message}`);
  }
}

export function getArtifactDocumentPath(sourceId: string): string {
  if (!/^[a-z0-9_]+$/.test(sourceId)) {
    throw new Error(`Invalid artifact source id: ${sourceId}`);
  }

  return resolve(corpusDirectory, "docs", `${sourceId}.md`);
}

function extractDocumentBody(content: string, sourceId: string): string {
  const marker = "\n## Body\n\n";
  const markerIndex = content.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Markdown body section missing for ${sourceId}`);
  }

  const body = content.slice(markerIndex + marker.length).trim();
  if (body.length === 0) {
    throw new Error(`Markdown body is empty for ${sourceId}`);
  }

  return body;
}

export async function loadMarkdownArtifacts(
  events?: Artifact[],
): Promise<Artifact[]> {
  const sourceEvents = events ?? (await loadEvents());
  const docsDirectory = resolve(corpusDirectory, "docs");
  const filenames = (await readdir(docsDirectory))
    .filter((filename) => filename.endsWith(".md"))
    .sort();
  const eventById = new Map(
    sourceEvents.map((event) => [event.id, event]),
  );
  if (filenames.length !== sourceEvents.length) {
    throw new Error(
      `Markdown document count ${filenames.length} does not match event count ${sourceEvents.length}`,
    );
  }

  const artifacts = await Promise.all(
    filenames.map(async (filename): Promise<Artifact> => {
      const sourceId = filename.slice(0, -".md".length);
      const event = eventById.get(sourceId);
      if (event === undefined) {
        throw new Error(
          `Markdown document has no matching event: ${filename}`,
        );
      }

      const content = await readFile(
        getArtifactDocumentPath(sourceId),
        "utf8",
      );
      const body = extractDocumentBody(content, sourceId);
      if (body !== event.body) {
        throw new Error(
          `Markdown body does not match events.jsonl for ${sourceId}`,
        );
      }

      return { ...event, body };
    }),
  );

  const documentedIds = new Set(artifacts.map((artifact) => artifact.id));
  for (const event of sourceEvents) {
    if (!documentedIds.has(event.id)) {
      throw new Error(`Markdown document missing for ${event.id}`);
    }
  }

  return artifacts;
}

function scoreArtifact(
  artifact: Artifact,
  normalizedQuery: string,
  queryTokens: string[],
): number {
  const normalizedId = normalize(artifact.id);
  const normalizedTitle = normalize(artifact.title);
  const normalizedBody = normalize(artifact.body);
  const normalizedTags = artifact.premise_tags.map(normalize);
  const normalizedContradictions = artifact.contradicts.map(normalize);
  const normalizedDecisionIds = artifact.related_decision_ids.map(normalize);
  let score = 0;

  if (normalizedQuery.includes(normalizedId)) {
    score += 120;
  }

  for (const decisionId of normalizedDecisionIds) {
    if (normalizedQuery.includes(decisionId)) {
      score += 80;
    }
  }

  for (const tag of [...normalizedTags, ...normalizedContradictions]) {
    if (normalizedQuery.includes(tag)) {
      score += 45;
    }
  }

  for (const token of queryTokens) {
    if (normalizedId.includes(token)) {
      score += 18;
    }
    if (normalizedTitle.includes(token)) {
      score += 10;
    }
    if (normalizedTags.some((tag) => tag.includes(token))) {
      score += 8;
    }
    if (normalizedContradictions.some((tag) => tag.includes(token))) {
      score += 8;
    }
    if (normalizedBody.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function spanScore(sentence: string, queryTokens: string[]): number {
  const normalizedSentence = normalize(sentence);
  return queryTokens.reduce(
    (score, token) => score + (normalizedSentence.includes(token) ? 1 : 0),
    0,
  );
}

export function exactSpan(
  artifact: Artifact,
  query: string = artifact.title,
): string {
  const sentences = artifact.body
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  const queryTokens = tokenize(query);
  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: spanScore(sentence, queryTokens),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.index - right.index,
    );

  return ranked[0]?.sentence ?? artifact.body;
}

export function citationForArtifact(
  artifact: Artifact,
  query: string = artifact.title,
): Citation {
  return {
    source_id: artifact.id,
    title: artifact.title,
    span: exactSpan(artifact, query),
    ref_id: `cite_${artifact.id}`,
  };
}

export async function loadCompany(): Promise<Company> {
  const raw = await readFile(resolve(corpusDirectory, "company.json"), "utf8");
  return CompanySchema.parse(parseJson(raw, "company.json"));
}

export async function loadEvents(): Promise<Artifact[]> {
  const raw = await readFile(resolve(corpusDirectory, "events.jsonl"), "utf8");
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) =>
      EventSchema.parse(parseJson(line, `events.jsonl:${index + 1}`)),
    );
}

export async function loadDecisions(): Promise<Decision[]> {
  const raw = await readFile(
    resolve(corpusDirectory, "decisions.json"),
    "utf8",
  );
  return z
    .array(DecisionSchema)
    .parse(parseJson(raw, "decisions.json")) as Decision[];
}

export async function getDecision(
  decisionId: string,
): Promise<Decision | undefined> {
  const decisions = await loadDecisions();
  return decisions.find((decision) => decision.id === decisionId);
}

export async function getEvent(
  eventId: string,
): Promise<Artifact | undefined> {
  const events = await loadEvents();
  return events.find((event) => event.id === eventId);
}

export async function retrieveLocalGrounded(
  query: string,
): Promise<RetrieveResult> {
  const normalizedQuery = normalize(query);
  const queryTokens = tokenize(query);
  const events = await loadEvents();
  const markdownArtifacts = await loadMarkdownArtifacts(events);
  const ranked: ScoredArtifact[] = markdownArtifacts
    .map((artifact) => ({
      artifact,
      score: scoreArtifact(artifact, normalizedQuery, queryTokens),
    }))
    .filter((result) => result.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.artifact.timestamp.localeCompare(right.artifact.timestamp) ||
        left.artifact.id.localeCompare(right.artifact.id),
    )
    .slice(0, 5);

  if (ranked.length === 0) {
    return {
      answer: "No grounded local corpus evidence matched the query.",
      citations: [],
    };
  }

  const citations = ranked.map(({ artifact }) =>
    citationForArtifact(artifact, query),
  );
  const answer = citations
    .map((citation) => `${citation.title}: ${citation.span}`)
    .join("\n");

  return { answer, citations };
}
