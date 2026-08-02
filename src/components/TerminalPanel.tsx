import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import { apiFetch } from "../lib/api";
import {
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  Maximize2,
  X,
  ChevronDown,
  Columns,
  MoreHorizontal,
} from "lucide-react";

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  branchName: string;
}

interface TermLine {
  id: string;
  type: "input" | "output";
  text: string;
  timestamp?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  isOpen,
  onClose,
  projectName,
  branchName,
}) => {
  const { backendApiUrl, user } = useSettings();
  const [activeTab, setActiveTab] = useState<"terminal" | "output">("terminal");
  const [terminalInput, setTerminalInput] = useState("");
  const [lines, setLines] = useState<TermLine[]>([
    {
      id: "1",
      type: "output",
      text: `CodeX Integrated ZSH Shell v3.8.0 [Node.js v22.14.0]`,
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines, isOpen]);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const inputLine: TermLine = {
      id: Date.now().toString(),
      type: "input",
      text: cmd,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setLines((prev) => [...prev, inputLine]);
    setTerminalInput("");

    try {
      const baseUrl = backendApiUrl ? backendApiUrl : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }
      const res = await apiFetch(`${baseUrl}/api/terminal/exec`, {
        method: "POST",
        headers,
        body: JSON.stringify({ command: cmd, project: projectName }),
      });
      const data = await res.json();

      if (data.output === "__CLEAR__") {
        setLines([]);
        return;
      }

      setLines((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "output",
          text: data.output,
        },
      ]);
    } catch {
      setLines((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "output",
          text: `[${cmd}] command finished.`,
        },
      ]);
    }
  };

  const handleClear = () => {
    setLines([]);
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 192, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
          className="border-t border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0b0b0b] flex flex-col font-sans select-none shrink-0 z-10 overflow-hidden"
        >
          {/* Header Bar */}
      <div className="h-9 px-3 bg-white dark:bg-[#171717] border-b border-gray-200 dark:border-[#2a2a2a] flex items-center justify-between text-xs text-gray-600 dark:text-[#ededed]">
        <div className="flex items-center gap-4 font-medium">
          <button
            onClick={() => setActiveTab("output")}
            className={`pb-0.5 transition-colors ${
              activeTab === "output"
                ? "text-gray-900 dark:text-zinc-100 border-b-2 border-gray-800 dark:border-zinc-200 font-semibold"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
            }`}
          >
            输出
          </button>
          <button
            onClick={() => setActiveTab("terminal")}
            className={`pb-0.5 transition-colors ${
              activeTab === "terminal"
                ? "text-gray-900 dark:text-zinc-100 border-b-2 border-gray-800 dark:border-zinc-200 font-semibold"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
            }`}
          >
            终端
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
          <button className="flex items-center gap-0.5 hover:bg-gray-200/60 dark:hover:bg-zinc-800 p-1 rounded">
            <Plus className="w-3.5 h-3.5" />
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-1 bg-gray-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono">
            <TerminalIcon className="w-3 h-3 text-gray-600 dark:text-zinc-300" />
            <span>zsh</span>
          </div>
          <button className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded" title="分屏">
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleClear} className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded" title="清空">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded" title="更多">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded" title="全屏/复原">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded" title="关闭终端">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="flex-1 bg-gray-50 dark:bg-[#0b0b0b] p-2.5 overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-800 dark:text-[#ededed]">
        {activeTab === "output" ? (
          <div className="text-gray-400 dark:text-zinc-500 italic">暂无后台构建或扩展日志输出。</div>
        ) : (
          <div className="space-y-1.5">
            {lines.map((line) => {
              if (line.type === "output") {
                return (
                  <pre key={line.id} className="whitespace-pre-wrap font-mono text-gray-600 dark:text-zinc-300">
                    {line.text}
                  </pre>
                );
              }
              return (
                <div key={line.id} className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="px-1.5 py-0.5 bg-rose-200 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 rounded font-semibold text-[10px]">
                    heruyi
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded font-semibold text-[10px]">
                    .../{projectName}
                  </span>
                  <span className="px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 rounded font-semibold text-[10px]">
                    {branchName}
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500 font-mono text-[10px]">$? ↑ 17:31</span>
                  <span className="font-bold text-gray-800 dark:text-zinc-200">&gt;</span>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">{line.text}</span>
                </div>
              );
            })}

            {/* Input Prompt Line */}
            <form onSubmit={handleCommandSubmit} className="flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="px-1.5 py-0.5 bg-rose-200 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 rounded font-semibold text-[10px] shrink-0">
                heruyi
              </span>
              <span className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded font-semibold text-[10px] shrink-0">
                .../{projectName}
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 rounded font-semibold text-[10px] shrink-0">
                {branchName}
              </span>
              <span className="text-gray-400 dark:text-zinc-500 font-mono text-[10px] shrink-0">$? ↑ 17:31</span>
              <span className="font-bold text-gray-800 dark:text-zinc-200 shrink-0">&gt;</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="输入 bash / zsh 命令 (例: ls, git status, pwd)..."
                className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500"
              />
            </form>
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
