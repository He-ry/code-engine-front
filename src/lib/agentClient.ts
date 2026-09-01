/**
 * agentClient — thin client for the CodeEngine agent API.
 *
 * Wraps the thread-based conversation flow:
 *   create/find thread → send message → stream SSE events
 * plus the side-channels: tool approval, AskUser response, interrupt.
 *
 * All functions take the backend base URL + JWT token explicitly so the
 * callers stay decoupled from where the token lives.
 */

import { apiFetch, triggerUnauthorized } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThreadInfo {
  threadId: string;
  name?: string;
  createdAt?: string;
}

export interface SendMessageResult {
  subId: string;
  threadId: string;
}

export interface AttachmentResult {
  filename: string;
  /** Agent-visible path inside the thread workspace (e.g. "uploads/a.docx") */
  workspacePath: string;
  objectKey: string | null;
  url: string | null;
  size: number;
  contentType: string;
}

/** Upload a chat attachment: stored in RustFS AND copied into the thread
 *  workspace so the agent can read it with read_file. */
export async function uploadAttachment(
  baseUrl: string,
  token: string,
  threadId: string,
  file: File,
): Promise<AttachmentResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/attachments`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  const d = json?.data ?? json;
  return {
    filename: d.filename ?? file.name,
    workspacePath: d.workspace_path ?? "",
    objectKey: d.object_key ?? null,
    url: d.url ?? null,
    size: d.size ?? file.size,
    contentType: d.content_type ?? file.type,
  };
}

/** Extract preview text for a workspace file (PDF/Word/Excel/PPT/text). */
export async function extractAttachmentText(
  baseUrl: string,
  token: string,
  threadId: string,
  workspacePath: string,
): Promise<{ filename: string; text: string }> {
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/attachments/extract?path=${encodeURIComponent(workspacePath)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  const d = json?.data ?? json;
  return { filename: d.filename ?? "", text: d.text ?? "" };
}

/** File extensions that get the OfficeCLI HTML preview treatment (chat
 *  attachments and file-tree clicks both route through this list). */
export const OFFICE_PREVIEW_EXTS = [".docx", ".xlsx", ".pptx"];

/** True when the workspace path should prefer the HTML render over text. */
export function isOfficePreviewPath(path: string): boolean {
  const lower = path.toLowerCase();
  return OFFICE_PREVIEW_EXTS.some((e) => lower.endsWith(e));
}

/** True for PDF files — previewed with the browser's built-in PDF viewer
 *  (iframe) for any file type the browser can render. */
export function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

/** Download a thread workspace file with auth and wrap it in a blob: object
 *  URL the PDF iframe can render (iframes can't send Authorization headers).
 *  The caller must URL.revokeObjectURL the result when done (tab close). */
export async function downloadThreadFileUrl(
  baseUrl: string,
  token: string,
  threadId: string,
  workspacePath: string
): Promise<string> {
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/attachments/download?path=${encodeURIComponent(workspacePath)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Rendered HTML preview for Office attachments (OfficeCLI). html is null
 *  when OfficeCLI is unavailable or conversion failed — callers should then
 *  fall back to extractAttachmentText. */
export async function previewAttachmentHtml(
  baseUrl: string,
  token: string,
  threadId: string,
  workspacePath: string,
): Promise<{ filename: string; html: string | null }> {
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/attachments/preview?path=${encodeURIComponent(workspacePath)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  const d = json?.data ?? json;
  return { filename: d.filename ?? "", html: d.html ?? null };
}

/** Download a raw workspace file (uploaded attachment or agent-generated
 *  artifact) as a Blob. Uses raw fetch — apiFetch's clone().json() probe
 *  would double-buffer large binaries. */
export async function downloadWorkspaceFile(
  baseUrl: string,
  token: string,
  threadId: string,
  workspacePath: string
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/attachments/download?path=${encodeURIComponent(workspacePath)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 401 || res.status === 403) triggerUnauthorized();
  if (!res.ok) throw new Error(await detail(res));
  const disposition = res.headers.get("Content-Disposition") ?? "";
  let filename = workspacePath.split("/").pop() || "file";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      filename = decodeURIComponent(utf8Match[1]);
    } catch {
      /* keep fallback */
    }
  }
  return { blob: await res.blob(), filename };
}

/** Trigger a browser download of a workspace file. */
export async function saveWorkspaceFileAs(
  baseUrl: string,
  token: string,
  threadId: string,
  workspacePath: string
): Promise<void> {
  const { blob, filename } = await downloadWorkspaceFile(baseUrl, token, threadId, workspacePath);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/** A single parsed SSE event pushed to the stream callback. */
export interface AgentStreamEvent {
  /** The SSE `event:` field (e.g. "agent_message_delta"). */
  type: string;
  /** Parsed JSON from the `data:` field (camelCase keys). */
  data: any;
}

// ---------------------------------------------------------------------------
// Error helper
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

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

/** Create a new conversation thread. */
export async function createThread(
  baseUrl: string,
  token: string,
  modelId: string,
  name = "New Chat",
  projectId?: string,
  approvalPolicy?: string,
): Promise<ThreadInfo> {
  const body: Record<string, string> = { model_id: modelId, name };
  if (projectId) body.project_id = projectId;
  if (approvalPolicy) body.approval_policy = approvalPolicy;

  const res = await apiFetch(`${baseUrl}/api/chat/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  const data = json?.data ?? json;
  return {
    threadId: data.thread_id ?? data.threadId ?? "",
    name: data.name,
    createdAt: data.created_at,
  };
}

/** List the user's threads. Optionally filter by project_id. */
export async function listThreads(
  baseUrl: string,
  token: string,
  projectId?: string
): Promise<any[]> {
  let url = `${baseUrl}/api/chat/threads`;
  if (projectId) url += `?project_id=${encodeURIComponent(projectId)}`;

  const res = await apiFetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  return json?.data?.threads ?? json?.threads ?? json?.data ?? [];
}

/** Rename a conversation thread. */
export async function renameThread(
  baseUrl: string,
  token: string,
  threadId: string,
  name: string
): Promise<void> {
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    }
  );
  if (!res.ok) throw new Error(await detail(res));
}

/** Delete a conversation thread and all associated history. */
export async function deleteThread(
  baseUrl: string,
  token: string,
  threadId: string
): Promise<void> {
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
}

/** Load the full message history for a thread. */
export async function loadHistory(
  baseUrl: string,
  token: string,
  threadId: string
): Promise<{ threadId: string; messages: any[] }> {
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/messages`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  const data = json?.data ?? json;
  return {
    threadId: data.thread_id ?? data.threadId ?? threadId,
    messages: data.messages ?? [],
  };
}

// ---------------------------------------------------------------------------
// Send + stream
// ---------------------------------------------------------------------------

/** Send a user message. Returns the sub_id to correlate stream events.
 * `images` are data: URLs — the server uploads them to RustFS and attaches
 * them as input_image parts on the user message. */
export async function sendMessage(
  baseUrl: string,
  token: string,
  threadId: string,
  modelId: string,
  text: string,
  approvalPolicy?: string,
  skills?: string[],
  images?: string[],
): Promise<SendMessageResult> {
  const res = await apiFetch(`${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model_id: modelId,
      text,
      approval_policy: approvalPolicy || "auto",
      ...(skills && skills.length > 0 ? { skills } : {}),
      ...(images && images.length > 0 ? { images } : {}),
    }),
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  const data = json?.data ?? json;
  return {
    subId: data.sub_id ?? data.subId ?? "",
    threadId: data.thread_id ?? data.threadId ?? threadId,
  };
}

/**
 * Stream agent events over SSE using fetch + ReadableStream (so we can send
 * the Authorization header — native EventSource can't).
 *
 * Invokes `onEvent` per parsed event. Resolves when the stream ends
 * (turn_complete / error / abort).
 *
 * Pass `lastEventId` (the highest event seq seen on a previous connection)
 * to reconnect: the backend replays buffered events since that seq before
 * the live stream, so a mid-turn disconnect doesn't lose tool events.
 *
 * NOTE: this deliberately uses raw `fetch`, NOT `apiFetch` — apiFetch calls
 * `clone().json()` on the body, which would block on (and consume) an
 * infinite SSE stream. We handle 401 here ourselves.
 */
export async function streamChat(
  baseUrl: string,
  token: string,
  threadId: string,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
  lastEventId?: number
): Promise<void> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (lastEventId && lastEventId > 0) headers["Last-Event-ID"] = String(lastEventId);
  const res = await fetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/stream`,
    { headers, signal }
  );
  if (res.status === 401 || res.status === 403) {
    // Reuse the global session-expiry handler.
    triggerUnauthorized();
  }
  if (!res.ok || !res.body) {
    throw new Error(await detail(res));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  // SSE blocks are separated by a blank line.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const event = parseSseBlock(block);
      if (event) onEvent(event);
    }
  }

  // Flush any trailing block.
  if (buffer.trim()) {
    const event = parseSseBlock(buffer);
    if (event) onEvent(event);
  }
}

/** Parse one SSE block ("event: X\ndata: {...}") into { type, data }. */
export function parseSseBlock(block: string): AgentStreamEvent | null {
  let eventType = "message";
  const dataLines: string[] = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith(":")) continue; // keepalive / comments
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
    // "id:", "retry:" ignored — not needed for forward consumption.
  }

  if (dataLines.length === 0) return null;
  try {
    return { type: eventType, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return { type: eventType, data: { text: dataLines.join("\n") } };
  }
}

// ---------------------------------------------------------------------------
// Side-channels
// ---------------------------------------------------------------------------

/** Approve or deny a pending sensitive-tool approval. */
export async function approveTool(
  baseUrl: string,
  token: string,
  threadId: string,
  approvalId: string,
  approved: boolean
): Promise<void> {
  const params = new URLSearchParams({ approval_id: approvalId, approved: String(approved) });
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/approve?${params}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
}

/** Reply to a pending AskUser request. `answers` maps question id → selected label/text. */
export async function respondInput(
  baseUrl: string,
  token: string,
  threadId: string,
  inputId: string,
  answers: Record<string, string>
): Promise<void> {
  const params = new URLSearchParams({ input_id: inputId, answers: JSON.stringify(answers) });
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/respond?${params}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
}

/** Interrupt the active turn. */
export async function interruptTurn(
  baseUrl: string,
  token: string,
  threadId: string
): Promise<void> {
  const res = await apiFetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/interrupt`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
}
