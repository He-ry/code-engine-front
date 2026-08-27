import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSettings } from "../context/SettingsContext";
import { ChatMessage, ClarificationQuestion } from "../types";
import { CodeBlock } from "./CodeBlock";
import { ToolGroupCard } from "./ToolGroupCard";
import { ThinkingLoader } from "./ThinkingLoader";
import { getBlocks, buildRenderGroups, reasoningDurationSec } from "../lib/blocks";
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
  ShieldX,
  FileText,
  Eye,
} from "lucide-react";

/** Sentinel selection value marking the per-question "Other" free-text option. */
const OTHER_SENTINEL = "__other__";

interface ChatStreamProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSubmitAnswers?: (inputId: string, answers: Record<string, string>) => void;
  pendingApprovals?: Record<string, {
    approvalId: string;
    toolName: string;
    arguments: any;
  }>;
  onApproval?: (approved: boolean, approvalId?: string) => void;
  onOpenFile?: (path: string, content: string, pendingChange?: { toolCallId: string; originalContent: string | null }) => void;
  onKeepFile?: (path: string) => void;
  onRevertFile?: (path: string, originalContent: string | null) => void;
  /** Open the attachment viewer (text extraction preview) for a workspace file. */
  onOpenAttachment?: (attachment: { filename: string; workspacePath: string; contentType?: string }, threadId?: string) => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  isGenerating,
  onSubmitAnswers,
  pendingApprovals,
  onApproval,
  onOpenFile,
  onKeepFile,
  onRevertFile,
  onOpenAttachment,
}) => {
  const { t } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Record<string, "up" | "down" | null>>({});
  const [collapsedThoughts, setCollapsedThoughts] = useState<Record<string, boolean>>({});
  const [customInputTexts, setCustomInputTexts] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [submittedCards, setSubmittedCards] = useState<Record<string, Record<string, string>>>({
    // Legacy mock ask card (msg-6) — deriveLegacyBlocks gives it the id
    // `${msgId}-ask`.
    "msg-6-ask": {
      "cq-1": t("代码审查 — 检查代码质量、安全、性能问题", "Code Review — Check code quality, security, and performance"),
      "cq-2": "skipped"
    }
  });

  // Auto-scroll to bottom only when the user is already near the bottom.
  // During streaming this lets the user scroll up to read without being
  // yanked back — they stay in control.
  const userScrolledUpRef = useRef(false);
  const prevScrollTopRef = useRef(0);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Detect whether the user has manually scrolled up
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distFromBottom > 48; // 48px ≈ 3 lines tolerance
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // If the user has scrolled up, don't auto-scroll unless new content
    // was appended (scrollHeight grew) and they were at the bottom before.
    const scrollHeightGrew = el.scrollHeight > prevScrollHeightRef.current;
    const wasAtBottom = !userScrolledUpRef.current;

    // Track scrollHeight so we know when new content arrives
    prevScrollHeightRef.current = el.scrollHeight;

    if (wasAtBottom || (scrollHeightGrew && !userScrolledUpRef.current)) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isGenerating]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers or permission denied
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
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

  const handleCustomInputChange = (questionId: string, text: string) => {
    setCustomInputTexts((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleSelectOption = (questionId: string, label: string) => {
    setSelectedOptions((prev) => ({ ...prev, [questionId]: label }));
  };

  const handleSelectOther = (questionId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [questionId]: OTHER_SENTINEL }));
  };

  // Resolve the answer for one question: the picked option's label, or the
  // free-text typed under "Other". Falls back to the first option when the
  // user picked nothing (so a selection always exists).
  const resolveAnswer = (q: ClarificationQuestion): string => {
    const picked = selectedOptions[q.id];
    if (picked === OTHER_SENTINEL) {
      return (customInputTexts[q.id] || "").trim();
    }
    if (picked) return picked;
    return q.options.length > 0 ? q.options[0].label : (customInputTexts[q.id] || "").trim();
  };

  const handleSubmitAnswers = (askId: string, questions: ClarificationQuestion[]) => {
    const answersRecord: Record<string, string> = {};
    questions.forEach((q) => {
      answersRecord[q.id] = resolveAnswer(q);
    });
    setSubmittedCards((prev) => ({ ...prev, [askId]: answersRecord }));
    onSubmitAnswers?.(askId, answersRecord);
  };

  const handleSkipAskUser = (askId: string, questions: ClarificationQuestion[]) => {
    const answersRecord: Record<string, string> = {};
    questions.forEach((q) => {
      answersRecord[q.id] = "skipped";
    });
    setSubmittedCards((prev) => ({ ...prev, [askId]: answersRecord }));
    onSubmitAnswers?.(askId, answersRecord);
  };

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 py-8 space-y-7 max-w-3xl mx-auto w-full font-sans select-text">
      {/* Global shimmer keyframes — used by ThinkingLoader, thought toggle, file-stream */}
      <style>{`
        @keyframes thinking-shimmer {
          0% { background-position: 100% 0%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>
      {messages.map((msg, msgIdx) => {
        const isUser = msg.sender === "user";
        const isLiked = likedMessages[msg.id];
        const isLastMessage = msgIdx === messages.length - 1;

        if (isUser) {
          return (
            <div key={msg.id} className="flex flex-col items-end w-full group">
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

              {/* File attachments — clickable cards above the bubble.
                  Uploaded into the thread workspace at send time. */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end mb-1.5">
                  {msg.attachments.map((att, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onOpenAttachment?.(att, msg.threadId)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-gray-400 dark:hover:border-zinc-500 transition-colors cursor-pointer text-left group shadow-2xs"
                      title={t("点击预览", "Click to preview")}
                    >
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-gray-800 dark:text-zinc-200 truncate max-w-[180px]">
                          {att.filename}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                          {att.size >= 1048576
                            ? `${(att.size / 1048576).toFixed(1)} MB`
                            : `${Math.max(1, Math.round(att.size / 1024))} KB`}
                        </span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-300 shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* Attached images — above the text bubble, right-aligned
                  (live sends carry data URLs; history reloads carry
                  RustFS/public URLs from the backend mapping) */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-end mb-1.5 max-w-full">
                  {msg.images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-28 max-w-[240px] rounded-lg border border-gray-200 dark:border-zinc-700 object-cover shadow-2xs"
                    />
                  ))}
                </div>
              )}

              {/* User Bubble - Right aligned */}
              {/* max-w-full keeps the wrap threshold in sync with the composer
                  (also max-w-3xl) so a line that fit on one line while typing
                  stays on one line here; whitespace-pre-wrap preserves the
                  sender's own line breaks. */}
              <div className="px-3.5 py-1.5 bg-[#e8e8e8] dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-[13px] leading-relaxed max-w-full break-words whitespace-pre-wrap">
                {msg.text}
              </div>

              {/* Copy button — below the bubble, appears on hover */}
              <button
                onClick={() => copyToClipboard(msg.text, msg.id)}
                className="mt-1 p-1 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded shrink-0"
                title={t("复制", "Copy")}
              >
                {copiedId === msg.id ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          );
        }

        // Assistant Message - Left aligned
        // ── Ordered blocks → render items (consecutive tools grouped) ──
        // `blocks` is append-only in arrival order (live) or synthetic-clock
        // order (history): display order is exact, no timestamp sorting.
        // Legacy messages without blocks derive them from the old arrays.
        const blocks = getBlocks(msg);
        const renderItems = buildRenderGroups(blocks);
        const lastItemIdx = renderItems.length - 1;

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
            {renderItems.map((item, idx) => {
              if (item.kind === "reasoning") {
                // Default: expanded while it is the LAST block of the stream
                // (still actively thinking), collapsed once anything follows.
                // A user toggle (collapsedThoughts) always wins.
                const isThoughtActive = msg.isStreaming && idx === lastItemIdx;
                const isThoughtCollapsed =
                  collapsedThoughts[item.key] ?? !isThoughtActive;
                const durationLabel = reasoningDurationSec(item.block);
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
                      <span
                        className="font-sans text-xs tracking-tight relative"
                        style={isThoughtActive ? {
                          backgroundImage:
                            "linear-gradient(90deg, #9ca3af 0%, #9ca3af 40%, #1f2937 50%, #6b7280 60%, #9ca3af 100%)",
                          backgroundSize: "200% 100%",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          color: "transparent",
                          animation: "thinking-shimmer 2s ease-in-out infinite",
                          animationDirection: "alternate",
                        } : undefined}
                      >
                        {t("思考", "Thinking")}
                        {isThoughtActive && <span className="animate-pulse ml-0.5" style={{ color: "#6b7280" }}>...</span>}
                      </span>
                      {durationLabel != null && (
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono opacity-80">
                          ({durationLabel}s)
                        </span>
                      )}
                    </button>
                    {!isThoughtCollapsed && (
                      <div
                        className="mt-1.5 pl-3 border-l border-gray-200 dark:border-zinc-800/80 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-sans space-y-1 py-0.5 whitespace-pre-wrap max-h-60 overflow-y-auto"
                        ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                      >
                        {item.block.text}
                      </div>
                    )}
                  </div>
                );
              }
              if (item.kind === "toolGroup") {
                return (
                  <div key={item.key} className="w-full">
                    <ToolGroupCard
                      tools={item.tools}
                      isStreaming={msg.isStreaming || false}
                      onApproval={onApproval}
                      onOpenFile={onOpenFile}
                      onKeepFile={onKeepFile}
                      onRevertFile={onRevertFile}
                    />
                  </div>
                );
              }
              if (item.kind === "ask") {
                // AskUser card rendered INSIDE the ordered block sequence:
                // the agent's post-answer output appends blocks below this
                // point, so nothing can ever stream "above" the card.
                const block = item.block;
                const answers = block.answers ?? submittedCards[block.id];
                if (answers) {
                  // Answered state — read-only summary of the user's reply.
                  return (
                    <div key={item.key} className="w-full mt-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-[#F4F4F4] dark:bg-zinc-900 text-[11px] font-sans shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 px-3 sm:px-4 pt-2 pb-2 text-gray-700 dark:text-zinc-300 font-medium border-b border-gray-100 dark:border-zinc-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                        <span>{t("已回答", "Answered")}</span>
                      </div>
                      <div className="px-3 sm:px-4 py-3 space-y-3">
                        {block.questions.map((cq) => {
                          const ansText = answers[cq.id] || "skipped";
                          return (
                            <div key={cq.id} className="space-y-1">
                              {cq.header ? (
                                <div className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-[10px] font-semibold uppercase tracking-wide">
                                  {cq.header}
                                </div>
                              ) : null}
                              <div className="text-gray-900 dark:text-zinc-100 leading-relaxed font-medium">{cq.question}</div>
                              <div className="flex items-start gap-1.5 text-gray-600 dark:text-zinc-400 leading-relaxed">
                                <span className="text-gray-400 dark:text-zinc-500 shrink-0">→</span>
                                <span className={ansText === "skipped" ? "italic text-gray-400 dark:text-zinc-500" : ""}>
                                  {ansText === "skipped" ? t("已跳过", "Skipped") : ansText}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                if (block.expired) {
                  // Backend timed out waiting (300s) and resumed the turn.
                  return (
                    <div key={item.key} className="w-full mt-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-[#F4F4F4] dark:bg-zinc-900 text-[11px] font-sans shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 px-3 sm:px-4 pt-2 pb-2 text-gray-500 dark:text-zinc-400 font-medium border-b border-gray-100 dark:border-zinc-800/60">
                        <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                        <span>{t("等待超时，已跳过", "Timed out — skipped")}</span>
                      </div>
                      <div className="px-3 sm:px-4 py-3 space-y-3">
                        {block.questions.map((cq) => (
                          <div key={cq.id} className="space-y-1">
                            {cq.header ? (
                              <div className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-[10px] font-semibold uppercase tracking-wide">
                                {cq.header}
                              </div>
                            ) : null}
                            <div className="text-gray-900 dark:text-zinc-100 leading-relaxed font-medium">{cq.question}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                // Unanswered state — clean input card.
                return (
                  <div key={item.key} className="w-full mt-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-[#F4F4F4] dark:bg-zinc-900 text-[11px] font-sans shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-3 sm:px-4 pt-2 pb-2 text-gray-700 dark:text-zinc-300 font-medium border-b border-gray-100 dark:border-zinc-800/60">
                      <HelpCircle className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>{t("需要你的回答", "Waiting for your input")}</span>
                    </div>

                    <div className="ask-scroll max-h-56 overflow-y-auto px-3 sm:px-4 py-3 space-y-4">
                      {block.questions.map((cq, qi) => {
                        const selected =
                          selectedOptions[cq.id] ??
                          (cq.options.length > 0 ? cq.options[0].label : OTHER_SENTINEL);
                        const isOther = selected === OTHER_SENTINEL;
                        return (
                          <div key={cq.id} className="space-y-2">
                            {/* Header chip */}
                            {cq.header ? (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-[10px] font-semibold uppercase tracking-wide">
                                {cq.header}
                              </div>
                            ) : null}

                            {/* Question */}
                            <div className="text-gray-900 dark:text-zinc-100 leading-relaxed font-medium">
                              {cq.question}
                            </div>

                            {/* Options */}
                            <div className="space-y-0.5">
                              {cq.options.map((opt) => {
                                const isSelected = !isOther && selected === opt.label;
                                const recommended = opt.label.endsWith("(Recommended)");
                                const baseLabel = recommended
                                  ? opt.label.slice(0, opt.label.lastIndexOf("(Recommended)")).trim()
                                  : opt.label;
                                return (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => handleSelectOption(cq.id, opt.label)}
                                    className="w-full flex items-start gap-2 px-1.5 py-1 text-left cursor-pointer group rounded-md transition-colors hover:bg-gray-100/60 dark:hover:bg-zinc-800/50"
                                  >
                                    <span
                                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected
                                          ? "border-gray-900 dark:border-zinc-300"
                                          : "border-gray-300 dark:border-zinc-600 group-hover:border-gray-400 dark:group-hover:border-zinc-400"
                                      }`}
                                    >
                                      {isSelected && (
                                        <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-zinc-100" />
                                      )}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                      <span className={`font-medium ${isSelected ? "text-gray-900 dark:text-zinc-100" : "text-gray-700 dark:text-zinc-300"}`}>
                                        {baseLabel}
                                        {recommended && (
                                          <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-[10px] font-semibold align-middle">
                                            {t("推荐", "Recommended")}
                                          </span>
                                        )}
                                      </span>
                                      {opt.description ? (
                                        <span className="block mt-0.5 text-[10px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                                          {opt.description}
                                        </span>
                                      ) : null}
                                    </span>
                                  </button>
                                );
                              })}

                              {/* Other — free-text fallback */}
                              <button
                                type="button"
                                onClick={() => handleSelectOther(cq.id)}
                                className="w-full flex items-center gap-2 px-1.5 py-1 text-left cursor-pointer group rounded-md transition-colors hover:bg-gray-100/60 dark:hover:bg-zinc-800/50"
                              >
                                <span
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isOther
                                      ? "border-gray-900 dark:border-zinc-300"
                                      : "border-gray-300 dark:border-zinc-600 group-hover:border-gray-400 dark:group-hover:border-zinc-400"
                                  }`}
                                >
                                  {isOther && (
                                    <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-zinc-100" />
                                  )}
                                </span>
                                <span className="font-medium text-gray-700 dark:text-zinc-200">
                                  {t("其他", "Other")}
                                </span>
                              </button>

                              {isOther && (
                                <textarea
                                  value={customInputTexts[cq.id] || ""}
                                  onChange={(e) => handleCustomInputChange(cq.id, e.target.value)}
                                  placeholder={t("输入你的回答...", "Type your answer...")}
                                  rows={2}
                                  autoFocus={qi === 0}
                                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-[11px] text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 focus:border-gray-400 resize-y"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-2 px-3 sm:px-4 py-2 border-t border-gray-100 dark:border-zinc-800/60">
                      <button
                        onClick={() => handleSkipAskUser(block.id, block.questions)}
                        className="px-3 py-1 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        {t("跳过", "Skip")}
                      </button>
                      <button
                        onClick={() => handleSubmitAnswers(block.id, block.questions)}
                        className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-[11px] font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        {t("提交", "Send")}
                      </button>
                    </div>
                  </div>
                );
              }
              if (item.kind === "text") {
                return (
                  <div key={item.key} className="text-[13px] leading-relaxed text-gray-800 dark:text-zinc-200 w-full font-sans space-y-1">
                    {renderMarkdown(item.block.text)}
                  </div>
                );
              }
              return null;
            })}

            {/* Fallback Tool Logs if no tool blocks */}
            {!blocks.some((b) => b.kind === "tool") &&
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

            {/* 4. AskUser cards render inside renderItems (ordered ask blocks) —
                see the item.kind === "ask" branch above. The old message-level
                clarification card was removed: it was pinned below all blocks,
                so post-answer streaming landed visually ABOVE it. */}

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
        // Any real content block (text / reasoning / tool) counts as output;
        // the legacy text check covers un-migrated messages.
        const hasActiveOutput =
          lastMsg &&
          lastMsg.sender === "ai" &&
          (getBlocks(lastMsg).length > 0 ||
            Boolean(lastMsg.text && lastMsg.text.trim().length > 0));

        if (isGenerating && Object.keys(pendingApprovals || {}).length === 0 && !hasActiveOutput) {
          return <ThinkingLoader t={t} />;
        }
        return null;
      })()}
    </div>
  );
};


