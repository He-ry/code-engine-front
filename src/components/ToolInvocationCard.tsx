import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  FilePen,
  FileDiff,
  Search,
  FileSearch,
  Globe,
  Image,
  MessageCircle,
  HelpCircle,
  Clock,
  Timer,
  ListTodo,
  Plug,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  Copy,
  CheckCheck,
} from "lucide-react";
import { ToolExecution } from "../types";
import { useSettings } from "../context/SettingsContext";

interface ToolInvocationCardProps {
  tool: ToolExecution;
  onExecute?: (toolId: string) => void;
  onReject?: (toolId: string) => void;
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
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      // Fallback for older browsers or non-HTTPS contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedSection(section);
        setTimeout(() => setCopiedSection(null), 2000);
      } catch {
        // silently fail
      }
      document.body.removeChild(textarea);
    }
  };

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

  // Determine Icon & Category — explicit per-tool mapping
  const toolNameLower = tool.name.toLowerCase();

  const getToolIcon = () => {
    // Exact matches first
    if (toolNameLower === "bash")
      return { icon: Terminal, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" };

    if (toolNameLower === "read_file")
      return { icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" };

    if (toolNameLower === "write_file")
      return { icon: FilePen, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/40" };

    if (toolNameLower === "apply_patch")
      return { icon: FileDiff, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40" };

    if (toolNameLower === "glob")
      return { icon: Search, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/40" };

    if (toolNameLower === "grep")
      return { icon: FileSearch, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/40" };

    if (toolNameLower === "web_search")
      return { icon: Globe, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950/40" };

    if (toolNameLower === "view_image")
      return { icon: Image, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/40" };

    if (toolNameLower === "ask_user")
      return { icon: HelpCircle, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/40" };

    if (toolNameLower === "current_time")
      return { icon: Clock, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-950/40" };

    if (toolNameLower === "sleep")
      return { icon: Timer, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-950/40" };

    if (toolNameLower === "update_plan")
      return { icon: ListTodo, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/40" };

    // MCP / namespaced tools (contain "::")
    if (tool.name.includes("__") || tool.name.includes("::"))
      return { icon: Plug, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40" };

    // Fallbacks by keyword
    if (toolNameLower.includes("file") || toolNameLower.includes("create") || toolNameLower.includes("edit"))
      return { icon: FilePen, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/40" };

    if (toolNameLower.includes("search") || toolNameLower.includes("find"))
      return { icon: Search, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/40" };

    return { icon: Wrench, color: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800" };
  };

  const { icon: ToolIcon, color: iconColor, bg: iconBg } = getToolIcon();

  const displayCommand = tool.command || tool.description || tool.args || tool.contentDelta || "";

  return (
    <div className="w-full my-1.5 font-sans text-xs">
      {/* Sleek Compact Card Bar (Single Inline Row) */}
      <div className="w-full px-2.5 py-2 rounded-xl border border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-2xs flex items-center justify-between gap-2.5 transition-all select-none">
        {/* Left: Chevron Arrow (FIRST) + Icon + Action Title + Command */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* 1. Expand/Collapse Chevron at the VERY FRONT */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded transition-colors cursor-pointer shrink-0 -ml-0.5"
            title={t("展开详情", "Toggle details")}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {/* 2. Tool Icon */}
          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${iconBg}`}>
            <ToolIcon className={`w-3 h-3 ${iconColor}`} />
          </div>

          {/* 3. Tool Name and Command snippet directly inline */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-gray-800 dark:text-zinc-200 shrink-0">
              {tool.name}
            </span>
            <span className="font-mono text-[11.5px] text-gray-500 dark:text-zinc-400 truncate max-w-[200px] sm:max-w-[340px]">
              {displayCommand}
            </span>
          </div>
        </div>

        {/* Right: Actions / Status directly inline */}
        <div className="flex items-center gap-2 shrink-0">
          {status === "pending" ? (
            <>
              {/* Mini Auto-execute Switch */}
              <div className="flex items-center gap-1 mr-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
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

              {/* Action Buttons */}
              <button
                onClick={handleRejectClick}
                className="px-2 py-0.5 text-xs font-medium text-gray-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
              >
                {t("拒绝", "Reject")}
              </button>

              <button
                onClick={handleExecuteClick}
                className="px-2.5 py-0.5 text-xs font-semibold text-gray-900 bg-[#E0E0E0] hover:bg-[#d0d0d0] active:bg-[#c0c0c0] dark:bg-[#E0E0E0] dark:text-gray-900 border border-gray-300/80 dark:border-zinc-600 rounded shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-gray-900" />
                <span>{t("执行", "Execute")}</span>
              </button>
            </>
          ) : status === "success" ? (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t("已执行", "Executed")}</span>
            </div>
          ) : status === "error" ? (
            <div className="flex items-center gap-1 font-medium text-xs" title={resultText || ""}>
              {isRejectedByUser ? (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-rose-500">{t("已拒绝", "Rejected")}</span>
                </>
              ) : isApprovalTimeout ? (
                <>
                  <XCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-500">{t("审批超时", "Timeout")}</span>
                </>
              ) : isCancelled ? (
                <>
                  <XCircle className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-400">{t("已中止", "Aborted")}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-rose-500">{t("执行失败", "Failed")}</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-blue-500 font-medium text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{t("执行中...", "Executing...")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Detail View */}
      {isExpanded && (
        <div className="mt-1 p-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 bg-gray-50 dark:bg-zinc-950/60 font-mono text-[11px] space-y-2">
          {/* Error tip banner — only for user-rejected, timeout, or cancelled */}
          {(status === "error" && tool.errorReason && (isRejectedByUser || isApprovalTimeout || isCancelled)) && (
            <div className={`px-2.5 py-2 rounded-lg font-sans text-[11px] ${
              isRejectedByUser
                ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300"
                : isApprovalTimeout
                ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300"
                : "bg-gray-100 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400"
            }`}>
              <div className="flex items-center gap-1.5 font-semibold">
                {isRejectedByUser && t("🚫 用户已拒绝此操作", "🚫 User rejected this action")}
                {isApprovalTimeout && t("⏱ 审批超时（120 秒）", "⏱ Approval timed out (120s)")}
                {isCancelled && t("⏹ 操作已被中止", "⏹ Operation was aborted")}
              </div>
              {(isRejectedByUser || isApprovalTimeout || isCancelled) && (
                <div className="mt-1 opacity-80">
                  {isRejectedByUser && t("您拒绝了此工具的执行请求", "You rejected this tool's execution request")}
                  {isApprovalTimeout && t("可在设置中调整审批策略，减少等待时间", "Adjust the approval policy in Settings to reduce waiting time")}
                  {isCancelled && t("任务被取消，当前会话仍可继续", "Task was cancelled; the session can still continue")}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 font-sans text-[11px]">
            <span>{t("完整指令 / 参数：", "Full Command / Arguments:")}</span>
            <button
              onClick={() => handleCopy(displayCommand, "command")}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title={t("复制", "Copy")}
            >
              {copiedSection === "command" ? (
                <CheckCheck className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedSection === "command" ? t("已复制", "Copied") : t("复制", "Copy")}</span>
            </button>
          </div>
          <div className="p-2 rounded-lg bg-zinc-950 text-zinc-100 overflow-x-auto whitespace-pre-wrap break-all border border-zinc-800">
            {displayCommand}
          </div>

          {tool.contentDelta && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 font-sans text-[11px]">
                <span>{t("生成内容：", "Generated Content:")}</span>
                <button
                  onClick={() => handleCopy(tool.contentDelta || "", "content")}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  title={t("复制", "Copy")}
                >
                  {copiedSection === "content" ? (
                    <CheckCheck className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedSection === "content" ? t("已复制", "Copied") : t("复制", "Copy")}</span>
                </button>
              </div>
              <div className="p-2 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-64 bg-zinc-950 text-emerald-100 border border-zinc-800">
                {tool.contentDelta}
              </div>
            </div>
          )}

          {resultText && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 font-sans text-[11px]">
                <span>{t("执行结果：", "Execution Result:")}</span>
                <button
                  onClick={() => handleCopy(resultText, "result")}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  title={t("复制", "Copy")}
                >
                  {copiedSection === "result" ? (
                    <CheckCheck className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedSection === "result" ? t("已复制", "Copied") : t("复制", "Copy")}</span>
                </button>
              </div>
              <div className={`p-2 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-36 border ${
                status === "error" && !isCancelled
                  ? "bg-red-950/30 border-red-800/60 text-red-300"
                  : "bg-zinc-950 text-emerald-400 border-zinc-800"
              }`}>
                {resultText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
