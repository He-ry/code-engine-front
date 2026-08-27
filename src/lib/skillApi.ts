/**
 * skillApi — client for the CodeEngine skill system.
 *
 * Endpoints:
 *   GET  /api/skills/market     List built-in market skills (with installed flag)
 *   POST /api/skills/install    Install a market skill for the current user
 *   POST /api/skills/uninstall  Uninstall a user skill
 *   GET  /api/skills            List the current user's installed skills
 *
 * All functions take the backend base URL + JWT token explicitly, matching
 * the convention used by `agentClient` and `projectApi`.
 */

import { apiFetch } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A skill in the built-in marketplace (user-level). */
export interface MarketSkill {
  /** Short hyphen id — also the skill name used for injection (e.g. "unit-test-gen"). */
  id: string;
  name: string;
  enName: string;
  description: string;
  enDescription: string;
  category: string;
  installed: boolean;
}

/** A skill the current user has installed (user-level). */
export interface UserSkill {
  /** Short hyphen id sent to the backend in the `skills` array. */
  id: string;
  name: string;
  enName: string;
  description: string;
  enDescription: string;
  category: string;
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

function mapMarketSkill(row: any): MarketSkill {
  return {
    id: row.id ?? row.skill_id ?? "",
    name: row.name ?? "",
    enName: row.en_name ?? "",
    description: row.description ?? "",
    enDescription: row.en_description ?? "",
    category: row.category ?? "",
    installed: row.installed === 1 || row.installed === true,
  };
}

function mapUserSkill(row: any): UserSkill {
  return {
    id: row.skill_id ?? row.id ?? "",
    name: row.name ?? "",
    enName: row.en_name ?? "",
    description: row.description ?? "",
    enDescription: row.en_description ?? "",
    category: row.category ?? "",
  };
}

// ---------------------------------------------------------------------------
// Market + install/uninstall
// ---------------------------------------------------------------------------

export async function getSkillMarket(
  baseUrl: string,
  token: string
): Promise<MarketSkill[]> {
  const res = await apiFetch(`${baseUrl}/api/skills/market`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  const skills = json?.data?.skills ?? json?.skills ?? [];
  return skills.map(mapMarketSkill);
}

export async function installSkill(
  baseUrl: string,
  token: string,
  skillId: string
): Promise<void> {
  const res = await apiFetch(`${baseUrl}/api/skills/install`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ skill_id: skillId }),
  });
  if (!res.ok) throw new Error(await detail(res));
}

export async function uninstallSkill(
  baseUrl: string,
  token: string,
  skillId: string
): Promise<void> {
  const res = await apiFetch(`${baseUrl}/api/skills/uninstall`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ skill_id: skillId }),
  });
  if (!res.ok) throw new Error(await detail(res));
}

// ---------------------------------------------------------------------------
// Installed user skills (for the chat-area skill selector)
// ---------------------------------------------------------------------------

export async function getUserSkills(
  baseUrl: string,
  token: string
): Promise<UserSkill[]> {
  const res = await apiFetch(`${baseUrl}/api/skills`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await detail(res));
  const json = await res.json();
  const skills = json?.data?.user_skills ?? json?.user_skills ?? [];
  return skills.map(mapUserSkill);
}
