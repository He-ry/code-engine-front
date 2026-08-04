import React, { useState, useRef, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  ArrowUp,
  Plus,
  ChevronDown,
  X,
  Smartphone,
  CheckCircle2,
  FolderArchive,
  Terminal,
  Target,
  FileText,
  Compass,
  MessageSquare,
  Figma,
  Image as ImageIcon,
  Wrench,
} from "lucide-react";
import { ContextPill, CommandItem } from "../types";
import { PlusMenu, ModeMenu, ModelMenu } from "./ContextPopovers";
import { SKILLS_LIST, RECOMMENDATION_CARDS } from "../data/mockData";

interface PromptInputProps {
  onSend: (text: string, pills: ContextPill[], mode: string, model: string) => void;
  projectName: string;
  branchName: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  selectedMode?: string;
  onModeChange?: (mode: string) => void;
  onSelectRecommendation?: (promptText: string) => void;
  isGenerating?: boolean;
  onStop?: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSend,
  projectName,
  branchName,
  selectedModel: propModel,
  onModelChange,
  selectedMode: propMode,
  onModeChange,
  onSelectRecommendation,
  isGenerating = false,
  onStop,
}) => {
  const { t, defaultModel, agentThinking, backendModels } = useSettings();
  const [inputText, setInputText] = useState("");
  const [contextPills, setContextPills] = useState<ContextPill[]>([]);
  const [localMode, setLocalMode] = useState(t("自动接受编辑", "Auto Accept Edits"));
  const [localModel, setLocalModel] = useState(() => {
    // Resolve initial value: use first enabled model from the list if available
    const enabled = (backendModels || []).filter((m) => m.isEnabled !== false);
    return enabled.length > 0 ? enabled[0].name : "Auto";
  });

  const selectedModel = propModel !== undefined ? propModel : localModel;
  const setSelectedModel = onModelChange || setLocalModel;

  const selectedMode = propMode !== undefined ? propMode : localMode;
  const setSelectedMode = onModeChange || setLocalMode;

  const [selectedBranch, setSelectedBranch] = useState(branchName);

  // Popover toggle states
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Autocomplete popup states
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [commandQuery, setCommandQuery] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  // Click outside handlers for popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (plusMenuRef.current && !plusMenuRef.current.contains(target)) {
        setShowPlusMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(target)) {
        setShowModelMenu(false);
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(target)) {
        setShowModeMenu(false);
      }
      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setShowBranchMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [inputText]);

  const getPillIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileText className="w-3.5 h-3.5 text-rose-500" />;
      case "goal":
        return <Target className="w-3.5 h-3.5 text-indigo-500" />;
      case "spec":
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case "plan":
        return <Compass className="w-3.5 h-3.5 text-amber-500" />;
      case "ask":
        return <MessageSquare className="w-3.5 h-3.5 text-teal-500" />;
      case "figma":
        return <Figma className="w-3.5 h-3.5 text-purple-500" />;
      case "img":
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />;
      case "skill":
        return <Wrench className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />;
      default:
        return <FolderArchive className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />;
    }
  };

  const getPillStyle = (type: string) => {
    switch (type) {
      case "file":
        return "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300";
      case "goal":
        return "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300";
      case "spec":
        return "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300";
      case "plan":
        return "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300";
      case "ask":
        return "bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-300";
      case "figma":
        return "bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300";
      case "img":
        return "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300";
      case "skill":
        return "bg-gray-100 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300";
      default:
        return "bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200";
    }
  };

  // Detect @ and / inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);

    const lastAt = textBeforeCursor.lastIndexOf("@");
    if (lastAt !== -1 && !textBeforeCursor.slice(lastAt).includes(" ")) {
      setMentionQuery(textBeforeCursor.slice(lastAt + 1));
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
    }

    const lastSlash = textBeforeCursor.lastIndexOf("/");
    if (lastSlash !== -1 && !textBeforeCursor.slice(lastSlash).includes(" ")) {
      setCommandQuery(textBeforeCursor.slice(lastSlash + 1));
      setShowCommandMenu(true);
    } else {
      setShowCommandMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim() && contextPills.length === 0) return;
    onSend(inputText, contextPills, selectedMode, selectedModel);
    setInputText("");
    setContextPills([]);
  };

  const skillPills = contextPills.filter((p) => p.type === "skill");
  const otherPills = contextPills.filter((p) => p.type !== "skill");

  const removePill = (id: string) => {
    setContextPills(contextPills.filter((p) => p.id !== id));
  };

  const toggleMic = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      // Simulate speech recognition input
      setTimeout(() => {
        setInputText((prev) => prev + t(" 请帮我使用 TypeScript 优化核心算法模块", " Please help me optimize core algorithm modules using TypeScript"));
        setIsListening(false);
      }, 1500);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative font-sans">
      {/* Main Container Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-visible relative flex flex-col p-0">
        {/* Input & Pills Container (Integrated inside the input box, vertically stacked) */}
        <div 
          className="flex flex-col cursor-text"
          onClick={(e) => {
            if (
              e.target === e.currentTarget || 
              ((e.target as HTMLElement).tagName !== 'TEXTAREA' && 
               !(e.target as HTMLElement).closest('button') && 
               !(e.target as HTMLElement).closest('.context-pill'))
            ) {
              textareaRef.current?.focus();
            }
          }}
        >
          {/* Inner padded container for pills and textarea */}
          <div className="flex flex-col gap-2 pt-3.5 px-4 pb-2">
            {/* Selected Pills row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 empty:hidden">
              <AnimatePresence>
                {skillPills.map((pill) => (
                  <motion.span
                    layout
                    key={pill.id}
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`context-pill h-7 inline-flex items-center gap-1.5 px-2.5 border rounded-lg text-xs font-medium shadow-2xs ${getPillStyle(pill.type)}`}
                  >
                    {getPillIcon(pill.type)}
                    <span>{pill.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePill(pill.id);
                      }}
                      className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            {/* Text Area (occupies full width) */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                contextPills.length === 0
                  ? t("@引用上下文，/调起指令，↑↓切换历史输入", "@reference context, /for commands, ↑↓ history")
                  : t("输入您的补充指令...", "Type your prompt...")
              }
              className="w-full resize-none border-none outline-none text-sm text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 bg-transparent leading-relaxed font-sans py-1 min-h-[44px]"
            />
          </div>

          {/* Bottom Toolbar inside the Input Box */}
          <div className="flex items-center justify-between px-4 py-2.5 relative bg-gray-50/50 dark:bg-zinc-900/60 border-t border-gray-100 dark:border-zinc-800/60 rounded-b-2xl w-full">

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Standalone + Button */}
              <div className="relative" ref={plusMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(!showPlusMenu);
                    setShowModeMenu(false);
                    setShowModelMenu(false);
                  }}
                  className="h-7 w-7 bg-gray-100/80 dark:bg-zinc-800 hover:bg-gray-200/80 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 transition-colors cursor-pointer flex items-center justify-center"
                  title={t("添加上下文或关联", "Add context or attachment")}
                >
                  <Plus className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
                </button>

                <AnimatePresence>
                  {showPlusMenu && (
                    <PlusMenu
                      onSelect={(pill) => {
                        if (!contextPills.find((p) => p.id === pill.id)) {
                          setContextPills([...contextPills, pill]);
                        }
                      }}
                      onSelectSkill={(skillPill) => {
                        if (!contextPills.find((p) => p.id === skillPill.id)) {
                          setContextPills([...contextPills, skillPill]);
                        }
                      }}
                      onClose={() => setShowPlusMenu(false)}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Other context pills shown right after the + button with animation! */}
              <AnimatePresence>
                {otherPills.map((pill) => (
                  <motion.span
                    layout
                    key={pill.id}
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`context-pill h-7 inline-flex items-center gap-1.5 px-2.5 border rounded-lg text-xs font-medium shadow-2xs ${getPillStyle(pill.type)}`}
                  >
                    {getPillIcon(pill.type)}
                    <span>{pill.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePill(pill.id);
                      }}
                      className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>

              {/* Standalone Auto Model Switcher Button */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModelMenu(!showModelMenu);
                    setShowPlusMenu(false);
                    setShowModeMenu(false);
                  }}
                  className="h-7 flex items-center gap-1 px-2.5 bg-gray-100/80 dark:bg-zinc-800 hover:bg-gray-200/80 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 transition-colors cursor-pointer"
                  title={t("切换模型", "Switch Model")}
                >
                  <span>{selectedModel}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                </button>

                <AnimatePresence>
                  {showModelMenu && (
                    <ModelMenu
                      currentModel={selectedModel}
                      onSelectModel={(m) => setSelectedModel(m)}
                      onClose={() => setShowModelMenu(false)}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Mode Dropdown (e.g., 自动接受编辑) */}
              <div className="relative" ref={modeMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModeMenu(!showModeMenu);
                    setShowPlusMenu(false);
                    setShowModelMenu(false);
                  }}
                  className="h-7 flex items-center gap-1 px-2.5 bg-gray-100/80 dark:bg-zinc-800 hover:bg-gray-200/80 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>{selectedMode}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                </button>

                <AnimatePresence>
                  {showModeMenu && (
                    <ModeMenu
                      currentMode={selectedMode}
                      onSelectMode={(m) => setSelectedMode(m)}
                      onClose={() => setShowModeMenu(false)}
                    />
                  )}
                </AnimatePresence>
              </div>


            </div>

            {/* Mic & Send/Stop Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMic}
                className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all ${
                  isListening
                    ? "bg-rose-100 dark:bg-rose-950/80 border-rose-300 text-rose-600 dark:text-rose-400 animate-pulse"
                    : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                }`}
                title={t("语音输入", "Voice Input")}
              >
                <Mic className="w-4 h-4" />
              </button>

              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="relative w-8 h-8 flex items-center justify-center rounded-xl bg-gray-200/90 dark:bg-zinc-700/80 border border-gray-300/80 dark:border-zinc-600/80 transition-all cursor-pointer hover:bg-gray-300/80 dark:hover:bg-zinc-600/80 active:scale-95 group shrink-0"
                  title={t("停止生成", "Stop Generation")}
                >
                  {/* Outer Rotating Arc */}
                  <svg
                    className="w-6 h-6 animate-spin text-zinc-900 dark:text-zinc-100"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="opacity-20"
                    />
                    <path
                      d="M 12 2 A 10 10 0 0 1 22 12 A 10 10 0 0 1 12 22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      className="opacity-90"
                    />
                  </svg>
                  {/* Centered Solid Black Square */}
                  <span className="absolute w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-[1.5px] group-hover:scale-105 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!inputText.trim() && contextPills.length === 0}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all shrink-0 border ${
                    inputText.trim() || contextPills.length > 0
                      ? "bg-white text-black border-gray-300 dark:bg-zinc-900 dark:text-white dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-xs cursor-pointer active:scale-95"
                      : "bg-white/80 text-gray-300 border-gray-200 dark:bg-zinc-900/50 dark:text-zinc-600 dark:border-zinc-800 cursor-not-allowed"
                  }`}
                  title={t("发送", "Send")}
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sub Status Bar */}
        <div className="px-4 py-2 bg-gray-50/90 dark:bg-zinc-900/90 border-t border-gray-100 dark:border-zinc-800 rounded-b-2xl flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 select-none">
          {/* Left Sub Items */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors">
              <Terminal className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              <span>Local</span>
              <ChevronDown className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
            </button>
            <span className="text-gray-300 dark:text-zinc-700">|</span>
            <div className="relative" ref={branchMenuRef}>
              <button
                onClick={() => setShowBranchMenu(!showBranchMenu)}
                className="flex items-center gap-1 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors font-mono"
              >
                <span>🌱 {selectedBranch}</span>
              </button>

              <AnimatePresence>
                {showBranchMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-0 bottom-full mb-2 w-44 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 py-1 z-50"
                  >
                    <div className="px-2 py-1 text-[10px] text-gray-400 dark:text-zinc-500 font-medium">{t("Git 分支", "Git Branch")}</div>
                    {["master", "main", "dev-feature"].map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          setSelectedBranch(b);
                          setShowBranchMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1 hover:bg-gray-100 dark:hover:bg-zinc-800 font-mono text-xs text-gray-700 dark:text-zinc-300"
                      >
                        {b}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Sub Items */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors">
              <Smartphone className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              <span>{t("移动端", "Mobile")}</span>
            </button>

            <button className="flex items-center gap-1 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors">
              <span>{t("上下文窗口", "Context Window")}</span>
              <div className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-zinc-600 border-t-gray-600 dark:border-t-zinc-300 animate-spin-slow" />
            </button>
          </div>
        </div>
      </div>


      {/* Autocomplete Popup Menu for @mentions */}
      <AnimatePresence>
        {showMentionMenu && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute left-4 bottom-full mb-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 py-1.5 z-50 text-xs font-sans"
          >
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              {t("@ 引用上下文", "@ Reference Context")}
            </div>
            {[
              { name: "Figma", desc: t("设计稿组件集成", "Figma Design Integration") },
              { name: "Spec", desc: t("需求规格说明书", "Requirements Specification") },
              { name: "Plan", desc: t("开发执行计划", "Execution Plan") },
              { name: "core/engine.ts", desc: t("核心引擎 TypeScript", "Core Engine TS") },
              { name: "AGENTS.md", desc: t("Agent 指令集", "Agent Instructions") },
            ]
              .filter((item) => item.name.toLowerCase().includes(mentionQuery.toLowerCase()))
              .map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setContextPills([
                      ...contextPills,
                      { id: item.name, name: item.name, type: "file" },
                    ]);
                    setInputText((prev) => prev.slice(0, prev.lastIndexOf("@")));
                    setShowMentionMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                >
                  <span className="font-medium text-gray-800 dark:text-zinc-200">{item.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">{item.desc}</span>
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Autocomplete Popup Menu for /commands */}
      <AnimatePresence>
        {showCommandMenu && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute left-4 bottom-full mb-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 py-1.5 z-50 text-xs font-sans"
          >
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              {t("/ 调起指令", "/ Trigger Commands")}
            </div>
            {[
              { name: "/generate-ppt", desc: t("一键生成 PPT 大纲", "Generate PPT Outline") },
              { name: "/expert-group", desc: t("多专家协同分析", "Multi-expert Analysis") },
              { name: "/nano-banana", desc: t("一句话生成创意图", "Generate Creative Image") },
              { name: "/popo-share", desc: t("快速分享构建产物", "Share Build Artifacts") },
              ...SKILLS_LIST.map((s) => ({ name: `/${s.id}`, desc: t(s.name, s.enName) })),
            ]
              .filter((cmd) => cmd.name.toLowerCase().includes(commandQuery.toLowerCase()))
              .map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => {
                    const skillMatch = SKILLS_LIST.find((s) => `/${s.id}` === cmd.name);
                    if (skillMatch) {
                      const pillId = skillMatch.id;
                      if (!contextPills.find((p) => p.id === pillId)) {
                        setContextPills([
                          ...contextPills,
                          { id: pillId, name: `/${skillMatch.id}`, type: "skill" },
                        ]);
                      }
                      setInputText((prev) => prev.slice(0, prev.lastIndexOf("/")));
                    } else {
                      setInputText((prev) => prev.slice(0, prev.lastIndexOf("/")) + cmd.name + " ");
                    }
                    setShowCommandMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{cmd.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">{cmd.desc}</span>
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
