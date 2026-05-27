import { auth } from "@/lib/firebase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export type DocsVisibility = {
  enabled: boolean;
  mode: "window" | "duration" | string;
  timezone?: string;
  startAt?: string | null;
  endAt?: string | null;
  durationHours?: number | null;
};

export type DocsMember = {
  fullName: string;
  role: string;
  email: string;
  photoUrl?: string;
};

export type PitchSection = {
  id: string;
  title: string;
  eyebrow?: string;
  summary?: string;
  bullets?: string[];
};

export type DocsFeature = {
  name: string;
  status: "current" | "upcoming" | "planned" | string;
  source?: string;
  notes?: string;
};

export type DocsApiDoc = {
  method: string;
  path: string;
  auth: string;
  description: string;
  status?: string;
};

export type DocsState = {
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  tagline?: string;
  summary?: string;
  status?: string;
  version?: number;
  publishedAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  visibility: DocsVisibility;
  team: {
    name?: string;
    members: DocsMember[];
  };
  pitchDeck: PitchSection[];
  productOverview?: {
    whatItDoes?: string;
    targetUsers?: string[];
    coreUseCases?: string[];
  };
  featureMatrix: DocsFeature[];
  architecture?: { mermaid?: string };
  dataFlow?: { mermaid?: string };
  technologyStack?: Record<string, string[]>;
  apiDocumentation: DocsApiDoc[];
  dataLayer?: Record<string, string[]>;
  aiLayer?: Record<string, string[]>;
  roadmap?: Record<string, string[]>;
  performance?: Record<string, string[]>;
  security?: Record<string, string[]>;
  analytics?: Record<string, string[]>;
  extensibility?: Record<string, string[]>;
  changelog?: Array<{ version: string; date: string; changes: string[] }>;
  live?: Record<string, unknown>;
  access?: {
    enabled: boolean;
    active: boolean;
    mode: string;
    timezone?: string;
    startAt?: string | null;
    endAt?: string | null;
    now?: string | null;
    durationHours?: number | null;
  };
  admin?: { editable: boolean; claims?: Record<string, unknown> };
  versions?: Array<{ version: number; publishedAt: string; note?: string }>;
};

type DocsError = Error & { status?: number; detail?: unknown };

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function readBodySafely(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text.slice(0, 300),
      raw: text,
    };
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await readBodySafely(res);

  if (!res.ok) {
    const detail = body as { message?: string; detail?: unknown; raw?: string };
    const error = new Error(
      detail?.message || (typeof detail?.detail === "string" ? detail.detail : undefined) || res.statusText
    ) as DocsError;
    error.status = res.status;
    error.detail = detail;
    throw error;
  }

  if (body && typeof body === "object" && "message" in body && !("id" in body)) {
    // If we accidentally fetched an HTML page, make the failure easier to understand.
    const maybeRaw = (body as { raw?: string }).raw;
    if (maybeRaw?.startsWith("<!DOCTYPE") || maybeRaw?.startsWith("<html")) {
      throw new Error(
        `Docs backend returned HTML instead of JSON. Check VITE_API_URL (current: ${API_BASE || "unset"}) and ensure the backend is running.`
      );
    }
  }

  return body as T;
}

export async function fetchPublicDocs(): Promise<DocsState> {
  return requestJson<DocsState>("/docs");
}

export async function fetchAdminDocs(): Promise<DocsState> {
  return requestJson<DocsState>("/docs/admin", {
    headers: await getAuthHeader(),
  });
}

export async function saveAdminDocs(docs: DocsState, publish = false): Promise<DocsState> {
  return requestJson<DocsState>("/docs/admin", {
    method: "PUT",
    headers: await getAuthHeader(),
    body: JSON.stringify({ docs, publish }),
  });
}

export async function updateDocsVisibility(visibility: Partial<DocsVisibility>): Promise<DocsState> {
  return requestJson<DocsState>("/docs/admin/visibility", {
    method: "PATCH",
    headers: await getAuthHeader(),
    body: JSON.stringify(visibility),
  });
}

export async function downloadDocsMarkdown(): Promise<string> {
  const res = await fetch(`${API_BASE}/docs/export/markdown`);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.message || res.statusText);
  }
  return res.text();
}

export async function isAdminUser(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdTokenResult();
  const claims = token.claims ?? {};
  if (
    claims.admin ||
    claims.superAdmin ||
    claims.super_admin ||
    claims.role === "admin" ||
    claims.role === "superadmin" ||
    claims.role === "super-admin"
  ) {
    return true;
  }

  try {
    await fetchAdminDocs();
    return true;
  } catch (error) {
    const status = (error as DocsError | undefined)?.status;
    return status !== 401 && status !== 403 ? false : false;
  }
}

export function buildDocsMarkdown(docs: DocsState): string {
  const lines: string[] = [];
  lines.push(`# ${docs.title}`);
  if (docs.subtitle) lines.push(`_${docs.subtitle}_`);
  if (docs.summary) lines.push(docs.summary);

  lines.push("\n## YC-style Pitch Deck");
  docs.pitchDeck.forEach((section) => {
    lines.push(`\n### ${section.title}`);
    if (section.summary) lines.push(section.summary);
    section.bullets?.forEach((bullet) => lines.push(`- ${bullet}`));
  });

  if (docs.productOverview) {
    lines.push("\n## Product Overview");
    if (docs.productOverview.whatItDoes) lines.push(`- What it does: ${docs.productOverview.whatItDoes}`);
    docs.productOverview.targetUsers?.forEach((item) => lines.push(`- Target user: ${item}`));
    docs.productOverview.coreUseCases?.forEach((item) => lines.push(`- Use case: ${item}`));
  }

  lines.push("\n## Team");
  if (docs.team.name) lines.push(`- Team name: ${docs.team.name}`);
  docs.team.members.forEach((member) => {
    lines.push(`- ${member.fullName} — ${member.role} — ${member.email}`);
  });

  lines.push("\n## Changelog");
  (docs.changelog ?? []).forEach((entry) => {
    lines.push(`- ${entry.version} (${entry.date})`);
    entry.changes.forEach((change) => lines.push(`  - ${change}`));
  });

  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
