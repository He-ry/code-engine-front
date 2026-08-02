import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Folder, ChevronDown, Check } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { Project } from "../types";

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
      <clipPath id="split-left-panel-clip-top">
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
        clipPath="url(#split-left-panel-clip-top)"
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

const SplitPanelRightIcon: React.FC<{ className?: string; isOpen?: boolean }> = ({
  className = "w-4 h-4",
  isOpen = false,
}) => (
  <svg
    viewBox="0 0 16 16"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <clipPath id="split-right-panel-clip">
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
    {isOpen && (
      <rect
        x="10.5"
        y="2.5"
        width="4"
        height="11"
        fill="currentColor"
        clipPath="url(#split-right-panel-clip)"
      />
    )}
    <line
      x1="10.5"
      y1="2.5"
      x2="10.5"
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

interface TopNavbarProps {
  projectName: string;
  projects?: Project[];
  activeProjectId?: string;
  onSelectProject?: (id: string) => void;
  onToggleRightPanel: () => void;
  rightPanelOpen: boolean;
  onOpenExternal?: () => void;
  sidebarPinned: boolean;
  isSidebarOpen: boolean;
  onToggleSidebarPin: () => void;
  onMouseEnterSidebar: () => void;
  onMouseLeaveSidebar: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  projectName,
  projects,
  activeProjectId,
  onSelectProject,
  onToggleRightPanel,
  rightPanelOpen,
  onOpenExternal,
  sidebarPinned,
  isSidebarOpen,
  onToggleSidebarPin,
  onMouseEnterSidebar,
  onMouseLeaveSidebar,
}) => {
  const { t } = useSettings();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="h-11 px-3 border-b border-gray-100/80 dark:border-[#2a2a2a] flex items-center justify-between bg-white dark:bg-[#171717] select-none shrink-0 relative z-30">
      <div className="flex items-center gap-2">
        {onToggleSidebarPin && (
          <button
            type="button"
            onClick={onToggleSidebarPin}
            onMouseEnter={onMouseEnterSidebar}
            onMouseLeave={onMouseLeaveSidebar}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-md text-gray-700 dark:text-[#ededed] transition-colors cursor-pointer"
            title={sidebarPinned ? t("收起侧边栏", "Collapse Sidebar") : t("展开侧边栏", "Expand Sidebar")}
          >
            <SplitPanelLeftIcon className="w-4 h-4" isCollapsed={!isSidebarOpen} />
          </button>
        )}

        {/* Animated Project Title Badge with Switcher Dropdown */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={projectName}
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={() => projects && projects.length > 0 && setShowDropdown(!showDropdown)}
              className={`flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-[#ededed] bg-gray-100/80 dark:bg-[#262626] px-2.5 py-1 rounded-md border border-gray-200/60 dark:border-[#2a2a2a] ${
                projects && projects.length > 0 ? "cursor-pointer hover:bg-gray-200/80 dark:hover:bg-[#2a2a2a]" : ""
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-gray-500 dark:text-[#a3a3a3]" />
              <span>{projectName}</span>
              {projects && projects.length > 0 && (
                <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-[#a3a3a3] transition-transform duration-150 ${showDropdown ? "rotate-180" : ""}`} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Project Dropdown Menu */}
          <AnimatePresence>
            {showDropdown && projects && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-[#262626] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-xl z-40 py-1.5 overflow-hidden text-left"
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
                          if (onSelectProject) onSelectProject(proj.id);
                          setShowDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-[#ededed] font-semibold"
                            : "text-gray-700 dark:text-[#ededed] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/60"
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
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRightPanel}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            rightPanelOpen ? "bg-gray-200/80 dark:bg-[#2a2a2a] text-gray-900 dark:text-[#ededed]" : "hover:bg-gray-100 dark:hover:bg-[#262626] text-gray-700 dark:text-[#ededed]"
          }`}
          title={t("切换右侧工作区 (文件树/浏览器)", "Toggle Right Panel (Files/Browser)")}
        >
          <SplitPanelRightIcon className="w-4 h-4" isOpen={rightPanelOpen} />
        </button>
      </div>
    </div>
  );
};
