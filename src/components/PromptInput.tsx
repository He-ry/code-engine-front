import React, { useState, useRef, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  ArrowUp,
  Plus,
  ChevronDown,
  X,
  FolderArchive,
  Target,
  FileText,
  Compass,
  MessageSquare,
  Figma,
  Image as ImageIcon,
  Wrench,
  Loader2,
  Check,
} from "lucide-react";
import { ContextPill, CommandItem } from "../types";
import { PlusMenu, ModelMenu } from "./ContextPopovers";
import { RECOMMENDATION_CARDS } from "../data/mockData";
import { getUserSkills, UserSkill } from "../lib/skillApi";
import { transcribeAudio, startAsrStream, AsrStreamController, AsrStreamError } from "../lib/asrApi";

/** 麦克风状态机:idle → connecting → listening →(点停/60s)finalizing → idle */
type MicState = "idle" | "connecting" | "listening" | "finalizing";

interface PromptInputProps {
  onSend: (text: string, pills: ContextPill[], mode: string, model: string, images?: string[]) => void;
  projectName: string;
  branchName: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  onSelectRecommendation?: (promptText: string) => void;
  isGenerating?: boolean;
  onStop?: () => void;
  /** Upload a real file attachment into the thread workspace (agent-readable).
   *  Returns the attachment descriptor, or null when upload isn't possible
   *  (not logged in / no thread yet). Provided by App. */
  onUploadAttachment?: (file: File) => Promise<ContextPill["attachment"] | null>;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSend,
  projectName,
  selectedModel: propModel,
  onModelChange,
  onSelectRecommendation,
  isGenerating = false,
  onStop,
  onUploadAttachment,
}) => {
  const { t, defaultModel, agentThinking, backendModels, backendApiUrl, user } = useSettings();
  const { showError, showInfo } = useToast();
  const [inputText, setInputText] = useState("");
  const [contextPills, setContextPills] = useState<ContextPill[]>([]);

  // Pending image attachments — read as data URLs locally (thumbnail shows
  // immediately); the actual upload happens on send via sendMessage.
  const [pendingImages, setPendingImages] = useState<
    { id: string; name: string; dataUrl: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Real file attachments — uploading flag per filename for the pill spinner
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [localModel, setLocalModel] = useState(() => {
    // Resolve initial value: use first enabled model from the list if available
    const enabled = (backendModels || []).filter((m) => m.isEnabled !== false);
    return enabled.length > 0 ? enabled[0].name : "Auto";
  });

  const selectedModel = propModel !== undefined ? propModel : localModel;
  const setSelectedModel = onModelChange || setLocalModel;


  // Popover toggle states
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [skills, setSkills] = useState<UserSkill[]>([]);

  // Autocomplete popup states
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [commandQuery, setCommandQuery] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Click outside handlers for popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (plusMenuRef.current && !plusMenuRef.current.contains(target)) {
        setShowPlusMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(target)) {
        setShowModelMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [inputText]);

  // Load installed user-level skills for the / command autocomplete.
  useEffect(() => {
    const baseUrl = backendApiUrl || "https://agent.hery.cloud";
    const token = user?.token || "";
    if (!token) return;
    getUserSkills(baseUrl, token)
      .then(setSkills)
      .catch(() => {});
  }, [backendApiUrl, user?.token]);

  const getPillIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileText className="w-3.5 h-3.5 text-rose-500" />;
      case "goal":
        return <Target className="w-3.5 h-3.5 text-indigo-500" />;
      case "spec":
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case "plan":
        return <Compass className="w-3.5 h-3.5 text-amber-500" />;
      case "ask":
        return <MessageSquare className="w-3.5 h-3.5 text-teal-500" />;
      case "figma":
        return <Figma className="w-3.5 h-3.5 text-purple-500" />;
      case "img":
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />;
      case "skill":
        return <Wrench className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />;
      default:
        return <FolderArchive className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />;
    }
  };

  const getPillStyle = (type: string) => {
    switch (type) {
      case "file":
        return "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300";
      case "goal":
        return "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300";
      case "spec":
        return "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300";
      case "plan":
        return "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300";
      case "ask":
        return "bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-300";
      case "figma":
        return "bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300";
      case "img":
        return "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300";
      case "skill":
        return "bg-gray-100 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300";
      default:
        return "bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200";
    }
  };

  // Detect @ and / inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);

    const lastAt = textBeforeCursor.lastIndexOf("@");
    if (lastAt !== -1 && !textBeforeCursor.slice(lastAt).includes(" ")) {
      setMentionQuery(textBeforeCursor.slice(lastAt + 1));
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
    }

    const lastSlash = textBeforeCursor.lastIndexOf("/");
    if (lastSlash !== -1 && !textBeforeCursor.slice(lastSlash).includes(" ")) {
      setCommandQuery(textBeforeCursor.slice(lastSlash + 1));
      setShowCommandMenu(true);
    } else {
      setShowCommandMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Image attachment limits (mirror the backend SendMessageRequest contract)
  const MAX_IMAGES = 9;
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp"]);

  // Image attachments — data URLs read locally (thumbnail shows immediately),
  // uploaded server-side on send via sendMessage.
  const handleImagesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - pendingImages.length;
    const list = Array.from(files);
    if (room <= 0 || list.length > room) {
      showError(
        t("图片数量已达上限", "Image Limit Reached"),
        t(`单条消息最多 ${MAX_IMAGES} 张图片`, `Up to ${MAX_IMAGES} images per message`)
      );
    }
    for (const file of list.slice(0, Math.max(room, 0))) {
      if (!IMAGE_MIMES.has(file.type)) {
        showError(
          t("不支持的图片格式", "Unsupported Format"),
          `${file.name}（支持 PNG/JPEG/GIF/WebP/BMP）`
        );
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        showError(t("图片过大", "Image Too Large"), `${file.name}（上限 10 MB）`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl.startsWith("data:")) return;
        setPendingImages((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Real file attachment upload — lands in the thread workspace so the
  // agent can read it. Falls back to the old decorative pill when the
  // uploader isn't wired (not logged in / no thread).
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!onUploadAttachment) {
        // No uploader: keep the legacy decorative pill so the user still
        // sees the file mentioned in the message.
        setContextPills((prev) =>
          prev.some((p) => p.id === file.name)
            ? prev
            : [...prev, { id: file.name, name: file.name, type: "file" }]
        );
        continue;
      }
      setUploadingFiles((prev) => new Set(prev).add(file.name));
      try {
        const attachment = await onUploadAttachment(file);
        if (attachment) {
          setContextPills((prev) =>
            prev.some((p) => p.id === file.name)
              ? prev
              : [
                  ...prev,
                  {
                    id: file.name,
                    name: file.name,
                    type: "file",
                    attachment,
                  },
                ]
          );
          // Image attachments are additionally pushed through the images
          // channel (input_image parts), so vision-capable models see the
          // picture directly instead of just a workspace path in the text.
          if (IMAGE_MIMES.has(file.type)) {
            if (file.size > MAX_IMAGE_BYTES) {
              showError(
                t("图片过大，仅按附件处理", "Image Too Large, Kept As Attachment Only"),
                `${file.name}（上限 10 MB）`
              );
            } else {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = String(reader.result || "");
                if (!dataUrl.startsWith("data:")) return;
                setPendingImages((prev) => {
                  if (prev.length >= MAX_IMAGES || prev.some((p) => p.name === file.name)) return prev;
                  return [
                    ...prev,
                    {
                      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                      name: file.name,
                      dataUrl,
                    },
                  ];
                });
              };
              reader.readAsDataURL(file);
            }
          }
        }
      } catch (err: any) {
        showError(t("文件上传失败", "Upload Failed"), `${file.name}: ${err?.message || err}`);
      } finally {
        setUploadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(file.name);
          return next;
        });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    // While a turn is streaming the send button is swapped to a stop button,
    // but the Enter key still lands here — block it so a generation in
    // progress can't be double-submitted (the backend also rejects with 409).
    if (isGenerating) return;
    if (!inputText.trim() && contextPills.length === 0 && pendingImages.length === 0) return;
    onSend(
      inputText,
      contextPills,
      "",
      selectedModel,
      pendingImages.length > 0 ? pendingImages.map((img) => img.dataUrl) : undefined
    );
    setInputText("");
    setContextPills([]);
    setPendingImages([]);
  };

  const skillPills = contextPills.filter((p) => p.type === "skill");
  const otherPills = contextPills.filter((p) => p.type !== "skill");

  const removePill = (id: string) => {
    setContextPills(contextPills.filter((p) => p.id !== id));
  };

  // ===== 语音输入:流式 ASR —— 实时 partial 写入输入框,说完 final 校正落定;
  // WS 流式不可用时自动降级为 MediaRecorder 录整段 → POST 批量识别 =====
  const [micState, setMicState] = useState<MicState>("idle");
  const micStateRef = useRef<MicState>("idle"); // WS 回调闭包里 state 是旧的,读 ref
  const updateMicState = (s: MicState) => {
    micStateRef.current = s;
    setMicState(s);
  };
  const micModeRef = useRef<"stream" | "batch" | null>(null);
  const asrControllerRef = useRef<AsrStreamController | null>(null);
  const prevPartialRef = useRef(""); // 当前已写入输入框的 partial(后缀锚点)
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopTimerRef = useRef<number | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearAutoStop = () => {
    if (autoStopTimerRef.current !== null) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  };

  /** 用新识别文本替换输入框里的旧 partial。三分支保证用户在录音中手动打字/编辑不被吞掉。 */
  const applyPartial = (text: string) => {
    const pp = prevPartialRef.current;
    setInputText((prev) => {
      if (pp && prev.endsWith(pp)) return prev.slice(0, prev.length - pp.length) + text; // 正常:剥旧缀贴新缀
      if (text.startsWith(pp)) return prev + text.slice(pp.length); // 锚点失效但可算增量:只贴增量
      return prev + text; // 极端:整段追加(可能轻度重复,可接受)
    });
    prevPartialRef.current = text;
  };

  /** final 落定:同后缀替换;空串不动框(prevPartial 照常清零)。 */
  const applyFinal = (rawText: string) => {
    const text = rawText.trim();
    const pp = prevPartialRef.current;
    prevPartialRef.current = "";
    if (!text) return;
    setInputText((prev) => {
      if (pp && prev.endsWith(pp)) return prev.slice(0, prev.length - pp.length) + text;
      if (text.startsWith(pp)) return prev + text.slice(pp.length);
      return prev + text;
    });
  };

  const finishRecording = () => {
    clearAutoStop();
    recorderRef.current?.stop(); // 真正的转写在 onstop 里做
  };

  /** 降级路径:原 MediaRecorder 录整段 → transcribeAudio 批量识别 → 追加到输入框。 */
  const startBatchRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mimeType = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopTracks();
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size === 0) {
          updateMicState("idle");
          return;
        }
        updateMicState("finalizing");
        try {
          const text = (await transcribeAudio(blob)).trim();
          if (text) setInputText((prev) => prev + text);
        } catch (e) {
          showError(t("语音识别失败", "Speech recognition failed"), e instanceof Error ? e.message : String(e));
        } finally {
          updateMicState("idle");
        }
      };
      recorder.start();
      micModeRef.current = "batch";
      updateMicState("listening");
      // 60s 自动结束,防止忘关麦克风
      autoStopTimerRef.current = window.setTimeout(finishRecording, 60_000);
    } catch (e) {
      stopTracks();
      updateMicState("idle");
      showError(t("无法启动录音", "Cannot start recording"), e instanceof Error ? e.message : String(e));
    }
  };

  /** 收音中途掉线才提示收尾;finalizing 阶段的错误由 stopMic 的 null 分支统一处理,避免双 toast。 */
  const handleStreamError = (err: AsrStreamError) => {
    if (micStateRef.current !== "listening" || micModeRef.current !== "stream") return;
    clearAutoStop();
    asrControllerRef.current?.close();
    asrControllerRef.current = null;
    micModeRef.current = null;
    updateMicState("idle");
    showError(
      t("语音连接已中断", "Speech connection lost"),
      err.code === "bad-key" ? t("语音服务密钥无效", "Invalid ASR key") : t("已保留实时识别的文本", "Live transcript kept"),
    );
  };

  const stopMic = async () => {
    const controller = asrControllerRef.current;
    if (!controller) return;
    clearAutoStop();
    asrControllerRef.current = null;
    micModeRef.current = null;
    updateMicState("finalizing");
    const finalText = await controller.stop(); // 内部已关麦/flush/发 stop/收尾
    if (finalText === null) {
      showError(t("未获得最终识别结果", "No final transcript"), t("已保留实时识别的文本", "Live transcript kept"));
    } else {
      applyFinal(finalText);
    }
    updateMicState("idle");
  };

  const startMic = async () => {
    updateMicState("connecting");
    try {
      const controller = await startAsrStream({
        onPartial: applyPartial, // final 落定统一由 stop() 返回值处理,不挂 onFinal
        onError: handleStreamError,
      });
      asrControllerRef.current = controller;
      micModeRef.current = "stream";
      updateMicState("listening");
      // 60s 自动结束,防止忘关麦克风
      autoStopTimerRef.current = window.setTimeout(() => {
        if (micModeRef.current === "stream") void stopMic();
        else finishRecording();
      }, 60_000);
    } catch (e) {
      if (e instanceof AsrStreamError && ["ws-connect", "funasr-unavailable", "not-supported"].includes(e.code)) {
        // 实时服务不可用/浏览器不支持 → 静默降级为录整段批量识别
        showInfo(t("已切换为录音后识别", "Switched to record-then-transcribe"), t("实时语音服务不可用", "Live speech service unavailable"));
        await startBatchRecording();
      } else {
        updateMicState("idle");
        showError(t("无法启动录音", "Cannot start recording"), e instanceof Error ? e.message : String(e));
      }
    }
  };

  const toggleMic = async () => {
    const s = micStateRef.current;
    if (s === "connecting" || s === "finalizing") return; // 防重入
    if (s === "listening") {
      if (micModeRef.current === "stream") void stopMic();
      else finishRecording();
      return;
    }
    await startMic();
  };

  // 卸载时释放录音资源(防止组件切走后麦克风一直开着)
  useEffect(
    () => () => {
      clearAutoStop();
      asrControllerRef.current?.close(); // 立即放弃,不等 final
      asrControllerRef.current = null;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopTracks();
    },
    []
  );

  return (
    <div className="w-full max-w-3xl mx-auto relative font-sans">
      {/* Main Container Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-visible relative flex flex-col p-0">
        {/* Input & Pills Container (Integrated inside the input box, vertically stacked) */}
        <div 
          className="flex flex-col cursor-text"
          onClick={(e) => {
            if (
              e.target === e.currentTarget || 
              ((e.target as HTMLElement).tagName !== 'TEXTAREA' && 
               !(e.target as HTMLElement).closest('button') && 
               !(e.target as HTMLElement).closest('.context-pill'))
            ) {
              textareaRef.current?.focus();
            }
          }}
        >
          {/* Inner padded container for pills and textarea */}
          <div className="flex flex-col gap-2 pt-3.5 px-4 pb-2">
            {/* Selected Pills row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 empty:hidden">
              <AnimatePresence>
                {skillPills.map((pill) => (
                  <motion.span
                    layout
                    key={pill.id}
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`context-pill h-7 inline-flex items-center gap-1.5 px-2.5 border rounded-lg text-xs font-medium shadow-2xs ${getPillStyle(pill.type)}`}
                  >
                    {getPillIcon(pill.type)}
                    <span>{pill.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePill(pill.id);
                      }}
                      className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            {/* Pending image attachments — thumbnails with remove on hover */}
            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {pendingImages.map((img) => (
                    <motion.div
                      layout
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="relative group/img w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 shadow-2xs"
                      title={img.name}
                    >
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingImages(pendingImages.filter((p) => p.id !== img.id));
                        }}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                        title={t("移除", "Remove")}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Text Area (occupies full width) */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                contextPills.length === 0
                  ? t("@引用上下文，/调起指令，↑↓切换历史输入", "@reference context, /for commands, ↑↓ history")
                  : t("输入您的补充指令...", "Type your prompt...")
              }
              className="w-full resize-none border-none outline-none text-sm text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 bg-transparent leading-relaxed font-sans py-1 min-h-[44px]"
            />
          </div>

          {/* Bottom Toolbar inside the Input Box */}
          <div className="flex items-center justify-between px-4 py-2.5 relative bg-gray-50/50 dark:bg-zinc-900/60 border-t border-gray-100 dark:border-zinc-800/60 rounded-b-xl w-full">

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Standalone + Button */}
              <div className="relative" ref={plusMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(!showPlusMenu);
                    setShowModelMenu(false);
                  }}
                  className="h-7 w-7 bg-gray-100/80 dark:bg-zinc-800 hover:bg-gray-200/80 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 transition-colors cursor-pointer flex items-center justify-center"
                  title={t("添加上下文或关联", "Add context or attachment")}
                >
                  <Plus className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
                </button>

                <AnimatePresence>
                  {showPlusMenu && (
                    <PlusMenu
                      onSelect={(pill) => {
                        if (!contextPills.find((p) => p.id === pill.id)) {
                          setContextPills([...contextPills, pill]);
                        }
                      }}
                      onSelectSkill={(skillPill) => {
                        if (!contextPills.find((p) => p.id === skillPill.id)) {
                          setContextPills([...contextPills, skillPill]);
                        }
                      }}
                      onUploadImage={() => imageInputRef.current?.click()}
                      onUploadFile={() => fileInputRef.current?.click()}
                      onClose={() => setShowPlusMenu(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Hidden file attachment input — triggered from the + menu's 添加文件 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />

                {/* Hidden image input — triggered from the + menu's 添加图片 */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImagesSelected(e.target.files)}
                />
              </div>
              {/* Other context pills shown right after the + button with animation! */}
              <AnimatePresence>
                {otherPills.map((pill) => {
                  const uploading = uploadingFiles.has(pill.name);
                  return (
                  <motion.span
                    layout
                    key={pill.id}
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`context-pill h-7 inline-flex items-center gap-1.5 px-2.5 border rounded-lg text-xs font-medium shadow-2xs ${getPillStyle(pill.type)} ${uploading ? "opacity-60" : ""}`}
                    title={pill.attachment ? pill.attachment.workspacePath : undefined}
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      getPillIcon(pill.type)
                    )}
                    <span>{pill.name}</span>
                    {pill.attachment && !uploading && (
                      <Check className="w-3 h-3 opacity-60" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePill(pill.id);
                      }}
                      className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                  );
                })}
              </AnimatePresence>

              {/* Standalone Auto Model Switcher Button */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModelMenu(!showModelMenu);
                    setShowPlusMenu(false);
                  }}
                  className="h-7 flex items-center gap-1 px-2.5 bg-gray-100/80 dark:bg-zinc-800 hover:bg-gray-200/80 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 transition-colors cursor-pointer"
                  title={t("切换模型", "Switch Model")}
                >
                  <span>{selectedModel}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                </button>

                <AnimatePresence>
                  {showModelMenu && (
                    <ModelMenu
                      currentModel={selectedModel}
                      onSelectModel={(m) => setSelectedModel(m)}
                      onClose={() => setShowModelMenu(false)}
                    />
                  )}
                </AnimatePresence>
              </div>


            </div>

            {/* Mic & Send/Stop Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMic}
                disabled={micState === "finalizing"}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
                  micState === "finalizing"
                    ? "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 cursor-wait"
                    : micState === "listening"
                    ? "bg-rose-100 dark:bg-rose-950/80 border-rose-300 text-rose-600 dark:text-rose-400 animate-pulse cursor-pointer"
                    : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer"
                }`}
                title={
                  micState === "connecting"
                    ? t("连接语音服务…", "Connecting speech service…")
                    : micState === "listening"
                    ? micModeRef.current === "batch"
                      ? t("结束录音并转文字", "Stop recording and transcribe")
                      : t("实时识别中,点击结束", "Live transcribing — click to stop")
                    : micState === "finalizing"
                    ? micModeRef.current === "batch"
                      ? t("转写中…", "Transcribing…")
                      : t("正在生成最终文本…", "Finalizing transcript…")
                    : t("语音输入", "Voice Input")
                }
              >
                {micState === "connecting" || micState === "finalizing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-gray-200/90 dark:bg-zinc-700/80 border border-gray-300/80 dark:border-zinc-600/80 transition-all cursor-pointer hover:bg-gray-300/80 dark:hover:bg-zinc-600/80 active:scale-95 group shrink-0"
                  title={t("停止生成", "Stop Generation")}
                >
                  {/* Outer Rotating Arc */}
                  <svg
                    className="w-6 h-6 animate-spin text-zinc-900 dark:text-zinc-100"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="opacity-20"
                    />
                    <path
                      d="M 12 2 A 10 10 0 0 1 22 12 A 10 10 0 0 1 12 22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      className="opacity-90"
                    />
                  </svg>
                  {/* Centered Solid Black Square */}
                  <span className="absolute w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-[1.5px] group-hover:scale-105 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!inputText.trim() && contextPills.length === 0 && pendingImages.length === 0}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0 border ${
                    inputText.trim() || contextPills.length > 0 || pendingImages.length > 0
                      ? "bg-white text-black border-gray-300 dark:bg-zinc-900 dark:text-white dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-xs cursor-pointer active:scale-95"
                      : "bg-white/80 text-gray-300 border-gray-200 dark:bg-zinc-900/50 dark:text-zinc-600 dark:border-zinc-800 cursor-not-allowed"
                  }`}
                  title={t("发送", "Send")}
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Autocomplete Popup Menu for @mentions */}
      <AnimatePresence>
        {showMentionMenu && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute left-4 bottom-full mb-2 w-64 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-800 py-1.5 z-50 text-xs font-sans"
          >
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              {t("@ 引用上下文", "@ Reference Context")}
            </div>
            {[
              { name: "Figma", desc: t("设计稿组件集成", "Figma Design Integration") },
              { name: "Spec", desc: t("需求规格说明书", "Requirements Specification") },
              { name: "Plan", desc: t("开发执行计划", "Execution Plan") },
              { name: "core/engine.ts", desc: t("核心引擎 TypeScript", "Core Engine TS") },
              { name: "AGENTS.md", desc: t("Agent 指令集", "Agent Instructions") },
            ]
              .filter((item) => item.name.toLowerCase().includes(mentionQuery.toLowerCase()))
              .map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setContextPills([
                      ...contextPills,
                      { id: item.name, name: item.name, type: "file" },
                    ]);
                    setInputText((prev) => prev.slice(0, prev.lastIndexOf("@")));
                    setShowMentionMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                >
                  <span className="font-medium text-gray-800 dark:text-zinc-200">{item.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">{item.desc}</span>
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Autocomplete Popup Menu for /commands */}
      <AnimatePresence>
        {showCommandMenu && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute left-4 bottom-full mb-2 w-64 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-800 py-1.5 z-50 text-xs font-sans"
          >
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              {t("/ 调起指令", "/ Trigger Commands")}
            </div>
            {[
              { name: "/generate-ppt", desc: t("一键生成 PPT 大纲", "Generate PPT Outline") },
              { name: "/expert-group", desc: t("多专家协同分析", "Multi-expert Analysis") },
              { name: "/nano-banana", desc: t("一句话生成创意图", "Generate Creative Image") },
              { name: "/popo-share", desc: t("快速分享构建产物", "Share Build Artifacts") },
              ...skills.map((s) => ({ name: `/${s.id}`, desc: t(s.name, s.enName) })),
            ]
              .filter((cmd) => cmd.name.toLowerCase().includes(commandQuery.toLowerCase()))
              .map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => {
                    const skillMatch = skills.find((s) => `/${s.id}` === cmd.name);
                    if (skillMatch) {
                      const pillId = skillMatch.id;
                      if (!contextPills.find((p) => p.id === pillId)) {
                        setContextPills([
                          ...contextPills,
                          { id: pillId, name: `/${skillMatch.id}`, type: "skill" },
                        ]);
                      }
                      setInputText((prev) => prev.slice(0, prev.lastIndexOf("/")));
                    } else {
                      setInputText((prev) => prev.slice(0, prev.lastIndexOf("/")) + cmd.name + " ");
                    }
                    setShowCommandMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{cmd.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">{cmd.desc}</span>
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
