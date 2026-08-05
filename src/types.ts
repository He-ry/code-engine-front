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
  errorReason?: string; // "user_denied" | "execution_failed" | "cancelled" | ...
  wasAborted?: boolean;
  /** Accumulated argument delta (e.g. file content being written). */
  contentDelta?: string;
}

export interface TextSegment {
  text: string;
  createdAt: number;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  options: {
    letter?: string;
    label: string;
    value: string;
    desc?: string;
    isCustomInput?: boolean;
  }[];
  selectedOption?: string;
  customTextValue?: string;
}

export interface ThinkingProcess {
  id?: string;
  durationSec?: number;
  thoughtText: string;
  isCollapsed?: boolean;
  createdAt?: number;
}

export interface PlanStep {
  step: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
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
}

export interface CommandItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
}
