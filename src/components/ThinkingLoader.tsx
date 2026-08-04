import React from "react";
import { motion } from "motion/react";

interface ThinkingLoaderProps {
  t: (zh: string, en: string) => string;
}

export const ThinkingLoader: React.FC<ThinkingLoaderProps> = ({ t }) => {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 py-0.5 font-sans select-none relative z-20">
      {/* Small subtle breathing dot matching the 3.5x3.5 Chevron icon size & style */}
      <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-500"
          animate={{
            scale: [0.85, 1.2, 0.85],
            opacity: [0.35, 1, 0.35],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Thinking text matching the exact style of the completed Thinking header */}
      <span className="font-sans text-xs tracking-tight text-gray-400 dark:text-zinc-500">
        {t("Thinking", "Thinking")}
        <span className="animate-pulse ml-0.5">...</span>
      </span>
    </div>
  );
};
