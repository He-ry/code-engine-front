/**
 * Per-user web-search settings (设置 → 联网搜索) — backed by
 * `user_search_settings` on the server. Keys are stored encrypted
 * server-side; reads return the "••••••••" mask sentinel when a key exists
 * (empty string = never set). Saving sends "" to KEEP the stored key.
 */

import { apiFetch } from "./api";

export type SearchBackendKind = "tavily" | "brave";

export interface WebSearchSettings {
  /** "" = not configured yet */
  backend: SearchBackendKind | "";
  tavilyApiKey: string; // mask sentinel or ""
  hasTavilyKey: boolean;
  braveApiKey: string; // mask sentinel or ""
  hasBraveKey: boolean;
  baseUrl: string;
  updatedAt: string | null;
}

export interface SaveSearchSettingsBody {
  backend: SearchBackendKind;
  tavily_api_key: string; // "" = keep stored key
  brave_api_key: string; // "" = keep stored key
  base_url: string;
}

export interface SearchTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  results_count?: number;
}

async function detail(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j?.detail || j?.message || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function mapSettings(d: any): WebSearchSettings {
  return {
    backend: (d?.backend || "") as SearchBackendKind | "",
    tavilyApiKey: d?.tavily_api_key || "",
    hasTavilyKey: Boolean(d?.has_tavily_key),
    braveApiKey: d?.brave_api_key || "",
    hasBraveKey: Boolean(d?.has_brave_key),
    baseUrl: d?.base_url || "",
    updatedAt: d?.updated_at ?? null,
  };
}

export async function getSearchSettings(
  baseUrl: string,
  token: string
): Promise<WebSearchSettings> {
  const res = await apiFetch(`${baseUrl}/api/settings/search`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  return mapSettings(json?.data ?? json);
}

export async function saveSearchSettings(
  baseUrl: string,
  token: string,
  body: SaveSearchSettingsBody
): Promise<WebSearchSettings> {
  const res = await apiFetch(`${baseUrl}/api/settings/search`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  return mapSettings(json?.data ?? json);
}

export async function testSearchSettings(
  baseUrl: string,
  token: string,
  body: { backend?: string; tavily_api_key?: string; brave_api_key?: string; base_url?: string }
): Promise<SearchTestResult> {
  const res = await apiFetch(`${baseUrl}/api/settings/search/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  return json?.data ?? json;
}
