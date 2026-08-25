export interface ParsedRevisionPoint {
  id: number;
  text: string;
}

export interface ParsedRevision {
  title: string;
  points: ParsedRevisionPoint[];
}

export interface ParsedLearningContent {
  content: string;
  revision: ParsedRevision | null;
}

const REVISION_MARKER = /---\s*REVISION\s*---/i;

function parseJsonObject(raw: string): unknown {
  let candidate = raw.trim();
  candidate = candidate.replace(/^```(?:json)?\s*/i, "");
  candidate = candidate.replace(/\s*```\s*$/i, "").trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeRevision(value: unknown): ParsedRevision | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const rawPoints = Array.isArray(record.points)
    ? record.points
    : Array.isArray(record.bullets)
      ? record.bullets
      : [];

  const points = rawPoints
    .map((point, index) => {
      const text = typeof point === "string"
        ? point
        : point && typeof point === "object"
          ? (point as Record<string, unknown>).text
            || (point as Record<string, unknown>).point
            || (point as Record<string, unknown>).content
          : null;

      if (typeof text !== "string" || !text.trim()) return null;
      return { id: index + 1, text: text.trim() };
    })
    .filter((point): point is ParsedRevisionPoint => point !== null)
    .slice(0, 6);

  if (points.length === 0) return null;
  return {
    title: typeof record.title === "string" && record.title.trim()
      ? record.title.trim()
      : "Key Takeaways",
    points,
  };
}

/**
 * Removes the internal revision trailer from lesson text and returns its
 * structured points for the Key Takeaways card. The body is still cleaned if
 * the trailer JSON is incomplete, which is important while a stream is being
 * received or when an older cache contains malformed metadata.
 */
export function parseRevisionPayload(content: string): ParsedLearningContent {
  const marker = REVISION_MARKER.exec(content);
  if (!marker) return { content, revision: null };

  const cleanContent = content.slice(0, marker.index).trim();
  const revision = normalizeRevision(parseJsonObject(content.slice(marker.index + marker[0].length)));
  return { content: cleanContent, revision };
}

export function stripRevisionPayload(content: string): string {
  return parseRevisionPayload(content).content;
}
