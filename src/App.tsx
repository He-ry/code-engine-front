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
import {
  createThread,
  sendMessage,
  streamChat,
  approveTool,
  respondInput,
  interruptTurn,
} from "./lib/agentClient";
import { DEFAULT_PROJECTS, DEFAULT_CHAT_MESSAGES, EN_DEFAULT_CHAT_MESSAGES } from "./data/mockData";
import { Project, ChatMessage, ContextPill, FileNode, OpenTab, ToolExecution } from "./types";
import { Folder, ChevronDown, Sparkles, Check, Globe, Languages, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

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
  const { t, language, isLangSwitching, isThemeSwitching, theme, isLoggedIn, user, backendApiUrl, login, backendModels, defaultModel } = useSettings();
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // Default to the user's configured default model so the first send
  // doesn't fall through to an arbitrary enabled model.
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    defaultModel && defaultModel !== "Auto" ? defaultModel : "Auto"
  );
  const [selectedMode, setSelectedMode] = useState<string>(() =>
    language === "en-US" ? "Auto Accept Edits" : "自动接受编辑"
  );

  // Agent backend wiring
  const threadIdRef = useRef<string | null>(null);
  const activeAiMsgIdRef = useRef<string | null>(null);
  const pendingInputRef = useRef<{ inputId: string; question: string } | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    approvalId: string;
    toolName: string;
    arguments: Record<string, any>;
  } | null>(null);

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
    const threadId = threadIdRef.current;
    if (threadId && user?.token) {
      interruptTurn(backendApiUrl || "https://agent.hery.cloud", user.token, threadId).catch(
        (e) => console.warn("Interrupt failed:", e)
      );
    }
    setIsGenerating(false);
  };

  /** Map a backend model selection (by display name) to a DB record id.
   *
   * Resolution order:
   *   1. the user's configured default model (Settings → 默认模型)
   *   2. the model selected in the prompt input
   *   3. the first enabled model as a last resort
   */
  const resolveModelId = (modelName: string): string => {
    const models = backendModels;
    if (!models.length) return "";
    const candidates = [defaultModel, modelName];
    for (const cand of candidates) {
      if (!cand || cand === "Auto") continue;
      const hit = models.find((m) => m.name === cand || m.modelName === cand);
      if (hit) return hit.id || hit.modelName || "";
    }
    const enabled = models.find((m) => m.isEnabled !== false);
    return enabled?.id || enabled?.modelName || models[0]?.id || "";
  };

  /** Apply one SSE agent event to the active AI message. */
  const handleAgentEvent = (
    ev: { type: string; data: any },
    aiMsgId: string
  ) => {
    const { type, data } = ev;
    switch (type) {
      case "agent_message_delta": {
        const delta = data.delta || data.agentMessageDelta || "";
        if (!delta) break;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, text: m.text + delta, agentStatus: "generating" }
              : m
          )
        );
        break;
      }
      case "item_started": {
        const item = data.item || {};
        if (item.type === "command_execution") {
          const exec: ToolExecution = {
            id: item.id || item.callId || `te-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: item.tool || item.toolName || "tool",
            command: item.command || "",
            status: "running",
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    agentStatus: "executing_tool",
                    toolExecutions: [...(m.toolExecutions || []), exec],
                  }
                : m
            )
          );
        }
        break;
      }
      case "item_completed": {
        const item = data.item || {};
        if (item.type === "command_execution") {
          const id = item.id || item.callId || "";
          const status: ToolExecution["status"] =
            item.status === "failed" ? "error" : "success";
          const result =
            item.aggregatedOutput != null ? String(item.aggregatedOutput) : "";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    toolExecutions: (m.toolExecutions || []).map((te) =>
                      te.id === id ? { ...te, status, result } : te
                    ),
                  }
                : m
            )
          );
        }
        break;
      }
      case "user_input_required": {
        const inputId = data.inputId || data.input_id || "";
        const question = data.question || "";
        if (inputId) {
          pendingInputRef.current = { inputId, question };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    agentStatus: "asking_clarification",
                    clarificationQuestions: [
                      {
                        id: inputId,
                        question,
                        options: [
                          {
                            label: t("输入回答...", "Type your answer..."),
                            value: "custom",
                            isCustomInput: true,
                          },
                        ],
                      },
                    ],
                  }
                : m
            )
          );
        }
        break;
      }
      case "approval_required": {
        setPendingApproval({
          approvalId: data.approvalId || data.approval_id || "",
          toolName: data.toolName || data.tool_name || "",
          arguments: data.arguments || {},
        });
        break;
      }
      case "error": {
        const msg = data.message || data.error || "Agent error";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  text:
                    m.text + (m.text ? "\n\n" : "") + `> ⚠️ ${msg}`,
                  agentStatus: "completed",
                  isStreaming: false,
                }
              : m
          )
        );
        break;
      }
      default:
        break;
    }
  };

  /** Handle AskUser card submission → forward to the backend respond API. */
  const handleAskUserSubmit = async (
    questionId: string,
    _optionValue: string,
    optionLabel: string
  ) => {
    const pending = pendingInputRef.current;
    const threadId = threadIdRef.current;
    if (!pending || pending.inputId !== questionId || !threadId) return;

    // optionLabel is "Question\n答：Answer" — extract the answer after the label.
    let answer = "";
    for (const line of (optionLabel || "").split("\n")) {
      const m = line.match(/(?:答：|Answer:)\s*(.+)/);
      if (m) answer = m[1].trim();
    }
    if (!answer) answer = optionLabel || "";

    try {
      await respondInput(
        backendApiUrl || "https://agent.hery.cloud",
        user?.token || "",
        threadId,
        pending.inputId,
        answer
      );
    } catch (e) {
      console.warn("AskUser respond failed:", e);
    }
    pendingInputRef.current = null;
  };

  /** Approve or deny a pending sensitive-tool approval. */
  const handleApproval = async (approved: boolean) => {
    const p = pendingApproval;
    const threadId = threadIdRef.current;
    if (!p || !threadId) return;
    setPendingApproval(null);
    try {
      await approveTool(
        backendApiUrl || "https://agent.hery.cloud",
        user?.token || "",
        threadId,
        p.approvalId,
        approved
      );
    } catch (e) {
      console.warn("Approval failed:", e);
    }
  };

  // Send prompt to the CodeEngine agent backend (thread-based, SSE stream).
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

    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    const modelId = resolveModelId(model);
    if (!modelId) {
      setIsGenerating(false);
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: t("未配置可用模型", "No model configured"),
            description: t(
              "请先在设置中添加/启用一个 AI 模型，或在后端 config.yaml 中配置默认模型。",
              "Please add or enable an AI model in Settings, or configure a default model on the backend."
            ),
            duration: 5000,
          },
        })
      );
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const aiMsgId = (Date.now() + 1).toString();
    activeAiMsgIdRef.current = aiMsgId;
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      model,
      agentStatus: "thinking",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      // 1. Ensure a thread exists (reuse across turns).
      let threadId = threadIdRef.current;
      if (!threadId) {
        const created = await createThread(baseUrl, token, modelId, activeProject.name || "New Chat");
        threadId = created.threadId;
        threadIdRef.current = threadId;
      }

      // 2. Submit the user message (agent runs in the background).
      await sendMessage(baseUrl, token, threadId, modelId, text);

      // 3. Stream agent events and render them onto the active message.
      await streamChat(baseUrl, token, threadId, (ev) => {
        if (controller.signal.aborted) return;
        handleAgentEvent(ev, aiMsgId);
      }, controller.signal);

      // Mark the message complete when the stream ends normally.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, agentStatus: "completed", isStreaming: false }
            : m
        )
      );
    } catch (err: any) {
      const msg = err?.message || "Agent request failed";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                text:
                  m.text + (m.text ? "\n\n" : "") + `> ⚠️ ${msg}`,
                agentStatus: "completed",
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
      activeAiMsgIdRef.current = null;
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

      {/* Tool Approval Modal — sensitive tools (bash/write_file) need user consent */}
      <AnimatePresence>
        {pendingApproval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                    {t("工具执行需要审批", "Tool execution requires approval")}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
                    {pendingApproval.toolName || "tool"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800 px-3 py-2.5 text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto font-mono">
                {(() => {
                  try {
                    return JSON.stringify(pendingApproval.arguments, null, 2);
                  } catch {
                    return String(pendingApproval.arguments);
                  }
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => handleApproval(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <ShieldX className="w-3.5 h-3.5 text-rose-500" />
                  {t("拒绝", "Deny")}
                </button>
                <button
                  onClick={() => handleApproval(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-900 dark:bg-zinc-200 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t("允许", "Approve")}
                </button>
              </div>
            </motion.div>
          </motion.div>
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
                        onSelectOption={handleAskUserSubmit}
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
