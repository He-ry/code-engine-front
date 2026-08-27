// Browser bridge status API (Chrome extension sidepanel mode).
// Failures of any kind degrade to { connected: false } — the indicator
// dot only turns green on a confirmed connected response.

export interface BridgeStatus {
  connected: boolean;
  threadId?: string | null;
  tabCount?: number;
}

export async function getBridgeStatus(
  baseUrl: string,
  token: string
): Promise<BridgeStatus> {
  if (!baseUrl || !token) return { connected: false };
  try {
    const res = await fetch(`${baseUrl}/api/browser/bridge/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { connected: false };
    const json = await res.json();
    const data = json?.data ?? json;
    return {
      connected: !!data?.connected,
      threadId: data?.threadId ?? null,
      tabCount: data?.tab_count ?? 0,
    };
  } catch {
    return { connected: false };
  }
}
