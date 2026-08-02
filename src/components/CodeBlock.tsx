import React, { useEffect, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import { Code2, Copy, Check, FileCode, CheckCircle2 } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface CodeBlockProps {
  code: string;
  filename?: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, filename, language }) => {
  const { t } = useSettings();
  const [copied, setCopied] = useState(false);

  // Infer language from filename if not explicitly passed
  const getLanguage = (): string => {
    if (language) return language.toLowerCase();
    if (!filename) return "javascript";
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "py":
        return "python";
      case "ts":
      case "tsx":
        return "typescript";
      case "js":
      case "jsx":
        return "javascript";
      case "json":
        return "json";
      case "yaml":
      case "yml":
        return "yaml";
      case "sh":
      case "bash":
        return "bash";
      case "sql":
        return "sql";
      case "html":
      case "htm":
        return "markup";
      case "css":
        return "css";
      default:
        return "javascript";
    }
  };

  const lang = getLanguage();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getHighlightedCode = () => {
    try {
      const grammar = Prism.languages[lang] || Prism.languages.javascript;
      return Prism.highlight(code, grammar, lang);
    } catch {
      return code;
    }
  };

  return (
    <div className="w-full my-2.5 rounded-xl border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0b0b0b] overflow-hidden shadow-2xs font-mono text-xs">
      {/* Header bar: Light gray / white background */}
      <div className="px-3.5 py-2 bg-gray-50/90 dark:bg-[#171717] border-b border-gray-200/80 dark:border-[#2a2a2a] flex items-center justify-between text-gray-600 dark:text-[#a3a3a3] select-none">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-gray-500 dark:text-zinc-400 shrink-0" />
          <span className="font-semibold text-gray-800 dark:text-zinc-200 text-xs">
            {filename || `Snippet.${lang}`}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-gray-200/70 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
            {lang}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-200/60 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">{t("已复制", "Copied")}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t("复制", "Copy")}</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area: White background with clean syntax highlighting */}
      <div className="p-4 bg-white dark:bg-[#0b0b0b] overflow-x-auto text-[12px] leading-relaxed select-text font-mono">
        <pre className="m-0 p-0 bg-transparent text-gray-900 dark:text-zinc-100">
          <code
            className={`language-${lang}`}
            dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
          />
        </pre>
      </div>
    </div>
  );
};
