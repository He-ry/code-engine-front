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
} from "lucide-react";
import { ToolExecution } from "../types";
import { ToolInvocationCard } from "./ToolInvocationCard";

interface ToolExecutionGroupProps {
  tools: ToolExecution[];
  onExecuteTool?: (toolId: string) => void;
  onRejectTool?: (toolId: string) => void;
}

export function parseToolInfo(tool: ToolExecution) {
  const nameLower = tool.name.toLowerCase();

  // 1. Read / View File
  if (nameLower.includes("view") || nameLower.includes("read") || nameLower.includes("get")) {
    let fileName = extractFileName(tool.args || tool.description || "");
    let lineRange = extractLineRange(tool.args || "", tool.result || "");
    return {
      type: "read",
      action: "Read",
      fileName: fileName || "file",
      lineRange: lineRange,
      iconType: "eye" as const,
    };
  }

  // 2. Edit / Create File
  if (nameLower.includes("edit") || nameLower.includes("create") || nameLower.includes("write")) {
    let fileName = extractFileName(tool.args || tool.description || "");
    let action = nameLower.includes("create") ? "Created" : "Edited";
    return {
      type: "edit",
      action: action,
      fileName: fileName || "file",
      lineRange: "",
      iconType: "pencil" as const,
    };
  }

  // 3. Command Execution
  if (nameLower.includes("run") || nameLower.includes("command") || nameLower.includes("exec") || nameLower.includes("terminal")) {
    let cmd = tool.command || tool.args || "";
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
    let query = tool.args || "";
    return {
      type: "search",
      action: "Search",
      fileName: query || "query",
      lineRange: "",
      iconType: "search" as const,
    };
  }

  // 5. Fallback / Lint / Other
  return {
    type: "other",
    action: tool.name,
    fileName: tool.args || tool.description || "",
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!tools || tools.length === 0) return null;

  // Separate pending interactive cards (requiring explicit action) from standard tool execution logs
  const interactiveTools = tools.filter(
    (t) => t.status === "pending" || t.autoExecute === false
  );
  const inlineTools = tools.filter(
    (t) => !(t.status === "pending" || t.autoExecute === false)
  );

  // Calculate header text
  const getHeaderTitle = () => {
    const total = inlineTools.length;
    let readCount = 0;
    let editCount = 0;
    let runCount = 0;
    let searchCount = 0;

    inlineTools.forEach((t) => {
      const name = t.name.toLowerCase();
      if (name.includes("view") || name.includes("read") || name.includes("get")) readCount++;
      else if (name.includes("edit") || name.includes("create") || name.includes("write")) editCount++;
      else if (name.includes("run") || name.includes("command") || name.includes("exec")) runCount++;
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
    <div className="w-full space-y-2 my-1.5 font-sans">
      {/* Interactive Tool Cards */}
      {interactiveTools.map((tool) => (
        <ToolInvocationCard
          key={tool.id}
          tool={tool}
          onExecute={onExecuteTool}
          onReject={onRejectTool}
        />
      ))}

      {/* Collapsible Tool Log Group */}
      {inlineTools.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-zinc-400">
          {/* Group Header Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 py-1 px-1 -ml-1 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors select-none group cursor-pointer"
          >
            <span>{getHeaderTitle()}</span>
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-colors" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-colors" />
            )}
          </button>

          {/* Group Items */}
          {!isCollapsed && (
            <div className="space-y-0.5 mt-0.5 pl-0.5">
              {inlineTools.map((tool) => {
                const info = parseToolInfo(tool);
                return (
                  <div
                    key={tool.id}
                    className="flex items-center gap-2 py-0.5 px-1.5 rounded hover:bg-gray-100/60 dark:hover:bg-zinc-800/40 transition-colors text-xs text-gray-600 dark:text-zinc-400"
                  >
                    {/* Status / Icon */}
                    {tool.status === "running" ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                    ) : tool.status === "error" ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    ) : info.iconType === "eye" ? (
                      <Eye className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                    ) : info.iconType === "pencil" ? (
                      <Pencil className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                    ) : info.iconType === "terminal" ? (
                      <Terminal className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                    ) : info.iconType === "search" ? (
                      <Search className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}

                    {/* Action Verb */}
                    <span className="text-gray-500 dark:text-zinc-400 font-normal shrink-0">
                      {info.action}
                    </span>

                    {/* File / Command / Detail */}
                    <span className="text-gray-700 dark:text-zinc-300 font-mono text-[11.5px] truncate max-w-[340px]">
                      {info.fileName}
                    </span>

                    {/* Line Range */}
                    {info.lineRange && (
                      <span className="text-gray-400 dark:text-zinc-500 font-mono text-[11px] shrink-0">
                        {info.lineRange}
                      </span>
                    )}

                    {/* Duration / Status result fallback */}
                    {tool.duration && (
                      <span className="text-gray-400 dark:text-zinc-500 font-mono text-[10px] ml-auto shrink-0">
                        {tool.duration}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
