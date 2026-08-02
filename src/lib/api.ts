/**
 * Utility to check if an HTTP response status or JSON payload indicates 401/expired credentials.
 */
export function checkIsUnauthorized(status: number, data?: any): boolean {
  if (status === 401 || status === 403) return true;
  if (data) {
    if (data.code === 401 || data.code === 403 || data.status === 401 || data.status === 403) {
      return true;
    }
    const msg = typeof data.message === "string" ? data.message.toLowerCase() : "";
    if (
      msg.includes("invalid or expired credentials") ||
      msg.includes("unauthorized") ||
      msg.includes("jwt expired") ||
      msg.includes("token expired") ||
      msg.includes("credentials expired") ||
      msg.includes("登录失效") ||
      msg.includes("登录过期")
    ) {
      return true;
    }
  }
  return false;
}

let lastUnauthorizedTime = 0;

/**
 * Trigger global unauthorized session expiration handler with throttling.
 */
export function triggerUnauthorized(customMsg?: string) {
  const now = Date.now();
  if (now - lastUnauthorizedTime < 5000) {
    return;
  }
  lastUnauthorizedTime = now;

  window.dispatchEvent(
    new CustomEvent("app:unauthorized", {
      detail: { message: customMsg || "invalid or expired credentials" },
    })
  );
}

/**
 * Unified fetch wrapper that automatically checks for 401 session expiration
 * and dispatches global unauthorized events when detected.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401 || response.status === 403) {
    triggerUnauthorized();
    return response;
  }

  // Clone response to inspect JSON payload for code 401 or expired message without consuming original body
  try {
    const clone = response.clone();
    const data = await clone.json();
    if (checkIsUnauthorized(response.status, data)) {
      triggerUnauthorized(data?.message);
    }
  } catch (_) {
    // Response body might not be JSON or might be empty
  }

  return response;
}
