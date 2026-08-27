import { useEffect, useId, useRef } from "react";

/**
 * Interactive OnlyOffice Document Server editor (docx/xlsx/pptx edit with
 * save-back). Mounts DocsAPI.DocEditor into a plain div — DocsAPI injects
 * its own iframe, so this must NOT live inside a sandboxed iframe itself.
 *
 * The editor config comes from the backend (`/api/onlyoffice/editor-config`),
 * already JWT-signed for DS. Replacing the `config` object (new
 * document.key) destroys and rebuilds the session — that's how the tab
 * refreshes after an agent rewrite or a save-back.
 *
 * api.js is loaded SAME-ORIGIN via the server.ts DS proxy — direct
 * http://127.0.0.1:8900 URLs would be blocked as mixed content when the
 * app is served over https.
 */

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        id: string,
        config: Record<string, unknown>
      ) => { destroyEditor: () => void };
    };
  }
}

let docsApiPromise: Promise<void> | null = null;

function loadDocsApi(): Promise<void> {
  if (window.DocsAPI) return Promise.resolve();
  if (!docsApiPromise) {
    docsApiPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "/web-apps/apps/api/documents/api.js"; // same-origin (server.ts proxy)
      s.async = true;
      s.onload = () =>
        window.DocsAPI ? resolve() : reject(new Error("DocsAPI missing after load"));
      s.onerror = () => {
        docsApiPromise = null; // allow a retry after DS comes back
        reject(new Error("Failed to load DocsAPI"));
      };
      document.head.appendChild(s);
    });
  }
  return docsApiPromise;
}

interface OnlyOfficeEditorProps {
  config: Record<string, unknown>;
  /** DS unreachable / api.js failed to load — caller falls back to the
   *  OfficeCLI HTML preview. */
  onUnavailable?: () => void;
  /** Fires when pending edits have been persisted (save-back landed) —
   *  callers refresh the file tree. */
  onSaved?: () => void;
}

export default function OnlyOfficeEditor({
  config,
  onUnavailable,
  onSaved,
}: OnlyOfficeEditorProps) {
  // React 18/19 useId contains ":" which is invalid in a DOM id for
  // DocsAPI's getElementById lookup — sanitize.
  const mountId = "oo-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const hostRef = useRef<HTMLDivElement>(null);
  const dirtyRef = useRef(false);
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;
  const unavailableRef = useRef(onUnavailable);
  unavailableRef.current = onUnavailable;

  useEffect(() => {
    let cancelled = false;
    let editor: { destroyEditor: () => void } | null = null;
    dirtyRef.current = false;

    // DocsAPI 直接改写挂载点的 DOM(注入/搬动 iframe 等节点)。若挂载 div
    // 由 React 渲染,卸载时 React 会对已被外部改动的子树执行 removeChild,
    // 抛 NotFoundError(切文件即崩)。因此 React 只渲染一个永远为空的 host,
    // 编辑器挂载 div 由我们手动 append/remove,React 从不涉足这棵子树。
    const host = hostRef.current;
    if (!host) return;
    const mount = document.createElement("div");
    mount.id = mountId;
    host.appendChild(mount);

    loadDocsApi()
      .then(() => {
        if (cancelled) return;
        editor = new window.DocsAPI!.DocEditor(mountId, {
          ...config,
          events: {
            onDocumentStateChange: (e: { data?: boolean }) => {
              if (e?.data === true) {
                dirtyRef.current = true; // unsaved changes present
              } else if (e?.data === false && dirtyRef.current) {
                dirtyRef.current = false;
                savedRef.current?.();
              }
            },
            onError: (e: unknown) => console.error("[OnlyOffice]", e),
          },
        });
      })
      .catch(() => {
        if (!cancelled) unavailableRef.current?.();
      });

    return () => {
      cancelled = true;
      try {
        editor?.destroyEditor();
      } catch {
        // destroy after DS went away — ignore
      }
      try {
        host.removeChild(mount); // 手动摘掉挂载点,留给 React 的 host 始终为空
      } catch {
        // DocsAPI 已把它搬走 — ignore
      }
    };
    // Rebuild when the config object identity changes (new document.key).
    // Callbacks stay out of the deps on purpose: CodeEditor passes inline
    // arrows, so tracking them would destroy/rebuild the DS session on
    // every parent re-render (SSE message bursts → constant flicker).
  }, [config, mountId]);

  return <div ref={hostRef} className="h-full w-full" />;
}
