import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePen,
  FilePlus,
  Check,
  RotateCcw,
  Loader2,
  XCircle,
} from "lucide-react";
import { ToolExecution, FileChange } from "../types";
import { useSettings } from "../context/SettingsContext";

interface FileChangeCardProps {
  tool: ToolExecution;
  isStreaming: boolean;
  onApprove?: (toolId: string) => void;
  onReject?: (toolId: string) => void;
  onOpenFile?: (path: string, content: string) => void;
  onKeepFile?: (path: string) => void;
  onRevertFile?: (path: string, originalContent: string | null) => void;
}

/** Try to parse streaming JSON args to extract per-file path+content. */
function parseStreamingFiles(delta: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  try {
    // Try to parse as complete JSON first
    const obj = JSON.parse(delta);
    const list = obj.files || (obj.path ? [obj] : []);
    for (const f of list) {
      if (f.path) files.push({ path: f.path, content: f.content || "" });
    }
    return files;
  } catch {
    // Partial JSON — extract path+content pairs via regex
    const re = /"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)/g;
    let m;
    while ((m = re.exec(delta)) !== null) {
      let content = m[2];
      try {
        content = JSON.parse(`"${content}"`);
      } catch { /* use raw */ }
      files.push({ path: m[1], content });
    }
    // Also try single-file format
    if (files.length === 0) {
      const pathM = /"path"\s*:\s*"([^"]+)"/.exec(delta);
      const contentM = /"content"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(delta);
      if (pathM) {
        let content = contentM ? contentM[1] : "";
        try { content = JSON.parse(`"${content}"`); } catch { /* use raw */ }
        files.push({ path: pathM[1], content });
      }
    }
    return files;
  }
}

/** Simple +/- diff line renderer. Green for +, red for -, gray for context. */
const DiffView: React.FC<{ diff: string }> = ({ diff }) => {
  const lines = diff.split("\n");
  return (
    <pre className="font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
      {lines.map((line, i) => {
        let cls = "text-gray-500 dark:text-zinc-500";
        if (line.startsWith("+") && !line.startsWith("+++")) cls = "text-emerald-600 dark:text-emerald-400";
        else if (line.startsWith("-") && !line.startsWith("---")) cls = "text-rose-500 dark:text-rose-400";
        else if (line.startsWith("@@")) cls = "text-blue-500 dark:text-blue-400";
        return <div key={i} className={cls}>{line || " "}</div>;
      })}
    </pre>
  );
};

export const FileChangeCard: React.FC<FileChangeCardProps> = ({
  tool,
  isStreaming,
  onApprove,
  onReject,
  onOpenFile,
  onKeepFile,
  onRevertFile,
}) => {
  const { t } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState(tool.status);
  // Keep local status in sync when the prop changes (e.g. "running" → "success")
  useEffect(() => {
    setStatus(tool.status);
  }, [tool.status]);
  const files: FileChange[] = tool.files || [];
  const stats = tool.fileStats || { added: 0, removed: 0 };
  const fileCount = files.length;

  const isPending = status === "pending";
  const isRunning = status === "running";
  const isError = status === "error" || status === "failed" || status === "declined" || status === "aborted";

  // Parse streaming content to show file contents being written
  const streamedFiles = useMemo(() => {
    if (!tool.contentDelta) return [];
    return parseStreamingFiles(tool.contentDelta);
  }, [tool.contentDelta]);

  const handleApprove = () => {
    setStatus("running");
    onApprove?.(tool.id);
  };

  const handleReject = () => {
    setStatus("error");
    onReject?.(tool.id);
  };

  const kindIcon = (kind: string) => {
    switch (kind) {
      case "add": return <FilePlus className="w-3 h-3 text-emerald-500" />;
      case "update": return <FilePen className="w-3 h-3 text-amber-500" />;
      case "delete": return <XCircle className="w-3 h-3 text-rose-500" />;
      default: return <FilePen className="w-3 h-3 text-gray-400" />;
    }
  };

  const kindLabel = (kind: string) => {
    switch (kind) {
      case "add": return t("新增", "Add");
      case "update": return t("修改", "Modify");
      case "delete": return t("删除", "Delete");
      default: return kind;
    }
  };

  const kindStyle = (kind: string) => {
    switch (kind) {
      case "add": return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40";
      case "update": return "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40";
      case "delete": return "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40";
      default: return "bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700";
    }
  };

  // ── Streaming / running: inline like thinking panel ──
  if (isRunning || (isStreaming && tool.contentDelta)) {
    const allStreamed = streamedFiles;
    const firstFile = allStreamed[0];
    // During streaming, expand by default
    const streamExpanded = isExpanded || (isStreaming && !isExpanded && firstFile != null);
    return (
      <div className="w-full text-xs transition-all font-sans">
        <button
          onClick={() => setIsExpanded(!streamExpanded)}
          className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer select-none py-0.5 transition-colors font-sans"
        >
          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
          <span className="font-sans text-xs tracking-tight">
            {firstFile
              ? t(`正在写入 ${firstFile.path}`, `Writing ${firstFile.path}`)
              : t("正在写入文件...", "Writing files...")}
          </span>
        </button>
        {streamExpanded && (
          <div className="mt-1 pl-3 border-l border-gray-200 dark:border-zinc-800/80 space-y-2 py-0.5">
            {allStreamed.map((sf, i) => (
              <div key={`${sf.path}-${i}`}>
                <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 font-mono mb-0.5">
                  {sf.path}
                </div>
                <pre className="font-mono text-[11px] leading-relaxed text-gray-500 dark:text-zinc-400 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                  {sf.content || "..."}
                </pre>
              </div>
            ))}
            {allStreamed.length === 0 && (
              <pre className="font-mono text-[11px] text-gray-400 dark:text-zinc-500 whitespace-pre-wrap break-all">
                {tool.contentDelta || ""}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Pending: approval row ──
  if (isPending) {
    return (
      <div className="w-full my-1 font-sans text-xs">
        <div className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FilePen className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="font-semibold text-gray-800 dark:text-zinc-200 text-[11px]">write_file</span>
            <span className="text-gray-500 dark:text-zinc-400 truncate text-[11px]">
              {t(`即将编辑 ${fileCount} 个文件`, `About to edit ${fileCount} file(s)`)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleReject}
              className="px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
            >
              {t("拒绝", "Reject")}
            </button>
            <button
              onClick={handleApprove}
              className="px-2 py-0.5 text-[11px] font-semibold text-gray-900 bg-[#E0E0E0] hover:bg-[#d0d0d0] dark:bg-[#E0E0E0] dark:text-gray-900 border border-gray-300/80 dark:border-zinc-600 rounded shadow-2xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>{t("执行", "Execute")}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="w-full my-1 font-sans text-xs">
        <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 py-0.5">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold text-[11px]">write_file</span>
          <span className="text-[11px]">
            {tool.errorReason === "user_denied" ? t("已拒绝", "Rejected") : t("写入失败", "Write failed")}
          </span>
        </div>
      </div>
    );
  }

  // ── Completed: minimalist toggle line ──
  return (
    <div className="w-full text-xs transition-all font-sans">
      {/* Collapsed toggle row — inline, no card border */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer select-none py-0.5 transition-colors font-sans w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        )}
        <FilePen className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        <span className="font-sans text-xs tracking-tight font-medium text-gray-600 dark:text-zinc-300">
          {t(`已编辑 ${fileCount} 个文件`, `Edited ${fileCount} file(s)`)}
        </span>
        {stats.added > 0 && (
          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">+{stats.added}</span>
        )}
        {stats.removed > 0 && (
          <span className="text-rose-500 dark:text-rose-400 font-mono text-[11px]">-{stats.removed}</span>
        )}
      </button>

      {/* Expanded: each file with diff */}
      {isExpanded && files.length > 0 && (
        <div className="mt-1 pl-3 border-l border-gray-200 dark:border-zinc-800/80 space-y-3 py-0.5">
          {files.map((fc, i) => (
            <div key={`${fc.path}-${i}`}>
              {/* File header row */}
              <div
                className="flex items-center justify-between gap-2 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  const content = fc.content || "";
                  onOpenFile?.(fc.path, content);
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {kindIcon(fc.kind)}
                  <span className="font-mono text-[11px] text-gray-700 dark:text-zinc-200 truncate">
                    {fc.path}
                  </span>
                  <span className={`text-[9px] px-1 py-px rounded border font-medium shrink-0 ${kindStyle(fc.kind)}`}>
                    {kindLabel(fc.kind)}
                  </span>
                  {fc.added > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">+{fc.added}</span>
                  )}
                  {fc.removed > 0 && (
                    <span className="text-rose-500 dark:text-rose-400 font-mono text-[10px]">-{fc.removed}</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onKeepFile?.(fc.path)}
                    className="px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors cursor-pointer flex items-center gap-0.5"
                    title={t("保留", "Keep")}
                  >
                    <Check className="w-3 h-3" />
                    {t("保留", "Keep")}
                  </button>
                  <button
                    onClick={() => onRevertFile?.(fc.path, fc.original_content ?? null)}
                    className="px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-0.5"
                    title={t("撤销", "Revert")}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t("撤销", "Revert")}
                  </button>
                </div>
              </div>
              {/* Diff or error */}
              {fc.error ? (
                <div className="text-[10px] text-rose-500 pl-5">{fc.error}</div>
              ) : fc.diff ? (
                <div className="pl-5 rounded-md overflow-hidden border border-gray-100 dark:border-zinc-800/60 bg-gray-50/50 dark:bg-zinc-950/50 max-h-64 overflow-y-auto">
                  <DiffView diff={fc.diff} />
                </div>
              ) : fc.content ? (
                <div className="pl-5 rounded-md overflow-hidden border border-gray-100 dark:border-zinc-800/60 bg-gray-50/50 dark:bg-zinc-950/50 max-h-64 overflow-y-auto">
                  <pre className="font-mono text-[11px] leading-relaxed text-gray-700 dark:text-zinc-300 whitespace-pre-wrap p-2">
                    {fc.content}
                  </pre>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
