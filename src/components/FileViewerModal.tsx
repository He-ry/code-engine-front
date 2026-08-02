import React from "react";
import { X, Copy, Check, FileCode } from "lucide-react";
import { FileNode } from "../types";

interface FileViewerModalProps {
  file: FileNode | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!file) return null;

  const handleCopy = () => {
    if (file.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans animate-in fade-in duration-150">
      <div className="bg-[#0b0b0b] text-gray-100 rounded-2xl w-full max-w-2xl border border-[#2a2a2a] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#171717] border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-semibold text-gray-200">{file.path}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "已复制" : "复制"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Code View */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-gray-300">
          <pre>
            <code>{file.content || "// 空文件或只读资源"}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
