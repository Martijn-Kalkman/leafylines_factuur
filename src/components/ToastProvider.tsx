"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function toastIcon(type: ToastType): string {
  if (type === "success") return "✓";
  if (type === "error") return "⚠";
  return "i";
}

function toastClass(type: ToastType): string {
  if (type === "success") return "border-[#baf0ca] bg-[var(--success)]";
  if (type === "error") return "border-[#ffd0d0] bg-[var(--error)]";
  return "border-[#cbdfff] bg-[var(--accent)]";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 top-5 z-[2000] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-[min(420px,88vw)] rounded-xl border px-3 py-2.5 text-[13px] font-medium text-white shadow-[0_12px_28px_rgba(0,0,0,.18)] ${toastClass(t.type)}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white/25 text-xs font-bold">
                {toastIcon(t.type)}
              </span>
              <span className="leading-[1.3]">{t.message}</span>
            </div>
            <div className="mt-2 h-[3px] w-full rounded-full bg-white/35">
              <div className="h-[3px] w-full rounded-full bg-white/90" />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
