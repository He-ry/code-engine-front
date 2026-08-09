import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSettings } from "../context/SettingsContext";
import { ChatMessage, ToolExecution, ThinkingProcess, TextSegment } from "../types";
import { CodeBlock } from "./CodeBlock";
import { ToolInvocationCard } from "./ToolInvocationCard";
import { FileChangeCard } from "./FileChangeCard";
import { ThinkingLoader } from "./ThinkingLoader";
import {
  Copy,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Terminal,
  Code2,
  Brain,
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ShieldX
} from "lucide-react";

interface ChatStreamProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSelectOption?: (questionId: string, optionValue: string, optionLabel: string) => void;
  pendingApprovals?: Record<string, {
    approvalId: string;
    toolName: string;
    arguments: any;
  }>;
  onApproval?: (approved: boolean, approvalId?: string) => void;
  onOpenFile?: (path: string, content: string) => void;
  onKeepFile?: (path: string) => void;
  onRevertFile?: (path: string, originalContent: string | null) => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  isGenerating,
  onSelectOption,
  pendingApprovals,
  onApproval,
  onOpenFile,
  onKeepFile,
  onRevertFile,
}) => {
  const { t } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Record<string, "up" | "down" | null>>({});
  const [collapsedThoughts, setCollapsedThoughts] = useState<Record<string, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [customInputTexts, setCustomInputTexts] = useState<Record<string, string>>({});
  const [submittedCards, setSubmittedCards] = useState<Record<string, Record<string, string>>>({
    "msg-6": {
      "cq-1": t("代码审查 — 检查代码质量、安全、性能问题", "Code Review — Check code quality, security, and performance"),
      "cq-2": "skipped"
    }
  });

  // Auto-scroll to bottom on message changes or streaming updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleLike = (id: string, type: "up" | "down") => {
    setLikedMessages((prev) => ({
      ...prev,
      [id]: prev[id] === type ? null : type,
    }));
  };

  const toggleThought = (msgId: string) => {
    setCollapsedThoughts((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleOptionClick = (questionId: string, optionValue: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionValue,
    }));
  };

  const handleCustomInputChange = (questionId: string, text: string) => {
    setCustomInputTexts((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleSubmitAnswers = (msgId: string, questions: NonNullable<ChatMessage["clarificationQuestions"]>) => {
    const answersRecord: Record<string, string> = {};
    const summaryList: string[] = [];

    questions.forEach((q) => {
      const selectedVal = selectedAnswers[q.id];
      const customTxt = customInputTexts[q.id];
      const foundOpt = q.options.find((o) => o.value === selectedVal);

      let finalAnswerLabel = "skipped";
      if (foundOpt) {
        if (foundOpt.isCustomInput && customTxt && customTxt.trim()) {
          finalAnswerLabel = customTxt.trim();
        } else {
          finalAnswerLabel = foundOpt.label;
        }
      }
      answersRecord[q.id] = finalAnswerLabel;
      summaryList.push(`${q.question}\n${t("答：", "Answer: ")}${finalAnswerLabel}`);
    });

    setSubmittedCards((prev) => ({
      ...prev,
      [msgId]: answersRecord,
    }));

    if (onSelectOption) {
      onSelectOption("answers_submit", "submitted", summaryList.join("\n\n"));
    }
  };

  const handleEditAnswers = (msgId: string) => {
    setSubmittedCards((prev) => {
      const copy = { ...prev };
      delete copy[msgId];
      return copy;
    });
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 space-y-7 max-w-3xl mx-auto w-full font-sans select-text">
      {messages.map((msg, msgIdx) => {
        const isUser = msg.sender === "user";
        const isLiked = likedMessages[msg.id];
        const isLastMessage = msgIdx === messages.length - 1;

        if (isUser) {
          return (
            <div key={msg.id} className="flex flex-col items-end w-full">
              {/* Context Pills tag if any */}
              {msg.contextPills && msg.contextPills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5 justify-end">
                  {msg.contextPills.map((pill) => (
                    <span
                      key={pill.id}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        pill.type === "skill"
                          ? "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700"
                          : "bg-gray-200/80 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border-transparent font-mono"
                      }`}
                    >
                      {pill.type === "skill" ? pill.name : `@${pill.name}`}
                    </span>
                  ))}
                </div>
              )}

              {/* User Bubble - Right aligned */}
              <div className="inline-block px-3.5 py-1.5 bg-[#e8e8e8] dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-[13px] leading-relaxed max-w-[85%] break-words">
                {msg.text}
              </div>
            </div>
          );
        }

        // Assistant Message - Left aligned
        const thoughtsList: ThinkingProcess[] = msg.thinkingProcesses && msg.thinkingProcesses.length > 0
          ? msg.thinkingProcesses
          : msg.thinkingProcess
          ? [msg.thinkingProcess]
          : [];

        // ── Build ordered stream items from text segments, thoughts, and tools ──
        type StreamItem =
          | { type: "text"; text: string; key: string; time: number }
          | { type: "thought"; tp: ThinkingProcess; key: string; time: number }
          | { type: "tool"; tool: ToolExecution; key: string; time: number };

        const streamItems: StreamItem[] = [];

        // Text segments (from handleAgentEvent splitting at tool boundaries)
        const segments = msg.textSegments || [];
        if (segments.length > 0) {
          segments.forEach((seg, i) => {
            if (seg.text.trim()) {
              streamItems.push({
                type: "text", text: seg.text,
                key: `${msg.id}-text-${i}`, time: seg.createdAt || 0,
              });
            }
          });
        } else if (msg.text) {
          // Fallback: no segments yet (e.g. legacy messages or pure text turn)
          streamItems.push({
            type: "text", text: msg.text,
            key: `${msg.id}-text-0`, time: 0,
          });
        }

        // Thinking blocks
        thoughtsList.forEach((tp, tpIdx) => {
          streamItems.push({
            type: "thought", tp,
            key: tp.id || `${msg.id}-thought-${tpIdx}`,
            time: tp.createdAt || 0,
          });
        });

        // Tool cards — each rendered individually (no longer grouped)
        (msg.toolExecutions || []).forEach((tool) => {
          streamItems.push({
            type: "tool", tool,
            key: tool.id, time: tool.createdAt || 0,
          });
        });

        streamItems.sort((a, b) => a.time - b.time);

        // ── Markdown renderer (reused for text segments) ──
        const renderMarkdown = (text: string) => (
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
                  code(props: any) {
                    const { node, className, children, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    const isBlock = Boolean(match) || codeString.includes("\n");

                    if (isBlock) {
                      return (
                        <CodeBlock
                          code={codeString}
                          language={match ? match[1] : ""}
                        />
                      );
                    }

                    return (
                      <code
                        className="px-1.5 py-0.5 bg-gray-200/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded text-xs font-mono mx-0.5"
                        {...rest}
                      >
                        {children}
                      </code>
                    );
                  },
                  h1({ children }) {
                    return <h1 className="text-base font-bold text-gray-900 dark:text-zinc-100 mt-3 mb-1.5">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-[14px] font-bold text-gray-900 dark:text-zinc-100 mt-2.5 mb-1">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-[13px] font-bold text-gray-900 dark:text-zinc-100 mt-2 mb-1">{children}</h3>;
                  },
                  h4({ children }) {
                    return <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 mt-1.5 mb-0.5">{children}</h4>;
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 my-1.5 space-y-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 my-1.5 space-y-1">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="my-0.5">{children}</li>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="pl-3 border-l-2 border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 italic my-2">
                        {children}
                      </blockquote>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        {children}
                      </a>
                    );
                  },
                  hr() {
                    return <hr className="my-3 border-gray-200 dark:border-zinc-800" />;
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto w-full my-4 border border-gray-200/80 dark:border-zinc-800/80 rounded-lg bg-[#f0f0f0] dark:bg-[#18181c] shadow-xs">
                        <table className="min-w-full border-collapse font-sans text-xs">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return (
                      <thead className="bg-[#e4e4e7] dark:bg-zinc-900/50 text-left text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                        {children}
                      </thead>
                    );
                  },
                  tbody({ children }) {
                    return (
                      <tbody className="bg-white/40 dark:bg-zinc-950/20">
                        {children}
                      </tbody>
                    );
                  },
                  tr({ children }) {
                    return (
                      <tr className="hover:bg-gray-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                        {children}
                      </tr>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-zinc-400 text-[11px] tracking-wider uppercase border-b border-r border-gray-200 dark:border-zinc-800 last:border-r-0">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="px-3 py-2 text-[12px] text-gray-600 dark:text-zinc-400 font-normal leading-relaxed align-top border-b border-r border-gray-200 dark:border-zinc-800 last:border-r-0">
                        {children}
                      </td>
                    );
                  },
                }}
          >
            {text}
          </Markdown>
        );

        // ── Render ──
        return (
          <div key={msg.id} className="group flex flex-col items-start w-full space-y-3">
            {streamItems.map((item) => {
              if (item.type === "thought") {
                // Default: expanded during streaming, collapsed when done
                const isThoughtCollapsed =
                  collapsedThoughts[item.key] ?? !msg.isStreaming;
                return (
                  <div key={item.key} className="w-full text-xs transition-all font-sans">
                    <button
                      onClick={() => toggleThought(item.key)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer select-none py-0.5 transition-colors font-sans"
                    >
                      {isThoughtCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                      )}
                      <span className="font-sans text-xs tracking-tight">
                        {t("思考", "Thinking")}
                      </span>
                      {item.tp.durationSec && (
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono opacity-80">
                          ({item.tp.durationSec}s)
                        </span>
                      )}
                    </button>
                    {!isThoughtCollapsed && (
                      <div className="mt-1.5 pl-3 border-l border-gray-200 dark:border-zinc-800/80 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-sans space-y-1 py-0.5 whitespace-pre-wrap">
                        {item.tp.thoughtText}
                      </div>
                    )}
                  </div>
                );
              }
              if (item.type === "tool") {
                const isFileTool =
                  item.tool.name === "write_file" || item.tool.name === "apply_patch";
                // Always use FileChangeCard for file-editing tools — it handles
                // all states internally (pending / running / completed / error).
                if (isFileTool) {
                  return (
                    <div key={item.key} className="w-full">
                      <FileChangeCard
                        tool={item.tool}
                        isStreaming={msg.isStreaming || false}
                        onApprove={(toolId) => onApproval?.(true, toolId)}
                        onReject={(toolId) => onApproval?.(false, toolId)}
                        onOpenFile={onOpenFile}
                        onKeepFile={onKeepFile}
                        onRevertFile={onRevertFile}
                      />
                    </div>
                  );
                }
                return (
                  <div key={item.key} className="w-full">
                    <ToolInvocationCard
                      tool={item.tool}
                      onExecute={(toolId) => onApproval?.(true, toolId)}
                      onReject={(toolId) => onApproval?.(false, toolId)}
                    />
                  </div>
                );
              }
              if (item.type === "text") {
                return (
                  <div key={item.key} className="text-[13px] leading-relaxed text-gray-800 dark:text-zinc-200 w-full font-sans space-y-1">
                    {renderMarkdown(item.text)}
                  </div>
                );
              }
              return null;
            })}

            {/* Fallback Tool Logs if no toolExecutions */}
            {(!msg.toolExecutions || msg.toolExecutions.length === 0) &&
              msg.toolLogs &&
              msg.toolLogs.length > 0 && (
                <div className="w-full">
                  {msg.toolLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 py-0.5 text-xs font-mono"
                    >
                      <Terminal className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}

            {/* 3.5 Plan Card (update_plan tool output) */}
            {msg.planSteps && msg.planSteps.length > 0 && (
              <div className="w-full mt-2 rounded-xl border border-gray-200/90 dark:border-[#2a2a2a] bg-[#f0f0f0] dark:bg-[#171717] p-4 text-xs font-sans space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{t("任务计划", "Task Plan")}</span>
                </div>
                {msg.planExplanation && (
                  <div className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                    {msg.planExplanation}
                  </div>
                )}
                <div className="space-y-1">
                  {msg.planSteps.map((step, i) => {
                    const statusIcon =
                      step.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : step.status === "in_progress" ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                      ) : step.status === "failed" ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-zinc-600 shrink-0" />
                      );
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 py-1 px-2 rounded ${
                          step.status === "in_progress"
                            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200"
                            : "text-gray-600 dark:text-zinc-400"
                        }`}
                      >
                        {statusIcon}
                        <span className={step.status === "completed" ? "line-through opacity-70" : ""}>
                          {step.step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. AGENT WORKING MODE: Clarification Questions (支持 Questions 交互面板与 Answers 回答展示卡片) */}
            {msg.clarificationQuestions && msg.clarificationQuestions.length > 0 && (() => {
              const submittedAnswersForMsg = submittedCards[msg.id];

              if (submittedAnswersForMsg) {
                // 呈现 Answers 用户已回答视图（完全匹配用户截屏 2）
                return (
                  <div className="w-full mt-2 rounded-xl border border-gray-200/90 dark:border-[#2a2a2a] bg-[#f0f0f0] dark:bg-[#171717] p-4 sm:p-5 text-xs sm:text-sm font-sans space-y-3.5 shadow-2xs">
                    {/* Header Bar */}
                    <div className="flex items-center justify-between pb-1 text-gray-700 dark:text-zinc-300">
                      <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                        <HelpCircle className="w-4 h-4 text-gray-500 dark:text-zinc-400 shrink-0" />
                        <span className="font-sans font-medium">Answers</span>
                      </div>
                      <button
                        onClick={() => handleEditAnswers(msg.id)}
                        className="text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                      >
                        {t("编辑选项", "Edit Options")}
                      </button>
                    </div>

                    {/* Answers List */}
                    <div className="space-y-3 pt-0.5">
                      {msg.clarificationQuestions.map((cq) => {
                        const ansText = submittedAnswersForMsg[cq.id] || "skipped";
                        return (
                          <div key={cq.id} className="space-y-1">
                            <div className="text-gray-900 dark:text-zinc-100 text-xs sm:text-sm leading-relaxed">
                              {cq.question}
                            </div>
                            <div className="text-gray-500 dark:text-zinc-400 text-xs leading-relaxed font-sans">
                              {ansText}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // 未提交状态：呈现可交互的 Questions 卡片
              return (
                <div className="w-full mt-2 rounded-xl border border-gray-200/90 dark:border-[#2a2a2a] bg-[#f0f0f0] dark:bg-[#171717] p-4 sm:p-5 text-xs sm:text-sm font-sans space-y-4 shadow-2xs">
                  {/* Header Bar */}
                  <div className="flex items-center justify-between pb-1 border-b border-gray-200/60 dark:border-zinc-800/60 text-gray-700 dark:text-zinc-300">
                    <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                      <HelpCircle className="w-4 h-4 text-gray-500 dark:text-zinc-400 shrink-0" />
                      <span className="font-sans">Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                      <button className="hover:text-gray-700 dark:hover:text-zinc-200 cursor-pointer">
                        <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                      </button>
                      <span>1 of {msg.clarificationQuestions.length}</span>
                      <button className="hover:text-gray-700 dark:hover:text-zinc-200 cursor-pointer">
                        <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                      </button>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-5">
                    {msg.clarificationQuestions.map((cq) => {
                      const currentSelected = selectedAnswers[cq.id];
                      return (
                        <div key={cq.id} className="space-y-2.5">
                          <div className="font-medium text-gray-900 dark:text-zinc-100 text-xs sm:text-sm">
                            {cq.question}
                          </div>

                          <div className="space-y-1.5 pl-1">
                            {cq.options.map((opt, optIdx) => {
                              const isSelected = currentSelected === opt.value;
                              const letterSymbol =
                                opt.letter || String.fromCharCode(65 + optIdx);

                              return (
                                <div key={opt.value} className="space-y-1">
                                  <button
                                    onClick={() =>
                                      handleOptionClick(cq.id, opt.value)
                                    }
                                    className={`w-full text-left px-2.5 py-1.5 rounded-md border text-xs transition-all cursor-pointer flex items-center gap-2.5 ${
                                      isSelected
                                        ? "bg-white dark:bg-zinc-900 border-gray-600 dark:border-zinc-400 text-gray-900 dark:text-zinc-100 shadow-2xs font-medium"
                                        : "bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-zinc-900/50 text-gray-800 dark:text-zinc-200"
                                    }`}
                                  >
                                    <span
                                      className={`w-4 h-4 rounded-full border text-[10px] font-mono flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? "border-gray-700 bg-gray-700 dark:border-zinc-300 dark:bg-zinc-300 text-white dark:text-zinc-900"
                                          : "border-gray-400 dark:border-zinc-600 text-gray-600 dark:text-zinc-400"
                                      }`}
                                    >
                                      {letterSymbol}
                                    </span>
                                    <span className="truncate">{opt.label}</span>
                                  </button>

                                  {opt.isCustomInput && isSelected && (
                                    <div className="pl-7 pr-2 py-1">
                                      <input
                                        type="text"
                                        value={customInputTexts[cq.id] || ""}
                                        onChange={(e) =>
                                          handleCustomInputChange(cq.id, e.target.value)
                                        }
                                        placeholder={t("请输入自定义要求...", "Type custom requirements...")}
                                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-gray-600 dark:focus:border-zinc-400"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer Continue Action Button */}
                  <div className="flex justify-end pt-2 border-t border-gray-200/40 dark:border-zinc-800/40">
                    <button
                      onClick={() =>
                        handleSubmitAnswers(msg.id, msg.clarificationQuestions!)
                      }
                      className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-zinc-200 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
                    >
                      {t("继续", "Continue")}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Code Snippets if present */}
            {msg.codeSnippets && msg.codeSnippets.length > 0 && (
              <div className="mt-2 w-full space-y-3">
                {msg.codeSnippets.map((snippet, sIdx) => (
                  <CodeBlock
                    key={sIdx}
                    code={snippet.code}
                    filename={snippet.filename}
                    language={snippet.language}
                  />
                ))}
              </div>
            )}

            {/* Action Icon Bar below AI response */}
            {!(isLastMessage && (isGenerating || Object.keys(pendingApprovals || {}).length > 0)) && (
              <div
                className={`flex items-center gap-2.5 pt-1 text-gray-400 dark:text-zinc-500 text-xs select-none transition-opacity duration-200 ${
                  isLiked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <button
                  onClick={() => copyToClipboard(msg.text, msg.id)}
                  className="p-1 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer rounded"
                  title={t("复制内容", "Copy Content")}
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => toggleLike(msg.id, "up")}
                  className={`p-1 transition-colors cursor-pointer rounded ${
                    isLiked === "up"
                      ? "text-blue-600 dark:text-blue-400"
                      : "hover:text-gray-700 dark:hover:text-zinc-200"
                  }`}
                  title={t("赞", "Like")}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => toggleLike(msg.id, "down")}
                  className={`p-1 transition-colors cursor-pointer rounded ${
                    isLiked === "down"
                      ? "text-rose-600 dark:text-rose-400"
                      : "hover:text-gray-700 dark:hover:text-zinc-200"
                  }`}
                  title={t("踩", "Dislike")}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 pl-0.5 text-gray-400 dark:text-zinc-500 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono">{msg.timestamp || "12:32"}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 5. Active Generating / Streaming Agent Status */}
      {(() => {
        const lastMsg = messages[messages.length - 1];
        const hasActiveOutput =
          lastMsg &&
          lastMsg.sender === "ai" &&
          (Boolean(lastMsg.text && lastMsg.text.trim().length > 0) ||
            Boolean(lastMsg.toolExecutions && lastMsg.toolExecutions.length > 0) ||
            Boolean(
              (lastMsg.thinkingProcesses && lastMsg.thinkingProcesses.length > 0) ||
              (lastMsg.thinkingProcess &&
                lastMsg.thinkingProcess.thoughtText &&
                lastMsg.thinkingProcess.thoughtText.trim().length > 0)
            ));

        if (isGenerating && Object.keys(pendingApprovals || {}).length === 0 && !hasActiveOutput) {
          return <ThinkingLoader t={t} />;
        }
        return null;
      })()}
    </div>
  );
};


