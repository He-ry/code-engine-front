import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
} from "lucide-react";
import { ToolExecution } from "../types";
import { useSettings } from "../context/SettingsContext";

interface ToolInvocationCardProps {
  tool: ToolExecution;
  onExecute?: (toolId: string) => void;
  onReject?: (toolId: string) => void;
}

/** Screenshot thumbnails with a click-to-zoom lightbox. */
const ToolImages: React.FC<{ images: string[] }> = ({ images }) => {
  const { t } = useSettings();
  const [zoomed, setZoomed] = useState<string | null>(null);

  if (!images.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setZoomed(src)}
            title={t("点击放大", "Click to enlarge")}
            className="block w-28 rounded-md border border-gray-200 dark:border-zinc-700 overflow-hidden hover:ring-2 hover:ring-indigo-400/60 transition-shadow cursor-zoom-in shrink-0"
          >
            <img src={src} alt={`screenshot-${i + 1}`} className="w-full h-auto block" draggable={false} />
          </button>
        ))}
      </div>
      {zoomed && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setZoomed(null)}
        >
          <img
            src={zoomed}
            alt="screenshot-zoom"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            draggable={false}
          />
        </div>
      )}
    </>
  );
};

function firstLine(text: string): string {
  return text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() || "";
}

function truncateMiddle(text: string, max = 72): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const head = Math.ceil((max - 1) * 0.58);
  const tail = Math.floor((max - 1) * 0.42);
  return `${clean.slice(0, head)}…${clean.slice(-tail)}`;
}

function isShellLike(tool: ToolExecution): boolean {
  const name = tool.name.toLowerCase();
  return (
    name.includes("shell") ||
    name.includes("bash") ||
    name.includes("terminal") ||
    name.includes("command") ||
    name.includes("exec") ||
    name.includes("run")
  );
}

function panelLabel(tool: ToolExecution): string {
  if (isShellLike(tool)) return "Shell";
  return tool.name || "Tool";
}

function visibleCommand(tool: ToolExecution): string {
  return tool.command || tool.description || tool.args || tool.contentDelta || "";
}

function headerSubject(tool: ToolExecution, commandText: string): string {
  if (tool.command) return firstLine(tool.command);
  if (tool.description) return firstLine(tool.description);
  if (tool.args) return firstLine(tool.args);
  if (tool.contentDelta) return firstLine(tool.contentDelta);
  return tool.name || "tool";
}

function statusText(
  status: ToolExecution["status"],
  t: (zh: string, en: string) => string,
  errorReason?: string
): string {
  if (status === "running") return t("正在运行", "Running");
  if (status === "pending") return t("等待执行", "Awaiting approval");
  if (status === "error") {
    if (errorReason === "cancelled") return t("已取消", "Cancelled");
    if (errorReason === "approval_timeout") return t("已超时", "Timed out");
    return t("运行失败", "Failed");
  }
  return t("已运行", "Ran");
}

export const ToolInvocationCard: React.FC<ToolInvocationCardProps> = ({
  tool,
  onExecute,
  onReject,
}) => {
  const { t } = useSettings();
  // Keep tool calls compact by default, like Codex: only the header row is
  // visible until the user explicitly expands it.
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoExecute, setAutoExecute] = useState(tool.autoExecute || false);
  const [status, setStatus] = useState<ToolExecution["status"]>(tool.status);
  const [resultText, setResultText] = useState<string | null>(tool.result || null);
  const [copied, setCopied] = useState(false);

  // Sync internal state when parent props change (e.g. SSE item_completed events).
  useEffect(() => {
    setStatus(tool.status);
  }, [tool.status]);

  useEffect(() => {
    setResultText(tool.result || null);
  }, [tool.result]);

  const isRejectedByUser = status === "error" && tool.errorReason === "user_denied";
  const isApprovalTimeout = status === "error" && tool.errorReason === "approval_timeout";
  const isCancelled = status === "error" && (tool.wasAborted || tool.errorReason === "cancelled");

  const handleExecuteClick = () => {
    setStatus("running");
    if (onExecute) {
      onExecute(tool.id);
    } else {
      setTimeout(() => {
        setStatus("success");
        const simulatedResult =
          tool.name === "Run"
            ? t("当前时间: 2026/07/31 周五\n当前用户: root", "Current time: 2026/07/31 Fri\nCurrent user: root")
            : tool.result || t("执行完成", "Execution completed");
        setResultText(simulatedResult);
      }, 600);
    }
  };

  const handleRejectClick = () => {
    setStatus("error");
    if (onReject) onReject(tool.id);
  };

  const commandText = visibleCommand(tool);
  const shellLike = isShellLike(tool);
  const subject = truncateMiddle(headerSubject(tool, commandText));
  const label = panelLabel(tool);
  const copyText = [commandText, resultText || ""].filter(Boolean).join("\n");
  const showErrorBanner =
    status === "error" && !!tool.errorReason && (isRejectedByUser || isApprovalTimeout || isCancelled);

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard?.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard may be unavailable on non-secure origins. Failing silently keeps the card usable.
    }
  };

  return (
    <div className="w-full text-xs transition-all font-sans">
      {/* Codex-style disclosure row */}
      <div className="flex items-center gap-1.5 py-1 w-full">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 cursor-pointer select-none min-w-0 flex-1 text-left"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
          )}

          <span className={`font-sans text-xs tracking-tight shrink-0 ${
            status === "running"
              ? "text-gray-600 dark:text-zinc-300 animate-pulse"
              : status === "error"
                ? "text-rose-500 dark:text-rose-400"
                : "text-gray-500 dark:text-zinc-400"
          }`}>
            {statusText(status, t, tool.errorReason)}
          </span>

          <span className="font-sans text-xs tracking-tight text-gray-600 dark:text-zinc-300 truncate min-w-0">
            {subject}
          </span>

          {tool.duration && status !== "running" && (
            <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono shrink-0">
              · {tool.duration}
            </span>
          )}
        </button>

        {/* Right: approval actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {status === "pending" ? (
            <>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500">
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoExecute}
                  onClick={() => {
                    const nextVal = !autoExecute;
                    setAutoExecute(nextVal);
                    if (nextVal && status === "pending") {
                      handleExecuteClick();
                    }
                  }}
                  className={`relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                    autoExecute ? "bg-indigo-600" : "bg-gray-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      autoExecute ? "translate-x-2.5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-[10.5px] select-none">{t("自动", "Auto")}</span>
              </div>

              <button
                type="button"
                onClick={handleRejectClick}
                className="px-2 py-0.5 text-[11px] font-medium text-gray-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
              >
                {t("拒绝", "Reject")}
              </button>

              <button
                type="button"
                onClick={handleExecuteClick}
                className="px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 rounded transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>{t("执行", "Execute")}</span>
              </button>
            </>
          ) : status === "error" ? (
            <span
              className={`text-[11px] font-medium ${
                isApprovalTimeout ? "text-amber-500" : "text-rose-500 dark:text-rose-400"
              }`}
              title={resultText || ""}
            >
              {isApprovalTimeout ? t("超时", "Timeout") : t("失败", "Failed")}
            </span>
          ) : null}
        </div>
      </div>

      {/* Codex-style output panel */}
      {isExpanded && (
        <div className="group/panel mt-0.5 rounded-lg border border-gray-200/90 bg-[#F4F4F4] text-gray-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
            <span className="font-sans">{label}</span>
            {copyText && (
              <button
                type="button"
                onClick={handleCopy}
                title={copied ? t("已复制", "Copied") : t("复制", "Copy")}
                className="rounded p-1 text-gray-400 opacity-0 group-hover/panel:opacity-100 focus:opacity-100 hover:text-gray-700 hover:bg-gray-200/70 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <div
            className="px-3 pb-3 max-h-72 overflow-auto text-[11.5px] leading-relaxed font-mono [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent] dark:[scrollbar-color:#52525b_transparent]"
            ref={(el) => {
              if (el && status === "running") el.scrollTop = el.scrollHeight;
            }}
          >
            {tool.images && tool.images.length > 0 && <ToolImages images={tool.images} />}

            {showErrorBanner && (
              <div className="mb-2 font-sans text-[11px] leading-relaxed">
                {isRejectedByUser && (
                  <span className="text-rose-500 dark:text-rose-400">
                    🚫 {t("用户已拒绝此操作", "User rejected this action")}
                  </span>
                )}
                {isApprovalTimeout && (
                  <span className="text-amber-500 dark:text-amber-400">
                    ⏱ {t("审批超时（120 秒）", "Approval timed out (120s)")}
                  </span>
                )}
                {isCancelled && (
                  <span className="text-gray-500 dark:text-zinc-500">
                    ⏹ {t("操作已被中止", "Operation was aborted")}
                  </span>
                )}
              </div>
            )}

            {commandText && (
              <pre className="m-0 whitespace-pre-wrap break-words text-gray-700 dark:text-zinc-300">
                {shellLike ? `$ ${commandText}` : commandText}
              </pre>
            )}

            {commandText && resultText && <div className="h-2" />}

            {resultText && (
              <pre className={`m-0 whitespace-pre-wrap break-words ${
                status === "error" && !isCancelled
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-gray-700 dark:text-zinc-300"
              }`}>
                {resultText}
              </pre>
            )}

            {!commandText && !resultText && !(tool.images && tool.images.length > 0) && (
              <div className="font-sans text-gray-400 dark:text-zinc-500">
                {status === "running" ? t("正在等待工具输出…", "Waiting for tool output...") : t("暂无输出", "No output")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


