import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronRight,
  Image,
  Figma,
  FileText,
  Compass,
  MessageSquare,
  Target,
  FileCode,
  FolderArchive,
  Wrench,
  Bot,
} from "lucide-react";
import { AUTO_ACCEPT_MODES, MODEL_OPTIONS, MENU_ATTACHMENTS, SUBAGENTS_LIST } from "../data/mockData";
import { ContextPill } from "../types";
import { useSettings } from "../context/SettingsContext";
import { getUserSkills, UserSkill } from "../lib/skillApi";

interface PlusMenuProps {
  onSelect: (pill: ContextPill) => void;
  onSelectSkill?: (skillPill: ContextPill) => void;
  /** Trigger the real image upload flow (owned by PromptInput). */
  onUploadImage?: () => void;
  /** Trigger the real file attachment upload flow (owned by PromptInput). */
  onUploadFile?: () => void;
  onClose: () => void;
}

export const PlusMenu: React.FC<PlusMenuProps> = ({ onSelect, onSelectSkill, onUploadImage, onUploadFile, onClose }) => {
  const { t, backendApiUrl, user } = useSettings();
  const [hoveredSubmenu, setHoveredSubmenu] = useState<"skills" | "subagents" | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<UserSkill | null>(null);
  const [hoveredSubagent, setHoveredSubagent] = useState<(typeof SUBAGENTS_LIST)[0] | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token) return;
    getUserSkills(baseUrl, token)
      .then(setSkills)
      .catch(() => {});
  }, [backendApiUrl, user?.token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      onSelect({ id: file.name, name: file.name, type: "file" });
      onClose();
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case "file":
        return <FileCode className="w-4 h-4 text-rose-500" />;
      case "img":
        return <Image className="w-4 h-4 text-emerald-500" />;
      case "figma":
        return <Figma className="w-4 h-4 text-purple-500" />;
      case "spec":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "plan":
        return <Compass className="w-4 h-4 text-amber-500" />;
      case "ask":
        return <MessageSquare className="w-4 h-4 text-teal-500" />;
      case "goal":
        return <Target className="w-4 h-4 text-indigo-500" />;
      case "ducx":
        return <FileCode className="w-4 h-4 text-rose-500" />;
      case "ducc":
        return <FolderArchive className="w-4 h-4 text-sky-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs text-gray-700 dark:text-gray-200 font-sans"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        style={{ display: "none" }}
      />

      {MENU_ATTACHMENTS.map((item) => (
        <button
          key={item.id}
          onMouseEnter={() => {
            setHoveredSubmenu(null);
            setHoveredSkill(null);
            setHoveredSubagent(null);
          }}
          onClick={() => {
            if (item.id === "file") {
              // Real upload flow when wired; the internal hidden input is
              // only the legacy decorative-pill fallback.
              if (onUploadFile) {
                onUploadFile();
              } else {
                fileInputRef.current?.click();
              }
              onClose();
            } else if (item.id === "img") {
              onUploadImage?.();
              onClose();
            } else {
              onSelect({ id: item.id, name: t(item.label, item.enLabel || item.label), type: item.id as any });
              onClose();
            }
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left font-normal cursor-pointer"
        >
          {getIcon(item.id)}
          <span>{t(item.label, item.enLabel || item.label)}</span>
        </button>
      ))}

      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

      {/* Skills Hover Menu trigger */}
      <div
        className="relative"
        onMouseEnter={() => setHoveredSubmenu("skills")}
      >
        <button className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors text-left font-normal cursor-pointer ${
          hoveredSubmenu === "skills" ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}>
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span>Skills</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {/* Skills Submenu */}
        <AnimatePresence>
          {hoveredSubmenu === "skills" && (
            <motion.div
              initial={{ opacity: 0, x: -6, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-full bottom-0 -ml-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              onMouseLeave={() => setHoveredSkill(null)}
            >
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="relative"
                  onMouseEnter={() => setHoveredSkill(skill)}
                >
                  <button
                    onClick={() => {
                      if (onSelectSkill) {
                        onSelectSkill({ id: skill.id, name: `/${skill.id}`, type: "skill" });
                      }
                      onClose();
                    }}
                    className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                      hoveredSkill?.id === skill.id ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <span className="truncate">{t(skill.name, skill.enName)}</span>
                    <ChevronRight className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                  </button>
                </div>
              ))}

              {/* Skill Detail Card on Hover */}
              <AnimatePresence>
                {hoveredSkill && (
                  <motion.div
                    initial={{ opacity: 0, x: -6, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-full top-0 ml-1.5 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50 font-sans text-gray-800 dark:text-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">{t(hoveredSkill.name, hoveredSkill.enName)}</span>
                      <span className="text-[10px] text-gray-400">{hoveredSkill.category}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-normal">
                      {t(hoveredSkill.description, hoveredSkill.enDescription)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subagents Hover Menu trigger */}
      <div
        className="relative"
        onMouseEnter={() => setHoveredSubmenu("subagents")}
      >
        <button className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors text-left font-normal cursor-pointer ${
          hoveredSubmenu === "subagents" ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}>
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span>Subagents</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {/* Subagents Submenu */}
        <AnimatePresence>
          {hoveredSubmenu === "subagents" && (
            <motion.div
              initial={{ opacity: 0, x: -6, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-full bottom-0 -ml-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              onMouseLeave={() => setHoveredSubagent(null)}
            >
              {SUBAGENTS_LIST.map((agent) => (
                <div
                  key={agent.id}
                  className="relative"
                  onMouseEnter={() => setHoveredSubagent(agent)}
                >
                  <button
                    onClick={() => {
                      onSelect({ id: agent.id, name: t(agent.name, agent.enName), type: "ask" });
                      onClose();
                    }}
                    className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                      hoveredSubagent?.id === agent.id ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <span className="truncate">{t(agent.name, agent.enName)}</span>
                    <ChevronRight className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                  </button>
                </div>
              ))}

              {/* Subagent Detail Card */}
              <AnimatePresence>
                {hoveredSubagent && (
                  <motion.div
                    initial={{ opacity: 0, x: -6, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-full top-0 ml-1.5 w-60 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50 font-sans text-gray-800 dark:text-gray-100"
                  >
                    <div className="font-semibold text-xs text-gray-900 dark:text-gray-100 mb-1">
                      {t(hoveredSubagent.name, hoveredSubagent.enName)}
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-normal">
                      {t(hoveredSubagent.desc, hoveredSubagent.enDesc)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

interface ModeMenuProps {
  currentMode: string;
  onSelectMode: (modeTitle: string) => void;
  onClose: () => void;
}

export const ModeMenu: React.FC<ModeMenuProps> = ({ currentMode, onSelectMode, onClose }) => {
  const { t } = useSettings();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute left-0 bottom-full mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 z-50 text-xs text-gray-700 dark:text-gray-200 font-sans"
    >
      {AUTO_ACCEPT_MODES.map((mode) => {
        const title = t(mode.title, mode.enTitle);
        const desc = t(mode.desc, mode.enDesc);
        const isSelected = currentMode === title || currentMode === mode.title || currentMode === mode.enTitle;
        return (
          <button
            key={mode.id}
            onClick={() => {
              onSelectMode(title);
              onClose();
            }}
            className={`w-full p-2.5 rounded text-left transition-colors mb-1 cursor-pointer ${
              isSelected ? "bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700/60"
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {title}
              </span>
              {isSelected && <Check className="w-4 h-4 text-gray-800 dark:text-gray-200" />}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
          </button>
        );
      })}
    </motion.div>
  );
};

interface ModelMenuProps {
  currentModel: string;
  onSelectModel: (modelName: string) => void;
  onClose: () => void;
}

export const ModelMenu: React.FC<ModelMenuProps> = ({ currentModel, onSelectModel, onClose }) => {
  const { backendModels, customProviders, enabledModels, t } = useSettings();

  const autoOption = {
    id: "auto",
    name: "Auto",
    displayName: t("Auto", "Auto"),
    provider: t("智能模型选择", "Smart Engine Selection"),
    isCustom: false,
  };

  const baseList = (backendModels && backendModels.length > 0)
    ? backendModels
        .filter(m => enabledModels[m.id] !== false)
        .map(bm => ({
          id: bm.id,
          name: bm.name,
          displayName: bm.name,
          provider: bm.isSystem === true ? t("系统模型", "System") : t("自定义", "Custom"),
          isCustom: bm.isSystem === false,
        }))
    : MODEL_OPTIONS
        .filter(m => enabledModels[m.name] !== false)
        .map((m) => ({ id: m.id, name: m.name, displayName: m.name, provider: t(m.provider, m.enProvider), isCustom: false }));

  const existingNames = new Set(baseList.map(m => m.name));
  const customList = (customProviders || [])
    .filter(cp => (cp.modelName || cp.name) && !existingNames.has(cp.modelName || cp.name))
    .map(p => ({
      id: `custom-${p.id}`,
      name: p.modelName || p.name,
      displayName: p.modelName || p.name,
      provider: `${t("自定义", "Custom")} (${p.name})`,
      isCustom: true,
    }));

  const hasAuto = baseList.some(m => m.name === "Auto" || m.id === "auto");
  const allModels = hasAuto ? [...baseList, ...customList] : [autoOption, ...baseList, ...customList];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs text-gray-700 dark:text-gray-200 font-sans"
    >
      <div className="px-3 py-1.5 text-[11px] font-medium text-gray-400 border-b border-gray-100 dark:border-gray-700">
        {t("选择 AI 智能引擎", "Select AI Engine")}
      </div>
      {allModels.map((m) => {
        const isSelected = currentModel === m.name;
        return (
          <button
            key={m.id}
            onClick={() => {
              onSelectModel(m.name);
              onClose();
            }}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
          >
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{m.displayName || m.name}</div>
              <div className="text-[10px] text-gray-400">{m.provider}</div>
            </div>
            {isSelected && <Check className="w-3.5 h-3.5 text-gray-800 dark:text-gray-200" />}
          </button>
        );
      })}
    </motion.div>
  );
};
