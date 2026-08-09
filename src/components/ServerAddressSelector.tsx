import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import { Server, ChevronDown, Check, Globe, Settings } from "lucide-react";

interface ServerAddressSelectorProps {
  variant: "login" | "settings";
}

const PRESET_URLS = [
  { url: "https://agent.hery.cloud", label: "agent.hery.cloud (云端)" },
  { url: "http://127.0.0.1:5174", label: "127.0.0.1:5174 (本地)" },
];

export const ServerAddressSelector: React.FC<ServerAddressSelectorProps> = ({ variant }) => {
  const { backendApiUrl, setBackendApiUrl, language, t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if current URL is a custom one (not a preset)
  useEffect(() => {
    const isPreset = PRESET_URLS.some((p) => p.url === backendApiUrl);
    setIsCustom(!isPreset);
    if (!isPreset && backendApiUrl) {
      setCustomUrl(backendApiUrl);
    }
  }, [backendApiUrl]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectPreset = (url: string) => {
    setBackendApiUrl(url);
    setIsCustom(false);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const url = customUrl.trim();
    if (!url) return;
    // Auto-add https:// if no protocol specified
    const formattedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    setBackendApiUrl(formattedUrl);
    setIsCustom(true);
    setIsOpen(false);
  };

  const displayUrl = backendApiUrl || "https://agent.hery.cloud";

  const isLogin = variant === "login";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
          isLogin
            ? "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 py-1 px-2 rounded-md hover:bg-gray-100/50 dark:hover:bg-zinc-800/50"
            : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
        }`}
        title={t("服务地址", "Server Address")}
      >
        <Server className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono text-[11px] max-w-[180px] truncate">
          {displayUrl.replace(/^https?:\/\//, "")}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-50 mt-1.5 w-72 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden ${
              isLogin ? "right-0" : "left-0"
            }`}
          >
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                {t("选择服务地址", "Select Server Address")}
              </div>

              {/* Preset options */}
              {PRESET_URLS.map((preset) => {
                const isSelected = backendApiUrl === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-semibold"
                        : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? "text-gray-700 dark:text-zinc-300" : "text-gray-400 dark:text-zinc-500"
                        }`}
                      />
                      <span className="font-mono text-[11px] truncate">{preset.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-zinc-100 shrink-0 ml-1" />}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="flex items-center gap-2 px-2 py-0.5">
                <div className="flex-1 border-t border-gray-100 dark:border-zinc-800" />
                <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium">
                  {t("或自定义", "or custom")}
                </span>
                <div className="flex-1 border-t border-gray-100 dark:border-zinc-800" />
              </div>

              {/* Custom input */}
              <div className="flex gap-1.5 px-1">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="https://your-server.com"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCustomSubmit();
                    }}
                    className="w-full text-[11px] font-mono px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md text-gray-800 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!customUrl.trim()}
                  className="px-2.5 py-1.5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md text-[11px] font-medium hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {t("连接", "Connect")}
                </button>
              </div>
            </div>

            {/* Current status footer */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono truncate">
                {displayUrl}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
