import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronDown,
  ListTodo,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { PlanStep } from "../types";

interface PlanProgressCardProps {
  plan: PlanStep[];
  explanation: string;
}

/**
 * Collapsible task-plan progress card shown above the prompt input.
 *
 * Expanded by default: the header row shows live progress — completed/total
 * count, the step currently in progress, and a thin progress bar — with the
 * full step list (and any explanation the agent provided) below. Clicking the
 * header collapses it to just the header row + progress bar.
 */
export const PlanProgressCard: React.FC<PlanProgressCardProps> = ({
  plan,
  explanation,
}) => {
  const { t } = useSettings();
  const [collapsed, setCollapsed] = useState(false);

  const total = plan.length;
  const completed = plan.filter((s) => s.status === "completed").length;
  const current = plan.find((s) => s.status === "in_progress");
  const failed = plan.find((s) => s.status === "failed");

  let statusText: string;
  if (failed) statusText = `${t("失败", "Failed")} · ${failed.step}`;
  else if (current) statusText = current.step;
  else if (completed === total && total > 0) statusText = t("全部完成", "All complete");
  else statusText = t("等待开始", "Waiting to start");

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="shrink-0 w-full max-w-3xl mx-auto rounded-xl border border-gray-200 dark:border-zinc-800 bg-[#F4F4F4] dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
        role="button"
        aria-expanded={!collapsed}
      >
        <ListTodo className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
        <span className="text-[11px] font-medium text-gray-700 dark:text-zinc-300">
          {t("任务计划", "Task Plan")}
        </span>
        <span className="text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
          {completed}/{total}
        </span>
        <span className="flex-1 min-w-0 text-[11px] text-gray-500 dark:text-zinc-400 truncate">
          {statusText}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
        />
      </div>

      {/* Thin live progress bar */}
      <div className="h-0.5 w-full bg-gray-200 dark:bg-zinc-800">
        <div
          className="h-full bg-gray-400 dark:bg-zinc-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 space-y-2 max-h-[40vh] overflow-y-auto">
              {explanation && (
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                  {explanation}
                </div>
              )}
              <div className="space-y-1">
                {plan.map((step, i) => {
                  const icon =
                    step.status === "completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                    ) : step.status === "in_progress" ? (
                      <Loader2 className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400 animate-spin shrink-0" />
                    ) : step.status === "failed" ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-zinc-600 shrink-0" />
                    );
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 py-1 px-2 rounded ${
                        step.status === "in_progress"
                          ? "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200"
                          : "text-gray-600 dark:text-zinc-400"
                      }`}
                    >
                      {icon}
                      <span className={`text-[11px] ${step.status === "completed" ? "line-through opacity-70" : ""}`}>
                        {step.step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
