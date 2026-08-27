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
import { PlanProgressCard } from "./components/PlanProgressCard";
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
  loadHistory,
} from "./lib/agentClient";
import { listProjects, createProject, writeFile, deleteFile } from "./lib/projectApi";
import { listThreads, isOfficePreviewPath, isPdfPath } from "./lib/agentClient";
import { getBridgeStatus } from "./lib/browserBridgeApi";
import { DEFAULT_CHAT_MESSAGES, EN_DEFAULT_CHAT_MESSAGES } from "./data/mockData";
import { Project, ChatMessage, ContextPill, FileNode, OpenTab, ToolExecution, ToolBlock, PlanStep, ClarificationQuestion } from "./types";
import { blocksFromLegacyFields } from "./lib/blocks";
import { Folder, ChevronDown, Sparkles, Check, Globe, Languages, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

const getInitialProjectId = () => {
  const match = matchPath({ path: "/project/:projectId" }, window.location.pathname);
  if (match && match.params.projectId) {
    return match.params.projectId;
  }
  return "";  // will be set after projects load
};

// Chrome extension Side Panel mode: the app is embedded in the bridge
// extension's iframe with ?sidepanel=1 — compact chat layout + thread
// binding pushed to the extension via localStorage.
const isSidepanel = new URLSearchParams(window.location.search).get("sidepanel") === "1";

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
  const { t, language, isLangSwitching, isThemeSwitching, theme, isLoggedIn, user, backendApiUrl, login, backendModels, defaultModel, approvalPolicy } = useSettings();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const initialProjectId = getInitialProjectId();
  const initialSettings = getInitialSettingsState();
  const [activeProjectId, setActiveProjectId] = useState<string>(initialProjectId);
  const activeProjectIdRef = useRef<string>(initialProjectId);
  // Keep ref in sync so async callbacks always read the latest project id.
  React.useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);
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

  // 1. Load projects from backend
  useEffect(() => {
    if (!isLoggedIn) return;
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token;
    if (!token) return;

    listProjects(baseUrl, token)
      .then(async (data) => {
        // Map backend fields to frontend Project shape
        const mapped: Project[] = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          rootPath: p.root_path,
          gitRemote: p.git_remote,
          gitBranch: p.git_branch || p.branch,
          description: p.description,
          threadCount: p.thread_count,
          conversations: [],
          isActive: false,
        }));

        // No projects yet — auto-create a default one so the chat API always
        // has a project_id to send.
        if (mapped.length === 0) {
          try {
            const p: any = await createProject(baseUrl, token, {
              name: t("默认项目", "Default Project"),
            });
            mapped.push({
              id: p.id,
              name: p.name,
              rootPath: p.root_path || p.rootPath,
              gitRemote: p.git_remote || p.gitRemote,
              gitBranch: p.git_branch || p.gitBranch || "main",
              description: p.description,
              conversations: [],
              isActive: false,
            });
          } catch (err) {
            console.warn("Failed to auto-create default project:", err);
          }
        }

        setProjects(mapped);
        setProjectsLoading(false);

        // If no active project is set yet, default to the first one
        if (!activeProjectId && mapped.length > 0) {
          const firstId = mapped[0].id;
          setActiveProjectId(firstId);
          navigate(`/project/${firstId}`, { replace: true });
        }
      })
      .catch((err) => {
        console.warn("Failed to load projects:", err);
        setProjectsLoading(false);
      });
  }, [isLoggedIn, user?.token]);

  // 2. Sync state FROM URL when URL changes
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

  // Clear editor tabs when switching projects — files belong to the project,
  // not to individual conversations.
  useEffect(() => {
    setOpenTabs([]);
    setActiveTabPath(null);
  }, [activeProjectId]);

  // Active chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // Live task plan (from update_plan / plan_delta) shown above the input.
  // Persists across turns until the next plan overwrites it.
  const [activePlan, setActivePlan] = useState<{ steps: PlanStep[]; explanation: string } | null>(null);
  const [resolvedThreadIds, setResolvedThreadIds] = useState<Set<string>>(new Set());
  const resolvedTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** Show checkmark briefly then auto-dismiss after 3 s. */
  const markThreadResolved = (threadId: string) => {
    const existing = resolvedTimersRef.current.get(threadId);
    if (existing) clearTimeout(existing);
    setResolvedThreadIds((prev) => new Set([...prev, threadId]));
    const timer = setTimeout(() => {
      setResolvedThreadIds((prev) => {
        const next = new Set(prev);
        next.delete(threadId);
        return next;
      });
      resolvedTimersRef.current.delete(threadId);
    }, 1000);
    resolvedTimersRef.current.set(threadId, timer);
  };
  // Default to the user's configured default model so the first send
  // doesn't fall through to an arbitrary enabled model.
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    defaultModel && defaultModel !== "Auto" ? defaultModel : "Auto"
  );

  // Agent backend wiring
  const threadIdRef = useRef<string | null>(null);
  // Latest selected model name for non-React callers (attachment upload path)
  const selectedModelRef = useRef(selectedModel);
  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  // Browser bridge (sidepanel mode): mirror threadIdRef in state so the
  // extension binding effect can react to every assignment site.
  const [bridgeThreadId, setBridgeThreadId] = useState<string | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [sidepanelThreads, setSidepanelThreads] = useState<{ id: string; name?: string }[]>([]);
  const applyThreadId = (next: string | null) => {
    threadIdRef.current = next;
    setBridgeThreadId(next);
  };

  const activeAiMsgIdRef = useRef<string | null>(null);
  const pendingInputRef = useRef<{ inputId: string } | null>(null);
  // Highest SSE event seq seen on the current stream — replayed events after
  // a reconnect would otherwise double-append to delta-accumulating blocks.
  // Reset whenever a new stream (turn) opens.
  const lastSeqRef = useRef(0);
  // File-tree refresh counter — bump after any operation that mutates files on disk
  const [fileTreeVersion, setFileTreeVersion] = useState(0);

  const [pendingApprovals, setPendingApprovals] = useState<Record<string, {
    approvalId: string;
    toolName: string;
    arguments: Record<string, any>;
  }>>({});

  // Sync default chat messages on language switch if user hasn't added custom messages
  useEffect(() => {
    if (messages.length === 6 && messages[0].id === "msg-1") {
      setMessages(language === "en-US" ? EN_DEFAULT_CHAT_MESSAGES : DEFAULT_CHAT_MESSAGES);
    }
  }, [language]);

  // -- Sidepanel (browser bridge) mode ---------------------------------------

  // Push the current thread binding to the extension (content.js polls
  // localStorage.app_browser_bridge + listens for ce-bridge-update).
  // Runs in every mode — the chat normally lives in a regular tab, and the
  // latest app tab to switch threads owns the binding.
  useEffect(() => {
    try {
      localStorage.setItem("app_browser_bridge", JSON.stringify({ threadId: bridgeThreadId, ts: Date.now() }));
      window.dispatchEvent(new CustomEvent("ce-bridge-update"));
    } catch {
      // storage unavailable — extension falls back to 1s polling
    }
  }, [bridgeThreadId]);

  // Extension connection indicator (5s poll; green only when connected).
  useEffect(() => {
    if (!isSidepanel) return;
    let alive = true;
    const poll = async () => {
      const st = await getBridgeStatus(backendApiUrl || "https://agent.hery.cloud", user?.token || "");
      if (alive) setBridgeConnected(st.connected);
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isSidepanel, backendApiUrl, user?.token]);

  // Thread dropdown list (threads of the active project; reloaded when a
  // thread is created/switched so fresh threads appear).
  useEffect(() => {
    if (!isSidepanel || !activeProjectId || !user?.token) return;
    listThreads(backendApiUrl || "https://agent.hery.cloud", user.token, activeProjectId)
      .then((threads) =>
        setSidepanelThreads(
          (threads || [])
            .filter((x: any) => x?.id || x?.threadId)
            .map((x: any) => ({ id: x.id || x.threadId, name: x.name }))
        )
      )
      .catch(() => {});
  }, [isSidepanel, activeProjectId, bridgeThreadId, backendApiUrl, user?.token]);


  // Sync selectedModel to first enabled backend model when models load
  useEffect(() => {
    if (!backendModels.length) return;
    const enabledModels = backendModels.filter((m) => m.isEnabled !== false);
    if (!enabledModels.length) return;

    const modelNames = new Set(enabledModels.map((m) => m.name));
    // If current selection is "Auto" or not in the available models, pick the first enabled one
    if (selectedModel === "Auto" || !modelNames.has(selectedModel)) {
      setSelectedModel(enabledModels[0].name);
    }
  }, [backendModels]);

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
    projects.find((p) => p.id === activeProjectId) || projects[0] || { id: "", name: "No Project", branch: "main" };

  // New task action
  const handleNewTask = () => {
    setMessages([]);
    setActivePlan(null);
    applyThreadId(null);
  };

  // Load an existing thread's message history
  const handleSelectThread = async (threadId: string) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token || !threadId) return;

    try {
      const result = await loadHistory(baseUrl, token, threadId);
      const rawMessages = result.messages || [];

      // Convert backend message format to ChatMessage[]
      const chatMessages: ChatMessage[] = rawMessages.map((hm: any) => {
        const msg: ChatMessage = {
          id: hm.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sender: hm.sender || "ai",
          text: hm.text || "",
          timestamp: hm.timestamp
            ? new Date(hm.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          threadId,
        };

        // Map text segments — createdAt drives the interleaving order,
        // so preserve it from the backend instead of stamping a new time.
        if (hm.textSegments && Array.isArray(hm.textSegments) && hm.textSegments.length > 0) {
          msg.textSegments = hm.textSegments.map((seg: any) => ({
            text: seg.text || "",
            createdAt: seg.createdAt || 0,
          }));
        }

        // Map thinking/reasoning blocks
        if (hm.thinkingProcesses && Array.isArray(hm.thinkingProcesses) && hm.thinkingProcesses.length > 0) {
          msg.thinkingProcesses = hm.thinkingProcesses.map((tp: any) => ({
            id: tp.id || `tp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            thoughtText: tp.thoughtText || "",
            isCollapsed: tp.isCollapsed !== false,
            createdAt: tp.createdAt || 0,
          }));
          msg.thinkingProcess = msg.thinkingProcesses[0];
        }

        // Map tool executions
        if (hm.toolExecutions && Array.isArray(hm.toolExecutions) && hm.toolExecutions.length > 0) {
          msg.toolExecutions = hm.toolExecutions.map((te: any) => ({
            id: te.id || "",
            name: te.name || "tool",
            command: te.command || "",
            args: te.args || "{}",
            description: te.command || "",
            status: (te.status === "error" ? "error" : "success") as ToolExecution["status"],
            result: te.result || "",
            errorReason: te.errorReason || "",
            createdAt: te.createdAt || 0,
            images: Array.isArray(te.images) ? te.images : undefined,
          }));
        }

        // Standalone image-only user messages (screenshot fallback when no
        // tool card was open when the image was recorded)
        if (Array.isArray(hm.images) && hm.images.length > 0) {
          msg.images = hm.images;
        }

        // Build the ordered blocks array from the mapped parallel arrays.
        // Ordering uses the backend's synthetic monotonic clock (createdAt is
        // a counter, not a timestamp — never mixed with Date.now()).
        if (msg.sender === "ai") {
          msg.blocks = blocksFromLegacyFields(
            msg.id,
            msg.textSegments,
            msg.thinkingProcesses || (msg.thinkingProcess ? [msg.thinkingProcess] : undefined),
            msg.toolExecutions,
            msg.text
          );
        }

        return msg;
      });

      setMessages(chatMessages);
      setActivePlan(null);
      applyThreadId(threadId);
    } catch (err: any) {
      console.warn("Failed to load thread history:", err);
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: t("加载对话失败", "Failed to load conversation"),
            description: err?.message || String(err),
          },
        })
      );
    }
  };

  // Rename thread / conversation
  const handleRenameThread = async (threadId: string, projectId: string, newName: string) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token || !threadId) return;
    try {
      const { renameThread } = await import("./lib/agentClient");
      await renameThread(baseUrl, token, threadId, newName);
    } catch (err: any) {
      console.warn("Failed to rename thread:", err);
    }
  };

  // Delete thread / conversation
  const handleDeleteThread = async (threadId: string, projectId: string) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token || !threadId) return;
    try {
      const { deleteThread } = await import("./lib/agentClient");
      await deleteThread(baseUrl, token, threadId);
      // If the deleted thread is the currently active one, reset to new conversation
      if (threadIdRef.current === threadId) {
        setMessages([]);
        setActivePlan(null);
        applyThreadId(null);
      }
    } catch (err: any) {
      console.warn("Failed to delete thread:", err);
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: { type: "error", title: t("删除失败", "Delete failed"), description: err?.message || String(err) },
        })
      );
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token || !projectId) return;
    try {
      const { deleteProject } = await import("./lib/projectApi");
      await deleteProject(baseUrl, token, projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      // If the deleted project was active, reset
      if (activeProjectIdRef.current === projectId) {
        setMessages([]);
        setActivePlan(null);
        applyThreadId(null);
        activeProjectIdRef.current = "";
        setActiveProjectId("");
        navigate("/");
      }
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: { type: "success", title: t("项目已删除", "Project deleted") },
        })
      );
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: { type: "error", title: t("删除失败", "Delete failed"), description: err?.message || String(err) },
        })
      );
    }
  };

  // Create project
  const handleCreateProject = async (name: string, gitUrl?: string) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    try {
      const p: any = await createProject(baseUrl, token, {
        name,
        gitUrl: gitUrl || undefined,
      });
      const mapped: Project = {
        id: p.id,
        name: p.name,
        rootPath: p.root_path || p.rootPath,
        gitRemote: p.git_remote || p.gitRemote,
        gitBranch: p.git_branch || p.gitBranch || "main",
        conversations: [],
      };
      setProjects((prev) => [...prev, mapped]);
      activeProjectIdRef.current = mapped.id;
      setActiveProjectId(mapped.id);
      setMessages([]);
      setActivePlan(null);
      applyThreadId(null);
      navigate(`/project/${mapped.id}`);
    } catch (err: any) {
      console.warn("Failed to create project:", err);
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: t("创建项目失败", "Failed to create project"),
            description: err?.message || String(err),
          },
        })
      );
    }
  };

  // Open file in editor tab
  const handleOpenFile = (file: FileNode) => {
    if (file.type === "folder") return;

    const existing = openTabs.find((t) => t.path === file.path);
    if (existing) {
      setActiveTabPath(file.path);
      return;
    }

    // PDF — render with the browser's built-in viewer via the project static
    // site route (no auth header needed, correct content-type).
    if (isPdfPath(file.path) && activeProjectId) {
      const baseUrl = backendApiUrl || "https://agent.hery.cloud";
      const encoded = file.path.split("/").map(encodeURIComponent).join("/");
      setOpenTabs((prev) => [
        ...prev,
        {
          path: file.path,
          name: file.name,
          content: "",
          readOnly: true,
          pdfUrl: `${baseUrl}/api/projects/${encodeURIComponent(activeProjectId)}/site/${encoded}`,
        },
      ]);
      setActiveTabPath(file.path);
      return;
    }

    // Office files prefer the OnlyOffice interactive editor (edit +
    // save-back); OfficeCLI HTML render is the fallback, then raw content.
    if (isOfficePreviewPath(file.path) && user?.token && activeProjectId) {
      const tabPath = file.path;
      setOpenTabs((prev) => [
        ...prev,
        { path: tabPath, name: file.name, content: "// 正在渲染文档…", readOnly: true },
      ]);
      setActiveTabPath(tabPath);
      (async () => {
        const baseUrl = backendApiUrl || "https://agent.hery.cloud";
        // 1) OnlyOffice interactive editor
        try {
          const { getOnlyOfficeProjectConfig } = await import("./lib/projectApi");
          const oo = await getOnlyOfficeProjectConfig(baseUrl, user!.token!, activeProjectId!, file.path, "edit");
          if (oo.enabled && oo.config) {
            setOpenTabs((prev) =>
              prev.map((t) =>
                t.path === tabPath
                  ? { ...t, onlyofficeConfig: { documentType: oo.documentType!, config: oo.config }, readOnly: false }
                  : t
              )
            );
            return;
          }
        } catch {
          // fall through to the OfficeCLI preview
        }
        // 2) OfficeCLI static HTML preview
        try {
          const { previewProjectFile } = await import("./lib/projectApi");
          const { html } = await previewProjectFile(baseUrl, user!.token!, activeProjectId!, file.path);
          if (html) {
            setOpenTabs((prev) =>
              prev.map((t) => (t.path === tabPath ? { ...t, htmlContent: html } : t))
            );
            return;
          }
        } catch {
          // fall through to the read fallback below
        }
        // 3) Fallback: keep the raw content the file tree already fetched.
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.path === tabPath
              ? { ...t, content: file.content || `// ${file.name} content\n` }
              : t
          )
        );
      })();
      return;
    }

    const newTab: OpenTab = {
      path: file.path,
      name: file.name,
      content: file.content || `// ${file.name} content\n`,
    };
    setOpenTabs([...openTabs, newTab]);
    setActiveTabPath(file.path);
  };

  // Keep a live mirror of openTabs for async flows (SSE handlers) that must
  // read the *current* tabs without side-effects inside a state updater.
  const openTabsRef = useRef(openTabs);
  useEffect(() => {
    openTabsRef.current = openTabs;
  }, [openTabs]);

  // Re-fetch the OfficeCLI HTML render (or a fresh OnlyOffice config) for
  // any open office tab whose workspace file just changed on disk (e.g. the
  // agent edited the docx the user is viewing). Stale on failure — the user
  // can reopen the tab. OnlyOffice tabs get a new config (its document.key
  // derives from mtime) which remounts the editor with the new content.
  const refreshOfficePreviewTabs = (changedPaths: string[]) => {
    if (changedPaths.length === 0) return;
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token;
    if (!token) return;
    const changed = new Set(changedPaths);
    const hits = openTabsRef.current.filter(
      (t) =>
        (t.htmlContent !== undefined || t.onlyofficeConfig !== undefined) &&
        (changed.has(t.path) || changed.has(t.path.replace(/^attachment:/, "")))
    );
    for (const tab of hits) {
      void (async () => {
        try {
          if (tab.onlyofficeConfig !== undefined) {
            if (tab.path.startsWith("attachment:")) {
              const wsPath = tab.path.slice("attachment:".length);
              const tid = threadIdRef.current;
              if (!tid) return;
              const { getOnlyOfficeThreadConfig } = await import("./lib/agentClient");
              const oo = await getOnlyOfficeThreadConfig(baseUrl, token, tid, wsPath, "edit");
              if (oo.enabled && oo.config) {
                setOpenTabs((cur) =>
                  cur.map((t) =>
                    t.path === tab.path
                      ? { ...t, onlyofficeConfig: { documentType: oo.documentType!, config: oo.config } }
                      : t
                  )
                );
              }
            } else if (activeProjectId) {
              const { getOnlyOfficeProjectConfig } = await import("./lib/projectApi");
              const oo = await getOnlyOfficeProjectConfig(baseUrl, token, activeProjectId, tab.path, "edit");
              if (oo.enabled && oo.config) {
                setOpenTabs((cur) =>
                  cur.map((t) =>
                    t.path === tab.path
                      ? { ...t, onlyofficeConfig: { documentType: oo.documentType!, config: oo.config } }
                      : t
                  )
                );
              }
            }
            return;
          }
          let html: string | null = null;
          if (tab.path.startsWith("attachment:")) {
            const wsPath = tab.path.slice("attachment:".length);
            const tid = threadIdRef.current;
            if (tid) {
              const { previewAttachmentHtml } = await import("./lib/agentClient");
              ({ html } = await previewAttachmentHtml(baseUrl, token, tid, wsPath));
            }
          } else if (activeProjectId) {
            const { previewProjectFile } = await import("./lib/projectApi");
            ({ html } = await previewProjectFile(baseUrl, token, activeProjectId, tab.path));
          }
          if (html) {
            setOpenTabs((cur) =>
              cur.map((t) => (t.path === tab.path ? { ...t, htmlContent: html } : t))
            );
          }
        } catch {
          // keep the stale render
        }
      })();
    }
  };

  // Open file from FileChangeCard (path + content string)
  const handleOpenFileFromCard = (path: string, content: string, pendingChange?: { toolCallId: string; originalContent: string | null }) => {
    const name = path.split("/").pop() || path;
    const existing = openTabs.find((t) => t.path === path);
    if (existing) {
      // If opening with pendingChange info, update the existing tab
      if (pendingChange) {
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.path === path
              ? {
                  ...t,
                  content: content || t.content,
                  pendingChange: {
                    toolCallId: pendingChange.toolCallId,
                    originalContent: pendingChange.originalContent,
                    isConfirmed: false,
                  },
                }
              : t
          )
        );
      }
      setActiveTabPath(path);
    } else {
      const newTab: OpenTab = {
        path,
        name,
        content: content || "",
        ...(pendingChange
          ? {
              pendingChange: {
                toolCallId: pendingChange.toolCallId,
                originalContent: pendingChange.originalContent,
                isConfirmed: false,
              },
            }
          : {}),
      };
      setOpenTabs([...openTabs, newTab]);
      setActiveTabPath(path);
    }
  };

  // Revert a file change (restore original or delete new file) + reject backend approval
  const handleRevertFile = async (filePath: string, originalContent: string | null) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token || !activeProjectId) return;

    // Also reject on the backend so chat ↔ editor stay in sync
    const tab = openTabs.find(t => t.path === filePath);
    const toolCallId = tab?.pendingChange?.toolCallId;
    if (toolCallId) {
      handleApproval(false, toolCallId);
    }

    try {
      if (originalContent === null) {
        // New file — delete it
        await deleteFile(baseUrl, token, activeProjectId, filePath);
      } else {
        // Modified file — restore original content
        await writeFile(baseUrl, token, activeProjectId, filePath, originalContent);
      }
      // Update open tabs: restore original content in the editor tab if open
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.path === filePath
            ? {
                ...t,
                content: originalContent || "",
                isModified: false,
                pendingChange: undefined,
              }
            : t
        )
      );
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "success",
            title: t("已撤销更改", "Change reverted"),
            description: filePath,
          },
        })
      );
      // Refresh the file tree since files on disk changed
      setFileTreeVersion(v => v + 1);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: t("撤销失败", "Revert failed"),
            description: err?.message || String(err),
          },
        })
      );
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
    // Release blob-backed PDF object URLs so the fetched bytes can be GC'd.
    const closing = openTabs.find((t) => t.path === path);
    if (closing?.pdfUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(closing.pdfUrl);
    }
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
    markThreadResolved(threadId);
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
    const candidates = [modelName, defaultModel];
    for (const cand of candidates) {
      if (!cand || cand === "Auto") continue;
      const hit = models.find((m) => m.name === cand || m.modelName === cand);
      if (hit) return hit.id || hit.modelName || "";
    }
    const enabled = models.find((m) => m.isEnabled !== false);
    return enabled?.id || enabled?.modelName || models[0]?.id || "";
  };

  /** Apply one SSE agent event to the active AI message.
   *
   *  Text segmentation strategy (no mutable flags — state is the source of truth):
   *  - agent_message_delta always appends to the *last* text segment.
   *  - item_started (tool) seals the current segment by appending an empty
   *    placeholder — future deltas fill the placeholder.
   *  - Multiple consecutive tools without intervening text only push one
   *    placeholder (because the last segment is already empty).
   */
  const handleAgentEvent = (
    ev: { type: string; data: any },
    aiMsgId: string
  ) => {
    const { type, data } = ev;
    const now = Date.now();

    // Reconnect-safety: skip events already seen on this stream (the backend
    // ships `seq` in every payload; old backends send none → guard inert).
    // NOTE: seq is only a dedupe guard — display order is arrival order.
    const seq = typeof data?.seq === "number" ? data.seq : 0;
    if (seq) {
      if (seq <= lastSeqRef.current) return;
      lastSeqRef.current = seq;
    }

    // All cases below operate on the ordered `blocks` array (arrival order =
    // display order). The legacy parallel arrays are no longer written by the
    // live path; rendering reads blocks only.
    switch (type) {
      case "agent_message_delta": {
        const delta = data.delta || data.agentMessageDelta || "";
        const itemId = data.itemId || data.item_id || "";
        if (!delta) break;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aiMsgId) return m;
            const blocks = [...(m.blocks || [])];
            const last = blocks[blocks.length - 1];
            if (last && last.kind === "text" && (last.id === itemId || !itemId)) {
              blocks[blocks.length - 1] = { ...last, text: last.text + delta };
            } else {
              // Model moved on to the answer — seal any open reasoning block.
              if (last && last.kind === "reasoning" && !last.endedAt) {
                blocks[blocks.length - 1] = { ...last, endedAt: now };
              }
              blocks.push({
                kind: "text",
                id: itemId || `text-${now}`,
                text: delta,
              });
            }
            return {
              ...m,
              blocks,
              text: m.text + delta,
              agentStatus: "generating",
            };
          })
        );
        break;
      }
      case "reasoning_text_delta": {
        const delta = data.delta || "";
        const itemId = data.itemId || data.item_id || "";
        if (!delta) break;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aiMsgId) return m;
            const blocks = [...(m.blocks || [])];
            const last = blocks[blocks.length - 1];
            if (
              last &&
              last.kind === "reasoning" &&
              (last.id === itemId || !itemId)
            ) {
              blocks[blocks.length - 1] = { ...last, text: last.text + delta };
            } else {
              blocks.push({
                kind: "reasoning",
                id: itemId || `reasoning-${now}`,
                text: delta,
                startedAt: now,
              });
            }
            return { ...m, blocks, agentStatus: "thinking" };
          })
        );
        break;
      }
      case "command_execution_output_delta": {
        // Stream argument deltas (e.g. file content) to the matching
        // tool block so the user sees real-time writing progress.
        const deltaItemId = data.itemId || data.item_id || "";
        const deltaText = data.delta || "";
        if (!deltaItemId || !deltaText) break;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aiMsgId) return m;
            const blocks = [...(m.blocks || [])];
            const idx = blocks.findIndex(
              (b) => b.kind === "tool" && b.id === deltaItemId
            );
            if (idx >= 0) {
              const b = blocks[idx] as ToolBlock;
              blocks[idx] = {
                ...b,
                tool: {
                  ...b.tool,
                  contentDelta: (b.tool.contentDelta || "") + deltaText,
                  status: "running" as const,
                },
              };
            } else {
              // Legacy-backend compat: args delta before item_started →
              // placeholder in arrival position (name filled by item_started).
              blocks.push({
                kind: "tool",
                id: deltaItemId,
                tool: {
                  id: deltaItemId,
                  name: "",
                  command: "",
                  status: "running",
                  contentDelta: deltaText,
                  createdAt: now,
                },
              });
            }
            return { ...m, blocks };
          })
        );
        break;
      }
      case "item_started": {
        const item = data.item || {};
        // ---- agent_message: blocks open lazily on the first delta ----
        // (backend emits item_started at the first reasoning/text delta of a
        // round; the round's itemId opens/extends blocks by itself).
        if (item.type === "agent_message") break;

        // ---- tool call announced (provisional at first arg delta, or
        // authoritative at finish with command + compacted args) ----
        if (item.type === "command_execution") {
          const args = item.arguments || {};
          const execId = item.id || item.callId || `te-${now}`;
          const execName = item.toolName || item.tool || "";
          const execCmd = item.command || "";
          const execArgs = typeof args === "string" ? args : JSON.stringify(args);
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== aiMsgId) return m;
              const blocks = [...(m.blocks || [])];
              const idx = blocks.findIndex(
                (b) => b.kind === "tool" && b.id === execId
              );
              if (idx >= 0) {
                // Upsert the placeholder created by an earlier
                // command_execution_output_delta / provisional item_started.
                const b = blocks[idx] as ToolBlock;
                blocks[idx] = {
                  ...b,
                  tool: {
                    ...b.tool,
                    name: execName || b.tool.name,
                    command: execCmd || b.tool.command,
                    args: execArgs || b.tool.args,
                    description: execCmd || b.tool.description,
                    status: b.tool.status === "pending" ? "pending" : "running",
                  },
                };
              } else {
                blocks.push({
                  kind: "tool",
                  id: execId,
                  tool: {
                    id: execId,
                    name: execName,
                    command: execCmd,
                    args: execArgs,
                    description: execCmd,
                    status: "running",
                    createdAt: now,
                  },
                });
              }
              return { ...m, blocks, agentStatus: "executing_tool" };
            })
          );
        }
        break;
      }
      case "item_completed": {
        const item = data.item || {};
        if (item.type === "command_execution") {
          const id = item.id || item.callId || "";
          const status: ToolExecution["status"] =
            item.status === "failed" || item.status === "declined" || item.status === "aborted" ? "error" : "success";
          const result =
            item.aggregatedOutput != null ? String(item.aggregatedOutput) : "";
          const errorReason = item.errorReason || "";
          const wasAborted = item.wasAborted === true;
          const args = item.arguments || null;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    blocks: (m.blocks || []).map((b) => {
                      if (b.kind !== "tool" || b.id !== id) return b;
                      return {
                        ...b,
                        tool: {
                          ...b.tool,
                          status,
                          result,
                          errorReason,
                          wasAborted,
                          completedAt: now,
                          ...(args ? { args: typeof args === "string" ? args : JSON.stringify(args) } : {}),
                          ...(item.command ? { command: item.command, description: item.command } : {}),
                          ...(Array.isArray(item.images) && item.images.length > 0 ? { images: item.images } : {}),
                        },
                      };
                    }),
                  }
                : m
            )
          );
        }
        // file_change item — write_file / apply_patch completed with structured file list.
        // Attach by call id — never "last tool" (completions arrive unordered
        // when tools run concurrently, and groups make position meaningless).
        if (item.type === "file_change") {
          const itemId = item.id || item.callId || "";
          const files = item.files || [];
          const stats = item.fileStats || { added: 0, removed: 0 };
          // Refresh the file explorer since files changed on disk
          setFileTreeVersion(v => v + 1);
          // Re-render any open Office HTML preview tabs whose file just
          // changed on disk (e.g. the agent edited the docx being previewed).
          refreshOfficePreviewTabs(files.map((f: any) => String(f.path || "")));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    blocks: (m.blocks || []).map((b) =>
                      b.kind === "tool" && b.id === itemId
                        ? {
                            ...b,
                            tool: {
                              ...b.tool,
                              files,
                              fileStats: stats,
                              status: "success" as const,
                              completedAt: now,
                            },
                          }
                        : b
                    ),
                  }
                : m
            )
          );
        }
        // item_completed (agent_message) — blocks never depend on it; the
        // OpenAI protocol doesn't even emit it for tool-call rounds.
        break;
      }
      case "user_input_required": {
        const inputId = data.inputId || data.input_id || "";
        // Backward-compat: legacy single free-text question.
        const questions: ClarificationQuestion[] = Array.isArray(data.questions)
          ? data.questions.map((q: any) => ({
              id: q.id || "",
              header: q.header || "",
              question: q.question || "",
              options: Array.isArray(q.options)
                ? q.options.map((o: any) => ({
                    label: o.label || "",
                    description: o.description || "",
                  }))
                : [],
            }))
          : data.question
          ? [{ id: "q1", header: "", question: data.question, options: [] }]
          : [];

        if (inputId) {
          pendingInputRef.current = { inputId };
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== aiMsgId) return m;
              const blocks = [...(m.blocks || [])];
              // Seal any open reasoning block, then insert the ask card as an
              // ordered block at its arrival position — later blocks (the
              // agent's post-answer output) render BELOW it by construction.
              const last = blocks[blocks.length - 1];
              if (last && last.kind === "reasoning" && !last.endedAt) {
                blocks[blocks.length - 1] = { ...last, endedAt: now };
              }
              if (!blocks.some((b) => b.kind === "ask" && b.id === inputId)) {
                blocks.push({ kind: "ask", id: inputId, questions, createdAt: now });
              }
              return { ...m, blocks, agentStatus: "asking_clarification" };
            })
          );
        }
        break;
      }
      case "user_input_expired": {
        // Backend gave up waiting (300s timeout) and resumed the turn —
        // close the card instead of leaving it interactive forever.
        const inputId = data.inputId || data.input_id || "";
        if (!inputId) break;
        if (pendingInputRef.current?.inputId === inputId) {
          pendingInputRef.current = null;
        }
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aiMsgId) return m;
            let touched = false;
            const blocks = (m.blocks || []).map((b) => {
              if (b.kind === "ask" && b.id === inputId && !b.answers && !b.expired) {
                touched = true;
                return { ...b, expired: true };
              }
              return b;
            });
            return touched
              ? {
                  ...m,
                  blocks,
                  agentStatus:
                    m.agentStatus === "asking_clarification" ? "generating" : m.agentStatus,
                }
              : m;
          })
        );
        break;
      }
      case "turn_complete": {
        // Mark streaming complete and record final message text
        const finalMsg = data.finalMessage || data.final_message || "";
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aiMsgId) return m;
            let blocks = [...(m.blocks || [])];
            // Seal the last open reasoning block (the model never "closes" it).
            const last = blocks[blocks.length - 1];
            if (last && last.kind === "reasoning" && !last.endedAt) {
              blocks[blocks.length - 1] = { ...last, endedAt: now };
            }
            // Stamp a terminal time on tools still marked running (e.g. their
            // item_completed was dropped under queue backpressure).
            blocks = blocks.map((b) =>
              b.kind === "tool" && b.tool.status === "running" && !b.tool.completedAt
                ? { ...b, tool: { ...b.tool, completedAt: now } }
                : b
            );
            // If every text delta was dropped under backpressure, backfill the
            // final message so the turn still shows its answer.
            const hasText = blocks.some((b) => b.kind === "text" && b.text.trim().length > 0);
            if (finalMsg && !hasText) {
              blocks.push({ kind: "text", id: `final-${now}`, text: finalMsg });
            }
            return {
              ...m,
              blocks,
              agentStatus: "completed",
              isStreaming: false,
              ...(finalMsg && !m.text ? { text: finalMsg } : {}),
            };
          })
        );
        break;
      }
      case "approval_required": {
        const approvalId = data.approvalId || data.approval_id || "";
        const toolName = data.toolName || data.tool_name || "";
        const args = data.arguments || {};
        const execCmd = args.command || args.path || args.query || args.pattern || toolName;

        // All tools (including file tools) go through the normal approval flow.
        setPendingApprovals((prev) => ({
          ...prev,
          [approvalId]: { approvalId, toolName, arguments: args },
        }));
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aiMsgId) return m;
            const blocks = [...(m.blocks || [])];
            const idx = blocks.findIndex(
              (b) => b.kind === "tool" && b.id === approvalId
            );
            if (idx >= 0) {
              // Update the tool block (created by item_started) to pending
              const b = blocks[idx] as ToolBlock;
              blocks[idx] = {
                ...b,
                tool: {
                  ...b.tool,
                  status: "pending" as const,
                  name: b.tool.name || toolName,
                },
              };
            } else {
              // item_started may have been dropped under queue pressure —
              // create a placeholder tool block so the approval UI is reachable.
              blocks.push({
                kind: "tool",
                id: approvalId,
                tool: {
                  id: approvalId,
                  name: toolName,
                  command: execCmd,
                  status: "pending" as const,
                  createdAt: now,
                },
              });
            }
            return { ...m, blocks };
          })
        );
        break;
      }
      case "plan_delta": {
        const explanation = data.explanation || "";
        const plan: Array<{ step: string; status: string }> = data.plan || [];
        if (plan.length === 0) break;
        setActivePlan({
          steps: plan.map((p) => ({
            step: p.step || "",
            status: (p.status || "pending") as PlanStep["status"],
          })),
          explanation,
        });
        break;
      }
      case "error": {
        // Backend already maps raw provider payloads to one friendly line.
        // Show it as a transient toast — never append provider errors to
        // the chat transcript.
        const msg = data.message || data.error || t("模型服务暂时不可用，请稍后重试或切换模型", "Model service unavailable, please retry or switch models");
        window.dispatchEvent(
          new CustomEvent("app:show_toast", {
            detail: {
              type: "error",
              title: t("生成失败", "Generation Failed"),
              description: msg,
              duration: 5000,
            },
          })
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, agentStatus: "completed", isStreaming: false }
              : m
          )
        );
        break;
      }
      default:
        break;
    }
  };

  /** Handle AskUser card submission → forward the answers map to the backend.
   *
   *  ``answers`` maps each question id to the selected option label (or the
   *  free-text typed under "Other"). Sent as a single JSON payload for the
   *  ``input_id`` captured from the ``user_input_required`` SSE event.
   */
  const handleAskUserSubmit = async (inputId: string, answers: Record<string, string>) => {
    const pending = pendingInputRef.current;
    const threadId = threadIdRef.current;
    // Prefer the explicit inputId; fall back to the captured pending one.
    const effectiveInputId = inputId || pending?.inputId || "";
    if (!effectiveInputId || !threadId) return;
    if (pendingInputRef.current?.inputId === effectiveInputId) {
      pendingInputRef.current = null;
    }

    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";

    // Stamp the answers onto the ask block so the card flips to its
    // read-only "answered" summary immediately (before the backend resumes).
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.blocks?.some((b) => b.kind === "ask" && b.id === effectiveInputId)) {
          return m;
        }
        return {
          ...m,
          blocks: m.blocks.map((b) =>
            b.kind === "ask" && b.id === effectiveInputId ? { ...b, answers } : b
          ),
        };
      })
    );

    // Answer the pending input request.
    try {
      await respondInput(baseUrl, token, threadId, effectiveInputId, answers);
    } catch (e) {
      console.warn("AskUser respond failed:", e);
      return;
    }

    // Close the pre-answer SSE stream before opening a new one. Without this
    // both connections stay subscribed and randomly split the backend's
    // single event queue between them — post-answer output then lands on the
    // OLD message (above the ask card) and the transcript garbles. The
    // backend also supersedes old consumers (single-consumer stream), but
    // aborting here keeps the client from racing it.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    // The agent resumes after answering — open a fresh assistant message and
    // stream whatever it produces next, so the answered card stays in place
    // and new output appears below it.
    setIsGenerating(true);
    const aiMsgId = (Date.now() + 1).toString();
    activeAiMsgIdRef.current = aiMsgId;
    lastSeqRef.current = 0; // resumed turn → new event stream
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      model: [...messages].reverse().find((m) => m.sender === "ai")?.model,
      agentStatus: "thinking",
      isStreaming: true,
      blocks: [],
    };
    setMessages((prev) => [...prev, aiMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamChat(baseUrl, token, threadId, (ev) => {
        if (controller.signal.aborted) return;
        handleAgentEvent(ev, aiMsgId);
      }, controller.signal);
      markThreadResolved(threadId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, agentStatus: "completed", isStreaming: false }
            : m
        )
      );
    } catch (err: any) {
      if (err?.name === "AbortError") return; // superseded by a newer stream
      // Stream-level failure — toast only, never write provider errors into
      // the chat transcript.
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: t("生成失败", "Generation Failed"),
            description: err?.message || t("模型服务暂时不可用，请稍后重试", "Model service unavailable, please retry"),
            duration: 5000,
          },
        })
      );
      markThreadResolved(threadIdRef.current || "");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, agentStatus: "completed", isStreaming: false }
            : m
        )
      );
    } finally {
      // Only tear down generation state if this stream is still the active
      // one — a newer stream (e.g. the next user message) may already own it.
      if (abortControllerRef.current === controller) {
        setIsGenerating(false);
        activeAiMsgIdRef.current = null;
      }
    }
  };

  /** Approve or deny a pending sensitive-tool approval. */
  const handleApproval = async (approved: boolean, approvalId?: string) => {
    const threadId = threadIdRef.current;
    const effectiveApprovalId = approvalId || Object.keys(pendingApprovals)[0];
    if (!effectiveApprovalId || !threadId) {
      if (!threadId) console.warn("handleApproval: no threadId");
      if (!effectiveApprovalId) console.warn("handleApproval: no approvalId");
      return;
    }
    setPendingApprovals((prev) => {
      const next = { ...prev };
      delete next[effectiveApprovalId];
      return next;
    });
    try {
      await approveTool(
        backendApiUrl || "https://agent.hery.cloud",
        user?.token || "",
        threadId,
        effectiveApprovalId,
        approved
      );
    } catch (e: any) {
      console.warn("Approval API call failed:", e?.message || e);
      // Restore pending state so the user can retry
      setPendingApprovals((prev) => ({
        ...prev,
        [effectiveApprovalId]: { approvalId: effectiveApprovalId, toolName: "", arguments: {} },
      }));
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: t("审批请求失败", "Approval request failed"),
            description: e?.message || String(e),
          },
        })
      );
    }
  };

  // Keep a file change — approve on backend + dismiss pending state locally
  const handleKeepFile = (filePath: string) => {
    // Find the toolCallId from the tab's pendingChange and approve on backend
    const tab = openTabs.find(t => t.path === filePath);
    const toolCallId = tab?.pendingChange?.toolCallId;
    if (toolCallId) {
      handleApproval(true, toolCallId);
    }

    setOpenTabs((prev) =>
      prev.map((t) =>
        t.path === filePath && t.pendingChange
          ? { ...t, pendingChange: { ...t.pendingChange, isConfirmed: true } }
          : t
      )
    );
    // Refresh the file tree since files on disk changed
    setFileTreeVersion(v => v + 1);
  };

  // Attachment preview: extract text server-side, then open it as a
  // read-only tab in the editor area (no modal). Tab path is namespaced
  // with "attachment:" so it can't collide with project file paths.
  const attachmentTabPath = (workspacePath: string) => `attachment:${workspacePath}`;

  const handleOpenAttachment = async (
    att: {
      filename: string;
      workspacePath: string;
      contentType?: string;
    },
    msgThreadId?: string
  ) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    // Prefer the owning message's thread — after a thread switch the current
    // threadIdRef points elsewhere and would 404 on the old workspace path.
    const threadId = msgThreadId || threadIdRef.current;
    if (!token || !threadId) return;

    const tabPath = attachmentTabPath(att.workspacePath);
    const existing = openTabs.find((tab) => tab.path === tabPath);
    if (
      existing &&
      (existing.onlyofficeConfig !== undefined ||
        existing.htmlContent !== undefined ||
        (existing.content && !existing.content.startsWith("// 正在解析")))
    ) {
      setActiveTabPath(tabPath);
      return;
    }

    // PDF — download with auth, then render the blob in the browser's
    // built-in PDF viewer. Falls back to the text-extract flow on failure.
    if (isPdfPath(att.workspacePath)) {
      // Placeholder tab while fetching.
      setOpenTabs((prev) => {
        const next = prev.filter((tab) => tab.path !== tabPath);
        return [...next, { path: tabPath, name: att.filename, content: "// 正在加载 PDF…", readOnly: true }];
      });
      setActiveTabPath(tabPath);
      try {
        const { downloadThreadFileUrl } = await import("./lib/agentClient");
        const url = await downloadThreadFileUrl(baseUrl, token, threadId, att.workspacePath);
        setOpenTabs((prev) =>
          prev.map((tab) => (tab.path === tabPath ? { ...tab, pdfUrl: url, content: "" } : tab))
        );
        return;
      } catch {
        // fall through to the text-extraction fallback below
      }
    }

    // Office documents (docx/xlsx/pptx) prefer the OnlyOffice interactive
    // editor (edit + save-back); the OfficeCLI HTML render is the fallback;
    // null html or any error falls back to the plain-text extract below.
    if (isOfficePreviewPath(att.workspacePath)) {
      try {
        const { getOnlyOfficeThreadConfig } = await import("./lib/agentClient");
        const oo = await getOnlyOfficeThreadConfig(baseUrl, token, threadId, att.workspacePath, "edit");
        if (oo.enabled && oo.config) {
          setOpenTabs((prev) => {
            const next = prev.filter((tab) => tab.path !== tabPath);
            return [
              ...next,
              {
                path: tabPath,
                name: att.filename,
                content: "",
                onlyofficeConfig: { documentType: oo.documentType!, config: oo.config },
              },
            ];
          });
          setActiveTabPath(tabPath);
          return;
        }
      } catch {
        // fall through to OfficeCLI preview
      }
      try {
        const { previewAttachmentHtml } = await import("./lib/agentClient");
        const { html } = await previewAttachmentHtml(baseUrl, token, threadId, att.workspacePath);
        if (html) {
          setOpenTabs((prev) => {
            const next = prev.filter((tab) => tab.path !== tabPath);
            return [...next, { path: tabPath, name: att.filename, content: "", htmlContent: html, readOnly: true }];
          });
          setActiveTabPath(tabPath);
          return;
        }
      } catch {
        // fall through to text extraction
      }
    }

    // Placeholder tab while parsing (or reuse the stale one).
    setOpenTabs((prev) => {
      const next = prev.filter((tab) => tab.path !== tabPath);
      return [
        ...next,
        { path: tabPath, name: att.filename, content: "// 正在解析文档…", readOnly: true },
      ];
    });
    setActiveTabPath(tabPath);

    try {
      const { extractAttachmentText } = await import("./lib/agentClient");
      const { text } = await extractAttachmentText(baseUrl, token, threadId, att.workspacePath);
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.path === tabPath ? { ...tab, content: text || "// 空文档" } : tab
        )
      );
    } catch (err: any) {
      const msg = err?.message || t("文档解析失败", "Failed to parse document");
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.path === tabPath
            ? { ...tab, content: `${t("预览失败", "Preview failed")}：${msg}\n\n${t("可点击右上角下载按钮获取原文件。", "Use the download button above to get the original file.")}` }
            : tab
        )
      );
    }
  };

  // Download the raw attachment/workspace file via the thread download API.
  const handleDownloadAttachment = async (workspacePath?: string) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    const threadId = threadIdRef.current;
    if (!token || !threadId) {
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "warning",
            title: t("无法下载", "Cannot Download"),
            description: t("请先登录并打开一个会话", "Log in and open a session first"),
          },
        })
      );
      return;
    }
    const path = workspacePath
      ?? (activeTabPath?.startsWith("attachment:") ? activeTabPath.slice("attachment:".length) : undefined);
    if (!path) return;
    try {
      const { saveWorkspaceFileAs } = await import("./lib/agentClient");
      await saveWorkspaceFileAs(baseUrl, token, threadId, path);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: t("下载失败", "Download Failed"),
            description: err?.message || String(err),
          },
        })
      );
    }
  };

  // Upload a real file attachment into the thread workspace. Creates the
  // thread on demand when this is the first attachment of a new chat, so
  // files can be attached before any message is typed.
  const handleUploadAttachment = async (
    file: File
  ): Promise<ContextPill["attachment"] | null> => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token) {
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "warning",
            title: t("请先登录", "Log In First"),
            description: t("登录后才能上传文件供 Agent 读取", "Log in to attach files for the agent"),
          },
        })
      );
      return null;
    }

    // Resolve the model needed to create a thread when none exists yet.
    let threadId = threadIdRef.current;
    if (!threadId) {
      const localModelName = selectedModelRef.current;
      const modelId = resolveModelId(localModelName);
      if (!modelId) {
        window.dispatchEvent(
          new CustomEvent("app:show_toast", {
            detail: {
              type: "error",
              title: t("未配置可用模型", "No model configured"),
              description: t("新对话上传文件需要先创建会话，请先在设置中启用模型", "A model is required to start a session"),
            },
          })
        );
        return null;
      }
      try {
        const threadName =
          file.name.length > 30 ? file.name.slice(0, 30) + "..." : file.name;
        const created = await createThread(baseUrl, token, modelId, threadName, activeProjectIdRef.current, approvalPolicy);
        threadId = created.threadId;
        applyThreadId(threadId);
        window.dispatchEvent(
          new CustomEvent("app:thread_created", {
            detail: { projectId: activeProjectId, thread: created },
          })
        );
      } catch (err: any) {
        window.dispatchEvent(
          new CustomEvent("app:show_toast", {
            detail: {
              type: "error",
              title: t("创建会话失败", "Failed to create session"),
              description: err?.message || String(err),
            },
          })
        );
        return null;
      }
    }

    const { uploadAttachment } = await import("./lib/agentClient");
    const result = await uploadAttachment(baseUrl, token, threadId, file);
    // The file landed in {workspace}/uploads/ — bump the tree version so
    // RightPanel re-fetches and the file shows up without a manual refresh.
    setFileTreeVersion((v) => v + 1);
    return {
      filename: result.filename,
      workspacePath: result.workspacePath,
      size: result.size,
      contentType: result.contentType,
    };
  };

  // Send prompt to the CodeEngine agent backend (thread-based, SSE stream).
  const handleSendPrompt = async (
    text: string,
    pills: ContextPill[],
    mode: string,
    model: string,
    images?: string[]
  ) => {
    // Never send while a turn is streaming — the user must stop (打断) first.
    // Guard applies to every send surface (input box, suggestion cards…);
    // the backend enforces the same rule with a 409.
    if (isGenerating) {
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "warning",
            title: t("正在生成中", "Generating"),
            description: t(
              "请先点击停止按钮打断当前回复，再发送新消息。",
              "Stop the current reply before sending a new message."
            ),
            duration: 3000,
          },
        })
      );
      return;
    }
    // Attachments already uploaded into the workspace — embed their paths
    // into the outgoing text so the agent knows what to read.
    const fileAttachments = pills
      .filter((p) => p.type === "file" && p.attachment)
      .map((p) => p.attachment!);
    let outgoingText = text;
    if (fileAttachments.length > 0) {
      const list = fileAttachments.map((a) => `- ${a.filename}（工作区路径: ${a.workspacePath}）`).join("\n");
      outgoingText = `${text}\n\n[已上传文件，可用 read_file 读取]\n${list}`;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString(),
      contextPills: pills,
      mode,
      model,
      threadId: threadIdRef.current || undefined,
      images: images && images.length > 0 ? images : undefined,
      attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    // Remove any prior resolved indicator while a new generation is active.
    setResolvedThreadIds((prev) => {
      const tid = threadIdRef.current;
      if (tid && prev.has(tid)) {
        const next = new Set(prev);
        next.delete(tid);
        return next;
      }
      return prev;
    });

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
    lastSeqRef.current = 0; // new turn → new event stream
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      model,
      agentStatus: "thinking",
      isStreaming: true,
      blocks: [],
    };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      // 1. Ensure a thread exists (reuse across turns).
      let threadId = threadIdRef.current;
      if (!threadId) {
        const threadName = text.length > 30 ? text.slice(0, 30) + "..." : text;
        const created = await createThread(baseUrl, token, modelId, threadName, activeProjectIdRef.current, approvalPolicy);
        threadId = created.threadId;
        applyThreadId(threadId);
        // Stamp the thread onto the already-rendered user message so its
        // attachments stay resolvable after later thread switches.
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, threadId } : m))
        );
        // Notify Sidebar so the new thread appears without a page refresh.
        window.dispatchEvent(
          new CustomEvent("app:thread_created", {
            detail: { projectId: activeProjectId, thread: created },
          })
        );
      }

      // 2. Submit the user message (agent runs in the background).
      const skillIds = pills.filter((p) => p.type === "skill").map((p) => p.id);
      await sendMessage(baseUrl, token, threadId, modelId, outgoingText, approvalPolicy, skillIds, images);

      // 3. Stream agent events and render them onto the active message.
      await streamChat(baseUrl, token, threadId, (ev) => {
        if (controller.signal.aborted) return;
        handleAgentEvent(ev, aiMsgId);
      }, controller.signal);

      // Mark the message complete when the stream ends normally.
      markThreadResolved(threadId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, agentStatus: "completed", isStreaming: false }
            : m
        )
      );
    } catch (err: any) {
      if (err?.name === "AbortError") return; // superseded by a newer stream
      // Stream-level failure — toast only, never write provider errors into
      // the chat transcript.
      window.dispatchEvent(
        new CustomEvent("app:show_toast", {
          detail: {
            type: "error",
            title: t("生成失败", "Generation Failed"),
            description: err?.message || t("模型服务暂时不可用，请稍后重试", "Model service unavailable, please retry"),
            duration: 5000,
          },
        })
      );
      markThreadResolved(threadIdRef.current || "");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, agentStatus: "completed", isStreaming: false }
            : m
        )
      );
    } finally {
      // Only tear down generation state if this stream is still the active
      // one — handleAskUserSubmit aborts this stream and installs a newer
      // controller before this finally runs.
      if (abortControllerRef.current === controller) {
        setIsGenerating(false);
        activeAiMsgIdRef.current = null;
      }
    }
  };

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // -- Sidepanel compact mode: thin top bar (thread select + bridge dot)
  // -- + ChatStream + PromptInput, full width. No Sidebar/Editor/RightPanel.
  if (isSidepanel) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased">
        <div className="flex items-center gap-2 px-3 h-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-zinc-900/80 shrink-0">
          <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 shrink-0 select-none">
            Code Engine
          </span>
          <select
            value={bridgeThreadId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                handleSelectThread(v);
              } else {
                handleNewTask();
              }
            }}
            className="flex-1 min-w-0 text-xs bg-transparent border-none outline-none cursor-pointer truncate text-gray-700 dark:text-zinc-300"
            title={bridgeThreadId || t("新对话", "New chat")}
          >
            <option value="">{t("＋ 新对话（未绑定扩展）", "+ New chat (unbound)")}</option>
            {sidepanelThreads.map((th) => (
              <option key={th.id} value={th.id}>
                {th.name || `${th.id.slice(0, 12)}…`}
              </option>
            ))}
          </select>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${bridgeConnected ? "bg-green-500" : "bg-red-400"}`}
            title={
              bridgeConnected
                ? t("浏览器桥接已连接", "Browser bridge connected")
                : t("浏览器桥接未连接（扩展未登录或后端不可达）", "Browser bridge disconnected")
            }
          />
        </div>
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-3 min-h-0">
            <PromptInput
              onSend={handleSendPrompt}
              projectName={activeProject.name}
              branchName={activeProject.branch}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              isGenerating={isGenerating}
              onStop={handleStopGeneration}
              onUploadAttachment={handleUploadAttachment}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatStream
              messages={messages}
              isGenerating={isGenerating}
              onSubmitAnswers={handleAskUserSubmit}
              pendingApprovals={pendingApprovals}
              onApproval={handleApproval}
              onOpenAttachment={handleOpenAttachment}
            />
            <div className="p-2 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xs shrink-0">
              <PromptInput
                onSend={handleSendPrompt}
                projectName={activeProject.name}
                branchName={activeProject.branch}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                isGenerating={isGenerating}
                onStop={handleStopGeneration}
                onUploadAttachment={handleUploadAttachment}
              />
            </div>
          </div>
        )}

      </div>
    );
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
          setActivePlan(null);
          applyThreadId(null);
          activeProjectIdRef.current = id;
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
            setActivePlan(null);
            applyThreadId(null);
            activeProjectIdRef.current = id;
            setActiveProjectId(id);
            if (!isSettingsOpen) {
              navigate(`/project/${id}`);
            }
          }}
          onNewTask={handleNewTask}
          onCreateProject={handleCreateProject}
          onSelectThread={handleSelectThread}
          onDeleteThread={handleDeleteThread}
          onRenameThread={handleRenameThread}
          onDeleteProject={handleDeleteProject}
          pinned={sidebarPinned}
          isOpen={isSidebarOpen}
          onTogglePin={() => setSidebarPinned(!sidebarPinned)}
          onMouseEnter={handleMouseEnterSidebar}
          onMouseLeave={handleMouseLeaveSidebar}
          onOpenSettings={handleOpenSettings}
          activeThreadId={threadIdRef.current}
          isGenerating={isGenerating}
          resolvedThreadIds={resolvedThreadIds}
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
              className="flex flex-col bg-[#ffffff] dark:bg-zinc-950 relative shrink-0 h-full"
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
                                            setActivePlan(null);
                                            applyThreadId(null);
                                            activeProjectIdRef.current = proj.id;
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
                        isGenerating={isGenerating}
                        onStop={handleStopGeneration}
                        onUploadAttachment={handleUploadAttachment}
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
                        onSubmitAnswers={handleAskUserSubmit}
                        pendingApprovals={pendingApprovals}
                        onApproval={handleApproval}
                        onOpenFile={handleOpenFileFromCard}
                        onKeepFile={handleKeepFile}
                        onRevertFile={handleRevertFile}
                        onOpenAttachment={handleOpenAttachment}
                      />
                      {activePlan && (
                        <PlanProgressCard plan={activePlan.steps} explanation={activePlan.explanation} />
                      )}
                      <div className="p-3 bg-[#ffffff]/90 dark:bg-zinc-950/90 backdrop-blur-xs">
                        <PromptInput
                          onSend={handleSendPrompt}
                          projectName={activeProject.name}
                          branchName={activeProject.branch}
                          selectedModel={selectedModel}
                          onModelChange={setSelectedModel}
                          isGenerating={isGenerating}
                          onStop={handleStopGeneration}
                          onUploadAttachment={handleUploadAttachment}
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
                    onKeepFile={handleKeepFile}
                    onRevertFile={handleRevertFile}
                    onDownloadTab={(tab) =>
                      handleDownloadAttachment(
                        tab.path.startsWith("attachment:") ? tab.path.slice("attachment:".length) : undefined
                      )
                    }
                    onOnlyOfficeUnavailable={(tabPath) => {
                      // DS 挂了/api.js 加载失败：剥掉编辑器配置，回退 OfficeCLI 静态预览
                      const baseUrl = backendApiUrl || "https://agent.hery.cloud";
                      const token = user?.token;
                      void (async () => {
                        if (!token) return;
                        setOpenTabs((cur) =>
                          cur.map((t) =>
                            t.path === tabPath
                              ? { ...t, onlyofficeConfig: undefined, content: "// 正在渲染文档…", readOnly: true }
                              : t
                          )
                        );
                        try {
                          if (tabPath.startsWith("attachment:")) {
                            const { previewAttachmentHtml } = await import("./lib/agentClient");
                            const wsPath = tabPath.slice("attachment:".length);
                            const tid = threadIdRef.current;
                            if (!tid) return;
                            const { html } = await previewAttachmentHtml(baseUrl, token, tid, wsPath);
                            if (html) {
                              setOpenTabs((cur) =>
                                cur.map((t) => (t.path === tabPath ? { ...t, htmlContent: html } : t))
                              );
                            }
                          } else if (activeProjectId) {
                            const { previewProjectFile } = await import("./lib/projectApi");
                            const { html } = await previewProjectFile(baseUrl, token, activeProjectId, tabPath);
                            if (html) {
                              setOpenTabs((cur) =>
                                cur.map((t) => (t.path === tabPath ? { ...t, htmlContent: html } : t))
                              );
                            }
                          }
                        } catch {
                          // OfficeCLI also unavailable — leave the placeholder
                        }
                      })();
                    }}
                    onOnlyOfficeSaved={() => {
                      // DS 保存回写已落盘（后端无 SSE 推送），主动刷文件树
                      setFileTreeVersion((v) => v + 1);
                    }}
                    projectId={activeProjectId}
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
              projectId={activeProjectId || undefined}
              width={rightPanelWidth}
              fileTreeVersion={fileTreeVersion}
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
            branchName={activeProject.branch || activeProject.gitBranch || "main"}
            projectId={activeProject.id}
          />
        </div>
      </div>

    </div>
  );
}
