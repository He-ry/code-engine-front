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

/** Send a user message. Returns the sub_id to correlate stream events. */
export async function sendMessage(
  baseUrl: string,
  token: string,
  threadId: string,
  modelId: string,
  text: string,
  approvalPolicy?: string,
): Promise<SendMessageResult> {
  const res = await apiFetch(`${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ model_id: modelId, text, approval_policy: approvalPolicy || "auto" }),
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
 * NOTE: this deliberately uses raw `fetch`, NOT `apiFetch` — apiFetch calls
 * `clone().json()` on the body, which would block on (and consume) an
 * infinite SSE stream. We handle 401 here ourselves.
 */
export async function streamChat(
  baseUrl: string,
  token: string,
  threadId: string,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(
    `${baseUrl}/api/chat/threads/${encodeURIComponent(threadId)}/stream`,
    { headers: { Authorization: `Bearer ${token}` }, signal }
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

/** Reply to a pending AskUser request. */
export async function respondInput(
  baseUrl: string,
  token: string,
  threadId: string,
  inputId: string,
  responseText: string
): Promise<void> {
  const params = new URLSearchParams({ input_id: inputId, response_text: responseText });
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
