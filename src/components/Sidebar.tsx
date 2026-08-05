import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import {
  Plus,
  Clock,
  Grid,
  Settings,
  Folder,
  Search,
  FolderPlus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  User,
  PieChart,
  LogOut,
  X,
} from "lucide-react";

const SplitPanelLeftIcon: React.FC<{ className?: string; isCollapsed?: boolean }> = ({
  className = "w-4 h-4",
  isCollapsed = false,
}) => (
  <svg
    viewBox="0 0 16 16"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <clipPath id="split-left-panel-clip">
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      </clipPath>
    </defs>
    <rect
      x="1.5"
      y="2.5"
      width="13"
      height="11"
      rx="1.5"
      fill="none"
    />
    {!isCollapsed && (
      <rect
        x="1.5"
        y="2.5"
        width="4"
        height="11"
        fill="currentColor"
        clipPath="url(#split-left-panel-clip)"
      />
    )}
    <line
      x1="5.5"
      y1="2.5"
      x2="5.5"
      y2="13.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="1.5"
      y="2.5"
      width="13"
      height="11"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);
import { Project } from "../types";

import { SettingsCategory } from "./SettingsModal";

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onNewTask: () => void;
  onCreateProject?: (name: string, gitUrl?: string) => void;
  onSelectThread?: (threadId: string) => void;
  pinned: boolean;
  isOpen: boolean;
  onTogglePin?: () => void;
  onOpenSettings?: (category?: SettingsCategory) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onNewTask,
  onCreateProject,
  onSelectThread,
  pinned,
  isOpen,
  onTogglePin,
  onOpenSettings,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { t, user, logout, backendApiUrl } = useSettings();
  const [projectSearch, setProjectSearch] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isProjectsSectionExpanded, setIsProjectsSectionExpanded] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectGitUrl, setNewProjectGitUrl] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({
    [activeProjectId]: true,
  });
  const [projectThreads, setProjectThreads] = useState<Record<string, any[]>>({});

  const handleCreateProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    onCreateProject?.(name, newProjectGitUrl.trim() || undefined);
    setNewProjectName("");
    setNewProjectGitUrl("");
    setShowNewProjectInput(false);
  };

  // Load threads when a project is expanded
  const loadProjectThreads = async (projectId: string) => {
    if (projectThreads[projectId]) return; // already loaded
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token) return;
    try {
      const { listThreads } = await import("../lib/agentClient");
      const threads = await listThreads(baseUrl, token, projectId);
      setProjectThreads((prev) => ({ ...prev, [projectId]: threads }));
    } catch {
      // silently fail — conversations are optional UI
    }
  };

  // Load threads when a project becomes expanded
  React.useEffect(() => {
    for (const [projectId, isExpanded] of Object.entries(expandedProjects)) {
      if (isExpanded) {
        loadProjectThreads(projectId);
      }
    }
  }, [expandedProjects]);

  const toggleProjectExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <>
      <motion.div
      initial={false}
      animate={{
        width: isOpen ? 224 : 0,
        borderRightColor: isOpen ? "rgba(229, 231, 235, 0.8)" : "rgba(229, 231, 235, 0)",
      }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="bg-white dark:bg-[#171717] flex flex-col h-full select-none text-[13px] text-gray-700 dark:text-[#ededed] shrink-0 font-sans overflow-hidden border-r border-gray-200/80 dark:border-[#2a2a2a] relative z-20"
    >
      <div className="w-[224px] h-full flex flex-col shrink-0 overflow-hidden">

            {/* Main Actions */}
            <div className="p-2 pt-2 space-y-1 shrink-0 font-sans">
              <button
                onClick={onNewTask}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262626] text-gray-700 dark:text-[#ededed] transition-colors group cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-[#a3a3a3]" />
                  <span className="font-normal">{t("新任务", "New Task")}</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-[#a3a3a3] font-mono">⌘N</span>
              </button>

              <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262626] text-gray-700 dark:text-[#ededed] transition-colors cursor-pointer text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-[#a3a3a3]" />
                  <span className="font-normal">{t("自动化", "Automations")}</span>
                </div>
              </button>

              <button
                onClick={() => onOpenSettings?.("extensions")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/70 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
                  <span className="font-normal">{t("能力扩展", "Extensions")}</span>
                </div>
              </button>

              <button
                onClick={() => onOpenSettings?.("general")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/70 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
                  <span className="font-normal">{t("设置", "Settings")}</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">⌘,</span>
              </button>
            </div>

            {/* Projects Section */}
            <div className="mt-4 px-2 flex-1 flex flex-col min-h-0">
              <div
                onClick={() => setIsProjectsSectionExpanded(!isProjectsSectionExpanded)}
                className="px-2 py-1 flex items-center justify-between text-gray-500 dark:text-zinc-400 text-xs font-medium cursor-pointer hover:bg-gray-200/50 dark:hover:bg-zinc-800/60 rounded-md group transition-colors"
              >
                <div className="flex items-center gap-1">
                  {isProjectsSectionExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
                  )}
                  <span>{t("项目", "Projects")}</span>
                </div>
                <div
                  className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowSearchInput(!showSearchInput)}
                    className="p-1 hover:bg-gray-200/70 dark:hover:bg-zinc-800 rounded text-gray-500 dark:text-zinc-400 transition-colors"
                    title={t("搜索项目", "Search Projects")}
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowNewProjectInput(!showNewProjectInput)}
                    className="p-1 hover:bg-gray-200/70 dark:hover:bg-zinc-800 rounded text-gray-500 dark:text-zinc-400 transition-colors"
                    title={t("新建项目", "New Project")}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-200/70 dark:hover:bg-zinc-800 rounded text-gray-500 dark:text-zinc-400 transition-colors"
                    title={t("更多选项", "More Options")}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {showSearchInput && isProjectsSectionExpanded && (
                <div className="px-2 my-1">
                  <input
                    type="text"
                    placeholder={t("搜索项目...", "Search projects...")}
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full text-xs px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-zinc-600"
                    autoFocus
                  />
                </div>
              )}

              {showNewProjectInput && isProjectsSectionExpanded && (
                <div className="px-2 my-1 space-y-1.5">
                  <input
                    type="text"
                    placeholder={t("项目名称", "Project name")}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
                    className="w-full text-xs px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder={t("Git URL (可选)", "Git URL (optional)")}
                    value={newProjectGitUrl}
                    onChange={(e) => setNewProjectGitUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
                    className="w-full text-xs px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-zinc-600"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim()}
                      className="flex-1 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-zinc-700 text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {t("创建", "Create")}
                    </button>
                    <button
                      onClick={() => { setShowNewProjectInput(false); setNewProjectName(""); setNewProjectGitUrl(""); }}
                      className="px-2 py-1 rounded text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {isProjectsSectionExpanded && (
                <div className="mt-1 space-y-0.5 overflow-y-auto flex-1 min-h-0">
                  {filteredProjects.map((proj) => {
                    const isActive = proj.id === activeProjectId;
                    const isExpanded = expandedProjects[proj.id] ?? isActive;
                    return (
                      <div
                        key={proj.id}
                        className={`group cursor-pointer rounded-md transition-colors relative ${
                          isActive
                            ? "font-medium text-gray-900 dark:text-zinc-100"
                            : "hover:bg-gray-200/50 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeProjectIndicator"
                            className="absolute inset-0 bg-gray-200/80 dark:bg-zinc-800 rounded-md z-0"
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                          />
                        )}
                        <div
                          onClick={() => onSelectProject(proj.id)}
                          className="p-2 flex items-center justify-between relative z-10"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              onClick={(e) => toggleProjectExpand(proj.id, e)}
                              className="w-5 h-5 flex items-center justify-center rounded text-gray-500 dark:text-zinc-400 hover:bg-gray-300/60 dark:hover:bg-zinc-700 transition-colors shrink-0"
                              title={isExpanded ? t("折叠", "Collapse") : t("展开", "Expand")}
                            >
                              <span className="hidden group-hover:flex items-center justify-center">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
                                )}
                              </span>
                              <span className="flex group-hover:hidden items-center justify-center">
                                <Folder
                                  className={`w-4 h-4 shrink-0 ${
                                    isActive ? "text-gray-700 dark:text-zinc-200 fill-gray-300 dark:fill-zinc-700" : "text-gray-400 dark:text-zinc-500"
                                  }`}
                                />
                              </span>
                            </button>
                            <div className="min-w-0 flex-1">
                              <span className="truncate text-[13px] block">{proj.name}</span>
                              {proj.subtext && (
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-normal truncate block">
                                  {proj.subtext}
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={onNewTask}
                              className="p-1 hover:bg-gray-300/60 dark:hover:bg-zinc-700 rounded text-gray-600 dark:text-zinc-300 transition-colors"
                              title={t("新建项目/任务", "New Project/Task")}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-1 hover:bg-gray-300/60 dark:hover:bg-zinc-700 rounded text-gray-600 dark:text-zinc-300 transition-colors"
                              title={t("更多选项", "More Options")}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Details — conversations */}
                        {isExpanded && (
                          <div className="pl-8 pr-2 pb-2 text-xs text-gray-500 dark:text-zinc-400 space-y-0.5">
                            {(() => {
                              const threads = projectThreads[proj.id];
                              if (!threads) {
                                return (
                                  <div className="py-1 px-1.5 text-gray-400 dark:text-zinc-500 text-xs select-none">
                                    {t("加载中...", "Loading...")}
                                  </div>
                                );
                              }
                              if (threads.length === 0) {
                                return (
                                  <div className="py-1 px-1.5 text-gray-400 dark:text-zinc-500 text-xs select-none">
                                    {t("暂无对话", "No Conversations")}
                                  </div>
                                );
                              }
                              return threads.map((thread: any) => (
                                <div
                                  key={thread.id}
                                  onClick={() => onSelectThread?.(thread.id)}
                                  className="flex items-center gap-1.5 py-1 px-1.5 hover:bg-gray-300/40 dark:hover:bg-zinc-800/80 rounded text-gray-700 dark:text-zinc-300 cursor-pointer transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                                  <span className="truncate">{thread.name || thread.last_message_preview || thread.id}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Footer Section (左下角 div) */}
            <div className="p-2 border-t border-gray-200/80 dark:border-[#2a2a2a] flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#0b0b0b] font-sans mt-auto relative z-10 w-full min-w-0">
              <div
                onClick={() => onOpenSettings?.("account")}
                className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity flex-1"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user?.name}
                    className="w-6 h-6 rounded-full shrink-0 object-cover border border-gray-200/60 dark:border-zinc-800"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className="text-xs font-medium text-gray-800 dark:text-zinc-200 truncate pr-1">
                  {user?.name || t("用户", "User")}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-1 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded text-gray-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  title={t("退出登录", "Sign Out")}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md shadow-2xl max-w-sm w-full overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2.5 text-gray-900 dark:text-zinc-100 font-bold text-sm">
                    <LogOut className="w-4 h-4 shrink-0 text-gray-500 dark:text-zinc-400" />
                    <span>{t("确认退出登录", "Confirm Sign Out")}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                    {t("退出登录后需要重新验证身份才能继续使用。确定要退出吗？", "You will need to re-authenticate after signing out. Are you sure you want to continue?")}
                  </p>
                </div>
                <div className="px-5 py-3 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-3.5 py-1.5 rounded-md border border-gray-200 dark:border-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    {t("取消", "Cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      logout();
                    }}
                    className="px-3.5 py-1.5 rounded-md bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-xs hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    <span>{t("退出登录", "Sign Out")}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </>
      );
    };
