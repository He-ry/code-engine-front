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
