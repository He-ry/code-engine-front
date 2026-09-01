import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ToolExecution } from "../types";
import { useSettings } from "../context/SettingsContext";
import { ToolInvocationCard } from "./ToolInvocationCard";
import { FileChangeCard } from "./FileChangeCard";
import { FileStreamRow } from "./FileStreamRow";

interface ToolGroupCardProps {
  tools: ToolExecution[];
  isStreaming: boolean;
  onApproval?: (approved: boolean, approvalId?: string) => void;
  onOpenFile?: (
    path: string,
    content: string,
    pendingChange?: { toolCallId: string; originalContent: string | null }
  ) => void;
  onKeepFile?: (path: string) => void;
  onRevertFile?: (path: string, originalContent: string | null) => void;
}

const isFileTool = (tool: ToolExecution) =>
  tool.name === "write_file" ||
  tool.name === "apply_patch" ||
  // Placeholder created by command_execution_output_delta before
  // item_started: no name yet, but contentDelta indicates a file tool.
  (!tool.name && !!tool.contentDelta);

/**
 * Compact Codex-style card for a run of consecutive tool calls: one collapsed
 * header row ("⚡ 执行了 N 个操作 · Xs"); expanding reveals the individual
 * cards (FileChangeCard / ToolInvocationCard / live FileStreamRow).
 *
 * Collapse state: user toggle is honored, EXCEPT the group force-expands
 * while (a) a tool awaits approval (buttons must stay reachable) or
 * (b) a file tool is streaming its content (live write preview). These
 * conditions are derived at render time from tool state — never stored — so
 * the group re-collapses automatically when the tool finishes.
 */
export const ToolGroupCard: React.FC<ToolGroupCardProps> = ({
  tools,
  isStreaming,
  onApproval,
  onOpenFile,
  onKeepFile,
  onRevertFile,
}) => {
  const { t } = useSettings();
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);

  if (tools.length === 0) return null;

  // Match Codex for the common case: a single tool call is shown as one
  // disclosure row with its output panel, not wrapped inside an extra
  // "Ran 1 operation" group button.
  if (tools.length === 1) {
    const tool = tools[0];
    if (
      isFileTool(tool) &&
      tool.status === "running" &&
      tool.contentDelta &&
      isStreaming
    ) {
      return <FileStreamRow tool={tool} isStreaming={isStreaming} />;
    }
    if (isFileTool(tool)) {
      return (
        <FileChangeCard
          tool={tool}
          isStreaming={isStreaming}
          onApprove={(toolId) => onApproval?.(true, toolId)}
          onReject={(toolId) => onApproval?.(false, toolId)}
          onOpenFile={onOpenFile}
          onKeepFile={onKeepFile}
          onRevertFile={onRevertFile}
        />
      );
    }
    return (
      <ToolInvocationCard
        tool={tool}
        onExecute={(toolId) => onApproval?.(true, toolId)}
        onReject={(toolId) => onApproval?.(false, toolId)}
      />
    );
  }

  const hasPending = tools.some((tool) => tool.status === "pending");
  const activeFileTool = tools.find(
    (tool) =>
      tool.status === "running" && !!tool.contentDelta && isStreaming && isFileTool(tool)
  );
  const runningTool = tools.find((tool) => tool.status === "running");
  const failedCount = tools.filter((tool) => tool.status === "error").length;

  const forceExpand = hasPending || !!activeFileTool;
  const expanded = forceExpand || (userExpanded ?? false);

  // Group duration — only meaningful when real timestamps exist (live turns).
  // History messages carry a synthetic counter clock and no completedAt → skip.
  let durationSec: number | undefined;
  const times = tools.map((tool) => tool.createdAt).filter(Boolean) as number[];
  const completions = tools
    .map((tool) => tool.completedAt)
    .filter(Boolean) as number[];
  if (completions.length === tools.length && times.length === tools.length) {
    durationSec = Math.max(
      1,
      Math.round((Math.max(...completions) - Math.min(...times)) / 1000)
    );
  }

  return (
    <div className="w-full text-xs font-sans">
      <button
        onClick={() => setUserExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer select-none py-0.5 transition-colors font-sans"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
        )}

        {runningTool ? (
          <span className="font-sans text-xs tracking-tight animate-pulse">
            {runningTool.name
              ? t(`正在执行 ${runningTool.name}…`, `Running ${runningTool.name}...`)
              : t("正在执行…", "Running...")}
          </span>
        ) : hasPending ? (
          <span className="font-sans text-xs tracking-tight text-amber-500 dark:text-amber-400">
            {t("等待确认", "Awaiting approval")}
          </span>
        ) : (
          <span className="font-sans text-xs tracking-tight">
            {t(`执行了 ${tools.length} 个操作`, `Ran ${tools.length} operations`)}
          </span>
        )}

        <span className="text-[11px] opacity-80 font-mono">
          {runningTool || hasPending ? `· ${tools.length}` : durationSec ? `· ${durationSec}s` : ""}
        </span>
        {failedCount > 0 && (
          <span className="text-[11px] text-red-500 dark:text-red-400 font-mono">
            {t(`· ${failedCount} 失败`, `· ${failedCount} failed`)}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 pl-3 border-l border-gray-200 dark:border-zinc-800/80 space-y-2 py-0.5">
          {tools.map((tool) => {
            if (
              isFileTool(tool) &&
              tool.status === "running" &&
              tool.contentDelta &&
              isStreaming
            ) {
              return <FileStreamRow key={tool.id} tool={tool} isStreaming={isStreaming} />;
            }
            if (isFileTool(tool)) {
              return (
                <FileChangeCard
                  key={tool.id}
                  tool={tool}
                  isStreaming={isStreaming}
                  onApprove={(toolId) => onApproval?.(true, toolId)}
                  onReject={(toolId) => onApproval?.(false, toolId)}
                  onOpenFile={onOpenFile}
                  onKeepFile={onKeepFile}
                  onRevertFile={onRevertFile}
                />
              );
            }
            return (
              <ToolInvocationCard
                key={tool.id}
                tool={tool}
                onExecute={(toolId) => onApproval?.(true, toolId)}
                onReject={(toolId) => onApproval?.(false, toolId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
