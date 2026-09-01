/**
 * memoryApi — client for the CodeEngine Memory settings API.
 *
 * Endpoints:
 *   List entries:   GET    /api/memory/entries?scope=&project_id=&thread_id=
 *   Thread summary: GET    /api/memory/threads
 *   Delete entry:   DELETE /api/memory/entries/{id}
 *   Clear scope:    POST   /api/memory/clear
 *
 * All functions take the backend base URL + JWT token explicitly, matching
 * the skillApi/projectApi convention.
 */

import { apiFetch } from "./api";

export type MemoryScope = "user" | "project" | "thread";

export interface MemoryEntry {
  id: string;
  scope: MemoryScope;
  category: string; // preference | decision | project_context | fact
  content: string;
  source_count: number;
  version: number;
  updated_at: string;
}

export interface MemoryThreadSummary {
  thread_id: string;
  thread_name: string;
  project_id: string;
  project_name: string;
  entry_count: number;
  latest_updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function detail(res: Response): Promise<string> {
  try {
    const j = await res.json();
    const d = j?.detail ?? j?.message;
    return typeof d === "string" ? d : JSON.stringify(d ?? j);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

function unwrap<T>(json: any): T {
  return json?.data ?? json;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function listMemoryEntries(
  baseUrl: string,
  token: string,
  opts: { scope: MemoryScope; projectId?: string; threadId?: string }
): Promise<MemoryEntry[]> {
  const params = new URLSearchParams({ scope: opts.scope });
  if (opts.projectId) params.set("project_id", opts.projectId);
  if (opts.threadId) params.set("thread_id", opts.threadId);
  const res = await apiFetch(
    `${baseUrl}/api/memory/entries?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  const data = unwrap<{ entries?: MemoryEntry[] }>(await res.json());
  return data?.entries ?? [];
}

export async function listMemoryThreads(
  baseUrl: string,
  token: string
): Promise<MemoryThreadSummary[]> {
  const res = await apiFetch(`${baseUrl}/api/memory/threads`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  const data = unwrap<{ threads?: MemoryThreadSummary[] }>(await res.json());
  return data?.threads ?? [];
}

export async function deleteMemoryEntry(
  baseUrl: string,
  token: string,
  entryId: string
): Promise<void> {
  const res = await apiFetch(`${baseUrl}/api/memory/entries/${entryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
}

export async function clearMemoryScope(
  baseUrl: string,
  token: string,
  opts: { scope: MemoryScope; projectId?: string; threadId?: string }
): Promise<number> {
  const res = await apiFetch(`${baseUrl}/api/memory/clear`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      scope: opts.scope,
      project_id: opts.projectId ?? "",
      thread_id: opts.threadId ?? "",
    }),
  });
  if (!res.ok) throw new Error(await detail(res));
  const data = unwrap<{ removed?: number }>(await res.json());
  return data?.removed ?? 0;
}
