import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { ServerAddressSelector } from "./ServerAddressSelector";
import { getSkillMarket, installSkill, uninstallSkill, MarketSkill } from "../lib/skillApi";
import {
  getSearchSettings,
  saveSearchSettings,
  testSearchSettings,
  SearchBackendKind,
} from "../lib/searchSettingsApi";
import {
  Settings,
  Bot,
  BookOpen,
  Terminal,
  Boxes,
  Database,
  Cloud,
  Search,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  ChevronDown,
  X,
  Check,
  RotateCcw,
  Sliders,
  Cpu,
  Key,
  ShieldAlert,
  User,
  PieChart,
  TrendingUp,
  Activity,
  Calendar,
  Sparkles,
  CreditCard,
  Link as LinkIcon,
  Image as ImageIcon,
  Puzzle,
  Wrench,
  Plug,
  Users,
  Brain,
  Globe,
  Folder,
  Clock,
  GitBranch,
  FileSpreadsheet,
  Server,
  Code2,
  Grid,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Pencil,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: SettingsCategory;
  onCategoryChange?: (category: SettingsCategory) => void;
}

// Categories matching user's requested layout + Account + Extensions
export type SettingsCategory =
  | "account"
  | "general"
  | "agent"
  | "memory"
  | "commands"
  | "models"
  | "web_search"
  | "code_index"
  | "logs"
  | "extensions"
  | "plugins"
  | "skills"
  | "mcp"
  | "sub_agents";

interface NavItem {
  id: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "account", label: "账户用量", icon: User },
  { id: "general", label: "通用", icon: Settings },
  { id: "agent", label: "Agent 设置", icon: Bot },
  { id: "memory", label: "记忆", icon: BookOpen },
  { id: "commands", label: "命令", icon: Terminal },
  { id: "models", label: "模型", icon: Boxes },
  { id: "code_index", label: "代码索引", icon: Database },
  { id: "logs", label: "日志", icon: Cloud },
  { id: "extensions", label: "能力扩展", icon: Grid },
];

const EXTENSION_NAV_ITEMS: NavItem[] = [
  { id: "plugins", label: "插件", icon: Puzzle },
  { id: "skills", label: "技能", icon: Wrench },
  { id: "mcp", label: "MCP", icon: Plug },
  { id: "sub_agents", label: "子智能体", icon: Users },
];

const SKILLS_DATA = [
  {
    id: "brainstorming",
    name: "brainstorming",
    badge: "superpowers",
    description:
      "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.",
    letter: "B",
    letterBg: "bg-pink-100 dark:bg-pink-950/50",
    letterColor: "text-pink-600 dark:text-pink-400",
  },
  {
    id: "writing-plans",
    name: "writing-plans",
    badge: "superpowers",
    description:
      "Use when you have a spec or requirements for a multi-step task, before touching code",
    letter: "W",
    letterBg: "bg-emerald-100 dark:bg-emerald-950/50",
    letterColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "requesting-code-review",
    name: "requesting-code-review",
    badge: "superpowers",
    description:
      "Use when completing tasks, implementing major features, or before merging to verify work meets requirements",
    letter: "R",
    letterBg: "bg-rose-100 dark:bg-rose-950/50",
    letterColor: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "web-design-guidelines",
    name: "web-design-guidelines",
    badge: "vercel-labs/agent-skills",
    description:
      'Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".',
    letter: "W",
    letterBg: "bg-emerald-100 dark:bg-emerald-950/50",
    letterColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "test-driven-development",
    name: "test-driven-development",
    badge: "superpowers",
    description:
      "Use when implementing any feature or bugfix, before writing implementation code",
    letter: "T",
    letterBg: "bg-sky-100 dark:bg-sky-950/50",
    letterColor: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "obsidian-markdown",
    name: "obsidian-markdown",
    badge: "kepano/obsidian-skills",
    description:
      "Create and edit Obsidian Flavored Markdown with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax. Use when working with .md files in Obsidian, or when the user mentions wikilinks, callouts, frontmatter, tags, embeds, or Obsidian notes.",
    letter: "O",
    letterBg: "bg-purple-100 dark:bg-purple-950/50",
    letterColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "using-git-worktrees",
    name: "using-git-worktrees",
    badge: "superpowers",
    description:
      "Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification",
    letter: "U",
    letterBg: "bg-amber-100 dark:bg-amber-950/50",
    letterColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "finishing-a-development-branch",
    name: "finishing-a-development-branch",
    badge: "superpowers",
    description:
      "Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup",
    letter: "F",
    letterBg: "bg-orange-100 dark:bg-orange-950/50",
    letterColor: "text-orange-600 dark:text-orange-400",
  },
  {
    id: "copywriting",
    name: "copywriting",
    badge: "coreyhaines31/marketingskills",
    description:
      'When the user wants to write, rewrite, or improve marketing copy for any page — including homepage, landing pages, pricing pages, feature pages, about pages, or product pages. Also use when the user says "write copy for", "improve this copy", "rewrite this copy", "marketing copy", "headline help", "CTA copy", "value proposition", "tagline", "subheadline", "h...',
    letter: "C",
    letterBg: "bg-teal-100 dark:bg-teal-950/50",
    letterColor: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "vercel-react-best-practices",
    name: "vercel-react-best-practices",
    badge: "vercel-labs/agent-skills",
    description:
      "React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements.",
    letter: "V",
    letterBg: "bg-cyan-100 dark:bg-cyan-950/50",
    letterColor: "text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "frontend-dev",
    name: "frontend-dev",
    badge: "comate",
    description:
      "全栈前端开发 Skill，融合高质量 UI 设计、电影级动画、AI 生成媒体素材、有说服力的营销文案和视觉艺术能力。用于构建完整且有视觉冲击力的网页，可结合真实媒体、高级特效和高转化文案。适用于落地页、营销页、产品页、仪表盘、媒体素材生成（图片/视频/音频/音乐）、转化型文案撰写、生成式艺术，以及电影级滚动动画实现等场景。",
    letter: "F",
    letterBg: "bg-amber-100 dark:bg-amber-950/50",
    letterColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "markdown-skill",
    name: "markdown-skill",
    badge: "comate",
    description:
      "使用 'markdown' CLI 将文档转换为 Markdown。支持 PDF、Word、PowerPoint、Excel、图片 OCR、音频转写、HTML、YouTube 和 URL；当用户需要文件或网页转 Markdown、提取 PDF/图片文本、转写音视频或批量转换文档时使用。",
    letter: "M",
    letterBg: "bg-amber-100 dark:bg-amber-950/50",
    letterColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "github",
    name: "github",
    badge: "comate",
    description:
      "使用 GitHub 官方 'gh' CLI 处理 GitHub 事务。适用于查看或创建 issue、管理 PR、检查 GitHub Actions/CI 运行状态；需要更细的仓库数据或常规命令无法完成的操作时，可通过 'gh api' 调用 GitHub API。",
    letter: "G",
    letterBg: "bg-green-100 dark:bg-green-950/50",
    letterColor: "text-green-600 dark:text-green-400",
  },
];

const MCP_DATA = [
  {
    id: "memory",
    name: "Memory",
    badge: "NPX",
    description: "增强 Agent 持久记忆。",
    icon: Brain,
  },
  {
    id: "sequential-thinking",
    name: "Sequential-Thinking",
    badge: "NPX",
    description:
      "一种结构化的问题解决工具，可以对复杂的推理任务进行逐步分析、思维修正和分支逻辑。",
    icon: Calendar,
  },
  {
    id: "github-mcp",
    name: "GitHub",
    badge: "NPX",
    description:
      "全面的 GitHub API 集成，支持存储库管理、文件操作、问题跟踪、拉取请求处理以及跨代码、问题和用户的高级搜索功能。",
    icon: Code2,
  },
  {
    id: "filesystem",
    name: "Filesystem",
    badge: "NPX",
    description:
      "提供全面的文件系统操作，包括读取、写入、移动文件、目录管理以及具有模式匹配和格式化功能的高级文件编辑。",
    icon: Folder,
  },
  {
    id: "git-mcp",
    name: "Git",
    badge: "UVX",
    description:
      "提供 Git 存储库交互和自动化工具，用于通过 status、diff、commit、branch management 等命令读取、搜索和操作 Git 存储库。",
    icon: GitBranch,
  },
  {
    id: "time",
    name: "Time",
    badge: "UVX",
    description:
      "使用 IANA 时区名称提供时间和时区转换功能，并自动检测系统时区并支持时间查询。",
    icon: Clock,
  },
  {
    id: "fetch",
    name: "Fetch",
    badge: "UVX",
    description:
      "便 LLM 能够检索和处理网页内容，并将 HTML 转换为 Markdown 格式，以便于使用。",
    icon: Globe,
  },
  {
    id: "excel",
    name: "Excel",
    badge: "UVX",
    description:
      "让您无需安装 Microsoft Excel 即可操作 Excel 文件。使用您的 AI 代理创建、读取和修改 Excel 工作簿。",
    icon: FileSpreadsheet,
  },
  {
    id: "context7",
    name: "Context7",
    badge: "NPX",
    description:
      "直接从源中提取最新的、特定版本的文档和代码示例，并将它们直接放入您的提示中",
    icon: Code2,
  },
  {
    id: "mysql",
    name: "MySQL",
    badge: "UVX",
    description:
      "可实现与 MySQL 数据库的安全交互。此服务器组件促进 SQL 应用程序（主机/客户端）与 MySQL 数据库之间的通信，通过受控接口数据库探索和分析更加安全、结构化。",
    icon: Database,
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    badge: "NPX",
    description: "可以连接到 Kubernetes 集群并对其进行管理。",
    icon: Server,
  },
];

const PLUGINS_DATA = [
  {
    id: "prettier",
    name: "Prettier - Code Formatter",
    badge: "v10.4",
    description:
      "Opinionated code formatter supporting JS, TS, CSS, JSON, and Markdown with zero configuration required.",
    icon: Puzzle,
  },
  {
    id: "eslint",
    name: "ESLint Quality Checker",
    badge: "v8.57",
    description:
      "Pluggable JavaScript & TypeScript static code analysis utility for enforcing code style and catching syntax defects.",
    icon: Puzzle,
  },
  {
    id: "tailwind-ls",
    name: "Tailwind CSS Autocomplete",
    badge: "v0.10",
    description:
      "Intelligent Tailwind CSS class autocompletion, linting, and hover preview for JSX and React components.",
    icon: Puzzle,
  },
  {
    id: "python-ls",
    name: "Python Language Server",
    badge: "v2024.2",
    description:
      "Rich type checking, auto-imports, symbol navigation, and docstring formatting for Python workspace files.",
    icon: Puzzle,
  },
  {
    id: "docker-ls",
    name: "Docker Container Manager",
    badge: "v1.2",
    description:
      "Build, inspect, run, and debug local Docker containers and Docker Compose stacks directly from the editor.",
    icon: Puzzle,
  },
];

const SUBAGENTS_DATA = [
  {
    id: "code-reviewer-agent",
    name: "Code Reviewer Agent",
    badge: "Agent",
    description:
      "Automated PR code reviewer for identifying potential bugs, memory leaks, performance bottlenecks, and architectural issues.",
    icon: Bot,
  },
  {
    id: "ui-specialist-agent",
    name: "UI/UX Design Specialist",
    badge: "Agent",
    description:
      "Design auditor focused on visual hierarchy, color contrast ratios, responsive layout consistency, and WCAG accessibility compliance.",
    icon: Sparkles,
  },
  {
    id: "db-architect-agent",
    name: "Database Architect",
    badge: "Agent",
    description:
      "Expert agent for SQL query optimization, Drizzle/Prisma schema migrations, indexing strategies, and database connection pooling.",
    icon: Database,
  },
  {
    id: "security-auditor-agent",
    name: "Security Auditor",
    badge: "Agent",
    description:
      "Scans workspace code for OWASP Top 10 security risks, hardcoded secrets, unsanitized API inputs, and unsafe dependencies.",
    icon: ShieldAlert,
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialCategory = "account",
  onCategoryChange,
}) => {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    autoSave,
    setAutoSave,
    agentThinking,
    setAgentThinking,
    approvalPolicy,
    setApprovalPolicy,
    defaultModel,
    setDefaultModel,
    apiKey,
    setApiKey,
    enableIndexing,
    setEnableIndexing,
    protocol,
    setProtocol,
    enabledModels,
    toggleModelStatus,
    customProviders,
    backendModels,
    addCustomProvider,
    updateCustomProvider,
    deleteCustomProvider,
    deleteModel,
    t,
    backendApiUrl,
    setBackendApiUrl,
    user,
    refreshModels,
    testModelConnection,
  } = useSettings();

  const { showSuccess, showError, showInfo, showWarning } = useToast();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    tokens: string;
    requests: number;
    level: number;
  } | null>(null);

  const [customName, setCustomName] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModelId, setCustomModelId] = useState("");
  const [customProto, setCustomProto] = useState<"openai" | "anthropic" | "gemini">("openai");
  const [customError, setCustomError] = useState("");

  // Connectivity Test States
  const [isTestingModalConn, setIsTestingModalConn] = useState(false);
  const [testingModelIdMap, setTestingModelIdMap] = useState<Record<string, boolean>>({});

  const [isProtocolOpen, setIsProtocolOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);

  // Account token state
  const [showToken, setShowToken] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);

  // Account usage chart view mode
  const [usageViewMode, setUsageViewMode] = useState<"day" | "month">("day");

  // Extensions (能力扩展) state
  const [extensionSubTab, setExtensionSubTab] = useState<"market" | "installed">("market");
  const [extensionSearchQuery, setExtensionSearchQuery] = useState("");
  const [installedItems, setInstalledItems] = useState<Record<string, boolean>>({});
  const [isManualMcpOpen, setIsManualMcpOpen] = useState(false);
  const [mcpConfigJson, setMcpConfigJson] = useState(`{
  "mcpServers": {
    "custom-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"]
    }
  }
}`);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Skill market (loaded from the backend, per-user install state)
  const [marketSkills, setMarketSkills] = useState<MarketSkill[]>([]);
  const [installingSkillId, setInstallingSkillId] = useState<string | null>(null);

  // Web search settings (联网搜索) — per-user, backend-persisted
  const [wsBackend, setWsBackend] = useState<SearchBackendKind>("tavily");
  const [wsTavilyKey, setWsTavilyKey] = useState("");
  const [wsBraveKey, setWsBraveKey] = useState("");
  const [wsBaseUrl, setWsBaseUrl] = useState("");
  const [wsShowKey, setWsShowKey] = useState(false);
  const [isWsBackendOpen, setIsWsBackendOpen] = useState(false);
  const [wsSaving, setWsSaving] = useState(false);
  const [wsTesting, setWsTesting] = useState(false);
  const [wsLoaded, setWsLoaded] = useState(false);
  const [wsHasSavedTavilyKey, setWsHasSavedTavilyKey] = useState(false);
  const [wsHasSavedBraveKey, setWsHasSavedBraveKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshModels();
    }
  }, [isOpen, activeCategory]);

  // Load web-search settings when the page is first opened
  useEffect(() => {
    if (!isOpen || activeCategory !== "web_search" || wsLoaded) return;
    const load = async () => {
      if (user?.token) {
        try {
          const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
          const s = await getSearchSettings(baseUrl, user.token);
          setWsBackend(s.backend === "brave" ? "brave" : "tavily");
          setWsTavilyKey(s.tavilyApiKey); // mask sentinel or ""
          setWsBraveKey(s.braveApiKey);
          setWsBaseUrl(s.baseUrl);
          setWsHasSavedTavilyKey(s.hasTavilyKey);
          setWsHasSavedBraveKey(s.hasBraveKey);
        } catch (err: any) {
          console.warn("Failed to load web search settings:", err);
          showError(t("加载失败", "Load Failed"), err?.message || String(err));
        }
      } else {
        try {
          const raw = localStorage.getItem("app_web_search_settings");
          if (raw) {
            const s = JSON.parse(raw);
            setWsBackend(s.backend === "brave" ? "brave" : "tavily");
            setWsTavilyKey(s.tavily_api_key || "");
            setWsBraveKey(s.brave_api_key || "");
            setWsBaseUrl(s.base_url || "");
            setWsHasSavedTavilyKey(Boolean(s.tavily_api_key));
            setWsHasSavedBraveKey(Boolean(s.brave_api_key));
          }
        } catch {
          /* ignore malformed local settings */
        }
      }
      setWsLoaded(true);
    };
    load();
  }, [isOpen, activeCategory, wsLoaded, user?.token, backendApiUrl]);

  const handleSaveSearchSettings = async () => {
    if (wsSaving) return;
    const keyForBackend =
      wsBackend === "tavily"
        ? wsTavilyKey.trim() || (wsHasSavedTavilyKey ? "saved" : "")
        : wsBraveKey.trim() || (wsHasSavedBraveKey ? "saved" : "");
    if (!keyForBackend) {
      const errMsg = t(
        "请填写所选后端的 API Key，或切换到已配置密钥的后端",
        "Please enter the API key for the selected backend"
      );
      showError(t("保存失败", "Save Failed"), errMsg);
      return;
    }
    setWsSaving(true);
    try {
      // Sentinel / empty = keep stored key (server contract)
      const body = {
        backend: wsBackend,
        tavily_api_key: wsTavilyKey === "••••••••" ? "" : wsTavilyKey.trim(),
        brave_api_key: wsBraveKey === "••••••••" ? "" : wsBraveKey.trim(),
        base_url: wsBaseUrl.trim(),
      };
      if (user?.token) {
        const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
        const s = await saveSearchSettings(baseUrl, user.token, body);
        setWsTavilyKey(s.tavilyApiKey);
        setWsBraveKey(s.braveApiKey);
        setWsHasSavedTavilyKey(s.hasTavilyKey);
        setWsHasSavedBraveKey(s.hasBraveKey);
        showSuccess(
          t("联网搜索配置已保存", "Web Search Settings Saved"),
          t("Agent 的 web_search 工具将使用此配置", "The web_search tool will use this configuration")
        );
      } else {
        localStorage.setItem(
          "app_web_search_settings",
          JSON.stringify({ ...body, updated_at: new Date().toISOString() })
        );
        setWsHasSavedTavilyKey(Boolean(body.tavily_api_key) || wsHasSavedTavilyKey);
        setWsHasSavedBraveKey(Boolean(body.brave_api_key) || wsHasSavedBraveKey);
        showSuccess(
          t("已在本地保存", "Saved Locally"),
          t("登录后可同步到服务端供 Agent 使用", "Log in to sync to the server for the agent")
        );
      }
    } catch (err: any) {
      showError(t("保存失败", "Save Failed"), err?.message || String(err));
    } finally {
      setWsSaving(false);
    }
  };

  const handleTestSearchSettings = async () => {
    if (wsTesting) return;
    if (!user?.token) {
      showWarning(t("请先登录", "Log In First"), t("连通性测试需要登录（会消耗一次搜索额度）", "Testing requires login (consumes one search credit)"));
      return;
    }
    setWsTesting(true);
    try {
      const baseUrl = backendApiUrl || localStorage.getItem("app_backend_api_url") || "https://agent.hery.cloud";
      const res = await testSearchSettings(baseUrl, user.token, {
        backend: wsBackend,
        // Untouched (sentinel/empty) fields fall back to the saved key server-side
        tavily_api_key: wsTavilyKey === "••••••••" ? "" : wsTavilyKey.trim(),
        brave_api_key: wsBraveKey === "••••••••" ? "" : wsBraveKey.trim(),
        base_url: wsBaseUrl.trim(),
      });
      if (res.success) {
        showSuccess(
          t("连通性测试成功", "Connection Test Passed"),
          res.message + (res.latency_ms ? ` (${Math.round(res.latency_ms)}ms)` : "")
        );
      } else {
        showError(t("连通性测试失败", "Connection Test Failed"), res.message);
      }
    } catch (err: any) {
      showError(t("连通性测试失败", "Connection Test Failed"), err?.message || String(err));
    } finally {
      setWsTesting(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshModels();
    setTimeout(() => {
      setIsRefreshing(false);
      showSuccess(t("已成功同步后端模型列表", "Models refreshed"), t("已为您拉取最新的可供使用的模型服务", "Fetched latest models list from server"));
    }, 600);
  };

  const handleTestModalConnection = async () => {
    setCustomError("");
    if (!customBaseUrl.trim() || !customModelId.trim()) {
      const errMsg = t("请至少填写 Base URL 与模型标识符", "Please fill in Base URL and Model ID");
      showError(t("连通性测试失败", "Connection Test Failed"), errMsg);
      return;
    }
    setIsTestingModalConn(true);
    try {
      const res = await testModelConnection({
        id: editingModelId || undefined,
        provider: customName.trim() || "Custom",
        protocol: customProto,
        base_url: customBaseUrl.trim(),
        api_key: customApiKey.trim(),
        model: customModelId.trim(),
      });
      if (res.success) {
        showSuccess(
          t("连通性测试成功", "Connection Test Passed"),
          res.message + (res.latency_ms ? ` (${Math.round(res.latency_ms)}ms)` : "")
        );
      } else {
        showError(t("连通性测试失败", "Connection Test Failed"), res.message);
      }
    } catch (err: any) {
      const errMsg = err.message || t("测试异常", "Test Exception");
      showError(t("连通性测试失败", "Connection Test Failed"), errMsg);
    } finally {
      setIsTestingModalConn(false);
    }
  };

  const handleTestModelItem = async (model: any) => {
    const modelId = model.id;
    const cp = (customProviders || []).find((p) => p.modelName === model.id || p.id === model.id) ||
               (backendModels || []).find((bm) => bm.id === model.id);

    const providerName = (cp && "provider" in cp ? (cp as any).provider : cp?.name) || model.provider || "System";
    const baseUrlVal = cp?.baseUrl || model.baseUrl || "https://api.openai.com/v1";
    const apiKeyVal = (cp && "apiKey" in cp && (cp as any).apiKey && (cp as any).apiKey !== "••••••••") ? (cp as any).apiKey : "";
    const modelCodeVal = cp?.modelName || model.modelName || model.id;
    const protocolVal = cp?.protocol || model.protocol || "openai";

    setTestingModelIdMap((prev) => ({ ...prev, [modelId]: true }));
    try {
      const res = await testModelConnection({
        id: modelId,
        provider: providerName,
        protocol: protocolVal,
        base_url: baseUrlVal,
        api_key: apiKeyVal,
        model: modelCodeVal,
      });
      if (res.success) {
        showSuccess(
          t("连通性测试成功", "Test Success"),
          `${model.name}: ${res.message}${res.latency_ms ? ` (${Math.round(res.latency_ms)}ms)` : ""}`
        );
      } else {
        showError(t("连通性测试失败", "Test Failed"), `${model.name}: ${res.message}`);
      }
    } catch (err: any) {
      const errMsg = err.message || t("测试失败", "Test failed");
      showError(t("连通性测试失败", "Test Failed"), `${model.name}: ${errMsg}`);
    } finally {
      setTestingModelIdMap((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  const handleSaveCustomProvider = async () => {
    setCustomError("");
    if (!customName.trim() || !customBaseUrl.trim() || !customApiKey.trim() || !customModelId.trim()) {
      const errMsg = t("请填写完整的供应商、Base URL、API Key 与模型标识符", "Please fill in Provider Name, Base URL, API Key and Model ID");
      setCustomError(errMsg);
      showError(t("保存失败", "Save Failed"), errMsg);
      return;
    }
    try {
      const pName = customName.trim();
      if (editingModelId) {
        await updateCustomProvider(editingModelId, {
          name: pName,
          baseUrl: customBaseUrl.trim(),
          apiKey: customApiKey.trim(),
          modelName: customModelId.trim(),
          protocol: customProto,
        });
        showSuccess(t("自定义供应商更新成功", "Provider Updated"), t(`已成功更新供应商 ${pName}`, `Successfully updated provider ${pName}`));
      } else {
        await addCustomProvider({
          name: pName,
          baseUrl: customBaseUrl.trim(),
          apiKey: customApiKey.trim(),
          modelName: customModelId.trim(),
          protocol: customProto,
        });
        showSuccess(t("自定义供应商保存成功", "Provider Saved"), t(`已成功添加供应商 ${pName}`, `Successfully added provider ${pName}`));
      }
      setCustomName("");
      setCustomBaseUrl("");
      setCustomApiKey("");
      setCustomModelId("");
      setEditingModelId(null);
      setIsAddCustomModalOpen(false);
    } catch (err: any) {
      const errMsg = err.message || t("保存自定义供应商失败，请检查网络或配置。", "Failed to save provider.");
      setCustomError(errMsg);
      showError(t("保存失败", "Save Failed"), errMsg);
    }
  };

  const toggleInstall = (id: string, name?: string) => {
    setInstalledItems((prev) => {
      const isCurrentlyInstalled = !!prev[id];
      const nextState = !isCurrentlyInstalled;
      if (nextState) {
        showSuccess(t("扩展已启用", "Extension Enabled"), t(`已成功启用 ${name || id}`, `Enabled ${name || id}`));
      } else {
        showInfo(t("扩展已禁用", "Extension Disabled"), t(`已停用 ${name || id}`, `Disabled ${name || id}`));
      }
      return {
        ...prev,
        [id]: nextState,
      };
    });
  };

  const loadMarketSkills = async () => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token) return;
    try {
      const list = await getSkillMarket(baseUrl, token);
      setMarketSkills(list);
    } catch {
      // Keep last known list; background load failures are non-fatal.
    }
  };

  const handleInstallToggle = async (skill: MarketSkill) => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token) {
      showError(t("未登录", "Not logged in"), t("请先登录后再安装技能", "Please log in to install skills"));
      return;
    }
    setInstallingSkillId(skill.id);
    try {
      if (skill.installed) {
        await uninstallSkill(baseUrl, token, skill.id);
        showSuccess(t("技能已卸载", "Skill Uninstalled"), t(`已卸载 ${skill.name || skill.id}`, `Uninstalled ${skill.name || skill.id}`));
      } else {
        await installSkill(baseUrl, token, skill.id);
        showSuccess(t("技能已安装", "Skill Installed"), t(`已安装 ${skill.name || skill.id}`, `Installed ${skill.name || skill.id}`));
      }
      await loadMarketSkills();
    } catch (err: any) {
      showError(t("操作失败", "Operation Failed"), err?.message || t("技能操作失败，请稍后重试", "Skill operation failed, please retry"));
    } finally {
      setInstallingSkillId(null);
    }
  };

  const isExtensionCategory =
    activeCategory === "extensions" ||
    activeCategory === "plugins" ||
    activeCategory === "skills" ||
    activeCategory === "mcp" ||
    activeCategory === "sub_agents";

  const currentExtensionTab: "plugins" | "skills" | "mcp" | "sub_agents" =
    activeCategory === "extensions"
      ? "skills"
      : (activeCategory as "plugins" | "skills" | "mcp" | "sub_agents");

  useEffect(() => {
    if (isOpen && currentExtensionTab === "skills") {
      loadMarketSkills();
    }
  }, [isOpen, currentExtensionTab]);

  useEffect(() => {
    if (isOpen && initialCategory) {
      if (initialCategory === "extensions") {
        setActiveCategory("skills");
      } else {
        setActiveCategory(initialCategory);
      }
    }
  }, [isOpen, initialCategory]);

  const onCategoryChangeRef = useRef(onCategoryChange);
  useEffect(() => {
    onCategoryChangeRef.current = onCategoryChange;
  }, [onCategoryChange]);

  useEffect(() => {
    if (activeCategory && onCategoryChangeRef.current) {
      onCategoryChangeRef.current(activeCategory);
    }
  }, [activeCategory]);

  const settingsNavItems: NavItem[] = [
    { id: "account", label: t("账户用量", "Account & Usage"), icon: User },
    { id: "general", label: t("通用", "General"), icon: Settings },
    { id: "agent", label: t("Agent 设置", "Agent Settings"), icon: Bot },
    { id: "memory", label: t("记忆", "Memory"), icon: BookOpen },
    { id: "commands", label: t("命令", "Commands"), icon: Terminal },
    { id: "models", label: t("模型", "Models"), icon: Boxes },
    { id: "web_search", label: t("联网搜索", "Web Search"), icon: Globe },
    { id: "code_index", label: t("代码索引", "Code Index"), icon: Database },
    { id: "logs", label: t("日志", "Logs"), icon: Cloud },
  ];

  const extensionNavItems: NavItem[] = [
    { id: "plugins", label: t("插件", "Plugins"), icon: Puzzle },
    { id: "skills", label: t("技能", "Skills"), icon: Wrench },
    { id: "mcp", label: t("MCP", "MCP"), icon: Plug },
    { id: "sub_agents", label: t("子智能体", "Subagents"), icon: Users },
  ];

  const filteredSettingsNav = settingsNavItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExtensionNav = extensionNavItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate GitHub-style heatmap data (52 weeks x 7 days)
  const generateHeatmapData = () => {
    const months = ["8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月", "4月", "5月", "6月", "7月"];
    const weeks: Array<Array<{ level: number; date: string; tokens: string; requests: number }>> = [];
    
    let seed = 1234;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const startDate = new Date(2025, 7, 1);

    for (let w = 0; w < 52; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + w * 7 + d);

        const rand = pseudoRandom();
        let level = 0;
        let tokens = "0";
        let requests = 0;

        const isWeekend = d === 5 || d === 6;
        const prob = isWeekend ? 0.35 : 0.75;

        if (rand < prob) {
          if (rand > 0.6) {
            level = 4;
            tokens = `${Math.floor(120 + pseudoRandom() * 80)}K`;
            requests = Math.floor(40 + pseudoRandom() * 30);
          } else if (rand > 0.4) {
            level = 3;
            tokens = `${Math.floor(60 + pseudoRandom() * 50)}K`;
            requests = Math.floor(20 + pseudoRandom() * 20);
          } else if (rand > 0.2) {
            level = 2;
            tokens = `${Math.floor(20 + pseudoRandom() * 35)}K`;
            requests = Math.floor(8 + pseudoRandom() * 12);
          } else {
            level = 1;
            tokens = `${Math.floor(2 + pseudoRandom() * 15)}K`;
            requests = Math.floor(1 + pseudoRandom() * 7);
          }
        }

        const dateStr = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;
        days.push({ level, date: dateStr, tokens, requests });
      }
      weeks.push(days);
    }

    return { months, weeks };
  };

  const heatmapData = generateHeatmapData();

  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-emerald-200 border-emerald-300/60 hover:bg-emerald-300";
      case 2:
        return "bg-emerald-400 border-emerald-500/60 hover:bg-emerald-500";
      case 3:
        return "bg-emerald-600 border-emerald-700/60 hover:bg-emerald-700";
      case 4:
        return "bg-emerald-800 border-emerald-900/60 hover:bg-emerald-900";
      default:
        return "bg-gray-100 border-gray-200/60 hover:bg-gray-200/80";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.99, y: 6 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 w-screen h-screen flex overflow-hidden bg-white dark:bg-[#0a0a0a] font-sans text-gray-800 dark:text-zinc-100"
    >
      {/* Left Settings Sub-Sidebar */}
      <div className="w-[220px] shrink-0 border-r border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] p-3 flex flex-col justify-between select-none">
        <div className="flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 px-1.5 pt-1">
            <span className="text-base font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              {t("设置与扩展", "Settings & Extensions")}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative mb-3 px-0.5">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t("搜索设置和扩展...", "Search settings and extensions...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>

          {/* Navigation Items List */}
          <div className="space-y-3 overflow-y-auto pr-0.5 max-h-[calc(100vh-160px)] scrollbar-thin">
            {/* Group 1: Settings */}
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                {t("偏好设置", "PREFERENCES")}
              </div>
              {filteredSettingsNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeCategory === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg transition-all text-left relative cursor-pointer ${
                      isActive
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-semibold shadow-2xs"
                        : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 relative z-10 ${
                        isActive ? "text-gray-900 dark:text-zinc-100" : "text-gray-500 dark:text-zinc-400"
                      }`}
                    />
                    <span className="truncate relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Group 2: Extensions */}
            <div className="space-y-0.5 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>{t("能力扩展", "EXTENSIONS")}</span>
                <span className="text-[9px] bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 px-1.5 py-0.2 rounded font-mono font-medium">
                  4
                </span>
              </div>
              {filteredExtensionNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeCategory === item.id || (activeCategory === "extensions" && item.id === "skills");
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg transition-all text-left relative cursor-pointer ${
                      isActive
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-semibold shadow-2xs"
                        : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 relative z-10 ${
                        isActive ? "text-gray-900 dark:text-zinc-100" : "text-gray-500 dark:text-zinc-400"
                      }`}
                    />
                    <span className="truncate relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {filteredSettingsNav.length === 0 && filteredExtensionNav.length === 0 && (
              <div className="py-6 text-center text-xs text-gray-400 dark:text-zinc-500">
                {t("未找到相关项目", "No matching items found")}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="pt-2 border-t border-gray-200 dark:border-zinc-800 px-1 text-[11px] text-gray-400 dark:text-zinc-500 flex items-center justify-between">
          <span>{t("版本 v3.8.0", "Version v3.8.0")}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t("已联机", "Online")}</span>
        </div>
      </div>

      {/* Right Main Settings Panel (Embedded View) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0a0a0a] overflow-y-auto">
        {/* Header Bar */}
        <div className="h-12 border-b border-gray-200/70 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
              {isExtensionCategory
                ? extensionNavItems.find((i) => i.id === currentExtensionTab)?.label
                : settingsNavItems.find((i) => i.id === activeCategory)?.label}
            </h2>

            {/* Extension Sub-Tabs (市场 / 已安装) */}
            {isExtensionCategory && (
              <div className="flex items-center gap-4 text-xs">
                <button
                  onClick={() => setExtensionSubTab("market")}
                  className={`py-1 cursor-pointer transition-colors relative ${
                    extensionSubTab === "market"
                      ? "font-semibold text-gray-900 dark:text-zinc-100"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {t("市场", "Marketplace")}
                  {extensionSubTab === "market" && (
                    <motion.div
                      layoutId="extensionSubTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-zinc-100 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setExtensionSubTab("installed")}
                  className={`py-1 cursor-pointer transition-colors relative ${
                    extensionSubTab === "installed"
                      ? "font-semibold text-gray-900 dark:text-zinc-100"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {t("已安装", "Installed")}
                  {extensionSubTab === "installed" && (
                    <motion.div
                      layoutId="extensionSubTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-zinc-100 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isExtensionCategory && currentExtensionTab === "mcp" && (
              <button
                onClick={() => setIsManualMcpOpen(true)}
                className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 cursor-pointer font-medium"
              >
                {t("手动配置", "Manual Config")}
              </button>
            )}

            {isExtensionCategory && (
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 cursor-pointer"
                title={t("刷新", "Refresh")}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{t("刷新", "Refresh")}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={t("关闭", "Close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${extensionSubTab}-${language}`}
              initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* EXTENSIONS VIEW */}
              {isExtensionCategory && (
                <div className="space-y-4">
                  {/* Search Box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        currentExtensionTab === "mcp"
                          ? t("在市场中搜索 MCP Server", "Search MCP Servers in marketplace")
                          : currentExtensionTab === "skills"
                          ? t("搜索 Skill", "Search Skills")
                          : currentExtensionTab === "plugins"
                          ? t("搜索 插件", "Search Plugins")
                          : t("搜索 子智能体", "Search Subagents")
                      }
                      value={extensionSearchQuery}
                      onChange={(e) => setExtensionSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600 transition-all shadow-2xs"
                    />
                  </div>

                  {/* Skills tab */}
                  {currentExtensionTab === "skills" && (
                    <div className="space-y-2.5">
                      {marketSkills.filter((item) => {
                        const matchQuery =
                          item.name.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
                          item.enName.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(extensionSearchQuery.toLowerCase());
                        if (extensionSubTab === "installed") {
                          return matchQuery && item.installed;
                        }
                        return matchQuery;
                      }).map((skill) => (
                        <div
                          key={skill.id}
                          className="p-3.5 rounded-lg border border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-gray-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0"
                              >
                                {(skill.enName || skill.name).charAt(0).toUpperCase()}
                              </div>
                              <div className="font-semibold text-xs text-gray-900 dark:text-zinc-100 truncate font-mono">
                                {skill.id}
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-zinc-800/80 text-gray-500 dark:text-zinc-400 border border-gray-200/70 dark:border-zinc-700/60 shrink-0 font-sans">
                                {skill.category}
                              </span>
                            </div>
                            <button
                              onClick={() => handleInstallToggle(skill)}
                              disabled={installingSkillId === skill.id}
                              className={`px-3 py-1 rounded text-xs font-medium transition-all shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                skill.installed
                                  ? "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                  : "border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850"
                              }`}
                            >
                              {skill.installed ? t("已安装", "Installed") : t("安装", "Install")}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {skill.description}
                          </p>
                        </div>
                      ))}
                      {marketSkills.length === 0 && (
                        <div className="py-6 text-center text-xs text-gray-400 dark:text-zinc-500">
                          {t("未获取到技能市场数据", "No skill market data")}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MCP tab */}
                  {currentExtensionTab === "mcp" && (
                    <div className="space-y-2.5">
                      {MCP_DATA.filter((item) => {
                        const matchQuery =
                          item.name.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
                          item.badge.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(extensionSearchQuery.toLowerCase());
                        if (extensionSubTab === "installed") {
                          return matchQuery && installedItems[item.id];
                        }
                        return matchQuery;
                      }).map((mcp) => {
                        const Icon = mcp.icon;
                        return (
                          <div
                            key={mcp.id}
                            className="p-3.5 rounded-lg border border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-gray-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                                <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4 text-gray-700 dark:text-zinc-300" />
                                </div>
                                <div className="font-semibold text-xs text-gray-900 dark:text-zinc-100 truncate font-mono">
                                  {mcp.name}
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200/70 dark:border-zinc-700/60 shrink-0">
                                  {mcp.badge}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleInstall(mcp.id)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all shrink-0 cursor-pointer ${
                                  installedItems[mcp.id]
                                    ? "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                    : "border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850"
                                }`}
                              >
                                {installedItems[mcp.id] ? t("已添加", "Added") : t("添加", "Add")}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed pl-6">
                              {mcp.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Plugins tab */}
                  {currentExtensionTab === "plugins" && (
                    <div className="space-y-2.5">
                      {PLUGINS_DATA.filter((item) => {
                        const matchQuery =
                          item.name.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(extensionSearchQuery.toLowerCase());
                        if (extensionSubTab === "installed") {
                          return matchQuery && installedItems[item.id];
                        }
                        return matchQuery;
                      }).map((plugin) => (
                        <div
                          key={plugin.id}
                          className="p-3.5 rounded-lg border border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-gray-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                                <Puzzle className="w-4 h-4" />
                              </div>
                              <div className="font-semibold text-xs text-gray-900 dark:text-zinc-100 truncate">
                                {plugin.name}
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200/70 dark:border-zinc-700/60 shrink-0">
                                {plugin.badge}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleInstall(plugin.id)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-all shrink-0 cursor-pointer ${
                                installedItems[plugin.id]
                                  ? "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                  : "border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850"
                              }`}
                            >
                              {installedItems[plugin.id] ? t("已安装", "Installed") : t("安装", "Install")}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {plugin.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sub-agents tab */}
                  {currentExtensionTab === "sub_agents" && (
                    <div className="space-y-2.5">
                      {SUBAGENTS_DATA.filter((item) => {
                        const matchQuery =
                          item.name.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(extensionSearchQuery.toLowerCase());
                        if (extensionSubTab === "installed") {
                          return matchQuery && installedItems[item.id];
                        }
                        return matchQuery;
                      }).map((agent) => {
                        const Icon = agent.icon;
                        return (
                          <div
                            key={agent.id}
                            className="p-3.5 rounded-lg border border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-gray-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="font-semibold text-xs text-gray-900 dark:text-zinc-100 truncate">
                                  {agent.name}
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200/70 dark:border-zinc-700/60 shrink-0">
                                  {agent.badge}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleInstall(agent.id)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all shrink-0 cursor-pointer ${
                                  installedItems[agent.id]
                                    ? "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                    : "border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850"
                                }`}
                              >
                                {installedItems[agent.id] ? t("已启用", "Enabled") : t("启用", "Enable")}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                              {agent.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {/* CATEGORY 0: 账户用量 */}
              {activeCategory === "account" && (
                <div className="space-y-4 text-xs text-gray-700 dark:text-zinc-300 font-sans">
                  {/* Account Overview Header */}
                  <div className="p-4 rounded-md border border-gray-200/90 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {user?.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt={user.name || "User Avatar"} 
                          className="w-10 h-10 rounded object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm flex items-center justify-center shrink-0">
                          {(user?.name || user?.email || "Y").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-zinc-100">{user?.name || "User"}</span>
                        </div>
                        <span className="text-gray-500 dark:text-zinc-400 text-xs">{user?.email || "No email"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Authentication Tokens Section */}
                  <div className="p-4 rounded-md border border-gray-200/90 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-bold text-gray-900 dark:text-zinc-100">{t("当前登录 Token 凭证", "Current Login Token Credentials")}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">{t("用于 API 身份验证", "Used for API Authentication")}</span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Access Token */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 mb-1">
                          <span>Access Token (Bearer Token)</span>
                          {user?.token && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(user.token || "");
                                showSuccess(t("复制成功", "Copied Successfully"), t("Access Token 已复制到剪贴板", "Access Token copied to clipboard"));
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <Copy className="w-3 h-3" />
                              {t("复制 Token", "Copy Token")}
                            </button>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type={showToken ? "text" : "password"}
                            readOnly
                            value={user?.token || t("未登录或无 Token", "Not logged in or no token")}
                            className="w-full font-mono text-[11px] px-3 py-2 pr-9 bg-white dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-700/80 rounded-md text-gray-900 dark:text-zinc-100 select-all focus:outline-none"
                          />
                          {user?.token && (
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                              title={showToken ? t("隐藏", "Hide") : t("显示", "Show")}
                            >
                              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Refresh Token if available */}
                      {user?.refreshToken && (
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 mb-1">
                            <span>Refresh Token</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(user.refreshToken || "");
                                showSuccess(t("复制成功", "Copied Successfully"), t("Refresh Token 已复制到剪贴板", "Refresh Token copied to clipboard"));
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <Copy className="w-3 h-3" />
                              {t("复制 Token", "Copy Token")}
                            </button>
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type={showRefreshToken ? "text" : "password"}
                              readOnly
                              value={user.refreshToken}
                              className="w-full font-mono text-[11px] px-3 py-2 pr-9 bg-white dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-700/80 rounded-md text-gray-900 dark:text-zinc-100 select-all focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRefreshToken(!showRefreshToken)}
                              className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                              title={showRefreshToken ? t("隐藏", "Hide") : t("显示", "Show")}
                            >
                              {showRefreshToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly Quota Metric */}
                  <div className="p-4 rounded-md border border-gray-200/90 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-zinc-100">{t("本月 Token 用量", "Monthly Token Usage")}</div>
                        <div className="text-gray-500 dark:text-zinc-400 text-[11px] mt-0.5">
                          {t("计费周期：2026-07-01 至 2026-08-01（距重置还有 2 天）", "Billing cycle: 2026-07-01 to 2026-08-01 (2 days to reset)")}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-base text-gray-900 dark:text-zinc-100">
                          1,284,500
                        </span>
                        <span className="text-gray-400 dark:text-zinc-500 text-xs font-mono"> / 5,000,000</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gray-900 dark:bg-zinc-200 h-full rounded-full transition-all duration-500"
                        style={{ width: "25.7%" }}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                      <div className="p-2.5 rounded bg-white dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                        <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("已用额度", "Quota Used")}</div>
                        <div className="font-mono font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">25.7%</div>
                      </div>
                      <div className="p-2.5 rounded bg-white dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                        <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("本月请求数", "Monthly Reqs")}</div>
                        <div className="font-mono font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">{t("3,420 次", "3,420 reqs")}</div>
                      </div>
                      <div className="p-2.5 rounded bg-white dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                        <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("平均响应速度", "Avg Response")}</div>
                        <div className="font-mono font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">{t("1.2 秒", "1.2 sec")}</div>
                      </div>
                      <div className="p-2.5 rounded bg-white dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                        <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("并发限制", "Concurrency Limit")}</div>
                        <div className="font-mono font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">10 QPS</div>
                      </div>
                    </div>
                  </div>

                  {/* Usage Breakdown By Model Table */}
                  <div className="p-4 rounded-md border border-gray-200/90 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-xs">{t("模型用量分布", "Usage Distribution by Model")}</h3>
                      <span className="text-gray-400 text-[11px]">{t("按 Token 消耗倒序", "Sorted by Token consumption")}</span>
                    </div>

                    <div className="overflow-x-auto bg-white dark:bg-zinc-800/80 rounded p-3 border border-gray-200/80 dark:border-zinc-700/60">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 font-medium">
                            <th className="py-2 px-1">{t("模型名称", "Model Name")}</th>
                            <th className="py-2 px-1 text-right">Input Tokens</th>
                            <th className="py-2 px-1 text-right">Output Tokens</th>
                            <th className="py-2 px-1 text-right">{t("请求数", "Requests")}</th>
                            <th className="py-2 px-1 text-right">{t("占比", "Ratio")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-700/60 font-mono text-[11px]">
                          {(() => {
                            const modelsToDisplay = (backendModels && backendModels.length > 0)
                              ? backendModels.map(m => m.id || m.name)
                              : ["glm-4-7", "glm-5-turbo", "deepseek-v4-pro"];

                            const usageStats = [
                              { inputTokens: "620,100", outputTokens: "200,000", reqs: "2,150", ratio: "63.8%" },
                              { inputTokens: "210,400", outputTokens: "102,000", reqs: "840", ratio: "24.3%" },
                              { inputTokens: "110,000", outputTokens: "42,000", reqs: "430", ratio: "11.9%" },
                            ];

                            return modelsToDisplay.slice(0, 3).map((mId, idx) => {
                              const stat = usageStats[idx] || usageStats[0];
                              return (
                                <tr key={mId}>
                                  <td className="py-2.5 px-1 font-sans font-medium text-gray-900 dark:text-zinc-100">
                                    {mId}
                                  </td>
                                  <td className="py-2.5 px-1 text-right text-gray-600 dark:text-zinc-400">{stat.inputTokens}</td>
                                  <td className="py-2.5 px-1 text-right text-gray-600 dark:text-zinc-400">{stat.outputTokens}</td>
                                  <td className="py-2.5 px-1 text-right text-gray-600 dark:text-zinc-400">{stat.reqs}</td>
                                  <td className="py-2.5 px-1 text-right font-semibold text-gray-900 dark:text-zinc-100">
                                    {stat.ratio}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Clean Activity Bar Chart with Day / Month Toggle */}
                  <div className="p-4 rounded-md border border-gray-200/90 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-xs">
                          {usageViewMode === "day"
                            ? "近 30 天每日用量（ Tokens ）"
                            : "近 12 个月每月用量（ Tokens ）"}
                        </h3>
                        <span className="text-gray-400 text-[11px] font-mono">
                          {usageViewMode === "day" ? "平均 42.8K / 天" : "月均 1.05M Tokens"}
                        </span>
                      </div>

                      {/* Day / Month Toggle Buttons */}
                      <div className="flex items-center bg-gray-200/80 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] self-start sm:self-auto font-medium">
                        <button
                          type="button"
                          onClick={() => setUsageViewMode("day")}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            usageViewMode === "day"
                              ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-semibold shadow-2xs"
                              : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                          }`}
                        >
                          {t("按天", "Daily")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUsageViewMode("month")}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            usageViewMode === "month"
                              ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-semibold shadow-2xs"
                              : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                          }`}
                        >
                          {t("按月", "Monthly")}
                        </button>
                      </div>
                    </div>

                    {usageViewMode === "day" ? (
                      <>
                        <div className="h-28 flex items-end justify-between gap-1 pt-4 pb-1 border-b border-gray-200 dark:border-zinc-800">
                          {[
                            35, 42, 60, 20, 15, 80, 95, 40, 50, 75, 30, 25, 85, 110, 65, 45, 30, 70, 90, 100, 55, 40, 20, 60,
                            80, 120, 75, 50, 65, 85,
                          ].map((val, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                              <div
                                className="w-full bg-gray-300 dark:bg-zinc-700 group-hover:bg-gray-900 dark:group-hover:bg-zinc-100 rounded-xs transition-colors"
                                style={{ height: `${(val / 120) * 100}%` }}
                              />
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-7 px-1.5 py-0.5 bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] rounded font-mono pointer-events-none transition-opacity z-10 whitespace-nowrap">
                                {val}K
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                          <span>{t("7月1日", "Jul 1")}</span>
                          <span>{t("7月15日", "Jul 15")}</span>
                          <span>{t("今天 (7月30日)", "Today (Jul 30)")}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-28 flex items-end justify-between gap-1.5 pt-4 pb-1 border-b border-gray-200 dark:border-zinc-800 px-1">
                          {[
                            { month: t("2025年8月", "Aug 2025"), label: "8", tokens: "620K", val: 620 },
                            { month: t("2025年9月", "Sep 2025"), label: "9", tokens: "750K", val: 750 },
                            { month: t("2025年10月", "Oct 2025"), label: "10", tokens: "890K", val: 890 },
                            { month: t("2025年11月", "Nov 2025"), label: "11", tokens: "940K", val: 940 },
                            { month: t("2025年12月", "Dec 2025"), label: "12", tokens: "1.05M", val: 1050 },
                            { month: t("2026年1月", "Jan 2026"), label: "1", tokens: "1.12M", val: 1120 },
                            { month: t("2026年2月", "Feb 2026"), label: "2", tokens: "820K", val: 820 },
                            { month: t("2026年3月", "Mar 2026"), label: "3", tokens: "950K", val: 950 },
                            { month: t("2026年4月", "Apr 2026"), label: "4", tokens: "1.10M", val: 1100 },
                            { month: t("2026年5月", "May 2026"), label: "5", tokens: "1.45M", val: 1450 },
                            { month: t("2026年6月", "Jun 2026"), label: "6", tokens: "1.30M", val: 1300 },
                            { month: t("2026年7月", "Jul 2026"), label: "7", tokens: "1.28M", val: 1284 },
                          ].map((item, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                              <div
                                className="w-full bg-gray-300 dark:bg-zinc-700 group-hover:bg-gray-900 dark:group-hover:bg-zinc-100 rounded-xs transition-colors"
                                style={{ height: `${(item.val / 1500) * 100}%` }}
                              />
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 px-2 py-0.5 bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] rounded font-mono pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-md">
                                {item.month}: {item.tokens}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between text-[10px] text-gray-500 dark:text-zinc-400 font-mono px-1">
                          <span>{t("8月", "Aug")}</span>
                          <span>{t("9月", "Sep")}</span>
                          <span>{t("10月", "Oct")}</span>
                          <span>{t("11月", "Nov")}</span>
                          <span>{t("12月", "Dec")}</span>
                          <span>{t("1月", "Jan")}</span>
                          <span>{t("2月", "Feb")}</span>
                          <span>{t("3月", "Mar")}</span>
                          <span>{t("4月", "Apr")}</span>
                          <span>{t("5月", "May")}</span>
                          <span>{t("6月", "Jun")}</span>
                          <span className="font-bold text-gray-900 dark:text-zinc-100">{t("7月", "Jul")}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* CATEGORY 1: 通用 */}
              {activeCategory === "general" && (
                <div className="space-y-4 text-xs text-gray-700 dark:text-zinc-300">
                  <div className="p-4 bg-[#f8f9fa] dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-md space-y-4 shadow-2xs">
                    {/* Server Address Setting */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-900 dark:text-zinc-100">{t("后端服务地址", "Backend Server Address")}</label>
                      <p className="text-gray-400 dark:text-zinc-500 text-[11px]">{t("配置 CodeEngine 后端 API 服务地址，切换后所有 API 请求将发送到新地址", "Configure the CodeEngine backend API server. All API requests will be sent to the new address after switching.")}</p>
                      <div className="pt-1">
                        <ServerAddressSelector variant="settings" />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200/70 dark:border-zinc-800 space-y-1 relative">
                      <label className="block text-xs font-bold text-gray-900 dark:text-zinc-100">{t("界面语言", "Display Language")}</label>
                      <p className="text-gray-400 dark:text-zinc-500 text-[11px]">{t("选择系统首选显示语言", "Choose preferred system language")}</p>
                      
                      <div className="relative max-w-xs mt-1">
                        <button
                          type="button"
                          onClick={() => setIsLangOpen(!isLangOpen)}
                          className="w-full bg-white dark:bg-zinc-800 border border-gray-200/90 dark:border-zinc-700 rounded-md px-3 py-1.5 text-xs text-gray-800 dark:text-zinc-100 flex items-center justify-between hover:border-gray-300 dark:hover:border-zinc-600 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="font-medium text-xs text-gray-900 dark:text-zinc-100">
                            {language === "zh-CN" && "简体中文 (Chinese Simplified)"}
                            {language === "en-US" && "English (US)"}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 transition-transform duration-150 ${isLangOpen ? "rotate-180 text-gray-700 dark:text-zinc-200" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {isLangOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsLangOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 py-1 overflow-hidden"
                              >
                                {[
                                  { id: "zh-CN", name: "简体中文 (Chinese Simplified)" },
                                  { id: "en-US", name: "English (US)" },
                                ].map((item) => {
                                  const isSelected = language === item.id;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setLanguage(item.id as "zh-CN" | "en-US");
                                        setIsLangOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                        isSelected ? "bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-semibold" : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-750"
                                      }`}
                                    >
                                      <span className="font-medium text-xs">{item.name}</span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-zinc-100 shrink-0 ml-2" />}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200/70 dark:border-zinc-800 space-y-1.5">
                      <label className="block text-xs font-bold text-gray-900 dark:text-zinc-100">{t("主题外观", "Theme Appearance")}</label>
                      <p className="text-gray-400 dark:text-zinc-500 text-[11px]">{t("调整应用界面视觉色调", "Adjust application visual color theme")}</p>
                      <div className="flex gap-2 pt-0.5">
                        {[
                          { id: "light", label: t("浅色模式", "Light") },
                          { id: "dark", label: t("深色模式", "Dark") },
                          { id: "system", label: t("跟随系统", "System") },
                        ].map((tItem) => (
                          <button
                            key={tItem.id}
                            onClick={() => {
                              setTheme(tItem.id as any);
                              showSuccess(t("主题外观已更新", "Theme Updated"), t(`已切换至 ${tItem.label}`, `Switched to ${tItem.label}`));
                            }}
                            className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all shadow-2xs cursor-pointer ${
                              theme === tItem.id
                                ? "border-gray-900 bg-gray-900 dark:border-zinc-100 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                                : "border-gray-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-750"
                            }`}
                          >
                            {tItem.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200/70 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-gray-900 dark:text-zinc-100">{t("编辑器自动保存", "Editor Auto-Save")}</span>
                        <span className="text-gray-400 dark:text-zinc-500 text-[11px]">{t("修改代码后自动实时写回本地文件", "Automatically save changes to local files in real time")}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !autoSave;
                          setAutoSave(nextVal);
                          if (nextVal) {
                            showSuccess(t("自动保存已开启", "Auto-Save Enabled"), t("修改代码后将实时自动保存", "Changes will be saved automatically"));
                          } else {
                            showInfo(t("自动保存已关闭", "Auto-Save Disabled"), t("需要使用 Ctrl+S / Cmd+S 手动保存代码", "Use Ctrl+S to save code manually"));
                          }
                        }}
                        className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer shrink-0 ${
                          autoSave ? "bg-[#2563eb] dark:bg-blue-600" : "bg-gray-300 dark:bg-zinc-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform transform ${
                            autoSave ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 2: Agent 设置 */}
              {activeCategory === "agent" && (
                <div className="space-y-4 text-xs text-gray-700 dark:text-zinc-300">
                  <div className="p-4 bg-[#f8f9fa] dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-md space-y-4 shadow-2xs">
                    <div className="space-y-1 relative">
                      <label className="block text-xs font-bold text-gray-900 dark:text-zinc-100">{t("Agent 深度思考等级", "Agent Thinking Depth")}</label>
                      <p className="text-gray-400 dark:text-zinc-500 text-[11px]">{t("控制 Agent 解决复杂代码逻辑时的推演深度与采样频次", "Control reasoning depth and sampling frequency when solving complex code logic")}</p>
                      
                      <div className="relative max-w-xs mt-1">
                        <button
                          type="button"
                          onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                          className="w-full bg-white dark:bg-zinc-800 border border-gray-200/90 dark:border-zinc-700 rounded-md px-3 py-1.5 text-xs text-gray-800 dark:text-zinc-100 flex items-center justify-between hover:border-gray-300 dark:hover:border-zinc-600 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="font-medium text-xs text-gray-900 dark:text-zinc-100">
                            {agentThinking === "high" && t("高 (深入推理与逻辑核查)", "High (Deep reasoning & logic check)")}
                            {agentThinking === "medium" && t("中 (平衡速度与推理质量)", "Medium (Balanced speed & quality)")}
                            {agentThinking === "fast" && t("极速 (优先快速响应)", "Fast (Prioritize speed)")}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 transition-transform duration-150 ${isThinkingOpen ? "rotate-180 text-gray-700 dark:text-zinc-200" : ""}`} />
                        </button>

                        {isThinkingOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsThinkingOpen(false)}
                            />
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                              {[
                                { id: "high", name: t("高 (深入推理与逻辑核查)", "High (Deep reasoning & logic check)"), desc: t("深度逻辑推演与多维重构方案分析", "Deep logic deduction and multi-dimensional refactoring analysis") },
                                { id: "medium", name: t("中 (平衡速度与推理质量)", "Medium (Balanced speed & quality)"), desc: t("适合日常常规需求开发与常规 Bug 修复", "Suitable for routine feature development and standard bug fixes") },
                                { id: "fast", name: t("极速 (优先快速响应)", "Fast (Prioritize speed)"), desc: t("降低思考延时，提升响应速度", "Reduce thinking latency for faster responses") },
                              ].map((item) => {
                                const isSelected = agentThinking === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setAgentThinking(item.id as any);
                                      setIsThinkingOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                      isSelected ? "bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-semibold" : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-750"
                                    }`}
                                  >
                                    <div>
                                      <div className="font-medium text-xs">{item.name}</div>
                                      <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{item.desc}</div>
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-zinc-100 shrink-0 ml-2" />}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200/70 dark:border-zinc-800">
                      <div className="mb-2.5">
                        <span className="block text-xs font-bold text-gray-900 dark:text-zinc-100">{t("命令审批策略", "Command Approval Policy")}</span>
                        <span className="text-gray-400 dark:text-zinc-500 text-[11px]">{t("控制 Agent 执行终端命令前是否需要用户确认", "Control whether Agent needs user confirmation before running commands")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { value: "auto", label: t("自动执行", "Auto"), desc: t("仅危险命令（rm/sudo/kill 等）需确认", "Only prompt for dangerous commands (rm/sudo/kill etc.)") },
                          { value: "strict", label: t("始终询问", "Strict"), desc: t("每个工具调用都需确认", "Prompt for every tool invocation") },
                        ] as const).map(({ value, label, desc }) => {
                          const isActive = approvalPolicy === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setApprovalPolicy(value);
                                showSuccess(t("审批策略已更新", "Approval Policy Updated"), `${label} — ${desc}`);
                              }}
                              className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                                isActive
                                  ? "border-[#2563eb] dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-gray-900 dark:text-zinc-100 shadow-2xs"
                                  : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-600"
                              }`}
                            >
                              <div className="font-semibold text-xs flex items-center gap-1.5">
                                {isActive && <Check className="w-3 h-3 text-[#2563eb] dark:text-blue-400 shrink-0" />}
                                {label}
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 3: 记忆 */}
              {activeCategory === "memory" && (
                <div className="space-y-3 text-xs text-gray-700 dark:text-zinc-300">
                  <div className="p-4 bg-[#f8f9fa] dark:bg-zinc-900/60 rounded-md border border-gray-200/90 dark:border-zinc-800 space-y-2 shadow-2xs">
                    <div className="font-bold text-gray-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-gray-600 dark:text-zinc-400" />
                      {t("项目上下文记忆", "Project Context Memory")}
                    </div>
                    <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-[11px]">
                      {t("AI Studio 自动学习并保持项目架构约定、框架配置及组件编码风格，无需在每次对话中重复交代背景。", "AI Studio automatically learns and retains project architectural conventions, framework configurations, and component coding styles without repeating background context.")}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-800 rounded-md flex justify-between items-center shadow-2xs">
                    <span className="text-gray-600 dark:text-zinc-300 text-xs font-medium">{t("当前项目已积累 12,000 Token 记忆片段", "Current project has accumulated 12,000 Token memory fragments")}</span>
                    <button
                      onClick={() => showSuccess(t("历史记忆已清空", "Memory Cleared"), t("项目上下文记忆片段已重置", "Context memory fragments cleared"))}
                      className="px-3 py-1.5 border border-red-200 dark:border-red-900/60 bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-xs transition-colors font-medium shadow-2xs cursor-pointer"
                    >
                      {t("清除历史记忆", "Clear Memory History")}
                    </button>
                  </div>
                </div>
              )}

              {/* CATEGORY 4: 命令 */}
              {activeCategory === "commands" && (
                <div className="space-y-3 text-xs text-gray-700 dark:text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 dark:text-zinc-100">{t("快捷指令列表", "Shortcut Commands")}</span>
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">{t("在聊天框中输入 / 唤起指令", "Type / in chat box to trigger commands")}</span>
                  </div>
                  <div className="border border-gray-200/90 dark:border-zinc-800 rounded-md divide-y divide-gray-100 dark:divide-zinc-800/80 overflow-hidden bg-[#f8f9fa] dark:bg-zinc-900/60 shadow-2xs">
                    <div className="p-3 flex items-center justify-between hover:bg-white dark:hover:bg-zinc-850 transition-colors">
                      <div className="font-mono text-gray-900 dark:text-zinc-100 font-semibold text-xs">/lint</div>
                      <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("执行代码风格与语法校验", "Run code style and syntax verification")}</div>
                    </div>
                    <div className="p-3 flex items-center justify-between hover:bg-white dark:hover:bg-zinc-850 transition-colors">
                      <div className="font-mono text-gray-900 dark:text-zinc-100 font-semibold text-xs">/build</div>
                      <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("构建全栈生产应用制品", "Build full-stack production application artifacts")}</div>
                    </div>
                    <div className="p-3 flex items-center justify-between hover:bg-white dark:hover:bg-zinc-850 transition-colors">
                      <div className="font-mono text-gray-900 dark:text-zinc-100 font-semibold text-xs">/test</div>
                      <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("启动自动化单元测试套件", "Run automated unit test suite")}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 5: 模型设置 */}
              {activeCategory === "models" && (
                <div className="space-y-4 text-xs text-gray-800 dark:text-zinc-200">
                  {/* Header Bar */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 tracking-tight">{t("模型设置", "Model Settings")}</h3>
                      <p className="text-gray-400 dark:text-zinc-500 text-xs mt-0.5">
                        {t("系统中可用的 AI 大语言模型及供应商状态", "Available LLMs and provider statuses in the system")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingModelId(null);
                        setCustomName("");
                        setCustomBaseUrl("");
                        setCustomApiKey("");
                        setCustomModelId("");
                        setCustomProto("openai");
                        setCustomError("");
                        setIsAddCustomModalOpen(true);
                      }}
                      className="p-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-750 hover:text-gray-900 dark:hover:text-zinc-100 transition-all rounded-md shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
                      title={t("新增自定义模型", "Add Custom Model")}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Individual Model Cards Stack */}
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                    {(() => {
                      const savedDeleted = localStorage.getItem("app_deleted_models");
                      let deletedSet = new Set<string>();
                      if (savedDeleted) {
                        try { deletedSet = new Set(JSON.parse(savedDeleted)); } catch (_) {}
                      }

                      const baseList = (backendModels || []).map(bm => ({
                        id: bm.id,
                        name: bm.name,
                        hasLink: true,
                        hasImage: !!bm.hasImage,
                        desc: bm.description || `${bm.provider || "System"} AI Model (${bm.protocol || "openai"})`,
                        provider: bm.provider,
                        isSystem: bm.isSystem === true,
                        isCustom: bm.isSystem === false,
                      }));

                      // Merge local customProviders if not already in baseList
                      const existingIds = new Set(baseList.map(m => m.id));
                      const extraCustomList = (customProviders || [])
                        .filter(cp => cp.modelName && !existingIds.has(cp.modelName) && !existingIds.has(cp.id))
                        .map(cp => ({
                          id: cp.modelName || cp.id,
                          name: cp.modelName || cp.name,
                          hasLink: true,
                          hasImage: false,
                          desc: `${cp.name} Custom Model (${cp.protocol})`,
                          provider: cp.name,
                          isSystem: false,
                          isCustom: true,
                        }));

                      const rawList = [...baseList, ...extraCustomList];

                      const initialList = rawList.filter(m => !deletedSet.has(m.id));

                      const seenKeys = new Set<string>();
                      const listToRender = initialList.filter(m => {
                        const key = m.id || m.name;
                        if (!key || seenKeys.has(key)) return false;
                        seenKeys.add(key);
                        return true;
                      });

                      if (listToRender.length === 0) {
                        return (
                          <div className="py-12 text-center text-xs text-gray-500 dark:text-zinc-400 font-sans">
                            {t("暂无模型列表，点击右上角同步按钮获取，或添加自定义模型", "No models found. Click Refresh above or add a custom model.")}
                          </div>
                        );
                      }

                      return listToRender.map((model: any) => {
                        const isEnabled = enabledModels[model.id] !== false;
                        const isSystemModel = model.isSystem === true;
                        const isCustomModel = model.isCustom || model.isSystem === false;

                        return (
                          <motion.div
                            key={model.id}
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            layout
                            className="px-3.5 py-2.5 bg-[#f8f9fa] dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-md hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-850 transition-all space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-gray-900 dark:text-zinc-100 text-xs md:text-sm tracking-tight">
                                  {model.name}
                                </span>
                                {isSystemModel ? (
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                                    {t("系统模型", "System")}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
                                    {t("自定义", "Custom")}
                                  </span>
                                )}
                                {model.provider && model.provider !== "System" && model.provider !== "Custom" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-mono border border-gray-200 dark:border-zinc-700">
                                    {model.provider}
                                  </span>
                                )}
                                {model.hasLink && (
                                  <LinkIcon className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 stroke-[1.6]" />
                                )}
                                {model.hasImage && (
                                  <ImageIcon className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 stroke-[1.6]" />
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Connectivity Test Button */}
                                <button
                                  type="button"
                                  onClick={() => handleTestModelItem(model)}
                                  disabled={testingModelIdMap[model.id]}
                                  className="px-2 py-0.5 text-xs text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                                  title={t("测试此模型的 API 连通性", "Test API connectivity for this model")}
                                >
                                  {testingModelIdMap[model.id] ? (
                                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Activity className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
                                  )}
                                  <span className="hidden sm:inline text-[11px]">{t("测试", "Test")}</span>
                                </button>
                                {/* Edit Model Button (ONLY for Custom Models) */}
                                {isCustomModel && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cp = (customProviders || []).find((p) => p.modelName === model.id || p.id === model.id) ||
                                                 (backendModels || []).find((bm) => bm.id === model.id);
                                      setEditingModelId(model.id);
                                      setCustomName(cp?.name || (cp && "provider" in cp ? (cp as any).provider : "") || model.provider || "");
                                      setCustomBaseUrl(cp?.baseUrl || model.baseUrl || "");
                                      setCustomApiKey(cp && "apiKey" in cp && (cp as any).apiKey && (cp as any).apiKey !== "••••••••" ? (cp as any).apiKey : "");
                                      setCustomModelId(cp?.modelName || model.id || "");
                                      setCustomProto((cp?.protocol || model.protocol || "openai") as any);
                                      setCustomError("");
                                      setIsAddCustomModalOpen(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer shrink-0"
                                    title={t("编辑此自定义模型", "Edit this custom model")}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete Model Button (ONLY for Custom Models) */}
                                {isCustomModel && (
                                  <button
                                    type="button"
                                    onClick={() => setModelToDelete({ id: model.id, name: model.name })}
                                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer shrink-0"
                                    title={t("删除此自定义模型", "Delete this custom model")}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Clean Blue Pill Switch */}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextState = !isEnabled;
                                    await toggleModelStatus(model.id);
                                    if (nextState) {
                                      showSuccess(t("模型已启用", "Model Enabled"), t(`已启用 ${model.name}`, `Enabled ${model.name}`));
                                    } else {
                                      showInfo(t("模型已停用", "Model Disabled"), t(`已停用 ${model.name}`, `Disabled ${model.name}`));
                                    }
                                  }}
                                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer shrink-0 ${
                                    isEnabled ? "bg-[#2563eb] dark:bg-blue-600" : "bg-gray-300 dark:bg-zinc-700"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform transform ${
                                      isEnabled ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {model.desc && (
                              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-snug">
                                {model.desc}
                              </p>
                            )}
                          </motion.div>
                        );
                      });
                    })()}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* CATEGORY: 联网搜索 */}
              {activeCategory === "web_search" && (
                <div className="space-y-4 text-xs text-gray-700 dark:text-zinc-300">
                  <div className="p-4 bg-[#f8f9fa] dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-md shadow-2xs">
                    <div className="font-bold text-gray-900 dark:text-zinc-100 text-xs">
                      {t("联网搜索 (web_search)", "Web Search (web_search)")}
                    </div>
                    <div className="text-gray-400 dark:text-zinc-500 text-[11px] mt-0.5 leading-relaxed">
                      {t(
                        "Agent 的 web_search 工具将使用以下配置进行联网搜索。个人配置优先于服务端全局配置，修改后下一次搜索立即生效。",
                        "The agent's web_search tool uses this configuration. Personal settings take precedence over the server's global config and apply from the next search."
                      )}
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200/90 dark:border-zinc-800 rounded-md bg-[#f8f9fa] dark:bg-zinc-900/60 space-y-4 shadow-2xs">
                    {/* Backend dropdown */}
                    <div className="space-y-1 relative">
                      <label className="block text-xs font-bold text-gray-900 dark:text-zinc-100">{t("搜索后端", "Search Backend")}</label>
                      <p className="text-gray-400 dark:text-zinc-500 text-[11px]">
                        {wsBackend === "tavily"
                          ? t("免费额度 1000 次/月，注册 tavily.com 获取 Key", "Free tier: 1000 credits/month — get a key at tavily.com")
                          : t("免费额度 2000 次/月，注册 brave.com 获取 Key", "Free tier: 2000 queries/month — get a key at brave.com")}
                      </p>

                      <div className="relative max-w-xs mt-1">
                        <button
                          type="button"
                          onClick={() => setIsWsBackendOpen(!isWsBackendOpen)}
                          className="w-full bg-white dark:bg-zinc-800 border border-gray-200/90 dark:border-zinc-700 rounded-md px-3 py-1.5 text-xs text-gray-800 dark:text-zinc-100 flex items-center justify-between hover:border-gray-300 dark:hover:border-zinc-600 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="font-medium text-xs text-gray-900 dark:text-zinc-100">
                            {wsBackend === "tavily" ? "Tavily" : "Brave"}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 transition-transform duration-150 ${isWsBackendOpen ? "rotate-180 text-gray-700 dark:text-zinc-200" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {isWsBackendOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsWsBackendOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 py-1 overflow-hidden"
                              >
                                {[
                                  { id: "tavily" as const, name: "Tavily", desc: t("免费额度 1000 次/月", "Free tier: 1000 credits/month") },
                                  { id: "brave" as const, name: "Brave", desc: t("免费额度 2000 次/月", "Free tier: 2000 queries/month") },
                                ].map((item) => {
                                  const isSelected = wsBackend === item.id;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setWsBackend(item.id);
                                        setIsWsBackendOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-xs flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                                        isSelected
                                          ? "bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-semibold"
                                          : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-750"
                                      }`}
                                    >
                                      <span>
                                        <span className="block font-medium text-xs">{item.name}</span>
                                        <span className="block text-[10px] font-normal text-gray-400 dark:text-zinc-500">{item.desc}</span>
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-zinc-100 shrink-0 mt-0.5" />}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* API key for the selected backend */}
                    <div className="pt-3 border-t border-gray-200/70 dark:border-zinc-800 space-y-1">
                      <label className="block text-xs font-bold text-gray-900 dark:text-zinc-100">
                        {wsBackend === "tavily" ? "Tavily API Key" : "Brave API Key"}
                      </label>
                      <p className="text-gray-400 dark:text-zinc-500 text-[11px]">
                        {(wsBackend === "tavily" ? wsTavilyKey : wsBraveKey) === "••••••••"
                          ? t("已保存（显示为掩码，留空提交不会覆盖）", "Saved (shown masked — submitting it unchanged keeps the stored key)")
                          : t("服务端加密存储，不会以明文回显", "Encrypted at rest; never echoed back in plaintext")}
                      </p>
                      <div className="relative">
                        <input
                          type={wsShowKey ? "text" : "password"}
                          value={wsBackend === "tavily" ? wsTavilyKey : wsBraveKey}
                          onChange={(e) =>
                            wsBackend === "tavily"
                              ? setWsTavilyKey(e.target.value)
                              : setWsBraveKey(e.target.value)
                          }
                          placeholder={wsBackend === "tavily" ? "tvly-..." : "BSA..."}
                          className="w-full bg-white dark:bg-zinc-800 border border-gray-200/90 dark:border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 transition-all pr-9 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setWsShowKey(!wsShowKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
                          title={wsShowKey ? t("隐藏", "Hide") : t("显示", "Show")}
                        >
                          {wsShowKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Optional base URL override */}
                    <div className="pt-3 border-t border-gray-200/70 dark:border-zinc-800 space-y-1">
                      <label className="block text-xs font-bold text-gray-900 dark:text-zinc-100">
                        {t("接口地址（高级，可选）", "Endpoint URL (advanced, optional)")}
                      </label>
                      <p className="text-gray-400 dark:text-zinc-500 text-[11px]">
                        {t("留空使用默认官方地址", "Leave empty to use the default official endpoint")}
                      </p>
                      <input
                        type="text"
                        value={wsBaseUrl}
                        onChange={(e) => setWsBaseUrl(e.target.value)}
                        placeholder={
                          wsBackend === "tavily"
                            ? "https://api.tavily.com/search"
                            : "https://api.search.brave.com/res/v1/web/search"
                        }
                        className="w-full bg-white dark:bg-zinc-800 border border-gray-200/90 dark:border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 transition-all shadow-2xs"
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-200/70 dark:border-zinc-800 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveSearchSettings}
                          disabled={wsSaving}
                          className={`flex-1 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shadow-2xs ${
                            wsSaving
                              ? "opacity-60 cursor-not-allowed bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                              : "bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200 cursor-pointer"
                          }`}
                        >
                          {wsSaving ? t("保存中…", "Saving…") : t("保存配置", "Save Settings")}
                        </button>
                        <button
                          type="button"
                          onClick={handleTestSearchSettings}
                          disabled={wsTesting || !user?.token}
                          title={!user?.token ? t("登录后可测试", "Log in to test") : undefined}
                          className={`flex-1 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all border shadow-2xs flex items-center justify-center gap-1.5 ${
                            wsTesting || !user?.token
                              ? "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400"
                              : "bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-750 text-gray-800 dark:text-zinc-200 border-gray-200/90 dark:border-zinc-700 cursor-pointer"
                          }`}
                        >
                          {wsTesting ? (
                            <>
                              <Activity className="w-3.5 h-3.5 animate-spin" />
                              {t("测试中…", "Testing…")}
                            </>
                          ) : (
                            t("测试连接", "Test Connection")
                          )}
                        </button>
                      </div>
                      <div className="text-gray-400 dark:text-zinc-500 text-[11px]">
                        {t("测试会执行一次真实搜索（消耗 1 次额度）", "Testing runs one real search (consumes 1 credit)")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 6: 代码索引 */}
              {activeCategory === "code_index" && (
                <div className="space-y-3 text-xs text-gray-700 dark:text-zinc-300">
                  <div className="p-4 bg-[#f8f9fa] dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-md flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-zinc-100 text-xs">{t("智能代码语义索引", "Smart Code Semantic Indexing")}</div>
                      <div className="text-gray-400 dark:text-zinc-500 text-[11px] mt-0.5">
                        {t("基于 AST 与向量引擎建立项目全量文件索引，加速符号定位", "Build full-file indexes based on AST and vector engine to accelerate symbol lookup.")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !enableIndexing;
                        setEnableIndexing(nextVal);
                        if (nextVal) {
                          showSuccess(t("智能代码语义索引已开启", "Smart Code Indexing Enabled"), t("项目全量 AST 与向量文件索引将同步维护", "AST and vector file indexes will be maintained"));
                        } else {
                          showInfo(t("智能代码语义索引已关闭", "Smart Code Indexing Disabled"));
                        }
                      }}
                      className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer shrink-0 ${
                        enableIndexing ? "bg-[#2563eb] dark:bg-blue-600" : "bg-gray-300 dark:bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform transform ${
                          enableIndexing ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-4 border border-gray-200/90 dark:border-zinc-800 rounded-md bg-[#f8f9fa] dark:bg-zinc-900/60 space-y-3 shadow-2xs">
                    <div className="flex justify-between items-center text-gray-800 dark:text-zinc-200 font-medium text-xs">
                      <span>{t("索引缓存状态", "Index Cache Status")}</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">{t("已就绪 (184 文件已同步)", "Ready (184 files synchronized)")}</span>
                    </div>
                    <button
                      onClick={() => {
                        showSuccess(t("代码索引构建已完成", "Code Index Rebuilt"), t("成功为 184 个代码文件建立 AST 语义与符号映射", "Synchronized AST and symbol mappings for 184 code files"));
                      }}
                      className="w-full py-2 border border-gray-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-all font-medium text-xs rounded-md shadow-2xs cursor-pointer"
                    >
                      {t("重新构建代码索引", "Rebuild Code Index")}
                    </button>
                  </div>
                </div>
              )}

              {/* CATEGORY 7: 日志 */}
              {activeCategory === "logs" && (
                <div className="space-y-3 text-xs text-gray-700 dark:text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 dark:text-zinc-100">{t("最近系统运行日志", "Recent System Logs")}</span>
                    <button className="text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1 font-medium text-xs cursor-pointer">
                      <RotateCcw className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                      <span>{t("刷新", "Refresh")}</span>
                    </button>
                  </div>
                  <div className="bg-gray-900 dark:bg-zinc-950 text-gray-200 dark:text-zinc-300 font-mono text-[11px] p-4 rounded-md h-56 overflow-y-auto space-y-1 border border-gray-800 dark:border-zinc-800 shadow-2xs">
                    <div>[07:38:12] [INFO] Dev server started on http://localhost:3000</div>
                    <div>[07:38:14] [INFO] Codebase index refreshed (184 files)</div>
                    <div>[07:40:02] [SUCCESS] Compile completed in 420ms</div>
                    <div>[07:40:05] [INFO] Settings modal invoked</div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Manual MCP Configuration Modal */}
      {isManualMcpOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                {t("MCP 服务器 JSON 手动配置", "Manual MCP Server JSON Configuration")}
              </h3>
              <button
                onClick={() => setIsManualMcpOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                {t("您可以直接在此处配置自定义 MCP 服务器 JSON (遵从 Model Context Protocol 配置文件规范)：", "You can directly configure custom MCP Server JSON here (following the Model Context Protocol specification):")}
              </p>
              <textarea
                value={mcpConfigJson}
                onChange={(e) => setMcpConfigJson(e.target.value)}
                rows={8}
                className="w-full font-mono text-xs p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600"
              />
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setIsManualMcpOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                {t("取消", "Cancel")}
              </button>
              <button
                onClick={() => {
                  try {
                    JSON.parse(mcpConfigJson);
                    setIsManualMcpOpen(false);
                    showSuccess(t("MCP 配置保存成功", "MCP Configuration Saved"), t("Model Context Protocol 服务器配置参数已生效", "MCP server configuration applied"));
                  } catch (e: any) {
                    showError(t("JSON 语法校验失败", "Invalid JSON Format"), t("请检查 JSON 配置文件语法格式是否合法", "Please check if JSON syntax is correct"));
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-gray-800 dark:hover:bg-zinc-200 cursor-pointer"
              >
                {t("保存配置", "Save Configuration")}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Custom Model Modal Popup */}
      {isAddCustomModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md shadow-2xl max-w-lg w-full relative flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 rounded-t-md bg-white dark:bg-zinc-900">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                  {editingModelId ? t("编辑自定义模型 API 供应商", "Edit Custom Model API Provider") : t("新增自定义模型 API 供应商", "Add Custom Model API Provider")}
                </h4>
                <p className="text-gray-400 dark:text-zinc-500 text-[11px] mt-0.5">
                  {t("配置标准 OpenAI / Anthropic 兼容协议端点", "Configure standard OpenAI / Anthropic protocol endpoints")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 text-xs flex-1">
              {customError && (
                <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-md border border-red-100 dark:border-red-900/60 font-medium">
                  ⚠️ {customError}
                </div>
              )}


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1 col-span-1 sm:col-span-2 relative">
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400">{t("协议类型", "Protocol Type")}</label>
                  
                  <button
                    type="button"
                    onClick={() => setIsProtocolOpen(!isProtocolOpen)}
                    className="w-full bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-gray-800 dark:text-zinc-100 flex items-center justify-between hover:border-gray-300 dark:hover:border-zinc-600 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="font-medium text-xs text-gray-900 dark:text-zinc-100">
                      {customProto === "openai" && t("OpenAI / Open-Compatible 协议", "OpenAI / Open-Compatible Protocol")}
                      {customProto === "anthropic" && t("Anthropic Messages 协议", "Anthropic Messages Protocol")}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 transition-transform duration-150 ${isProtocolOpen ? "rotate-180 text-gray-700 dark:text-zinc-200" : ""}`} />
                  </button>

                  {isProtocolOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsProtocolOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-40 py-1 overflow-hidden">
                        {[
                          { id: "openai", name: "OpenAI", desc: t("OpenAI Chat Completions 兼容协议 (支持 DeepSeek, 智谱, Qwen 等)", "OpenAI Chat Completions compatible protocol") },
                          { id: "anthropic", name: "Anthropic", desc: t("Anthropic Messages 协议", "Anthropic Messages protocol") },
                        ].map((item) => {
                          const isSelected = customProto === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setCustomProto(item.id as any);
                                setIsProtocolOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected ? "bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-semibold" : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50/80 dark:hover:bg-zinc-750"
                              }`}
                            >
                              <div>
                                <div className="font-medium text-xs">{item.name}</div>
                                <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{item.desc}</div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-zinc-100 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400">{t("供应商展示名称", "Provider Display Name")}</label>
                  <input
                    type="text"
                    placeholder={t("如: DeepSeek / 智谱", "e.g. DeepSeek / Zhipu")}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400">Base URL</label>
                  <input
                    type="text"
                    placeholder="https://api.deepseek.com/v1"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 font-mono transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400">API Key</label>
                  <input
                    type="password"
                    placeholder={editingModelId ? t("留空则使用已保存的密钥", "Leave empty to use saved key") : "sk-••••••••••••••••"}
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 font-mono transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-zinc-400">{t("模型标识符 (Model)", "Model")}</label>
                  <input
                    type="text"
                    placeholder={t("如: deepseek-chat 或 GLM-4", "e.g. deepseek-chat or GLM-4")}
                    value={customModelId}
                    onChange={(e) => setCustomModelId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 font-mono transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-2 rounded-b-md">
              <button
                type="button"
                onClick={handleTestModalConnection}
                disabled={isTestingModalConn}
                className="px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {isTestingModalConn ? (
                  <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-gray-600 dark:text-zinc-400" />
                )}
                <span>{isTestingModalConn ? t("正在测试...", "Testing...") : t("测试连通性", "Test Connection")}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomModalOpen(false)}
                  className="px-3 py-1 rounded-md border border-gray-200 dark:border-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {t("取消", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomProvider}
                  className="px-3.5 py-1 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-xs hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all rounded-md shadow-2xs cursor-pointer"
                >
                  {editingModelId ? t("更新供应商", "Update Provider") : t("保存供应商", "Save Provider")}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Model Confirmation Modal */}
      {modelToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md shadow-2xl max-w-sm w-full overflow-hidden"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-gray-900 dark:text-zinc-100 font-bold text-sm">
                <Trash2 className="w-4 h-4 shrink-0 text-gray-500 dark:text-zinc-400" />
                <span>{t("确认删除模型", "Confirm Delete Model")}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                {t(`确定要删除模型 "${modelToDelete.name}" 吗？此操作无法撤销。`, `Are you sure you want to delete model "${modelToDelete.name}"? This action cannot be undone.`)}
              </p>
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingModel}
                onClick={() => setModelToDelete(null)}
                className="px-3.5 py-1.5 rounded-md border border-gray-200 dark:border-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
              >
                {t("取消", "Cancel")}
              </button>
              <button
                type="button"
                disabled={isDeletingModel}
                onClick={async () => {
                  setIsDeletingModel(true);
                  try {
                    await deleteModel(modelToDelete.id);
                    showSuccess(t("模型已删除", "Model Deleted"), t(`已成功删除模型 ${modelToDelete.name}`, `Successfully deleted model ${modelToDelete.name}`));
                    setModelToDelete(null);
                  } catch (e: any) {
                    showError(t("删除失败", "Delete Failed"), e.message || t("删除模型失败", "Failed to delete model"));
                  } finally {
                    setIsDeletingModel(false);
                  }
                }}
                className="px-3.5 py-1.5 rounded-md bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-xs hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingModel && <div className="w-3 h-3 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" />}
                <span>{t("确认删除", "Confirm Delete")}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
