import React, { useState, useEffect, useMemo, useRef } from "react";
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
  listMemoryEntries,
  listMemoryThreads,
  deleteMemoryEntry,
  clearMemoryScope,
  type MemoryEntry,
  type MemoryScope,
  type MemoryThreadSummary,
} from "../lib/memoryApi";
import { listProjects } from "../lib/projectApi";
import { fetchUsageSummary, type UsageSummary } from "../lib/usageApi";
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

// Memory entry category badges (memory_entries.category from the backend pipeline)
const MEM_CATEGORY_STYLES: Record<string, { zh: string; en: string; cls: string }> = {
  preference: {
    zh: "偏好",
    en: "Preference",
    cls: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  },
  decision: {
    zh: "决策",
    en: "Decision",
    cls: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
  },
  project_context: {
    zh: "项目上下文",
    en: "Context",
    cls: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  },
  fact: {
    zh: "事实",
    en: "Fact",
    cls: "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300",
  },
};

// Lightweight custom dropdown for the memory pickers — native <select>
// popups don't follow the dark theme and look out of place.
const MemSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 border border-gray-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md text-xs text-gray-800 dark:text-zinc-200 shadow-2xs cursor-pointer hover:border-gray-300 dark:hover:border-zinc-600 transition-colors"
      >
        <span className="truncate">{current ? current.label : placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 max-h-[240px] overflow-y-auto rounded-md border border-gray-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg"
          >
            {options.length === 0 && (
              <div className="px-2.5 py-2 text-xs text-gray-400 dark:text-zinc-500">{placeholder}</div>
            )}
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  o.value === value
                    ? "bg-gray-100 dark:bg-zinc-700/60 text-gray-900 dark:text-zinc-100"
                    : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700/40"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && (
                  <Check className="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-zinc-400" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

  // Account usage chart view mode
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState("");

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

  // Memory settings (记忆) — real data from the backend two-phase memory pipeline
  const [memScope, setMemScope] = useState<MemoryScope>("user");
  const [memProjects, setMemProjects] = useState<{ id: string; name: string }[]>([]);
  const [memProjectId, setMemProjectId] = useState("");
  const [memThreads, setMemThreads] = useState<MemoryThreadSummary[]>([]);
  const [memThreadId, setMemThreadId] = useState("");
  const [memEntries, setMemEntries] = useState<MemoryEntry[]>([]);
  const [memLoading, setMemLoading] = useState(false);
  const [memError, setMemError] = useState("");
  const [memDeletingId, setMemDeletingId] = useState<string | null>(null);
  const [memClearArmed, setMemClearArmed] = useState(false);
  // Which category groups are expanded in the dropdown-style memory list.
  const [memOpenCats, setMemOpenCats] = useState<Record<string, boolean>>({});
  // Group entries by category for the collapsible list; unknown categories
  // fall back to "fact", matching MEM_CATEGORY_STYLES rendering.
  const memGroups = useMemo(() => {
    const byCat = new Map<string, MemoryEntry[]>();
    for (const e of memEntries) {
      const key = MEM_CATEGORY_STYLES[e.category] ? e.category : "fact";
      const list = byCat.get(key);
      if (list) list.push(e);
      else byCat.set(key, [e]);
    }
    return (["preference", "decision", "project_context", "fact"] as const)
      .filter((c) => (byCat.get(c) || []).length > 0)
      .map((c) => ({ category: c as string, entries: byCat.get(c)! }));
  }, [memEntries]);
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
    const cp = (backendModels || []).find((bm) => bm.id === model.id) ||
               (customProviders || []).find((p) => p.modelName === model.id || p.id === model.id);

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

  // -- Memory settings: load picker data once per open -----------------------
  const memBaseUrl = backendApiUrl || "https://agent.hery.cloud";
  const memToken = user?.token || "";

  useEffect(() => {
    if (!isOpen || activeCategory !== "memory" || !memToken) return;
    let cancelled = false;
    (async () => {
      try {
        const [projects, threads] = await Promise.all([
          listProjects(memBaseUrl, memToken),
          listMemoryThreads(memBaseUrl, memToken),
        ]);
        if (cancelled) return;
        setMemProjects(projects.map((p) => ({ id: p.id, name: p.name })));
        setMemThreads(threads);
        setMemProjectId((prev) => prev || projects[0]?.id || "");
        setMemThreadId((prev) => prev || threads[0]?.thread_id || "");
      } catch (err) {
        if (!cancelled) setMemError(String((err as Error)?.message || err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeCategory]);

  // -- Account usage: load real stats when the account tab opens -------------
  useEffect(() => {
    if (!isOpen || activeCategory !== "account" || !memToken) return;
    let cancelled = false;
    setUsageLoading(true);
    setUsageError("");
    (async () => {
      try {
        const summary = await fetchUsageSummary(memBaseUrl, memToken, 366);
        if (!cancelled) setUsageSummary(summary);
      } catch (err) {
        if (!cancelled) setUsageError(String((err as Error)?.message || err));
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeCategory]);

  // Reload entries whenever scope / project / thread selection changes.
  useEffect(() => {
    if (!isOpen || activeCategory !== "memory" || !memToken) return;
    if (memScope === "project" && !memProjectId) {
      setMemEntries([]);
      return;
    }
    if (memScope === "thread" && !memThreadId) {
      setMemEntries([]);
      return;
    }
    let cancelled = false;
    setMemLoading(true);
    setMemError("");
    setMemClearArmed(false);
    setMemOpenCats({});
    (async () => {
      try {
        const entries = await listMemoryEntries(memBaseUrl, memToken, {
          scope: memScope,
          projectId: memScope === "project" ? memProjectId : undefined,
          threadId: memScope === "thread" ? memThreadId : undefined,
        });
        if (!cancelled) setMemEntries(entries);
      } catch (err) {
        if (!cancelled) setMemError(String((err as Error)?.message || err));
      } finally {
        if (!cancelled) setMemLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeCategory, memScope, memProjectId, memThreadId]);

  const handleDeleteMemoryEntry = async (entryId: string) => {
    setMemDeletingId(entryId);
    try {
      await deleteMemoryEntry(memBaseUrl, memToken, entryId);
      setMemEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (memScope === "thread") {
        // Keep the thread picker counts in sync.
        setMemThreads((prev) =>
          prev
            .map((tr) =>
              tr.thread_id === memThreadId
                ? { ...tr, entry_count: tr.entry_count - 1 }
                : tr
            )
            .filter((tr) => tr.entry_count > 0)
        );
      }
      showSuccess(t("记忆已删除", "Memory Deleted"));
    } catch (err) {
      showError(t("删除失败", "Delete Failed"), String((err as Error)?.message || err));
    } finally {
      setMemDeletingId(null);
    }
  };

  const handleClearMemory = async () => {
    try {
      const removed = await clearMemoryScope(memBaseUrl, memToken, {
        scope: memScope,
        projectId: memScope === "project" ? memProjectId : undefined,
        threadId: memScope === "thread" ? memThreadId : undefined,
      });
      setMemEntries([]);
      if (memScope === "thread") {
        setMemThreads((prev) => prev.filter((tr) => tr.thread_id !== memThreadId));
      }
      showSuccess(t("记忆已清空", "Memory Cleared"), t(`已删除 ${removed} 条记忆`, `${removed} entries removed`));
    } catch (err) {
      showError(t("清空失败", "Clear Failed"), String((err as Error)?.message || err));
    } finally {
      setMemClearArmed(false);
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

  // Token number formatting: 1234 → "1.2K", 3400000 → "3.4M"
  const formatTokens = (n: number): string => {
    if (!isFinite(n) || n <= 0) return "0";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
    return String(n);
  };

  // GitHub-style heatmap over the usage summary: fixed 12-month window (52
  // weeks), columns stretch to fill the card width, cells stay square.
  const heatmapData = useMemo(() => {
    const byDay = new Map<string, { tokens: number; requests: number }>();
    for (const row of usageSummary?.days ?? []) {
      const cur = byDay.get(row.day) ?? { tokens: 0, requests: 0 };
      cur.tokens += row.input_tokens + row.output_tokens;
      cur.requests += row.requests;
      byDay.set(row.day, cur);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    const dowMon = (start.getDay() + 6) % 7; // Mon=0..Sun=6
    start.setDate(start.getDate() - dowMon - 51 * 7); // this week's Monday, 52 weeks back

    const fmtDay = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const cells: Array<{ level: number; day: string; date: string; tokens: number; requests: number }> = [];
    let maxTokens = 0;
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const key = fmtDay(d);
      const agg = byDay.get(key);
      const tokens = agg?.tokens ?? 0;
      maxTokens = Math.max(maxTokens, tokens);
      cells.push({
        level: 0,
        day: key,
        date: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
        tokens,
        requests: agg?.requests ?? 0,
      });
    }
    // Quartile levels over non-zero days.
    const q = maxTokens > 0 ? maxTokens / 4 : 0;
    for (const c of cells) {
      if (c.tokens <= 0) c.level = 0;
      else if (q > 0 && c.tokens <= q) c.level = 1;
      else if (q > 0 && c.tokens <= 2 * q) c.level = 2;
      else if (q > 0 && c.tokens <= 3 * q) c.level = 3;
      else c.level = 4;
    }

    // Split into week columns.
    const weeks: Array<Array<(typeof cells)[number]>> = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // Month label per week boundary (drawn under the grid).
    const months: Array<string | null> = weeks.map((w, i) => {
      const first = w[0];
      const prev = i > 0 ? weeks[i - 1][0] : null;
      const label = `${first.day.slice(5, 7)}月`;
      return prev && prev.day.slice(5, 7) === first.day.slice(5, 7) ? null : label;
    });

    return { months, weeks };
  }, [usageSummary]);

  // Last-30-days rollup sliced from the 182-day summary.
  const usage30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 29);
    const cut = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    let input = 0;
    let output = 0;
    let requests = 0;
    for (const r of usageSummary?.days ?? []) {
      if (r.day >= cut) {
        input += r.input_tokens;
        output += r.output_tokens;
        requests += r.requests;
      }
    }
    return { input, output, requests, cutoff: cut, models: (usageSummary?.by_model ?? []).length };
  }, [usageSummary]);

  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-emerald-200 dark:bg-emerald-900/50 border-emerald-300/60 dark:border-emerald-800/60 hover:bg-emerald-300 dark:hover:bg-emerald-800";
      case 2:
        return "bg-emerald-400 dark:bg-emerald-700 border-emerald-500/60 dark:border-emerald-600/60 hover:bg-emerald-500 dark:hover:bg-emerald-600";
      case 3:
        return "bg-emerald-600 dark:bg-emerald-600 border-emerald-700/60 hover:bg-emerald-700";
      case 4:
        return "bg-emerald-800 dark:bg-emerald-400 border-emerald-900/60 dark:border-emerald-300/60 hover:bg-emerald-900 dark:hover:bg-emerald-300";
      default:
        return "bg-gray-100 dark:bg-zinc-800 border-gray-200/60 dark:border-zinc-700/60 hover:bg-gray-200/80 dark:hover:bg-zinc-700";
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

                  {/* Usage stats (real data from /api/usage/summary) */}
                  {usageError ? (
                    <div className="p-3.5 border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 rounded-md text-red-600 dark:text-red-400 text-[11px]">
                      {usageError}
                    </div>
                  ) : usageLoading ? (
                    <div className="p-6 text-center text-gray-400 dark:text-zinc-500 text-[11px]">
                      {t("加载中…", "Loading…")}
                    </div>
                  ) : !usageSummary || usageSummary.totals.requests === 0 ? (
                    <div className="p-6 text-center text-gray-400 dark:text-zinc-500 text-[11px] border border-dashed border-gray-200 dark:border-zinc-800 rounded-md">
                      {t(
                        "暂无用量数据 — 开始对话后自动统计(历史对话无法回填)",
                        "No usage data yet — stats accumulate as you chat (past chats cannot be backfilled)"
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Last 30 Days Usage */}
                      <div className="p-4 rounded-md border border-gray-200/90 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-zinc-100">{t("近 30 天用量", "Last 30 Days Usage")}</div>
                            <div className="text-gray-500 dark:text-zinc-400 text-[11px] mt-0.5">
                              {t(`统计周期:${usage30.cutoff} 至今`, `Period: ${usage30.cutoff} to today`)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-base text-gray-900 dark:text-zinc-100">
                              {formatTokens(usage30.input + usage30.output)}
                            </span>
                            <span className="text-gray-400 dark:text-zinc-500 text-xs font-mono"> tokens</span>
                          </div>
                        </div>

                        {/* Input / output ratio bar */}
                        {(() => {
                          const total = usage30.input + usage30.output;
                          const inPct = total > 0 ? Math.round((usage30.input / total) * 100) : 0;
                          return (
                            <>
                              <div className="w-full bg-gray-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                                <div
                                  className="bg-blue-500 dark:bg-blue-400 h-full transition-all duration-500"
                                  style={{ width: `${inPct}%` }}
                                />
                                <div
                                  className="bg-gray-900 dark:bg-zinc-200 h-full transition-all duration-500"
                                  style={{ width: `${100 - inPct}%` }}
                                />
                              </div>
                              <div className="flex gap-3 text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 inline-block" />
                                  {t("输入", "Input")} {inPct}%
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-zinc-200 inline-block" />
                                  {t("输出", "Output")} {100 - inPct}%
                                </span>
                              </div>
                            </>
                          );
                        })()}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                          <div className="p-2.5 rounded bg-white dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                            <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("输入 Tokens", "Input Tokens")}</div>
                            <div className="font-mono font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">{formatTokens(usage30.input)}</div>
                          </div>
                          <div className="p-2.5 rounded bg-white dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                            <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("输出 Tokens", "Output Tokens")}</div>
                            <div className="font-mono font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">{formatTokens(usage30.output)}</div>
                          </div>
                          <div className="p-2.5 rounded bg-white dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                            <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("请求数", "Requests")}</div>
                            <div className="font-mono font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">{t(`${usage30.requests} 次`, `${usage30.requests} reqs`)}</div>
                          </div>
                          <div className="p-2.5 rounded bg-white dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                            <div className="text-gray-500 dark:text-zinc-400 text-[11px]">{t("活跃模型数", "Active Models")}</div>
                            <div className="font-mono font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">{usage30.models}</div>
                          </div>
                        </div>
                      </div>

                      {/* Usage Breakdown By Model Table */}
                      <div className="p-4 rounded-md border border-gray-200/90 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-xs">{t("模型用量分布", "Usage Distribution by Model")}</h3>
                          <span className="text-gray-400 text-[11px]">
                            {t(`近 ${usageSummary.range.days} 天 · 按 Token 消耗倒序`, `Last ${usageSummary.range.days} days · by tokens`)}
                          </span>
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
                              {usageSummary.by_model.map((m) => {
                                const grand = usageSummary.totals.input_tokens + usageSummary.totals.output_tokens;
                                const ratio = grand > 0 ? ((m.total_tokens / grand) * 100).toFixed(1) : "0";
                                return (
                                  <tr key={m.model}>
                                    <td className="py-2.5 px-1 font-sans font-medium text-gray-900 dark:text-zinc-100">{m.model}</td>
                                    <td className="py-2.5 px-1 text-right text-gray-600 dark:text-zinc-400">{m.input_tokens.toLocaleString()}</td>
                                    <td className="py-2.5 px-1 text-right text-gray-600 dark:text-zinc-400">{m.output_tokens.toLocaleString()}</td>
                                    <td className="py-2.5 px-1 text-right text-gray-600 dark:text-zinc-400">{m.requests.toLocaleString()}</td>
                                    <td className="py-2.5 px-1 text-right font-semibold text-gray-900 dark:text-zinc-100">{ratio}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 26-Week Usage Heatmap (GitHub style, real data) */}
                  {usageSummary && usageSummary.totals.requests > 0 && (
                  <div className="p-4 rounded-md border border-gray-200/90 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-xs">
                        {t("最近 12 个月使用分布", "Last 12 Months Heatmap")}
                      </h3>
                      <span className="text-gray-400 text-[11px]">
                        {t("颜色越深用量越大（输入+输出）", "Darker = more usage (in+out)")}
                      </span>
                    </div>
                    <div className="pb-1">
                      <div>
                        <div className="flex gap-[2px]">
                          {heatmapData.weeks.map((week, wi) => (
                            <div key={wi} className="flex-1 flex flex-col gap-[2px]">
                              {week.map((c) => (
                                <div
                                  key={c.day}
                                  className={`w-full aspect-square rounded-[2px] border cursor-pointer transition-colors ${getHeatmapColor(c.level)}`}
                                  onMouseEnter={() =>
                                    setHoveredCell({
                                      date: c.date,
                                      tokens: formatTokens(c.tokens),
                                      requests: c.requests,
                                      level: c.level,
                                    })
                                  }
                                  onMouseLeave={() => setHoveredCell(null)}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-[2px] mt-1">
                          {heatmapData.months.map((m, i) => (
                            <div key={i} className="flex-1 text-[8px] leading-none text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                              {m ?? ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                      {hoveredCell
                        ? `${hoveredCell.date} · ${hoveredCell.tokens} tokens · ${t(`${hoveredCell.requests} 次`, `${hoveredCell.requests} reqs`)}`
                        : t(
                            `统计窗口:${formatTokens(usageSummary.totals.input_tokens + usageSummary.totals.output_tokens)} tokens · ${usageSummary.totals.requests} 次请求 · ${usageSummary.totals.active_days} 个活跃日`,
                            `${formatTokens(usageSummary.totals.input_tokens + usageSummary.totals.output_tokens)} tokens · ${usageSummary.totals.requests} requests · ${usageSummary.totals.active_days} active days`,
                          )}
                    </div>
                  </div>
                  )}
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
                  {/* 说明卡片 */}
                  <div className="p-4 bg-[#f8f9fa] dark:bg-zinc-900/60 rounded-md border border-gray-200/90 dark:border-zinc-800 space-y-2 shadow-2xs">
                    <div className="font-bold text-gray-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-gray-600 dark:text-zinc-400" />
                      {t("Agent 记忆", "Agent Memory")}
                    </div>
                    <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-[11px]">
                      {t(
                        "每轮对话自动提取事实、决策与偏好，每 10 轮去重合并为长期记忆；按 用户 / 项目 / 会话 三层作用域注入后续对话。",
                        "Facts, decisions and preferences are extracted from every turn, consolidated every 10 turns, and injected into later conversations across user / project / session scopes."
                      )}
                    </p>
                  </div>

                  {/* Scope 切换 */}
                  <div className="flex gap-1 p-1 bg-[#f8f9fa] dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-md shadow-2xs">
                    {([
                      { id: "user", label: t("用户偏好", "User") },
                      { id: "project", label: t("项目记忆", "Project") },
                      { id: "thread", label: t("会话记忆", "Session") },
                    ] as { id: MemoryScope; label: string }[]).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMemScope(tab.id)}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          memScope === tab.id
                            ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-2xs border border-gray-200/80 dark:border-zinc-700"
                            : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                        }`}
                      >
                        {tab.label}
                        {memScope === tab.id && !memLoading && (
                          <span className="ml-1.5 text-[10px] text-gray-400 dark:text-zinc-500">{memEntries.length}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 项目 / 线程选择器 */}
                  {memScope === "project" && (
                    <MemSelect
                      value={memProjectId}
                      onChange={setMemProjectId}
                      options={memProjects.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder={t("暂无项目", "No projects")}
                    />
                  )}
                  {memScope === "thread" && (
                    <MemSelect
                      value={memThreadId}
                      onChange={setMemThreadId}
                      options={memThreads.map((tr) => {
                        const name = tr.thread_name || tr.thread_id.slice(0, 8);
                        const proj = tr.project_name || tr.project_id.slice(0, 8);
                        return {
                          value: tr.thread_id,
                          label: proj ? `${name} · ${proj} (${tr.entry_count})` : `${name} (${tr.entry_count})`,
                        };
                      })}
                      placeholder={t("暂无会话记忆", "No session memories")}
                    />
                  )}

                  {/* 记忆条目列表 */}
                  {memError ? (
                    <div className="p-3.5 border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 rounded-md text-red-600 dark:text-red-400 text-[11px]">
                      {memError}
                    </div>
                  ) : memLoading ? (
                    <div className="p-6 text-center text-gray-400 dark:text-zinc-500 text-[11px]">
                      {t("加载中…", "Loading…")}
                    </div>
                  ) : memEntries.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 dark:text-zinc-500 text-[11px] border border-dashed border-gray-200 dark:border-zinc-800 rounded-md">
                      {t(
                        "暂无记忆条目 — 随对话进行自动积累（每 10 轮合并一次）",
                        "No memories yet — they accumulate as you chat (consolidated every 10 turns)"
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto">
                      {memGroups.map((group) => {
                        const cat = MEM_CATEGORY_STYLES[group.category] || MEM_CATEGORY_STYLES.fact;
                        const open = !!memOpenCats[group.category];
                        return (
                          <div
                            key={group.category}
                            className="border border-gray-200/90 dark:border-zinc-800 rounded-md overflow-hidden bg-[#f8f9fa] dark:bg-zinc-900/60 shadow-2xs"
                          >
                            {/* 分组头 — 点击展开 / 收起 */}
                            <button
                              type="button"
                              onClick={() =>
                                setMemOpenCats((prev) => ({ ...prev, [group.category]: !prev[group.category] }))
                              }
                              className="w-full p-2.5 flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${cat.cls}`}>
                                  {t(cat.zh, cat.en)}
                                </span>
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                  {t(`${group.entries.length} 条`, `${group.entries.length} item(s)`)}
                                </span>
                              </div>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
                              />
                            </button>
                            <AnimatePresence initial={false}>
                              {open && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="divide-y divide-gray-100 dark:divide-zinc-800/80 border-t border-gray-100 dark:border-zinc-800/80">
                                    {group.entries.map((entry) => (
                                      <div
                                        key={entry.id}
                                        className="p-3 flex items-start justify-between gap-2 hover:bg-white dark:hover:bg-zinc-850 transition-colors"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="text-gray-800 dark:text-zinc-200 leading-relaxed break-words">
                                            {entry.content}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 dark:text-zinc-500">
                                            <span className="shrink-0">
                                              {t(`提及 ${entry.source_count} 次`, `seen ${entry.source_count}×`)}
                                            </span>
                                            <span>{new Date(entry.updated_at).toLocaleString()}</span>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          disabled={memDeletingId === entry.id}
                                          onClick={() => handleDeleteMemoryEntry(entry.id)}
                                          className="p-1.5 rounded-md border border-transparent text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/60 transition-all cursor-pointer shrink-0 disabled:opacity-40"
                                          title={t("删除该条记忆", "Delete this memory")}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 底部操作行 */}
                  {!memLoading && !memError && memEntries.length > 0 && (
                    <div className="p-3.5 bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-800 rounded-md flex justify-between items-center shadow-2xs">
                      <span className="text-gray-600 dark:text-zinc-300 text-xs font-medium">
                        {t(`当前范围共 ${memEntries.length} 条记忆`, `${memEntries.length} memories in this scope`)}
                      </span>
                      <button
                        type="button"
                        onClick={() => (memClearArmed ? handleClearMemory() : setMemClearArmed(true))}
                        onBlur={() => setMemClearArmed(false)}
                        className={`px-3 py-1.5 border rounded-md text-xs transition-colors font-medium shadow-2xs cursor-pointer ${
                          memClearArmed
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-red-200 dark:border-red-900/60 bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                        }`}
                      >
                        {memClearArmed ? t("确认清空？", "Confirm clear?") : t("清空该范围记忆", "Clear this scope")}
                      </button>
                    </div>
                  )}
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
                                      const cp = (backendModels || []).find((bm) => bm.id === model.id) ||
                                                 (customProviders || []).find((p) => p.modelName === model.id || p.id === model.id);
                                      setEditingModelId(model.id);
                                      setCustomName(cp?.name || (cp && "provider" in cp ? (cp as any).provider : "") || model.provider || "");
                                      setCustomBaseUrl(cp?.baseUrl || model.baseUrl || "");
                                      setCustomApiKey(cp && "apiKey" in cp && (cp as any).apiKey && (cp as any).apiKey !== "••••••••" ? String((cp as any).apiKey) : "");
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
                    type="text"
                    placeholder={editingModelId ? t("当前已显示明文 API Key", "Plaintext API Key is shown") : "sk-..."}
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

