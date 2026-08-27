import React from "react";
import { X, Copy, Check, FileCode, Loader2, Download } from "lucide-react";
import { FileNode } from "../types";

interface FileViewerModalProps {
  file: FileNode | null;
  onClose: () => void;
  /** Trigger a browser download of the viewed file. */
  onDownload?: () => void;
  /** When set, shows an extracted-text preview for an uploaded attachment
   *  (PDF/Word/Excel/PPT) instead of a workspace file's content. */
  attachmentPreview?: {
    filename: string;
    text: string | null; // null = still loading
    error?: string;
  } | null;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose, onDownload, attachmentPreview }) => {
  const [copied, setCopied] = React.useState(false);

  const downloadButton = onDownload ? (
    <button
      onClick={onDownload}
      className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors cursor-pointer"
    >
      <Download className="w-3.5 h-3.5" />
      <span>下载</span>
    </button>
  ) : null;

  // Attachment preview mode (uploaded office/PDF documents)
  if (attachmentPreview) {
    const handleCopy = () => {
      if (attachmentPreview.text) {
        navigator.clipboard.writeText(attachmentPreview.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans animate-in fade-in duration-150">
        <div className="bg-[#0b0b0b] text-gray-100 rounded-2xl w-full max-w-3xl border border-[#2a2a2a] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          <div className="px-4 py-3 bg-[#171717] border-b border-[#2a2a2a] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono text-xs font-semibold text-gray-200 truncate">
                {attachmentPreview.filename}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {attachmentPreview.text && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "已复制" : "复制"}</span>
                </button>
              )}
              {downloadButton}
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">
            {attachmentPreview.error ? (
              <span className="text-rose-400">{attachmentPreview.error}</span>
            ) : attachmentPreview.text === null ? (
              <span className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在解析文档…
              </span>
            ) : (
              attachmentPreview.text || "// 空文档"
            )}
          </div>
        </div>
      </div>
    );
  }

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
              className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "已复制" : "复制"}</span>
            </button>
            {downloadButton}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
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
