import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";

type ToastVariant = "success" | "warning" | "error" | "info";

interface ToastOptions {
  duration?: number;
  loading?: boolean;
  type?: ToastVariant;
}

interface ToastContextType {
  showToast: (
    message: string,
    options?: ToastOptions | ToastVariant | number,
  ) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [variant, setVariant] = useState<ToastVariant>("success");

  const hideToast = useCallback(() => {
    setMessage(null);
    setIsLoading(false);
    setVariant("success");
  }, []);

  const showToast = useCallback((
    msg: string,
    options?: ToastOptions | ToastVariant | number,
  ) => {
    const normalizedOptions: ToastOptions =
      typeof options === "number"
        ? { duration: options }
        : typeof options === "string"
          ? { type: options }
          : options || {};

    setMessage(msg);
    setIsLoading(normalizedOptions.loading || false);
    setVariant(normalizedOptions.loading ? "info" : normalizedOptions.type || "success");
    
    if (!normalizedOptions.loading) {
      const duration = normalizedOptions.duration || 3000;
      setTimeout(() => {
        setMessage((current) => (current === msg ? null : current));
      }, duration);
    }
  }, []);

  const toastStyles: Record<ToastVariant, {
    container: string;
    icon: string;
    Icon: typeof CheckCircle2;
  }> = {
    success: {
      container: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: "text-emerald-600",
      Icon: CheckCircle2,
    },
    warning: {
      container: "bg-amber-50 text-amber-800 border-amber-200",
      icon: "text-amber-600",
      Icon: AlertTriangle,
    },
    error: {
      container: "bg-red-50 text-red-800 border-red-200",
      icon: "text-red-600",
      Icon: XCircle,
    },
    info: {
      container: "bg-sky-50 text-sky-800 border-sky-200",
      icon: "text-sky-600",
      Icon: Info,
    },
  };

  const activeToast = toastStyles[variant];
  const ActiveIcon = activeToast.Icon;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              opacity: { duration: 0.2 }
            }}
            className="fixed bottom-6 left-0 right-0 z-[9999] pointer-events-none flex justify-center px-4"
          >
            <div className={`px-5 py-3 rounded-2xl flex items-center gap-3 border shadow-lg backdrop-blur-md max-w-full md:max-w-md ${activeToast.container}`}>
              <div className="shrink-0">
                {isLoading ? (
                  <Loader2 className={`animate-spin ${activeToast.icon}`} size={18} />
                ) : (
                  <ActiveIcon className={activeToast.icon} size={18} />
                )}
              </div>
              <span className="text-[14px] md:text-[15px] font-semibold tracking-tight leading-snug">
                {message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
