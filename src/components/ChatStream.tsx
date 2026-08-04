import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSettings } from "../context/SettingsContext";
import { ChatMessage } from "../types";
import { CodeBlock } from "./CodeBlock";
import { ToolInvocationCard } from "./ToolInvocationCard";
import { ToolExecutionGroup } from "./ToolExecutionGroup";
import {
  Copy,
  Check,
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
  pendingApproval?: {
    approvalId: string;
    toolName: string;
    arguments: any;
  } | null;
  onApproval?: (approved: boolean) => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  isGenerating,
  onSelectOption,
  pendingApproval,
  onApproval,
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
        const isThoughtCollapsed = collapsedThoughts[msg.id] ?? (msg.thinkingProcess?.isCollapsed ?? false);
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
        return (
          <div key={msg.id} className="group flex flex-col items-start w-full space-y-3">
            {/* 1. AGENT WORKING MODE: Thinking Process (思考过程 - 完全匹配图2极简风) */}
            {msg.thinkingProcess && (
              <div className="w-full text-xs transition-all font-sans">
                {/* Thinking Toggle Header */}
                <button
                  onClick={() => toggleThought(msg.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer select-none py-0.5 transition-colors font-sans"
                >
                  {isThoughtCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                  )}
                  <span className="font-sans text-xs tracking-tight">Thinking</span>
                  {msg.thinkingProcess.durationSec && (
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono opacity-80">
                      ({msg.thinkingProcess.durationSec}s)
                    </span>
                  )}
                </button>

                {/* Thinking Body */}
                {!isThoughtCollapsed && (
                  <div className="mt-1.5 pl-3 border-l border-gray-200 dark:border-zinc-800/80 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-sans space-y-1 py-0.5 whitespace-pre-wrap">
                    {msg.thinkingProcess.thoughtText}
                  </div>
                )}
              </div>
            )}

            {/* 2. AGENT WORKING MODE: Tool Executions (仿照 IDE Agent 优雅折叠日志) */}
            {((msg.toolExecutions && msg.toolExecutions.length > 0) || (msg.toolLogs && msg.toolLogs.length > 0)) && (
              <div className="w-full">
                {msg.toolExecutions && msg.toolExecutions.length > 0 ? (
                  <ToolExecutionGroup tools={msg.toolExecutions} />
                ) : (
                  msg.toolLogs?.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 py-0.5 text-xs font-mono"
                    >
                      <Terminal className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Main AI Text Content */}
            <div className="text-[13px] leading-relaxed text-gray-800 dark:text-zinc-200 w-full font-sans space-y-1">
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
                {msg.text || ""}
              </Markdown>
            </div>

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
            {!(isLastMessage && (isGenerating || pendingApproval)) && (
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

      {/* 4.5. Tool Approval Cohesive Bar — matching the exact horizontal bar layout from the screenshot */}
      {(() => {
        if (!pendingApproval) return null;
        const tool = pendingApproval.toolName || "";
        const args = pendingApproval.arguments || {};

        let title = t("工具执行待审核", "Tool action pending approval");
        let badgeText = "";
        let badgeColor = "text-emerald-500 dark:text-emerald-400";
        let fileName = "";
        let dirPath = "";
        let cmdLine = "";
        let isFileAction = false;
        let isCommandAction = false;

        if (tool.includes("file") || tool.includes("write")) {
          isFileAction = true;
          const filePath = args.TargetFile || args.AbsolutePath || args.Path || "";
          if (filePath) {
            const parts = filePath.split("/");
            fileName = parts.pop() || "";
            dirPath = parts.join("/");
          }

          let lines = 0;
          if (args.ReplacementContent) {
            lines = args.ReplacementContent.split("\n").length;
          } else if (args.Content) {
            lines = args.Content.split("\n").length;
          } else if (args.ReplacementChunks && Array.isArray(args.ReplacementChunks)) {
            lines = args.ReplacementChunks.reduce(
              (acc: number, chunk: any) => acc + (chunk.ReplacementContent?.split("\n").length || 0),
              0
            );
          }

          if (lines > 0) {
            badgeText = `+${lines}`;
          }

          if (tool.includes("create") || tool.includes("write")) {
            title = t("新建 1 个文件", "Create 1 file");
          } else if (tool.includes("delete")) {
            title = t("删除 1 个文件", "Delete 1 file");
            badgeColor = "text-rose-500 dark:text-rose-400";
            if (lines > 0) badgeText = `-${lines}`;
          } else {
            title = t("已编辑 1 个文件", "Edited 1 file");
          }
        } else if (tool.includes("command") || tool.includes("run")) {
          isCommandAction = true;
          cmdLine = args.CommandLine || "";
          dirPath = args.Cwd || ".";
          title = t("执行终端命令", "Execute terminal command");
          badgeText = "exec";
          badgeColor = "text-blue-500 dark:text-blue-400";
        }

        return (
          <div className="w-full !mt-2 rounded-xl border border-gray-200 dark:border-zinc-850 bg-[#f0f0f0] dark:bg-zinc-900/30 overflow-hidden shadow-2xs font-sans text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Top Row: Title, Badge, Action Buttons */}
            <div className="px-4 py-2.5 bg-[#e4e4e7] dark:bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 select-none">
                <span className="font-semibold text-gray-800 dark:text-zinc-200 text-[13px]">
                  {title}
                </span>
                {badgeText && (
                  <span className={`font-mono text-[12px] font-bold ${badgeColor} ml-0.5`}>
                    {badgeText}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onApproval?.(false)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors cursor-pointer font-medium"
                >
                  {t("撤销 ↶", "Undo ↶")}
                </button>
                <button
                  onClick={() => onApproval?.(true)}
                  className="bg-[#7a8da5] hover:bg-[#687b93] text-white rounded-[4px] px-3.5 py-1 text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                >
                  {t("审核", "Approve")}
                </button>
              </div>
            </div>

            {/* Bottom Row: Detailed Context (File or Command detail) */}
            {(isFileAction || isCommandAction) && (
              <div className="px-4 py-3 bg-[#e4e4e7]/50 dark:bg-zinc-950/20 border-t border-gray-200/50 dark:border-zinc-800/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 overflow-hidden mr-3">
                  {isFileAction ? (
                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 select-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 select-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {isFileAction ? (
                    <div className="flex items-baseline gap-1.5 overflow-hidden">
                      <span className="font-semibold text-gray-700 dark:text-zinc-300 font-mono truncate max-w-[200px] sm:max-w-xs">
                        {fileName}
                      </span>
                      {dirPath && (
                        <span className="text-gray-400 dark:text-zinc-500 font-mono text-[10.5px] truncate max-w-[250px] sm:max-w-md">
                          {dirPath}/{fileName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 overflow-hidden">
                      <span className="font-semibold text-gray-700 dark:text-zinc-300 font-mono truncate max-w-[250px] sm:max-w-md">
                        {cmdLine}
                      </span>
                      {dirPath && (
                        <span className="text-gray-400 dark:text-zinc-500 font-mono text-[10.5px] truncate max-w-[120px]">
                          Cwd: {dirPath}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {badgeText && (
                  <span className={`font-mono text-[11px] font-semibold ${badgeColor} select-none shrink-0`}>
                    {badgeText}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 5. Active Generating / Streaming Agent Status */}
      {isGenerating && !pendingApproval && (
        <div className="flex items-center gap-2.5 pl-3.5 py-2 text-xs text-gray-500 dark:text-zinc-400 font-sans animate-in fade-in duration-200 select-none">
          <div className="flex gap-1 items-center py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="font-medium tracking-wide">{t("AI 思考中...", "AI is thinking...")}</span>
        </div>
      )}
    </div>
  );
};


