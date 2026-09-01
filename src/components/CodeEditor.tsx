import React, { useState, useEffect, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import {
  FileText,
  X,
  Columns,
  MoreHorizontal,
  ExternalLink,
  ChevronRight,
  Check,
  Code2,
  Download,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  GitCompare,
  BookOpen,
  Layout,
  RotateCw,
  Maximize2,
  Minimize2,
  Copy,
  Wand2,
  WrapText,
  Save,
  ListFilter,
  FileCode,
  Sparkles,
  Globe,
  ArrowLeft,
  ArrowRight,
  Shield,
  Home,
} from "lucide-react";
import { OpenTab } from "../types";

// ── highlight.js syntax highlighting ──
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import markdown from "highlight.js/lib/languages/markdown";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import java from "highlight.js/lib/languages/java";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import kotlin from "highlight.js/lib/languages/kotlin";
import php from "highlight.js/lib/languages/php";
import swift from "highlight.js/lib/languages/swift";
import ruby from "highlight.js/lib/languages/ruby";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import scss from "highlight.js/lib/languages/scss";

hljs.registerLanguage("python", python);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("java", java);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("php", php);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("scss", scss);

interface CodeEditorProps {
  tabs: OpenTab[];
  activeTabPath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onContentChange: (path: string, newContent: string) => void;
  onCloseEditor: () => void;
  onKeepFile?: (path: string) => void;
  onRevertFile?: (path: string, originalContent: string | null) => void;
  /** Download the source file of a read-only preview tab (attachments). */
  onDownloadTab?: (tab: OpenTab) => void;
  projectId?: string;
}

interface OutlineSymbol {
  line: number;
  label: string;
  type: "function" | "class" | "import" | "tag" | "docstring";
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  tabs,
  activeTabPath,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onCloseEditor,
  onKeepFile,
  onRevertFile,
  onDownloadTab,
  projectId,
}) => {
  const { t, backendApiUrl, user } = useSettings();
  const { showSuccess, showInfo } = useToast();

  // ── Language inference from file extension ──
  const getLanguage = (filename?: string): string => {
    if (!filename) return "javascript";
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "py": return "python";
      case "ts": case "tsx": return "typescript";
      case "js": case "jsx": case "mjs": case "cjs": return "javascript";
      case "json": return "json";
      case "yaml": case "yml": return "yaml";
      case "css": case "less": return "css";
      case "scss": return "scss";
      case "html": case "htm": case "xml": case "svg": return "xml";
      case "md": case "markdown": return "markdown";
      case "sh": case "bash": case "zsh": return "bash";
      case "sql": return "sql";
      case "java": return "java";
      case "c": case "h": return "c";
      case "cpp": case "cc": case "cxx": case "hpp": return "cpp";
      case "go": return "go";
      case "rs": return "rust";
      case "kt": case "kts": return "kotlin";
      case "php": return "php";
      case "swift": return "swift";
      case "rb": return "ruby";
      case "dockerfile": case "docker": return "dockerfile";
      default: return "javascript";
    }
  };
  const [activeLine, setActiveLine] = useState<number>(1);
  const [activeCol, setActiveCol] = useState<number>(1);

  // Functional View States
  const [isDiffMode, setIsDiffMode] = useState<boolean>(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(false);
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isPopoutOpen, setIsPopoutOpen] = useState<boolean>(false);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.path === activeTabPath) || tabs[0];

  const isBrowserTab =
    activeTab?.language === "browser" ||
    activeTab?.path?.startsWith("browser://") ||
    activeTab?.name === "浏览器" ||
    activeTab?.name === "Browser";

  // Detect image files by extension
  const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp", "avif"]);
  const isImageFile = (() => {
    if (!activeTab?.name) return false;
    const ext = activeTab.name.split(".").pop()?.toLowerCase();
    return ext ? IMAGE_EXTENSIONS.has(ext) : false;
  })();

  // Fetch image file content and convert to data URL for preview
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  useEffect(() => {
    if (!isImageFile || !projectId || !activeTab) {
      setImageDataUrl(null);
      return;
    }
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    const params = new URLSearchParams({ path: activeTab.path });
    const url = `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/files/read?${params}`;

    let cancelled = false;
    setImageLoading(true);
    (async () => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { if (!cancelled) setImageLoading(false); return; }
        const json = await res.json();
        const content: string = json?.data?.content ?? json?.content ?? "";
        const encoding: string = json?.data?.encoding ?? json?.encoding ?? "utf-8";
        if (!content && !cancelled) { setImageLoading(false); return; }

        // Determine MIME from extension
        const ext = (activeTab.name.split(".").pop() || "png").toLowerCase();
        const mimeMap: Record<string, string> = {
          png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
          gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
          ico: "image/x-icon", bmp: "image/bmp", avif: "image/avif",
        };
        const mime = mimeMap[ext] || "image/png";

        // Use encoding from backend: base64 for binary, utf-8 for text (SVG)
        const dataUrl = encoding === "base64"
          ? `data:${mime};base64,${content}`
          : `data:image/svg+xml,${encodeURIComponent(content)}`;

        if (!cancelled) {
          setImageDataUrl(dataUrl);
          setImageLoading(false);
        }
      } catch {
        if (!cancelled) setImageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isImageFile, activeTab?.path, projectId, backendApiUrl, user?.token]);

  const [browserUrlInput, setBrowserUrlInput] = useState<string>(
    activeTab?.content || "https://example.com"
  );
  const [editorBrowserMode, setEditorBrowserMode] = useState<"mock" | "real">("mock");

  useEffect(() => {
    if (isBrowserTab && activeTab?.content) {
      setBrowserUrlInput(activeTab.content);
    }
  }, [activeTab?.content, isBrowserTab]);

  const showToast = (msg: string) => {
    if (msg.includes("保存") || msg.includes("Saved") || msg.includes("格式") || msg.includes("复制") || msg.includes("Formatted") || msg.includes("Copied")) {
      showSuccess(t("操作成功", "Success"), msg);
    } else {
      showInfo(t("编辑器提示", "Editor Info"), msg);
    }
  };

  // Keyboard save shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (activeTab) {
          showToast(t(`已保存文件 ${activeTab.name}`, `Saved file ${activeTab.name}`));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, t]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Synchronize scrolling between textarea, highlight layer & gutter
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const scrollLeft = e.currentTarget.scrollLeft;

    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  // Track cursor position
  const handleSelectionChange = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;

    const linesBefore = text.substring(0, selStart).split("\n");
    const currentLineNumber = linesBefore.length;
    const currentColumnNumber = linesBefore[linesBefore.length - 1].length + 1;

    setActiveLine(currentLineNumber);
    setActiveCol(currentColumnNumber);
  };

  // Jump to specific line and center view
  const jumpToLine = (lineNumber: number) => {
    if (!textareaRef.current) return;
    const lines = (activeTab?.content || "").split("\n");
    const clampedLine = Math.max(1, Math.min(lines.length, lineNumber));
    setActiveLine(clampedLine);

    // Calculate line character offset
    let charOffset = 0;
    for (let i = 0; i < clampedLine - 1; i++) {
      charOffset += lines[i].length + 1;
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charOffset, charOffset);

    // Scroll into view
    const lineHeight = 24; // 24px line height
    textareaRef.current.scrollTop = Math.max(0, (clampedLine - 5) * lineHeight);
  };

  // Refresh active file content
  const handleRefreshContent = () => {
    showToast(t("文件内容已同步/刷新", "File content reloaded"));
  };

  // Move line up / down
  const handleNavigateLine = (direction: "up" | "down") => {
    const targetLine = direction === "up" ? activeLine - 1 : activeLine + 1;
    jumpToLine(targetLine);
  };

  // Format Code
  const handleFormatCode = () => {
    if (!activeTab) return;
    const formatted = activeTab.content
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");
    onContentChange(activeTab.path, formatted);
    showToast(t("代码自动缩进格式化完成", "Code formatted"));
    setIsMoreMenuOpen(false);
  };

  // Copy code
  const handleCopyCode = () => {
    if (!activeTab) return;
    navigator.clipboard.writeText(activeTab.content);
    showToast(t("代码已成功复制到剪贴板", "Code copied to clipboard"));
    setIsMoreMenuOpen(false);
  };

  if (!activeTab || tabs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#0b0b0b] text-gray-400 dark:text-zinc-500 select-none font-sans border-r border-gray-200/80 dark:border-[#2a2a2a]">
        <Code2 className="w-10 h-10 stroke-1 text-gray-300 dark:text-zinc-600 mb-2" />
        <span className="text-xs">{t("未打开任何代码文件", "No files open")}</span>
      </div>
    );
  }

  // Construct breadcrumb path — use the real file path, no artificial prefix
  const breadcrumbs = isBrowserTab
    ? [t("浏览器", "Browser"), activeTab.content || "https://example.com"]
    : activeTab.path.split("/");

  const lines = (activeTab.content || "").split("\n");

  // Generate document outline symbols from active code content
  const parseSymbols = (): OutlineSymbol[] => {
    const symbols: OutlineSymbol[] = [];
    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const trimmed = lineText.trim();
      if (trimmed.startsWith("def ")) {
        symbols.push({ line: lineNum, label: trimmed.split("(")[0], type: "function" });
      } else if (trimmed.startsWith("class ")) {
        symbols.push({ line: lineNum, label: trimmed.split(":")[0], type: "class" });
      } else if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
        symbols.push({ line: lineNum, label: trimmed, type: "import" });
      } else if (trimmed.startsWith("function ") || trimmed.startsWith("export const ")) {
        symbols.push({ line: lineNum, label: trimmed.split("=")[0].split("(")[0], type: "function" });
      } else if (trimmed.startsWith("<") && !trimmed.startsWith("</") && trimmed.endsWith(">")) {
        symbols.push({ line: lineNum, label: trimmed, type: "tag" });
      }
    });
    return symbols;
  };

  const symbols = parseSymbols();

  // Keep the read-only lock separate from review — user can edit even while
  // a pending change is under review so they can adjust the proposed content.
  const isReviewing = !!activeTab?.pendingChange && !activeTab.pendingChange.isConfirmed;
  const isPreviewTab = !!activeTab?.readOnly;
  const effectiveReadOnly = isPreviewTab || isReadOnly;

  // 非代码类标签(ONLYOFFICE 预览 / PDF / 图片 / 浏览器)不展示代码编辑工具,
  // 只保留 刷新 / 独立卡片预览 / 最大化(关闭走标签条上的 X)。
  const isRichTab =
    isImageFile ||
    isBrowserTab ||
    activeTab?.livePreviewUrl !== undefined ||
    activeTab?.pdfUrl !== undefined;

  // ── highlight.js-based multi-language syntax highlighter ──
  // Highlights the entire file at once so multi-line tokens (comments,
  // strings, etc.) are coloured correctly, then splits into lines while
  // tracking open/close spans across line boundaries.
  const renderHighlightedLines = (codeLines: string[]) => {
    const fileName = activeTab?.name;
    const lang = getLanguage(fileName);
    const langOk = hljs.getLanguage(lang) !== undefined;
    const fullCode = codeLines.join("\n");

    // 1. Highlight everything in one shot
    let highlightedHtml = "";
    if (fullCode && langOk) {
      try {
        const result = hljs.highlight(fullCode, { language: lang });
        highlightedHtml = result.value;
      } catch {
        highlightedHtml = fullCode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
    } else if (fullCode) {
      highlightedHtml = fullCode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // 2. Split the highlighted HTML into lines, tracking span state.
    //    Walk character-by-character to correctly handle ANY < in the
    //    highlighted output (both hljs <span> tags and escaped &lt; etc.).
    const lineParts: string[] = [];
    const openSpans: string[] = [];
    let currentPart = "";
    let i = 0;

    while (i < highlightedHtml.length) {
      if (highlightedHtml.substring(i).startsWith("</span>")) {
        currentPart += "</span>";
        openSpans.pop();
        i += 7;
      } else if (highlightedHtml.substring(i).startsWith("<span")) {
        const end = highlightedHtml.indexOf(">", i);
        if (end !== -1) {
          const tag = highlightedHtml.substring(i, end + 1);
          currentPart += tag;
          openSpans.push(tag);
          i = end + 1;
        } else {
          // Malformed span — treat as text
          currentPart += highlightedHtml[i];
          i += 1;
        }
      } else if (highlightedHtml[i] === "\n") {
        // Close all currently-open spans, record the line, then reopen for next line
        if (openSpans.length > 0) {
          currentPart += "</span>".repeat(openSpans.length);
        }
        lineParts.push(currentPart);
        currentPart = openSpans.join("");
        i += 1;
      } else {
        currentPart += highlightedHtml[i];
        i += 1;
      }
    }
    // Last line (may not end with \n)
    lineParts.push(currentPart);

    // 3. Pad to match the actual number of code lines
    while (lineParts.length < codeLines.length) {
      lineParts.push("&nbsp;");
    }

    return lineParts.map((lineHtml, index) => {
      const lineNum = index + 1;
      const isCurrentLine = lineNum === activeLine;

      // GitHub-style green bg for pending review (new file / added lines)
      const reviewBg = isReviewing
        ? "bg-emerald-50 dark:bg-emerald-950/20"
        : "";

      return (
        <div
          key={index}
          className={`h-6 leading-6 px-3 flex items-center ${
            wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
          } font-mono text-[12px] ${
            isCurrentLine ? "bg-blue-50/80 dark:bg-[#21262d]/80 border-l-2 border-blue-600 dark:border-[#58a6ff] -ml-[2px]" : reviewBg
          }`}
        >
          {lineHtml ? (
            <span
              dangerouslySetInnerHTML={{ __html: lineHtml }}
            />
          ) : (
            <span className="inline-block w-full">&nbsp;</span>
          )}
        </div>
      );
    });
  };

  const getTabIcon = (name: string) => {
    if (name.includes("浏览器") || name.toLowerCase().includes("browser") || name.endsWith("preview")) {
      return <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
    if (name.endsWith(".yaml") || name.endsWith(".yml")) {
      return <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px] font-mono leading-none shrink-0">!</span>;
    }
    if (name.endsWith(".md")) {
      return <span className="text-blue-500 font-serif italic text-[11px] font-bold shrink-0">ⓘ</span>;
    }
    if (name.includes("docker")) {
      return <FileCode className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
    }
    return <FileCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  };

  return (
    <div
      // NOTE: `relative` (normal) and `fixed` (maximized) must stay mutually
      // exclusive — Tailwind's stylesheet defines .relative AFTER .fixed, so
      // having both classes on the element leaves `relative` winning and the
      // fullscreen overlay silently never applies.
      className={`flex flex-col h-full bg-white dark:bg-[#0b0b0b] font-sans select-none min-w-0 overflow-hidden transition-all ${
        isMaximized ? "fixed inset-0 z-50" : "relative flex-1"
      }`}
    >
      {/* ── highlight.js GitHub-style theme (light & dark) ── */}
      <style>{`
        /* Light theme — GitHub */
        .hljs { color: #24292e; }
        .hljs-keyword, .hljs-selector-tag, .hljs-deletion,
        .hljs-literal, .hljs-section, .hljs-link { color: #d73a49; }
        .hljs-string, .hljs-addition, .hljs-attribute { color: #032f62; }
        .hljs-number, .hljs-literal { color: #005cc5; }
        .hljs-comment { color: #6a737d; font-style: italic; }
        .hljs-title, .hljs-meta, .hljs-type { color: #6f42c1; }
        .hljs-built_in, .hljs-title.class_ { color: #6f42c1; }
        .hljs-variable, .hljs-template-variable, .hljs-attr { color: #e36209; }
        .hljs-params { color: #24292e; }
        .hljs-function .hljs-title { color: #6f42c1; }
        .hljs-tag { color: #22863a; }
        .hljs-name { color: #22863a; }
        .hljs-regexp, .hljs-symbol, .hljs-template-tag { color: #032f62; }
        .hljs-selector-id, .hljs-selector-class { color: #6f42c1; }
        .hljs-doctag, .hljs-strong { font-weight: bold; }
        .hljs-emphasis { font-style: italic; }
        .hljs-bullet { color: #735c0f; }
        .hljs-code { color: #005cc5; }
        .hljs-quote { color: #6a737d; }

        /* Dark theme — GitHub Dark */
        .dark .hljs { color: #c9d1d9; }
        .dark .hljs-keyword, .dark .hljs-selector-tag, .dark .hljs-deletion,
        .dark .hljs-literal, .dark .hljs-section, .dark .hljs-link { color: #ff7b72; }
        .dark .hljs-string, .dark .hljs-addition, .dark .hljs-attribute { color: #a5d6ff; }
        .dark .hljs-number, .dark .hljs-literal { color: #79c0ff; }
        .dark .hljs-comment { color: #8b949e; font-style: italic; }
        .dark .hljs-title, .dark .hljs-meta, .dark .hljs-type { color: #d2a8ff; }
        .dark .hljs-built_in, .dark .hljs-title.class_ { color: #d2a8ff; }
        .dark .hljs-variable, .dark .hljs-template-variable, .dark .hljs-attr { color: #ffa657; }
        .dark .hljs-params { color: #c9d1d9; }
        .dark .hljs-function .hljs-title { color: #d2a8ff; }
        .dark .hljs-tag { color: #7ee787; }
        .dark .hljs-name { color: #7ee787; }
        .dark .hljs-regexp, .dark .hljs-symbol, .dark .hljs-template-tag { color: #a5d6ff; }
        .dark .hljs-selector-id, .dark .hljs-selector-class { color: #d2a8ff; }
        .dark .hljs-doctag, .dark .hljs-strong { font-weight: bold; }
        .dark .hljs-emphasis { font-style: italic; }
        .dark .hljs-bullet { color: #d2a8ff; }
        .dark .hljs-code { color: #79c0ff; }
        .dark .hljs-quote { color: #8b949e; }
      `}</style>

      {/* IDE Style Open Tab Strip */}
      {tabs.length > 0 && (
        <div className="h-8 bg-[#f3f3f5] dark:bg-[#171717] border-b border-gray-200/90 dark:border-[#2a2a2a] flex items-stretch overflow-x-auto scrollbar-none shrink-0 z-10 font-sans">
          {tabs.map((tab) => {
            const isActive = tab.path === activeTab.path;

            return (
              <div
                key={tab.path}
                onClick={() => onSelectTab(tab.path)}
                className={`group h-full px-3 border-t-[2.5px] border-r border-gray-200 dark:border-[#2a2a2a] flex items-center gap-2 text-xs cursor-pointer transition-colors select-none shrink-0 ${
                  isActive
                    ? "bg-white dark:bg-[#0b0b0b] border-t-blue-600 dark:border-t-[#3b82f6] text-gray-900 dark:text-[#ededed] font-medium"
                    : "bg-[#e8e8eb] dark:bg-[#262626] border-t-transparent text-gray-600 dark:text-[#a3a3a3] hover:bg-[#dfdfe3] dark:hover:bg-[#2a2a2a]"
                }`}
              >
                {getTabIcon(tab.name)}
                <span className={`truncate max-w-[140px] ${!isActive && tab.name.endsWith(".md") ? "italic" : ""}`}>
                  {tab.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.path);
                  }}
                  className={`p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-[#ededed] hover:bg-gray-200/80 dark:hover:bg-[#2a2a2a] transition-opacity ${
                    isActive ? "opacity-80 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                  title={t("关闭标签", "Close Tab")}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Top Bar with Breadcrumb Path & Action Controls */}
      <div className="h-8 px-3 bg-white dark:bg-[#171717] border-b border-gray-200/90 dark:border-[#2a2a2a] flex items-center justify-between text-xs text-gray-700 dark:text-[#ededed] shrink-0 font-sans">
        <div className="flex items-center gap-2 font-mono text-[11px] truncate min-w-0">
          <div className="flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-gray-400 dark:text-zinc-600 font-mono">&gt;</span>}
                <span
                  className={
                    idx === breadcrumbs.length - 1
                      ? "text-gray-900 dark:text-zinc-100 font-semibold truncate"
                      : "hover:text-gray-700 dark:hover:text-zinc-300 cursor-pointer text-gray-500 dark:text-zinc-400"
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>

          {isDiffMode && !isRichTab && (
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono shrink-0">
              Diff HEAD ↔ Working Tree
            </span>
          )}

          {!isRichTab && (
            <button
              onClick={() => {
                setIsReadOnly(!isReadOnly);
                showToast(isReadOnly ? t("已切换至可编辑模式", "Editable mode enabled") : t("已切换至只读保护模式", "Read-only mode enabled"));
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors shrink-0"
              title={isReadOnly ? t("解锁编辑", "Unlock Editing") : t("锁住保护", "Lock Protection")}
            >
              {isReadOnly ? (
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
              )}
            </button>
          )}
        </div>

        {/* Pending change keep/revert buttons (from write_file) */}
        {activeTab?.pendingChange && !activeTab.pendingChange.isConfirmed && (
          <div className="flex items-center gap-1.5 shrink-0 mr-2">
            <button
              onClick={() => onKeepFile?.(activeTab.path)}
              className="px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded transition-colors cursor-pointer flex items-center gap-1"
              title={t("保留更改", "Keep changes")}
            >
              <Check className="w-3 h-3" />
              <span>{t("保留", "Keep")}</span>
            </button>
            <button
              onClick={() => onRevertFile?.(activeTab.path, activeTab.pendingChange!.originalContent)}
              className="px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded transition-colors cursor-pointer flex items-center gap-1"
              title={t("撤销更改", "Revert changes")}
            >
              <RotateCw className="w-3 h-3" />
              <span>{t("撤销", "Revert")}</span>
            </button>
          </div>
        )}

        {/* Right Action Control Buttons & Cursor Stats */}
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 shrink-0 relative">
          {isPreviewTab && !isRichTab && onDownloadTab && activeTab && (
            <button
              onClick={() => onDownloadTab(activeTab)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors shrink-0"
              title={t("下载原图", "Download Original File")}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          {!isRichTab && (
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-400 dark:text-zinc-500 font-mono mr-2 border-r border-gray-200 dark:border-zinc-800 pr-2">
              <span>{t(`行 ${activeLine}, 列 ${activeCol}`, `Ln ${activeLine}, Col ${activeCol}`)}</span>
              <span>{t(`${lines.length} 行`, `${lines.length} lines`)}</span>
            </div>
          )}

          {/* Refresh File */}
          <button
            onClick={handleRefreshContent}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title={t("刷新/重载文件内容", "Reload File")}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {!isRichTab && (
            <>
          {/* Jump Up */}
          <button
            onClick={() => handleNavigateLine("up")}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title={t("向上移动游标 (Line -1)", "Navigate Line Up")}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Jump Down */}
          <button
            onClick={() => handleNavigateLine("down")}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title={t("向下移动游标 (Line +1)", "Navigate Line Down")}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Git Compare Diff View Toggle */}
          <button
            onClick={() => {
              setIsDiffMode(!isDiffMode);
              showToast(!isDiffMode ? t("已进入 Git 差异对比模式", "Git Diff view enabled") : t("已退出对比模式", "Standard view enabled"));
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isDiffMode
                ? "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-medium"
                : "hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400"
            }`}
            title={isDiffMode ? t("退出差异对比视图", "Exit Diff View") : t("切换至 Git 差异对比视图", "Git Diff View")}
          >
            <GitCompare className="w-3.5 h-3.5" />
          </button>

          {/* Document Outline Toggle */}
          <button
            onClick={() => {
              setIsOutlineOpen(!isOutlineOpen);
              showToast(!isOutlineOpen ? t("已开启函数与结构大纲侧栏", "Outline opened") : t("已关闭大纲", "Outline closed"));
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isOutlineOpen
                ? "bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400"
                : "hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400"
            }`}
            title={t("文档大纲 & 函数结构", "Document Outline")}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          {/* Split Screen View Toggle */}
          <button
            onClick={() => {
              setIsSplitView(!isSplitView);
              showToast(!isSplitView ? t("已开启分屏对照模式", "Split View enabled") : t("已关闭分屏", "Split View disabled"));
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isSplitView
                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400"
                : "hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400"
            }`}
            title={t("双栏/分屏对照模式", "Split View")}
          >
            <Layout className="w-3.5 h-3.5" />
          </button>

          {/* More Actions Dropdown Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isMoreMenuOpen
                  ? "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100"
                  : "hover:bg-gray-100 dark:hover:bg-zinc-800"
              }`}
              title={t("更多高级操作", "More Actions")}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={handleCopyCode}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-left cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span>{t("复制代码内容", "Copy Code")}</span>
                </button>
                <button
                  onClick={handleFormatCode}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-left cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-500" />
                  <span>{t("自动排版/格式化", "Format Code")}</span>
                </button>
                <button
                  onClick={() => {
                    setWordWrap(!wordWrap);
                    setIsMoreMenuOpen(false);
                    showToast(!wordWrap ? t("已开启自动换行", "Word wrap enabled") : t("已关闭自动换行", "Word wrap disabled"));
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-left cursor-pointer"
                >
                  <WrapText className="w-3.5 h-3.5 text-blue-500" />
                  <span>{wordWrap ? t("取消自动换行", "Disable Word Wrap") : t("开启自动换行", "Enable Word Wrap")}</span>
                </button>
                <button
                  onClick={() => {
                    setIsReadOnly(!isReadOnly);
                    setIsMoreMenuOpen(false);
                    showToast(isReadOnly ? t("切换为可编辑", "Switched to editable") : t("切换为只读", "Switched to read-only"));
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-left cursor-pointer"
                >
                  {isReadOnly ? <Unlock className="w-3.5 h-3.5 text-amber-500" /> : <Lock className="w-3.5 h-3.5 text-gray-400" />}
                  <span>{isReadOnly ? t("解锁文件修改", "Unlock Editing") : t("保护/锁定文件", "Lock File")}</span>
                </button>
                <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />
                <button
                  onClick={() => {
                    showToast(t(`已手工保存文件 ${activeTab.name}`, `Saved ${activeTab.name}`));
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 text-left cursor-pointer font-medium"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("保存文件 (Ctrl+S)", "Save File")}</span>
                </button>
              </div>
            )}
          </div>

            </>
          )}

          {/* Standalone Modal Popout */}
          <button
            onClick={() => setIsPopoutOpen(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title={t("独立卡片弹窗预览", "Popout Standalone Window")}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Maximize Toggle */}
          <button
            onClick={() => {
              setIsMaximized(!isMaximized);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title={isMaximized ? t("还原编辑器大小", "Restore Size") : t("最大化全屏编辑器", "Maximize Editor")}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Editor / Tab — 非代码标签走标签条上的 X,这里不重复放 */}
          {!isRichTab && (
            <button
              onClick={() => onCloseTab(activeTab.path)}
              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 rounded transition-colors cursor-pointer text-gray-500 hover:text-rose-600 dark:hover:text-rose-400"
              title={t("关闭当前文件", "Close File")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Code Editor Body Area (Main Canvas + Optional Split + Optional Outline) */}
      <div className="flex-1 flex min-h-0 relative bg-white dark:bg-[#0a0a0a] overflow-hidden">
        {/* Image preview */}
        {isImageFile ? (
          <div className="flex-1 flex items-center justify-center bg-[#fafafa] dark:bg-[#0b0b0b] p-4">
            {imageLoading ? (
              <div className="text-gray-400 dark:text-zinc-500 text-xs font-sans text-center space-y-2">
                <RotateCw className="w-8 h-8 mx-auto animate-spin opacity-30" />
                <span>{t("加载图片中...", "Loading image...")}</span>
              </div>
            ) : imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt={activeTab?.name || "image"}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                style={{ imageRendering: "auto" }}
              />
            ) : (
              <div className="text-gray-400 dark:text-zinc-500 text-xs font-sans text-center space-y-2">
                <FileText className="w-10 h-10 mx-auto opacity-30" />
                <span>{t("无法加载图片预览", "Cannot load image preview")}</span>
              </div>
            )}
          </div>
        ) : isBrowserTab ? (
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-[#0a0a0a] overflow-hidden font-sans">
            {/* Embedded Browser Sub-Toolbar */}
            <div className="px-4 py-2 bg-gray-100 dark:bg-[#151515] border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0 select-none text-xs gap-3">
              {/* Back / Forward / Refresh controls */}
              <div className="flex items-center gap-1.5 shrink-0 text-gray-500">
                <button
                  type="button"
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded disabled:opacity-40"
                  disabled
                  title={t("后退", "Back")}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded disabled:opacity-40"
                  disabled
                  title={t("前进", "Forward")}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentUrl = browserUrlInput;
                    setBrowserUrlInput("");
                    setTimeout(() => setBrowserUrlInput(currentUrl), 50);
                    showToast(t("正在刷新预览...", "Refreshing preview..."));
                  }}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded text-gray-700 dark:text-zinc-300 transition-colors"
                  title={t("刷新", "Reload")}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrowserUrlInput("https://example.com");
                    showToast(t("返回主页", "Navigate Home"));
                  }}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded text-gray-700 dark:text-zinc-300 transition-colors"
                  title={t("主页", "Home")}
                >
                  <Home className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Address / URL Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast(t("导航至: " + browserUrlInput, "Navigating to: " + browserUrlInput));
                }}
                className="flex-1 max-w-2xl relative flex items-center"
              >
                <div className="absolute left-2.5 text-emerald-600 dark:text-emerald-500">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={browserUrlInput}
                  onChange={(e) => setBrowserUrlInput(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg pl-8 pr-12 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-700 dark:text-zinc-200 font-mono transition-all"
                  placeholder={t("输入网页地址进行浏览...", "Type a web address to browse...")}
                />
                <span className="absolute right-2.5 text-[10px] text-gray-400 font-medium select-none bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-200/50 dark:border-zinc-700/50">
                  SSL
                </span>
              </form>

              {/* Switch View Modes Tab */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5 border border-gray-300/40 dark:border-zinc-700/40">
                  <button
                    type="button"
                    onClick={() => setEditorBrowserMode("mock")}
                    className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      editorBrowserMode === "mock"
                        ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {t("模拟调试", "Mock Debug")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorBrowserMode("real")}
                    className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      editorBrowserMode === "real"
                        ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {t("内置网页渲染", "Web Preview")}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const target = /^https?:\/\//i.test(browserUrlInput) ? browserUrlInput : `https://${browserUrlInput}`;
                    window.open(target, "_blank");
                  }}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
                  title={t("在新标签页中打开真实浏览器", "Open in real browser tab")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Standalone Browser Stage Canvas */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-black relative overflow-hidden">
              {editorBrowserMode === "mock" ? (
                <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center bg-gray-50/30 dark:bg-[#0b0b0b]">
                  <div className="max-w-2xl w-full space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center border border-blue-200/50 dark:border-blue-900/50 shadow-xs">
                        <Globe className="w-6 h-6 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
                        {t("CodeEngine 独立预览与调试浏览器", "CodeEngine Standalone Browser Studio")}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                        {t("您已将浏览器单独打开，享受宽屏独立的工作空间来调试页面、捕获组件元素和协作开发。", "You have opened the browser in a standalone tab. Enjoy a spacious workspace to preview, debug, and inspect components.")}
                      </p>
                    </div>

                    {/* Cards Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Bento */}
                      <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                          <h4 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                            {t("项目实时调试预览", "Real-time Project Preview")}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 leading-relaxed">
                          {t("选择并在当前激活的应用视图中直接修改代码，或者捕获具体的视图元素进行快速反馈、提交修改给 AI 处理。", "Select elements and make visual adjustments. Review changes instantly on the layout and send structural codes directly to the chat context.")}
                        </p>
                        <div className="h-28 bg-gray-50 dark:bg-zinc-950/80 rounded-xl border border-gray-100 dark:border-zinc-800/80 p-3 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500">
                            <span>{t("模拟预览地址", "Preview URL")}</span>
                            <span className="font-mono text-blue-500">http://localhost:3000/</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditorBrowserMode("real")}
                            className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                          >
                            {t("立即进入网页渲染模式 ➔", "Switch to Web Preview Mode ➔")}
                          </button>
                        </div>
                      </div>

                      {/* Right Bento */}
                      <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                          <h4 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                            {t("智能 Figma / UI 设计生成", "Smart Figma-to-Code generation")}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 leading-relaxed">
                          {t("在这里您可以一键连接 to Figma，提取任意界面图层和属性，一键发给智能助理进行分析、开发，并渲染为高保真度应用代码。", "Connect to Figma or design drafts, extract structural specs, and hand them off to the smart coding assistant to automatically generate perfect production-ready UI.")}
                        </p>
                        <div className="h-28 bg-gray-50 dark:bg-zinc-950/80 rounded-xl border border-gray-100 dark:border-zinc-800/80 p-3 flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
                            <span className="font-mono px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50">figma-sync</span>
                            <span>{t("就绪", "Ready")}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              showToast(t("Figma 连接服务已启动", "Figma sync service initialized"));
                            }}
                            className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                          >
                            {t("连接至 Figma 设计稿", "Connect to Figma File")}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Notice bottom */}
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-900/20 rounded-xl text-center text-[11px] text-amber-700 dark:text-amber-400 leading-normal max-w-lg mx-auto">
                      💡 {t("您可以通过双击编辑器标签或单击标签旁的「✕」来管理当前打开的浏览器标签页。它与其他代码文件平行共存，大幅提升分屏开发的便利性！", "Tip: You can manage this tab just like standard code files. Keep multiple code windows and browser previews side-by-side to boost your workflow!")}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col relative min-h-0 bg-white dark:bg-[#000000]">
                  {browserUrlInput ? (
                    <iframe
                      src={/^https?:\/\//i.test(browserUrlInput) ? browserUrlInput : `https://${browserUrlInput}`}
                      className="w-full flex-1 bg-white border-none"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-zinc-500">
                      {t("正在加载网页...", "Loading webpage...")}
                    </div>
                  )}

                  {/* Floating notice bar */}
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between shrink-0 leading-normal">
                    <span className="truncate mr-3">
                      💡 {t("由于同源策略限制，某些高度保护的外部网站可能无法在本 iframe 内完整预览。您可以点击右侧按钮在新标签页单独预览它。", "Due to browser security/Same-Origin restrictions, some sites may refuse iframe embedding. Use the popout button to open them directly.")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = /^https?:\/\//i.test(browserUrlInput) ? browserUrlInput : `https://${browserUrlInput}`;
                        window.open(target, "_blank");
                      }}
                      className="font-semibold underline hover:text-amber-950 dark:hover:text-amber-100 shrink-0 select-none cursor-pointer"
                    >
                      {t("新标签页打开", "Open in New Tab")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Primary Code Editor */}
            <div className="flex-1 flex min-h-0 relative overflow-hidden">
              {/* Office 编辑器改用下方覆盖层常驻,见「Office 编辑器标签层」 */}
              {/* Office 编辑器标签层:所有已打开的 office 标签保持挂载(覆盖层),
                  切换标签/切到代码页都只做显示隐藏 —— 条件渲染会卸载 iframe
                  导致 700MB 编辑器整页重载 */}
              {tabs.some((t) => t.livePreviewUrl) && (
                <div
                  className="absolute inset-0 z-10 bg-white dark:bg-zinc-900"
                  style={{ display: activeTab.livePreviewUrl ? "block" : "none" }}
                >
                  {tabs
                    .filter((t) => t.livePreviewUrl)
                    .map((t) => (
                      <div
                        key={t.path}
                        className="absolute inset-0"
                        style={{ display: t.path === activeTab.path ? "block" : "none" }}
                      >
                        <iframe
                          src={t.livePreviewUrl}
                          title={t.name}
                          className="w-full h-full border-0 block"
                        />
                      </div>
                    ))}
                </div>
              )}
              {activeTab.livePreviewUrl ? null : activeTab.pdfUrl !== undefined ? (
                <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900">
                  {/* Browser-native PDF viewer (Chrome/Edge/Firefox built-in).
                      No sandbox attr — the PDF viewer needs it removed. */}
                  <iframe
                    src={activeTab.pdfUrl}
                    title={activeTab.name}
                    className="w-full h-full border-0 block"
                  />
                </div>
              ) : (
              <>
              {/* Line Numbers Gutter */}
              <div
                ref={gutterRef}
                className={`${
                  isDiffMode ? "w-16" : isReviewing ? "w-14" : "w-10"
                } shrink-0 bg-white dark:bg-[#0a0a0a] border-r border-gray-100 dark:border-zinc-800 py-2 select-none overflow-hidden font-mono text-[12px] leading-6 text-gray-400 dark:text-zinc-500 flex flex-col items-end pr-2 gap-0 transition-all`}
              >
                {lines.map((_, i) => {
                  const lineNum = i + 1;
                  const isCurrent = lineNum === activeLine;
                  return (
                    <div
                      key={i}
                      onClick={() => jumpToLine(lineNum)}
                      className={`h-6 flex items-center justify-end font-mono text-[11px] cursor-pointer hover:text-blue-500 gap-2 ${
                        isDiffMode ? "gap-3" : ""
                      } ${isCurrent ? "text-blue-700 dark:text-blue-400 font-bold" : isReviewing ? "text-emerald-500 dark:text-emerald-400" : "text-gray-400 dark:text-zinc-600"}`}
                    >
                      {/* + sign for review mode */}
                      {isReviewing && <span className="w-3 text-left text-emerald-500 dark:text-emerald-400 font-bold">+</span>}
                      <span className="w-4 text-right">{lineNum}</span>
                      {isDiffMode && <span className="w-4 text-right text-emerald-600 dark:text-emerald-400">{lineNum}</span>}
                    </div>
                  );
                })}
              </div>

              {/* Code Canvas Container */}
              <div className="flex-1 relative overflow-hidden">
                {/* Highlight visual layer */}
                <div
                  ref={highlightRef}
                  className="absolute inset-0 py-2 overflow-hidden pointer-events-none font-mono text-[12px] leading-6 text-gray-800 dark:text-zinc-200"
                >
                  {renderHighlightedLines(lines)}
                </div>

                {/* Real Interactive Textarea */}
                <textarea
                  ref={textareaRef}
                  value={activeTab.content}
                  readOnly={effectiveReadOnly}
                  onChange={(e) => onContentChange(activeTab.path, e.target.value)}
                  onScroll={handleScroll}
                  onClick={handleSelectionChange}
                  onKeyUp={handleSelectionChange}
                  spellCheck={false}
                  className={`absolute inset-0 w-full h-full py-2 px-3 font-mono text-[12px] leading-6 bg-transparent text-transparent caret-gray-900 dark:caret-zinc-100 outline-none resize-none ${
                    wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                  } overflow-auto z-10`}
                  style={{
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    tabSize: 4,
                  }}
                />
              </div>
              </>
              )}
            </div>

            {/* Secondary Split Editor Panel */}
            {isSplitView && (
              <div className="w-1/2 border-l border-gray-200 dark:border-zinc-800 flex flex-col bg-gray-50/50 dark:bg-[#0d0d0d] relative overflow-hidden">
                <div className="h-7 px-3 bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500 font-mono">
                  <span>{activeTab.name} (对照视图 / Reference)</span>
                  <button
                    onClick={() => setIsSplitView(false)}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 p-3 font-mono text-[11px] leading-6 text-gray-500 dark:text-zinc-400 overflow-auto whitespace-pre">
                  {activeTab.content}
                </div>
              </div>
            )}

            {/* Document Outline Side Drawer */}
            {isOutlineOpen && (
              <div className="w-60 border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0e0e11] flex flex-col shrink-0 select-none font-sans">
                <div className="h-8 px-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-purple-500" />
                    <span>{t("代码结构与大纲", "Structure & Outline")}</span>
                  </div>
                  <button
                    onClick={() => setIsOutlineOpen(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {symbols.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 dark:text-zinc-500">
                      {t("未在该文件中检测到明确的函数或类", "No functions or classes found")}
                    </div>
                  ) : (
                    symbols.map((sym, idx) => (
                      <div
                        key={idx}
                        onClick={() => jumpToLine(sym.line)}
                        className="flex items-center justify-between px-2 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs cursor-pointer group transition-colors"
                      >
                        <span className="truncate font-mono text-[11px] text-gray-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {sym.label}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          L{sym.line}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Standalone Code View Popout Modal */}
      {isPopoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-zinc-700 rounded-md shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 font-sans">
            {/* Modal Window Top Header Bar */}
            <div className="h-10 px-4 bg-[#f0f0f3] dark:bg-[#1a1a1e] border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-zinc-200 font-mono">
                  {isRichTab ? t("独立预览视图", "Standalone Preview") : t("独立代码视图", "Standalone Code View")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isRichTab && (
                  <>
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-gray-300 dark:border-zinc-700 text-xs font-medium rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs mr-2"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
                  <span>{t("复制代码", "Copy Code")}</span>
                </button>
                <button
                  onClick={() => {
                    const newWin = window.open("", "_blank");
                    if (newWin) {
                      newWin.document.write(`
                        <html>
                          <head>
                            <title>${activeTab.name}</title>
                            <style>
                              body { margin: 0; background: #ffffff; color: #18181b; font-family: monospace; font-size: 13px; line-height: 1.6; padding: 24px; }
                              pre { margin: 0; white-space: pre-wrap; word-break: break-all; }
                            </style>
                          </head>
                          <body>
                            <pre>${activeTab.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title={t("在新窗口打开", "Open in New Window")}
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                  </>
                )}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title={isMaximized ? t("还原窗口", "Restore Window") : t("最大化", "Maximize")}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsPopoutOpen(false)}
                  className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  title={t("关闭", "Close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Tab Bar */}
            {tabs.length > 0 && (
              <div className="h-8 bg-[#f3f3f5] dark:bg-[#141417] border-b border-gray-200 dark:border-zinc-800 flex items-stretch overflow-x-auto scrollbar-none shrink-0 z-10 font-sans">
                {tabs.map((tab) => {
                  const isActive = tab.path === activeTab.path;
                  return (
                    <div
                      key={tab.path}
                      onClick={() => onSelectTab(tab.path)}
                      className={`group h-full px-3 border-t-[2.5px] border-r border-gray-200 dark:border-zinc-800 flex items-center gap-2 text-xs cursor-pointer transition-colors select-none shrink-0 ${
                        isActive
                          ? "bg-white dark:bg-[#0a0a0a] border-t-blue-600 dark:border-t-blue-500 text-gray-900 dark:text-zinc-100 font-medium"
                          : "bg-[#e8e8eb] dark:bg-[#18181b] border-t-transparent text-gray-600 dark:text-zinc-400 hover:bg-[#dfdfe3] dark:hover:bg-[#202024]"
                      }`}
                    >
                      {getTabIcon(tab.name)}
                      <span className={`truncate max-w-[140px] ${!isActive && tab.name.endsWith(".md") ? "italic" : ""}`}>
                        {tab.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseTab(tab.path);
                        }}
                        className={`p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-200/80 dark:hover:bg-zinc-700 transition-opacity ${
                          isActive ? "opacity-80 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                        title={t("关闭标签", "Close Tab")}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Canvas Body — 富内容标签渲染对应预览,代码标签渲染行号+高亮 */}
            <div className="flex-1 flex min-h-0 bg-white dark:bg-[#0a0a0a] relative overflow-hidden">
              {isRichTab ? (
                <div className="flex-1 min-h-0 flex items-center justify-center bg-[#fafafa] dark:bg-[#0b0b0b]">
                  {activeTab.livePreviewUrl ? (
                    <iframe
                      src={activeTab.livePreviewUrl}
                      title={activeTab.name}
                      className="w-full h-full border-0 block bg-white"
                    />
                  ) : isImageFile ? (
                    imageDataUrl ? (
                      <img
                        src={imageDataUrl}
                        alt={activeTab?.name || "image"}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      />
                    ) : null
                  ) : isBrowserTab ? (
                    <iframe
                      src={/^https?:\/\//i.test(browserUrlInput) ? browserUrlInput : `https://${browserUrlInput}`}
                      title={activeTab.name}
                      className="w-full h-full border-0 block bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  ) : activeTab.pdfUrl !== undefined ? (
                    <div className="flex-1 h-full bg-white dark:bg-zinc-900">
                      <iframe
                        src={activeTab.pdfUrl}
                        title={activeTab.name}
                        className="w-full h-full border-0 block"
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
              {/* Line Numbers Gutter */}
              <div className="w-10 shrink-0 bg-white dark:bg-[#0a0a0a] border-r border-gray-100 dark:border-zinc-800 py-2 select-none overflow-hidden font-mono text-[12px] leading-6 text-gray-400 dark:text-zinc-500 flex flex-col items-end pr-2">
                {lines.map((_, i) => (
                  <div key={i} className="h-6 flex items-center justify-end font-mono text-[11px] text-gray-400 dark:text-zinc-600">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code Content */}
              <div className="flex-1 p-0 overflow-auto font-mono text-[12px] leading-6 text-gray-900 dark:text-zinc-100 selection:bg-blue-100 dark:selection:bg-blue-900/60 select-text py-2">
                {renderHighlightedLines(lines)}
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
