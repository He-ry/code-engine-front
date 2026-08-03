/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { TopNavbar } from "./components/TopNavbar";
import { PromptInput } from "./components/PromptInput";
import { ChatStream } from "./components/ChatStream";
import { RightPanel } from "./components/RightPanel";
import { TerminalPanel } from "./components/TerminalPanel";
import { CodeEditor } from "./components/CodeEditor";
import { SettingsModal, SettingsCategory } from "./components/SettingsModal";
import { LoginPage } from "./components/LoginPage";
import { useSettings } from "./context/SettingsContext";
import { apiFetch } from "./lib/api";
import { DEFAULT_PROJECTS, DEFAULT_CHAT_MESSAGES, EN_DEFAULT_CHAT_MESSAGES } from "./data/mockData";
import { Project, ChatMessage, ContextPill, FileNode, OpenTab } from "./types";
import { Folder, ChevronDown, Sparkles, Check, Globe, Languages } from "lucide-react";

const getInitialProjectId = () => {
  const match = matchPath({ path: "/project/:projectId" }, window.location.pathname);
  if (match && match.params.projectId) {
    return match.params.projectId;
  }
  return "blackbox";
};

const getInitialSettingsState = () => {
  const match = matchPath({ path: "/settings/:category" }, window.location.pathname);
  if (match) {
    return {
      isOpen: true,
      category: (match.params.category as SettingsCategory) || "account"
    };
  }
  return {
    isOpen: false,
    category: "account" as SettingsCategory
  };
};

export default function App() {
  const { customProviders, apiKey: globalApiKey, t, language, isLangSwitching, isThemeSwitching, theme, isLoggedIn, user, backendApiUrl, login } = useSettings();
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const initialProjectId = getInitialProjectId();
  const initialSettings = getInitialSettingsState();
  const [activeProjectId, setActiveProjectId] = useState<string>(initialProjectId);
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(true);
  const [sidebarHovered, setSidebarHovered] = useState<boolean>(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterSidebar = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setSidebarHovered(true);
  };

  const handleMouseLeaveSidebar = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarHovered(false);
    }, 180);
  };

  const isSidebarOpen = sidebarPinned || sidebarHovered;

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(initialSettings.isOpen);
  const [settingsCategory, setSettingsCategory] = useState<SettingsCategory>(initialSettings.category);
  const [showLandingProjectSwitcher, setShowLandingProjectSwitcher] = useState<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();

  // 0. Handle OAuth callback (for both popup window and main window redirect)
  useEffect(() => {
    if (location.pathname.startsWith("/auth/callback")) {
      const searchString = location.search || (location.hash.startsWith("#") ? "?" + location.hash.substring(1) : location.hash);
      const searchParams = new URLSearchParams(searchString);
      
      const processAuth = async () => {
        let userProfile: any = null;
        const userParam = searchParams.get("user");
        if (userParam) {
          try {
            userProfile = JSON.parse(userParam);
          } catch (e) {
            // fallback
          }
        }
        
        if (!userProfile) {
          const token = searchParams.get("token") || searchParams.get("access_token") || searchParams.get("jwt");
          const refresh_token = searchParams.get("refresh_token") || searchParams.get("refreshToken");
          const code = searchParams.get("code");
          const state = searchParams.get("state") || "";

          const baseUrl = backendApiUrl || "https://agent.hery.cloud";

          const buildProfileFromMe = async (authToken: string, refreshToken?: string) => {
            try {
              const meRes = await apiFetch(`${baseUrl}/api/auth/me`, {
                headers: { "Authorization": `Bearer ${authToken}` }
              });
              if (meRes.ok) {
                const meData = await meRes.json();
                const u = meData.data || meData.user || meData;
                return {
                  name: u.username || "",
                  email: u.email || "",
                  avatarUrl: u.avatar || u.avatar_url || "",
                  provider: "github" as const,
                  token: authToken,
                  refreshToken: refreshToken,
                };
              }
            } catch {}
            return null;
          };

          if (token) {
            userProfile = await buildProfileFromMe(token, refresh_token);
          } else if (code) {
            try {
              const cbRes = await fetch(`${baseUrl}/api/auth/oauth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
              if (cbRes.ok) {
                const cbData = await cbRes.json();
                const tokenFromCb = cbData.access_token || cbData.token || cbData.data?.access_token;
                const refTokenFromCb = cbData.refresh_token || cbData.data?.refresh_token;
                if (tokenFromCb) {
                  userProfile = await buildProfileFromMe(tokenFromCb, refTokenFromCb);
                }
              }
            } catch (err) {
              console.error("Error exchanging code:", err);
            }
          }
        }
        
        if (userProfile) {
          // Always login locally in this window context to write to localStorage, 
          // allowing the parent window to sync via the storage event listener in case postMessage gets blocked or swallowed.
          login(userProfile);
          if (window.opener) {
            try {
              window.opener.postMessage({
                type: "OAUTH_AUTH_SUCCESS",
                user: userProfile
              }, "*");
            } catch (err) {
              console.warn("postMessage to opener failed:", err);
            }
            setTimeout(() => window.close(), 500);
          } else {
            navigate("/", { replace: true });
          }
        } else {
          const error = searchParams.get("error") || searchParams.get("error_description") || "OAuth authorization failed";
          if (window.opener) {
            try {
              window.opener.postMessage({
                type: "OAUTH_AUTH_FAILURE",
                error
              }, "*");
            } catch (err) {
              console.warn("postMessage to opener failed:", err);
            }
            setTimeout(() => window.close(), 500);
          } else {
            navigate("/", { replace: true });
          }
        }
      };

      processAuth();
    }
  }, [location.pathname, location.search, login, navigate, backendApiUrl]);

  // 1. Sync state FROM URL when URL changes
  useEffect(() => {
    // Match /project/:projectId
    const matchProject = matchPath(
      { path: "/project/:projectId" },
      location.pathname
    );
    if (matchProject) {
      const { projectId } = matchProject.params;
      if (projectId && projects.some(p => p.id === projectId)) {
        if (activeProjectId !== projectId) {
          setActiveProjectId(projectId);
        }
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
      }
      return;
    }

    // Match /settings/:category
    const matchSettings = matchPath(
      { path: "/settings/:category" },
      location.pathname
    );
    if (matchSettings) {
      const { category } = matchSettings.params;
      if (category) {
        if (settingsCategory !== category) {
          setSettingsCategory(category as SettingsCategory);
        }
      }
      if (!isSettingsOpen) {
        setIsSettingsOpen(true);
      }
      return;
    }

    // Default route
    if (location.pathname === "/" || location.pathname === "") {
      navigate(`/project/${activeProjectId}`, { replace: true });
    }
  }, [location.pathname, projects, navigate]);

  const handleOpenSettings = (category?: SettingsCategory) => {
    const cat = category || settingsCategory;
    navigate(`/settings/${cat}`);
  };

  // Panels state - default closed by user request, tracked per project
  const [rightPanelOpenMap, setRightPanelOpenMap] = useState<Record<string, boolean>>({});
  const rightPanelOpen = rightPanelOpenMap[activeProjectId] ?? false;
  const setRightPanelOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    setRightPanelOpenMap((prev) => {
      const currentVal = prev[activeProjectId] ?? false;
      const newVal = typeof open === "function" ? open(currentVal) : open;
      return {
        ...prev,
        [activeProjectId]: newVal,
      };
    });
  };
  const [terminalOpen, setTerminalOpen] = useState<boolean>(false);

  // Editor Tabs State - Default closed by user request
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);

  // Active chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    language === "en-US" ? EN_DEFAULT_CHAT_MESSAGES : DEFAULT_CHAT_MESSAGES
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("Auto");
  const [selectedMode, setSelectedMode] = useState<string>(() =>
    language === "en-US" ? "Auto Accept Edits" : "自动接受编辑"
  );

  // Sync default chat messages on language switch if user hasn't added custom messages
  useEffect(() => {
    if (messages.length === 6 && messages[0].id === "msg-1") {
      setMessages(language === "en-US" ? EN_DEFAULT_CHAT_MESSAGES : DEFAULT_CHAT_MESSAGES);
    }
    setSelectedMode(language === "en-US" ? "Auto Accept Edits" : "自动接受编辑");
  }, [language]);

  // Dynamic Panel Resizing state
  const [chatWidth, setChatWidth] = useState<number>(380);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(320);
  const [isResizingChat, setIsResizingChat] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);

  const handleChatResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChat(true);

    const startX = e.clientX;
    const startWidth = chatWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(260, Math.min(700, startWidth + delta));
      setChatWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingChat(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);

    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.max(200, Math.min(650, startWidth + delta));
      setRightPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingRight(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[1];

  // New task action
  const handleNewTask = () => {
    setMessages([]);
  };

  // Open file in editor tab
  const handleOpenFile = (file: FileNode) => {
    if (file.type === "folder") return;

    const existing = openTabs.find((t) => t.path === file.path);
    if (existing) {
      setActiveTabPath(file.path);
    } else {
      const newTab: OpenTab = {
        path: file.path,
        name: file.name,
        content: file.content || `// ${file.name} content\n`,
      };
      setOpenTabs([...openTabs, newTab]);
      setActiveTabPath(file.path);
    }
  };

  // Open browser in standalone editor tab
  const handleOpenBrowserTab = (url?: string) => {
    const browserPath = "browser://preview";
    const initialUrl = url || "https://example.com";
    const existing = openTabs.find((t) => t.path === browserPath);
    if (existing) {
      setOpenTabs((prev) =>
        prev.map((t) => (t.path === browserPath ? { ...t, content: initialUrl } : t))
      );
    } else {
      const newTab: OpenTab = {
        path: browserPath,
        name: t("浏览器", "Browser"),
        content: initialUrl,
        language: "browser",
      };
      setOpenTabs((prev) => [...prev, newTab]);
    }
    setActiveTabPath(browserPath);
  };

  // Close tab
  const handleCloseTab = (path: string) => {
    const nextTabs = openTabs.filter((t) => t.path !== path);
    setOpenTabs(nextTabs);
    if (activeTabPath === path) {
      setActiveTabPath(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].path : null);
    }
  };

  // Content edit in editor
  const handleContentChange = (path: string, newContent: string) => {
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.path === path ? { ...t, content: newContent, isModified: true } : t
      )
    );
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Send prompt to backend API
  const handleSendPrompt = async (
    text: string,
    pills: ContextPill[],
    mode: string,
    model: string
  ) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString(),
      contextPills: pills,
      mode,
      model,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const customProvider = customProviders.find((p) => p.name === model);
      const baseUrl = backendApiUrl ? backendApiUrl : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }
      const res = await apiFetch(`${baseUrl}/api/chat`, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          prompt: text,
          model,
          mode,
          project: activeProject.name,
          contextPills: pills.map((p) => p.name),
          customProvider: customProvider ? {
            baseUrl: customProvider.baseUrl,
            apiKey: customProvider.apiKey,
            protocol: customProvider.protocol,
            modelName: customProvider.modelName,
          } : null,
          globalApiKey,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Check if prompt requires code generation snippets
      let codeSnippets: { filename: string; code: string; language: string }[] = [];
      if (
        text.includes("代码") ||
        text.includes("重构") ||
        text.includes("算法") ||
        text.includes("PPT")
      ) {
        codeSnippets = [
          {
            filename: "core/engine.ts",
            language: "typescript",
            code: `// CodeX Generated Execution Routine for ${activeProject.name}\nimport { AICompletionEngine } from './completion';\n\nexport async function runTaskPipeline(input: string) {\n  console.log('[CodeX] Task started for:', input);\n  return { success: true, timestamp: Date.now() };\n}`,
          },
        ];

        // Also open core/engine.ts in editor tabs automatically
        handleOpenFile({
          name: "engine.ts",
          type: "file",
          path: "core/engine.ts",
          content: `// CodeX Generated Execution Routine for ${activeProject.name}\nimport { AICompletionEngine } from './completion';\n\nexport async function runTaskPipeline(input: string) {\n  console.log('[CodeX] Task started for:', input);\n  return { success: true, timestamp: Date.now() };\n}`,
        });
      }

      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: "ai",
        text: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model,
        agentStatus: "completed",
        thinkingProcess: {
          durationSec: parseFloat((Math.random() * 2 + 1).toFixed(1)),
          thoughtText: t(
            `1. 接收输入: "${text}"，解构需求与涉及的文件与模块。\n2. 调度项目 ${activeProject.name} (分支: ${activeProject.branch}) 关联的规则链条。\n3. 执行工作区静态检查与代码重构策略 (${mode})，确保变更可平滑部署。`,
            `1. Received input: "${text}", analyzing requirements and involved files/modules.\n2. Dispatched rule chain for project ${activeProject.name} (branch: ${activeProject.branch}).\n3. Executed static check and code refactoring strategy (${mode}), ensuring smooth deployment.`
          ),
          isCollapsed: false,
        },
        toolExecutions: [
          {
            id: `te-${Date.now()}-1`,
            name: "view_file",
            args: `path: '${activeProject.name}/workspace'`,
            status: "success",
            result: t("读取 86 行配置文件", "Read 86 lines config file"),
            duration: "90ms",
          },
          {
            id: `te-${Date.now()}-2`,
            name: "lint_applet",
            args: "checker: 'TypeScript compiler'",
            status: "success",
            result: t("0 错误", "0 errors"),
            duration: "180ms",
          },
        ],
        codeSnippets,
      };

      setMessages((prev) => [...prev, aiMsg]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let partialText = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleaned = line.trim();
            if (!cleaned) continue;
            if (cleaned.startsWith("data: ")) {
              const dataStr = cleaned.slice(6).trim();
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  partialText += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === aiMsgId ? { ...m, text: partialText } : m))
                  );
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: t(
          `已根据需求完成对 ${activeProject.name} 的分析与调整。已应用模式：${mode}`,
          `Analysis and adjustments for ${activeProject.name} completed as requested. Mode applied: ${mode}`
        ),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model,
        agentStatus: "completed",
        thinkingProcess: {
          durationSec: 1.5,
          thoughtText: t(
            `1. 解析指令内容 "${text}"。\n2. 扫描本地工作区并匹配修改模板。\n3. 应用调整并更新缓存状态。`,
            `1. Parsed instruction content "${text}".\n2. Scanned local workspace and matched modification templates.\n3. Applied adjustments and updated cache status.`
          ),
          isCollapsed: false,
        },
        toolExecutions: [
          {
            id: `te-${Date.now()}-1`,
            name: "edit_file",
            args: `target: '${activeProject.name}'`,
            status: "success",
            result: t("修改完成", "Modification complete"),
            duration: "110ms",
          },
        ],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased relative">
      {/* Global Language Switch Animation Overlay & Toast */}
      <AnimatePresence>
        {isLangSwitching && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-gray-900/15 dark:bg-black/30 backdrop-blur-[2px] pointer-events-none z-[99]"
            />
            <motion.div
              initial={{ opacity: 0, y: -28, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -28, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-2 bg-gray-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 backdrop-blur-md rounded-full shadow-2xl text-xs font-medium border border-gray-700/60 dark:border-zinc-300/60 pointer-events-none"
            >
              <Globe className="w-4 h-4 animate-spin text-gray-400 dark:text-zinc-500 shrink-0" />
              <span>
                {language === "en-US" ? "Switching to English (US)..." : "正在切换至 简体中文..."}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-700/60 dark:bg-zinc-200/60 text-gray-200 dark:text-zinc-800 font-semibold ml-0.5">
                {language === "en-US" ? "EN" : "ZH"}
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global Theme Switch Animation Overlay & Toast */}
      <AnimatePresence>
        {isThemeSwitching && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-gray-900/15 dark:bg-black/30 backdrop-blur-[2px] pointer-events-none z-[99]"
            />
            <motion.div
              initial={{ opacity: 0, y: -28, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -28, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-2 bg-gray-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 backdrop-blur-md rounded-full shadow-2xl text-xs font-medium border border-gray-700/60 dark:border-zinc-300/60 pointer-events-none"
            >
              <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-500 shrink-0 animate-pulse" />
              <span>
                {theme === "dark"
                  ? language === "en-US" ? "Switched to Dark Mode" : "已切换至 深色模式"
                  : theme === "light"
                  ? language === "en-US" ? "Switched to Light Mode" : "已切换至 浅色模式"
                  : language === "en-US" ? "Following System Theme" : "已切换至 跟随系统"}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-700/60 dark:bg-zinc-200/60 text-gray-200 dark:text-zinc-800 font-semibold ml-0.5">
                {theme.toUpperCase()}
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full-screen Settings Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal
            key="settings-modal"
            isOpen={isSettingsOpen}
            onClose={() => {
              navigate(`/project/${activeProjectId}`);
            }}
            initialCategory={settingsCategory}
            onCategoryChange={(cat) => {
              navigate(`/settings/${cat}`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <TopNavbar
        projectName={activeProject.name}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => {
          setMessages([]);
          setOpenTabs([]);
          setActiveProjectId(id);
          if (!isSettingsOpen) {
            navigate(`/project/${id}`);
          }
        }}
        sidebarPinned={sidebarPinned}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebarPin={() => setSidebarPinned(!sidebarPinned)}
        onMouseEnterSidebar={handleMouseEnterSidebar}
        onMouseLeaveSidebar={handleMouseLeaveSidebar}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        rightPanelOpen={rightPanelOpen}
        onOpenExternal={() => setRightPanelOpen(true)}
      />

      {/* Main Container Area with Sidebar and Workspace */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={(id) => {
            setMessages([]);
            setActiveProjectId(id);
            if (!isSettingsOpen) {
              navigate(`/project/${id}`);
            }
          }}
          onNewTask={handleNewTask}
          pinned={sidebarPinned}
          isOpen={isSidebarOpen}
          onTogglePin={() => setSidebarPinned(!sidebarPinned)}
          onMouseEnter={handleMouseEnterSidebar}
          onMouseLeave={handleMouseLeaveSidebar}
          onOpenSettings={handleOpenSettings}
        />

        {/* Right Main Area (Workspace + Terminal) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden">
          {/* Middle Main Workspace split: Chat Stage | Code Editor | File Explorer */}
          <div
            className={`flex-1 flex min-h-0 relative overflow-hidden ${
              isResizingChat || isResizingRight ? "select-none cursor-col-resize" : ""
            }`}
          >
            {/* Chat Stage Pane */}
            <motion.div
              animate={{
                width: openTabs.length > 0 
                  ? `${chatWidth}px` 
                  : rightPanelOpen 
                    ? `calc(100% - ${rightPanelWidth}px)` 
                    : "100%",
              }}
              transition={isResizingChat || isResizingRight ? { duration: 0 } : { duration: 0.28, ease: [0.2, 0, 0, 1] }}
              className="flex flex-col bg-[#f5f5f7] dark:bg-zinc-950 relative overflow-y-auto shrink-0 h-full"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeProjectId}
                  initial={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, scale: 0.98, filter: "blur(4px)" }}
                  transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
                  className="flex-1 flex flex-col min-h-0 h-full"
                >
                  {messages.length === 0 ? (
                    /* Initial Landing View */
                    <div className="flex-1 flex flex-col items-center justify-center p-4 select-none">
                      <div className="w-full text-center space-y-2 mb-5">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 font-sans">
                          Think it. Build it.
                        </h1>

                        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-zinc-400 font-sans">
                          <span>{t("在", "In")}</span>
                          <div className="relative inline-block">
                            <div
                              onClick={() => setShowLandingProjectSwitcher(!showLandingProjectSwitcher)}
                              className="inline-flex items-center gap-1 font-medium text-gray-800 dark:text-zinc-200 bg-gray-100/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <Folder className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
                              <span>{activeProject.name}</span>
                              <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-zinc-400 transition-transform duration-150 ${showLandingProjectSwitcher ? "rotate-180" : ""}`} />
                            </div>

                            <AnimatePresence>
                              {showLandingProjectSwitcher && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setShowLandingProjectSwitcher(false)}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-xl z-40 py-1.5 overflow-hidden text-left"
                                  >
                                    <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-[#a3a3a3] uppercase tracking-wider">
                                      {t("切换项目", "Switch Project")}
                                    </div>
                                    {projects.map((proj) => {
                                      const isSelected = proj.id === activeProjectId;
                                      return (
                                        <button
                                          key={proj.id}
                                          type="button"
                                          onClick={() => {
                                            setMessages([]);
                                            setOpenTabs([]);
                                            setActiveProjectId(proj.id);
                                            if (!isSettingsOpen) {
                                              navigate(`/project/${proj.id}`);
                                            }
                                            setShowLandingProjectSwitcher(false);
                                          }}
                                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                            isSelected
                                              ? "bg-gray-100 dark:bg-[#262626] text-gray-900 dark:text-[#ededed] font-semibold"
                                              : "text-gray-700 dark:text-[#a3a3a3] hover:bg-gray-50 dark:hover:bg-[#262626]/60"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <Folder className="w-3.5 h-3.5 text-gray-400 dark:text-[#a3a3a3] shrink-0" />
                                            <span className="truncate">{proj.name}</span>
                                          </div>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#3b82f6] shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                          <span>{t("中开启对话", "Start conversation")}</span>
                        </div>
                      </div>

                      {/* Prompt Card with integrated Recommendation Cards */}
                      <PromptInput
                        onSend={handleSendPrompt}
                        projectName={activeProject.name}
                        branchName={activeProject.branch}
                        selectedModel={selectedModel}
                        onModelChange={setSelectedModel}
                        selectedMode={selectedMode}
                        onModeChange={setSelectedMode}
                        isGenerating={isGenerating}
                        onStop={handleStopGeneration}
                        onSelectRecommendation={(promptText) =>
                          handleSendPrompt(
                            promptText,
                            [],
                            t("自动接受编辑", "Auto Accept Edits"),
                            "GLM-5.2-内部"
                          )
                        }
                      />
                    </div>
                  ) : (
                    /* Chat Stream View */
                    <div className="flex-1 flex flex-col min-h-0">
                      <ChatStream
                        messages={messages}
                        isGenerating={isGenerating}
                        onSelectOption={(questionId, optionValue, optionLabel) => {
                          handleSendPrompt(
                            t(`已选择方案：${optionLabel}`, `Selected option: ${optionLabel}`),
                            [{ id: "opt-1", name: optionValue, type: "ask" }],
                            t("自动接受编辑", "Auto Accept Edits"),
                            "DeepSeek-V3"
                          );
                        }}
                      />
                      <div className="p-3 bg-[#f5f5f7]/90 dark:bg-zinc-950/90 backdrop-blur-xs">
                        <PromptInput
                          onSend={handleSendPrompt}
                          projectName={activeProject.name}
                          branchName={activeProject.branch}
                          selectedModel={selectedModel}
                          onModelChange={setSelectedModel}
                          selectedMode={selectedMode}
                          onModeChange={setSelectedMode}
                          isGenerating={isGenerating}
                          onStop={handleStopGeneration}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Resizer 1 (Chat <-> Editor) */}
            <AnimatePresence>
              {openTabs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onMouseDown={handleChatResizeStart}
                  className={`w-[1px] relative bg-gray-200/90 dark:bg-[#222222] hover:bg-blue-500 active:bg-blue-600 cursor-col-resize shrink-0 z-30 transition-colors select-none ${
                    isResizingChat ? "bg-blue-600 w-[2px]" : ""
                  }`}
                  title={t("拖拽调整对话框与代码区宽度", "Drag to resize chat and editor")}
                >
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resizer between Chat & RightPanel (when no tabs are open) */}
            <AnimatePresence>
              {openTabs.length === 0 && rightPanelOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onMouseDown={handleRightResizeStart}
                  className={`w-[1px] relative bg-gray-200/90 dark:bg-[#222222] hover:bg-blue-500 active:bg-blue-600 cursor-col-resize shrink-0 z-30 transition-colors select-none ${
                    isResizingRight ? "bg-blue-600 w-[2px]" : ""
                  }`}
                  title={t("拖拽调整文件树宽度", "Drag to resize file tree")}
                >
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Integrated Code Editor Pane */}
            <AnimatePresence initial={false}>
              {openTabs.length > 0 && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{
                    width: rightPanelOpen
                      ? `calc(100% - ${chatWidth + rightPanelWidth}px)`
                      : `calc(100% - ${chatWidth}px)`,
                    opacity: 1,
                  }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={isResizingChat || isResizingRight ? { duration: 0 } : { duration: 0.28, ease: [0.2, 0, 0, 1] }}
                  className="flex flex-col min-w-0 h-full relative overflow-hidden shrink-0"
                >
                  <CodeEditor
                    tabs={openTabs}
                    activeTabPath={activeTabPath}
                    onSelectTab={(path) => setActiveTabPath(path)}
                    onCloseTab={handleCloseTab}
                    onContentChange={handleContentChange}
                    onCloseEditor={() => setOpenTabs([])}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resizer 2 (Editor <-> Right Panel) */}
            <AnimatePresence>
              {rightPanelOpen && openTabs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onMouseDown={handleRightResizeStart}
                  className={`w-[1px] relative bg-gray-200/90 dark:bg-[#222222] hover:bg-blue-500 active:bg-blue-600 cursor-col-resize shrink-0 z-30 transition-colors select-none ${
                    isResizingRight ? "bg-blue-600 w-[2px]" : ""
                  }`}
                  title={t("拖拽调整代码区与文件树宽度", "Drag to resize editor and file tree")}
                >
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right Panel (File Explorer / CodeEngine Browser) */}
            <RightPanel
              isOpen={rightPanelOpen}
              onClose={() => setRightPanelOpen(false)}
              onOpenFile={handleOpenFile}
              onOpenBrowserTab={handleOpenBrowserTab}
              projectName={activeProject.name}
              width={rightPanelWidth}
            />
          </div>

          {/* Bottom Dock Control Bar (to toggle terminal) */}
          {!terminalOpen && (
            <div className="h-6 bg-gray-50 dark:bg-[#0b0b0b] border-t border-gray-200 dark:border-[#2a2a2a] px-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-[#a3a3a3] select-none shrink-0">
              <button
                onClick={() => setTerminalOpen(true)}
                className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-[#ededed] transition-colors font-mono cursor-pointer"
              >
                <span>{t("打开终端 & 输出控制台", "Open Terminal & Output Console")}</span>
              </button>
              <div className="flex items-center gap-3">
                <span>{t("分支: ", "Branch: ")}{activeProject.branch}</span>
                <span>{t("端口: 3000", "Port: 3000")}</span>
              </div>
            </div>
          )}

          {/* Integrated Terminal Panel */}
          <TerminalPanel
            isOpen={terminalOpen}
            onClose={() => setTerminalOpen(false)}
            projectName={activeProject.name}
            branchName={activeProject.branch}
          />
        </div>
      </div>
    </div>
  );
}
