import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import {
  createTerminal,
  listTerminals,
  deleteTerminal,
  terminalWsUrl,
  writeTerminal,
  resizeTerminal,
  type TerminalSession,
} from "../lib/terminalApi";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import {
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Minus,
  X,
  ChevronDown,
  Columns,
  MoreHorizontal,
  LoaderPinwheel,
  TriangleAlert,
} from "lucide-react";

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  branchName: string;
  projectId?: string;
}

interface TermTab {
  id: string;
  name: string;
  exited: boolean;
}

function getXtermTheme(isDark: boolean) {
  if (isDark) {
    return {
      background: "#0b0b0b",
      foreground: "#ededed",
      cursor: "#ededed",
      selectionBackground: "#3a3a3a",
      black: "#1a1a1a",
      red: "#f87171",
      green: "#4ade80",
      yellow: "#facc15",
      blue: "#60a5fa",
      magenta: "#c084fc",
      cyan: "#22d3ee",
      white: "#e5e5e5",
      brightBlack: "#52525b",
      brightRed: "#fca5a5",
      brightGreen: "#86efac",
      brightYellow: "#fde047",
      brightBlue: "#93c5fd",
      brightMagenta: "#d8b4fe",
      brightCyan: "#67e8f9",
      brightWhite: "#fafafa",
    };
  }
  return {
    background: "#ffffff",
    foreground: "#1a1a1a",
    cursor: "#1a1a1a",
    selectionBackground: "#e5e5e5",
    black: "#1a1a1a",
    red: "#dc2626",
    green: "#16a34a",
    yellow: "#ca8a04",
    blue: "#2563eb",
    magenta: "#9333ea",
    cyan: "#0891b2",
    white: "#fafafa",
    brightBlack: "#52525b",
    brightRed: "#ef4444",
    brightGreen: "#22c55e",
    brightYellow: "#eab308",
    brightBlue: "#3b82f6",
    brightMagenta: "#a855f7",
    brightCyan: "#06b6d4",
    brightWhite: "#ffffff",
  };
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  isOpen,
  onClose,
  projectName,
  branchName,
  projectId,
}) => {
  const { backendApiUrl, user, theme } = useSettings();
  const baseUrl = backendApiUrl || "";

  const [activeTab, setActiveTab] = useState<"terminal" | "output">("terminal");
  const [tabs, setTabs] = useState<TermTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Fullscreen overlays the whole viewport (fixed inset-0), not 60vh inline.
  const [isFullscreen, setIsFullscreen] = useState(false);
  // User-adjusted inline panel height (drag the top edge).
  const [panelHeight, setPanelHeight] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const closeConfirmRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isDark = theme === "dark";

  // Track projectId to reload terminals on switch
  const projectIdRef = useRef<string | undefined>(projectId);
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  // Refs for onData closure (avoid stale values)
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  const baseUrlRef = useRef(baseUrl);
  useEffect(() => {
    baseUrlRef.current = baseUrl;
  }, [baseUrl]);
  const tokenRef = useRef<string | undefined>(user?.token);
  useEffect(() => {
    tokenRef.current = user?.token;
  }, [user?.token]);

  const dataDisposableRef = useRef<{ dispose(): void } | null>(null);
  const resizeDisposableRef = useRef<{ dispose(): void } | null>(null);
  const resizeTimerRef = useRef<number | null>(null);

  // Callback ref: init xterm when container mounts
  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      (containerRef as any).current = el;
      if (!el || termRef.current) return;
      const term = new Terminal({
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: "block",
        convertEol: true,
        scrollback: 5000,
        theme: getXtermTheme(isDark),
        allowTransparency: false,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      term.open(el);
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch {}
        term.focus();
      });
      termRef.current = term;
      fitAddonRef.current = fitAddon;
      term.attachCustomKeyEventHandler((e) => {
        if (e.ctrlKey && e.key === "c" && term.hasSelection()) return false;
        return true;
      });
      dataDisposableRef.current = term.onData((data) => {
        const ws = wsRef.current;
        // Real PTY: no local echo, send raw bytes (the kernel echo renders it).
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        } else if (ws && ws.readyState === WebSocket.CONNECTING) {
          ws.addEventListener("open", () => ws.send(data), { once: true });
        } else {
          const tid = activeIdRef.current;
          const tok = tokenRef.current;
          const url = baseUrlRef.current;
          if (tid && tok) writeTerminal(url, tok, tid, data).catch(() => {});
        }
      });
      resizeDisposableRef.current = term.onResize(({ cols, rows }) => {
        const tid = activeIdRef.current;
        const tok = tokenRef.current;
        const url = baseUrlRef.current;
        if (!tid || !tok) return;
        if (cols < 10 || rows < 3) return;
        // Debounce: the panel open/resize animation fires fit() every frame,
        // each changing cols/rows and triggering onResize. Collapse the burst
        // into a single request once the dimensions settle.
        if (resizeTimerRef.current !== null) {
          window.clearTimeout(resizeTimerRef.current);
        }
        resizeTimerRef.current = window.setTimeout(() => {
          resizeTerminal(url, tok, tid, cols, rows).catch(() => {});
        }, 150);
      });
      const ro = new ResizeObserver(() => {
        // Skip degenerate sizes (panel minimized / mid-animation) — fitting
        // against a 0×0 container computes nonsense cols/rows and fires a
        // bogus resizeTerminal call.
        if (el.clientWidth < 40 || el.clientHeight < 40) return;
        try {
          fitAddon.fit();
        } catch {}
      });
      ro.observe(el);
      (term as any)._ro = ro;
    },
    [isDark],
  );

  // Theme sync (when already initialized, update theme)
  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = getXtermTheme(isDark);
  }, [isDark]);

  // Theme sync
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getXtermTheme(isDark);
    }
  }, [isDark]);

  // Fit on open / fullscreen / minimize-restore / activeTab change
  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === "terminal" && fitAddonRef.current) {
      requestAnimationFrame(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.focus();
        } catch {}
      });
    }
  }, [isOpen, isFullscreen, isMinimized, activeTab, activeId, panelHeight]);

  // WebSocket helpers
  const disconnectWs = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
  }, []);

  const connectWs = useCallback(
    (terminalId: string) => {
      if (!user?.token || !baseUrl) return;
      disconnectWs();

      // Fresh screen for the connecting hint — no leading \r\n (it would leave
      // a blank first line on an empty/cleared terminal).
      termRef.current?.clear();
      termRef.current?.writeln("\x1b[36m连接中…\x1b[0m");
      const url = terminalWsUrl(baseUrl, terminalId, user.token);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // Clear the "creating/connecting" hints and let the shell's own
        // prompt (workspace path) render instead — no artificial banner.
        termRef.current?.clear();
        termRef.current?.focus();
        fitAddonRef.current?.fit();
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "exited") {
            termRef.current?.writeln(`\r\n\x1b[90m— exited (${msg.exit_code ?? msg.exitCode ?? "?"}) —\x1b[0m\r\n`);
            setTabs((prev) => prev.map((t) => (t.id === terminalId ? { ...t, exited: true } : t)));
            return;
          }
          if (msg.data !== undefined) {
            termRef.current?.write(msg.data);
            return;
          }
        } catch {
          // not JSON, treat as raw
        }
        termRef.current?.write(ev.data);
      };

      ws.onclose = () => {
        // Only show disconnect if this is still the active terminal's socket
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      };

      ws.onerror = () => {
        termRef.current?.writeln("\r\n\x1b[31m— connection error —\x1b[0m\r\n");
      };
    },
    [baseUrl, user?.token, disconnectWs],
  );

  // Cleanup xterm on unmount
  useEffect(() => {
    return () => {
      dataDisposableRef.current?.dispose();
      resizeDisposableRef.current?.dispose();
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
      const term = termRef.current as any;
      if (term?._ro) term._ro.disconnect();
      termRef.current?.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Create new terminal
  const handleNewTerminal = useCallback(async () => {
    if (!projectId || !user?.token) {
      termRef.current?.writeln("\r\n\x1b[33mNo project selected or not logged in\x1b[0m\r\n");
      return;
    }
    setIsConnecting(true);
    // The "creating" hint must land on the NEW terminal's screen, not the
    // currently-active one. There is one shared xterm instance, so: add a
    // placeholder tab, make it active (that viewport is what the user sees),
    // and detach the previous terminal's WS so its output cannot stream into
    // the hint while the create request is in flight.
    const prevId = activeIdRef.current;
    const placeholderId = `pending-${Date.now()}`;
    disconnectWs();
    setTabs((prev) => [...prev, { id: placeholderId, name: `Term ${prev.length + 1}`, exited: false }]);
    setActiveId(placeholderId);
    termRef.current?.clear();
    termRef.current?.writeln("\x1b[36m正在创建终端…\x1b[0m");
    try {
      // xterm can report tiny dimensions before the panel finishes layout
      // (e.g. rows=1 during the open animation) — clamp to sane minimums.
      const cols = Math.max(20, termRef.current?.cols ?? 80);
      const rows = Math.max(5, termRef.current?.rows ?? 24);
      const { terminal_id } = await createTerminal(baseUrl, user.token, projectId, undefined, cols, rows);
      setTabs((prev) =>
        prev.map((t) => (t.id === placeholderId ? { ...t, id: terminal_id } : t))
      );
      // Only take over the viewport if the user didn't switch tabs while the
      // request was in flight; otherwise the tab stays idle until clicked.
      if (activeIdRef.current === placeholderId) {
        setActiveId(terminal_id);
        // Give xterm a tick to render before connecting
        requestAnimationFrame(() => connectWs(terminal_id));
      }
    } catch (e: any) {
      // Drop the placeholder; restore whatever the user is looking at.
      if (activeIdRef.current === placeholderId) {
        termRef.current?.writeln(`\x1b[31mFailed to create terminal: ${e?.message || e}\x1b[0m`);
      }
      setTabs((prev) => prev.filter((t) => t.id !== placeholderId));
      if (activeIdRef.current === placeholderId) {
        if (prevId) {
          setActiveId(prevId);
          requestAnimationFrame(() => connectWs(prevId));
        } else {
          setActiveId(null);
          termRef.current?.writeln("\x1b[90mNo terminal — click + to create one\x1b[0m\r\n");
        }
      }
    } finally {
      setIsConnecting(false);
    }
  }, [projectId, user?.token, baseUrl, connectWs, disconnectWs]);

  // Switch active terminal
  const handleSelectTab = useCallback(
    (id: string) => {
      if (id === activeId) return;
      // Placeholder tab (terminal still being created) has no WS to connect.
      if (id.startsWith("pending-")) return;
      disconnectWs();
      termRef.current?.clear();
      setActiveId(id);
      requestAnimationFrame(() => connectWs(id));
    },
    [activeId, connectWs, disconnectWs],
  );

  // Close terminal
  const handleCloseTab = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (user?.token) {
        try {
          await deleteTerminal(baseUrl, user.token, id);
        } catch {}
      }
      if (wsRef.current && activeId === id) disconnectWs();
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeId === id) {
          const fallback = next[0]?.id ?? null;
          setActiveId(fallback);
          if (fallback) {
            termRef.current?.clear();
            requestAnimationFrame(() => connectWs(fallback));
          } else {
            termRef.current?.clear();
            termRef.current?.writeln("\x1b[90mNo terminal — click + to create one\x1b[0m\r\n");
          }
        }
        return next;
      });
    },
    [activeId, baseUrl, user?.token, connectWs, disconnectWs],
  );

  // Clear screen
  const handleClear = useCallback(() => {
    termRef.current?.clear();
  }, []);

  // Load existing terminals when project changes or panel opens
  useEffect(() => {
    if (!isOpen || !projectId || !user?.token) return;
    listTerminals(baseUrl, user.token, projectId)
      .then((sessions) => {
        if (sessions.length > 0) {
          setTabs(
            sessions.map((s, idx) => ({
              id: s.id,
              name: `Term ${idx + 1}`,
              exited: s.exited,
            })),
          );
          const first = sessions[0].id;
          setActiveId(first);
          requestAnimationFrame(() => connectWs(first));
        } else {
          // Auto-create first terminal for convenience
          handleNewTerminal();
        }
      })
      .catch(() => {
        // No existing terminals, show hint
        termRef.current?.writeln("\x1b[90mNo terminal — click + to create one\x1b[0m\r\n");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  // Disconnect WS when the panel closes. The component stays mounted (only
  // the inner motion.div unmounts on close), so the "on unmount" cleanup
  // below never fires in that case — this effect is what actually closes it.
  // Also reset transient panel state so reopening starts expanded.
  useEffect(() => {
    if (!isOpen) {
      disconnectWs();
      setIsMinimized(false);
      setIsFullscreen(false);
      setShowCloseConfirm(false);
    }
  }, [isOpen, disconnectWs]);

  // Esc exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // Drag the panel's top edge to resize (up = taller). Disabled while
  // fullscreen (the overlay already spans the viewport).
  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      if (isFullscreen) return;
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = isMinimized ? 280 : panelHeight;
      setIsResizing(true);
      setIsMinimized(false);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";
      const onMove = (ev: PointerEvent) => {
        const next = startHeight + (startY - ev.clientY);
        setPanelHeight(Math.max(140, Math.min(next, window.innerHeight - 120)));
      };
      const onUp = () => {
        setIsResizing(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [isFullscreen, isMinimized, panelHeight],
  );

  // Dismiss the close-confirm popover on outside click / Esc
  useEffect(() => {
    if (!showCloseConfirm) return;
    const onPointerDown = (ev: MouseEvent) => {
      if (closeConfirmRef.current && !closeConfirmRef.current.contains(ev.target as Node)) {
        setShowCloseConfirm(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setShowCloseConfirm(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showCloseConfirm]);

  // Cleanup WS on unmount
  useEffect(() => {
    return () => disconnectWs();
  }, [disconnectWs]);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: isFullscreen ? "100%" : isMinimized ? 36 : panelHeight,
            opacity: 1,
          }}
          exit={{ height: 0, opacity: 0 }}
          // While dragging, apply height changes instantly — the spring
          // animation would otherwise lag behind the pointer.
          transition={isResizing ? { duration: 0 } : { duration: 0.28, ease: [0.2, 0, 0, 1] }}
          // NOTE: `relative`/`z-10`/`border-t` (normal) and `fixed`/`z-[1000]`
          // (fullscreen) must stay mutually exclusive — Tailwind defines
          // `.relative` after `.fixed` in its stylesheet, so keeping `relative`
          // in the base classes would silently override the fullscreen
          // `fixed` (same-class specificity, later rule wins).
          className={`bg-white dark:bg-[#0b0b0b] flex flex-col font-sans select-none shrink-0 overflow-hidden ${
            isFullscreen ? "fixed inset-0 z-[1000]" : "relative z-10 border-t border-gray-200 dark:border-[#2a2a2a]"
          }`}
        >
          {/* Drag-to-resize handle — top edge */}
          <div
            onPointerDown={handleResizeStart}
            onDoubleClick={() => setPanelHeight(280)}
            className={`absolute top-0 inset-x-0 h-1.5 z-20 cursor-row-resize hover:bg-blue-400/30 dark:hover:bg-blue-500/30 transition-colors ${
              isFullscreen ? "hidden" : ""
            }`}
            style={{ touchAction: "none" }}
            title="拖动调整高度（双击复位）"
          />
          {/* Header Bar */}
          <div className="h-9 px-3 bg-white dark:bg-[#171717] border-b border-gray-200 dark:border-[#2a2a2a] flex items-center justify-between text-xs text-gray-600 dark:text-[#ededed] shrink-0">
            <div className="flex items-center gap-4 font-medium">
              <button
                onClick={() => setActiveTab("output")}
                className={`pb-0.5 transition-colors ${
                  activeTab === "output"
                    ? "text-gray-900 dark:text-zinc-100 border-b-2 border-gray-800 dark:border-zinc-200 font-semibold"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                }`}
              >
                输出
              </button>
              <button
                onClick={() => setActiveTab("terminal")}
                className={`pb-0.5 transition-colors ${
                  activeTab === "terminal"
                    ? "text-gray-900 dark:text-zinc-100 border-b-2 border-gray-800 dark:border-zinc-200 font-semibold"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                }`}
              >
                终端
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
              <button
                onClick={handleNewTerminal}
                disabled={isConnecting || !projectId}
                className="flex items-center gap-0.5 hover:bg-gray-200/60 dark:hover:bg-zinc-800 p-1 rounded disabled:opacity-40"
                title={projectId ? "新建终端" : "请先选择项目"}
              >
                {isConnecting ? <LoaderPinwheel className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <ChevronDown className="w-3 h-3" />
              </button>
              {/* Terminal tabs */}
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono border ${
                    activeId === tab.id
                      ? "bg-gray-800 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                      : "bg-gray-200/60 dark:bg-zinc-800 border-transparent hover:bg-gray-300/60 dark:hover:bg-zinc-700"
                  } ${tab.exited ? "opacity-60" : ""}`}
                  title={tab.exited ? "已退出" : tab.name}
                >
                  <TerminalIcon className="w-3 h-3" />
                  <span>{tab.name}</span>
                  <span
                    role="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5"
                    title="关闭"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              ))}
              <button className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded opacity-40 cursor-not-allowed" title="分屏（即将推出）">
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleClear} className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded" title="清屏">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded opacity-40 cursor-not-allowed" title="更多">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized((v) => !v)}
                className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded"
                title={isMinimized ? "展开终端" : "最小化（保持连接）"}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsMinimized(false);
                  setIsFullscreen((v) => !v);
                }}
                className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded"
                title={isFullscreen ? "退出全屏（Esc）" : "全屏"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <div className="relative">
                <button
                  onClick={() => {
                    // Restore first so the confirm popover isn't clipped by
                    // the panel's overflow-hidden while minimized.
                    if (isMinimized) setIsMinimized(false);
                    setShowCloseConfirm((v) => !v);
                  }}
                  className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded"
                  title="关闭终端（断开连接）"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                  {showCloseConfirm && (
                    <motion.div
                      ref={closeConfirmRef}
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 rounded-lg border border-gray-200 dark:border-zinc-700/80 bg-white dark:bg-[#1c1c1c] shadow-xl p-3 text-left select-text"
                    >
                      <div className="flex items-start gap-2">
                        <TriangleAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-xs leading-relaxed text-gray-600 dark:text-zinc-300">
                          关闭面板将
                          <b className="text-gray-900 dark:text-zinc-100">断开终端连接</b>
                          。会话与正在运行的程序会保留在服务器端（闲置 30 分钟后回收），重新打开面板可恢复。
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => setShowCloseConfirm(false)}
                          className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => {
                            setShowCloseConfirm(false);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs rounded-md bg-rose-600 text-white hover:bg-rose-500 transition-colors"
                        >
                          断开并关闭
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Terminal Area */}
          <div
            className="flex-1 min-h-0 bg-white dark:bg-[#0b0b0b] overflow-hidden relative"
            onClick={() => termRef.current?.focus()}
          >
            {/* xterm container stays MOUNTED across tab switches: unmounting
                detaches xterm from the DOM, and setContainerRef's early-return
                (termRef.current already set) would never re-open it into the
                new element — leaving a permanently blank terminal. Keep it in
                the layout with visibility:hidden so size (and cols/rows) are
                preserved, and overlay the output view on top instead. */}
            <div
              ref={setContainerRef}
              className={`absolute inset-0 p-1 ${activeTab === "terminal" ? "" : "invisible"}`}
            />
            {activeTab === "output" && (
              <div className="absolute inset-0 p-3 bg-white dark:bg-[#0b0b0b] text-gray-400 dark:text-zinc-500 italic text-xs">
                暂无后台构建或扩展日志输出。
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
