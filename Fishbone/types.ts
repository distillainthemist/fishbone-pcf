// Data model for the fishbone / Ishikawa diagram. Causes and categories are
// persisted as two separate JSON fields (causeData + diagramCategories) so a
// canvas app can consume each cleanly; the problem statement is its own bound
// text property.

export type CauseStatus = "Hypothesis" | "Confirmed" | "Rejected";

export const STATUSES: CauseStatus[] = ["Hypothesis", "Confirmed", "Rejected"];

/** Hard cap on a root-cause description's length. */
export const MAX_CAUSE_CHARS = 100;

export const DEFAULT_CATEGORIES: string[] = [
  "Measurements",
  "Materials",
  "People",
  "Environment",
  "Methods",
  "Machines",
];

/** Visual styling, driven entirely by input properties (not persisted). */
export interface StyleConfig {
  fontFamily: string;
  diagramColor: string;
  backgroundColor: string;
  effectLabel: string; // heading of the effect box (e.g. "Problem")
  statusColors: Record<CauseStatus, string>;
}

export function defaultStyle(): StyleConfig {
  return {
    fontFamily: "Segoe UI, system-ui, sans-serif",
    diagramColor: "#1b1b1b",
    backgroundColor: "#ffffff",
    effectLabel: "Problem",
    statusColors: {
      Hypothesis: "#f2c811",
      Confirmed: "#107c10",
      Rejected: "#d13438",
    },
  };
}

export interface Cause {
  id: string;
  category: string; // name of the category (bone) this cause hangs off
  text: string; // the root-cause description
  votes: number; // vote tally (non-negative integer)
  status: CauseStatus;
}

/** The in-memory model the editor works on. */
export interface FishboneModel {
  problem: string; // the effect / head of the fish
  categories: string[]; // ordered category (bone) names
  causes: Cause[];
}

export function emptyModel(): FishboneModel {
  return { problem: "", categories: DEFAULT_CATEGORIES.slice(), causes: [] };
}

export function newId(): string {
  return "c" + Math.random().toString(36).slice(2, 9);
}

function isStatus(v: unknown): v is CauseStatus {
  return v === "Hypothesis" || v === "Confirmed" || v === "Rejected";
}

function dedupe(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = String(raw).trim();
    if (name === "") continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Split a comma-separated category string into a clean, de-duplicated list. */
export function parseCategories(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return dedupe(raw.split(","));
}

/**
 * Parse the diagramCategories field: a JSON string array is preferred, but a
 * plain comma-separated list is accepted too (forgiving for canvas makers).
 */
export function parseCategoriesList(raw: string | null | undefined): string[] {
  if (!raw || raw.trim() === "") return [];
  const t = raw.trim();
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (Array.isArray(arr)) return dedupe(arr.map((v) => String(v)));
    } catch {
      /* fall through to CSV */
    }
  }
  return parseCategories(raw);
}

function sanitizeCause(c: Partial<Cause>): Cause {
  const votes = Number(c.votes);
  return {
    id: typeof c.id === "string" && c.id ? c.id : newId(),
    category: typeof c.category === "string" ? c.category : "",
    text:
      typeof c.text === "string" ? c.text.slice(0, MAX_CAUSE_CHARS) : "",
    votes: Number.isFinite(votes) ? Math.max(0, Math.round(votes)) : 0,
    status: isStatus(c.status) ? c.status : "Hypothesis",
  };
}

/**
 * Parse the causeData field defensively; never throws. Accepts a JSON array
 * of causes, or (for migration) a legacy diagramData object whose `causes`
 * property holds the array.
 */
export function parseCauses(raw: string | null | undefined): Cause[] {
  if (!raw || raw.trim() === "") return [];
  try {
    let data = JSON.parse(raw) as unknown;
    if (
      data &&
      !Array.isArray(data) &&
      Array.isArray((data as { causes?: unknown }).causes)
    ) {
      data = (data as { causes: unknown[] }).causes;
    }
    if (!Array.isArray(data)) return [];
    return data
      .filter((c) => c && typeof c === "object")
      .map((c) => sanitizeCause(c as Partial<Cause>));
  } catch {
    return [];
  }
}

export function serializeCauses(causes: Cause[]): string {
  return JSON.stringify(causes);
}

export function serializeCategories(categories: string[]): string {
  return JSON.stringify(categories);
}

/**
 * Extract problem/categories from a legacy combined diagramData blob, so an
 * app previously bound to the old single field migrates without data loss.
 */
export function parseLegacyDiagram(raw: string | null | undefined): {
  problem?: string;
  categories?: string[];
} {
  if (!raw || raw.trim() === "" || !raw.trim().startsWith("{")) return {};
  try {
    const data = JSON.parse(raw) as {
      problem?: unknown;
      categories?: unknown;
    };
    const out: { problem?: string; categories?: string[] } = {};
    if (typeof data.problem === "string" && data.problem) {
      out.problem = data.problem;
    }
    if (Array.isArray(data.categories)) {
      const cats = dedupe(data.categories.map((v) => String(v)));
      if (cats.length) out.categories = cats;
    }
    return out;
  } catch {
    return {};
  }
}
