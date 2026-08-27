/**
 * Ordered-blocks helpers for assistant-turn rendering.
 *
 * `ChatMessage.blocks` is the single source of truth: an append-only array in
 * SSE arrival order (live) or synthetic-clock order (history). These pure
 * functions (a) derive blocks for legacy messages that predate the model and
 * (b) group consecutive tool blocks for the compact Codex-style UI.
 */
import {
  AskBlock,
  AssistantBlock,
  ChatMessage,
  ClarificationQuestion,
  ReasoningBlock,
  TextBlock,
  ToolBlock,
  ToolExecution,
} from "../types";

/** Stable merge of typed entries by a numeric order key (ties keep list order). */
function mergeByOrder<T>(entries: Array<{ order: number; value: T }>): T[] {
  return entries
    .map((e, i) => ({ ...e, i }))
    .sort((a, b) => a.order - b.order || a.i - b.i)
    .map((e) => e.value);
}

/**
 * Build ordered blocks from the legacy parallel arrays (+ msg.text fallback).
 * Used for (a) messages streamed before the blocks refactor, (b) history
 * messages from the backend's parallel-array payload, (c) mock data.
 *
 * Order keys come from `createdAt` — for history messages this is the
 * backend's synthetic monotonic counter (1, 2, 3, …), which must NEVER be
 * compared against Date.now(); we only ever sort keys against each other.
 */
export function blocksFromLegacyFields(
  msgId: string,
  textSegments: Array<{ text: string; createdAt?: number }> | undefined,
  thinkingProcesses: Array<{
    id?: string;
    thoughtText: string;
    isCollapsed?: boolean;
    durationSec?: number;
    createdAt?: number;
  }> | undefined,
  toolExecutions: ToolExecution[] | undefined,
  legacyText?: string
): AssistantBlock[] {
  const entries: Array<{ order: number; value: AssistantBlock }> = [];

  const hasSegments = !!textSegments && textSegments.length > 0;
  (hasSegments ? textSegments! : legacyText ? [{ text: legacyText, createdAt: 0 }] : []).forEach(
    (seg, i) => {
      if (!seg.text.trim()) return;
      entries.push({
        order: seg.createdAt || 0,
        value: { kind: "text", id: `${msgId}-text-${i}`, text: seg.text } as TextBlock,
      });
    }
  );

  (thinkingProcesses || []).forEach((tp, i) => {
    if (!tp.thoughtText.trim()) return;
    entries.push({
      order: tp.createdAt || 0,
      value: {
        kind: "reasoning",
        id: tp.id || `${msgId}-thought-${i}`,
        text: tp.thoughtText,
        startedAt: 0,
        durationSec: tp.durationSec,
      } as ReasoningBlock,
    });
  });

  (toolExecutions || []).forEach((te) => {
    entries.push({
      order: te.createdAt || 0,
      value: { kind: "tool", id: te.id, tool: te } as ToolBlock,
    });
  });

  return mergeByOrder(entries);
}

/** Derive blocks for a legacy/mock message (no `blocks` field). */
export function deriveLegacyBlocks(msg: ChatMessage): AssistantBlock[] {
  const thoughts =
    msg.thinkingProcesses && msg.thinkingProcesses.length > 0
      ? msg.thinkingProcesses
      : msg.thinkingProcess
        ? [msg.thinkingProcess]
        : [];
  const blocks = blocksFromLegacyFields(
    msg.id,
    msg.textSegments,
    thoughts,
    msg.toolExecutions,
    msg.text
  );
  // Legacy mock/old-live messages carried the ask card as a message-level
  // field; surface it as a trailing AskBlock so one rendering path serves all.
  const questions = msg.clarificationQuestions;
  if (questions && questions.length > 0) {
    blocks.push({
      kind: "ask",
      id: `${msg.id}-ask`,
      questions: questions as ClarificationQuestion[],
      createdAt: 0,
    });
  }
  return blocks;
}

/** Get a message's ordered blocks, deriving them for legacy messages. */
export function getBlocks(msg: ChatMessage): AssistantBlock[] {
  return msg.blocks ?? deriveLegacyBlocks(msg);
}

// ---------------------------------------------------------------------------
// Render grouping — consecutive tool blocks collapse into one group card.
// ---------------------------------------------------------------------------

export type RenderItem =
  | { kind: "reasoning"; block: ReasoningBlock; key: string }
  | { kind: "text"; block: TextBlock; key: string }
  | { kind: "ask"; block: AskBlock; key: string }
  | { kind: "toolGroup"; tools: ToolExecution[]; key: string };

/** Walk ordered blocks; every maximal run of consecutive tool blocks becomes
 *  one toolGroup so the turn reads "text → one compact card → text".
 *
 *  Keys are namespaced by kind and deduped deterministically: reasoning and
 *  text of the SAME model round share one backend itemId (msg_{subId}_{loop})
 *  by design, so the raw block id must never be used as a React key alone.
 */
export function buildRenderGroups(blocks: AssistantBlock[]): RenderItem[] {
  const items: RenderItem[] = [];
  let toolRun: ToolBlock[] = [];
  const usedKeys = new Set<string>();
  const uniqueKey = (base: string) => {
    if (usedKeys.has(base)) {
      let n = 2;
      while (usedKeys.has(`${base}#${n}`)) n++;
      base = `${base}#${n}`;
    }
    usedKeys.add(base);
    return base;
  };

  const flush = () => {
    if (toolRun.length === 0) return;
    items.push({
      kind: "toolGroup",
      tools: toolRun.map((b) => b.tool),
      key: uniqueKey(`group-${toolRun[0].id}-${toolRun[toolRun.length - 1].id}`),
    });
    toolRun = [];
  };

  for (const block of blocks) {
    if (block.kind === "tool") {
      toolRun.push(block);
      continue;
    }
    flush();
    if (block.kind === "reasoning") {
      items.push({ kind: "reasoning", block, key: uniqueKey(`reasoning-${block.id}`) });
    } else if (block.kind === "ask") {
      items.push({ kind: "ask", block, key: uniqueKey(`ask-${block.id}`) });
    } else {
      items.push({ kind: "text", block, key: uniqueKey(`text-${block.id}`) });
    }
  }
  flush();
  return items;
}

/** Seconds a reasoning block was "open", for the collapsed pill label.
 *  undefined when no real timestamps exist (history / mock messages). */
export function reasoningDurationSec(block: ReasoningBlock): number | undefined {
  if (typeof block.durationSec === "number") return block.durationSec;
  if (block.endedAt && block.startedAt) {
    return Math.max(1, Math.round((block.endedAt - block.startedAt) / 1000));
  }
  return undefined;
}
