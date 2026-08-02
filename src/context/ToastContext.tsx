import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
  createdAt: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  showSuccess: (title: string, description?: string, duration?: number) => void;
  showError: (title: string, description?: string, duration?: number) => void;
  showInfo: (title: string, description?: string, duration?: number) => void;
  showWarning: (title: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions | string) => {
    const id = Math.random().toString(36).substring(2, 9);
    let item: ToastItem;

    if (typeof options === "string") {
      item = {
        id,
        type: "success",
        title: options,
        duration: 3000,
        createdAt: Date.now(),
      };
    } else {
      item = {
        id,
        type: options.type || "success",
        title: options.title,
        description: options.description,
        duration: options.duration || 3200,
        createdAt: Date.now(),
      };
    }

    setToasts((prev) => {
      // Prevent duplicate toast with identical title and type within 3 seconds
      const isDuplicate = prev.some(
        (t) => t.title === item.title && t.type === item.type && (Date.now() - t.createdAt < 3000)
      );
      if (isDuplicate) return prev;
      return [...prev.slice(-4), item];
    }); // keep max 5 floating toasts

    setTimeout(() => {
      removeToast(id);
    }, item.duration);
  }, [removeToast]);

  const showSuccess = useCallback((title: string, description?: string, duration?: number) => {
    showToast({ type: "success", title, description, duration });
  }, [showToast]);

  const showError = useCallback((title: string, description?: string, duration?: number) => {
    showToast({ type: "error", title, description, duration });
  }, [showToast]);

  const showInfo = useCallback((title: string, description?: string, duration?: number) => {
    showToast({ type: "info", title, description, duration });
  }, [showToast]);

  const showWarning = useCallback((title: string, description?: string, duration?: number) => {
    showToast({ type: "warning", title, description, duration });
  }, [showToast]);

  React.useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        showToast(customEvent.detail);
      }
    };
    window.addEventListener("app:show_toast", handleCustomToast);
    return () => window.removeEventListener("app:show_toast", handleCustomToast);
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        removeToast,
      }}
    >
      {children}

      {/* Floating Toast Portal Overlay */}
      <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        <AnimatePresence mode="sync">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const getStyle = () => {
    switch (toast.type) {
      case "success":
        return {
          icon: <Check className="w-3.5 h-3.5 stroke-[2.5]" />,
          iconBg: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20",
          progressColor: "bg-emerald-500",
        };
      case "error":
        return {
          icon: <X className="w-3.5 h-3.5 stroke-[2.5]" />,
          iconBg: "bg-rose-500/12 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20",
          progressColor: "bg-rose-500",
        };
      case "warning":
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />,
          iconBg: "bg-amber-500/12 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20",
          progressColor: "bg-amber-500",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 stroke-[2.5]" />,
          iconBg: "bg-blue-500/12 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20",
          progressColor: "bg-blue-500",
        };
    }
  };

  const style = getStyle();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className="pointer-events-auto relative overflow-hidden rounded-xl border border-gray-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md p-3.5 shadow-xl shadow-black/5 dark:shadow-black/40 text-left font-sans"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${style.iconBg}`}>
            {style.icon}
          </div>
          <div className="space-y-0.5 pt-0.5">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-tight leading-snug">
              {toast.title}
            </h4>
            {toast.description && (
              <p className="text-[12px] text-gray-500 dark:text-zinc-400 leading-relaxed font-normal">
                {toast.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800/80 p-1 rounded-md transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Animated Countdown Progress Bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.duration / 1000, ease: "linear" }}
        style={{ originX: 0 }}
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${style.progressColor} opacity-70`}
      />
    </motion.div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
