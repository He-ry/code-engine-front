import React from "react";
import { motion } from "motion/react";

interface ThinkingLoaderProps {
  t: (zh: string, en: string) => string;
}

export const ThinkingLoader: React.FC<ThinkingLoaderProps> = ({ t }) => {
  return (
    <div className="flex items-center gap-1.5 text-xs py-0.5 font-sans select-none relative z-20">
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

      {/* Thinking text with shimmer sweep highlight effect */}
      <span
        className="font-sans text-xs tracking-tight relative"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #9ca3af 0%, #9ca3af 40%, #ffffff 50%, #e5e7eb 60%, #9ca3af 100%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          animation: "thinking-shimmer 2s ease-in-out infinite",
          animationDirection: "alternate",
        }}
      >
        <style>{`
          @keyframes thinking-shimmer {
            0% { background-position: 100% 0%; }
            100% { background-position: 0% 0%; }
          }
        `}</style>
        {t("思考中", "Thinking")}
        <span className="animate-pulse ml-0.5" style={{ color: "#9ca3af" }}>...</span>
      </span>
    </div>
  );
};
