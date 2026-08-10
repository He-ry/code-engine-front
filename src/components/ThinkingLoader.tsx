import React from "react";

interface ThinkingLoaderProps {
  t: (zh: string, en: string) => string;
}

export const ThinkingLoader: React.FC<ThinkingLoaderProps> = ({ t }) => {
  return (
    <div className="flex items-center gap-1.5 text-xs py-0.5 font-sans select-none relative z-20">
      {/* Thinking text with black-white shimmer sweep */}
      <span
        className="font-sans text-xs tracking-tight relative"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #9ca3af 0%, #9ca3af 40%, #1f2937 50%, #6b7280 60%, #9ca3af 100%)",
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
        <span className="animate-pulse ml-0.5" style={{ color: "#6b7280" }}>...</span>
      </span>
    </div>
  );
};
