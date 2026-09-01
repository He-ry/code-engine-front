export interface Conversation {
  id: string;
  title: string;
}

export interface Project {
  id: string;
  name: string;
  subtext?: string;
  branch?: string;
  conversations?: Conversation[];
  isActive?: boolean;
  // from backend
  rootPath?: string;
  gitRemote?: string;
  gitBranch?: string;
  description?: string;
  threadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectCreateInput {
  name: string;
  gitUrl?: string;
  gitBranch?: string;
  description?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  gitRemote?: string;
  gitBranch?: string;
  description?: string;
}

export interface ContextPill {
  id: string;
  name: string;
  icon?: string;
  type?: "file" | "figma" | "spec" | "plan" | "ask" | "goal" | "ducx" | "ducc" | "skill";
  /** True file attachments (uploaded to the thread workspace); the send
   *  call embeds their workspace paths into the message text. */
  attachment?: {
    filename: string;
    workspacePath: string;
    size: number;
    contentType: string;
  };
}

/** A file attached to a sent user message (upload already happened). */
export interface MessageAttachment {
  filename: string;
  workspacePath: string;
  size: number;
  contentType: string;
}

export interface RecommendationCard {
  id: string;
  title: string;
  enTitle?: string;
  subtitle: string;
  enSubtitle?: string;
  icon: string;
  gradient: string;
  prompt: string;
  enPrompt?: string;
}

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isModified?: boolean;
  language?: string;
  /** Preview-only tab (e.g. chat attachment extracted text) — always
   *  read-only and never written back to any workspace. */
  readOnly?: boolean;
  /** PDF source URL — when set, the tab renders the browser's built-in PDF
   *  viewer in an iframe. Either a project static-site URL (direct) or a
   *  blob: object URL fetched with auth (thread attachments; revoked on tab
   *  close). */
  pdfUrl?: string;
  /** ONLYOFFICE editor URL — while set, the tab renders the document editor. */
  livePreviewUrl?: string;
  pendingChange?: {
    toolCallId: string;
    originalContent: string | null; // null = new file
    isConfirmed: boolean;
  };
}

export interface FileNode {
  name: string;
  type: "folder" | "file";
  path: string;
  hasDot?: boolean;
  status?: string; // 'U', 'M', etc.
  children?: FileNode[];
  content?: string;
  size?: number;
  modifiedAt?: string;
}

export interface FileListEntry {
  name: string;
  path: string;
  type: "folder" | "file";
  size?: number | null;
  modified_at?: string | null;
}

export interface FileListResponse {
  path: string;
  entries: FileListEntry[];
}

export interface FileReadResponse {
  path: string;
  content: string;
  size: number;
  modified_at?: string | null;
}

export interface FileChange {
  path: string;
  kind: "add" | "update" | "delete";
  diff: string;
  added: number;
  removed: number;
  content?: string;
  original_content?: string | null; // null = new file
  error?: string;
}

export interface FileChangeStats {
  added: number;
  removed: number;
}

export interface ToolExecution {
  id: string;
  name: string;
  description?: string;
  command?: string;
  args?: string;
  status: "pending" | "running" | "success" | "error";
  result?: string;
  duration?: string;
  autoExecute?: boolean;
  createdAt?: number;
  /** Stamped by item_completed — drives tool-group duration display. */
  completedAt?: number;
  errorReason?: string; // "user_denied" | "execution_failed" | "cancelled" | ...
  wasAborted?: boolean;
  /** Accumulated argument delta (e.g. file content being written). */
  contentDelta?: string;
  /** File change list (write_file / apply_patch tools). */
  files?: FileChange[];
  /** Aggregated diff stats. */
  fileStats?: FileChangeStats;
  /** Image data URLs produced by the tool (browser_screenshot). */
  images?: string[];
}

export interface TextSegment {
  text: string;
  createdAt: number;
}

export interface ClarificationOption {
  label: string;
  description: string;
}

export interface ClarificationQuestion {
  id: string;
  header: string;
  question: string;
  options: ClarificationOption[];
}

export interface ThinkingProcess {
  id?: string;
  durationSec?: number;
  thoughtText: string;
  isCollapsed?: boolean;
  createdAt?: number;
}

// ---------------------------------------------------------------------------
// Ordered blocks model — the single source of truth for assistant-turn
// rendering. Blocks are appended in SSE arrival order and NEVER re-sorted;
// display order == arrival order. (Legacy messages without `blocks` derive
// them at render time from the old parallel arrays.)
// ---------------------------------------------------------------------------

export interface ReasoningBlock {
  kind: "reasoning";
  id: string;
  text: string;
  /** Date.now() when the block opened (live streaming only). */
  startedAt: number;
  /** Stamped when the model moves on (text/tool event) or the turn ends. */
  endedAt?: number;
  /** Legacy mock data only — takes precedence over startedAt/endedAt. */
  durationSec?: number;
}

export interface TextBlock {
  kind: "text";
  /** Backend itemId (msg_{subId}_{loop}) — a new round opens a new block. */
  id: string;
  text: string;
  /** Codex-style assistant message phase: progress commentary vs final answer. */
  phase?: "commentary" | "final_answer";
}

export interface ToolBlock {
  kind: "tool";
  /** Backend call_id — stable across arg deltas / item_started / completed. */
  id: string;
  tool: ToolExecution;
}

/** AskUser card — an ordered block, NOT a message-level field. Rendering it
 *  as part of the blocks sequence keeps the invariant "display order ==
 *  arrival order": anything the agent streams after the ask lands below the
 *  card, never above it (the old message-level card pinned at the bottom of
 *  the message was silently overridden by later blocks). */
export interface AskBlock {
  kind: "ask";
  /** Backend input_id — correlates with the respond/expired events. */
  id: string;
  questions: ClarificationQuestion[];
  /** Date.now() when the ask arrived (live streaming only). */
  createdAt: number;
  /** Set once the user answered (holds their answers) or the ask expired. */
  answers?: Record<string, string>;
  /** Backend gave up waiting (300s timeout) — render a closed card. */
  expired?: boolean;
}

export type AssistantBlock = ReasoningBlock | TextBlock | ToolBlock | AskBlock;

export interface PlanStep {
  step: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  /** Owning thread — used to resolve attachments after thread switches. */
  threadId?: string;
  contextPills?: ContextPill[];
  mode?: string;
  model?: string;
  codeSnippets?: { filename: string; code: string; language: string }[];
  toolLogs?: string[];
  thinkingProcess?: ThinkingProcess;
  thinkingProcesses?: ThinkingProcess[];
  textSegments?: TextSegment[];
  toolExecutions?: ToolExecution[];
  clarificationQuestions?: ClarificationQuestion[];
  planSteps?: PlanStep[];
  planExplanation?: string;
  agentStatus?: "thinking" | "executing_tool" | "asking_clarification" | "generating" | "completed";
  isStreaming?: boolean;
  /** Ordered content blocks (arrival order). Present on live-streamed and
   * history-mapped messages; undefined ⇒ legacy message, derive at render. */
  blocks?: AssistantBlock[];
  /** Image data URLs on a user message (standalone screenshot fallback). */
  images?: string[];
  /** Files attached to this user message (already in the workspace). */
  attachments?: MessageAttachment[];
}

export interface CommandItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
}
