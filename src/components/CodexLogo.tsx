import React from "react";

interface CodexLogoProps {
  className?: string;
  size?: number;
}

export const CodexLogo: React.FC<CodexLogoProps> = ({ className = "", size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-200 hover:scale-105`}
    >
      {/* Outer elegant, ultra-minimal geometric bracket container */}
      <path
        d="M9 5H5V27H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-900 dark:text-zinc-100"
      />
      <path
        d="M23 5H27V27H23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-900 dark:text-zinc-100"
      />

      {/* Internal ultra-minimal terminal console prompt slash */}
      <path
        d="M19 9L13 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-gray-900 dark:text-zinc-100"
      />

      {/* Glowing cursor dot signifying AI process heartbeat */}
      <rect
        x="18"
        y="21"
        width="4"
        height="2"
        fill="currentColor"
        className="text-gray-900 dark:text-zinc-100 animate-pulse"
      />
    </svg>
  );
};
