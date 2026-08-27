import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ToolExecution } from "../types";
import { useSettings } from "../context/SettingsContext";
import { extractStreamContent } from "./FileChangeCard";

interface FileStreamRowProps {
  tool: ToolExecution;
  /** True while the assistant turn is still streaming — the row defaults to
   *  expanded during streaming and collapses once the turn ends. */
  isStreaming: boolean;
}

/**
 * Live "writing file..." shimmer row shown while a write_file / apply_patch
 * tool's arguments (file content) are still streaming in. Renders in
 * thinking-panel style — no card, no border — and auto-scrolls the preview.
 */
export const FileStreamRow: React.FC<FileStreamRowProps> = ({
  tool,
  isStreaming,
}) => {
  const { t } = useSettings();
  const [override, setOverride] = useState<boolean | null>(null);
  const isCollapsed = override ?? !isStreaming;

  // Extract file paths from the tool's original args (complete JSON, fast
  // path) instead of re-parsing the growing contentDelta on every render —
  // keeps streaming smooth.
  const filePaths: string[] = (() => {
    if (!tool.args) return [];
    try {
      const obj = JSON.parse(tool.args);
      const list = obj.files || (obj.path ? [obj] : []);
      return list.map((f: any) => f.path || "").filter(Boolean);
    } catch {
      return [];
    }
  })();
  const rawContent = extractStreamContent(tool.contentDelta || "");

  return (
    <div className="w-full text-xs transition-all font-sans">
      <button
        onClick={() => setOverride(!isCollapsed)}
        className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer select-none py-0.5 transition-colors font-sans"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
        )}
        <span
          className="font-sans text-xs tracking-tight relative"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #9ca3af 0%, #9ca3af 40%, #1f2937 50%, #6b7280 60%, #9ca3af 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            animation: "thinking-shimmer 2s ease-in-out infinite",
            animationDirection: "alternate",
          }}
        >
          {t("正在写入文件", "Writing file...")}
          <span className="animate-pulse ml-0.5" style={{ color: "#6b7280" }}>
            ...
          </span>
        </span>
      </button>
      {!isCollapsed && (
        <div
          className="mt-1.5 pl-3 border-l border-gray-200 dark:border-zinc-800/80 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-sans space-y-1 py-0.5 max-h-60 overflow-y-auto"
          ref={(el) => {
            if (el) el.scrollTop = el.scrollHeight;
          }}
        >
          {filePaths.length > 0 ? (
            filePaths.map((path, i) => (
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
};
