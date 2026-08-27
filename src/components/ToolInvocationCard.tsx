import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  XCircle,
  Loader2,
  Check,
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
            title={useSettingsT("点击放大", "Click to enlarge")}
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

// Tiny helper so ToolImages can localize its tooltip without prop drilling
// the settings context through the card tree.
function useSettingsT(zh: string, en: string): string {
  const { t } = useSettings();
  return t(zh, en);
}

export const ToolInvocationCard: React.FC<ToolInvocationCardProps> = ({
  tool,
  onExecute,
  onReject,
}) => {
  const { t } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoExecute, setAutoExecute] = useState(tool.autoExecute || false);
  const [status, setStatus] = useState<ToolExecution["status"]>(tool.status);
  const [resultText, setResultText] = useState<string | null>(tool.result || null);

  // Sync internal state when parent props change (e.g. SSE item_completed events).
  useEffect(() => {
    setStatus(tool.status);
  }, [tool.status]);

  useEffect(() => {
    setResultText(tool.result || null);
  }, [tool.result]);

  // Classify the error using the backend-provided errorReason enum.
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
    // resultText will be overwritten by the backend's item_completed SSE event.
    if (onReject) onReject(tool.id);
  };

  const displayCommand = tool.command || tool.description || tool.args || tool.contentDelta || "";

  const showErrorBanner =
    status === "error" && !!tool.errorReason && (isRejectedByUser || isApprovalTimeout || isCancelled);

  return (
    <div className="w-full text-xs transition-all font-sans">
      {/* Inline toggle row — thinking-style (no card) */}
      <div className="flex items-center gap-1.5 py-0.5 w-full">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer select-none min-w-0 flex-1"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
          )}

          <span className="font-sans text-xs tracking-tight font-medium text-gray-600 dark:text-zinc-300 shrink-0">
            {tool.name}
          </span>

          <span className="font-mono text-[11px] text-gray-400 dark:text-zinc-500 truncate min-w-0">
            {displayCommand}
          </span>
        </button>

        {/* Right: status / actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {status === "pending" ? (
            <>
              {/* Mini Auto-execute Switch */}
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
                onClick={handleRejectClick}
                className="px-2 py-0.5 text-[11px] font-medium text-gray-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
              >
                {t("拒绝", "Reject")}
              </button>

              <button
                onClick={handleExecuteClick}
                className="px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 rounded transition-colors cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>{t("执行", "Execute")}</span>
              </button>
            </>
          ) : status === "running" ? (
            <div className="flex items-center gap-1.5 text-blue-500 font-medium text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{t("执行中...", "Executing...")}</span>
            </div>
          ) : status === "error" ? (
            <div className="flex items-center gap-1 font-medium text-[11px]" title={resultText || ""}>
              {isApprovalTimeout ? (
                <>
                  <XCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-500">{t("超时", "Timeout")}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-rose-500">{t("失败", "Failed")}</span>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Expanded — left-border panel, thinking-style (no card) */}
      {isExpanded && (
        <div className="mt-0.5 pl-3 border-l border-gray-200 dark:border-zinc-800/80 space-y-1.5">
          {tool.images && tool.images.length > 0 && <ToolImages images={tool.images} />}
          {showErrorBanner && (
            <div className="text-[11px] leading-relaxed">
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
                <span className="text-gray-400 dark:text-zinc-500">
                  ⏹ {t("操作已被中止", "Operation was aborted")}
                </span>
              )}
            </div>
          )}

          {displayCommand && (
            <div className="font-mono text-[11px] text-gray-500 dark:text-zinc-400 whitespace-pre-wrap break-all leading-relaxed">
              {displayCommand}
            </div>
          )}

          {resultText && (
            <div className={`font-mono text-[11px] whitespace-pre-wrap break-all leading-relaxed ${
              status === "error" && !isCancelled
                ? "text-rose-400 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {resultText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
