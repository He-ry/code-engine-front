import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  GitBranch,
  Globe,
  Maximize2,
  X,
  RotateCw,
  Plus,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Smartphone,
  ExternalLink,
  Code2,
  Loader2,
} from "lucide-react";
import { FileNode } from "../types";
import { listFiles, readFile } from "../lib/projectApi";

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (file: FileNode) => void;
  onOpenBrowserTab?: (url?: string) => void;
  projectName: string;
  projectId?: string;
  width?: number;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  onOpenFile,
  onOpenBrowserTab,
  projectName,
  projectId,
  width = 320,
}) => {
  const { t, backendApiUrl, user } = useSettings();
  const [activeTab, setActiveTab] = useState<"explorer" | "search" | "git" | "browser">(
    "explorer"
  );
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [fileTree, setFileTree] = useState<Record<string, FileNode[]>>({});
  const [loadingPaths, setLoadingPaths] = useState<Record<string, boolean>>({});
  const [explorerError, setExplorerError] = useState<string | null>(null);

  // Browser state
  const [urlInput, setUrlInput] = useState("https://example.com");
  const [iframeUrl, setIframeUrl] = useState("https://example.com");
  const [browserMode, setBrowserMode] = useState<"mock" | "real">("mock");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const baseUrl = backendApiUrl || "https://agent.hery.cloud";
  const token = user?.token || "";

  // Load files for a given path
  const loadPath = useCallback(
    async (path: string) => {
      if (!projectId || !token) return;

      let alreadyLoaded = false;
      setFileTree((prev) => {
        if (prev[path]) alreadyLoaded = true;
        return prev;
      });
      if (alreadyLoaded) return;

      setLoadingPaths((prev) => ({ ...prev, [path]: true }));
      setExplorerError(null);
      try {
        const result = await listFiles(baseUrl, token, projectId, path);
        const nodes: FileNode[] = result.entries.map((e) => ({
          name: e.name,
          type: e.type,
          path: e.path,
          size: e.size ?? undefined,
          modifiedAt: e.modified_at ?? undefined,
        }));
        setFileTree((prev) => ({ ...prev, [path]: nodes }));
      } catch (err: any) {
        setExplorerError(err?.message || String(err));
      } finally {
        setLoadingPaths((prev) => ({ ...prev, [path]: false }));
      }
    },
    [projectId, token, baseUrl]
  );

  // Load root when projectId changes or explorer tab becomes active
  useEffect(() => {
    if (isOpen && activeTab === "explorer" && projectId) {
      setFileTree({});
      setExpandedFolders({});
      loadPath(".");
    }
  }, [isOpen, activeTab, projectId]);

  const toggleFolder = async (path: string) => {
    const isCurrentlyExpanded = expandedFolders[path];
    if (!isCurrentlyExpanded) {
      // Load children before expanding
      await loadPath(path);
    }
    setExpandedFolders((prev) => ({ ...prev, [path]: !isCurrentlyExpanded }));
  };

  const handleFileClick = async (node: FileNode) => {
    if (node.type === "folder") {
      await toggleFolder(node.path);
      return;
    }
    // Load file content
    if (!projectId || !token) return;
    try {
      const result = await readFile(baseUrl, token, projectId, node.path);
      const fileWithContent: FileNode = {
        ...node,
        content: result.content,
        size: result.size,
        modifiedAt: result.modified_at ?? undefined,
      };
      onOpenFile(fileWithContent);
    } catch (err: any) {
      console.warn("Failed to read file:", err);
      // Still open the file even if read fails (may have cached content)
      onOpenFile(node);
    }
  };

  const renderFileNode = (node: FileNode, level = 0) => {
    const isFolder = node.type === "folder";
    const isExpanded = expandedFolders[node.path];
    const children = fileTree[node.path];
    const isLoading = loadingPaths[node.path];

    return (
      <div key={node.path} className="font-sans text-xs select-none">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              handleFileClick(node);
            }
          }}
          style={{ paddingLeft: `${level * 12 + 10}px` }}
          className={`group flex items-center justify-between py-1 px-2 hover:bg-gray-100 dark:hover:bg-zinc-800/80 cursor-pointer text-gray-700 dark:text-zinc-300 transition-colors`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isFolder ? (
              isLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0 animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
              )
            ) : (
              <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {node.status && (
              <span className="text-[10px] font-bold text-emerald-600 px-1 font-mono">
                {node.status}
              </span>
            )}
            {node.hasDot && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Modified" />
            )}
          </div>
        </div>

        {isFolder && isExpanded && (
          <div>
            {isLoading && !children ? (
              <div style={{ paddingLeft: `${(level + 1) * 12 + 10}px` }} className="py-1 text-gray-400 dark:text-zinc-500">
                {t("加载中...", "Loading...")}
              </div>
            ) : children && children.length > 0 ? (
              children.map((child) => renderFileNode(child, level + 1))
            ) : (
              <div style={{ paddingLeft: `${(level + 1) * 12 + 10}px` }} className="py-1 text-gray-400 dark:text-zinc-500">
                {t("空文件夹", "Empty folder")}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: `${width}px`, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
          className="bg-white dark:bg-[#171717] flex flex-col h-full font-sans select-none shrink-0 z-20 shadow-xs overflow-hidden"
        >
          {/* Inner container constrained to target width so content doesn't wrap awkwardly while expanding */}
          <div style={{ width: `${width}px` }} className="flex flex-col h-full">
            {/* Top Icon Tabs */}
            <div className="h-8 bg-[#f3f3f5] dark:bg-[#0b0b0b] border-b border-gray-200/90 dark:border-[#2a2a2a] flex items-stretch justify-between shrink-0 font-sans">
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setActiveTab("explorer")}
                  className={`px-3 border-t-2 flex items-center gap-1 transition-colors text-xs cursor-pointer select-none border-r border-gray-200 dark:border-[#2a2a2a] ${
                    activeTab === "explorer"
                      ? "bg-white dark:bg-[#171717] border-t-blue-500 dark:border-t-[#3b82f6] text-gray-900 dark:text-[#ededed] font-medium"
                      : "border-t-transparent text-gray-500 dark:text-[#a3a3a3] hover:text-gray-800 dark:hover:text-[#ededed] hover:bg-gray-200/40 dark:hover:bg-[#262626]"
                  }`}
                  title={t("文件管理器", "File Explorer")}
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("search")}
                  className={`px-3 border-t-2 flex items-center gap-1 transition-colors text-xs cursor-pointer select-none border-r border-gray-200 dark:border-[#2a2a2a] ${
                    activeTab === "search"
                      ? "bg-white dark:bg-[#171717] border-t-blue-500 dark:border-t-[#3b82f6] text-gray-900 dark:text-[#ededed] font-medium"
                      : "border-t-transparent text-gray-500 dark:text-[#a3a3a3] hover:text-gray-800 dark:hover:text-[#ededed] hover:bg-gray-200/40 dark:hover:bg-[#262626]"
                  }`}
                  title={t("代码搜索", "Code Search")}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("git")}
                  className={`px-3 border-t-2 flex items-center gap-1 transition-colors text-xs cursor-pointer select-none border-r border-gray-200 dark:border-[#2a2a2a] ${
                    activeTab === "git"
                      ? "bg-white dark:bg-[#171717] border-t-blue-500 dark:border-t-[#3b82f6] text-gray-900 dark:text-[#ededed] font-medium"
                      : "border-t-transparent text-gray-500 dark:text-[#a3a3a3] hover:text-gray-800 dark:hover:text-[#ededed] hover:bg-gray-200/40 dark:hover:bg-[#262626]"
                  }`}
                  title={t("版本控制", "Version Control")}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("browser")}
                  className={`px-3 border-t-2 flex items-center gap-1.5 transition-colors text-xs cursor-pointer select-none border-r border-gray-200 dark:border-[#2a2a2a] ${
                    activeTab === "browser"
                      ? "bg-white dark:bg-[#171717] border-t-blue-500 dark:border-t-[#3b82f6] text-gray-900 dark:text-[#ededed] font-medium"
                      : "border-t-transparent text-gray-500 dark:text-[#a3a3a3] hover:text-gray-800 dark:hover:text-[#ededed] hover:bg-gray-200/40 dark:hover:bg-[#262626]"
                  }`}
                  title={t("CodeEngine 内置浏览器", "Built-in Browser")}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500 dark:text-[#3b82f6] shrink-0" />
                  <span className="text-[11px] font-sans">{t("浏览器", "Browser")}</span>
                </button>
              </div>

              <div className="flex items-center px-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded text-gray-500 dark:text-zinc-400 transition-colors"
                  title={t("关闭面板", "Close Panel")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Explorer Tab */}
        {activeTab === "explorer" && (
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-3 py-1 text-[11px] font-bold text-gray-500 dark:text-zinc-400 tracking-wider uppercase flex items-center justify-between">
              <span>{projectName.toUpperCase()}</span>
              {!projectId && (
                <span className="text-[10px] text-amber-500 normal-case tracking-normal">
                  {t("无项目", "No project")}
                </span>
              )}
            </div>
            <div className="mt-1">
              {explorerError ? (
                <div className="px-3 py-2 text-xs text-red-500 dark:text-red-400">
                  {explorerError}
                </div>
              ) : !projectId ? (
                <div className="px-3 py-2 text-xs text-gray-400 dark:text-zinc-500">
                  {t("请先选择一个项目", "Please select a project first")}
                </div>
              ) : fileTree["."] ? (
                fileTree["."].map((node) => renderFileNode(node))
              ) : loadingPaths["."] ? (
                <div className="px-3 py-2 text-xs text-gray-400 dark:text-zinc-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("加载文件树...", "Loading file tree...")}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="text-xs font-semibold text-gray-700 dark:text-zinc-200">{t("全局代码搜索", "Global Code Search")}</div>
            <input
              type="text"
              placeholder={t("搜索文件名、函数或类名...", "Search filenames, functions, classes...")}
              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-zinc-600"
            />
            <div className="text-[11px] text-gray-400 dark:text-zinc-500">{t(`在 ${projectName} 的 24 个文件中查找`, `Search across 24 files in ${projectName}`)}</div>
          </div>
        )}

        {/* Git Tab */}
        {activeTab === "git" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-zinc-200">
              <span>{t("源代码管理", "Source Control")}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">master</span>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200/80 dark:border-zinc-800 text-xs text-gray-600 dark:text-zinc-300 space-y-1">
              <div className="font-medium text-gray-800 dark:text-zinc-100">{t("未暂存的更改 (2)", "Unstaged Changes (2)")}</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">M core/engine.ts</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">U AGENTS.md</div>
            </div>
          </div>
        )}

        {/* Embedded CodeEngine Browser Tab (Image 5 Replica) */}
        {activeTab === "browser" && (
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden">
            {/* Browser Header Bar */}
            <div className="p-2 bg-white dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-zinc-800 flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-300">
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  type="button" 
                  onClick={() => {
                    setUrlInput("https://example.com");
                    setIframeUrl("https://example.com");
                    setBrowserMode("real");
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 dark:text-zinc-500"
                  title={t("返回首页", "Back Home")}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const url = urlInput.trim();
                    const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                    setIframeUrl("");
                    setTimeout(() => setIframeUrl(target), 50);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-600 dark:text-zinc-300"
                  title={t("刷新页面", "Refresh Page")}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* URL Address Bar */}
              <div className="flex-1 flex items-center px-2 py-1 bg-gray-100 dark:bg-zinc-900 rounded-md border border-gray-200 dark:border-zinc-700 text-[11px] text-gray-700 dark:text-zinc-200 font-mono">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const url = urlInput.trim();
                      if (url) {
                        const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                        setUrlInput(target);
                        setIframeUrl(target);
                        setBrowserMode("real");
                      }
                    }
                  }}
                  placeholder={t("输入网址并回车...", "Enter URL and press enter...")}
                  className="w-full bg-transparent border-none outline-none text-xs font-mono text-gray-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenBrowserTab) {
                      onOpenBrowserTab(urlInput);
                    }
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-600 dark:text-zinc-300"
                  title={t("在编辑器独立标签页中打开", "Open in standalone editor tab")}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = /^https?:\/\//i.test(urlInput) ? urlInput : `https://${urlInput}`;
                    window.open(target, "_blank");
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-600 dark:text-zinc-300"
                  title={t("在新标签页中打开真实浏览器", "Open in real browser in new tab")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const element = selectedElement ? null : "Title";
                    setSelectedElement(element);
                    setBrowserMode("mock");
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    selectedElement && browserMode === "mock"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  }`}
                  title={t("智能编辑", "Smart Edit")}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{t("编辑", "Edit")}</span>
                </button>
              </div>
            </div>

            {/* Browser Mode Toggles */}
            <div className="flex border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d0d] text-[11px]">
              <button
                type="button"
                onClick={() => setBrowserMode("mock")}
                className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-all ${
                  browserMode === "mock"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10"
                    : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                }`}
              >
                {t("模拟调试", "Mock Debug")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrowserMode("real");
                  // Ensure iframe url has correct format
                  const url = urlInput.trim();
                  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                  setIframeUrl(target);
                }}
                className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-all ${
                  browserMode === "real"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10"
                    : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                }`}
              >
                {t("内置网页渲染", "Embedded Rendering")}
              </button>
            </div>

            {/* Embedded Browser Stage Canvas */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-black overflow-hidden">
              {browserMode === "mock" ? (
                <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center text-center">
                  <div className="max-w-xs space-y-4">
                    <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
                      CodeEngine Browser
                    </h3>

                    <div className="grid grid-cols-1 gap-3 text-left">
                      <div
                        onClick={() => setSelectedElement("ProjectView")}
                        className={`p-3 bg-white dark:bg-zinc-900 border rounded-xl shadow-xs cursor-pointer transition-all ${
                          selectedElement === "ProjectView"
                            ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/50"
                            : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="text-xs font-medium text-gray-800 dark:text-zinc-200 mb-1">
                          {t("打开项目，选择元素进行调试", "Open project and select elements to debug")}
                        </div>
                        <div className="h-16 bg-gray-100 dark:bg-zinc-800 rounded-lg p-2 flex items-center justify-center relative overflow-hidden">
                          <div className="px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-mono shadow-xs">
                            {t("选中元素", "Selected Element")}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400">
                          <span>{t("我的项目", "My Project")}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">{t("发送到对话 ↵", "Send to chat ↵")}</span>
                        </div>
                      </div>

                      <div
                        onClick={() => setSelectedElement("FigmaView")}
                        className={`p-3 bg-white dark:bg-zinc-900 border rounded-xl shadow-xs cursor-pointer transition-all ${
                          selectedElement === "FigmaView"
                            ? "border-purple-500 ring-2 ring-purple-100 dark:ring-purple-900/50"
                            : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="text-xs font-medium text-gray-800 dark:text-zinc-200 mb-1">
                          {t("打开 Figma，选择元素生成代码", "Open Figma and select elements to generate code")}
                        </div>
                        <div className="h-16 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2 flex items-center justify-center relative">
                          <div className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-mono shadow-xs">
                            {t("发送到对话 ➔", "Send to chat ➔")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-[11px] text-gray-400 dark:text-zinc-500">
                      {t("不知道如何启动项目？", "Don't know how to start project?")}{" "}
                      <a href="#ai-start" className="text-gray-700 dark:text-zinc-300 underline font-medium">
                        {t("尝试使用 AI 启动 →", "Try starting with AI →")}
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col relative min-h-0">
                  {iframeUrl ? (
                    <iframe
                      src={iframeUrl}
                      className="w-full flex-1 bg-white border-none"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-zinc-500">
                      {t("正在加载网页...", "Loading webpage...")}
                    </div>
                  )}
                  {/* Floating helpful notice about Same Origin Policy */}
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/30 text-[10px] text-amber-800 dark:text-amber-300 flex items-center justify-between shrink-0 leading-normal">
                    <span>
                      {t("💡 提示：由于浏览器同源策略限制，部分第三方网站（如百度、谷歌）可能拒绝被嵌入。", "💡 Note: Due to browser same-origin policy, some third-party sites may refuse embedding.")}
                    </span>
                    <button
                      type="button"
                      onClick={() => window.open(urlInput, "_blank")}
                      className="font-semibold underline shrink-0 hover:text-amber-900 dark:hover:text-amber-100 ml-1.5"
                    >
                      {t("在新标签页打开", "Open in new tab")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
