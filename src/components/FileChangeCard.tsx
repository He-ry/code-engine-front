import React, { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FilePen,
  FilePlus,
  Check,
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

/**
 * Extract the "content" field value from a (possibly partial) JSON delta.
 *
 * The backend streams tool-call argument JSON as the model generates it
 * (see turn.py _run_sampling_request → tool_call_delta).  For write_file
 * the delta looks like:
 *   {"path": "hello.py", "content": "print('hello...\\n"}
 *
 * This walks the JSON string byte by byte after the "content": " marker,
 * handling \\n \\t \\r \\\" \\\\ and \\uXXXX escapes, and stops at the
 * unescaped closing quote (or end-of-input for truncated JSON).
 */
export function extractStreamContent(delta: string): string {
  if (!delta) return "";

  // ── complete JSON (fast path) ──
  try {
    const obj = JSON.parse(delta);
    // Prefer new_str (edit/apply_patch), then content (write_file), then old_str
    if (typeof obj.new_str === "string" && obj.new_str) return obj.new_str;
    if (typeof obj.content === "string" && obj.content) return obj.content;
    if (typeof obj.old_str === "string" && obj.old_str) return obj.old_str;
    if (obj.files?.[0]?.new_str) return String(obj.files[0].new_str);
    if (obj.files?.[0]?.content) return String(obj.files[0].content);
    if (obj.files?.[0]?.old_str) return String(obj.files[0].old_str);
    return delta;
  } catch {
    /* partial — parse manually below */
  }

  // ── partial JSON: locate the newest content-bearing string value ──
  // Fields come in order: path → old_str → new_str (or content).
  // We want the last meaningful content field, so check in reverse order.
  let marker = _findFieldMarker(delta, '"new_str"');
  if (!marker) marker = _findFieldMarker(delta, '"content"');
  if (!marker) marker = _findFieldMarker(delta, '"old_str"');
  if (!marker) return "..."; // still waiting for the content field — don't flash raw JSON

  return _walkJsonString(delta, marker);
}

/** Return the index just past `"fieldName": "` or `"fieldName":"`, or 0. */
function _findFieldMarker(raw: string, fieldName: string): number {
  // Prefer the spaced variant (most models emit this).
  const keySpaced = `${fieldName}: "`;
  let i = raw.indexOf(keySpaced);
  if (i !== -1) return i + keySpaced.length;
  const keyTight = `${fieldName}:"`;
  i = raw.indexOf(keyTight);
  if (i !== -1) return i + keyTight.length;
  return 0;
}

/**
 * Walk *raw* starting at *pos* as a JSON string value.
 *   - \\n \\t \\r \\\" \\\\ \\/  → unescaped
 *   - \\uXXXX → decoded
 *   - unescaped `"` → end of string
 *   - end of input → truncated (return what we have)
 */
function _walkJsonString(raw: string, pos: number): string {
  const out: string[] = [];
  let i = pos;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === "\\" && i + 1 < raw.length) {
      const n = raw[i + 1];
      switch (n) {
        case "n":  out.push("\n"); i += 2; break;
        case "t":  out.push("\t"); i += 2; break;
        case "r":  out.push("\r"); i += 2; break;
        case '"':  out.push('"');  i += 2; break;
        case "\\": out.push("\\"); i += 2; break;
        case "/":  out.push("/");  i += 2; break;
        case "u": {
          if (i + 5 < raw.length) {
            const cp = parseInt(raw.slice(i + 2, i + 6), 16);
            out.push(isNaN(cp) ? "\\u" : String.fromCodePoint(cp));
            i += isNaN(cp) ? 2 : 6;
          } else {
            out.push("\\u");
            i += 2;
          }
          break;
        }
        default:
          // unknown escape → keep literal
          out.push(n);
          i += 2;
      }
    } else if (ch === '"') {
      break; // end of JSON string
    } else {
      out.push(ch);
      i += 1;
    }
  }
  return out.join("");
}

/** GitHub-style unified diff renderer with line numbers, gutter signs, and background colours. */
const DiffView: React.FC<{ diff: string }> = ({ diff }) => {
  const lines = diff.split("\n");
  // Compute line-number width from total lines so columns stay aligned.
  const numWidth = Math.max(3, String(lines.length).length);

  return (
    <div className="font-mono text-[12px] leading-[1.5] overflow-x-auto">
      {lines.map((line, i) => {
        const isAdd = line.startsWith("+") && !line.startsWith("+++");
        const isDel = line.startsWith("-") && !line.startsWith("---");
        const isHunk = line.startsWith("@@");
        const isMeta = line.startsWith("diff ") || line.startsWith("index ") ||
                        line.startsWith("---") || line.startsWith("+++");

        let rowBg = "";
        let gutterSign = " ";
        let signColor = "";

        if (isAdd) {
          rowBg = "bg-emerald-50 dark:bg-emerald-950/25";
          gutterSign = "+";
          signColor = "text-emerald-600 dark:text-emerald-400";
        } else if (isDel) {
          rowBg = "bg-rose-50 dark:bg-rose-950/25";
          gutterSign = "-";
          signColor = "text-rose-600 dark:text-rose-400";
        } else if (isHunk) {
          rowBg = "bg-blue-50/60 dark:bg-blue-950/15";
          gutterSign = "@";
          signColor = "text-blue-500 dark:text-blue-400";
        } else if (isMeta) {
          rowBg = "bg-gray-50 dark:bg-zinc-900/50";
        }

        // Pad line number to fixed width
        const ln = String(i + 1).padStart(numWidth, " ");

        return (
          <div key={i} className={`flex ${rowBg} min-w-max`}>
            {/* Gutter: sign + line number */}
            <span className={`w-5 text-center select-none shrink-0 ${signColor || "text-gray-400 dark:text-zinc-600"}`}>
              {gutterSign}
            </span>
            <span className="w-8 text-right select-none shrink-0 text-gray-400 dark:text-zinc-600 pr-3 border-r border-gray-200 dark:border-zinc-700/50 mr-3">
              {ln}
            </span>
            {/* Content */}
            <span className={`whitespace-pre pr-2 ${isAdd ? "text-emerald-800 dark:text-emerald-300" : isDel ? "text-rose-800 dark:text-rose-300" : isHunk ? "text-blue-600 dark:text-blue-300 font-semibold" : isMeta ? "text-gray-500 dark:text-zinc-500 font-semibold" : "text-gray-700 dark:text-zinc-300"}`}>
              {line || " "}
            </span>
          </div>
        );
      })}
    </div>
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

  // Extract file paths from tool args once (complete JSON, fast path).
  // Show raw contentDelta directly — no expensive regex re-parsing on every delta.
  const streamedPaths: string[] = useMemo(() => {
    if (!tool.args) return [];
    try {
      const obj = JSON.parse(tool.args);
      const list = obj.files || (obj.path ? [obj] : []);
      return list.map((f: any) => f.path || "").filter(Boolean);
    } catch {
      return [];
    }
  }, [tool.args]);

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

  // ── Streaming / running: thinking-mode style ──
  // Only show while the tool is actively running — collapse as soon as
  // the backend marks it complete, even if the overall message is still streaming.
  if (isRunning && tool.contentDelta) {
    // During streaming, expand by default; after streaming ends, respect user toggle
    const streamExpanded = isExpanded || (isStreaming && !isExpanded);
    const rawContent = extractStreamContent(tool.contentDelta || "");
    return (
      <div className="w-full text-xs transition-all font-sans">
        <button
          onClick={() => setIsExpanded(!streamExpanded)}
          className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer select-none py-0.5 transition-colors font-sans"
        >
          {streamExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          )}
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          <span className="font-sans text-xs tracking-tight">
            {t("正在生成文件内容...", "Generating file content...")}
          </span>
        </button>
        {streamExpanded && (
          <div
            className="mt-1.5 pl-3 border-l border-gray-200 dark:border-zinc-800/80 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-sans space-y-2 py-0.5 max-h-60 overflow-y-auto"
            ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
          >
            {streamedPaths.length > 0 ? (
              streamedPaths.map((path, i) => (
                <div key={`${path}-${i}`}>
                  <div className="font-semibold font-mono opacity-70">{path}</div>
                  <pre className="font-mono opacity-80 whitespace-pre-wrap text-[11px]">
                    {rawContent || "..."}
                  </pre>
                </div>
              ))
            ) : (
              <pre className="font-mono break-all opacity-60 whitespace-pre-wrap text-[11px]">
                {rawContent || "..."}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Pending: review card with diff preview ──
  if (isPending) {
    // Build file preview list: paths from tool args, content from streaming delta.
    const pendingContent = extractStreamContent(tool.contentDelta || "");
    const pendingFiles = (() => {
      if (streamedPaths.length > 0) {
        return streamedPaths.map((path) => ({ path, content: pendingContent }));
      }
      // Fallback: try to parse from tool.args
      if (!tool.args) return [];
      try {
        const obj = JSON.parse(tool.args);
        const list = obj.files || (obj.path ? [obj] : []);
        return list.map((f: { path: string; content?: string }) => ({
          path: f.path,
          content: f.content || pendingContent || "",
        }));
      } catch {
        return [];
      }
    })();

    // Compute line stats for a file content
    const lineStats = (content: string) => {
      const lines = content.split("\n");
      const added = lines.length;
      return { added, removed: 0 };
    };

    return (
      <div className="w-full my-2 font-sans text-xs">
        <div className="w-full rounded-lg border border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <FilePen className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="font-semibold text-gray-800 dark:text-zinc-200 text-[11px]">write_file</span>
              <span className="text-gray-500 dark:text-zinc-400 text-[11px]">
                {pendingFiles.length > 0
                  ? t(`即将写入 ${pendingFiles.length} 个文件`, `About to write ${pendingFiles.length} file(s)`)
                  : t("即将写入文件", "About to write file(s)")}
              </span>
            </div>
          </div>

          {/* File list with previews */}
          {pendingFiles.length > 0 && (
            <div className="px-3 py-2 space-y-2">
              {pendingFiles.map((pf, i) => {
                const stats = lineStats(pf.content);
                return (
                  <div key={`${pf.path}-${i}`} className="rounded-md border border-gray-100 dark:border-zinc-800/60 overflow-hidden">
                    {/* File header */}
                    <div
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-gray-50/50 dark:bg-zinc-950/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/60 transition-colors"
                      onClick={() => onOpenFile?.(pf.path, pf.content)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <FilePlus className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-mono text-[11px] text-gray-700 dark:text-zinc-200 truncate">
                          {pf.path}
                        </span>
                        <span className="text-[9px] px-1 py-px rounded border font-medium shrink-0 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40">
                          {t("新增", "Add")}
                        </span>
                        {stats.added > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">+{stats.added}</span>
                        )}
                      </div>
                    </div>
                    {/* Content preview — GitHub-style (green bg + gutter for new files) */}
                    <div className="border-t border-gray-100 dark:border-zinc-800/60 max-h-48 overflow-y-auto">
                      {pf.content ? (
                        pf.content.split("\n").map((line, li) => (
                          <div key={li} className="flex bg-emerald-50 dark:bg-emerald-950/20 min-w-max">
                            <span className="w-5 text-center select-none shrink-0 text-emerald-500 dark:text-emerald-400 font-mono text-[11px] leading-[1.6]">
                              +
                            </span>
                            <span className="w-8 text-right select-none shrink-0 text-gray-400 dark:text-zinc-600 pr-3 border-r border-emerald-200 dark:border-emerald-800/30 mr-3 font-mono text-[11px] leading-[1.6]">
                              {String(li + 1).padStart(3, " ")}
                            </span>
                            <span className="whitespace-pre font-mono text-[11px] leading-[1.6] text-emerald-800 dark:text-emerald-300 pr-2">
                              {line || " "}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-gray-400 dark:text-zinc-500 text-[11px]">{t("（空文件）", "(empty file)")}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback: no parsed files, show raw args */}
          {pendingFiles.length === 0 && tool.args && (
            <div className="px-3 py-2">
              <pre className="font-mono text-[11px] leading-relaxed text-gray-400 dark:text-zinc-500 whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto p-2 rounded-md bg-gray-50/50 dark:bg-zinc-950/50">
                {tool.args}
              </pre>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 dark:border-zinc-800/60">
            <button
              onClick={() => {
                // Open all pending files in editor for review
                for (const pf of pendingFiles) {
                  onOpenFile?.(pf.path, pf.content);
                }
              }}
              className="px-2 py-1 text-[11px] font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1"
            >
              <FilePen className="w-3 h-3" />
              <span>{t("在编辑器中审核", "Review in Editor")}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleReject}
                className="px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
              >
                {t("拒绝", "Reject")}
              </button>
              <button
                onClick={handleApprove}
                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-gray-800 hover:bg-gray-700 dark:bg-zinc-200 dark:text-gray-900 dark:hover:bg-zinc-300 rounded transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Check className="w-3 h-3" />
                <span>{t("确认写入", "Confirm Write")}</span>
              </button>
            </div>
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

  // ── Completed: compact one-line summary (no expanded card after approval) ──
  return (
    <div className="w-full text-xs transition-all font-sans">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 py-0.5 font-sans w-full">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="font-sans text-xs tracking-tight font-medium text-gray-600 dark:text-zinc-300 whitespace-nowrap">
          {t(`已写入 ${fileCount} 个文件`, `Written ${fileCount} file(s)`)}
        </span>
        {/* File names — click to open in editor */}
        {files.map((f, i) => (
          <button
            key={f.path}
            onClick={(e) => {
              e.stopPropagation();
              onOpenFile?.(f.path, f.content || "");
            }}
            className="font-mono text-[10px] text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[200px] cursor-pointer transition-colors"
            title={f.path}
          >
            {f.path.split("/").pop() || f.path}{i < files.length - 1 ? "," : ""}
          </button>
        ))}
        {stats.added > 0 && (
          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">+{stats.added}</span>
        )}
        {stats.removed > 0 && (
          <span className="text-rose-500 dark:text-rose-400 font-mono text-[11px]">-{stats.removed}</span>
        )}
      </div>
    </div>
  );
};
