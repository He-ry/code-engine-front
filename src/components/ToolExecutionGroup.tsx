import React, { useState } from "react";
import {
  Eye,
  Pencil,
  Terminal,
  Search,
  Wrench,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  StopCircle,
  Check,
} from "lucide-react";
import { ToolExecution } from "../types";
import { useSettings } from "../context/SettingsContext";

interface ToolExecutionGroupProps {
  tools: ToolExecution[];
  onExecuteTool?: (toolId: string) => void;
  onRejectTool?: (toolId: string) => void;
}

export function parseToolInfo(tool: ToolExecution) {
  const nameLower = tool.name.toLowerCase();
  // Prefer human-readable command/description over raw JSON args for display.
  const displayText = tool.command || tool.description || tool.args || "";

  // 1. Read / View File
  if (nameLower.includes("view") || nameLower.includes("read") || nameLower.includes("get")) {
    let fileName = extractFileName(displayText);
    let lineRange = extractLineRange(displayText, tool.result || "");
    return {
      type: "read",
      action: "Read",
      fileName: fileName || "file",
      lineRange: lineRange,
      iconType: "eye" as const,
    };
  }

  // 2. Edit / Create File (includes apply_patch for file patching)
  if (nameLower.includes("edit") || nameLower.includes("create") || nameLower.includes("write") || nameLower.includes("patch")) {
    let fileName = extractFileName(displayText);
    let action = nameLower.includes("create") ? "Created" : "Edited";
    return {
      type: "edit",
      action: action,
      fileName: fileName || "file",
      lineRange: "",
      iconType: "pencil" as const,
    };
  }

  // 3. Command Execution (bash, run, exec, etc.)
  if (nameLower.includes("bash") || nameLower.includes("run") || nameLower.includes("command") || nameLower.includes("exec") || nameLower.includes("terminal")) {
    let cmd = displayText;
    cmd = cmd.replace(/^(command:|cmd:|args:)/i, "").trim();
    return {
      type: "run",
      action: "Run",
      fileName: cmd || "command",
      lineRange: "",
      iconType: "terminal" as const,
    };
  }

  // 4. Search
  if (nameLower.includes("search") || nameLower.includes("grep") || nameLower.includes("find")) {
    return {
      type: "search",
      action: "Search",
      fileName: displayText || "query",
      lineRange: "",
      iconType: "search" as const,
    };
  }

  // 5. Fallback / Lint / Other
  return {
    type: "other",
    action: tool.name,
    fileName: displayText,
    lineRange: tool.result || "",
    iconType: "wrench" as const,
  };
}

function extractFileName(str: string): string {
  if (!str) return "";
  const pathMatch =
    str.match(/(?:path|target|file|AbsolutePath):\s*['"]?([^'",\s]+)/i) ||
    str.match(/['"]?([\w.-]+\/[\w.-]+\.[\w]+)['"]?/) ||
    str.match(/['"]?([\w.-]+\.[\w]+)['"]?/);

  if (pathMatch && pathMatch[1]) {
    const rawPath = pathMatch[1];
    const parts = rawPath.split("/").filter(Boolean);
    if (parts.length === 0) return rawPath;
    return parts[parts.length - 1];
  }
  return str.replace(/^(path:|target:|file:)/i, "").trim().slice(0, 40);
}

function extractLineRange(args: string, result: string): string {
  const lineMatch =
    args.match(/L(\d+(?:-\d+)?)/i) ||
    args.match(/lines?:\s*['"]?(\d+(?:-\d+)?)['"]?/i) ||
    args.match(/StartLine:\s*(\d+).*?EndLine:\s*(\d+)/i) ||
    result.match(/(\d+)\s*(?:行|lines?)/i);

  if (lineMatch) {
    if (lineMatch[1] && lineMatch[2]) {
      return `L${lineMatch[1]}-${lineMatch[2]}`;
    }
    if (lineMatch[1] && lineMatch[1].startsWith("L")) {
      return lineMatch[1];
    }
    if (lineMatch[1] && lineMatch[1].includes("-")) {
      return `L${lineMatch[1]}`;
    }
    if (lineMatch[1]) {
      return `L1-${lineMatch[1]}`;
    }
  }
  return "";
}

export const ToolExecutionGroup: React.FC<ToolExecutionGroupProps> = ({
  tools,
  onExecuteTool,
  onRejectTool,
}) => {
  const { t } = useSettings();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!tools || tools.length === 0) return null;

  // Calculate header text
  const getHeaderTitle = () => {
    const total = tools.length;
    let readCount = 0;
    let editCount = 0;
    let runCount = 0;
    let searchCount = 0;

    tools.forEach((t) => {
      const name = t.name.toLowerCase();
      if (name.includes("view") || name.includes("read") || name.includes("get")) readCount++;
      else if (name.includes("edit") || name.includes("create") || name.includes("write") || name.includes("patch")) editCount++;
      else if (name.includes("bash") || name.includes("run") || name.includes("command") || name.includes("exec")) runCount++;
      else if (name.includes("search") || name.includes("grep")) searchCount++;
    });

    if (readCount === total) return `Read ${total} file${total > 1 ? "s" : ""}`;
    if (editCount === total) return `Edited ${total} file${total > 1 ? "s" : ""}`;
    if (runCount === total) return `Run ${total} command${total > 1 ? "s" : ""}`;
    if (searchCount === total) return `Searched ${total} item${total > 1 ? "s" : ""}`;
    if (readCount > 0 && editCount > 0 && readCount + editCount === total) {
      return `Read & Edited ${total} files`;
    }
    return `Executed ${total} tool${total > 1 ? "s" : ""}`;
  };

  return (
    <div className="w-full my-1.5 font-sans">
      <div className="text-xs text-gray-600 dark:text-zinc-400">
        {/* Group Header Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 py-1 px-1 -ml-1 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors select-none group cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-colors" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-colors" />
          )}
          <span>{getHeaderTitle()}</span>
        </button>

        {/* Group Items */}
        {!isCollapsed && (
          <div className="space-y-1 mt-0.5 pl-0.5">
            {tools.map((tool) => {
              const info = parseToolInfo(tool);
              return (
                <div
                  key={tool.id}
                  className="flex items-center gap-2 py-1 px-2 rounded-lg bg-gray-50/80 dark:bg-zinc-900/60 border border-gray-200/60 dark:border-zinc-800/60 hover:border-gray-300 dark:hover:border-zinc-700 transition-colors text-xs text-gray-600 dark:text-zinc-400"
                >
                  {/* Status / Icon */}
                  {tool.status === "running" ? (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-spin shrink-0" />
                  ) : tool.status === "pending" ? (
                    <div className="flex items-center justify-center shrink-0">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    </div>
                  ) : tool.status === "error" ? (
                    tool.errorReason === "approval_timeout" ? (
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : tool.errorReason === "cancelled" ? (
                      <StopCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )
                  ) : info.iconType === "eye" ? (
                    <Eye className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                  ) : info.iconType === "pencil" ? (
                    <Pencil className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                  ) : info.iconType === "terminal" ? (
                    <Terminal className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                  ) : info.iconType === "search" ? (
                    <Search className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                  )}

                  {/* Action Verb */}
                  <span className="text-gray-500 dark:text-zinc-400 font-medium shrink-0">
                    {info.action}
                  </span>

                  {/* File / Command / Detail */}
                  <span className="text-gray-700 dark:text-zinc-300 font-mono text-[11.5px] truncate max-w-[200px] sm:max-w-[340px]">
                    {info.fileName}
                  </span>

                  {/* Line Range */}
                  {info.lineRange && (
                    <span className="text-gray-400 dark:text-zinc-500 font-mono text-[11px] shrink-0">
                      {info.lineRange}
                    </span>
                  )}

                  {/* Inline Execute / Reject Actions or Status */}
                  {tool.status === "pending" ? (
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => onRejectTool?.(tool.id)}
                        className="px-2 py-0.5 text-xs font-medium text-gray-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                      >
                        {t("拒绝", "Reject")}
                      </button>

                      <button
                        type="button"
                        onClick={() => onExecuteTool?.(tool.id)}
                        className="px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-zinc-200 bg-gray-200/90 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-gray-300/70 dark:border-zinc-700 rounded shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-gray-600 dark:text-zinc-300" />
                        <span>{t("执行", "Execute")}</span>
                      </button>
                    </div>
                  ) : tool.duration ? (
                    <span className="text-gray-400 dark:text-zinc-500 font-mono text-[10px] ml-auto shrink-0">
                      {tool.duration}
                    </span>
                  ) : null}
                </div>
                {/* Streaming content preview — shows last ~120 chars while the
                    tool arguments are still being generated (e.g. write_file). */}
                {tool.status === "running" && tool.contentDelta && tool.contentDelta.length > 10 && (
                  <div className="mt-1 ml-5 text-[11px] font-mono text-gray-400 dark:text-zinc-500 truncate max-w-[320px] pl-2 border-l border-gray-200 dark:border-zinc-700/60">
                    {tool.contentDelta.length > 120
                      ? "…" + tool.contentDelta.slice(-120)
                      : tool.contentDelta}
                  </div>
                )}
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
