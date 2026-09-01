/**
 * usageApi — client for the CodeEngine account usage statistics API.
 *
 * Endpoints:
 *   Summary: GET /api/usage/summary?days=182
 *
 * ``days`` rows are sparse (only days with data); the frontend fills zeros.
 * All functions take the backend base URL + JWT token explicitly, matching
 * the memoryApi/skillApi convention.
 */

import { apiFetch } from "./api";

export interface UsageDayRow {
  day: string; // YYYY-MM-DD
  model: string;
  input_tokens: number;
  output_tokens: number;
  requests: number;
}

export interface UsageModelRow {
  model: string;
  input_tokens: number;
  output_tokens: number;
  requests: number;
  total_tokens: number;
}

export interface UsageTotals {
  input_tokens: number;
  output_tokens: number;
  requests: number;
  active_days: number;
}

export interface UsageSummary {
  days: UsageDayRow[];
  by_model: UsageModelRow[];
  totals: UsageTotals;
  range: { days: number; start: string; end: string };
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

export async function fetchUsageSummary(
  baseUrl: string,
  token: string,
  days = 182,
): Promise<UsageSummary> {
  const res = await apiFetch(`${baseUrl}/api/usage/summary?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  return unwrap<UsageSummary>(await res.json());
}
