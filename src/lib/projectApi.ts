/**
 * projectApi — client for the CodeEngine Project & File API.
 *
 * Endpoints:
 *   Project CRUD:  /api/projects
 *   File listing:  /api/projects/{id}/files/list?path=
 *   File reading:  /api/projects/{id}/files/read?path=
 *   File tree:     /api/projects/{id}/files/tree?path=&depth=
 *   File writing:  /api/projects/{id}/files/write
 *   Directory:     /api/projects/{id}/files/mkdir
 *   File delete:   /api/projects/{id}/files?path=
 */

import { apiFetch } from "./api";
import type { Project, ProjectCreateInput, ProjectUpdateInput, FileListResponse, FileReadResponse, FileListEntry } from "../types";

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
// Project CRUD
// ---------------------------------------------------------------------------

export async function createProject(
  baseUrl: string,
  token: string,
  input: ProjectCreateInput
): Promise<Project> {
  const res = await apiFetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: input.name,
      git_url: input.gitUrl,
      git_branch: input.gitBranch,
      description: input.description,
    }),
  });
  if (!res.ok) throw new Error(await detail(res));
  return unwrap<Project>(await res.json());
}

export async function listProjects(
  baseUrl: string,
  token: string
): Promise<Project[]> {
  const res = await apiFetch(`${baseUrl}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  return json?.data?.projects ?? json?.projects ?? [];
}

export async function getProject(
  baseUrl: string,
  token: string,
  projectId: string
): Promise<Project> {
  const res = await apiFetch(`${baseUrl}/api/projects/${encodeURIComponent(projectId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  return unwrap<Project>(await res.json());
}

export async function updateProject(
  baseUrl: string,
  token: string,
  projectId: string,
  input: ProjectUpdateInput
): Promise<Project> {
  const res = await apiFetch(`${baseUrl}/api/projects/${encodeURIComponent(projectId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: input.name,
      git_remote: input.gitRemote,
      git_branch: input.gitBranch,
      description: input.description,
    }),
  });
  if (!res.ok) throw new Error(await detail(res));
  return unwrap<Project>(await res.json());
}

export async function deleteProject(
  baseUrl: string,
  token: string,
  projectId: string,
  removeFiles: boolean = true
): Promise<void> {
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}?remove_files=${removeFiles}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

export async function listFiles(
  baseUrl: string,
  token: string,
  projectId: string,
  path: string = "."
): Promise<FileListResponse> {
  const params = new URLSearchParams({ path });
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/files/list?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  return unwrap<FileListResponse>(await res.json());
}

export async function readFile(
  baseUrl: string,
  token: string,
  projectId: string,
  path: string
): Promise<FileReadResponse> {
  const params = new URLSearchParams({ path });
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/files/read?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  return unwrap<FileReadResponse>(await res.json());
}

/**
 * Raw bytes of a workspace Office file (code-engine-office 预览消费).
 * Throws on non-2xx. */
export async function downloadProjectFileBytes(
  baseUrl: string,
  token: string,
  projectId: string,
  path: string
): Promise<ArrayBuffer> {
  const params = new URLSearchParams({ path });
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/files/download?${params}`,
    // ⚠️ 工作区文件随时被 agent/编辑器回写,必须绕过 HTTP 缓存——
    //    后端 FileResponse 只带 ETag/Last-Modified 时,浏览器启发式
    //    缓存会在新鲜期内直接吐旧字节("预览文档是旧的"的根源)。
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(await detail(res));
  return res.arrayBuffer();
}

export async function getFileTree(
  baseUrl: string,
  token: string,
  projectId: string,
  path: string = ".",
  depth: number = 3
): Promise<FileListEntry[]> {
  const params = new URLSearchParams({ path, depth: String(depth) });
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/files/tree?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  return json?.data?.tree ?? json?.tree ?? [];
}

export async function writeFile(
  baseUrl: string,
  token: string,
  projectId: string,
  path: string,
  content: string
): Promise<void> {
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/files/write`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ path, content }),
    }
  );
  if (!res.ok) throw new Error(await detail(res));
}

export async function createDirectory(
  baseUrl: string,
  token: string,
  projectId: string,
  path: string,
  recursive: boolean = true
): Promise<void> {
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/files/mkdir`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ path, recursive }),
    }
  );
  if (!res.ok) throw new Error(await detail(res));
}

export async function deleteFile(
  baseUrl: string,
  token: string,
  projectId: string,
  path: string,
  recursive: boolean = false
): Promise<void> {
  const params = new URLSearchParams({ path, recursive: String(recursive) });
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/files?${params}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
}

export interface PreviewUrlResponse {
  url: string;
  port: number;
  project_id: string;
}

export async function getPreviewUrl(
  baseUrl: string,
  token: string,
  projectId: string,
  port: number = 3000
): Promise<PreviewUrlResponse> {
  const params = new URLSearchParams({ port: String(port) });
  const res = await apiFetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/preview?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await detail(res));
  return unwrap<PreviewUrlResponse>(await res.json());
}

/**
 * Static workspace-site URL — serves files straight from the project
 * workspace (no auth header; iframes and sub-resources can't carry one).
 * Relative assets (./style.css) resolve naturally against this path.
 */
export function siteUrl(baseUrl: string, projectId: string, path: string = ""): string {
  return `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/site/${path}`;
}

/**
 * Subscribe to workspace filesystem change events (SSE, watchdog-backed).
 * Mainstream-editor file-tree architecture: content stays lazily pulled via
 * /files/list; this stream tells the client WHICH directories to re-pull.
 * Calls onEvent with the affected workspace-relative dirs ("." = root).
 * Resolves when the stream closes; rejects on fetch error.
 */
export async function streamFsEvents(
  baseUrl: string,
  token: string,
  projectId: string,
  onEvent: (paths: string[]) => void,
  signal?: AbortSignal
): Promise<void> {
  const { parseSseBlock } = await import("./agentClient");
  const res = await fetch(
    `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/fs/events`,
    { headers: { Authorization: `Bearer ${token}` }, signal }
  );
  if (!res.ok || !res.body) {
    throw new Error(await detail(res));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const event = parseSseBlock(block);
      if (event?.type === "fs_changed" && Array.isArray(event.data?.paths)) {
        onEvent(event.data.paths as string[]);
      }
    }
  }
}
