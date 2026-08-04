import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Terminal,
  FileCode2,
  Package,
  Wrench,
  CheckCircle2,
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
    setResultText(t("用户已拒绝此工具调用", "User rejected this tool invocation"));
    if (onReject) onReject(tool.id);
  };

  // Determine Icon & Category
  const toolNameLower = tool.name.toLowerCase();
  let isFile = toolNameLower.includes("file") || toolNameLower.includes("create") || toolNameLower.includes("edit");
  let isPkg = toolNameLower.includes("package") || toolNameLower.includes("install") || toolNameLower.includes("npm");
  
  const displayCommand = tool.command || tool.description || tool.args || "";

  return (
    <div className="w-full my-1.5 font-sans text-xs select-none">
      {/* Sleek Compact Card Bar */}
      <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-2xs flex items-center justify-between gap-3 transition-all">
        {/* Left: Icon, Action Title & Command Snippet */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0">
            {isFile ? (
              <FileCode2 className="w-3.5 h-3.5 text-blue-500" />
            ) : isPkg ? (
              <Package className="w-3.5 h-3.5 text-purple-500" />
            ) : toolNameLower.includes("run") || toolNameLower.includes("exec") ? (
              <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Wrench className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-gray-800 dark:text-zinc-200 shrink-0">
              {tool.name}
            </span>
            <span className="font-mono text-[11.5px] text-gray-500 dark:text-zinc-400 truncate max-w-[200px] sm:max-w-[340px]">
              {displayCommand}
            </span>
          </div>

          {/* Details toggle chevron */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded transition-colors cursor-pointer shrink-0"
            title={t("展开详情", "Toggle details")}
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Right: Actions / Status */}
        <div className="flex items-center gap-2 shrink-0">
          {status === "pending" ? (
            <>
              {/* Mini Auto-execute Switch */}
              <div className="flex items-center gap-1.5 mr-1 text-[11px] text-gray-500 dark:text-zinc-400">
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
                <span className="text-[11px]">{t("自动", "Auto")}</span>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleRejectClick}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
              >
                {t("拒绝", "Reject")}
              </button>

              <button
                onClick={handleExecuteClick}
                className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>{t("执行", "Execute")}</span>
              </button>
            </>
          ) : status === "success" ? (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t("已执行", "Executed")}</span>
            </div>
          ) : status === "error" ? (
            <div className="flex items-center gap-1 text-rose-500 font-medium text-xs">
              <XCircle className="w-3.5 h-3.5" />
              <span>{t("已拒绝", "Rejected")}</span>
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
        <div className="mt-1.5 p-3 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 bg-gray-50 dark:bg-zinc-950/60 font-mono text-[11px] space-y-2">
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 font-sans text-[11px]">
            <span>{t("完整指令 / 参数：", "Full Command / Arguments:")}</span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-950 text-zinc-100 overflow-x-auto whitespace-pre-wrap break-all border border-zinc-800">
            {displayCommand}
          </div>

          {resultText && (
            <div className="space-y-1 pt-1">
              <div className="text-gray-500 dark:text-zinc-400 font-sans text-[11px]">{t("执行结果：", "Execution Result:")}</div>
              <div className="p-2 rounded-lg bg-zinc-950 text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-36 border border-zinc-800">
                {resultText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
