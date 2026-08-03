import React, { useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
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
import "prismjs/components/prism-markdown";
import { Copy, Check, FileText, CornerDownLeft, Terminal, Database } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface CodeBlockProps {
  code: string;
  filename?: string;
  language?: string;
  onInsert?: (code: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, filename, language, onInsert }) => {
  const { t } = useSettings();
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  // Infer language from filename if not explicitly passed
  const getLanguage = (): string => {
    if (language) return language.toLowerCase();
    if (!filename) return "javascript";
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "py":
        return "python";
      case "java":
        return "java";
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
      case "zsh":
        return "bash";
      case "sql":
        return "sql";
      case "html":
      case "htm":
        return "markup";
      case "css":
      case "scss":
        return "css";
      case "cpp":
      case "cc":
      case "cxx":
        return "cpp";
      case "c":
      case "h":
        return "c";
      case "go":
        return "go";
      case "rs":
        return "rust";
      case "md":
      case "markdown":
        return "markdown";
      case "php":
        return "php";
      case "kt":
      case "kts":
        return "kotlin";
      default:
        return "javascript";
    }
  };

  const lang = getLanguage();

  const getLanguageLabel = (langName: string) => {
    switch (langName) {
      case "python":
      case "py":
        return "Python";
      case "java":
        return "Java";
      case "typescript":
      case "ts":
      case "tsx":
        return "TypeScript";
      case "javascript":
      case "js":
      case "jsx":
        return "JavaScript";
      case "json":
        return "JSON";
      case "bash":
      case "sh":
      case "shell":
      case "zsh":
        return "Shell";
      case "sql":
        return "SQL";
      case "html":
      case "markup":
        return "HTML";
      case "css":
      case "scss":
        return "CSS";
      case "yaml":
      case "yml":
        return "YAML";
      case "cpp":
      case "c++":
        return "C++";
      case "c":
        return "C";
      case "go":
      case "golang":
        return "Go";
      case "rust":
      case "rs":
        return "Rust";
      case "markdown":
      case "md":
        return "Markdown";
      case "php":
        return "PHP";
      case "kotlin":
      case "kt":
        return "Kotlin";
      case "swift":
        return "Swift";
      case "docker":
      case "dockerfile":
        return "Dockerfile";
      default:
        return langName ? langName.charAt(0).toUpperCase() + langName.slice(1) : "Code";
    }
  };

  const renderLanguageIcon = (langName: string) => {
    switch (langName) {
      case "java":
        return (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M7 19c3.5 1.5 8.5 1.5 10 0 .6-.6-1.2-1.3-1.2-1.3s.5.2.8.5c.3.3.1.6-.4.9-1.8.8-7.2.9-10 .1-.5-.2-.5-.5-.2-.7.3-.2.8-.4.8-.4s-1.4.3-1.8.9c-.3.5-.1.8.2 1z" fill="#53900F"/>
            <path d="M8.3 16.2c3 1 7.2 1 9.4 0 .4-.2.9.1.8.4-.2.7-2.3 1.3-5.5 1.3-3.2 0-5.4-.6-5.6-1.3 0-.3.5-.6.9-.4z" fill="#007396"/>
            <path d="M12.5 11.2c1.2 1.4.3 2.7-1.1 3.5 0 0 1.2-.4 1.8-1.2.6-.8.4-1.8-.7-2.3z" fill="#E76F51"/>
            <path d="M15 8c-1 .8-1.7 1.7-1.4 2.5.4.9 1.8 1.4 1.8 1.4s-1.1-.3-1.7-1.1c-.6-.8-.3-1.8.3-2.5C14.5 7.7 15 8 15 8z" fill="#E76F51"/>
            <path d="M11.5 6c-1 .8-1.5 1.8-1.2 2.6.4.9 1.6 1.4 1.6 1.4s-1-.3-1.5-1c-.5-.8-.2-1.8.4-2.5C11.3 5.9 11.5 6 11.5 6z" fill="#F4A261"/>
          </svg>
        );
      case "python":
      case "py":
        return (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 110 110" fill="none">
            <path d="M54.1 2C27.3 2 28.9 13.6 28.9 13.6v14h25.8v3.7H18.2S2 29.7 2 56.6c0 26.8 14.1 25.8 14.1 25.8h8.4v-12s-.4-14.3 14.1-14.3h25.4s13.4.2 13.4-13.1V28.9S98.8 2 54.1 2zM40.3 16a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4z" fill="#3774A5"/>
            <path d="M55.4 108c26.8 0 25.2-11.6 25.2-11.6v-14H54.8v-3.7h36.5S108 78.7 108 51.8c0-26.8-14.1-25.8-14.1-25.8h-8.4v12s.4 14.3-14.1 14.3H46s-13.4-.2-13.4 13.1v18.6S30.7 108 55.4 108zm13.8-14a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4z" fill="#FFD43B"/>
          </svg>
        );
      case "typescript":
      case "ts":
      case "tsx":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#3178c6] text-white font-extrabold text-[9px] flex items-center justify-center shrink-0 font-mono select-none shadow-2xs">
            TS
          </span>
        );
      case "javascript":
      case "js":
      case "jsx":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#f7df1e] text-black font-extrabold text-[9px] flex items-center justify-center shrink-0 font-mono select-none shadow-2xs">
            JS
          </span>
        );
      case "bash":
      case "sh":
      case "shell":
      case "zsh":
      case "powershell":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#1e293b] border border-emerald-500/50 text-emerald-400 font-mono font-extrabold text-[9px] flex items-center justify-center shrink-0 shadow-2xs select-none">
            $&gt;
          </span>
        );
      case "c":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#555555] text-white font-mono font-extrabold text-[9px] flex items-center justify-center shrink-0 select-none">
            C
          </span>
        );
      case "cpp":
      case "c++":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#00599c] text-white font-mono font-extrabold text-[8px] flex items-center justify-center shrink-0 select-none">
            C++
          </span>
        );
      case "go":
      case "golang":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#00add8] text-white font-mono font-extrabold text-[9px] flex items-center justify-center shrink-0 select-none">
            GO
          </span>
        );
      case "rust":
      case "rs":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#b7410e] text-white font-mono font-extrabold text-[8px] flex items-center justify-center shrink-0 select-none">
            RS
          </span>
        );
      case "json":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#292524] border border-amber-500/40 text-amber-400 font-mono font-bold text-[9px] flex items-center justify-center shrink-0 select-none">
            {"{}"}
          </span>
        );
      case "html":
      case "markup":
      case "htm":
      case "xml":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#e34f26] text-white font-mono font-extrabold text-[8px] flex items-center justify-center shrink-0 select-none">
            HTML
          </span>
        );
      case "css":
      case "scss":
      case "less":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#1572b6] text-white font-mono font-extrabold text-[8px] flex items-center justify-center shrink-0 select-none">
            CSS
          </span>
        );
      case "sql":
      case "mysql":
      case "postgres":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#336791] text-white font-mono font-extrabold text-[8px] flex items-center justify-center shrink-0 select-none">
            SQL
          </span>
        );
      case "markdown":
      case "md":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#0891b2] text-white font-mono font-bold text-[8px] flex items-center justify-center shrink-0 select-none">
            MD
          </span>
        );
      case "yaml":
      case "yml":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#cb171e] text-white font-mono font-extrabold text-[7px] flex items-center justify-center shrink-0 select-none">
            YAML
          </span>
        );
      case "php":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#777bb4] text-white font-mono font-extrabold text-[8px] flex items-center justify-center shrink-0 select-none">
            PHP
          </span>
        );
      case "kotlin":
      case "kt":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#7f52ff] text-white font-mono font-extrabold text-[8px] flex items-center justify-center shrink-0 select-none">
            KT
          </span>
        );
      case "swift":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#f05138] text-white font-mono font-extrabold text-[8px] flex items-center justify-center shrink-0 select-none">
            SW
          </span>
        );
      case "docker":
      case "dockerfile":
        return (
          <span className="w-4 h-4 rounded-xs bg-[#0db7ed] text-white font-mono font-extrabold text-[7px] flex items-center justify-center shrink-0 select-none">
            DOC
          </span>
        );
      default:
        return <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (onInsert) {
      onInsert(code);
    } else {
      navigator.clipboard.writeText(code);
      window.dispatchEvent(new CustomEvent("app:insert-code", { detail: { code } }));
    }
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
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
    <div className="w-full my-3.5 rounded-xl border border-gray-300/80 dark:border-zinc-800 bg-[#f0f0f0] dark:bg-[#18181c] overflow-hidden shadow-2xs font-mono text-xs">
      {/* Header bar: Soft grey header matching #f0f0f0 theme */}
      <div className="px-4 py-2 bg-[#e4e4e7] dark:bg-[#222227] border-b border-gray-300/70 dark:border-zinc-800 flex items-center justify-between text-gray-700 dark:text-zinc-300 select-none">
        <div className="flex items-center gap-2">
          {renderLanguageIcon(lang)}
          <span className="font-medium text-gray-800 dark:text-zinc-200 text-[13px] font-sans">
            {filename || getLanguageLabel(lang)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-sans">
          <button
            onClick={handleInsert}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-300/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer text-[12px]"
            title={t("将代码插入到当前编辑上下文", "Insert code into editor")}
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>{inserted ? t("已插入", "Inserted") : t("插入", "Insert")}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-300/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer text-[12px]"
            title={t("复制代码到剪贴板", "Copy code")}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">{t("已复制", "Copied")}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t("复制", "Copy")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body: Soft #f0f0f0 background */}
      <div className="p-4 bg-[#f0f0f0] dark:bg-[#18181c] overflow-x-auto text-[13px] leading-relaxed select-text font-mono">
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


