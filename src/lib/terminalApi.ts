/**
 * terminalApi — client for /api/terminal/* (REST + WebSocket).
 */

import { apiFetch } from "./api";

export interface TerminalSession {
  id: string;
  project_id: string;
  command: string[];
  cwd: string;
  cols: number;
  rows: number;
  created_at: number;
  exited: boolean;
  exit_code: number | null;
}

async function detail(res: Response): Promise<string> {
  try {
    const j = await res.json();
    const d = j?.detail ?? j?.message ?? j?.data;
    return typeof d === "string" ? d : JSON.stringify(d ?? j);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function createTerminal(
  baseUrl: string,
  token: string,
  projectId: string,
  command?: string[],
  cols?: number,
  rows?: number,
): Promise<{ terminal_id: string; project_id: string }> {
  const res = await apiFetch(`${baseUrl}/api/terminal/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      ...(command ? { command } : {}),
      ...(cols ? { cols } : {}),
      ...(rows ? { rows } : {}),
    }),
  });
  if (!res.ok) throw new Error(await detail(res));
  const j = await res.json();
  const d = j?.data ?? j;
  return {
    terminal_id: d.terminal_id ?? d.terminalId ?? d.id ?? "",
    project_id: d.project_id ?? projectId,
  };
}

export async function listTerminals(
  baseUrl: string,
  token: string,
  projectId: string,
): Promise<TerminalSession[]> {
  const res = await apiFetch(
    `${baseUrl}/api/terminal/sessions?project_id=${encodeURIComponent(projectId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(await detail(res));
  const j = await res.json();
  const d = j?.data ?? j;
  return d.sessions ?? d ?? [];
}

export async function getTerminal(
  baseUrl: string,
  token: string,
  terminalId: string,
): Promise<TerminalSession> {
  const res = await apiFetch(`${baseUrl}/api/terminal/sessions/${encodeURIComponent(terminalId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  const j = await res.json();
  return j?.data ?? j;
}

export async function deleteTerminal(
  baseUrl: string,
  token: string,
  terminalId: string,
): Promise<void> {
  const res = await apiFetch(`${baseUrl}/api/terminal/sessions/${encodeURIComponent(terminalId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
}

export async function readTerminal(
  baseUrl: string,
  token: string,
  terminalId: string,
  afterSeq = 0,
  waitMs = 500,
  maxBytes = 65536,
): Promise<{ chunks: { seq: number; stream: string; data: string }[]; next_seq: number; exited: boolean; exit_code: number | null }> {
  const params = new URLSearchParams({
    after_seq: String(afterSeq),
    wait_ms: String(waitMs),
    max_bytes: String(maxBytes),
  });
  const res = await apiFetch(
    `${baseUrl}/api/terminal/sessions/${encodeURIComponent(terminalId)}/read?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(await detail(res));
  const j = await res.json();
  const d = j?.data ?? j;
  return {
    chunks: d.chunks ?? [],
    next_seq: d.nextSeq ?? d.next_seq ?? afterSeq,
    exited: !!d.exited,
    exit_code: d.exitCode ?? d.exit_code ?? null,
  };
}

export async function writeTerminal(
  baseUrl: string,
  token: string,
  terminalId: string,
  data: string,
): Promise<{ bytes_written: number }> {
  const res = await apiFetch(`${baseUrl}/api/terminal/sessions/${encodeURIComponent(terminalId)}/write`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(await detail(res));
  const j = await res.json();
  const d = j?.data ?? j;
  return { bytes_written: d.bytes_written ?? d.bytesWritten ?? 0 };
}

export async function signalTerminal(
  baseUrl: string,
  token: string,
  terminalId: string,
  signal: string = "SIGTERM",
): Promise<void> {
  const res = await apiFetch(`${baseUrl}/api/terminal/sessions/${encodeURIComponent(terminalId)}/signal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ signal }),
  });
  if (!res.ok) throw new Error(await detail(res));
}

export async function resizeTerminal(
  baseUrl: string,
  token: string,
  terminalId: string,
  cols: number,
  rows: number,
): Promise<void> {
  const res = await apiFetch(`${baseUrl}/api/terminal/sessions/${encodeURIComponent(terminalId)}/resize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ cols, rows }),
  });
  if (!res.ok) throw new Error(await detail(res));
}

export function terminalWsUrl(baseUrl: string, terminalId: string, token: string): string {
  // http(s)://host/api/... → ws(s)://host/api/.../ws?token=...
  const u = new URL(`${baseUrl}/api/terminal/sessions/${encodeURIComponent(terminalId)}/ws`);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.searchParams.set("token", token);
  return u.toString();
}
