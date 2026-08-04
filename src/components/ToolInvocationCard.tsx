import React, { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoExecute, setAutoExecute] = useState(tool.autoExecute || false);
  const [status, setStatus] = useState<ToolExecution["status"]>(tool.status);
  const [resultText, setResultText] = useState<string | null>(tool.result || null);

  const handleExecuteClick = () => {
    setStatus("running");
    setTimeout(() => {
      setStatus("success");
      const simulatedResult =
        tool.name === "Run"
          ? t("当前时间: 2026/07/31 周五\n当前用户: root", "Current time: 2026/07/31 Fri\nCurrent user: root")
          : tool.result || t("执行完成", "Execution completed");
      setResultText(simulatedResult);
      if (onExecute) onExecute(tool.id);
    }, 600);
  };

  const handleRejectClick = () => {
    setStatus("error");
    setResultText(t("用户已拒绝此工具调用", "User rejected this tool invocation"));
    if (onReject) onReject(tool.id);
  };

  const highlightShellCommand = (cmd: string) => {
    const tokens = cmd.split(/(".*?"|'.*?'|\&\&|\|\||\||;|\s+)/g);
    return tokens.map((token, idx) => {
      if (!token) return null;
      if (token.startsWith('"') || token.startsWith("'")) {
        return (
          <span key={idx} className="text-amber-600 dark:text-amber-400 font-medium">
            {token}
          </span>
        );
      }
      if (["&&", "||", "|", ";"].includes(token.trim())) {
        return (
          <span key={idx} className="text-purple-600 dark:text-purple-400 font-bold">
            {token}
          </span>
        );
      }
      if (
        ["echo", "date", "whoami", "cat", "ls", "grep", "cd", "npm", "git", "python", "node", "yarn", "pnpm"].includes(
          token.trim()
        )
      ) {
        return (
          <span key={idx} className="text-emerald-700 dark:text-emerald-400 font-semibold">
            {token}
          </span>
        );
      }
      if (token.startsWith("/")) {
        return (
          <span key={idx} className="text-blue-600 dark:text-blue-400">
            {token}
          </span>
        );
      }
      return <span key={idx}>{token}</span>;
    });
  };

  return (
    <div className="w-full text-xs font-sans space-y-1.5 my-2">
      {/* 1. Header Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 cursor-pointer select-none font-sans"
      >
        {isCollapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        )}
        <span className="font-sans font-medium text-xs text-gray-700 dark:text-zinc-300">
          {tool.name}
        </span>
        <span className="font-sans text-xs text-gray-400 dark:text-zinc-500 truncate max-w-[400px]">
          {tool.description || tool.args}
        </span>
      </button>

      {/* 2. Main Card Body (Matching user screenshot) */}
      {!isCollapsed && (
        <div className="w-full rounded-xl border border-gray-200/90 dark:border-[#2a2a2a] bg-[#f0f0f0] dark:bg-[#171717] p-3.5 space-y-3 font-sans shadow-2xs">
          {/* Command Snippet Box */}
          <div className="w-full rounded-lg border border-gray-200/80 dark:border-[#2a2a2a] bg-[#e4e4e7] dark:bg-[#0b0b0b] p-2.5 font-mono text-xs overflow-x-auto text-gray-800 dark:text-[#ededed]">
            <span className="text-teal-600 dark:text-teal-400 font-bold">$ </span>
            {highlightShellCommand(tool.command || tool.args || "")}
          </div>

          {/* Bottom Bar */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            {/* Left: Auto execute switch */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 text-xs select-none">
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
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoExecute ? "bg-[#5c56e0]" : "bg-gray-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoExecute ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </button>
              <span
                onClick={() => {
                  const nextVal = !autoExecute;
                  setAutoExecute(nextVal);
                  if (nextVal && status === "pending") {
                    handleExecuteClick();
                  }
                }}
                className="cursor-pointer font-medium hover:text-gray-900 dark:hover:text-zinc-200"
              >
                {t("自动执行", "Auto execute")}
              </span>
              <div className="group relative flex items-center">
                <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer" />
                <div className="hidden group-hover:block absolute left-5 bottom-0 z-20 w-48 p-2 text-[11px] bg-gray-900 text-white dark:bg-zinc-800 rounded shadow-md pointer-events-none">
                  {t("开启后将自动同意并切换至执行状态", "Auto approves and switches to executing state")}
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {status === "pending" ? (
                <>
                  <button
                    onClick={handleRejectClick}
                    className="px-3.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer rounded-md border border-transparent hover:bg-gray-200/60 dark:hover:bg-zinc-800"
                  >
                    {t("拒绝", "Reject")}
                  </button>
                  <button
                    onClick={handleExecuteClick}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-[#5c56e0] hover:bg-[#4d46d0] active:bg-[#3f38c0] rounded-md shadow-2xs transition-colors cursor-pointer"
                  >
                    {t("执行", "Execute")}
                  </button>
                </>
              ) : status === "success" ? (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t("已执行", "Executed")}</span>
                </div>
              ) : status === "error" ? (
                <div className="flex items-center gap-1.5 text-rose-500 text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{t("已拒绝", "Rejected")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-blue-500 text-xs font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("执行中...", "Executing...")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Result log if present */}
          {resultText && (
            <div className="p-2.5 bg-gray-900 dark:bg-black text-gray-200 rounded-md font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-gray-800">
              {resultText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
