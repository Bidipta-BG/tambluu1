"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/cn";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border-2 text-base font-bold animate-in slide-in-from-right-4 fade-in duration-300",
              toast.type === "success" && "bg-emerald-600 border-emerald-500 text-white",
              toast.type === "error" && "bg-red-600 border-red-500 text-white",
              toast.type === "info" && "bg-slate-800 border-slate-700 text-white"
            )}
          >
            {toast.type === "success" && "✓"}
            {toast.type === "error" && "⚠"}
            {toast.type === "info" && "ℹ"}
            {toast.message}
          </div>
        ))}
      </div>
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
